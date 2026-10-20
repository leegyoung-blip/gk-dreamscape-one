/**
 * NOVA+ Phase 2B-1B: educational truthfulness and review safeguards.
 *
 * Asserts the CORRECTED behaviour. Exported helpers are loaded as modules;
 * module-private functions and component-body consts are extracted verbatim
 * from production source with the TypeScript AST and executed (same harness as
 * tests/nova-plus-phase2b1-decision-audit.test.cjs). Server-computed values
 * (status, trend, confidence, lane, stage) are synthetic inputs.
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
 vm.runInNewContext(transpile(read(file)), {exports:mod.exports, module:mod, require:req});
 return mod.exports;
}
const sources = new Map();
function sourceFile(file) {
 if (!sources.has(file)) sources.set(file, ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
 return sources.get(file);
}
function extractTopLevel(file, names, context = {}) {
 const sf = sourceFile(file);
 const found = new Map();
 for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name && names.includes(st.name.text)) found.set(st.name.text, st.getText(sf));
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && names.includes(d.name.text)) found.set(d.name.text, st.getText(sf));
 }
 for (const n of names) assert.ok(found.has(n), `${file}: top-level ${n} not found`);
 return vm.runInNewContext(transpile([...new Set(found.values())].join('\n\n') + `\n;({${names.join(', ')}});`), {...context});
}
function findVariable(file, name) {
 const sf = sourceFile(file);
 let hit = null;
 (function walk(node) { if (hit) return; if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) hit = node; else ts.forEachChild(node, walk); })(sf);
 assert.ok(hit, `${file}: variable ${name} not found`);
 return hit;
}
function evalComponentConst(file, name, scope) {
 const sf = sourceFile(file);
 let init = findVariable(file, name).initializer;
 if (ts.isCallExpression(init) && init.expression.getText(sf) === 'useMemo') init = init.arguments[0];
 const isFactory = ts.isArrowFunction(init) && init.parameters.length === 0;
 const keys = Object.keys(scope);
 const code = `(function (${keys.join(', ')}) { return ${isFactory ? `(${init.getText(sf)})()` : init.getText(sf)}; })`;
 return vm.runInNewContext(transpile(code), {})(...keys.map((k) => scope[k]));
}

const helpers = loadModule('lib/nova-plus/helpers.ts');
const ep = loadModule('lib/nova-plus/evidence-presentation.ts', {'./helpers':helpers});
const englishUi = loadModule('lib/nova-plus/english-mastery-ui.ts');
const englishNorm = loadModule('lib/nova-plus/english-mastery-normalizer.ts');

const MM = 'components/nova-plus/tabs/MasteryMapTab.tsx';
const SG = 'components/nova-plus/tabs/StrengthsGapsTab.tsx';
const PR = 'components/nova-plus/tabs/ProgressTab.tsx';
const PA = 'components/nova-plus/tabs/ParentReportTab.tsx';
const REC = 'components/nova-plus/tabs/NovaRecommendsTab.tsx';
const UP = 'components/nova-plus/NovaSchoolworkUploader.tsx';
const AN = 'app/api/nova-plus/schoolwork/analyse/route.ts';

const mm = extractTopLevel(MM, ['mathConceptState', 'mathPurposeState', 'englishGroup', 'englishPurposeState', 'PURPOSE_STATE_META', 'LEGACY_STATE_META'],
 {safeNumber:helpers.safeNumber, classifyConceptEvidence:ep.classifyConceptEvidence, englishMasteryDisplayGroup:englishUi.englishMasteryDisplayGroup});
const pr = extractTopLevel(PR, ['safeDate', 'startOfWindow', 'formatDate', 'statusLabel', 'baselineSnapshot'],
 {classifyConceptEvidence:ep.classifyConceptEvidence, selectPeriodBaseline:ep.selectPeriodBaseline});
const pa = extractTopLevel(PA, ['safeDate', 'windowStart', 'formatDate', 'subjectLabel', 'currentSubjectMastery', 'strongestSubject', 'parentSummary', 'isStrongSkill', 'isConfirmedSupportSkill', 'isBuildingEvidenceSkill'],
 {classifyConceptEvidence:ep.classifyConceptEvidence, subjectState:helpers.subjectState});
const up = extractTopLevel(UP, ['defaultReviewState', 'evidenceStrength']);
const an = extractTopLevel(AN, ['clamp01', 'storedNeedsReview']);

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const skill = (o = {}) => ({
 skill_id:'s', subject:'math', primary_level:4, domain:'Number', topic:'Fractions', skill_name:'Compare fractions', skill_code:'MATH-P4-FRAC',
 source:'nova_curriculum_rollout_sql', is_topic_level:false, mastery_score:60, confidence_score:60, questions_attempted:10,
 unique_activities:2, active_weeks:2, recent_wrong_answers:1, granular_eligible:true, evidence_quality:'ready',
 trend:'stable', trend_points:0, status:'developing', last_attempted_at:daysAgo(3), ...o,
});
const summary = (subject, mastery, questions) => ({subject, mastery_score:mastery, confidence_score:60, questions_attempted:questions});

/* ---------- Trends ---------- */

