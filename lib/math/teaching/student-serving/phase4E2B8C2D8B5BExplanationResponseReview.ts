/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8B-5B.
 * OFFLINE, pure, fail-closed review of an untrusted specialist explanation.
 * NO network, model invocation, secrets, Supabase, persistence or approvals.
 *
 * This checks JSON/identity/stages through 8B-3, then offers a narrowly scoped
 * arithmetic cross-check against CALLER-SUPPLIED facts. The provenance of
 * those facts is NOT established here. Never treat a match as proof that the
 * question was read securely or the natural-language reasoning is correct.
 */
import {
  inspectOfflineSpecialistProviderRequest,
} from './phase4E2B8C2D8B5ASpecialistProviderContract';
import {
  SPECIALIST_CAPTURE_CONTRACT_VERSION,
  inspectOfflineSpecialistExplanationStructure,
} from './phase4E2B8C2D8B3ExplanationCaptureContract';

/** Runtime Node.js supports BigInt; declare its callable form for ES2017 libs. */
declare const BigInt: (value: number | string | boolean) => bigint;

export const SPECIALIST_RESPONSE_REVIEW_VERSION = '8C2D8B5B.v1' as const;

type Rec = Record<string, unknown>;
const record = (x: unknown): x is Rec => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = (v: Rec, expected: readonly string[]): boolean =>
  Object.keys(v).length === expected.length && expected.every(k => Object.prototype.hasOwnProperty.call(v, k));
const positiveInteger = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) > 0 && (x as number) <= 1_000_000;
const signedInteger = (x: unknown): x is number => Number.isSafeInteger(x) && Math.abs(x as number) <= 1_000_000;
const noSecret = (x: unknown): boolean => typeof x === 'string' && /^[0-9a-f]{64}$/i.test(x);

export type ReviewReason =
  | 'INVALID_PROVIDER_REQUEST'
  | 'RESPONSE_MUST_BE_JSON_STRING'
  | 'RESPONSE_TOO_LARGE'
  | 'RESPONSE_NOT_JSON'
  | 'RESPONSE_DUPLICATE_KEYS'
  | 'RESPONSE_STRUCTURE_INVALID'
  | 'RESPONSE_IDENTITY_OR_STAGES_INVALID'
  | 'ARITHMETIC_FACTS_INVALID'
  | 'ARITHMETIC_ANSWER_MISMATCH'
  | 'STRUCTURE_ONLY_MATH_REVIEW_REQUIRED'
  | 'SUPPLIED_FACTS_ARITHMETIC_CONSISTENT_REVIEW_REQUIRED'
  | 'SUPPLIED_FACTS_ANSWER_NOT_MACHINE_READABLE';

export type OfflineResponseReview = Readonly<{
  status: 'blocked' | 'structure_valid_review_pending';
  reasonCode: ReviewReason;
  reviewSchemaVersion: typeof SPECIALIST_RESPONSE_REVIEW_VERSION;
  specialistMethodId: string | null;
  stageCount: number;
  arithmeticStatus: 'none' | 'consistent_with_unverified_facts' | 'not_machine_readable' | 'mismatch';
  sourceAuthenticated: false;
  sourceFreshnessVerified: false;
  responseOriginVerified: false;
  providerInvocationAllowed: false;
  providerCalled: false;
  mathematicalCorrectnessVerified: false;
  reasoningVerified: false;
  visualsRenderedVerified: false;
  educatorApproved: false;
  captureStored: false;
  learnerReleaseAllowed: false;
}>;

const result = (
  reasonCode: ReviewReason,
  status: OfflineResponseReview['status'] = 'blocked',
  methodId: string | null = null,
  stageCount = 0,
  arithmeticStatus: OfflineResponseReview['arithmeticStatus'] = 'none',
): OfflineResponseReview => Object.freeze({
  status, reasonCode, reviewSchemaVersion: SPECIALIST_RESPONSE_REVIEW_VERSION,
  specialistMethodId: methodId, stageCount, arithmeticStatus,
  sourceAuthenticated: false as const, sourceFreshnessVerified: false as const,
  responseOriginVerified: false as const, providerInvocationAllowed: false as const,
  providerCalled: false as const, mathematicalCorrectnessVerified: false as const,
  reasoningVerified: false as const, visualsRenderedVerified: false as const,
  educatorApproved: false as const, captureStored: false as const,
  learnerReleaseAllowed: false as const,
});

/**
 * JSON.parse permits repeated property names. Reject them by scanning the
 * lexical property keys at each object depth (including nested objects).
 * JSON.parse separately checks the full JSON grammar.
 */
