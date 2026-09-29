import type { MathVisualSpec } from "../../components/core-math/visual-engine/MathVisualTypes";
import type { MathIntelligenceAnalysis, MathVisualStrategy } from "./MathIntelligenceTypes";
import { validateMathTeachingVisualDraft } from "./MathTeachingSemanticValidator";
import type { MathTeachingSemanticValidationResult } from "./MathTeachingSemanticTypes";
import type { MathTeachingVisualDraftResult } from "./MathTeachingVisualTypes";

export const MATH_TEACHING_VISUAL_META_VERSION = 1;

export type MathTeachingVisualOwnershipStatus =
  | "none"
  | "generated"
  | "generated_reviewed"
  | "manual"
  | "locked";

export type MathTeachingVisualSource = "rules" | "luna" | "manual";

export type MathTeachingVisualStepMeta = {
  schema_version: 1;
  status: Exclude<MathTeachingVisualOwnershipStatus, "none">;
  source: MathTeachingVisualSource;
  generator_version: string | null;
  template_id: string | null;
  visual_id: string | null;
  strategy: MathVisualStrategy | null;
  model: string | null;
};

export type MathTeachingVisualOwnership = {
  status: MathTeachingVisualOwnershipStatus;
  source: MathTeachingVisualSource | null;
  metadata: MathTeachingVisualStepMeta | null;
  has_visual_steps: boolean;
};

export type MathTeachingVisualMergeSlot = "lesson" | "teach_me";

export type MathTeachingVisualMergeSlotResult = {
  slot: MathTeachingVisualMergeSlot;
  action: "merged" | "preserved" | "skipped";
  before: MathTeachingVisualOwnership;
  after: MathTeachingVisualOwnership;
  reason: string;
};

export type MathTeachingVisualMergeResult = {
  status: "merged" | "preserved" | "not_needed" | "invalid";
  content: Record<string, unknown>;
  validation: MathTeachingSemanticValidationResult | null;
  slots: MathTeachingVisualMergeSlotResult[];
};

