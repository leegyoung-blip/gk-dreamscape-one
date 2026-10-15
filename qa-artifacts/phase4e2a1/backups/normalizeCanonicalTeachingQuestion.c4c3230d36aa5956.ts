import type {
  CanonicalAnswer,
  CanonicalAnswerContext,
  CanonicalMediaType,
  CanonicalQuestionType,
  CanonicalSkill,
  CanonicalTeachingMedia,
  CanonicalTeachingOption,
  CanonicalTeachingPart,
  CanonicalTeachingQuestion,
  NormalizeCanonicalTeachingQuestionInput,
  PrimaryLevel,
} from "./types";

import { validateCanonicalTeachingQuestion } from "./validateCanonicalTeachingQuestion";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter((item): item is string => item !== null);
}

function toPrimaryLevel(value: unknown): PrimaryLevel | null {
  const numeric = asNumber(value);
  if (
    numeric === 1 ||
    numeric === 2 ||
    numeric === 3 ||
    numeric === 4 ||
    numeric === 5 ||
    numeric === 6
  ) {
    return numeric;
  }
  return null;
}

function toDifficulty(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  const numeric = asNumber(value);
  if (
    numeric === 1 ||
    numeric === 2 ||
    numeric === 3 ||
    numeric === 4 ||
    numeric === 5
  ) {
    return numeric;
  }
  return null;
}

function normalizeQuestionType(value: unknown): CanonicalQuestionType {
  const raw = asString(value)?.toLowerCase();

  switch (raw) {
    case "multiple_choice":
    case "multiple-choice":
    case "mcq":
    case "single_choice":
    case "single-choice":
    case "image_choice":
      return "mcq";

    case "multiple_select":
    case "multiple-select":
    case "multi_select":
    case "multi-select":
    case "checkbox":
      return "multi_select";

    case "open_ended":
    case "open-ended":
    case "short_answer":
    case "short-answer":
    case "free_response":
    case "free-response":
    case "numeric":
    case "fill_blank":
    case "fill-blank":
    case "fill_in_blank":
      return "open_ended";

    default:
      return "unknown";
  }
}

function normalizeMediaType(value: unknown): CanonicalMediaType {
  const raw = asString(value)?.toLowerCase();

  if (raw === "svg" || raw === "image/svg+xml") return "svg";

  if (
    raw === "image" ||
    raw === "png" ||
    raw === "jpg" ||
    raw === "jpeg" ||
    raw === "webp"
  ) {
    return "image";
  }

  return "unknown";
}

function inferMediaTypeFromPath(
  path: string | null,
  suppliedType: unknown,
): CanonicalMediaType {
  const explicit = normalizeMediaType(suppliedType);
  if (explicit !== "unknown") return explicit;
  if (!path) return "unknown";

  const lowered = path.toLowerCase();

  if (lowered.endsWith(".svg")) return "svg";

  if (
    lowered.endsWith(".png") ||
    lowered.endsWith(".jpg") ||
    lowered.endsWith(".jpeg") ||
    lowered.endsWith(".webp")
  ) {
    return "image";
  }

  return "unknown";
}

function normalizeStimulus(value: unknown): CanonicalTeachingMedia | null {
  const stimulus = asRecord(value);
  if (!stimulus) return null;

  const storagePath =
    asString(stimulus.storage_path) ?? asString(stimulus.storagePath);

  const url =
    asString(stimulus.url) ??
    asString(stimulus.public_url) ??
    asString(stimulus.asset_path);

  const referencePath = url ?? storagePath;

  return {
    id: asString(stimulus.id),
    mediaType: inferMediaTypeFromPath(
      referencePath,
      stimulus.stimulus_type ?? stimulus.media_type,
    ),
    role: "stimulus",
    url,
    storageBucket:
      asString(stimulus.storage_bucket) ?? asString(stimulus.storageBucket),
    storagePath,
    altText: asString(stimulus.alt_text) ?? asString(stimulus.altText),
    title: asString(stimulus.title),
  };
}

