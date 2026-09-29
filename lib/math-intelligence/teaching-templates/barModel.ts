import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import {
  action,
  firstIdForRole,
  idsForRole,
  objectById,
  step,
} from "./templateUtils";

function comparisonTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  const knownBar = firstIdForRole(context, "known_bar");
  const unknownBar = firstIdForRole(context, "unknown_bar");
  const difference = firstIdForRole(context, "difference_dimension");
  const knownValue = firstIdForRole(context, "known_value");
  if (!knownBar || !unknownBar || !difference) return null;

  return {
    template_id: "bar_model_comparison",
    lesson_steps: [
      step(
        "identify_known_quantity",
        "Start with the bar that represents the known quantity.",
        action(context, "highlight", knownValue ? [knownBar, knownValue] : knownBar),
      ),
      step(
        "identify_difference",
        "Now identify the difference between the two quantities.",
        action(context, "highlight", difference),
      ),
      step(
        "focus_unknown_quantity",
        "Use the known quantity and the difference to reason about the unknown bar.",
        action(context, "emphasise", unknownBar),
      ),
    ],
    teach_me_steps: [
      step(
        "read_known_bar",
        "Read the known bar first and connect it to the quantity given in the question.",
        action(context, "highlight", knownValue ? [knownBar, knownValue] : knownBar),
      ),
      step(
        "read_comparison_difference",
        "The marked extra or missing section shows the difference between the two bars.",
        action(context, "highlight", difference),
      ),
      step(
        "locate_unknown_bar",
        "The bar marked with an unknown is the quantity we are trying to find.",
        action(context, "highlight", unknownBar),
      ),
      step(
        "connect_comparison_relationship",
        "Use the direction of the comparison together with the difference to choose the operation.",
        action(context, "emphasise", [knownBar, unknownBar, difference]),
      ),
    ],
  };
}

function partWholeTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  const parts = idsForRole(context, "part_segment");
  const total = firstIdForRole(context, "total_dimension");
  if (parts.length < 2 || !total) return null;

  const unknownPartIds: string[] = [];
  const knownPartIds: string[] = [];
  for (const partId of parts) {
    const match = partId.match(/^part_(\d+)$/);
    if (!match) {
      knownPartIds.push(partId);
      continue;
    }
    const valueObject = objectById(context, `part_value_${match[1]}`);
    if (valueObject?.type === "text" && valueObject.text.trim() === "?") {
      unknownPartIds.push(partId);
    } else {
      knownPartIds.push(partId);
    }
  }

  const unknownTargets = unknownPartIds.length > 0 ? unknownPartIds : parts;
  const knownTargets = knownPartIds.length > 0 ? knownPartIds : parts;

  return {
    template_id: "bar_model_part_whole",
    lesson_steps: [
      step(
        "identify_parts",
        "Identify the separate parts represented by the sections of the bar.",
        action(context, "highlight", knownTargets),
      ),
      step(
        "identify_whole",
        "The full bar represents the whole or total quantity.",
        action(context, "highlight", total),
      ),
      step(
        "focus_missing_part",
        "Use the relationship between the whole and the known parts to find the missing part.",
        action(context, "emphasise", unknownTargets),
      ),
    ],
    teach_me_steps: [
      step(
        "read_known_parts",
        "Start by identifying the parts whose quantities are already known.",
        action(context, "highlight", knownTargets),
      ),
      step(
        "read_total",
        "Next identify the total represented by the complete bar.",
        action(context, "highlight", total),
      ),
      step(
        "locate_missing_part",
        "The section marked as unknown is the missing part we need to determine.",
        action(context, "highlight", unknownTargets),
      ),
      step(
        "connect_part_whole_relationship",
        "Use the fact that all the parts combine to make the whole.",
        action(context, "emphasise", [...parts, total]),
      ),
    ],
  };
}


function ratioTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  const groupA = idsForRole(context, "ratio_group_a");
  const groupB = idsForRole(context, "ratio_group_b");
  const counts = idsForRole(context, "ratio_count");
  if (groupA.length < 1 || groupB.length < 1) return null;

  return {
    template_id: "bar_model_ratio",
    lesson_steps: [
      step(
        "identify_first_ratio_group",
        "Count the equal units in the first ratio group.",
        action(context, "highlight", groupA),
      ),
      step(
        "identify_second_ratio_group",
        "Now count the equal units in the second ratio group.",
        action(context, "highlight", groupB),
      ),
      step(
        "connect_ratio_units",
        "Compare the two groups using the same-sized ratio units.",
        action(context, "emphasise", [...groupA, ...groupB, ...counts]),
      ),
    ],
    teach_me_steps: [
      step(
        "read_first_ratio_group",
        "Start with the first quantity and count its equal ratio units.",
        action(context, "highlight", groupA),
      ),
      step(
        "read_second_ratio_group",
        "Then count the equal ratio units for the second quantity.",
        action(context, "highlight", groupB),
      ),
      step(
        "compare_equal_units",
        "Each block has the same unit size, so the unit counts show the ratio.",
        action(context, "emphasise", [...groupA, ...groupB]),
      ),
      step(
        "state_ratio_relationship",
        "Read the first unit count to the second unit count to describe the relationship.",
        action(context, "emphasise", [...groupA, ...groupB, ...counts]),
      ),
    ],
  };
}

export function barModelTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy === "bar_model_comparison") {
    return comparisonTemplate(context);
  }
  if (context.analysis.strategy === "bar_model_part_whole") {
    return partWholeTemplate(context);
  }
  if (context.analysis.strategy === "bar_model_ratio") {
    return ratioTemplate(context);
  }
  return null;
}
