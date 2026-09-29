import { validateMathVisualTeachingSteps } from "../../components/core-math/visual-engine/MathVisualValidator";
import type { MathVisualSpec } from "../../components/core-math/visual-engine/MathVisualTypes";
import type {
  MathVisualTeachingAction,
  MathVisualTeachingStep,
} from "../../components/core-math/visual-engine/MathVisualState";
import type { MathTeachingSemanticIssue, MathTeachingSemanticValidationResult } from "./MathTeachingSemanticTypes";
import type { MathTeachingVisualDraftResult, MathTeachingVisualRole } from "./MathTeachingVisualTypes";
import type { MathIntelligenceAnalysis, MathVisualStrategy } from "./MathIntelligenceTypes";

export const MATH_TEACHING_SEMANTIC_VALIDATOR_VERSION = "2F-D.1";

type Channel = "lesson" | "teach_me";

type TemplateProfile = {
  strategies: MathVisualStrategy[];
  required_roles: MathTeachingVisualRole[];
  minimum_role_counts?: Partial<Record<MathTeachingVisualRole, number>>;
  required_action_on_role?: Array<{
    action: MathVisualTeachingAction["action"];
    role: MathTeachingVisualRole;
  }>;
};

const TEMPLATE_PROFILES: Record<string, TemplateProfile> = {
  rectangle_area: {
    strategies: ["rectangle_dimensions"],
    required_roles: ["main_shape", "length_dimension", "width_dimension"],
    required_action_on_role: [{ action: "shade", role: "main_shape" }],
  },
  rectangle_perimeter: {
    strategies: ["rectangle_dimensions"],
    required_roles: ["main_shape", "length_dimension", "width_dimension"],
    required_action_on_role: [{ action: "trace", role: "main_shape" }],
  },
  angle_basic: {
    strategies: ["angle_diagram"],
    required_roles: ["angle_ray", "angle_region"],
    minimum_role_counts: { angle_ray: 2 },
  },
  fraction_basic: {
    strategies: ["fraction_bar", "fraction_grid"],
    required_roles: ["fraction_model"],
  },
  fraction_single_comparison: {
    strategies: ["fraction_bar", "fraction_grid"],
    required_roles: ["fraction_model"],
  },
  fraction_aligned_comparison: {
    strategies: ["aligned_fraction_bars"],
    required_roles: ["fraction_primary", "fraction_comparison_reference"],
  },
  number_line_basic: {
    strategies: ["number_line"],
    required_roles: ["number_line"],
    required_action_on_role: [{ action: "trace", role: "number_line" }],
  },
  solid_basic: {
    strategies: ["cube", "cuboid"],
    required_roles: ["solid"],
  },
  solid_volume: {
    strategies: ["cube", "cuboid"],
    required_roles: ["solid"],
  },
  data_chart_reading: {
    strategies: ["bar_chart", "line_graph", "pie_chart"],
    required_roles: ["data_chart"],
  },
  data_chart_trend: {
    strategies: ["line_graph", "bar_chart", "pie_chart"],
    required_roles: ["data_chart"],
  },
  data_table_reading: {
    strategies: ["table"],
    required_roles: ["data_table"],
  },
  clock_reading: {
    strategies: ["clock"],
    required_roles: ["clock"],
  },
  bar_model_comparison: {
    strategies: ["bar_model_comparison"],
    required_roles: ["known_bar", "unknown_bar", "difference_dimension"],
  },
  bar_model_part_whole: {
    strategies: ["bar_model_part_whole"],
    required_roles: ["part_segment", "total_dimension"],
    minimum_role_counts: { part_segment: 2 },
  },
  place_value_basic: {
    strategies: ["place_value_table"],
    required_roles: ["place_value_table"],
  },
  measurement_basic: {
    strategies: ["measurement_diagram"],
    required_roles: ["measurement_dimension"],
  },
};

function issue(
  code: MathTeachingSemanticIssue["code"],
  severity: MathTeachingSemanticIssue["severity"],
  message: string,
  extra: Partial<MathTeachingSemanticIssue> = {},
): MathTeachingSemanticIssue {
  return { code, severity, message, ...extra };
}

function actionsFor(steps: MathVisualTeachingStep[]) {
  return steps.flatMap((step) => step.actions ?? []);
}

function targetedIds(steps: MathVisualTeachingStep[]) {
  return new Set(actionsFor(steps).flatMap((action) => action.targets ?? []));
}

