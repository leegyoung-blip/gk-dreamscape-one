/**
 * NOVA+ Phase 2B-3B1: schoolwork privacy, authorisation and evidence
 * truthfulness.
 *
 * Synthetic data only (no real learners, files or accounts). Routes are
 * transpiled from production source and run against an in-memory Supabase
 * mock that records every table, RPC, storage and AI call. Component-body
 * functions are extracted verbatim with the TypeScript AST.
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

const ANALYSE = 'app/api/nova-plus/schoolwork/analyse/route.ts';
const COMMIT = 'app/api/nova-plus/schoolwork/commit/route.ts';
const HISTORY = 'app/api/nova-plus/schoolwork/history/route.ts';
const UPLOADER = 'components/nova-plus/NovaSchoolworkUploader.tsx';

function transpile(code) {
 const out = ts.transpileModule(code, {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.Preserve}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 return out.outputText;
}
function load(file, stubs = {}, globals = {}) {
 const mod = {exports:{}};
 const req = (name) => { if (!(name in stubs)) throw new Error(`unexpected import ${name}`); return stubs[name]; };
 vm.runInNewContext(transpile(read(file)), {
  exports:mod.exports, module:mod, require:req, console:{error(){}, warn(){}, log(){}},
  process:{env:{NEXT_PUBLIC_SUPABASE_URL:'http://local.test', NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon', OPENAI_API_KEY:'synthetic-key'}},
  URL, Date, Math, JSON, Promise, setTimeout, clearTimeout, Buffer, TextEncoder, TextDecoder, ...globals,
 });
 return mod.exports;
}
const guards = load('lib/nova-plus/schoolwork-guards.ts');

/* Function declared anywhere (including inside the component), run with an explicit scope. */
function extractFunction(file, name, scope = {}) {
 const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
 let hit = null;
 (function walk(n) { if (hit) return; if (ts.isFunctionDeclaration(n) && n.name?.text === name) hit = n; else ts.forEachChild(n, walk); })(sf);
 assert.ok(hit, `${file}: function ${name} not found`);
 const keys = Object.keys(scope);
 const code = `(function (${keys.join(', ')}) { ${hit.getText(sf)}\n return ${name}; })`;
 return vm.runInNewContext(transpile(code), {Number, String, Math, Object, Boolean})(...keys.map((k) => scope[k]));
}

/* ---------- In-memory Supabase ---------- */
function makeDb(tables, {failOn, onOp} = {}) {
 const ops = [];
 const matches = (row, q) => q.filters.every(([kind, c, v]) => kind === 'eq' ? row[c] === v : v.includes(row[c]));
 function from(table) {
  const q = {table, op:'select', cols:null, filters:[], payload:null};
  const exec = async (single) => {
   ops.push({...q, filters:[...q.filters]});
   if (onOp) await onOp(q, tables);
   if (failOn && failOn(q)) return {data:null, error:new Error(`synthetic failure on ${table}.${q.op}: internal detail /secret/path`)};
   const rows = (tables[table] ||= []);
   if (q.op === 'upsert') {
    const key = q.onConflict || 'id';
    const existing = rows.find((row) => row[key] === q.payload[key]);
    if (existing) Object.assign(existing, q.payload); else rows.push({...q.payload});
    return {data:null, error:null};
   }
   if (q.op === 'insert') {
    const made = (Array.isArray(q.payload) ? q.payload : [q.payload]).map((p, i) => ({id:`${table}-${rows.length + i + 1}`, ...p}));
    rows.push(...made);
    return {data:single ? {...made[0]} : made.map((r) => ({...r})), error:null};
   }
   const hit = rows.filter((r) => matches(r, q));
   if (q.op === 'update') hit.forEach((r) => Object.assign(r, q.payload));
   if (q.op === 'delete') tables[table] = rows.filter((r) => !hit.includes(r));
   const data = single ? (hit[0] ? {...hit[0]} : null) : hit.map((r) => ({...r}));
   if (single === 'strict' && !data) return {data:null, error:new Error('no rows')};
   return {data, error:null, count:hit.length};
  };
  const b = {
   select(cols){ if (q.op === 'select') q.cols = cols; return b; },
   update(p){ q.op = 'update'; q.payload = p; return b; },
   insert(p){ q.op = 'insert'; q.payload = p; return b; },
   upsert(p, o = {}){ q.op = 'upsert'; q.payload = p; q.onConflict = o.onConflict; return b; },
   delete(){ q.op = 'delete'; return b; },
   eq(c, v){ q.filters.push(['eq', c, v]); return b; },
   in(c, v){ q.filters.push(['in', c, v]); return b; },
   neq(){ return b; }, order(){ return b; }, limit(){ return b; }, gte(){ return b; },
   maybeSingle(){ return exec(true); }, single(){ return exec('strict'); },
   then(res, rej){ return exec(false).then(res, rej); },
  };
  return b;
 }
 return {from, ops};
}
function makeStorage() {
 const calls = [];
 const storage = {calls, removeError:null, from(bucket) {
  return {
   createSignedUrl: async (p, ttl) => { calls.push({op:'sign', bucket, path:p, ttl}); return {data:{signedUrl:`https://signed.test/${calls.length}`}, error:null}; },
   remove: async (paths) => { calls.push({op:'remove', bucket, paths}); return {data:null, error:storage.removeError}; },
  };
 }};
 return storage;
}
const json = {NextResponse:{json:(body, init = {}) => ({status:init.status ?? 200, body})}};

/* ---------- Synthetic identities ---------- */
const LEARNER = '11111111-1111-4111-8111-111111111111';
const OTHER_LEARNER = '99999999-9999-4999-8999-999999999999';
const UPLOAD = '22222222-2222-4222-8222-222222222222';
const SKILL = 'MATH-P4-FRAC-COMPARE';
const canonicalPath = `${LEARNER}/${UPLOAD}/worksheet.pdf`;

