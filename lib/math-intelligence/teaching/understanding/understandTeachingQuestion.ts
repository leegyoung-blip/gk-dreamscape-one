import type {
  CanonicalTeachingPart,
  CanonicalTeachingQuestion,
} from "../canonical";

import type {
  MathematicalDomain,
  TeachingPartUnderstanding,
  TeachingQuestionUnderstanding,
  UnderstandTeachingQuestionInput,
  UnderstandingEvidence,
  UnderstandingIssue,
} from "./types";

import {
  clamp01,
  lower,
  normalizeSpace,
  unique,
} from "./rules/text";

import {
  buildCurriculumContext,
} from "./rules/curriculumContext";

import {
  normalizeMathDomain,
} from "./rules/normalizeDomain";

import {
  analyzeProblemStructure,
  mergeReasoning,
} from "./rules/structureRules";

import {
  detectUnits,
  extractQuantities,
} from "./rules/quantityExtraction";

import {
  extractTarget,
} from "./rules/targetRules";

import {
  inferTeachingVisualContext,
} from "./rules/visualRules";

import {
  compareDomains,
  compareStructures,
} from "./rules/compatibilityRules";

import {
  validateComputedAnswer,
} from "./rules/answerValidation";

import {
  determineTeachingReadiness,
} from "./rules/readinessGate";

function inferPromptDomain(
  text: string,
): {
  domain: MathematicalDomain;
  confidence: number;
  code: string;
} {
  const t = lower(text);

  if (
    /\baverage\b|\bmean\b/.test(t)
  ) {
    return {
      domain: "average",
      confidence: 0.96,
      code: "PROMPT_DOMAIN_AVERAGE",
    };
  }

  if (
    /\baverage speed\b|\bspeed\b|\bkm\/h\b|\bm\/s\b/.test(
      t,
    )
  ) {
    return {
      domain: "speed_rate",
      confidence: 0.97,
      code: "PROMPT_DOMAIN_SPEED",
    };
  }

  if (
    /\bpercentage\b|\bpercent\b|%/.test(
      t,
    )
  ) {
    return {
      domain: "percentage",
      confidence: 0.97,
      code:
        "PROMPT_DOMAIN_PERCENTAGE",
    };
  }

  if (
    /\bratio\b|\b\d+\s*:\s*\d+\b/.test(
      t,
    )
  ) {
    return {
      domain: "ratio",
      confidence: 0.96,
      code: "PROMPT_DOMAIN_RATIO",
    };
  }

  if (
    /\bfraction\b|\b\d+\s*\/\s*\d+\b/.test(
      t,
    )
  ) {
    return {
      domain: "fractions",
      confidence: 0.95,
      code:
        "PROMPT_DOMAIN_FRACTIONS",
    };
  }

  if (
    /\bmoney\b|\bnotes?\b|\bcosts?\b|\bprice\b|\bchange\b|\$\s*\d|\d\s*¢/.test(
      t,
    ) ||
    (
      /\bcoins?\b/.test(t) &&
      /\b(?:cent|cents|dollar|dollars|worth|value|cost|price)\b|\$|¢/.test(t)
    )
  ) {
    return {
      domain: "money",
      confidence: 0.96,
      code: "PROMPT_DOMAIN_MONEY",
    };
  }

  if (
    /\bclock\b|\bo'clock\b|\bduration\b|\bminutes?\b|\bhours?\b|\bseconds?\b/.test(
      t,
    )
  ) {
    return {
      domain: "time",
      confidence: 0.92,
      code: "PROMPT_DOMAIN_TIME",
    };
  }

  if (
    /\bgraph\b|\bchart\b|\bpictograph\b|\bdata\b|\bsurvey\b|\blist\b/.test(
      t,
    )
  ) {
    return {
      domain: "data",
      confidence: 0.92,
      code: "PROMPT_DOMAIN_DATA",
    };
  }

  if (
    /\barea\b|\bperimeter\b|\bangle\b|\btriangle\b|\brectangle\b|\bsquare\b|\bcircle\b|\bcube\b|\bcuboid\b|\bsolid\b|\bparallel\b|\bperpendicular\b|\bsymmetr|\bgrid\b/.test(
      t,
    )
  ) {
    return {
      domain: "geometry",
      confidence: 0.9,
      code:
        "PROMPT_DOMAIN_GEOMETRY",
    };
  }

  if (
    /\blength\b|\bmass\b|\bcapacity\b|\bvolume\b|\bheavier\b|\blighter\b|\bcm\b|\bmm\b|\bkm\b|\bkg\b|\bml\b/.test(
      t,
    )
  ) {
    return {
      domain: "measurement",
      confidence: 0.9,
      code:
        "PROMPT_DOMAIN_MEASUREMENT",
    };
  }

  if (
    /\bsimplify\b|\bequation\b|\bmissing number\b|[□★△○◇]/.test(
      t,
    )
  ) {
    return {
      domain: "algebra",
      confidence: 0.88,
      code: "PROMPT_DOMAIN_ALGEBRA",
    };
  }

  if (
    /\bpattern\b|\bsequence\b|\bcomes next\b/.test(
      t,
    )
  ) {
    return {
      domain: "patterns",
      confidence: 0.88,
      code:
        "PROMPT_DOMAIN_PATTERNS",
    };
  }

  if (
    /\bplace value\b|\btens?\b|\bones?\b|\bhundreds?\b|\bnumber word\b|\bnumeral\b/.test(
      t,
    )
  ) {
    return {
      domain: "whole_numbers",
      confidence: 0.86,
      code:
        "PROMPT_DOMAIN_WHOLE_NUMBERS",
    };
  }

  if (
    /[+\-−×÷=]/.test(text) ||
    /\badd\b|\bsubtract\b|\bmultiply\b|\bdivide\b/.test(
      t,
    )
  ) {
    return {
      domain: "arithmetic",
      confidence: 0.82,
      code:
        "PROMPT_DOMAIN_ARITHMETIC",
    };
  }

  if (
    /\bhow many\b|\bnumber\b|\baltogether\b|\bin all\b|\bleft\b|\bremaining\b|\bmore than\b|\bfewer than\b/.test(
      t,
    )
  ) {
    return {
      domain: "whole_numbers",
      confidence: 0.68,
      code:
        "PROMPT_DOMAIN_WHOLE_NUMBERS_CONTEXT",
    };
  }

  return {
    domain: "unknown",
    confidence: 0.2,
    code: "PROMPT_DOMAIN_UNKNOWN",
  };
}

