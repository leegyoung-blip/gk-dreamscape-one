import type { MathArcObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  polarPoint,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function ArcPrimitive({
  object,
  visualId,
  runtimeState,
}: PrimitiveCommonProps<MathArcObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const start = polarPoint(object.center, object.radius, object.start_angle);
  const end = polarPoint(object.center, object.radius, object.end_angle);
  const rawDelta = object.end_angle - object.start_angle;
  const normalisedDelta = ((rawDelta % 360) + 360) % 360;
  const effectiveDelta = object.clockwise === false ? (360 - normalisedDelta) % 360 : normalisedDelta;
  const largeArc = effectiveDelta > 180 ? 1 : 0;
  const sweep = object.clockwise === false ? 0 : 1;
  const midAngle = object.clockwise === false
    ? object.start_angle - effectiveDelta / 2
    : object.start_angle + effectiveDelta / 2;
  const annotationAnchor = polarPoint(object.center, object.radius + 14, midAngle);

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      <path
        d={`M ${start.x} ${start.y} A ${object.radius} ${object.radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap="round"
      />
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={annotationAnchor} />
    </g>
  );
}
