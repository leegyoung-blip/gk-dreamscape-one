'use strict';
/**
 * DREAMSCAPE ONE — Phase 4C-4D-5B-1, delegated function trust audit.
 * Read-only CSV analysis. No DB connection, never prints function source.
 * Intentional non-certification: a safe-looking permission or source string
 * does not establish ownership, answer-release or absence of SQL side effects.
 * Usage:
 * node scripts/phase4c4d5b1-delegation-audit.cjs "definitions.csv" "permissions.csv" [output-dir]
 */
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv } = require('./phase4c4d5a-audit-csv.cjs');
const DELEGATES = Object.freeze([
 'core_assert_attempt_topic_access',
 'core_assert_quiz_topic_access',
 'get_math_quiz_payload_unlocked',
 'save_math_quiz_answer_unlocked',
 'submit_math_quiz_attempt_unlocked',
]);
const WRAPPERS = Object.freeze([
 'get_math_quiz_payload',
 'save_math_quiz_answer',
 'submit_math_quiz_attempt',
]);
const GRANT_NAMES = Object.freeze([...DELEGATES,...WRAPPERS]);
const DEFINITION_COLUMNS = Object.freeze(['schema_name','routine_name','identity_arguments','function_owner','function_owner_bypass_rls','security_definer','routine_settings','function_definition']);
const GRANT_COLUMNS = Object.freeze(['schema_name','routine_name','identity_arguments','function_owner','function_owner_bypass_rls','security_definer','public_execute_granted','anon_can_execute','authenticated_can_execute','service_role_can_execute']);
function requireFields(rows, columns, source){
 if (!Array.isArray(rows)) throw new TypeError(source+'_ROWS_NOT_ARRAY');
 if (!rows.length)throw new Error(source+'_NO_ROWS');
 const present=new Set(Object.keys(rows[0]));
 if(columns.some(x=>!present.has(x)))throw new Error(source+'_MISSING_COLUMNS');
}
function asBool(v){if(v==='true')return true;if(v==='false')return false;return null;}
function singleRow(rows,name){const all=rows.filter(r=>r.schema_name==='public'&&r.routine_name===name);return all.length===1?all[0]:null;}
function auditDelegates(definitions,grants){
 requireFields(definitions,DEFINITION_COLUMNS,'DEFINITIONS');
 requireFields(grants,GRANT_COLUMNS,'PERMISSIONS');
 const findings=[];
 for(const r of definitions)if(r.schema_name!=='public'||!DELEGATES.includes(r.routine_name))findings.push('unexpected_definition:'+r.routine_name);
 for(const r of grants)if(r.schema_name!=='public'||!GRANT_NAMES.includes(r.routine_name))findings.push('unexpected_permission:'+r.routine_name);
 const routines=[];
 for(const name of GRANT_NAMES){
  const d=DELEGATES.includes(name)?singleRow(definitions,name):null;
  const g=singleRow(grants,name);
  if(DELEGATES.includes(name)&&!d)findings.push('missing_or_overloaded_definition:'+name);
  if(!g)findings.push('missing_or_overloaded_permission:'+name);
  if(d&&g&&d.identity_arguments!==g.identity_arguments)findings.push('identity_arguments_mismatch:'+name);
  const relevant=g||d;
  if(!relevant){routines.push({name,present:false});continue;}
  const effective={anon:g?asBool(g.anon_can_execute):null, authenticated:g?asBool(g.authenticated_can_execute):null, public:g?asBool(g.public_execute_granted):null, serviceRole:g?asBool(g.service_role_can_execute):null};
  if(g && Object.values(effective).some(v=>v===null))findings.push('unrecognised_permission_boolean:'+name);
  if(DELEGATES.includes(name)){
   if(effective.public===true)findings.push('public_execution_of_delegate_requires_urgent_review:'+name);
   if(effective.anon===true)findings.push('anon_execution_of_delegate_requires_urgent_review:'+name);
   if(effective.authenticated===true)findings.push('authenticated_execution_of_delegate_requires_urgent_review:'+name);
  }
  if(WRAPPERS.includes(name)&&effective.anon!==false)findings.push('wrapper_anonymous_execute_not_denied:'+name);
  const ownerBypass = asBool(relevant.function_owner_bypass_rls);
  const definer = asBool(relevant.security_definer);
  if(ownerBypass===null||definer===null)findings.push('unrecognised_routine_security_boolean:'+name);
  routines.push({name,present:true,identityArguments:relevant.identity_arguments,
   definitionPresent:!!d,permissionsPresent:!!g,
   securityDefiner:definer,ownerBypassRls:ownerBypass,
   publicCanExecute:effective.public,anonCanExecute:effective.anon,
   authenticatedCanExecute:effective.authenticated,
   serviceRoleCanExecute:effective.serviceRole,
   sourceContainsAuthUid:d?/\bauth\s*\.\s*uid\s*\(/i.test(d.function_definition):null,
   sourceMentionsFeedbackMode:d?/\bfeedback_mode\b/i.test(d.function_definition):null,
   sourceMentionsQuizAttempt:d?/\b(quiz_id|attempt_id)\b/i.test(d.function_definition):null
  });
 }
 return {schemaVersion:'4C-4D-5B-1.DELEGATED-TRUST-AUDIT.1',
  source:'user-provided PostgreSQL function source and permissions; not authorization certification',
  summary:{expectedDelegates:DELEGATES.length,presentDefinitions:routines.filter(x=>x.definitionPresent).length,
   expectedGrants:GRANT_NAMES.length,presentGrantRows:routines.filter(x=>x.permissionsPresent).length,
   urgentPermissionFindings:findings.filter(x=>x.includes('requires_urgent_review')).length,
   evidenceComplete:DELEGATES.every(n=>!!singleRow(definitions,n))&&GRANT_NAMES.every(n=>!!singleRow(grants,n)),
   studentOwnershipCertified:false,feedbackReleaseCertified:false,studentEndpointDeploymentAllowed:false,b4GatewayEnabled:false},
  findings,routines,
  nextReview:['Read the access-assertion bodies for auth.uid binding, actual quiz/attempt owner and topic matching.',
   'Read the _unlocked bodies for response ownership, question membership, persisted feedback release and grading.',
   'Check effective execution grants on _unlocked routines; review immediately if anon/authenticated/PUBLIC can execute.',
   'Verify the unlocked payload projection excludes correct answers, solution steps and teaching answer fields until release.',
   'Do not enable a public teaching route or B4 reviewed-evidence scoring based on this metadata alone.']};
}
function markdown(a){
 return `# DREAMSCAPE ONE — 4C-4D-5B-1 delegated RPC trust review\n\n`+
 '**Security review in progress; **not** a production approval.** No student data or source code reproduced in this report.\n\n'+
 `| Delegated definitions present | ${a.summary.presentDefinitions}/${a.summary.expectedDelegates} |\n`+
 `| Function grant rows present | ${a.summary.presentGrantRows}/${a.summary.expectedGrants} |\n`+
 `| Potentially public delegate execution flags | ${a.summary.urgentPermissionFindings} |\n`+
 '| Student ownership certified | No |\n| Early-answer release certified | No |\n| Live endpoint permitted | **No** |\n\n'+
 '## Routine execution grants\n\n| Routine | PUBLIC | anon | authenticated | Definer | Owner bypass RLS |\n|---|---|---|---|---|---|\n'+
 a.routines.map(x=>`| \`${x.name}\` | ${x.publicCanExecute??'unknown'} | ${x.anonCanExecute??'unknown'} | ${x.authenticatedCanExecute??'unknown'} | ${x.securityDefiner??'unknown'} | ${x.ownerBypassRls??'unknown'} |`).join('\n')+'\n\n'+
 (a.findings.length?'## Findings\n\n'+a.findings.map(x=>'- `'+x+'`').join('\n'):'## Findings\n\nNo permission anomalies in this limited export. This does not prove authorization.')+'\n\n'+
 '## Required review\n\n'+a.nextReview.map(x=>'- '+x).join('\n')+'\n';
}
function main(args){
 if(args.length<2||args.length>3)throw new Error('Usage: node scripts/phase4c4d5b1-delegation-audit.cjs <definitions.csv> <permissions.csv> [output-dir]');
 const [defsPath,grantsPath,outDir='qa-artifacts/phase4c4d5b1']=args;
 const report=auditDelegates(parseCsv(fs.readFileSync(defsPath,'utf8')),parseCsv(fs.readFileSync(grantsPath,'utf8')));
 fs.mkdirSync(outDir,{recursive:true});
 fs.writeFileSync(path.join(outDir,'phase-4c4d5b1-delegated-trust-report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(outDir,'phase-4c4d5b1-delegated-trust-report.md'),markdown(report));
 console.log(`4D-5B-1: ${report.summary.presentDefinitions}/5 definitions, ${report.summary.presentGrantRows}/8 grants. Potentially risky execute permissions: ${report.summary.urgentPermissionFindings}. Live endpoint NOT approved.`);
 if(report.findings.length)process.exitCode=2;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('4D5B1_AUDIT_ERROR: '+e.message);process.exitCode=1;}}
module.exports={auditDelegates,markdown,DELEGATES,GRANT_NAMES};
