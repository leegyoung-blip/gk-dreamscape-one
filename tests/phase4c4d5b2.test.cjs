'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {audit,markdown}=require('../scripts/phase4c4d5b2-review.cjs');
const names=['build_math_quiz_attempt_result','core_mark_response','core_user_has_access','require_complete_learning_profile'];
function helpers(){return names.map(routine_name=>({
  schema_name:'public',routine_name,identity_arguments:'p_example uuid',function_definition:'EXAMPLE SOURCE',
  public_execute_granted:'false',anon_can_execute:'false',authenticated_can_execute:'false'
}));}
function shapes(){return [{published_question_count:'10',with_teaching:'0',with_answer_key:'0',with_solution_key:'0',with_explanation_key:'0',with_correct_response_key:'0',non_object_content:'0',top_level_content_keys:'[]',teaching_content_keys:'[]'}];}
function sql(name){return fs.readFileSync(path.join(root,'sql',name),'utf8');}
test('query 1 is read-only system catalog inspection',()=>{
 const s=sql('phase-4c4d5b2-01-readonly-result-helpers.sql');
 assert.match(s,/\bSELECT\b/i);assert.match(s,/\bFROM pg_proc\b/i);
 assert.doesNotMatch(s,/\b(?:INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|GRANT|REVOKE|TRUNCATE)\s+(?:TABLE|FUNCTION|INTO|ON|public\.)/i);
});
test('query 1 includes four exact result helpers',()=>{const s=sql('phase-4c4d5b2-01-readonly-result-helpers.sql');for(const n of names) assert.ok(s.includes(`'${n}'`));});
test('query 1 checks effective grants and includes definitions',()=>{const s=sql('phase-4c4d5b2-01-readonly-result-helpers.sql');for(const v of ['has_function_privilege','aclexplode','pg_get_functiondef'])assert.ok(s.includes(v));});
test('query 2 only reads published question content shapes',()=>{const s=sql('phase-4c4d5b2-02-readonly-content-key-shapes.sql');assert.match(s,/\bSELECT\b/i);assert.match(s,/FROM public\.math_questions/i);assert.match(s,/status = 'published'/i);assert.doesNotMatch(s,/\b(?:UPDATE|INSERT|DELETE|TRUNCATE|REVOKE|GRANT|CREATE TABLE|DROP TABLE)\b/i);});
test('query 2 excludes answer_data and attempt record retrieval',()=>{const s=sql('phase-4c4d5b2-02-readonly-content-key-shapes.sql');assert.doesNotMatch(s.replace(/^--.*$/gm,''),/\b(?:math_attempt_answers|math_quiz_attempts|answer_data)\b/);assert.ok(s.includes('jsonb_object_keys'));});
test('readme forbids live deployment',()=>{const s=fs.readFileSync(path.join(root,'README-4C4D-5B-2.md'),'utf8');assert.match(s,/live serving remains BLOCKED/i);assert.match(s,/no SQL migrations/i);});
test('well-formed audit stays blocked',()=>{const r=audit(helpers(),shapes());assert.equal(r.liveDeploymentApproved,false);assert.equal(r.decision,'BLOCKED_PENDING_HUMAN_REVIEW');});
test('rejects unexpected helpers',()=>{const x=helpers();x[0].routine_name='other';assert.throws(()=>audit(x,shapes()),/UNEXPECTED_HELPER/);});
test('flags missing helpers',()=>{const r=audit(helpers().slice(0,3),shapes());assert.ok(r.issues.some(x=>x.startsWith('MISSING_HELPER:')));});
test('flags exposed helper',()=>{const x=helpers();x[0].authenticated_can_execute='true';assert.ok(audit(x,shapes()).issues.includes('REVIEW_DIRECT_EXECUTE:build_math_quiz_attempt_result'));});
test('flags PUBLIC or anon access',()=>{const x=helpers();x[0].public_execute_granted='true';x[1].anon_can_execute='true';const r=audit(x,shapes());assert.ok(r.issues.some(x=>x.endsWith('build_math_quiz_attempt_result')));assert.ok(r.issues.some(x=>x.endsWith('core_mark_response')));});
test('flags unknown grant metadata',()=>{const x=helpers();x[0].authenticated_can_execute='';assert.ok(audit(x,shapes()).issues.includes('UNKNOWN_EXECUTION_PERMISSION:build_math_quiz_attempt_result'));});
test('flags answer-like keys',()=>{const x=shapes();x[0].with_solution_key='2';assert.ok(audit(helpers(),x).issues.includes('REVIEW_ANSWER_LIKE_CONTENT_KEY:with_solution_key'));});
test('flags teaching content for manual inspection',()=>{const x=shapes();x[0].with_teaching='4';assert.ok(audit(helpers(),x).issues.includes('REVIEW_UNFILTERED_TEACHING_CONTENT'));});
test('rejects implausible aggregate counts',()=>{const x=shapes();x[0].with_teaching='20';assert.throws(()=>audit(helpers(),x),/COUNT_EXCEEDS_PUBLISHED/);});
test('does not export function source in report',()=>{const r=audit(helpers(),shapes());assert.ok(!JSON.stringify(r).includes('EXAMPLE SOURCE'));assert.ok(!markdown(r).includes('EXAMPLE SOURCE'));});
test('rejects attempts to pass granular content instead of aggregate',()=>{const x=shapes();x[0].question_id='abc';x.push({...x[0]});assert.throws(()=>audit(helpers(),x),/ONE_AGGREGATE_ROW/);});
test('rejects malformed aggregate json',()=>{const x=shapes();x[0].teaching_content_keys='not-json';assert.throws(()=>audit(helpers(),x));});
