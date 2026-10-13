/** Phase 4C-4A: audited bridge from existing 4A/4B source to 4C. Read-only, fail closed. */
import type { TeachingContractConsumerEnvelope } from '../../../math-intelligence/teaching/contract/consumer/types';
import { stableStringify } from '../../../math-intelligence/teaching/contract/validateTeachingContract';
import { validateTeachingContractConsumerEnvelope } from '../../../math-intelligence/teaching/contract/consumer/boundary';
import { buildPhase4BQuestionCoverageRequirement } from '../../../math-intelligence/teaching/method-library/taxonomy/buildCoverageRequirement';
import { listPhase4BProductionCandidateMethods } from '../../../math-intelligence/teaching/method-library/methods/phase4BProductionLibrary';
import type { TeachingMethod } from '../../../math-intelligence/teaching/method-library/schema/types';
import type { Phase4BMethodFamilyId } from '../../../math-intelligence/teaching/method-library/taxonomy/types';
import { selectTeachingStrategy, type MethodCandidateEvidence } from './selector';
import { composeTeachingMethods, type MethodComposition } from './composition';
import type { StrategySelection, SelectionInputBoundary, ScoreDimension } from './types';

export const PHASE4C4_ADAPTER_VERSION = '4C-4A.1' as const;
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
};
const dims: readonly ScoreDimension[] = ['problem_structure','required_reasoning','curriculum_skill','learner_level','math_domain','representation_fit','prerequisites'];
const zero = (method: TeachingMethod, domain: ScoreDimension, detail: string) => ({dimension:domain,code:'4B_METADATA_CHECK',detail:`${method.methodId}: ${detail}`});
function makeEvidence(method: TeachingMethod, contract: TeachingContractConsumerEnvelope['contract'], verified?: EvidenceByMethod[string]): MethodCandidateEvidence {
  const matchingReasoning=method.applicability.reasoning.filter(r=>contract.mathematics.requiredReasoning.includes(r));
  const skillKeys=[contract.curriculum.primarySkill?.code, contract.curriculum.primarySkill?.id,
    ...contract.curriculum.secondarySkills.flatMap(s=>[s.code,s.id]),...contract.curriculum.skillTags].filter((x):x is string=>!!x);
  const declarativeSkillMatch=method.applicability.curriculumSkills.some(s=>skillKeys.includes(s));
  const prerequisites=method.pedagogy.prerequisiteConcepts.length===0 || verified?.mandatoryPrerequisitesSatisfied===true;
  const skillMatch=declarativeSkillMatch || (verified?.curriculumSkillMatch===true);
  const visualRelevant=contract.visual.hasVisual && method.visualGuidance.visualUse!=='never';
  const representationFit=verified?.representationFit===true || (visualRelevant && method.visualGuidance.originalDiagramPolicy==='use_when_present');
  const matches: Record<ScoreDimension,number>={
    problem_structure: Number(method.applicability.structures.includes(contract.mathematics.problemStructure)),
    required_reasoning: matchingReasoning.length ? matchingReasoning.length/contract.mathematics.requiredReasoning.length : 0,
    curriculum_skill: method.applicability.curriculumSkills.length===0 ? 0 : Number(skillMatch),
    learner_level: Number(method.applicability.levels.includes(contract.curriculum.learnerLevel)),
    math_domain: Number(method.applicability.domains.includes(contract.mathematics.domain)),
    representation_fit: Number(representationFit),
    prerequisites: Number(prerequisites),
  };
  return { methodId:method.methodId,familyId:method.familyId,active:method.status==='active',
    eligibleLevels:method.applicability.levels,mandatoryPrerequisitesSatisfied:prerequisites,
    matches,complexity:method.pedagogy.teachingSequence.length,
    positiveEvidence:dims.filter(d=>matches[d]>0).map(d=>zero(method,d,`verified match ${d}`)),
    penalties:[] };
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

/** Never bypasses existing 4A consumer validation, never treats applicability as prerequisite proof. */
export function selectFromPhase4A4B(input:Phase4C4AdapterInput):Phase4C4AdapterResult {
  if (!input?.methodLibraryEnvelope || !input?.strategyEnvelope) return fail('ENVELOPES_REQUIRED');
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
  const candidates=listPhase4BProductionCandidateMethods({learnerLevel:requirement.learnerLevel as 1|2|3|4|5|6,domain:requirement.domain,
    problemStructure:requirement.problemStructure,requiredReasoning:[...requirement.requiredReasoning],candidateFamilies:[...requirement.allCandidateFamilies]});
  const primary=candidates.filter(m=>families.includes(m.familyId));
  if (!primary.length) return fail('NO_4B_PRIMARY_CANDIDATES',families,candidates.length);
  const selections=families.map(family=>{
    const boundary:SelectionInputBoundary={questionId:c.questionId,readyForMethodSelection:true,
      teachingContractFingerprint:c.payloadFingerprint,teachingContractSchema:c.contractSchemaVersion,
      teachingConsumerSchema:c.schemaVersion,methodLibrarySchema:'4B.1',methodTaxonomySchema:requirement.schemaVersion,
      primaryFamilyId:family};
    return selectTeachingStrategy({boundary,learnerLevel:requirement.learnerLevel,
      candidates:primary.filter(m=>m.familyId===family).map(m=>makeEvidence(m,c.contract,input.verifiedEvidence?.[m.methodId]))});
  });
  if (selections.some(s=>s.status==='blocked')) return fail('FAMILY_SELECTION_BLOCKED',families,candidates.length,selections);
  // 4C-2 only ranks within a single family. Do not pretend its margin proves cross-family superiority.
  if (families.length!==1) return {schemaVersion:PHASE4C4_ADAPTER_VERSION,status:'ambiguous',
    reasonCodes:['CROSS_FAMILY_SELECTION_UNRESOLVED'],primaryFamilies:families,candidateMethodCount:candidates.length,
    familySelections:selections,selection:null,composition:null};
  const selected=selections[0];
  if (selected.status!=='selected') return {schemaVersion:PHASE4C4_ADAPTER_VERSION,status:'ambiguous',
    reasonCodes:['SINGLE_FAMILY_SELECTION_AMBIGUOUS'],primaryFamilies:families,candidateMethodCount:candidates.length,
    familySelections:selections,selection:selected,composition:null};
  // No learner-specific support necessity evidence is provided by the 4B source. Empty support is intentional.
  const composition=composeTeachingMethods({selection:selected,supportCandidates:[]});
  if (composition.status!=='primary_only') return fail('COMPOSITION_NOT_VALID',families,candidates.length,selections);
  return {schemaVersion:PHASE4C4_ADAPTER_VERSION,status:'selected',reasonCodes:[],primaryFamilies:families,
    candidateMethodCount:candidates.length,familySelections:selections,selection:selected,composition};
}
