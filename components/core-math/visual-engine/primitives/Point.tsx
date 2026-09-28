import type { MathPointObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function PointPrimitive({
  object,
  visualId,
  runtimeState,
}: PrimitiveCommonProps<MathPointObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const showMarker = object.show_marker !== false;

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      {showMarker && (
        <circle
          cx={object.x}
          cy={object.y}
          r={runtimeState?.highlighted ? 7 : 5}
          fill={style.stroke}
        />
      )}
      {object.label && (
        <text
          x={object.x + 10}
          y={object.y - 9}
          fill={style.text}
          fontSize="18"
          fontWeight="700"
        >
          {object.label}
        </text>
      )}
      <PrimitiveAnnotation
        text={runtimeState?.annotation?.text}
        anchor={{ x: object.x + 12, y: object.y - 12 }}
      />
    </g>
  );
}
