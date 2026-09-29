import type {
  MathIntelligenceQuestionInput,
  MathQuestionOptionInput,
} from "./MathIntelligenceTypes";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function explanationText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return "";

  const preferred = [
    value.text,
    value.explanation,
    value.body,
    value.summary,
    value.display,
  ];

  for (const item of preferred) {
    const text = stringValue(item);
    if (text) return text;
  }

  return "";
}

function normaliseOptions(content: AnyRecord): MathQuestionOptionInput[] {
  const rawOptions = Array.isArray(content.options) ? content.options : [];

  return rawOptions
    .map((raw, index) => {
      if (!isRecord(raw)) return null;
      const id = stringValue(raw.id) || String(index + 1);
      const text = stringValue(raw.text) || stringValue(raw.label);
      return { id, text };
    })
    .filter(Boolean) as MathQuestionOptionInput[];
}

function contentContainsSvg(content: AnyRecord) {
  const candidates = [
    content.stimulus_image_url,
    content.inline_diagram,
    content.image_reference,
  ];

  if (
    candidates.some(
      (value) =>
        typeof value === "string" &&
        (value.includes("data:image/svg+xml") || value.includes("<svg")),
    )
  ) {
    return true;
  }

  const options = Array.isArray(content.options) ? content.options : [];
  return options.some((option) => {
    if (!isRecord(option)) return false;
    const url = stringValue(option.image_url);
    return url.includes("data:image/svg+xml") || url.includes(".svg");
  });
}

function hasV2MathVisual(content: AnyRecord) {
  const raw = content.math_visual;
  return isRecord(raw) && Number(raw.schema_version) === 2 && Array.isArray(raw.visuals);
}

/**
 * Accepts the existing Core Quiz question shape without importing it. Keeping
 * this normaliser at the intelligence boundary avoids coupling the intelligence
 * library to one page/component path.
 */
export function normaliseMathIntelligenceQuestion(
  value: unknown,
): MathIntelligenceQuestionInput {
  const question = isRecord(value) ? value : {};
  const content = isRecord(question.content) ? question.content : {};
  const stimulus = isRecord(question.stimulus) ? question.stimulus : null;
  const assets = Array.isArray(question.assets) ? question.assets : [];

  const assetTypes = assets
    .map((asset) => (isRecord(asset) ? stringValue(asset.asset_type) : ""))
    .filter(Boolean);

  const stimulusType = stimulus ? stringValue(stimulus.stimulus_type) || null : null;
  const contentImageCandidates = [
    stringValue(content.image_url),
    stringValue(content.stimulus_image_url),
    stringValue(content.image_reference),
  ].filter(Boolean);

  const hasRealImage =
    stimulusType === "image" ||
    assetTypes.includes("image") ||
    contentImageCandidates.some(
      (value) =>
        !value.includes("data:image/svg+xml") &&
        !value.includes("<svg") &&
        !value.toLocaleLowerCase().includes(".svg"),
    );

  const hasLegacySvg =
    stimulusType === "diagram" ||
    stimulusType === "graph" ||
    assetTypes.includes("svg") ||
    contentContainsSvg(content);

  const options = normaliseOptions(content);
  const hasOptionImages = Array.isArray(content.options)
    ? content.options.some(
        (option) =>
          isRecord(option) &&
          Boolean(stringValue(option.image_url) || stringValue(option.image_path)),
      )
    : false;

  return {
    id: stringValue(question.id) || null,
    primary_level:
      nullableNumber(question.primary_level) ??
      nullableNumber(question.level) ??
      null,
    topic:
      stringValue(question.topic_title) ||
      stringValue(question.topic) ||
      stringValue(content.topic) ||
      "",
    skill: stringValue(question.skill) || stringValue(content.skill),
    difficulty: nullableNumber(question.difficulty),
    question_type: stringValue(question.question_type) || "unknown",
    instruction: stringValue(question.instruction),
    prompt:
      stringValue(question.prompt) ||
      stringValue(content.prompt) ||
      stringValue(content.question) ||
      "",
    options,
    correct_answer:
      question.answer_data ??
      question.correct_answer ??
      content.correct_answer ??
      null,
    explanation: explanationText(question.explanation),
    existing_media: {
      has_math_visual_v2: hasV2MathVisual(content),
      has_real_image: hasRealImage,
      has_legacy_svg: hasLegacySvg,
      has_option_images: hasOptionImages,
      stimulus_type: stimulusType,
    },
  };
}
