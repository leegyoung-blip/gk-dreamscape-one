const test=require('node:test');
const assert=require('node:assert/strict');
const {runPhase4C4BCohortAudit,PHASE4C4B_QA_VERSION}=require('../build/math/teaching/strategy-selection/qa/runPhase4C4BCohort.js');
test('schema stays pinned',()=>assert.equal(PHASE4C4B_QA_VERSION,'4C-4B-QA.1'));
test('empty export reconciles without claiming a passing fixed cohort',()=>{
 const result=runPhase4C4BCohortAudit({sample:{seed:'phase-2i-v1',items:[]},results:[]});
 assert.equal(result.summary.total,0);
 assert.equal(result.summary.checks.matchesExpectedTotal,false);
 assert.equal(result.summary.checks.totalsReconcile,true);
});
test('repeat audits are deterministic apart from no clock timestamps',()=>{
 const sample={sample:{seed:'custom-smoke',items:[]},results:[]};
 assert.deepEqual(runPhase4C4BCohortAudit(sample),runPhase4C4BCohortAudit(sample));
});
