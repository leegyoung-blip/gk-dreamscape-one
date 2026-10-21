/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4D: staff-only SHADOW integration.
 *
 * The evidence identified here is SOURCE-CORRELATED, NOT independently human
 * verified. Authenticated source reads are non-atomic. This is consequently a
 * transient diagnostic, never a saved certificate, reviewer approval, or
 * teaching decision. Live staff-session checks remain a beta release blocker.
 *
 * No HTTP route, RPC write, new score, candidate promotion, or learner path.
 * Caller may provide ONLY the quiz and question UUIDs. No browser facts.
 */
import 'server-only';

import { normalizeCanonicalTeachingQuestion } from '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion';
import { understandTeachingQuestion } from '../../../math-intelligence/teaching/understanding/understandTeachingQuestion';
import { buildTeachingContract } from '../../../math-intelligence/teaching/contract/buildTeachingContract';
import {
  createPhase4BMethodLibraryContractView,
  createPhase4CStrategySelectorContractView,
} from '../../../math-intelligence/teaching/contract/consumer/boundary';
import { buildPhase4BQuestionCoverageRequirement } from '../../../math-intelligence/teaching/method-library/taxonomy/buildCoverageRequirement';
import { PHASE4E2B8C2C3A_SPECIALIST_DRAFTS } from '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts';
import {
  compareSpecialistWithIncumbents,
  type ExistingSelectionSnapshot,
  type SpecialistShadowComparison,
} from '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3CShadowRankingComparison';
import type {
  SpecialistDraftId,
  SpecialistFact,
} from '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3BApplicabilityReview';
import { selectFromPhase4A4B, phase4AConsumerPayloadsAgree } from '../strategy-selection/phase4C4Adapter';
import { resolveStaffMathTeachingSource } from './phase4E2A3StaffSourceResolver.server';
import { inspectStaffMathSpecialistEvidence } from './phase4E2B8C2C4BVerifiedMathEvidence.server';

export const STAFF_SHADOW_COMPARISON_VERSION = '4E-2B-8C-2C.4D' as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SPACING: SpecialistDraftId = 'heuristic.multi_step.equal_spacing_interval_count';
const CHAIN: SpecialistDraftId = 'heuristic.multi_step.multiplicative_comparison_chain';
const RATIO: SpecialistDraftId = 'ratio.relationship.before_after_change';
const IDS: readonly SpecialistDraftId[] = [SPACING, CHAIN, RATIO];

type Stage = 'query' | 'evidence' | 'source' | '4a_gate' | '4c_selector' | 'comparison' | 'freshness';
type ComparisonSummary = Readonly<{
  specialistMethodId: SpecialistDraftId;
  status: SpecialistShadowComparison['status'];
  reasonCode: string;
  reviewFocus: SpecialistShadowComparison['reviewFocus'];
  incumbentMethods: readonly Readonly<{methodId: string; rank: number; score: number}>[];
  specialistScore: null;
  specialistRank: null;
  scoreDelta: null;
  pedagogicalRole: 'unresolved';
}>;
type Markers = Readonly<{
  version: typeof STAFF_SHADOW_COMPARISON_VERSION;
  staffOnly: true;
  previewOnly: true;
  sourceCorrelatedOnly: true;
  humanVerified: false;
  persisted: false;
  reusableApprovalProof: false;
  teachingApproved: false;
  studentReleased: false;
  methodActivated: false;
  scoresModified: false;
}>;
export type StaffShadowComparisonReview = Markers & (
  | Readonly<{status:'blocked' | 'not_applicable';stage:Stage;reasonCode:string;comparisons:readonly [];questionVersion:null}>
  | Readonly<{status:'pending_manual_review';stage:'comparison';reasonCode:'SHADOW_8C2C4D_HUMAN_REVIEW_REQUIRED';
      comparisons:readonly ComparisonSummary[];questionVersion:number}>
);
const MARKERS: Markers = Object.freeze({
  version: STAFF_SHADOW_COMPARISON_VERSION,
  staffOnly: true, previewOnly: true, sourceCorrelatedOnly: true, humanVerified: false,
  persisted: false, reusableApprovalProof: false, teachingApproved: false,
  studentReleased: false, methodActivated: false, scoresModified: false,
});
function stop(status:'blocked'|'not_applicable', stage:Stage, reasonCode:string):StaffShadowComparisonReview {
  return Object.freeze({...MARKERS,status,stage,reasonCode,comparisons:[] as const,questionVersion:null});
}
const record = (x:unknown): x is Record<string,unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
const idsOnly = (v:unknown): v is {quizId:string; questionId:string} =>
  record(v) && Object.keys(v).sort().join(',')==='questionId,quizId' &&
  typeof v.quizId==='string' && UUID.test(v.quizId) &&
  typeof v.questionId==='string' && UUID.test(v.questionId);
