import type {
  MathVisualActionKind,
  MathVisualTeachingAction,
  MathVisualTeachingStep,
} from "./MathVisualState";

export type MathVisualTeachingReadIssue = {
  path: string;
  message: string;
};

export type MathVisualTeachingReadResult = {
  steps: MathVisualTeachingStep[];
  issues: MathVisualTeachingReadIssue[];
};

const ACTIONS = new Set<MathVisualActionKind>([
  "highlight",
  "dim",
  "hide",
  "show",
  "reveal",
  "shade",
  "unshade",
  "emphasise",
  "trace",
  "annotate",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => textValue(item)).filter(Boolean)
    : [];
}

/**
 * Reads authored visual_steps without trusting arbitrary curriculum JSON.
 *
 * Canonical V2 uses:
 *   { visual_id, targets, action, text? }
 *
 * During authoring/migration we also accept target_ids as an input alias so
 * older draft examples can be normalised once and rendered canonically.
 */
export function readMathVisualTeachingSteps(
  value: unknown,
): MathVisualTeachingReadResult {
  if (value == null) return { steps: [], issues: [] };

  if (!Array.isArray(value)) {
    return {
      steps: [],
      issues: [
        {
          path: "visual_steps",
          message: "Math visual teaching steps must be an array.",
        },
      ],
    };
  }

  const issues: MathVisualTeachingReadIssue[] = [];
  const steps: MathVisualTeachingStep[] = [];

  value.forEach((rawStep, stepIndex) => {
    const stepPath = `visual_steps[${stepIndex}]`;
    if (!isRecord(rawStep)) {
      issues.push({ path: stepPath, message: "Teaching step must be an object." });
      return;
    }

    const rawActions = Array.isArray(rawStep.actions) ? rawStep.actions : [];
    const actions: MathVisualTeachingAction[] = [];

    rawActions.forEach((rawAction, actionIndex) => {
      const actionPath = `${stepPath}.actions[${actionIndex}]`;
      if (!isRecord(rawAction)) {
        issues.push({ path: actionPath, message: "Visual action must be an object." });
        return;
      }

      const visualId = textValue(rawAction.visual_id);
      const actionName = textValue(rawAction.action) as MathVisualActionKind;
      const targets = stringArray(
        rawAction.targets ?? rawAction.target_ids,
      );

      if (!visualId) {
        issues.push({ path: `${actionPath}.visual_id`, message: "visual_id is required." });
        return;
      }

      if (!ACTIONS.has(actionName)) {
        issues.push({
          path: `${actionPath}.action`,
          message: `Unsupported Math visual action “${String(rawAction.action ?? "")}”.`,
        });
        return;
      }

      if (targets.length === 0) {
        issues.push({
          path: `${actionPath}.targets`,
          message: "At least one target object ID is required.",
        });
        return;
      }

      const duration = Number(rawAction.duration_ms);
      const action: MathVisualTeachingAction = {
        visual_id: visualId,
        targets,
        action: actionName,
      };

      const annotationText = textValue(rawAction.text);
      if (annotationText) action.text = annotationText;
      if (Number.isFinite(duration) && duration >= 0) {
        action.duration_ms = duration;
      }

      actions.push(action);
    });

    steps.push({
      ...(textValue(rawStep.id) ? { id: textValue(rawStep.id) } : {}),
      ...(textValue(rawStep.text) ? { text: textValue(rawStep.text) } : {}),
      actions,
    });
  });

  return { steps, issues };
}

export function getMathVisualTeachingStepSource(
  lessonSource: unknown,
): unknown {
  if (!isRecord(lessonSource)) return null;
  return lessonSource.visual_steps ?? null;
}

/**
 * Chooses the visual(s) that should stay on screen for one teaching step.
 * If a text-only step has no action, it keeps the most recently referenced
 * visual visible instead of making the diagram disappear.
 */
export function getMathVisualIdsForTeachingStep(
  steps: MathVisualTeachingStep[],
  stepIndex: number,
): string[] {
  if (steps.length === 0) return [];

  const bounded = Math.max(0, Math.min(stepIndex, steps.length - 1));

  for (let index = bounded; index >= 0; index -= 1) {
    const ids = Array.from(
      new Set(
        (steps[index]?.actions ?? [])
          .map((action) => action.visual_id)
          .filter(Boolean),
      ),
    );
    if (ids.length > 0) return ids;
  }

  return [];
}
