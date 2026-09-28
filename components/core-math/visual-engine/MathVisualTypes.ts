/**
 * DREAMSCAPE Math Visual Engine — V2 canonical data contract.
 *
 * Design rules:
 * - Stored in math_questions.content.math_visual.
 * - Describes WHAT exists mathematically, not HOW it is taught.
 * - Every visual and every object has a stable ID so the Teaching Engine can
 *   target mathematical objects without relying on screen coordinates.
 * - Rendering is deterministic. The intelligence layer produces this schema;
 *   it never produces free-form SVG.
 */

export const MATH_VISUAL_SCHEMA_VERSION = 2 as const;

export type MathVisualSchemaVersion = typeof MATH_VISUAL_SCHEMA_VERSION;

export type MathVisualPlacement =
  | "prompt"
  | "option"
  | "teaching"
  | "worked_example"
  | "quick_check";

export type MathVisualKind =
  | "geometry"
  | "fraction"
  | "number_line"
  | "measurement"
  | "solid"
  | "data"
  | "table"
  | "clock"
  | "bar_model"
  | "mixed";

export type MathVisualObjectType =
  // primitives
  | "point"
  | "line"
  | "arrow"
  | "text"
  | "rectangle"
  | "polygon"
  | "circle"
  | "arc"
  | "shade"
  | "dimension"
  | "angle_marker"
  | "right_angle_marker"
  | "axis"
  | "grid"
  // semantic math objects
  | "triangle"
  | "quadrilateral"
  | "composite_shape"
  | "fraction_bar"
  | "fraction_grid"
  | "number_line"
  | "cube"
  | "cuboid"
  | "net"
  | "bar_chart"
  | "line_graph"
  | "pie_chart"
  | "table"
  | "clock"
  | "bar_model";

export type MathVisualTone =
  | "default"
  | "muted"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export type MathVisualFill = "none" | "solid" | "light" | "hatched";
export type MathVisualStroke = "solid" | "dashed" | "dotted";

/**
 * Controlled semantic styling. Avoid storing arbitrary CSS or SVG attributes
 * in curriculum data.
 */
export type MathVisualStyle = {
  tone?: MathVisualTone;
  fill?: MathVisualFill;
  stroke?: MathVisualStroke;
  stroke_width?: number;
  opacity?: number;
};

export type MathCanvas = {
  width: number;
  height: number;
  padding?: number;
  background?: "transparent" | "paper";
};

export type MathCoordinate = {
  x: number;
  y: number;
};

/**
 * Geometry may point directly to coordinates or reference a named point
 * object. Point references let labels/dimensions/teaching reuse one anchor.
 */
export type MathPositionRef = MathCoordinate | { point_id: string };

export type MathVisualSpec = {
  schema_version: MathVisualSchemaVersion;
  visuals: MathVisual[];
  metadata?: MathVisualMetadata;
};

export type MathVisualMetadata = {
  generated_by?: "human" | "migration" | "intelligence" | "system";
  generator_version?: string;
  source?: string;
  notes?: string;
};

export type MathVisual = {
  /** Globally unique within this MathVisualSpec. */
  id: string;
  placement: MathVisualPlacement;
  /** Required only when placement === "option". */
  option_id?: string;
  kind: MathVisualKind;
  title?: string;
  aria_label?: string;
  canvas?: MathCanvas;
  objects: MathVisualObject[];
  metadata?: Record<string, unknown>;
};

export type MathVisualObjectBase = {
  id: string;
  type: MathVisualObjectType;
  style?: MathVisualStyle;
  aria_label?: string;
  /** Useful for deterministic layer ordering; lower values render first. */
  z_index?: number;
  metadata?: Record<string, unknown>;
};

export type MathPointObject = MathVisualObjectBase & {
  type: "point";
  x: number;
  y: number;
  label?: string;
  show_marker?: boolean;
};

