/**
 * DREAMSCAPE ONE — 8C-2D.8B-4: disabled-by-default generation preparation.
 * Pure contract inspection ONLY. No provider, filesystem, database or network.
 *
 * An arbitrary mapped object is NOT evidence of an authorised staff session.
 * This policy MUST be composed inside a freshly authenticated and source-fresh
 * server workflow before any future invocation; such invocation is NOT here.
 */
import {
  inspectOfflineSpecialistExplanationInput,
  inspectOfflineSpecialistExplanationStructure,
} from './phase4E2B8C2D8B3ExplanationCaptureContract';

export const GENERATION_PREPARATION_VERSION = '8C2D8B4.v1' as const;
const EXPECTED_CONTROL = 'disabled_dry_run' as const;

const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v, k));

export type DisabledReason =
  'DRY_RUN_CONTROL_REQUIRED' | 'INPUT_NOT_ELIGIBLE' | 'CANDIDATE_NOT_STRUCTURED';
export type DisabledPreparation = Readonly<{
  status: 'blocked' | 'prepared_provider_disabled' | 'candidate_structure_review_pending';
  reasonCode: DisabledReason | 'DRY_RUN_READY_NO_INVOCATION' | 'OUTPUT_SHAPE_ONLY';
  policyVersion: typeof GENERATION_PREPARATION_VERSION;
  specialistMethodId: string | null;
  expectedStageCount: number;
  candidateStructureChecked: boolean;
  providerInvocationAllowed: false;
  providerRequestCreated: false;
  actualNovaOutputCaptured: false;
  sourceAuthenticated: false;
  sourceFreshnessVerified: false;
  mathematicalCorrectnessVerified: false;
  educatorApproved: false;
  learnerReleaseAllowed: false;
  persisted: false;
}>;
const result = (
  status: DisabledPreparation['status'],
  reasonCode: DisabledPreparation['reasonCode'],
  methodId: string | null = null,
  stages = 0,
  candidateStructureChecked = false,
): DisabledPreparation => Object.freeze({
  status, reasonCode, policyVersion: GENERATION_PREPARATION_VERSION,
  specialistMethodId: methodId, expectedStageCount: stages,
  candidateStructureChecked,
  providerInvocationAllowed: false as const,
  providerRequestCreated: false as const,
  actualNovaOutputCaptured: false as const,
  sourceAuthenticated: false as const,
  sourceFreshnessVerified: false as const,
  mathematicalCorrectnessVerified: false as const,
  educatorApproved: false as const,
  learnerReleaseAllowed: false as const,
  persisted: false as const,
});

/**
 * Accept ONLY explicit offline controls. Fields such as invoke, token,
 * approval, provider, sourceVerified or store are always rejected.
 */
function safeControls(controls: unknown): boolean {
  return record(controls) && exact(controls, ['mode']) && controls.mode === EXPECTED_CONTROL;
}

/**
 * Outputs metadata ONLY. Intentionally does not assemble an outbound prompt,
 * provide answer data, or call a model. No caller may enable invocation.
 */
export function prepareDisabledSpecialistGeneration(
  mapped: unknown, methodId: unknown, controls: unknown,
): DisabledPreparation {
  if (!safeControls(controls)) return result('blocked', 'DRY_RUN_CONTROL_REQUIRED');
  const inspection = inspectOfflineSpecialistExplanationInput(mapped, methodId);
  if (inspection.status !== 'offline_contract_ready_capture_disabled')
    return result('blocked', 'INPUT_NOT_ELIGIBLE');
  return result('prepared_provider_disabled', 'DRY_RUN_READY_NO_INVOCATION',
    inspection.methodId, inspection.requiredStages.length);
}

/**
 * Validate a supplied OFFLINE example's structure with the existing 8B-3
 * validator. This does not verify its origin, arithmetic, diagrams or approval.
 * Never returns question text, solution prose, output or model credentials.
 */
export function inspectDisabledOfflineCandidate(
  mapped: unknown, methodId: unknown, controls: unknown, candidate: unknown,
): DisabledPreparation {
  const preflight = prepareDisabledSpecialistGeneration(mapped, methodId, controls);
  if (preflight.status === 'blocked') return preflight;
  const contract = inspectOfflineSpecialistExplanationInput(mapped, methodId);
  if (contract.status !== 'offline_contract_ready_capture_disabled')
    return result('blocked', 'INPUT_NOT_ELIGIBLE');
  const check = inspectOfflineSpecialistExplanationStructure(contract, candidate);
  if (check.status !== 'structure_valid_review_pending')
    return result('blocked', 'CANDIDATE_NOT_STRUCTURED');
  return result('candidate_structure_review_pending', 'OUTPUT_SHAPE_ONLY',
    contract.methodId, contract.requiredStages.length, true);
}
