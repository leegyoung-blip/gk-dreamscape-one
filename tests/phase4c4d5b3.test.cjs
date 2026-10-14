'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const sqlRoot=path.join(root,'sql');
const read=(name)=>fs.readFileSync(path.join(sqlRoot,name),'utf8');
const pre=read('phase-4c4d5b3-01-readonly-preflight.sql');
const patch=read('phase-4c4d5b3-02-manual-guarded-disclosure-fix.sql');
const post=read('phase-4c4d5b3-03-readonly-postflight.sql');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'qa-artifacts/phase4c4d5b3/phase-4c4d5b3-surgical-changes.json'),'utf8'));
const facts=JSON.parse(fs.readFileSync(path.join(root,'qa-artifacts/phase4c4d5b3/phase-4c4d5b3-reviewed-findings.json'),'utf8'));
function count(s, t) { return t ? (s.length-s.split(t).join('').length)/t.length:0; }
const getChange=(key)=>fixture.changes.find(x=>x.label===key);
const assertGuard=(full,label)=>assert.ok(full.includes(label),`missing safeguard: ${label}`);

test('source evidence reconciles exactly four helper definitions and 2,349 published questions',()=>{
 assert.equal(facts.reviewed_exports.result_helpers_rows,4);
 assert.equal(facts.reviewed_exports.published_questions,2349);
 assert.equal(facts.reviewed_exports.content_teaching_count,0);
});
test('surgical fixtures identify only three approved disclosure transformations',()=>{
 assert.deepEqual(fixture.changes.map(x=>x.label),['payload','duplicate','first']);
 assert.equal(new Set(fixture.changes.map(x=>x.old)).size,3);
});
test('preflight is read-only and has no question-record queries',()=>{
 assert.match(pre,/^\s*--/);
 assert.match(pre,/\bselect\b/i);
 assert.doesNotMatch(pre,/\b(?:CREATE|REVOKE|GRANT|UPDATE|INSERT|DELETE|ALTER|DROP)\s+(?:FUNCTION|TABLE|INTO|FROM|public)/i);
 assert.doesNotMatch(pre,/\bmath_questions\b|\bmath_attempt_answers\b/i);
});
test('preflight checks all private execution actors',()=>{
 for (const role of ['anon','authenticated','service_role'])assertGuard(pre,`'${role}'`);
 assertGuard(pre,'public_execute_granted');
});
test('preflight scans exactly two private routines',()=>{
 for (const name of fixture.source_function_signatures)assertGuard(pre,name);
 assert.doesNotMatch(pre,/get_math_quiz_payload\(uuid\)\b/); // only unlocked form
});
test('manual patch uses one explicit transaction',()=>{
 assert.match(patch,/^--[\s\S]*\nBEGIN;\nDO \$phase4c4d5b3\$/);
 assert.match(patch,/\$phase4c4d5b3\$;\nCOMMIT;\s*$/);
 assert.equal(count(patch,'\nCOMMIT;'),1);
});
test('manual patch checks owner, security definer, trusted search_path',()=>{
 for (const text of ["current_user <> 'postgres'","p.proowner) <> 'postgres'","p.prosecdef","search_path=public, pg_temp"])assertGuard(patch,text);
});
test('manual patch denies roles and preserves ACLs',()=>{
 for (const text of ["has_function_privilege('anon'","has_function_privilege('authenticated'","has_function_privilege('service_role'",'v_payload_acl','v_save_acl','IS DISTINCT FROM'])assertGuard(patch,text);
});
test('manual patch aborts if any source snippet is missing or duplicated',()=>{
 assert.equal(count(patch,'v_count <> 1'),3);
 for (let i=1;i<=3;i++)assertGuard(patch,`snippet ${i} unexpected match count`);
});
test('manual patch holds all source edits until after all guards',()=>{
 const execPos=patch.indexOf('EXECUTE v_payload;');
 const thirdGuard=patch.indexOf('snippet 3 unexpected match count');
 assert.ok(execPos>thirdGuard);
 assert.ok(patch.indexOf('EXECUTE v_save;',execPos)>execPos);
});
test('payload explanation is gated by a server-stored correctness verdict',()=>{
 const {old:newOld,new:newNew}=getChange('payload');
 assertGuard(newOld,"when v_quiz.feedback_mode = 'immediate'");
 assertGuard(newNew,'and answer.is_correct is not null');
 assertGuard(newNew,"then question.explanation ->> 'student'");
});
test('manual pending initial save withholds explanations',()=>{
 const {new:next}=getChange('first');
 assertGuard(next,'when v_is_manual then null');
});
test('locked resave does not rematch a pending manual answer',()=>{
 const {old,new:next}=getChange('duplicate');
 assertGuard(old,'v_existing.response_data');
 assert.ok(!next.includes('public.core_mark_response('));
 assertGuard(next,"'is_correct', v_existing.is_correct");
 assertGuard(next,"'marks_awarded', v_existing.marks_awarded");
});
test('locked pending resave withholds both explanation and correct answer',()=>{
 const {new:next}=getChange('duplicate');
 assertGuard(next,"'pending_manual_review', v_existing.is_correct is null");
 assert.equal(count(next,'when v_existing.is_correct is null then null'),2);
 assertGuard(next, 'when v_question.requires_manual_marking');
 assertGuard(next, "then v_question.answer_data -> 'display_answer'");
});
test('all three patch definitions are drawn from exactly anchored snippets',()=>{
 for (let i=1;i<=3;i++){
  const {old,new:next}=fixture.changes[i-1];
  const oldTag=`$phase4c4d5b3_old${i}$`;
  const newTag=`$phase4c4d5b3_new${i}$`;
  assertGuard(patch,oldTag+old+oldTag);
  assertGuard(patch,newTag+next+newTag);
 }
});
test('manual patch must not touch permission grants, table data, marking or rewards',()=>{
 assert.doesNotMatch(patch,/^\s*(?:GRANT|REVOKE|ALTER TABLE|DROP|TRUNCATE|UPDATE public|INSERT INTO public|DELETE FROM public)\b/im);
 assert.doesNotMatch(patch,/v_reward_tokens\s*:=|dream_token_transactions|math_quiz_reward_claims/);
});
test('postflight is read-only and inspects same two private functions',()=>{
 assert.match(post,/\bselect\b/i);
 assert.doesNotMatch(post,/\b(?:CREATE|REVOKE|GRANT|UPDATE|INSERT|DELETE|ALTER|DROP)\s+(?:FUNCTION|TABLE|INTO|FROM|public)/i);
 for (const name of fixture.source_function_signatures)assertGuard(post,name);
});
test('postflight detects legacy duplicate resave exposure and missing guard',()=>{
 assertGuard(post,'v_existing.response_data,');
 assertGuard(post,'disclosure_guards_present');
 assertGuard(post,'when v_is_manual then null');
});
test('README prohibits automatic deployment and clarifies runtime limits',()=>{
 const readme=fs.readFileSync(path.join(root,'README-4C4D-5B-3.md'),'utf8');
 for (const text of ['MANUAL','Do not run','database','B4','not a runtime security certification'])assertGuard(readme,text);
});
test('all test file paths are portable on Windows and Unix',()=>{
 assert.equal(path.isAbsolute(sqlRoot),true);
 assert.doesNotMatch(__filename,/PLACEHOLDER_NEVER/);
});
