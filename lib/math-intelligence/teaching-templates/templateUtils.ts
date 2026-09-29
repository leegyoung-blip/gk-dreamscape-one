import type {
  MathVisualActionKind,
  MathVisualTeachingAction,
  MathVisualTeachingStep,
} from "../../../components/core-math/visual-engine/MathVisualState";
import type { MathVisualSpec } from "../../../components/core-math/visual-engine/MathVisualTypes";
import type { MathIntelligenceAnalysis } from "../MathIntelligenceTypes";
import type {
  MathTeachingVisualRole,
  MathVisualTeachingRoleResolution,
} from "../MathTeachingVisualTypes";

export type MathTeachingTemplateContext = {
  analysis: MathIntelligenceAnalysis;
  spec: MathVisualSpec;
  roles: MathVisualTeachingRoleResolution;
  visual_id: string;
};

export type MathTeachingTemplatePlan = {
  template_id: string;
  lesson_steps: MathVisualTeachingStep[];
  teach_me_steps: MathVisualTeachingStep[];
};

export function idsForRole(
  context: MathTeachingTemplateContext,
  role: MathTeachingVisualRole,
) {
  return context.roles.targets
    .filter(
      (target) =>
        target.visual_id === context.visual_id && target.roles.includes(role),
    )
    .map((target) => target.object_id);
}

export function firstIdForRole(
  context: MathTeachingTemplateContext,
  role: MathTeachingVisualRole,
) {
  return idsForRole(context, role)[0] ?? null;
}

export function objectById(
  context: MathTeachingTemplateContext,
  objectId: string,
) {
  const visual = context.spec.visuals.find(
    (candidate) => candidate.id === context.visual_id,
  );
  return visual?.objects.find((object) => object.id === objectId) ?? null;
}

export function objectsForVisual(context: MathTeachingTemplateContext) {
  return (
    context.spec.visuals.find((candidate) => candidate.id === context.visual_id)
      ?.objects ?? []
  );
}

function cleanStepText(value: string) {
  const compact = value.trim().replace(/\s+/g, " ");
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117).trimEnd()}…`;
}

export function action(
  context: MathTeachingTemplateContext,
  actionKind: MathVisualActionKind,
  targets: string | string[],
  text?: string,
): MathVisualTeachingAction {
  const targetIds = Array.isArray(targets) ? targets : [targets];
  return {
    visual_id: context.visual_id,
    targets: [...new Set(targetIds.filter(Boolean))],
    action: actionKind,
    ...(text?.trim() ? { text: cleanStepText(text) } : {}),
  };
}

export function step(
  id: string,
  text: string,
  actions: MathVisualTeachingAction | MathVisualTeachingAction[],
): MathVisualTeachingStep {
  return {
    id,
    text: cleanStepText(text),
    actions: Array.isArray(actions) ? actions : [actions],
  };
}

export function allExistingTargets(
  context: MathTeachingTemplateContext,
  values: Array<string | null | undefined>,
) {
  const existing = new Set(objectsForVisual(context).map((object) => object.id));
  return [...new Set(values.filter((value): value is string => Boolean(value) && existing.has(value as string)))];
}
