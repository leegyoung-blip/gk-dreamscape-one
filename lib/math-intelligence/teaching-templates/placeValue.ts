import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, step } from "./templateUtils";

export function placeValueTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy !== "place_value_table") return null;
  const table = firstIdForRole(context, "place_value_table");
  if (!table) return null;

  return {
    template_id: "place_value_basic",
    lesson_steps: [
      step(
        "read_place_value_headings",
        "Read the place-value headings before interpreting any digit.",
        action(context, "highlight", table),
      ),
      step(
        "match_digits_to_places",
        "Match each digit to its column so you use its correct place value.",
        action(context, "emphasise", table),
      ),
    ],
    teach_me_steps: [
      step(
        "identify_columns",
        "Start from the ones column and identify how each column is ten times the place to its right.",
        action(context, "highlight", table),
      ),
      step(
        "place_each_digit",
        "Read each digit under the correct heading rather than reading the digit by itself.",
        action(context, "highlight", table),
      ),
      step(
        "interpret_place_value",
        "Use the column heading to convert each digit into its actual value in the number.",
        action(context, "emphasise", table),
      ),
    ],
  };
}
