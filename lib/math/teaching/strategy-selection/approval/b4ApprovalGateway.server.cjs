'use strict';
/** DREAMSCAPE Phase 4C-4C-B4 — SERVER ONLY.
 * This gateway authenticates approvals using Ed25519 signatures against keys provided
 * by the trusted application server (NEVER read trustedKeys from a client payload).
 * The existing B2 adapter checks question/fingerprint/anchors/method coverage afterward.
 * No approval has been issued for the B3 cases in this package.
 * Do not import this file from a browser or edge runtime.
 */
const { createHash, createPublicKey, verify } = require('node:crypto');
const APPROVAL_SCHEMA = '4C-4C-B4.APPROVAL.1';
const GATEWAY_VERSION = '4C-4C-B4.GATEWAY.1';
const ROLES = Object.freeze(['math_reviewer', 'approval_authority', 'curriculum_lead']);
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonblank = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 1024;
function canonical(x) {
  if (x === null) return 'null';
  if (typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
  if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
  if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
  if (!isObj(x)) throw new Error('B4_NON_CANONICAL_REVIEW');
  const keys = Object.keys(x).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
}
function reviewDigest(review) {
  return createHash('sha256').update(canonical(review), 'utf8').digest('hex');
}
function attestationMessage(role, signerId, digest) {
  return ['DREAMSCAPE_B4_REVIEW_APPROVAL', APPROVAL_SCHEMA, role, signerId, digest].join('\n');
}
const blocked = (code, detail = null) => ({schemaVersion:GATEWAY_VERSION, status:'blocked', reasonCodes:[code], result:null, shadowResult:null, trace:detail});
function trustedKeyMap(keys) {
  if (!Array.isArray(keys)) throw new Error('B4_SERVER_TRUST_KEYS_REQUIRED');
  const map = new Map();
  for (const key of keys) {
    if (!isObj(key) || !nonblank(key.signerId) || !nonblank(key.principalId) ||
      !nonblank(key.publicKeyPem) || !Array.isArray(key.roles) ||
      key.roles.length===0 || key.roles.some(r=>!ROLES.includes(r)) ||
      map.has(key.signerId)) throw new Error('B4_INVALID_SERVER_TRUST_CONFIGURATION');
    map.set(key.signerId, key);
  }
  return map;
}
function verifyApprovalPackage(pkg, source, config) {
  if (!isObj(pkg) || pkg.schemaVersion !== APPROVAL_SCHEMA ||
      !isObj(pkg.review) || !Array.isArray(pkg.attestations)) return {ok:false,reason:'B4_APPROVAL_PACKAGE_INVALID'};
  const review = pkg.review;
  if (!source?.strategyEnvelope || !source.methodLibraryEnvelope) return {ok:false,reason:'B4_ENVELOPES_REQUIRED'};
  if (review.questionId !== source.strategyEnvelope.questionId ||
      review.selectorEnvelopeFingerprint !== source.strategyEnvelope.payloadFingerprint)
    return {ok:false,reason:'B4_REVIEW_QUESTION_BINDING_INVALID'};
  // The B2 review itself has exact candidate, prompt-anchor and envelope validation.
  let digest;
  try { digest=reviewDigest(review); } catch {return {ok:false,reason:'B4_REVIEW_CANONICALIZATION_INVALID'};}
  let keys;
  try { keys=trustedKeyMap(config?.trustedKeys); }
  catch {return {ok:false,reason:'B4_SERVER_TRUST_CONFIGURATION_INVALID'};}
  const needed=['math_reviewer','approval_authority'];
  if (review.curriculumReview==='core'||review.curriculumReview==='enrichment') needed.push('curriculum_lead');
  if (pkg.attestations.length !== needed.length) return {ok:false,reason:'B4_REQUIRED_APPROVALS_MISSING_OR_EXTRA'};
  const usedRoles=new Set(), usedPeople=new Set();
  for (const att of pkg.attestations) {
    if (!isObj(att) || !needed.includes(att.role) || usedRoles.has(att.role) ||
        !nonblank(att.signerId) || !nonblank(att.signatureBase64))
      return {ok:false,reason:'B4_INVALID_APPROVAL_ATTESTATIONS'};
    const key=keys.get(att.signerId);
    if (!key || key.active!==true || !key.roles.includes(att.role) || usedPeople.has(key.principalId))
      return {ok:false,reason:'B4_UNTRUSTED_OR_NONINDEPENDENT_SIGNER'};
    if (att.role==='math_reviewer' && review.reviewerId!==key.principalId)
      return {ok:false,reason:'B4_REVIEWER_IDENTITY_NOT_BOUND_TO_SIGNER'};
    usedRoles.add(att.role);usedPeople.add(key.principalId);
    // Exact, strict base64: Node silently accepts malformed nonbase64 otherwise.
    const sig=att.signatureBase64;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(sig) || sig.length%4!==0)
      return {ok:false,reason:'B4_SIGNATURE_FORMAT_INVALID'};
    try {
      const pub=createPublicKey(key.publicKeyPem);
      if (pub.asymmetricKeyType!=='ed25519' || !verify(null,Buffer.from(attestationMessage(att.role,att.signerId,digest),'utf8'),pub,Buffer.from(sig,'base64')))
        return {ok:false,reason:'B4_SIGNATURE_VERIFICATION_FAILED'};
    } catch {return {ok:false,reason:'B4_SIGNATURE_VERIFICATION_FAILED'};}
  }
  if(needed.some(role=>!usedRoles.has(role))) return {ok:false,reason:'B4_REQUIRED_APPROVAL_ROLE_MISSING'};
  const visual=source.strategyEnvelope.contract?.visual;
  // Image-specific endorsements require a future authenticated image-content verification
  // protocol. A Supabase path, alt text, or AI description is not evidence of image content.
  if (visual?.hasVisual || (Array.isArray(visual?.sourceMedia) && visual.sourceMedia.length>0) || visual?.generatedV2)
    return {ok:false,reason:'B4_DIAGRAM_VERIFICATION_REQUIRED'};
  if (config?.revokedReviewIds?.includes(review.reviewId) || config?.revokedDigests?.includes(digest))
    return {ok:false,reason:'B4_REVIEW_REVOKED'};
  if (config?.allowReviewIds && (!Array.isArray(config.allowReviewIds) || !config.allowReviewIds.includes(review.reviewId)))
    return {ok:false,reason:'B4_REVIEW_NOT_ALLOWLISTED'};
  return {ok:true, digest, review, signerRoles:[...usedRoles].sort()};
}
/**
 * @param {Object} params
 * @param {Object} params.source 4A/B/C envelopes, without uncontrolled reviewedMathEvidence
 * @param {Function} params.selectFromPhase4A4B trusted B2 selector implementation
 * @param {Object} params.config trusted server-owned key registry, mode, revocations
 * @param {Object} [params.approvalPackage] signed, question-bound approval record
 * @returns gateway outcome. Only baseline/applied statuses are production-deliverable.
 */