test('trend labels: every server value is distinct and missing data is never "Stable"', () => {
 const labels = ['improving', 'declining', 'stable', 'no_data', null, undefined, 'unexpected'].map(ep.trendDisplayLabel);
 assert.deepEqual(plain(labels), ['Improving', 'Declining', 'Stable', 'Not enough data yet', 'Not enough data yet', 'Not enough data yet', 'Not enough data yet']);
});

/* ---------- Shared concept claim policy ---------- */

test('claim policy: question-count boundaries 0/1/4/5/6', () => {
 const secure = (q) => ep.classifyConceptEvidence(skill({status:'secure', questions_attempted:q, confidence_score:80}));
 const gap = (q) => ep.classifyConceptEvidence(skill({status:'needs_support', questions_attempted:q, unique_activities:3, confidence_score:80}));
 assert.deepEqual([0, 1, 4, 5, 6].map(secure), ['needs_evidence', 'needs_evidence', 'needs_evidence', 'supported_strength', 'supported_strength']);
 assert.deepEqual([0, 1, 4, 5, 6].map(gap), ['needs_evidence', 'needs_evidence', 'needs_evidence', 'needs_evidence', 'confirmed_gap']);
});

test('claim policy: confidence boundaries 54.99/55 (confirmed) and 34.99/35 (repeated evidence)', () => {
 const secure = (c) => ep.classifyConceptEvidence(skill({status:'secure', questions_attempted:10, confidence_score:c}));
 assert.deepEqual([54.99, 55].map(secure), ['needs_evidence', 'supported_strength']);
 assert.equal(ep.hasRepeatedEvidence(skill({questions_attempted:6, unique_activities:2, confidence_score:34.99})), false);
 assert.equal(ep.hasRepeatedEvidence(skill({questions_attempted:6, unique_activities:2, confidence_score:35})), true);
 // A gap needs every existing policy: repeated evidence AND confidence >= 55 AND granular "ready" evidence.
 const gap = (o) => ep.classifyConceptEvidence(skill({status:'needs_support', questions_attempted:10, unique_activities:3, confidence_score:60, ...o}));
 assert.equal(gap({}), 'confirmed_gap');
 assert.equal(gap({confidence_score:54.99}), 'needs_evidence');
 assert.equal(gap({granular_eligible:false}), 'needs_evidence');
 assert.equal(gap({evidence_quality:'limited_primary_evidence'}), 'needs_evidence');
 assert.equal(gap({unique_activities:1, active_weeks:1}), 'needs_evidence');
});

test('claim policy: server not_enough_data always means needs evidence; developing statuses stay developing', () => {
 assert.equal(ep.classifyConceptEvidence(skill({status:'not_enough_data', questions_attempted:30})), 'needs_evidence');
 for (const status of ['emerging', 'developing', 'review_due']) assert.equal(ep.classifyConceptEvidence(skill({status})), 'developing');
});

test('mixed strong and weak concepts are each classified on their own evidence', () => {
 const rows = [
  skill({skill_id:'a', status:'mastered', confidence_score:90, questions_attempted:25}),
  skill({skill_id:'b', status:'secure', confidence_score:30, questions_attempted:25}),
  skill({skill_id:'c', status:'needs_support', confidence_score:70, questions_attempted:12, unique_activities:3}),
  skill({skill_id:'d', status:'needs_support', confidence_score:70, questions_attempted:2}),
 ];
 assert.deepEqual(plain(Object.fromEntries(rows.map((r) => [r.skill_id, ep.classifyConceptEvidence(r)]))),
  {a:'supported_strength', b:'needs_evidence', c:'confirmed_gap', d:'needs_evidence'});
});

