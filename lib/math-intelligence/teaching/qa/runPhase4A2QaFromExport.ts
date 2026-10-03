import type {
  CanonicalSkillMappingInput,
  ExistingMathIntelligenceProposalInput,
} from "../canonical";

import {
  normalizeCanonicalTeachingQuestion,
} from "../canonical";

import {
  summarizeTeachingUnderstandingBatch,
  understandTeachingQuestion,
} from "../understanding";

import type {
  MathIntelligenceQaExportLike,
  Phase4A2CompactExport,
  Phase4A2QaItem,
  Phase4A2QaRun,
  QaProposalResult,
  QaSampleItem,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function inferMediaType(url: string): "svg" | "image" {
  const lower = url.toLowerCase();

  if (
    lower.startsWith("data:image/svg+xml") ||
    lower.endsWith(".svg")
  ) {
    return "svg";
  }

  return "image";
}

function normalizeEntryQuestionType(raw: unknown): unknown {
  const value = asString(raw)?.toLowerCase();

  // These are answer-entry formats in the existing Math bank.
  // Canonical teaching only needs to know that they are open response.
  if (
    value === "money" ||
    value === "time" ||
    value === "decimal" ||
    value === "fraction" ||
    value === "numeric_unit"
  ) {
    return "open_ended";
  }

  return raw;
}

/**
 * The current QA cohort contains some legacy visuals inside question.content
 * rather than question.assets/stimulus.
 *
 * Phase 4A-1 intentionally reads canonical media locations.
 * This QA adapter promotes those legacy fields into temporary asset objects
 * without writing anything back to the database.
 */
export function prepareQaQuestionForTeaching(
  rawQuestion: Record<string, unknown>,
): Record<string, unknown> {
  const question: Record<string, unknown> = {
    ...rawQuestion,
    question_type: normalizeEntryQuestionType(
      rawQuestion.question_type ?? rawQuestion.questionType,
    ),
  };

  const content = asRecord(rawQuestion.content);
  const existingAssets = Array.isArray(rawQuestion.assets)
    ? [...rawQuestion.assets]
    : [];

  if (content) {
    const inlineCandidates = [
      {
        url: asString(content.stimulus_image_url),
        alt: asString(content.stimulus_image_alt),
        id: "qa-inline-stimulus",
      },
      {
        url: asString(content.inline_diagram),
        alt: asString(content.stimulus_image_alt),
        id: "qa-inline-diagram",
      },
    ];

    for (const candidate of inlineCandidates) {
      if (!candidate.url) continue;

      existingAssets.push({
        id: candidate.id,
        asset_type: inferMediaType(candidate.url),
        url: candidate.url,
        alt_text: candidate.alt,
        metadata: {
          source: "qa_content_adapter",
          placement: "prompt",
        },
      });
    }

    if (Array.isArray(content.options)) {
      question.content = {
        ...content,
        options: content.options.map((rawOption) => {
          const option = asRecord(rawOption);
          if (!option) return rawOption;

          const imageUrl = asString(option.image_url);
          if (!imageUrl) return option;

          return {
            ...option,
            image: {
              id: `qa-option-${asString(option.id) ?? "unknown"}`,
              url: imageUrl,
              media_type: inferMediaType(imageUrl),
              alt_text: asString(option.image_alt),
            },
          };
        }),
      };
    }
  }

  question.assets = existingAssets;

  return question;
}


function extractQaSkillMappings(
  item: QaSampleItem,
  question: Record<string, unknown>,
): CanonicalSkillMappingInput[] {
  const candidates: unknown[] = [
    question.skill_mappings,
    question.skillMappings,
    question.skills,
    question.learning_question_skills,
    item.skill_mappings,
    item.skillMappings,
  ];

  const rows = candidates.find(
    (value) => Array.isArray(value),
  );

  if (!Array.isArray(rows)) {
    return [];
  }

  const normalized: Array<{
    mapping: CanonicalSkillMappingInput;
    order: number;
    isPrimary: boolean;
  }> = [];

  rows.forEach((raw, index) => {
    const row = asRecord(raw);
    if (!row) return;

    const nestedSkill =
      asRecord(row.skill) ??
      asRecord(row.skills);

    const id =
      asString(row.skill_id) ??
      asString(row.id) ??
      asString(nestedSkill?.id);

    const name =
      asString(row.skill_name) ??
      asString(row.name) ??
      asString(nestedSkill?.name) ??
      asString(nestedSkill?.title);

    if (!id || !name) return;

    const role =
      asString(row.role) ??
      asString(row.mapping_role);

    const order =
      asNumber(row.order) ??
      asNumber(row.mapping_order) ??
      asNumber(row.skill_order) ??
      index;

    const isPrimary =
      row.is_primary === true ||
      row.is_primary_skill === true ||
      role === "primary";

    normalized.push({
      mapping: {
        id,
        code:
          asString(row.skill_code) ??
          asString(row.code) ??
          asString(nestedSkill?.code) ??
          null,
        name,
      },
      order,
      isPrimary,
    });
  });

  normalized.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1;
    }
    return a.order - b.order;
  });

  return normalized.map(
    (entry) => entry.mapping,
  );
}

function proposalForItem(
  item: QaSampleItem,
  resultMap: Map<string, QaProposalResult>,
): QaProposalResult | null {
  const embeddedId =
    asString(item.question?.id) ??
    asString(item.question_id);

  if (!embeddedId) return null;

  return resultMap.get(embeddedId) ?? null;
}

