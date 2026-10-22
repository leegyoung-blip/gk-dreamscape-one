/**
 * NOVA+ Phase 2B-2D-B2: server-authoritative practice access (contract tests).
 *
 * These tests run without a database. They statically guard the SQL REVIEW
 * DRAFTS in sql/nova-plus/ (approval gates, fingerprints, grants, learner-not-
 * viewer authorisation, no data DML, no stored production bodies) and execute
 * the client contract helpers. The SQL itself was executed separately against
 * an OFFLINE synthetic PostgreSQL (PGlite) harness that loads the private audited
 * definitions; that harness is intentionally not committed.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const SQL = 'sql/nova-plus/';
const ADDITIVE = read(SQL + 'phase2b2db2-01-additive-DRAFT.sql');
const POST_ADD = read(SQL + 'phase2b2db2-02-post-additive-readonly.sql');
const ENFORCE = read(SQL + 'phase2b2db2-03-enforcement-DRAFT.sql');
const POST_ENF = read(SQL + 'phase2b2db2-04-post-enforcement-readonly.sql');
const ROLLBACK = read(SQL + 'phase2b2db2-05-rollback-DRAFT.sql');
const BACKUP = read(SQL + 'phase2b2db2-00-private-backup-READONLY.sql');

const ORIGINAL = {start:'e77d65e9caa8631cb4d3aa93b484b7f5', recs:'fc205843600231b9c223e5e1ff899846', cycles:'2edc3451d19657dddf79499fce2fd869'};
const PREDICTED = {start:'3d4cf5cb26b43b5e251c5f9cdca04946', recs:'6875b17975e5b084fe289e34b038f87f', cycles:'f39fb79dc301b1a0ffe93e36130d9cb9'};
const stripComments = (sql) => sql.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');

function transpile(code) {
 const out = ts.transpileModule(code, {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.Preserve}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 return out.outputText;
}
function loadModule(file, stubs = {}) {
 const mod = {exports:{}};
 vm.runInNewContext(transpile(read(file)), {exports:mod.exports, module:mod, require:(n) => { if (!(n in stubs)) throw new Error(n); return stubs[n]; }, Promise, Set, Map});
 return mod.exports;
}

/* ---------- approval gates and transactions ---------- */

