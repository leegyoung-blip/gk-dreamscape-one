/** Phase 4C-4C-B2: opt-in, human-approved question-structure evidence.
 * Nothing here reads the answer key, generates a label, or authenticates a reviewer.
 * The caller MUST restrict this input to trusted, approved records; this validator
 * checks shape/provenance/coverage, not the truth of a mathematical judgement.
 */
import type {TeachingContractConsumerEnvelope} from '../../../math-intelligence/teaching/contract/consumer/types';

export const REVIEWED_STRUCTURE_EVIDENCE_VERSION = '4C-4C-B2.1' as const;
export type ReviewedRelation =
  | 'change_known_initial_and_change_final_unknown'
  | 'change_known_initial_and_final_change_unknown'
  | 'part_whole_known_whole_part_unknown'
  | 'part_whole_known_parts_whole_unknown'
  | 'sequence_adjacent_sum_recurrence'
  | 'sequence_growing_difference'
  | 'data_plain_list' | 'data_table' | 'data_picture_graph'
  | 'ordinal_position' | 'spatial_enumeration'
  | 'fraction_original_whole' | 'fraction_changed_whole'
  | 'ratio_equivalent_units' | 'inverse_constant_work'
  | 'measurement_known_total_remainder' | 'time_offset_direction';
export type ReviewedStructureEvidence = {
  schemaVersion: typeof REVIEWED_STRUCTURE_EVIDENCE_VERSION;
  questionId: string;
  /** Exact fingerprint of the individually validated Phase 4C consumer envelope. */
  selectorEnvelopeFingerprint: string;
  reviewId: string;
  reviewerId: string;
  /** Authorized review records only. Caller, not this module, verifies authorization. */
  approvalRef: string;
  approvalStatus: 'approved';
  scope: 'question_structure_only';
  independentlyChecked: true;
  /** Literal nonempty substring of the question prompt, NOT the bank explanation. */
  sourceAnchor: string;
  relation: ReviewedRelation;
  curriculumReview: 'not_reviewed' | 'core' | 'enrichment' | 'requires_review';
  /** Text-only judgements. Diagram/image claims must be reviewed separately. */
  methodJudgements: readonly {
    methodId: string;
    structuralFit: 'compatible' | 'incompatible';
    promptAnchor: string;
    rationale: string;
    sourceKind: 'question_prompt';
  }[];
};
export type B2EvidenceTrace = {
  schemaVersion: typeof REVIEWED_STRUCTURE_EVIDENCE_VERSION;
  reviewId: string;
  relation: ReviewedRelation;
  curriculumReview: ReviewedStructureEvidence['curriculumReview'];
  /** Only incompatibilities can lower problem-structure scores. No score bonuses. */
  suppressedStructureMethods: string[];
  affirmedStructureMethods: string[];
  diagramAccuracy: 'not_evaluated';
  answerCorrectness: 'not_evaluated';
};
const relationKeys: readonly ReviewedRelation[] = [
  'change_known_initial_and_change_final_unknown','change_known_initial_and_final_change_unknown',
  'part_whole_known_whole_part_unknown','part_whole_known_parts_whole_unknown',
  'sequence_adjacent_sum_recurrence','sequence_growing_difference',
  'data_plain_list','data_table','data_picture_graph','ordinal_position','spatial_enumeration',
  'fraction_original_whole','fraction_changed_whole','ratio_equivalent_units',
  'inverse_constant_work','measurement_known_total_remainder','time_offset_direction',
];
const asObject = (x:unknown): x is Record<string,unknown> => !!x && typeof x==='object' && !Array.isArray(x);
const text = (x:unknown):x is string => typeof x==='string' && x.trim().length>0 && x.length<=1000;
const isPromptAnchor = (x:unknown,prompt:string):x is string => text(x) && x.trim().length>=4 && prompt.includes(x);

/** Validates provenance and the exact reviewed-method set; never validates reviewer's identity. */
export function validateReviewedStructureEvidence(
  raw:unknown,
  envelope:TeachingContractConsumerEnvelope,
  availableMethodIds:readonly string[],
): {valid:true; evidence:ReviewedStructureEvidence; trace:B2EvidenceTrace} | {valid:false; issues:string[]} {
  const issues:string[]=[];
  if (!asObject(raw)) return {valid:false,issues:['REVIEW_OBJECT_REQUIRED']};
  const v=raw;
  if(v.schemaVersion!==REVIEWED_STRUCTURE_EVIDENCE_VERSION)issues.push('REVIEW_SCHEMA_MISMATCH');
  if(v.questionId!==envelope.questionId || v.selectorEnvelopeFingerprint!==envelope.payloadFingerprint)issues.push('QUESTION_OR_FINGERPRINT_MISMATCH');
  if(!text(v.reviewId)||!text(v.reviewerId)||!text(v.approvalRef)||v.approvalStatus!=='approved'||v.independentlyChecked!==true)
    issues.push('APPROVAL_PROVENANCE_INCOMPLETE');
  if(v.scope!=='question_structure_only')issues.push('SCOPE_UNSUPPORTED');
  const prompt=envelope.contract.content.prompt;
  if(!isPromptAnchor(v.sourceAnchor,prompt))issues.push('SOURCE_ANCHOR_NOT_IN_PROMPT');
  if(!relationKeys.includes(v.relation as ReviewedRelation))issues.push('RELATION_UNSUPPORTED');
  if(!['not_reviewed','core','enrichment','requires_review'].includes(v.curriculumReview as string))issues.push('CURRICULUM_REVIEW_INVALID');
  if(!Array.isArray(v.methodJudgements)||v.methodJudgements.length===0)issues.push('METHOD_JUDGEMENTS_REQUIRED');
  else {
    const known=new Set(availableMethodIds), seen=new Set<string>();
    for(const m of v.methodJudgements) {
      if(!asObject(m)||!text(m.methodId)||!known.has(m.methodId)||seen.has(m.methodId)) {
        issues.push('UNKNOWN_OR_DUPLICATE_REVIEWED_METHOD');continue;
      }
      seen.add(m.methodId);
      if(!['compatible','incompatible'].includes(m.structuralFit as string))issues.push('INVALID_STRUCTURAL_FIT');
      if(m.sourceKind!=='question_prompt'||!isPromptAnchor(m.promptAnchor,prompt))issues.push('METHOD_ANCHOR_NOT_IN_PROMPT');
      if(!text(m.rationale)||m.rationale.trim().length<12)issues.push('METHOD_RATIONALE_REQUIRED');
    }
  }
  if(issues.length)return {valid:false,issues:[...new Set(issues)]};
  const evidence=raw as ReviewedStructureEvidence;
  return {valid:true,evidence,trace:{schemaVersion:REVIEWED_STRUCTURE_EVIDENCE_VERSION,
    reviewId:evidence.reviewId,relation:evidence.relation,curriculumReview:evidence.curriculumReview,
    suppressedStructureMethods:evidence.methodJudgements.filter(m=>m.structuralFit==='incompatible').map(m=>m.methodId).sort(),
    affirmedStructureMethods:evidence.methodJudgements.filter(m=>m.structuralFit==='compatible').map(m=>m.methodId).sort(),
    diagramAccuracy:'not_evaluated',answerCorrectness:'not_evaluated'}};
}
