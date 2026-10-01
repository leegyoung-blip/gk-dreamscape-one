import type {
  CanonicalAnswerContext,
  CanonicalTeachingPart,
  CanonicalTeachingQuestion,
} from "../canonical";

import type {
  AnswerValidation,
  MathematicalDomain,
  MathematicalQuantity,
  MathematicalRelationship,
  Manipulability,
  ProblemStructure,
  RequiredOperation,
  TeachingPartUnderstanding,
  TeachingQuestionUnderstanding,
  TeachingTarget,
  TeachingUnderstandingStatus,
  TeachingVisualContext,
  UnderstandTeachingQuestionInput,
  UnderstandingEvidence,
  UnderstandingIssue,
  VisualDependency,
  VisualRole,
} from "./types";

type LocalAnalysis = {
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
  quantities: MathematicalQuantity[];
  relationships: MathematicalRelationship[];
  requiredOperations: RequiredOperation[];
  constraints: string[];
  units: string[];
  target: TeachingTarget | null;
  computedAnswer: string | null;
  confidence: number;
  evidence: UnderstandingEvidence[];
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function lower(value: string): string {
  return normalizeSpace(value).toLowerCase();
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function roundReasonably(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(10)));
}

function parseNumericString(value: string): number | null {
  const cleaned = value.trim().replace(/[$,]/g, "").replace(/%$/, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function answerToComparable(answer: CanonicalAnswerContext): string | null {
  const canonical = answer.canonicalAnswer;

  if (!canonical) return answer.rawAnswer?.trim() ?? null;

  switch (canonical.type) {
    case "number":
      return `${roundReasonably(canonical.value)}${canonical.unit ?? ""}`
        .replace(/\s+/g, "")
        .toLowerCase();
    case "text":
      return canonical.value.replace(/\s+/g, " ").trim().toLowerCase();
    case "option":
      return (canonical.text ?? answer.rawAnswer ?? canonical.key)
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    case "multiple_options":
      return canonical.keys.map((key) => key.toLowerCase()).sort().join("|");
    case "multipart":
      return null;
  }
}

function comparableFromComputed(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function makeQuantity(
  id: string,
  raw: string,
  sourceText: string,
  role: MathematicalQuantity["role"] = "given",
  label: string | null = null,
): MathematicalQuantity {
  const fraction = raw.match(/^(-?\d+)\s*\/\s*(\d+)$/);

  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return {
      id,
      label,
      raw,
      value: denominator !== 0 ? numerator / denominator : null,
      numerator,
      denominator,
      unit: null,
      role,
      sourceText,
    };
  }

  const moneyMatch = raw.match(/^\$\s*(-?\d[\d,]*(?:\.\d+)?)$/);
  if (moneyMatch) {
    return {
      id,
      label,
      raw,
      value: parseNumericString(moneyMatch[1]),
      numerator: null,
      denominator: null,
      unit: "$",
      role,
      sourceText,
    };
  }

  const percentageMatch = raw.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (percentageMatch) {
    return {
      id,
      label,
      raw,
      value: Number(percentageMatch[1]),
      numerator: null,
      denominator: null,
      unit: "%",
      role,
      sourceText,
    };
  }

  const unitMatch = raw.match(
    /^(-?\d[\d,]*(?:\.\d+)?)\s*(mm|cm|m|km|g|kg|ml|l|s|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours|°|degrees?)$/i,
  );

  if (unitMatch) {
    return {
      id,
      label,
      raw,
      value: parseNumericString(unitMatch[1]),
      numerator: null,
      denominator: null,
      unit: unitMatch[2],
      role,
      sourceText,
    };
  }

  return {
    id,
    label,
    raw,
    value: parseNumericString(raw),
    numerator: null,
    denominator: null,
    unit: null,
    role,
    sourceText,
  };
}

function extractQuantities(text: string): MathematicalQuantity[] {
  const results: MathematicalQuantity[] = [];
  const occupied = new Set<number>();

  const patterns: RegExp[] = [
    /\$\s*\d[\d,]*(?:\.\d+)?/g,
    /\b\d+\s*\/\s*\d+\b/g,
    /\b\d+(?:\.\d+)?\s*%/g,
    /\b\d[\d,]*(?:\.\d+)?\s*(?:mm|cm|m|km|g|kg|ml|l|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours|°|degrees?)\b/gi,
    /\b\d[\d,]*(?:\.\d+)?\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const raw = match[0];
      const positions = Array.from({ length: raw.length }, (_, i) => start + i);
      if (positions.some((position) => occupied.has(position))) continue;
      positions.forEach((position) => occupied.add(position));

      results.push(makeQuantity(`q${results.length + 1}`, raw, text));
    }
  }

  return results;
}

function detectUnits(quantities: MathematicalQuantity[]): string[] {
  return unique(
    quantities
      .map((quantity) => quantity.unit)
      .filter((unit): unit is string => Boolean(unit)),
  );
}

function detectDomainFromText(
  text: string,
): { domain: MathematicalDomain; confidence: number; code: string } {
  const t = lower(text);

  if (/\bpercentage\b|\bpercent\b|%/.test(t)) {
    return { domain: "percentage", confidence: 0.96, code: "RULE_DOMAIN_PERCENTAGE" };
  }
  if (/\bratio\b|\bratios\b|\b\d+\s*:\s*\d+\b/.test(t)) {
    return { domain: "ratio", confidence: 0.95, code: "RULE_DOMAIN_RATIO" };
  }
  if (/\bfraction\b|\bfractions\b|\b\d+\s*\/\s*\d+\b/.test(t)) {
    return { domain: "fractions", confidence: 0.93, code: "RULE_DOMAIN_FRACTIONS" };
  }
  if (/\bdecimal\b|\bdecimals\b|\b\d+\.\d+\b/.test(t)) {
    return { domain: "decimals", confidence: 0.82, code: "RULE_DOMAIN_DECIMALS" };
  }
  if (/\barea\b|\bperimeter\b|\bangle\b|\btriangle\b|\brectangle\b|\bsquare\b|\bparallel\b|\bperpendicular\b|\bsymmetr/.test(t)) {
    return { domain: "geometry", confidence: 0.9, code: "RULE_DOMAIN_GEOMETRY" };
  }
  if (/\blength\b|\bmass\b|\bvolume\b|\bcapacity\b|\bmeasure\b|\bmeasurement\b/.test(t)) {
    return { domain: "measurement", confidence: 0.9, code: "RULE_DOMAIN_MEASUREMENT" };
  }
  if (/\btime\b|\bo'clock\b|\bminutes?\b|\bhours?\b|\bduration\b/.test(t)) {
    return { domain: "time", confidence: 0.9, code: "RULE_DOMAIN_TIME" };
  }
  if (/\bdollar\b|\bdollars\b|\bcents?\b|\bcost\b|\bprice\b|\bchange\b|\$/.test(t)) {
    return { domain: "money", confidence: 0.88, code: "RULE_DOMAIN_MONEY" };
  }
  if (/\bspeed\b|\bdistance\b.*\btime\b|\brate\b/.test(t)) {
    return { domain: "speed_rate", confidence: 0.9, code: "RULE_DOMAIN_SPEED_RATE" };
  }
  if (/\bgraph\b|\bchart\b|\btable\b|\bpictograph\b|\bbar graph\b|\bdata\b/.test(t)) {
    return { domain: "data", confidence: 0.88, code: "RULE_DOMAIN_DATA" };
  }
  if (/\bpattern\b|\bsequence\b/.test(t)) {
    return { domain: "patterns", confidence: 0.86, code: "RULE_DOMAIN_PATTERNS" };
  }
  if (/\bunknown\b|\bequation\b|\b★\b/.test(t)) {
    return { domain: "algebra", confidence: 0.78, code: "RULE_DOMAIN_ALGEBRA" };
  }
  if (/[+\-×÷=]|\bplus\b|\bminus\b|\badd\b|\bsubtract\b|\bmultiply\b|\bdivide\b/.test(t)) {
    return { domain: "arithmetic", confidence: 0.86, code: "RULE_DOMAIN_ARITHMETIC" };
  }
  if (/\bmore than\b|\bfewer than\b|\bless than\b|\baltogether\b|\bin all\b|\btotal\b|\bremaining\b|\bleft\b/.test(t)) {
    return { domain: "whole_numbers", confidence: 0.7, code: "RULE_DOMAIN_WHOLE_NUMBERS" };
  }

  return { domain: "unknown", confidence: 0.2, code: "RULE_DOMAIN_UNKNOWN" };
}

function mapExistingDomain(value: string | null): MathematicalDomain {
  if (!value) return "unknown";
  const normalized = value.toLowerCase();
  const map: Record<string, MathematicalDomain> = {
    arithmetic: "arithmetic",
    whole_numbers: "whole_numbers",
    fractions: "fractions",
    decimals: "decimals",
    percentage: "percentage",
    percent: "percentage",
    ratio: "ratio",
    algebra: "algebra",
    geometry: "geometry",
    measurement: "measurement",
    time: "time",
    money: "money",
    data: "data",
    speed: "speed_rate",
    speed_rate: "speed_rate",
    word_problem: "word_problem",
    patterns: "patterns",
    logic: "logic",
  };
  return map[normalized] ?? "unknown";
}

function mapExistingProblemStructure(value: string | null): ProblemStructure {
  if (!value) return "unknown";
  const normalized = value.toLowerCase();
  const map: Record<string, ProblemStructure> = {
    direct_calculation: "direct_calculation",
    comparison: "comparison_difference",
    comparison_difference: "comparison_difference",
    part_whole: "part_whole",
    equal_groups: "equal_groups",
    sharing: "sharing",
    fraction_of_whole: "fraction_of_whole",
    percentage_of_whole: "percentage_of_whole",
    ratio_relationship: "ratio_relationship",
    unitary: "unitary",
    area: "area",
    perimeter: "perimeter",
    angle: "angle",
    shape_properties: "shape_properties",
    systematic_counting: "systematic_counting",
    pattern_rule: "pattern_rule",
    time_reading: "time_interval",
    time_interval: "time_interval",
    money_transaction: "money_transaction",
    data_reading: "data_reading",
    speed_distance_time: "speed_distance_time",
    equation_unknown: "equation_unknown",
    multi_step: "multi_step",
  };
  return map[normalized] ?? "unknown";
}

function targetFromQuestion(text: string): TeachingTarget | null {
  const sentence =
    normalizeSpace(text)
      .split(/(?<=[?.!])\s+/)
      .reverse()
      .find((item) => /\?/.test(item)) ?? null;

  if (!sentence) return null;

  return {
    kind: "unknown",
    label: sentence.replace(/\?+$/, "").trim(),
    quantityId: null,
    sourceText: sentence,
  };
}

function relationship(
  type: MathematicalRelationship["type"],
  expression: string | null,
  sourceText: string,
  confidence: number,
): MathematicalRelationship {
  return {
    id: "r1",
    type,
    left: null,
    right: null,
    expression,
    sourceText,
    confidence,
  };
}

function detectProblemStructure(
  text: string,
  domain: MathematicalDomain,
): {
  structure: ProblemStructure;
  operations: RequiredOperation[];
  relationships: MathematicalRelationship[];
  target: TeachingTarget | null;
  computedAnswer: string | null;
  confidence: number;
  code: string;
} {
  const t = lower(text);

  const simpleCalc = t.match(/(-?\d[\d,]*(?:\.\d+)?)\s*([+\-×x*÷/])\s*(-?\d[\d,]*(?:\.\d+)?)\s*(?:=|\?|$)/i);
  if (simpleCalc) {
    const left = parseNumericString(simpleCalc[1]);
    const op = simpleCalc[2];
    const right = parseNumericString(simpleCalc[3]);

    if (left !== null && right !== null) {
      let answer: number | null = null;
      let operation: RequiredOperation = "unknown";
      let type: MathematicalRelationship["type"] = "unknown";

      if (op === "+") {
        answer = left + right;
        operation = "addition";
        type = "sum";
      } else if (op === "-") {
        answer = left - right;
        operation = "subtraction";
        type = "difference";
      } else if (["×", "x", "*"].includes(op)) {
        answer = left * right;
        operation = "multiplication";
        type = "product";
      } else if (["÷", "/"].includes(op) && right !== 0) {
        answer = left / right;
        operation = "division";
        type = "quotient";
      }

      return {
        structure: "direct_calculation",
        operations: [operation],
        relationships: [relationship(type, `${left} ${op} ${right}`, simpleCalc[0], 0.99)],
        target: { kind: "value", label: "answer", quantityId: null, sourceText: simpleCalc[0] },
        computedAnswer: answer === null ? null : roundReasonably(answer),
        confidence: 0.99,
        code: "RULE_STRUCTURE_DIRECT_CALCULATION",
      };
    }
  }

  const fractionOf = t.match(/(\d+)\s*\/\s*(\d+)\s+of\s+(\d[\d,]*(?:\.\d+)?)/);
  if (fractionOf) {
    const numerator = Number(fractionOf[1]);
    const denominator = Number(fractionOf[2]);
    const whole = parseNumericString(fractionOf[3]);
    return {
      structure: "fraction_of_whole",
      operations: ["fraction_multiplication"],
      relationships: [relationship("fraction_of", `${numerator}/${denominator} of ${whole ?? "?"}`, fractionOf[0], 0.98)],
      target: targetFromQuestion(text),
      computedAnswer: whole !== null && denominator !== 0 ? roundReasonably((numerator / denominator) * whole) : null,
      confidence: 0.98,
      code: "RULE_STRUCTURE_FRACTION_OF_WHOLE",
    };
  }

  const percentageOf = t.match(/(\d+(?:\.\d+)?)\s*%\s+of\s+(\d[\d,]*(?:\.\d+)?)/);
  if (percentageOf) {
    const percent = Number(percentageOf[1]);
    const whole = parseNumericString(percentageOf[2]);
    return {
      structure: "percentage_of_whole",
      operations: ["percentage"],
      relationships: [relationship("percentage_of", `${percent}% of ${whole ?? "?"}`, percentageOf[0], 0.98)],
      target: targetFromQuestion(text),
      computedAnswer: whole !== null ? roundReasonably((percent / 100) * whole) : null,
      confidence: 0.98,
      code: "RULE_STRUCTURE_PERCENTAGE_OF_WHOLE",
    };
  }

  if (/\bhow many\b.*\b(?:2\s*[×x]\s*2|3\s*[×x]\s*3|squares?|rectangles?)\b/.test(t) && /\bgrid\b|\bdiagram\b/.test(t)) {
    return {
      structure: "systematic_counting",
      operations: ["counting", "spatial_reasoning"],
      relationships: [relationship("count_valid_positions", null, text, 0.95)],
      target: { kind: "count", label: targetFromQuestion(text)?.label ?? "number of valid shapes", quantityId: null, sourceText: targetFromQuestion(text)?.sourceText ?? null },
      computedAnswer: null,
      confidence: 0.95,
      code: "RULE_STRUCTURE_SYSTEMATIC_COUNTING",
    };
  }

  if (/\barea\b/.test(t)) {
    return {
      structure: "area",
      operations: ["area_calculation"],
      relationships: [relationship("area", null, text, 0.92)],
      target: { kind: "area", label: targetFromQuestion(text)?.label ?? "area", quantityId: null, sourceText: targetFromQuestion(text)?.sourceText ?? null },
      computedAnswer: null,
      confidence: 0.92,
      code: "RULE_STRUCTURE_AREA",
    };
  }

  if (/\bperimeter\b/.test(t)) {
    return {
      structure: "perimeter",
      operations: ["perimeter_calculation"],
      relationships: [relationship("perimeter", null, text, 0.92)],
      target: { kind: "perimeter", label: targetFromQuestion(text)?.label ?? "perimeter", quantityId: null, sourceText: targetFromQuestion(text)?.sourceText ?? null },
      computedAnswer: null,
      confidence: 0.92,
      code: "RULE_STRUCTURE_PERIMETER",
    };
  }

  if (/\bangle\b|∠/.test(text)) {
    return {
      structure: "angle",
      operations: ["spatial_reasoning"],
      relationships: [relationship("unknown", null, text, 0.9)],
      target: { kind: "angle", label: targetFromQuestion(text)?.label ?? "angle", quantityId: null, sourceText: targetFromQuestion(text)?.sourceText ?? null },
      computedAnswer: null,
      confidence: 0.9,
      code: "RULE_STRUCTURE_ANGLE",
    };
  }

  if (/\bratio\b|\b\d+\s*:\s*\d+\b/.test(t)) {
    return {
      structure: "ratio_relationship",
      operations: ["ratio_scaling"],
      relationships: [relationship("ratio", null, text, 0.88)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.88,
      code: "RULE_STRUCTURE_RATIO",
    };
  }

  if (/\bfewer than\b|\bless than\b|\bmore than\b|\bdifference\b/.test(t)) {
    const type: MathematicalRelationship["type"] = /\bmore than\b/.test(t) ? "more_than" : /\bfewer than\b|\bless than\b/.test(t) ? "less_than" : "difference";
    return {
      structure: "comparison_difference",
      operations: ["comparison", type === "less_than" ? "subtraction" : "unknown"],
      relationships: [relationship(type, null, text, 0.82)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.82,
      code: "RULE_STRUCTURE_COMPARISON",
    };
  }

  if (/\bpattern\b|\bsequence\b/.test(t)) {
    return {
      structure: "pattern_rule",
      operations: ["pattern_extension"],
      relationships: [relationship("unknown", null, text, 0.86)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.86,
      code: "RULE_STRUCTURE_PATTERN",
    };
  }

  if (domain === "time") {
    return {
      structure: "time_interval",
      operations: ["time_calculation"],
      relationships: [relationship("difference", null, text, 0.82)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.82,
      code: "RULE_STRUCTURE_TIME",
    };
  }

  if (domain === "money") {
    return {
      structure: "money_transaction",
      operations: ["money_calculation"],
      relationships: [relationship("unknown", null, text, 0.8)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.8,
      code: "RULE_STRUCTURE_MONEY",
    };
  }

  if (domain === "data") {
    return {
      structure: "data_reading",
      operations: ["data_interpretation"],
      relationships: [relationship("unknown", null, text, 0.85)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.85,
      code: "RULE_STRUCTURE_DATA",
    };
  }

  if (domain === "speed_rate") {
    return {
      structure: "speed_distance_time",
      operations: ["speed_calculation"],
      relationships: [relationship("unknown", null, text, 0.88)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.88,
      code: "RULE_STRUCTURE_SPEED",
    };
  }

  if (domain === "algebra") {
    return {
      structure: "equation_unknown",
      operations: ["equation_solving"],
      relationships: [relationship("equals", null, text, 0.8)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.8,
      code: "RULE_STRUCTURE_EQUATION",
    };
  }

  if (/\baltogether\b|\bin all\b|\btotal\b|\bsum\b/.test(t)) {
    return {
      structure: "part_whole",
      operations: ["addition"],
      relationships: [relationship("sum", null, text, 0.76)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.76,
      code: "RULE_STRUCTURE_PART_WHOLE",
    };
  }

  if (/\beach\b|\bequal groups?\b|\bgroups? of\b/.test(t)) {
    return {
      structure: "equal_groups",
      operations: ["multiplication", "division"],
      relationships: [relationship("product", null, text, 0.72)],
      target: targetFromQuestion(text),
      computedAnswer: null,
      confidence: 0.72,
      code: "RULE_STRUCTURE_EQUAL_GROUPS",
    };
  }

  return {
    structure: "unknown",
    operations: ["unknown"],
    relationships: [],
    target: targetFromQuestion(text),
    computedAnswer: null,
    confidence: 0.25,
    code: "RULE_STRUCTURE_UNKNOWN",
  };
}

function analyzeText(text: string): LocalAnalysis {
  const quantities = extractQuantities(text);
  const domainRule = detectDomainFromText(text);
  const structureRule = detectProblemStructure(text, domainRule.domain);

  const evidence: UnderstandingEvidence[] = [
    {
      source: "rules",
      code: domainRule.code,
      message: `Deterministic domain classification: ${domainRule.domain}`,
      confidence: domainRule.confidence,
    },
    {
      source: "rules",
      code: structureRule.code,
      message: `Deterministic problem structure classification: ${structureRule.structure}`,
      confidence: structureRule.confidence,
    },
  ];

  const confidence =
    domainRule.domain === "unknown"
      ? structureRule.confidence * 0.8
      : (domainRule.confidence + structureRule.confidence) / 2;

  return {
    domain: domainRule.domain,
    problemStructure: structureRule.structure,
    quantities,
    relationships: structureRule.relationships,
    requiredOperations: unique(structureRule.operations),
    constraints: [],
    units: detectUnits(quantities),
    target: structureRule.target,
    computedAnswer: structureRule.computedAnswer,
    confidence: clamp01(confidence),
    evidence,
  };
}

function mergeWithMathIntelligence(
  question: CanonicalTeachingQuestion,
  deterministic: LocalAnalysis,
): {
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
  confidence: number;
  issues: UnderstandingIssue[];
  evidence: UnderstandingEvidence[];
} {
  const issues: UnderstandingIssue[] = [];
  const evidence = [...deterministic.evidence];

  const existingDomain = mapExistingDomain(question.intelligence.domain);
  const existingStructure = mapExistingProblemStructure(question.intelligence.problemStructure);
  const miConfidence = typeof question.intelligence.confidence === "number" ? question.intelligence.confidence : null;

  let domain = deterministic.domain;
  let problemStructure = deterministic.problemStructure;
  let confidence = deterministic.confidence;

  if (existingDomain !== "unknown") {
    evidence.push({
      source: "math_intelligence",
      code: "EXISTING_DOMAIN",
      message: `Existing Math Intelligence domain: ${existingDomain}`,
      confidence: miConfidence,
    });

    if (domain === "unknown") {
      domain = existingDomain;
      confidence = Math.max(confidence, miConfidence ?? 0.65);
    } else if (existingDomain !== domain && existingDomain !== "word_problem") {
      issues.push({
        severity: "warning",
        code: "UNDERSTANDING_CONFLICT",
        message: `Deterministic domain (${domain}) conflicts with existing Math Intelligence domain (${existingDomain}).`,
        path: "domain",
      });
      confidence = Math.min(confidence, 0.65);
    }
  }

  if (existingStructure !== "unknown") {
    evidence.push({
      source: "math_intelligence",
      code: "EXISTING_PROBLEM_STRUCTURE",
      message: `Existing Math Intelligence problem structure: ${existingStructure}`,
      confidence: miConfidence,
    });

    if (problemStructure === "unknown") {
      problemStructure = existingStructure;
      confidence = Math.max(confidence, miConfidence ?? 0.65);
    } else if (existingStructure !== problemStructure) {
      issues.push({
        severity: "warning",
        code: "UNDERSTANDING_CONFLICT",
        message: `Deterministic problem structure (${problemStructure}) conflicts with existing Math Intelligence structure (${existingStructure}).`,
        path: "problemStructure",
      });
      confidence = Math.min(confidence, 0.65);
    }
  }

  return { domain, problemStructure, confidence: clamp01(confidence), issues, evidence };
}

function inferVisualContext(
  question: CanonicalTeachingQuestion,
  analysis: Pick<LocalAnalysis, "domain" | "problemStructure">,
): TeachingVisualContext {
  const media = question.media.originalMedia;
  const generated = question.media.generatedV2Visual;
  const hasVisual = media.length > 0 || Boolean(generated?.exists);

  if (!hasVisual) {
    return {
      hasVisual: false,
      role: "decorative_or_irrelevant",
      mathematicalDependency: "not_required",
      potentiallyManipulable: false,
      sourceMedia: [],
      generatedV2: generated
        ? {
            exists: generated.exists,
            status: generated.status,
            strategy: generated.strategy,
            generatorVersion: generated.generatorVersion,
            hasSpec: generated.spec !== null,
          }
        : null,
      reasonCodes: ["NO_VISUAL"],
    };
  }

  const prompt = lower(question.content.prompt);
  const visualCue = /\bdiagram\b|\bfigure\b|\bgrid\b|\bgraph\b|\bchart\b|\btable\b|\bpicture\b|\bshown\b|\bbelow\b|\babove\b/.test(prompt);
  const mathVisualDomain = ["geometry", "measurement", "data", "time", "money"].includes(analysis.domain);

  let role: VisualRole = "unknown";
  let dependency: VisualDependency = "unknown";
  let manipulable: Manipulability = "unknown";
  const reasonCodes: string[] = [];

  if (generated?.exists) {
    role = "mathematical_diagram";
    dependency = visualCue || ["area", "perimeter", "angle", "systematic_counting", "data_reading"].includes(analysis.problemStructure)
      ? "required"
      : "useful";
    manipulable = generated.spec !== null ? true : "unknown";
    reasonCodes.push("GENERATED_V2_VISUAL");
  } else if (media.some((item) => item.mediaType === "svg") && (visualCue || mathVisualDomain)) {
    role = "mathematical_diagram";
    dependency = visualCue ? "required" : "useful";
    manipulable = true;
    reasonCodes.push("SVG_MATHEMATICAL_VISUAL");
  } else if (visualCue && mathVisualDomain) {
    role = "mathematical_diagram";
    dependency = "required";
    manipulable = "unknown";
    reasonCodes.push("IMAGE_MATHEMATICAL_VISUAL");
  } else if (visualCue) {
    role = "reference_image";
    dependency = "required";
    manipulable = false;
    reasonCodes.push("REFERENCE_VISUAL_CUE");
  } else {
    role = "reference_image";
    dependency = "useful";
    manipulable = false;
    reasonCodes.push("MEDIA_PRESENT_NO_MATH_CUE");
  }

  return {
    hasVisual,
    role,
    mathematicalDependency: dependency,
    potentiallyManipulable: manipulable,
    sourceMedia: media,
    generatedV2: generated
      ? {
          exists: generated.exists,
          status: generated.status,
          strategy: generated.strategy,
          generatorVersion: generated.generatorVersion,
          hasSpec: generated.spec !== null,
        }
      : null,
    reasonCodes,
  };
}

function validateAgainstAnswer(
  answer: CanonicalAnswerContext,
  computedAnswer: string | null,
): AnswerValidation {
  if (!computedAnswer) {
    return {
      status: "not_checked",
      expected: answer.rawAnswer,
      computed: null,
      reason: "No deterministic result was computed. The stored answer was not used to infer the question structure.",
    };
  }

  const expected = answerToComparable(answer);
  const computed = comparableFromComputed(computedAnswer);

  if (!expected || !computed) {
    return {
      status: "not_checked",
      expected: answer.rawAnswer,
      computed: computedAnswer,
      reason: "The stored answer or computed result could not be compared safely.",
    };
  }

  const expectedNumeric = parseNumericString(expected);
  const computedNumeric = parseNumericString(computed);
  const matched =
    expectedNumeric !== null && computedNumeric !== null
      ? Math.abs(expectedNumeric - computedNumeric) < 1e-9
      : expected === computed;

  return {
    status: matched ? "matched" : "mismatched",
    expected: answer.rawAnswer ?? expected,
    computed: computedAnswer,
    reason: matched
      ? "Deterministic understanding is consistent with the stored answer."
      : "Deterministic understanding produced a result that does not match the stored answer. The stored answer was used only for validation, not inference.",
  };
}

function determineStatus(args: {
  canonicalReady: boolean;
  domain: MathematicalDomain;
  structure: ProblemStructure;
  target: TeachingTarget | null;
  operations: RequiredOperation[];
  confidence: number;
  issues: UnderstandingIssue[];
}): TeachingUnderstandingStatus {
  if (!args.canonicalReady) return "needs_review";
  if (args.domain === "unknown" && args.structure === "unknown") return "needs_review";
  if (args.confidence < 0.5 || args.issues.some((issue) => issue.severity === "blocking")) return "needs_review";

  const unresolvedOperations = args.operations.length === 0 || args.operations.every((operation) => operation === "unknown");
  if (args.domain === "unknown" || args.structure === "unknown" || !args.target || unresolvedOperations || args.confidence < 0.78) {
    return "partial";
  }

  return "ready";
}

function inferPartDependencies(parts: CanonicalTeachingPart[]): Array<{
  fromPartKey: string;
  dependsOnPartKey: string;
  reason: string;
}> {
  const dependencies: Array<{ fromPartKey: string; dependsOnPartKey: string; reason: string }> = [];

  for (let index = 0; index < parts.length; index += 1) {
    if (index === 0) continue;
    const part = parts[index];
    const previous = parts[index - 1];
    const t = lower(`${part.instruction ?? ""} ${part.prompt}`);

    if (/\bhence\b|\busing your answer\b|\busing the answer\b|\bfrom part\b|\busing part\b/.test(t)) {
      dependencies.push({
        fromPartKey: part.key,
        dependsOnPartKey: previous.key,
        reason: "The wording explicitly indicates that this part uses an earlier result.",
      });
    }

    for (const earlier of parts.slice(0, index)) {
      const escaped = earlier.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const explicit = new RegExp(`\\bpart\\s*\\(?${escaped}\\)?\\b`, "i");
      if (explicit.test(t)) {
        dependencies.push({
          fromPartKey: part.key,
          dependsOnPartKey: earlier.key,
          reason: `The wording explicitly references part ${earlier.key}.`,
        });
      }
    }
  }

  const seen = new Set<string>();
  return dependencies.filter((dependency) => {
    const key = `${dependency.fromPartKey}->${dependency.dependsOnPartKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function understandPart(
  part: CanonicalTeachingPart,
  question: CanonicalTeachingQuestion,
  dependencies: ReturnType<typeof inferPartDependencies>,
): TeachingPartUnderstanding {
  const local = analyzeText(normalizeSpace(`${part.instruction ?? ""} ${part.prompt}`));

  const fakeQuestion: CanonicalTeachingQuestion = {
    ...question,
    content: {
      ...question.content,
      prompt: part.prompt,
      instruction: part.instruction,
      questionType: part.questionType,
      options: part.options,
      parts: [],
    },
    answer: part.answer,
  };

  const merged = mergeWithMathIntelligence(fakeQuestion, local);
  const issues = [...merged.issues];

  if (merged.domain === "unknown") issues.push({ severity: "warning", code: "DOMAIN_UNRESOLVED", message: "The mathematical domain for this part could not be resolved deterministically.", path: `multipart.parts.${part.key}.domain` });
  if (merged.problemStructure === "unknown") issues.push({ severity: "warning", code: "PROBLEM_STRUCTURE_UNRESOLVED", message: "The mathematical problem structure for this part could not be resolved deterministically.", path: `multipart.parts.${part.key}.problemStructure` });
  if (!local.target) issues.push({ severity: "warning", code: "TARGET_UNRESOLVED", message: "The target quantity for this part could not be isolated.", path: `multipart.parts.${part.key}.target` });

  const dependsOnPartKeys = dependencies.filter((dependency) => dependency.fromPartKey === part.key).map((dependency) => dependency.dependsOnPartKey);
  const status = determineStatus({
    canonicalReady: question.diagnostics.readyForUnderstanding,
    domain: merged.domain,
    structure: merged.problemStructure,
    target: local.target,
    operations: local.requiredOperations,
    confidence: merged.confidence,
    issues,
  });

  return {
    key: part.key,
    label: part.label,
    prompt: part.prompt,
    domain: merged.domain,
    problemStructure: merged.problemStructure,
    quantities: local.quantities,
    relationships: local.relationships,
    requiredOperations: local.requiredOperations,
    target: local.target,
    dependsOnPartKeys,
    confidence: merged.confidence,
    status,
    issues,
    evidence: merged.evidence,
  };
}

export function understandTeachingQuestion(
  input: UnderstandTeachingQuestionInput,
): TeachingQuestionUnderstanding {
  const question = input.question;
  const combinedText = normalizeSpace(`${question.content.instruction ?? ""} ${question.content.prompt}`);
  const local = analyzeText(combinedText);
  const merged = mergeWithMathIntelligence(question, local);

  const issues: UnderstandingIssue[] = [...merged.issues];
  const evidence: UnderstandingEvidence[] = [
    {
      source: "canonical",
      code: "CANONICAL_INPUT_RECEIVED",
      message: "Teaching understanding was derived from the Phase 4A-1 canonical input.",
      confidence: null,
    },
    ...merged.evidence,
  ];

  if (!question.diagnostics.readyForUnderstanding) {
    issues.push({
      severity: "blocking",
      code: "CANONICAL_INPUT_NOT_READY",
      message: "The Phase 4A-1 canonical input has blocking diagnostics and cannot safely proceed to teaching-method selection.",
      path: "source.canonical.diagnostics",
    });
  }

  if (merged.domain === "unknown") issues.push({ severity: "warning", code: "DOMAIN_UNRESOLVED", message: "The mathematical domain could not be resolved deterministically.", path: "domain" });
  if (merged.problemStructure === "unknown") issues.push({ severity: "warning", code: "PROBLEM_STRUCTURE_UNRESOLVED", message: "The mathematical problem structure could not be resolved deterministically.", path: "problemStructure" });
  if (!local.target) issues.push({ severity: "warning", code: "TARGET_UNRESOLVED", message: "The learner-facing target quantity could not be isolated confidently.", path: "target" });
  if (local.requiredOperations.length === 0 || local.requiredOperations.every((operation) => operation === "unknown")) {
    issues.push({ severity: "warning", code: "OPERATIONS_UNRESOLVED", message: "The mathematical operation or reasoning family could not be resolved.", path: "requiredOperations" });
  }

  const visualContext = inferVisualContext(question, { domain: merged.domain, problemStructure: merged.problemStructure });
  if (visualContext.hasVisual && visualContext.role === "unknown") issues.push({ severity: "warning", code: "VISUAL_ROLE_UNRESOLVED", message: "Visual media is present but its teaching role is unresolved.", path: "visualContext.role" });
  if (visualContext.hasVisual && visualContext.mathematicalDependency === "unknown") issues.push({ severity: "warning", code: "VISUAL_DEPENDENCY_UNRESOLVED", message: "Visual media is present but its mathematical dependency is unresolved.", path: "visualContext.mathematicalDependency" });

  const answerValidation = validateAgainstAnswer(question.answer, local.computedAnswer);
  if (answerValidation.status === "matched") {
    evidence.push({ source: "answer_validation", code: "ANSWER_VALIDATION_MATCHED", message: "The deterministic interpretation produced a result consistent with the stored answer.", confidence: 1 });
  } else if (answerValidation.status === "mismatched") {
    issues.push({ severity: "warning", code: "ANSWER_VALIDATION_MISMATCH", message: "The deterministic interpretation produced a result that does not match the stored answer. The answer was used only as a validator.", path: "answerValidation" });
    evidence.push({ source: "answer_validation", code: "ANSWER_VALIDATION_MISMATCH", message: "Stored answer and deterministic computed result differ.", confidence: 1 });
  }

  const dependencies = inferPartDependencies(question.content.parts);
  const partUnderstandings = question.content.parts.map((part) => understandPart(part, question, dependencies));

  const status = determineStatus({
    canonicalReady: question.diagnostics.readyForUnderstanding,
    domain: merged.domain,
    structure: merged.problemStructure,
    target: local.target,
    operations: local.requiredOperations,
    confidence: merged.confidence,
    issues,
  });

  const readyForMethodSelection = status !== "needs_review" && !issues.some((issue) => issue.severity === "blocking");

  return {
    schemaVersion: "4A-2.1",
    questionId: question.identity.questionId,
    learnerLevel: question.teaching.learnerLevel,
    domain: merged.domain,
    problemStructure: merged.problemStructure,
    quantities: local.quantities,
    relationships: local.relationships,
    requiredOperations: local.requiredOperations,
    constraints: local.constraints,
    units: local.units,
    target: local.target,
    visualContext,
    multipart: {
      hasParts: question.content.parts.length > 0,
      parts: partUnderstandings,
      dependencies,
    },
    answerValidation,
    confidence: merged.confidence,
    status,
    readyForMethodSelection,
    issues,
    evidence,
    source: { canonical: question },
  };
}
