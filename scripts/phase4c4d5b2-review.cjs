'use strict';
// Read-only, non-certifying audit on local CSV exports. No student data or function source is emitted.
const fs = require('node:fs');
const path = require('node:path');
const {parseCsv} = require('./phase4c4d5a-audit-csv.cjs');
// Previous 4D5A audit is installed in the same scripts/ directory.
const EXPECTED = Object.freeze([
  'build_math_quiz_attempt_result',
  'core_mark_response',
  'core_user_has_access',
  'require_complete_learning_profile',
]);
function boolean(v) { if (v==='true') return true; if (v==='false') return false; return null; }
function audit(helperRows,contentRows) {
  if (!Array.isArray(helperRows) || !Array.isArray(contentRows)) throw new Error('CSV_ROWS_REQUIRED');
  if (contentRows.length !== 1) throw new Error('EXPECTED_ONE_AGGREGATE_ROW');
  const expectedFields = ['schema_name','routine_name','identity_arguments','public_execute_granted','anon_can_execute','authenticated_can_execute','function_definition'];
  const seen = new Set(); const helperPermissions = []; const issues=[];
  for (const row of helperRows) {
    if (!expectedFields.every(k=>Object.hasOwn(row,k))) throw new Error('HELPER_COLUMNS_MISSING');
    if (row.schema_name!=='public' || !EXPECTED.includes(row.routine_name)) throw new Error('UNEXPECTED_HELPER_ROUTINE');
    const id = row.routine_name+':'+row.identity_arguments;
    if (seen.has(id)) throw new Error('DUPLICATE_HELPER_SIGNATURE'); seen.add(id);
    const exposed={public:boolean(row.public_execute_granted),anon:boolean(row.anon_can_execute),authenticated:boolean(row.authenticated_can_execute)};
    helperPermissions.push({routine_name:row.routine_name,identity_arguments:row.identity_arguments,exposed});
    if (Object.values(exposed).some(v=>v===null)) issues.push('UNKNOWN_EXECUTION_PERMISSION:'+row.routine_name);
    if (Object.values(exposed).some(v=>v===true)) issues.push('REVIEW_DIRECT_EXECUTE:'+row.routine_name);
  }
  for (const name of EXPECTED) if (!helperRows.some(row=>row.routine_name===name)) issues.push('MISSING_HELPER:'+name);
  const shape=contentRows[0];
  const cols=['published_question_count','with_teaching','with_answer_key','with_solution_key','with_explanation_key','with_correct_response_key','non_object_content','top_level_content_keys','teaching_content_keys'];
  if(!cols.every(k=>Object.hasOwn(shape,k)))throw new Error('AGGREGATE_COLUMNS_MISSING');
  const count=(key)=>{const n=Number(shape[key]);if (!Number.isSafeInteger(n)||n<0)throw new Error('INVALID_AGGREGATE_COUNT:'+key);return n;};
  const counts=Object.fromEntries(cols.slice(0,7).map(k=>[k,count(k)]));
  for (const [k,v] of Object.entries(counts)) if(k!=='published_question_count'&&v>counts.published_question_count)throw new Error('COUNT_EXCEEDS_PUBLISHED:'+k);
  const keyList=(column)=>{
    const parsed=JSON.parse(shape[column]);
    if(!Array.isArray(parsed))throw new Error('INVALID_KEY_SHAPE:'+column);
    const keys=new Set();return parsed.map(v=>{
      if (!v||typeof v.key!=='string'||!v.key||keys.has(v.key))throw new Error('INVALID_KEY_ENTRY:'+column);
      keys.add(v.key);const n=Number(v.appearances);
      if(!Number.isSafeInteger(n)||n<0||n>counts.published_question_count)throw new Error('INVALID_KEY_COUNT:'+column);
      return {key:v.key,appearances:n};
    });
  };
  const topLevelKeys=keyList('top_level_content_keys');
  const teachingKeys=keyList('teaching_content_keys');
  for (const key of ['with_answer_key','with_solution_key','with_correct_response_key']) if(counts[key]>0)issues.push('REVIEW_ANSWER_LIKE_CONTENT_KEY:'+key);
  if (counts.with_teaching>0)issues.push('REVIEW_UNFILTERED_TEACHING_CONTENT');
  if (counts.non_object_content>0)issues.push('REVIEW_NON_OBJECT_CONTENT');
  return {
    schemaVersion:'4C-4D-5B-2.REVIEW.1',
    decision:'BLOCKED_PENDING_HUMAN_REVIEW',
    liveDeploymentApproved:false,
    factsVerifiedByThisReport:['four helper names/signatures present or flagged','effective EXECUTE grants as exported','aggregate published content key shapes'],
    factsNotVerified:['correctness of function source implementations','answer values in question.content','post-submission feedback behavior','student authorization end-to-end','production release safety'],
    helperPermissions,counts,topLevelKeys,teachingKeys,issues:[...new Set(issues)],
  };
}
function markdown(r) {
  const lines=['# 4C-4D-5B-2 — audit report','', '**Live deployment is NOT approved.**','',
    `Result: ${r.decision}`,`Published questions reported: ${r.counts.published_question_count}`,
    `With top-level teaching field: ${r.counts.with_teaching}`,
    '', '## Follow-up flags',...(r.issues.length?r.issues.map(v=>'- '+v):['- No metadata flags, but live serving remains blocked.']),
    '','This output contains only function names, identity signatures, effective grant booleans, and aggregate key names. It does not certify quiz disclosure safety.',''];
  return lines.join('\n');
}
function main(argv) {
  if (argv.length<2||argv.length>3) throw new Error('Usage: node scripts/phase4c4d5b2-review.cjs <helpers.csv> <content-keys.csv> [output-directory]');
  const [helpers,shapes,outDir='qa-artifacts/phase4c4d5b2']=argv;
  const report=audit(parseCsv(fs.readFileSync(helpers,'utf8')),parseCsv(fs.readFileSync(shapes,'utf8')));
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,'phase-4c4d5b2-local-review.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'phase-4c4d5b2-local-review.md'),markdown(report));
  console.log(`Review written to ${path.resolve(outDir)}; live endpoint BLOCKED.`);
  // No success return code denotes production readiness. Calls are always non-certifying.
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('4D5B2_AUDIT_ERROR:',e.message);process.exitCode=1;}}
module.exports={audit,markdown,main};