function resolveDomain(
  question: CanonicalTeachingQuestion,
  combinedText: string,
): {
  domain: MathematicalDomain;
  confidence: number;
  evidence: UnderstandingEvidence[];
} {
  const curriculum =
    buildCurriculumContext(question);

  const prompt =
    inferPromptDomain(
      combinedText,
    );

  const existing =
    normalizeMathDomain(
      question.intelligence.domain,
    );

  const evidence: UnderstandingEvidence[] =
    [
      {
        source: "curriculum",
        code:
          curriculum.reasonCodes[0] ??
          "CURRICULUM_CONTEXT",
        message:
          `Curriculum domain evidence: ${curriculum.inferredDomain}`,
        confidence:
          curriculum.confidence,
      },
      {
        source: "rules",
        code: prompt.code,
        message:
          `Prompt domain evidence: ${prompt.domain}`,
        confidence:
          prompt.confidence,
      },
    ];

  if (
    existing !== "unknown"
  ) {
    evidence.push({
      source:
        "math_intelligence",
      code:
        "EXISTING_DOMAIN_EVIDENCE",
      message:
        `Existing Math Intelligence domain: ${existing}`,
      confidence:
        question.intelligence
          .confidence,
    });
  }

  // Curriculum metadata is the strongest normal signal.
  // Prompt is allowed to refine a broad curriculum family.
  if (
    curriculum.inferredDomain !==
    "unknown"
  ) {
    if (
      curriculum.inferredDomain ===
        "measurement" &&
      prompt.domain === "money"
    ) {
      return {
        domain: "money",
        confidence: Math.max(
          curriculum.confidence,
          prompt.confidence,
        ),
        evidence,
      };
    }

    if (
      curriculum.inferredDomain ===
        "whole_numbers" &&
      prompt.domain === "arithmetic"
    ) {
      return {
        domain: "whole_numbers",
        confidence:
          curriculum.confidence,
        evidence,
      };
    }

    return {
      domain:
        curriculum.inferredDomain,
      confidence:
        curriculum.confidence,
      evidence,
    };
  }

  if (
    existing !== "unknown"
  ) {
    // Prompt may refine a broad existing family.
    if (
      existing === "measurement" &&
      prompt.domain === "money"
    ) {
      return {
        domain: "money",
        confidence: Math.max(
          prompt.confidence,
          question.intelligence
            .confidence ?? 0.7,
        ),
        evidence,
      };
    }

    if (
      prompt.domain === "unknown"
    ) {
      return {
        domain: existing,
        confidence:
          question.intelligence
            .confidence ?? 0.7,
        evidence,
      };
    }

    return {
      domain:
        prompt.confidence >= 0.94
          ? prompt.domain
          : existing,
      confidence: Math.max(
        prompt.confidence,
        question.intelligence
          .confidence ?? 0.7,
      ),
      evidence,
    };
  }

  return {
    domain: prompt.domain,
    confidence: prompt.confidence,
    evidence,
  };
}

