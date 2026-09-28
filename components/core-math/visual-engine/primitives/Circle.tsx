import type { MathCircleObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  PrimitiveAnnotation,
  PrimitivePatternDefs,
  resolvedFill,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function CirclePrimitive({
  object,
  visualId,
  runtimeState,
}: PrimitiveCommonProps<MathCircleObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState, { fillable: true });
  const fill = resolvedFill(style, visualId, object.id);

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
      <circle
        cx={object.cx}
        cy={object.cy}
        r={object.radius}
        fill={fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
      />
      {object.label && (
        <text x={object.cx} y={object.cy + 6} textAnchor="middle" fill={style.text} fontSize="19" fontWeight="700">
          {object.label}
        </text>
      )}
      <PrimitiveAnnotation
        text={runtimeState?.annotation?.text}
        anchor={{ x: object.cx, y: object.cy - object.radius - 4 }}
      />
    </g>
  );
}
