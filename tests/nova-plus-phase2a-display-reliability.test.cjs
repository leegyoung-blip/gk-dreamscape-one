/** NOVA+ Phase 2A: learner-switch races, schoolwork refresh/isolation, My Learning vs Recommends, mission-unavailable state. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function load(file, stubs) {
 const out = ts.transpileModule(read(file), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 const mod = {exports:{}};
 const req = (name) => { if (!(name in stubs)) throw new Error(`unexpected import ${name}`); return stubs[name]; };
 vm.runInNewContext(out.outputText, {exports:mod.exports, module:mod, require:req, console:{error(){},warn(){},log(){}}, Promise, Map, Set});
 return mod.exports;
}

/* Minimal synchronous hook runner: enough of React's hook contract to drive these hooks. */
function createHookRunner() {
 let slots = [], idx = 0, rendering = false, dirty = false, unmounted = false, hookFn = null, props, result;
 const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
 let pending = [];
 const react = {
  useState(init) {
   const i = idx++;
   if (!(i in slots)) slots[i] = {v: typeof init === 'function' ? init() : init};
   const slot = slots[i];
   return [slot.v, (u) => { if (unmounted) return; slot.v = typeof u === 'function' ? u(slot.v) : u; rerender(); }];
  },
  useRef(init) { const i = idx++; if (!(i in slots)) slots[i] = {current:init}; return slots[i]; },
  useMemo(fn, deps) { const i = idx++; const s = slots[i]; if (s && same(s.deps, deps)) return s.v; const v = fn(); slots[i] = {v, deps}; return v; },
  useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
  useEffect(fn, deps) {
   const i = idx++; const s = slots[i];
   if (s && same(s.deps, deps)) return;
   const prevCleanup = s?.cleanup;
   slots[i] = {deps, cleanup:undefined};
   pending.push(() => { if (typeof prevCleanup === 'function') prevCleanup(); slots[i].cleanup = fn(); });
  },
 };
 function rerender() {
  if (rendering) { dirty = true; return; }
  rendering = true;
  do {
   dirty = false; idx = 0; pending = [];
   result = hookFn(props);
   const effects = pending; pending = [];
   effects.forEach((e) => e());
  } while (dirty);
  rendering = false;
 }
 return {
  react,
  mount(fn, p) { hookFn = fn; props = p; rerender(); },
  setProps(p) { props = p; rerender(); },
  unmount() { slots.forEach((s) => typeof s?.cleanup === 'function' && s.cleanup()); unmounted = true; },
  get current() { return result; },
 };
}

function deferred() { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return {promise, resolve, reject}; }
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };

/* Supabase mock: listed RPCs answer immediately; profile/schoolwork calls are deferred and recorded. */
function makeSupabase({viewer = 'parent-1', role = 'parent', accounts, hasNovaPlus = true, f50Learner = null} = {}) {
 const calls = [];
 const instant = {
  get_nova_plus_accessible_accounts: () => ({data:accounts, error:null}),
  current_user_has_nova_plus: () => ({data:hasNovaPlus, error:null}),
  current_user_f50_nova_plus_learner_id: () => ({data:f50Learner, error:null}),
  current_user_has_founding50_nova_plus: () => ({data:true, error:null}),
 };
 const supabase = {
  auth: {getUser: async () => ({data:{user:{id:viewer, email:'p@example.test'}}})},
  rpc(name, args) {
   if (instant[name]) return Promise.resolve(instant[name](args));
   const d = deferred(); calls.push({name, args, ...d}); return d.promise;
  },
  from(table) {
   const filters = {};
   const b = {
    select() { return b; }, eq(c, v) { filters[c] = v; return b; }, order() { return b; },
    maybeSingle: async () => ({data: table === 'profiles' ? {role, username:'Parent'} : null, error:null}),
    then(res, rej) {
     if (table !== 'nova_schoolwork_uploads') return Promise.resolve({data:[], error:null}).then(res, rej);
     const d = deferred(); calls.push({name:'uploads', args:{...filters}, ...d}); return d.promise.then(res, rej);
    },
   };
   return b;
  },
 };
 const take = (name, learner) => {
  const i = calls.findIndex((c) => c.name === name && (c.args.p_student_user_id ?? c.args.student_user_id) === learner);
  assert.ok(i >= 0, `expected pending ${name} for ${learner}`);
  return calls.splice(i, 1)[0];
 };
 return {supabase, calls, take};
}

const helpers = load('lib/nova-plus/helpers.ts', {});
const profileOf = (id, tag = 'v1') => ({student_user_id:id, tag, subject_summaries:[], skills:[]});
const TWO = [{id:'kid-a', username:'Ava', relationship:'parent'}, {id:'kid-b', username:'Ben', relationship:'parent'}];

