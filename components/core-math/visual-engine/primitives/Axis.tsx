import type { MathAxisObject } from "../MathVisualTypes";
import {
  clamp,
  isRuntimeHidden,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

export default function AxisPrimitive({
  object,
  visualId,
  runtimeState,
}: PrimitiveCommonProps<MathAxisObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState);
  const span = object.max - object.min;
  if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(object.step) || object.step <= 0) return null;

  const count = Math.min(80, Math.floor(span / object.step + 1e-9) + 1);
  const values = Array.from({ length: count }, (_, index) => object.min + object.step * index)
    .filter((value) => value <= object.max + object.step * 1e-6);
  const horizontal = object.orientation === "horizontal";
  const dx = object.to.x - object.from.x;
  const dy = object.to.y - object.from.y;

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label || object.label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      <line x1={object.from.x} y1={object.from.y} x2={object.to.x} y2={object.to.y} stroke={style.stroke} strokeWidth={style.strokeWidth} strokeDasharray={style.strokeDasharray} />
      {values.map((value, index) => {
        const ratio = clamp((value - object.min) / span, 0, 1);
        const x = object.from.x + dx * ratio;
        const y = object.from.y + dy * ratio;
        return (
          <g key={`${object.id}-${index}`}>
            <line
              x1={horizontal ? x : x - 6}
              y1={horizontal ? y - 6 : y}
              x2={horizontal ? x : x + 6}
              y2={horizontal ? y + 6 : y}
              stroke={style.stroke}
              strokeWidth={Math.max(1.5, style.strokeWidth * 0.65)}
            />
            {object.show_tick_labels !== false && (
              <text
                x={horizontal ? x : x - 11}
                y={horizontal ? y + 23 : y + 5}
                textAnchor={horizontal ? "middle" : "end"}
                fill={style.text}
                fontSize="14"
                fontWeight="600"
              >
                {Number(value.toFixed(6))}
              </text>
            )}
          </g>
        );
      })}
      {object.label && (
        <text
          x={horizontal ? object.to.x + 12 : object.from.x}
          y={horizontal ? object.to.y + 5 : object.to.y - 12}
          textAnchor={horizontal ? "start" : "middle"}
          fill={style.text}
          fontSize="16"
          fontWeight="700"
        >
          {object.label}
        </text>
      )}
      <PrimitiveAnnotation
        text={runtimeState?.annotation?.text}
        anchor={{ x: (object.from.x + object.to.x) / 2, y: (object.from.y + object.to.y) / 2 }}
      />
    </g>
  );
}
