/**
 * NOVA+ Phase 2B-3B1C: analysis ownership, atomic finalization and commit
 * guards (application side).
 *
 * Synthetic data only. Two or more REAL analyse-route instances run against
 * one shared in-memory database, with gates to force the interleavings from
 * the Phase 2B-3B1 review (S1, S2, S3). The draft SQL itself is exercised
 * offline in PGlite outside the repo; here it is checked statically.
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
const GUARDS = 'lib/nova-plus/schoolwork-guards.ts';
const SQL = (n) => read(`sql/nova-plus/${n}`);

const tx = (code) => {
 const out = ts.transpileModule(code, {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 return out.outputText;
};
function load(file, stubs = {}, globals = {}, env = {}) {
 const mod = {exports:{}};
 vm.runInNewContext(tx(read(file)), {
  exports:mod.exports, module:mod, require:(n) => { if (!(n in stubs)) throw new Error(`unexpected import ${n}`); return stubs[n]; },
  console:{error(){}, warn(){}, log(){}},
  process:{env:{NEXT_PUBLIC_SUPABASE_URL:'http://local.test', NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon', OPENAI_API_KEY:'synthetic', ...env}},
  URL, Date, Math, JSON, Promise, setTimeout, clearTimeout, Buffer, TextEncoder, TextDecoder, ...globals,
 });
 return mod.exports;
}
const guards = load(GUARDS);

/* ---------- Shared in-memory database (per-worker hooks) ---------- */
function makeDb(tables, {failOn, onOp} = {}) {
 const ops = [];
 const matches = (row, q) => q.filters.every(([k, c, v]) => (k === 'eq' ? row[c] === v : v.includes(row[c])));
 const from = (table) => {
  const q = {table, op:'select', cols:null, filters:[], payload:null};
  const exec = async (single) => {
   ops.push({...q, filters:[...q.filters]});
   if (onOp) await onOp(q);
   if (failOn && failOn(q)) return {data:null, error:new Error(`synthetic failure on ${table}.${q.op}`)};
   const rows = (tables[table] ||= []);
   if (q.op === 'upsert') {
    const key = q.onConflict || 'id';
    const existing = rows.find((row) => row[key] === q.payload[key]);
    if (existing) Object.assign(existing, q.payload); else rows.push({...q.payload});
    return {data:null, error:null};
   }
   if (q.op === 'insert') {
    const list = Array.isArray(q.payload) ? q.payload : [q.payload];
    if (table === 'nova_schoolwork_items') {
     for (const p of list) if (rows.some((r) => r.upload_id === p.upload_id && r.item_index === p.item_index)) return {data:null, error:new Error('duplicate key (upload_id, item_index)')};
    }
    const made = list.map((p) => ({id:`${table}-${Math.random().toString(36).slice(2, 10)}`, ...p}));
    rows.push(...made);
    return {data:single ? {...made[0]} : made.map((r) => ({...r})), error:null};
   }
   const hit = rows.filter((r) => matches(r, q));
   if (q.op === 'update') hit.forEach((r) => Object.assign(r, q.payload));
   if (q.op === 'delete') {
    tables[table] = rows.filter((r) => !hit.includes(r));
    if (table === 'nova_schoolwork_items') {
     const gone = new Set(hit.map((r) => r.id));
     tables.nova_schoolwork_item_skills = (tables.nova_schoolwork_item_skills || []).filter((m) => !gone.has(m.item_id));
    }
   }
   let data = hit.map((r) => ({...r}));
   if (q.order) data.sort((a, b) => (q.order.asc ? 1 : -1) * (Number(a[q.order.col]) - Number(b[q.order.col])));
   return {data:single ? (data[0] ?? null) : data, error:null};
  };
  const b = {
   select(c){ if (q.op === 'select') q.cols = c; return b; },
   update(p){ q.op = 'update'; q.payload = p; return b; }, insert(p){ q.op = 'insert'; q.payload = p; return b; },
   upsert(p, o = {}){ q.op = 'upsert'; q.payload = p; q.onConflict = o.onConflict; return b; }, delete(){ q.op = 'delete'; return b; },
   eq(c, v){ q.filters.push(['eq', c, v]); return b; }, in(c, v){ q.filters.push(['in', c, v]); return b; },
   order(col, o = {}){ q.order = {col, asc:o.ascending !== false}; return b; },
   neq(){ return b; }, limit(){ return b; }, gte(){ return b; },
   maybeSingle(){ return exec(true); }, single(){ return exec('strict'); }, then(r, j){ return exec(false).then(r, j); },
  };
  return b;
 };
 return {from, ops};
}