function mountProfile(mock, requested = null) {
 const runner = createHookRunner();
 const {useNovaPlusProfile} = load('hooks/useNovaPlusProfile.ts', {react:runner.react, '@/lib/supabase':{supabase:mock.supabase}, '@/lib/nova-plus/helpers':helpers});
 runner.mount((p) => useNovaPlusProfile(p), requested);
 return runner;
}

test('A->B switch: late A response never lands under B', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 assert.equal(r.current.selectedLearnerId, 'kid-a');
 const lateA = mock.take('get_nova_plus_learning_profile', 'kid-a');
 void r.current.selectLearner('kid-b');
 assert.equal(r.current.profile, null);
 assert.equal(r.current.loading, true);
 lateA.resolve({data:profileOf('kid-a'), error:null}); await flush();
 assert.equal(r.current.profile, null, 'stale A must be discarded');
 mock.take('get_nova_plus_learning_profile', 'kid-b').resolve({data:profileOf('kid-b'), error:null}); await flush();
 assert.equal(r.current.profile.student_user_id, 'kid-b');
 assert.equal(r.current.loading, false);
});

test('A->B->A with delayed responses: only the final A request lands', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 const a1 = mock.take('get_nova_plus_learning_profile', 'kid-a');
 void r.current.selectLearner('kid-b');
 const b1 = mock.take('get_nova_plus_learning_profile', 'kid-b');
 void r.current.selectLearner('kid-a');
 const a2 = mock.take('get_nova_plus_learning_profile', 'kid-a');
 b1.resolve({data:profileOf('kid-b'), error:null});
 a1.resolve({data:profileOf('kid-a', 'old'), error:null}); await flush();
 assert.equal(r.current.profile, null, 'neither stale B nor stale A1 may land');
 a2.resolve({data:profileOf('kid-a', 'new'), error:null}); await flush();
 assert.equal(r.current.profile.tag, 'new');
});

test('refresh A then switch to B: late refresh of A does not reappear', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 mock.take('get_nova_plus_learning_profile', 'kid-a').resolve({data:profileOf('kid-a'), error:null}); await flush();
 void r.current.refresh();
 assert.equal(r.current.refreshing, true);
 const refreshA = mock.take('refresh_nova_plus_learning_profile', 'kid-a');
 void r.current.selectLearner('kid-b');
 assert.equal(r.current.refreshing, false);
 refreshA.resolve({data:profileOf('kid-a', 'refreshed'), error:null}); await flush();
 assert.equal(r.current.profile, null);
 mock.take('get_nova_plus_learning_profile', 'kid-b').resolve({data:profileOf('kid-b'), error:null}); await flush();
 assert.equal(r.current.profile.student_user_id, 'kid-b');
});

test('rapid refreshes: newest wins; stale error does not erase newer data', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 mock.take('get_nova_plus_learning_profile', 'kid-a').resolve({data:profileOf('kid-a', 'v1'), error:null}); await flush();
 void r.current.refresh();
 const first = mock.take('refresh_nova_plus_learning_profile', 'kid-a');
 void r.current.refresh();
 const second = mock.take('refresh_nova_plus_learning_profile', 'kid-a');
 second.resolve({data:profileOf('kid-a', 'v3'), error:null}); await flush();
 first.resolve({data:null, error:{message:'timeout'}}); await flush();
 assert.equal(r.current.profile.tag, 'v3');
 assert.equal(r.current.error, '');
});

test('failed refresh keeps same-learner profile; access denial clears it', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 mock.take('get_nova_plus_learning_profile', 'kid-a').resolve({data:profileOf('kid-a'), error:null}); await flush();
 void r.current.refresh();
 mock.take('refresh_nova_plus_learning_profile', 'kid-a').resolve({data:null, error:{message:'network'}}); await flush();
 assert.equal(r.current.profile.student_user_id, 'kid-a');
 assert.equal(r.current.error, 'network');
 void r.current.refresh();
 mock.take('refresh_nova_plus_learning_profile', 'kid-a').resolve({data:null, error:{message:'NOVA_PLUS_ACCESS_REQUIRED'}}); await flush();
 assert.equal(r.current.profile, null);
 assert.match(r.current.error, /Founding 50 beta is active/);
});