function actionTargets(
  steps: MathVisualTeachingStep[],
  actionKind: MathVisualTeachingAction["action"],
) {
  return new Set(
    actionsFor(steps)
      .filter((action) => action.action === actionKind)
      .flatMap((action) => action.targets ?? []),
  );
}

function idsForRole(
  draft: MathTeachingVisualDraftResult,
  role: MathTeachingVisualRole,
) {
  return new Set(draft.roles.by_role[role] ?? []);
}

function roleIsTargeted(
  draft: MathTeachingVisualDraftResult,
  steps: MathVisualTeachingStep[],
  role: MathTeachingVisualRole,
  minimum = 1,
) {
  const roleIds = idsForRole(draft, role);
  const targets = targetedIds(steps);
  let matches = 0;
  roleIds.forEach((id) => {
    if (targets.has(id)) matches += 1;
  });
  return matches >= minimum;
}

function actionHitsRole(
  draft: MathTeachingVisualDraftResult,
  steps: MathVisualTeachingStep[],
  actionKind: MathVisualTeachingAction["action"],
  role: MathTeachingVisualRole,
) {
  const roleIds = idsForRole(draft, role);
  const targets = actionTargets(steps, actionKind);
  return [...roleIds].some((id) => targets.has(id));
}

function validateStepText(
  steps: MathVisualTeachingStep[],
  channel: Channel,
  issues: MathTeachingSemanticIssue[],
) {
  steps.forEach((step) => {
    if ((step.text ?? "").trim().length > 120) {
      issues.push(
        issue(
          "STEP_TEXT_TOO_LONG",
          "error",
          "Generated visual-teaching step text must be 120 characters or fewer.",
          { channel, step_id: step.id },
        ),
      );
    }
  });
}

function validateNoGeneratedAnnotations(
  steps: MathVisualTeachingStep[],
  channel: Channel,
  issues: MathTeachingSemanticIssue[],
) {
  steps.forEach((step) => {
    (step.actions ?? []).forEach((action) => {
      if (action.action === "annotate") {
        issues.push(
          issue(
            "GENERATED_ANNOTATION_DISALLOWED",
            "error",
            "Generated visual teaching may change visual state but may not inject new mathematical annotation text.",
            { channel, step_id: step.id },
          ),
        );
      }
    });
  });
}

function validatePreferredVisual(
  draft: MathTeachingVisualDraftResult,
  steps: MathVisualTeachingStep[],
  channel: Channel,
  issues: MathTeachingSemanticIssue[],
) {
  if (!draft.visual_id) return;
  actionsFor(steps).forEach((action) => {
    if (action.visual_id !== draft.visual_id) {
      issues.push(
        issue(
          "VISUAL_ID_MISMATCH",
          "error",
          `Generated ${channel} action references visual “${action.visual_id}” instead of the resolved teaching visual “${draft.visual_id}”.`,
          { channel },
        ),
      );
    }
  });
}

function validateProfileForChannel(
  draft: MathTeachingVisualDraftResult,
  profile: TemplateProfile,
  steps: MathVisualTeachingStep[],
  channel: Channel,
  issues: MathTeachingSemanticIssue[],
) {
  for (const role of profile.required_roles) {
    const minimum = profile.minimum_role_counts?.[role] ?? 1;
    if (!roleIsTargeted(draft, steps, role, minimum)) {
      issues.push(
        issue(
          "MISSING_REQUIRED_ROLE_TARGET",
          "error",
          `${channel === "lesson" ? "Lesson" : "Teach Me"} visual steps do not target the required teaching role “${role}”${minimum > 1 ? ` at least ${minimum} times` : ""}.`,
          { channel },
        ),
      );
    }
  }

  for (const requirement of profile.required_action_on_role ?? []) {
    if (!actionHitsRole(draft, steps, requirement.action, requirement.role)) {
      issues.push(
        issue(
          "MISSING_REQUIRED_ACTION",
          "error",
          `${channel === "lesson" ? "Lesson" : "Teach Me"} visual steps must use “${requirement.action}” on the “${requirement.role}” teaching target.`,
          { channel },
        ),
      );
    }
  }
}

const NON_MATHEMATICAL_LUNA_ROLES = new Set<MathTeachingVisualRole>([
  "label",
  "annotation",
  "auxiliary",
]);