function duplicateKeys(json: string): boolean {
  const stack: Array<{ object: boolean; names: Set<string> }> = [];
  for (let i = 0; i < json.length;) {
    const c = json[i];
    if (c === '{' || c === '[') {
      stack.push({ object: c === '{', names: new Set<string>() }); i++; continue;
    }
    if (c === '}' || c === ']') { stack.pop(); i++; continue; }
    if (c !== '"') { i++; continue; }
    const start = i++;
    let escaped = false;
    for (; i < json.length; i++) {
      const char = json[i];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') { i++; break; }
    }
    let j = i;
    while (/\s/.test(json[j] || '') && j < json.length) j++;
    if (json[j] === ':' && stack.length && stack[stack.length - 1].object) {
      const name = JSON.parse(json.slice(start, i)) as string;
      const current = stack[stack.length - 1].names;
      if (current.has(name)) return true;
      current.add(name);
    }
  }
  return false;
}

/** Validated numeric answer only, optionally followed by simple unit text.
 * Elaborated prose stays in manual review instead of being guessed by regex. */
function numericAnswer(answer: unknown): bigint | null {
  if (typeof answer !== 'string') return null;
  const match = /^\s*([0-9]{1,15})(?:\s+(?:[a-zA-Z]{1,12}))?\s*$/.exec(answer);
  return match ? BigInt(match[1]) : null;
}

type MathMatch = 'consistent' | 'mismatch' | 'unreadable' | 'invalid';
/**
 * Witnesses are UNVERIFIED INPUT. They MUST be built by a trusted resolver in
 * a later phase, never accepted as an authorisation token or model claim.
 * Every witness repeats source identity and method to prevent accidental mixups.
 */
function arithmeticComparison(request: Rec, output: Rec, supplied: unknown): MathMatch {
  if (!record(supplied) || !record(request.source) || !record(request.teaching) ||
      !record(supplied.source) ||
      !keys(supplied.source, ['questionId', 'questionVersion', 'fingerprintSha256']) ||
      supplied.source.questionId !== request.source.questionId ||
      supplied.source.questionVersion !== request.source.questionVersion ||
      supplied.source.fingerprintSha256 !== request.source.fingerprintSha256 ||
      !noSecret(supplied.source.fingerprintSha256) || supplied.methodId !== request.teaching.methodId)
    return 'invalid';

  const kind = supplied.kind;
  let expected: bigint;
  if (kind === 'equal_spacing') {
    if (!keys(supplied, ['source','methodId','kind','startIndex','endIndex','gapLength']) ||
        request.teaching.methodId !== 'heuristic.multi_step.equal_spacing_interval_count' ||
        !positiveInteger(supplied.startIndex) || !positiveInteger(supplied.endIndex) ||
        (supplied.endIndex as number) <= (supplied.startIndex as number) ||
        !positiveInteger(supplied.gapLength)) return 'invalid';
    expected = BigInt((supplied.endIndex as number) - (supplied.startIndex as number)) * BigInt(supplied.gapLength as number);
  } else if (kind === 'multiplicative_chain') {
    if (!keys(supplied, ['source','methodId','kind','relativeUnits','total','targetIndex']) ||
        request.teaching.methodId !== 'heuristic.multi_step.multiplicative_comparison_chain' ||
        !Array.isArray(supplied.relativeUnits) || supplied.relativeUnits.length < 2 || supplied.relativeUnits.length > 8 ||
        !supplied.relativeUnits.every(positiveInteger) || !positiveInteger(supplied.total) ||
        !Number.isSafeInteger(supplied.targetIndex) || (supplied.targetIndex as number) < 0 ||
        (supplied.targetIndex as number) >= supplied.relativeUnits.length) return 'invalid';
    const sum = (supplied.relativeUnits as number[]).reduce((a, b) => a + BigInt(b), BigInt(0));
    const scaled = BigInt(supplied.total as number) * BigInt(supplied.relativeUnits[supplied.targetIndex as number]);
    if (sum === BigInt(0) || scaled % sum !== BigInt(0)) return 'invalid';
    expected = scaled / sum;
  } else if (kind === 'changing_ratio') {
    if (!keys(supplied, ['source','methodId','kind','beforeA','beforeB','afterA','afterB','deltaA','deltaB','target']) ||
        request.teaching.methodId !== 'ratio.relationship.before_after_change' ||
        !positiveInteger(supplied.beforeA) || !positiveInteger(supplied.beforeB) ||
        !positiveInteger(supplied.afterA) || !positiveInteger(supplied.afterB) ||
        !signedInteger(supplied.deltaA) || !signedInteger(supplied.deltaB) ||
        !['original_total','original_a','original_b'].includes(String(supplied.target))) return 'invalid';
    const a = BigInt(supplied.beforeA as number), b = BigInt(supplied.beforeB as number);
    const c = BigInt(supplied.afterA as number), d = BigInt(supplied.afterB as number);
    const da = BigInt(supplied.deltaA as number), db = BigInt(supplied.deltaB as number);
    const divisor = d * a - c * b;
    const numerator = c * db - d * da;
    if (divisor === BigInt(0) || numerator === BigInt(0) || numerator % divisor !== BigInt(0)) return 'invalid';
    const unit = numerator / divisor;
    if (unit <= BigInt(0) || a * unit + da <= BigInt(0) || b * unit + db <= BigInt(0)) return 'invalid';
    expected = supplied.target === 'original_a' ? a * unit :
      supplied.target === 'original_b' ? b * unit : (a + b) * unit;
  } else {
    return 'invalid';
  }
  const answer = numericAnswer(output.finalAnswer);
  return answer === null ? 'unreadable' : answer === expected ? 'consistent' : 'mismatch';
}

