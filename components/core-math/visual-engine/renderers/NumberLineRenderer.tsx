import type {
  MathArrowObject,
  MathLineObject,
  MathNumberLineObject,
  MathPointObject,
  MathTextObject,
} from "../MathVisualTypes";
import ArrowPrimitive from "../primitives/Arrow";
import LinePrimitive from "../primitives/Line";
import PointPrimitive from "../primitives/Point";
import TextPrimitive from "../primitives/Text";
import {
  childObjectId,
  childRuntimeState,
  mergeStyle,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

export default function NumberLineRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathNumberLineObject>) {
  const min = Number(object.min);
  const max = Number(object.max);
  const step = Number(object.step);
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(step) || step <= 0) {
    return null;
  }

  const childState = childRuntimeState(runtimeState);
  const arrows = object.arrows ?? "end";
  const baseline = arrows === "none"
    ? ({
        id: childObjectId(object.id, "baseline"),
        type: "line",
        from: { x: object.x, y: object.y },
        to: { x: object.x + object.width, y: object.y },
        style: object.style,
      } satisfies MathLineObject)
    : ({
        id: childObjectId(object.id, "baseline"),
        type: "arrow",
        from: { x: object.x, y: object.y },
        to: { x: object.x + object.width, y: object.y },
        arrow_start: arrows === "both",
        arrow_end: true,
        style: object.style,
      } satisfies MathArrowObject);

  const maxTickCount = 120;
  const tickCount = Math.min(maxTickCount, Math.floor(span / step + 1e-9) + 1);
  const values = Array.from({ length: Math.max(2, tickCount) }, (_, index) =>
    min + index * step,
  ).filter((value) => value <= max + step * 1e-6);

  const labelledSet = object.labelled_values
    ? new Set(object.labelled_values.map((value) => normaliseNumberKey(value)))
    : null;
  const highlightedSet = new Set(
    (object.highlighted_values || []).map((value) => normaliseNumberKey(value)),
  );

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.x + object.width / 2, y: object.y - 22 }}
    >
      {baseline.type === "line" ? (
        <LinePrimitive
          object={baseline}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      ) : (
        <ArrowPrimitive
          object={baseline}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      )}

      {values.map((value, index) => {
        const ratio = (value - min) / span;
        const x = object.x + ratio * object.width;
        const key = normaliseNumberKey(value);
        const highlighted = highlightedSet.has(key);

        const tick: MathLineObject = {
          id: childObjectId(object.id, `tick_${index}`),
          type: "line",
          from: { x, y: object.y - (highlighted ? 13 : 9) },
          to: { x, y: object.y + (highlighted ? 13 : 9) },
          style: mergeStyle(object.style, {
            tone: highlighted ? "accent" : object.style?.tone,
            stroke_width: highlighted ? 4 : Math.max(2, object.style?.stroke_width ?? 2),
          }),
        };

        const label: MathTextObject = {
          id: childObjectId(object.id, `label_${index}`),
          type: "text",
          x,
          y: object.y + 32,
          text: formatNumber(value),
          anchor: "middle",
          role: "label",
          style: mergeStyle(object.style, {
            tone: highlighted ? "accent" : object.style?.tone,
          }),
        };

        const marker: MathPointObject = {
          id: childObjectId(object.id, `marker_${index}`),
          type: "point",
          x,
          y: object.y,
          show_marker: true,
          style: mergeStyle(object.style, { tone: "accent" }),
        };

        const shouldLabel = !labelledSet || labelledSet.has(key);

        return (
          <g key={`${object.id}-${index}`}>
            <LinePrimitive
              object={tick}
              visualId={visualId}
              points={points}
              objectsById={objectsById}
              runtimeState={childState}
            />
            {highlighted && (
              <PointPrimitive
                object={marker}
                visualId={visualId}
                points={points}
                objectsById={objectsById}
                runtimeState={childState}
              />
            )}
            {shouldLabel && (
              <TextPrimitive
                object={label}
                visualId={visualId}
                points={points}
                objectsById={objectsById}
                runtimeState={childState}
              />
            )}
          </g>
        );
      })}
    </SemanticObjectGroup>
  );
}

function normaliseNumberKey(value: number) {
  return Number(value.toFixed(9)).toString();
}

function formatNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}
