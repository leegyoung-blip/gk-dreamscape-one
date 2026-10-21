'use strict';
/**
 * DREAMSCAPE ONE - 8C-2D.2: offline reference teaching-explanation quality gates.
 *
 * Checks stage order, structured maths, representation metadata, misconception
 * treatment and comparison disclosure. It does NOT grade the truth or clarity of
 * free-text prose, inspect images or certify teaching effectiveness.
 * No network, browser, Supabase, auth, approval, scoring or production imports.
 */
const fs = require('node:fs');
const path = require('node:path');
const one = require('./phase4e2b8c2d1-quality-casebook.cjs');
const ROOT = path.resolve(__dirname, '..');
const CASES = 'tests/fixtures/phase4e2b8c2d1-quality-cases.json';
const EXPLANATIONS = 'tests/fixtures/phase4e2b8c2d2-worked-explanations.json';
const RUBRIC = ['mathematical_correctness','conceptual_explanation','representation_clarity','step_progression','misconception_response','learner_accessibility'];
const own = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const integer = n=>Number.isSafeInteger(n);
const same = (a,b)=>JSON.stringify(a)===JSON.stringify(b);
const nonempty = s=>typeof s==='string' && s.trim().length>=25;
const forbiddenKeys = /^(?:questionId|quizId|answer_data|accessToken|jwt|password|authorization|approved|reviewerEmail|userId|studentId|published)$/i;
function noUnsafeKeys(node){
  if (!node || typeof node!=='object') return true;
  if (Array.isArray(node)) return node.every(noUnsafeKeys);
  return Object.entries(node).every(([k,v])=>!forbiddenKeys.test(k)&&noUnsafeKeys(v));
}
function numericCalculation(c){
  if(!c || typeof c!=='object')return false;
  if(c.operation==='subtract')return integer(c.left)&&integer(c.right)&&integer(c.result)&&c.left-c.right===c.result;
  if(c.operation==='multiply')return integer(c.left)&&integer(c.right)&&integer(c.result)&&c.left*c.right===c.result;
  if(c.operation==='divide')return integer(c.left)&&integer(c.right)&&c.right>0&&integer(c.result)&&c.left===c.right*c.result;
  if(c.operation==='sum')return Array.isArray(c.values)&&c.values.length>1&&c.values.every(integer)&&integer(c.result)&&c.values.reduce((a,b)=>a+b,0)===c.result;
  if(c.operation==='solve_ratio_scale'){
    const b=c.beforeRatio,a=c.afterRatio,d=c.changes;
    if(![b,a,d].every(x=>Array.isArray(x)&&x.length===2&&x.every(integer)) || !integer(c.result) || c.result<=0)return false;
    const denominator=a[1]*b[0]-a[0]*b[1];
    const numerator=a[0]*d[1]-a[1]*d[0];
    return denominator!==0 && denominator*c.result===numerator;
  }
  if(c.operation==='check_ratio_states'){
    const b=c.before,a=c.after;
    return c.result===true && [b,a].every(x=>Array.isArray(x)&&x.length===2&&x.every(integer)&&x.every(v=>v>0));
  }
  return false;
}
function validateExplanation(ex, src, draft){
  const issues=[],err=x=>issues.push(x);
  if(!src || src.expected?.status!=='compatible_for_review')err('UNSUPPORTED_OR_EXCLUDED_CASE');
  if(!draft || draft.status!=='draft' || draft.applicability?.curriculumSkills?.length)err('METHOD_NOT_INACTIVE_DRAFT');
  if(!noUnsafeKeys(ex))err('UNSAFE_OR_APPROVAL_FIELD');
  if(ex?.sourceKind!=='synthetic_offline_example' || ex?.authoringClaim!=='reference_example_not_live_generated' || ex?.humanReview!=='pending')err('INVALID_PROVENANCE_OR_REVIEW_STATUS');
  if(ex?.methodId!==src?.methodId || ex?.learnerLevel!==src?.input?.learnerLevel)err('MISMATCHED_METHOD_OR_LEVEL');
  if(!nonempty(ex?.question)||!nonempty(ex?.title))err('EXEMPLAR_TEXT_MISSING');
  const canonicalStages=draft?.pedagogy?.teachingSequence?.map(x=>x.stageId)||[];
  if(!Array.isArray(ex?.steps)||!same(ex.steps.map(s=>s.stageId),canonicalStages) || ex.steps.some(s=>!nonempty(s.learnerExplanation)))err('TEACHING_STAGE_ORDER_OR_PROSE_MISSING');
  for(const step of (ex.steps||[]))if(own(step,'calculation')&&!numericCalculation(step.calculation))err('INVALID_CALCULATION:'+step.stageId);
  const rep=ex?.representation,preferred=draft?.pedagogy?.representations?.preferred||[];
  if(!rep || !preferred.includes(rep.type) || !nonempty(rep.description) || !Array.isArray(rep.labels) || rep.labels.length<3 || rep.labels.some(x=>typeof x!=='string'||!x.trim()))err('REPRESENTATION_NOT_AUTHORABLE');
  if(ex?.misconception?.id!==src?.pedagogyChecklist?.misconceptionId || !nonempty(ex?.misconception?.correction) || !nonempty(ex?.misconception?.incorrectApproach))err('MISCONCEPTION_NOT_ADDRESSED');
  if(!nonempty(ex?.comparison?.incumbent) || !nonempty(ex?.comparison?.advantageHypothesis) || ex.comparison?.suggestedRole!=='undecided' || ex.comparison?.humanJudgment!=='pending')err('HUMAN_COMPARISON_NOT_PENDING');
  if(ex?.answer?.value!==src?.mathCheck?.expectedDistance && ex?.answer?.value!==src?.mathCheck?.expectedTarget)err('WRONG_FINAL_ANSWER');
  if(!nonempty(ex?.answer?.quantity) && (typeof ex?.answer?.quantity!=='string'||ex.answer.quantity.length<3))err('UNLABELLED_ANSWER');
  if(!['m','objects'].includes(ex?.answer?.unit))err('UNSUPPORTED_UNIT');
  const facts=src?.input?.facts||{}, expected=src?.mathCheck||{};
  if(expected.kind==='spacing') {
    const n=facts.lastOrdinal-facts.firstOrdinal;
    const interval=ex.steps?.find(x=>x.stageId==='count_intervals')?.calculation;
    const distance=ex.steps?.find(x=>x.stageId==='calculate_distance')?.calculation;
    if(!interval||interval.operation!=='subtract'||interval.left!==facts.lastOrdinal||interval.right!==facts.firstOrdinal||interval.result!==n ||
       !distance||distance.operation!=='multiply'||distance.left!==n||distance.right!==facts.gapLength||distance.result!==expected.expectedDistance)err('SPACING_GAPS_OR_DISTANCE_MISMATCH');
    if(ex?.answer?.quantity!=='distance'||ex?.answer?.unit!=='m' || !rep?.labels?.some(x=>x.includes(`${n} equal gap`)))err('SPACING_LABEL_OR_UNIT_MISMATCH');
  } else if(expected.kind==='comparison') {
    const w=ex?.worked;
    const amounts=expected.amounts, parts=w?.unitParts, ids=facts.quantityKeys;
    const sum=ids?.reduce((s,id)=>s+(parts?.[id]??NaN),0);
    if(!w || !parts || !integer(w.oneUnit)||w.oneUnit<=0 || !integer(sum)||sum!==w.totalUnits || !same(w.amounts,amounts) || w.combinedTotal!==expected.combinedTotal ||
      !ids.every(id=>integer(parts[id])&&parts[id]>0&&parts[id]*w.oneUnit===amounts[id]))err('COMPARISON_REFERENCE_UNITS_MISMATCH');
    const solve=ex.steps?.find(x=>x.stageId==='find_one_unit')?.calculation;
    const target=ex.steps?.find(x=>x.stageId==='scale_target')?.calculation;
    const check=ex.steps?.find(x=>x.stageId==='check_comparisons')?.calculation;
    if(!solve||solve.operation!=='divide'||solve.left!==expected.combinedTotal||solve.right!==sum||solve.result!==w?.oneUnit ||
       !target||target.operation!=='multiply'||target.left!==parts?.[facts.targetQuantity]||target.right!==w?.oneUnit||target.result!==expected.expectedTarget ||
       !check||check.operation!=='sum'||check.result!==expected.combinedTotal|| !same(check.values,ids.map(id=>amounts[id])))err('COMPARISON_CALCULATIONS_MISMATCH');
    for(const edge of facts.relationships||[]) if(amounts[edge.quantity]*edge.denominator!==amounts[edge.relativeTo]*edge.numerator)err('COMPARISON_RELATIONSHIP_MISMATCH');
    if(ex?.answer?.quantity!==facts.targetQuantity||ex?.answer?.unit!=='objects')err('COMPARISON_TARGET_MISMATCH');
    for(const id of ids||[])if(!rep?.labels?.some(x=>x.toLowerCase().startsWith(id.toLowerCase()+':')))err('COMPARISON_BAR_LABEL_MISSING:'+id);
  } else if(expected.kind==='ratio') {
    const w=ex?.worked||{},before=w.before,after=w.after,chg=facts.changes;
    if(!same(before,expected.original)||!same(after,expected.updated)||!same(chg,w.changes) ||
       !Array.isArray(before)||!Array.isArray(after)||
       before.some((v,i)=>v+chg[i]!==after[i]) ||
       before[0]*facts.beforeRatio[1]!==before[1]*facts.beforeRatio[0] ||
       after[0]*facts.afterRatio[1]!==after[1]*facts.afterRatio[0] ||
       w.beforeUnit*facts.beforeRatio[0]!==before[0] ||
       w.afterUnit*facts.afterRatio[0]!==after[0])err('RATIO_STATE_INCONSISTENT');
    const solve=ex.steps?.find(x=>x.stageId==='enforce_after_ratio')?.calculation;
    const check=ex.steps?.find(x=>x.stageId==='solve_and_verify')?.calculation;
    if(!solve||solve.operation!=='solve_ratio_scale'||!same(solve.beforeRatio,facts.beforeRatio)||!same(solve.afterRatio,facts.afterRatio)||!same(solve.changes,chg)||solve.result!==w.beforeUnit ||
       !check||check.operation!=='check_ratio_states'||!same(check.before,before)||!same(check.after,after)|| check.result!==true)err('RATIO_EXPLANATION_CALCULATION_MISMATCH');
    if(ex?.answer?.quantity!=='original_B'||ex?.answer?.unit!=='objects'||ex?.answer?.value!==before?.[1] ||
       !rep?.labels?.some(s=>s.startsWith('Before A:'))||!rep?.labels?.some(s=>s.startsWith('After B:')))err('RATIO_LABEL_OR_TARGET_MISMATCH');
  }else err('UNKNOWN_CASE_KIND');
  if(!one.checkArithmetic(src.input,expected))err('SOURCE_CASE_ARITHMETIC_FAILED');
  return {caseId:ex?.caseId??null,methodId:ex?.methodId??null,pass:issues.length===0,issues,humanPedagogicalReview:'pending'};
}
function evaluate(book, sourceBook, drafts){
  const errors=[];
  if(book?.phase!=='4E-2B-8C-2D.2' || book?.fixtureType!=='offline_authored_worked_explanations'||book.notApproval!==true||book.liveGenerationTested!==false||!Array.isArray(book.exemplars))errors.push('BAD_EXPLANATION_BOOK_HEADER');
  const positive=sourceBook.cases.filter(x=>x.expected.status==='compatible_for_review');
  const byId=new Map(positive.map(c=>[c.caseId,c]));
  const seen=new Set();
  const rows=(book.exemplars||[]).map(ex=>{
    let row=validateExplanation(ex,byId.get(ex.caseId),drafts.find(d=>d.methodId===ex.methodId));
    if(seen.has(ex.caseId)){row.issues.push('DUPLICATE_EXEMPLAR');row.pass=false;}
    seen.add(ex.caseId);return row;
  });
  if(positive.length!==6 || seen.size!==positive.length || positive.some(c=>!seen.has(c.caseId)))errors.push('EXPLANATION_CASE_COVERAGE_INCOMPLETE');
  const passed=rows.filter(r=>r.pass).length;
  return {phase:'4E-2B-8C-2D.2',mode:'OFFLINE_REFERENCE_EXPLANATION_CHECKS',count:rows.length,passed,failed:rows.length-passed,errors,checksPassed:passed===rows.length&&errors.length===0,rows,independentEducatorReview:'pending',liveTeachingOutputTested:false,comparisonToExistingMethod:'human_review_pending',allMethodsInactive:true,approvalGranted:false,learnerReleaseAllowed:false,betaReady:false,caveat:'Checks structured arithmetic, stage order, declared visual labels and authoring completeness only. Narrative correctness, actual rendered diagrams, learner accessibility and educational benefit require independent educators.'};
}
function load(){return {book:JSON.parse(fs.readFileSync(path.join(ROOT,EXPLANATIONS),'utf8')),source:JSON.parse(fs.readFileSync(path.join(ROOT,CASES),'utf8')),drafts:one.dependencies().drafts};}
function run(argv=process.argv.slice(2)){
  const {book,source,drafts}=load(); const report=evaluate(book,source,drafts);
  if(argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else{
    console.log(`Phase ${report.phase}: ${report.checksPassed?'REFERENCE_CHECKS_PASSED':'REFERENCE_CHECKS_BLOCKED'}`);
    console.log(`${report.passed}/${report.count} synthetic worked explanations passed structural/arithmetic checks`);
    for(const r of report.rows.filter(x=>!x.pass))console.log(`BLOCK ${r.caseId}: ${r.issues.join(', ')}`);
    for(const e of report.errors)console.log('BLOCK '+e);
    console.log('Human educator review: PENDING (two independent reviewers; 6 rubric dimensions).');
    console.log('Live teaching outputs, rendered diagrams and learner outcomes: NOT TESTED.');
    console.log('Method activation, staff write enablement and learner release: DISABLED.');
  }
  if(!report.checksPassed)process.exitCode=1;
  return report;
}
if(require.main===module)run();
module.exports={RUBRIC,load,numericCalculation,validateExplanation,evaluate,run};