function validateLunaGuidedPlan(
  draft: MathTeachingVisualDraftResult,
  issues: MathTeachingSemanticIssue[],
) {
  if (draft.source !== "luna" || draft.template_id !== "luna_guided") return;

  if (!draft.need.requires_luna || draft.need.decision !== "route_to_luna") {
    issues.push(
      issue(
        "LUNA_FALLBACK_NOT_REQUIRED",
        "error",
        "Luna visual teaching may only be used when the Dreamscape teaching-need resolver explicitly routes the question to Luna.",
      ),
    );
  }

  const channels: Array<[Channel, MathVisualTeachingStep[], number, number]> = [
    ["lesson", draft.lesson_steps, 2, 4],
    ["teach_me", draft.teach_me_steps, 3, 6],
  ];

  const meaningfulIds = new Set(
    draft.roles.targets
      .filter((target) =>
        target.roles.some((role) => !NON_MATHEMATICAL_LUNA_ROLES.has(role)),
      )
      .map((target) => target.object_id),
  );

  for (const [channel, steps, minimum, maximum] of channels) {
    if (steps.length < minimum || steps.length > maximum) {
      issues.push(
        issue(
          "LUNA_PLAN_TOO_SHALLOW",
          "error",
          `${channel === "lesson" ? "Lesson" : "Teach Me"} Luna plan must contain ${minimum}-${maximum} progressive visual steps.`,
          { channel },
        ),
      );
    }

    const targeted = targetedIds(steps);
    if (![...targeted].some((id) => meaningfulIds.has(id))) {
      issues.push(
        issue(
          "LUNA_PLAN_TARGETS_NO_MATH_OBJECT",
          "error",
          `${channel === "lesson" ? "Lesson" : "Teach Me"} Luna plan does not target a mathematically meaningful V2 object.`,
          { channel },
        ),
      );
    }

    if (
      channel === "teach_me" &&
      (draft.roles.targetability === "rich" || draft.roles.targetability === "partial")
    ) {
      const distinctMeaningfulTargets = [...targeted].filter((id) => meaningfulIds.has(id));
      if (new Set(distinctMeaningfulTargets).size < 2) {
        issues.push(
          issue(
            "LUNA_PLAN_TOO_SHALLOW",
            "error",
            "Teach Me Luna plan should use at least two meaningful visual targets when the V2 visual exposes multiple conceptual targets.",
            { channel },
          ),
        );
      }
    }
  }
}

function validatePedagogicalFocus(
  analysis: MathIntelligenceAnalysis,
  draft: MathTeachingVisualDraftResult,
  issues: MathTeachingSemanticIssue[],
) {
  if (draft.template_id === "rectangle_area") {
    const target = analysis.interpretation.target.kind;
    const structure = analysis.interpretation.problem_structure;
    if (target !== "area" && structure !== "area") {
      issues.push(
        issue(
          "WRONG_PEDAGOGICAL_FOCUS",
          "error",
          "Area teaching was generated for a question whose interpreted target is not area.",
        ),
      );
    }
  }

  if (draft.template_id === "rectangle_perimeter") {
    const target = analysis.interpretation.target.kind;
    const structure = analysis.interpretation.problem_structure;
    if (target !== "perimeter" && structure !== "perimeter") {
      issues.push(
        issue(
          "WRONG_PEDAGOGICAL_FOCUS",
          "error",
          "Perimeter teaching was generated for a question whose interpreted target is not perimeter.",
        ),
      );
    }
  }

  if (draft.template_id === "solid_volume") {
    const target = analysis.interpretation.target.kind;
    const structure = analysis.interpretation.problem_structure;
    if (target !== "volume" && structure !== "volume") {
      issues.push(
        issue(
          "WRONG_PEDAGOGICAL_FOCUS",
          "error",
          "Volume teaching was generated for a question whose interpreted target is not volume.",
        ),
      );
    }
  }

  if (draft.template_id === "data_chart_trend") {
    if (analysis.interpretation.problem_structure !== "trend") {
      issues.push(
        issue(
          "WRONG_PEDAGOGICAL_FOCUS",
          "error",
          "Trend teaching was generated for a question that was not interpreted as a trend problem.",
        ),
      );
    }
  }
}

