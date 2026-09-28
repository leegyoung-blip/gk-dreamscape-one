import type { MathLineObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  midpoint,
  positionPair,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function LinePrimitive({
  object,
  visualId,
  points,
  runtimeState,
}: PrimitiveCommonProps<MathLineObject>) {
  if (isRuntimeHidden(runtimeState)) return null;
  const pair = positionPair(object.from, object.to, points);
  if (!pair) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const center = midpoint(pair.a, pair.b);

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
      <PrimitiveAnnotation text={runtimeState?.annotation?.text} anchor={center} />
    </g>
  );
}