function addUnderstandingIssues(args: {
  question: CanonicalTeachingQuestion;
  domain: MathematicalDomain;
  problemStructure:
    TeachingQuestionUnderstanding["problemStructure"];
  target:
    TeachingQuestionUnderstanding["target"];
  reasoning:
    TeachingQuestionUnderstanding["requiredReasoning"];
  answerValidation:
    TeachingQuestionUnderstanding["answerValidation"];
  domainRelationship:
    ReturnType<
      typeof compareDomains
    >["relationship"];
  structureRelationship:
    ReturnType<
      typeof compareStructures
    >["relationship"];
  confidence: number;
  curriculumDomainResolved: boolean;
}): UnderstandingIssue[] {
  const issues: UnderstandingIssue[] = [];

  if (
    !args.question.diagnostics
      .readyForUnderstanding
  ) {
    issues.push({
      severity: "blocking",
      code:
        "CANONICAL_INPUT_NOT_READY",
      message:
        "The Phase 4A-1 canonical input has blocking diagnostics.",
      path:
        "source.canonical.diagnostics",
    });
  }

  if (
    args.domain === "unknown"
  ) {
    issues.push({
      severity: "warning",
      code: "DOMAIN_UNRESOLVED",
      message:
        "The mathematical domain could not be resolved deterministically.",
      path: "domain",
    });
  }

  if (
    args.problemStructure ===
    "unknown"
  ) {
    issues.push({
      severity: "warning",
      code:
        "PROBLEM_STRUCTURE_UNRESOLVED",
      message:
        "The mathematical problem structure could not be resolved deterministically.",
      path:
        "problemStructure",
    });
  }

  if (
    !args.target ||
    args.target.kind === "unknown"
  ) {
    issues.push({
      severity: "warning",
      code: "TARGET_UNRESOLVED",
      message:
        "The learner-facing target could not be isolated confidently.",
      path: "target",
    });
  }

  if (
    args.reasoning.length === 0 ||
    args.reasoning.every(
      (item) =>
        item === "unknown",
    )
  ) {
    issues.push({
      severity: "warning",
      code:
        "REASONING_UNRESOLVED",
      message:
        "The mathematical reasoning family could not be resolved.",
      path:
        "requiredReasoning",
    });

    // Temporary compatibility issue code.
    issues.push({
      severity: "info",
      code:
        "OPERATIONS_UNRESOLVED",
      message:
        "Compatibility alias: required operations are unresolved because required reasoning is unresolved.",
      path:
        "requiredOperations",
    });
  }

  const trueConflict =
    args.domainRelationship ===
      "conflict" ||
    (
      args.structureRelationship ===
        "conflict" &&
      !args.curriculumDomainResolved
    );

  if (trueConflict) {
    const strong =
      args.confidence >= 0.85 &&
      (
        args.question.intelligence
          .confidence ?? 0
      ) >= 0.85;

    issues.push({
      severity:
        strong
          ? "blocking"
          : "warning",
      code:
        "UNDERSTANDING_CONFLICT",
      message:
        "The refined deterministic understanding conflicts with existing high-confidence Math Intelligence evidence.",
      path: "evidence",
    });
  }

  if (
    args.answerValidation.status ===
    "mismatched"
  ) {
    issues.push({
      severity: "blocking",
      code:
        "ANSWER_VALIDATION_MISMATCH",
      message:
        "The deterministic interpretation produced a result that does not match the stored answer.",
      path:
        "answerValidation",
    });
  }

  return issues;
}