export type MathLineObject = MathVisualObjectBase & {
  type: "line";
  from: MathPositionRef;
  to: MathPositionRef;
};

export type MathArrowObject = MathVisualObjectBase & {
  type: "arrow";
  from: MathPositionRef;
  to: MathPositionRef;
  arrow_start?: boolean;
  arrow_end?: boolean;
};

export type MathTextObject = MathVisualObjectBase & {
  type: "text";
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  rotation?: number;
  role?: "label" | "value" | "instruction" | "annotation";
};

export type MathRectangleObject = MathVisualObjectBase & {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  corner_radius?: number;
  label?: string;
};

export type MathPolygonObject = MathVisualObjectBase & {
  type: "polygon";
  points: MathPositionRef[];
  closed?: boolean;
  label?: string;
};

export type MathCircleObject = MathVisualObjectBase & {
  type: "circle";
  cx: number;
  cy: number;
  radius: number;
  label?: string;
};

export type MathArcObject = MathVisualObjectBase & {
  type: "arc";
  center: MathCoordinate;
  radius: number;
  start_angle: number;
  end_angle: number;
  clockwise?: boolean;
};

export type MathShadeObject = MathVisualObjectBase & {
  type: "shade";
  /** Preferred: shade another fillable object by ID. */
  target_id?: string;
  /** Alternative: shade an explicit polygonal region. */
  points?: MathPositionRef[];
};

export type MathDimensionObject = MathVisualObjectBase & {
  type: "dimension";
  from: MathPositionRef;
  to: MathPositionRef;
  label: string;
  offset?: number;
  label_offset?: number;
  extension_lines?: boolean;
};

export type MathAngleMarkerObject = MathVisualObjectBase & {
  type: "angle_marker";
  a: MathPositionRef;
  vertex: MathPositionRef;
  b: MathPositionRef;
  radius?: number;
  label?: string;
};

export type MathRightAngleMarkerObject = MathVisualObjectBase & {
  type: "right_angle_marker";
  a: MathPositionRef;
  vertex: MathPositionRef;
  b: MathPositionRef;
  size?: number;
};

export type MathAxisObject = MathVisualObjectBase & {
  type: "axis";
  orientation: "horizontal" | "vertical";
  from: MathCoordinate;
  to: MathCoordinate;
  min: number;
  max: number;
  step: number;
  label?: string;
  show_tick_labels?: boolean;
};

export type MathGridObject = MathVisualObjectBase & {
  type: "grid";
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  columns: number;
};

export type MathTriangleObject = MathVisualObjectBase & {
  type: "triangle";
  points: [MathPositionRef, MathPositionRef, MathPositionRef];
  vertex_labels?: [string?, string?, string?];
};

export type MathQuadrilateralObject = MathVisualObjectBase & {
  type: "quadrilateral";
  points: [MathPositionRef, MathPositionRef, MathPositionRef, MathPositionRef];
  vertex_labels?: [string?, string?, string?, string?];
};

export type MathCompositeShapeObject = MathVisualObjectBase & {
  type: "composite_shape";
  component_ids: string[];
};

export type MathFractionBarObject = MathVisualObjectBase & {
  type: "fraction_bar";
  x: number;
  y: number;
  width: number;
  height: number;
  numerator: number;
  denominator: number;
  orientation?: "horizontal" | "vertical";
  show_fraction_label?: boolean;
};

export type MathFractionGridObject = MathVisualObjectBase & {
  type: "fraction_grid";
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  columns: number;
  /** Zero-based flattened cell indexes. */
  shaded_cells?: number[];
  show_fraction_label?: boolean;
};

export type MathNumberLineObject = MathVisualObjectBase & {
  type: "number_line";
  x: number;
  y: number;
  width: number;
  min: number;
  max: number;
  step: number;
  highlighted_values?: number[];
  labelled_values?: number[];
  arrows?: "none" | "end" | "both";
};

