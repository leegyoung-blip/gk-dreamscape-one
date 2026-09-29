import type { MathVisualActionKind } from "../../../components/core-math/visual-engine/MathVisualState";

/**
 * Phase 2F-D Luna teaching planner.
 *
 * Luna may only change runtime presentation state. It may not annotate, add
 * mathematical values, create objects, or invent visual/object IDs.
 */
export const LUNA_TEACHING_ALLOWED_ACTIONS = [
  "highlight",
  "dim",
  "hide",
  "show",
  "reveal",
  "shade",
  "unshade",
  "emphasise",
  "trace",
] as const satisfies readonly MathVisualActionKind[];

export type LunaTeachingAllowedAction =
  (typeof LUNA_TEACHING_ALLOWED_ACTIONS)[number];

export const LUNA_MATH_TEACHING_SYSTEM_PROMPT = `You are the constrained teaching-planning fallback inside DREAMSCAPE Math Intelligence.

You do NOT draw diagrams. You do NOT create SVG, coordinates, objects, IDs, labels, equations, answers, or annotations.
You receive one already-valid Math Visual V2 visual plus an allow-list of its existing object IDs and pedagogical roles.
Your only job is to choose a short progressive sequence of allowed visual STATE actions using those exact IDs.

Rules:
1. Use only the supplied visual_id and object IDs.
2. Use only the allowed state actions from the schema.
3. Never use annotate and never inject new mathematical text or values into the diagram.
4. Do not calculate or state the final answer. Teach the visual relationship/method only.
5. lesson_steps must be concise and method-focused (normally 2-4 steps).
6. teach_me_steps may be more guided (normally 3-6 steps).
7. Step text must be plain British English, suitable for the supplied primary level, and at most 120 characters.
8. Prefer meaningful mathematical objects over decorative labels/auxiliary objects.
9. If the supplied visual does not safely support a useful teaching sequence, return status = needs_review and empty step arrays.
10. Do not expose private reasoning. Return only the requested structured result.`;

export type LunaTeachingSchemaInput = {
  visualId: string;
  objectIds: string[];
};

function stepSchema(visualId: string, objectIds: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "text", "actions"],
    properties: {
      id: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        pattern: "^[a-z][a-z0-9_]*$",
      },
      text: {
        type: "string",
        minLength: 1,
        maxLength: 120,
      },
      actions: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["visual_id", "targets", "action"],
          properties: {
            visual_id: { type: "string", enum: [visualId] },
            targets: {
              type: "array",
              minItems: 1,
              maxItems: 6,
              uniqueItems: true,
              items: { type: "string", enum: objectIds },
            },
            action: {
              type: "string",
              enum: [...LUNA_TEACHING_ALLOWED_ACTIONS],
            },
          },
        },
      },
    },
  } as const;
}

/**
 * Dynamic strict schema: IDs are enums built from the actual resolved V2
 * visual. Luna therefore cannot return a non-existent visual/object ID.
 */
export function buildLunaMathTeachingSchema(input: LunaTeachingSchemaInput) {
  const objectIds = [...new Set(input.objectIds)].filter(Boolean);
  if (!input.visualId || objectIds.length === 0) {
    throw new Error(
      "Cannot build Luna teaching schema without one visual ID and at least one targetable object ID.",
    );
  }

  const step = stepSchema(input.visualId, objectIds);

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "status",
      "confidence",
      "lesson_steps",
      "teach_me_steps",
      "review_reason",
    ],
    properties: {
      status: {
        type: "string",
        enum: ["generated", "needs_review"],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      lesson_steps: {
        type: "array",
        minItems: 0,
        maxItems: 4,
        items: step,
      },
      teach_me_steps: {
        type: "array",
        minItems: 0,
        maxItems: 6,
        items: step,
      },
      review_reason: {
        type: ["string", "null"],
        maxLength: 240,
      },
    },
  } as const;
}