/* ---------- False progress claims ---------- */

test('Mastery Map: 1 and 4 questions are "Needs More Evidence"; "Building - progress is happening" needs 5+', () => {
 const c = (q, status = 'developing') => ({...skill({status, questions_attempted:q}), has_evidence:q > 0});
 const purpose = (q, status) => mm.mathPurposeState(c(q, status));
 assert.deepEqual([0, 1, 4, 5].map((q) => purpose(q)), ['needs_evidence', 'needs_evidence', 'needs_evidence', 'building']);
 assert.equal(mm.LEGACY_STATE_META[mm.mathConceptState(c(3))].label, 'Limited evidence');
 assert.equal(mm.LEGACY_STATE_META[mm.mathConceptState(c(0))].label, 'Not assessed');
});

test('Progress: no "Needs Attention" or "Strong" label without confirming evidence', () => {
 assert.equal(pr.statusLabel(skill({status:'emerging', questions_attempted:1})), 'Needs More Evidence');
 assert.equal(pr.statusLabel(skill({status:'needs_support', questions_attempted:4})), 'Needs More Evidence');
 assert.equal(pr.statusLabel(skill({status:'secure', questions_attempted:5, confidence_score:20})), 'Needs More Evidence');
 assert.equal(pr.statusLabel(skill({status:'emerging', questions_attempted:8})), 'Developing');
 assert.equal(pr.statusLabel(skill({status:'review_due', questions_attempted:8})), 'Ready to Reassess');
});

test('Improvement claims need the existing 4-question floor on Progress, Parent Report and Strengths & Gaps', () => {
 const s = (q) => skill({trend:'improving', trend_points:9, questions_attempted:q});
 for (const q of [3, 4]) {
  const progress = evalComponentConst(PR, 'improvedSkills', {recentSkills:[s(q)], skillSortValue:() => 0, hasImprovementEvidence:ep.hasImprovementEvidence});
  const parent = evalComponentConst(PA, 'improved', {recentSkills:[s(q)], hasImprovementEvidence:ep.hasImprovementEvidence});
  const sg = evalComponentConst(SG, 'recentlyImproved', {academicSkills:[s(q)], safeNumber:helpers.safeNumber, hasImprovementEvidence:ep.hasImprovementEvidence});
  const expected = q >= 4 ? 1 : 0;
  assert.deepEqual([progress.length, parent.length, sg.length], [expected, expected, expected], `q=${q}`);
 }
});

test('Parent Report "strongest area" needs two subjects that each meet the 5-question floor', () => {
 assert.equal(pa.strongestSubject({subject_summaries:[summary('english', 100, 1), summary('math', 62, 40)]}), null);
 assert.equal(pa.strongestSubject({subject_summaries:[summary('english', 70, 4), summary('math', 62, 4)]}), null);
 assert.equal(pa.strongestSubject({subject_summaries:[summary('english', 70, 5), summary('math', 62, 40)]}).subject, 'english');
});

/* ---------- English: stage versus evidence sufficiency ---------- */

test('English: Low (or unknown) evidence confidence never yields Secure, whatever the stage', () => {
 const group = (stage, evidence_confidence) => englishUi.englishMasteryDisplayGroup({stage, evidence_confidence});
 for (const stage of ['Strong', 'Consolidating', 'Developing', 'Progressing', 'Building', 'Starting']) assert.equal(group(stage, 'Low'), 'needs_evidence', stage);
 assert.equal(group('Consolidating', 'Moderate'), 'strong');
 assert.equal(group('Strong', 'High'), 'strong');
 assert.equal(group('Building', 'Moderate'), 'attention');
 assert.equal(group('Developing', 'Moderate'), 'developing');
 assert.equal(group('Not Yet Assessed', 'High'), 'needs_evidence');
 // Unknown confidence from the server is normalised to Low by the real normaliser.
 const payload = englishNorm.normaliseEnglishMasteryProfile({masteries:[{mastery_code:'E1', mastery_name:'Inference', primary_level:4, stage:'Strong', evidence_confidence:'Unclear'}]});
 const item = payload.masteries[0];
 assert.equal(item.evidence_confidence, 'Low');
 assert.equal(mm.PURPOSE_STATE_META[mm.englishPurposeState(item)].label, 'Needs More Evidence');
});

