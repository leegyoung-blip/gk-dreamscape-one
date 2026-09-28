import type { MathRectangleObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  PrimitiveAnnotation,
  PrimitivePatternDefs,
  resolvedFill,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function RectanglePrimitive({
  object,
  visualId,
  runtimeState,
}: PrimitiveCommonProps<MathRectangleObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState, { fillable: true });
  const fill = resolvedFill(style, visualId, object.id);
  const center = {
    x: object.x + object.width / 2,
    y: object.y + object.height / 2,
  };

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      {style.fill === "hatched" && (
        <PrimitivePatternDefs visualId={visualId} objectId={object.id} stroke={style.stroke} />
      )}
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        rx={Math.max(0, object.corner_radius ?? 0)}
        fill={fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
      />
      {object.label && (
        <text
          x={center.x}
          y={center.y + 6}
          textAnchor="middle"
          fill={style.text}
          fontSize="19"
          fontWeight="700"
        >
          {object.label}
        </text>
      )}
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={center} />
    </g>
  );
}
