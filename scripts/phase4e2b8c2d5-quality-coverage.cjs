'use strict';
/**
 * DREAMSCAPE ONE | 4E-2B-8C-2D.5
 * Expanded SYNTHETIC coverage of inactive specialist applicability and worked arithmetic.
 * NO production questions/answers, generated NOVA output, DB calls, approvals, scoring, API or child data.
 * The six human-authored explanations and paired comparisons in 2D.2/2D.3 are NOT multiplied by these cases.
 */
const fs = require('node:fs');
const path = require('node:path');
const earlier = require('./phase4e2b8c2d1-quality-casebook.cjs');
const ROOT = path.resolve(__dirname, '..');
const FIXTURE = 'tests/fixtures/phase4e2b8c2d5-expanded-quality-cases.json';
const MATRIX = 'docs/phase4e2b8c2d5-coverage-matrix.csv';
const METHODS = Object.freeze({
  'heuristic.multi_step.equal_spacing_interval_count': [3,4,5,6],
  'heuristic.multi_step.multiplicative_comparison_chain': [4,5,6],
  'ratio.relationship.before_after_change': [5,6],
});
const CATEGORIES = Object.freeze(['positive','near_match','missing_evidence']);
const OWN=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const allGrades=Object.entries(METHODS).flatMap(([methodId,levels])=>levels.map(level=>({methodId,level})));
const validId=v=>typeof v==='string'&&/^EXP_(SPACE|CHAIN|RATIO)_(POS|NEG)_[0-9]{2}$/.test(v);
const newSet=v=>new Set(v);
function csvEscape(value){const s=String(value);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function coverageCsv(report){
 const headers=['specialist_method_id','primary_level','positive_cases','excluded_cases','insufficient_evidence_cases','difficulty_bands_tested','positive_difficulty_bands','untested_positive_difficulty_bands','gap_status'];
 const lines=[headers.join(',')];
 for(const row of report.matrix){
   lines.push([row.methodId,row.primaryLevel,row.positive,row.excluded,row.insufficientEvidence,row.difficultyBands.join('|'),row.positiveDifficultyBands.join('|'),row.untestedPositiveDifficultyBands.join('|'),row.gapStatus].map(csvEscape).join(','));
 }
 return lines.join('\n')+'\n';
}
function loadFixture(){return JSON.parse(fs.readFileSync(path.join(ROOT,FIXTURE),'utf8'));}
function evaluate(book, ctx=earlier.dependencies()){
 const issues=[], rows=[], ids=new Set();
 if (!book || book.phase!=='4E-2B-8C-2D.5'||book.fixtureType!=='synthetic_offline_expanded_quality_coverage'||
     book.casesFromProduction!==false||book.actualNovaOutputs!==false||book.humanReviewsComplete!==false||
     book.studentRelease!==false||book.notApproval!==true||!Array.isArray(book.cases)||book.cases.length!==54)
   issues.push('INVALID_COVERAGE_BOOK_HEADER');
 if(book?.difficultyPolicy!=='1 to 5 relative to question primary level (1 is easy for that primary level, 5 is challenging)')
   issues.push('RELATIVE_DIFFICULTY_POLICY_MISSING');
 const cases=Array.isArray(book?.cases)?book.cases:[];
 const drafts=ctx.drafts;
 if(!eq(newSet(Object.keys(METHODS)).size,drafts.length) || !drafts.every(d=>OWN(METHODS,d.methodId)&&d.status==='draft'&&d.applicability.curriculumSkills.length===0))
   issues.push('SPECIALIST_DRAFT_CATALOGUE_CHANGED');
 for(const c of cases){
   const problems=[];
   if(!validId(c?.caseId)||ids.has(c.caseId))problems.push('INVALID_OR_DUPLICATE_CASE_ID');
   ids.add(c.caseId);
   if(!OWN(METHODS,c?.methodId)||!METHODS[c.methodId].includes(c?.input?.learnerLevel))problems.push('UNSUPPORTED_LEVEL_OR_SPECIALIST');
   if(!Number.isInteger(c?.difficultyRelativeToLevel)||c.difficultyRelativeToLevel<1||c.difficultyRelativeToLevel>5)problems.push('INVALID_RELATIVE_DIFFICULTY');
   if(!CATEGORIES.includes(c?.coverageCategory)||typeof c?.coverageFocus!=='string'||c.coverageFocus.trim().length<12)
     problems.push('COVERAGE_CLASSIFICATION_MISSING');
   if(c?.caseProvenance!=='synthetic_designed_case_not_a_production_question')problems.push('WRONG_EVIDENCE_PROVENANCE');
   if((c.coverageCategory==='positive') !== (c.expected?.status==='compatible_for_review'))problems.push('COVERAGE_CATEGORY_OUTCOME_MISMATCH');
   if(c.coverageCategory==='near_match'&&c.expected?.status!=='excluded')problems.push('NEAR_MATCH_MUST_BE_EXCLUDED');
   if(c.coverageCategory==='missing_evidence'&&c.expected?.status!=='insufficient_evidence')problems.push('MISSING_EVIDENCE_CANNOT_BE_RESOLVED');
   const outcome=earlier.validateCase(c,drafts,ctx.review);
   problems.push(...outcome.issues);
   rows.push({caseId:c.caseId,methodId:c.methodId,primaryLevel:c?.input?.learnerLevel,
     difficulty:c.difficultyRelativeToLevel,expected:c.expected?.status,category:c.coverageCategory,
     focus:c.coverageFocus,pass:problems.length===0,issues:[...new Set(problems)]});
 }
 for(const methodId of Object.keys(METHODS)){
   const mr=rows.filter(r=>r.methodId===methodId);
   if(mr.length!==18||mr.filter(r=>r.category==='positive').length!==9||mr.filter(r=>r.category!=='positive').length!==9)
     issues.push('METHOD_POSITIVE_NEGATIVE_BALANCE:'+methodId);
   const bands=newSet(mr.filter(r=>r.category==='positive').map(r=>r.difficulty));
   if(![1,2,3,4,5].every(x=>bands.has(x)))issues.push('MISSING_RELATIVE_DIFFICULTY_BAND:'+methodId);
   const negCases=cases.filter(c=>c?.methodId===methodId&&c?.expected?.status!=='compatible_for_review');
   if(newSet(negCases.map(c=>c?.expected?.ruleCode)).size<4)issues.push('INSUFFICIENT_ADVERSARIAL_VARIETY:'+methodId);
   if(!negCases.some(c=>c?.expected?.status==='insufficient_evidence')||!negCases.some(c=>c?.expected?.status==='excluded'))
     issues.push('MISSING_BLOCKED_RESULT_TYPE:'+methodId);
 }
 const matrix=allGrades.map(({methodId,level})=>{
   const group=rows.filter(r=>r.methodId===methodId&&r.primaryLevel===level);
   const positive=group.filter(r=>r.expected==='compatible_for_review').length;
   const excluded=group.filter(r=>r.expected==='excluded').length;
   const insufficientEvidence=group.filter(r=>r.expected==='insufficient_evidence').length;
   const difficultyBands=[...newSet(group.map(r=>r.difficulty))].sort((a,b)=>a-b);
   const positiveDifficultyBands=[...newSet(group.filter(r=>r.expected==='compatible_for_review').map(r=>r.difficulty))].sort((a,b)=>a-b);
   const untestedPositiveDifficultyBands=[1,2,3,4,5].filter(d=>!positiveDifficultyBands.includes(d));
   return {methodId,primaryLevel:level,positive,excluded,insufficientEvidence,
     difficultyBands,positiveDifficultyBands,untestedPositiveDifficultyBands,
     gapStatus:!positive?'NO_POSITIVE_CASE':untestedPositiveDifficultyBands.length?'PARTIAL_GRADE_DIFFICULTY':'ALL_FIVE_BANDS_SAMPLED'};
 });
 if(matrix.some(m=>m.positive===0))issues.push('LEVEL_METHOD_COMBINATION_UNTESTED');
 if(rows.filter(r=>r.pass).length!==54)issues.push('CASE_VALIDATION_FAILURES');
 const distinctFoci=newSet(rows.map(r=>r.focus));
 if(distinctFoci.size<35)issues.push('COVERAGE_FOCUS_DIVERSITY_INSUFFICIENT');
 const passed=rows.filter(r=>r.pass).length;
 return {
   phase:'4E-2B-8C-2D.5',status:issues.length===0?'SYNTHETIC_COVERAGE_CHECKS_PASSED':'SYNTHETIC_COVERAGE_BLOCKED',
   total:rows.length,passed,failed:rows.length-passed,
   positive:rows.filter(r=>r.expected==='compatible_for_review').length,
   excluded:rows.filter(r=>r.expected==='excluded').length,
   insufficientEvidence:rows.filter(r=>r.expected==='insufficient_evidence').length,
   methodCount:Object.keys(METHODS).length,levelMethodCells:matrix.length,
   methods:Object.keys(METHODS).map(id=>({methodId:id,cases:rows.filter(x=>x.methodId===id).length})),
   matrix,gradeDifficultyGaps:matrix.flatMap(m=>m.untestedPositiveDifficultyBands.map(d=>({methodId:m.methodId,primaryLevel:m.primaryLevel,difficulty:d}))),issues,rows,
   // Passing the audit does not imply that there are 54 full worked explanations.
   authoredReferenceExplanationsInPriorPhase:6,
   priorPairedComparisons:6,
   expandedCasesWithFullNewTeachingExplanations:0,
   authenticProductionQuestionEvidenceTested:false,
   actualNovaExplanationTested:false,independentEducatorReviewCompleted:false,
   learnerComprehensionMeasured:false,renderedVisualsVerified:false,
   betaReady:false,approvalGranted:false,productionScoringChanged:false,learnerReleased:false,
   remainingGates:[
     'Independent educator reviews for six authored explanation pairs',
     'Age/difficulty appropriateness of newly expanded synthetic cases not educator-validated',
     'Actual NOVA explanations on source-version-verified production cases',
     'Rendered visual/diagram inspection and learner comprehension evidence',
     'Deferred authenticated staff and ordinary-user live-session tests',
     'Method activation requires separate explicit governance decision',
   ],
 };
}
function run(argv=process.argv.slice(2)){
 if(argv.some(a=>!['--json','--check-matrix'].includes(a)))throw Error('UNKNOWN_OPTION');
 const report=evaluate(loadFixture());
 if(argv.includes('--check-matrix')){
   const actual=fs.readFileSync(path.join(ROOT,MATRIX),'utf8').replace(/\r\n/g,'\n');
   if(actual!==coverageCsv(report))report.issues.push('COVERAGE_MATRIX_MISMATCH');
 }
 if(report.issues.length)report.status='SYNTHETIC_COVERAGE_BLOCKED';
 if(argv.includes('--json'))console.log(JSON.stringify(report,null,2));
 else{
   console.log(`Phase ${report.phase}: ${report.status}`);
   console.log(`${report.passed}/${report.total} synthetic cases | ${report.positive} compatible | ${report.excluded} excluded | ${report.insufficientEvidence} insufficient evidence`);
   console.log(`${report.levelMethodCells} supported level-method cells | all five relative-difficulty bands tested across levels in each draft`);
   console.log(`${report.gradeDifficultyGaps.length} individual grade-by-difficulty combinations still lack a positive example (explicit coverage gaps)`);
   for(const issue of report.issues)console.log('BLOCK: '+issue);
   for(const row of report.rows.filter(x=>!x.pass))console.log('FAIL: '+row.caseId+' '+row.issues.join(','));
   console.log('New full worked explanations: 0 | Prior authored references: 6 | Independent educator approval: PENDING');
   console.log('Production scores, learner release, method activation: UNCHANGED/DISABLED');
 }
 if(report.status!=='SYNTHETIC_COVERAGE_CHECKS_PASSED')process.exitCode=1;
 return report;
}
if(require.main===module)try{run();}catch(err){console.error('SYNTHETIC_COVERAGE_BLOCKED: '+err.message);process.exitCode=1;}
module.exports={FIXTURE,MATRIX,METHODS,CATEGORIES,loadFixture,evaluate,coverageCsv,run};
