/**
 * NOVA+ Phase 2B-2D-A: client-side practice access safeguard.
 *
 * Runs the real lib/nova-plus/practice-access.ts (with the real catalogue and
 * learning-access modules) against a recording Supabase mock, and extracts the
 * real startLearningCycle / card access logic from NovaRecommendsTab.tsx with
 * the TypeScript AST. No production database is involved.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));

function transpile(code) {
 const out = ts.transpileModule(code, {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.Preserve}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 return out.outputText;
}
function loadModule(file, stubs = {}) {
 const mod = {exports:{}};
 const req = (name) => { if (!(name in stubs)) throw new Error(`unexpected import ${name}`); return stubs[name]; };
 vm.runInNewContext(transpile(read(file)), {exports:mod.exports, module:mod, require:req, Promise, Set, Map});
 return mod.exports;
}
const REC = 'components/nova-plus/tabs/NovaRecommendsTab.tsx';
const sf = ts.createSourceFile(REC, read(REC), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function findNode(pred) { let hit = null; (function walk(n) { if (hit) return; if (pred(n)) hit = n; else ts.forEachChild(n, walk); })(sf); assert.ok(hit); return hit; }
function extractFunction(name, scope) {
 const fn = findNode((n) => ts.isFunctionDeclaration(n) && n.name?.text === name);
 const keys = Object.keys(scope);
 return vm.runInNewContext(transpile(`(function (${keys.join(', ')}) { ${fn.getText(sf)}; return ${name}; })`), {})(...keys.map((k) => scope[k]));
}
function evalFirstConst(name, scope) {
 const decl = findNode((n) => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name);
 const keys = Object.keys(scope);
 return vm.runInNewContext(transpile(`(function (${keys.join(', ')}) { return (${decl.initializer.getText(sf)}); })`), {})(...keys.map((k) => scope[k]));
}

const catalogue = loadModule('lib/core-missions/catalogue.ts');
const learningAccess = loadModule('lib/learning-access.ts');
const pa = loadModule('lib/nova-plus/practice-access.ts', {'@/lib/core-missions/catalogue':catalogue, '@/lib/learning-access':learningAccess});

/* ---------- recording Supabase mock ---------- */

const Q1 = '11111111-1111-4111-8111-111111111111', T1 = 't-open';
function mockClient(o = {}) {
 const calls = [];
 const tables = {
  profiles: o.profileError ? {error:{message:'profile'}} : {data:{role:o.role ?? 'student', tier:null}},
  learning_mission_zone_access: o.manualError ? {error:{message:'manual'}} : {data:o.manual ?? null},
  english_quizzes: o.quizError ? {error:{message:'quiz read'}} : {data:o.englishQuizzes ?? [{id:Q1, topic_id:T1, is_published:true, status:'published', student_visibility:'satisfied'}]},
  math_quizzes: o.quizError ? {error:{message:'quiz read'}} : {data:o.mathQuizzes ?? []},
  english_topics: o.topicError ? {error:{message:'topic read'}} : {data:o.englishTopics ?? [{id:T1, is_active:true, review_status:'approved'}]},
  math_topics: o.topicError ? {error:{message:'topic read'}} : {data:o.mathTopics ?? []},
 };
 const client = {
  auth:{getSession: async () => (o.noSession ? {data:{session:null}, error:null} : {data:{session:{user:{id:'learner-1'}}}, error:null})},
  rpc(name, args) {
   calls.push({kind:'rpc', name, args});
   if (o.throwOnRpc) return Promise.reject(new Error('network'));
   if (name === 'dreamscape_get_my_learning_access') return Promise.resolve(o.accessError ? {data:null, error:{message:'access'}} : {data:o.access ?? {core:true}, error:null});
   if (name === 'start_nova_learning_cycle') return Promise.resolve(o.startError ? {data:null, error:{message:'start failed'}} : {data:{id:'cycle'}, error:null});
   // Phase 2B-2D-B2: quiz-specific start returns the server-built href.
   if (name === 'start_nova_learning_cycle_for_quiz') {
    if (o.startReject) return Promise.reject(new Error('network'));
    if (o.startErrorMessage) return Promise.resolve({data:null, error:{message:o.startErrorMessage}});
    const quizId = o.serverQuizId ?? args.p_quiz_id;
    return Promise.resolve({data:{cycle_id:'cycle', status:'active', existing:false, quiz_id:quizId, quiz_href:o.serverHref ?? `/learning-missions/core/english/p4/quiz/${quizId}`}, error:null});
   }
   return Promise.resolve({data:null, error:{message:`unexpected rpc ${name}`}});
  },
  from(table) {
   const q = {table, filters:[]};
   calls.push({kind:'from', table, q});
   const res = () => Promise.resolve({data:null, error:null, ...(tables[table] ?? {error:{message:`unexpected table ${table}`}})});
   const b = {
    select(c) { q.columns = c; return b; }, eq(c, v) { q.filters.push(['eq', c, v]); return b; }, in(c, v) { q.filters.push(['in', c, [...v]]); return b; },
    maybeSingle: res, then(r, j) { return res().then(r, j); },
   };
   return b;
  },
 };
 return {client, calls};
}
const ref = (quizId = Q1, subject = 'english') => ({subject, quizId});
const stateFor = async (o, quizId = Q1, subject = 'english') => {
 const {client} = mockClient(o);
 const result = await pa.checkPracticeAccess(client, [ref(quizId, subject)]);
 return pa.practiceAccessState(result, subject, quizId);
};