function selectWithB4Approval({source, selectFromPhase4A4B, config={}, approvalPackage=null}={}) {
  if (typeof selectFromPhase4A4B!=='function' || !isObj(source)) return blocked('B4_INVALID_SELECTOR_INPUT');
  if (Object.prototype.hasOwnProperty.call(source,'reviewedMathEvidence') && source.reviewedMathEvidence != null)
    return blocked('B4_UNCONTROLLED_B2_REVIEW_INPUT');
  const mode=config.mode??'disabled';
  if (!['disabled','dry_run','enabled'].includes(mode)) return blocked('B4_UNKNOWN_GATEWAY_MODE');
  const clean={...source};delete clean.reviewedMathEvidence;
  if (mode==='disabled') return {schemaVersion:GATEWAY_VERSION,status:'baseline',reasonCodes:[],result:selectFromPhase4A4B(clean),shadowResult:null,
    trace:{mode:'disabled',applied:false,reviewId:null}};
  if (!approvalPackage) return {schemaVersion:GATEWAY_VERSION,status:'baseline',reasonCodes:[],result:selectFromPhase4A4B(clean),shadowResult:null,
    trace:{mode,applied:false,reviewId:null}};
  const authorized=verifyApprovalPackage(approvalPackage,clean,config);
  if (!authorized.ok) return blocked(authorized.reason);
  const baseline=selectFromPhase4A4B(clean);
  const shadow=selectFromPhase4A4B({...clean,reviewedMathEvidence:authorized.review});
  if (shadow.status==='blocked' && shadow.reasonCodes.some(x=>x.startsWith('INVALID_REVIEWED_STRUCTURE_EVIDENCE:')))
    return blocked('B4_B2_EVIDENCE_VALIDATION_REJECTED',shadow.reasonCodes[0]);
  // No increase to any candidate score is permitted; even for signed reviews.
  const baseScores=new Map(baseline.familySelections.flatMap(f=>f.candidates.map(c=>[c.methodId,c.score])));
  for(const c of shadow.familySelections.flatMap(f=>f.candidates)) {
    const base=baseScores.get(c.methodId);
    if(base===undefined || c.score>base+0.000001) return blocked('B4_SCORE_INFLATION_FORBIDDEN');
  }
  const trace={mode,applied:mode==='enabled',reviewId:authorized.review.reviewId,reviewSha256:authorized.digest,
    signerRoles:authorized.signerRoles,baselineStatus:baseline.status,reviewedStatus:shadow.status,
    baselineMethodId:baseline.selection?.primaryMethodId??null,reviewedMethodId:shadow.selection?.primaryMethodId??null,
    diagramAccuracy:'not_evaluated'};
  return {schemaVersion:GATEWAY_VERSION,status:mode==='enabled'?'applied':'dry_run',reasonCodes:[],
    result:mode==='enabled'?shadow:baseline,shadowResult:mode==='dry_run'?shadow:null,trace};
}
module.exports={APPROVAL_SCHEMA,GATEWAY_VERSION,canonical,reviewDigest,attestationMessage,verifyApprovalPackage,selectWithB4Approval};
