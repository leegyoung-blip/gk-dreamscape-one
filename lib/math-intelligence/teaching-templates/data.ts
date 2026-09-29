import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, step } from "./templateUtils";

export function dataTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (
    context.analysis.strategy === "bar_chart" ||
    context.analysis.strategy === "line_graph" ||
    context.analysis.strategy === "pie_chart"
  ) {
    const chart = firstIdForRole(context, "data_chart");
    if (!chart) return null;

    const trend = context.analysis.interpretation.problem_structure === "trend";
    return {
      template_id: trend ? "data_chart_trend" : "data_chart_reading",
      lesson_steps: [
        step(
          "read_chart_structure",
          "Read the chart labels and scale before comparing any values.",
          action(context, "highlight", chart),
        ),
        step(
          trend ? "follow_trend" : "compare_chart_values",
          trend
            ? "Follow the data in order and look for how the values change."
            : "Compare only the categories or values needed for the question.",
          action(context, "emphasise", chart),
        ),
      ],
      teach_me_steps: [
        step(
          "identify_chart_labels",
          "Start by identifying what each axis, category or sector represents.",
          action(context, "highlight", chart),
        ),
        step(
          "read_chart_scale",
          "Check how the values are measured before reading or comparing the data.",
          action(context, "highlight", chart),
        ),
        step(
          trend ? "interpret_change" : "interpret_required_data",
          trend
            ? "Move through the data in order and describe the direction or size of the change."
            : "Focus on the relevant data and use the chart scale to interpret it accurately.",
          action(context, "emphasise", chart),
        ),
      ],
    };
  }

  if (context.analysis.strategy === "table") {
    const table = firstIdForRole(context, "data_table");
    if (!table) return null;
    return {
      template_id: "data_table_reading",
      lesson_steps: [
        step(
          "read_table_headings",
          "Read the table headings first so you know what each column represents.",
          action(context, "highlight", table),
        ),
        step(
          "find_required_table_data",
          "Match the correct row and column before using the value you need.",
          action(context, "emphasise", table),
        ),
      ],
      teach_me_steps: [
        step(
          "identify_table_structure",
          "Begin with the headings and identify how the information is organised.",
          action(context, "highlight", table),
        ),
        step(
          "match_row_and_column",
          "Find the relevant item, then move across to the correct value column.",
          action(context, "highlight", table),
        ),
        step(
          "interpret_table_value",
          "Use only the value from the matching row and column to answer the question.",
          action(context, "emphasise", table),
        ),
      ],
    };
  }

  return null;
}
