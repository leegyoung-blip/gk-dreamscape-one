/**
 * DREAMSCAPE Math Visual Engine — runtime visual state + teaching actions.
 *
 * The stored MathVisualSpec is immutable. Teaching, hints and worked examples
 * create a separate runtime state that changes how objects are presented.
 */

import type { MathVisualSpec } from "./MathVisualTypes";

export type MathVisualActionKind =
  | "highlight"
  | "dim"
  | "hide"
  | "show"
  | "reveal"
  | "shade"
  | "unshade"
  | "emphasise"
  | "trace"
  | "annotate";

export type MathVisualTeachingAction = {
  visual_id: string;
  targets: string[];
  action: MathVisualActionKind;
  /** Required for annotate. Ignored by other actions. */
  text?: string;
  /** Optional renderer hint; curriculum correctness never depends on timing. */
  duration_ms?: number;
};

export type MathVisualTeachingStep = {
  id?: string;
  text?: string;
  actions: MathVisualTeachingAction[];
};

export type MathVisualAnnotationState = {
  text: string;
};

export type MathVisualObjectRuntimeState = {
  visibility?: "inherit" | "hidden" | "visible";
  highlighted?: boolean;
  dimmed?: boolean;
  shaded?: boolean;
  emphasised?: boolean;
  traced?: boolean;
  revealed?: boolean;
  annotation?: MathVisualAnnotationState | null;
};

export type MathVisualVisualRuntimeState = {
  objects: Record<string, MathVisualObjectRuntimeState>;
};

export type MathVisualRuntimeState = {
  visuals: Record<string, MathVisualVisualRuntimeState>;
};

export function createEmptyMathVisualState(): MathVisualRuntimeState {
  return { visuals: {} };
}

export function cloneMathVisualState(
  state: MathVisualRuntimeState,
): MathVisualRuntimeState {
  const visuals: MathVisualRuntimeState["visuals"] = {};

  for (const [visualId, visualState] of Object.entries(state.visuals)) {
    const objects: MathVisualVisualRuntimeState["objects"] = {};
    for (const [objectId, objectState] of Object.entries(visualState.objects)) {
      objects[objectId] = {
        ...objectState,
        annotation: objectState.annotation
          ? { ...objectState.annotation }
          : objectState.annotation,
      };
    }
    visuals[visualId] = { objects };
  }

  return { visuals };
}

function ensureObjectState(
  state: MathVisualRuntimeState,
  visualId: string,
  objectId: string,
) {
  state.visuals[visualId] ??= { objects: {} };
  state.visuals[visualId].objects[objectId] ??= {};
  return state.visuals[visualId].objects[objectId];
}

/**
 * Applies one action immutably. Reference existence is validated elsewhere;
 * this function deliberately stays deterministic and side-effect free.
 */
export function applyMathVisualAction(
  current: MathVisualRuntimeState,
  action: MathVisualTeachingAction,
): MathVisualRuntimeState {
  const next = cloneMathVisualState(current);

  for (const objectId of action.targets) {
    const objectState = ensureObjectState(next, action.visual_id, objectId);

    switch (action.action) {
      case "highlight":
        objectState.highlighted = true;
        objectState.dimmed = false;
        break;
      case "dim":
        objectState.dimmed = true;
        objectState.highlighted = false;
        break;
      case "hide":
        objectState.visibility = "hidden";
        break;
      case "show":
        objectState.visibility = "visible";
        objectState.revealed = false;
        break;
      case "reveal":
        objectState.visibility = "visible";
        objectState.revealed = true;
        break;
      case "shade":
        objectState.shaded = true;
        break;
      case "unshade":
        objectState.shaded = false;
        break;
      case "emphasise":
        objectState.emphasised = true;
        objectState.dimmed = false;
        break;
      case "trace":
        objectState.traced = true;
        break;
      case "annotate":
        objectState.annotation = {
          text: String(action.text ?? ""),
        };
        break;
    }
  }

  return next;
}

export function applyMathVisualActions(
  current: MathVisualRuntimeState,
  actions: MathVisualTeachingAction[],
): MathVisualRuntimeState {
  return actions.reduce(applyMathVisualAction, current);
}

/**
 * Build the state for a teaching step.
 *
 * cumulative=true means step 3 contains the effects of steps 1 + 2 + 3.
 * cumulative=false means only the selected step is applied.
 */
export function buildMathVisualStateForStep(
  steps: MathVisualTeachingStep[],
  stepIndex: number,
  options: { cumulative?: boolean } = {},
): MathVisualRuntimeState {
  const { cumulative = true } = options;
  if (stepIndex < 0 || steps.length === 0) return createEmptyMathVisualState();

  const lastIndex = Math.min(stepIndex, steps.length - 1);
  const selectedSteps = cumulative
    ? steps.slice(0, lastIndex + 1)
    : [steps[lastIndex]];

  return selectedSteps.reduce(
    (state, step) => applyMathVisualActions(state, step.actions || []),
    createEmptyMathVisualState(),
  );
}

export function getMathVisualObjectState(
  state: MathVisualRuntimeState | undefined,
  visualId: string,
  objectId: string,
): MathVisualObjectRuntimeState {
  return state?.visuals?.[visualId]?.objects?.[objectId] ?? {};
}

/**
 * Useful for renderers that want an initial state object for every known
 * visual/object while still keeping the curriculum spec immutable.
 */
export function seedMathVisualState(
  spec: MathVisualSpec,
): MathVisualRuntimeState {
  const state = createEmptyMathVisualState();

  for (const visual of spec.visuals) {
    state.visuals[visual.id] = { objects: {} };
    for (const object of visual.objects) {
      state.visuals[visual.id].objects[object.id] = {};
    }
  }

  return state;
}
