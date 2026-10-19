/** Phase 4C-4A: audited bridge from existing 4A/4B source to 4C. Read-only, fail closed. */
import type { TeachingContractConsumerEnvelope } from '../../../math-intelligence/teaching/contract/consumer/types';
import { stableStringify } from '../../../math-intelligence/teaching/contract/validateTeachingContract';
import { validateTeachingContractConsumerEnvelope } from '../../../math-intelligence/teaching/contract/consumer/boundary';
import { buildPhase4BQuestionCoverageRequirement } from '../../../math-intelligence/teaching/method-library/taxonomy/buildCoverageRequirement';
import { listPhase4BProductionCandidateMethods } from '../../../math-intelligence/teaching/method-library/methods/phase4BProductionLibrary';
import type { TeachingMethod } from '../../../math-intelligence/teaching/method-library/schema/types';
import { identifyVerifiedFactorDigitEvidence } from '../../../math-intelligence/teaching/understanding/rules/factorDigitEvidence';
import { identifyRingArrivalIncrementPattern } from '../../../math-intelligence/teaching/understanding/rules/constantIncrementPattern';
import type { Phase4BMethodFamilyId } from '../../../math-intelligence/teaching/method-library/taxonomy/types';
import { selectTeachingStrategy, type MethodCandidateEvidence } from './selector';
import { differentiateCloselyRelatedMethods, topTwoEligibleMethodIds, type MethodDifferentiation } from './phase4E2B8C2BMethodDifferentiation';
import { composeTeachingMethods, type MethodComposition } from './composition';
import type { StrategySelection, SelectionInputBoundary, ScoreDimension } from './types';
import {validateReviewedStructureEvidence, type ReviewedStructureEvidence, type B2EvidenceTrace} from './reviewedStructureEvidence';

export const PHASE4C4_ADAPTER_VERSION = '4C-4A.1' as const;
export const PHASE4C4_F3_POLICY_VERSION = '4C-4B-F3.1' as const;
export type MethodPrerequisiteMasteryState =
  'not_required' | 'verified_satisfied' | 'verified_unmet' | 'not_affirmed' | 'unknown';
