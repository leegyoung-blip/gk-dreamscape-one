/**
 * DREAMSCAPE Math Visual Engine — V1 -> V2 compatibility reader.
 *
 * Purpose:
 * - recognise the original seven MathVisual shapes without keeping a second
 *   rendering engine alive;
 * - convert legacy data into the canonical V2 MathVisualSpec in memory;
 * - validate all V2 output before it reaches MathVisualRenderer;
 * - NEVER write V1 data. Authoring/import/migration code should persist V2 only.
 *
 * This file is intentionally framework-free and safe for client/server/import
 * use. It has no React, Supabase or browser dependency.
 */

import {
  MATH_VISUAL_SCHEMA_VERSION,
  type MathVisualPlacement,
  type MathVisualSpec,
} from "./MathVisualTypes";
import {
  validateMathVisualSpec,
  type MathVisualValidationIssue,
} from "./MathVisualValidator";

export type LegacyMathVisualV1 =
  | { type: "none" }
  | {
      type: "number_line";
      min: number;
      max: number;
      step: number;
      highlight?: number | null;
    }
  | {
      type: "rectangle";
      length: number;
      width: number;
      unit?: string;
      show_dimensions?: boolean;
    }
  | {
      type: "fraction_bar";
      numerator: number;
      denominator: number;
    }
  | {
      type: "clock";
      hour: number;
      minute: number;
    }
  | {
      type: "bar_model";
      segments: Array<{ label: string; value: number }>;
    }
  | {
      type: "table";
      columns: string[];
      rows: string[][];
    }
  | {
      type: "bar_graph";
      items: Array<{ label: string; value: number }>;
      y_label?: string;
    };

export type MathVisualCompatibilitySource = "v2" | "v1" | "none" | "invalid";

export type MathVisualCompatibilityIssue = MathVisualValidationIssue & {
  origin: "compatibility" | "validator";
};

export type MathVisualCompatibilityResult = {
  source: MathVisualCompatibilitySource;
  /** Canonical V2 spec when the value can be safely rendered. */
  spec: MathVisualSpec | null;
  /** True only when a legacy V1 object was converted to V2 in memory. */
  migrated: boolean;
  /** True when spec is non-null and has no validation errors. */
  valid: boolean;
  legacy_type: LegacyMathVisualV1["type"] | null;
  issues: MathVisualCompatibilityIssue[];
};

export type LegacyMathVisualMigrationOptions = {
  visual_id?: string;
  placement?: MathVisualPlacement;
  option_id?: string;
};

const LEGACY_TYPES = new Set<LegacyMathVisualV1["type"]>([
  "none",
  "number_line",
  "rectangle",
  "fraction_bar",
  "clock",
  "bar_model",
  "table",
  "bar_graph",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compatibilityIssue(
  code: string,
  path: string,
  message: string,
): MathVisualCompatibilityIssue {
  return {
    severity: "warning",
    code,
    path,
    message,
    origin: "compatibility",
  };
}

function validatorIssues(issues: MathVisualValidationIssue[]) {
  return issues.map<MathVisualCompatibilityIssue>((issue) => ({
    ...issue,
    origin: "validator",
  }));
}

function numeric(
  value: unknown,
  fallback: number,
  path: string,
  issues: MathVisualCompatibilityIssue[],
) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  issues.push(
    compatibilityIssue(
      "legacy_number_repaired",
      path,
      `Legacy value was not a finite number and was replaced with ${fallback}.`,
    ),
  );
  return fallback;
}

function positive(
  value: unknown,
  fallback: number,
  path: string,
  issues: MathVisualCompatibilityIssue[],
) {
  const parsed = numeric(value, fallback, path, issues);
  if (parsed > 0) return parsed;
  issues.push(
    compatibilityIssue(
      "legacy_positive_value_repaired",
      path,
      `Legacy value must be greater than 0 and was replaced with ${fallback}.`,
    ),
  );
  return fallback;
}

function wholeNumber(
  value: unknown,
  fallback: number,
  path: string,
  issues: MathVisualCompatibilityIssue[],
  minimum = 0,
) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= minimum) return parsed;
  issues.push(
    compatibilityIssue(
      "legacy_integer_repaired",
      path,
      `Legacy value must be a whole number of ${minimum} or greater and was replaced with ${fallback}.`,
    ),
  );
  return fallback;
}

function nonNegative(
  value: unknown,
  fallback: number,
  path: string,
  issues: MathVisualCompatibilityIssue[],
) {
  const parsed = numeric(value, fallback, path, issues);
  if (parsed >= 0) return parsed;
  issues.push(
    compatibilityIssue(
      "legacy_negative_value_repaired",
      path,
      `Legacy value cannot be negative and was replaced with ${fallback}.`,
    ),
  );
  return fallback;
}