function normalizeAsset(
  value: unknown,
  role: "question_asset" | "option_asset" | "part_asset" = "question_asset",
): CanonicalTeachingMedia | null {
  const asset = asRecord(value);
  if (!asset) return null;

  const url =
    asString(asset.url) ??
    asString(asset.public_url) ??
    asString(asset.asset_path) ??
    asString(asset.src);

  const storagePath =
    asString(asset.storage_path) ?? asString(asset.storagePath);

  const referencePath = url ?? storagePath;

  return {
    id: asString(asset.id),
    mediaType: inferMediaTypeFromPath(
      referencePath,
      asset.media_type ?? asset.asset_type ?? asset.type,
    ),
    role,
    url,
    storageBucket:
      asString(asset.storage_bucket) ?? asString(asset.storageBucket),
    storagePath,
    altText: asString(asset.alt_text) ?? asString(asset.altText),
    title: asString(asset.title),
  };
}

function normalizeAssetArray(
  value: unknown,
  role: "question_asset" | "option_asset" | "part_asset",
): CanonicalTeachingMedia[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeAsset(item, role))
    .filter((item): item is CanonicalTeachingMedia => item !== null);
}

function normalizeOptions(
  value: unknown,
  correctIds: string[],
): CanonicalTeachingOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((rawOption, index) => {
      const option = asRecord(rawOption);
      if (!option) return null;

      const key =
        asString(option.id) ?? asString(option.key) ?? String(index + 1);

      const text = asString(option.text) ?? asString(option.label) ?? "";

      const explicitCorrect =
        typeof option.is_correct === "boolean"
          ? option.is_correct
          : typeof option.isCorrect === "boolean"
            ? option.isCorrect
            : null;

      const isCorrect =
        explicitCorrect ??
        (correctIds.length > 0 ? correctIds.includes(key) : null);

      const media = [
        ...normalizeAssetArray(option.assets, "option_asset"),
      ];

      const singleAsset = normalizeAsset(
        option.asset ?? option.image ?? option.media,
        "option_asset",
      );

      if (singleAsset) media.push(singleAsset);

      return {
        key,
        text,
        isCorrect,
        media,
      };
    })
    .filter(
      (option): option is CanonicalTeachingOption => option !== null,
    );
}

function tryNormalizeNumericAnswer(
  value: string,
):
  | {
      type: "number";
      value: number;
      unit: string | null;
    }
  | null {
  const trimmed = value.trim();

  // Deliberately conservative:
  // 4, 4.5, 1,250, 4 cm, 50%, $12.50
  // Fractions such as 3/4 remain text in 4A-1.
  const match = trimmed.match(
    /^(\$)?\s*(-?\d[\d,]*(?:\.\d+)?)\s*([a-zA-Z²³/%]+)?$/,
  );

  if (!match) return null;

  const prefix = match[1] ?? null;
  const numericText = match[2].replace(/,/g, "");
  const suffix = match[3] ?? null;
  const numericValue = Number(numericText);

  if (!Number.isFinite(numericValue)) return null;

  const unit =
    prefix === "$"
      ? suffix
        ? `$ ${suffix}`
        : "$"
      : suffix;

  return {
    type: "number",
    value: numericValue,
    unit,
  };
}

function normalizeSimpleAnswer(rawAnswer: string | null): CanonicalAnswer | null {
  if (!rawAnswer) return null;

  const numeric = tryNormalizeNumericAnswer(rawAnswer);
  if (numeric) return numeric;

  return {
    type: "text",
    value: rawAnswer,
  };
}

