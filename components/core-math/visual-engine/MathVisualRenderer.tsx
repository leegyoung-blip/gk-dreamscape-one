import type {
  MathCanvas,
  MathVisual,
  MathVisualObject,
  MathVisualPlacement,
  MathVisualSpec,
} from "./MathVisualTypes";
import {
  getMathVisualObjectState,
  type MathVisualRuntimeState,
} from "./MathVisualState";
import MathPrimitiveRenderer, {
  isMathPrimitiveObject,
} from "./primitives/MathPrimitiveRenderer";
import {
  sanitiseSvgId,
  type PrimitiveObjectMap,
  type PrimitivePointMap,
} from "./primitives/PrimitiveRenderUtils";
import MathSemanticRenderer, {
  isSemanticMathObject,
} from "./renderers/MathSemanticRenderer";

export type MathVisualRenderSize = "compact" | "standard" | "large";

export type MathVisualRendererProps = {
  /** A schema-valid V2 Math Visual document. */
  spec: MathVisualSpec;
  /** Render one exact visual. Takes priority over placement filtering. */
  visualId?: string;
  /** Defaults to prompt when visualId is not supplied. */
  placement?: MathVisualPlacement;
  /** Narrows option-placement visuals to one answer option. */
  optionId?: string;
  /** Runtime teaching/highlight state. The stored spec remains immutable. */
  runtimeState?: MathVisualRuntimeState;
  size?: MathVisualRenderSize;
  className?: string;
  /** Shows visual.title as visible text above the SVG. */
  showTitle?: boolean;
};

const DEFAULT_CANVAS: Required<Pick<MathCanvas, "width" | "height">> = {
  width: 720,
  height: 360,
};

const MAX_HEIGHT_BY_SIZE: Record<MathVisualRenderSize, number> = {
  compact: 230,
  standard: 380,
  large: 540,
};

/**
 * Universal DREAMSCAPE Math Visual V2 renderer.
 *
 * Responsibilities:
 * - selects the requested visual(s) from one MathVisualSpec;
 * - builds point/object indexes once per visual;
 * - renders objects in deterministic z-order;
 * - routes primitive and semantic objects through the same SVG scene;
 * - applies Teaching Engine runtime state without mutating curriculum data;
 * - provides a responsive viewBox-based SVG surface.
 *
 * This component intentionally does not parse legacy MathVisual V1 data.
 * Compatibility belongs in Phase 1A-7 so the V2 renderer stays canonical.
 */
export default function MathVisualRenderer({
  spec,
  visualId,
  placement,
  optionId,
  runtimeState,
  size = "standard",
  className,
  showTitle = false,
}: MathVisualRendererProps) {
  const visuals = selectVisuals(spec, { visualId, placement, optionId });
  if (visuals.length === 0) return null;

  return (
    <div
      className={className}
      data-math-visual-engine="v2"
      data-math-visual-count={visuals.length}
      style={{
        display: "grid",
        gap: visuals.length > 1 ? "12px" : "0",
        width: "100%",
        minWidth: 0,
      }}
    >
      {visuals.map((visual) => (
        <MathVisualScene
          key={visual.id}
          visual={visual}
          runtimeState={runtimeState}
          size={size}
          showTitle={showTitle}
        />
      ))}
    </div>
  );
}