/* ---------- 1-4: access decisions ---------- */

test('1: published + satisfied + active unlocked topic + Core allowed -> allowed', async () => {
 assert.equal(await stateFor({}), 'allowed');
 assert.equal(await stateFor({access:{core:false}, manual:{is_unlocked:true}}), 'allowed', 'manual core unlock');
});

test('2: reviewing, locked, unpublished, unpublished status, inactive or locked topic -> blocked', async () => {
 const quiz = (o) => [{id:Q1, topic_id:T1, is_published:true, status:'published', student_visibility:'satisfied', ...o}];
 assert.equal(await stateFor({englishQuizzes:quiz({student_visibility:'reviewing'})}), 'blocked');
 assert.equal(await stateFor({englishQuizzes:quiz({student_visibility:'locked'})}), 'blocked');
 assert.equal(await stateFor({englishQuizzes:quiz({is_published:false})}), 'blocked');
 assert.equal(await stateFor({englishQuizzes:quiz({status:'reviewing'})}), 'blocked');
 assert.equal(await stateFor({englishTopics:[{id:T1, is_active:false, review_status:'approved'}]}), 'blocked');
 assert.equal(await stateFor({englishTopics:[{id:T1, is_active:true, review_status:'locked'}]}), 'blocked');
 assert.equal(await stateFor({englishTopics:[]}), 'blocked', 'missing topic row');
});

test('3: Core zone locked / profile-required / unknown -> never allowed', async () => {
 assert.equal(await stateFor({access:{core:false}}), 'blocked', 'no core entitlement, no manual unlock');
 assert.equal(await stateFor({access:{core:false}, accessError:true}), 'unverified', 'entitlement read failed');
 assert.equal(await stateFor({access:{core:false}, manualError:true}), 'unverified');
 assert.equal(await stateFor({noSession:true}), 'unverified');
});

test('4: failed or missing reads fail closed without throwing', async () => {
 assert.equal(await stateFor({quizError:true}), 'unverified');
 assert.equal(await stateFor({topicError:true}), 'unverified');
 assert.equal(await stateFor({throwOnRpc:true}), 'unverified');
 assert.equal(await stateFor({englishQuizzes:[]}), 'blocked', 'unknown id or hidden by RLS');
 assert.equal(pa.practiceAccessState(null, 'english', Q1), 'checking', 'loading is not success');
 assert.equal(pa.practiceAccessState({zone:'allowed', accessible:new Set(), unverified:new Set()}, 'science', Q1), 'unverified');
 assert.equal(pa.practiceAccessState({zone:'allowed', accessible:new Set(), unverified:new Set()}, 'english', ''), 'unverified');
});

