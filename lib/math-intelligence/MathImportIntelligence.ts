import { applyMathAuthoringProposalToDraft } from "./MathAuthoringProposalApply";
import type { MathAuthoringProposal } from "./MathAuthoringProposalTypes";

export type MathImportRawRow = Record<string, unknown>;

export type MathImportIntelligenceAttachment = {
  row_id: string;
  proposal_id: string;
  source_fingerprint: string;
  content_patch: Record<string, unknown>;
  meta: {
    schema_version: 1;
    strategy: string;
    interpretation_source: "rules" | "luna";
    interpretation_model: string | null;
    teaching_source: "rules" | "luna" | "none";
    teaching_model: string | null;
    generator_version: string;
  };
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function nullableNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function option(raw: MathImportRawRow, id: "a" | "b" | "c" | "d") {
  return { id, text: text(raw[`option_${id}`]) };
}

/**
 * Convert one standard 28-column Math CSV/import row into the same question
 * shape used by the single-question Math Intelligence authoring flow.
 */
export function mathImportRowToQuestionDraft(
  raw: MathImportRawRow,
  options: { primaryLevel?: number | null; rowId?: string | null } = {},
) {
  const correctOption = text(raw.correct_option).toLowerCase();
  const imageFlag = text(raw.image_flag).toUpperCase();
  const hasCommittedExternalImage = imageFlag === "HAS_IMAGE";

  return {
    id: options.rowId || text(raw.question_id) || null,
    subject: "math",
    primary_level:
      nullableNumber(raw.primary_level) ?? options.primaryLevel ?? null,
    topic_title: text(raw.topic_title) || text(raw.topic_slug),
    skill: text(raw.skill),
    difficulty: nullableNumber(raw.difficulty),
    question_type: text(raw.question_type) || "multiple_choice",
    instruction: text(raw.instruction),
    prompt: text(raw.prompt),
    content: {
      options: [option(raw, "a"), option(raw, "b"), option(raw, "c"), option(raw, "d")],
    },
    answer_data: {
      correct_option_ids: correctOption ? [correctOption] : [],
      display_answer:
        text(raw.correct_answer) ||
        (correctOption && ["a", "b", "c", "d"].includes(correctOption)
          ? text(raw[`option_${correctOption}`])
          : ""),
    },
    explanation: {
      student: text(raw.explanation),
    },
    stimulus: hasCommittedExternalImage
      ? {
          stimulus_type: "image",
          title: null,
          body: {},
          storage_bucket: null,
          storage_path: null,
        }
      : null,
    assets: [],
  };
}

/**
 * Convert a validated authoring proposal into the minimal content fragment that
 * may later be merged into a newly imported draft Math question.
 *
 * Existing/imported answer options are deliberately excluded. The SQL apply
 * step accepts only math_visual and teaching keys from this fragment.
 */
export function buildMathImportIntelligenceContentPatch(
  proposal: MathAuthoringProposal,
): Record<string, unknown> | null {
  if (!proposal.can_accept.visual || !proposal.visual.spec) return null;

  const applied = applyMathAuthoringProposalToDraft({
    currentVisual: null,
    currentTeaching: {},
    proposal,
  });

  if (applied.status === "invalid" || !applied.visual) return null;

  const patch: Record<string, unknown> = {
    math_visual: applied.visual,
  };

  if (applied.teaching && Object.keys(applied.teaching).length > 0) {
    patch.teaching = applied.teaching;
  }

  return patch;
}

export function buildMathImportIntelligenceAttachment(args: {
  rowId: string;
  proposal: MathAuthoringProposal;
}): MathImportIntelligenceAttachment | null {
  const contentPatch = buildMathImportIntelligenceContentPatch(args.proposal);
  if (!contentPatch) return null;

  return {
    row_id: args.rowId,
    proposal_id: args.proposal.proposal_id,
    source_fingerprint: args.proposal.source_fingerprint,
    content_patch: contentPatch,
    meta: {
      schema_version: 1,
      strategy: args.proposal.decision.strategy,
      interpretation_source: args.proposal.sources.interpretation.source,
      interpretation_model: args.proposal.sources.interpretation.model,
      teaching_source: args.proposal.sources.teaching.source,
      teaching_model: args.proposal.sources.teaching.model,
      generator_version: args.proposal.visual.generator_version,
    },
  };
}