function normalizeAnswerContext(args: {
  questionType: CanonicalQuestionType;
  answerData: Record<string, unknown> | null;
  options: CanonicalTeachingOption[];
}): CanonicalAnswerContext {
  const { questionType, answerData, options } = args;

  const rawAnswer =
    asString(answerData?.display_answer) ??
    asString(answerData?.answer) ??
    asString(answerData?.value);

  const correctOptionIds = asStringArray(
    answerData?.correct_option_ids ?? answerData?.correctOptionIds,
  );

  let canonicalAnswer: CanonicalAnswer | null = null;

  if (questionType === "mcq" && correctOptionIds.length === 1) {
    const key = correctOptionIds[0];
    const option =
      options.find((candidate) => candidate.key === key) ?? null;

    canonicalAnswer = {
      type: "option",
      key,
      text: option?.text ?? rawAnswer,
    };
  } else if (
    questionType === "multi_select" &&
    correctOptionIds.length > 0
  ) {
    canonicalAnswer = {
      type: "multiple_options",
      keys: [...correctOptionIds],
    };
  } else {
    canonicalAnswer = normalizeSimpleAnswer(rawAnswer);
  }

  const acceptableAnswers = [
    ...asStringArray(
      answerData?.acceptable_answers ?? answerData?.acceptableAnswers,
    ),
  ];

  if (rawAnswer && !acceptableAnswers.includes(rawAnswer)) {
    acceptableAnswers.unshift(rawAnswer);
  }

  return {
    rawAnswer,
    canonicalAnswer,
    acceptableAnswers,
  };
}

function normalizeParts(
  content: Record<string, unknown> | null,
): CanonicalTeachingPart[] {
  if (!content || !Array.isArray(content.parts)) return [];

  return content.parts
    .map((rawPart, index) => {
      const part = asRecord(rawPart);
      if (!part) return null;

      const answerData =
        asRecord(part.answer_data) ?? asRecord(part.answerData);

      const questionType = normalizeQuestionType(
        part.question_type ?? part.questionType,
      );

      const correctOptionIds = asStringArray(
        answerData?.correct_option_ids ?? answerData?.correctOptionIds,
      );

      const partContent = asRecord(part.content) ?? part;

      const options = normalizeOptions(
        partContent.options,
        correctOptionIds,
      );

      const answer = normalizeAnswerContext({
        questionType,
        answerData,
        options,
      });

      const media = normalizeAssetArray(part.assets, "part_asset");

      return {
        key:
          asString(part.id) ??
          asString(part.key) ??
          String(index + 1),
        label: asString(part.label) ?? asString(part.title),
        instruction: asString(part.instruction),
        prompt: asString(part.prompt) ?? "",
        questionType,
        options,
        answer,
        media,
      };
    })
    .filter((part): part is CanonicalTeachingPart => part !== null);
}

function buildMultipartAnswer(
  parts: CanonicalTeachingPart[],
): CanonicalAnswerContext | null {
  if (parts.length === 0) return null;

  return {
    rawAnswer: null,
    canonicalAnswer: {
      type: "multipart",
      parts: parts.map((part) => ({
        key: part.key,
        rawAnswer: part.answer.rawAnswer,
        canonicalAnswer:
          part.answer.canonicalAnswer &&
          part.answer.canonicalAnswer.type !== "multipart"
            ? part.answer.canonicalAnswer
            : null,
      })),
    },
    acceptableAnswers: [],
  };
}

function normalizeSkills(
  mappings: NormalizeCanonicalTeachingQuestionInput["skillMappings"],
): {
  primarySkill: CanonicalSkill | null;
  secondarySkills: CanonicalSkill[];
} {
  if (!mappings || mappings.length === 0) {
    return {
      primarySkill: null,
      secondarySkills: [],
    };
  }

  const normalized = mappings.map((mapping) => ({
    id: mapping.id,
    code: mapping.code ?? null,
    name: mapping.name,
  }));

  return {
    primarySkill: normalized[0] ?? null,
    secondarySkills: normalized.slice(1),
  };
}