test('role rules mirror the Core topic page: teacher sees reviewing; admin passes a locked topic', async () => {
 const reviewing = [{id:Q1, topic_id:T1, is_published:true, status:'published', student_visibility:'reviewing'}];
 assert.equal(await stateFor({role:'teacher', englishQuizzes:reviewing}), 'allowed');
 assert.equal(await stateFor({role:'student', englishQuizzes:reviewing}), 'blocked');
 assert.equal(await stateFor({role:'admin', englishTopics:[{id:T1, is_active:true, review_status:'locked'}]}), 'allowed');
 assert.equal(await stateFor({role:'teacher', englishTopics:[{id:T1, is_active:true, review_status:'locked'}]}), 'blocked');
});

/* ---------- 8: no side effects, batched reads ---------- */

test('8: verification only reads tables and the read-only access RPC, batched per subject', async () => {
 const {client, calls} = mockClient({mathQuizzes:[{id:'m1', topic_id:'mt', is_published:true, status:'published', student_visibility:'satisfied'}], mathTopics:[{id:'mt', is_active:true, review_status:'approved'}]});
 const result = await pa.checkPracticeAccess(client, [ref(Q1), ref('q2'), ref('q3'), ref('m1', 'math'), ref('m1', 'math')]);
 const rpcs = calls.filter((c) => c.kind === 'rpc').map((c) => c.name);
 assert.deepEqual(plain(rpcs), ['dreamscape_get_my_learning_access']);
 const tablesRead = calls.filter((c) => c.kind === 'from').map((c) => c.table);
 assert.deepEqual(plain(tablesRead.sort()), ['english_quizzes', 'english_topics', 'learning_mission_zone_access', 'math_quizzes', 'math_topics', 'profiles']);
 const englishQuery = calls.find((c) => c.table === 'english_quizzes').q;
 assert.deepEqual(plain(englishQuery.filters), [['in', 'id', [Q1, 'q2', 'q3']]]);
 assert.deepEqual(plain([...result.accessible].sort()), ['english:' + Q1, 'math:m1'].sort());
 const src = read('lib/nova-plus/practice-access.ts');
 const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
 for (const forbidden of ['_quiz_payload', '_payload_unlocked', 'core_assert_quiz_topic_access', 'core_user_has_access', 'start_nova_learning_cycle', 'attempt', '.insert(', '.update(', '.upsert(', '.delete(']) {
  assert.ok(!code.includes(forbidden), `helper must not use ${forbidden}`);
 }
 const rpcNames = [...code.matchAll(/\.rpc\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
 assert.deepEqual(rpcNames, ['dreamscape_get_my_learning_access'], 'the only RPC is the existing read-only access check');
});

/* ---------- startLearningCycle (real extracted code) ---------- */

function launcher(o = {}) {
 const {client, calls} = mockClient(o);
 const nav = [], starting = [], errors = [];
 let issues = {};
 let snapshot = o.snapshot ?? {key:'k', result:{zone:'allowed', accessible:new Set(['english:' + Q1]), unverified:new Set()}};
 const learnerRef = {current:'learner-1'};
 const fn = extractFunction('startLearningCycle', {
  canLaunchPractice:o.canLaunchPractice ?? true, learnerId:'learner-1', learnerRef, supabase:client,
  checkPracticeAccess: async (c, refs) => { const r = await pa.checkPracticeAccess(c, refs); if (o.switchLearnerDuringCheck) learnerRef.current = 'learner-2'; return r; },
  practiceAccessState:pa.practiceAccessState, practiceQuizKey:pa.practiceQuizKey,
  setStartingSkillId:(v) => starting.push(v), setError:(v) => errors.push(v),
  setAccessSnapshot:(u) => { snapshot = typeof u === 'function' ? u(snapshot) : u; },
  classifyCycleStartError:pa.classifyCycleStartError, serverPracticeHref:pa.serverPracticeHref, currentGeneration:1,
  setStartIssues:(u) => { issues = typeof u === 'function' ? u(issues) : u; },
  window:{location:{assign:(href) => nav.push(href)}},
 });
 // The client-held href is deliberately different: only the server href may be used.
 const item = {skill_id:'skill-1', subject:'english', lane:'focus_now', quiz:{quiz_id:o.quizId ?? Q1, quiz_href:'/client-held/href-must-not-be-used'}};
 return {run:() => fn(item), calls, nav, starting, errors, snapshot:() => snapshot, issues:() => issues};
}
const startCalls = (calls) => calls.filter((c) => c.kind === 'rpc' && (c.name === 'start_nova_learning_cycle' || c.name === 'start_nova_learning_cycle_for_quiz'));

test('1: allowed learner starts exactly one cycle via the quiz-specific RPC, then navigates to the SERVER href', async () => {
 const l = launcher();
 await l.run();
 assert.equal(startCalls(l.calls).length, 1);
 assert.equal(startCalls(l.calls)[0].name, 'start_nova_learning_cycle_for_quiz');
 assert.deepEqual(plain(startCalls(l.calls)[0].args), {p_student_user_id:'learner-1', p_skill_id:'skill-1', p_quiz_id:Q1});
 assert.deepEqual(plain(l.nav), [`/learning-missions/core/english/p4/quiz/${Q1}`], 'never the client-held href');
 // The client check still runs before the server start.
 const order = l.calls.filter((c) => c.kind === 'rpc').map((c) => c.name);
 assert.deepEqual(plain(order), ['dreamscape_get_my_learning_access', 'start_nova_learning_cycle_for_quiz']);
});

test('B2: server refusals become card states, never a full-tab error or navigation', async () => {
 for (const [message, expected] of [
  ['PRACTICE_QUIZ_NOT_ACCESSIBLE', 'blocked'], ['CORE_ACCESS_REQUIRED', 'blocked'], ['PRACTICE_QUIZ_NOT_FOR_SKILL', 'blocked'],
  ['LEARNING_PROFILE_REQUIRED', 'blocked'], ['CONCEPT_NOT_CONFIRMED_FOCUS_GAP', 'not_startable'], ['LEARNER_ACCOUNT_REQUIRED', 'not_startable'],
  ['Could not find the function public.start_nova_learning_cycle_for_quiz', 'unverified'],
 ]) {
  const l = launcher({startErrorMessage:message});
  await l.run();
  assert.equal(l.nav.length, 0, message);
  assert.equal(l.issues()['learner-1|english:' + Q1]?.issue, expected, message);
  assert.deepEqual(plain(l.errors), [''], 'no raw error text in the tab');
  assert.equal(l.starting.at(-1), null);
 }
 const rejected = launcher({startReject:true});
 await rejected.run();
 assert.equal(rejected.nav.length, 0);
 assert.equal(rejected.issues()['learner-1|english:' + Q1]?.issue, 'unverified');
});

test('B2: a server response for a different quiz or an unexpected href is not followed', async () => {
 for (const o of [{serverQuizId:'22222222-2222-4222-8222-222222222222'}, {serverHref:'https://evil.example/x'}, {serverHref:'/learning-missions/core/english/p4/quiz/not-a-uuid'}]) {
  const l = launcher(o);
  await l.run();
  assert.equal(l.nav.length, 0, JSON.stringify(o));
  assert.equal(l.issues()['learner-1|english:' + Q1]?.issue, 'unverified');
 }
});

test('2/3: blocked quiz or Core zone -> no cycle, no navigation, card shows unavailable', async () => {
 for (const o of [
  {englishQuizzes:[{id:Q1, topic_id:T1, is_published:true, status:'published', student_visibility:'reviewing'}]},
  {englishTopics:[{id:T1, is_active:true, review_status:'locked'}]},
  {access:{core:false}},
  {quizError:true},
  {noSession:true},
 ]) {
  const l = launcher(o);
  await l.run();
  assert.equal(startCalls(l.calls).length, 0, JSON.stringify(o));
  assert.equal(l.nav.length, 0, JSON.stringify(o));
  assert.equal(l.starting.at(-1), null, 'starting state cleared, not stuck');
  assert.equal(l.snapshot().result.accessible.has('english:' + Q1), false);
  assert.deepEqual(plain(l.errors), [''], 'no full-page error that would hide the insight');
 }
});

test('5: a learner switch during verification stops the launch', async () => {
 const l = launcher({switchLearnerDuringCheck:true});
 await l.run();
 assert.equal(startCalls(l.calls).length, 0);
 assert.equal(l.nav.length, 0);
});

test('7: a viewer who is not the learner (parent, admin preview) cannot launch', async () => {
 const l = launcher({canLaunchPractice:false});
 await l.run();
 assert.equal(l.calls.length, 0, 'no reads, no cycle');
 assert.equal(l.nav.length, 0);
});

/* ---------- card / alternative / cycle link guards ---------- */

test('6/7: card action needs confirmed access for the learner; admin preview keeps its preview link', () => {
 const item = {subject:'english', quiz:{quiz_id:Q1}};
 const mayOpen = (canLaunchPractice, isAdminPreview, access) => {
  const accessFor = () => access;
  const practiceAccess = evalFirstConst('practiceAccess', {canLaunchPractice, accessFor, item});
  return evalFirstConst('mayOpen', {missionAvailable:true, canLaunchPractice, practiceAccess, isAdminPreview});
 };
 assert.equal(mayOpen(true, false, 'allowed'), true);
 for (const access of ['checking', 'blocked', 'unverified']) assert.equal(mayOpen(true, false, access), false, access);
 assert.equal(mayOpen(false, false, 'allowed'), false, 'parent view: account notice, no link');
 assert.equal(mayOpen(false, true, 'blocked'), true, 'admin preview of another learner: preview link unchanged');
 assert.equal(evalFirstConst('mayOpen', {missionAvailable:false, canLaunchPractice:true, practiceAccess:'allowed', isAdminPreview:false}), false);
});

test('6: alternatives and Continue Practice are links only when access is confirmed', () => {
 const src = read(REC);
 assert.match(src, /alternative\.quiz_href &&\s*\(canLaunchPractice\s*\?\s*accessFor\(\s*item\.subject,\s*alternative\.quiz_id,\s*\) === "allowed"\s*:\s*isAdminPreview\)/);
 assert.match(src, /cycle\.recommended_quiz_href &&\s*practiceAccess === "allowed" \? \(\s*<a/);
 assert.match(src, /accessFor\(cycle\.subject, cycle\.recommended_quiz_id\)/);
 assert.doesNotMatch(src, /recommended_quiz_href\s*=/, 'server-selected cycle link is never rewritten');
});

test('5: access results apply only to the learner and quiz set they were computed for', () => {
 const result = {zone:'allowed', accessible:new Set(['english:' + Q1]), unverified:new Set()};
 assert.equal(evalFirstConst('currentAccess', {accessSnapshot:{key:'learner-A|english:q', result}, accessKey:'learner-B|english:q'}), null);
 assert.equal(evalFirstConst('currentAccess', {accessSnapshot:{key:'learner-B|english:q', result}, accessKey:'learner-B|english:q'}), result);
 const src = read(REC);
 assert.match(src, /`\$\{learnerId\}\|/);
 assert.match(src, /if \(!cancelled\) \{\s*setAccessSnapshot\(\{\s*key: accessKey,\s*result,\s*generation: \+\+generationRef\.current,/, 'late responses dropped; each fresh verification gets a new generation');
 assert.match(src, /if \(!canLaunchPractice \|\| !accessRefs\.length\) return;/, 'no checks for parent or admin preview');
});

/* ---------- Phase 2B-2D-B2 review fix: stale refusal recovery ---------- */

// Re-extracts the REAL accessFor / startLearningCycle / retryAccess from the
// component for the current state, the way React re-renders with new state.
function recoveryHarness(o = {}) {
 const state = {opts:{...o}, snapshot:null, issues:{}, nav:[], retrying:false, learner:'learner-1', generation:0};
 const mock = () => mockClient(state.opts);
 const learnerRef = {get current() { return state.learner; }};
 const refs = [{subject:'english', quizId:Q1}];
 const accessKey = () => `${state.learner}|english:${Q1}`;
 const render = () => {
  const {client, calls} = mock();
  state.calls = calls;
  const currentAccess = evalFirstConst('currentAccess', {accessSnapshot:state.snapshot, accessKey:accessKey()});
  const currentGeneration = evalFirstConst('currentGeneration', {accessSnapshot:state.snapshot, accessKey:accessKey()});
  const accessFor = evalFirstConst('accessFor', {startIssues:state.issues, learnerId:state.learner, practiceQuizKey:pa.practiceQuizKey, currentAccess, currentGeneration, practiceAccessState:pa.practiceAccessState});
  const common = {canLaunchPractice:true, learnerId:state.learner, learnerRef, supabase:client, checkPracticeAccess:pa.checkPracticeAccess, PracticeAccessClient:undefined,
   setAccessSnapshot:(u) => { state.snapshot = typeof u === 'function' ? u(state.snapshot) : u; },
   generationRef:{get current() { return state.generation; }, set current(v) { state.generation = v; }}};
  const start = extractFunction('startLearningCycle', {...common, currentGeneration, practiceAccessState:pa.practiceAccessState, practiceQuizKey:pa.practiceQuizKey,
   classifyCycleStartError:pa.classifyCycleStartError, serverPracticeHref:pa.serverPracticeHref,
   setStartingSkillId:() => {}, setError:() => {}, setStartIssues:(u) => { state.issues = typeof u === 'function' ? u(state.issues) : u; },
   window:{location:{assign:(href) => state.nav.push(href)}}});
  const retry = extractFunction('retryAccess', {...common, accessRefs:refs, accessKey:accessKey(), retryingAccess:state.retrying, setRetryingAccess:(v) => { state.retrying = v; }});
  return {access:accessFor('english', Q1), start:() => start({skill_id:'skill-1', subject:'english', quiz:{quiz_id:Q1, quiz_href:'/client-held'}}), retry, calls};
 };
 // Initial verification as the effect would do it.
 const verify = async () => { const {client} = mock(); state.snapshot = {key:accessKey(), result:await pa.checkPracticeAccess(client, refs), generation:++state.generation}; };
 return {state, render, verify};
}
const cycleRpcs = (calls) => calls.filter((c) => c.kind === 'rpc' && /start_nova_learning_cycle/.test(c.name));

test('recovery (a): network failure on start, then "Check again" and a new deliberate click succeeds', async () => {
 const h = recoveryHarness({startReject:true});
 await h.verify();
 assert.equal(h.render().access, 'allowed');
 let r = h.render();
 await r.start();
 assert.equal(h.state.nav.length, 0);
 assert.equal(h.render().access, 'unverified', 'refusal shown on the card');
 // Retry only re-checks access: it never calls a cycle RPC or navigates.
 h.state.opts.startReject = false;
 r = h.render();
 await r.retry();
 assert.equal(cycleRpcs(r.calls).length, 0);
 assert.equal(h.state.nav.length, 0);
 assert.equal(h.render().access, 'allowed', 'stale refusal cleared by a newer verification');
 r = h.render();
 await r.start();
 assert.equal(cycleRpcs(r.calls).length, 1);
 assert.deepEqual(plain(h.state.nav), [`/learning-missions/core/english/p4/quiz/${Q1}`]);
});

test('recovery (b): Core access denied, later unlocked, then recovers', async () => {
 // Client check sees no Core access: blocked, no cycle RPC.
 const h = recoveryHarness({access:{core:false}});
 await h.verify();
 let r = h.render();
 assert.equal(r.access, 'blocked');
 await r.start();
 assert.equal(cycleRpcs(r.calls).length, 0);
 // Core unlocked (e.g. subscription activated); "Check again" re-verifies.
 h.state.opts.access = {core:true};
 r = h.render();
 await r.retry();
 assert.equal(h.render().access, 'allowed');
 r = h.render();
 await r.start();
 assert.equal(cycleRpcs(r.calls).length, 1);
 assert.equal(h.state.nav.length, 1);
});

test('recovery (b2): a SERVER Core refusal stands until fresh verification, then the server decides again', async () => {
 const h = recoveryHarness({startErrorMessage:'CORE_ACCESS_REQUIRED'});
 await h.verify();
 let r = h.render();
 await r.start();
 assert.equal(h.render().access, 'blocked', 'server refusal wins over the earlier client verdict');
 assert.equal(h.render().access, 'blocked', 'still blocked on later renders without new information');
 h.state.opts.startErrorMessage = undefined; // unlocked server-side
 await h.render().retry();
 assert.equal(h.render().access, 'allowed');
 r = h.render();
 await r.start();
 assert.equal(h.state.nav.length, 1);
});

test('recovery (c): no cycle RPC on any failed or unverified access check, including during retry', async () => {
 for (const o of [{quizError:true}, {topicError:true}, {access:{core:false}, accessError:true}, {noSession:true}, {englishQuizzes:[{id:Q1, topic_id:T1, is_published:true, status:'published', student_visibility:'reviewing'}]}]) {
  const h = recoveryHarness(o);
  await h.verify();
  let r = h.render();
  assert.notEqual(r.access, 'allowed', JSON.stringify(o));
  await r.start();
  assert.equal(cycleRpcs(r.calls).length, 0, JSON.stringify(o));
  r = h.render();
  await r.retry();
  assert.equal(cycleRpcs(r.calls).length, 0, 'retry never starts a cycle');
  assert.notEqual(h.render().access, 'allowed', 'still fails closed after retry');
  assert.equal(h.state.nav.length, 0);
 }
});

test('recovery (d): a refusal for one learner never carries over to another learner', async () => {
 const h = recoveryHarness({startErrorMessage:'PRACTICE_QUIZ_NOT_ACCESSIBLE'});
 await h.verify();
 await h.render().start();
 assert.equal(h.render().access, 'blocked');
 h.state.learner = 'learner-2';
 h.state.opts.startErrorMessage = undefined;
 await h.verify();
 assert.equal(h.render().access, 'allowed', 'learner-2 is evaluated on its own verification');
 assert.ok(Object.keys(h.state.issues).every((k) => k.startsWith('learner-1|')));
});

test('recovery: "Check again" appears only on the learner\'s own blocked/unverified card', () => {
 const src = read(REC);
 assert.match(src, /function canRetryAccess\(state: CardPracticeState\) \{\s*return state === "unverified" \|\| state === "blocked";/);
 assert.equal((src.match(/onRetryAccess &&\s*canRetryAccess\(practiceAccess\)/g) || []).length, 2, 'recommendation card + cycle card');
 assert.equal((src.match(/onRetryAccess=\{retryAccess\}/g) || []).length, 4);
 const fn = src.slice(src.indexOf('async function retryAccess'), src.indexOf('async function retryAccess') + 900);
 assert.doesNotMatch(fn, /start_nova_learning_cycle|window\.location/, 'retry never starts or navigates');
});
