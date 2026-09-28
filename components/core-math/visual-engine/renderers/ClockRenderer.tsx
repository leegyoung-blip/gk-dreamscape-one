import type {
  MathCircleObject,
  MathClockObject,
  MathLineObject,
  MathTextObject,
} from "../MathVisualTypes";
import CirclePrimitive from "../primitives/Circle";
import LinePrimitive from "../primitives/Line";
import TextPrimitive from "../primitives/Text";
import {
  childObjectId,
  childRuntimeState,
  mergeStyle,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

export default function ClockRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathClockObject>) {
  const childState = childRuntimeState(runtimeState);
  const face: MathCircleObject = {
    id: childObjectId(object.id, "face"),
    type: "circle",
    cx: object.cx,
    cy: object.cy,
    radius: object.radius,
    style: mergeStyle(object.style, { fill: "light" }),
  };

  const hour = ((object.hour % 12) + 12) % 12;
  const minute = ((object.minute % 60) + 60) % 60;
  const minuteAngle = minute * 6 - 90;
  const hourAngle = hour * 30 + minute * 0.5 - 90;
  const minuteEnd = polar(object.cx, object.cy, object.radius * 0.72, minuteAngle);
  const hourEnd = polar(object.cx, object.cy, object.radius * 0.5, hourAngle);

  const minuteHand: MathLineObject = {
    id: childObjectId(object.id, "minute_hand"),
    type: "line",
    from: { x: object.cx, y: object.cy },
    to: minuteEnd,
    style: mergeStyle(object.style, { tone: "accent", stroke_width: 5 }),
  };
  const hourHand: MathLineObject = {
    id: childObjectId(object.id, "hour_hand"),
    type: "line",
    from: { x: object.cx, y: object.cy },
    to: hourEnd,
    style: mergeStyle(object.style, { stroke_width: 7 }),
  };

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.cx, y: object.cy - object.radius - 7 }}
    >
      <CirclePrimitive object={face} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />

      {Array.from({ length: 60 }, (_, index) => {
        const major = index % 5 === 0;
        const angle = index * 6 - 90;
        const outer = polar(object.cx, object.cy, object.radius * 0.91, angle);
        const inner = polar(object.cx, object.cy, object.radius * (major ? 0.82 : 0.86), angle);
        const tick: MathLineObject = {
          id: childObjectId(object.id, `tick_${index}`),
          type: "line",
          from: inner,
          to: outer,
          style: mergeStyle(object.style, { stroke_width: major ? 3 : 1.5 }),
        };
        return <LinePrimitive key={tick.id} object={tick} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />;
      })}

      {object.show_numbers !== false && Array.from({ length: 12 }, (_, index) => {
        const number = index + 1;
        const angle = number * 30 - 90;
        const position = polar(object.cx, object.cy, object.radius * 0.68, angle);
        const label: MathTextObject = {
          id: childObjectId(object.id, `number_${number}`),
          type: "text",
          x: position.x,
          y: position.y + 6,
          text: String(number),
          anchor: "middle",
          role: "label",
          style: object.style,
        };
        return <TextPrimitive key={label.id} object={label} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />;
      })}

      <LinePrimitive object={hourHand} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />
      <LinePrimitive object={minuteHand} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />
      <CirclePrimitive
        object={{
          id: childObjectId(object.id, "hub"),
          type: "circle",
          cx: object.cx,
          cy: object.cy,
          radius: Math.max(5, object.radius * 0.045),
          style: mergeStyle(object.style, { fill: "solid" }),
        }}
        visualId={visualId}
        points={points}
        objectsById={objectsById}
        runtimeState={childState}
      />
    </SemanticObjectGroup>
  );
}

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: cx + Math.cos(radians) * radius, y: cy + Math.sin(radians) * radius };
}
