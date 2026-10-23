/**
 * DREAMSCAPE ONE — 8C-2D.8B-5A.
 * Provider-neutral, OFFLINE-only interface for a potential specialist explanation service.
 *
 * Unlike MathTeachingAIProvider (visual lesson planner), this contract describes
 * a complete structured explanation. This file DOES NOT authorise provider use.
 * Shape validation cannot prove authentication, source freshness or correct maths.
 */
export const SPECIALIST_PROVIDER_SCHEMA_VERSION = '8C2D8B5A.v1' as const;
export const SPECIALIST_OUTPUT_SCHEMA_VERSION = '8C2D8B3.v1' as const;

const METHOD_STAGES = {
  'heuristic.multi_step.equal_spacing_interval_count': [
    'represent_positions', 'count_intervals', 'calculate_distance', 'check_small_case',
  ],
  'heuristic.multi_step.multiplicative_comparison_chain': [
    'identify_reference', 'equivalent_units', 'find_one_unit', 'scale_target', 'check_comparisons',
  ],
  'ratio.relationship.before_after_change': [
    'identify_quantities', 'represent_before', 'apply_changes', 'enforce_after_ratio', 'solve_and_verify',
  ],
} as const;
export type SpecialistProviderMethodId = keyof typeof METHOD_STAGES;

export type SpecialistProviderRequest = Readonly<{
  schemaVersion: typeof SPECIALIST_PROVIDER_SCHEMA_VERSION;
  source: Readonly<{
    questionId: string;
    questionVersion: number;
    fingerprintSha256: string;
  }>;
  question: Readonly<{
    primaryLevel: number;
    prompt: string;
    instruction: string;
  }>;
  teaching: Readonly<{
    methodId: SpecialistProviderMethodId;
    requiredStages: readonly string[];
  }>;
  controls: Readonly<{
    mode: 'offline_contract_check_only';
    store: false;
    learnerRelease: false;
  }>;
}>;

/** The future provider may return untrusted JSON, NEVER an approved answer. */
export interface SpecialistExplanationAIProvider {
  readonly providerName: string;
  readonly capability: 'specialist_explanation';
  generateForStaffReview(request: SpecialistProviderRequest): Promise<unknown>;
}

export type ProviderShapeCheck = Readonly<{
  status: 'blocked' | 'candidate_shape_valid_provider_disabled';
  reasonCode:
    | 'INVALID_REQUEST_SHAPE'
    | 'INVALID_QUESTION_IDENTITY'
    | 'INVALID_METHOD_OR_STAGES'
    | 'UNSAFE_QUESTION_PAYLOAD'
    | 'OFFLINE_SHAPE_ONLY';
  schemaVersion: typeof SPECIALIST_PROVIDER_SCHEMA_VERSION;
  methodId: SpecialistProviderMethodId | null;
  requiredStageCount: number;
  sourceAuthenticated: false;
  sourceFreshnessVerified: false;
  providerInvocationAllowed: false;
  providerCalled: false;
  responseGenerated: false;
  mathematicalCorrectnessVerified: false;
  educatorApproved: false;
  learnerReleaseAllowed: false;
  persisted: false;
}>;

type RecordLike = Record<string, unknown>;
const record = (x: unknown): x is RecordLike =>
  x !== null && typeof x === 'object' && !Array.isArray(x);
const hasOnlyKeys = (x: RecordLike, keys: readonly string[]): boolean =>
  Object.keys(x).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(x, k));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fingerprint = /^[0-9a-f]{64}$/i;
const boundedText = (x: unknown, low: number, high: number): x is string =>
  typeof x === 'string' && x === x.trim() && x.length >= low && x.length <= high &&
  !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x) && !/<\s*\/?\s*[a-z][^>]*>/i.test(x);

const report = (
  reasonCode: ProviderShapeCheck['reasonCode'],
  methodId: SpecialistProviderMethodId | null = null,
  requiredStageCount = 0,
): ProviderShapeCheck => Object.freeze({
  status: reasonCode === 'OFFLINE_SHAPE_ONLY' ? 'candidate_shape_valid_provider_disabled' as const : 'blocked' as const,
  reasonCode,
  schemaVersion: SPECIALIST_PROVIDER_SCHEMA_VERSION,
  methodId, requiredStageCount,
  sourceAuthenticated: false as const,
  sourceFreshnessVerified: false as const,
  providerInvocationAllowed: false as const,
  providerCalled: false as const,
  responseGenerated: false as const,
  mathematicalCorrectnessVerified: false as const,
  educatorApproved: false as const,
  learnerReleaseAllowed: false as const,
  persisted: false as const,
});

/**
 * Checks an UNTRUSTED draft request's data shape only; it cannot be used as an
 * authorisation check or an outbound-data permit. Input prose never leaves via
 * the return value. Never call a model based solely on this check.
 */
export function inspectOfflineSpecialistProviderRequest(input: unknown): ProviderShapeCheck {
  if (!record(input) || !hasOnlyKeys(input, ['schemaVersion', 'source', 'question', 'teaching', 'controls']) ||
      input.schemaVersion !== SPECIALIST_PROVIDER_SCHEMA_VERSION ||
      !record(input.source) || !record(input.question) || !record(input.teaching) || !record(input.controls) ||
      !hasOnlyKeys(input.source, ['questionId','questionVersion','fingerprintSha256']) ||
      !hasOnlyKeys(input.question, ['primaryLevel','prompt','instruction']) ||
      !hasOnlyKeys(input.teaching, ['methodId','requiredStages']) ||
      !hasOnlyKeys(input.controls, ['mode','store','learnerRelease']) ||
      input.controls.mode !== 'offline_contract_check_only' || input.controls.store !== false ||
      input.controls.learnerRelease !== false)
    return report('INVALID_REQUEST_SHAPE');

  const source = input.source;
  const question = input.question;
  const teaching = input.teaching;
  if (typeof source.questionId !== 'string' || !uuid.test(source.questionId) ||
      !Number.isSafeInteger(source.questionVersion) || (source.questionVersion as number) < 1 ||
      typeof source.fingerprintSha256 !== 'string' || !fingerprint.test(source.fingerprintSha256))
    return report('INVALID_QUESTION_IDENTITY');

  if (typeof teaching.methodId !== 'string' || !Object.prototype.hasOwnProperty.call(METHOD_STAGES, teaching.methodId))
    return report('INVALID_METHOD_OR_STAGES');
  const methodId = teaching.methodId as SpecialistProviderMethodId;
  const expected = METHOD_STAGES[methodId] as readonly string[];
  if (!Array.isArray(teaching.requiredStages) ||
      teaching.requiredStages.length !== expected.length ||
      teaching.requiredStages.some((stage, i) => stage !== expected[i]))
    return report('INVALID_METHOD_OR_STAGES');

  const permittedLevels: Record<SpecialistProviderMethodId, readonly number[]> = {
    'heuristic.multi_step.equal_spacing_interval_count': [3,4,5,6],
    'heuristic.multi_step.multiplicative_comparison_chain': [4,5,6],
    'ratio.relationship.before_after_change': [5,6],
  };
  if (!Number.isSafeInteger(question.primaryLevel) ||
      !permittedLevels[methodId].includes(question.primaryLevel as number) ||
      !boundedText(question.prompt, 10, 1500) || !boundedText(question.instruction, 0, 400))
    return report('UNSAFE_QUESTION_PAYLOAD');
  return report('OFFLINE_SHAPE_ONLY', methodId, expected.length);
}
