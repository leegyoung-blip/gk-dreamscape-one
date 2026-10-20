/**
 * NOVA+ Phase 2B-1A decision-quality audit (characterisation tests).
 *
 * These tests execute the EXACT production TypeScript source of NOVA+ client-side
 * decision rules. Exported pure helpers are loaded as modules; module-private
 * functions and inline expressions are extracted verbatim from the source file
 * with the TypeScript AST, transpiled, and run in a vm. Nothing is reimplemented.
 *
 * Inputs that Supabase computes (status, trend, mastery_score, confidence_score,
 * lane, stage, evidence_confidence, ...) are SYNTHETIC fixtures. The server-side
 * rules that produce them are NOT tested here (their SQL is not in the repo).
 *
 * Each test asserts CURRENT behaviour so the suite stays green. Whether that
 * behaviour is educationally acceptable is judged in
 * audit-output/nova-phase2b1/SCENARIO_MATRIX.md (verdict in each test name).
 *
 * Phase 2B-1B: scenarios corrected in 2B-1B are tagged [FIXED 2B-1B] and now
 * assert the corrected behaviour. The historical audit outputs
 * (SCENARIO_MATRIX.md, scenario-results.json) record the pre-fix behaviour and
 * are intentionally not regenerated.
 *
 * Set NOVA_AUDIT_WRITE=1 to write observed outputs to
 * audit-output/nova-phase2b1/scenario-results.json.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v)); // normalise cross-realm values

/* ---------- loaders ---------- */

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

/** Extract top-level function/const declarations by name, verbatim, and evaluate them. */
function extractTopLevel(file, names, context = {}) {
 const sf = sourceFile(file);
 const found = new Map();
 for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name && names.includes(st.name.text)) found.set(st.name.text, st.getText(sf));
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && names.includes(d.name.text)) found.set(d.name.text, st.getText(sf));
 }
 for (const n of names) assert.ok(found.has(n), `${file}: top-level ${n} not found`);
 const code = [...new Set(found.values())].join('\n\n') + `\n;({${names.join(', ')}});`;
 return vm.runInNewContext(transpile(code), {...context});
}

/** Find the first variable declaration with this name anywhere in the file. */
function findVariable(file, name) {
 const sf = sourceFile(file);
 let hit = null;
 (function walk(node) { if (hit) return; if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) hit = node; else ts.forEachChild(node, walk); })(sf);
 assert.ok(hit, `${file}: variable ${name} not found`);
 return hit;
}

/** Evaluate a component-body const (unwrapping useMemo(() => ...)) with the given in-scope variables. */
function evalComponentConst(file, name, scope) {
 const sf = sourceFile(file);
 let init = findVariable(file, name).initializer;
 if (ts.isCallExpression(init) && init.expression.getText(sf) === 'useMemo') init = init.arguments[0];
 const isFactory = ts.isArrowFunction(init) && init.parameters.length === 0;
 const keys = Object.keys(scope);
 const code = `(function (${keys.join(', ')}) { return ${isFactory ? `(${init.getText(sf)})()` : init.getText(sf)}; })`;
 return vm.runInNewContext(transpile(code), {})(...keys.map((k) => scope[k]));
}

/** Find an expression node whose source text matches, and return it as a function of `params`. */
function evalExpression(file, predicate, params, scope = {}) {
 const sf = sourceFile(file);
 let hit = null;
 (function walk(node) { if (hit) return; if (predicate(node, sf)) hit = node; else ts.forEachChild(node, walk); })(sf);
 assert.ok(hit, `${file}: expression not found`);
 const code = `(function (${params.join(', ')}) { return (${hit.getText(sf)}); })`;
 return {fn: vm.runInNewContext(transpile(code), {...scope}), text: hit.getText(sf)};
}

/* ---------- production modules ---------- */

