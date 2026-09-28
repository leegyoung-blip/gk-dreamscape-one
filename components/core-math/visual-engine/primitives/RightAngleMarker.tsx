import type { MathRightAngleMarkerObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  normalisedVector,
  PrimitiveAnnotation,
  resolvePosition,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function RightAngleMarkerPrimitive({
  object,
  visualId,
  points,
  runtimeState,
}: PrimitiveCommonProps<MathRightAngleMarkerObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const a = resolvePosition(object.a, points);
  const vertex = resolvePosition(object.vertex, points);
  const b = resolvePosition(object.b, points);
  if (!a || !vertex || !b) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const size = Math.max(10, Number(object.size ?? 22));
  const va = normalisedVector(vertex, a);
  const vb = normalisedVector(vertex, b);
  const p1 = { x: vertex.x + va.x * size, y: vertex.y + va.y * size };
  const p2 = { x: p1.x + vb.x * size, y: p1.y + vb.y * size };
  const p3 = { x: vertex.x + vb.x * size, y: vertex.y + vb.y * size };

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label || "Right angle"}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      <polyline
        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinejoin="round"
      />
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={p2} />
    </g>
  );
}