test('access-error diagnostics path is guarded against a learner switch', async () => {
 const mock = makeSupabase({accounts:TWO});
 let releaseBeta;
 const origRpc = mock.supabase.rpc;
 mock.supabase.rpc = (name, args) => name === 'current_user_has_founding50_nova_plus'
  ? new Promise((res) => { releaseBeta = () => res({data:true, error:null}); })
  : origRpc(name, args);
 const r = mountProfile(mock);
 await flush();
 mock.take('get_nova_plus_learning_profile', 'kid-a').resolve({data:null, error:{message:'NOVA_PLUS_ACCESS_REQUIRED'}}); await flush();
 void r.current.selectLearner('kid-b');
 mock.take('get_nova_plus_learning_profile', 'kid-b').resolve({data:profileOf('kid-b'), error:null}); await flush();
 releaseBeta(); await flush();
 assert.equal(r.current.profile.student_user_id, 'kid-b');
 assert.equal(r.current.error, '');
});

test('mismatched profile payload is rejected', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 mock.take('get_nova_plus_learning_profile', 'kid-a').resolve({data:profileOf('kid-b'), error:null}); await flush();
 assert.equal(r.current.profile, null);
 assert.ok(r.current.error);
});

test('unmount discards in-flight responses', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 const pending = mock.take('get_nova_plus_learning_profile', 'kid-a');
 r.unmount();
 pending.resolve({data:profileOf('kid-a'), error:null}); await flush();
 assert.equal(r.current.profile, null);
});

test('Founding 50 beta-only account is narrowed to its selected learner; others cannot be selected', async () => {
 const mock = makeSupabase({accounts:TWO, hasNovaPlus:false, f50Learner:'kid-b'});
 const r = mountProfile(mock, 'kid-a');
 await flush();
 assert.deepEqual(Array.from(r.current.learners, (l) => l.id), ['kid-b']);
 assert.equal(r.current.selectedLearnerId, 'kid-b');
 void r.current.selectLearner('kid-a');
 assert.equal(r.current.selectedLearnerId, 'kid-b');
 assert.equal(mock.calls.filter((c) => c.args.p_student_user_id === 'kid-a').length, 0);
});

/* ---------- Schoolwork evidence ---------- */

function mountSchoolwork(mock, learner) {
 const runner = createHookRunner();
 const {useNovaSchoolworkEvidence} = load('hooks/useNovaSchoolworkEvidence.ts', {react:runner.react, '@/lib/supabase':{supabase:mock.supabase}});
 runner.mount((p) => useNovaSchoolworkEvidence(p), learner);
 return runner;
}
const summary = (id, approved) => ({student_user_id:id, generated_at:'t', approved_uploads:approved, awaiting_review:0, archived_uploads:0, skills:[], recent_uploads:[]});
async function answerSchoolwork(mock, learner, approved, statuses = []) {
 await flush(); // Promise.all subscribes to the query builder one microtask later.
 mock.take('get_nova_schoolwork_evidence_summary', learner).resolve({data:summary(learner, approved), error:null});
 mock.take('uploads', learner).resolve({data:statuses.map((status) => ({status})), error:null});
}

test('schoolwork refresh reflects a commit/archive for the same learner', async () => {
 const mock = makeSupabase();
 const r = mountSchoolwork(mock, 'kid-a');
 assert.equal(r.current.loading, true);
 await answerSchoolwork(mock, 'kid-a', 1, ['review_ready']); await flush();
 assert.equal(r.current.approved_uploads, 1);
 assert.equal(r.current.awaiting_review, 1);
 void r.current.refresh();
 assert.equal(r.current.loading, true);
 await answerSchoolwork(mock, 'kid-a', 2, ['committed', 'archived']); await flush();
 assert.equal(r.current.approved_uploads, 2);
 assert.equal(r.current.awaiting_review, 0);
 assert.equal(r.current.loading, false);
});

test('schoolwork learner switch clears stale summary immediately and drops late responses', async () => {
 const mock = makeSupabase();
 const r = mountSchoolwork(mock, 'kid-a');
 await answerSchoolwork(mock, 'kid-a', 5); await flush();
 void r.current.refresh();
 r.setProps('kid-b');
 assert.equal(r.current.approved_uploads, 0, 'A summary hidden on first B render');
 assert.equal(r.current.loading, true);
 await answerSchoolwork(mock, 'kid-a', 9); await flush();
 assert.equal(r.current.approved_uploads, 0, 'late A refresh discarded');
 await answerSchoolwork(mock, 'kid-b', 3); await flush();
 assert.equal(r.current.approved_uploads, 3);
 r.setProps('kid-a');
 assert.equal(r.current.approved_uploads, 0, 'B summary hidden when returning to A');
});