const helpers = loadModule('lib/nova-plus/helpers.ts');
const milestones = loadModule('components/nova-plus/my-learning/milestones.ts');
const englishUi = loadModule('lib/nova-plus/english-mastery-ui.ts');
const teaching = loadModule('lib/nova-plus/teaching-evidence.ts');
const ep = loadModule('lib/nova-plus/evidence-presentation.ts', {'./helpers':helpers});

const SG = 'components/nova-plus/tabs/StrengthsGapsTab.tsx';
const MM = 'components/nova-plus/tabs/MasteryMapTab.tsx';
const PR = 'components/nova-plus/tabs/ProgressTab.tsx';
const PA = 'components/nova-plus/tabs/ParentReportTab.tsx';
const REC = 'components/nova-plus/tabs/NovaRecommendsTab.tsx';
const UP = 'components/nova-plus/NovaSchoolworkUploader.tsx';
const AN = 'app/api/nova-plus/schoolwork/analyse/route.ts';

const sg = extractTopLevel(SG, ['conceptState'], {classifyConceptEvidence:ep.classifyConceptEvidence});
const mm = extractTopLevel(MM, ['mathConceptState', 'mathPurposeState', 'englishGroup', 'englishPurposeState', 'PURPOSE_STATE_META'],
 {safeNumber:helpers.safeNumber, classifyConceptEvidence:ep.classifyConceptEvidence, englishMasteryDisplayGroup:englishUi.englishMasteryDisplayGroup});
const pr = extractTopLevel(PR, ['safeDate', 'startOfWindow', 'inWindow', 'statusLabel', 'skillSortValue', 'baselineSnapshot'],
 {classifyConceptEvidence:ep.classifyConceptEvidence, selectPeriodBaseline:ep.selectPeriodBaseline});
const pa = extractTopLevel(PA, ['safeDate', 'windowStart', 'isWithin', 'isStrongSkill', 'isConfirmedSupportSkill', 'isBuildingEvidenceSkill', 'currentSubjectMastery', 'strongestSubject'],
 {classifyConceptEvidence:ep.classifyConceptEvidence, subjectState:helpers.subjectState});
const up = extractTopLevel(UP, ['defaultReviewState', 'evidenceStrength']);
const an = extractTopLevel(AN, ['clamp01', 'storedNeedsReview', 'proposedEvidenceWeight']);

/* ---------- fixtures ---------- */

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

function skill(overrides = {}) {
 return {
  skill_id:'s-1', subject:'math', primary_level:4, domain:'Number', topic:'Fractions',
  skill_name:'Compare fractions', skill_code:'MATH-P4-NUM-FRAC-CMP', source:'nova_curriculum_rollout_sql',
  parent_skill_id:null, is_topic_level:false, mastery_score:60, confidence_score:60,
  recent_accuracy:null, lifetime_accuracy:null, questions_attempted:10, correct_answers:6, wrong_answers:4,
  recent_wrong_answers:1, weighted_questions:10, unique_activities:2, active_weeks:2, mapping_coverage:1,
  granular_eligible:true, evidence_quality:'ready', trend_points:0, trend:'stable', status:'developing',
  first_seen_at:daysAgo(60), last_attempted_at:daysAgo(3), ...overrides,
 };
}
const concept = (o = {}) => ({...skill(o), has_evidence:(o.questions_attempted ?? 10) > 0, ...o});
const summary = (subject, mastery, questions) => ({subject, mastery_score:mastery, confidence_score:60, questions_attempted:questions, skills_count:5, secure_skills:0, priority_skills:0, last_activity_at:daysAgo(2)});
const englishItem = (o = {}) => ({mastery_code:'ENG-P4-READ-INF', name:'Inference', primary_level:4, stage:'Developing', evidence_confidence:'Moderate', unique_questions:8, effective_evidence_weight:4, ...o});

