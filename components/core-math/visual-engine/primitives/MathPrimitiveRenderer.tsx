import type { MathVisualObject } from "../MathVisualTypes";
import type { MathVisualObjectRuntimeState } from "../MathVisualState";
import AngleMarkerPrimitive from "./AngleMarker";
import ArcPrimitive from "./Arc";
import ArrowPrimitive from "./Arrow";
import AxisPrimitive from "./Axis";
import CirclePrimitive from "./Circle";
import DimensionPrimitive from "./Dimension";
import GridPrimitive from "./Grid";
import LinePrimitive from "./Line";
import PointPrimitive from "./Point";
import PolygonPrimitive from "./Polygon";
import RectanglePrimitive from "./Rectangle";
import RightAngleMarkerPrimitive from "./RightAngleMarker";
import ShadePrimitive from "./Shade";
import TextPrimitive from "./Text";
import type { PrimitiveObjectMap, PrimitivePointMap } from "./PrimitiveRenderUtils";

export const MATH_PRIMITIVE_TYPES = new Set<MathVisualObject["type"]>([
  "point",
  "line",
  "arrow",
  "text",
  "rectangle",
  "polygon",
  "circle",
  "arc",
  "shade",
  "dimension",
  "angle_marker",
  "right_angle_marker",
  "axis",
  "grid",
]);

export function isMathPrimitiveObject(object: MathVisualObject) {
  return MATH_PRIMITIVE_TYPES.has(object.type);
}

export default function MathPrimitiveRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
}: {
  object: MathVisualObject;
  visualId: string;
  points: PrimitivePointMap;
  objectsById: PrimitiveObjectMap;
  runtimeState?: MathVisualObjectRuntimeState;
}) {
  const common = { visualId, points, objectsById, runtimeState };

  switch (object.type) {
    case "point":
      return <PointPrimitive object={object} {...common} />;
    case "line":
      return <LinePrimitive object={object} {...common} />;
    case "arrow":
      return <ArrowPrimitive object={object} {...common} />;
    case "text":
      return <TextPrimitive object={object} {...common} />;
    case "rectangle":
      return <RectanglePrimitive object={object} {...common} />;
    case "polygon":
      return <PolygonPrimitive object={object} {...common} />;
    case "circle":
      return <CirclePrimitive object={object} {...common} />;
    case "arc":
      return <ArcPrimitive object={object} {...common} />;
    case "shade":
      return <ShadePrimitive object={object} {...common} />;
    case "dimension":
      return <DimensionPrimitive object={object} {...common} />;
    case "angle_marker":
      return <AngleMarkerPrimitive object={object} {...common} />;
    case "right_angle_marker":
      return <RightAngleMarkerPrimitive object={object} {...common} />;
    case "axis":
      return <AxisPrimitive object={object} {...common} />;
    case "grid":
      return <GridPrimitive object={object} {...common} />;
    default:
      return null;
  }
}
