/** Phase 4C-3: deterministic, optional supporting-method composition. No teaching-step execution. */
import type { StrategySelection } from './types';
import { validateStrategySelection } from './validation';

export const METHOD_COMPOSITION_SCHEMA_VERSION = '4C-3.1' as const;
export const METHOD_COMPOSER_VERSION = '4C-3.1' as const;
export type CompositionStatus = 'composed' | 'primary_only' | 'blocked';
export type SupportRole = 'prerequisite_bridge' | 'representation_bridge' | 'reasoning_bridge' | 'verification';
export type SupportIssueCode = 'SELECTION_INVALID' | 'PRIMARY_NOT_SELECTED' | 'INPUT_INVALID' | 'CANDIDATE_INVALID' | 'NO_JUSTIFIED_SUPPORT';

/** Evidence must be established by a trusted 4B adapter. No text similarity or inferred matches. */
export interface SupportEvidence {
  methodId: string;
  familyId: string;
  active: boolean;
  eligibleForLearner: boolean;
  mandatoryPrerequisitesSatisfied: boolean;
  /** An upstream-confirmed relation to the selected primary method. */
  relationToPrimaryVerified: boolean;
  /** Indicates this method contributes distinct, needed teaching value. */
  distinctContributionVerified: boolean;
  /** True only when the upstream Teaching Contract requires this bridge/check. */
  requiredForThisQuestion: boolean;
  /** True when the method is already fully covered by primary or another selected support. */
  redundantWithPrimary: boolean;
  role: SupportRole;
  /** Deterministic preference from the 4B adapter (0–100), not a learner answer. */
  evidenceStrength: number;
  /** Smaller is simpler; nonnegative integer. */
  complexity: number;
  /** Stable machine-readable rationale code; no arbitrary narration. */
  reasonCode: string;
}
export interface CompositionInput {
  selection: StrategySelection;
  /** Explicit 4B-derived candidates (not limited to the primary-family 4C-2 shortlist). */
  supportCandidates: readonly SupportEvidence[];
}
export interface ComposedSupport {
  methodId: string;
  familyId: string;
  role: SupportRole;
  reasonCode: string;
  position: number;
}
export interface MethodComposition {
  schemaVersion: '4C-3.1';
  composerVersion: '4C-3.1';
  status: CompositionStatus;
  questionId: string;
  primaryMethodId: string | null;
  /** Ordered execution intention: prerequisites first, then primary, then checks. */
  methodSequence: string[];
  supportingMethodIds: string[];
  supports: ComposedSupport[];
  issues: { code: SupportIssueCode; detail: string }[];
  sourceSelectionSchema: '4C.1';
  sourceSelectorImplementation: string;
  sourceTeachingContractFingerprint: string;
}

const validText = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const roles: readonly SupportRole[] = ['prerequisite_bridge','representation_bridge','reasoning_bridge','verification'];
const validEvidence = (e: SupportEvidence): boolean => !!e && validText(e.methodId) && validText(e.familyId) &&
  typeof e.active === 'boolean' && typeof e.eligibleForLearner === 'boolean' &&
  typeof e.mandatoryPrerequisitesSatisfied === 'boolean' && typeof e.relationToPrimaryVerified === 'boolean' &&
  typeof e.distinctContributionVerified === 'boolean' && typeof e.requiredForThisQuestion === 'boolean' &&
  typeof e.redundantWithPrimary === 'boolean' && roles.includes(e.role) &&
  Number.isFinite(e.evidenceStrength) && e.evidenceStrength >= 0 && e.evidenceStrength <= 100 &&
  Number.isSafeInteger(e.complexity) && e.complexity >= 0 && validText(e.reasonCode) &&
  /^[A-Z][A-Z0-9_]*$/.test(e.reasonCode);
const order = (role: SupportRole): number => roles.indexOf(role);
const beforePrimary = (role: SupportRole): boolean => role !== 'verification';

