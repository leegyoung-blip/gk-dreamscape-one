import type { MathDimensionObject } from "../MathVisualTypes";
import DimensionPrimitive from "../primitives/Dimension";
import type { SemanticCommonProps } from "./SemanticRenderUtils";

/**
 * Domain-level entry point for measurement visuals. Dimension itself remains a
 * primitive so geometry and solids can reuse exactly the same implementation.
 */
export default function MeasurementRenderer(props: SemanticCommonProps<MathDimensionObject>) {
  return <DimensionPrimitive {...props} />;
}