/* ---------- Parent Report next step ---------- */

function recommendsFocus(payload, cyclePayload) {
 // Nova Recommends' own production code: open-cycle filter, lane grouping, focus.
 const openCycles = evalComponentConst(REC, 'openCycles', {cyclePayload});
 const cycleSkillIds = evalComponentConst(REC, 'cycleSkillIds', {openCycles});
 const recommendations = evalComponentConst(REC, 'recommendations', {payload, cycleSkillIds});
 const grouped = evalComponentConst(REC, 'grouped', {recommendations});
 return evalComponentConst(REC, 'focus', {grouped});
}

test('Parent next step matches Nova Recommends\' Focus Now (open cycles excluded, no lane fallback)', () => {
 const cases = [
  {recs:[{skill_id:'a', lane:'focus_now'}, {skill_id:'b', lane:'focus_now'}], open:[]},
  {recs:[{skill_id:'a', lane:'focus_now'}, {skill_id:'b', lane:'focus_now'}], open:['a']},
  {recs:[{skill_id:'s', lane:'stretch'}, {skill_id:'r', lane:'reassess'}], open:[]},
  {recs:[{skill_id:'x', lane:'build_next'}, {skill_id:'a', lane:'focus_now'}], open:[]},
  {recs:[{skill_id:'a', lane:'focus_now'}], open:['a']},
  {recs:[], open:[]},
 ];
 for (const c of cases) {
  const cycles = {open_cycles:c.open.map((skill_id) => ({skill_id}))};
  const parent = evalComponentConst(PA, 'firstRecommendation', {recommendations:{recommendations:c.recs}, cycles, cyclesVerified:true, focusRecommendation:ep.focusRecommendation, openCycleSkillIds:ep.openCycleSkillIds});
  const recommends = recommendsFocus({recommendations:c.recs}, cycles);
  assert.equal(parent?.skill_id ?? null, recommends?.skill_id ?? null, JSON.stringify(c));
 }
});

test('Parent next step is withheld when open cycles cannot be verified', () => {
 const parent = evalComponentConst(PA, 'firstRecommendation', {recommendations:{recommendations:[{skill_id:'a', lane:'focus_now'}]}, cycles:null, cyclesVerified:false, focusRecommendation:ep.focusRecommendation, openCycleSkillIds:ep.openCycleSkillIds});
 assert.equal(parent, null);
 assert.match(read(PA), /\{firstRecommendation \? "One clear next step" : "Next steps"\}/);
});

/* ---------- Schoolwork review safeguards ---------- */

test('stored review flag: low mapping/extraction confidence or a missing concept always requires review', () => {
 const item = (o) => ({needs_review:false, mapping_confidence:0.9, extraction_confidence:0.9, ...o});
 assert.equal(an.storedNeedsReview(item({}), true), false);
 assert.equal(an.storedNeedsReview(item({mapping_confidence:0.77}), true), true);
 assert.equal(an.storedNeedsReview(item({mapping_confidence:0.78}), true), false);
 assert.equal(an.storedNeedsReview(item({extraction_confidence:0.77}), true), true);
 assert.equal(an.storedNeedsReview(item({}), false), true);
 assert.equal(an.storedNeedsReview(item({needs_review:true}), true), true);
});