test('every mutating draft is NOT APPROVED by default and runs inside one transaction', () => {
 for (const [name, sql, token] of [['additive', ADDITIVE, 'APPROVED-NOVA-2B2DB2-ADDITIVE'], ['enforcement', ENFORCE, 'APPROVED-NOVA-2B2DB2-ENFORCEMENT'], ['rollback', ROLLBACK, 'APPROVED-NOVA-2B2DB2-ROLLBACK']]) {
  assert.match(sql.slice(0, 400), /NOT APPROVED \/ DO NOT RUN/, name);
  const code = stripComments(sql);
  const begin = code.indexOf('begin;');
  const gate = code.indexOf(`'${token}'`);
  assert.ok(begin >= 0 && gate > begin, `${name}: gate inside the transaction`);
  assert.ok(code.indexOf('commit;') > gate, `${name}: commit after gate`);
  assert.match(code, /raise exception 'NOT APPROVED \/ DO NOT RUN/, name);
 }
});

test('read-only files contain no DDL, DML or privilege changes', () => {
 for (const [name, sql] of [['post-additive', POST_ADD], ['post-enforcement', POST_ENF], ['backup', BACKUP]]) {
  const code = stripComments(sql).toLowerCase();
  for (const word of ['create ', 'alter ', 'drop ', 'grant ', 'revoke ', 'insert ', 'update ', 'delete ', 'truncate', 'execute ', 'begin;']) {
   assert.ok(!code.includes(word), `${name} must not contain "${word.trim()}"`);
  }
 }
});

test('no draft changes learner, quiz, mapping or entitlement data', () => {
 for (const [name, sql] of [['additive', ADDITIVE], ['enforcement', ENFORCE], ['rollback', ROLLBACK]]) {
  const code = stripComments(sql).toLowerCase();
  assert.doesNotMatch(code, /\binsert\s+into\b|\bdelete\s+from\b|\btruncate\b|\bupdate\s+public\./, name);
  assert.doesNotMatch(code, /alter\s+table|drop\s+table|create\s+table/, name);
 }
 assert.doesNotMatch(stripComments(ROLLBACK), /drop function/i, 'additive objects are only dropped in the commented, separately approved PART C');
});

/* ---------- fingerprints ---------- */

test('additive draft verifies every dependency fingerprint before creating anything', () => {
 for (const [sig, md5] of [
  ['public.start_nova_learning_cycle(uuid, uuid)', ORIGINAL.start],
  ['public.core_assert_quiz_topic_access(text, uuid, uuid)', 'd05b94332dcc74b4cc73d8bb89404d52'],
  ['public.core_user_has_access(uuid)', 'cc2fe5e564d31051d3381f640ae026e7'],
  ['public.learning_user_has_zone_access(uuid, text)', 'bdc91d0757ee9085bfa0b740ff39c6ac'],
  ['public.has_complete_learning_profile(uuid)', '838c2d118a0d92861bf236326fdfeb22'],
  ['public.require_complete_learning_profile(uuid)', '502e163ccc8b66aab472f300d6dd7914'],
  ['public.f50_selected_student_has_active_beta(uuid)', 'd22b27192bc38453ee23ed2a94def0a8'],
 ]) assert.ok(ADDITIVE.includes(`('${sig}', '${md5}')`), sig);
 assert.ok(ADDITIVE.includes("pg_get_viewdef('public.learning_quiz_skill_coverage'::regclass, true)) <> '568955253afea87acfcbbfc50404d41d'"));
 assert.ok(ADDITIVE.indexOf('$fingerprints_additive$') < ADDITIVE.indexOf('create function public.nova_learner_practice_quizzes'));
});

test('enforcement and rollback share the same audited and predicted fingerprints', () => {
 for (const key of ['start', 'recs', 'cycles']) {
  assert.ok(ENFORCE.includes(`if md5(v_def) <> '${ORIGINAL[key]}'`), `enforcement pre-check ${key}`);
  assert.ok(ENFORCE.includes(`if md5(v_text) <> '${PREDICTED[key]}'`), `enforcement predicted ${key}`);
  assert.ok(POST_ENF.includes(PREDICTED[key]), `post-enforcement ${key}`);
  assert.ok(ROLLBACK.includes(`if md5(v_def) <> '${PREDICTED[key]}'`), `rollback pre-check ${key}`);
  assert.ok(ROLLBACK.includes(`if md5(v_text) <> '${ORIGINAL[key]}'`), `rollback restores ${key}`);
 }
 assert.match(ENFORCE, /ANCHOR % for .* matched % times/);
 assert.match(ENFORCE, /chr\(13\) \|\| chr\(10\)/, 'anchors normalised to the CRLF bodies stored live');
});

test('no full production function body is stored in the repository', () => {
 for (const sql of [ADDITIVE, ENFORCE, ROLLBACK, POST_ADD, POST_ENF, BACKUP]) {
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.(get_nova_plus_recommendations|get_nova_learning_cycles|start_nova_learning_cycle)\(/);
  assert.ok(!sql.includes('$function$'));
  assert.ok(!sql.includes('recommendation_json as ('), 'recommendations body not copied');
 }
});

/* ---------- helper contract ---------- */

const helperBody = ADDITIVE.slice(ADDITIVE.indexOf('create function public.nova_learner_practice_quizzes'), ADDITIVE.indexOf('$helper$;'));

test('helper: internal, security definer, pinned search_path, learner (not viewer) based', () => {
 assert.match(helperBody, /security definer/);
 assert.match(helperBody, /set search_path = public, pg_temp/);
 assert.match(helperBody, /where profile\.id = p_student_user_id/);
 assert.doesNotMatch(stripComments(helperBody), /auth\.uid\(\)/, 'never the caller/viewer');
 assert.match(helperBody, /public\.core_user_has_access\(p_student_user_id\)/);
 assert.match(helperBody, /public\.has_complete_learning_profile\(p_student_user_id\)/);
 assert.doesNotMatch(helperBody.replace(/\/\*[\s\S]*?\*\//g, ''), /require_complete_learning_profile/, 'actor-bound guard must not be called for viewer reads');
 for (const role of ['public', 'anon', 'authenticated']) assert.ok(ADDITIVE.includes(`revoke all on function public.nova_learner_practice_quizzes(uuid) from ${role};`), role);
 assert.ok(ADDITIVE.includes('grant execute on function public.nova_learner_practice_quizzes(uuid) to service_role;'));
 assert.ok(!/grant execute on function public\.nova_learner_practice_quizzes\(uuid\) to (anon|authenticated)/.test(ADDITIVE));
});

test('helper: mirrors core_assert_quiz_topic_access rules by role', () => {
 assert.match(helperBody, /q\.topic_status <> 'locked' or g\.role_clean = 'admin'/);
 assert.match(helperBody, /g\.role_clean in \('admin', 'curriculum-lead'\)\s*or \(\s*coalesce\(q\.topic_active, false\)\s*and coalesce\(q\.is_published, false\)\s*and coalesce\(q\.status, ''\) = 'published'/);
 assert.match(helperBody, /when g\.role_clean = 'teacher' then q\.visibility in \('reviewing', 'satisfied'\)/);
 assert.match(helperBody, /else q\.visibility = 'satisfied'/);
 assert.match(helperBody, /replace\(trim\(coalesce\(profile\.role, ''\)\), '_', '-'\)/, 'same role normalisation as the guard');
});

/* ---------- new start RPC contract ---------- */

const startBody = ADDITIVE.slice(ADDITIVE.indexOf('create function public.start_nova_learning_cycle_for_quiz'), ADDITIVE.indexOf('$start$;'));

test('new start RPC: no overload, learner-only, server-derived subject/level, exact quiz validated before any cycle', () => {
 assert.ok(!/create function public\.start_nova_learning_cycle\(/.test(ADDITIVE), 'legacy name is not overloaded');
 assert.match(startBody, /v_user_id <> p_student_user_id then\s*raise exception 'LEARNER_ACCOUNT_REQUIRED'/);
 assert.match(startBody, /from public\.learning_skill_taxonomy\s*where id = p_skill_id/);
 assert.match(startBody, /pg_advisory_xact_lock/);
 assert.equal((startBody.match(/for share;/g) || []).length, 4, 'quiz + topic locked for each subject');
 assert.match(startBody, /coverage\.primary_level = v_skill\.primary_level/);
 assert.match(startBody, /coalesce\(coverage\.primary_question_count, 0\) > 0/);
 assert.match(startBody, /public\.core_user_has_access\(p_student_user_id\)/);
 assert.match(startBody, /public\.require_complete_learning_profile\(p_student_user_id\)/);
 assert.match(startBody, /public\.core_assert_quiz_topic_access\(v_skill\.subject, p_quiz_id, p_student_user_id\)/);
 const order = ['PRACTICE_QUIZ_NOT_FOR_SKILL', 'CORE_ACCESS_REQUIRED', 'core_assert_quiz_topic_access', 'nova_learner_practice_quizzes', 'public.start_nova_learning_cycle(p_student_user_id, p_skill_id)'].map((t) => startBody.indexOf(t));
 assert.deepEqual([...order].sort((a, b) => a - b), order, 'every check precedes the legacy insert/reuse');
 assert.match(startBody, /'quiz_href',\s*'\/learning-missions\/core\/' \|\| v_skill\.subject/, 'href built by the server');
 assert.ok(ADDITIVE.includes('revoke all on function public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid) from anon;'));
 assert.ok(ADDITIVE.includes('grant execute on function public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid) to authenticated;'));
});

test('enforcement: legacy start checks practice access before returning an existing cycle', () => {
 const legacy = ENFORCE.slice(ENFORCE.indexOf('$patch_start$'), ENFORCE.lastIndexOf('$patch_start$'));
 assert.match(legacy, /raise exception 'CANONICAL_SKILL_NOT_FOUND';\n  end if;\n\n  \/\*/);
 assert.match(legacy, /PRACTICE_QUIZ_NOT_ACCESSIBLE/);
 assert.match(legacy, /nova_learner_practice_quizzes\(p_student_user_id\)/);
});

test('enforcement: recommendations keep needs visible (R1) and use the learner set for quiz and alternatives', () => {
 const recs = ENFORCE.slice(ENFORCE.indexOf('$patch_recs$'), ENFORCE.lastIndexOf('$patch_recs$'));
 assert.match(recs, /left join lateral/);
 assert.match(recs, /\) quiz on true/);
 assert.match(recs, /accessible_quizzes as materialized/);
 assert.equal((recs.match(/from accessible_quizzes accessible/g) || []).length, 2, 'picked quiz + alternatives');
 assert.match(recs, /coalesce\(coverage_alt\.primary_question_count, 0\) > 0/, 'alternatives need primary coverage');
 assert.match(recs, /'alternatives', coalesce\(selected\.alternatives, '\[\]'::jsonb\)/);
 assert.match(recs, /'practice_status', selected\.practice_status/);
 assert.match(recs, /then 'practice_completed'/, 'completed practice is not mislabelled as an access denial');
});

/* ---------- client contract ---------- */

const pa = loadModule('lib/nova-plus/practice-access.ts', {'@/lib/core-missions/catalogue':loadModule('lib/core-missions/catalogue.ts'), '@/lib/learning-access':loadModule('lib/learning-access.ts')});

test('client: refusal codes map to card states', () => {
 assert.equal(pa.classifyCycleStartError('PRACTICE_QUIZ_NOT_ACCESSIBLE'), 'blocked');
 assert.equal(pa.classifyCycleStartError('CORE_ACCESS_REQUIRED'), 'blocked');
 assert.equal(pa.classifyCycleStartError('LEARNING_PROFILE_REQUIRED'), 'blocked');
 assert.equal(pa.classifyCycleStartError('CONCEPT_NOT_CONFIRMED_FOCUS_GAP'), 'not_startable');
 assert.equal(pa.classifyCycleStartError('Could not find the function'), 'unverified');
 assert.equal(pa.classifyCycleStartError(undefined), 'unverified');
});

test('client: only a server-built Core quiz href for the requested quiz is followed', () => {
 const id = '11111111-1111-4111-8111-111111111111';
 assert.equal(pa.serverPracticeHref({quiz_id:id, quiz_href:`/learning-missions/core/math/p5/quiz/${id}`}, id), `/learning-missions/core/math/p5/quiz/${id}`);
 assert.equal(pa.serverPracticeHref({quiz_id:id, quiz_href:`/learning-missions/core/math/p5/quiz/${id}`}, '22222222-2222-4222-8222-222222222222'), null);
 assert.equal(pa.serverPracticeHref({quiz_id:id, quiz_href:'https://evil.example/'}, id), null);
 assert.equal(pa.serverPracticeHref({quiz_id:id, quiz_href:`//evil.example/learning-missions/core/math/p5/quiz/${id}`}, id), null);
 assert.equal(pa.serverPracticeHref(null, id), null);
});

test('client: Nova Recommends uses the quiz-specific RPC and never the legacy start or a full-tab error', () => {
 const src = read('components/nova-plus/tabs/NovaRecommendsTab.tsx');
 assert.match(src, /"start_nova_learning_cycle_for_quiz"/);
 assert.doesNotMatch(src, /"start_nova_learning_cycle"/);
 assert.match(src, /p_quiz_id: item\.quiz\.quiz_id/);
 assert.doesNotMatch(src, /setError\(startError/);
 assert.match(src, /window\.location\.assign\(serverHref\)/);
 assert.match(src, /item\.quiz\?\.quiz_title \|\|\s*"No open mission yet"/);
 assert.match(src, /const alternatives = item\.alternatives \?\? \[\];/);
});

test('client: missing-mission copy distinguishes access from completed or unpublished practice', () => {
 const src = read('components/nova-plus/tabs/NovaRecommendsTab.tsx');
 const sf = ts.createSourceFile('x.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let fn = null;
 (function walk(n) { if (fn) return; if (ts.isFunctionDeclaration(n) && n.name?.text === 'missingMissionCopy') fn = n; else ts.forEachChild(n, walk); })(sf);
 const copy = vm.runInNewContext(transpile(`(function(){ ${fn.getText(sf)}; return missingMissionCopy; })()`), {});
 assert.match(copy('no_accessible_mission'), /not open for this account/);
 assert.match(copy('practice_completed'), /already been completed/);
 assert.doesNotMatch(copy('practice_completed'), /not open/);
 assert.match(copy('no_published_mission'), /waiting for a mapped mission/);
 assert.match(copy(undefined), /waiting for a mapped mission/, 'older payloads keep the old copy');
});

test('client: Parent Report tolerates a recommendation without a mission (screen and PDF)', () => {
 const src = read('components/nova-plus/tabs/ParentReportTab.tsx');
 assert.match(src, /firstRecommendation\.quiz\?\.quiz_title \|\| "No open mission yet"/);
 assert.match(src, /recommendation\.quiz\?\.quiz_title\s*\?\s*`<b>\$\{escapeHtml\(recommendation\.quiz\.quiz_title\)\}<\/b>`\s*:\s*""/);
});

/* ---------- Review follow-up: live callsites and links ---------- */

test('callsite: schoolwork commit route reads only recommendations[0].skill_id (null quiz fields are safe)', () => {
 const src = read('app/api/nova-plus/schoolwork/commit/route.ts');
 const fn = src.slice(src.indexOf('async function recommendationTop'), src.indexOf('export async function POST'));
 assert.match(fn, /return data\?\.recommendations\?\.\[0\]\?\.skill_id \?\? null;/);
 assert.doesNotMatch(fn, /quiz|alternatives/, 'no quiz or alternatives field is read');
});

test('links: the server-built href matches the Core quiz route and the client validator', () => {
 const route = read('app/learning-missions/core/[subject]/[level]/quiz/[quizId]/page.tsx');
 assert.match(route, /\/\^p\(\[1-6\]\)\$\//, 'route accepts p1..p6');
 assert.match(route, /value === "english" \|\| value === "math"/);
 assert.match(ADDITIVE, /'\/learning-missions\/core\/' \|\| v_skill\.subject\s*\|\| '\/p' \|\| v_quiz_level::text\s*\|\| '\/quiz\/' \|\| p_quiz_id::text/);
 const id = '33333333-3333-4333-8333-333333333333';
 for (const subject of ['english', 'math']) for (const level of [1, 6]) {
  const href = `/learning-missions/core/${subject}/p${level}/quiz/${id}`;
  assert.equal(pa.serverPracticeHref({quiz_id:id, quiz_href:href}, id), href);
 }
});