export type MergeMathTeachingVisualDraftOptions = {
  allow_regenerate_reviewed?: boolean;
  include_lesson?: boolean;
  include_teach_me?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasVisualSteps(value: unknown) {
  return isRecord(value) && Array.isArray(value.visual_steps) && value.visual_steps.length > 0;
}

function validOwnershipStatus(value: unknown): value is MathTeachingVisualStepMeta["status"] {
  return (
    value === "generated" ||
    value === "generated_reviewed" ||
    value === "manual" ||
    value === "locked"
  );
}

function validSource(value: unknown): value is MathTeachingVisualSource {
  return value === "rules" || value === "luna" || value === "manual";
}

function readMeta(value: unknown): MathTeachingVisualStepMeta | null {
  if (!isRecord(value)) return null;
  if (Number(value.schema_version) !== MATH_TEACHING_VISUAL_META_VERSION) return null;
  if (!validOwnershipStatus(value.status) || !validSource(value.source)) return null;

  return {
    schema_version: 1,
    status: value.status,
    source: value.source,
    generator_version: text(value.generator_version) || null,
    template_id: text(value.template_id) || null,
    visual_id: text(value.visual_id) || null,
    strategy: (text(value.strategy) || null) as MathVisualStrategy | null,
    model: text(value.model) || null,
  };
}

/**
 * Existing visual_steps without Dreamscape generator metadata are deliberately
 * treated as manual. This is the safest migration rule because old human work
 * must never be silently replaced by bulk generation.
 */
export function readMathTeachingVisualOwnership(
  lesson: unknown,
): MathTeachingVisualOwnership {
  if (!hasVisualSteps(lesson)) {
    return {
      status: "none",
      source: null,
      metadata: null,
      has_visual_steps: false,
    };
  }

  const source = lesson as Record<string, unknown>;
  const metadata = readMeta(source.visual_steps_meta);
  if (!metadata) {
    return {
      status: "manual",
      source: "manual",
      metadata: null,
      has_visual_steps: true,
    };
  }

  return {
    status: metadata.status,
    source: metadata.source,
    metadata,
    has_visual_steps: true,
  };
}

export function canReplaceMathTeachingVisualSteps(
  ownership: MathTeachingVisualOwnership,
  options: MergeMathTeachingVisualDraftOptions = {},
) {
  if (ownership.status === "none" || ownership.status === "generated") return true;
  if (ownership.status === "generated_reviewed") {
    return options.allow_regenerate_reviewed === true;
  }
  return false;
}

function lessonObject(value: unknown) {
  if (isRecord(value)) return { ...value };
  if (typeof value === "string" && value.trim()) {
    return {
      type: "simple_explanation",
      text: value.trim(),
    } as Record<string, unknown>;
  }
  return {
    type: "visual_explanation",
  } as Record<string, unknown>;
}

function generatedMeta(
  analysis: MathIntelligenceAnalysis,
  draft: MathTeachingVisualDraftResult,
): MathTeachingVisualStepMeta {
  return {
    schema_version: 1,
    status: "generated",
    source: draft.source,
    generator_version: draft.generator_version,
    template_id: draft.template_id,
    visual_id: draft.visual_id,
    strategy: analysis.strategy,
    model: draft.model,
  };
}

function mergeSlot(
  slot: MathTeachingVisualMergeSlot,
  current: unknown,
  steps: MathTeachingVisualDraftResult["lesson_steps"],
  analysis: MathIntelligenceAnalysis,
  draft: MathTeachingVisualDraftResult,
  options: MergeMathTeachingVisualDraftOptions,
): { value: unknown; result: MathTeachingVisualMergeSlotResult } {
  const before = readMathTeachingVisualOwnership(current);

  if (!canReplaceMathTeachingVisualSteps(before, options)) {
    return {
      value: current,
      result: {
        slot,
        action: "preserved",
        before,
        after: before,
        reason:
          before.status === "generated_reviewed"
            ? "Reviewed generated visual teaching is preserved unless explicit regeneration is requested."
            : before.status === "locked"
              ? "Locked visual teaching is never overwritten by automatic generation."
              : "Existing visual teaching is treated as human-authored and is never overwritten automatically.",
      },
    };
  }

  const next = lessonObject(current);
  next.visual_steps = steps;
  next.visual_steps_meta = generatedMeta(analysis, draft);

  const after = readMathTeachingVisualOwnership(next);
  return {
    value: next,
    result: {
      slot,
      action: "merged",
      before,
      after,
      reason:
        before.status === "generated"
          ? "Previous unreviewed generated visual teaching was safely regenerated."
          : "Generated visual teaching was added without changing other lesson fields.",
    },
  };
}

/**
 * Phase 2F-C safe merge.
 *
 * - validates the deterministic teaching plan before writing it;
 * - touches only teaching.lesson/teach_me visual_steps + visual_steps_meta;
 * - preserves all other teaching fields;
 * - never changes content.math_visual;
 * - treats unlabelled existing visual_steps as manual work;
 * - never overwrites manual or locked visual teaching;
 * - only overwrites generated_reviewed with explicit permission.
 */
export function mergeMathTeachingVisualDraftIntoContent(args: {
  content: Record<string, unknown>;
  analysis: MathIntelligenceAnalysis;
  spec: MathVisualSpec;
  draft: MathTeachingVisualDraftResult;
  options?: MergeMathTeachingVisualDraftOptions;
}): MathTeachingVisualMergeResult {
  const { content, analysis, spec, draft } = args;
  const options = args.options ?? {};

  if (draft.status === "not_needed") {
    return { status: "not_needed", content, validation: null, slots: [] };
  }

  const validation = validateMathTeachingVisualDraft(analysis, spec, draft);
  if (!validation.valid) {
    return { status: "invalid", content, validation, slots: [] };
  }

  const nextContent: Record<string, unknown> = { ...content };
  const currentTeaching = isRecord(content.teaching) ? content.teaching : {};
  const nextTeaching: Record<string, unknown> = { ...currentTeaching };
  const slots: MathTeachingVisualMergeSlotResult[] = [];

  if (options.include_lesson !== false) {
    const merged = mergeSlot(
      "lesson",
      currentTeaching.lesson,
      draft.lesson_steps,
      analysis,
      draft,
      options,
    );
    nextTeaching.lesson = merged.value;
    slots.push(merged.result);
  } else {
    const before = readMathTeachingVisualOwnership(currentTeaching.lesson);
    slots.push({
      slot: "lesson",
      action: "skipped",
      before,
      after: before,
      reason: "Lesson visual teaching was excluded by merge options.",
    });
  }

  if (options.include_teach_me !== false) {
    const merged = mergeSlot(
      "teach_me",
      currentTeaching.teach_me,
      draft.teach_me_steps,
      analysis,
      draft,
      options,
    );
    nextTeaching.teach_me = merged.value;
    slots.push(merged.result);
  } else {
    const before = readMathTeachingVisualOwnership(currentTeaching.teach_me);
    slots.push({
      slot: "teach_me",
      action: "skipped",
      before,
      after: before,
      reason: "Teach Me visual teaching was excluded by merge options.",
    });
  }

  nextContent.teaching = nextTeaching;

  const mergedCount = slots.filter((slot) => slot.action === "merged").length;
  return {
    status: mergedCount > 0 ? "merged" : "preserved",
    content: nextContent,
    validation,
    slots,
  };
}

/** Marks already-generated visual teaching as reviewed without changing steps. */
export function markMathTeachingVisualStepsReviewed(
  content: Record<string, unknown>,
  slot: MathTeachingVisualMergeSlot,
): Record<string, unknown> {
  if (!isRecord(content.teaching)) return content;
  const currentLesson = content.teaching[slot];
  if (!isRecord(currentLesson)) return content;
  const ownership = readMathTeachingVisualOwnership(currentLesson);
  if (ownership.status !== "generated" || !ownership.metadata) return content;

  return {
    ...content,
    teaching: {
      ...content.teaching,
      [slot]: {
        ...currentLesson,
        visual_steps_meta: {
          ...ownership.metadata,
          status: "generated_reviewed",
        },
      },
    },
  };
}

/** Locks visual teaching so no automatic regeneration can replace it. */
export function lockMathTeachingVisualSteps(
  content: Record<string, unknown>,
  slot: MathTeachingVisualMergeSlot,
): Record<string, unknown> {
  if (!isRecord(content.teaching)) return content;
  const currentLesson = content.teaching[slot];
  if (!isRecord(currentLesson) || !hasVisualSteps(currentLesson)) return content;
  const ownership = readMathTeachingVisualOwnership(currentLesson);

  const metadata: MathTeachingVisualStepMeta = ownership.metadata
    ? { ...ownership.metadata, status: "locked" }
    : {
        schema_version: 1,
        status: "locked",
        source: "manual",
        generator_version: null,
        template_id: null,
        visual_id: null,
        strategy: null,
        model: null,
      };

  return {
    ...content,
    teaching: {
      ...content.teaching,
      [slot]: {
        ...currentLesson,
        visual_steps_meta: metadata,
      },
    },
  };
}