const upload = (o = {}) => ({
 id:UPLOAD, student_user_id:LEARNER, uploaded_by_user_id:LEARNER, storage_bucket:'nova-schoolwork', storage_path:canonicalPath,
 original_filename:'Jane_Tan_P4_Raffles_Primary.pdf', mime_type:'application/pdf', file_size_bytes:1000, subject_hint:null, primary_level_hint:null,
 status:'uploaded', analysis_revision:0, analysis_started_at:null, ...o,
});
const taxonomyRow = (o = {}) => ({id:'skill-1', skill_code:SKILL, skill_name:'Compare fractions', domain:'Number', topic:'Fractions', public_explanation:'', subject:'math', primary_level:4, source:'nova_curriculum_rollout_sql', is_topic_level:false, is_active:true, review_status:'approved', ...o});
const question = (i, o = {}) => ({item_index:i, page_number:1, question_number:String(i), prompt:`Q${i}`, student_answer:'3/4', expected_answer_visible:'', teacher_mark:'correct', teacher_feedback:'', model_correctness:'correct', extraction_confidence:0.95, correctness_confidence:0.95, notes:'', ...o});
const extraction = (o = {}) => ({assignment_title:'Fractions', subject:'math', primary_level:4, document_quality:'high', teacher_marked:true, pages_detected:1, overall_notes:'', questions:[question(1)], ...o});
const reasonedItem = (i, o = {}) => ({item_index:i, page_number:1, question_number:String(i), prompt:`Q${i}`, student_answer:'3/4', expected_answer:'3/4', teacher_mark:'correct', teacher_feedback:'', final_correctness:'correct', correctness_source:'teacher_mark', extraction_confidence:0.95, correctness_confidence:0.95, primary_skill_code:SKILL, supporting_skill_codes:[], mapping_confidence:0.95, reasoning_note:'', needs_review:false, evidence_recommendation:'include', ...o});
const reasoned = (items = [reasonedItem(1)]) => ({assignment_title:'Fractions', subject:'math', primary_level:4, overall_summary:'ok', strength_skill_codes:[], support_skill_codes:[], items});

/* ---------- Analyse route harness ---------- */
function analyseHarness({row = upload(), canView = true, settings = {}, extract = extraction(), reason = reasoned(), openaiFail = null, items = [], onFetch = null} = {}) {
 const tables = {
  nova_schoolwork_uploads:[row], nova_schoolwork_settings:[{id:1, enabled:true, ...settings}], nova_schoolwork_analyses:[],
  nova_schoolwork_analysis_runs:[], nova_schoolwork_items:items, nova_schoolwork_item_skills:[], learning_skill_taxonomy:[taxonomyRow()],
 };
 const db = makeDb(tables);
 const storage = makeStorage();
 const rpcCalls = [];
 const fetchCalls = [];
 const userClient = {
  auth:{getUser: async () => ({data:{user:{id:LEARNER}}, error:null})},
  rpc: async (name, args) => { rpcCalls.push({name, args}); return {data:canView, error:null}; },
 };
 const fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  fetchCalls.push(body);
  if (onFetch) await onFetch(body, tables);
  if (openaiFail) return {ok:false, status:400, json: async () => ({error:{message:openaiFail}})};
  const out = body.text.format.name === 'nova_schoolwork_extraction_v1' ? extract : reason;
  return {ok:true, status:200, json: async () => ({status:'completed', output_text:JSON.stringify(out), usage:{}})};
 };
 const {POST} = load(ANALYSE, {
  '@supabase/supabase-js':{createClient:() => userClient}, 'next/server':json,
  '@/lib/supabase-admin':{supabaseAdmin:{from:db.from, storage}}, '@/lib/nova-plus/schoolwork-guards':guards,
 }, {fetch});
 const call = (body = {}) => POST(new Request('http://local.test/api/nova-plus/schoolwork/analyse', {method:'POST', headers:{authorization:'Bearer valid', 'content-type':'application/json'}, body:JSON.stringify({upload_id:UPLOAD, ...body})}));
 return {call, db, tables, storage, rpcCalls, fetchCalls};
}
const writesTo = (db, table) => db.ops.filter((o) => o.table === table && o.op !== 'select');

/* ================= Guards ================= */

test('guards: only the canonical private key for this learner and upload is trusted', () => {
 const ok = (o) => guards.isCanonicalSchoolworkObject({bucket:'nova-schoolwork', path:canonicalPath, studentUserId:LEARNER, uploadId:UPLOAD, ...o});
 assert.equal(ok({}), true);
 assert.equal(ok({path:`${OTHER_LEARNER}/${UPLOAD}/worksheet.pdf`}), false, 'cross-learner prefix');
 assert.equal(ok({path:`${LEARNER}/33333333-3333-4333-8333-333333333333/worksheet.pdf`}), false, 'another upload id');
 assert.equal(ok({bucket:'avatars'}), false, 'other bucket');
 assert.equal(ok({bucket:'Nova-Schoolwork'}), false);
 for (const p of [`/${canonicalPath}`, `${LEARNER}/${UPLOAD}/../x.pdf`, `${LEARNER}/${UPLOAD}/..`, `${LEARNER}/${UPLOAD}/a/b.pdf`, `${LEARNER}/${UPLOAD}`, `${LEARNER}/${UPLOAD}/`, `${LEARNER}/${UPLOAD}/w%2F.pdf`, `${LEARNER}/${UPLOAD}/w .pdf`, null, 42]) {
  assert.equal(ok({path:p}), false, String(p));
 }
 assert.equal(ok({studentUserId:'victim'}), false, 'non-UUID identifiers never match');
 const hexId = 'abcdef12-3456-4789-8abc-def123456789';
 assert.equal(ok({studentUserId:hexId, path:`${hexId.toUpperCase()}/${UPLOAD}/w.pdf`}), false, 'case-sensitive prefix match');
 assert.equal(ok({studentUserId:hexId, path:`${hexId}/${UPLOAD}/w.pdf`}), true);
 assert.equal(ok({path:`${LEARNER}/${UPLOAD}/schoolwork`}), true, 'sanitiser fallback name');
 assert.equal(ok({path:`${LEARNER}/${UPLOAD}/Report..final.pdf`}), true, 'double dots inside a name are legitimate');
 assert.equal(ok({path:`${LEARNER}/${UPLOAD}/.`}), false);
 assert.equal(ok({path:`${LEARNER}/${UPLOAD}/${'a'.repeat(900)}.pdf`}), true, 'long names are legitimate');
 assert.equal(ok({path:`${LEARNER}/${UPLOAD}/${'a'.repeat(1000)}.pdf`}), false, 'beyond the 1024-char storage key limit');
});

