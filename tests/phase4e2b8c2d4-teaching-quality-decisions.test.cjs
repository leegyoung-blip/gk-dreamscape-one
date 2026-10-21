'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const mod=require('../scripts/phase4e2b8c2d4-teaching-quality-decisions.cjs');
const previous=require('../scripts/phase4e2b8c2d3-pedagogical-comparison.cjs');
const ROOT=path.resolve(__dirname,'..');
const loaded=mod.loadFromDisk();
const clone=x=>JSON.parse(JSON.stringify(x));
const build=()=>clone(loaded);
const evalData=d=>mod.evaluate(d);
const completeScore=(row,vals=[3,3,3,3,3,3])=>{
  mod.DIMENSIONS.forEach((d,i)=>row[d+'_0_3']=String(vals[i]));
  Object.assign(row,{hard_stop_yes_no:'no',hard_stop_reason:'',specific_strength:'Explains the mathematical relationship clearly.',specific_concern:'May require an additional visual representation.',human_review_status:'COMPLETE'});
};
const completeRole=(row,role)=>Object.assign(row,{specialist_role_primary_supporting_not_warranted_undecided:role,reasoning_with_example:'This problem is appropriate because the model shows the needed reasoning.',complexity_or_visual_tradeoff:'More visuals can slow down an already fluent learner.',approval_status:'PENDING'});
const fill=(role='supporting')=>{
  const d=build(); d.scoreRows.forEach(r=>completeScore(r)); d.roleRows.forEach(r=>completeRole(r,role)); return d;
};
function expectedPair(d,id){return d.pairs.find(x=>x.caseId===id);}
function findScore(d,id,reviewer,variant){return d.scoreRows.find(x=>x.case_id===id&&x.reviewer_code===reviewer&&x.variant===variant);}
function findRole(d,id,reviewer){return d.roleRows.find(x=>x.case_id===id&&x.reviewer_code===reviewer);}

