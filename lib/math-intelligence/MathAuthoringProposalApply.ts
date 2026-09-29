import type {
  MathVisualAuthoringStatus,
  MathVisualSpec,
} from "../../components/core-math/visual-engine/MathVisualTypes";
import type { MathVisualTeachingStep } from "../../components/core-math/visual-engine/MathVisualState";
import { validateMathVisualTeachingSteps } from "../../components/core-math/visual-engine/MathVisualValidator";
import {
  MATH_TEACHING_VISUAL_META_VERSION,
  readMathTeachingVisualOwnership,
  type MathTeachingVisualOwnership,
  type MathTeachingVisualStepMeta,
} from "./MathTeachingVisualMerge";
import type { MathAuthoringProposal } from "./MathAuthoringProposalTypes";

export type MathVisualAuthoringOwnership = {
  status: "none" | MathVisualAuthoringStatus;
  generated_by: "human" | "migration" | "intelligence" | "system" | null;
};

export type MathAuthoringProposalApplyOptions = {
  /** Explicit author action required before replacing reviewed generated work. */
  allow_replace_reviewed?: boolean;
  /** Explicit author action required before replacing existing manual work. */
  allow_replace_manual?: boolean;
};

export type MathAuthoringProposalApplyAction =
  | "applied"
  | "preserved"
  | "skipped";

export type MathAuthoringProposalApplySlotResult = {
  slot: "visual" | "lesson" | "teach_me";
  action: MathAuthoringProposalApplyAction;
  before_status: string;
  after_status: string;
  reason: string;
};

export type MathAuthoringProposalApplyResult = {
  status: "applied" | "partial" | "preserved" | "invalid";
  visual: MathVisualSpec | null;
  teaching: Record<string, unknown>;
  slots: MathAuthoringProposalApplySlotResult[];
  messages: string[];
};

