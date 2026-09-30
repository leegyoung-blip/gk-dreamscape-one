import type {
  MathIntelligenceQuestionInput,
  MathRuleEvaluation,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import { learnerVisibleQuestionText, mathClassificationText } from "./MathLearnerVisibleEvidence";
import {
  parseVisibleAdditiveComparison,
  parseVisibleDataPairs,
  parseVisibleRatioRelation,
} from "./MathSourceParsing";

function haystack(input: MathIntelligenceQuestionInput) {
  return mathClassificationText(input);
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

function learnerQuestionRequiresVisual(source: string) {
  if (containsAny(source, [
    "shown below",
    "shown above",
    "diagram",
    "figure",
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
  ])) return true;

  // “picture” is common ordinary prose (“framing a picture”). Treat it as a
  // visual dependency only when the question actually refers to picture media.
  return /\b(?:source|given|following|the)\s+picture\b|\bpicture\s+(?:shown|below|above|graph)\b|\bstudy\b[^.!?]{0,30}\bpicture\b/i.test(source);
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

function ratioManipulationPrompt(source: string) {
  return (
    containsAny(source, [
      "simplify the ratio",
      "simplify this ratio",
      "simplest form",
      "lowest terms",
      "express the ratio",
      "write the ratio",
    ]) && source.includes("ratio")
  );
}

function routineTextOnlyTask(
  input: MathIntelligenceQuestionInput,
  source: string,
  topicSkill: string,
) {
  if (looksVisuallyDependent(source)) return false;
  if (
    input.existing_media.has_real_image ||
    input.existing_media.has_legacy_svg ||
    input.existing_media.has_option_images
  ) {
    return false;
  }

  // These domains frequently encode the mathematics in a visual or benefit
  // from a representation. Their dedicated rules above get first refusal.
  if (
    containsAny(topicSkill, [
      "geometry",
      "angle",
      "symmetry",
      "area",
      "perimeter",
      "volume",
      "cube",
      "cuboid",
      "graph",
      "chart",
      "table",
      "data",
      "time",
      "clock",
    ])
  ) {
    return false;
  }

  // Relationship language is handled by bar-model rules or Luna instead of
  // being discarded as routine arithmetic.
  if (
    /\b(fewer|less|more|greater)(?:\s+[a-z]+){0,4}\s+than\b/i.test(input.prompt) ||
    containsAny(source, [
      "altogether",
      "in total",
      "total number",
      "ratio of",
      "ratio is",
      "in the ratio",
      "ratio between",
      "shared equally",
      "equally among",
      "each group",
      "per group",
    ])
  ) {
    return false;
  }

  const prompt = input.prompt.trim().toLocaleLowerCase();
  const taskLead = /^(calculate|work out|evaluate|solve|simplify|round|convert|write|express|find the (?:value|sum|difference|product|quotient)|what is|which (?:number|expression|value|fraction|decimal|percentage))\b/i;
  const conciseQuestion = prompt.length <= 190;
  const curriculumTextOnlyDomain = containsAny(topicSkill, [
    "whole number",
    "whole numbers",
    "addition",
    "subtraction",
    "multiplication",
    "division",
    "operations",
    "decimal",
    "percentage",
    "percent",
    "rounding",
    "place value",
    "factor",
    "multiple",
    "algebra",
    "estimation",
    "money",
    "conversion",
  ]);

  return conciseQuestion && taskLead.test(prompt) && curriculumTextOnlyDomain;
}


function routineSelfContainedNoVisualTask(
  input: MathIntelligenceQuestionInput,
  source: string,
  topicSkill: string,
) {
  // Use learner-visible question wording for dependency checks. Topic/skill
  // names such as “Length Picture Problems” must not create a fake visual
  // dependency for an otherwise self-contained text question.
  const learnerSource = learnerVisibleQuestionText(input).toLocaleLowerCase();
  if (learnerQuestionRequiresVisual(learnerSource)) return false;
  if (
    input.existing_media.has_real_image ||
    input.existing_media.has_legacy_svg ||
    input.existing_media.has_option_images
  ) return false;

  const prompt = input.prompt.trim().toLocaleLowerCase();
  if (!prompt) return false;

  // Explicit source structures that our visual engine can represent keep
  // priority over this no-visual gate.
  if (parseVisibleAdditiveComparison(input.prompt)) return false;
  if (parseVisibleRatioRelation(input.prompt)) return false;
  if (parseVisibleDataPairs(input.prompt).length >= 2 && /\b(?:bar\s+(?:graph|chart)|table)\b/i.test(input.prompt)) return false;

  // Questions that explicitly refer to missing source media are review cases,
  // not routine text questions.
  if (/\b(?:source|given|following)\s+(?:diagram|figure|graph|chart|table|picture)\b/i.test(prompt)) return false;

  // Verbal shape-property questions are self-contained when no picture/figure
  // is referenced. A generated shape is unnecessary assessment decoration.
  if (
    /^(?:which|what)\s+(?:solid|shape)\b/i.test(prompt) &&
    /\b(?:face|faces|surface|surfaces|side|sides|vertex|vertices|edge|edges|rolls|stacks)\b/i.test(prompt)
  ) return true;

  // Lists, raw-number statistics and ordinary data arithmetic do not need a
  // prompt chart merely because the curriculum topic is Data.
  if (
    /\buse the list\b/i.test(prompt) ||
    /\b(?:find|what is)\s+the\s+(?:mean|median|mode|range|total)\b/i.test(prompt) ||
    /\b(?:remaining votes|how many times|how many more)\b/i.test(prompt) && !/\b(?:graph|chart|table)\b/i.test(prompt)
  ) return true;

  // Symbol equations, number patterns, arithmetic/remainder/factor tasks, unit
  // conversions, averages, money arithmetic and rate calculations are solved
  // from text unless a representation is explicitly requested.
  const strongTextOnlySkill = containsAny(topicSkill, [
    "whole number", "whole numbers", "number relationship", "number clues",
    "addition", "subtraction", "multiplication", "division", "operations",
    "factor", "multiple", "remainder", "equation", "unknown", "algebra",
    "pattern", "sequence", "logic", "deduction", "average", "mean", "median",
    "money", "cost", "profit", "discount", "percentage", "percent",
    "decimal", "rounding", "place value", "conversion", "speed", "rate",
    "elapsed time", "unit rate", "scoring", "age", "working backwards",
  ]);

  const asksForComputedResult =
    /\b(?:what|which|how many|how much|how old|how far|how long|find|calculate|work out|evaluate|solve|determine|write|express|complete|arrange|order|subtract|add|multiply|divide|compare|choose)\b/i.test(prompt) ||
    /\b(?:is|are)\s+equal\s+to\b/i.test(prompt) ||
    /\b(?:sum|difference|product|quotient)\s+of\b/i.test(prompt) ||
    /_{2,}|□/.test(prompt);
  const hasMathFacts = /\d|[+\-×÷=/%$¢]|\b(?:twice|thrice|half|quarter|times)\b/i.test(prompt);
  if (strongTextOnlySkill && asksForComputedResult && hasMathFacts) return true;

  // A self-contained word problem with explicit numbers but without a supported
  // visual relationship is deliberately text-only. This is the main Pass 2
  // Luna-reduction gate: ambiguity about the arithmetic method is not the same
  // as ambiguity about whether a prompt diagram is needed.
  const wordProblemShape = prompt.length <= 650 && asksForComputedResult && hasMathFacts;
  const supportedVisualRelation =
    /\b(?:shaded|unshaded|number line|clock face|draw|construct)\b/i.test(prompt) ||
    /\b(?:area|perimeter)\b/i.test(prompt) && /\brectangle\b/i.test(prompt);

  return wordProblemShape && !supportedVisualRelation;
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
 * Phase 2I coverage expansion pass 2 — deterministic decision layer.
 *
 * The ordering is deliberate:
 * 1. preserve existing learner media;
 * 2. catch explicit visual mathematics;
 * 3. catch high-value bar-model structures;
 * 4. skip only clearly routine text-only work;
 * 5. route genuine ambiguity to Luna.
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

  // Genuine images and option images are never silently replaced by generated
  // mathematical diagrams. Phase 3 may migrate mathematical legacy media, but
  // Phase 2I only analyses/preserves it.
  if (input.existing_media.has_real_image || input.existing_media.has_option_images) {
    return resolved({
      visual_need: "prohibited",
      disposition: "preserve_media",
      candidate_strategies: ["preserve_media"],
      confidence: 0.99,
      reason_codes: ["REAL_IMAGE_DEPENDENCY"],
    });
  }

  if (input.existing_media.has_legacy_svg) {
    return resolved({
      visual_need: looksVisuallyDependent(source) ? "required" : "useful",
      disposition: "preserve_media",
      candidate_strategies: ["preserve_media"],
      confidence: 0.99,
      reason_codes: ["LEGACY_MEDIA_DEPENDENCY"],
    });
  }

  // Some old questions verbally reference a source figure/picture but the QA
  // payload contains no corresponding media. Luna cannot recover an unseen
  // source safely, so flag these deterministically instead of paying for an
  // AI call or inventing the missing diagram.
  if (
    /\b(?:source|given|following)\s+(?:diagram|figure|graph|chart|table|picture)\b/i.test(prompt) ||
    /\bsource\s+picture\s+graph\b/i.test(prompt) ||
    /\bmoney\s+picture\s+graph\b/i.test(prompt) ||
    (/\bmirror\b/i.test(prompt) && /\(a\).*\(b\).*\(c\).*\(d\)/i.test(prompt)) ||
    /\bview\s+from\s+above\b.*\bside\s+view\b/i.test(prompt)
  ) {
    return resolved({
      visual_need: "required",
      disposition: "needs_review",
      candidate_strategies: [],
      confidence: 0.99,
      reason_codes: ["INSUFFICIENT_STRUCTURED_DATA"],
    });
  }

  // A few source-derived questions use the word “diagram” even though the
  // complete mathematics is already written as a symbolic equation. With no
  // actual media present, a generated prompt visual adds nothing.
  if (
    /^the\s+diagram\s+shows\b/i.test(prompt.trim()) &&
    /[=+\-×÷*]/.test(prompt) &&
    !/\b(?:shape|angle|graph|chart|table|number line|shaded|clock)\b/i.test(prompt)
  ) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.98,
      reason_codes: ["DIRECT_CALCULATION"],
    });
  }

  if (
    containsAny(source, ["clock face", "time shown on the clock", "clock shows"]) ||
    (containsAny(topicSkill, ["time", "clock"]) &&
      /\b(?:draw|show|clock|face)\b/i.test(prompt))
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
    containsAny(topicSkill, ["fraction", "fractions"]) &&
    containsAny(source, ["fraction bar", "fraction model"]) &&
    containsAny(source, ["show", "draw", "represent", "model"])
  ) {
    return resolved({
      visual_need: "required",
      disposition: "generate",
      candidate_strategies: ["fraction_bar"],
      confidence: 0.97,
      reason_codes: ["FRACTION_SHADED_WHOLE"],
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
      "equal parts are shaded",
    ]) &&
    /\b(?:diagram|figure|model|bar|grid|shown|showing|draw|represent)\b/i.test(prompt)
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
    containsAny(source, ["equivalent fraction", "equivalent fractions", "same fraction"]) &&
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
    containsAny(source, ["shown", "shows", "showing", "below", "above", "study", "according to", "represents", "draw", "construct", "make"])
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

  const explicitDataPairs = parseVisibleDataPairs(input.prompt);
  if (explicitDataPairs.length >= 2 && /\b(?:bar\s+(?:graph|chart))\b/i.test(input.prompt)) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["bar_chart"],
      confidence: 0.97,
      reason_codes: ["DATA_REQUIRED"],
    });
  }

  if (explicitDataPairs.length >= 4 && /\b(?:following amounts|saved the following|data are|data is|table)\b/i.test(input.prompt)) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["table"],
      confidence: 0.95,
      reason_codes: ["TABLE_REQUIRED"],
    });
  }

  if (
    source.includes("table") &&
    containsAny(source, ["shown", "below", "above", "study", "according to", "complete", "draw", "construct"])
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
      disposition: "needs_review",
      candidate_strategies: ["solid_net"],
      confidence: 0.98,
      reason_codes: ["NET_REQUIRED", "INSUFFICIENT_STRUCTURED_DATA"],
    });
  }

  if (
    containsAny(source, ["angle marked", "marked angle", "angle shown", "find angle", "unknown angle", "draw an angle", "construct an angle"]) &&
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
      disposition: "needs_review",
      candidate_strategies: ["symmetry_diagram"],
      confidence: 0.98,
      reason_codes: ["SYMMETRY_REQUIRED", "INSUFFICIENT_STRUCTURED_DATA"],
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
    /\b(?:cube|cuboid)\b/i.test(prompt) ||
    (containsAny(topicSkill, ["volume"]) &&
      /\blength\b/i.test(prompt) && /\b(?:width|breadth)\b/i.test(prompt) && /\bheight\b/i.test(prompt))
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: source.includes("cuboid") ? ["cuboid"] : ["cube", "cuboid"],
      confidence: source.includes("cuboid") ? 0.93 : 0.8,
      reason_codes: ["SOLID_REQUIRED"],
    });
  }

  if (
    containsAny(source, ["rectangle", "rectangular"]) &&
    containsAny(source, ["length", "long", "width", "wide", "breadth", " by ", "×", " x "]) &&
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

  const parsedRatioRelation = parseVisibleRatioRelation(input.prompt);
  if (parsedRatioRelation) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["bar_model_ratio"],
      confidence: 0.96,
      reason_codes: ["WORD_PROBLEM_RATIO"],
    });
  }

  const parsedAdditiveComparison = parseVisibleAdditiveComparison(input.prompt);
  if (
    parsedAdditiveComparison ||
    (/\b(fewer|less|more|greater|shorter|longer)(?:\s+[a-z]+){0,4}\s+than\b/i.test(input.prompt) &&
      /\b(has|have|had|owns|bought|collected|made|scored|received|is|are|was|were|costs?|measures?)\b/i.test(input.prompt))
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["bar_model_comparison"],
      confidence: 0.93,
      reason_codes: ["WORD_PROBLEM_COMPARISON"],
    });
  }

  // Pure ratio manipulation is a routine symbolic task; a prompt diagram would
  // add little and can make the assessment noisier.
  if (ratioManipulationPrompt(source) && !looksVisuallyDependent(source)) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.96,
      reason_codes: ["DIRECT_CALCULATION"],
    });
  }

  if (
    containsAny(source, ["ratio of", "ratio is", "in the ratio", "ratio between"]) &&
    !ratioManipulationPrompt(source)
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["bar_model_ratio"],
      confidence: 0.94,
      reason_codes: ["WORD_PROBLEM_RATIO"],
    });
  }

  if (
    containsAny(source, ["altogether", "in total", "total number", "total of"]) &&
    /\b(has|have|had|bought|collected|made|received|shared|there (?:is|are|were)|contains?)\b/i.test(input.prompt)
  ) {
    return resolved({
      visual_need: "useful",
      disposition: "generate",
      candidate_strategies: ["bar_model_part_whole"],
      confidence: 0.86,
      reason_codes: ["WORD_PROBLEM_PART_WHOLE"],
    });
  }

  // Some visual families are deliberately not generated yet. Sending these to
  // Luna cannot create the missing deterministic topology, so stop at review.
  if (containsAny(source, ["line of symmetry", "lines of symmetry", "symmetrical", "symmetry line"])) {
    return resolved({
      visual_need: "required",
      disposition: "needs_review",
      candidate_strategies: ["symmetry_diagram"],
      confidence: 0.98,
      reason_codes: ["SYMMETRY_REQUIRED", "INSUFFICIENT_STRUCTURED_DATA"],
    });
  }

  if (containsAny(source, ["net of a cube", "net of a cuboid", "which net", "solid net"])) {
    return resolved({
      visual_need: "required",
      disposition: "needs_review",
      candidate_strategies: ["solid_net"],
      confidence: 0.98,
      reason_codes: ["NET_REQUIRED", "INSUFFICIENT_STRUCTURED_DATA"],
    });
  }

  if (routineSelfContainedNoVisualTask(input, source, topicSkill)) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.94,
      reason_codes: ["DIRECT_CALCULATION"],
    });
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

  if (containsAny(topicSkill, ["rounding", "round off", "nearest"]) && input.prompt.length < 180) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.95,
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
      confidence: 0.93,
      reason_codes: ["PLACE_VALUE_TEXT_ONLY"],
    });
  }

  if (routineTextOnlyTask(input, source, topicSkill)) {
    return resolved({
      visual_need: "unnecessary",
      disposition: "skip",
      candidate_strategies: ["none"],
      confidence: 0.91,
      reason_codes: ["DIRECT_CALCULATION"],
    });
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

  return ambiguous([], ["AMBIGUOUS_LANGUAGE"], 0.4);
}