function inferPartDependencies(
  parts: CanonicalTeachingPart[],
): Array<{
  fromPartKey: string;
  dependsOnPartKey: string;
  reason: string;
}> {
  const dependencies: Array<{
    fromPartKey: string;
    dependsOnPartKey: string;
    reason: string;
  }> = [];

  for (
    let index = 1;
    index < parts.length;
    index += 1
  ) {
    const part = parts[index];
    const text = lower(
      `${part.instruction ?? ""} ${part.prompt}`,
    );

    const previous =
      parts[index - 1];

    if (
      /\bhence\b|\busing your answer\b|\busing the answer\b|\bfrom part\b|\busing part\b/.test(
        text,
      )
    ) {
      dependencies.push({
        fromPartKey: part.key,
        dependsOnPartKey:
          previous.key,
        reason:
          "The wording indicates this part uses an earlier result.",
      });
    }
  }

  return dependencies;
}

function understandPart(
  part: CanonicalTeachingPart,
  parent: CanonicalTeachingQuestion,
  dependencies: ReturnType<
    typeof inferPartDependencies
  >,
): TeachingPartUnderstanding {
  const partQuestion: CanonicalTeachingQuestion =
    {
      ...parent,
      content: {
        ...parent.content,
        instruction:
          part.instruction,
        prompt: part.prompt,
        questionType:
          part.questionType,
        options: part.options,
        parts: [],
      },
      answer: part.answer,
    };

  const understanding =
    understandTeachingQuestion({
      question: partQuestion,
    });

  return {
    key: part.key,
    label: part.label,
    prompt: part.prompt,
    domain:
      understanding.domain,
    problemStructure:
      understanding.problemStructure,
    quantities:
      understanding.quantities,
    relationships:
      understanding.relationships,
    requiredReasoning:
      understanding.requiredReasoning,
    requiredOperations:
      understanding.requiredOperations,
    target:
      understanding.target,
    dependsOnPartKeys:
      dependencies
        .filter(
          (item) =>
            item.fromPartKey ===
            part.key,
        )
        .map(
          (item) =>
            item.dependsOnPartKey,
        ),
    confidence:
      understanding.confidence,
    status:
      understanding.status,
    readyForMethodSelection:
      understanding
        .readyForMethodSelection,
    issues:
      understanding.issues,
    evidence:
      understanding.evidence,
  };
}