/* Labels shown for one skill on each live tab. */
function crossTabLabels(s) {
 const sgState = sg.conceptState(s);
 return {
  strengthsGaps: {strong:'Secure concept', attention:'Confirmed gap / Needs attention', developing:'Still building'}[sgState],
  masteryMap: mm.PURPOSE_STATE_META[mm.mathPurposeState(concept(s))].label,
  progress: pr.statusLabel(s),
  parentReport: pa.isStrongSkill(s) ? 'Strength' : pa.isConfirmedSupportSkill(s) ? 'Confirmed support' : pa.isBuildingEvidenceSkill(s) ? 'Building evidence' : '(not shown)',
 };
}

/* ---------- results recorder ---------- */

const results = [];
function record(id, observed) { results.push({id, observed:plain(observed)}); }
test.after(() => {
 if (process.env.NOVA_AUDIT_WRITE !== '1') return;
 const dir = path.join(root, 'audit-output', 'nova-phase2b1');
 fs.mkdirSync(dir, {recursive:true});
 results.sort((a, b) => a.id.localeCompare(b.id));
 fs.writeFileSync(path.join(dir, 'scenario-results.json'), JSON.stringify({generated_by:'tests/nova-plus-phase2b1-decision-audit.test.cjs', results}, null, 2) + '\n');
});

/* ---------- 1. Insufficient evidence ---------- */

test('S01 [PASS] subject with 4 questions makes no subject or milestone claim', () => {
 const s = summary('math', 100, 4);
 const observed = {subjectState:helpers.subjectState(s), milestone:milestones.milestoneText(milestones.milestoneForEvidence(100, 4)), attention:helpers.attentionSubject([s])};
 record('S01', observed);
 assert.deepEqual(plain(observed), {subjectState:'unknown', milestone:'Building Picture', attention:null});
});

test('S02 [FIXED 2B-1B] 1-question math concept shows "Needs More Evidence", not "progress is happening"', () => {
 const c = concept({status:'not_enough_data', questions_attempted:1, unique_activities:1, active_weeks:1, confidence_score:5});
 const state = mm.mathPurposeState(c);
 const observed = {purposeState:state, label:mm.PURPOSE_STATE_META[state].label, meaning:mm.PURPOSE_STATE_META[state].meaning};
 record('S02', observed);
 assert.equal(state, 'needs_evidence');
 assert.doesNotMatch(observed.meaning, /Progress is happening/);
});

test('S03 [FIXED 2B-1B] a 1-question "emerging" skill is "Needs More Evidence" and not listed for attention', () => {
 const s = skill({status:'emerging', questions_attempted:1, unique_activities:1, active_weeks:1, confidence_score:8, last_attempted_at:daysAgo(1)});
 const attention = evalComponentConst(PR, 'attentionSkills', {recentSkills:[s], classifyConceptEvidence:ep.classifyConceptEvidence});
 const observed = {statusLabel:pr.statusLabel(s), inAttentionList:attention.length === 1};
 record('S03', observed);
 assert.deepEqual(plain(observed), {statusLabel:'Needs More Evidence', inAttentionList:false});
});

test('S04 [FIXED 2B-1B] no "strongest area" is named when one subject has only 1 question', () => {
 const profile = {subject_summaries:[summary('english', 100, 1), summary('math', 62, 40)]};
 const observed = {parentStrongest:pa.strongestSubject(profile), myLearningStateForEnglish:helpers.subjectState(profile.subject_summaries[0])};
 record('S04', observed);
 assert.equal(observed.parentStrongest, null);
 assert.equal(observed.myLearningStateForEnglish, 'unknown');
});

/* ---------- 2. Sustained strong performance ---------- */

test('S05 [PASS] sustained secure concept is labelled strong on every tab', () => {
 const s = skill({status:'secure', mastery_score:92, confidence_score:82, questions_attempted:30, unique_activities:5, active_weeks:4, trend:'stable'});
 const observed = crossTabLabels(s);
 record('S05', observed);
 assert.deepEqual(plain(observed), {strengthsGaps:'Secure concept', masteryMap:'Secure', progress:'Strong', parentReport:'Strength'});
});

