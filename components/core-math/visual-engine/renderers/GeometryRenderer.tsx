import type {
  MathCompositeShapeObject,
  MathPolygonObject,
  MathQuadrilateralObject,
  MathRectangleObject,
  MathTextObject,
  MathTriangleObject,
} from "../MathVisualTypes";
import PolygonPrimitive from "../primitives/Polygon";
import RectanglePrimitive from "../primitives/Rectangle";
import TextPrimitive from "../primitives/Text";
import {
  boundsCenter,
  childObjectId,
  childRuntimeState,
  centroid,
  isMeaningfulSemanticRuntimeState,
  labelPointOutsideVertex,
  objectBounds,
  resolvePositions,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

export type GeometrySemanticObject =
  | MathTriangleObject
  | MathQuadrilateralObject
  | MathCompositeShapeObject;

export default function GeometryRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<GeometrySemanticObject>) {
  if (object.type === "triangle" || object.type === "quadrilateral") {
    return renderPolygonShape({
      object,
      visualId,
      points,
      objectsById,
      runtimeState,
    });
  }

  const bounds = objectBounds(object, points, objectsById);
  if (!bounds) return null;
  const center = boundsCenter(bounds);

  // composite_shape is intentionally a semantic grouping object. The actual
  // component objects are rendered separately by MathVisualRenderer. We only
  // draw a deterministic group outline when teaching state targets the group.
  const showOutline = isMeaningfulSemanticRuntimeState(runtimeState);
  const outline: MathRectangleObject = {
    id: childObjectId(object.id, "group_outline"),
    type: "rectangle",
    x: bounds.minX - 10,
    y: bounds.minY - 10,
    width: Math.max(1, bounds.maxX - bounds.minX + 20),
    height: Math.max(1, bounds.maxY - bounds.minY + 20),
    corner_radius: 10,
    style: {
      ...(object.style || {}),
      fill: runtimeState?.shaded ? "light" : "none",
      stroke: "dashed",
      tone: "accent",
    },
  };

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={center}
    >
      {showOutline && (
        <RectanglePrimitive
          object={outline}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childRuntimeState(runtimeState)}
        />
      )}
    </SemanticObjectGroup>
  );
}

function renderPolygonShape({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathTriangleObject | MathQuadrilateralObject>) {
  const resolved = resolvePositions(object.points, points);
  if (resolved.length !== object.points.length) return null;

  const center = centroid(resolved);
  const polygon: MathPolygonObject = {
    id: childObjectId(object.id, "shape"),
    type: "polygon",
    points: object.points,
    closed: true,
    style: object.style,
    aria_label: object.aria_label,
  };

  const labels = object.vertex_labels || [];

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={center}
    >
      <PolygonPrimitive
        object={polygon}
        visualId={visualId}
        points={points}
        objectsById={objectsById}
        runtimeState={childRuntimeState(runtimeState)}
      />

      {labels.map((label, index) => {
        if (!label) return null;
        const position = labelPointOutsideVertex(resolved[index], center);
        const text: MathTextObject = {
          id: childObjectId(object.id, `vertex_${index + 1}`),
          type: "text",
          x: position.x,
          y: position.y,
          text: label,
          anchor: "middle",
          role: "label",
          style: object.style,
        };
        return (
          <TextPrimitive
            key={text.id}
            object={text}
            visualId={visualId}
            points={points}
            objectsById={objectsById}
            runtimeState={childRuntimeState(runtimeState)}
          />
        );
      })}
    </SemanticObjectGroup>
  );
}
