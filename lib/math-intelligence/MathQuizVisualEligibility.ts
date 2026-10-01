import type {
  MathIntelligenceQuestionInput,
  MathIntelligenceReasonCode,
  MathQuizVisualEligibility,
  MathQuizVisualRequirement,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import { learnerVisibleQuestionText } from "./MathLearnerVisibleEvidence";
import { parseVisibleDataPairs } from "./MathSourceParsing";

export const MATH_QUIZ_VISUAL_ELIGIBILITY_VERSION = "3A.1" as const;

function text(input: MathIntelligenceQuestionInput) {
  return learnerVisibleQuestionText(input).replace(/\s+/g, " ").trim();
}


function containsAny(source: string, values: string[]) {
  return values.some((value) => source.includes(value));
}

function result(
  requirement: MathQuizVisualRequirement,
  autoGenerateV2: boolean,
  candidateStrategies: MathVisualStrategy[],
  confidence: number,
  reasonCodes: MathIntelligenceReasonCode[],
): MathQuizVisualEligibility {
  return {
    requirement,
    auto_generate_v2: autoGenerateV2,
    candidate_strategies: [...new Set(candidateStrategies)],
    confidence: Math.max(0, Math.min(1, confidence)),
    reason_codes: [...new Set(reasonCodes)],
  };
}

function hasPreservableVisualMedia(input: MathIntelligenceQuestionInput) {
  return Boolean(
    input.existing_media.has_math_visual_v2 ||
      input.existing_media.has_real_image ||
      input.existing_media.has_legacy_svg ||
      input.existing_media.has_option_images ||
      ["table", "graph", "diagram", "image"].includes(
        String(input.existing_media.stimulus_type || "").toLocaleLowerCase(),
      ),
  );
}

function explicitMissingVisualReference(source: string) {
  return (
    /\b(?:study|refer to|use|look at|according to)\s+(?:the\s+)?(?:diagram|figure|picture|image|graph|chart|table|number line|clock(?: face)?)\b/i.test(source) ||
    /\b(?:diagram|figure|picture|image|graph|chart|table|number line|clock(?: face)?)\s+(?:below|above|shown|shows|showing)\b/i.test(source) ||
    /\b(?:shown|marked|labelled|labeled)\s+(?:in|on)\s+(?:the\s+)?(?:diagram|figure|picture|graph|chart|table|number line|clock(?: face)?)\b/i.test(source) ||
    /\bangle\s+(?:marked|shown|labelled|labeled)\b/i.test(source) ||
    /\b(?:view from above|top view|side view|front view)\b/i.test(source)
  );
}

function visualFractionTask(source: string, topicSkill: string) {
  if (!containsAny(topicSkill, ["fraction", "fractions"])) return false;

  // The quiz diagram is intrinsic when the learner is interpreting a shaded
  // representation, not merely calculating how many parts correspond to a
  // stated fraction.
  return (
    /\bwhat fraction\b[^.!?]{0,50}\b(?:shaded|unshaded)\b/i.test(source) ||
    /\b(?:fraction|part)\b[^.!?]{0,45}\b(?:is|are)\s+(?:shaded|unshaded)\b/i.test(source) ||
    /\bwhich\b[^.!?]{0,35}\b(?:model|bar|grid|shape|diagram)\b[^.!?]{0,35}\b(?:fraction|shaded|unshaded)\b/i.test(source) ||
    /\b(?:show|draw|represent)\b[^.!?]{0,40}\bfraction\b/i.test(source) ||
    /\bfraction\s+(?:bar|model|grid|strip)\b/i.test(source) &&
      /\b(?:shown|show|draw|represent|shaded|unshaded)\b/i.test(source)
  );
}

function chooseFractionStrategies(source: string): MathVisualStrategy[] {
  if (/\b(?:grid|square|cell)s?\b/i.test(source)) return ["fraction_grid"];
  if (/\b(?:equivalent|same fraction)\b/i.test(source)) return ["aligned_fraction_bars"];
  return ["fraction_bar"];
}

function explicitNumberLineTask(source: string, topicSkill: string) {
  return (
    /\bnumber line\b/i.test(source) &&
    (/\b(?:mark|marked|point|position|located|shown|plot|place|which number|what number)\b/i.test(source) ||
      containsAny(topicSkill, ["number line"]))
  );
}

function explicitClockReadingTask(source: string, topicSkill: string) {
  if (!containsAny(topicSkill, ["time", "clock"]) && !/\bclock(?: face)?\b/i.test(source)) return false;

  // If the shown time is already written as text (e.g. “the clock shows
  // 12:25 but is 10 minutes slow”), the assessment is time arithmetic rather
  // than clock reading. A clock may be useful in Teaching, but is not a
  // required quiz diagram.
  if (/\bclock\s+shows?\s+(?:[01]?\d|2[0-3]):[0-5]\d\b/i.test(source)) return false;

  return (
    /\b(?:what|which)\s+time\b[^.!?]{0,60}\b(?:clock|clock face)\b/i.test(source) ||
    /\b(?:read|study|look at)\b[^.!?]{0,35}\b(?:clock|clock face)\b/i.test(source) ||
    /\b(?:minute hand|hour hand)\b/i.test(source) ||
    /\b(?:draw|show)\b[^.!?]{0,30}\bclock\b/i.test(source)
  );
}

function explicitDataVisualTask(source: string, topicSkill: string) {
  const chartWords = /\b(?:bar\s+(?:graph|chart)|line\s+graph|pie\s+chart|pictograph|pictogram|table)\b/i;
  if (!chartWords.test(source) && !containsAny(topicSkill, ["bar graph", "bar chart", "line graph", "pie chart", "pictograph", "pictogram", "table"])) {
    return false;
  }

  // Require the assessment to actually be about reading/using the visual,
  // not merely a word problem in the Data topic with values written in prose.
  return (
    /\b(?:according to|from|use|study|read|shown|shows|represents?|which bar|which graph|which table|greatest|least|highest|lowest|half as much|how many more)\b/i.test(source) ||
    containsAny(topicSkill, ["interpreting", "read graph", "reading graph", "visual data", "data representation"])
  );
}

function dataStrategy(source: string): MathVisualStrategy[] {
  if (/\bbar\s+(?:graph|chart)\b/i.test(source)) return ["bar_chart"];
  if (/\bline\s+graph\b/i.test(source)) return ["line_graph"];
  if (/\bpie\s+chart\b/i.test(source)) return ["pie_chart"];
  if (/\btable\b/i.test(source)) return ["table"];
  if (/\b(?:pictograph|pictogram)\b/i.test(source)) return ["bar_chart"];
  return ["table", "bar_chart"];
}

function explicitGeometryVisualTask(source: string, topicSkill: string) {
  const geometryDomain = containsAny(topicSkill, [
    "geometry",
    "angle",
    "symmetry",
    "triangle",
    "quadrilateral",
    "polygon",
    "shape",
    "net",
    "solid",
    "cube",
    "cuboid",
  ]);
  if (!geometryDomain) return false;

  // Shape-property recall is text knowledge, not an intrinsic diagram task.
  if (
    /^(?:which|what)\s+(?:solid|shape)\b/i.test(source) &&
    /\b(?:face|faces|surface|surfaces|side|sides|vertex|vertices|edge|edges|rolls|stacks|lines? of symmetry)\b/i.test(source) &&
    !explicitMissingVisualReference(source)
  ) return false;

  return (
    explicitMissingVisualReference(source) ||
    /\b(?:angle\s+[a-z]|∠[a-z]|line\s+[a-z]{2}|point\s+[a-z]|vertex\s+[a-z])\b/i.test(source) ||
    /\b(?:net of a|which net|solid net)\b/i.test(source) ||
    /\b(?:count|how many)\b[^.!?]{0,45}\b(?:triangles|squares|rectangles|shapes)\b/i.test(source) ||
    /\b(?:grid|unit squares?)\b/i.test(source) &&
      /\b(?:how many|count|different|including the large)\b/i.test(source)
  );
}

function geometryStrategies(source: string): MathVisualStrategy[] {
  if (/\b(?:net of a cube|net of a cuboid|which net|solid net)\b/i.test(source)) return ["solid_net"];
  if (/\b(?:line of symmetry|lines of symmetry|symmetrical|symmetry line)\b/i.test(source)) return ["symmetry_diagram"];
  if (/\bangle\b|∠/i.test(source)) return ["angle_diagram"];
  if (/\b(?:cube|cuboid)\b/i.test(source) && /\b(?:view|face|edge|vertex|vertices)\b/i.test(source)) {
    return source.toLocaleLowerCase().includes("cuboid") ? ["cuboid"] : ["cube", "cuboid"];
  }
  return ["polygon_geometry"];
}

function explicitMeasurementScaleTask(source: string, topicSkill: string) {
  if (!containsAny(topicSkill, ["measurement", "length", "mass", "capacity", "temperature", "scale"])) return false;
  return /\b(?:ruler|measuring tape|scale|thermometer|measuring cylinder|graduated|markings?)\b/i.test(source);
}

function looksLikeDirectOrSymbolicTask(source: string) {
  return (
    /^[\s\d$¢()+\-×÷*/=<>.,:%?]+$/i.test(source) ||
    /^(?:calculate|work out|evaluate|solve|simplify|round|convert|write|express|find the (?:value|sum|difference|product|quotient)|what is)\b/i.test(source) ||
    /\b(?:equation|factor|multiple|remainder|round(?:ing)?|place value|numeral|numerals)\b/i.test(source)
  );
}

function looksLikeContextualEnrichmentCandidate(source: string, topicSkill: string) {
  if (source.length > 36 && /\b(?:how many|how much|how long|how far|how old|what fraction|what percentage|find|which)\b/i.test(source)) {
    return true;
  }

  return containsAny(topicSkill, [
    "problem solving",
    "word problem",
    "money",
    "place value",
    "ratio",
    "percentage",
    "measurement",
    "fractions",
  ]);
}

function fractionHasEnoughSourceData(source: string) {
  const total = source.match(/\b(\d+)\s+equal\s+parts?\b/i);
  const shaded = source.match(/\b(\d+)\s+(?:are\s+)?shaded\b/i);
  const unshaded = source.match(/\b(\d+)\s+(?:are\s+)?unshaded\b/i);
  const fraction = source.match(/\b(\d+)\s*\/\s*(\d+)\b/);
  return Boolean(total && (shaded || unshaded) || fraction);
}

function clockHasConstructibleTime(source: string) {
  return /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/.test(source) ||
    /\b(?:o['’]?clock|half past|quarter past|quarter to)\b/i.test(source);
}

function numberLineHasConstructibleData(source: string) {
  const values = source.match(/-?\d+(?:\.\d+)?/g) || [];
  return values.length >= 2 && /\b(?:from|between|interval|increments?|steps?|each mark|at)\b/i.test(source);
}

function dataHasConstructibleData(source: string) {
  return parseVisibleDataPairs(source).length >= 2;
}

/**
 * Phase 3A quiz visual eligibility filter.
 *
 * This is intentionally conservative. The quiz visual generator is now for
 * assessment visuals that are intrinsic to the task, not for explanatory
 * diagrams that merely make a word problem easier. Explanatory bar models and
 * similar scaffolds belong in the Teaching Engine instead.
 */
export function evaluateMathQuizVisualEligibility(
  input: MathIntelligenceQuestionInput,
): MathQuizVisualEligibility {
  const source = text(input);
  const sourceLower = source.toLocaleLowerCase();
  const topicSkill = `${input.topic} ${input.skill}`.toLocaleLowerCase();

  if (hasPreservableVisualMedia(input)) {
    return result(
      "existing_media",
      false,
      ["preserve_media"],
      1,
      [
        "QUIZ_VISUAL_EXISTING_MEDIA",
        input.existing_media.has_math_visual_v2
          ? "EXISTING_V2_PRESERVED"
          : input.existing_media.has_real_image || input.existing_media.has_option_images
            ? "REAL_IMAGE_DEPENDENCY"
            : "LEGACY_MEDIA_DEPENDENCY",
      ],
    );
  }

  // Some source-derived questions retain the word “diagram” even though the
  // complete learner-facing mathematics is already written symbolically. Do
  // not treat that wording alone as a missing-media dependency.
  if (
    /^the\s+diagram\s+shows\b/i.test(input.prompt.trim()) &&
    /[=+\-×÷*]/.test(input.prompt) &&
    !/\b(?:shape|angle|graph|chart|table|number line|shaded|unshaded|clock)\b/i.test(input.prompt)
  ) {
    return result(
      "not_needed",
      false,
      ["none"],
      0.99,
      ["QUIZ_VISUAL_NOT_NEEDED", "DIRECT_CALCULATION"],
    );
  }

  // Likewise, when the displayed time is already stated numerically, a
  // slow/fast-clock question is arithmetic. The quiz does not require a clock
  // face, though an author may add one as enrichment.
  if (
    /\bclock\s+shows?\s+(?:[01]?\d|2[0-3]):[0-5]\d\b/i.test(input.prompt) &&
    /\b(?:slow|fast|ahead|behind|correct time|actual time)\b/i.test(input.prompt)
  ) {
    return result(
      "optional_enrichment",
      false,
      ["none"],
      0.99,
      ["QUIZ_VISUAL_OPTIONAL_ENRICHMENT", "QUIZ_VISUAL_MANUAL_MEDIA_PREFERRED"],
    );
  }

  // Visual fractions are genuine diagram tasks only when the learner is being
  // asked to interpret/construct a fraction representation. Text-only fraction
  // arithmetic and ordinary fraction word problems do not qualify.
  if (visualFractionTask(source, topicSkill)) {
    if (explicitMissingVisualReference(source) && !fractionHasEnoughSourceData(source)) {
      return result(
        "missing_required_media",
        false,
        chooseFractionStrategies(source),
        0.99,
        ["QUIZ_VISUAL_MISSING_REQUIRED_MEDIA", "FRACTION_SHADED_WHOLE", "INSUFFICIENT_STRUCTURED_DATA"],
      );
    }

    return result(
      "required",
      fractionHasEnoughSourceData(source),
      chooseFractionStrategies(source),
      0.98,
      [
        "QUIZ_VISUAL_REQUIRED",
        fractionHasEnoughSourceData(source) ? "QUIZ_VISUAL_AUTO_V2_ALLOWED" : "QUIZ_VISUAL_REQUIRED_UNSUPPORTED",
        /\bequivalent|same fraction\b/i.test(source) ? "FRACTION_EQUIVALENCE" : "FRACTION_SHADED_WHOLE",
      ],
    );
  }

  if (explicitNumberLineTask(source, topicSkill)) {
    if (!numberLineHasConstructibleData(source)) {
      return result(
        "missing_required_media",
        false,
        ["number_line"],
        0.99,
        ["QUIZ_VISUAL_MISSING_REQUIRED_MEDIA", "NUMBER_LINE_LANGUAGE", "INSUFFICIENT_STRUCTURED_DATA"],
      );
    }
    return result(
      "required",
      true,
      ["number_line"],
      0.98,
      ["QUIZ_VISUAL_REQUIRED", "QUIZ_VISUAL_AUTO_V2_ALLOWED", "NUMBER_LINE_LANGUAGE"],
    );
  }

  if (explicitClockReadingTask(source, topicSkill)) {
    if (!clockHasConstructibleTime(source)) {
      return result(
        "missing_required_media",
        false,
        ["clock"],
        0.99,
        ["QUIZ_VISUAL_MISSING_REQUIRED_MEDIA", "CLOCK_REPRESENTATION", "INSUFFICIENT_STRUCTURED_DATA"],
      );
    }
    return result(
      "required",
      true,
      ["clock"],
      0.98,
      ["QUIZ_VISUAL_REQUIRED", "QUIZ_VISUAL_AUTO_V2_ALLOWED", "CLOCK_REPRESENTATION"],
    );
  }

  if (explicitDataVisualTask(source, topicSkill)) {
    const strategies = dataStrategy(source);
    if (!dataHasConstructibleData(source)) {
      return result(
        "missing_required_media",
        false,
        strategies,
        0.99,
        [
          "QUIZ_VISUAL_MISSING_REQUIRED_MEDIA",
          strategies.includes("table") ? "TABLE_REQUIRED" : "DATA_REQUIRED",
          "INSUFFICIENT_STRUCTURED_DATA",
        ],
      );
    }
    return result(
      "required",
      true,
      strategies,
      0.97,
      [
        "QUIZ_VISUAL_REQUIRED",
        "QUIZ_VISUAL_AUTO_V2_ALLOWED",
        strategies.includes("table") ? "TABLE_REQUIRED" : "DATA_REQUIRED",
      ],
    );
  }

  if (explicitGeometryVisualTask(source, topicSkill)) {
    const strategies = geometryStrategies(source);

    // Geometry that refers to a missing picture/figure cannot be reconstructed
    // from the answer or explanation. Leave it for media repair rather than
    // inventing topology. Narrow constructible geometry is enabled in 3B.
    return result(
      explicitMissingVisualReference(source) ? "missing_required_media" : "required",
      false,
      strategies,
      0.98,
      [
        explicitMissingVisualReference(source)
          ? "QUIZ_VISUAL_MISSING_REQUIRED_MEDIA"
          : "QUIZ_VISUAL_REQUIRED",
        "QUIZ_VISUAL_REQUIRED_UNSUPPORTED",
        strategies.includes("angle_diagram")
          ? "ANGLE_REQUIRED"
          : strategies.includes("symmetry_diagram")
            ? "SYMMETRY_REQUIRED"
            : strategies.includes("solid_net")
              ? "NET_REQUIRED"
              : "GEOMETRY_REQUIRED",
        "INSUFFICIENT_STRUCTURED_DATA",
      ],
    );
  }

  if (explicitMeasurementScaleTask(source, topicSkill)) {
    return result(
      explicitMissingVisualReference(source) ? "missing_required_media" : "required",
      false,
      ["measurement_diagram"],
      0.97,
      [
        explicitMissingVisualReference(source)
          ? "QUIZ_VISUAL_MISSING_REQUIRED_MEDIA"
          : "QUIZ_VISUAL_REQUIRED",
        "QUIZ_VISUAL_REQUIRED_UNSUPPORTED",
        "MEASUREMENT_USEFUL",
      ],
    );
  }

  // Generic references to a missing picture/figure are never reconstructed by
  // guessing. If the task truly depends on the absent visual, route it to media
  // review. This includes picture graphs, mirror images, shape-counting images,
  // solid views and similar source-dependent assessment items.
  if (explicitMissingVisualReference(source)) {
    return result(
      "missing_required_media",
      false,
      [],
      0.99,
      ["QUIZ_VISUAL_MISSING_REQUIRED_MEDIA", "INSUFFICIENT_STRUCTURED_DATA"],
    );
  }

  // Deliberately exclude explanatory bar models and ordinary word-problem
  // diagrams from automatic quiz generation. They may still be excellent
  // Teaching Engine representations later.
  if (
    /\b(?:ratio|more than|less than|fewer than|greater than|altogether|in total|shared equally|each group|per group)\b/i.test(source) ||
    containsAny(topicSkill, ["ratio", "problem solving", "word problem"])
  ) {
    return result(
      "optional_enrichment",
      false,
      ["none"],
      0.98,
      ["QUIZ_VISUAL_OPTIONAL_ENRICHMENT", "QUIZ_VISUAL_MANUAL_MEDIA_PREFERRED"],
    );
  }

  // Place-value bundles, coins, real-world objects and similar contextual
  // questions may benefit from a high-quality uploaded illustration, but a V2
  // mathematical diagram is not intrinsic to the assessment task.
  if (
    /\b(?:bundle|bundles|stick|sticks|matchstick|matchsticks|coin|coins|note|notes|balloon|balloons|toy|toys|apple|apples|pencil|pencils|bird|birds|chicken|chickens|duck|ducks)\b/i.test(source) ||
    containsAny(topicSkill, ["place value", "money"])
  ) {
    return result(
      "optional_enrichment",
      false,
      ["none"],
      0.98,
      ["QUIZ_VISUAL_OPTIONAL_ENRICHMENT", "QUIZ_VISUAL_MANUAL_MEDIA_PREFERRED"],
    );
  }

  if (looksLikeDirectOrSymbolicTask(sourceLower)) {
    return result(
      "not_needed",
      false,
      ["none"],
      0.99,
      ["QUIZ_VISUAL_NOT_NEEDED", "DIRECT_CALCULATION"],
    );
  }

  if (looksLikeContextualEnrichmentCandidate(source, topicSkill)) {
    return result(
      "optional_enrichment",
      false,
      ["none"],
      0.94,
      ["QUIZ_VISUAL_OPTIONAL_ENRICHMENT", "QUIZ_VISUAL_MANUAL_MEDIA_PREFERRED"],
    );
  }

  return result(
    "not_needed",
    false,
    ["none"],
    0.9,
    ["QUIZ_VISUAL_NOT_NEEDED"],
  );
}
