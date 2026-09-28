import type { MathArrowObject } from "../MathVisualTypes";
import {
  arrowHeadPoints,
  isRuntimeHidden,
  midpoint,
  pointsAttribute,
  positionPair,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function ArrowPrimitive({
  object,
  visualId,
  points,
  runtimeState,
}: PrimitiveCommonProps<MathArrowObject>) {
  if (isRuntimeHidden(runtimeState)) return null;
  const pair = positionPair(object.from, object.to, points);
  if (!pair) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const center = midpoint(pair.a, pair.b);
  const arrowSize = Math.max(11, style.strokeWidth * 3.2);

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      <line
        x1={pair.a.x}
        y1={pair.a.y}
        x2={pair.b.x}
        y2={pair.b.y}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap="round"
      />
      {object.arrow_start && (
        <polygon
          points={pointsAttribute(arrowHeadPoints(pair.a, pair.b, arrowSize))}
          fill={style.stroke}
        />
      )}
      {object.arrow_end !== false && (
        <polygon
          points={pointsAttribute(arrowHeadPoints(pair.b, pair.a, arrowSize))}
          fill={style.stroke}
        />
      )}
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={center} />
    </g>
  );
}