function MathVisualScene({
  visual,
  runtimeState,
  size,
  showTitle,
}: {
  visual: MathVisual;
  runtimeState?: MathVisualRuntimeState;
  size: MathVisualRenderSize;
  showTitle: boolean;
}) {
  const canvas = resolveCanvas(visual.canvas);
  const { points, objectsById } = buildSceneIndexes(visual);
  const orderedObjects = orderVisualObjects(visual.objects);
  const label = visual.aria_label || visual.title || "Mathematics visual";
  const sceneId = `math-visual-${sanitiseSvgId(visual.id)}`;

  return (
    <div
      data-math-visual-scene={visual.id}
      data-math-visual-placement={visual.placement}
      data-math-visual-kind={visual.kind}
      data-math-visual-option-id={visual.option_id || undefined}
      style={{ width: "100%", minWidth: 0 }}
    >
      {showTitle && visual.title ? (
        <div
          style={{
            margin: "0 0 8px",
            fontSize: "14px",
            fontWeight: 800,
            lineHeight: 1.3,
          }}
        >
          {visual.title}
        </div>
      ) : null}

      <svg
        id={sceneId}
        role="img"
        aria-label={label}
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="auto"
        data-math-visual-id={visual.id}
        data-math-visual-schema-version="2"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          maxHeight: `${MAX_HEIGHT_BY_SIZE[size]}px`,
          overflow: "visible",
        }}
      >
        <title>{label}</title>

        {canvas.background === "paper" ? (
          <rect
            x="0"
            y="0"
            width={canvas.width}
            height={canvas.height}
            rx="12"
            fill="#ffffff"
          />
        ) : null}

        {orderedObjects.map((object) => {
          const objectState = getMathVisualObjectState(
            runtimeState,
            visual.id,
            object.id,
          );

          if (isMathPrimitiveObject(object)) {
            return (
              <MathPrimitiveRenderer
                key={object.id}
                object={object}
                visualId={visual.id}
                points={points}
                objectsById={objectsById}
                runtimeState={objectState}
              />
            );
          }

          if (isSemanticMathObject(object)) {
            return (
              <MathSemanticRenderer
                key={object.id}
                object={object}
                visualId={visual.id}
                points={points}
                objectsById={objectsById}
                runtimeState={objectState}
                canvas={canvas}
              />
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
}

function selectVisuals(
  spec: MathVisualSpec,
  selection: {
    visualId?: string;
    placement?: MathVisualPlacement;
    optionId?: string;
  },
) {
  const visuals = Array.isArray(spec?.visuals) ? spec.visuals : [];

  if (selection.visualId) {
    const exact = visuals.find((visual) => visual.id === selection.visualId);
    return exact ? [exact] : [];
  }

  const placement = selection.placement ?? "prompt";

  return visuals.filter((visual) => {
    if (visual.placement !== placement) return false;
    if (placement !== "option") return true;
    if (!selection.optionId) return true;
    return visual.option_id === selection.optionId;
  });
}

function resolveCanvas(canvas?: MathCanvas): MathCanvas & {
  width: number;
  height: number;
} {
  return {
    width: Math.max(160, Number(canvas?.width ?? DEFAULT_CANVAS.width)),
    height: Math.max(120, Number(canvas?.height ?? DEFAULT_CANVAS.height)),
    padding: Math.max(0, Number(canvas?.padding ?? 28)),
    background: canvas?.background ?? "transparent",
  };
}

function buildSceneIndexes(visual: MathVisual): {
  points: PrimitivePointMap;
  objectsById: PrimitiveObjectMap;
} {
  const points: PrimitivePointMap = new Map();
  const objectsById: PrimitiveObjectMap = new Map();

  for (const object of visual.objects) {
    objectsById.set(object.id, object);
    if (object.type === "point") {
      points.set(object.id, { x: object.x, y: object.y });
    }
  }

  return { points, objectsById };
}

/**
 * z_index always wins. Objects without one get a deterministic default layer.
 * Original authoring order is the final stable tie-breaker.
 */
function orderVisualObjects(objects: MathVisualObject[]) {
  return objects
    .map((object, index) => ({ object, index }))
    .sort((left, right) => {
      const zDifference =
        effectiveZIndex(left.object) - effectiveZIndex(right.object);
      return zDifference || left.index - right.index;
    })
    .map(({ object }) => object);
}

function effectiveZIndex(object: MathVisualObject) {
  if (Number.isFinite(object.z_index)) return Number(object.z_index);

  switch (object.type) {
    case "grid":
      return -100;
    case "shade":
      return -80;
    case "rectangle":
    case "polygon":
    case "circle":
    case "triangle":
    case "quadrilateral":
    case "fraction_bar":
    case "fraction_grid":
    case "cube":
    case "cuboid":
    case "net":
    case "bar_chart":
    case "line_graph":
    case "pie_chart":
    case "table":
    case "clock":
    case "bar_model":
      return 0;
    case "axis":
    case "number_line":
      return 10;
    case "line":
    case "arrow":
    case "arc":
    case "composite_shape":
      return 20;
    case "dimension":
    case "angle_marker":
    case "right_angle_marker":
      return 30;
    case "point":
      return 40;
    case "text":
      return 50;
  }
}