/** Explicitly sourced learner evidence, never inferred from question readiness or level. */
export type VerifiedLearnerPrerequisiteEvidence = Readonly<Record<string, {
  status: 'met' | 'unmet';
  source: string;
}>>;
type EvidenceByMethod = Readonly<Record<string, {
  /** Proven separately from the method's declarative prerequisites. */
  mandatoryPrerequisitesSatisfied: boolean;
  /** Whether the method's specific curriculum skills match the actual question. */
  curriculumSkillMatch: boolean;
  /** A distinct checked representation is useful for THIS question. */
  representationFit: boolean;
}>>;
export type Phase4C4AdapterInput = {
  /** Generate with createPhase4BMethodLibraryContractView from the ready 4A build. */
  methodLibraryEnvelope: TeachingContractConsumerEnvelope;
  /** Generate with createPhase4CStrategySelectorContractView from the SAME ready 4A build. */
  strategyEnvelope: TeachingContractConsumerEnvelope;
  /** External, explicitly verified facts; missing entries are not presumed true. */
  verifiedEvidence?: EvidenceByMethod;
  /** Verified learner mastery/weakness, indexed by method ID. Omission means unknown. */
  learnerPrerequisiteEvidence?: VerifiedLearnerPrerequisiteEvidence;
  /** B2: trusted reviewer-approved, prompt-grounded method-fit findings. Never derived from bank solutions. */
  reviewedMathEvidence?: ReviewedStructureEvidence;
};
export type Phase4C4AdapterResult = {
  schemaVersion: typeof PHASE4C4_ADAPTER_VERSION;
  status: 'selected' | 'ambiguous' | 'blocked';
  reasonCodes: string[];
  primaryFamilies: string[];
  candidateMethodCount: number;
  familySelections: StrategySelection[];
  selection: StrategySelection | null;
  composition: MethodComposition | null;
  /** Present only when B2 evidence was supplied and provenance validated. */
  b2EvidenceTrace?: B2EvidenceTrace;
  /** 8C-2B staff-only shadow comparison; never authorizes selection or approval. */
  methodDifferentiation?: MethodDifferentiation;
};
const dims: readonly ScoreDimension[] = ['problem_structure','required_reasoning','curriculum_skill','learner_level','math_domain','representation_fit','prerequisites'];
const zero = (method: TeachingMethod, domain: ScoreDimension, detail: string) => ({dimension:domain,code:'4B_METADATA_CHECK',detail:`${method.methodId}: ${detail}`});
function makeEvidence(
  method: TeachingMethod, contract: TeachingContractConsumerEnvelope['contract'],
  verified?: EvidenceByMethod[string], learner?: VerifiedLearnerPrerequisiteEvidence[string],
  reviewedFit?: 'compatible' | 'incompatible',
): MethodCandidateEvidence {
  const matchingReasoning=method.applicability.reasoning.filter(r=>contract.mathematics.requiredReasoning.includes(r));
  const skillKeys=[contract.curriculum.primarySkill?.code, contract.curriculum.primarySkill?.id,
    ...contract.curriculum.secondarySkills.flatMap(s=>[s.code,s.id]),...contract.curriculum.skillTags,
    // Exact authored skill label; never guessed from question text or topic name.
    contract.curriculum.legacySkillLabel].filter((x):x is string=>!!x);
  const declarativeSkillMatch=method.applicability.curriculumSkills.some(s=>skillKeys.includes(s));
  const mastery: MethodPrerequisiteMasteryState = method.pedagogy.prerequisiteConcepts.length === 0
    ? 'not_required'
    : learner?.status === 'met' ? 'verified_satisfied'
    : learner?.status === 'unmet' ? 'verified_unmet'
    : verified?.mandatoryPrerequisitesSatisfied === true ? 'verified_satisfied'
    : verified?.mandatoryPrerequisitesSatisfied === false ? 'not_affirmed'
    : 'unknown';
  const prerequisites = mastery === 'not_required' || mastery === 'verified_satisfied';
  const skillMatch=declarativeSkillMatch || (verified?.curriculumSkillMatch===true);
  const visualRelevant=contract.visual.hasVisual && method.visualGuidance.visualUse!=='never';
  const representationFit=verified?.representationFit===true || (visualRelevant && method.visualGuidance.originalDiagramPolicy==='use_when_present');
  const matches: Record<ScoreDimension,number>={
    // B2 may SUPPRESS a reviewer-confirmed structural mismatch, never boost a fit.
    problem_structure: reviewedFit === 'incompatible' ? 0 : Number(method.applicability.structures.includes(contract.mathematics.problemStructure)),
    required_reasoning: matchingReasoning.length ? matchingReasoning.length/contract.mathematics.requiredReasoning.length : 0,
    curriculum_skill: method.applicability.curriculumSkills.length===0 ? 0 : Number(skillMatch),
    learner_level: Number(method.applicability.levels.includes(contract.curriculum.learnerLevel)),
    math_domain: Number(method.applicability.domains.includes(contract.mathematics.domain)),
    representation_fit: Number(representationFit),
    prerequisites: Number(prerequisites),
  };
  return { methodId:method.methodId,familyId:method.familyId,active:method.status==='active',
    eligibleLevels:method.applicability.levels,mandatoryPrerequisitesSatisfied:prerequisites,
    prerequisiteEvidenceState:mastery,
    matches,complexity:method.pedagogy.teachingSequence.length,
    positiveEvidence:dims.filter(d=>matches[d]>0).map(d=>zero(method,d,`verified match ${d}`)),
    penalties:reviewedFit === 'incompatible' ? [{dimension:'problem_structure',code:'B2_REVIEWED_STRUCTURE_MISMATCH',
      detail:`${method.methodId}: reviewer-approved structural mismatch; no positive structure points`}] : [] }; 
}
const fail=(reason:string, families:string[]=[], count=0, selections:StrategySelection[]=[]):Phase4C4AdapterResult=>({
  schemaVersion:PHASE4C4_ADAPTER_VERSION,status:'blocked',reasonCodes:[reason],primaryFamilies:families,
  candidateMethodCount:count,familySelections:selections,selection:null,composition:null});
/** Compare payload identity across different validated consumer kinds.
 * This does NOT validate either envelope; caller must first validate both individually.
 */