test('schoolwork mismatched payload or failure does not show another learner', async () => {
 const mock = makeSupabase();
 const r = mountSchoolwork(mock, 'kid-a');
 await flush();
 mock.take('get_nova_schoolwork_evidence_summary', 'kid-a').resolve({data:summary('kid-b', 7), error:null});
 mock.take('uploads', 'kid-a').resolve({data:[], error:null}); await flush();
 assert.equal(r.current.approved_uploads, 0);
 assert.ok(r.current.error);
 assert.equal(r.current.loading, false);
});

/* ---------- Source contracts for UI-only changes ---------- */

test('dashboard refresh includes schoolwork evidence and is used by commit/history callbacks', () => {
 const src = read('components/nova-plus/NovaPlusDashboard.tsx');
 const body = src.slice(src.indexOf('async function refreshNovaPlus'), src.indexOf('function closeNovaPlus'));
 assert.match(body, /schoolworkEvidence\.refresh\(\)/);
 assert.match(src, /onCommitted=\{\(\) => void refreshNovaPlus\(\)\}/);
 assert.match(src, /onChanged=\{\(\) => void refreshNovaPlus\(\)\}/);
});

test('My Learning no longer names a next skill from raw lowest mastery', () => {
 const src = read('components/nova-plus/tabs/MyLearningTab.tsx');
 assert.doesNotMatch(src, /prioritySkills|nextSkill|Focus here next/);
 assert.doesNotMatch(src, /profile\.skills/);
 assert.match(src, /Open Nova Recommends to see your next step/);
});

test('recommendation card separates missing mission from account restriction', () => {
 const src = read('components/nova-plus/tabs/NovaRecommendsTab.tsx');
 const card = src.slice(src.indexOf('function RecommendationCard'), src.indexOf('function CycleCard'));
 assert.match(card, /const missionAvailable =\s*Boolean\(quizHref\)/);
 assert.match(card, /missionAvailable &&\s*\(canLaunchPractice \|\| isAdminPreview\)/);
 const missing = card.indexOf('!missionAvailable ?');
 const unavailable = card.indexOf('Practice mission unavailable');
 const account = card.indexOf('Open from {learnerLabel}');
 assert.ok(missing > 0 && missing < unavailable && unavailable < account, 'missing-mission branch precedes account notice');
});

/* ---------- Phase 2A follow-up (independent review) ---------- */

test('failed refresh keeps profile with error; retry clears it; access denial clears profile', async () => {
 const mock = makeSupabase({accounts:TWO});
 const r = mountProfile(mock);
 await flush();
 mock.take('get_nova_plus_learning_profile', 'kid-a').resolve({data:profileOf('kid-a', 'v1'), error:null}); await flush();
 void r.current.refresh();
 mock.take('refresh_nova_plus_learning_profile', 'kid-a').resolve({data:null, error:{message:'network'}}); await flush();
 assert.equal(r.current.profile.tag, 'v1', 'last good profile still available');
 assert.equal(r.current.error, 'network', 'failure is reported, so the dashboard notice can render');
 void r.current.refresh();
 assert.equal(r.current.error, '', 'notice clears while retrying');
 mock.take('refresh_nova_plus_learning_profile', 'kid-a').resolve({data:profileOf('kid-a', 'v2'), error:null}); await flush();
 assert.equal(r.current.profile.tag, 'v2');
 assert.equal(r.current.error, '');
 void r.current.refresh();
 mock.take('refresh_nova_plus_learning_profile', 'kid-a').resolve({data:null, error:{message:'NOVA_PLUS_ACCESS_REQUIRED'}}); await flush();
 assert.equal(r.current.profile, null, 'access denial clears immediately');
});