/* Mock of the draft finalize RPC with the same contract (the real SQL is verified in PGlite). */
function finalizeRpc(tables) {
 return async (name, a) => {
  assert.equal(name, 'finalize_nova_schoolwork_analysis');
  const up = tables.nova_schoolwork_uploads.find((u) => u.id === a.p_upload_id);
  if (!up || up.status !== 'analysing' || new Date(up.analysis_started_at).getTime() !== new Date(a.p_claim_started_at).getTime()) return {data:null, error:{message:'ANALYSIS_CLAIM_LOST'}};
  if (tables.nova_schoolwork_items.some((i) => i.upload_id === up.id && i.included_in_profile)) return {data:null, error:{message:'UPLOAD_HAS_REVIEWED_EVIDENCE'}};
  const run = tables.nova_schoolwork_analysis_runs.find((r) => r.id === a.p_run_id && r.status === 'running');
  if (!run) return {data:null, error:{message:'ANALYSIS_RUN_NOT_RUNNING'}};
  const idx = a.p_items.map((i) => i.item_index);
  if (new Set(idx).size !== idx.length) return {data:null, error:{message:'duplicate key (upload_id, item_index)'}}; // transaction rolls back: nothing changed
  tables.nova_schoolwork_items = tables.nova_schoolwork_items.filter((i) => i.upload_id !== up.id);
  for (const {skills, ...row} of a.p_items) {
   const itemId = `item-${Math.random().toString(36).slice(2, 10)}`;
   tables.nova_schoolwork_items.push({id:itemId, ...row});
   for (const s of skills) tables.nova_schoolwork_item_skills.push({item_id:itemId, ...s});
  }
  Object.assign(run, {status:'succeeded', question_count:a.p_items.length});
  Object.assign(up, {status:'review_ready', analysis_revision:(up.analysis_revision || 0) + 1, ...a.p_upload});
  return {data:{status:'review_ready', analysis_revision:up.analysis_revision}, error:null};
 };
}

/* ---------- Synthetic fixtures ---------- */
const L = '11111111-1111-4111-8111-111111111111';
const U = '22222222-2222-4222-8222-222222222222';
const SK = 'MATH-P4-FRAC';
const freshTables = (o = {}) => ({
 nova_schoolwork_uploads:[{id:U, student_user_id:L, storage_bucket:'nova-schoolwork', storage_path:`${L}/${U}/w.pdf`, original_filename:'w.pdf', mime_type:'application/pdf', file_size_bytes:10, status:'review_ready', analysis_revision:1, analysis_started_at:null, ...o}],
 nova_schoolwork_settings:[{id:1, enabled:true}], nova_schoolwork_analysis_runs:[],
 nova_schoolwork_analyses:[{upload_id:U, started_at:'2026-01-01T00:00:00.000Z', overall_summary:'previous summary', error_message:null}],
 nova_schoolwork_items:[{id:'previous-1', upload_id:U, item_index:1, prompt:'previous analysis'}], nova_schoolwork_item_skills:[],
 learning_skill_taxonomy:[{id:'skill-1', skill_code:SK, skill_name:'Compare', domain:'Number', topic:'Fractions', subject:'math', primary_level:4, source:'nova_curriculum_rollout_sql', is_topic_level:false, is_active:true, review_status:'approved'}],
});
const q = (i) => ({item_index:i, page_number:1, question_number:String(i), prompt:`Q${i}`, student_answer:'1', expected_answer_visible:'', teacher_mark:'correct', teacher_feedback:'', model_correctness:'correct', extraction_confidence:0.95, correctness_confidence:0.95, notes:''});
const r = (i, tag) => ({item_index:i, page_number:1, question_number:String(i), prompt:`${tag} Q${i}`, student_answer:'1', expected_answer:'1', teacher_mark:'correct', teacher_feedback:'', final_correctness:'correct', correctness_source:'teacher_mark', extraction_confidence:0.95, correctness_confidence:0.95, primary_skill_code:SK, supporting_skill_codes:[], mapping_confidence:0.95, reasoning_note:'', needs_review:false, evidence_recommendation:'include'});
const LATER = class extends Date {
 constructor(...a) { if (a.length) super(...a); else super(Date.now() + 16 * 60 * 1000); }
 static now() { return Date.now() + 16 * 60 * 1000; }
};
function worker(tag, tables, {count = 1, DateImpl = Date, failOn, onOp, onFetch, atomic = false, extractionOverrides = {}, reasoningFails = false, respond} = {}) {
 const db = makeDb(tables, {failOn, onOp});
 const fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  if (onFetch) await onFetch(body);
  const extraction = body.text.format.name === 'nova_schoolwork_extraction_v1';
  if (!extraction && reasoningFails) return {ok:false, status:400, json:async () => ({error:{message:'synthetic provider failure'}})};
  const out = extraction
   ? {assignment_title:'', subject:'math', primary_level:4, document_quality:'high', teacher_marked:true, pages_detected:1, overall_notes:'', questions:Array.from({length:count}, (_, i) => q(i + 1)), ...extractionOverrides}
   : {assignment_title:'', subject:'math', primary_level:4, overall_summary:`${tag} summary`, strength_skill_codes:[], support_skill_codes:[], items:Array.from({length:count}, (_, i) => r(i + 1, tag))};
  return {ok:true, status:200, json:async () => ({status:'completed', output_text:JSON.stringify(out), usage:{}})};
 };
 const client = {auth:{getUser:async () => ({data:{user:{id:L}}, error:null})}, rpc:async () => ({data:true, error:null})};
 const {POST} = load(ANALYSE, {
  '@supabase/supabase-js':{createClient:() => client}, 'next/server':{NextResponse:{json:respond ?? ((b, i = {}) => ({status:i.status ?? 200, body:b}))}},
  '@/lib/supabase-admin':{supabaseAdmin:{from:db.from, rpc:finalizeRpc(tables), storage:{from:() => ({createSignedUrl:async () => ({data:{signedUrl:'https://signed.test/x'}, error:null})})}}},
  '@/lib/nova-plus/schoolwork-guards':guards,
 }, {fetch, Date:DateImpl}, atomic ? {NOVA_SCHOOLWORK_ATOMIC_FINALIZE:'on'} : {});
 const call = (body = {}) => POST(new Request('http://local.test/a', {method:'POST', headers:{authorization:'Bearer v', 'content-type':'application/json'}, body:JSON.stringify({upload_id:U, ...body})}));
 return {call, db};
}
const gate = () => { let open; const p = new Promise((res) => { open = res; }); return {p, open}; };
const upload = (t) => t.nova_schoolwork_uploads[0];
const prompts = (t) => t.nova_schoolwork_items.map((i) => i.prompt);
const runs = (t) => t.nova_schoolwork_analysis_runs.map((x) => `${x.run_number}:${x.status}`);