function normaliseVisualId(value: unknown) {
  const clean = String(value ?? "main")
    .trim()
    .replace(/[^A-Za-z0-9_\-:.]+/g, "_")
    .replace(/^([^A-Za-z])/, "v_$1");
  return clean || "main";
}

function legacyType(value: unknown): LegacyMathVisualV1["type"] | null {
  if (!isRecord(value)) return null;
  const type = String(value.type ?? "").trim() as LegacyMathVisualV1["type"];
  return LEGACY_TYPES.has(type) ? type : null;
}

export function isLegacyMathVisualV1(value: unknown): value is LegacyMathVisualV1 {
  return legacyType(value) !== null;
}

/**
 * Read either canonical V2 or the original MathVisual V1 shape.
 *
 * Recommended runtime use:
 *   const result = readMathVisualSpec(question.content?.math_visual);
 *   if (result.spec) <MathVisualRenderer spec={result.spec} />
 *
 * A legacy value is converted only in memory. Callers must not persist the
 * source value back to the database as V1.
 */
export function readMathVisualSpec(
  value: unknown,
  options: LegacyMathVisualMigrationOptions = {},
): MathVisualCompatibilityResult {
  if (value == null || value === "") {
    return emptyResult("none");
  }

  if (!isRecord(value)) {
    return invalidResult([
      {
        severity: "error",
        code: "invalid_math_visual_value",
        path: "math_visual",
        message: "Math visual data must be an object.",
        origin: "compatibility",
      },
    ]);
  }

  // A declared schema version is authoritative. Never reinterpret a malformed
  // or future V2 document as V1 just because it also happens to contain `type`.
  if ("schema_version" in value || "visuals" in value) {
    const validation = validateMathVisualSpec(value);
    const issues = validatorIssues(validation.issues);
    if (!validation.valid) return invalidResult(issues);

    return {
      source: "v2",
      spec: value as MathVisualSpec,
      migrated: false,
      valid: true,
      legacy_type: null,
      issues,
    };
  }

  const type = legacyType(value);
  if (!type) {
    return invalidResult([
      {
        severity: "error",
        code: "unknown_legacy_math_visual",
        path: "math_visual.type",
        message: `Unsupported legacy Math Visual type “${String(value.type ?? "")}”.`,
        origin: "compatibility",
      },
    ]);
  }

  if (type === "none") {
    return {
      source: "none",
      spec: null,
      migrated: false,
      valid: false,
      legacy_type: "none",
      issues: [],
    };
  }

  const migrated = migrateLegacyMathVisualV1(value, options);
  return migrated;
}

/**
 * Convert a recognised V1 object to canonical V2 and immediately validate it.
 * The returned V2 spec is for runtime compatibility/migration tooling only;
 * this function performs no database writes.
 */
