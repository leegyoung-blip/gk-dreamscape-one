'use strict';
/** DREAMSCAPE ONE — Phase 4C-4D-1: static, source-read-only integration inventory.
 * Reports paths, line numbers and marker labels ONLY. Never outputs matching source text.
 * Does not claim that authorization or a server trust boundary is secure.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');

const VERSION='4C-4D-1.INTEGRATION-AUDIT.1';
const MAX_FILE_BYTES=1024*1024;
const MAX_FILES=15000;
const roots=['app','src/app','pages','src/pages','lib','src/lib','server','src/server','services','src/services','actions','src/actions','components','src/components'];
const topFiles=['middleware.ts','middleware.js','src/middleware.ts','src/middleware.js'];
const excludedDirs=new Set(['node_modules','.next','.git','.vercel','.turbo','dist','build','coverage','out','vendor','generated','qa-artifacts','__tests__','fixtures']);
const excludedPathSegment=/(?:^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.yarnrc|secrets?(?:\.|\/|$)|private[-_]?keys?(?:\.|\/|$)|credentials?(?:\.|\/|$))/i;
const eligibleExt=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);
const markers={
  directSelector:/\bselectFromPhase4A4B\b/,
  b4Gateway:/\bselectWithB4Approval\b|\bb4ApprovalGateway\.server\b/,
  rawReviewedEvidence:/\breviewedMathEvidence\b/,
  reviewPackage:/\bapprovalPackage\b/,
  trustConfig:/\btrustedKeys\b|\brevokedReviewIds\b|\ballowReviewIds\b/,
  mathTeaching:/\bmath[-_]intelligence\b|\bteaching[-_]engine\b|\bstrategy[-_]selection\b|\bTeachingContract\b|\bmethodLibraryEnvelope\b|\bstrategyEnvelope\b/,
  auth:/\bgetUser\s*\(|\bgetServerSession\s*\(|\bgetSession\s*\(|\bauth\.getUser\s*\(|\bcreateServerClient\s*\(|\bauth\s*\(/,
  role:/\bcurriculum_lead\b|\brole\s*[!=]=|\bisAdmin\b|\brequireAdmin\b|\brequireRole\b/,
  requestBody:/\b(?:request|req)\.json\s*\(|\b(?:request|req)\.body\b/,
  serverOnly:/\bserver-only\b/,
};
function normalized(p){return p.split(path.sep).join('/');}
function classify(rel,content){
  if (/(^|\/)middleware\.[cm]?[jt]s$/.test(rel)) return 'middleware';
  if (/(^|\/)app\/(?:.*\/)?route\.[cm]?[jt]sx?$/.test(rel) || /(^|\/)pages\/api\//.test(rel)) return 'api-route';
  if (/^[\s;]*(?:['"]use client['"])/m.test(content.slice(0,180))) return 'client-module';
  if (/^[\s;]*(?:['"]use server['"])/m.test(content.slice(0,180))) return 'server-action';
  if (/\/approval\/b4ApprovalGateway\.server\.cjs$/.test('/'+rel)) return 'b4-gateway-definition';
  if (/\/strategy-selection\/phase4C4Adapter\.ts$/.test('/'+rel)) return 'b2-selector-definition';
  return 'module';
}
function scanRepo(rootDir){
  const repo=path.resolve(rootDir);
  if(!fs.existsSync(repo)||!fs.statSync(repo).isDirectory()) throw new Error('B4D1_ROOT_DIRECTORY_REQUIRED');
  const found=[], unreadable=[];const visited=new Set();
  let limitHit=false;
  function collect(full){
    if(found.length>=MAX_FILES){limitHit=true;return;}
    const rel=normalized(path.relative(repo,full));
    if(rel.startsWith('../')||path.isAbsolute(rel)||excludedPathSegment.test(rel)||!eligibleExt.has(path.extname(full))) return;
    let st;try{st=fs.lstatSync(full);}catch{unreadable.push(rel);return;}
    if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_FILE_BYTES)return;
    let content;try{content=fs.readFileSync(full,'utf8');}catch{unreadable.push(rel);return;}
    if(content.includes('\u0000'))return;
    const lines=content.split(/\r?\n/);
    const marks={};
    for(const [key,regex] of Object.entries(markers)) {
      const hits=[];
      for(let n=0;n<lines.length;n++) if(regex.test(lines[n])) hits.push(n+1);
      if(hits.length) marks[key]={count:hits.length,lineNumbers:hits.slice(0,15)};
    }
    const kind=classify(rel,content);
    if(Object.keys(marks).length===0 && kind!=='api-route' && kind!=='middleware' && kind!=='server-action')return;
    const isDefinition=kind==='b4-gateway-definition'||kind==='b2-selector-definition';
    const attention=[];
    if(kind==='client-module' && (marks.directSelector||marks.b4Gateway||marks.rawReviewedEvidence))attention.push('CLIENT_SIDE_SELECTION_REFERENCE_REQUIRES_REVIEW');
    if(kind==='api-route' && marks.rawReviewedEvidence && !marks.b4Gateway)attention.push('REVIEWED_EVIDENCE_IN_ROUTE_WITHOUT_LOCAL_GATEWAY_REFERENCE');
    if(kind==='api-route' && marks.directSelector && !marks.b4Gateway)attention.push('DIRECT_SELECTOR_ROUTE_CALLSITE_REQUIRES_TRUST_BOUNDARY_REVIEW');
    if(kind==='api-route' && marks.b4Gateway)attention.push('GATEWAY_ROUTE_CALLSITE_REQUIRES_AUTH_AND_TRUST_CONFIG_REVIEW');
    if(marks.trustConfig && kind==='client-module') attention.push('CLIENT_TRUST_CONFIG_REFERENCE_REQUIRES_REVIEW');
    const filenameRelevance=/(math|teach|tutor|strategy|method|intelligen|question|lesson|nova|review|admin)/i.test(rel);
    const score=(marks.directSelector?100:0)+(marks.b4Gateway?90:0)+(marks.rawReviewedEvidence?85:0)+
      (kind==='api-route'?45:0)+(kind==='server-action'?35:0)+(marks.mathTeaching?20:0)+
      (marks.auth?15:0)+(marks.role?10:0)+(filenameRelevance?10:0) - (isDefinition?80:0);
    found.push({path:rel,kind,markers:marks,attention,score});
  }
  function walk(dir){
    if(limitHit)return;
    let stat;try{stat=fs.lstatSync(dir);}catch{return;}
    if(stat.isSymbolicLink())return;
    if(stat.isFile()){collect(dir);return;}
    if(!stat.isDirectory())return;
    let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{unreadable.push(normalized(path.relative(repo,dir)));return;}
    for(const e of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      if(limitHit)return;
      if(e.isSymbolicLink())continue;
      const full=path.join(dir,e.name);
      if(e.isDirectory()&&!excludedDirs.has(e.name)&&!e.name.startsWith('.'))walk(full);
      else if(e.isFile())collect(full);
    }
  }
  for(const r of [...roots,...topFiles]){
    const rp=path.resolve(repo,r);if(visited.has(rp))continue;visited.add(rp);if(fs.existsSync(rp))walk(rp);
  }
  found.sort((a,b)=>a.path.localeCompare(b.path));
  const isApplicationSource=x=>x.kind!=='b4-gateway-definition'&&x.kind!=='b2-selector-definition'&&
    !/(^|\/)qa\//.test(x.path)&&!/(^|\/)tests?\//.test(x.path);
  const runtimeFiles=found.filter(isApplicationSource);
  const callsites=runtimeFiles.filter(x=>x.markers.directSelector||x.markers.b4Gateway);
  const apiRoutes=runtimeFiles.filter(x=>x.kind==='api-route');
  const gatewayCalls=runtimeFiles.filter(x=>x.markers.b4Gateway);
  const prioritized=runtimeFiles.filter(x=>x.kind==='api-route'||x.kind==='server-action'||x.kind==='middleware'||
    x.markers.directSelector||x.markers.b4Gateway||x.markers.rawReviewedEvidence||x.markers.auth||x.markers.role)
    .sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  const selected=prioritized.slice(0,30).filter(x=>x.score>=25);
  const recommendations=selected.length? selected.map(x=>({path:x.path,kind:x.kind,reason:x.attention[0] || (x.markers.directSelector?'selector reference':x.markers.b4Gateway?'gateway reference':x.markers.auth?'authorization helper':'potential server entry point')})) : [];
  return {schemaVersion:VERSION,scan:{rootLabel:path.basename(repo),sourceReadOnly:true,scannedMatches:found.length,unreadableFiles:unreadable,scanLimitReached:limitHit,excludedPrivateFiles:true},summary:{apiRoutes:apiRoutes.length,selectorOrGatewayReferences:callsites.length,gatewayReferencesOutsideDefinition:gatewayCalls.length,filesWithRawReviewedEvidence:runtimeFiles.filter(x=>x.markers.rawReviewedEvidence).length,attentionFlags:found.reduce((n,x)=>n+x.attention.length,0),gatewayDefinitionPresent:found.some(x=>x.kind==='b4-gateway-definition'),b2SelectorDefinitionPresent:found.some(x=>x.kind==='b2-selector-definition'),liveWiringProven:false,authorizationVerified:false},files:found.map(({path,kind,markers,attention})=>({path,kind,markers,attention})),filesToShare:recommendations,notes:[
    'Static references are discovery hints, NOT proof of authorization, safety, or runtime wiring.',
    'Only file paths, marker names and line numbers were exported; never upload environment files or signing keys.',
    'B4 approval is disabled by default; do not enable until live route and trust boundary reviewed.',
    'If no selector callsite appears, identify the existing math teaching API manually rather than invent a route.'
  ]};
}
function markdown(report){
  const s=report.summary;
  const escaped=s=>String(s).replace(/[|`\\]/g,'_');
  let out=`# DREAMSCAPE ONE — Phase 4C-4D-1 Integration Discovery\n\n`+
    `**Static inventory, not security certification.** No production code was modified.\n\n`+
    `- API route files identified: **${s.apiRoutes}**\n`+
    `- Selector/gateway references outside their definitions: **${s.selectorOrGatewayReferences}**\n`+
    `- Gateway references outside its definition: **${s.gatewayReferencesOutsideDefinition}**\n`+
    `- Files referencing raw reviewed evidence: **${s.filesWithRawReviewedEvidence}**\n`+
    `- Attention flags for manual review: **${s.attentionFlags}**\n\n`+
    `Neither live wiring nor authentication has been verified by this scan.\n\n`+
    `## Next files to share for route audit\n\n`;
  if(!report.filesToShare.length)out+='No likely server entry points found. Locate the active math teaching API/service manually and share its source (without credentials).\n';
  else for(const f of report.filesToShare.slice(0,12))out+=`- \`${escaped(f.path)}\` — ${escaped(f.reason)}\n`;
  out+='\n## Attention flags\n\n';
  let flagged=0;
  for(const f of report.files){for(const flag of f.attention){out+=`- \`${escaped(f.path)}\`: ${flag}\n`;flagged++;}}
  if(!flagged)out+='None detected by these heuristics; this does not prove any route safe.\n';
  out+='\n## Safety\n\nDo **not** send `.env` files, tokens, service-role keys, passwords, or private signing keys. Share only the generated JSON/Markdown report plus identified source files. Keep B4 `mode: disabled`.\n';
  return out;
}
function outputReport(rootDir,outputRel='qa-artifacts/phase4c4d1'){
  const resolved=path.resolve(rootDir,outputRel);
  const repo=path.resolve(rootDir);
  if(resolved===repo||(!resolved.startsWith(repo+path.sep))) throw new Error('B4D1_OUTPUT_MUST_BE_INSIDE_REPO');
  const report=scanRepo(repo);
  fs.mkdirSync(resolved,{recursive:true});
  const jsonFile=path.join(resolved,'phase-4c4d1-route-discovery.json');
  const mdFile=path.join(resolved,'phase-4c4d1-route-discovery.md');
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+'\n','utf8');
  fs.writeFileSync(mdFile,markdown(report),'utf8');
  return {report,files:[jsonFile,mdFile]};
}
if(require.main===module){
  try{
    const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();
    const output=process.argv[3]||'qa-artifacts/phase4c4d1';
    const {report,files}=outputReport(root,output);
    console.log('DREAMSCAPE 4C-4D-1 — integration discovery finished');
    console.log(JSON.stringify(report.summary,null,2));
    console.log('Reports:');for(const f of files)console.log(path.relative(root,f));
    console.log('Next: share both reports and the exact server routes/services listed in filesToShare.');
  }catch(err){console.error('4C-4D-1 scan failed:',err.message);process.exitCode=1;}
}
module.exports={scanRepo,markdown,outputReport,VERSION};
