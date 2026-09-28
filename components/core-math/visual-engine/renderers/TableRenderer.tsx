import type {
  MathRectangleObject,
  MathTableObject,
  MathTextObject,
} from "../MathVisualTypes";
import RectanglePrimitive from "../primitives/Rectangle";
import TextPrimitive from "../primitives/Text";
import {
  childObjectId,
  childRuntimeState,
  defaultCanvasBox,
  mergeStyle,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

export default function TableRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
  canvas,
}: SemanticCommonProps<MathTableObject>) {
  const columnCount = Math.max(1, object.columns.length);
  const rowCount = object.rows.length;
  const hasRowLabels = Array.isArray(object.row_labels) && object.row_labels.length > 0;
  const totalColumns = columnCount + (hasRowLabels ? 1 : 0);
  const totalRows = rowCount + 1;
  const defaultBox = defaultCanvasBox(canvas);
  const x = Number(object.x ?? defaultBox.x);
  const y = Number(object.y ?? defaultBox.y);
  const width = Number(object.width ?? defaultBox.width);
  const height = Number(object.height ?? Math.min(defaultBox.height, Math.max(96, totalRows * 50)));
  const cellWidth = width / totalColumns;
  const cellHeight = height / totalRows;
  const highlighted = new Set(
    (object.highlight_cells || []).map((cell) => `${cell.row}:${cell.column}`),
  );
  const childState = childRuntimeState(runtimeState, { shaded: undefined });

  const cells: any[] = [];

  if (hasRowLabels) {
    const headerCell: MathRectangleObject = {
      id: childObjectId(object.id, "header_row_label"),
      type: "rectangle",
      x,
      y,
      width: cellWidth,
      height: cellHeight,
      style: mergeStyle(object.style, { tone: "muted", fill: "light" }),
    };
    cells.push(
      <RectanglePrimitive key={headerCell.id} object={headerCell} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />,
    );
  }

  object.columns.forEach((column, columnIndex) => {
    const xOffset = hasRowLabels ? 1 : 0;
    const cellX = x + (columnIndex + xOffset) * cellWidth;
    const header: MathRectangleObject = {
      id: childObjectId(object.id, `header_${columnIndex}`),
      type: "rectangle",
      x: cellX,
      y,
      width: cellWidth,
      height: cellHeight,
      style: mergeStyle(object.style, { tone: "accent", fill: "light" }),
    };
    const text: MathTextObject = {
      id: childObjectId(object.id, `header_text_${columnIndex}`),
      type: "text",
      x: cellX + cellWidth / 2,
      y: y + cellHeight / 2 + 6,
      text: column,
      anchor: "middle",
      role: "label",
      style: object.style,
    };
    cells.push(
      <RectanglePrimitive key={header.id} object={header} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />,
      <TextPrimitive key={text.id} object={text} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childRuntimeState(runtimeState)} />,
    );
  });

  object.rows.forEach((row, rowIndex) => {
    const rowY = y + (rowIndex + 1) * cellHeight;
    if (hasRowLabels) {
      const rowLabel = object.row_labels?.[rowIndex] ?? "";
      const labelCell: MathRectangleObject = {
        id: childObjectId(object.id, `row_label_${rowIndex}`),
        type: "rectangle",
        x,
        y: rowY,
        width: cellWidth,
        height: cellHeight,
        style: mergeStyle(object.style, { tone: "muted", fill: "light" }),
      };
      const labelText: MathTextObject = {
        id: childObjectId(object.id, `row_label_text_${rowIndex}`),
        type: "text",
        x: x + cellWidth / 2,
        y: rowY + cellHeight / 2 + 6,
        text: rowLabel,
        anchor: "middle",
        role: "label",
        style: object.style,
      };
      cells.push(
        <RectanglePrimitive key={labelCell.id} object={labelCell} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />,
        <TextPrimitive key={labelText.id} object={labelText} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childRuntimeState(runtimeState)} />,
      );
    }

    row.forEach((value, columnIndex) => {
      const xOffset = hasRowLabels ? 1 : 0;
      const cellX = x + (columnIndex + xOffset) * cellWidth;
      const isHighlighted = highlighted.has(`${rowIndex}:${columnIndex}`);
      const shaded = runtimeState?.shaded === true
        ? true
        : runtimeState?.shaded === false
          ? false
          : isHighlighted;
      const cell: MathRectangleObject = {
        id: childObjectId(object.id, `cell_${rowIndex}_${columnIndex}`),
        type: "rectangle",
        x: cellX,
        y: rowY,
        width: cellWidth,
        height: cellHeight,
        style: mergeStyle(object.style, {
          tone: shaded ? "accent" : object.style?.tone,
          fill: shaded ? "light" : "none",
        }),
      };
      const text: MathTextObject = {
        id: childObjectId(object.id, `cell_text_${rowIndex}_${columnIndex}`),
        type: "text",
        x: cellX + cellWidth / 2,
        y: rowY + cellHeight / 2 + 6,
        text: String(value),
        anchor: "middle",
        role: typeof value === "number" ? "value" : "label",
        style: object.style,
      };
      cells.push(
        <RectanglePrimitive key={cell.id} object={cell} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childState} />,
        <TextPrimitive key={text.id} object={text} visualId={visualId} points={points} objectsById={objectsById} runtimeState={childRuntimeState(runtimeState)} />,
      );
    });
  });

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={{ x: x + width / 2, y: y - 5 }}
    >
      {cells}
    </SemanticObjectGroup>
  );
}
