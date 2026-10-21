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

const Q1 = 'q-satisfied', T1 = 't-open';
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
 assert.deepEqual(plain([...result.accessible].sort()), ['english:q-satisfied', 'math:m1']);
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
 let snapshot = o.snapshot ?? {key:'k', result:{zone:'allowed', accessible:new Set(['english:' + Q1]), unverified:new Set()}};
 const learnerRef = {current:'learner-1'};
 const fn = extractFunction('startLearningCycle', {
  canLaunchPractice:o.canLaunchPractice ?? true, learnerId:'learner-1', learnerRef, supabase:client,
  checkPracticeAccess: async (c, refs) => { const r = await pa.checkPracticeAccess(c, refs); if (o.switchLearnerDuringCheck) learnerRef.current = 'learner-2'; return r; },
  practiceAccessState:pa.practiceAccessState, practiceQuizKey:pa.practiceQuizKey,
  setStartingSkillId:(v) => starting.push(v), setError:(v) => errors.push(v),
  setAccessSnapshot:(u) => { snapshot = typeof u === 'function' ? u(snapshot) : u; },
  window:{location:{assign:(href) => nav.push(href)}},
 });
 const item = {skill_id:'skill-1', subject:'english', lane:'focus_now', quiz:{quiz_id:o.quizId ?? Q1, quiz_href:'/learning-missions/core/english/p4/quiz/' + (o.quizId ?? Q1)}};
 return {run:() => fn(item), calls, nav, starting, errors, snapshot:() => snapshot};
}
const startCalls = (calls) => calls.filter((c) => c.kind === 'rpc' && c.name === 'start_nova_learning_cycle');

test('1: allowed learner starts exactly one cycle, then navigates', async () => {
 const l = launcher();
 await l.run();
 assert.equal(startCalls(l.calls).length, 1);
 assert.deepEqual(plain(startCalls(l.calls)[0].args), {p_student_user_id:'learner-1', p_skill_id:'skill-1'});
 assert.equal(l.nav.length, 1);
 // Access is verified before the cycle RPC.
 const order = l.calls.filter((c) => c.kind === 'rpc').map((c) => c.name);
 assert.deepEqual(plain(order), ['dreamscape_get_my_learning_access', 'start_nova_learning_cycle']);
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
 assert.match(src, /if \(!cancelled\) setAccessSnapshot\(\{ key: accessKey, result \}\)/);
 assert.match(src, /if \(!canLaunchPractice \|\| !accessRefs\.length\) return;/, 'no checks for parent or admin preview');
});
