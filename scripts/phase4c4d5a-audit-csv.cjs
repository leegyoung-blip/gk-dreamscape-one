'use strict';
/**
 * DREAMSCAPE ONE — Phase 4C-4D-5A, metadata-only audit.
 * This script does not connect to Supabase, scan source code, or certify auth.
 * Usage: node scripts/phase4c4d5a-audit-csv.cjs <rpc-metadata.csv> <rls-metadata.csv> [output-directory]
 */
const fs = require('node:fs');
const path = require('node:path');
const ROUTINES = Object.freeze(['get_math_quiz_payload','save_math_quiz_answer','submit_math_quiz_attempt']);
const TABLES = Object.freeze(['math_attempt_answers','math_quiz_attempts','math_quiz_questions','math_quiz_reward_claims','math_quizzes']);
const RPC_FIELDS = ['schema_name','routine_name','identity_arguments','return_type','security_definer','volatility','routine_settings','anon_can_execute','authenticated_can_execute','service_role_can_execute'];
const RLS_FIELDS = ['schema_name','relation_name','relation_kind','rls_enabled','rls_forced'];
function parseCsv(raw){
  if(typeof raw!=='string') throw new TypeError('CSV_TEXT_REQUIRED');
  const rows=[]; let row=[], cell='', quoted=false, atStart=true;
  let i=0;
  // RFC-4180 quoted-cell parser; permits embedded commas, newlines and doubled quotes.
  while (i<raw.length) {
    const ch=raw[i++];
    if(quoted){if(ch==='"' && raw[i]==='"'){cell+='"';i++;} else if(ch==='"'){quoted=false;} else cell+=ch;continue;}
    if(ch==='"') {if(!atStart) throw new Error('MALFORMED_CSV_QUOTE'); quoted=true;atStart=false;continue;}
    if(ch===','){row.push(cell);cell='';atStart=true;continue;}
    if(ch==='\r'||ch==='\n'){
      if(ch==='\r' && raw[i]==='\n')i++;
      row.push(cell);if(row.some(x=>x.length>0))rows.push(row);
      row=[];cell='';atStart=true;continue;
    }
    cell+=ch;atStart=false;
  }
  if(quoted)throw new Error('UNTERMINATED_CSV_QUOTE');
  if(row.length || cell.length){row.push(cell);if(row.some(x=>x.length>0))rows.push(row);}
  if(!rows.length)throw new Error('EMPTY_CSV');
  const headers=rows.shift();
  if(new Set(headers).size!==headers.length)throw new Error('DUPLICATE_HEADER');
  return rows.map((values,index)=>{
    if(values.length!==headers.length)throw new Error('CSV_COLUMN_MISMATCH_AT_ROW_'+(index+2));
    return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
  });
}
function assertFields(rows, names, kind){
  if(!Array.isArray(rows))throw new TypeError(kind+'_ROWS_REQUIRED');
  if(rows.length===0)throw new Error(kind+'_EMPTY');
  const actual=Object.keys(rows[0]);
  if(!names.every(n=>actual.includes(n)))throw new Error(kind+'_HEADERS_MISSING');
}
function boolString(v){return v==='true'?true:v==='false'?false:null;}
function auditMetadata(routines, relations){
  assertFields(routines,RPC_FIELDS,'RPC'); assertFields(relations,RLS_FIELDS,'RLS');
  const issues=[];
  const unexpectedRoutines=routines.filter(r=>r.schema_name!=='public'||!ROUTINES.includes(r.routine_name)).length;
  const unexpectedTables=relations.filter(r=>r.schema_name!=='public'||!TABLES.includes(r.relation_name)).length;
  if(unexpectedRoutines)issues.push('unexpected_routine_metadata');
  if(unexpectedTables)issues.push('unexpected_table_metadata');
  const routineRows=ROUTINES.map(name=>{
    const matches=routines.filter(r=>r.schema_name==='public'&&r.routine_name===name);
    if(matches.length!==1)issues.push('routine_overload_or_missing:'+name);
    const row=matches.length===1?matches[0]:null;
    if(!row)return {name,present:false};
    const securityDefiner=boolString(row.security_definer), anon=boolString(row.anon_can_execute);
    const authenticated=boolString(row.authenticated_can_execute), serviceRole=boolString(row.service_role_can_execute);
    if(securityDefiner!==true)issues.push('security_definer_not_expected:'+name);
    if(anon!==false)issues.push('anon_execute_not_denied:'+name);
    if(authenticated!==true)issues.push('authenticated_execute_not_expected:'+name);
    if(serviceRole!==true)issues.push('service_role_execute_not_expected:'+name);
    if(row.return_type!=='jsonb')issues.push('unexpected_return_type:'+name);
    if(row.volatility!=='v')issues.push('unexpected_volatility:'+name);
    return {name,present:true,identityArguments:row.identity_arguments,returnType:row.return_type,securityDefiner,
      anonCanExecute:anon,authenticatedCanExecute:authenticated,serviceRoleCanExecute:serviceRole,
      searchPathSet:row.routine_settings.includes('search_path=')};
  });
  const relationRows=TABLES.map(name=>{
    const matches=relations.filter(r=>r.schema_name==='public'&&r.relation_name===name);
    if(matches.length!==1)issues.push('table_missing_or_duplicate:'+name);
    const row=matches.length===1?matches[0]:null;
    if(!row)return {name,present:false};
    const rlsEnabled=boolString(row.rls_enabled),rlsForced=boolString(row.rls_forced);
    if(rlsEnabled!==true)issues.push('rls_not_enabled:'+name);
    return {name,present:true,relationKind:row.relation_kind,rlsEnabled,rlsForced};
  });
  const report={schemaVersion:'4C-4D-5A.METADATA-AUDIT.1',
    source:'uploaded Supabase metadata CSV exports; not a source-code or authorization audit',
    summary:{expectedRoutines:3,foundExpectedRoutines:routineRows.filter(x=>x.present).length,
      securityDefinerRoutines:routineRows.filter(x=>x.securityDefiner===true).length,
      expectedTables:5,foundExpectedTables:relationRows.filter(x=>x.present).length,
      rlsEnabledTables:relationRows.filter(x=>x.rlsEnabled===true).length,
      unexpectedRows:unexpectedRoutines+unexpectedTables,
      metadataShapeMatchesBaseline:issues.length===0,
      functionBodyReviewed:false,policyExpressionsReviewed:false,liveIntegrationAuthorized:false,
      routeDeploymentAllowed:false},
    issues,functions:routineRows,tables:relationRows,
    requiredNextChecks:['Inspect each exact function definition for auth.uid() and explicit attempt/quiz/question owner binding.',
      'Inspect get_math_quiz_payload JSON projection for early answer/teaching content exposure.',
      'Inspect actual pg_policies predicates, role grants, table owners and owner RLS bypass.',
      'Confirm per-question feedback release is persisted in trusted server data.',
      'Build trusted resolver only after these checks; retain B4 mode disabled.']};
  return report;
}
function reportMarkdown(a){
  return '# DREAMSCAPE ONE — Phase 4C-4D-5A Supabase Metadata Assessment\n\n'+
  '**Read-only metadata inspection; not authentication, RLS or disclosure certification.**\n\n'+
  '| Item | Observed |\n|---|---:|\n'+
  `| Math quiz RPCs | ${a.summary.foundExpectedRoutines}/3 |\n`+
  `| SECURITY DEFINER functions | ${a.summary.securityDefinerRoutines}/3 |\n`+
  `| RLS enabled tables | ${a.summary.rlsEnabledTables}/5 |\n`+
  `| Metadata matches expected shape | ${a.summary.metadataShapeMatchesBaseline?'Yes':'No'} |\n`+
  '| RPC body and ownership rules reviewed | **No** |\n'+
  '| Student-facing endpoint safe to activate | **Not established** |\n\n'+
  '## Permissions\n\n'+
  '| Routine | Anonymous | Authenticated | SECURITY DEFINER |\n|---|---|---|---|\n'+
  a.functions.map(f=>`| \`${f.name}\` | ${f.anonCanExecute===false?'Denied':'Not established'} | ${f.authenticatedCanExecute===true?'Allowed':'Not established'} | ${f.securityDefiner===true?'Yes':'Not established'} |`).join('\n')+'\n\n'+
  '## Trust boundary\n\nRLS enabled on tables does not establish enforcement within a SECURITY DEFINER function. Functions often execute with owner permissions and may bypass normal row policies unless their effective privilege/ownership rules and SQL bodies are checked. A return value or client checkpoint is not authorization proof.\n\n'+
  '## Next checks\n\n'+a.requiredNextChecks.map((c,i)=>`${i+1}. ${c}`).join('\n')+'\n\n'+
  (a.issues.length?'**Metadata anomalies:** '+a.issues.map(x=>`\`${x}\``).join(', ')+'\n':'**Metadata anomalies:** none in these two exports. This does not prove security.\n');
}
function main(argv){
  if(argv.length<2 || argv.length>3)throw new Error('Usage: node scripts/phase4c4d5a-audit-csv.cjs <rpc.csv> <rls.csv> [output-dir]');
  const [rpcFile,rlsFile,outDir='qa-artifacts/phase4c4d5a']=argv;
  const report=auditMetadata(parseCsv(fs.readFileSync(rpcFile,'utf8')),parseCsv(fs.readFileSync(rlsFile,'utf8')));
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,'phase-4c4d5a-metadata-audit.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'phase-4c4d5a-metadata-audit.md'),reportMarkdown(report));
  console.log(`Verified ${report.summary.foundExpectedRoutines}/3 function metadata and ${report.summary.rlsEnabledTables}/5 RLS flags; live wiring remains blocked.`);
  console.log(`Reports written to: ${path.resolve(outDir)}`);
  if(report.issues.length)process.exitCode=2;
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(`4D5A_METADATA_AUDIT_ERROR: ${e.message}`);process.exitCode=1;}}
module.exports={parseCsv,auditMetadata,reportMarkdown};
