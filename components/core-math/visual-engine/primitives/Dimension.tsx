import type { MathDimensionObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  midpoint,
  offsetPoint,
  perpendicularVector,
  positionPair,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function DimensionPrimitive({
  object,
  visualId,
  points,
  runtimeState,
}: PrimitiveCommonProps<MathDimensionObject>) {
  if (isRuntimeHidden(runtimeState)) return null;
  const pair = positionPair(object.from, object.to, points);
  if (!pair) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const normal = perpendicularVector(pair.a, pair.b);
  const offset = Number(object.offset ?? 24);
  const labelOffset = Number(object.label_offset ?? 13);
  const a = offsetPoint(pair.a, normal, offset);
  const b = offsetPoint(pair.b, normal, offset);
  const center = offsetPoint(midpoint(a, b), normal, labelOffset);
  const tickSize = Math.max(7, style.strokeWidth * 2.3);

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label || object.label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      {object.extension_lines !== false && (
        <>
          <line x1={pair.a.x} y1={pair.a.y} x2={a.x} y2={a.y} stroke={style.stroke} strokeWidth={Math.max(1.5, style.strokeWidth * 0.55)} opacity="0.65" />
          <line x1={pair.b.x} y1={pair.b.y} x2={b.x} y2={b.y} stroke={style.stroke} strokeWidth={Math.max(1.5, style.strokeWidth * 0.55)} opacity="0.65" />
        </>
      )}
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={style.stroke} strokeWidth={style.strokeWidth} strokeDasharray={style.strokeDasharray} />
      <line x1={a.x - normal.x * tickSize} y1={a.y - normal.y * tickSize} x2={a.x + normal.x * tickSize} y2={a.y + normal.y * tickSize} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <line x1={b.x - normal.x * tickSize} y1={b.y - normal.y * tickSize} x2={b.x + normal.x * tickSize} y2={b.y + normal.y * tickSize} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <text x={center.x} y={center.y + 6} textAnchor="middle" fill={style.text} fontSize="18" fontWeight="700">
        {object.label}
      </text>
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={{ x: center.x + 12, y: center.y - 4 }} />
    </g>
  );
}