export function normalizeCanonicalTeachingQuestion(
  input: NormalizeCanonicalTeachingQuestionInput,
): CanonicalTeachingQuestion {
  const q = input.question;
  const content = asRecord(q.content);

  const answerData =
    asRecord(q.answer_data) ?? asRecord(q.answerData);

  const questionType = normalizeQuestionType(
    q.question_type ?? q.questionType,
  );

  const correctOptionIds = asStringArray(
    answerData?.correct_option_ids ?? answerData?.correctOptionIds,
  );

  const options = normalizeOptions(
    content?.options,
    correctOptionIds,
  );

  const parts = normalizeParts(content);

  const simpleAnswer = normalizeAnswerContext({
    questionType,
    answerData,
    options,
  });

  const multipartAnswer = buildMultipartAnswer(parts);
  const answer = multipartAnswer ?? simpleAnswer;

  const level = toPrimaryLevel(
    q.primary_level ?? q.primaryLevel ?? q.level,
  );

  const skills = normalizeSkills(input.skillMappings);

  const originalMedia: CanonicalTeachingMedia[] = [];

  const stimulus = normalizeStimulus(q.stimulus);
  if (stimulus) originalMedia.push(stimulus);

  originalMedia.push(
    ...normalizeAssetArray(q.assets, "question_asset"),
  );

  for (const option of options) {
    originalMedia.push(...option.media);
  }

  for (const part of parts) {
    originalMedia.push(...part.media);

    for (const option of part.options) {
      originalMedia.push(...option.media);
    }
  }

  const mi = input.mathIntelligence ?? null;
  const decision = mi?.decision ?? null;
  const visual = mi?.visual ?? null;

  const base: Omit<CanonicalTeachingQuestion, "diagnostics"> = {
    schemaVersion: "4A-1.1",

    identity: {
      questionId: asString(q.id),
      questionCode:
        asString(q.code) ?? asString(q.question_code),
      sourceType: input.sourceType ?? "unknown",
      sourceTable: input.sourceTable ?? null,
      quizId: input.quizId ?? asString(q.quiz_id),
      quizCode: asString(q.quiz_code),
      quizTitle: asString(q.quiz_title),
      questionFingerprint:
        input.questionFingerprint ??
        asString(mi?.question_fingerprint),
    },

    curriculum: {
      subject: "math",
      level,
      topicId:
        asString(q.topic_id) ?? asString(q.topicId),
      topicName:
        asString(q.topic_title) ?? asString(q.topicName),
      primarySkill: skills.primarySkill,
      secondarySkills: skills.secondarySkills,
      legacySkillLabel: asString(q.skill),
      skillTags: asStringArray(q.skill_tags),
      difficulty: toDifficulty(q.difficulty),
    },

    content: {
      instruction: asString(q.instruction),
      prompt: asString(q.prompt) ?? "",
      questionType,
      options,
      parts,
    },

    answer,

    media: {
      originalMedia,
      generatedV2Visual: visual
        ? {
            exists:
              visual.spec !== null && visual.spec !== undefined,
            status: asString(visual.status),
            strategy:
              asString(visual.strategy) ??
              asString(decision?.strategy),
            generatorVersion:
              asString(visual.generator_version),
            spec: visual.spec ?? null,
            structuralValidation:
              visual.structural_validation ?? null,
            semanticValidation:
              visual.semantic_validation ?? null,
          }
        : null,
    },

    intelligence: {
      proposalId: asString(mi?.proposal_id),
      domain: asString(decision?.domain),
      problemStructure:
        asString(decision?.problem_structure),
      target: decision?.target
        ? {
            kind: asString(decision.target.kind),
            label: asString(decision.target.label),
            quantityId:
              asString(decision.target.quantity_id),
          }
        : null,
      confidence: asNumber(decision?.confidence),
    },

    teaching: {
      learnerLevel: level,
      methodId: null,
      steps: [],
    },
  };

  const issues = validateCanonicalTeachingQuestion(base);

  const rawDifficulty = q.difficulty;

  if (
    rawDifficulty !== null &&
    rawDifficulty !== undefined &&
    toDifficulty(rawDifficulty) === null
  ) {
    issues.push({
      severity: "warning",
      code: "INVALID_DIFFICULTY",
      message:
        "Difficulty exists in the source but is not an integer from 1 to 5.",
      path: "curriculum.difficulty",
    });
  }

  const rawLevel =
    q.primary_level ?? q.primaryLevel ?? q.level;

  if (
    rawLevel !== null &&
    rawLevel !== undefined &&
    toPrimaryLevel(rawLevel) === null
  ) {
    issues.push({
      severity: "blocking",
      code: "INVALID_LEVEL",
      message:
        "Primary level exists in the source but is outside P1-P6.",
      path: "curriculum.level",
    });
  }

  return {
    ...base,

    diagnostics: {
      issues,
      readyForUnderstanding:
        !issues.some((issue) => issue.severity === "blocking"),
    },
  };
}
