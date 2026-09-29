export const MATH_AUTHORING_FINGERPRINT_VERSION = 1 as const;

export type MathAuthoringQuestionFingerprint = `maf${number}_${string}`;

type AnyRecord = Record<string, unknown>;

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normaliseScalar(value: unknown): CanonicalValue | undefined {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function fileLikeValue(value: AnyRecord): CanonicalValue | null {
  const name = typeof value.name === "string" ? value.name : null;
  const type = typeof value.type === "string" ? value.type : null;
  const size = typeof value.size === "number" && Number.isFinite(value.size) ? value.size : null;
  const lastModified =
    typeof value.lastModified === "number" && Number.isFinite(value.lastModified)
      ? value.lastModified
      : null;

  if (name === null && type === null && size === null && lastModified === null) return null;
  return {
    __file__: true,
    name,
    type,
    size,
    lastModified,
  };
}

function canonicalise(value: unknown, seen: Set<object>, depth = 0): CanonicalValue {
  if (depth > 24) return "[max-depth]";

  const scalar = normaliseScalar(value);
  if (scalar !== undefined) return scalar;

  if (Array.isArray(value)) {
    return value.map((item) => canonicalise(item, seen, depth + 1));
  }

  if (!isRecord(value)) return String(value ?? "");

  if (seen.has(value)) return "[circular]";
  seen.add(value);

  const maybeFile = fileLikeValue(value);
  const keys = Object.keys(value).sort();

  // Browser File objects generally expose metadata through non-enumerable
  // properties. Preserve that metadata when available so an unsaved media
  // change can still invalidate a proposal fingerprint.
  if (keys.length === 0 && maybeFile) {
    seen.delete(value);
    return maybeFile;
  }

  const result: { [key: string]: CanonicalValue } = {};
  for (const key of keys) {
    const item = value[key];
    if (
      typeof item === "undefined" ||
      typeof item === "function" ||
      typeof item === "symbol"
    ) {
      continue;
    }
    result[key] = canonicalise(item, seen, depth + 1);
  }

  seen.delete(value);
  return result;
}

function record(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return "";
}

function nullableNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === "" || value == null) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Build the complete authoring state used to determine whether an unaccepted
 * proposal still matches the editor state that produced it. This includes
 * current Math Visual / teaching ownership so comparison proposals cannot be
 * applied after the current authored content changes underneath them.
 */
export function buildMathAuthoringFingerprintSource(question: unknown) {
  const source = record(question);
  const content = record(source.content);

  return {
    subject: firstNonEmpty(source.subject, content.subject).toLowerCase(),
    primary_level: nullableNumber(source.primary_level, source.level),
    topic: firstNonEmpty(source.topic_title, source.topic, content.topic),
    skill: firstNonEmpty(source.skill, content.skill),
    difficulty: nullableNumber(source.difficulty),
    question_type: firstNonEmpty(source.question_type),
    instruction: typeof source.instruction === "string" ? source.instruction : "",
    prompt: firstNonEmpty(source.prompt, content.prompt, content.question),
    content,
    answer_data:
      source.answer_data ?? source.correct_answer ?? content.correct_answer ?? null,
    explanation: source.explanation ?? null,
    stimulus: source.stimulus ?? null,
    assets: source.assets ?? null,
  };
}

/**
 * Build only the semantic/learner-visible inputs that the generator depends on.
 * Generated Math Visual and visual-teaching outputs are excluded so the same
 * fingerprint remains valid after a proposal is accepted into the local draft.
 */