function validateUnknownStateSafety(
  spec: MathVisualSpec,
  draft: MathTeachingVisualDraftResult,
  issues: MathTeachingSemanticIssue[],
) {
  if (draft.strategy !== "bar_model_comparison" && draft.strategy !== "bar_model_part_whole") {
    return;
  }

  const visual = draft.visual_id
    ? spec.visuals.find((candidate) => candidate.id === draft.visual_id)
    : null;
  if (!visual) return;

  const unknownIds = new Set([
    ...(draft.roles.by_role.unknown_value ?? []),
    ...(draft.roles.by_role.unknown_bar ?? []),
  ]);

  for (const id of unknownIds) {
    const object = visual.objects.find((candidate) => candidate.id === id);
    if (!object) continue;
    if (object.type === "text" && object.text.trim() !== "?") {
      issues.push(
        issue(
          "UNKNOWN_VALUE_STATE_UNSAFE",
          "error",
          `Unknown teaching target “${id}” no longer contains the expected “?” marker. Visual teaching must not replace the unknown with a solved value.`,
          { object_id: id },
        ),
      );
    }
  }
}

export function validateMathTeachingVisualDraft(
  analysis: MathIntelligenceAnalysis,
  spec: MathVisualSpec,
  draft: MathTeachingVisualDraftResult,
): MathTeachingSemanticValidationResult {
  const issues: MathTeachingSemanticIssue[] = [];

  const lessonCross = validateMathVisualTeachingSteps(
    spec,
    draft.lesson_steps,
    "teaching.lesson.visual_steps",
  );
  const teachMeCross = validateMathVisualTeachingSteps(
    spec,
    draft.teach_me_steps,
    "teaching.teach_me.visual_steps",
  );

  if (draft.status !== "generated") {
    issues.push(
      issue(
        "DRAFT_NOT_GENERATED",
        "error",
        `Teaching visual draft has status “${draft.status}” and cannot be merged as generated teaching.`,
      ),
    );
  }

  if (draft.lesson_steps.length === 0) {
    issues.push(issue("EMPTY_LESSON_STEPS", "error", "Generated lesson visual steps are empty.", { channel: "lesson" }));
  }
  if (draft.teach_me_steps.length === 0) {
    issues.push(issue("EMPTY_TEACH_ME_STEPS", "error", "Generated Teach Me visual steps are empty.", { channel: "teach_me" }));
  }

  if (!lessonCross.valid || !teachMeCross.valid) {
    issues.push(
      issue(
        "CROSS_REFERENCE_INVALID",
        "error",
        "Generated teaching contains a visual/object reference or visual action that is not valid for the V2 spec.",
      ),
    );
  }

  const isLunaGuided = draft.source === "luna" && draft.template_id === "luna_guided";
  const profile = draft.template_id ? TEMPLATE_PROFILES[draft.template_id] : null;
  if (!isLunaGuided && !profile) {
    issues.push(
      issue(
        "UNSUPPORTED_TEMPLATE",
        "error",
        `Teaching template “${draft.template_id ?? "none"}” is not registered with the semantic validator.`,
      ),
    );
  } else if (profile) {
    if (!profile.strategies.includes(analysis.strategy)) {
      issues.push(
        issue(
          "TEMPLATE_STRATEGY_MISMATCH",
          "error",
          `Teaching template “${draft.template_id}” is not valid for Math visual strategy “${analysis.strategy}”.`,
        ),
      );
    }

    validateProfileForChannel(draft, profile, draft.lesson_steps, "lesson", issues);
    validateProfileForChannel(draft, profile, draft.teach_me_steps, "teach_me", issues);
  }

  validateLunaGuidedPlan(draft, issues);

  validateStepText(draft.lesson_steps, "lesson", issues);
  validateStepText(draft.teach_me_steps, "teach_me", issues);
  validateNoGeneratedAnnotations(draft.lesson_steps, "lesson", issues);
  validateNoGeneratedAnnotations(draft.teach_me_steps, "teach_me", issues);
  validatePreferredVisual(draft, draft.lesson_steps, "lesson", issues);
  validatePreferredVisual(draft, draft.teach_me_steps, "teach_me", issues);
  validatePedagogicalFocus(analysis, draft, issues);
  validateUnknownStateSafety(spec, draft, issues);

  const error = issues.some((item) => item.severity === "error");
  const warning = issues.some((item) => item.severity === "warning");

  return {
    valid: !error,
    review_required: !error && warning,
    validator_version: MATH_TEACHING_SEMANTIC_VALIDATOR_VERSION,
    strategy: analysis.strategy,
    template_id: draft.template_id,
    issues,
    cross_reference: {
      lesson_valid: lessonCross.valid,
      teach_me_valid: teachMeCross.valid,
      lesson_issues: lessonCross.issues,
      teach_me_issues: teachMeCross.issues,
    },
  };
}