function proposalSummary(
  result: QaProposalResult | null,
): Phase4A2QaItem["existingProposal"] {
  const proposal = asRecord(result?.proposal);
  const decision = asRecord(proposal?.decision);

  return {
    status:
      asString(result?.status) ??
      asString(proposal?.status),

    domain: asString(decision?.domain),

    problemStructure:
      asString(decision?.problem_structure) ??
      asString(decision?.problemStructure),

    targetLabel:
      asString(
        asRecord(decision?.target)?.label,
      ),

    confidence: asNumber(decision?.confidence),

    strategy:
      asString(decision?.strategy) ??
      asString(asRecord(proposal?.visual)?.strategy),
  };
}

export function runPhase4A2QaFromExport(
  qaExport: MathIntelligenceQaExportLike,
): Phase4A2QaRun {
  const sampleItems = qaExport.sample?.items ?? [];
  const proposalResults = qaExport.results ?? [];

  const resultMap = new Map<string, QaProposalResult>();

  for (const result of proposalResults) {
    const clientId = asString(result.client_id);
    if (clientId) resultMap.set(clientId, result);
  }

  const items: Phase4A2QaItem[] = [];

  for (const [index, sampleItem] of sampleItems.entries()) {
    if (!sampleItem.question) continue;

    const preparedQuestion =
      prepareQaQuestionForTeaching(sampleItem.question);

    // QA snapshots created before 4A-2C-1A did not persist the source ID.
    // The outer sample item remains authoritative for identity and routing.
    const question: Record<string, unknown> = {
      ...preparedQuestion,
      id:
        asString(preparedQuestion.id) ??
        asString(sampleItem.question_id),
      code:
        asString(preparedQuestion.code) ??
        asString(sampleItem.question_code),
      primary_level:
        asNumber(preparedQuestion.primary_level) ??
        sampleItem.primary_level ??
        null,
      topic_id:
        asString(preparedQuestion.topic_id) ??
        asString(sampleItem.topic_id),
      topic_title:
        asString(preparedQuestion.topic_title) ??
        asString(sampleItem.topic_title),
      quiz_id:
        asString(preparedQuestion.quiz_id) ??
        asString(sampleItem.quiz_id),
      quiz_code:
        asString(preparedQuestion.quiz_code) ??
        asString(sampleItem.quiz_code),
      quiz_title:
        asString(preparedQuestion.quiz_title) ??
        asString(sampleItem.quiz_title),
    };

    const result =
      proposalForItem(sampleItem, resultMap);

    const proposal =
      asRecord(result?.proposal);

    const code =
      asString(question.code) ??
      asString(sampleItem.question_code);

    const sourceType =
      code?.includes("-ASSESS-")
        ? "assessment"
        : "quiz";

    const canonical =
      normalizeCanonicalTeachingQuestion({
        question,
        sourceType,
        sourceTable: "math_questions",
        quizId:
          asString(sampleItem.quiz_id) ??
          asString(question.quiz_id),
        skillMappings:
          extractQaSkillMappings(
            sampleItem,
            question,
          ),
        questionFingerprint:
          asString(proposal?.question_fingerprint),
        mathIntelligence:
          (proposal as ExistingMathIntelligenceProposalInput | null) ??
          null,
      });

    if (!canonical.identity.questionId) {
      throw new Error(
        `4A Teaching QA identity lost for ${
          asString(sampleItem.question_id) ??
          asString(sampleItem.question_code) ??
          `sample item ${index + 1}`
        }.`,
      );
    }

    const understanding =
      understandTeachingQuestion({
        question: canonical,
      });

    items.push({
      index: index + 1,
      questionId:
        asString(question.id) ??
        asString(sampleItem.question_id),
      questionCode: code,
      primaryLevel:
        typeof sampleItem.primary_level === "number"
          ? sampleItem.primary_level
          : asNumber(question.primary_level),
      topicTitle:
        asString(sampleItem.topic_title) ??
        asString(question.topic_title),
      sampleStratum:
        asString(sampleItem.sample_stratum),
      existingProposal:
        proposalSummary(result),
      understanding,
    });
  }

  const summary =
    summarizeTeachingUnderstandingBatch(
      items.map((item) => item.understanding),
    );

  return {
    schemaVersion: "4A-2-QA.3",
    sourceRunId: asString(qaExport.run_id),
    sourceSeed: asString(qaExport.sample?.seed),
    generatedAt: new Date().toISOString(),
    totalSampleItems: sampleItems.length,
    processed: items.length,
    summary,
    items,
  };
}

export function toPhase4A2CompactExport(
  run: Phase4A2QaRun,
): Phase4A2CompactExport {
  return {
    schema_version: "4A-2-QA.3",
    generated_at: run.generatedAt,
    source_run_id: run.sourceRunId,
    source_seed: run.sourceSeed,
    summary: run.summary,

    results: run.items.map((item) => {
      const {
        source: _source,
        ...phase4A2
      } = item.understanding;

      return {
        question_id: item.questionId,
        question_code: item.questionCode,
        primary_level: item.primaryLevel,
        topic_title: item.topicTitle,
        sample_stratum: item.sampleStratum,
        existing_math_intelligence:
          item.existingProposal,
        phase_4a2: phase4A2,
      };
    }),
  };
}