test('guards: every key the real browser uploader can produce is accepted', () => {
 // The uploader's own sanitiser, extracted verbatim; same id-in-path format in every historical version.
 const sanitiseFilename = extractFunction(UPLOADER, 'sanitiseFilename');
 const names = ['Worksheet 3.pdf', 'Maths – Fractions (P4).PNG', 'café_résumé.jpeg', '数学作业.pdf', '🙂.png', '..pdf', 'a..b.pdf', '---', '.hidden.pdf',
  'Ｆｕｌｌｗｉｄｔｈ.pdf', 'ﬁnal ﬁle.pdf', `${'Long name '.repeat(25)}.pdf`, 'x'.repeat(255)];
 for (const name of names) {
  const key = `${LEARNER}/${UPLOAD}/${sanitiseFilename(name)}`;
  assert.equal(guards.isCanonicalSchoolworkObject({bucket:'nova-schoolwork', path:key, studentUserId:LEARNER, uploadId:UPLOAD}), true, name);
 }
 const src = read(UPLOADER);
 assert.match(src, /const storagePath =\s*`\$\{learnerId\}\/\$\{uploadId\}\/\$\{filename\}`;/);
 assert.match(src, /\.insert\(\{\s*id: uploadId,\s*student_user_id: learnerId,/);
 assert.match(src, /\.from\("nova-schoolwork"\)\s*\.upload\(storagePath/);
});

test('guards: AI filename is neutral for every allowed type', () => {
 assert.deepEqual(['application/pdf', 'image/png', 'image/jpeg', 'text/plain'].map(guards.neutralAiFilename), ['schoolwork.pdf', 'schoolwork.png', 'schoolwork.jpg', 'schoolwork']);
});

test('guards: hint conflicts need a confident contradiction', () => {
 const c = (o) => guards.detectHintConflict({subjectHint:null, levelHint:null, detectedSubject:'math', detectedLevel:4, ...o});
 assert.equal(c({}), null, 'no hints');
 assert.equal(c({subjectHint:'math', levelHint:4}), null, 'agreement');
 assert.equal(c({subjectHint:'english', detectedSubject:'uncertain'}), null, 'uncertain detection is not a contradiction');
 assert.equal(c({levelHint:3, detectedLevel:0}), null, 'out-of-range detection is not a contradiction');
 assert.deepEqual(plain(c({subjectHint:'english'})), {subject:{hint:'english', detected:'math'}, level:null});
 assert.deepEqual(plain(c({levelHint:6})), {subject:null, level:{hint:6, detected:4}});
 assert.match(guards.hintConflictMessage(c({subjectHint:'english', levelHint:6})), /you chose English, but the worksheet looks like Mathematics; you chose Primary 6, but the worksheet looks like Primary 4/);
});

test('guards: analysis start is refused for reviewed, archived and running uploads', () => {
 const now = Date.parse('2026-10-22T10:00:00Z');
 const d = (status, started = null) => plain(guards.analysisStartDecision({status, analysisStartedAt:started, nowMs:now}));
 for (const s of ['uploaded', 'needs_input', 'review_ready', 'failed']) assert.deepEqual(d(s), {ok:true, reclaimStale:false});
 assert.deepEqual(d('approved'), {ok:false, code:'UPLOAD_LOCKED'});
 assert.deepEqual(d('archived'), {ok:false, code:'UPLOAD_LOCKED'});
 assert.deepEqual(d('unknown'), {ok:false, code:'UPLOAD_LOCKED'});
 assert.deepEqual(d('analysing', '2026-10-22T09:50:00Z'), {ok:false, code:'ANALYSIS_IN_PROGRESS'});
 assert.deepEqual(d('analysing', null), {ok:false, code:'ANALYSIS_IN_PROGRESS'});
 assert.deepEqual(d('analysing', '2026-10-22T09:40:00Z'), {ok:true, reclaimStale:true});
});

test('guards: commit decisions must cover every stored item exactly once', () => {
 const dec = (i, o = {}) => ({item_index:i, decision:'include', skill_code:SKILL, correctness:'correct', mapping_edited:false, correctness_edited:false, ...o});
 const v = (d, idx = [1, 2]) => plain(guards.validateCommitDecisions(d, idx));
 assert.deepEqual(v([dec(1), dec(2)]), {ok:true});
 assert.deepEqual(v([dec(1)]), {ok:false, code:'DECISIONS_INCOMPLETE'});
 assert.deepEqual(v([dec(1), dec(1)]), {ok:false, code:'DECISIONS_DUPLICATE'});
 assert.deepEqual(v([dec(1), dec(2), dec(3)]), {ok:false, code:'DECISIONS_UNKNOWN_ITEM'});
 assert.deepEqual(v([dec(1), dec(2, {skill_code:' '})]), {ok:false, code:'DECISION_SKILL_REQUIRED'});
 assert.deepEqual(v([dec(1), dec(2, {correctness:'uncertain'})]), {ok:false, code:'DECISION_CORRECTNESS_REQUIRED'});
 assert.deepEqual(v([dec(1), dec(2, {decision:'exclude', skill_code:'', correctness:'uncertain'})]), {ok:true}, 'excluded items need no concept');
});

test('guards: public errors never echo arbitrary text; refresh status is three-valued', () => {
 assert.equal(guards.publicSchoolworkError('relation "x" does not exist'), guards.publicSchoolworkError('REQUEST_FAILED'));
 assert.equal(guards.masteryRefreshStatus({affectedSkillCount:0, refreshed:false}), 'not_needed');
 assert.equal(guards.masteryRefreshStatus({affectedSkillCount:2, refreshed:false}), 'pending');
 assert.equal(guards.masteryRefreshStatus({affectedSkillCount:2, refreshed:true}), 'refreshed');
});

/* ================= Analyse route ================= */

test('analyse: forged cross-learner storage path is refused before any signing, AI call or write', async () => {
 const forged = `${OTHER_LEARNER}/${UPLOAD}/their-homework.pdf`;
 const h = analyseHarness({row:upload({storage_path:forged})});
 const res = await h.call({subject_hint:'math', primary_level_hint:4});
 assert.equal(res.status, 422);
 assert.equal(res.body.error_code, 'STORAGE_OBJECT_INVALID');
 assert.equal(h.storage.calls.length, 0, 'no service-role signing');
 assert.equal(h.fetchCalls.length, 0, 'nothing sent to the AI provider');
 assert.equal(writesTo(h.db, 'nova_schoolwork_uploads').length, 0, 'no hint write or claim');
 assert.equal(writesTo(h.db, 'nova_schoolwork_analysis_runs').length, 0);
 assert.doesNotMatch(JSON.stringify(res.body), new RegExp(OTHER_LEARNER), 'stored path is not echoed');
});

test('analyse: forged bucket is refused the same way', async () => {
 for (const bucket of ['avatars', 'public-assets', '']) {
  const h = analyseHarness({row:upload({storage_bucket:bucket})});
  const res = await h.call();
  assert.equal(res.status, 422, bucket);
  assert.equal(h.storage.calls.length, 0);
  assert.equal(h.fetchCalls.length, 0);
 }
});

test('analyse: approved and archived uploads are never re-analysed (no deletes, no AI call)', async () => {
 for (const status of ['approved', 'archived']) {
  const kept = {id:'item-1', upload_id:UPLOAD, item_index:1, included_in_profile:true};
  const h = analyseHarness({row:upload({status}), items:[kept]});
  const res = await h.call({trigger_source:'reanalyse'});
  assert.equal(res.status, 409, status);
  assert.equal(res.body.error_code, 'UPLOAD_LOCKED');
  assert.equal(h.storage.calls.length, 0);
  assert.equal(h.fetchCalls.length, 0);
  assert.equal(h.db.ops.filter((o) => o.op === 'delete').length, 0);
  assert.deepEqual(plain(h.tables.nova_schoolwork_items), [kept]);
  assert.equal(h.tables.nova_schoolwork_uploads[0].status, status, 'status untouched');
 }
});

test('analyse: a running analysis blocks a second one; parallel requests produce exactly one run', async () => {
 const busy = analyseHarness({row:upload({status:'analysing', analysis_started_at:new Date().toISOString()})});
 const res = await busy.call();
 assert.equal(res.status, 409);
 assert.equal(res.body.error_code, 'ANALYSIS_IN_PROGRESS');
 assert.equal(busy.storage.calls.length, 0);

 const h = analyseHarness();
 const [a, b] = await Promise.all([h.call(), h.call()]);
 const statuses = [a.status, b.status].sort();
 assert.deepEqual(statuses, [200, 409]);
 assert.equal(h.tables.nova_schoolwork_analysis_runs.length, 1, 'only the claim winner creates a run');
 assert.equal(h.storage.calls.length, 1, 'only the claim winner signs the file');
});

test('analyse: success signs only the canonical key and never sends the original filename to the AI', async () => {
 const h = analyseHarness();
 const res = await h.call();
 assert.equal(res.status, 200, JSON.stringify(res.body));
 assert.deepEqual(plain(h.storage.calls), [{op:'sign', bucket:'nova-schoolwork', path:canonicalPath, ttl:900}]);
 assert.equal(h.fetchCalls.length, 2);
 for (const body of h.fetchCalls) {
  assert.equal(body.input[0].content[0].filename, 'schoolwork.pdf');
  assert.doesNotMatch(JSON.stringify(body), /Jane|Tan|Raffles/);
 }
 assert.equal(h.tables.nova_schoolwork_uploads[0].original_filename, 'Jane_Tan_P4_Raffles_Primary.pdf', 'kept privately for history');
});

test('analyse: 81+ questions are refused, never silently truncated', async () => {
 const h = analyseHarness({extract:extraction({questions:Array.from({length:81}, (_, i) => question(i + 1))})});
 const res = await h.call();
 assert.equal(res.status, 422);
 assert.equal(res.body.error_code, 'QUESTION_LIMIT_EXCEEDED');
 assert.equal(res.body.max_questions, 80);
 assert.equal(h.fetchCalls.length, 1, 'no reasoning call');
 assert.equal(h.fetchCalls[0].text.format.schema.properties.questions.maxItems, 81, 'schema leaves room to detect overflow');
 assert.equal(h.tables.nova_schoolwork_items.length, 0);
 assert.equal(h.tables.nova_schoolwork_uploads[0].status, 'needs_input');
 assert.match(h.tables.nova_schoolwork_uploads[0].error_message, /split it into smaller uploads/);

 const exact = analyseHarness({extract:extraction({questions:Array.from({length:80}, (_, i) => question(i + 1))}), reason:reasoned(Array.from({length:80}, (_, i) => reasonedItem(i + 1)))});
 const ok = await exact.call();
 assert.equal(ok.status, 200);
 assert.equal(ok.body.items.length, 80);

 const over = analyseHarness({reason:reasoned(Array.from({length:81}, (_, i) => reasonedItem(i + 1)))});
 const r = await over.call();
 assert.equal(r.status, 500);
 assert.equal(over.tables.nova_schoolwork_items.length, 0, 'reasoning overflow is refused too');
 assert.match(r.body.error, /split it into smaller uploads/);
});

test('analyse: a configured lower limit is enforced the same way', async () => {
 const h = analyseHarness({settings:{max_questions:5}, extract:extraction({questions:Array.from({length:6}, (_, i) => question(i + 1))})});
 const res = await h.call();
 assert.equal(res.status, 422);
 assert.equal(h.fetchCalls[0].text.format.schema.properties.questions.maxItems, 6);
});

test('analyse: a subject/level hint that contradicts the extraction asks for confirmation', async () => {
 const h = analyseHarness({row:upload({subject_hint:'english', primary_level_hint:4})});
 const res = await h.call();
 assert.equal(res.status, 422);
 assert.equal(res.body.error_code, 'HINT_CONFLICT');
 assert.deepEqual(plain(res.body.conflict), {subject:{hint:'english', detected:'math'}, level:null});
 assert.equal(h.fetchCalls.length, 1, 'no reasoning against an unconfirmed scope');
 assert.equal(h.tables.nova_schoolwork_items.length, 0);
 assert.equal(h.tables.nova_schoolwork_uploads[0].status, 'needs_input');

 // The reviewer explicitly confirms the scope from the needs_input screen.
 const confirmed = analyseHarness({row:upload({status:'needs_input', subject_hint:'english', primary_level_hint:4})});
 confirmed.tables.learning_skill_taxonomy.push(taxonomyRow({id:'skill-e', skill_code:'ENG-P4-X', subject:'english'}));
 const ok = await confirmed.call({trigger_source:'needs_input_retry', subject_hint:'english', primary_level_hint:4});
 assert.equal(ok.status, 200, JSON.stringify(ok.body));
 assert.equal(ok.body.upload.subject, 'english');

 // A plain retry is not a confirmation.
 const retry = analyseHarness({row:upload({status:'failed', subject_hint:'english', primary_level_hint:4})});
 assert.equal((await retry.call({trigger_source:'manual_retry'})).body.error_code, 'HINT_CONFLICT');
});

test('analyse: low-confidence, uncertain, unclear or blank correctness requires review', async () => {
 const items = [
  reasonedItem(1),
  reasonedItem(2, {correctness_confidence:0.6}),
  reasonedItem(3, {teacher_mark:'unclear'}),
  reasonedItem(4, {student_answer:'  '}),
  reasonedItem(5, {final_correctness:'uncertain'}),
 ];
 const h = analyseHarness({extract:extraction({questions:items.map((_, i) => question(i + 1))}), reason:reasoned(items)});
 const res = await h.call();
 assert.equal(res.status, 200, JSON.stringify(res.body));
 assert.deepEqual(plain(res.body.items.map((i) => i.needs_review)), [false, true, true, true, true]);
 assert.deepEqual(plain(h.tables.nova_schoolwork_items.map((i) => i.needs_review)), [false, true, true, true, true], 'stored flag matches response');
});

test('analyse: provider and database errors are never shown or stored as raw text', async () => {
 const raw = 'Invalid file_url https://storage.internal/object/sign/secret-token for org-123';
 const h = analyseHarness({openaiFail:raw});
 const res = await h.call();
 assert.equal(res.status, 500);
 const visible = JSON.stringify([res.body, h.tables.nova_schoolwork_uploads, h.tables.nova_schoolwork_analysis_runs, h.tables.nova_schoolwork_analyses]);
 assert.doesNotMatch(visible, /secret-token|storage\.internal|org-123/);
 assert.equal(h.tables.nova_schoolwork_uploads[0].status, 'failed');

 const src = read(ANALYSE);
 assert.match(src, /\/\/ Raw database \/ storage \/ model text is never shown to users\.\n\s*return publicSchoolworkError\("ANALYSIS_FAILED"\);/);
 assert.doesNotMatch(src, /error\.message\.slice\(0, 4000\)/, 'runs rows no longer store raw messages');
});

test('analyse: a review committed during analysis is never overwritten', async () => {
 const h = analyseHarness({onFetch:async (body, tables) => {
  if (body.text.format.name !== 'nova_schoolwork_extraction_v1') {
   tables.nova_schoolwork_uploads[0].status = 'approved';
   tables.nova_schoolwork_items.push({id:'kept', upload_id:UPLOAD, item_index:1, included_in_profile:true});
  }
 }});
 const res = await h.call();
 assert.equal(res.status, 409);
 assert.equal(res.body.error_code, 'ANALYSIS_SUPERSEDED');
 assert.equal(h.db.ops.filter((o) => o.op === 'delete').length, 0);
 assert.equal(h.tables.nova_schoolwork_uploads[0].status, 'approved');
 assert.equal(h.tables.nova_schoolwork_items.length, 1);
});

test('analyse: hint writes happen only after every guard', () => {
 const post = read(ANALYSE).slice(read(ANALYSE).indexOf('export async function POST'));
 const hintWrite = post.indexOf('.update(updates)');
 for (const guard of ['isCanonicalSchoolworkObject(', 'analysisStartDecision(', 'ALLOWED_MIME_TYPES.has', 'FILE_TOO_LARGE']) {
  assert.ok(post.indexOf(guard) > 0 && post.indexOf(guard) < hintWrite, guard);
 }
 assert.ok(post.indexOf('isCanonicalSchoolworkObject(') < post.indexOf('createSignedUrl('));
});

/* ================= Commit route ================= */

const decision = (i, o = {}) => ({item_index:i, decision:'include', skill_code:SKILL, correctness:'correct', mapping_edited:false, correctness_edited:false, ...o});
function commitHarness({canView = true, viewError = null, row = upload({status:'review_ready', detected_subject:'math', detected_primary_level:4}), items = [{id:'i1', upload_id:UPLOAD, item_index:1}, {id:'i2', upload_id:UPLOAD, item_index:2}], commitError = null, refreshError = null, affected = ['skill-1']} = {}) {
 const tables = {nova_schoolwork_uploads:row ? [row] : [], nova_schoolwork_items:items, learning_skill_taxonomy:[taxonomyRow(), taxonomyRow({id:'skill-eng', skill_code:'ENG-P4-X', subject:'english'}), taxonomyRow({id:'skill-listen', skill_code:'ENG-P4-LISTEN', subject:'english', domain:'Listening', topic:'Listening comprehension'})], learner_skill_mastery:[{student_user_id:LEARNER, skill_id:'skill-1', status:'secure'}]};
 const db = makeDb(tables);
 const rpcCalls = [];
 const client = {
  auth:{getUser: async () => ({data:{user:{id:'viewer-1'}}, error:null})},
  rpc: async (name, args) => {
   rpcCalls.push({name, args, opIndex:db.ops.length});
   if (name === 'nova_plus_can_view_student') return {data:viewError ? null : canView, error:viewError};
   if (name === 'commit_nova_schoolwork_review') return commitError ? {data:null, error:{message:commitError}} : {data:{status:'approved', items_included:2, items_excluded:0, affected_skill_ids:affected}, error:null};
   if (name === 'refresh_learner_skill_mastery_for_skills') return {data:null, error:refreshError};
   return {data:null, error:null};
  },
 };
 const {POST} = load(COMMIT, {'@supabase/supabase-js':{createClient:() => client}, 'next/server':json, '@/lib/supabase-admin':{supabaseAdmin:{from:db.from}}, '@/lib/nova-plus/schoolwork-guards':guards});
 const call = (body) => POST(new Request('http://local.test/api/nova-plus/schoolwork/commit', {method:'POST', headers:{authorization:'Bearer valid', 'content-type':'application/json'}, body:JSON.stringify({upload_id:UPLOAD, decisions:[decision(1), decision(2)], ...body})}));
 return {call, db, rpcCalls};
}
const rpcNames = (h) => h.rpcCalls.map((c) => c.name);

test('commit: unauthorised viewer is refused before any learning-data read or commit RPC', async () => {
 for (const opts of [{canView:false}, {viewError:{message:'rpc down'}}]) {
  const h = commitHarness(opts);
  const res = await h.call();
  assert.equal(res.status, 404);
  assert.deepEqual(rpcNames(h), ['nova_plus_can_view_student']);
  assert.equal(h.rpcCalls[0].args.p_student_user_id, LEARNER);
  assert.deepEqual(h.db.ops.map((o) => `${o.table}:${o.cols}`), ['nova_schoolwork_uploads:id,student_user_id'], 'only the owner column is read');
 }
});

test('commit: missing and unauthorised uploads are indistinguishable', async () => {
 const missing = await commitHarness({row:null}).call();
 const denied = await commitHarness({canView:false}).call();
 const badId = await commitHarness().call({upload_id:'not-a-uuid'});
 assert.deepEqual(plain(missing), plain(denied));
 assert.deepEqual(plain(badId), plain(denied));
});

test('commit: incomplete, duplicate or unknown decisions never reach the RPC', async () => {
 for (const decisions of [[decision(1)], [decision(1), decision(1)], [decision(1), decision(2), decision(7)], [decision(1), decision(2, {correctness:'uncertain'})]]) {
  const h = commitHarness();
  const res = await h.call({decisions});
  assert.equal(res.status, 400, JSON.stringify(decisions));
  assert.ok(!rpcNames(h).includes('commit_nova_schoolwork_review'));
 }
});

test('commit: a concept from another subject or level is refused', async () => {
 const h = commitHarness();
 const res = await h.call({decisions:[decision(1), decision(2, {skill_code:'ENG-P4-X'})]});
 assert.equal(res.status, 400);
 assert.equal(res.body.error_code, 'DECISION_SKILL_INVALID');
 assert.ok(!rpcNames(h).includes('commit_nova_schoolwork_review'));
});

test('commit: English listening / viewing concepts are refused, matching the commit RPC', async () => {
 const row = upload({status:'review_ready', detected_subject:'english', detected_primary_level:4});
 const res = await commitHarness({row, items:[{id:'i1', upload_id:UPLOAD, item_index:1}]}).call({decisions:[decision(1, {skill_code:'ENG-P4-LISTEN'})]});
 assert.equal(res.status, 400);
 assert.equal(res.body.error_code, 'DECISION_SKILL_INVALID');
});

test('commit: only fresh reviews and "Edit Analysis" can be committed', async () => {
 for (const status of ['analysing', 'archived', 'uploaded', 'failed', 'needs_input']) {
  const h = commitHarness({row:upload({status, detected_subject:'math', detected_primary_level:4})});
  assert.equal((await h.call()).status, 409, status);
  assert.ok(!rpcNames(h).includes('commit_nova_schoolwork_review'));
 }
 const edit = commitHarness({row:upload({status:'approved', detected_subject:'math', detected_primary_level:4})});
 assert.equal((await edit.call()).status, 200);
});

test('commit: a failed mastery refresh is reported as saved-but-pending', async () => {
 const h = commitHarness({refreshError:{message:'statement timeout'}});
 const res = await h.call();
 assert.equal(res.status, 200);
 assert.equal(res.body.result.mastery_refreshed, false);
 assert.equal(res.body.result.mastery_refresh_status, 'pending');
 assert.match(res.body.result.mastery_refresh_warning, /evidence was saved, but the mastery recalculation is still pending/);
 assert.doesNotMatch(JSON.stringify(res.body), /statement timeout/);

 const ok = await commitHarness().call();
 assert.equal(ok.body.result.mastery_refresh_status, 'refreshed');
 const none = await commitHarness({affected:[]}).call({decisions:[decision(1, {decision:'exclude'}), decision(2, {decision:'exclude'})]});
 assert.equal(none.body.result.mastery_refresh_status, 'not_needed');
});

test('commit: RPC and unexpected errors return fixed copy, never raw database text', async () => {
 const raw = 'duplicate key value violates unique constraint "learner_profile_events_pkey" detail secret';
 const res = await commitHarness({commitError:raw}).call();
 assert.equal(res.status, 400);
 assert.doesNotMatch(JSON.stringify(res.body), /duplicate key|secret|pkey/);
 assert.equal(res.body.error_code, 'COMMIT_REJECTED');
});

test('commit: the RPC is called after authorisation, with normalised decisions', async () => {
 const h = commitHarness();
 await h.call({decisions:[decision('1'), decision(2, {skill_code:` ${SKILL} `})]});
 const names = rpcNames(h);
 assert.ok(names.indexOf('nova_plus_can_view_student') < names.indexOf('commit_nova_schoolwork_review'));
 const sent = h.rpcCalls.find((c) => c.name === 'commit_nova_schoolwork_review').args.p_decisions;
 assert.deepEqual(sent.map((d) => [d.item_index, d.skill_code]), [[1, SKILL], [2, SKILL]]);
});

/* ================= History route ================= */

function historyHarness({row = upload({status:'approved'}), canView = true, items = []} = {}) {
 const tables = {nova_schoolwork_uploads:[row], nova_schoolwork_items:items, nova_schoolwork_analyses:[], nova_schoolwork_analysis_runs:[], nova_schoolwork_item_skills:[], learning_skill_taxonomy:[]};
 const db = makeDb(tables);
 const storage = makeStorage();
 const rpcCalls = [];
 const client = {
  auth:{getUser: async () => ({data:{user:{id:'viewer-1'}}, error:null})},
  rpc: async (name, args) => { rpcCalls.push({name, args}); return name === 'nova_plus_can_view_student' ? {data:canView, error:null} : {data:{status:'deleted', storage_bucket:row.storage_bucket, storage_path:row.storage_path, profile_events_deleted:0}, error:null}; },
 };
 const mod = load(HISTORY, {'@supabase/supabase-js':{createClient:() => client}, 'next/server':json, '@/lib/supabase-admin':{supabaseAdmin:{from:db.from, storage}}, '@/lib/nova-plus/schoolwork-guards':guards});
 const get = () => mod.GET(new Request(`http://local.test/api/nova-plus/schoolwork/history?student_id=${LEARNER}&upload_id=${UPLOAD}`, {headers:{authorization:'Bearer valid'}}));
 const post = (body) => mod.POST(new Request('http://local.test/api/nova-plus/schoolwork/history', {method:'POST', headers:{authorization:'Bearer valid', 'content-type':'application/json'}, body:JSON.stringify({upload_id:UPLOAD, ...body})}));
 return {get, post, storage, rpcCalls, tables};
}

test('history: a forged path is never signed for preview and no path is returned', async () => {
 const h = historyHarness({row:upload({storage_path:`${OTHER_LEARNER}/${UPLOAD}/x.pdf`})});
 const res = await h.get();
 assert.equal(res.status, 200);
 assert.equal(res.body.preview_url, null);
 assert.equal(h.storage.calls.length, 0);
 assert.ok(!('storage_path' in res.body.upload) && !('storage_bucket' in res.body.upload));

 const ok = historyHarness();
 const good = await ok.get();
 assert.match(good.body.preview_url, /^https:\/\/signed\.test\//);
 assert.deepEqual(plain(ok.storage.calls), [{op:'sign', bucket:'nova-schoolwork', path:canonicalPath, ttl:600}]);
});

test('history: delete never removes a forged object; canonical cleanup errors stay private', async () => {
 const forged = historyHarness({row:upload({storage_bucket:'avatars', storage_path:`${OTHER_LEARNER}/avatar.png`})});
 const res = await forged.post({action:'delete'});
 assert.equal(res.status, 200);
 assert.deepEqual(forged.rpcCalls.map((c) => c.name), ['nova_plus_can_view_student', 'delete_nova_schoolwork_upload']);
 assert.equal(forged.storage.calls.length, 0, 'no service-role removal');

 const ok = historyHarness();
 ok.storage.removeError = {message:'internal storage detail'};
 const r = await ok.post({action:'delete'});
 assert.equal(r.status, 200);
 assert.deepEqual(plain(ok.storage.calls), [{op:'remove', bucket:'nova-schoolwork', paths:[canonicalPath]}]);
 assert.doesNotMatch(JSON.stringify(r.body), /internal storage detail/);
 assert.doesNotMatch(JSON.stringify(r.body), new RegExp(`${LEARNER}/`), 'the RPC-echoed storage path is not returned');
 assert.equal(r.body.result.profile_events_deleted, 0);
});

test('history: management of missing and unauthorised uploads is indistinguishable and calls no RPC', async () => {
 const denied = historyHarness({canView:false});
 const a = await denied.post({action:'delete'});
 assert.deepEqual(denied.rpcCalls.map((c) => c.name), ['nova_plus_can_view_student']);
 const missing = historyHarness();
 missing.tables.nova_schoolwork_uploads.length = 0;
 const b = await missing.post({action:'delete'});
 assert.deepEqual(plain(a), plain(b));
 assert.equal(a.status, 404);
});

test('history: reopening a reviewed upload keeps the reviewer\'s exclusion', async () => {
 const items = [
  {id:'i1', upload_id:UPLOAD, item_index:1, evidence_recommendation:'include', included_in_profile:false, approved_at:'2026-10-01T00:00:00Z', final_correctness:'correct'},
  {id:'i2', upload_id:UPLOAD, item_index:2, evidence_recommendation:'exclude', included_in_profile:true, approved_at:'2026-10-01T00:00:00Z', final_correctness:'correct'},
 ];
 const h = historyHarness({row:upload({status:'approved', reviewed_at:'2026-10-01T00:00:00Z'}), items});
 const res = await h.get();
 const out = res.body.analysis_result.items;
 assert.deepEqual(out.map((i) => [i.evidence_recommendation, i.review_decision]), [['include', 'exclude'], ['exclude', 'include']]);

 const fresh = historyHarness({row:upload({status:'review_ready'}), items:[{...items[0], approved_at:null}]});
 assert.equal((await fresh.get()).body.analysis_result.items[0].review_decision, null, 'unreviewed items carry no decision');
});

/* ================= Uploader ================= */

const defaultReviewState = extractFunction(UPLOADER, 'defaultReviewState');
const reviewItem = (o = {}) => ({item_index:1, evidence_recommendation:'include', needs_review:false, primary_skill:{skill_code:SKILL}, final_correctness:'correct', ...o});

test('uploader: saved reviewer decisions win over the model recommendation on reopen', () => {
 const state = (o) => defaultReviewState({items:[reviewItem(o)]})[1].decision;
 assert.equal(state({review_decision:'exclude'}), 'exclude', 'a previously excluded item is not pre-included');
 assert.equal(state({review_decision:'include', needs_review:true}), 'include', 'a previous inclusion is preserved');
 assert.equal(state({review_decision:'include', final_correctness:'uncertain'}), 'review', 'never pre-included without a definite result');
 assert.equal(state({review_decision:'include', primary_skill:null}), 'review');
 assert.equal(state({}), 'include', 'fresh analysis behaviour unchanged');
 assert.equal(state({needs_review:true}), 'review');
});

test('uploader: double clicks start only one commit, and a network failure never leaves a stuck modal', async () => {
 const make = (submit) => {
  const s = {stage:'review', error:'', submits:0};
  const ref = {current:false};
  const fn = extractFunction(UPLOADER, 'commitReview', {result:{items:[]}, unresolvedCount:0, commitInFlightRef:ref, setError:(v) => { s.error = v; }, setStage:(v) => { s.stage = v; }, submitReview:() => { s.submits += 1; return submit(); }});
  return {s, ref, fn};
 };
 let release;
 const slow = make(() => new Promise((r) => { release = r; }));
 const first = slow.fn();
 const second = slow.fn();
 assert.equal(slow.s.submits, 1, 'second click ignored while in flight');
 assert.equal(slow.s.stage, 'committing');
 release();
 await Promise.all([first, second]);
 assert.equal(slow.ref.current, false, 'guard released after completion');

 const failing = make(() => Promise.reject(new TypeError('Failed to fetch')));
 await failing.fn();
 assert.equal(failing.s.stage, 'review');
 assert.match(failing.s.error, /connection was interrupted/);
 assert.doesNotMatch(failing.s.error, /Failed to fetch/);
 assert.equal(failing.ref.current, false, 'retry is possible');
 await failing.fn();
 assert.equal(failing.s.submits, 2);
});

test('uploader: completion copy follows the real refresh outcome', () => {
 const refreshStatusOf = extractFunction(UPLOADER, 'refreshStatusOf');
 assert.equal(refreshStatusOf({mastery_refreshed:false}), 'pending', 'older servers: false means pending');
 assert.equal(refreshStatusOf({mastery_refreshed:true}), 'refreshed');
 assert.equal(refreshStatusOf({mastery_refreshed:false, mastery_refresh_status:'not_needed'}), 'not_needed');
 const src = read(UPLOADER);
 assert.match(src, /"The reviewed evidence was saved, but the mastery recalculation is still pending, so concept mastery may not include this schoolwork yet\."/);
 assert.doesNotMatch(src, /next profile refresh/, 'no unverified promise about when recalculation happens');
 assert.match(src, /\{impactResult &&\s*refreshStatusOf\(commitResult\) !==\s*"pending" && \(/, 'mastery-derived impact hidden while pending');
 assert.doesNotMatch(src, /<p>\s*NOVA\+ recalculated the learner&apos;s/, 'no unconditional recalculation claim');
});

test('uploader: AI percentages are labelled as estimates, never as reliability grades', () => {
 const label = extractFunction(UPLOADER, 'confidenceLabel');
 assert.equal(label(0.95), 'AI estimate · 95%');
 assert.equal(label(0.6), 'Check carefully · AI estimate 60%');
 assert.doesNotMatch(read(UPLOADER), /`(High|Good) · /);
});