/* ================= S1: a request that never claimed the upload ================= */

for (const atomic of [false, true]) {
 test(`S1${atomic ? ' (atomic finalize)' : ''}: a pre-claim failure never fails a newer live claim or its run`, async () => {
  const t = freshTables();
  const bClaimed = gate(), bMayReason = gate();
  const B = worker('B', t, {atomic, onOp:async (op) => { if (op.op === 'update' && op.payload?.status === 'analysing') setTimeout(bClaimed.open, 0); },
   onFetch:async (b) => { if (b.text.format.name !== 'nova_schoolwork_extraction_v1') await bMayReason.p; }});
  const A = worker('A', t, {atomic,
   onOp:async (op) => { if (op.op === 'update' && op.payload && 'subject_hint' in op.payload) await bClaimed.p; },
   failOn:(op) => op.op === 'update' && op.payload && 'subject_hint' in op.payload});
  const aP = A.call({subject_hint:'math'});
  const bP = B.call();
  const a = await aP;
  assert.equal(a.status, 500);
  assert.equal(upload(t).status, 'analysing', 'B keeps its claim after A fails');
  assert.deepEqual(runs(t), ['1:running'], "A never touches B's run");
  assert.equal(A.db.ops.filter((o) => ['nova_schoolwork_uploads', 'nova_schoolwork_analysis_runs', 'nova_schoolwork_analyses'].includes(o.table) && o.op !== 'select' && !('subject_hint' in (o.payload || {}))).length, 0, 'A writes nothing it does not own');
  bMayReason.open();
  const b = await bP;
  assert.equal(b.status, 200, JSON.stringify(b.body));
  assert.equal(upload(t).status, 'review_ready');
  assert.deepEqual(prompts(t), ['B Q1']);
  assert.deepEqual(runs(t), ['1:succeeded']);
 });
}

/* ================= S2: failures in the middle of the write sequence ================= */

test('S2: a failed item insert leaves no partial item set (bulk insert) and fails only this claim', async () => {
 const t = freshTables();
 const A = worker('A', t, {count:3, failOn:(op) => op.table === 'nova_schoolwork_items' && op.op === 'insert'});
 const a = await A.call();
 assert.equal(a.status, 500);
 assert.deepEqual(prompts(t), [], 'all-or-nothing: never 1 of 3');
 assert.equal(upload(t).status, 'failed');
 assert.deepEqual(runs(t), ['1:failed']);
 assert.equal(A.db.ops.filter((o) => o.table === 'nova_schoolwork_items' && o.op === 'insert').length, 1, 'one statement for all items');
});

test('S2: a failed mapping insert fails the claim and the run, so the items are not committable', async () => {
 const t = freshTables();
 const A = worker('A', t, {count:3, failOn:(op) => op.table === 'nova_schoolwork_item_skills' && op.op === 'insert'});
 const a = await A.call();
 assert.equal(a.status, 500);
 assert.equal(upload(t).status, 'failed');
 assert.deepEqual(runs(t), ['1:failed'], 'the commit guards refuse a failed latest run');
});

