'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const policy=require('../scripts/phase4e2b8c2d8b7c-teaching-refinement.cjs');
const source=policy.load();
const copy=()=>structuredClone(source);
const row=(id,obj=source)=>obj.cases.find(x=>x.caseId===id);
const cases=['SPACING_VALID_MAIN','SPACING_VALID_ADJACENT','CHAIN_VALID_HALF','CHAIN_VALID_SHARED_BASE','RATIO_VALID_MAIN','RATIO_VALID_DIFFERENT_SCALE'];

test('01 schema version and coverage remain fixed',()=>{
  assert.equal(policy.VERSION,'8C2D8B7C.v1');assert.deepEqual(policy.EXPECTED_CASES,cases);
  assert.equal(source.cases.length,6);
});
test('02 all six authored references pass narrow offline checks',()=>{
  const r=policy.audit(source); assert.equal(r.status,'OFFLINE_REFERENCE_CHECKS_PASSED_REVIEW_PENDING');assert.equal(r.passing,6);
});
test('03 one reviewer is NOT counted as two independent educators',()=>{
  const r=policy.audit(source);assert.equal(r.sourceReviewedByOnePerson,true);assert.equal(r.independentSecondEducatorReview,false);
  assert.equal(r.approvedForLearners,false);assert.equal(r.realNovaOutput,false);
});
test('04 never assert real generation, source authentication or approval',()=>{
  const a=copy();a.approvedForLearners=true;assert.equal(policy.audit(a).status,'OFFLINE_REFINEMENT_BLOCKED');
  const b=copy();b.realNovaOutput=true;assert.equal(policy.audit(b).status,'OFFLINE_REFINEMENT_BLOCKED');
  const c=copy();c.humanReviewCount=2;assert.equal(policy.audit(c).status,'OFFLINE_REFINEMENT_BLOCKED');
});
test('05 Q1: 12 minus 4 is eight gaps',()=>assert.equal(policy.expectedAnswer(row('SPACING_VALID_MAIN').facts),48));
test('06 Q2: 2 to 7 then back to 4 makes eight gaps',()=>assert.equal(policy.expectedAnswer(row('SPACING_VALID_ADJACENT').facts),72));
test('07 Q3: 2:6:3 shares 66 into eleven parts',()=>assert.equal(policy.expectedAnswer(row('CHAIN_VALID_HALF').facts),18));
test('08 Q4: 1:2:3 shares 72 into six parts',()=>assert.equal(policy.expectedAnswer(row('CHAIN_VALID_SHARED_BASE').facts),36));
test('09 Q5: before 3:2, +6,+24, then 1:2',()=>assert.equal(policy.expectedAnswer(row('RATIO_VALID_MAIN').facts),6));
test('10 Q6: before 2:3, +5,+16, then 1:2',()=>assert.equal(policy.expectedAnswer(row('RATIO_VALID_DIFFERENT_SCALE').facts),18));
test('11 exact ratio model facts cross-check after amounts',()=>{
  for(const id of ['RATIO_VALID_MAIN','RATIO_VALID_DIFFERENT_SCALE']){
    const f=row(id).facts;const a=f.before[0]*f.unit+f.added[0],b=f.before[1]*f.unit+f.added[1];
    assert.equal(b,2*a);
  }
});
test('12 edited answer cannot pass',()=>{
  const a=copy();row('RATIO_VALID_MAIN',a).answer.value=9;
  assert.deepEqual(policy.checkCase(row('RATIO_VALID_MAIN',a)).includes('ARITHMETIC_MISMATCH'),true);
});
test('13 incorrect changed ratio arithmetic cannot pass',()=>{
  const a=copy();row('RATIO_VALID_DIFFERENT_SCALE',a).facts.added[1]=12;
  assert.equal(policy.audit(a).status,'OFFLINE_REFINEMENT_BLOCKED');
});
test('14 question replacement is explicitly different from original Q2',()=>{
  const c=row('SPACING_VALID_ADJACENT');assert.notEqual(c.question,c.originalQuestion);
  assert.equal(c.originalAnswer.value,9);assert.equal(c.answer.value,72);
});
test('15 original Q2 masquerading as new question is blocked',()=>{
  const a=copy();const c=row('SPACING_VALID_ADJACENT',a);c.question=c.originalQuestion;
  assert.ok(policy.checkCase(c).includes('Q2_REPLACEMENT_NOT_EXPLICIT'));
});
test('16 unintended question edits in other five cases are blocked',()=>{
  const a=copy();row('CHAIN_VALID_HALF',a).question+=' Extra instruction.';
  assert.ok(policy.checkCase(row('CHAIN_VALID_HALF',a)).includes('SILENT_QUESTION_REPLACEMENT'));
});
test('17 Q1 removes redundant fourth main step',()=>{
  assert.equal(row('SPACING_VALID_MAIN').steps.length,3);
  const a=copy();row('SPACING_VALID_MAIN',a).steps.push({say:'Again, count the gaps.',working:''});
  assert.ok(policy.checkCase(row('SPACING_VALID_MAIN',a)).includes('UNNECESSARY_FOURTH_STEP'));
});
test('18 child-facing technical jargon is blocked',()=>{
  const a=copy();row('SPACING_VALID_MAIN',a).steps[0].say='Compute the interval count using the indices.';
  assert.ok(policy.checkLearnerLanguage(row('SPACING_VALID_MAIN',a)).includes('TECHNICAL_JARGON_IN_LEARNER_TEXT'));
});
test('19 avoid unexplained ratio variable',()=>{
  const a=copy();const c=row('RATIO_VALID_MAIN',a);c.steps[0].say='A has 3u and B has 2u. Work out the rest.';
  assert.ok(policy.checkLearnerLanguage(c).includes('VARIABLE_NOT_DEFINED_FOR_CHILD'));
});
test('20 very long pupil-facing step is flagged',()=>{
  const a=copy();row('SPACING_VALID_MAIN',a).steps[0].say=('Now count every single gap in the number line and find the distance between these markers carefully. ').repeat(3);
  assert.ok(policy.checkLearnerLanguage(row('SPACING_VALID_MAIN',a)).includes('WORDY_LEARNER_TEXT'));
});
test('21 unsuitable internal messages are flagged',()=>{
  const a=copy();row('CHAIN_VALID_SHARED_BASE',a).steps[0].say='This is an admin-only staff preview.';
  assert.ok(policy.checkLearnerLanguage(row('CHAIN_VALID_SHARED_BASE',a)).includes('INTERNAL_OR_AI_LANGUAGE'));
});
test('22 every P5/P6 reference has a bar model',()=>{
  for(const c of source.cases.filter(c=>c.level>=5)) assert.ok(c.diagram.kind.includes('bar_model'));
});
test('23 missing bar model blocks a reference',()=>{
  const a=copy();row('RATIO_VALID_DIFFERENT_SCALE',a).diagram.kind='ratio_table';
  assert.ok(policy.checkCase(row('RATIO_VALID_DIFFERENT_SCALE',a)).includes('VISUAL_MODEL_MISSING'));
});
test('24 source never invents units for original changing-ratio questions',()=>{
  assert.equal(row('RATIO_VALID_MAIN').answer.unit,'');
  assert.equal(row('RATIO_VALID_DIFFERENT_SCALE').answer.unit,'');
});
test('25 coverage rejects missing and duplicate cases',()=>{
  const a=copy();a.cases.pop();assert.ok(policy.audit(a).issues.includes('CASE_COVERAGE_INVALID'));
  const b=copy();b.cases[5]=structuredClone(b.cases[4]);assert.ok(policy.audit(b).issues.includes('CASE_COVERAGE_INVALID'));
});
test('26 wrong method is blocked',()=>{
  const a=copy();row('CHAIN_VALID_HALF',a).methodId='heuristic.multi_step.equal_spacing_interval_count';
  assert.ok(policy.checkCase(row('CHAIN_VALID_HALF',a)).includes('METHOD_MISMATCH'));
});
test('27 invalid unit is blocked',()=>{
  const a=copy();row('RATIO_VALID_MAIN',a).answer.unit='metres';
  assert.ok(policy.checkCase(row('RATIO_VALID_MAIN',a)).includes('ANSWER_UNIT_INVALID'));
});
test('28 printed preview includes all six SVG diagrams, with no external assets or JavaScript',()=>{
  const h=policy.renderPreview(source);
  assert.equal((h.match(/<svg /g)||[]).length,6);
  assert.equal((h.match(/<article class="case">/g)||[]).length,6);
  assert.ok(h.includes('NEW multistep replacement proposed'));
  assert.ok(!h.includes('<script'));assert.ok(!h.includes('https://'));
});
test('29 reference preview file matches deterministic generator',()=>{
  const h=fs.readFileSync(path.join(__dirname,'../docs/PHASE_8C2D8B7C_REFINED_TEACHING_PREVIEW.html'),'utf8');
  assert.equal(h,policy.renderPreview(source));
});
test('30 generated ratio bars explicitly explain unit scale',()=>{
  const h=policy.renderPreview(source);
  assert.ok(h.includes('Bars are drawn to scale AFTER solving'));
  assert.ok(h.includes('Here u = 3'));
  assert.ok(h.includes('Here u = 6'));
});
test('31 HTML escaping prevents injection into printable preview',()=>{
  const a=copy();row('SPACING_VALID_MAIN',a).question='Some <script>bad()</script> text in question';
  // Renderer won't accept modified file unless manually reviewed; direct escaping is checked using known HTML special chars in a valid field.
  row('SPACING_VALID_MAIN',a).question=row('SPACING_VALID_MAIN',a).originalQuestion;
  row('SPACING_VALID_MAIN',a).reviewOutcome='Must display <not-an-element> & correctly.';
  const h=policy.renderPreview(a);
  assert.ok(h.includes('&lt;not-an-element&gt; &amp; correctly.'));
  assert.ok(!h.includes('<not-an-element>'));
});
test('32 CLI audit reports review pending without production success',()=>{
  const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts/phase4e2b8c2d8b7c-teaching-refinement.cjs'),'--json'],{encoding:'utf8'});
  assert.equal(result.status,0);const data=JSON.parse(result.stdout);
  assert.equal(data.status,'OFFLINE_REFERENCE_CHECKS_PASSED_REVIEW_PENDING');assert.equal(data.sourceFreshnessVerified,false);
});
test('33 rendering to temp directory is safe and deterministic',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ds-8b7c-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'preview.html');const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts/phase4e2b8c2d8b7c-teaching-refinement.cjs'),'--render-preview','--output',file],{encoding:'utf8'});
  assert.equal(result.status,0);assert.equal(fs.readFileSync(file,'utf8'),policy.renderPreview(source));
});