const numeric = (raw:string, isLength=false):number|null => {
  if (!(isLength ? /^\d{1,6}(?:\.\d{1,3})?$/ : /^\d{1,7}$/).test(raw)) return null;
  const n=Number(raw);
  return Number.isFinite(n) && n>0 && n<=1000000 && (isLength || Number.isSafeInteger(n)) ? n : null;
};
const ratioFactor = (word:string): readonly [number,number] =>
  word.toLowerCase()==='thrice' ? [3,1] : word.toLowerCase()==='twice' ? [2,1] : [1,2];

/**
 * A second deliberately narrow parser. Its result is NEVER returned. The 4B
 * evidence gate must INDEPENDENTLY corroborate the same method/version before
 * this parser is consulted; disagreement fails safely. Pattern expansion
 * requires reviewed tests in both modules.
 */
function matchTrustedQuestion(methodId:SpecialistDraftId, prompt:string):SpecialistFact|null {
  if (methodId===SPACING) {
    const m=/^Trees are planted (\d{1,6}(?:\.\d{1,3})?) m apart along a straight road\. What is the distance between the (\d{1,7})(?:st|nd|rd|th) tree and the (\d{1,7})(?:st|nd|rd|th) tree\?$/i.exec(prompt);
    if(!m)return null;
    const gap=numeric(m[1],true), first=numeric(m[2]),last=numeric(m[3]);
    if(gap===null||first===null||last===null||last<=first)return null;
    return {kind:'equal_spacing_interval_count',firstOrdinal:first,lastOrdinal:last,gapLength:gap,
      equalAdjacentGaps:true,indexing:'consecutive',path:'straight',goal:'distance_between_positions'};
  }
  if(methodId===CHAIN){
    const m=/^([A-Za-z]{1,30}) has some marbles\. ([A-Za-z]{1,30}) has (twice|thrice) as many as \1\. ([A-Za-z]{1,30}) has (half|twice|thrice) as many as \2\. Together they have (\d{1,7}) marbles\. How many marbles does ([A-Za-z]{1,30}) have\?$/i.exec(prompt);
    if(!m||numeric(m[6])===null)return null;
    const persons=[m[1],m[2],m[4]].map(x=>x.toLowerCase());
    if(new Set(persons).size!==3)return null;
    const target=persons.indexOf(m[7].toLowerCase());
    if(target<0)return null;
    const [n1,d1]=ratioFactor(m[3]);const [n2,d2]=ratioFactor(m[5]);
    return {kind:'multiplicative_comparison_chain',quantityKeys:['q1','q2','q3'],
      relationships:[{quantity:'q2',relativeTo:'q1',numerator:n1,denominator:d1},
        {quantity:'q3',relativeTo:'q2',numerator:n2,denominator:d2}],
      combinedTotalKnown:true,combinedTotalIncludesExactlyTheseQuantities:true,
      targetQuantity:`q${target+1}`,comparisonType:'multiplicative'};
  }
  if(methodId===RATIO){
    const m=/^The ratio of ([a-z]{2,25}) to ([a-z]{2,25}) was (\d{1,7})\s*:\s*(\d{1,7})\. After ([a-z]{1,30}) bought (\d{1,7}) more \1 and (\d{1,7}) more \2, the ratio became (\d{1,7})\s*:\s*(\d{1,7})\. How many \2 did \5 have at first\?$/i.exec(prompt);
    if(!m||m[1].toLowerCase()===m[2].toLowerCase())return null;
    const values=[m[3],m[4],m[6],m[7],m[8],m[9]].map(x=>numeric(x));
    if(values.some(x=>x===null))return null;
    const [a,b,da,db,c,d]=values as number[];
    return {kind:'ratio_before_after_change',beforeRatio:[a,b],afterRatio:[c,d],changes:[da,db],
      changeEvidence:'both_explicit',quantityType:'whole_objects',goal:'original_quantity'};
  }
  return null;
}

