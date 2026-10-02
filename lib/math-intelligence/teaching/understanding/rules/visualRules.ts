import type {
  CanonicalTeachingQuestion,
} from "../../canonical";

import type {
  MathematicalDomain,
  ProblemStructure,
  TeachingVisualContext,
} from "../types";

import { lower } from "./text";

const KNOWN_MATH_VISUAL_STRATEGIES =
  new Set([
    "bar_model",
    "bar_model_comparison",
    "bar_chart",
    "fraction_bar",
    "fraction_model",
    "number_line",
    "polygon_geometry",
    "geometry",
    "grid",
    "table",
    "pictograph",
    "balance",
    "clock",
    "measurement_scale",
    "preserve_media",
  ]);

function mediaSemanticText(
  question: CanonicalTeachingQuestion,
): string {
  return lower(
    question.media.originalMedia
      .map((media) =>
        [
          media.altText,
          media.title,
          media.url,
          media.storagePath,
        ]
          .filter(Boolean)
          .join(" "),
      )
      .join(" "),
  );
}

export function inferTeachingVisualContext(args: {
  question: CanonicalTeachingQuestion;
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
}): TeachingVisualContext {
  const {
    question,
    domain,
    problemStructure,
  } = args;

  const media =
    question.media.originalMedia;
  const generated =
    question.media.generatedV2Visual;

  const hasVisual =
    media.length > 0 ||
    Boolean(generated?.exists);

  if (!hasVisual) {
    return {
      hasVisual: false,
      role:
        "decorative_or_irrelevant",
      mathematicalDependency:
        "not_required",
      potentiallyManipulable: false,
      sourceMedia: [],
      generatedV2: generated
        ? {
            exists: generated.exists,
            status: generated.status,
            strategy: generated.strategy,
            generatorVersion:
              generated.generatorVersion,
            hasSpec:
              generated.spec !== null,
          }
        : null,
      reasonCodes: ["NO_VISUAL"],
    };
  }

  const prompt = lower(
    `${question.content.instruction ?? ""} ${question.content.prompt}`,
  );

  const semantic =
    mediaSemanticText(question);

  const strategy = lower(
    [
      generated?.strategy,
      question.intelligence
        .problemStructure,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const promptRequiresVisual =
    /\bdiagram\b|\bfigure\b|\bpicture\b|\bgraph\b|\bchart\b|\btable\b|\bgrid\b|\bshown\b|\bbelow\b|\babove\b|\bstudy\b|\bobject\b|\bshape\b|\bsolid\b|\bclock\b|\bbalance\b/.test(
      prompt,
    );

  const semanticMathVisual =
    /\bbar model\b|\bfraction\b|\bnumber line\b|\bgrid\b|\bgraph\b|\bchart\b|\bpictograph\b|\bbalance\b|\bscale\b|\bclock\b|\bgeometry\b|\btriangle\b|\bsquare\b|\brectangle\b|\bcircle\b|\bangle\b|\bparallel\b|\bperpendicular\b|\bunit\b|\bwhole\b|\bshaded\b|\baxis\b/.test(
      semantic,
    );

  const knownStrategy =
    [...KNOWN_MATH_VISUAL_STRATEGIES].some(
      (item) =>
        strategy.includes(item),
    );

  const intrinsicallyVisualStructure =
    [
      "systematic_counting",
      "area",
      "perimeter",
      "angle",
      "shape_properties",
      "property_matching",
      "shape_composition",
      "data_reading",
      "data_comparison",
      "measure_compare",
      "time_reading",
    ].includes(problemStructure);

  const svgPresent = media.some(
    (item) =>
      item.mediaType === "svg",
  );

  const optionVisuals =
    media.some(
      (item) =>
        item.role === "option_asset",
    );

  const mathVisual =
    Boolean(generated?.exists) ||
    knownStrategy ||
    semanticMathVisual ||
    (
      svgPresent &&
      (
        intrinsicallyVisualStructure ||
        domain !== "unknown"
      )
    ) ||
    (
      optionVisuals &&
      [
        "geometry",
        "measurement",
        "data",
        "fractions",
        "money",
        "time",
      ].includes(domain)
    );

  const reasonCodes: string[] = [];

  if (generated?.exists) {
    reasonCodes.push(
      "GENERATED_V2_VISUAL",
    );
  }

  if (knownStrategy) {
    reasonCodes.push(
      "KNOWN_MATH_VISUAL_STRATEGY",
    );
  }

  if (semanticMathVisual) {
    reasonCodes.push(
      "SEMANTIC_MATH_VISUAL",
    );
  }

  if (svgPresent) {
    reasonCodes.push(
      "SVG_VISUAL",
    );
  }

  if (optionVisuals) {
    reasonCodes.push(
      "OPTION_VISUALS",
    );
  }

  if (
    mathVisual
  ) {
    const required =
      promptRequiresVisual ||
      [
        "systematic_counting",
        "data_reading",
        "property_matching",
        "time_reading",
      ].includes(problemStructure);

    return {
      hasVisual: true,
      role: "mathematical_diagram",
      mathematicalDependency:
        required
          ? "required"
          : "useful",
      potentiallyManipulable:
        Boolean(generated?.spec) ||
        svgPresent ||
        optionVisuals
          ? true
          : "unknown",
      sourceMedia: media,
      generatedV2: generated
        ? {
            exists: generated.exists,
            status: generated.status,
            strategy: generated.strategy,
            generatorVersion:
              generated.generatorVersion,
            hasSpec:
              generated.spec !== null,
          }
        : null,
      reasonCodes,
    };
  }

  if (promptRequiresVisual) {
    return {
      hasVisual: true,
      role: "reference_image",
      mathematicalDependency:
        "required",
      potentiallyManipulable: false,
      sourceMedia: media,
      generatedV2: generated
        ? {
            exists: generated.exists,
            status: generated.status,
            strategy: generated.strategy,
            generatorVersion:
              generated.generatorVersion,
            hasSpec:
              generated.spec !== null,
          }
        : null,
      reasonCodes: [
        ...reasonCodes,
        "REFERENCE_VISUAL_REQUIRED",
      ],
    };
  }

  return {
    hasVisual: true,
    role: "reference_image",
    mathematicalDependency: "useful",
    potentiallyManipulable: false,
    sourceMedia: media,
    generatedV2: generated
      ? {
          exists: generated.exists,
          status: generated.status,
          strategy: generated.strategy,
          generatorVersion:
            generated.generatorVersion,
          hasSpec:
            generated.spec !== null,
        }
      : null,
    reasonCodes: [
      ...reasonCodes,
      "REFERENCE_VISUAL",
    ],
  };
}