test('S06 [PASS] strong subject (20 questions at 92) is strong, milestone 6, never "needs attention"', () => {
 const s = summary('english', 92, 20);
 const observed = {state:helpers.subjectState(s), milestone:milestones.milestoneText(milestones.milestoneForEvidence(92, 20)), attention:helpers.attentionSubject([s])};
 record('S06', observed);
 assert.deepEqual(plain(observed), {state:'strong', milestone:'Milestone 6 · Strong', attention:null});
});

/* ---------- 3. Sustained low performance ---------- */

test('S07 [PASS] repeated, ready needs_support evidence is a confirmed gap on SG, Mastery Map and Parent Report', () => {
 const s = skill({status:'needs_support', mastery_score:38, confidence_score:72, questions_attempted:20, unique_activities:3, active_weeks:3, recent_wrong_answers:5});
 const observed = crossTabLabels(s);
 record('S07', observed);
 assert.deepEqual(plain(observed), {strengthsGaps:'Confirmed gap / Needs attention', masteryMap:'Needs Practice', progress:'Needs Attention', parentReport:'Confirmed support'});
});

test('S08 [PASS] low subject (20 questions at 45) is "attention", milestone 2 Building', () => {
 const s = summary('math', 45, 20);
 const observed = {state:helpers.subjectState(s), milestone:milestones.milestoneText(milestones.milestoneForEvidence(45, 20)), attentionSubject:helpers.attentionSubject([s])?.subject ?? null};
 record('S08', observed);
 assert.deepEqual(plain(observed), {state:'attention', milestone:'Milestone 2 · Building', attentionSubject:'math'});
});

/* ---------- 4. Improving performance ---------- */

test('S09 [FIXED 2B-1B] a 3-question improving skill is not called strengthened on any tab', () => {
 const s = skill({status:'developing', trend:'improving', trend_points:12, questions_attempted:3, unique_activities:1, active_weeks:1, last_attempted_at:daysAgo(2)});
 const progressImproved = evalComponentConst(PR, 'improvedSkills', {recentSkills:[s], skillSortValue:pr.skillSortValue, hasImprovementEvidence:ep.hasImprovementEvidence});
 const parentImproved = evalComponentConst(PA, 'improved', {recentSkills:[s], hasImprovementEvidence:ep.hasImprovementEvidence});
 const sgImproved = evalComponentConst(SG, 'recentlyImproved', {academicSkills:[s], safeNumber:helpers.safeNumber, hasImprovementEvidence:ep.hasImprovementEvidence});
 const observed = {progressConceptsStrengthened:progressImproved.length, parentImproved:parentImproved.length, strengthsGapsRecentlyImproved:sgImproved.length};
 record('S09', observed);
 assert.deepEqual(plain(observed), {progressConceptsStrengthened:0, parentImproved:0, strengthsGapsRecentlyImproved:0});
});

/* ---------- 5. Declining performance ---------- */

test('S11 [FIXED 2B-1B] Parent Report shows declining, stable, improving and missing trends distinctly', () => {
 const sf = sourceFile(PA);
 let text = null;
 (function walk(n) { if (text) return; if (ts.isJsxExpression(n) && n.getText(sf).includes('skill.trend') && n.parent && n.parent.getText(sf).startsWith('<b>')) text = n.getText(sf); else ts.forEachChild(n, walk); })(sf);
 const observed = {expression:text, declining:ep.trendDisplayLabel('declining'), stable:ep.trendDisplayLabel('stable'), improving:ep.trendDisplayLabel('improving'), no_data:ep.trendDisplayLabel('no_data'), missing:ep.trendDisplayLabel(undefined)};
 record('S11', observed);
 assert.equal(text, '{trendDisplayLabel(skill.trend)}');
 assert.doesNotMatch(read(PA), /\? "Improving" : "Stable"/);
 assert.deepEqual([observed.declining, observed.stable, observed.improving, observed.no_data, observed.missing], ['Declining', 'Stable', 'Improving', 'Not enough data yet', 'Not enough data yet']);
});

