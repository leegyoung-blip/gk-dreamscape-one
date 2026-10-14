'use strict';
/** DREAMSCAPE ONE Phase 4C-4D-2. Read-only source inspection, not security certification.
 * No source excerpts or environment values are exported. Node core modules only.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const VERSION = '4C-4D-2.SOURCE-BOUNDARY-AUDIT.1';
const REQUIRED = Object.freeze({
  generateRoute: 'app/api/curriculum-developer/math-intelligence/generate/route.ts',
  batchRoute: 'app/api/curriculum-developer/math-intelligence/batch/route.ts',
  curriculumAuth: 'lib/curriculum-developer/server/CurriculumDeveloperApiAuth.ts',
  authoringPipeline: 'lib/math-intelligence/MathIntelligencePipeline.ts',
  visualTeachingPipeline: 'lib/math-intelligence/MathTeachingVisualPipeline.ts',
  learnerPlayer: 'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizPlayer.tsx',
});
const FOLLOWUP = Object.freeze([
  'hooks/useCoreMissionAccess.ts',
  'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizTypes.ts',
  'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizUtils.ts',
  'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/presentation/CoreMissionStage.tsx',
  'lib/supabase/server.ts',
  'lib/math-intelligence/teaching/contract/buildTeachingContract.ts',
  'lib/math-intelligence/teaching/contract/consumer/boundary.ts',
]);
const CHECKS = Object.freeze({
  generateRoute: {
    routePost: /export\s+async\s+function\s+POST\s*\(/,
    serverAuth: /await\s+requireCurriculumDeveloperApiAccess\s*\(request\)/,
    authoringCall: /await\s+generateMathVisualAndTeachingForQuestion\s*\(/,
    noStore: /no-store/,
  },
  batchRoute: {
    routePost: /export\s+async\s+function\s+POST\s*\(/,
    serverAuth: /await\s+requireCurriculumDeveloperApiAccess\s*\(request\)/,
    authoringCall: /await\s+generateMathAuthoringBatch\s*\(/,
    noStore: /no-store/,
  },
  curriculumAuth: {
    serverOnly: /import\s+["']server-only["']/,
    bearerHeader: /headers\.get\(["']authorization["']\)/,
    verifyUser: /\.auth\.getUser\s*\(token\)/,
    profileRoleLookup: /\.from\(["']profiles["']\)/,
    authoringRoles: /role\s*!==\s*["']admin["']\s*&&\s*role\s*!==\s*["']curriculum_lead["']/,
  },
  authoringPipeline: {
    serverOnly: /import\s+["']server-only["']/,
    authoringOrchestration: /export\s+async\s+function\s+generateMathVisualAndTeachingForQuestion\s*\(/,
    analysisRules: /analyseMathQuestion\s*\(/,
  },
  visualTeachingPipeline: {
    visualTeaching: /generateMathTeachingVisualWithFallback\s*\(/,
    validation: /validateMathTeachingVisualDraft\s*\(/,
  },
  learnerPlayer: {
    clientComponent: /^\s*["']use client["']\s*;/m,
    supabaseRpc: /supabase\.rpc\s*\(/,
    mathPayloadRpc: /get_math_quiz_payload/,
    mathSaveRpc: /save_math_quiz_answer/,
    mathSubmitRpc: /submit_math_quiz_attempt/,
    feedbackTiming: /feedback_mode\s*===\s*["']immediate["']/,
    resultStage: /setStage\(["']results["']\)/,
  },
});
const OUT_DIR = 'qa-artifacts/phase4c4d2';
const OUT_JSON = 'phase-4c4d2-server-boundary-audit.json';
const OUT_MD = 'phase-4c4d2-server-boundary-audit.md';
function lineNumber(text, offset) { return text.slice(0, offset).split('\n').length; }
function marker(text, re) {
  const m = re.exec(text);
  return {found: Boolean(m), line: m ? lineNumber(text,m.index) : null};
}
function takeFile(root, rel) {
  const abs = path.resolve(root,...rel.split('/'));
  if (!fs.existsSync(abs)) return null;
  const stat = fs.statSync(abs);
  if (!stat.isFile()) return null;
  const text = fs.readFileSync(abs,'utf8');
  return {text, sha256:crypto.createHash('sha256').update(text).digest('hex')};
}
function afterAll(text, partA, partB) {
  return partA.found && partB.found && partA.line < partB.line;
}
function audit(root) {
  const files=[];const raw={};
  for (const [kind,rel] of Object.entries(REQUIRED)) {
    const data=takeFile(root,rel);raw[kind]=data?.text||'';
    const markers={};
    for (const [name,re] of Object.entries(CHECKS[kind])) markers[name]=marker(raw[kind],re);
    files.push({kind,path:rel,exists:Boolean(data),sourceSha256:data?.sha256??null,markers});
  }
  const fm=Object.fromEntries(files.map(f=>[f.kind,f]));
  const authoringRouteOrder=['generateRoute','batchRoute'].every(k=>
    afterAll(raw[k],fm[k].markers.serverAuth,fm[k].markers.authoringCall));
  const selectorPattern=/\b(?:selectFromPhase4A4B|selectWithB4Approval|reviewedMathEvidence)\b/g;
  const selectorReferences=files.flatMap(f=>{
    const t=raw[f.kind],matches=[...t.matchAll(selectorPattern)];
    return matches.map(m=>({path:f.path,line:lineNumber(t,m.index),identifier:m[0]}));
  });
  const rpcMarkers=['get_math_quiz_payload','save_math_quiz_answer','submit_math_quiz_attempt'].map(name=>({
    name, ...marker(raw.learnerPlayer,new RegExp('\\b'+name+'\\b')),
  }));
  const missing=files.filter(f=>!f.exists).map(f=>f.path);
  const forward=FOLLOWUP.map(rel=>({path:rel,presentInLocalRepository:Boolean(takeFile(root,rel))}));
  return {
    schemaVersion:VERSION,
    scan:{rootLabel:path.basename(path.resolve(root)),sourceReadOnly:true,containsSourceExcerpts:false,requiredFiles:6,readableFiles:files.filter(f=>f.exists).length,missingFiles:missing},
    summary:{
      authoringRoutesIdentified:fm.generateRoute.markers.authoringCall.found&&fm.batchRoute.markers.authoringCall.found,
      bothAuthoringRoutesCallAccessHelper:fm.generateRoute.markers.serverAuth.found&&fm.batchRoute.markers.serverAuth.found,
      authoringAuthPrecedesGeneration:authoringRouteOrder,
      authHelperChecksBearerUserAndRole:fm.curriculumAuth.markers.bearerHeader.found&&fm.curriculumAuth.markers.verifyUser.found&&fm.curriculumAuth.markers.authoringRoles.found,
      learnerUsesDirectSupabaseRpc:fm.learnerPlayer.markers.supabaseRpc.found&&rpcMarkers.every(m=>m.found),
      b2B4SelectorReferencesInSixFiles:selectorReferences.length,
      studentTeachingServiceIdentified:false,
      liveAuthorizationVerified:false,
      readyToPatchStudentRoute:false,
      gatewayModeRequired:'disabled',
    },
    files,selectorReferences,rpcMarkers,followupSourceFiles:forward,
    blockingUnknowns:[
      'Server-side student/attempt entitlement and ownership contract not examined',
      'Supabase get/save/submit RPC definitions, RLS and solution-release rules not examined',
      'Actual client result/feedback presentation contracts not examined',
      '4A contract construction from a trusted persisted question not yet wired',
      'No authenticated image-content verification or signed teaching approvals',
      'A genuinely unseen question cohort is still required before activating reviewed evidence',
    ],
    recommendations:[
      'Leave authoring generate/batch endpoints unchanged; neither is the learner teaching route',
      'Do not infer student authorization from useCoreMissionAccess browser state',
      'Do not expose answer keys or explanations before the currently configured feedback-release event',
      'Build a separate server-owned student teaching handler only after reviewing ownership, RLS and feedback contracts',
      'Keep B4 approval in disabled mode; never accept review data, trusted keys or rollout mode from client payloads',
    ],
  };
}
function markdown(report) {
  const s=report.summary;
  const rows=report.files.map(f=>`| \`${f.path}\` | ${f.exists?'Found':'Missing'} | ${f.kind} |`).join('\n');
  const more=report.followupSourceFiles.map(f=>`- \`${f.path}\` ${f.presentInLocalRepository?'(present)':'(not found in scanned root)'}`).join('\n');
  return `# DREAMSCAPE ONE — Phase 4C-4D-2 Server Boundary Audit\n\n**Static source inspection only. Not a security or pedagogical certification. No source files were changed.**\n\n## Verified source layout\n\n| Source file | Status | Classification |\n|---|---|---|\n${rows}\n\n- Authoring endpoints found: **${s.authoringRoutesIdentified?'yes':'not proven'}**. Both call the curriculum access helper: **${s.bothAuthoringRoutesCallAccessHelper?'yes':'not proven'}**; those calls precede generation in the supplied sources: **${s.authoringAuthPrecedesGeneration?'yes':'not proven'}**.\n- Supabase bearer/user/profile-role checks found in access helper: **${s.authHelperChecksBearerUserAndRole?'yes':'not proven'}**. Actual effective RLS and authorization are **not tested**.\n- Learner player calls Supabase RPC directly: **${s.learnerUsesDirectSupabaseRpc?'yes':'not proven'}**.\n- B2/B4 selector references in six files: **${s.b2B4SelectorReferencesInSixFiles}**. This is not a repository-wide reference search.\n- Live student teaching service identified: **no**.\n- Ready to patch live student route: **no**.\n\n## Safest integration decision\n\nKeep Math Intelligence authoring endpoints and Core Quiz grading paths unchanged. Do not attach the B4 gateway to curriculum-authoring generation or insert a client-side call into the quiz. The next implementation will need a separate server-owned, authenticated method-selection service with proven student/attempt access and respect for feedback timing. B4 remains **disabled**.\n\n## Source files needed for next integration step\n\n${more}\n\n## Data/server contracts still needed\n\n${report.blockingUnknowns.map(x=>'- '+x).join('\n')}\n\n## Boundaries\n\n${report.recommendations.map(x=>'- '+x).join('\n')}\n\n**Do not upload** \.env files, private keys, service-role keys, signing keys or account tokens.\n`;
}
function writeReport(root) {
  const r=audit(root);if(r.scan.missingFiles.length)throw new Error('Missing required source files: '+r.scan.missingFiles.join(', '));
  const dir=path.join(root,OUT_DIR);fs.mkdirSync(dir,{recursive:true});
  const jp=path.join(dir,OUT_JSON),mp=path.join(dir,OUT_MD);
  fs.writeFileSync(jp,JSON.stringify(r,null,2)+'\n');fs.writeFileSync(mp,markdown(r));
  return {report:r,jsonPath:jp,markdownPath:mp};
}
if(require.main===module){
 try {const r=writeReport(path.resolve(process.argv[2]||process.cwd()));
  console.log(`Phase 4C-4D-2: ${r.report.scan.readableFiles}/6 files; authoring=${r.report.summary.authoringRoutesIdentified}; learner direct RPC=${r.report.summary.learnerUsesDirectSupabaseRpc}; B2/B4 references=${r.report.summary.b2B4SelectorReferencesInSixFiles}`);
  console.log('Reports:',r.jsonPath,r.markdownPath);}
 catch(err){console.error('4D-2 audit failed:',err.message);process.exitCode=1;}
}
module.exports={audit,markdown,writeReport,REQUIRED,FOLLOWUP,VERSION};
