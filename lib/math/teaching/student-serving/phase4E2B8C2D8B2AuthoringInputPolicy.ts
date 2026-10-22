/**
 * Phase 8C-2D.8B-2: narrow, pure input policy for a PRIVATE staff-only bridge.
 *
 * Never pass the returned draft directly to an AI provider or a client.
 * The authoring-time Luna provider has a different data contract and can send
 * question content and correct answers out of the server. That outbound path
 * is NOT approved by this policy.
 */

type UnknownRecord = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (v: unknown): v is UnknownRecord => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string => typeof v === 'string' ? v.trim() : '';

export const TRUSTED_AUTHORING_MAPPING_VERSION = '8C2D8B2.v1' as const;

export type TrustedAuthoringInputReview =
  | Readonly<{ status: 'blocked'; reasonCode:
      'SOURCE_SHAPE_INVALID' | 'IDENTITY_OR_VERSION_INVALID' | 'QUESTION_NOT_TEXT_ONLY' |
      'QUESTION_TEXT_UNSUPPORTED' | 'LEVEL_OR_DIFFICULTY_INVALID' | 'QUESTION_TYPE_UNSUPPORTED' }>
  | Readonly<{
      status: 'mapped_private_only';
      mappingVersion: typeof TRUSTED_AUTHORING_MAPPING_VERSION;
      sourceVersion: number;
      /** Only for server memory, NEVER log, serialize to API, or send to a provider. */
      privateDraft: Readonly<{
        id: string; subject: 'math'; primary_level: number; topic_title: string;
        skill: string; difficulty: number | null; question_type: string;
        instruction: string; prompt: string;
        content: Readonly<Record<string, never>>;
        answer_data: null; correct_answer: null; explanation: null;
      }>;
      providerInvocationAllowed: false;
      learnerReleaseAllowed: false;
    }>;

const stop = (reasonCode: Extract<TrustedAuthoringInputReview,{status:'blocked'}>['reasonCode']): TrustedAuthoringInputReview =>
  Object.freeze({status:'blocked' as const,reasonCode});

/**
 * Input must be a result of the authenticated source resolver, never a user
 * request or an arbitrary database-looking object. Enforcement of provenance
 * is the caller's responsibility; this policy verifies the narrow data shape.
 */
export function mapTrustedQuestionToPrivateAuthoringDraft(
  question: unknown,
  expectedQuestionId: string,
  expectedSourceVersion: number,
): TrustedAuthoringInputReview {
  if (!isRecord(question) || !UUID.test(expectedQuestionId)) return stop('SOURCE_SHAPE_INVALID');
  if (question.id !== expectedQuestionId || question.subject !== 'math' ||
      !Number.isSafeInteger(expectedSourceVersion) || expectedSourceVersion < 1)
    return stop('IDENTITY_OR_VERSION_INVALID');

  // Phase 8B-2 supports only conservative text-only mapping. No options,
  // external diagrams, nested content, assets, or media may be dropped silently.
  const content = question.content;
  if (!(content === null || content === undefined || content === '' ||
        (isRecord(content) && Object.keys(content).length === 0)) ||
      question.stimulus != null || question.assets != null)
    return stop('QUESTION_NOT_TEXT_ONLY');

  const prompt = str(question.prompt);
  const instruction = str(question.instruction);
  if (prompt.length < 10 || prompt.length > 1500 || instruction.length > 400 ||
      /[<>\x00-\x1f]/.test(prompt) || /[<>\x00-\x1f]/.test(instruction))
    return stop('QUESTION_TEXT_UNSUPPORTED');

  const level = question.primary_level;
  const difficulty = question.difficulty;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 6 ||
      !(difficulty == null || (typeof difficulty === 'number' && Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5)))
    return stop('LEVEL_OR_DIFFICULTY_INVALID');

  // No claim that every old question alias is suitable for the visual authoring
  // pipeline. The trusted method review may recognize more shapes than this.
  const kind = str(question.question_type).toLowerCase();
  if (!['open_ended','short_answer','numeric','numeric_unit','fraction','money','short_text','fill_blank'].includes(kind))
    return stop('QUESTION_TYPE_UNSUPPORTED');

  const draft = Object.freeze({
    id: expectedQuestionId,
    subject: 'math' as const,
    primary_level: level,
    topic_title: str(question.topic_title).slice(0,160),
    skill: str(question.skill).slice(0,160),
    difficulty: difficulty == null ? null : difficulty as number,
    question_type: kind,
    instruction, prompt,
    content: Object.freeze({}) as Readonly<Record<string, never>>,
    // Intentionally omitted authority: never map question.answer_data,
    // content.correct_answer, model explanations, or hidden solutions.
    answer_data: null, correct_answer: null, explanation: null,
  });
  return Object.freeze({
    status:'mapped_private_only' as const,
    mappingVersion:TRUSTED_AUTHORING_MAPPING_VERSION,
    sourceVersion:expectedSourceVersion,
    privateDraft:draft,
    providerInvocationAllowed:false as const,
    learnerReleaseAllowed:false as const,
  });
}