export function buildMathAuthoringGenerationSource(question: unknown) {
  const source = record(question);
  const rawContent = record(source.content);
  const content: AnyRecord = { ...rawContent };
  delete content.math_visual;
  delete content.teaching;

  return {
    subject: firstNonEmpty(source.subject, content.subject).toLowerCase(),
    primary_level: nullableNumber(source.primary_level, source.level),
    topic: firstNonEmpty(source.topic_title, source.topic, content.topic),
    skill: firstNonEmpty(source.skill, content.skill),
    difficulty: nullableNumber(source.difficulty),
    question_type: firstNonEmpty(source.question_type),
    instruction: typeof source.instruction === "string" ? source.instruction : "",
    prompt: firstNonEmpty(source.prompt, content.prompt, content.question),
    content,
    answer_data:
      source.answer_data ?? source.correct_answer ?? content.correct_answer ?? null,
    explanation: source.explanation ?? null,
    stimulus: source.stimulus ?? null,
    assets: source.assets ?? null,
  };
}

function fnv1a32(text: string, seed = 0x811c9dc5) {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Lightweight deterministic fingerprint for stale-proposal detection. This is
 * an authoring consistency guard, not a cryptographic/security primitive.
 */
function fingerprintValue(value: unknown): MathAuthoringQuestionFingerprint {
  const canonical = canonicalise(value, new Set<object>());
  const serialised = JSON.stringify(canonical);
  const primary = fnv1a32(serialised).toString(16).padStart(8, "0");
  const secondary = fnv1a32(serialised, 0x9e3779b9)
    .toString(16)
    .padStart(8, "0");
  return `maf${MATH_AUTHORING_FINGERPRINT_VERSION}_${primary}${secondary}_${serialised.length.toString(36)}`;
}

export function buildMathAuthoringQuestionFingerprint(
  question: unknown,
): MathAuthoringQuestionFingerprint {
  return fingerprintValue(buildMathAuthoringFingerprintSource(question));
}

export function buildMathAuthoringSourceFingerprint(
  question: unknown,
): MathAuthoringQuestionFingerprint {
  return fingerprintValue(buildMathAuthoringGenerationSource(question));
}

export function isMathAuthoringQuestionFingerprintCurrent(
  expected: string | null | undefined,
  question: unknown,
) {
  if (!expected) return false;
  return expected === buildMathAuthoringQuestionFingerprint(question);
}

export function isMathAuthoringSourceFingerprintCurrent(
  expected: string | null | undefined,
  question: unknown,
) {
  if (!expected) return false;
  return expected === buildMathAuthoringSourceFingerprint(question);
}

export type MathAuthoringAcceptedSourceInspection = {
  current_fingerprint: string;
  recorded_fingerprints: string[];
  stale_slots: Array<"visual" | "lesson" | "teach_me">;
  stale: boolean;
};

function nestedFingerprint(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return typeof current === "string" && current.trim() ? current.trim() : null;
}

/**
 * Inspect accepted generated visual/teaching provenance against the current
 * semantic Math question. Used immediately before editor Save so a proposal
 * cannot be accepted, followed by a prompt/answer edit, and then persisted as
 * if it still matched the new question.
 */
export function inspectMathAuthoringAcceptedSourceFreshness(args: {
  question: unknown;
  visual: unknown;
  teaching: unknown;
}): MathAuthoringAcceptedSourceInspection {
  const current = buildMathAuthoringSourceFingerprint(args.question);
  const visual = nestedFingerprint(args.visual, ["metadata", "source_fingerprint"]);
  const lesson = nestedFingerprint(args.teaching, [
    "lesson",
    "visual_steps_meta",
    "source_fingerprint",
  ]);
  const teachMe = nestedFingerprint(args.teaching, [
    "teach_me",
    "visual_steps_meta",
    "source_fingerprint",
  ]);

  const staleSlots: Array<"visual" | "lesson" | "teach_me"> = [];
  if (visual && visual !== current) staleSlots.push("visual");
  if (lesson && lesson !== current) staleSlots.push("lesson");
  if (teachMe && teachMe !== current) staleSlots.push("teach_me");

  return {
    current_fingerprint: current,
    recorded_fingerprints: [...new Set([visual, lesson, teachMe].filter(Boolean) as string[])],
    stale_slots: staleSlots,
    stale: staleSlots.length > 0,
  };
}
