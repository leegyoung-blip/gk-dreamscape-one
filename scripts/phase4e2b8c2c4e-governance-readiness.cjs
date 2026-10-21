'use strict';
/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4E
 * READ-ONLY, offline source-governance audit for specialist teaching methods.
 *
 * No network calls, OAuth, Supabase writes, API routes, method activation,
 * learner access, Git mutations, or secret/env inspection. This is NOT a
 * penetration test, runtime authorization proof, or beta-release approval.
 */
const fs = require('node:fs');
const path = require('node:path');

const P = Object.freeze({
  drafts:'lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts.ts',
  applicability:'lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2C3BApplicabilityReview.ts',
  comparator:'lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2C3CShadowRankingComparison.ts',
  production:'lib/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.ts',
  selector:'lib/math/teaching/strategy-selection/phase4C4Adapter.ts',
  resolver:'lib/math/teaching/student-serving/phase4E2A3StaffSourceResolver.server.ts',
  queue:'lib/math/teaching/student-serving/phase4E2B8C2C4AStaffSpecialistReview.server.ts',
  evidence:'lib/math/teaching/student-serving/phase4E2B8C2C4BVerifiedMathEvidence.server.ts',
  preflight:'lib/math/teaching/student-serving/phase4E2B8C2C4C1StaffConfirmationPreflight.server.ts',
  audit:'lib/math/teaching/student-serving/phase4E2B8C2C4C2BStaffReviewAudit.server.ts',
  shadow:'lib/math/teaching/student-serving/phase4E2B8C2C4DStaffShadowComparison.server.ts',
  baseline:'tests/fixtures/phase4e2b8c2c3d-baseline.json',
});
const DRAFT_IDS = Object.freeze([
  'heuristic.multi_step.equal_spacing_interval_count',
  'heuristic.multi_step.multiplicative_comparison_chain',
  'ratio.relationship.before_after_change',
]);
const DEFERRED_GATES = Object.freeze([
  {id:'LIVE_ORDINARY_USER_DENIAL',stage:'before_write_enablement',status:'deferred',why:'Real authenticated regular-user denial was deliberately deferred until beta readiness.'},
  {id:'LIVE_STAFF_AUTH_AND_PREVIEW',stage:'before_write_enablement',status:'deferred',why:'An admin/curriculum-lead Google session must demonstrate fresh staff authorization and successful read-only preview.'},
  {id:'LIVE_STALE_SOURCE_AND_RECORDING',stage:'before_write_enablement',status:'deferred',why:'Controlled runtime tests must prove stale-source rejection, denial for unauthorized writes, idempotency, and unchanged data outside audit events.'},
  {id:'HUMAN_PEDAGOGICAL_REVIEW',stage:'before_method_activation',status:'deferred',why:'Independent reviewers must validate the three draft methods and their teaching suitability.'},
  {id:'ANSWER_AND_VISUAL_EVALUATION',stage:'before_method_activation',status:'deferred',why:'Specialist comparisons require answer-checked and diagram-reviewed evaluation where applicable.'},
  {id:'FULL_REPOSITORY_TYPECHECK',stage:'before_merge',status:'local_check_required',why:'Run npx tsc --noEmit in the actual VS Code repository after installation.'},
  {id:'END_TO_END_BETA_REGRESSION',stage:'before_learner_release',status:'deferred',why:'Run end-to-end authentication, privilege, release and teaching correctness tests on the final beta build.'},
]);

