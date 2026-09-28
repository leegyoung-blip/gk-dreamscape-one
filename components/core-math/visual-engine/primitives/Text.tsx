import type { MathTextObject } from "../MathVisualTypes";
import {
  isRuntimeHidden,
  PrimitiveAnnotation,
  resolvePrimitiveStyle,
  runtimeDataAttributes,
  type PrimitiveCommonProps,
} from "./PrimitiveRenderUtils";

const ROLE_SIZES: Record<string, number> = {
  label: 18,
  value: 20,
  instruction: 18,
  annotation: 16,
};

export default function TextPrimitive({
  object,
  visualId,
  runtimeState,
}: PrimitiveCommonProps<MathTextObject>) {
  if (isRuntimeHidden(runtimeState)) return null;

  const style = resolvePrimitiveStyle(object.style, runtimeState, { textOnly: true });
  const fontSize = ROLE_SIZES[object.role ?? "label"] ?? 18;

  return (
    <g
      data-math-visual-id={visualId}
      data-math-object-id={object.id}
      data-math-object-type={object.type}
      aria-label={object.aria_label}
      opacity={style.opacity}
      {...runtimeDataAttributes(runtimeState)}
    >
      <text
        x={object.x}
        y={object.y}
        fill={style.text}
        fontSize={fontSize}
        fontWeight={object.role === "value" ? 700 : 600}
        textAnchor={object.anchor ?? "start"}
        transform={object.rotation ? `rotate(${object.rotation} ${object.x} ${object.y})` : undefined}
      >
        {object.text}
      </text>
      <PrimitiveAnnotation
        text={runtimeState?.annotation?.text}
        anchor={{ x: object.x + 8, y: object.y - 6 }}
      />
    </g>
  );
}
