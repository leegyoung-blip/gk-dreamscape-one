import type {
  MathCuboidObject,
  MathCubeObject,
  MathDimensionObject,
  MathLineObject,
  MathNetObject,
  MathPolygonObject,
  MathRectangleObject,
} from "../MathVisualTypes";
import DimensionPrimitive from "../primitives/Dimension";
import LinePrimitive from "../primitives/Line";
import PolygonPrimitive from "../primitives/Polygon";
import RectanglePrimitive from "../primitives/Rectangle";
import {
  boundsCenter,
  childObjectId,
  childRuntimeState,
  mergeStyle,
  objectBounds,
  SemanticObjectGroup,
  type SemanticCommonProps,
} from "./SemanticRenderUtils";

export type SolidSemanticObject = MathCubeObject | MathCuboidObject | MathNetObject;

export default function SolidRenderer(props: SemanticCommonProps<SolidSemanticObject>) {
  if (props.object.type === "cube") return renderCube(props as SemanticCommonProps<MathCubeObject>);
  if (props.object.type === "cuboid") return renderCuboid(props as SemanticCommonProps<MathCuboidObject>);
  return renderNet(props as SemanticCommonProps<MathNetObject>);
}

function renderCube({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathCubeObject>) {
  const renderSize = 150;
  const depthX = Math.max(20, Math.min(80, Number(object.depth ?? 46)));
  const depthY = depthX * 0.62;
  const x = object.x;
  const y = object.y;
  const childState = childRuntimeState(runtimeState);

  const front = [
    { x, y },
    { x: x + renderSize, y },
    { x: x + renderSize, y: y + renderSize },
    { x, y: y + renderSize },
  ];
  const offset = { x: depthX, y: -depthY };
  const back = front.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }));

  const faces: MathPolygonObject[] = [
    {
      id: childObjectId(object.id, "front"),
      type: "polygon",
      points: front,
      closed: true,
      style: mergeStyle(object.style, { fill: "light" }),
    },
    {
      id: childObjectId(object.id, "top"),
      type: "polygon",
      points: [front[0], front[1], back[1], back[0]],
      closed: true,
      style: mergeStyle(object.style, { tone: "accent", fill: "light" }),
    },
    {
      id: childObjectId(object.id, "side"),
      type: "polygon",
      points: [front[1], front[2], back[2], back[1]],
      closed: true,
      style: mergeStyle(object.style, { tone: "muted", fill: "light" }),
    },
  ];

  const connectors: MathLineObject[] = [0, 1, 2, 3].map((index) => ({
    id: childObjectId(object.id, `depth_edge_${index}`),
    type: "line",
    from: front[index],
    to: back[index],
    style: object.style,
  }));

  const dimension: MathDimensionObject = {
    id: childObjectId(object.id, "side_dimension"),
    type: "dimension",
    from: front[3],
    to: front[2],
    label: `${formatNumber(object.size)}${object.unit ? ` ${object.unit}` : ""}`,
    offset: 28,
    style: object.style,
  };

  const bounds = objectBounds(object, points, objectsById);

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={bounds ? boundsCenter(bounds) : { x: x + renderSize / 2, y }}
    >
      {faces.map((face) => (
        <PolygonPrimitive
          key={face.id}
          object={face}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      ))}
      {connectors.map((line) => (
        <LinePrimitive
          key={line.id}
          object={line}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      ))}
      {object.show_dimensions !== false && (
        <DimensionPrimitive
          object={dimension}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      )}
    </SemanticObjectGroup>
  );
}

