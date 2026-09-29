import type { MathTeachingTemplateContext, MathTeachingTemplatePlan } from "./templateUtils";
import { action, firstIdForRole, idsForRole, step } from "./templateUtils";

function rectangleAreaTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  const shape = firstIdForRole(context, "main_shape");
  const length = firstIdForRole(context, "length_dimension");
  const width = firstIdForRole(context, "width_dimension");
  if (!shape || !length || !width) return null;

  return {
    template_id: "rectangle_area",
    lesson_steps: [
      step(
        "identify_length",
        "Identify the rectangle's length.",
        action(context, "highlight", length),
      ),
      step(
        "identify_width",
        "Identify the rectangle's width.",
        action(context, "highlight", width),
      ),
      step(
        "connect_to_area",
        "Area measures the space inside the rectangle, so use both dimensions together.",
        action(context, "shade", shape),
      ),
    ],
    teach_me_steps: [
      step(
        "find_length",
        "Start by finding the horizontal dimension: the length.",
        action(context, "highlight", length),
      ),
      step(
        "find_width",
        "Next find the other dimension: the width.",
        action(context, "highlight", width),
      ),
      step(
        "see_inside_region",
        "The area is the entire region inside the rectangle, not just its boundary.",
        action(context, "shade", shape),
      ),
      step(
        "use_both_dimensions",
        "Use the length and width together to work out the area.",
        action(context, "emphasise", [length, width, shape]),
      ),
    ],
  };
}

function rectanglePerimeterTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  const shape = firstIdForRole(context, "main_shape");
  const length = firstIdForRole(context, "length_dimension");
  const width = firstIdForRole(context, "width_dimension");
  if (!shape || !length || !width) return null;

  return {
    template_id: "rectangle_perimeter",
    lesson_steps: [
      step(
        "identify_dimensions",
        "Identify the length and width before finding the distance around the rectangle.",
        action(context, "highlight", [length, width]),
      ),
      step(
        "trace_boundary",
        "Perimeter is the distance around the outside boundary of the shape.",
        action(context, "trace", shape),
      ),
      step(
        "use_opposite_sides",
        "Remember that opposite sides of a rectangle have equal lengths.",
        action(context, "emphasise", [shape, length, width]),
      ),
    ],
    teach_me_steps: [
      step(
        "read_length",
        "Read the given length.",
        action(context, "highlight", length),
      ),
      step(
        "read_width",
        "Read the given width.",
        action(context, "highlight", width),
      ),
      step(
        "follow_outside_edge",
        "Trace the outside edge to see exactly what the perimeter measures.",
        action(context, "trace", shape),
      ),
      step(
        "combine_all_sides",
        "Use both pairs of equal opposite sides when combining the distances around the rectangle.",
        action(context, "emphasise", [shape, length, width]),
      ),
    ],
  };
}

function angleTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  const rays = idsForRole(context, "angle_ray");
  const angle = firstIdForRole(context, "angle_region");
  if (rays.length < 2 || !angle) return null;

  return {
    template_id: "angle_basic",
    lesson_steps: [
      step(
        "identify_angle_rays",
        "Identify the two rays that form the angle.",
        action(context, "highlight", rays),
      ),
      step(
        "focus_angle_region",
        "Focus on the marked angle between the two rays.",
        action(context, "highlight", angle),
      ),
      step(
        "use_angle_relationship",
        "Use the angle information and the required relationship to work out the unknown angle.",
        action(context, "emphasise", angle),
      ),
    ],
    teach_me_steps: [
      step(
        "find_vertex_and_rays",
        "Start at the vertex and identify the two rays that create the angle.",
        action(context, "highlight", rays),
      ),
      step(
        "trace_angle",
        "Trace the marked angle region so you are working with the correct pair of rays.",
        action(context, "trace", angle),
      ),
      step(
        "apply_angle_rule",
        "Now apply the relevant angle relationship to determine the required angle.",
        action(context, "emphasise", angle),
      ),
    ],
  };
}

export function geometryTeachingTemplate(
  context: MathTeachingTemplateContext,
): MathTeachingTemplatePlan | null {
  if (context.analysis.strategy === "rectangle_dimensions") {
    const target = context.analysis.interpretation.target.kind;
    const structure = context.analysis.interpretation.problem_structure;
    if (target === "area" || structure === "area") return rectangleAreaTemplate(context);
    if (target === "perimeter" || structure === "perimeter") return rectanglePerimeterTemplate(context);
    return null;
  }

  if (context.analysis.strategy === "angle_diagram") {
    return angleTemplate(context);
  }

  return null;
}
