import type {
  MathIntelligenceQuestionInput,
  MathRuleEvaluation,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";

function haystack(input: MathIntelligenceQuestionInput) {
  return [input.topic, input.skill, input.instruction, input.prompt, input.explanation]
    .filter(Boolean)
    .join(" \n ")
    .toLocaleLowerCase();
}

function containsAny(source: string, values: string[]) {
  return values.some((value) => source.includes(value));
}

function looksVisuallyDependent(source: string) {
  return containsAny(source, [
    "shown below",
    "shown above",
    "shown in",
    "diagram",
    "figure",
    "picture",
    "photograph",
    "image",
    "graph",
    "chart",
    "table",
    "number line",
    "clock face",
    "shaded",
    "unshaded",
    "not drawn to scale",
    "marked angle",
    "angle marked",
  ]);
}

function expressionOnlyPrompt(prompt: string) {
  const compact = prompt
    .replace(/\s+/g, " ")
    .replace(/^(calculate|find|work out|evaluate|solve)\s+/i, "")
    .replace(/[?=]\s*$/g, "")
    .trim();

  if (!compact) return false;

  const words = compact.match(/[a-z]+/gi) || [];
  if (words.length > 2) return false;

  return /^[\d\s+\-×x*÷/().,%$:=]+$/i.test(compact);
}

function resolved(
  values: Omit<MathRuleEvaluation, "resolved">,
): MathRuleEvaluation {
  return { resolved: true, ...values };
}

function ambiguous(
  candidateStrategies: MathVisualStrategy[],
  reasonCodes: MathRuleEvaluation["reason_codes"],
  confidence = 0.5,
): MathRuleEvaluation {
  return {
    resolved: false,
    visual_need: null,
    disposition: null,
    candidate_strategies: candidateStrategies,
    confidence,
    reason_codes: reasonCodes,
  };
}

/**
 * Phase 2A — conservative deterministic decision layer.
 *
 * A rule result is final only when Dreamscape can defend the decision from
 * explicit question signals. Anything genuinely ambiguous is escalated to Luna.
 */
export function evaluateMathVisualNeed(
  input: MathIntelligenceQuestionInput,
): MathRuleEvaluation {
  const source = haystack(input);
  const prompt = input.prompt.toLocaleLowerCase();
  const topicSkill = `${input.topic} ${input.skill}`.toLocaleLowerCase();

  if (input.existing_media.has_math_visual_v2) {
    return resolved({
      visual_need: looksVisuallyDependent(source) ? "required" : "useful",
      disposition: "preserve_existing",
      candidate_strategies: [],
      confidence: 1,
      reason_codes: ["EXISTING_V2_PRESERVED"],
    });
  }

  if (input.existing_media.has_real_image && looksVisuallyDependent(source)) {
    return resolved({
      visual_need: "prohibited",
      disposition: "preserve_media",
      candidate_strategies: ["preserve_media"],
      confidence: 0.99,
      reason_codes: ["REAL_IMAGE_DEPENDENCY"],
    });
  }

  // Phase 3 will migrate legacy mathematical SVG/stimulus media. Phase 2 must
  // not silently replace it while building new intelligence behaviour.
  if (input.existing_media.has_legacy_svg) {
    return resolved({
      visual_need: looksVisuallyDependent(source) ? "required" : "useful",
      disposition: "preserve_media",
      candidate_strategies: ["preserve_media"],
      confidence: 0.98,
      reason_codes: ["LEGACY_MEDIA_DEPENDENCY"],
    });
  }

  if (
    containsAny(source, ["clock face", "time shown on the clock", "clock shows"]) ||
    (containsAny(topicSkill, ["time", "clock"]) &&
      containsAny(prompt, ["draw", "show", "clock", "face"]))
  ) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["clock"],
      confidence: 0.97,
      reason_codes: ["CLOCK_REPRESENTATION"],
    });
  }

  if (
    containsAny(source, [
      "shaded fraction",
      "fraction is shaded",
      "fraction of the shape is shaded",
      "fraction of the bar is shaded",
      "shaded part",
      "unshaded part",
    ])
  ) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["fraction_bar", "fraction_grid"],
      confidence: 0.96,
      reason_codes: ["FRACTION_SHADED_WHOLE"],
    });
  }

  if (
    containsAny(source, ["equivalent fraction", "equivalent fractions"]) &&
    containsAny(topicSkill, ["fraction", "fractions"])
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["aligned_fraction_bars"],
      confidence: 0.94,
      reason_codes: ["FRACTION_EQUIVALENCE"],
    });
  }

  if (containsAny(source, ["number line", "marked on the line", "point on the line"])) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["number_line"],
      confidence: 0.98,
      reason_codes: ["NUMBER_LINE_LANGUAGE"],
    });
  }

  if (
    containsAny(source, ["bar graph", "bar chart", "pictogram", "pie chart", "line graph"]) &&
    containsAny(source, ["shown", "below", "above", "study", "according to", "represents"])
  ) {
    const candidates: MathVisualStrategy[] = containsAny(source, ["bar graph", "bar chart"])
      ? ["bar_chart"]
      : source.includes("line graph")
        ? ["line_graph"]
        : source.includes("pie chart")
          ? ["pie_chart"]
          : ["bar_chart", "table"];

    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: candidates,
      confidence: candidates.length === 1 ? 0.97 : 0.82,
      reason_codes: ["DATA_REQUIRED"],
    });
  }

  if (
    source.includes("table") &&
    containsAny(source, ["shown", "below", "above", "study", "according to"])
  ) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["table"],
      confidence: 0.96,
      reason_codes: ["TABLE_REQUIRED"],
    });
  }

  if (containsAny(source, ["net of a cube", "net of a cuboid", "which net", "solid net"])) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["solid_net"],
      confidence: 0.98,
      reason_codes: ["NET_REQUIRED"],
    });
  }

  if (
    containsAny(source, ["angle marked", "marked angle", "angle shown", "find angle", "unknown angle"]) &&
    containsAny(topicSkill, ["angle", "geometry"])
  ) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["angle_diagram"],
      confidence: 0.95,
      reason_codes: ["ANGLE_REQUIRED"],
    });
  }

  if (
    containsAny(source, ["line of symmetry", "lines of symmetry", "symmetrical", "symmetry line"])
  ) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["symmetry_diagram"],
      confidence: 0.96,
      reason_codes: ["SYMMETRY_REQUIRED"],
    });
  }

  if (
    containsAny(source, ["not drawn to scale", "diagram shows", "figure shows", "shape shown"]) &&
    containsAny(topicSkill, ["geometry", "perimeter", "area", "angle", "triangle", "quadrilateral"])
  ) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["polygon_geometry", "rectangle_dimensions"],
      confidence: 0.9,
      reason_codes: ["GEOMETRY_REQUIRED"],
    });
  }

  if (
    containsAny(topicSkill, ["cube", "cuboid", "volume"]) &&
    containsAny(source, ["cube", "cuboid", "volume", "length", "width", "height"])
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: source.includes("cuboid") ? ["cuboid"] : ["cube", "cuboid"],
      confidence: source.includes("cuboid") ? 0.93 : 0.78,
      reason_codes: ["SOLID_REQUIRED"],
    });
  }

  if (
    containsAny(source, ["rectangle", "rectangular"]) &&
    containsAny(source, ["length", "long", "width", "wide", "breadth"]) &&
    containsAny(source, ["area", "perimeter"])
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["rectangle_dimensions"],
      confidence: 0.95,
      reason_codes: ["RECTANGLE_DIMENSIONS"],
    });
  }

  if (
    /\b(fewer|less|more|greater)\s+than\b/i.test(input.prompt) &&
    /\b(has|have|had|owns|bought|collected|made|scored|received)\b/i.test(input.prompt)
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["bar_model_comparison"],
      confidence: 0.92,
      reason_codes: ["WORD_PROBLEM_COMPARISON"],
    });
  }

  if (
    containsAny(source, ["ratio of", "ratio is", "in the ratio", "ratio between"]) &&
    !containsAny(source, ["simplify the ratio", "express the ratio"])
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["bar_model_ratio"],
      confidence: 0.9,
      reason_codes: ["WORD_PROBLEM_RATIO"],
    });
  }

  if (
    containsAny(source, ["altogether", "in total", "total number"]) &&
    input.prompt.length >= 70 &&
    /\b(has|have|had|bought|collected|made|received|shared)\b/i.test(input.prompt)
  ) {
    // Part-whole language is useful, but this is intentionally not a final rule
    // when another relationship may also exist in a long word problem.
    return ambiguous(
      ["bar_model_part_whole"],
      ["WORD_PROBLEM_PART_WHOLE", "AMBIGUOUS_LANGUAGE"],
      0.74,
    );
  }

  if (
    containsAny(topicSkill, ["measurement", "length", "mass", "capacity"]) &&
    containsAny(source, ["measure", "length", "height", "distance"])
  ) {
    return ambiguous(
      ["measurement_diagram", "none"],
      ["MEASUREMENT_USEFUL", "MULTIPLE_STRATEGIES_PLAUSIBLE"],
      0.65,
    );
  }

  if (expressionOnlyPrompt(input.prompt)) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.98,
      reason_codes: ["DIRECT_CALCULATION"],
    });
  }

  if (containsAny(topicSkill, ["rounding", "round off", "nearest"]) && input.prompt.length < 150) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.92,
      reason_codes: ["ROUNDING_TEXT_ONLY"],
    });
  }

  if (
    containsAny(topicSkill, ["place value"]) &&
    !containsAny(source, ["table", "chart", "show", "represent", "regroup"])
  ) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.9,
      reason_codes: ["PLACE_VALUE_TEXT_ONLY"],
    });
  }

  return ambiguous([], ["AMBIGUOUS_LANGUAGE"], 0.4);
}
