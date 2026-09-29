import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, idsForRole, step } from "./templateUtils";

export function fractionTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy === "aligned_fraction_bars") {
    const primary = firstIdForRole(context, "fraction_primary");
    const comparisons = idsForRole(context, "fraction_comparison_reference");
    if (!primary || comparisons.length === 0) return null;

    const all = [primary, ...comparisons];
    return {
      template_id: "fraction_aligned_comparison",
      lesson_steps: [
        step(
          "read_first_fraction",
          "Start with the first fraction and notice how its whole is divided into equal parts.",
          action(context, "highlight", primary),
        ),
        step(
          "compare_fraction_models",
          "Compare the aligned fraction models to see how the shaded amounts relate.",
          action(context, "highlight", comparisons),
        ),
        step(
          "connect_equivalent_amounts",
          "Focus on the models together and compare the amount represented by each fraction.",
          action(context, "emphasise", all),
        ),
      ],
      teach_me_steps: [
        step(
          "identify_first_whole",
          "Look at the first whole and the number of equal parts it has been divided into.",
          action(context, "highlight", primary),
        ),
        step(
          "inspect_comparison_wholes",
          "Now inspect the other aligned whole or wholes and their equal partitions.",
          action(context, "highlight", comparisons),
        ),
        step(
          "compare_shaded_amounts",
          "Compare the shaded amounts, not just the number of pieces in each model.",
          action(context, "emphasise", all),
        ),
      ],
    };
  }

  if (
    context.analysis.strategy !== "fraction_bar" &&
    context.analysis.strategy !== "fraction_grid"
  ) {
    return null;
  }

  const fraction =
    firstIdForRole(context, "fraction_primary") ||
    firstIdForRole(context, "fraction_model");
  if (!fraction) return null;

  const comparison =
    context.analysis.interpretation.problem_structure === "fraction_comparison" ||
    context.analysis.interpretation.problem_structure === "fraction_equivalence";

  return {
    template_id: comparison ? "fraction_single_comparison" : "fraction_basic",
    lesson_steps: [
      step(
        "identify_fraction_model",
        "Look at the whole and notice that it has been divided into equal parts.",
        action(context, "highlight", fraction),
      ),
      step(
        "read_shaded_fraction",
        "Use the equal parts and the shaded amount to read the fraction shown.",
        action(context, "emphasise", fraction),
      ),
    ],
    teach_me_steps: [
      step(
        "identify_whole",
        "Begin with the whole before thinking about the fraction.",
        action(context, "highlight", fraction),
      ),
      step(
        "notice_equal_parts",
        "Notice how the whole is split into equal parts; the total number of parts gives the denominator.",
        action(context, "highlight", fraction),
      ),
      step(
        "notice_selected_parts",
        "Now focus on the shaded parts; their number gives the numerator.",
        action(context, "emphasise", fraction),
      ),
    ],
  };
}
