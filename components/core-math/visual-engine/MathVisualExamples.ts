import type { MathVisualSpec } from "./MathVisualTypes";
import type { MathVisualTeachingStep } from "./MathVisualState";

export type MathVisualExample = {
  id: string;
  title: string;
  description: string;
  spec: MathVisualSpec;
  teaching_steps?: MathVisualTeachingStep[];
};

export const MATH_VISUAL_EXAMPLES: MathVisualExample[] = [
  {
    id: "rectangle_area",
    title: "Rectangle + dimensions",
    description: "Geometry visual with stable IDs that teaching can highlight.",
    spec: {
      schema_version: 2,
      metadata: { generated_by: "system", source: "phase_1d_gallery" },
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "geometry",
          aria_label: "Rectangle measuring 12 centimetres by 7 centimetres",
          canvas: { width: 720, height: 360, padding: 28, background: "paper" },
          objects: [
            {
              id: "rect_1",
              type: "rectangle",
              x: 180,
              y: 95,
              width: 360,
              height: 190,
              style: { fill: "light", tone: "accent", stroke_width: 4 },
            },
            {
              id: "length_1",
              type: "dimension",
              from: { x: 180, y: 95 },
              to: { x: 540, y: 95 },
              label: "12 cm",
              offset: -34,
            },
            {
              id: "width_1",
              type: "dimension",
              from: { x: 540, y: 95 },
              to: { x: 540, y: 285 },
              label: "7 cm",
              offset: 34,
            },
          ],
        },
      ],
    },
    teaching_steps: [
      {
        id: "find_length",
        text: "First identify the length.",
        actions: [{ visual_id: "main", targets: ["length_1"], action: "highlight" }],
      },
      {
        id: "find_width",
        text: "Now identify the width.",
        actions: [{ visual_id: "main", targets: ["width_1"], action: "highlight" }],
      },
      {
        id: "shade_area",
        text: "The area is the region inside the rectangle.",
        actions: [{ visual_id: "main", targets: ["rect_1"], action: "shade" }],
      },
    ],
  },
  {
    id: "fraction_bar",
    title: "Fraction bar",
    description: "Horizontal fraction model, suitable for Primary 1–6 fractions.",
    spec: {
      schema_version: 2,
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "fraction",
          aria_label: "Fraction bar showing three eighths",
          canvas: { width: 720, height: 260, background: "paper" },
          objects: [
            {
              id: "fraction_3_8",
              type: "fraction_bar",
              x: 90,
              y: 85,
              width: 540,
              height: 90,
              numerator: 3,
              denominator: 8,
              show_fraction_label: true,
              style: { tone: "accent" },
            },
          ],
        },
      ],
    },
    teaching_steps: [
      {
        id: "show_fraction",
        text: "The whole is split into 8 equal parts and 3 are shaded.",
        actions: [{ visual_id: "main", targets: ["fraction_3_8"], action: "highlight" }],
      },
    ],
  },
  {
    id: "number_line",
    title: "Number line",
    description: "Number line with a highlighted target value.",
    spec: {
      schema_version: 2,
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "number_line",
          aria_label: "Number line from zero to ten with seven highlighted",
          canvas: { width: 720, height: 220, background: "paper" },
          objects: [
            {
              id: "line_0_10",
              type: "number_line",
              x: 70,
              y: 110,
              width: 580,
              min: 0,
              max: 10,
              step: 1,
              highlighted_values: [7],
              labelled_values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              arrows: "end",
            },
          ],
        },
      ],
    },
  },
  {
    id: "cuboid",
    title: "Cuboid",
    description: "Solid figure with deterministic dimensions.",
    spec: {
      schema_version: 2,
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "solid",
          aria_label: "Cuboid with dimensions six by four by three centimetres",
          canvas: { width: 720, height: 390, background: "paper" },
          objects: [
            {
              id: "cuboid_1",
              type: "cuboid",
              x: 190,
              y: 100,
              length: 300,
              width: 120,
              height: 170,
              unit: "cm",
              show_dimensions: true,
              style: { fill: "light", tone: "accent" },
            },
          ],
        },
      ],
    },
  },
  {
    id: "bar_chart",
    title: "Bar chart",
    description: "Data visual with labelled axes and values.",
    spec: {
      schema_version: 2,
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "data",
          aria_label: "Bar chart showing books read by four pupils",
          canvas: { width: 720, height: 430, background: "paper" },
          objects: [
            {
              id: "books_chart",
              type: "bar_chart",
              x: 90,
              y: 55,
              width: 540,
              height: 310,
              data: [
                { id: "amy", label: "Amy", value: 4 },
                { id: "ben", label: "Ben", value: 7 },
                { id: "cara", label: "Cara", value: 5 },
                { id: "dan", label: "Dan", value: 8 },
              ],
              x_label: "Pupil",
              y_label: "Books",
              y_min: 0,
              y_max: 10,
              y_step: 2,
              show_values: true,
            },
          ],
        },
      ],
    },
  },
  {
    id: "clock",
    title: "Analogue clock",
    description: "Clock face rendered from structured hour and minute values.",
    spec: {
      schema_version: 2,
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "clock",
          aria_label: "Analogue clock showing three thirty",
          canvas: { width: 520, height: 420, background: "paper" },
          objects: [
            {
              id: "clock_1",
              type: "clock",
              cx: 260,
              cy: 205,
              radius: 145,
              hour: 3,
              minute: 30,
              show_numbers: true,
            },
          ],
        },
      ],
    },
  },
  {
    id: "bar_model",
    title: "Bar model",
    description: "Semantic bar model for comparison and word problems.",
    spec: {
      schema_version: 2,
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "bar_model",
          aria_label: "Bar model split into three parts",
          canvas: { width: 720, height: 300, background: "paper" },
          objects: [
            {
              id: "model_1",
              type: "bar_model",
              x: 90,
              y: 95,
              width: 540,
              height: 90,
              segments: [
                { id: "part_a", label: "A", value: 3 },
                { id: "part_b", label: "B", value: 5 },
                { id: "part_c", label: "C", value: 2 },
              ],
              total_label: "10",
            },
          ],
        },
      ],
    },
  },
  {
    id: "table",
    title: "Data table",
    description: "Structured table rendered through the Math Visual engine.",
    spec: {
      schema_version: 2,
      visuals: [
        {
          id: "main",
          placement: "prompt",
          kind: "table",
          aria_label: "Table showing fruit and number sold",
          canvas: { width: 720, height: 330, background: "paper" },
          objects: [
            {
              id: "fruit_table",
              type: "table",
              x: 120,
              y: 60,
              width: 480,
              height: 220,
              columns: ["Fruit", "Number sold"],
              rows: [
                ["Apple", 12],
                ["Orange", 9],
                ["Pear", 15],
              ],
              highlight_cells: [{ row: 2, column: 1 }],
            },
          ],
        },
      ],
    },
  },
];

export function getMathVisualExample(id: string) {
  return MATH_VISUAL_EXAMPLES.find((example) => example.id === id) ?? null;
}