test('the analyse response and the stored row use the same review rule', () => {
 const src = read(AN);
 assert.equal((src.match(/storedNeedsReview\(/g) || []).length, 3, 'definition + insert + response');
 assert.match(src, /needs_review: storedNeedsReview\(item, Boolean\(primarySkill\)\)/);
 assert.match(src, /needs_review: storedNeedsReview\(\s*item,\s*taxonomyByCode\.has\(item\.primary_skill_code\),\s*\)/);
});

test('items flagged for review start in "review", never pre-included', () => {
 const base = {evidence_recommendation:'include', primary_skill:{skill_code:'X'}, final_correctness:'correct'};
 const d = up.defaultReviewState({items:[{...base, item_index:1, needs_review:true}, {...base, item_index:2, needs_review:false}]});
 assert.equal(d[1].decision, 'review');
 assert.equal(d[2].decision, 'include');
});

test('editing correctness or concept no longer silently includes an item', () => {
 const src = read(UP);
 const handlers = src.slice(src.indexOf('Use in learner profile?'), src.indexOf('Evidence strength'));
 assert.doesNotMatch(handlers, /"review"\s*\?\s*"include"/);
 assert.equal((handlers.match(/decision:\s*"include"/g) || []).length, 1, 'only the explicit Include button includes');
});

test('evidence label shows the server-proposed weight, or no number when it cannot be known', () => {
 const state = (o = {}) => ({decision:'include', skill_code:'X', correctness:'correct', original_skill_code:'X', original_correctness:'correct', ...o});
 assert.equal(up.evidenceStrength({proposed_evidence_weight:0.5}, state()), 'Proposed weight · 0.50');
 assert.equal(up.evidenceStrength({proposed_evidence_weight:0}, state()), 'Proposed weight · 0.00');
 assert.equal(up.evidenceStrength({}, state()), 'Weight set when saved');
 assert.equal(up.evidenceStrength({proposed_evidence_weight:0.8}, state({correctness:'partial'})), 'Reviewed by you · weight set when saved');
 assert.equal(up.evidenceStrength({proposed_evidence_weight:0.8}, state({skill_code:'Y'})), 'Reviewed by you · weight set when saved');
 assert.equal(up.evidenceStrength({proposed_evidence_weight:0.8}, state({decision:'review'})), 'Not included');
});

/* ---------- Reporting period truthfulness ---------- */

test('Parent summary scopes lifetime mastery as "all recorded evidence" and movement to the period', () => {
 const profile = {subject_summaries:[summary('english', 80, 20), summary('math', 60, 20)]};
 const text = pa.parentSummary(profile, [skill({skill_name:'A'})], [], 7);
 assert.match(text, /^Across all recorded evidence, English is currently the strongest/);
 assert.match(text, /This week, 1 practised concept has shown positive movement\./);
 assert.doesNotMatch(text, /^This week, English/);
});

test('period baseline: earlier snapshot covers the period; a later-only snapshot is flagged; none is null', () => {
 const start = new Date(Date.now() - 30 * 86400000);
 const covered = ep.selectPeriodBaseline([{snapshot_date:daysAgo(40), id:'old'}, {snapshot_date:daysAgo(35), id:'mid'}, {snapshot_date:daysAgo(2), id:'new'}], start);
 assert.deepEqual([covered.snapshot.id, covered.coversPeriod], ['mid', true]);
 const short = ep.selectPeriodBaseline([{snapshot_date:daysAgo(2), id:'a'}, {snapshot_date:'not a date', id:'bad'}], start);
 assert.deepEqual([short.snapshot.id, short.coversPeriod], ['a', false]);
 assert.equal(ep.selectPeriodBaseline([], start), null);
 assert.equal(ep.selectPeriodBaseline(undefined, start), null);
});

test('Progress and Parent Report label a short or missing baseline instead of calling it a full-period change', () => {
 const shortBase = {snapshot:{}, date:new Date(Date.now() - 2 * 86400000), coversPeriod:false};
 const fullBase = {snapshot:{}, date:new Date(Date.now() - 40 * 86400000), coversPeriod:true};
 const prScope = (baseline) => ({days:30, baseline, formatDate:pr.formatDate});
 const prLabel = (baseline) => evalComponentConst(PR, 'periodComparison', {...prScope(baseline), baselineLabel:evalComponentConst(PR, 'baselineLabel', prScope(baseline))});
 assert.match(prLabel(shortBase), /^Comparable history only starts .+, so changes are measured from then, not across 30 days$/);
 assert.match(prLabel(fullBase), /^Compared with the profile around /);
 assert.equal(prLabel(null), 'No earlier profile to compare with yet, so no 30-day change is shown');
 const notes = (baseline) => evalComponentConst(PR, 'questionsNote', {days:30, baseline, baselineLabel:'18 Oct'});
 assert.match(notes(null), /^All recorded academic questions/);
 assert.match(notes(shortBase), /since 18 Oct, a shorter span than the selected period/);

 const paLabel = (baseline) => evalComponentConst(PA, 'periodComparison', {baseline, baselineLabel:'18 Oct 2026', period:{label:'30 days'}});
 assert.equal(paLabel(shortBase), 'Comparable history only starts 18 Oct 2026, so changes are measured from then, not across the full 30 days.');
 assert.equal(paLabel(null), 'Nova does not have an earlier profile to compare with yet.');
});