test('S2 (atomic finalize): a failing insert inside the RPC changes nothing at all', async () => {
 const t = freshTables();
 const A = worker('A', t, {count:2, atomic:true, onFetch:async () => {}});
 // Force a duplicate item_index inside the RPC payload.
 const real = finalizeRpc(t);
 const {POST} = load(ANALYSE, {
  '@supabase/supabase-js':{createClient:() => ({auth:{getUser:async () => ({data:{user:{id:L}}, error:null})}, rpc:async () => ({data:true, error:null})})},
  'next/server':{NextResponse:{json:(b, i = {}) => ({status:i.status ?? 200, body:b})}},
  '@/lib/supabase-admin':{supabaseAdmin:{from:A.db.from, rpc:(n, a) => real(n, {...a, p_items:[...a.p_items, a.p_items[0]]}), storage:{from:() => ({createSignedUrl:async () => ({data:{signedUrl:'https://s'}, error:null})})}}},
  '@/lib/nova-plus/schoolwork-guards':guards,
 }, {fetch:async (url, init) => {
  const ex = JSON.parse(init.body).text.format.name === 'nova_schoolwork_extraction_v1';
  const out = ex ? {assignment_title:'', subject:'math', primary_level:4, document_quality:'high', teacher_marked:true, pages_detected:1, overall_notes:'', questions:[q(1), q(2)]}
   : {assignment_title:'', subject:'math', primary_level:4, overall_summary:'', strength_skill_codes:[], support_skill_codes:[], items:[r(1, 'A'), r(2, 'A')]};
  return {ok:true, status:200, json:async () => ({status:'completed', output_text:JSON.stringify(out)})};
 }}, {NOVA_SCHOOLWORK_ATOMIC_FINALIZE:'on'});
 const res = await POST(new Request('http://local.test/a', {method:'POST', headers:{authorization:'Bearer v'}, body:JSON.stringify({upload_id:U})}));
 assert.equal(res.status, 500);
 assert.deepEqual(prompts(t), ['previous analysis'], 'previous items intact');
 assert.equal(A.db.ops.filter((o) => o.table === 'nova_schoolwork_items' && o.op !== 'select').length, 0, 'no REST item writes on the atomic path');
 assert.equal(upload(t).status, 'failed');
});

/* ================= S3: stale-claim takeover while the first worker is still alive ================= */

async function takeover({atomic}) {
 const t = freshTables();
 const aAtWrite = gate(), releaseA = gate();
 const pauseOp = atomic
  ? null
  : async (op) => { if (op.op === 'delete' && op.table === 'nova_schoolwork_items') { aAtWrite.open(); await releaseA.p; } };
 const A = worker('A', t, {count:3, atomic, onOp:pauseOp, onFetch:atomic ? async (b) => { if (b.text.format.name !== 'nova_schoolwork_extraction_v1') { aAtWrite.open(); await releaseA.p; } } : null});
 const aP = A.call();
 await aAtWrite.p;
 const B = worker('B', t, {count:2, DateImpl:LATER, atomic}); // 16 minutes later: A's claim looks stale
 const b = await B.call();
 const afterB = {status:upload(t).status, items:prompts(t)};
 releaseA.open();
 const a = await aP;
 return {t, a, b, afterB};
}

test('S3 (default bulk path): a superseded worker never reports success or overwrites the newer status, and the mix is detected', async () => {
 const {t, a, b, afterB} = await takeover({atomic:false});
 assert.equal(b.status, 200);
 assert.deepEqual(afterB, {status:'review_ready', items:['B Q1', 'B Q2']});
 assert.equal(a.status, 409, 'A is told it was superseded (was 200 before 2B-3B1C)');
 assert.equal(a.body.error_code, 'ANALYSIS_SUPERSEDED');
 assert.equal(upload(t).status, 'review_ready', "B's status stands");
 assert.deepEqual(runs(t), ['1:failed', '2:succeeded'], "A closes only its own run");
 // A passed its claim check before the takeover, so its REST writes can still
 // interleave: the latest run (B, 2 questions) no longer matches the items,
 // which the commit route and the DB approval guard both refuse.
 const latest = t.nova_schoolwork_analysis_runs.find((x) => x.run_number === 2);
 assert.notEqual(latest.question_count, t.nova_schoolwork_items.length);
});

test('S3 (atomic finalize): the superseded worker writes nothing and the newer analysis stays intact', async () => {
 const {t, a, b} = await takeover({atomic:true});
 assert.equal(b.status, 200);
 assert.equal(a.status, 409);
 assert.equal(a.body.error_code, 'ANALYSIS_SUPERSEDED');
 assert.deepEqual(prompts(t), ['B Q1', 'B Q2']);
 assert.equal(upload(t).status, 'review_ready');
 assert.deepEqual(runs(t), ['1:failed', '2:succeeded']);
});

test('S3: the needs_input exit of a superseded worker cannot overwrite the newer claim while it is still analysing', async () => {
 const t = freshTables();
 const aAtExtraction = gate(), releaseA = gate(), bAtReasoning = gate(), releaseB = gate();
 const A = worker('A', t, {count:81, onFetch:async (b) => { if (b.text.format.name === 'nova_schoolwork_extraction_v1') { aAtExtraction.open(); await releaseA.p; } }});
 const aP = A.call();
 await aAtExtraction.p;
 const B = worker('B', t, {count:2, DateImpl:LATER, onFetch:async (b) => { if (b.text.format.name !== 'nova_schoolwork_extraction_v1') { bAtReasoning.open(); await releaseB.p; } }});
 const bP = B.call();
 await bAtReasoning.p;
 const bToken = upload(t).analysis_started_at;
 releaseA.open();
 const a = await aP;
 assert.equal(a.status, 409, 'superseded, not a misleading 422 needs_input');
 assert.equal(a.body.error_code, 'ANALYSIS_SUPERSEDED');
 assert.equal(upload(t).status, 'analysing', "A's needs_input write does not touch B's claim");
 assert.equal(upload(t).analysis_started_at, bToken);
 releaseB.open();
 const b = await bP;
 assert.equal(b.status, 200, JSON.stringify(b.body));
 assert.deepEqual(prompts(t), ['B Q1', 'B Q2']);
});

