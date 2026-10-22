#!/usr/bin/env node
'use strict';
/**
 * DREAMSCAPE ONE — 4E-2B-8C-2D.8A
 * READ-ONLY generator-path discovery. No network, auth, DB calls, writes,
 * code execution, source snippets or generated teaching output.
 * All findings are CANDIDATES; static scanning NEVER verifies authorisation,
 * question freshness, generation provenance or readiness to capture.
 */
const fs = require('node:fs');
const path = require('node:path');
const VERSION = '8C2D8A.v1';
const SCAN_ROOTS = ['app/api', 'lib', 'components', 'app', 'src', 'pages/api', 'server'];
const SKIP = new Set(['node_modules', '.git', '.next', '.vercel', 'dist', 'build', 'coverage', 'archive', 'archives', 'backups', '.turbo', 'public', 'generated', 'storybook-static']);
const EXT = new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);
const MAX_FILE_BYTES = 350000;
const MAX_FILES = 12000;
const MAX_CANDIDATES = 70;
const STATIC_SIGNALS = Object.freeze({
  openai_responses: /\b(?:openai|client|aiClient|provider|modelClient)\s*\.\s*responses\s*\.\s*create\s*\(/i,
  openai_chat_completions: /\b(?:openai|client|aiClient|provider|modelClient)\s*\.\s*chat\s*\.\s*completions\s*\.\s*create\s*\(/i,
  anthropic_messages: /\b(?:anthropic|client|aiClient)\s*\.\s*messages\s*\.\s*create\s*\(/i,
  ai_sdk_generate: /\b(?:generateText|streamText|generateObject|streamObject)\s*\(/,
  gemini_generate: /\b(?:model|generativeModel|client)\s*\.\s*generateContent\s*\(/,
  provider_http_path: /\b(?:fetch|axios\.post)\s*\(\s*[`'"]https:\/\/api\.(?:openai|anthropic)\.com\//i,
  llm_provider_integration: /\bnew\s+(?:OpenAI|Anthropic|GoogleGenerativeAI)\s*\(|\b(?:from|require\()\s*['"](?:openai|@anthropic-ai\/sdk|@ai-sdk\/openai|ai|@google\/generative-ai)['"]/i,
});
const GUARDED = Object.freeze({
  curriculum_staff_guard: /\brequireCurriculumDeveloperApiAccess\s*\(/,
  trusted_staff_source: /\bresolveStaffMathTeachingSource\s*\(/,
  staff_guard_other: /\b(?:requireAdmin(?:Access)?|requireStaff(?:Access)?|requireCurriculumLeadAccess)\s*\(/,
  user_session_check: /\bauth\s*\.\s*getUser\s*\(/,
});
const METHOD_PATH = /math|nova|teach|tutor|solution|explan|learning|curriculum|ai\b/i;
const NOT_TEST = /(?:\.test|\.spec|\.d)\.[cm]?[jt]sx?$|(?:^|\/)__tests__(?:\/|$)|(?:^|\/)(?:fixtures|mocks)(?:\/|$)/i;
const uuidLike = /(?:^|\/)(?:\.{1,2})(?:\/|$)/;
function codeWithoutComments(text) {
  // Only a candidate detector. Scrub comments conservatively; never execute content.
  // Preserve string contents so ordinary invocation tokens remain detectable.
  let out = '', state='code', quote='', escaped=false;
  for (let i=0;i<text.length;i++) {
    const c=text[i],n=text[i+1];
    if (state==='line') {if(c==='\n'){state='code';out+='\n';} continue;}
    if (state==='block') {if(c==='*'&&n==='/'){state='code';i++;} else if(c==='\n')out+='\n';continue;}
    if (state==='string') {
      out+=c;
      if(escaped){escaped=false;continue;}
      if(c==='\\'){escaped=true;continue;}
      if(c===quote){state='code';quote='';}
      continue;
    }
    if(c==='/'&&n==='/'){state='line';i++;continue;}
    if(c==='/'&&n==='*'){state='block';i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;state='string';out+=c;continue;}
    out+=c;
  }
  return out;
}
function safeRel(root, full) {
  const rel=path.relative(root,full).split(path.sep).join('/');
  return rel && !rel.startsWith('../') && rel!=='..' && !path.isAbsolute(rel) && !uuidLike.test(rel) ? rel : null;
}
function scanRepo(root, opts={}) {
  if(typeof root!=='string'||!fs.existsSync(root)) throw Error('ROOT_NOT_FOUND');
  const resolved=fs.realpathSync(root);
  if(!fs.statSync(resolved).isDirectory())throw Error('ROOT_NOT_DIRECTORY');
  const maxFiles=Number.isSafeInteger(opts.maxFiles)&&opts.maxFiles>0?Math.min(opts.maxFiles,MAX_FILES):MAX_FILES;
  const seen=new Set();
  const matches=[];
  let fileCount=0, oversized=0, unreadable=0, truncated=false, candidateOverflow=0;
  function visit(dir){
    if(fileCount>=maxFiles){truncated=true;return;}
    let entries=[];
    try{entries=fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));}
    catch{unreadable++;return;}
    for(const ent of entries) {
      if(fileCount>=maxFiles){truncated=true;break;}
      if(ent.isSymbolicLink())continue;
      const full=path.join(dir,ent.name);
      if(ent.isDirectory()){
        if(!SKIP.has(ent.name.toLowerCase()))visit(full);
        continue;
      }
      if(!ent.isFile()||!EXT.has(path.extname(ent.name).toLowerCase()))continue;
      const rel=safeRel(resolved,full);
      if(!rel||seen.has(rel)||NOT_TEST.test(rel)||/\.bak\.|\.backup\.|\.old\./i.test(rel))continue;
      seen.add(rel);
      fileCount++;
      let stat,raw;
      try{stat=fs.statSync(full);if(stat.size>MAX_FILE_BYTES){oversized++;continue;}raw=fs.readFileSync(full,'utf8');}
      catch{unreadable++;continue;}
      const code=codeWithoutComments(raw);
      const signals=Object.entries(STATIC_SIGNALS).filter(([,re])=>re.test(code)).map(([name])=>name);
      const guarded=Object.entries(GUARDED).filter(([,re])=>re.test(code)).map(([name])=>name);
      const knownPreview=/(?:method-preview|StaffMethodPreview|StaffShadowComparison|phase4E2B8C2C4DStaffShadowComparison)/i.test(rel);
      const namedRoute=/(?:generate|explain|solution|tutor|ai-|ai\/|nova)/i.test(rel)&&rel.startsWith('app/api/');
      // No method inferred just from a NOVA string or "explanation" variable.
      if(!(signals.length||knownPreview||namedRoute))continue;
      const generationSignals=signals.filter(s=>s!=='llm_provider_integration');
      const kind=generationSignals.length?'provider_call_candidate':signals.length?'provider_setup_candidate':knownPreview?'staff_preview_or_shadow':'named_api_route_candidate';
      const entry={relativePath:rel,kind,signals,staffGuardHints:guarded,methodRelatedPath:METHOD_PATH.test(rel)};
      if(matches.length<MAX_CANDIDATES)matches.push(entry); else candidateOverflow++;
    }
  }
  for(const rel of SCAN_ROOTS){
    const dir=path.join(resolved,rel);
    if(fs.existsSync(dir))visit(dir);
  }
  const dedup=new Map(matches.map(m=>[m.relativePath,m]));
  const ordered=[...dedup.values()].sort((a,b)=>{
    const rank={provider_call_candidate:0,provider_setup_candidate:1,named_api_route_candidate:2,staff_preview_or_shadow:3};
    return rank[a.kind]-rank[b.kind]||a.relativePath.localeCompare(b.relativePath);
  });
  const providerCandidates=ordered.filter(v=>v.kind==='provider_call_candidate').length;
  const presence=ordered.filter(v=>v.kind==='provider_call_candidate'||v.kind==='provider_setup_candidate').length;
  const report={
    phase:'4E-2B-8C-2D.8A',schemaVersion:VERSION,
    auditStatus:truncated?'PARTIAL_SCAN':'SOURCE_SCAN_COMPLETE_WITH_SCOPE_LIMITS',
    generationPathAssessment:presence?'CANDIDATES_REQUIRE_MANUAL_CODE_REVIEW':'NO_PROVIDER_CALL_FOUND_IN_SCANNED_SCOPE',
    captureReadiness:'BLOCKED_NOT_VERIFIED',
    counts:{sourceFilesScanned:fileCount,oversizedSkipped:oversized,unreadableEntries:unreadable,candidatesShown:ordered.length,candidatesOmitted:candidateOverflow,providerCallCandidates:providerCandidates},
    candidates:ordered,
    stillRequired:[
      'EXISTING_AUTHORISED_STAFF_GENERATOR_PATH_NOT_VERIFIED',
      'REAL_NOVA_GENERATION_NOT_CAPTURED',
      'NO_GENERATOR_APPROVAL_OR_LEARNER_RELEASE',
      'CAPTURE_SOURCE_VERSION_AND_FINGERPRINT_NOT_LIVE_VERIFIED',
      'INDEPENDENT_EDUCATOR_REVIEWS_NOT_COMPLETE',
      'BETA_LIVE_AUTH_AND_AUDIT_TESTS_DEFERRED'
    ],
    sourceDisclosure:'RELATIVE_PATHS_AND_STATIC_SIGNAL_NAMES_ONLY_NO_CODE_OR_SECRETS',
  };
  return report;
}
function cli(argv){
  if(argv.length>2|| (argv.length && argv[0]!=='--root')){
    process.stderr.write('Usage: node scripts/phase4e2b8c2d8-generator-path-audit.cjs [--root REPO_PATH]\n');return 2;
  }
  const root=argv.length===2?argv[1]:process.cwd();
  try{process.stdout.write(JSON.stringify(scanRepo(root),null,2)+'\n');return 0;}
  catch(e){process.stderr.write('GENERATOR_PATH_AUDIT_BLOCKED: '+(e.message==='ROOT_NOT_FOUND'||e.message==='ROOT_NOT_DIRECTORY'?e.message:'AUDIT_FAILED')+'\n');return 1;}
}
if(require.main===module)process.exitCode=cli(process.argv.slice(2));
module.exports={scanRepo,codeWithoutComments,safeRel,VERSION,cli};