export type MathCubeObject = MathVisualObjectBase & {
  type: "cube";
  x: number;
  y: number;
  size: number;
  depth?: number;
  unit?: string;
  show_dimensions?: boolean;
};

export type MathCuboidObject = MathVisualObjectBase & {
  type: "cuboid";
  x: number;
  y: number;
  length: number;
  width: number;
  height: number;
  unit?: string;
  show_dimensions?: boolean;
};

export type MathNetFace = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
};

export type MathNetObject = MathVisualObjectBase & {
  type: "net";
  faces: MathNetFace[];
};

export type MathBarChartDatum = {
  id: string;
  label: string;
  value: number;
};

export type MathBarChartObject = MathVisualObjectBase & {
  type: "bar_chart";
  x: number;
  y: number;
  width: number;
  height: number;
  data: MathBarChartDatum[];
  x_label?: string;
  y_label?: string;
  y_min?: number;
  y_max?: number;
  y_step?: number;
  show_values?: boolean;
};

export type MathLineGraphPoint = {
  id: string;
  label?: string;
  x: number;
  y: number;
};

export type MathLineGraphObject = MathVisualObjectBase & {
  type: "line_graph";
  x: number;
  y: number;
  width: number;
  height: number;
  points: MathLineGraphPoint[];
  x_label?: string;
  y_label?: string;
  connect_points?: boolean;
};

export type MathPieSlice = {
  id: string;
  label: string;
  value: number;
};

export type MathPieChartObject = MathVisualObjectBase & {
  type: "pie_chart";
  cx: number;
  cy: number;
  radius: number;
  slices: MathPieSlice[];
  show_labels?: boolean;
  show_values?: boolean;
};

export type MathTableObject = MathVisualObjectBase & {
  type: "table";
  /** Optional explicit layout. If omitted, the renderer uses the visual canvas. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  columns: string[];
  rows: Array<Array<string | number>>;
  row_labels?: string[];
  highlight_cells?: Array<{ row: number; column: number }>;
};

export type MathClockObject = MathVisualObjectBase & {
  type: "clock";
  cx: number;
  cy: number;
  radius: number;
  hour: number;
  minute: number;
  show_numbers?: boolean;
};

export type MathBarModelSegment = {
  id: string;
  label?: string;
  value: number;
};

export type MathBarModelObject = MathVisualObjectBase & {
  type: "bar_model";
  x: number;
  y: number;
  width: number;
  height: number;
  segments: MathBarModelSegment[];
  total_label?: string;
};

export type MathVisualObject =
  | MathPointObject
  | MathLineObject
  | MathArrowObject
  | MathTextObject
  | MathRectangleObject
  | MathPolygonObject
  | MathCircleObject
  | MathArcObject
  | MathShadeObject
  | MathDimensionObject
  | MathAngleMarkerObject
  | MathRightAngleMarkerObject
  | MathAxisObject
  | MathGridObject
  | MathTriangleObject
  | MathQuadrilateralObject
  | MathCompositeShapeObject
  | MathFractionBarObject
  | MathFractionGridObject
  | MathNumberLineObject
  | MathCubeObject
  | MathCuboidObject
  | MathNetObject
  | MathBarChartObject
  | MathLineGraphObject
  | MathPieChartObject
  | MathTableObject
  | MathClockObject
  | MathBarModelObject;

export const MATH_VISUAL_PLACEMENTS: readonly MathVisualPlacement[] = [
  "prompt",
  "option",
  "teaching",
  "worked_example",
  "quick_check",
] as const;

export const MATH_VISUAL_KINDS: readonly MathVisualKind[] = [
  "geometry",
  "fraction",
  "number_line",
  "measurement",
  "solid",
  "data",
  "table",
  "clock",
  "bar_model",
  "mixed",
] as const;

export const MATH_VISUAL_OBJECT_TYPES: readonly MathVisualObjectType[] = [
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
] as const;
