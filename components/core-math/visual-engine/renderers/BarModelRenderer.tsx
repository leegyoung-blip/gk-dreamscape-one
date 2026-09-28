import type {
  MathBarModelObject,
  MathRectangleObject,
  MathTextObject,
  MathVisualTone,
} from "../MathVisualTypes";
import RectanglePrimitive from "../primitives/Rectangle";
import TextPrimitive from "../primitives/Text";
import {
  childObjectId,
  childRuntimeState,
  mergeStyle,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

const SEGMENT_TONES: MathVisualTone[] = ["accent", "muted", "success", "warning"];

export default function BarModelRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathBarModelObject>) {
  const values = object.segments.map((segment) => Math.max(0, segment.value));
  const total = values.reduce((sum, value) => sum + value, 0);
  const effectiveTotal = total > 0 ? total : Math.max(1, object.segments.length);
  const childState = childRuntimeState(runtimeState, { shaded: undefined });
  let cursor = object.x;

  const segments = object.segments.map((segment, index) => {
    const ratio = total > 0 ? values[index] / effectiveTotal : 1 / effectiveTotal;
    const width = index === object.segments.length - 1
      ? object.x + object.width - cursor
      : object.width * ratio;
    const x = cursor;
    cursor += width;
    const shaded = runtimeState?.shaded === true;
    const rectangle: MathRectangleObject = {
      id: childObjectId(object.id, `segment_${segment.id}`),
      type: "rectangle",
      x,
      y: object.y,
      width,
      height: object.height,
      style: mergeStyle(object.style, {
        tone: shaded ? "accent" : SEGMENT_TONES[index % SEGMENT_TONES.length],
        fill: runtimeState?.shaded === false ? "none" : "light",
      }),
    };
    return { segment, rectangle };
  });

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.x + object.width / 2, y: object.y - 6 }}
    >
      {segments.map(({ segment, rectangle }) => {
        const centerX = rectangle.x + rectangle.width / 2;
        const label: MathTextObject = {
          id: childObjectId(object.id, `label_${segment.id}`),
          type: "text",
          x: centerX,
          y: object.y + object.height / 2 - 3,
          text: segment.label || "",
          anchor: "middle",
          role: "label",
          style: object.style,
        };
        const value: MathTextObject = {
          id: childObjectId(object.id, `value_${segment.id}`),
          type: "text",
          x: centerX,
          y: object.y + object.height / 2 + 23,
          text: formatNumber(segment.value),
          anchor: "middle",
          role: "value",
          style: object.style,
        };
        return (
          <g key={segment.id}>
            <RectanglePrimitive object={rectangle} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />
            {segment.label && <TextPrimitive object={label} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childRuntimeState(runtimeState)} />}
            <TextPrimitive object={value} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childRuntimeState(runtimeState)} />
          </g>
        );
      })}

      {object.total_label && (
        <TextPrimitive
          object={{
            id: childObjectId(object.id, "total_label"),
            type: "text",
            x: object.x + object.width / 2,
            y: object.y - 16,
            text: object.total_label,
            anchor: "middle",
            role: "label",
            style: object.style,
          }}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childRuntimeState(runtimeState)}
        />
      )}
    </SemanticObjectGroup>
  );
}

function formatNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}