export function migrateLegacyMathVisualV1(
  value: unknown,
  options: LegacyMathVisualMigrationOptions = {},
): MathVisualCompatibilityResult {
  const raw = isRecord(value) ? value : null;
  const type = legacyType(value);

  if (!raw || !type || type === "none") {
    return type === "none"
      ? {
          source: "none",
          spec: null,
          migrated: false,
          valid: false,
          legacy_type: "none",
          issues: [],
        }
      : invalidResult([
          {
            severity: "error",
            code: "not_legacy_math_visual",
            path: "math_visual",
            message: "Value is not a recognised legacy Math Visual V1 object.",
            origin: "compatibility",
          },
        ]);
  }

  const issues: MathVisualCompatibilityIssue[] = [];
  const visualId = normaliseVisualId(options.visual_id);
  const placement = options.placement ?? "prompt";

  if (placement === "option" && !String(options.option_id ?? "").trim()) {
    return invalidResult([
      {
        severity: "error",
        code: "missing_option_id",
        path: "math_visual.visuals[0].option_id",
        message: "Migrating a legacy visual to option placement requires option_id.",
        origin: "compatibility",
      },
    ]);
  }

  const base = {
    id: visualId,
    placement,
    ...(placement === "option" ? { option_id: String(options.option_id) } : {}),
  } as const;

  let spec: MathVisualSpec;

  switch (type) {
    case "number_line": {
      let min = numeric(raw.min, 0, "math_visual.min", issues);
      let max = numeric(raw.max, 10, "math_visual.max", issues);
      const step = positive(raw.step, 1, "math_visual.step", issues);

      if (max <= min) {
        max = min + step;
        issues.push(
          compatibilityIssue(
            "legacy_number_line_range_repaired",
            "math_visual.max",
            "Legacy number-line maximum was not greater than its minimum; maximum was repaired using one step.",
          ),
        );
      }

      const highlighted =
        raw.highlight === null || raw.highlight === undefined || raw.highlight === ""
          ? []
          : [numeric(raw.highlight, min, "math_visual.highlight", issues)];

      spec = makeSpec({
        ...base,
        kind: "number_line",
        aria_label: "Number line",
        canvas: { width: 720, height: 180, background: "transparent" },
        objects: [
          {
            id: "number_line_1",
            type: "number_line",
            x: 55,
            y: 90,
            width: 610,
            min,
            max,
            step,
            highlighted_values: highlighted,
            labelled_values: tickValues(min, max, step),
            arrows: "end",
          },
        ],
      });
      break;
    }

    case "rectangle": {
      const length = positive(raw.length, 8, "math_visual.length", issues);
      const width = positive(raw.width, 5, "math_visual.width", issues);
      const unit = String(raw.unit ?? "cm").trim();
      const showDimensions = raw.show_dimensions !== false;

      spec = makeSpec({
        ...base,
        kind: "measurement",
        aria_label: "Rectangle diagram",
        canvas: { width: 720, height: 360, background: "transparent" },
        objects: [
          {
            id: "rectangle_1",
            type: "rectangle",
            x: 170,
            y: 80,
            width: 380,
            height: 200,
            style: { fill: "light" },
          },
          ...(showDimensions
            ? [
                {
                  id: "length_1",
                  type: "dimension" as const,
                  from: { x: 170, y: 80 },
                  to: { x: 550, y: 80 },
                  label: `${formatNumber(length)}${unit ? ` ${unit}` : ""}`,
                  offset: -30,
                  extension_lines: true,
                },
                {
                  id: "width_1",
                  type: "dimension" as const,
                  from: { x: 550, y: 80 },
                  to: { x: 550, y: 280 },
                  label: `${formatNumber(width)}${unit ? ` ${unit}` : ""}`,
                  offset: 35,
                  extension_lines: true,
                },
              ]
            : []),
        ],
      });
      break;
    }

    case "fraction_bar": {
      const numerator = wholeNumber(raw.numerator, 1, "math_visual.numerator", issues, 0);
      const denominator = wholeNumber(raw.denominator, 2, "math_visual.denominator", issues, 1);

      spec = makeSpec({
        ...base,
        kind: "fraction",
        aria_label: "Fraction bar",
        canvas: { width: 720, height: 260, background: "transparent" },
        objects: [
          {
            id: "fraction_bar_1",
            type: "fraction_bar",
            x: 90,
            y: 70,
            width: 540,
            height: 110,
            numerator,
            denominator,
            orientation: "horizontal",
            show_fraction_label: true,
          },
        ],
      });
      break;
    }

    case "clock": {
      let hour = numeric(raw.hour, 3, "math_visual.hour", issues);
      let minute = wholeNumber(raw.minute, 0, "math_visual.minute", issues, 0);

      if (hour < 0 || hour >= 24) {
        hour = ((hour % 24) + 24) % 24;
        issues.push(
          compatibilityIssue(
            "legacy_clock_hour_wrapped",
            "math_visual.hour",
            "Legacy clock hour was outside the V2 range and was wrapped into 0–23.",
          ),
        );
      }
      if (minute > 59) {
        minute %= 60;
        issues.push(
          compatibilityIssue(
            "legacy_clock_minute_wrapped",
            "math_visual.minute",
            "Legacy clock minute was above 59 and was wrapped into 0–59.",
          ),
        );
      }

      spec = makeSpec({
        ...base,
        kind: "clock",
        aria_label: "Analogue clock",
        canvas: { width: 420, height: 420, background: "transparent" },
        objects: [
          {
            id: "clock_1",
            type: "clock",
            cx: 210,
            cy: 210,
            radius: 155,
            hour,
            minute,
            show_numbers: true,
          },
        ],
      });
      break;
    }

    case "bar_model": {
      const rawSegments = Array.isArray(raw.segments) ? raw.segments : [];
      const segments = rawSegments
        .map((item, index) => {
          const row = isRecord(item) ? item : {};
          return {
            id: `segment_${index + 1}`,
            label: String(row.label ?? ""),
            value: nonNegative(
              row.value,
              0,
              `math_visual.segments[${index}].value`,
              issues,
            ),
          };
        })
        .filter((segment) => segment.label.trim() || Number.isFinite(segment.value));

      if (segments.length === 0) {
        segments.push({ id: "segment_1", label: "", value: 0 });
        issues.push(
          compatibilityIssue(
            "legacy_empty_bar_model_repaired",
            "math_visual.segments",
            "Legacy bar model had no usable segments; a zero-value placeholder segment was inserted.",
          ),
        );
      }

      spec = makeSpec({
        ...base,
        kind: "bar_model",
        aria_label: "Bar model",
        canvas: { width: 720, height: 280, background: "transparent" },
        objects: [
          {
            id: "bar_model_1",
            type: "bar_model",
            x: 70,
            y: 85,
            width: 580,
            height: 105,
            segments,
          },
        ],
      });
      break;
    }

    case "table": {
      const columns = Array.isArray(raw.columns)
        ? raw.columns.map((item) => String(item))
        : [];
      let rows = Array.isArray(raw.rows)
        ? raw.rows.map((row) =>
            Array.isArray(row) ? row.map((item) => String(item)) : [],
          )
        : [];

      if (columns.length === 0) {
        columns.push("Value");
        issues.push(
          compatibilityIssue(
            "legacy_empty_table_columns_repaired",
            "math_visual.columns",
            "Legacy table had no columns; a placeholder column was inserted.",
          ),
        );
      }

      rows = rows.map((row, rowIndex) => {
        if (row.length === columns.length) return row;
        issues.push(
          compatibilityIssue(
            "legacy_table_row_width_repaired",
            `math_visual.rows[${rowIndex}]`,
            `Legacy table row width was repaired to ${columns.length} cell(s).`,
          ),
        );
        return Array.from({ length: columns.length }, (_, columnIndex) => row[columnIndex] ?? "");
      });

      spec = makeSpec({
        ...base,
        kind: "table",
        aria_label: "Data table",
        canvas: { width: 720, height: 360, background: "transparent" },
        objects: [
          {
            id: "table_1",
            type: "table",
            x: 45,
            y: 45,
            width: 630,
            height: 270,
            columns,
            rows,
          },
        ],
      });
      break;
    }

    case "bar_graph": {
      const rawItems = Array.isArray(raw.items) ? raw.items : [];
      const data = rawItems
        .map((item, index) => {
          const row = isRecord(item) ? item : {};
          return {
            id: `bar_${index + 1}`,
            label: String(row.label ?? ""),
            value: numeric(
              row.value,
              0,
              `math_visual.items[${index}].value`,
              issues,
            ),
          };
        })
        .filter((item) => item.label.trim() || Number.isFinite(item.value));

      if (data.length === 0) {
        data.push({ id: "bar_1", label: "", value: 0 });
        issues.push(
          compatibilityIssue(
            "legacy_empty_bar_graph_repaired",
            "math_visual.items",
            "Legacy bar graph had no usable items; a zero-value placeholder bar was inserted.",
          ),
        );
      }

      spec = makeSpec({
        ...base,
        kind: "data",
        aria_label: "Bar graph",
        canvas: { width: 720, height: 420, background: "transparent" },
        objects: [
          {
            id: "bar_chart_1",
            type: "bar_chart",
            x: 80,
            y: 50,
            width: 570,
            height: 300,
            data,
            y_label: String(raw.y_label ?? ""),
            show_values: false,
          },
        ],
      });
      break;
    }
  }

  const validation = validateMathVisualSpec(spec);
  const allIssues = [...issues, ...validatorIssues(validation.issues)];

  return {
    source: validation.valid ? "v1" : "invalid",
    spec: validation.valid ? spec : null,
    migrated: validation.valid,
    valid: validation.valid,
    legacy_type: type,
    issues: allIssues,
  };
}

function makeSpec(
  visual: MathVisualSpec["visuals"][number],
): MathVisualSpec {
  return {
    schema_version: MATH_VISUAL_SCHEMA_VERSION,
    visuals: [visual],
    metadata: {
      generated_by: "migration",
      generator_version: "v1-compat-1",
      source: "math_visual_v1",
    },
  };
}

function tickValues(min: number, max: number, step: number) {
  const span = max - min;
  const count = Math.min(101, Math.floor(span / step) + 1);
  return Array.from({ length: Math.max(2, count) }, (_, index) =>
    Number((min + index * step).toFixed(9)),
  ).filter((value) => value <= max + 1e-9);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function emptyResult(source: "none"): MathVisualCompatibilityResult {
  return {
    source,
    spec: null,
    migrated: false,
    valid: false,
    legacy_type: null,
    issues: [],
  };
}

function invalidResult(
  issues: MathVisualCompatibilityIssue[],
): MathVisualCompatibilityResult {
  return {
    source: "invalid",
    spec: null,
    migrated: false,
    valid: false,
    legacy_type: null,
    issues,
  };
}