test('dashboard shows an accessible stale-profile notice with retry, only when a profile is still shown', () => {
 const src = read('components/nova-plus/NovaPlusDashboard.tsx');
 assert.match(src, /error && profile \? "the learning profile"/);
 assert.match(src, /schoolworkEvidence\.error \? "the schoolwork summary"/);
 const notice = src.slice(src.indexOf('styles.refreshNotice'), src.indexOf('{loading && !profile ? ('));
 assert.match(notice, /role="status"/);
 assert.match(notice, /aria-live="polite"/);
 assert.match(notice, /onClick=\{\(\) => void refreshNovaPlus\(\)\}/);
 assert.match(notice, /may be missing or out of date/);
 assert.doesNotMatch(notice, /up to date/i);
 assert.match(src, /\{profile && selectedLearnerId && refreshProblems\.length > 0 &&/);
 assert.match(src, /error && !profile \? \(/, 'full error card retained when no profile is available');
});

test('Nova Recommends remounts only after a completed refresh for the same learner', () => {
 const src = read('components/nova-plus/NovaPlusDashboard.tsx');
 assert.match(src, /<NovaRecommendsTab\s+key=\{`\$\{selectedLearnerId\}:\$\{recommendationsRevision\}`\}/);
 const bumps = src.match(/setRecommendationsRevision\(/g) || [];
 assert.equal(bumps.length, 1, 'revision changes in exactly one place');
 const body = src.slice(src.indexOf('async function refreshNovaPlus'), src.indexOf('const refreshProblems'));
 const awaitAt = body.indexOf('await Promise.allSettled');
 const guardAt = body.indexOf('selectedLearnerRef.current === learnerAtStart');
 const bumpAt = body.indexOf('setRecommendationsRevision(');
 assert.ok(awaitAt > 0 && awaitAt < guardAt && guardAt < bumpAt, 'bump happens after refresh settles and only if learner unchanged');
 for (const feed of ['refresh()', 'englishMastery.refresh()', 'schoolworkEvidence.refresh()']) assert.ok(body.includes(feed), feed);
});

test('schoolwork: status lookup failure is not reported as a verified zero', async () => {
 const mock = makeSupabase();
 const r = mountSchoolwork(mock, 'kid-a');
 await answerSchoolwork(mock, 'kid-a', 4, ['review_ready', 'needs_input']);
 await flush();
 assert.equal(r.current.awaiting_review, 2);
 void r.current.refresh();
 await flush();
 mock.take('get_nova_schoolwork_evidence_summary', 'kid-a').resolve({data:summary('kid-a', 5), error:null});
 mock.take('uploads', 'kid-a').resolve({data:null, error:{message:'status lookup failed'}}); await flush();
 assert.equal(r.current.awaiting_review, 2, 'last verified count preserved');
 assert.equal(r.current.approved_uploads, 4, 'partial result not mixed in');
 assert.equal(r.current.error, 'status lookup failed');
 assert.equal(r.current.loading, false);
});

test('schoolwork: first-load status failure surfaces an error instead of a silent zero', async () => {
 const mock = makeSupabase();
 const r = mountSchoolwork(mock, 'kid-a');
 await flush();
 mock.take('get_nova_schoolwork_evidence_summary', 'kid-a').resolve({data:summary('kid-a', 3), error:null});
 mock.take('uploads', 'kid-a').resolve({data:null, error:{message:'status lookup failed'}}); await flush();
 assert.equal(r.current.error, 'status lookup failed');
 assert.equal(r.current.approved_uploads, 0);
 assert.equal(r.current.loading, false);
});

test('schoolwork: rejected transport ends loading with an error and keeps race guard', async () => {
 const mock = makeSupabase();
 const r = mountSchoolwork(mock, 'kid-a');
 await flush();
 mock.take('get_nova_schoolwork_evidence_summary', 'kid-a').reject(new Error('fetch failed'));
 mock.take('uploads', 'kid-a').resolve({data:[], error:null}); await flush();
 assert.equal(r.current.loading, false);
 assert.ok(r.current.error);
 void r.current.refresh();
 await flush();
 const late = mock.take('get_nova_schoolwork_evidence_summary', 'kid-a');
 const lateUploads = mock.take('uploads', 'kid-a');
 r.setProps('kid-b');
 late.reject(new Error('late failure')); lateUploads.resolve({data:[], error:null}); await flush();
 assert.equal(r.current.error, '', 'stale rejection for A does not mark B as failed');
 await answerSchoolwork(mock, 'kid-b', 1); await flush();
 assert.equal(r.current.approved_uploads, 1);
});

test('attentionSubject never labels a strong subject as needing attention', () => {
 const row = (subject, mastery, attempts = 10) => ({subject, mastery_score:mastery, questions_attempted:attempts});
 assert.equal(helpers.attentionSubject([row('english', 92), row('math', 88), row('science', 95)]), null);
 assert.equal(helpers.attentionSubject([row('english', 92), row('math', 74), row('science', 60, 3)]).subject, 'math');
 assert.equal(helpers.attentionSubject([row('english', 40), row('math', 74)]).subject, 'english');
 assert.equal(helpers.attentionSubject([null, row('math', 20, 2)]), null, 'insufficient evidence is not a priority');
});

test('My Learning uses attentionSubject and has a calm all-strong state', () => {
 const src = read('components/nova-plus/tabs/MyLearningTab.tsx');
 assert.doesNotMatch(src, /prioritySubject/);
 assert.match(src, /const priority = attentionSubject\(curriculumRows\)/);
 assert.match(src, /Nothing urgent right now/);
 assert.match(src, /Tracked subjects are currently strong/);
});