export function validateMethodComposition(value: MethodComposition, selection?: StrategySelection): {valid:boolean; issues:string[]} {
  const issues: string[]=[];
  if (!value || typeof value !== 'object') return {valid:false,issues:['INVALID_OBJECT']};
  if (value.schemaVersion !== METHOD_COMPOSITION_SCHEMA_VERSION || value.composerVersion !== METHOD_COMPOSER_VERSION) issues.push('SCHEMA_INVALID');
  if (!['composed','primary_only','blocked'].includes(value.status)) issues.push('STATUS_INVALID');
  if (!validText(value.questionId) || !validText(value.sourceSelectorImplementation) ||
      !validText(value.sourceTeachingContractFingerprint) || value.sourceSelectionSchema!=='4C.1') issues.push('PROVENANCE_INVALID');
  if (!Array.isArray(value.supportingMethodIds) || !Array.isArray(value.supports) || !Array.isArray(value.methodSequence) || !Array.isArray(value.issues))
    return {valid:false,issues:[...issues,'ARRAYS_INVALID']};
  if (value.supports.length > 2 || value.supportingMethodIds.length > 2 ||
      new Set(value.supportingMethodIds).size !== value.supportingMethodIds.length) issues.push('SUPPORT_LIMIT');
  if (value.supports.some((x,i)=> x.methodId!==value.supportingMethodIds[i] || x.position!==i+1 ||
      !validText(x.familyId) || !validText(x.reasonCode) || !roles.includes(x.role))) issues.push('SUPPORTS_MISMATCH');
  if (value.status==='blocked') {
    if (value.primaryMethodId!==null || value.supports.length || value.methodSequence.length || !value.issues.length) issues.push('BLOCKED_FIELDS_INVALID');
  } else {
    if (!validText(value.primaryMethodId) || value.issues.length>0) issues.push('SUCCESS_FIELDS_INVALID');
    if (value.supportingMethodIds.includes(value.primaryMethodId!)) issues.push('SELF_SUPPORT');
    if (value.status==='primary_only' && value.supports.length!==0) issues.push('PRIMARY_ONLY_HAS_SUPPORT');
    if (value.status==='composed' && value.supports.length===0) issues.push('COMPOSED_WITHOUT_SUPPORT');
    const expected=[...value.supports.filter(x=>beforePrimary(x.role)).map(x=>x.methodId),value.primaryMethodId!,
      ...value.supports.filter(x=>!beforePrimary(x.role)).map(x=>x.methodId)];
    if (JSON.stringify(expected)!==JSON.stringify(value.methodSequence)) issues.push('SEQUENCE_INVALID');
  }
  if (selection) {
    if (!validateStrategySelection(selection).valid || selection.questionId!==value.questionId ||
        selection.provenance.selectorImplementation!==value.sourceSelectorImplementation ||
        selection.provenance.teachingContractFingerprint!==value.sourceTeachingContractFingerprint ||
        (value.status!=='blocked' && (selection.status!=='selected' || selection.primaryMethodId!==value.primaryMethodId)))
      issues.push('SOURCE_MISMATCH');
  }
  return {valid:issues.length===0,issues:[...new Set(issues)]};
}

/** Fail closed for malformed evidence; never use LLM inference or assume a support is necessary. */
export function composeTeachingMethods(input: CompositionInput): MethodComposition {
  const selection=input?.selection;
  const base={schemaVersion:METHOD_COMPOSITION_SCHEMA_VERSION,composerVersion:METHOD_COMPOSER_VERSION,
    questionId:selection?.questionId || 'invalid',sourceSelectionSchema:'4C.1' as const,
    sourceSelectorImplementation:selection?.provenance?.selectorImplementation || 'invalid',
    sourceTeachingContractFingerprint:selection?.provenance?.teachingContractFingerprint || 'invalid'};
  const blocked=(code:SupportIssueCode,detail:string):MethodComposition=>({...base,status:'blocked',primaryMethodId:null,
    supportingMethodIds:[],supports:[],methodSequence:[],issues:[{code,detail}]});
  if (!selection || !validateStrategySelection(selection).valid) return blocked('SELECTION_INVALID','4C selection failed validation');
  if (selection.status!=='selected' || !validText(selection.primaryMethodId)) return blocked('PRIMARY_NOT_SELECTED','Selection has no confirmed primary method');
  const candidates=input?.supportCandidates;
  if (!Array.isArray(candidates) || candidates.some(e=>!validEvidence(e)) ||
    new Set(candidates.map(e=>e.methodId)).size!==candidates.length)
    return blocked('INPUT_INVALID','Invalid, duplicate or incomplete support evidence');
  // No support by default. Each support requires affirmative independent justification.
  const qualified=candidates.filter(x=>x.methodId!==selection.primaryMethodId && x.active &&
    x.eligibleForLearner && x.mandatoryPrerequisitesSatisfied && x.relationToPrimaryVerified &&
    x.distinctContributionVerified && x.requiredForThisQuestion && !x.redundantWithPrimary);
  // Do not stack methods for the same teaching role; prefer stronger evidence then less complexity.
  qualified.sort((a,b)=>order(a.role)-order(b.role) || b.evidenceStrength-a.evidenceStrength ||
    a.complexity-b.complexity || (a.methodId<b.methodId?-1:a.methodId>b.methodId?1:0));
  const uniqueRoles=new Set<SupportRole>();
  const selected:SupportEvidence[]=[];
  for (const candidate of qualified) {
    if (uniqueRoles.has(candidate.role)) continue;
    selected.push(candidate);uniqueRoles.add(candidate.role);
    if (selected.length===2) break;
  }
  const supports=selected.map((s,i):ComposedSupport=>({methodId:s.methodId,familyId:s.familyId,
    role:s.role,reasonCode:s.reasonCode,position:i+1}));
  const result:MethodComposition={...base,status:supports.length?'composed':'primary_only',
    primaryMethodId:selection.primaryMethodId,supportingMethodIds:supports.map(s=>s.methodId),supports,
    methodSequence:[...supports.filter(x=>beforePrimary(x.role)).map(x=>x.methodId),selection.primaryMethodId,
      ...supports.filter(x=>!beforePrimary(x.role)).map(x=>x.methodId)],issues:[]};
  const checked=validateMethodComposition(result,selection);
  return checked.valid?result:blocked('CANDIDATE_INVALID','Output validation failed: '+checked.issues.join(','));
}