/**
 * Re-compute the original 4A→4C selection from a single authenticated source
 * snapshot; do not accept candidate lists or verified facts from the client.
 * The last read detects ordinary version/content changes (NOT transaction proof).
 */
export async function inspectStaffMathSpecialistShadowComparison(
  request:Request, query:unknown,
):Promise<StaffShadowComparisonReview> {
  if(!idsOnly(query))return stop('blocked','query','SHADOW_8C2C4D_INVALID_QUERY');
  try {
    const corroboration=await inspectStaffMathSpecialistEvidence(request,query);
    if(corroboration.status!=='pending_manual_review' || corroboration.findings.length===0 ||
      corroboration.persisted!==false || corroboration.teachingApproved!==false)
      return stop('blocked','evidence','SHADOW_8C2C4D_EVIDENCE_GATE_NOT_READY');

    const source=await resolveStaffMathTeachingSource(request,query);
    if(source.status!=='ready' || source.sourceIdentity.quizId!==query.quizId ||
      source.sourceIdentity.questionId!==query.questionId ||
      !Number.isSafeInteger(source.sourceIdentity.questionVersion) ||
      (source.sourceIdentity.questionVersion as number)<=0)
      return stop('blocked','source','SHADOW_8C2C4D_SOURCE_OR_VERSION_NOT_READY');
    const version=source.sourceIdentity.questionVersion as number;
    const q:unknown=source.source.question;
    if(!record(q) || q.id!==query.questionId || q.subject!=='math' ||
       typeof q.prompt!=='string' || q.prompt.length===0 || q.prompt.length>1500 ||
       /[<>\u0000-\u001f]/.test(q.prompt) ||
       (q.content!==null && q.content!==undefined && q.content!==''))
      return stop('blocked','source','SHADOW_8C2C4D_TEXT_SOURCE_REQUIRED');
    const fingerprint=JSON.stringify({source:source.source.question,review:source.staffReview,version});
    if(fingerprint.length>300000)return stop('blocked','source','SHADOW_8C2C4D_SOURCE_TOO_LARGE');

    const canonical=normalizeCanonicalTeachingQuestion(source.source);
    if(canonical.identity.quizId!==query.quizId || canonical.identity.questionId!==query.questionId ||
       canonical.diagnostics.readyForUnderstanding!==true)
      return stop('blocked','4a_gate','SHADOW_8C2C4D_CANONICAL_NOT_READY');
    const understanding=understandTeachingQuestion({question:canonical});
    if(understanding.readyForMethodSelection!==true ||
       understanding.gateDiagnostics?.readyFor4C!==true ||
       (understanding.gateDiagnostics?.blockers?.length??0)!==0)
      return stop('blocked','4a_gate','SHADOW_8C2C4D_UNDERSTANDING_NOT_READY');
    const built=buildTeachingContract(understanding);
    if(built.status!=='ready')return stop('blocked','4a_gate','SHADOW_8C2C4D_CONTRACT_NOT_READY');
    const b=createPhase4BMethodLibraryContractView(built);
    const c=createPhase4CStrategySelectorContractView(built);
    if(b.status!=='ready'||c.status!=='ready'||!phase4AConsumerPayloadsAgree(b.envelope,c.envelope)||
       b.envelope.questionId!==query.questionId || c.envelope.questionId!==query.questionId)
      return stop('blocked','4a_gate','SHADOW_8C2C4D_CONSUMER_NOT_READY');
    const coverage=buildPhase4BQuestionCoverageRequirement(b.envelope);
    if(coverage.status!=='covered' || coverage.requirement.primaryFamilies.length!==1 ||
      b.envelope.contract.visual.hasVisual===true)
      return stop('not_applicable','4a_gate','SHADOW_8C2C4D_TAXONOMY_OR_VISUAL_UNRESOLVED');
    const family=coverage.requirement.primaryFamilies[0];
    const selection=selectFromPhase4A4B({methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope});
    if(selection.status!=='ambiguous' || selection.primaryFamilies.length!==1 ||
       selection.primaryFamilies[0]!==family || selection.familySelections.length!==1)
      return stop('not_applicable','4c_selector','SHADOW_8C2C4D_4C_NOT_SINGLE_FAMILY_AMBIGUOUS');
    const ranked=selection.familySelections[0];
    if(ranked.primaryFamilyId!==family || ranked.provenance.selectorImplementation!=='4C-2.1' ||
       ranked.status==='blocked')
      return stop('blocked','4c_selector','SHADOW_8C2C4D_4C_PROVENANCE_NOT_READY');
    const existing:ExistingSelectionSnapshot={
      selectorImplementation:'4C-2.1',status:'ambiguous',primaryFamilyId:family,
      candidates:ranked.candidates.map(item=>({
        methodId:item.methodId,familyId:item.familyId,eligible:item.eligible,
        rank:item.eligible?item.rank:null,score:item.eligible?item.score:null,
      })),
    };

    const comparisons:ComparisonSummary[]=[];
    for(const finding of corroboration.findings){
      if(!IDS.includes(finding.methodId) || finding.sourceVersion!==version ||
         finding.status!=='source_correlated_for_review')continue;
      const draft=PHASE4E2B8C2C3A_SPECIALIST_DRAFTS.find(x=>x.methodId===finding.methodId);
      if(!draft || draft.status!=='draft'||draft.familyId!==family ||
        !draft.applicability.levels.includes(coverage.requirement.learnerLevel as 1|2|3|4|5|6) ||
        !draft.applicability.domains.includes(coverage.requirement.domain) ||
        !draft.applicability.structures.includes(coverage.requirement.problemStructure) ||
        !draft.applicability.reasoning.some(r=>coverage.requirement.requiredReasoning.includes(r)))continue;
      const facts=matchTrustedQuestion(finding.methodId,q.prompt as string);
      if(!facts)continue;
      const result=compareSpecialistWithIncumbents({
        review:{methodId:finding.methodId,learnerLevel:coverage.requirement.learnerLevel,
          domain:coverage.requirement.domain,problemStructure:coverage.requirement.problemStructure,
          requiredReasoning:coverage.requirement.requiredReasoning,primaryFamilies:[family],
          hasVisual:false,visualReviewed:false,facts},
        existing,
      });
      if(result.status!=='ready_for_staff_comparison')continue;
      comparisons.push(Object.freeze({
        specialistMethodId:finding.methodId,status:result.status,reasonCode:result.ruleCode,
        reviewFocus:result.reviewFocus,
        incumbentMethods:Object.freeze(result.incumbents.map(i=>Object.freeze({
          methodId:i.methodId,rank:i.rank,score:i.score,
        }))),
        specialistScore:null,specialistRank:null,scoreDelta:null,pedagogicalRole:'unresolved' as const,
      }));
    }
    if(!comparisons.length)
      return stop('not_applicable','comparison','SHADOW_8C2C4D_NO_VALID_SOURCE_CORRELATED_PAIR');
    // Non-atomic read freshness guard: advisory only even when this matches.
    const latest=await resolveStaffMathTeachingSource(request,query);
    if(latest.status!=='ready' || latest.sourceIdentity.quizId!==query.quizId ||
       latest.sourceIdentity.questionId!==query.questionId || latest.sourceIdentity.questionVersion!==version ||
       JSON.stringify({source:latest.source.question,review:latest.staffReview,version})!==fingerprint)
      return stop('blocked','freshness','SHADOW_8C2C4D_SOURCE_CHANGED');
    return Object.freeze({...MARKERS,status:'pending_manual_review' as const,stage:'comparison' as const,
      reasonCode:'SHADOW_8C2C4D_HUMAN_REVIEW_REQUIRED' as const,
      comparisons:Object.freeze(comparisons),questionVersion:version});
  }catch{
    // Do not echo database errors, question text, answer keys or access tokens.
    return stop('blocked','source','SHADOW_8C2C4D_INTERNAL_UNAVAILABLE');
  }
}
