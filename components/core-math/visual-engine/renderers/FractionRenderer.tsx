import type {
  MathFractionBarObject,
  MathFractionGridObject,
  MathRectangleObject,
  MathTextObject,
} from "../MathVisualTypes";
import RectanglePrimitive from "../primitives/Rectangle";
import TextPrimitive from "../primitives/Text";
import {
  childObjectId,
  childRuntimeState,
  mergeStyle,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

export type FractionSemanticObject = MathFractionBarObject | MathFractionGridObject;

export default function FractionRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<FractionSemanticObject>) {
  return object.type === "fraction_bar"
    ? renderFractionBar({ object, visualId, points, objectsById, runtimeState })
    : renderFractionGrid({ object, visualId, points, objectsById, runtimeState });
}

function renderFractionBar({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathFractionBarObject>) {
  const denominator = Math.max(1, Math.min(100, Math.round(object.denominator)));
  const numerator = Math.max(0, Math.round(object.numerator));
  const barCount = Math.max(1, Math.ceil(numerator / denominator));
  const vertical = object.orientation === "vertical";
  const gapBase = vertical ? object.width : object.height;
  const gap = barCount > 1 ? Math.min(10, gapBase * 0.08) : 0;
  const barThickness = Math.max(8,
    ((vertical ? object.width : object.height) - gap * (barCount - 1)) / barCount,
  );
  const childState = childRuntimeState(runtimeState, { shaded: undefined });

  const parts = Array.from({ length: barCount }).flatMap((_, barIndex) => {
    const shadedInBar = Math.max(
      0,
      Math.min(denominator, numerator - barIndex * denominator),
    );

    return Array.from({ length: denominator }, (_, partIndex) => {
      const baseShaded = partIndex < shadedInBar;
      const shaded = runtimeState?.shaded === true
        ? true
        : runtimeState?.shaded === false
          ? false
          : baseShaded;

      const x = vertical
        ? object.x + barIndex * (barThickness + gap)
        : object.x + (object.width / denominator) * partIndex;
      const y = vertical
        ? object.y + object.height - (object.height / denominator) * (partIndex + 1)
        : object.y + barIndex * (barThickness + gap);
      const width = vertical ? barThickness : object.width / denominator;
      const height = vertical ? object.height / denominator : barThickness;

      const cell: MathRectangleObject = {
        id: childObjectId(object.id, `bar_${barIndex + 1}_part_${partIndex + 1}`),
        type: "rectangle",
        x,
        y,
        width,
        height,
        style: mergeStyle(object.style, {
          tone: shaded ? "accent" : object.style?.tone,
          fill: shaded ? "light" : "none",
        }),
      };

      return (
        <RectanglePrimitive
          key={cell.id}
          object={cell}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      );
    });
  });

  const label: MathTextObject = {
    id: childObjectId(object.id, "fraction_label"),
    type: "text",
    x: object.x + object.width / 2,
    y: object.y + object.height + 28,
    text: `${numerator}/${denominator}`,
    anchor: "middle",
    role: "value",
    style: object.style,
  };

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.x + object.width / 2, y: object.y - 4 }}
    >
      {parts}
      {object.show_fraction_label !== false && (
        <TextPrimitive
          object={label}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childRuntimeState(runtimeState)}
        />
      )}
    </SemanticObjectGroup>
  );
}

function renderFractionGrid({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathFractionGridObject>) {
  const rows = Math.max(1, Math.min(40, Math.round(object.rows)));
  const columns = Math.max(1, Math.min(40, Math.round(object.columns)));
  const total = rows * columns;
  const baseShaded = new Set(object.shaded_cells || []);
  const cellWidth = object.width / columns;
  const cellHeight = object.height / rows;
  const childState = childRuntimeState(runtimeState, { shaded: undefined });

  const cells = Array.from({ length: total }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const shaded = runtimeState?.shaded === true
      ? true
      : runtimeState?.shaded === false
        ? false
        : baseShaded.has(index);

    const cell: MathRectangleObject = {
      id: childObjectId(object.id, `cell_${index}`),
      type: "rectangle",
      x: object.x + column * cellWidth,
      y: object.y + row * cellHeight,
      width: cellWidth,
      height: cellHeight,
      style: mergeStyle(object.style, {
        tone: shaded ? "accent" : object.style?.tone,
        fill: shaded ? "light" : "none",
      }),
    };

    return (
      <RectanglePrimitive
        key={cell.id}
        object={cell}
        visualId={visualId}
        points={points}
        objectsById={objectsById}
        runtimeState={childState}
      />
    );
  });

  const label: MathTextObject = {
    id: childObjectId(object.id, "fraction_label"),
    type: "text",
    x: object.x + object.width / 2,
    y: object.y + object.height + 28,
    text: `${baseShaded.size}/${total}`,
    anchor: "middle",
    role: "value",
    style: object.style,
  };

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: object.x + object.width / 2, y: object.y - 4 }}
    >
      {cells}
      {object.show_fraction_label && (
        <TextPrimitive
          object={label}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childRuntimeState(runtimeState)}
        />
      )}
    </SemanticObjectGroup>
  );
}
