import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, step } from "./templateUtils";

export function numberLineTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy !== "number_line") return null;
  const numberLine = firstIdForRole(context, "number_line");
  if (!numberLine) return null;

  return {
    template_id: "number_line_basic",
    lesson_steps: [
      step(
        "read_number_line",
        "Read the marked values and check that the intervals increase by equal steps.",
        action(context, "highlight", numberLine),
      ),
      step(
        "follow_number_line",
        "Follow the number line carefully to locate the required position or value.",
        action(context, "trace", numberLine),
      ),
    ],
    teach_me_steps: [
      step(
        "identify_scale",
        "First identify the scale by comparing two neighbouring labelled marks.",
        action(context, "highlight", numberLine),
      ),
      step(
        "count_equal_intervals",
        "Move along the line in equal intervals rather than guessing from the spacing.",
        action(context, "trace", numberLine),
      ),
      step(
        "focus_required_position",
        "Use the scale and direction together to determine the required position or value.",
        action(context, "emphasise", numberLine),
      ),
    ],
  };
}
