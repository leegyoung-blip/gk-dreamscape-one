import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, step } from "./templateUtils";

export function solidTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy !== "cube" && context.analysis.strategy !== "cuboid") {
    return null;
  }

  const solid = firstIdForRole(context, "solid");
  if (!solid) return null;
  const volume =
    context.analysis.interpretation.target.kind === "volume" ||
    context.analysis.interpretation.problem_structure === "volume";

  return {
    template_id: volume ? "solid_volume" : "solid_basic",
    lesson_steps: [
      step(
        "identify_solid",
        "Identify the three-dimensional solid and the measurements shown on it.",
        action(context, "highlight", solid),
      ),
      step(
        volume ? "connect_dimensions_to_volume" : "inspect_solid_structure",
        volume
          ? "Volume uses the solid's dimensions together to measure the space inside it."
          : "Use the visible edges and faces to reason about the solid.",
        action(context, "emphasise", solid),
      ),
    ],
    teach_me_steps: [
      step(
        "recognise_solid",
        "First recognise the solid and which edges represent its dimensions.",
        action(context, "highlight", solid),
      ),
      step(
        "trace_solid",
        "Trace the solid's structure so the different dimensions and faces are easier to distinguish.",
        action(context, "trace", solid),
      ),
      step(
        volume ? "reason_about_volume" : "reason_about_solid",
        volume
          ? "Think of volume as the amount of three-dimensional space contained inside the solid."
          : "Use the solid's faces, edges and dimensions to answer the question.",
        action(context, "emphasise", solid),
      ),
    ],
  };
}
