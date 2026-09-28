import type { MathVisualObject } from "../MathVisualTypes";
import type { MathVisualObjectRuntimeState } from "../MathVisualState";
import type { PrimitiveObjectMap, PrimitivePointMap } from "../primitives/PrimitiveRenderUtils";
import type { MathCanvas } from "../MathVisualTypes";
import BarModelRenderer from "./BarModelRenderer";
import ClockRenderer from "./ClockRenderer";
import DataRenderer from "./DataRenderer";
import FractionRenderer from "./FractionRenderer";
import GeometryRenderer from "./GeometryRenderer";
import NumberLineRenderer from "./NumberLineRenderer";
import SolidRenderer from "./SolidRenderer";
import TableRenderer from "./TableRenderer";

export function isSemanticMathObject(object: MathVisualObject) {
  return [
    "triangle",
    "quadrilateral",
    "composite_shape",
    "fraction_bar",
    "fraction_grid",
    "number_line",
    "cube",
    "cuboid",
    "net",
    "bar_chart",
    "line_graph",
    "pie_chart",
    "table",
    "clock",
    "bar_model",
  ].includes(object.type);
}

export default function MathSemanticRenderer({
  object,
  visualId,
  points,
  objectsById,
  runtimeState,
  canvas,
}: {
  object: MathVisualObject;
  visualId: string;
  points: PrimitivePointMap;
  objectsById: PrimitiveObjectMap;
  runtimeState?: MathVisualObjectRuntimeState;
  canvas?: MathCanvas;
}) {
  const common = { visualId, points, objectsById, runtimeState, canvas };

  switch (object.type) {
    case "triangle":
    case "quadrilateral":
    case "composite_shape":
      return <GeometryRenderer object={object} {...common} />;
    case "fraction_bar":
    case "fraction_grid":
      return <FractionRenderer object={object} {...common} />;
    case "number_line":
      return <NumberLineRenderer object={object} {...common} />;
    case "cube":
    case "cuboid":
    case "net":
      return <SolidRenderer object={object} {...common} />;
    case "bar_chart":
    case "line_graph":
    case "pie_chart":
      return <DataRenderer object={object} {...common} />;
    case "table":
      return <TableRenderer object={object} {...common} />;
    case "clock":
      return <ClockRenderer object={object} {...common} />;
    case "bar_model":
      return <BarModelRenderer object={object} {...common} />;
    default:
      return null;
  }
}
