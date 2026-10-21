'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const v=require('../scripts/phase4e2b8c2d3-pedagogical-comparison.cjs');
const {pairs,source,book,drafts}=v.load();
const clone=x=>JSON.parse(JSON.stringify(x));
const item=id=>clone(pairs.comparisons.find(x=>x.caseId===id));
const check=x=>v.validatePair(x,source,book,drafts);
const bad=(title,id,fn,needle)=>test(title,()=>{
  const x=item(id);fn(x);const r=check(x);
  assert.equal(r.pass,false,JSON.stringify(r));
  if(needle)assert.ok(r.issues.some(s=>s.includes(needle)),JSON.stringify(r));
});
test('six same-question paired comparisons pass, no pedagogical winners',()=>{
  const r=v.evaluate(pairs,source,book,drafts);
  assert.equal(r.status,'OFFLINE_PAIR_CHECKS_PASSED');assert.equal(r.pairs,6);assert.equal(r.passing,6);
  assert.equal(r.humanReview,'pending');assert.equal(r.approvedMethods,0);assert.equal(r.learnerRelease,false);
  assert.equal(r.realNovaOutputsCompared,false);assert.equal(r.realProductionIncumbentOutputsCompared,false);
});
test('comparison provenance explicitly distinguishes authored references from actual 4C ranked method outputs',()=>{
  assert.equal(pairs.notApproval,true);assert.equal(pairs.syntheticOnly,true);
  assert.equal(pairs.actualNovaOutputsCompared,false);assert.equal(pairs.actualIncumbentOutputsCompared,false);
  assert.equal(pairs.sourceVersionValidatedAgainstProduction,false);
  for(const x of pairs.comparisons){assert.equal(x.incumbentTeachingSource,'author_interpretation_of_existing_4B_method_not_captured_production_output');assert.equal(x.pedagogicalRole,'undecided');}
});
test('six questions and correct answers match original 8C2D2 synthetic examples',()=>{
  for(const x of pairs.comparisons){const ref=book.exemplars.find(z=>z.caseId===x.caseId);assert.equal(x.question,ref.question);assert.deepEqual(x.incumbent.answer,ref.answer);}
});
test('existing 4B methods are authentic, active, level-compatible and of same method family',()=>{
  for(const x of pairs.comparisons){const m=v.methodMetadata(x.incumbentMethodId);const d=drafts.find(z=>z.methodId===x.specialistMethodId);assert.ok(m);assert.equal(m.status,'active');assert.ok(m.levels.includes(x.learnerLevel));assert.equal(m.familyId,d.familyId);assert.deepEqual(x.incumbent.steps.map(z=>z.stageId),m.stages);}
});
test('each specialist has two paired comparisons',()=>{
  for(const d of drafts)assert.equal(pairs.comparisons.filter(x=>x.specialistMethodId===d.methodId).length,2);
});
test('review order balanced and stable for fair side-by-side reading',()=>{
  assert.equal(pairs.comparisons.filter(x=>x.reviewOrder[0]==='specialist').length,3);
  assert.equal(pairs.comparisons.filter(x=>x.reviewOrder[0]==='incumbent').length,3);
});
test('all 12 explanations remain human-authored, not production outputs',()=>{
  for(const x of pairs.comparisons)assert.equal(x.comparisonProvenance,'two_offline_authored_synthetic_references_not_live_nova_outputs');
});
test('all pairs contain both possible educational benefit and cognitive-load tradeoff',()=>{
  for(const x of pairs.comparisons){assert.ok(x.comparisonHypothesis.length>=50);assert.ok(x.tradeoff.length>=50);}
});
test('all incumbents have independent mathematical witnesses and misconception response',()=>{
  for(const x of pairs.comparisons){const src=source.cases.find(z=>z.caseId===x.caseId);assert.deepEqual(v.witnessChecks(x,src),[]);assert.ok(x.incumbent.misconceptionResponse.length>20);}
});
test('comparison-only package does not import teaching APIs, scoring or DB',()=>{
  const file=fs.readFileSync(path.resolve(__dirname,'../scripts/phase4e2b8c2d3-pedagogical-comparison.cjs'),'utf8');
  for(const bad of ['createClient(','supabase-js','executeAudit','scoreCandidate','Math.random(','fetch(','req.headers','app/api/','/student-serving/'])assert.equal(file.includes(bad),false,bad);
});
for(const x of pairs.comparisons)test(`${x.caseId} paired explanation passes reference validation`,()=>assert.equal(check(clone(x)).pass,true));
bad('cannot promote a specialist to primary automatically','SPACING_VALID_MAIN',x=>x.pedagogicalRole='primary','FALSE_DECISION');
bad('cannot mark educator review complete without educators','CHAIN_VALID_HALF',x=>x.humanReview='approved','FALSE_DECISION');
bad('cannot claim a captured real NOVA comparison','RATIO_VALID_MAIN',x=>x.comparisonProvenance='actual_nova_output','FALSE_DECISION');
bad('cannot inject 4C score for draft','SPACING_VALID_MAIN',x=>x.specialist4CScore=95,'FALSE_DECISION');
bad('cannot assign score difference without scorer','SPACING_VALID_MAIN',x=>x.scoreDifference=5,'FALSE_DECISION');
bad('cannot substitute a different question','SPACING_VALID_MAIN',x=>x.question='A different question about fish.','QUESTION_OR_SPECIALIST');
bad('cannot substitute a different learner level','SPACING_VALID_MAIN',x=>x.learnerLevel=5,'QUESTION_OR_SPECIALIST');
bad('cannot use a nonmatching method ID','CHAIN_VALID_HALF',x=>x.specialistMethodId='ratio.relationship.before_after_change','QUESTION_OR_SPECIALIST');
bad('cannot use a made-up incumbent method','CHAIN_VALID_HALF',x=>x.incumbentMethodId='not.real.method','INCUMBENT_NOT_VALID');
bad('cannot use a cross-family production incumbent','CHAIN_VALID_HALF',x=>x.incumbentMethodId='ratio.relationship.ratio_units','INCUMBENT_NOT_VALID');
bad('cannot change 4B method title','CHAIN_VALID_HALF',x=>x.incumbentMethodTitle='Made up teaching method','INCUMBENT_NOT_VALID');
bad('cannot invent new teaching-stage IDs','SPACING_VALID_MAIN',x=>x.incumbent.steps[1].stageId='invented_step','INCUMBENT_STAGE');
bad('cannot reorder teaching stages','CHAIN_VALID_HALF',x=>x.incumbent.steps.reverse(),'INCUMBENT_STAGE');
bad('cannot remove teaching explanation text','CHAIN_VALID_HALF',x=>x.incumbent.steps[2].learnerExplanation='','INCUMBENT_STAGE');
bad('cannot remove meaning-bearing representation','SPACING_VALID_MAIN',x=>x.incumbent.representation.labels=[],'INCUMBENT_REPRESENTATION');
bad('cannot omit misconception remediation','SPACING_VALID_MAIN',x=>x.incumbent.misconceptionResponse='','INCUMBENT_REPRESENTATION');
bad('cannot alter shared final answer','CHAIN_VALID_SHARED_BASE',x=>x.incumbent.answer.value=37,'ANSWER_DISAGREEMENT');
bad('cannot fake an interval count even with correct total','SPACING_VALID_MAIN',x=>x.incumbent.calculations[0].result=7,'MISSING_INTERVAL');
bad('cannot invent a new distance calculation','SPACING_VALID_ADJACENT',x=>x.incumbent.calculations[1].left=2,'INVALID_ARITHMETIC');
bad('cannot change multiplicative chain target','CHAIN_VALID_HALF',x=>x.incumbent.calculations[x.incumbent.calculations.length-1].result=36,'INVALID_ARITHMETIC');
bad('cannot remove total reconstruction','CHAIN_VALID_HALF',x=>x.incumbent.calculations=x.incumbent.calculations.filter(c=>c.operation!=='sum'||c.values.length<3),'MISSING_TOTAL');
bad('cannot change original ratio before:after','RATIO_VALID_MAIN',x=>x.incumbent.calculations[0].beforeRatio=[2,3],'MISSING_BEFORE_AFTER');
bad('cannot ignore a stated ratio change','RATIO_VALID_DIFFERENT_SCALE',x=>x.incumbent.calculations[0].changes[1]=14,'MISSING_BEFORE_AFTER');
bad('cannot remove proof of ratio-scale uniqueness','RATIO_VALID_DIFFERENT_SCALE',x=>x.incumbent.calculations=[],'MISSING_ARITHMETIC');
bad('cannot switch blind review variants arbitrarily','RATIO_VALID_MAIN',x=>x.reviewOrder=['specialist','specialist'],'INVALID_BLIND');
bad('cannot inject auth token','RATIO_VALID_MAIN',x=>x.accessToken='secret','SENSITIVE');
bad('cannot add stored answer_data','CHAIN_VALID_HALF',x=>x.incumbent.answer_data={x:1},'SENSITIVE');
bad('cannot add a fabricated reviewer identity','CHAIN_VALID_HALF',x=>x.reviewerId='person-001','SENSITIVE');
bad('cannot add an approval timestamp','CHAIN_VALID_HALF',x=>x.approvedAt='2026-10-22','SENSITIVE');
bad('cannot turn on learner delivery','CHAIN_VALID_HALF',x=>x.studentFacing=true,'FALSE_DECISION');
bad('cannot remove comparative concern','RATIO_VALID_MAIN',x=>x.tradeoff='','TRADEOFF');
bad('cannot detach specialist from 8C2D2 casebook','RATIO_VALID_MAIN',x=>x.specialist.source='not_existing_reference','INVALID_SPECIALIST_REFERENCE');
test('missing comparison blocks whole-book pass',()=>{const copy=clone(pairs);copy.comparisons.pop();assert.equal(v.evaluate(copy,source,book,drafts).status,'OFFLINE_PAIR_CHECKS_BLOCKED');});
test('duplicated case blocks whole-book pass',()=>{const copy=clone(pairs);copy.comparisons[1]=clone(copy.comparisons[0]);assert.equal(v.evaluate(copy,source,book,drafts).status,'OFFLINE_PAIR_CHECKS_BLOCKED');});
test('unbalanced review order blocks whole-book pass',()=>{const copy=clone(pairs);for(const x of copy.comparisons)x.reviewOrder=['specialist','incumbent'];assert.equal(v.evaluate(copy,source,book,drafts).status,'OFFLINE_PAIR_CHECKS_BLOCKED');});
test('false real-output provenance blocks whole-book pass',()=>{const copy=clone(pairs);copy.actualNovaOutputsCompared=true;assert.equal(v.evaluate(copy,source,book,drafts).status,'OFFLINE_PAIR_CHECKS_BLOCKED');});
test('false production version validation blocks whole-book pass',()=>{const copy=clone(pairs);copy.sourceVersionValidatedAgainstProduction=true;assert.equal(v.evaluate(copy,source,book,drafts).status,'OFFLINE_PAIR_CHECKS_BLOCKED');});
test('educator rubric sheet has two independent blank reviews per variant and case',()=>{
  const csv=fs.readFileSync(path.resolve(__dirname,'../docs/phase4e2b8c2d3-educator-scoring-template.csv'),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  assert.equal(csv.length,25);
  assert.match(csv[0],/mathematical_correctness_0_3/);
  for(const p of pairs.comparisons){for(const reviewer of ['R1','R2'])for(const variant of ['A','B'])assert.equal(csv.filter(row=>row.startsWith(`${p.caseId},${reviewer},${variant},`)).length,1);}
  assert.ok(csv.slice(1).every(x=>x.endsWith(',PENDING')));
});
test('role worksheet keeps twelve judgments undecided and unapproved',()=>{
  const csv=fs.readFileSync(path.resolve(__dirname,'../docs/phase4e2b8c2d3-method-role-template.csv'),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  assert.equal(csv.length,13);
  assert.ok(csv.slice(1).every(x=>x.includes(',undecided,')&&x.endsWith(',PENDING')));
});
test('review dossier explicitly requires actual live output and independent teacher sign-off later',()=>{
  const doc=fs.readFileSync(path.resolve(__dirname,'../docs/PHASE_8C2D3_PEDAGOGICAL_COMPARISON.md'),'utf8');
  for(const word of ['not actual NOVA-generated teaching','two independent educators','Teacher instructions','blind','deferred'])assert.match(doc,new RegExp(word,'i'));
});