export function phase4AConsumerPayloadsAgree(
  b: TeachingContractConsumerEnvelope,
  c: TeachingContractConsumerEnvelope,
): boolean {
  return b.consumer === 'phase_4b_method_library' &&
    c.consumer === 'phase_4c_strategy_selector' &&
    b.questionId === c.questionId &&
    b.contractSchemaVersion === c.contractSchemaVersion &&
    b.schemaVersion === c.schemaVersion &&
    stableStringify(b.contract) === stableStringify(c.contract);
}

/** Never bypasses existing 4A consumer validation, never treats applicability as mastery proof. */
export function selectFromPhase4A4B(input:Phase4C4AdapterInput):Phase4C4AdapterResult {
  if (!input?.methodLibraryEnvelope || !input?.strategyEnvelope) return fail('ENVELOPES_REQUIRED');
  // Fail closed on invented, malformed or contradictory learner mastery assertions.
  const assertions = input.learnerPrerequisiteEvidence ?? {};
  for (const [methodId, entry] of Object.entries(assertions)) {
    if (!methodId.trim() || !entry || (entry.status !== 'met' && entry.status !== 'unmet') ||
      typeof entry.source !== 'string' || !entry.source.trim()) return fail('INVALID_LEARNER_PREREQUISITE_EVIDENCE');
    const legacy = input.verifiedEvidence?.[methodId]?.mandatoryPrerequisitesSatisfied;
    if (typeof legacy === 'boolean' && legacy !== (entry.status === 'met'))
      return fail('CONFLICTING_PREREQUISITE_EVIDENCE');
  }
  const b=input.methodLibraryEnvelope, c=input.strategyEnvelope;
  if (!validateTeachingContractConsumerEnvelope(b,'phase_4b_method_library').valid ||
      !validateTeachingContractConsumerEnvelope(c,'phase_4c_strategy_selector').valid) return fail('INVALID_4A_ENVELOPE');
  // Fingerprints are consumer-bound by design in 4A: 4B and 4C fingerprints MUST differ.
  // Both envelopes have already passed their own kind-specific fingerprint validation.
  // Compare canonical method-agnostic payloads and identity, without weakening either envelope's validation.
  if (!phase4AConsumerPayloadsAgree(b,c)) return fail('UPSTREAM_ENVELOPES_MISMATCH');
  const coverage=buildPhase4BQuestionCoverageRequirement(b);
  if (coverage.status!=='covered') return fail('4B_TAXONOMY_UNCOVERED');
  const requirement=coverage.requirement;
  const families=[...requirement.primaryFamilies].sort();
  if (!families.length) return fail('NO_PRIMARY_FAMILIES');
  // 4E-2B-6: only the narrowly validated two-target constant-increment story
  // can admit the specialist. A skill label alone is not proof of the maths.
  const verifiedConstantIncrementTermAndTotal =
    requirement.learnerLevel === 6 &&
    requirement.domain === 'patterns' &&
    requirement.problemStructure === 'pattern_rule' &&
    ['pattern_application', 'addition', 'multiplication'].every(r =>
      requirement.requiredReasoning.includes(r as typeof requirement.requiredReasoning[number])) &&
    c.contract.curriculum.legacySkillLabel === 'Number patterns and sequences' &&
    identifyRingArrivalIncrementPattern(c.contract.content.prompt) !== null;
  // Only the strictly validated problem evidence may admit the new factor
  // specialists. Curriculum tags alone cannot activate them.
  const verifiedFactorDigit = identifyVerifiedFactorDigitEvidence(c.contract.content.prompt);
  const candidates=listPhase4BProductionCandidateMethods({learnerLevel:requirement.learnerLevel as 1|2|3|4|5|6,domain:requirement.domain,
    problemStructure:requirement.problemStructure,requiredReasoning:[...requirement.requiredReasoning],candidateFamilies:[...requirement.allCandidateFamilies],
    verifiedConstantIncrementTermAndTotal,
    verifiedBoundedCommonMultiple: verifiedFactorDigit?.kind === 'bounded_common_multiple' &&
      requirement.problemStructure === 'bounded_common_multiple' && requirement.domain === 'whole_numbers',
    verifiedCommonFactorPartition: verifiedFactorDigit?.kind === 'common_factor_partition' &&
      requirement.problemStructure === 'common_factor_partition' && requirement.domain === 'whole_numbers'});
  const primary=candidates.filter(m=>families.includes(m.familyId));
  if (!primary.length) return fail('NO_4B_PRIMARY_CANDIDATES',families,candidates.length);
  // Only validated, reviewer-attested question structure can affect B2 scoring.
  // This is an opt-in trusted-server boundary, NOT evidence extracted from bank answers.
  const reviewCheck=input.reviewedMathEvidence
    ? validateReviewedStructureEvidence(input.reviewedMathEvidence,c,primary.map(m=>m.methodId)) : null;
  if (reviewCheck && !reviewCheck.valid) return fail('INVALID_REVIEWED_STRUCTURE_EVIDENCE:'+reviewCheck.issues.join(','),families,candidates.length);
  const validatedReview=reviewCheck?.valid ? reviewCheck : null;
  const fitByMethod=new Map(validatedReview?.evidence.methodJudgements.map(m=>[m.methodId,m.structuralFit] as const)??[]);
  const reviewTrace=validatedReview ? {b2EvidenceTrace:validatedReview.trace} : {};

  const selections=families.map(family=>{
    const boundary:SelectionInputBoundary={questionId:c.questionId,readyForMethodSelection:true,
      teachingContractFingerprint:c.payloadFingerprint,teachingContractSchema:c.contractSchemaVersion,
      teachingConsumerSchema:c.schemaVersion,methodLibrarySchema:'4B.1',methodTaxonomySchema:requirement.schemaVersion,
      primaryFamilyId:family};
    return selectTeachingStrategy({boundary,learnerLevel:requirement.learnerLevel,
      candidates:primary.filter(m=>m.familyId===family).map(m=>makeEvidence(m,c.contract,input.verifiedEvidence?.[m.methodId],input.learnerPrerequisiteEvidence?.[m.methodId],fitByMethod.get(m.methodId)))});
  });
  if (selections.some(s=>s.status==='blocked')) return {...fail('FAMILY_SELECTION_BLOCKED',families,candidates.length,selections),...reviewTrace};
  // 4C-2 only ranks within a single family. Do not pretend its margin proves cross-family superiority.
  if (families.length!==1) return {schemaVersion:PHASE4C4_ADAPTER_VERSION,status:'ambiguous',
    reasonCodes:['CROSS_FAMILY_SELECTION_UNRESOLVED'],primaryFamilies:families,candidateMethodCount:candidates.length,
    familySelections:selections,selection:null,composition:null,...reviewTrace};
  const selected=selections[0];
  // Differentiation is diagnostic-only, so it cannot change the frozen 4C-2
  // scores, 4C-4 selection, or signed B4 review behavior. No unsafe
  // learner/answer-bearing content is placed in the diagnostic object.
  const methodDifferentiation = selected.status === 'ambiguous' && !validatedReview
    ? differentiateCloselyRelatedMethods({
        learnerLevel: requirement.learnerLevel,
        domain: c.contract.mathematics.domain,
        problemStructure: c.contract.mathematics.problemStructure,
        prompt: c.contract.content.prompt,
        hasVisual: c.contract.visual.hasVisual,
        hasParts: c.contract.multipart.hasParts,
        eligibleMethodIds: topTwoEligibleMethodIds(selected.candidates),
      })
    : undefined;
  const diagnosticTrace = methodDifferentiation && methodDifferentiation.status !== 'not_applicable'
    ? {methodDifferentiation} : {};
  if (selected.status!=='selected') return {schemaVersion:PHASE4C4_ADAPTER_VERSION,status:'ambiguous',
    reasonCodes:['SINGLE_FAMILY_SELECTION_AMBIGUOUS'],primaryFamilies:families,candidateMethodCount:candidates.length,
    familySelections:selections,selection:selected,composition:null,...reviewTrace,...diagnosticTrace};
  // No learner-specific support necessity evidence is provided by the 4B source. Empty support is intentional.
  const composition=composeTeachingMethods({selection:selected,supportCandidates:[]});
  if (composition.status!=='primary_only') return fail('COMPOSITION_NOT_VALID',families,candidates.length,selections);
  return {schemaVersion:PHASE4C4_ADAPTER_VERSION,status:'selected',reasonCodes:[],primaryFamilies:families,
    candidateMethodCount:candidates.length,familySelections:selections,selection:selected,composition,...reviewTrace};
}