test('previous six-pair synthetic provenance audit still passes',()=>{
 const v=previous.load(),r=previous.evaluate(v.pairs,v.source,v.book,v.drafts);
 assert.equal(r.status,'OFFLINE_PAIR_CHECKS_PASSED');assert.equal(r.passing,6);
});
test('original blank templates are incomplete not fraudulent approvals',()=>{
 const r=evalData(build());assert.equal(r.status,'REVIEW_EVIDENCE_INCOMPLETE');assert.equal(r.pending,6);
 assert.equal(r.provisional,0);assert.equal(r.approvedMethods,0);assert.equal(r.learnerReleased,false);
 assert.ok(r.cases.every(x=>x.provisionalRole==='undecided'));
});
test('standard input column headers match the existing phase D3 files',()=>{
 const s=fs.readFileSync(path.join(ROOT,'docs/phase4e2b8c2d3-educator-scoring-template.csv'),'utf8');
 const r=fs.readFileSync(path.join(ROOT,'docs/phase4e2b8c2d3-method-role-template.csv'),'utf8');
 assert.equal(mod.parseCsv(s,mod.SCORE_HEAD).length,24);
 assert.equal(mod.parseCsv(r,mod.ROLE_HEAD).length,12);
});
test('CSV parser handles quoted commas, escaped quotes, CRLF and multiline evidence',()=>{
 const h='a,b';const rows=mod.parseCsv('a,b\r\n"quoted, field","hello ""reader""\nsecond line"\r\n', ['a','b']);
 assert.deepEqual(rows,[{a:'quoted, field',b:'hello "reader"\nsecond line'}]);
});
for(const csv of ['a,b\n"unclosed,hi','a,b\na,"x"junk','a,b\n"x"oops,hi','a,b\nx,y,z']){
 test('malformed CSV rejected: '+JSON.stringify(csv),()=>assert.throws(()=>mod.parseCsv(csv,['a','b'])));
}
test('unexpected heading rejected',()=>assert.throws(()=>mod.parseCsv('a,b\nx,y',['b','a'])));
test('duplicate score records rejected',()=>{const d=build();d.scoreRows.push(clone(d.scoreRows[0]));assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('duplicate role records rejected',()=>{const d=build();d.roleRows.push(clone(d.roleRows[0]));assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('missing score record rejected',()=>{const d=build();d.scoreRows.pop();assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('missing role record rejected',()=>{const d=build();d.roleRows.pop();assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('unknown fabricated case rejected',()=>{const d=build();d.roleRows[0].case_id='FAKE_CASE';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('wrong role of phase D3 source provenance blocks',()=>{const d=fill();d.pairAuditStatus='OTHER';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('reviewer must be R1 or R2',()=>{const d=fill();d.roleRows[0].reviewer_code='ADMIN';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('invalid score >3 is blocked',()=>{const d=fill();d.scoreRows[0].conceptual_explanation_0_3='4';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('invalid score fraction is blocked',()=>{const d=fill();d.scoreRows[0].conceptual_explanation_0_3='2.5';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('complete evidence missing dimension is blocked',()=>{const d=fill();d.scoreRows[0].representation_clarity_0_3='';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('complete evidence missing comments is blocked',()=>{const d=fill();d.scoreRows[0].specific_strength='';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('hard-stop requires a reason',()=>{const d=fill();d.scoreRows[0].hard_stop_yes_no='yes';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('pending reviewer hard-stop is not hidden by incomplete worksheet',()=>{
 const d=build();d.scoreRows[0].hard_stop_yes_no='yes';d.scoreRows[0].hard_stop_reason='Diagram could mislead learners.';
 const r=evalData(d);assert.equal(r.cases[0].status,'HARD_STOP_ADJUDICATION_REQUIRED');
});
test('hard-stop overrides excellent scores and consensus',()=>{
 const d=fill('primary');d.scoreRows[0].hard_stop_yes_no='yes';d.scoreRows[0].hard_stop_reason='The represented line segment is mathematically incorrect.';
 const r=evalData(d);assert.equal(r.cases[0].status,'HARD_STOP_ADJUDICATION_REQUIRED');
 assert.equal(r.cases[0].approvalGranted,false);assert.equal(r.cases[0].provisionalRole,'undecided');
});
test('hard-stop is visible even if other reviewer has not completed work',()=>{
 const d=fill();d.scoreRows[0].hard_stop_yes_no='yes';d.scoreRows[0].hard_stop_reason='The drawing contradicts the supplied position values.';
 d.scoreRows[1].human_review_status='PENDING';
 assert.equal(evalData(d).cases[0].status,'HARD_STOP_ADJUDICATION_REQUIRED');
});
test('approval marked APPROVED is never accepted',()=>{const d=fill();d.roleRows[0].approval_status='APPROVED';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('unexplained role is invalid evidence',()=>{const d=fill();d.roleRows[0].reasoning_with_example='ok';assert.equal(evalData(d).status,'REVIEW_INPUTS_INVALID');});
test('human role undecided leaves review pending',()=>{const d=fill();d.roleRows[0].specialist_role_primary_supporting_not_warranted_undecided='undecided';assert.equal(evalData(d).status,'REVIEW_EVIDENCE_INCOMPLETE');});
test('partially filled worksheet never counted as complete',()=>{const d=fill();d.scoreRows[0].human_review_status='PENDING';assert.equal(evalData(d).cases[0].status,'AWAITING_EDUCATOR_REVIEWS');});
test('reviewer disagreement requires adjudication',()=>{
 const d=fill();completeRole(findRole(d,'SPACING_VALID_MAIN','R2'),'not_warranted');
 const r=evalData(d);assert.equal(r.cases[0].status,'REVIEWER_DISAGREEMENT');assert.equal(r.cases[0].provisionalRole,'undecided');
});
test('quality floor cannot be bypassed by agreement',()=>{
 const d=fill();d.scoreRows[0].mathematical_correctness_0_3='2';
 const r=evalData(d);assert.equal(r.cases[0].status,'QUALITY_CONCERNS_REQUIRE_REVIEW');
});
test('low clarity also forces review',()=>{
 const d=fill();d.scoreRows[0].conceptual_explanation_0_3='1';
 assert.equal(evalData(d).cases[0].status,'QUALITY_CONCERNS_REQUIRE_REVIEW');
});
test('agreed supporting role stays provisional without any release',()=>{
 const d=fill('supporting');const r=evalData(d);
 assert.equal(r.status,'PROVISIONAL_RECOMMENDATIONS_ONLY');assert.equal(r.provisional,6);
 assert.ok(r.cases.every(x=>x.status==='PROVISIONAL_SUPPORTING_CANDIDATE'));
 assert.equal(r.betaReady,false);assert.equal(r.realNovaOutputsReviewed,false);
});
test('agreed not-warranted role stays provisional',()=>{
 const d=fill('not_warranted'),r=evalData(d);
 assert.ok(r.cases.every(x=>x.status==='PROVISIONAL_NOT_WARRANTED_CANDIDATE'));
 assert.equal(r.approvedMethods,0);
});
test('primary recommendation without an advantage cannot pass',()=>{
 const d=fill('primary');const r=evalData(d);
 assert.ok(r.cases.every(x=>x.status==='PRIMARY_ADVANTAGE_NOT_DEMONSTRATED'));
 assert.equal(r.provisional,0);assert.equal(r.approvalGranted,false);
});
test('primary requires both reviewers to show focus advantages over incumbent',()=>{
 const d=fill('primary'),p=expectedPair(d,'SPACING_VALID_MAIN');
 const spec=p.reviewOrder[0]==='specialist'?'A':'B';
 for(const reviewer of ['R1','R2']){
   const inc=p.reviewOrder[0]==='incumbent'?'A':'B';
   findScore(d,p.caseId,reviewer,inc).conceptual_explanation_0_3='2';
 }
 const r=evalData(d);assert.equal(r.cases[0].status,'PROVISIONAL_PRIMARY_CANDIDATE');
 assert.equal(r.cases[0].provisionalRole,'primary');assert.equal(r.approvedMethods,0);
});
test('one-sided advantage cannot establish provisional primary consensus',()=>{
 const d=fill('primary'),p=expectedPair(d,'SPACING_VALID_MAIN');
 const inc=p.reviewOrder[0]==='incumbent'?'A':'B';
 findScore(d,p.caseId,'R1',inc).conceptual_explanation_0_3='2';
 assert.equal(evalData(d).cases[0].status,'PRIMARY_ADVANTAGE_NOT_DEMONSTRATED');
});
test('specialist disadvantage on any core dimension prevents primary role',()=>{
 const d=fill('primary'),p=expectedPair(d,'SPACING_VALID_MAIN');
 const inc=p.reviewOrder[0]==='incumbent'?'A':'B';const spec=p.reviewOrder[0]==='specialist'?'A':'B';
 for(const reviewer of ['R1','R2']){
   findScore(d,p.caseId,reviewer,inc).conceptual_explanation_0_3='2';
   findScore(d,p.caseId,reviewer,spec).learner_accessibility_0_3='2';
 }
 assert.equal(evalData(d).cases[0].status,'PRIMARY_ADVANTAGE_NOT_DEMONSTRATED');
});
test('A/B mapping uses actual recorded reviewOrder for all six cases',()=>{
 const d=fill('primary');for(const p of d.pairs){
   const inc=p.reviewOrder[0]==='incumbent'?'A':'B';
   for(const reviewer of ['R1','R2'])findScore(d,p.caseId,reviewer,inc).conceptual_explanation_0_3='2';
 }
 const r=evalData(d);assert.equal(r.provisional,6);
 assert.ok(r.cases.every(x=>x.status==='PROVISIONAL_PRIMARY_CANDIDATE'));
});
test('report never contains human reviewer comments or secrets',()=>{
 const d=fill();d.roleRows[0].reasoning_with_example='MY_PRIVATE_INFORMATION_DO_NOT_COPY';
 const r=evalData(d),printed=JSON.stringify(r);
 assert.equal(printed.includes('MY_PRIVATE_INFORMATION_DO_NOT_COPY'),false);
 assert.equal(printed.includes('answer_data'),false);
});
test('CLI defaults to pending, never claims APPROVED or produces a database change',()=>{
 const x=cp.spawnSync(process.execPath,['scripts/phase4e2b8c2d4-teaching-quality-decisions.cjs'],{cwd:ROOT,encoding:'utf8'});
 assert.equal(x.status,0,x.stderr);assert.match(x.stdout,/REVIEW_EVIDENCE_INCOMPLETE/);
 assert.match(x.stdout,/approval: NONE/);assert.doesNotMatch(x.stdout,/PRODUCTION_READY/);
});
test('--strict-complete fails on the blank worksheets',()=>{
 const x=cp.spawnSync(process.execPath,['scripts/phase4e2b8c2d4-teaching-quality-decisions.cjs','--strict-complete'],{cwd:ROOT,encoding:'utf8'});
 assert.equal(x.status,1);assert.match(x.stdout,/REVIEW_EVIDENCE_INCOMPLETE/);
});
test('no direct production selector, Supabase, app API or network access in decision checker',()=>{
 const src=fs.readFileSync(path.join(ROOT,'scripts/phase4e2b8c2d4-teaching-quality-decisions.cjs'),'utf8');
 assert.doesNotMatch(src,/createClient|@supabase|service[_-]?role|fetch\(|\.from\(['"]|https?:\/\/|writeFile|unlinkSync|execSync/);
});