export function understandTeachingQuestion(
  input: UnderstandTeachingQuestionInput,
): TeachingQuestionUnderstanding {
  const question =
    input.question;

  const combinedText =
    normalizeSpace(
      `${question.content.instruction ?? ""} ${question.content.prompt}`,
    );

  const curriculumContext =
    buildCurriculumContext(
      question,
    );

  const domainResolution =
    resolveDomain(
      question,
      combinedText,
    );

  const domain =
    domainResolution.domain;

  const quantities =
    extractQuantities(
      combinedText,
    );

  const units =
    detectUnits(quantities);

  const structure =
    analyzeProblemStructure({
      text: combinedText,
      domain,
      curriculum:
        curriculumContext,
    });

  const requiredReasoning =
    mergeReasoning(
      structure.requiredReasoning,
      combinedText,
    );

  const target =
    extractTarget(
      combinedText,
      domain,
    );

  const answerValidation =
    validateComputedAnswer({
      answer: question.answer,
      computedAnswer:
        structure.computedAnswer,
    });

  const domainComparison =
    compareDomains({
      resolved: domain,
      existingRaw:
        question.intelligence.domain,
      curriculum:
        curriculumContext
          .inferredDomain,
    });

  const structureComparison =
    compareStructures({
      resolved:
        structure.problemStructure,
      existingRaw:
        question.intelligence
          .problemStructure,
    });

  const evidence: UnderstandingEvidence[] =
    [
      {
        source: "canonical",
        code:
          "CANONICAL_INPUT_RECEIVED",
        message:
          "Teaching understanding was derived from the Phase 4A-1 canonical input.",
        confidence: null,
      },
      ...domainResolution.evidence,
      {
        source: "rules",
        code:
          structure.reasonCode,
        message:
          `Deterministic problem structure: ${structure.problemStructure}`,
        confidence:
          structure.confidence,
      },
    ];

  if (
    domainComparison.relationship
  ) {
    evidence.push({
      source:
        "math_intelligence",
      code:
        "DOMAIN_COMPATIBILITY",
      message:
        `Existing domain ${domainComparison.existing} is ${domainComparison.relationship} with refined domain ${domain}.`,
      confidence:
        question.intelligence
          .confidence,
      relationship:
        domainComparison.relationship,
    });
  }

  if (
    structureComparison.relationship
  ) {
    evidence.push({
      source:
        "math_intelligence",
      code:
        "STRUCTURE_COMPATIBILITY",
      message:
        `Existing structure ${structureComparison.existing} is ${structureComparison.relationship} with refined structure ${structure.problemStructure}.`,
      confidence:
        question.intelligence
          .confidence,
      relationship:
        structureComparison.relationship,
    });
  }

  if (
    answerValidation.status ===
    "matched"
  ) {
    evidence.push({
      source:
        "answer_validation",
      code:
        "ANSWER_VALIDATION_MATCHED",
      message:
        "The deterministic interpretation produced a result consistent with the stored answer.",
      confidence: 1,
      relationship: "match",
    });
  }

  const confidence =
    clamp01(
      (
        domainResolution
          .confidence +
        structure.confidence
      ) /
        2,
    );

  const issues =
    addUnderstandingIssues({
      question,
      domain,
      problemStructure:
        structure.problemStructure,
      target,
      reasoning:
        requiredReasoning,
      answerValidation,
      domainRelationship:
        domainComparison.relationship,
      structureRelationship:
        structureComparison.relationship,
      confidence,
      curriculumDomainResolved:
        curriculumContext.inferredDomain !==
        "unknown",
    });

  const readiness =
    determineTeachingReadiness({
      canonicalReady:
        question.diagnostics
          .readyForUnderstanding,
      domain,
      problemStructure:
        structure.problemStructure,
      target,
      requiredReasoning,
      answerValidation,
      issues,
      confidence,
    });

  const visualContext =
    inferTeachingVisualContext({
      question,
      domain,
      problemStructure:
        structure.problemStructure,
    });

  const dependencies =
    inferPartDependencies(
      question.content.parts,
    );

  const parts =
    question.content.parts.map(
      (part) =>
        understandPart(
          part,
          question,
          dependencies,
        ),
    );

  return {
    schemaVersion: "4A-2.2",
    questionId:
      question.identity
        .questionId,
    learnerLevel:
      question.teaching
        .learnerLevel,

    curriculumContext,

    domain,
    problemStructure:
      structure.problemStructure,

    quantities,
    relationships:
      structure.relationships,

    requiredReasoning,
    requiredOperations:
      [...requiredReasoning],

    constraints: [],
    units,

    target,

    visualContext,

    multipart: {
      hasParts:
        question.content.parts
          .length > 0,
      parts,
      dependencies,
    },

    answerValidation,

    confidence,
    status:
      readiness.status,
    readyForMethodSelection:
      readiness
        .readyForMethodSelection,

    issues,
    evidence,

    source: {
      canonical: question,
    },
  };
}