test('S3 precondition: the stale-claim window is longer than any request can live', () => {
 const maxDuration = Number(read(ANALYSE).match(/export const maxDuration = (\d+);/)[1]);
 assert.ok(guards.STALE_ANALYSIS_MS > maxDuration * 1000 * 2, `${guards.STALE_ANALYSIS_MS}ms vs maxDuration ${maxDuration}s`);
});

/* ================= Claim ownership in the other exits ================= */

test('ownership: an upload archived during analysis is never reported as analysed', async () => {
 const t = freshTables();
 const A = worker('A', t, {onOp:async (op) => {
  if (op.op === 'update' && op.table === 'nova_schoolwork_analysis_runs' && op.payload?.status === 'succeeded') upload(t).status = 'archived';
 }});
 const a = await A.call();
 assert.equal(a.status, 409);
 assert.equal(upload(t).status, 'archived', 'never overwritten');
 assert.deepEqual(runs(t), ['1:failed']);
});

test('ownership: every post-claim upload write is scoped to the claim token', () => {
 const src = read(ANALYSE);
 const post = src.slice(src.indexOf('claimToken = startedAt;'));
 assert.equal((post.match(/\.from\("nova_schoolwork_uploads"\)\s*\.update\(/g) || []).length, 0, 'no unscoped upload updates after the claim');
 assert.equal((post.match(/updateClaimedUpload\(uploadId, startedAt, \{/g) || []).length, 2, 'detected fields + review_ready');
 assert.equal((post.match(/!\(await claimedExit\(\{/g) || []).length, 4, 'all four needs_input exits check their claim');
 assert.equal((post.match(/return await stopAnalysis\("ANALYSIS_SUPERSEDED"\);/g) || []).length, 10, 'every lost-claim branch reports supersession');
 const analysesWrites = post.match(/\.from\("nova_schoolwork_analyses"\)/g) || [];
 assert.equal(analysesWrites.length, 3, 'claim-time upsert + extraction + summary');
 assert.equal((post.match(/\.eq\("started_at", startedAt\)/g) || []).length, 2, 'extraction + summary are claim-scoped');
 assert.match(src, /\.eq\("upload_id", uploadId\)\s*\/\/[^\n]*\n\s*\.eq\("started_at", claimToken\);/, 'markFailed touches the shared row only for its own claim');
 assert.match(src, /\.eq\("status", "analysing"\)\s*\.eq\("analysis_started_at", claimToken\);/);
 assert.match(src, /if \(!claimToken\) return;/);
 assert.doesNotMatch(src, /\.eq\("status", "running"\)\s*\.order\("run_number"/, 'catch never picks "the latest running run"');
});

/* ================= Commit route: refuses non-committable analyses ================= */

const dec = (i, o = {}) => ({item_index:i, decision:'include', skill_code:SK, correctness:'correct', mapping_edited:false, correctness_edited:false, ...o});
function commitHarness({runsRows = [{upload_id:U, run_number:1, status:'succeeded', question_count:2}], items, primary, revision = 3} = {}) {
 const tables = {
  nova_schoolwork_uploads:[{id:U, student_user_id:L, status:'review_ready', detected_subject:'math', detected_primary_level:4, analysis_revision:revision}],
  nova_schoolwork_items:items ?? [{id:'i1', upload_id:U, item_index:1, final_correctness:'correct'}, {id:'i2', upload_id:U, item_index:2, final_correctness:'incorrect'}],
  nova_schoolwork_item_skills:primary ?? [{item_id:'i1', skill_id:'skill-1', is_primary_skill:true, approved:false}, {item_id:'i2', skill_id:'skill-1', is_primary_skill:true, approved:false}],
  nova_schoolwork_analysis_runs:runsRows,
  learning_skill_taxonomy:[{id:'skill-1', skill_code:SK, subject:'math', primary_level:4, source:'nova_curriculum_rollout_sql', is_topic_level:false, is_active:true, review_status:'approved', domain:'Number', topic:'Fractions'},
   {id:'skill-2', skill_code:'MATH-P4-EQUIV', subject:'math', primary_level:4, source:'nova_curriculum_rollout_sql', is_topic_level:false, is_active:true, review_status:'approved', domain:'Number', topic:'Fractions'}],
  learner_skill_mastery:[],
 };
 const db = makeDb(tables);
 const rpcCalls = [];
 const client = {auth:{getUser:async () => ({data:{user:{id:'viewer'}}, error:null})}, rpc:async (name, args) => {
  rpcCalls.push({name, args});
  if (name === 'nova_plus_can_view_student') return {data:true, error:null};
  if (name === 'commit_nova_schoolwork_review') return {data:{status:'approved', items_included:2, affected_skill_ids:['skill-1']}, error:null};
  return {data:null, error:null};
 }};
 const {POST} = load(COMMIT, {'@supabase/supabase-js':{createClient:() => client}, 'next/server':{NextResponse:{json:(b, i = {}) => ({status:i.status ?? 200, body:b})}}, '@/lib/supabase-admin':{supabaseAdmin:{from:db.from}}, '@/lib/nova-plus/schoolwork-guards':guards});
 const call = (body = {}) => POST(new Request('http://local.test/c', {method:'POST', headers:{authorization:'Bearer v', 'content-type':'application/json'}, body:JSON.stringify({upload_id:U, decisions:[dec(1), dec(2, {correctness:'incorrect'})], ...body})}));
 const sent = () => rpcCalls.find((c) => c.name === 'commit_nova_schoolwork_review')?.args.p_decisions;
 return {call, rpcCalls, sent};
}

test('commit: refuses a failed, superseded or partial latest analysis (archive/restore chain)', async () => {
 for (const runsRows of [
  [{upload_id:U, run_number:1, status:'succeeded', question_count:2}, {upload_id:U, run_number:2, status:'failed'}],
  [{upload_id:U, run_number:1, status:'succeeded', question_count:2}, {upload_id:U, run_number:2, status:'running'}],
  [{upload_id:U, run_number:1, status:'succeeded', question_count:3}],
  [{upload_id:U, run_number:1, status:'succeeded', question_count:null}],
 ]) {
  const h = commitHarness({runsRows});
  const res = await h.call();
  assert.equal(res.status, 409, JSON.stringify(runsRows));
  assert.equal(res.body.error_code, 'ANALYSIS_NOT_COMMITTABLE');
  assert.equal(h.sent(), undefined, 'no commit RPC');
 }
 assert.equal((await commitHarness({runsRows:[]}).call()).status, 200, 'pre-run-tracking uploads unaffected');
 assert.equal((await commitHarness().call()).status, 200);
});

test('commit: decisions made against an older analysis revision are refused', async () => {
 const h = commitHarness({revision:3});
 const res = await h.call({analysis_revision:2});
 assert.equal(res.status, 409);
 assert.equal(res.body.error_code, 'ANALYSIS_SUPERSEDED');
 assert.equal(h.sent(), undefined);
 assert.equal((await commitHarness({revision:3}).call({analysis_revision:3})).status, 200);
 assert.equal((await commitHarness({revision:3}).call()).status, 200, 'older clients without a revision still work');
});

test('commit: edit flags are derived from stored values, never trusted from the client', async () => {
 const forged = commitHarness();
 await forged.call({decisions:[dec(1, {mapping_edited:true, correctness_edited:true}), dec(2, {correctness:'incorrect', mapping_edited:true, correctness_edited:true})]});
 assert.deepEqual(plain(forged.sent().map((d) => [d.mapping_edited, d.correctness_edited])), [[false, false], [false, false]], 'unchanged values are not edits');

 const genuine = commitHarness();
 await genuine.call({decisions:[dec(1, {skill_code:'MATH-P4-EQUIV'}), dec(2, {correctness:'correct'})]});
 assert.deepEqual(plain(genuine.sent().map((d) => [d.mapping_edited, d.correctness_edited])), [[true, false], [false, true]], 'real changes are edits even if the client says otherwise');

 // After a saved review, the approved primary is the baseline (not the AI's).
 const reopened = commitHarness({primary:[
  {item_id:'i1', skill_id:'skill-1', is_primary_skill:true, approved:false},
  {item_id:'i1', skill_id:'skill-2', is_primary_skill:true, approved:true},
  {item_id:'i2', skill_id:'skill-1', is_primary_skill:true, approved:true},
 ]});
 await reopened.call({decisions:[dec(1, {skill_code:'MATH-P4-EQUIV'}), dec(2, {correctness:'incorrect'})]});
 assert.deepEqual(plain(reopened.sent().map((d) => d.mapping_edited)), [false, false]);
});

/* ================= History / uploader ================= */

test('history: reopen shows the AI\'s original confidence, not the 1.0 written after a reviewer edit', async () => {
 const tables = {
  nova_schoolwork_uploads:[{id:U, student_user_id:L, status:'approved', reviewed_at:'2026-10-01T00:00:00Z', analysis_revision:4, storage_bucket:'nova-schoolwork', storage_path:`${L}/${U}/w.pdf`}],
  nova_schoolwork_items:[{id:'i1', upload_id:U, item_index:1, included_in_profile:true, approved_at:'2026-10-01T00:00:00Z', mapping_confidence:1, correctness_confidence:1, extraction_confidence:0.9, raw_item:{mapping_confidence:0.62, correctness_confidence:0.55, extraction_confidence:0.9}}],
  nova_schoolwork_analyses:[], nova_schoolwork_analysis_runs:[], nova_schoolwork_item_skills:[], learning_skill_taxonomy:[],
 };
 const db = makeDb(tables);
 const client = {auth:{getUser:async () => ({data:{user:{id:'v'}}, error:null})}, rpc:async () => ({data:true, error:null})};
 const mod = load(HISTORY, {'@supabase/supabase-js':{createClient:() => client}, 'next/server':{NextResponse:{json:(b, i = {}) => ({status:i.status ?? 200, body:b})}},
  '@/lib/supabase-admin':{supabaseAdmin:{from:db.from, storage:{from:() => ({createSignedUrl:async () => ({data:{signedUrl:'https://s'}, error:null})})}}}, '@/lib/nova-plus/schoolwork-guards':guards});
 const res = await mod.GET(new Request(`http://local.test/h?student_id=${L}&upload_id=${U}`, {headers:{authorization:'Bearer v'}}));
 const item = res.body.analysis_result.items[0];
 assert.deepEqual([item.mapping_confidence, item.correctness_confidence], [0.62, 0.55]);
 assert.equal(res.body.analysis_result.upload.analysis_revision, 4);
});

test('uploader: commits carry the analysis revision they were made against', () => {
 assert.match(read(UPLOADER), /upload_id: result\.upload\.id,\s*analysis_revision: result\.upload\.analysis_revision,/);
 assert.match(read(ANALYSE), /analysis_revision: analysisRevision,\n\s*\},/);
});

/* ================= SQL drafts (static; executed offline in PGlite) ================= */

test('sql: drafts are marked, transactional and never contain the private commit RPC body', () => {
 const files = ['phase2b3b1c-01-finalize-analysis-DRAFT.sql', 'phase2b3b1c-02-commit-guards-DRAFT.sql', 'phase2b3b1c-04-rollback-DRAFT.sql'];
 for (const f of files) {
  const s = SQL(f);
  assert.match(s, /\*\*\* DRAFT \/ NOT APPROVED/, f);
  assert.match(s, /^begin;$/m, f);
  assert.match(s, /^commit;$/m, f);
 }
 for (const f of fs.readdirSync(path.join(root, 'sql/nova-plus'))) {
  const s = read(`sql/nova-plus/${f}`);
  assert.doesNotMatch(s, /function public\.commit_nova_schoolwork_review/i, `${f} must not reproduce the private RPC`);
 }
 assert.doesNotMatch(SQL('phase2b3b1c-03-verify-READONLY.sql'), /^\s*(insert|update|delete|create|drop|alter|grant|revoke)\b/im, 'verification is read-only');
});

test('sql: finalize is service-role only and checks claim, reviewed evidence and run inside one transaction', () => {
 const s = SQL('phase2b3b1c-01-finalize-analysis-DRAFT.sql');
 assert.match(s, /security definer\s*\nset search_path = public, pg_temp/);
 assert.match(s, /for update;/);
 assert.match(s, /analysis_started_at is distinct from p_claim_started_at then\s*\n\s*raise exception 'ANALYSIS_CLAIM_LOST'/);
 assert.match(s, /raise exception 'UPLOAD_HAS_REVIEWED_EVIDENCE'/);
 assert.match(s, /raise exception 'ANALYSIS_RUN_NOT_RUNNING'/);
 assert.match(s, /revoke all on function public\.finalize_nova_schoolwork_analysis\([^)]*\) from anon, authenticated;/);
 assert.match(s, /grant execute on function public\.finalize_nova_schoolwork_analysis\([^)]*\) to service_role;/);
});

test('sql: guards cover approval and edit flags; rollback removes every new object', () => {
 const g = SQL('phase2b3b1c-02-commit-guards-DRAFT.sql');
 assert.match(g, /before update of status on public\.nova_schoolwork_uploads\s*for each row\s*when \(new\.status = 'approved'\)\s*execute function/, 'R3: every transition to approved is guarded');
 assert.doesNotMatch(g, /is distinct from 'archived'/, 'R3: no archived exemption');
 assert.match(g, /if old\.reviewed_at is null or v_items = 0 or v_undecided > 0 or v_included = 0 then/, 'R3: restores need a genuine saved review');
 assert.match(g, /if v_run_questions is null then\s*raise exception/, 'R4: tracked success without a count fails closed');
 assert.match(g, /before update on public\.nova_schoolwork_items/);
 assert.match(g, /SCHOOLWORK_EDIT_FLAG_WITHOUT_CHANGE: correctness/);
 assert.match(g, /SCHOOLWORK_EDIT_FLAG_WITHOUT_CHANGE: concept/);
 const rb = SQL('phase2b3b1c-04-rollback-DRAFT.sql');
 for (const name of ['nova_schoolwork_guard_review_edits', 'nova_schoolwork_guard_approval', 'finalize_nova_schoolwork_analysis']) {
  assert.match(rb, new RegExp(`drop (trigger|function) if exists [^;]*${name}`), name);
 }
});

/* ================= R1: every terminal exit of a superseded worker ================= */

const EXITS = [
 {name:'page limit', opts:{extractionOverrides:{pages_detected:25}}},
 {name:'question limit', opts:{count:81}},
 {name:'hint conflict', opts:{extractionOverrides:{subject:'english'}}, body:{subject_hint:'math'}},
 {name:'missing subject / level', opts:{extractionOverrides:{subject:'uncertain', primary_level:0}}},
];

for (const exit of EXITS) {
 test(`R1 ${exit.name}: a superseded worker gets 409, closes only its own run and never writes needs_input`, async () => {
  const t = freshTables();
  const aAtExtraction = gate(), releaseA = gate(), bAtReasoning = gate(), releaseB = gate();
  const A = worker('A', t, {...exit.opts, onFetch:async (b) => { if (b.text.format.name === 'nova_schoolwork_extraction_v1') { aAtExtraction.open(); await releaseA.p; } }});
  const aP = A.call(exit.body || {});
  await aAtExtraction.p;
  const B = worker('B', t, {count:2, DateImpl:LATER, onFetch:async (b) => { if (b.text.format.name !== 'nova_schoolwork_extraction_v1') { bAtReasoning.open(); await releaseB.p; } }});
  const bP = B.call();
  await bAtReasoning.p;
  const bToken = upload(t).analysis_started_at;
  releaseA.open();
  const a = await aP;
  assert.equal(a.status, 409, JSON.stringify(a.body));
  assert.equal(a.body.error_code, 'ANALYSIS_SUPERSEDED');
  assert.equal(upload(t).status, 'analysing');
  assert.equal(upload(t).analysis_started_at, bToken);
  assert.deepEqual(runs(t), ['1:failed', '2:running'], "only A's own run is closed");
  assert.equal(t.nova_schoolwork_analysis_runs[1].error_code ?? null, null, "B's run untouched");
  releaseB.open();
  const b = await bP;
  assert.equal(b.status, 200, JSON.stringify(b.body));
  assert.deepEqual(runs(t), ['1:failed', '2:succeeded']);
 });
}

test('R1: the exits still return needs_input (422) for the worker that owns the claim', async () => {
 for (const exit of EXITS) {
  const t = freshTables();
  const res = await worker('A', t, exit.opts).call(exit.body || {});
  assert.equal(res.status, 422, `${exit.name}: ${JSON.stringify(res.body)}`);
  assert.equal(upload(t).status, 'needs_input', exit.name);
  assert.equal(t.nova_schoolwork_analysis_runs[0].status, 'needs_input', exit.name);
 }
});

/* ================= R2: the shared nova_schoolwork_analyses row ================= */

async function staleAfterNewerSuccess(aOpts) {
 const t = freshTables();
 const aAtReasoning = gate(), releaseA = gate();
 const A = worker('A', t, {...aOpts, onFetch:async (b) => { if (b.text.format.name !== 'nova_schoolwork_extraction_v1') { aAtReasoning.open(); await releaseA.p; } }});
 const aP = A.call();
 await aAtReasoning.p;
 const b = await worker('B', t, {count:2, DateImpl:LATER}).call();
 const bRow = {...t.nova_schoolwork_analyses[0]};
 releaseA.open();
 const a = await aP;
 return {t, a, b, bRow};
}

test('R2: a stale worker that FAILS after a newer success cannot touch the shared summary, error or runs', async () => {
 const {t, a, b, bRow} = await staleAfterNewerSuccess({reasoningFails:true});
 assert.equal(b.status, 200);
 assert.equal(a.status, 500);
 assert.equal(bRow.overall_summary, 'B summary');
 assert.deepEqual(plain(t.nova_schoolwork_analyses[0]), plain(bRow), 'shared row unchanged by the late failure');
 assert.equal(t.nova_schoolwork_analyses[0].error_message, null);
 assert.equal(upload(t).status, 'review_ready');
 assert.deepEqual(runs(t), ['1:failed', '2:succeeded'], "B's succeeded run is never downgraded");
});

test('R2: a stale worker that SUCCEEDS late cannot overwrite the newer summary', async () => {
 const {t, a, bRow} = await staleAfterNewerSuccess({});
 assert.equal(a.status, 409);
 assert.equal(a.body.error_code, 'ANALYSIS_SUPERSEDED');
 assert.deepEqual(plain(t.nova_schoolwork_analyses[0]), plain(bRow));
 assert.deepEqual(prompts(t), ['B Q1', 'B Q2']);
});

test('R2: claiming an analysis clears the previous summary, so a failure never shows stale text', async () => {
 const t = freshTables();
 const res = await worker('A', t, {reasoningFails:true}).call();
 assert.equal(res.status, 500);
 const row = t.nova_schoolwork_analyses[0];
 assert.equal(row.overall_summary, '');
 assert.equal(row.started_at, upload(t).analysis_started_at, 'row belongs to this claim');
 assert.match(row.error_message, /^OPENAI_API: /, 'safe code + message only');
});

for (const atomic of [false, true]) {
 test(`R2${atomic ? ' (atomic finalize)' : ''}: an error after finalization never downgrades the succeeded run or the upload`, async () => {
  const t = freshTables();
  let thrown = false;
  const respond = (body, init = {}) => {
   if (!thrown && (init.status ?? 200) === 200) { thrown = true; throw new Error('synthetic late failure'); }
   return {status:init.status ?? 200, body};
  };
  const res = await worker('A', t, {atomic, respond}).call();
  assert.ok(thrown);
  assert.equal(res.status, 500);
  assert.equal(upload(t).status, 'review_ready');
  assert.deepEqual(runs(t), ['1:succeeded']);
  assert.equal(t.nova_schoolwork_analyses[0].error_message, null);
  assert.equal(t.nova_schoolwork_analyses[0].overall_summary, 'A summary');
 });
}
