'use strict';
/**
 * DREAMSCAPE ONE | 4E-2B-8C-2D.3
 * Offline educator-review PAIR audit: two newly authored synthetic
 * presentations per identical question. NOT real 4C output, production
 * selection, child outcome, teacher decision, approval, API or database write.
 */
const fs=require('node:fs');
const path=require('node:path');
const prior=require('./phase4e2b8c2d2-explanation-quality.cjs');
const ROOT=path.resolve(__dirname,'..');
const REL='tests/fixtures/phase4e2b8c2d3-paired-explanations.json';
const B4='lib/math-intelligence/teaching/method-library/methods/phase4B4WordProblemHeuristics.ts';
const B5='lib/math-intelligence/teaching/method-library/methods/phase4B5RationalNumber.ts';
const RUBRIC=Object.freeze(['mathematical_correctness','conceptual_explanation','representation_clarity','step_progression','misconception_response','learner_accessibility']);
const text=x=>typeof x==='string'&&x.trim().length>9&&x.length<1500;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function safeKeys(o,depth=0){
  if(depth>20)return false;
  if(!o||typeof o!=='object')return true;
  return Object.entries(o).every(([k,v])=>!/(answer_data|answerKey|accessToken|authToken|jwt|password|serviceRole|reviewerId|studentId|approvedAt|approvalStatus|questionId|quizId|sourceFingerprint|personalData)/i.test(k)&&safeKeys(v,depth+1));
}
const FILES=[B4,B5];
function methodMetadata(methodId, sourceFiles=FILES){
  for(const name of sourceFiles){
    const s=fs.readFileSync(path.join(ROOT,name),'utf8');
    const needle=`methodId: "${methodId}"`;
    const start=s.indexOf(needle);
    // Restrict to the method declaration, not theme-coverage duplicates.
    if(start<0)continue;
    const nextB4=s.indexOf('  makeMethod({',start+needle.length);
    const nextB5=s.indexOf('\n  },\n  {',start+needle.length);
    const options=[nextB4,nextB5].filter(x=>x>=0);
    const next=options.length?Math.min(...options):s.length;
    const section=s.slice(start,next);
    const status=/status:\s*"([^"]+)"/.exec(section)?.[1];
    const familyId=/familyId:\s*"([^"]+)"/.exec(section)?.[1];
    const levels=/levels:\s*\[([^\]]+)\]/.exec(section)?.[1]?.split(',').map(x=>Number(x.trim()));
    const title=/title:\s*"([^"]+)"/.exec(section)?.[1];
    const pedagogicalPart=section.split('teachingSequence: [')[1]?.split('],\n')[0]||'';
    const stages=[...pedagogicalPart.matchAll(/stage\("([^"]+)"/g)].map(x=>x[1]);
    if(status&&levels&&title&&stages.length)return {methodId,status,familyId,title,levels,stages,source:name};
  }
  return null;
}
function witnessChecks(pair,src){
  const issues=[];
  const proof=pair.incumbent?.calculations;
  if(!Array.isArray(proof)||proof.length<1){issues.push('MISSING_ARITHMETIC_WITNESS');return issues;}
  if(!proof.every(prior.numericCalculation))issues.push('INVALID_ARITHMETIC_WITNESS');
  const f=src.input.facts, m=src.mathCheck;
  if(m.kind==='spacing'){
    const gaps=f.lastOrdinal-f.firstOrdinal;
    if(!proof.some(c=>c.operation==='subtract'&&c.left===f.lastOrdinal&&c.right===f.firstOrdinal&&c.result===gaps))issues.push('MISSING_INTERVAL_COUNT_PROOF');
    if(!proof.some(c=>c.operation==='multiply'&&c.left===gaps&&c.right===f.gapLength&&c.result===m.expectedDistance))issues.push('MISSING_DISTANCE_PROOF');
  }else if(m.kind==='comparison'){
    const total=m.combinedTotal, target=m.expectedTarget;
    const vals=f.quantityKeys.map(id=>m.amounts[id]);
    if(!proof.some(c=>c.operation==='sum'&&eq(c.values,vals)&&c.result===total))issues.push('MISSING_TOTAL_RECONSTRUCTION');
    if(!proof.some(c=>c.operation==='multiply'&&c.result===target))issues.push('MISSING_TARGET_CALCULATION');
  }else if(m.kind==='ratio'){
    if(!proof.some(c=>c.operation==='solve_ratio_scale'&&eq(c.beforeRatio,f.beforeRatio)&&eq(c.afterRatio,f.afterRatio)&&eq(c.changes,f.changes)&&c.result===m.original[0]/f.beforeRatio[0]))issues.push('MISSING_BEFORE_AFTER_RATIO_PROOF');
  }else issues.push('UNKNOWN_MATHEMATICAL_STRUCTURE');
  return issues;
}
function validatePair(pair,source,book,drafts,sourceFiles=FILES){
  const issues=[],add=k=>issues.push(k);
  const src=source.cases.find(x=>x.caseId===pair?.caseId);
  const ref=book.exemplars.find(x=>x.caseId===pair?.caseId);
  const specialist=drafts.find(x=>x.methodId===pair?.specialistMethodId);
  if(!src||src.expected.status!=='compatible_for_review'||!ref)add('NOT_ONE_OF_SIX_POSITIVE_CASES');
  if(!safeKeys(pair))add('SENSITIVE_OR_UNSAFE_FIELD');
  if(!pair || pair.comparisonProvenance!=='two_offline_authored_synthetic_references_not_live_nova_outputs' ||
     pair.incumbentTeachingSource!=='author_interpretation_of_existing_4B_method_not_captured_production_output' ||
     pair.humanReview!=='pending' || pair.pedagogicalRole!=='undecided' ||
     pair.approvalGranted!==false || pair.studentFacing!==false ||
     pair.candidate4CScore!==null || pair.specialist4CScore!==null || pair.scoreDifference!==null)add('INVALID_PROVENANCE_OR_FALSE_DECISION');
  if(ref&&src){
    if(pair.question!==ref.question||pair.learnerLevel!==src.input.learnerLevel||pair.specialistMethodId!==ref.methodId)add('QUESTION_OR_SPECIALIST_MISMATCH');
    if(!eq(pair.incumbent?.answer,ref.answer))add('ANSWER_DISAGREEMENT');
    if(!prior.validateExplanation(ref,src,specialist).pass)add('SPECIALIST_REFERENCE_IS_INVALID');
    if(!pair.incumbent || !text(pair.incumbent.misconceptionResponse) || !text(pair.incumbent.representation?.description) ||
       !Array.isArray(pair.incumbent.representation.labels) || pair.incumbent.representation.labels.length<3)add('INCUMBENT_REPRESENTATION_INCOMPLETE');
    const meta=methodMetadata(pair.incumbentMethodId,sourceFiles);
    if(!meta||meta.status!=='active'||!meta.levels.includes(pair.learnerLevel)||meta.familyId!==specialist?.familyId||meta.title!==pair.incumbentMethodTitle)add('INCUMBENT_NOT_VALID_4B_REFERENCE');
    if(!Array.isArray(pair.incumbent?.steps)||!meta||!eq(pair.incumbent.steps.map(x=>x.stageId),meta.stages)||pair.incumbent.steps.some(s=>!text(s.learnerExplanation)))add('INCUMBENT_STAGE_SEQUENCE_OR_PROSE_INVALID');
    if(!prior.numericCalculation||!prior.numericCalculation({operation:'multiply',left:2,right:3,result:6}))add('CALCULATION_VALIDATOR_UNAVAILABLE');
    issues.push(...witnessChecks(pair,src));
  }
  if(!eq(pair?.reviewOrder,['incumbent','specialist'])&&!eq(pair?.reviewOrder,['specialist','incumbent']))add('INVALID_BLIND_REVIEW_ORDER');
  if(!text(pair?.comparisonHypothesis)||!text(pair?.tradeoff))add('COMPARATIVE_TRADEOFF_UNSTATED');
  if(!pair?.specialist || pair.specialist.referenceCaseId!==pair.caseId || pair.specialist.source!=='8C2D2_offline_exemplar')add('INVALID_SPECIALIST_REFERENCE');
  return {caseId:pair?.caseId||null,pass:issues.length===0,issues,teacherReview:'pending',roleDecision:'undecided'};
}
function load(){const prev=prior.load();return {pairs:JSON.parse(fs.readFileSync(path.join(ROOT,REL),'utf8')), ...prev};}
function evaluate(pairs,source,book,drafts){
  const errors=[],rows=[];
  if(!pairs||pairs.phase!=='4E-2B-8C-2D.3'||pairs.fixtureType!=='authored_offline_same_question_method_pairs'||
   pairs.syntheticOnly!==true||pairs.actualNovaOutputsCompared!==false||pairs.actualIncumbentOutputsCompared!==false||
   pairs.sourceVersionValidatedAgainstProduction!==false||pairs.notApproval!==true||pairs.learnerReleased!==false||
   !Array.isArray(pairs.comparisons)||pairs.comparisons.length!==6)errors.push('INVALID_COMPARISON_BOOK_HEADER');
  const positive=source.cases.filter(x=>x.expected.status==='compatible_for_review').map(x=>x.caseId);
  const ids=new Set(); let firstCount=0,secondCount=0;
  for(const pair of pairs?.comparisons||[]){
    const row=validatePair(pair,source,book,drafts); if(ids.has(pair.caseId)){row.issues.push('DUPLICATE_PAIR');row.pass=false;}
    ids.add(pair.caseId);
    if(pair.reviewOrder?.[0]==='specialist')firstCount++;else secondCount++;
    rows.push(row);
  }
  if(!eq([...ids].sort(),[...positive].sort()))errors.push('PAIRED_CASE_COVERAGE_INCOMPLETE');
  if(firstCount!==3||secondCount!==3)errors.push('UNBALANCED_REVIEW_ORDER');
  const passing=rows.filter(x=>x.pass).length;
  return {phase:'4E-2B-8C-2D.3',status:(!errors.length&&passing===6)?'OFFLINE_PAIR_CHECKS_PASSED':'OFFLINE_PAIR_CHECKS_BLOCKED',
   pairs:rows.length,passing,errors,rows,independentEducatorsPerPair:2,
   humanReview:'pending',comparativeRoleDecisions:'none',realNovaOutputsCompared:false,
   realProductionIncumbentOutputsCompared:false,productionScoreChanged:false,approvedMethods:0,learnerRelease:false,betaReady:false,
   note:'Automated checks cover synthetic identity, arithmetic, 4B stage metadata and review scaffolding, not educational advantage. Independent teacher comparison is required.'};
}
function run(argv=process.argv.slice(2)){
 const {pairs,source,book,drafts}=load();const r=evaluate(pairs,source,book,drafts);
 if(argv.includes('--json'))console.log(JSON.stringify(r,null,2)); else {
   console.log(`Phase ${r.phase}: ${r.status}`);
   console.log(`${r.passing}/${r.pairs} same-question specialist/incumbent synthetic comparison pairs validated`);
   r.errors.forEach(x=>console.log('BLOCK '+x));r.rows.filter(x=>!x.pass).forEach(x=>console.log('BLOCK '+x.caseId+': '+x.issues.join(', ')));
   console.log('Two independent educator reviews per pair: PENDING');
   console.log('Actual NOVA output, actual 4C-ranked explanations and real child understanding: NOT TESTED');
   console.log('New specialist approval, scores, release: DISABLED');
 }
 if(r.status!=='OFFLINE_PAIR_CHECKS_PASSED')process.exitCode=1;
 return r;
}
if(require.main===module)run();
module.exports={RUBRIC,load,methodMetadata,witnessChecks,validatePair,evaluate,run};