/**
 * Accepts a bounded RAW JSON string, never a model SDK object, markdown,
 * streaming partial or browser-provided authorisation. Metadata-only output.
 */
export function inspectOfflineSpecialistProviderResponse(
  proposedRequest: unknown,
  rawResponse: unknown,
  suppliedArithmeticFacts?: unknown,
): OfflineResponseReview {
  const shape = inspectOfflineSpecialistProviderRequest(proposedRequest);
  if (shape.status !== 'candidate_shape_valid_provider_disabled' || !record(proposedRequest) ||
      !record(proposedRequest.source) || !record(proposedRequest.teaching) || !record(proposedRequest.question))
    return result('INVALID_PROVIDER_REQUEST');
  const methodId = shape.methodId;
  if (typeof rawResponse !== 'string') return result('RESPONSE_MUST_BE_JSON_STRING');
  // JSON is always private. No original source / response content is logged or returned.
  if (rawResponse.length === 0 || rawResponse.length > 24_000) return result('RESPONSE_TOO_LARGE');
  let response: unknown;
  try {
    response = JSON.parse(rawResponse);
  } catch (_) {
    return result('RESPONSE_NOT_JSON');
  }
  if (duplicateKeys(rawResponse)) return result('RESPONSE_DUPLICATE_KEYS');
  const contract = {
    status: 'offline_contract_ready_capture_disabled',
    schemaVersion: SPECIALIST_CAPTURE_CONTRACT_VERSION,
    questionId: proposedRequest.source.questionId,
    questionVersion: proposedRequest.source.questionVersion,
    methodId: proposedRequest.teaching.methodId,
    requiredStages: proposedRequest.teaching.requiredStages,
    providerInvocationAllowed: false,
    learnerReleaseAllowed: false,
    sourceAuthenticated: false,
    sourceFingerprintVerified: false,
  };
  const structure = inspectOfflineSpecialistExplanationStructure(contract, response);
  if (structure.status !== 'structure_valid_review_pending') {
    return result(structure.reasonCode === 'OUTPUT_IDENTITY_MISMATCH' || structure.reasonCode === 'OUTPUT_STAGE_MISMATCH'
      ? 'RESPONSE_IDENTITY_OR_STAGES_INVALID' : 'RESPONSE_STRUCTURE_INVALID');
  }
  const steps = structure.stepCount;
  if (!record(response)) return result('RESPONSE_STRUCTURE_INVALID');
  if (suppliedArithmeticFacts === undefined)
    return result('STRUCTURE_ONLY_MATH_REVIEW_REQUIRED', 'structure_valid_review_pending', methodId, steps);
  const math = arithmeticComparison(proposedRequest, response, suppliedArithmeticFacts);
  if (math === 'invalid') return result('ARITHMETIC_FACTS_INVALID');
  if (math === 'mismatch') return result('ARITHMETIC_ANSWER_MISMATCH', 'blocked', null, 0, 'mismatch');
  return math === 'unreadable'
    ? result('SUPPLIED_FACTS_ANSWER_NOT_MACHINE_READABLE','structure_valid_review_pending',methodId,steps,'not_machine_readable')
    : result('SUPPLIED_FACTS_ARITHMETIC_CONSISTENT_REVIEW_REQUIRED','structure_valid_review_pending',methodId,steps,'consistent_with_unverified_facts');
}
