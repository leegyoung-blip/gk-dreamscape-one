/**
 * DREAMSCAPE Math Visual Engine — V2 structural + mathematical validation.
 *
 * This validator intentionally has no React/Supabase dependency. It can run in
 * admin editors, import jobs, migration scripts, server actions or tests.
 */

import {
  MATH_VISUAL_KINDS,
  MATH_VISUAL_OBJECT_TYPES,
  MATH_VISUAL_PLACEMENTS,
  MATH_VISUAL_SCHEMA_VERSION,
  type MathPositionRef,
  type MathVisual,
  type MathVisualObject,
  type MathVisualObjectType,
  type MathVisualSpec,
} from "./MathVisualTypes";
import type {
  MathVisualTeachingAction,
  MathVisualTeachingStep,
} from "./MathVisualState";

export type MathVisualValidationSeverity = "error" | "warning";

export type MathVisualValidationIssue = {
  severity: MathVisualValidationSeverity;
  code: string;
  path: string;
  message: string;
};

export type MathVisualValidationResult = {
  valid: boolean;
  issues: MathVisualValidationIssue[];
};

const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_\-:.]*$/;
const MAX_VISUALS = 16;
const MAX_OBJECTS_PER_VISUAL = 250;
const MAX_GRID_CELLS = 400;

const FILLABLE_TYPES = new Set<MathVisualObjectType>([
  "rectangle",
  "polygon",
  "circle",
  "triangle",
  "quadrilateral",
  "fraction_bar",
  "fraction_grid",
  "bar_chart",
  "pie_chart",
  "bar_model",
]);