function auditSources(sources, productionImportHits = []) {
  const checks=[];
  const check=(id,pass,detail)=>checks.push({id,pass:!!pass,detail});
  for(const [key,rel] of Object.entries(P)) {
    check('FILE_'+key.toUpperCase(),typeof sources[rel]==='string',rel);
  }
  const s=key=>typeof sources[P[key]]==='string'?sources[P[key]]:'';
  const draft=s('drafts');
  for(const id of DRAFT_IDS){
    check('DRAFT_ID_'+id, draft.includes(`methodId: '${id}'`), 'Expected inactive specialist method definition');
    check('UNREGISTERED_'+id,!s('production').includes(id),'Production method library must not contain the specialist');
  }
  check('DRAFT_STATUS', (draft.match(/status:\s*'draft'/g)||[]).length===3, 'Exactly three inactive draft objects');
  check('NO_SYNTHETIC_CURRICULUM_SKILLS', (draft.match(/curriculumSkills:\s*\[\s*\]/g)||[]).length===3, 'All three draft skill lists remain undeclared');
  for (const key of ['production','selector']){
    check('LIVE_CATALOGUE_ISOLATION_'+key.toUpperCase(),
      !/phase4E2B8C2C3[ABC]|phase4E2B8C2C4D/.test(s(key)), 'Live catalogue/selector must not import specialist logic');
  }
  for(const key of ['resolver','queue','evidence','preflight','audit','shadow']){
    check('SERVER_ONLY_'+key.toUpperCase(), /import\s+['"]server-only['"]/.test(s(key)), 'Server-only module boundary');
  }
  check('SHADOW_INPUT_IDS_ONLY', /Object\.keys\(v\)\.sort\(\)\.join\(','\)\s*===\s*'questionId,quizId'/.test(s('shadow')),
    'The 4D entry point rejects caller-supplied facts/approvals');
  check('SHADOW_SOURCE_RESOLVED', /const source\s*=\s*await resolveStaffMathTeachingSource\(request,query\)/.test(s('shadow')),
    'Compare from authenticated trusted question source');
  check('SHADOW_FRESHNESS_REREAD', /const latest\s*=\s*await resolveStaffMathTeachingSource\(request,query\)/.test(s('shadow')) &&
    /latest\.sourceIdentity\.questionVersion\s*!==\s*version/.test(s('shadow')),
    'Freshness reread is advisory and non-atomic');
  check('SHADOW_VERSION_BOUND', /finding\.sourceVersion\s*!==\s*version/.test(s('shadow')),
    'Reject mismatched specialist evidence versions');
  const markerMatch=/const MARKERS:\s*Markers\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/.exec(s('shadow'));
  const marker=markerMatch?.[1]||'';
  check('SHADOW_UNVERIFIED_MARKERS', /humanVerified:\s*false/.test(marker) &&
    /teachingApproved:\s*false/.test(marker) &&
    /methodActivated:\s*false/.test(marker) &&
    /studentReleased:\s*false/.test(marker) &&
    /scoresModified:\s*false/.test(marker) &&
    /sourceCorrelatedOnly:\s*true/.test(marker),
    'Shadow result remains non-activating and not human verified');
  check('SHADOW_NO_DB_WRITES', !/\.(?:insert|update|upsert|delete|rpc)\s*\(/.test(s('shadow')) &&
    !/math_specialist_structure_review_record/.test(s('shadow')),
    '4D comparison does not call audit writer or Supabase mutation functions');
  check('SHADOW_NOT_WRITER_CONNECTED', !/phase4E2B8C2C4C2BStaffReviewAudit/.test(s('shadow')),
    '4D service must not import the database audit writer');
  check('AUDIT_WRITER_SEPARATE', /math_specialist_structure_review_record/.test(s('audit')) &&
    /const review\s*=\s*await prepareStaffSpecialistStructureReviewIntent\(request,/.test(s('audit')),
    'A separate staff-only writer enforces preflight; no runtime claim made');
  check('SOURCE_CORRELATED_NOT_APPROVAL',/reusableApprovalProof:\s*false/.test(s('evidence')) &&
    /teachingApproved:\s*false/.test(s('evidence')),
    'Earlier evidence cannot become approval proof');
  check('SHADOW_VISUALS_BLOCKED', /hasVisual===true/.test(s('shadow')),
    'Diagram-dependent cases cannot bypass visual review');
  try {
    const baseline=JSON.parse(s('baseline'));
    check('BASELINE_12',baseline.rows?.length===12,'Existing 12-question coverage baseline');
    check('BASELINE_5_SELECTED_7_AMBIGUOUS',baseline.rows?.filter(x=>x.outcome==='selected').length===5 &&
      baseline.rows?.filter(x=>x.outcome==='ambiguous').length===7,
      'Reference results only; NOT independent mathematical correctness');
  } catch {
    check('BASELINE_PARSE',false,'Baseline JSON could not be parsed');
  }
  check('NO_PUBLIC_INTEGRATION_IMPORTS',productionImportHits.length===0,
    productionImportHits.length?productionImportHits.join('; '):'No app/components/lib import of internal 4D, draft catalogue or write-capable audit writer');
  const failures=checks.filter(c=>!c.pass);
  return {
    phase:'4E-2B-8C-2C.4E',
    sourceGate:failures.length===0?'SOURCE_CHECKS_PASSED':'SOURCE_CHECKS_BLOCKED',
    betaReady:false,
    methodActivationAllowed:false,
    staffWriteEnablementAllowed:false,
    checkCount:checks.length,
    failedCount:failures.length,
    checks,
    deferredGates:DEFERRED_GATES.map(x=>({...x})),
    caveat:'Static source evidence only. No staff login, database runtime test, teaching correctness proof, or beta sign-off is performed.',
  };
}

function importHits(root) {
  const hits=[];
  for(const base of ['app','components','lib']) {
    const start=path.join(root,base);
    if(!fs.existsSync(start)) continue;
    const todo=[start];
    while(todo.length){
      const dir=todo.pop();
      for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
        const full=path.join(dir,ent.name);
        if(ent.isDirectory()) {if(!['node_modules','.next','.git'].includes(ent.name))todo.push(full);continue;}
        if(!ent.isFile()|| !/\.(?:ts|tsx|js|jsx)$/.test(ent.name))continue;
        if(fs.statSync(full).size>1000000)continue;
        const text=fs.readFileSync(full,'utf8');
        // Import-from paths, including multiline imports, or require/import() calls.
        const re=/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*['"]([^'"]+)['"]/g;
        for(const m of text.matchAll(re)){
          if(/phase4E2B8C2C4DStaffShadowComparison|phase4E2B8C2C4C2BStaffReviewAudit|phase4E2B8C2C3ASpecialistDrafts/.test(m[1])) {
            const allowedDraftConsumers=new Set([
              'phase4E2B8C2C3BApplicabilityReview.ts',
              'phase4E2B8C2C3CShadowRankingComparison.ts',
              'phase4E2B8C2C4AStaffSpecialistReview.server.ts',
              'phase4E2B8C2C4BVerifiedMathEvidence.server.ts',
              'phase4E2B8C2C4DStaffShadowComparison.server.ts',
            ]);
            if(base==='lib' && /phase4E2B8C2C3ASpecialistDrafts/.test(m[1]) &&
                allowedDraftConsumers.has(ent.name))continue;
            hits.push(path.relative(root,full).replaceAll('\\','/')+':'+m[1]);
          }
        }
      }
    }
  }
  return hits.sort();
}
function auditRepo(root) {
  const sources={};
  for(const relative of Object.values(P)){
    const abs=path.join(root,relative);
    if(fs.existsSync(abs)&&fs.statSync(abs).isFile())sources[relative]=fs.readFileSync(abs,'utf8');
  }
  return auditSources(sources,importHits(root));
}
function main(argv) {
  const rootIndex=argv.indexOf('--root');
  const root=rootIndex>=0?path.resolve(argv[rootIndex+1]||'.'):path.resolve(__dirname,'..');
  const report=auditRepo(root);
  if(argv.includes('--json')){
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
  } else {
    console.log(`Phase ${report.phase}: ${report.sourceGate}`);
    console.log(`${report.checkCount-report.failedCount}/${report.checkCount} source checks passed; ${report.deferredGates.length} beta/release gates remain pending.`);
    for(const f of report.checks.filter(x=>!x.pass)) console.log(`FAIL ${f.id} — ${f.detail}`);
    console.log('No database writes; no production selector changes; NOT beta-ready.');
  }
  process.exitCode=report.failedCount?1:(argv.includes('--strict-beta')?2:0);
  return report;
}
if(require.main===module) main(process.argv.slice(2));
module.exports={P,DRAFT_IDS,DEFERRED_GATES,auditSources,auditRepo,importHits,main};
