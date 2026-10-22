'use strict';
/**
 * DREAMSCAPE ONE | Phase 4E-2B-8C-2D.7
 * Offline, read-only REAL teaching output intake and comparison evidence checks.
 * This is NOT a content generator, mathematical correctness oracle, teaching approval,
 * staff-authentication check, source-freshness verifier, or learner-release mechanism.
 * Read local files ONLY; NO database/API/network/writes (including reports).
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const VERSION = '8C2D7.v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX64 = /^[a-f0-9]{64}$/i;
const ID = /^REAL_[A-Z0-9_]{3,64}$/;
const METHODS = Object.freeze({
  'heuristic.multi_step.equal_spacing_interval_count': {min:3,max:6, family:'heuristic.multi_step'},
  'heuristic.multi_step.multiplicative_comparison_chain': {min:4,max:6, family:'heuristic.multi_step'},
  'ratio.relationship.before_after_change': {min:5,max:6, family:'ratio.relationship'}
});
const incumbentAllowed = Object.freeze({
  'heuristic.multi_step.equal_spacing_interval_count': Object.freeze([
    'heuristic.multi_step.dependency_order','heuristic.multi_step.identify_subgoals',
    'heuristic.multi_step.final_synthesis'
  ]),
  'heuristic.multi_step.multiplicative_comparison_chain': Object.freeze([
    'heuristic.multi_step.dependency_order','heuristic.multi_step.identify_subgoals',
    'heuristic.multi_step.final_synthesis', 'model.comparison.unit_comparison'
  ]),
  'ratio.relationship.before_after_change': Object.freeze([
    'ratio.relationship.part_whole_connection','ratio.relationship.ratio_units',
    'ratio.relationship.scale_table','ratio.relationship.equivalent_ratio'
  ])
});
const own = (x,k) => Object.prototype.hasOwnProperty.call(x,k);
const okDate = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s));
const unique = xs => [...new Set(xs)];
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const isInside = (child,parent) => {const rel=path.relative(parent,child);return !rel || (!rel.startsWith('..'+path.sep) && rel!=='..' && !path.isAbsolute(rel));};
const protectedStrings = /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:service_role|SUPABASE_SERVICE_ROLE_KEY|authorization:\s*bearer|eyJ[A-Za-z0-9_\-]{35,}\.eyJ[A-Za-z0-9_\-]{15,}\.|sk_(?:live|test)_[A-Za-z0-9]{12,})\b)/i;
function readManifest(manifestPath){
  if(typeof manifestPath!=='string'||!path.isAbsolute(manifestPath)) throw Error('MANIFEST_ABSOLUTE_PATH_REQUIRED');
  const real=fs.realpathSync(manifestPath);
  if(isInside(real,ROOT))throw Error('MANIFEST_MUST_BE_OUTSIDE_REPO');
  const stat=fs.statSync(real);
  if(!stat.isFile() || stat.size>30000 || !real.toLowerCase().endsWith('.json'))throw Error('MANIFEST_INVALID_TYPE_OR_SIZE');
  return JSON.parse(fs.readFileSync(real,'utf8'));
}
function checkArtifact(artifact, allowed, opts={}){
  const issues=[];
  if(!artifact || typeof artifact!=='object' || Array.isArray(artifact))return ['ARTIFACT_METADATA_REQUIRED'];
  if(typeof artifact.path!=='string'||!path.isAbsolute(artifact.path))return ['ARTIFACT_ABSOLUTE_PATH_REQUIRED'];
  let real,stat;
  try{real=fs.realpathSync(artifact.path);stat=fs.statSync(real);}
  catch{return ['ARTIFACT_MISSING'];}
  if(isInside(real,ROOT))issues.push('ARTIFACT_INSIDE_REPO');
  if(!stat.isFile() || stat.size===0 || stat.size>(opts.binary?12000000:250000))issues.push('ARTIFACT_SIZE_OR_TYPE_INVALID');
  if(!allowed.includes(path.extname(real).toLowerCase()))issues.push('ARTIFACT_EXTENSION_INVALID');
  if(!HEX64.test(artifact.sha256??''))issues.push('ARTIFACT_HASH_MISSING');
  if(issues.length)return issues;
  let bytes;
  try{bytes=fs.readFileSync(real);}catch{return ['ARTIFACT_UNREADABLE'];}
  if(digest(bytes)!==artifact.sha256.toLowerCase())issues.push('ARTIFACT_HASH_MISMATCH');
  if(opts.binary){
    const ext=path.extname(real).toLowerCase();
    const isPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isJpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const isWebp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
    if((ext==='.png'&&!isPng)||(ext==='.jpg'||ext==='.jpeg')&&!isJpg||(ext==='.webp'&&!isWebp)
      || (!isPng&&!isJpg&&!isWebp))issues.push('RENDER_ARTIFACT_FORMAT_INVALID');
  }else{
    const s=bytes.toString('utf8');
    if(s.includes('\uFFFD')||s.trim().length<50)issues.push('EXPLANATION_TEXT_EMPTY_OR_UNREADABLE');
    if(protectedStrings.test(s))issues.push('POSSIBLE_SECRET_IN_OUTPUT');
  }
  return issues;
}
function evaluate(m){
  const blockers=[],pending=[];
  const b=x=>blockers.push(x),p=x=>pending.push(x);
  if(!m || typeof m!=='object'||Array.isArray(m))return {status:'BLOCKED',blockers:['MANIFEST_INVALID'],pending:[],releaseAllowed:false,methodApproved:false,liveVerified:false};
  if(m.schemaVersion!==VERSION)b('SCHEMA_VERSION_INVALID');
  // Reject privileged/source-bearing fields accidentally pasted into the manifest.
  const forbiddenKey=/^(?:accessToken|refreshToken|password|serviceRoleKey|authorization|answerData|answer_data|storedAnswerKey|questionBody|questionText|studentName|studentEmail)$/i;
  const containsForbiddenKey=(obj,depth=0)=>{
    if(!obj||typeof obj!=='object'||depth>12)return false;
    return Object.keys(obj).some(k=>forbiddenKey.test(k)||containsForbiddenKey(obj[k],depth+1));
  };
  if(containsForbiddenKey(m)||protectedStrings.test(JSON.stringify(m)))b('PRIVILEGED_OR_SENSITIVE_MANIFEST_FIELD');
  if(m.templateOnly!==false)b('TEMPLATE_IS_NOT_REAL_OUTPUT');
  if(!ID.test(m.reviewId??''))b('INVALID_REVIEW_ID');
  const q=m.question??{};
  if(!UUID.test(q.quizId??'')||!UUID.test(q.questionId??''))b('QUESTION_IDENTITIES_REQUIRED');
  if(!Number.isSafeInteger(q.version)||q.version<1)b('QUESTION_VERSION_REQUIRED');
  if(!HEX64.test(q.fingerprintSha256??''))b('SOURCE_FINGERPRINT_REQUIRED');
  if(![1,2,3,4,5,6].includes(q.primaryLevel))b('PRIMARY_LEVEL_INVALID');
  if(q.sourceIdentityOrigin!=='authenticated_staff_preview')b('SOURCE_PROVENANCE_UNSUPPORTED');
  if(!okDate(q.previewedAt))b('SOURCE_PREVIEW_TIME_INVALID');
  const g=m.governance??{};
  if(g.staffOnly!==true||g.noLearnerData!==true||g.noStoredAnswerKey!==true)b('GOVERNANCE_ATTESTATIONS_REQUIRED');
  if(g.recordingApproved!==false||g.methodApproved!==false||g.learnerRelease!==false)b('PREMATURE_APPROVAL_OR_RELEASE');
  if(g.liveAuthenticationVerified===true||g.liveFreshnessVerified===true)b('OFFLINE_LIVE_VERIFICATION_CLAIM');
  const sp=m.specialist??{}, ic=m.incumbent??{};
  if(!own(METHODS,sp.methodId??''))b('SPECIALIST_ID_NOT_DRAFT');
  else if(q.primaryLevel<METHODS[sp.methodId].min||q.primaryLevel>METHODS[sp.methodId].max)b('SPECIALIST_LEVEL_MISMATCH');
  if(!own(incumbentAllowed,sp.methodId??'')||!incumbentAllowed[sp.methodId].includes(ic.methodId))b('INCUMBENT_METHOD_NOT_GROUNDED');
  if(sp.origin!=='captured_nova_output')b('REAL_NOVA_ORIGIN_REQUIRED');
  if(!['captured_existing_method_output','staff_authored_reference'].includes(ic.origin))b('INCUMBENT_ORIGIN_INVALID');
  if(!okDate(sp.capturedAt)||!okDate(ic.capturedAt))b('CAPTURE_TIMES_INVALID');
  if(typeof sp.generatorVersion!=='string'||sp.generatorVersion.trim().length<2)b('NOVA_GENERATOR_VERSION_REQUIRED');
  if(ic.origin==='captured_existing_method_output' && (typeof ic.generatorVersion!=='string'||ic.generatorVersion.trim().length<2))b('INCUMBENT_GENERATOR_VERSION_REQUIRED');
  if(sp.origin==='captured_nova_output'&&ic.origin==='staff_authored_reference')p('INCUMBENT_IS_AUTHORED_REFERENCE_NOT_GENERATED_OUTPUT');
  for(const [label,item] of [['SPECIALIST',sp],['INCUMBENT',ic]]){
    for(const issue of checkArtifact(item.textArtifact,['.txt','.md']))b(label+'_'+issue);
    if(typeof item.containsDiagram!=='boolean'||typeof item.containsSpecialMathNotation!=='boolean')b(label+'_VISUAL_FLAGS_REQUIRED');
    const renders=item.renderedArtifacts;
    if(!Array.isArray(renders))b(label+'_RENDER_LIST_REQUIRED');
    else{
      if(renders.length>8)b(label+'_TOO_MANY_RENDER_ARTIFACTS');
      const devices=new Set();
      for(const render of renders.slice(0,9)){
        if(!['mobile','desktop','tablet'].includes(render?.device))b(label+'_RENDER_DEVICE_INVALID');
        if(devices.has(render?.device))b(label+'_DUPLICATE_RENDER_DEVICE');
        devices.add(render?.device);
        for(const issue of checkArtifact(render,['.png','.jpg','.jpeg','.webp'],{binary:true}))b(label+'_'+issue);
      }
      if(item.containsDiagram===true||item.containsSpecialMathNotation===true){
        if(!devices.has('mobile')||!devices.has('desktop'))b(label+'_MOBILE_DESKTOP_RENDERS_REQUIRED');
      }else if(!renders.length)p(label+'_NO_RENDER_SCREENSHOT_SUPPLIED');
    }
  }
  const review=m.educatorReview??{};
  if(review.r1!=='PENDING'||review.r2!=='PENDING'||review.finalDecision!=='UNDECIDED'||review.approved!==false)
    b('OFFLINE_REVIEW_MUST_BEGIN_PENDING');
  if(m.comparisonQuestionIdentity!=='single_source_question_for_both_variants')b('PAIR_SAME_QUESTION_ATTESTATION_MISSING');
  const orders=m.presentationOrder??{};
  if(JSON.stringify(orders.R1)!==JSON.stringify(['specialist','incumbent']) ||
     JSON.stringify(orders.R2)!==JSON.stringify(['incumbent','specialist']))
    b('BLINDED_COUNTERBALANCED_REVIEW_ORDER_REQUIRED');
  p('CURRENT_SOURCE_VERSION_NOT_RECHECKED_AGAINST_LIVE_DB');
  p('SAME_QUESTION_LINKAGE_IS_STAFF_ATTESTED_NOT_INDEPENDENTLY_VERIFIED');
  p('ACTUAL_OUTPUT_ORIGIN_IS_STAFF_ATTESTED_NOT_INDEPENDENTLY_VERIFIED');
  p('ARITHMETIC_AND_FINAL_ANSWER_REQUIRE_INDEPENDENT_CHECK');
  p('GRADE_LANGUAGE_AND_MISCONCEPTIONS_REQUIRE_TWO_EDUCATORS');
  p('RENDERED_VISUALS_REQUIRE_HUMAN_INSPECTION');
  p('DEFERRED_LIVE_AUTH_AND_AUDIT_TESTS_OUTSTANDING');
  const failures=unique(blockers),holds=unique(pending);
  return {
    status:failures.length?'BLOCKED':'CAPTURE_INTEGRITY_OK_REVIEW_PENDING',
    blockers:failures, pending:holds,
    comparisonClass:ic.origin==='staff_authored_reference'?'actual_nova_vs_staff_authored_reference':'actual_nova_vs_actual_incumbent',
    methodApproved:false,releaseAllowed:false,liveVerified:false,mathematicalCorrectnessVerified:false,
    reviewId:ID.test(m.reviewId??'')?m.reviewId:null
  };
}
function evaluateFile(file){return evaluate(readManifest(file));}
function cli(argv){
  if(argv.includes('--check-template')){
    process.stdout.write('Phase 4E-2B-8C-2D.7: FRAMEWORK_READY | REAL_NOVA_OUTPUTS=0 | HUMAN_REVIEW=PENDING | RELEASE=DISABLED\n');
    return 0;
  }
  if(argv.length!==2||argv[0]!=='--manifest'){
    process.stderr.write('Usage: node scripts/phase4e2b8c2d7-real-output-evaluation.cjs --check-template OR --manifest <absolute-private-json-path>\n');
    return 2;
  }
  try{
    const result=evaluateFile(argv[1]);
    // Deliberately NO question text, file path, answers, tokens or output text in response.
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    return result.blockers.length?1:0;
  }catch(e){
    process.stderr.write('Evaluation blocked: '+(e?.message||'INVALID_INPUT').replace(/(?:[A-Z]:\\|\/)[^\s]+/g,'[PRIVATE_PATH]')+'\n');
    return 1;
  }
}
if(require.main===module)process.exitCode=cli(process.argv.slice(2));
module.exports={evaluate,evaluateFile,readManifest,checkArtifact,digest,isInside,ROOT,VERSION,METHODS,incumbentAllowed,cli};