const TRACEABLE_TYPES = new Set<MathVisualObjectType>([
  "line",
  "arrow",
  "rectangle",
  "polygon",
  "circle",
  "arc",
  "dimension",
  "angle_marker",
  "right_angle_marker",
  "triangle",
  "quadrilateral",
  "number_line",
  "cube",
  "cuboid",
  "net",
  "line_graph",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function integer(value: unknown): value is number {
  return finite(value) && Number.isInteger(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function addIssue(
  issues: MathVisualValidationIssue[],
  severity: MathVisualValidationSeverity,
  code: string,
  path: string,
  message: string,
) {
  issues.push({ severity, code, path, message });
}

function requireFinite(
  issues: MathVisualValidationIssue[],
  value: unknown,
  path: string,
  label: string,
) {
  if (!finite(value)) {
    addIssue(issues, "error", "invalid_number", path, `${label} must be a finite number.`);
    return false;
  }
  return true;
}

function requirePositive(
  issues: MathVisualValidationIssue[],
  value: unknown,
  path: string,
  label: string,
) {
  if (!requireFinite(issues, value, path, label)) return false;
  if ((value as number) <= 0) {
    addIssue(issues, "error", "must_be_positive", path, `${label} must be greater than 0.`);
    return false;
  }
  return true;
}

function requirePositiveInteger(
  issues: MathVisualValidationIssue[],
  value: unknown,
  path: string,
  label: string,
) {
  if (!integer(value) || value <= 0) {
    addIssue(issues, "error", "invalid_integer", path, `${label} must be a positive whole number.`);
    return false;
  }
  return true;
}

function validateStyle(
  raw: unknown,
  path: string,
  issues: MathVisualValidationIssue[],
) {
  if (raw == null) return;
  if (!isRecord(raw)) {
    addIssue(issues, "error", "invalid_style", path, "Style must be an object.");
    return;
  }

  if (raw.stroke_width != null) {
    requirePositive(issues, raw.stroke_width, `${path}.stroke_width`, "Stroke width");
  }

  if (raw.opacity != null) {
    if (!finite(raw.opacity) || raw.opacity < 0 || raw.opacity > 1) {
      addIssue(issues, "error", "invalid_opacity", `${path}.opacity`, "Opacity must be between 0 and 1.");
    }
  }
}

function isCoordinate(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && finite(value.x) && finite(value.y);
}

function validatePositionRef(
  value: unknown,
  path: string,
  pointIds: Set<string>,
  issues: MathVisualValidationIssue[],
) {
  if (isCoordinate(value)) return;

  if (isRecord(value) && nonEmptyString(value.point_id)) {
    if (!pointIds.has(value.point_id)) {
      addIssue(
        issues,
        "error",
        "missing_point_reference",
        `${path}.point_id`,
        `Point “${value.point_id}” does not exist in this visual.`,
      );
    }
    return;
  }

  addIssue(
    issues,
    "error",
    "invalid_position",
    path,
    "Position must be {x, y} or {point_id}.",
  );
}

function validatePositionArray(
  values: unknown,
  minimum: number,
  path: string,
  pointIds: Set<string>,
  issues: MathVisualValidationIssue[],
) {
  if (!Array.isArray(values) || values.length < minimum) {
    addIssue(
      issues,
      "error",
      "insufficient_points",
      path,
      `At least ${minimum} point reference(s) are required.`,
    );
    return;
  }

  values.forEach((value, index) =>
    validatePositionRef(value, `${path}[${index}]`, pointIds, issues),
  );
}

function validateCommonObjectFields(
  object: Record<string, unknown>,
  path: string,
  issues: MathVisualValidationIssue[],
) {
  if (!nonEmptyString(object.id) || !ID_PATTERN.test(object.id)) {
    addIssue(
      issues,
      "error",
      "invalid_object_id",
      `${path}.id`,
      "Object ID must start with a letter and contain only letters, numbers, _, -, : or .",
    );
  }

  if (!MATH_VISUAL_OBJECT_TYPES.includes(object.type as MathVisualObjectType)) {
    addIssue(
      issues,
      "error",
      "unsupported_object_type",
      `${path}.type`,
      `Unsupported Math Visual object type “${String(object.type ?? "")}”.`,
    );
  }

  if (object.z_index != null && !finite(object.z_index)) {
    addIssue(issues, "error", "invalid_z_index", `${path}.z_index`, "z_index must be a finite number.");
  }

  validateStyle(object.style, `${path}.style`, issues);
}

function validateObject(
  object: MathVisualObject,
  path: string,
  pointIds: Set<string>,
  objectIds: Set<string>,
  issues: MathVisualValidationIssue[],
) {
  const raw = object as unknown as Record<string, unknown>;
  validateCommonObjectFields(raw, path, issues);

  switch (object.type) {
    case "point":
      requireFinite(issues, object.x, `${path}.x`, "Point x");
      requireFinite(issues, object.y, `${path}.y`, "Point y");
      break;

    case "line":
    case "arrow":
      validatePositionRef(object.from, `${path}.from`, pointIds, issues);
      validatePositionRef(object.to, `${path}.to`, pointIds, issues);
      break;

    case "text":
      requireFinite(issues, object.x, `${path}.x`, "Text x");
      requireFinite(issues, object.y, `${path}.y`, "Text y");
      if (!nonEmptyString(object.text)) {
        addIssue(issues, "error", "empty_text", `${path}.text`, "Text objects require non-empty text.");
      }
      if (object.rotation != null) {
        requireFinite(issues, object.rotation, `${path}.rotation`, "Text rotation");
      }
      break;

    case "rectangle":
      requireFinite(issues, object.x, `${path}.x`, "Rectangle x");
      requireFinite(issues, object.y, `${path}.y`, "Rectangle y");
      requirePositive(issues, object.width, `${path}.width`, "Rectangle width");
      requirePositive(issues, object.height, `${path}.height`, "Rectangle height");
      if (object.corner_radius != null && (!finite(object.corner_radius) || object.corner_radius < 0)) {
        addIssue(issues, "error", "invalid_corner_radius", `${path}.corner_radius`, "Corner radius must be 0 or greater.");
      }
      break;

    case "polygon":
      validatePositionArray(object.points, 3, `${path}.points`, pointIds, issues);
      break;

    case "circle":
      requireFinite(issues, object.cx, `${path}.cx`, "Circle centre x");
      requireFinite(issues, object.cy, `${path}.cy`, "Circle centre y");
      requirePositive(issues, object.radius, `${path}.radius`, "Circle radius");
      break;

    case "arc":
      if (!isCoordinate(object.center)) {
        addIssue(issues, "error", "invalid_arc_center", `${path}.center`, "Arc centre must contain finite x and y values.");
      }
      requirePositive(issues, object.radius, `${path}.radius`, "Arc radius");
      requireFinite(issues, object.start_angle, `${path}.start_angle`, "Arc start angle");
      requireFinite(issues, object.end_angle, `${path}.end_angle`, "Arc end angle");
      if (finite(object.start_angle) && finite(object.end_angle) && object.start_angle === object.end_angle) {
        addIssue(issues, "warning", "zero_arc_span", path, "Arc start and end angles are identical.");
      }
      break;

    case "shade":
      if (object.target_id) {
        if (!objectIds.has(object.target_id)) {
          addIssue(issues, "error", "missing_target", `${path}.target_id`, `Shade target “${object.target_id}” does not exist.`);
        }
      } else if (object.points) {
        validatePositionArray(object.points, 3, `${path}.points`, pointIds, issues);
      } else {
        addIssue(issues, "error", "missing_shade_region", path, "Shade requires target_id or polygon points.");
      }
      break;

    case "dimension":
      validatePositionRef(object.from, `${path}.from`, pointIds, issues);
      validatePositionRef(object.to, `${path}.to`, pointIds, issues);
      if (!nonEmptyString(object.label)) {
        addIssue(issues, "error", "missing_dimension_label", `${path}.label`, "Dimensions require a label.");
      }
      if (object.offset != null) requireFinite(issues, object.offset, `${path}.offset`, "Dimension offset");
      if (object.label_offset != null) requireFinite(issues, object.label_offset, `${path}.label_offset`, "Dimension label offset");
      break;

    case "angle_marker":
    case "right_angle_marker":
      validatePositionRef(object.a, `${path}.a`, pointIds, issues);
      validatePositionRef(object.vertex, `${path}.vertex`, pointIds, issues);
      validatePositionRef(object.b, `${path}.b`, pointIds, issues);
      if (object.type === "angle_marker" && object.radius != null) {
        requirePositive(issues, object.radius, `${path}.radius`, "Angle marker radius");
      }
      if (object.type === "right_angle_marker" && object.size != null) {
        requirePositive(issues, object.size, `${path}.size`, "Right-angle marker size");
      }
      break;

    case "axis":
      if (!isCoordinate(object.from)) {
        addIssue(issues, "error", "invalid_axis_start", `${path}.from`, "Axis start must contain finite x and y values.");
      }
      if (!isCoordinate(object.to)) {
        addIssue(issues, "error", "invalid_axis_end", `${path}.to`, "Axis end must contain finite x and y values.");
      }
      requireFinite(issues, object.min, `${path}.min`, "Axis minimum");
      requireFinite(issues, object.max, `${path}.max`, "Axis maximum");
      requirePositive(issues, object.step, `${path}.step`, "Axis step");
      if (finite(object.min) && finite(object.max) && object.max <= object.min) {
        addIssue(issues, "error", "invalid_axis_range", path, "Axis maximum must be greater than minimum.");
      }
      break;

    case "grid": {
      requireFinite(issues, object.x, `${path}.x`, "Grid x");
      requireFinite(issues, object.y, `${path}.y`, "Grid y");
      requirePositive(issues, object.width, `${path}.width`, "Grid width");
      requirePositive(issues, object.height, `${path}.height`, "Grid height");
      const rowsValid = requirePositiveInteger(issues, object.rows, `${path}.rows`, "Grid rows");
      const colsValid = requirePositiveInteger(issues, object.columns, `${path}.columns`, "Grid columns");
      if (rowsValid && colsValid && object.rows * object.columns > MAX_GRID_CELLS) {
        addIssue(issues, "error", "grid_too_large", path, `Grid may contain at most ${MAX_GRID_CELLS} cells.`);
      }
      break;
    }

    case "triangle":
      validatePositionArray(object.points, 3, `${path}.points`, pointIds, issues);
      if (object.points.length !== 3) {
        addIssue(issues, "error", "triangle_point_count", `${path}.points`, "Triangle must contain exactly 3 points.");
      }
      break;

    case "quadrilateral":
      validatePositionArray(object.points, 4, `${path}.points`, pointIds, issues);
      if (object.points.length !== 4) {
        addIssue(issues, "error", "quadrilateral_point_count", `${path}.points`, "Quadrilateral must contain exactly 4 points.");
      }
      break;

    case "composite_shape":
      if (!Array.isArray(object.component_ids) || object.component_ids.length < 2) {
        addIssue(issues, "error", "invalid_composite_shape", `${path}.component_ids`, "Composite shape requires at least 2 component IDs.");
      } else {
        for (const [index, componentId] of object.component_ids.entries()) {
          if (!objectIds.has(componentId)) {
            addIssue(issues, "error", "missing_component", `${path}.component_ids[${index}]`, `Component “${componentId}” does not exist.`);
          }
          if (componentId === object.id) {
            addIssue(issues, "error", "self_reference", `${path}.component_ids[${index}]`, "Composite shape cannot include itself.");
          }
        }
      }
      break;

    case "fraction_bar":
      requireFinite(issues, object.x, `${path}.x`, "Fraction bar x");
      requireFinite(issues, object.y, `${path}.y`, "Fraction bar y");
      requirePositive(issues, object.width, `${path}.width`, "Fraction bar width");
      requirePositive(issues, object.height, `${path}.height`, "Fraction bar height");
      validateFraction(object.numerator, object.denominator, path, issues);
      break;

    case "fraction_grid": {
      requireFinite(issues, object.x, `${path}.x`, "Fraction grid x");
      requireFinite(issues, object.y, `${path}.y`, "Fraction grid y");
      requirePositive(issues, object.width, `${path}.width`, "Fraction grid width");
      requirePositive(issues, object.height, `${path}.height`, "Fraction grid height");
      const rowsValid = requirePositiveInteger(issues, object.rows, `${path}.rows`, "Fraction grid rows");
      const colsValid = requirePositiveInteger(issues, object.columns, `${path}.columns`, "Fraction grid columns");
      if (rowsValid && colsValid) {
        const cellCount = object.rows * object.columns;
        if (cellCount > MAX_GRID_CELLS) {
          addIssue(issues, "error", "grid_too_large", path, `Fraction grid may contain at most ${MAX_GRID_CELLS} cells.`);
        }
        const shaded = object.shaded_cells || [];
        const seen = new Set<number>();
        shaded.forEach((cell, index) => {
          if (!integer(cell) || cell < 0 || cell >= cellCount) {
            addIssue(issues, "error", "invalid_shaded_cell", `${path}.shaded_cells[${index}]`, `Shaded cell must be an integer from 0 to ${Math.max(0, cellCount - 1)}.`);
          }
          if (seen.has(cell)) {
            addIssue(issues, "warning", "duplicate_shaded_cell", `${path}.shaded_cells[${index}]`, `Cell ${cell} is shaded more than once.`);
          }
          seen.add(cell);
        });
      }
      break;
    }

    case "number_line":
      requireFinite(issues, object.x, `${path}.x`, "Number line x");
      requireFinite(issues, object.y, `${path}.y`, "Number line y");
      requirePositive(issues, object.width, `${path}.width`, "Number line width");
      requireFinite(issues, object.min, `${path}.min`, "Number line minimum");
      requireFinite(issues, object.max, `${path}.max`, "Number line maximum");
      requirePositive(issues, object.step, `${path}.step`, "Number line step");
      if (finite(object.min) && finite(object.max) && object.max <= object.min) {
        addIssue(issues, "error", "invalid_number_line_range", path, "Number line maximum must be greater than minimum.");
      }
      validateNumberArray(object.highlighted_values, `${path}.highlighted_values`, issues);
      validateNumberArray(object.labelled_values, `${path}.labelled_values`, issues);
      break;

    case "cube":
      requireFinite(issues, object.x, `${path}.x`, "Cube x");
      requireFinite(issues, object.y, `${path}.y`, "Cube y");
      requirePositive(issues, object.size, `${path}.size`, "Cube size");
      if (object.depth != null) requirePositive(issues, object.depth, `${path}.depth`, "Cube depth");
      break;

    case "cuboid":
      requireFinite(issues, object.x, `${path}.x`, "Cuboid x");
      requireFinite(issues, object.y, `${path}.y`, "Cuboid y");
      requirePositive(issues, object.length, `${path}.length`, "Cuboid length");
      requirePositive(issues, object.width, `${path}.width`, "Cuboid width");
      requirePositive(issues, object.height, `${path}.height`, "Cuboid height");
      break;

    case "net":
      if (!Array.isArray(object.faces) || object.faces.length === 0) {
        addIssue(issues, "error", "empty_net", `${path}.faces`, "Net requires at least one face.");
      } else {
        const faceIds = new Set<string>();
        object.faces.forEach((face, index) => {
          const facePath = `${path}.faces[${index}]`;
          if (!nonEmptyString(face.id) || !ID_PATTERN.test(face.id)) {
            addIssue(issues, "error", "invalid_face_id", `${facePath}.id`, "Net face requires a valid ID.");
          } else if (faceIds.has(face.id)) {
            addIssue(issues, "error", "duplicate_face_id", `${facePath}.id`, `Duplicate net face ID “${face.id}”.`);
          }
          faceIds.add(face.id);
          requireFinite(issues, face.x, `${facePath}.x`, "Face x");
          requireFinite(issues, face.y, `${facePath}.y`, "Face y");
          requirePositive(issues, face.width, `${facePath}.width`, "Face width");
          requirePositive(issues, face.height, `${facePath}.height`, "Face height");
        });
      }
      break;

    case "bar_chart":
      validateBox(object, path, "Bar chart", issues);
      if (!Array.isArray(object.data) || object.data.length === 0) {
        addIssue(issues, "error", "empty_chart", `${path}.data`, "Bar chart requires at least one data item.");
      } else {
        validateIdValueRows(object.data, `${path}.data`, issues, false);
      }
      if (object.y_min != null) requireFinite(issues, object.y_min, `${path}.y_min`, "Bar chart y minimum");
      if (object.y_max != null) requireFinite(issues, object.y_max, `${path}.y_max`, "Bar chart y maximum");
      if (object.y_step != null) requirePositive(issues, object.y_step, `${path}.y_step`, "Bar chart y step");
      if (finite(object.y_min) && finite(object.y_max) && object.y_max <= object.y_min) {
        addIssue(issues, "error", "invalid_chart_range", path, "Bar chart y_max must be greater than y_min.");
      }
      break;

    case "line_graph":
      validateBox(object, path, "Line graph", issues);
      if (!Array.isArray(object.points) || object.points.length < 2) {
        addIssue(issues, "error", "insufficient_graph_points", `${path}.points`, "Line graph requires at least 2 points.");
      } else {
        const ids = new Set<string>();
        object.points.forEach((point, index) => {
          const pointPath = `${path}.points[${index}]`;
          validateChildId(point.id, pointPath, ids, issues, "graph point");
          requireFinite(issues, point.x, `${pointPath}.x`, "Graph point x");
          requireFinite(issues, point.y, `${pointPath}.y`, "Graph point y");
        });
      }
      break;

    case "pie_chart":
      requireFinite(issues, object.cx, `${path}.cx`, "Pie chart centre x");
      requireFinite(issues, object.cy, `${path}.cy`, "Pie chart centre y");
      requirePositive(issues, object.radius, `${path}.radius`, "Pie chart radius");
      if (!Array.isArray(object.slices) || object.slices.length < 2) {
        addIssue(issues, "error", "insufficient_pie_slices", `${path}.slices`, "Pie chart requires at least 2 slices.");
      } else {
        validateIdValueRows(object.slices, `${path}.slices`, issues, true);
        const total = object.slices.reduce((sum, slice) => sum + (finite(slice.value) ? slice.value : 0), 0);
        if (total <= 0) {
          addIssue(issues, "error", "invalid_pie_total", `${path}.slices`, "Pie chart slice values must total more than 0.");
        }
      }
      break;

    case "table":
      if (object.x != null) requireFinite(issues, object.x, `${path}.x`, "Table x");
      if (object.y != null) requireFinite(issues, object.y, `${path}.y`, "Table y");
      if (object.width != null) requirePositive(issues, object.width, `${path}.width`, "Table width");
      if (object.height != null) requirePositive(issues, object.height, `${path}.height`, "Table height");
      if (!Array.isArray(object.columns) || object.columns.length === 0) {
        addIssue(issues, "error", "missing_table_columns", `${path}.columns`, "Table requires at least one column.");
      }
      if (!Array.isArray(object.rows)) {
        addIssue(issues, "error", "invalid_table_rows", `${path}.rows`, "Table rows must be an array.");
      } else if (Array.isArray(object.columns)) {
        object.rows.forEach((row, index) => {
          if (!Array.isArray(row) || row.length !== object.columns.length) {
            addIssue(issues, "error", "table_row_width", `${path}.rows[${index}]`, `Table row must contain ${object.columns.length} cell(s).`);
          }
        });
      }
      if (object.row_labels && object.row_labels.length !== object.rows.length) {
        addIssue(issues, "error", "row_label_count", `${path}.row_labels`, "row_labels count must match the number of rows.");
      }
      object.highlight_cells?.forEach((cell, index) => {
        if (!integer(cell.row) || !integer(cell.column) || cell.row < 0 || cell.column < 0 || cell.row >= object.rows.length || cell.column >= object.columns.length) {
          addIssue(issues, "error", "invalid_highlight_cell", `${path}.highlight_cells[${index}]`, "Highlighted table cell is outside the table bounds.");
        }
      });
      break;

    case "clock":
      requireFinite(issues, object.cx, `${path}.cx`, "Clock centre x");
      requireFinite(issues, object.cy, `${path}.cy`, "Clock centre y");
      requirePositive(issues, object.radius, `${path}.radius`, "Clock radius");
      if (!finite(object.hour) || object.hour < 0 || object.hour >= 24) {
        addIssue(issues, "error", "invalid_clock_hour", `${path}.hour`, "Clock hour must be from 0 up to but not including 24.");
      }
      if (!integer(object.minute) || object.minute < 0 || object.minute > 59) {
        addIssue(issues, "error", "invalid_clock_minute", `${path}.minute`, "Clock minute must be a whole number from 0 to 59.");
      }
      break;

    case "bar_model":
      validateBox(object, path, "Bar model", issues);
      if (!Array.isArray(object.segments) || object.segments.length === 0) {
        addIssue(issues, "error", "empty_bar_model", `${path}.segments`, "Bar model requires at least one segment.");
      } else {
        validateIdValueRows(object.segments, `${path}.segments`, issues, true);
      }
      break;
  }
}

function validateFraction(
  numerator: unknown,
  denominator: unknown,
  path: string,
  issues: MathVisualValidationIssue[],
) {
  if (!integer(denominator) || denominator <= 0) {
    addIssue(issues, "error", "invalid_denominator", `${path}.denominator`, "Denominator must be a positive whole number.");
    return;
  }
  if (!integer(numerator) || numerator < 0) {
    addIssue(issues, "error", "invalid_numerator", `${path}.numerator`, "Numerator must be a whole number of 0 or greater.");
    return;
  }
  if (numerator > denominator) {
    addIssue(issues, "warning", "improper_fraction_visual", path, "Numerator is greater than denominator. Confirm that one bar is intended to show an improper fraction.");
  }
}

function validateNumberArray(
  values: unknown,
  path: string,
  issues: MathVisualValidationIssue[],
) {
  if (values == null) return;
  if (!Array.isArray(values)) {
    addIssue(issues, "error", "invalid_number_array", path, "Expected an array of numbers.");
    return;
  }
  values.forEach((value, index) => requireFinite(issues, value, `${path}[${index}]`, "Value"));
}

function validateBox(
  object: { x: unknown; y: unknown; width: unknown; height: unknown },
  path: string,
  label: string,
  issues: MathVisualValidationIssue[],
) {
  requireFinite(issues, object.x, `${path}.x`, `${label} x`);
  requireFinite(issues, object.y, `${path}.y`, `${label} y`);
  requirePositive(issues, object.width, `${path}.width`, `${label} width`);
  requirePositive(issues, object.height, `${path}.height`, `${label} height`);
}

function validateChildId(
  id: unknown,
  path: string,
  ids: Set<string>,
  issues: MathVisualValidationIssue[],
  label: string,
) {
  if (!nonEmptyString(id) || !ID_PATTERN.test(id)) {
    addIssue(issues, "error", "invalid_child_id", `${path}.id`, `${label} requires a valid ID.`);
    return;
  }
  if (ids.has(id)) {
    addIssue(issues, "error", "duplicate_child_id", `${path}.id`, `Duplicate ${label} ID “${id}”.`);
  }
  ids.add(id);
}

function validateIdValueRows(
  rows: Array<{ id: string; value: number }>,
  path: string,
  issues: MathVisualValidationIssue[],
  nonNegative: boolean,
) {
  const ids = new Set<string>();
  rows.forEach((row, index) => {
    const rowPath = `${path}[${index}]`;
    validateChildId(row.id, rowPath, ids, issues, "data item");
    if (!finite(row.value)) {
      addIssue(issues, "error", "invalid_data_value", `${rowPath}.value`, "Data value must be a finite number.");
    } else if (nonNegative && row.value < 0) {
      addIssue(issues, "error", "negative_data_value", `${rowPath}.value`, "This visual requires values of 0 or greater.");
    }
  });
}

function validateVisual(
  rawVisual: unknown,
  index: number,
  visualIds: Set<string>,
  issues: MathVisualValidationIssue[],
) {
  const path = `math_visual.visuals[${index}]`;
  if (!isRecord(rawVisual)) {
    addIssue(issues, "error", "invalid_visual", path, "Visual must be an object.");
    return;
  }

  if (!nonEmptyString(rawVisual.id) || !ID_PATTERN.test(rawVisual.id)) {
    addIssue(issues, "error", "invalid_visual_id", `${path}.id`, "Visual ID must start with a letter and contain only letters, numbers, _, -, : or .");
  } else if (visualIds.has(rawVisual.id)) {
    addIssue(issues, "error", "duplicate_visual_id", `${path}.id`, `Duplicate visual ID “${rawVisual.id}”.`);
  } else {
    visualIds.add(rawVisual.id);
  }

  if (!MATH_VISUAL_PLACEMENTS.includes(rawVisual.placement as never)) {
    addIssue(issues, "error", "invalid_placement", `${path}.placement`, `Unsupported placement “${String(rawVisual.placement ?? "")}”.`);
  }

  if (rawVisual.placement === "option" && !nonEmptyString(rawVisual.option_id)) {
    addIssue(issues, "error", "missing_option_id", `${path}.option_id`, "Option visuals require option_id.");
  }

  if (!MATH_VISUAL_KINDS.includes(rawVisual.kind as never)) {
    addIssue(issues, "error", "invalid_visual_kind", `${path}.kind`, `Unsupported visual kind “${String(rawVisual.kind ?? "")}”.`);
  }

  if (rawVisual.canvas != null) {
    if (!isRecord(rawVisual.canvas)) {
      addIssue(issues, "error", "invalid_canvas", `${path}.canvas`, "Canvas must be an object.");
    } else {
      requirePositive(issues, rawVisual.canvas.width, `${path}.canvas.width`, "Canvas width");
      requirePositive(issues, rawVisual.canvas.height, `${path}.canvas.height`, "Canvas height");
      if (rawVisual.canvas.padding != null && (!finite(rawVisual.canvas.padding) || rawVisual.canvas.padding < 0)) {
        addIssue(issues, "error", "invalid_canvas_padding", `${path}.canvas.padding`, "Canvas padding must be 0 or greater.");
      }
    }
  }

  if (!Array.isArray(rawVisual.objects)) {
    addIssue(issues, "error", "invalid_objects", `${path}.objects`, "Visual objects must be an array.");
    return;
  }

  const rawObjects = rawVisual.objects;

  if (rawObjects.length === 0) {
    addIssue(issues, "warning", "empty_visual", `${path}.objects`, "Visual contains no objects.");
  }

  if (rawObjects.length > MAX_OBJECTS_PER_VISUAL) {
    addIssue(issues, "error", "too_many_objects", `${path}.objects`, `A visual may contain at most ${MAX_OBJECTS_PER_VISUAL} objects.`);
  }

  const objectIds = new Set<string>();
  const pointIds = new Set<string>();

  // Pass 1: collect IDs so forward references are allowed.
  rawObjects.forEach((rawObject, objectIndex) => {
    const objectPath = `${path}.objects[${objectIndex}]`;
    if (!isRecord(rawObject)) {
      addIssue(issues, "error", "invalid_object", objectPath, "Visual object must be an object.");
      return;
    }

    const id = nonEmptyString(rawObject.id) ? rawObject.id : null;
    if (id) {
      if (objectIds.has(id)) {
        addIssue(issues, "error", "duplicate_object_id", `${objectPath}.id`, `Duplicate object ID “${id}”.`);
      }
      objectIds.add(id);
      if (rawObject.type === "point") pointIds.add(id);
    }
  });

  // Pass 2: full object validation and reference checks.
  rawObjects.forEach((rawObject, objectIndex) => {
    if (!isRecord(rawObject)) return;
    validateObject(
      rawObject as unknown as MathVisualObject,
      `${path}.objects[${objectIndex}]`,
      pointIds,
      objectIds,
      issues,
    );
  });

  // Additional semantic cross-references.
  rawObjects.forEach((rawObject, objectIndex) => {
    if (!isRecord(rawObject) || rawObject.type !== "shade" || !nonEmptyString(rawObject.target_id)) return;
    const target = rawObjects.find(
      (candidate) => isRecord(candidate) && candidate.id === rawObject.target_id,
    ) as Record<string, unknown> | undefined;

    if (target && !FILLABLE_TYPES.has(target.type as MathVisualObjectType)) {
      addIssue(
        issues,
        "warning",
        "non_fillable_shade_target",
        `${path}.objects[${objectIndex}].target_id`,
        `Target “${rawObject.target_id}” is not normally fillable.`,
      );
    }
  });
}

export function validateMathVisualSpec(value: unknown): MathVisualValidationResult {
  const issues: MathVisualValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        {
          severity: "error",
          code: "invalid_spec",
          path: "math_visual",
          message: "Math Visual specification must be an object.",
        },
      ],
    };
  }

  if (value.schema_version !== MATH_VISUAL_SCHEMA_VERSION) {
    addIssue(
      issues,
      "error",
      "unsupported_schema_version",
      "math_visual.schema_version",
      `Math Visual schema_version must be ${MATH_VISUAL_SCHEMA_VERSION}.`,
    );
  }

  if (!Array.isArray(value.visuals)) {
    addIssue(issues, "error", "missing_visuals", "math_visual.visuals", "Math Visual specification requires a visuals array.");
  } else {
    if (value.visuals.length === 0) {
      addIssue(issues, "error", "empty_visuals", "math_visual.visuals", "At least one visual is required.");
    }
    if (value.visuals.length > MAX_VISUALS) {
      addIssue(issues, "error", "too_many_visuals", "math_visual.visuals", `A Math Visual specification may contain at most ${MAX_VISUALS} visuals.`);
    }

    const visualIds = new Set<string>();
    value.visuals.forEach((visual, index) => validateVisual(visual, index, visualIds, issues));
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

export function isMathVisualSpec(value: unknown): value is MathVisualSpec {
  return validateMathVisualSpec(value).valid;
}

export function assertMathVisualSpec(value: unknown): asserts value is MathVisualSpec {
  const result = validateMathVisualSpec(value);
  if (result.valid) return;

  const message = result.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid Math Visual specification:\n${message}`);
}

function visualIndex(spec: MathVisualSpec) {
  return new Map(spec.visuals.map((visual) => [visual.id, visual]));
}

function objectIndex(visual: MathVisual) {
  return new Map(visual.objects.map((object) => [object.id, object]));
}

/**
 * Cross-validates Teaching Engine visual actions against a valid MathVisualSpec.
 * This is designed to be called later from TeachingAuthoringUtils.
 */
export function validateMathVisualTeachingActions(
  spec: MathVisualSpec,
  actions: MathVisualTeachingAction[],
  basePath = "teaching.visual_actions",
): MathVisualValidationIssue[] {
  const issues: MathVisualValidationIssue[] = [];
  const visuals = visualIndex(spec);

  actions.forEach((action, actionIndex) => {
    const path = `${basePath}[${actionIndex}]`;
    const visual = visuals.get(action.visual_id);

    if (!visual) {
      addIssue(issues, "error", "missing_visual_reference", `${path}.visual_id`, `Visual “${action.visual_id}” does not exist.`);
      return;
    }

    if (!Array.isArray(action.targets) || action.targets.length === 0) {
      addIssue(issues, "error", "missing_action_targets", `${path}.targets`, "Visual action requires at least one target object ID.");
      return;
    }

    if (action.action === "annotate" && !nonEmptyString(action.text)) {
      addIssue(issues, "error", "missing_annotation_text", `${path}.text`, "Annotate action requires text.");
    }

    if (action.duration_ms != null && (!finite(action.duration_ms) || action.duration_ms < 0)) {
      addIssue(issues, "error", "invalid_action_duration", `${path}.duration_ms`, "duration_ms must be 0 or greater.");
    }

    const objects = objectIndex(visual);
    const seenTargets = new Set<string>();

    action.targets.forEach((targetId, targetIndex) => {
      const targetPath = `${path}.targets[${targetIndex}]`;
      if (seenTargets.has(targetId)) {
        addIssue(issues, "warning", "duplicate_action_target", targetPath, `Target “${targetId}” appears more than once in the same action.`);
      }
      seenTargets.add(targetId);

      const target = objects.get(targetId);
      if (!target) {
        addIssue(issues, "error", "missing_object_reference", targetPath, `Object “${targetId}” does not exist in visual “${visual.id}”.`);
        return;
      }

      if ((action.action === "shade" || action.action === "unshade") && !FILLABLE_TYPES.has(target.type)) {
        addIssue(issues, "error", "incompatible_shade_action", targetPath, `${action.action} cannot target object type “${target.type}”.`);
      }

      if (action.action === "trace" && !TRACEABLE_TYPES.has(target.type)) {
        addIssue(issues, "warning", "unusual_trace_action", targetPath, `Trace is unusual for object type “${target.type}”.`);
      }
    });
  });

  return issues;
}

export function validateMathVisualTeachingSteps(
  spec: MathVisualSpec,
  steps: MathVisualTeachingStep[],
  basePath = "teaching.visual_steps",
): MathVisualValidationResult {
  const issues: MathVisualValidationIssue[] = [];
  const stepIds = new Set<string>();

  steps.forEach((step, stepIndex) => {
    const path = `${basePath}[${stepIndex}]`;

    if (step.id) {
      if (!ID_PATTERN.test(step.id)) {
        addIssue(issues, "error", "invalid_step_id", `${path}.id`, "Teaching step ID is invalid.");
      } else if (stepIds.has(step.id)) {
        addIssue(issues, "error", "duplicate_step_id", `${path}.id`, `Duplicate teaching step ID “${step.id}”.`);
      }
      stepIds.add(step.id);
    }

    if (!Array.isArray(step.actions) || step.actions.length === 0) {
      addIssue(issues, "warning", "empty_teaching_step", `${path}.actions`, "Teaching visual step has no actions.");
      return;
    }

    issues.push(
      ...validateMathVisualTeachingActions(spec, step.actions, `${path}.actions`),
    );
  });

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}