test('S12 [PASS] Progress puts a declining (even secure) skill first in "needs continued attention"', () => {
 const declining = skill({skill_id:'d', status:'secure', mastery_score:80, trend:'declining', trend_points:-10});
 const weak = skill({skill_id:'w', status:'needs_support', mastery_score:30});
 const list = evalComponentConst(PR, 'attentionSkills', {recentSkills:[weak, declining], classifyConceptEvidence:ep.classifyConceptEvidence});
 const observed = {order:list.map((s) => s.skill_id)};
 record('S12', observed);
 assert.deepEqual(plain(observed.order), ['d', 'w']);
});

/* ---------- 6. Inconsistent performance ---------- */

test('S13 [FIXED 2B-1B] needs_support from one activity/week reads as "still needs evidence" on every tab', () => {
 const s = skill({status:'needs_support', mastery_score:45, confidence_score:40, questions_attempted:10, unique_activities:1, active_weeks:1, recent_wrong_answers:4});
 const observed = crossTabLabels(s);
 record('S13', observed);
 assert.deepEqual(plain(observed), {strengthsGaps:'Still building', masteryMap:'Needs More Evidence', progress:'Needs More Evidence', parentReport:'Building evidence'});
});

test('S14 [FIXED 2B-1B] the same "emerging" skill reads as developing/building on every tab', () => {
 const s = skill({status:'emerging', mastery_score:55, confidence_score:50, questions_attempted:8, recent_wrong_answers:2});
 const observed = crossTabLabels(s);
 record('S14', observed);
 assert.deepEqual(plain(observed), {strengthsGaps:'Still building', masteryMap:'Building', progress:'Developing', parentReport:'Building evidence'});
});

/* ---------- 7. Conflicting quiz and approved-schoolwork evidence ---------- */

test('S16 [PASS] proposed schoolwork weights favour teacher marks and zero-weight uncertain/low-mapping items', () => {
 const item = (o) => ({evidence_recommendation:'include', primary_skill_code:'X', final_correctness:'correct', correctness_source:'teacher_mark', correctness_confidence:0.9, mapping_confidence:0.9, ...o});
 const observed = {
  teacherCorrect:an.proposedEvidenceWeight(item({})),
  teacherIncorrect:an.proposedEvidenceWeight(item({final_correctness:'incorrect'})),
  teacherPartial:an.proposedEvidenceWeight(item({final_correctness:'partial'})),
  teacherLowConfidence:an.proposedEvidenceWeight(item({correctness_confidence:0.6})),
  modelHighConfidence:an.proposedEvidenceWeight(item({correctness_source:'model', correctness_confidence:0.95, mapping_confidence:0.9})),
  modelBelowThreshold:an.proposedEvidenceWeight(item({correctness_source:'model', correctness_confidence:0.89})),
  uncertain:an.proposedEvidenceWeight(item({final_correctness:'uncertain'})),
  mapping071:an.proposedEvidenceWeight(item({mapping_confidence:0.71})),
  mapping072:an.proposedEvidenceWeight(item({mapping_confidence:0.72})),
 };
 record('S16', observed);
 assert.deepEqual(plain(observed), {teacherCorrect:0.8, teacherIncorrect:0.8, teacherPartial:0.6, teacherLowConfidence:0.5, modelHighConfidence:0.5, modelBelowThreshold:0, uncertain:0, mapping071:0, mapping072:0.5});
});

test('S17 [FIXED 2B-1B] review screen shows the server-proposed weight, not a recomputed one', () => {
 const item = {teacher_mark:'correct', correctness_source:'teacher_mark', correctness_confidence:0.6, mapping_confidence:0.9, evidence_recommendation:'include', primary_skill_code:'X', final_correctness:'correct'};
 const serverProposedWeight = an.proposedEvidenceWeight(item);
 const state = {decision:'include', skill_code:'X', correctness:'correct', original_skill_code:'X', original_correctness:'correct'};
 const observed = {uiLabel:up.evidenceStrength({...item, proposed_evidence_weight:serverProposedWeight}, state), serverProposedWeight};
 record('S17', observed);
 assert.deepEqual(plain(observed), {uiLabel:'Proposed weight · 0.50', serverProposedWeight:0.5});
});

