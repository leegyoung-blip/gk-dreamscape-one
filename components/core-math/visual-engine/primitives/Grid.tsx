import type { MathGridObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function GridPrimitive({
  object,
  visualId,
  runtimeState,
}: PrimitiveCommonProps<MathGridObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const rows = Math.max(1, Math.round(object.rows));
  const columns = Math.max(1, Math.round(object.columns));
  const cellWidth = object.width / columns;
  const cellHeight = object.height / rows;

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      <rect x={object.x} y={object.y} width={object.width} height={object.height} fill="none" stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {Array.from({ length: columns - 1 }, (_, index) => {
        const x = object.x + cellWidth * (index + 1);
        return <line key={`v-${index}`} x1={x} y1={object.y} x2={x} y2={object.y + object.height} stroke={style.stroke} strokeWidth={Math.max(1, style.strokeWidth * 0.55)} opacity="0.75" />;
      })}
      {Array.from({ length: rows - 1 }, (_, index) => {
        const y = object.y + cellHeight * (index + 1);
        return <line key={`h-${index}`} x1={object.x} y1={y} x2={object.x + object.width} y2={y} stroke={style.stroke} strokeWidth={Math.max(1, style.strokeWidth * 0.55)} opacity="0.75" />;
      })}
      <PrimitiveAnnotation
        text={runtimeState?.annotation?.text}
        anchor={{ x: object.x + object.width / 2, y: object.y + object.height / 2 }}
      />
    </g>
  );
}
