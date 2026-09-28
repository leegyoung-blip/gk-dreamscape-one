import type { ReactElement } from "react";
import type {
  MathCircleObject,
  MathPolygonObject,
  MathQuadrilateralObject,
  MathRectangleObject,
  MathShadeObject,
  MathTriangleObject,
} from "../MathVisualTypes";
import {
  isRuntimeHidden,
  pointsAttribute,
  PrimitiveAnnotation,
  resolvePosition,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function ShadePrimitive({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: PrimitiveCommonProps<MathShadeObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(
    { ...(object.style || {}), fill: object.style?.fill ?? "light", stroke_width: object.style?.stroke_width ?? 0 },
    { ...(runtimeState || {}), shaded: true },
    { fillable: true },
  );

  const explicitPoints = object.points
    ?.map((point) => resolvePosition(point, points))
    .filter((point): point is { x: number; y: number } => Boolean(point));

  const target = object.target_id ? objectsById?.get(object.target_id) : undefined;
  const common = {
    fill: style.fill === "none" || style.fill === "hatched" ? "#dbeafe" : style.fill,
    stroke: "none",
    opacity: Math.min(0.72, style.opacity * 0.72),
    pointerEvents: "none" as const,
  };

  let shape: ReactElement | null = null;
  let anchor = { x: 0, y: 0 };

  if (explicitPoints && explicitPoints.length >= 3) {
    anchor = explicitPoints.reduce(
      (sum, point) => ({ x: sum.x + point.x / explicitPoints.length, y: sum.y + point.y / explicitPoints.length }),
      { x: 0, y: 0 },
    );
    shape = <polygon points={pointsAttribute(explicitPoints)} {...common} />;
  } else if (target?.type === "rectangle") {
    const item = target as MathRectangleObject;
    anchor = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
    shape = <rect x={item.x} y={item.y} width={item.width} height={item.height} rx={item.corner_radius ?? 0} {...common} />;
  } else if (target?.type === "circle") {
    const item = target as MathCircleObject;
    anchor = { x: item.cx, y: item.cy };
    shape = <circle cx={item.cx} cy={item.cy} r={item.radius} {...common} />;
  } else if (target?.type === "polygon") {
    const item = target as MathPolygonObject;
    const resolved = item.points.map((point) => resolvePosition(point, points)).filter((point): point is { x: number; y: number } => Boolean(point));
    if (resolved.length >= 3) {
      anchor = resolved.reduce(
        (sum, point) => ({ x: sum.x + point.x / resolved.length, y: sum.y + point.y / resolved.length }),
        { x: 0, y: 0 },
      );
      shape = <polygon points={pointsAttribute(resolved)} {...common} />;
    }
  } else if (target?.type === "triangle" || target?.type === "quadrilateral") {
    const item = target as MathTriangleObject | MathQuadrilateralObject;
    const resolved = item.points.map((point) => resolvePosition(point, points)).filter((point): point is { x: number; y: number } => Boolean(point));
    if (resolved.length >= 3) {
      anchor = resolved.reduce(
        (sum, point) => ({ x: sum.x + point.x / resolved.length, y: sum.y + point.y / resolved.length }),
        { x: 0, y: 0 },
      );
      shape = <polygon points={pointsAttribute(resolved)} {...common} />;
    }
  }

  if (!shape) return null;

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      {...runtimeDataAttributes(runtimeState)}
    >
      {shape}
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={anchor} />
    </g>
  );
}