export type MathAuthoringProposalApplicationInspection = {
  visual: MathVisualAuthoringOwnership;
  lesson: MathTeachingVisualOwnership;
  teach_me: MathTeachingVisualOwnership;
  has_existing_content: boolean;
  requires_explicit_replace: boolean;
  has_locked_content: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function isProtectedStatus(status: string) {
  return status === "manual" || status === "generated_reviewed";
}

export function readMathVisualAuthoringOwnership(
  spec: MathVisualSpec | null | undefined,
): MathVisualAuthoringOwnership {
  if (!spec) return { status: "none", generated_by: null };

  const metadata = spec.metadata;
  const explicitStatus = metadata?.authoring_status;
  if (
    explicitStatus === "generated" ||
    explicitStatus === "generated_reviewed" ||
    explicitStatus === "manual" ||
    explicitStatus === "locked"
  ) {
    return {
      status: explicitStatus,
      generated_by: metadata?.generated_by ?? null,
    };
  }

  // Generated V2 specs from Phase 2D pre-date authoring_status. Treat them as
  // generated so they can be safely regenerated. Everything else is manual.
  if (metadata?.generated_by === "intelligence") {
    return { status: "generated", generated_by: "intelligence" };
  }

  return {
    status: "manual",
    generated_by: metadata?.generated_by ?? null,
  };
}

export function inspectMathAuthoringProposalApplication(args: {
  visual: MathVisualSpec | null | undefined;
  teaching: unknown;
}): MathAuthoringProposalApplicationInspection {
  const visual = readMathVisualAuthoringOwnership(args.visual);
  const teaching = isRecord(args.teaching) ? args.teaching : {};
  const lesson = readMathTeachingVisualOwnership(teaching.lesson);
  const teachMe = readMathTeachingVisualOwnership(teaching.teach_me);

  const statuses = [visual.status, lesson.status, teachMe.status];
  return {
    visual,
    lesson,
    teach_me: teachMe,
    has_existing_content: statuses.some((status) => status !== "none"),
    requires_explicit_replace: statuses.some(isProtectedStatus),
    has_locked_content: statuses.some((status) => status === "locked"),
  };
}

function canReplaceStatus(
  status: string,
  options: MathAuthoringProposalApplyOptions,
) {
  if (status === "none" || status === "generated") return true;
  if (status === "generated_reviewed") return options.allow_replace_reviewed === true;
  if (status === "manual") return options.allow_replace_manual === true;
  return false;
}

function acceptedVisualSpec(
  proposal: MathAuthoringProposal,
  spec: MathVisualSpec,
): MathVisualSpec {
  const next = deepClone(spec);
  next.metadata = {
    ...(next.metadata ?? {}),
    generated_by: "intelligence",
    generator_version: proposal.visual.generator_version,
    source: proposal.sources.interpretation.source,
    authoring_status: "generated",
    proposal_id: proposal.proposal_id,
    source_fingerprint: proposal.source_fingerprint,
    accepted_at: new Date().toISOString(),
    model: proposal.sources.interpretation.model ?? undefined,
  };
  return next;
}

function preferredVisualId(spec: MathVisualSpec, steps: MathVisualTeachingStep[]) {
  for (const step of steps) {
    for (const action of step.actions) {
      if (action.visual_id) return action.visual_id;
    }
  }
  return spec.visuals.find((visual) => visual.placement === "prompt")?.id ?? spec.visuals[0]?.id ?? null;
}

function generatedTeachingMeta(
  proposal: MathAuthoringProposal,
  spec: MathVisualSpec,
  steps: MathVisualTeachingStep[],
): MathTeachingVisualStepMeta | null {
  if (!proposal.teaching) return null;
  return {
    schema_version: MATH_TEACHING_VISUAL_META_VERSION,
    status: "generated",
    source: proposal.teaching.source === "none" ? "rules" : proposal.teaching.source,
    generator_version: proposal.teaching.generator_version,
    template_id: proposal.teaching.template_id,
    visual_id: preferredVisualId(spec, steps),
    strategy: proposal.decision.strategy,
    model: proposal.teaching.model,
    source_fingerprint: proposal.source_fingerprint,
  };
}

function lessonObject(value: unknown) {
  if (isRecord(value)) return { ...value };
  if (typeof value === "string" && value.trim()) {
    return { type: "simple_explanation", text: value.trim() } as Record<string, unknown>;
  }
  return { type: "visual_explanation" } as Record<string, unknown>;
}

function applyTeachingSlot(args: {
  key: "lesson" | "teach_me";
  current: unknown;
  steps: MathVisualTeachingStep[];
  proposal: MathAuthoringProposal;
  spec: MathVisualSpec;
  options: MathAuthoringProposalApplyOptions;
}): { value: unknown; result: MathAuthoringProposalApplySlotResult } {
  const before = readMathTeachingVisualOwnership(args.current);

  if (args.steps.length === 0) {
    return {
      value: args.current,
      result: {
        slot: args.key,
        action: "skipped",
        before_status: before.status,
        after_status: before.status,
        reason: "The proposal does not contain visual steps for this teaching slot.",
      },
    };
  }

  if (!canReplaceStatus(before.status, args.options)) {
    return {
      value: args.current,
      result: {
        slot: args.key,
        action: "preserved",
        before_status: before.status,
        after_status: before.status,
        reason:
          before.status === "locked"
            ? "Locked visual teaching cannot be replaced."
            : before.status === "manual"
              ? "Manual visual teaching is preserved until the author explicitly chooses to replace it."
              : "Reviewed generated visual teaching is preserved until the author explicitly chooses to replace it.",
      },
    };
  }

  const validation = validateMathVisualTeachingSteps(args.spec, args.steps, `${args.key}.visual_steps`);
  if (!validation.valid) {
    return {
      value: args.current,
      result: {
        slot: args.key,
        action: "preserved",
        before_status: before.status,
        after_status: before.status,
        reason: "The proposal teaching steps no longer validate against the accepted V2 visual.",
      },
    };
  }

  const next = lessonObject(args.current);
  next.visual_steps = deepClone(args.steps);
  next.visual_steps_meta = generatedTeachingMeta(args.proposal, args.spec, args.steps);
  const after = readMathTeachingVisualOwnership(next);

  return {
    value: next,
    result: {
      slot: args.key,
      action: "applied",
      before_status: before.status,
      after_status: after.status,
      reason: "Proposal visual teaching was applied to the local editor draft.",
    },
  };
}

/**
 * Phase 2G-C local-draft application.
 *
 * This function never writes to Supabase. It applies only a server-validated
 * MathAuthoringProposal to the local question-editor state, with explicit
 * ownership protection for existing reviewed/manual/locked work.
 */
export function applyMathAuthoringProposalToDraft(args: {
  currentVisual: MathVisualSpec | null;
  currentTeaching: Record<string, unknown>;
  proposal: MathAuthoringProposal;
  options?: MathAuthoringProposalApplyOptions;
}): MathAuthoringProposalApplyResult {
  const options = args.options ?? {};
  const slots: MathAuthoringProposalApplySlotResult[] = [];
  const messages: string[] = [];
  const currentVisualOwnership = readMathVisualAuthoringOwnership(args.currentVisual);

  if (!args.proposal.can_accept.visual || !args.proposal.visual.spec) {
    return {
      status: "invalid",
      visual: args.currentVisual,
      teaching: args.currentTeaching,
      slots: [],
      messages: ["This proposal does not contain an acceptable validated V2 visual."],
    };
  }

  let nextVisual = args.currentVisual;
  let visualApplied = false;

  if (canReplaceStatus(currentVisualOwnership.status, options)) {
    nextVisual = acceptedVisualSpec(args.proposal, args.proposal.visual.spec);
    visualApplied = true;
    slots.push({
      slot: "visual",
      action: "applied",
      before_status: currentVisualOwnership.status,
      after_status: "generated",
      reason: "The validated proposal visual was applied to the local editor draft.",
    });
  } else {
    slots.push({
      slot: "visual",
      action: "preserved",
      before_status: currentVisualOwnership.status,
      after_status: currentVisualOwnership.status,
      reason:
        currentVisualOwnership.status === "locked"
          ? "The current Math Visual is locked and cannot be replaced."
          : currentVisualOwnership.status === "manual"
            ? "The current manual Math Visual is preserved until the author explicitly chooses to replace it."
            : "The reviewed generated Math Visual is preserved until the author explicitly chooses to replace it.",
    });
  }

  let nextTeaching = deepClone(args.currentTeaching);
  const teaching = args.proposal.teaching;

  // Teaching plans are tied to the proposed visual IDs. Never apply them when
  // the proposal visual itself was not accepted into the draft.
  if (teaching && teaching.status === "generated" && args.proposal.can_accept.teaching && nextVisual) {
    if (!visualApplied) {
      const lessonBefore = readMathTeachingVisualOwnership(nextTeaching.lesson);
      const teachMeBefore = readMathTeachingVisualOwnership(nextTeaching.teach_me);
      slots.push(
        {
          slot: "lesson",
          action: "preserved",
          before_status: lessonBefore.status,
          after_status: lessonBefore.status,
          reason: "Proposal teaching was preserved because its proposal visual was not applied.",
        },
        {
          slot: "teach_me",
          action: "preserved",
          before_status: teachMeBefore.status,
          after_status: teachMeBefore.status,
          reason: "Proposal teaching was preserved because its proposal visual was not applied.",
        },
      );
    } else {
      const lesson = applyTeachingSlot({
        key: "lesson",
        current: nextTeaching.lesson,
        steps: teaching.lesson_steps,
        proposal: args.proposal,
        spec: nextVisual,
        options,
      });
      nextTeaching.lesson = lesson.value;
      slots.push(lesson.result);

      const teachMe = applyTeachingSlot({
        key: "teach_me",
        current: nextTeaching.teach_me,
        steps: teaching.teach_me_steps,
        proposal: args.proposal,
        spec: nextVisual,
        options,
      });
      nextTeaching.teach_me = teachMe.value;
      slots.push(teachMe.result);
    }
  }

  const appliedCount = slots.filter((slot) => slot.action === "applied").length;
  const preservedCount = slots.filter((slot) => slot.action === "preserved").length;

  if (appliedCount === 0) {
    messages.push("The proposal was not applied because existing protected content was preserved.");
  } else if (preservedCount > 0) {
    messages.push("The proposal was partially applied. Protected content was preserved.");
  } else {
    messages.push("The proposal was applied to the local editor draft. Use the existing Save action to persist it.");
  }

  return {
    status:
      appliedCount === 0
        ? "preserved"
        : preservedCount > 0
          ? "partial"
          : "applied",
    visual: nextVisual,
    teaching: nextTeaching,
    slots,
    messages,
  };
}
