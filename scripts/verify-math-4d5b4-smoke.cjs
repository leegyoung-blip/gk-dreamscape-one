#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const folder=path.join(root,'qa-artifacts','phase4c4d5b4');
const catalogPath=path.join(folder,'phase-4c4d5b4-scenarios.json');
const templatePath=path.join(folder,'phase-4c4d5b4-results.template.json');
const resultPath=path.join(folder,'phase-4c4d5b4-results.json');
const allowed=new Set(['PASS','FAIL','BLOCKED','NOT_RUN']);
const allowedChannel=new Set(['ui','network','ui+network']);
function assess(catalog,results) {
  if (!catalog || catalog.schemaVersion!=='4C-4D-5B-4.SMOKE.1' || !Array.isArray(catalog.cases)) throw new Error('Invalid scenario catalog');
  if (!results || results.schemaVersion!=='4C-4D-5B-4.RESULTS.1' || !Array.isArray(results.cases)) throw new Error('Invalid results shape');
  const spec=new Map(catalog.cases.map(x=>[x.id,x]));
  if (spec.size!==14 || results.cases.length!==spec.size) throw new Error('Missing or unexpected scenario count');
  const encountered=new Set(), counts={PASS:0,FAIL:0,BLOCKED:0,NOT_RUN:0};
  for (const entry of results.cases) {
    if (!entry||!spec.has(entry.id)||encountered.has(entry.id)) throw new Error('Unknown or duplicate scenario');
    encountered.add(entry.id);
    if(!allowed.has(entry.status)) throw new Error('Unknown status for '+entry.id);
    if(![null,undefined,''].includes(entry.channel)&&!allowedChannel.has(entry.channel))throw new Error('Unknown channel');
    if(typeof entry.observation!=='string')throw new Error('Observation must be text');
    // Share no sensitive identifiers or complete network payloads.
    const forbidden=/(?:\bBearer\s+\S+|\bsk_[A-Za-z0-9_-]{6,}|eyJ[A-Za-z0-9_-]{20,}|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i;
    if(forbidden.test(entry.observation))throw new Error('Potential secret/email in '+entry.id);
    if(['PASS','FAIL'].includes(entry.status)) {
      if(!entry.channel||entry.observation.trim().length<12)throw new Error('Missing observation/channel for '+entry.id);
      const needed=spec.get(entry.id).requiredChannel;
      if(needed==='ui+network'&&entry.channel!=='ui+network')throw new Error('UI and network checks required for '+entry.id);
      if(needed==='network'&&!entry.channel.includes('network'))throw new Error('Network inspection required for '+entry.id);
    }
    counts[entry.status]++;
  }
  const decision=counts.FAIL?'STOP_FAILURE':counts.BLOCKED||counts.NOT_RUN?'NOT_VERIFIED':'READY_FOR_SECURITY_REVIEW';
  return {decision,counts,total:catalog.cases.length,liveDeploymentAuthorized:false,reviewedEvidenceActivationAuthorized:false};
}
function readJson(f){return JSON.parse(fs.readFileSync(f,'utf8'));}
function cli(args=process.argv.slice(2)) {
 if (args.length!==1||!['--init','--check'].includes(args[0])){console.error('Usage: node scripts/verify-math-4d5b4-smoke.cjs --init|--check');return 2;}
 if(args[0]==='--init'){
  try {fs.copyFileSync(templatePath,resultPath,fs.constants.COPYFILE_EXCL);console.log('CREATED '+resultPath);}catch(e){if(e.code==='EEXIST')console.log('EXISTS (not overwritten): '+resultPath);else throw e;}
  console.log('No runtime testing has been performed.');return 0;
 }
 try{const report=assess(readJson(catalogPath),readJson(resultPath));console.log(JSON.stringify(report,null,2));return report.decision==='STOP_FAILURE'?1:0;}catch(e){console.error('INVALID:',e.message);return 2;}
}
if(require.main===module)process.exitCode=cli();
module.exports={assess,cli};
