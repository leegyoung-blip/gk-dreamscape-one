import type { MathPolygonObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  pointsAttribute,
  PrimitiveAnnotation,
  PrimitivePatternDefs,
  resolvedFill,
  resolvePosition,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function PolygonPrimitive({
  object,
  visualId,
  points,
  runtimeState,
}: PrimitiveCommonProps<MathPolygonObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const resolvedPoints = object.points
    .map((point) => resolvePosition(point, points))
    .filter((point): point is { x: number; y: number } => Boolean(point));

  if (resolvedPoints.length < 2) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState, { fillable: object.closed !== false });
  const fill = object.closed === false ? "none" : resolvedFill(style, visualId, object.id);
  const center = resolvedPoints.reduce(
    (sum, point) => ({ x: sum.x + point.x / resolvedPoints.length, y: sum.y + point.y / resolvedPoints.length }),
    { x: 0, y: 0 },
  );

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      {style.fill === "hatched" && object.closed !== false && (
        <PrimitivePatternDefs visualId={visualId} objectId={object.id} stroke={style.stroke} />
      )}
      {object.closed === false ? (
        <polyline
          points={pointsAttribute(resolvedPoints)}
          fill="none"
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : (
        <polygon
          points={pointsAttribute(resolvedPoints)}
          fill={fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
          strokeLinejoin="round"
        />
      )}
      {object.label && (
        <text x={center.x} y={center.y + 6} textAnchor="middle" fill={style.text} fontSize="19" fontWeight="700">
          {object.label}
        </text>
      )}
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={center} />
    </g>
  );
}
