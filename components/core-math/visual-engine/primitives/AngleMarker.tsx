import type { MathAngleMarkerObject } from "../MathVisualTypes";
import {
  angleDegrees,
  isRuntimeHidden,
  polarPoint,
  PrimitiveAnnotation,
  resolvePosition,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  shortestArc,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function AngleMarkerPrimitive({
  object,
  visualId,
  points,
  runtimeState,
}: PrimitiveCommonProps<MathAngleMarkerObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const a = resolvePosition(object.a, points);
  const vertex = resolvePosition(object.vertex, points);
  const b = resolvePosition(object.b, points);
  if (!a || !vertex || !b) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const radius = Math.max(10, Number(object.radius ?? 28));
  const arc = shortestArc(angleDegrees(vertex, a), angleDegrees(vertex, b));
  const start = polarPoint(vertex, radius, arc.start);
  const end = polarPoint(vertex, radius, arc.end);
  const largeArc = Math.abs(arc.delta) > 180 ? 1 : 0;
  const mid = polarPoint(vertex, radius + 18, arc.start + arc.delta / 2);

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label || object.label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      <path
        d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${arc.sweep} ${end.x} ${end.y}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap="round"
      />
      {object.label && (
        <text x={mid.x} y={mid.y + 5} textAnchor="middle" fill={style.text} fontSize="17" fontWeight="700">
          {object.label}
        </text>
      )}
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={mid} />
    </g>
  );
}
