'use strict';
/**
 * DREAMSCAPE ONE - Phase 4E-2B-8C-2D.1
 * Offline, synthetic pedagogical-quality casebook. NO network, SQL, OAuth, DB,
 * audit recording, learner inputs, teaching activation or 4C score modification.
 * Automated checks are structural + arithmetic + authoring completeness ONLY.
 * Human review of explanations, age suitability and comparative preference is
 * explicitly required; this tool must never be interpreted as sign-off.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = 'tests/fixtures/phase4e2b8c2d1-quality-cases.json';
const MODULE = 'lib/math-intelligence/teaching/method-library/methods/';
const REQUIRED_CRITERIA = Object.freeze([
  'mathematical_correctness', 'conceptual_explanation', 'representation_clarity',
  'step_progression', 'misconception_response', 'learner_accessibility',
]);
const cache = new Map();
function loadTypeScript(rel) {
  const normalized = path.normalize(rel);
  if (cache.has(normalized)) return cache.get(normalized).exports;
  const absolute = path.resolve(ROOT, normalized);
  if (!absolute.startsWith(ROOT + path.sep) || !fs.existsSync(absolute)) throw new Error('Unexpected method source: ' + normalized);
  const src = fs.readFileSync(absolute, 'utf8');
  const compiled = ts.transpileModule(src, {
    fileName: normalized,
    reportDiagnostics: true,
    compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS},
  });
  if (compiled.diagnostics?.some(x => x.category === ts.DiagnosticCategory.Error)) throw new Error('Method source could not be transpiled: ' + normalized);
  const m = {exports: {}};
  cache.set(normalized, m);
  vm.runInNewContext(compiled.outputText, {
    module:m, exports:m.exports,
    require:spec => {
      if (!spec.startsWith('.')) throw new Error('Unexpected module import: ' + spec);
      const dep = path.normalize(path.join(path.dirname(normalized), spec + '.ts'));
      return loadTypeScript(dep);
    },
  }, {filename:normalized,timeout:4000});
  return m.exports;
}
function dependencies() {
  return {
    drafts:loadTypeScript(MODULE+'phase4E2B8C2C3ASpecialistDrafts.ts').PHASE4E2B8C2C3A_SPECIALIST_DRAFTS,
    review:loadTypeScript(MODULE+'phase4E2B8C2C3BApplicabilityReview.ts').reviewSpecialistDraftApplicability,
  };
}
const own = (x,k) => Object.prototype.hasOwnProperty.call(x,k);
const safeInteger = n => Number.isSafeInteger(n);
function noSensitiveKeys(obj) {
  if (!obj || typeof obj !== 'object') return true;
  return Object.entries(obj).every(([k,v]) =>
    !/^(question_id|questionId|quizId|answer_data|accessToken|password|jwt|userId|approved|teacherApproved)$/i.test(k) && noSensitiveKeys(v));
}
const ratioEqual = (a,b,c,d) => a*d===b*c;
function checkArithmetic(input, spec) {
  if (!spec || typeof spec !== 'object' || !input?.facts || !safeInteger(spec.expectedTarget ?? 0)) {
    // Spacing has no expectedTarget, handled below.
    if (spec?.kind !== 'spacing') return false;
  }
  const f = input.facts;
  if (spec.kind === 'spacing' && f.kind === 'equal_spacing_interval_count') {
    const intervals = f.lastOrdinal - f.firstOrdinal;
    return safeInteger(intervals) && intervals > 0 &&
      safeInteger(spec.expectedIntervals) && spec.expectedIntervals===intervals &&
      typeof spec.expectedDistance==='number' && Number.isFinite(spec.expectedDistance) &&
      spec.expectedDistance===intervals*f.gapLength;
  }
  if (spec.kind === 'comparison' && f.kind === 'multiplicative_comparison_chain') {
    const values=spec.amounts;
    if (!values || !Array.isArray(f.quantityKeys) ||
        Object.keys(values).length!==f.quantityKeys.length ||
        !f.quantityKeys.every(id=>own(values,id)&&safeInteger(values[id])&&values[id]>0))return false;
    if (!safeInteger(spec.combinedTotal) ||
        f.quantityKeys.reduce((s,id)=>s+values[id],0)!==spec.combinedTotal ||
        spec.expectedTarget!==values[f.targetQuantity]) return false;
    return f.relationships.every(edge =>
      values[edge.quantity]*edge.denominator===values[edge.relativeTo]*edge.numerator);
  }
  if (spec.kind === 'ratio' && f.kind === 'ratio_before_after_change') {
    const orig=spec.original, updated=spec.updated, delta=f.changes;
    if (![orig,updated,delta].every(arr=>Array.isArray(arr)&&arr.length===2) ||
        !orig.every(n=>safeInteger(n)&&n>0) ||
        !updated.every(n=>safeInteger(n)&&n>0))return false;
    if (!ratioEqual(orig[0],orig[1],f.beforeRatio[0],f.beforeRatio[1]) ||
        !ratioEqual(updated[0],updated[1],f.afterRatio[0],f.afterRatio[1]) ||
        updated.some((n,i)=>n!==orig[i]+delta[i]))return false;
    return spec.expectedTarget===orig[1];
  }
  return false;
}
function checkTeachingStructure(draft, checklist) {
  if (!checklist || !Array.isArray(checklist.requiredStages) || checklist.requiredStages.length<3 ||
      !Array.isArray(checklist.reviewPrompts) || checklist.reviewPrompts.length<3 ||
      checklist.reviewPrompts.some(s=>typeof s!=='string'||s.trim().length<15))return false;
  const stages = draft.pedagogy?.teachingSequence;
  if (!Array.isArray(stages) || !checklist.requiredStages.every(id=>stages.some(s=>s.stageId===id)))return false;
  if (!draft.misconceptions?.some(m=>m.misconceptionId===checklist.misconceptionId))return false;
  const reps=draft.pedagogy.representations;
  if (!reps?.preferred?.includes(checklist.visualHint))return false;
  return stages.some(s=>s.role==='check') && draft.workedPattern?.checkPattern?.length>20;
}
function validateCase(one,drafts,review) {
  const issues=[];
  const id=one?.caseId ?? '(missing case ID)';
  const err=(msg)=>issues.push(msg);
  if (!/^[A-Z][A-Z0-9_]{4,60}$/.test(id))err('INVALID_CASE_ID');
  if (!noSensitiveKeys(one))err('POTENTIALLY_SENSITIVE_FIXTURE_FIELD');
  if (typeof one?.scenario!=='string' || one.scenario.length<20 || one.scenario.length>300)err('INVALID_SYNTHETIC_SCENARIO');
  if (one?.methodId!==one?.input?.methodId)err('METHOD_ID_MISMATCH');
  if (typeof one?.reviewNote!=='string' || one.reviewNote.length<20)err('REVIEW_NOTE_MISSING');
  const draft = drafts.find(d=>d.methodId===one?.methodId);
  if (!draft || draft.status!=='draft' || draft.governance?.lunaAllowed!==false ||
      draft.applicability?.curriculumSkills?.length!==0)err('DRAFT_GOVERNANCE_FAILED');
  let actual=null;
  try {actual=review(one?.input);}catch {err('APPLICABILITY_EXECUTION_FAILED');}
  if (actual && (actual.status!==one?.expected?.status || actual.ruleCode!==one?.expected?.ruleCode))err('EXPECTED_APPLICABILITY_MISMATCH');
  if (one?.expected?.status==='compatible_for_review') {
    if (!one.mathCheck || !checkArithmetic(one.input,one.mathCheck))err('WORKED_ARITHMETIC_INCORRECT');
    if (!draft || !checkTeachingStructure(draft,one.pedagogyChecklist))err('TEACHING_SEQUENCE_METADATA_INCOMPLETE');
  } else if (one?.mathCheck || one?.pedagogyChecklist) {
    err('EXCLUDED_CASE_CLAIMS_TEACHING_APPROVAL');
  }
  return {caseId:id,methodId:one?.methodId??null,expected:one?.expected?.status??null,
    observed:actual?.status??null,checksPassed:issues.length===0,issues,
    // No pedagogical score. Mandatory independent human judgment remains pending.
    humanPedagogicalReview:'pending',studentReleaseAllowed:false};
}
function evaluateCasebook(book, {drafts, review}=dependencies()) {
  const errors=[];
  if (book?.phase!=='4E-2B-8C-2D.1' || book?.fixtureType!=='synthetic_offline_quality_casebook' ||
      book?.notApproval!==true || !Array.isArray(book?.cases) || book.cases.length<12 || book.cases.length>150) {
    errors.push('INVALID_CASEBOOK_METADATA');
  }
  const seen=new Set();
  const rows=(Array.isArray(book?.cases)?book.cases:[]).map(item=>{
    const result=validateCase(item,drafts,review);
    if (seen.has(result.caseId)) result.issues.push('DUPLICATE_CASE_ID');
    result.checksPassed=result.issues.length===0;
    seen.add(result.caseId);
    return result;
  });
  const methodIds=drafts.map(x=>x.methodId);
  for (const methodId of methodIds) {
    const group=rows.filter(r=>r.methodId===methodId);
    if (group.filter(r=>r.expected==='compatible_for_review').length<2 ||
        group.filter(r=>r.expected!=='compatible_for_review').length<3)
      errors.push('METHOD_CASE_COVERAGE_INCOMPLETE:'+methodId);
  }
  const passCount=rows.filter(r=>r.checksPassed).length;
  return {
    phase:'4E-2B-8C-2D.1',mode:'OFFLINE_SYNTHETIC_VALIDATION',
    caseCount:rows.length,passed:passCount,failed:rows.length-passCount,
    suiteErrors:errors,checksPassed:errors.length===0&&rows.length===passCount,
    methods:methodIds.map(methodId=>({methodId,cases:rows.filter(r=>r.methodId===methodId).length,
      passed:rows.filter(r=>r.methodId===methodId&&r.checksPassed).length})),
    results:rows,
    reviewRubric:REQUIRED_CRITERIA.slice(),
    humanPedagogicalReview:'pending',independentReviewersRequired:2,
    answerKeyVerifiedAgainstProduction:false,sourceVersionChecked:false,
    comparisonWithExistingTeachingMethods:'not_yet_human_evaluated',
    methodActivationAllowed:false,staffWriteEnablementAllowed:false,studentReleaseAllowed:false,betaReady:false,
    caveat:'Synthetic arithmetic/structure checks and draft metadata are NOT proof of real-question teaching quality, approved curriculum skills, diagram correctness or learner outcomes.',
  };
}
function run(argv=process.argv.slice(2)) {
  const book=JSON.parse(fs.readFileSync(path.join(ROOT,FIXTURE),'utf8'));
  const report=evaluateCasebook(book);
  if(argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else {
    console.log(`Phase ${report.phase}: ${report.checksPassed?'OFFLINE_CHECKS_PASSED':'OFFLINE_CHECKS_BLOCKED'}`);
    console.log(`${report.passed}/${report.caseCount} synthetic examples and counterexamples passed`);
    for(const row of report.results.filter(r=>!r.checksPassed)) console.log('FAIL '+row.caseId+': '+row.issues.join(', '));
    for(const error of report.suiteErrors)console.log('FAIL '+error);
    console.log('Human teaching-quality review: PENDING; production answer-key and live-session checks: NOT RUN');
    console.log('All draft methods inactive; no writes, scores, approval or learner release.');
  }
  if(!report.checksPassed)process.exitCode=1;
  return report;
}
if(require.main===module)run();
module.exports={FIXTURE,REQUIRED_CRITERIA,dependencies,checkArithmetic,checkTeachingStructure,validateCase,evaluateCasebook,run};
