import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, step } from "./templateUtils";

export function measurementTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy !== "measurement_diagram") return null;
  const measurement = firstIdForRole(context, "measurement_dimension");
  if (!measurement) return null;

  return {
    template_id: "measurement_basic",
    lesson_steps: [
      step(
        "identify_measurement",
        "Identify the marked measurement and read its unit carefully.",
        action(context, "highlight", measurement),
      ),
      step(
        "use_measurement",
        "Use the measurement with the correct unit when applying the required method.",
        action(context, "emphasise", measurement),
      ),
    ],
    teach_me_steps: [
      step(
        "read_dimension",
        "Start by reading the dimension from one endpoint to the other.",
        action(context, "trace", measurement),
      ),
      step(
        "check_unit",
        "Check the unit before calculating or converting the measurement.",
        action(context, "highlight", measurement),
      ),
      step(
        "apply_measurement_relationship",
        "Now use the measured value and unit in the relationship required by the question.",
        action(context, "emphasise", measurement),
      ),
    ],
  };
}
