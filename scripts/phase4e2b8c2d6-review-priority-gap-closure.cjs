'use strict';
/**
 * DREAMSCAPE ONE | Phase 4E-2B-8C-2D.6
 * Offline ONLY: close missing mathematical applicability witness cells and prepare educator reviews.
 * No OAuth, DB, user data, production questions, learner-facing explanations, method activation or approval.
 * Results are mathematical/structural checks; difficulty/age suitability are NOT independently evaluated.
 */
const fs = require('node:fs');
const path = require('node:path');
const earlier = require('./phase4e2b8c2d5-quality-coverage.cjs');
const original = require('./phase4e2b8c2d1-quality-casebook.cjs');
const ROOT = path.resolve(__dirname, '..');
const FIXTURE = 'tests/fixtures/phase4e2b8c2d6-gap-closure-cases.json';
const MATRIX = 'docs/phase4e2b8c2d6-closure-matrix.csv';
const QUEUE = 'docs/phase4e2b8c2d6-educator-review-queue.csv';
const WORKSHEET = 'docs/phase4e2b8c2d6-educator-review-worksheet.csv';
const PAIRED_FIXTURE = 'tests/fixtures/phase4e2b8c2d3-paired-explanations.json';
const OWN=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const safeEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const csv=(v)=>{const s=String(v??''); return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
const toCsv=(head, rows)=>[head.join(','),...rows.map(row=>row.map(csv).join(','))].join('\n')+'\n';
const read=(p)=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
function loadFixture(){return read(FIXTURE);}
function existingPairs(){
  const data=read(PAIRED_FIXTURE);
  // These IDs are the synthetic paired cases created in 2D.3, not live 4C selections.
  return data;
}
function evaluate(book=loadFixture(), old=earlier.loadFixture(), ctx=original.dependencies()){
  const errors=[];
  const oldReport=earlier.evaluate(old,ctx);
  if(oldReport.status!=='SYNTHETIC_COVERAGE_CHECKS_PASSED')errors.push('BASELINE_2D5_NOT_VALID');
  if(book?.phase!=='4E-2B-8C-2D.6'||book?.fixtureType!=='synthetic_missing_grade_difficulty_gap_closure'||
     book?.basePhase!=='4E-2B-8C-2D.5'||book?.notApproval!==true||
     book?.casesFromProduction!==false||book?.actualNovaOutputs!==false||
     book?.independentEducatorReviewCompleted!==false||book?.studentRelease!==false||
     !Array.isArray(book?.cases)||book.cases.length!==18)
    errors.push('INVALID_GAP_BOOK_HEADER');
  const expected=new Set(oldReport.gradeDifficultyGaps.map(g=>`${g.methodId}|${g.primaryLevel}|${g.difficulty}`));
  if(expected.size!==18)errors.push('BASELINE_GAP_COUNT_CHANGED');
  const seen=new Set(), resultRows=[];
  for(const item of Array.isArray(book?.cases)?book.cases:[]){
    const id=item?.caseId;
    const target=`${item?.methodId}|${item?.input?.learnerLevel}|${item?.difficultyRelativeToLevel}`;
    const issues=[];
    if(!/^GAP_(SPACE|CHAIN|RATIO)_[0-9]{2}$/.test(id??'')||seen.has(id))issues.push('INVALID_OR_DUPLICATE_NEW_CASE_ID');
    seen.add(id);
    if(!expected.has(target))issues.push('NOT_AN_ACTUAL_UNTESTED_POSITIVE_CELL');
    if(item?.expected?.status!=='compatible_for_review'||item?.coverageCategory!=='positive'||
       item?.caseProvenance!=='synthetic_designed_case_not_a_production_question')issues.push('NOT_A_SYNTHETIC_POSITIVE');
    if(!String(item?.reviewNote??'').toLowerCase().includes('educator'))issues.push('EDUCATOR_CALIBRATION_NOT_DISCLOSED');
    if(typeof item?.coverageFocus!=='string'||item.coverageFocus.length<25)issues.push('MISSING_QUALITY_REVIEW_FOCUS');
    const check=original.validateCase(item,ctx.drafts,ctx.review);
    issues.push(...check.issues);
    resultRows.push({caseId:id,cell:target,methodId:item?.methodId,primaryLevel:item?.input?.learnerLevel,difficulty:item?.difficultyRelativeToLevel,
      scenario:item?.scenario,focus:item?.coverageFocus,checkStatus:check.observed,pass:issues.length===0,issues:[...new Set(issues)]});
  }
  const occupied=new Set(resultRows.map(r=>r.cell));
  const missing=[...expected].filter(cell=>!occupied.has(cell));
  for(const cell of missing)errors.push('UNCLOSED_GRADE_DIFFICULTY_CELL:'+cell);
  if(resultRows.some(r=>!r.pass))errors.push('ADDED_CASES_FAILED_ARITHMETIC_OR_STRUCTURE');
  const baselinePos=new Set(old.cases.filter(c=>c.expected?.status==='compatible_for_review').map(c=>`${c.methodId}|${c.input.learnerLevel}|${c.difficultyRelativeToLevel}`));
  const allPositiveCells=new Set([...baselinePos,...resultRows.filter(r=>r.pass).map(r=>r.cell)]);
  const matrix=oldReport.matrix.map(row=>{
    const matches=resultRows.filter(r=>r.methodId===row.methodId&&r.primaryLevel===row.primaryLevel&&r.pass);
    const covered=[...new Set([...row.positiveDifficultyBands,...matches.map(x=>x.difficulty)])].sort((a,b)=>a-b);
    const gaps=[1,2,3,4,5].filter(d=>!covered.includes(d));
    return {methodId:row.methodId,level:row.primaryLevel,oldPositive:row.positive,newPositive:matches.length,
      allPositive:row.positive+matches.length,negativeOld:row.excluded+row.insufficientEvidence,
      bands:covered,uncovered:gaps};
  });
  if(matrix.some(row=>row.uncovered.length))errors.push('REMAINING_GRADE_DIFFICULTY_GAPS');
  if(allPositiveCells.size!==45)errors.push('NOT_45_UNIQUE_POSITIVE_CELLS');
  const oldPairs=existingPairs();
  if(!Array.isArray(oldPairs?.comparisons)||oldPairs.comparisons.length!==6)errors.push('EXISTING_SIX_REVIEW_PAIRS_NOT_FOUND');
  const queued=[
    ...(oldPairs?.comparisons??[]).map(p=>({caseId:p.caseId,caseType:'existing_paired_explanation',methodId:p.specialistMethodId??'REVIEW_IN_PAIR',
       level:'',difficulty:'',priority:'P0',reason:'Compare specialist vs existing method using the SAME authored synthetic question',
       reviewerNote:'Review clarity and mathematical correctness of both variants; evidence is NOT actual NOVA output'})),
    ...resultRows.filter(r=>r.pass).map(r=>({caseId:r.caseId,caseType:'new_structural_witness_only',methodId:r.methodId,
       level:r.primaryLevel,difficulty:r.difficulty,priority:r.difficulty>=4?'P0':'P1',reason:r.focus,
       reviewerNote:'First author TWO explanations and diagrams, then review. A structural witness is NOT a teaching explanation.'})),
  ];
  if(queued.length!==24 || new Set(queued.map(q=>q.caseId)).size!==24)errors.push('REVIEW_QUEUE_SIZE_OR_ID_ERROR');
  return {phase:'4E-2B-8C-2D.6',status:errors.length?'GAP_CLOSURE_BLOCKED':'OFFLINE_GAP_CLOSURE_CHECKS_PASSED',
    existingCases:oldReport.total,newCases:resultRows.length,mathematicalCasesChecked:oldReport.total+resultRows.length,
    oldPositives:oldReport.positive,newPositives:resultRows.filter(x=>x.pass).length,
    originalOpenCells:expected.size,remainingCells:matrix.reduce((s,row)=>s+row.uncovered.length,0),
    distinctPositiveCells:allPositiveCells.size,totalPossiblePositiveCells:45,
    matrix,queue:queued,results:resultRows,errors,
    authoredReferenceExplanations:6,previousPairedExplanations:6,newCompleteExplanations:0,
    independentEducatorDecisionsMade:0,realNovaOutputsReviewed:0,
    relativeDifficultyCalibratedByEducator:false,studentLearningEvidenceCollected:false,
    liveSessionAccessVerified:false,methodActivationAllowed:false,studentReleaseAllowed:false,betaReady:false,
    note:'45/45 synthetic grade-by-difficulty positive applicability CELLS, not teaching quality, human approval, or real NOVA performance.'};
}
function matrixCsv(rep){return toCsv(['specialist_method_id','primary_level','2d5_positive_cases','2d6_added_positive_cases','total_positive_cases','2d5_negative_or_insufficient_cases','positive_difficulty_bands','missing_positive_bands','pedagogical_validation'],rep.matrix.map(r=>[
 r.methodId,r.level,r.oldPositive,r.newPositive,r.allPositive,r.negativeOld,r.bands.join('|'),r.uncovered.join('|'),'PENDING_EDUCATOR_REVIEW']));}
function queueCsv(rep){return toCsv(['case_id','case_type','specialist_method_id','primary_level','difficulty_relative_to_level','priority','reason_for_selection','needed_before_quality_decision','reviewer_1_status','reviewer_2_status','specialist_role_decision','release_status'],rep.queue.map(q=>[
 q.caseId,q.caseType,q.methodId,q.level,q.difficulty,q.priority,q.reason,q.reviewerNote,'PENDING','PENDING','UNDECIDED','DISABLED']));}
function worksheetCsv(rep){return toCsv(['case_id','reviewer_code','review_stage','mathematical_correctness_0_3','conceptual_clarity_0_3','visual_clarity_0_3','steps_0_3','misconception_support_0_3','age_difficulty_fit_0_3','hard_stop_yes_no','hard_stop_reason','recommended_role','evidence_notes','review_status'],rep.queue.flatMap(q=>['R1','R2'].map(code=>[
 q.caseId,code,q.caseType==='existing_paired_explanation'?'COMPARE_TWO_EXISTING_AUTHORED_EXPLANATIONS':'AUTHOR_AND_REVIEW_EXPLANATION','','','','','','','','','undecided','','PENDING'])));}
function run(argv=process.argv.slice(2)){
 if(argv.some(a=>!['--verify-assets','--json'].includes(a)))throw Error('UNKNOWN_OPTION');
 const report=evaluate();
 if(argv.includes('--verify-assets')){
  for(const [p,fn] of [[MATRIX,matrixCsv],[QUEUE,queueCsv],[WORKSHEET,worksheetCsv]]){
   if(!fs.existsSync(path.join(ROOT,p))||fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n')!==fn(report))report.errors.push('MISMATCHED_ASSET:'+p);
  }
  if(report.errors.length)report.status='GAP_CLOSURE_BLOCKED';
 }
 if(argv.includes('--json'))console.log(JSON.stringify(report,null,2));
 else{
  console.log(`Phase ${report.phase}: ${report.status}`);
  console.log(`${report.newPositives}/${report.newCases} new synthetic positive witnesses | ${report.originalOpenCells} original gaps | ${report.remainingCells} remaining`);
  console.log(`${report.distinctPositiveCells}/${report.totalPossiblePositiveCells} level-by-difficulty applicability cells represented synthetically`);
  console.log(`${report.queue.length} educator-priority items | 6 existing paired explanations | 18 structural-only additions`);
  console.log('Human approval: PENDING | Real NOVA explanations: NOT TESTED | Production selection: UNCHANGED');
  report.errors.forEach(e=>console.log('BLOCK: '+e));
  report.results.filter(r=>!r.pass).forEach(r=>console.log('INVALID: '+r.caseId+': '+r.issues.join(',')));
 }
 if(report.errors.length)process.exitCode=1;
 return report;
}
if(require.main===module)try{run();}catch(e){console.error('GAP_CLOSURE_BLOCKED: '+e.message);process.exitCode=1;}
module.exports={FIXTURE,MATRIX,QUEUE,WORKSHEET,evaluate,loadFixture,matrixCsv,queueCsv,worksheetCsv,run};