function renderCuboid({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathCuboidObject>) {
  const maxValue = Math.max(object.length, object.width, object.height, 1);
  const scale = 175 / maxValue;
  const frontWidth = Math.max(80, object.length * scale);
  const frontHeight = Math.max(65, object.height * scale);
  const depthX = Math.max(28, Math.min(78, object.width * scale * 0.52));
  const depthY = depthX * 0.58;
  const x = object.x;
  const y = object.y + depthY;
  const childState = childRuntimeState(runtimeState);

  const front = [
    { x, y },
    { x: x + frontWidth, y },
    { x: x + frontWidth, y: y + frontHeight },
    { x, y: y + frontHeight },
  ];
  const back = front.map((point) => ({ x: point.x + depthX, y: point.y - depthY }));

  const faces: MathPolygonObject[] = [
    {
      id: childObjectId(object.id, "front"),
      type: "polygon",
      points: front,
      closed: true,
      style: mergeStyle(object.style, { fill: "light" }),
    },
    {
      id: childObjectId(object.id, "top"),
      type: "polygon",
      points: [front[0], front[1], back[1], back[0]],
      closed: true,
      style: mergeStyle(object.style, { tone: "accent", fill: "light" }),
    },
    {
      id: childObjectId(object.id, "side"),
      type: "polygon",
      points: [front[1], front[2], back[2], back[1]],
      closed: true,
      style: mergeStyle(object.style, { tone: "muted", fill: "light" }),
    },
  ];

  const connectors: MathLineObject[] = [0, 1, 2, 3].map((index) => ({
    id: childObjectId(object.id, `depth_edge_${index}`),
    type: "line",
    from: front[index],
    to: back[index],
    style: object.style,
  }));

  const unit = object.unit ? ` ${object.unit}` : "";
  const dimensions: MathDimensionObject[] = [
    {
      id: childObjectId(object.id, "length_dimension"),
      type: "dimension",
      from: front[3],
      to: front[2],
      label: `${formatNumber(object.length)}${unit}`,
      offset: 28,
      style: object.style,
    },
    {
      id: childObjectId(object.id, "height_dimension"),
      type: "dimension",
      from: front[0],
      to: front[3],
      label: `${formatNumber(object.height)}${unit}`,
      offset: 28,
      style: object.style,
    },
    {
      id: childObjectId(object.id, "width_dimension"),
      type: "dimension",
      from: front[1],
      to: back[1],
      label: `${formatNumber(object.width)}${unit}`,
      offset: -24,
      style: object.style,
    },
  ];

  const bounds = objectBounds(object, points, objectsById);

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={bounds ? boundsCenter(bounds) : { x: x + frontWidth / 2, y }}
    >
      {faces.map((face) => (
        <PolygonPrimitive
          key={face.id}
          object={face}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      ))}
      {connectors.map((line) => (
        <LinePrimitive
          key={line.id}
          object={line}
          visualId={visualId}
          points={points}
          objectsById={objectsById}
          runtimeState={childState}
        />
      ))}
      {object.show_dimensions !== false &&
        dimensions.map((dimension) => (
          <DimensionPrimitive
            key={dimension.id}
            object={dimension}
            visualId={visualId}
            points={points}
            objectsById={objectsById}
            runtimeState={childState}
          />
        ))}
    </SemanticObjectGroup>
  );
}

function renderNet({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: SemanticCommonProps<MathNetObject>) {
  const childState = childRuntimeState(runtimeState);
  const bounds = objectBounds(object, points, objectsById);

  return (
    <SemanticObjectGroup
      object={object}
      visualId={visualId}
      runtimeState={runtimeState}
      annotationAnchor={bounds ? boundsCenter(bounds) : null}
    >
      {object.faces.map((face, index) => {
        const rectangle: MathRectangleObject = {
          id: childObjectId(object.id, `face_${face.id}`),
          type: "rectangle",
          x: face.x,
          y: face.y,
          width: face.width,
          height: face.height,
          label: face.label,
          style: mergeStyle(object.style, {
            fill: "light",
            tone: index % 2 === 0 ? object.style?.tone : "muted",
          }),
        };
        return (
          <RectanglePrimitive
            key={rectangle.id}
            object={rectangle}
            visualId={visualId}
            points={points}
            objectsById={objectsById}
            runtimeState={childState}
          />
        );
      })}
    </SemanticObjectGroup>
  );
}

function formatNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}