test('S18 [FIXED 2B-1B] item with mapping confidence 0.75 reaches the reviewer flagged and starts in "review"', () => {
 const raw = {item_index:1, evidence_recommendation:'include', needs_review:false, primary_skill:{skill_code:'X'}, primary_skill_code:'X', final_correctness:'correct', mapping_confidence:0.75, extraction_confidence:0.95};
 const responseFlag = an.storedNeedsReview(raw, true);
 const defaults = up.defaultReviewState({items:[{...raw, needs_review:responseFlag}]});
 const src = read(AN);
 const observed = {
  responseNeedsReview:responseFlag,
  clientDefaultDecision:defaults[1].decision,
  insertUsesSharedRule:/needs_review: storedNeedsReview\(item, Boolean\(primarySkill\)\)/.test(src),
  responseUsesSharedRule:/\.\.\.item,\s*\/\/[^\n]*\n\s*needs_review: storedNeedsReview\(/.test(src),
 };
 record('S18', observed);
 assert.deepEqual(plain(observed), {responseNeedsReview:true, clientDefaultDecision:'review', insertUsesSharedRule:true, responseUsesSharedRule:true});
});

/* ---------- 8. Missing / unpublished practice content ---------- */

test('S19 [PASS] recommendation without a quiz link shows "Practice mission unavailable" (static check)', () => {
 const card = read(REC).slice(read(REC).indexOf('function RecommendationCard'), read(REC).indexOf('function CycleCard'));
 const observed = {missionAvailableGate:/const missionAvailable =\s*Boolean\(quizHref\)/.test(card), unavailableCopy:card.includes('Practice mission unavailable')};
 record('S19', observed);
 assert.deepEqual(plain(observed), {missionAvailableGate:true, unavailableCopy:true});
});

test('S21 [FIXED 2B-1B] Parent Report next step is Nova Recommends\' Focus Now item, never a stretch or open-cycle concept', () => {
 const scope = (recs, openIds, feedsVerified = true) => ({
  recommendations:{recommendations:recs}, cycles:{open_cycles:openIds.map((skill_id) => ({skill_id}))}, feedsVerified,
  focusRecommendation:ep.focusRecommendation, openCycleSkillIds:ep.openCycleSkillIds,
 });
 const stretchOnly = evalComponentConst(PA, 'firstRecommendation', scope([{skill_id:'k', lane:'stretch'}], []));
 const openCycleFirst = evalComponentConst(PA, 'firstRecommendation', scope([{skill_id:'k', lane:'focus_now'}, {skill_id:'m', lane:'focus_now'}], ['k']));
 const cyclesUnavailable = evalComponentConst(PA, 'firstRecommendation', scope([{skill_id:'m', lane:'focus_now'}], [], false));
 const observed = {stretchOnly, openCycleFirst:openCycleFirst?.skill_id ?? null, cyclesUnavailable};
 record('S21', observed);
 assert.deepEqual(plain(observed), {stretchOnly:null, openCycleFirst:'m', cyclesUnavailable:null});
});

/* ---------- 9. One weak skill alongside several strong ---------- */

test('S22 [PASS] one confirmed gap among strong concepts is isolated correctly on Strengths & Gaps', () => {
 const strong = [1, 2, 3].map((i) => skill({skill_id:`s${i}`, status:'secure', mastery_score:90, questions_attempted:20, confidence_score:80}));
 const gap = skill({skill_id:'g', status:'needs_support', mastery_score:35, questions_attempted:15, unique_activities:3, confidence_score:70});
 const states = Object.fromEntries([...strong, gap].map((s) => [s.skill_id, sg.conceptState(s)]));
 record('S22', states);
 assert.deepEqual(plain(states), {s1:'strong', s2:'strong', s3:'strong', g:'attention'});
});

test('S23 [PASS] all-strong subjects produce no "needs attention" subject', () => {
 const rows = [summary('english', 92, 20), summary('math', 88, 25), null];
 const observed = {attentionSubject:helpers.attentionSubject(rows)};
 record('S23', observed);
 assert.equal(observed.attentionSubject, null);
});

/* ---------- 10. Very old versus recent evidence ---------- */

test('S25 [FIXED 2B-1B - relabelled] lifetime strengths are labelled "all recorded evidence", not as this period', () => {
 const old = skill({skill_id:'old', status:'secure', mastery_score:95, confidence_score:80, questions_attempted:20, last_attempted_at:daysAgo(200)});
 const recentSkills = [old].filter((s) => pa.isWithin(s.last_attempted_at, 7));
 const strengths = evalComponentConst(PA, 'strengths', {academicSkills:[old], recentSkills, isStrongSkill:pa.isStrongSkill});
 const src = read(PA);
 const observed = {inWindow:recentSkills.length, strengths:strengths.map((s) => s.skill_id), strengthsScopeLabel:src.includes('highlighted · all recorded evidence'), summaryScope:src.includes('Across all recorded evidence, ')};
 record('S25', observed);
 assert.deepEqual(plain(observed), {inWindow:0, strengths:['old'], strengthsScopeLabel:true, summaryScope:true});
});

test('S26 [FIXED 2B-1B - relabelled] a 2-day-old baseline is flagged as not covering the 30-day period', () => {
 const profile = {timeline:[{snapshot_date:daysAgo(2), overall_mastery:50}, {snapshot_date:daysAgo(1), overall_mastery:60}]};
 const base = pr.baselineSnapshot(profile, 30);
 const observed = {baselineAgeDays:Math.round((Date.now() - new Date(base.snapshot.snapshot_date).getTime()) / 86400000), coversPeriod:base.coversPeriod};
 record('S26', observed);
 assert.deepEqual(plain(observed), {baselineAgeDays:2, coversPeriod:false});
});

/* ---------- 11. Evidence from multiple concepts / topics ---------- */

test('S27 [PASS] concept dedupe keeps the strongest row and excludes fallback, listening and science rows', () => {
 const rows = [
  skill({skill_id:'a1', skill_code:'MATH-P4-FRAC', questions_attempted:4, unique_activities:1, active_weeks:1}),
  skill({skill_id:'a2', skill_code:'MATH-P4-FRAC', questions_attempted:20, unique_activities:3, active_weeks:3}),
  skill({skill_id:'q', subject:'english', source:'english_quiz', skill_code:'ENG-P4-QUIZ'}),
  skill({skill_id:'legacy', source:null, skill_code:'MATH-P4-SKILL-GEO-014'}),
  skill({skill_id:'l', subject:'english', skill_code:'ENG-P4-LISTEN', skill_name:'Listening for detail'}),
  skill({skill_id:'sci', subject:'science', skill_code:'SCI-P4-X'}),
 ];
 const kept = helpers.dedupeConceptSkills(rows).map((s) => s.skill_id);
 record('S27', {kept});
 assert.deepEqual(plain(kept), ['a2']);
});

test('S28 [PASS] teaching signals rank likely gaps and "needs reinforcement" first', () => {
 const sig = (id, evidence_level, recovery_state, distinct_questions = 1) => ({id, evidence_level, recovery_state, distinct_questions, last_seen_at:daysAgo(1)});
 const sorted = teaching.sortTeachingSignals([sig('obs', 'observation', 'no_transfer_check'), sig('gap', 'likely_gap', 'no_transfer_check', 4), sig('gapR', 'likely_gap', 'needs_reinforcement', 4), sig('emg', 'emerging_pattern', 'recovery_signal', 2)]);
 const order = sorted.map((s) => s.id);
 record('S28', {order});
 assert.deepEqual(plain(order), ['gapR', 'gap', 'emg', 'obs']);
});

/* ---------- 12. Borderline confidence / mastery / sample size ---------- */

test('S29 [PASS] subject state and milestone boundaries are applied exactly as coded', () => {
 const st = (m, q) => helpers.subjectState(summary('math', m, q));
 const ms = (m) => milestones.milestoneFromScore(m).level;
 const observed = {q4:st(90, 4), q5:st(90, 5), m85:st(85, 10), m8499:st(84.99, 10), m70:st(70, 10), m6999:st(69.99, 10), milestone78:ms(78), milestone7799:ms(77.99), milestone55:ms(55), milestone40:ms(40), milestone3999:ms(39.99)};
 record('S29', observed);
 assert.deepEqual(plain(observed), {q4:'unknown', q5:'strong', m85:'strong', m8499:'developing', m70:'developing', m6999:'attention', milestone78:5, milestone7799:4, milestone55:3, milestone40:2, milestone3999:1});
});

test('S30 [FIXED 2B-1B] at the support boundary every tab agrees the gap is not yet confirmed', () => {
 const s = skill({status:'needs_support', questions_attempted:5, unique_activities:3, active_weeks:3, confidence_score:55, granular_eligible:true, evidence_quality:'ready'});
 const repeated = {q6a1w2c35:ep.hasRepeatedEvidence(skill({questions_attempted:6, unique_activities:1, active_weeks:2, confidence_score:35})), q5:ep.hasRepeatedEvidence(skill({questions_attempted:5, unique_activities:3, active_weeks:3, confidence_score:90})), c3499:ep.hasRepeatedEvidence(skill({questions_attempted:20, unique_activities:3, active_weeks:3, confidence_score:34.99}))};
 const observed = {repeated, boundarySkill:crossTabLabels(s)};
 record('S30', observed);
 assert.deepEqual(plain(repeated), {q6a1w2c35:true, q5:false, c3499:false});
 assert.deepEqual(plain(observed.boundarySkill), {strengthsGaps:'Still building', masteryMap:'Needs More Evidence', progress:'Needs More Evidence', parentReport:'Building evidence'});
});

test('S31 [FIXED 2B-1B] English "Consolidating" with Low evidence confidence is "Needs More Evidence", not "Secure"', () => {
 const item = englishItem({stage:'Consolidating', evidence_confidence:'Low', unique_questions:2});
 const purpose = mm.englishPurposeState(item);
 const observed = {group:englishUi.englishMasteryDisplayGroup(item), label:mm.PURPOSE_STATE_META[purpose].label, meaning:mm.PURPOSE_STATE_META[purpose].meaning};
 record('S31', observed);
 assert.equal(observed.group, 'needs_evidence');
 assert.equal(observed.label, 'Needs More Evidence');
 assert.doesNotMatch(observed.meaning, /secure/i);
});

test('S32 [FIXED 2B-1B] secure status with confidence 20 is not presented as Secure/Strong anywhere', () => {
 const s = skill({status:'secure', mastery_score:88, confidence_score:20, questions_attempted:5, unique_activities:1, active_weeks:1});
 const observed = crossTabLabels(s);
 record('S32', observed);
 assert.deepEqual(plain(observed), {strengthsGaps:'Still building', masteryMap:'Needs More Evidence', progress:'Needs More Evidence', parentReport:'(not shown)'});
});

test('S33 [NOT TESTABLE - conditional] "Observed once" headline ignores the occurrence count', () => {
 const signal = {evidence_level:'observation', recovery_state:'no_transfer_check', distinct_questions:3};
 const observed = {headline:teaching.teachingEvidenceHeadline(signal), explanation:teaching.teachingEvidenceExplanation(signal)};
 record('S33', observed);
 assert.equal(observed.headline, 'Observed once');
 assert.match(observed.explanation, /seen once/);
});
