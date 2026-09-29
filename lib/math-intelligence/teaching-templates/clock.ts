import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, step } from "./templateUtils";

export function clockTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy !== "clock") return null;
  const clock = firstIdForRole(context, "clock");
  if (!clock) return null;

  return {
    template_id: "clock_reading",
    lesson_steps: [
      step(
        "read_minute_hand",
        "Read the minute hand first to work out the minutes past the hour.",
        action(context, "highlight", clock),
      ),
      step(
        "read_hour_hand",
        "Then use the hour hand to identify the hour and combine both readings.",
        action(context, "emphasise", clock),
      ),
    ],
    teach_me_steps: [
      step(
        "start_with_minutes",
        "Start with the longer minute hand and use the clock markings to read the minutes.",
        action(context, "highlight", clock),
      ),
      step(
        "check_hour_position",
        "Next check where the hour hand sits, especially when it is between two numbers.",
        action(context, "highlight", clock),
      ),
      step(
        "combine_time_reading",
        "Combine the hour and minute readings to state the time correctly.",
        action(context, "emphasise", clock),
      ),
    ],
  };
}
