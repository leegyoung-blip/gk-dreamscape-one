import type {
  AnswerValidationStatus,
  CurriculumContext,
  MathematicalDomain,
  ProblemStructure,
} from "../types";

function normalizedTopic(
  value: string | null,
): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function topicDomain(
  topic: string | null,
): MathematicalDomain {
  const exact: Record<string, MathematicalDomain> = {
    "whole numbers": "whole_numbers",
    "whole numbers and operations": "whole_numbers",
    "whole numbers and algebra": "algebra",
    fractions: "fractions",
    "fractions and decimals": "fractions",
    decimals: "decimals",
    percentage: "percentage",
    "ratio and proportion": "ratio",
    "ratio and rate": "ratio",
    geometry: "geometry",
    circles: "geometry",
    measurement: "measurement",
    money: "money",
    data: "data",
    average: "average",
    time: "time",
  };

  return exact[normalizedTopic(topic)] ?? "unknown";
}

function domainsSupportEachOther(
  a: MathematicalDomain,
  b: MathematicalDomain,
): boolean {
  if (a === b) return true;

  const pair = new Set([a, b]);

  // Whole-number word problems frequently surface prompt evidence as
  // arithmetic. Treat that as corroborating evidence, not disagreement.
  if (
    pair.has("whole_numbers") &&
    pair.has("arithmetic")
  ) {
    return true;
  }

  // Money is a recognised refinement of the broader Measurement family.
  if (
    pair.has("measurement") &&
    pair.has("money")
  ) {
    return true;
  }

  return false;
}

function looksGenericStructureReason(
  reasonCode: string,
): boolean {
  return (
    /(?:^|_)GENERIC(?:_|$)/.test(reasonCode) ||
    /(?:^|_)FALLBACK(?:_|$)/.test(reasonCode)
  );
}

export type CurrentEvidenceStrength = {
  primarySkillSupportsDomain: boolean;
  exactTopicSupportsDomain: boolean;
  promptSupportsDomain: boolean;
  answerSupportsInterpretation: boolean;
  supportingSignalCount: number;
  hasCurriculumAnchor: boolean;
  structureIsStrong: boolean;
  structureIsGeneric: boolean;
  safeToSupersedeDomain: boolean;
  safeToSupersedeStructure: boolean;
  reasonCodes: string[];
};

export function evaluateCurrentEvidenceStrength(args: {
  resolvedDomain: MathematicalDomain;
  curriculum: CurriculumContext;
  promptDomain: MathematicalDomain;
  promptConfidence: number;
  problemStructure: ProblemStructure;
  structureConfidence: number;
  structureReasonCode: string;
  answerStatus: AnswerValidationStatus;
  baselineDomainEvidenceWins?: boolean;
}): CurrentEvidenceStrength {
  const {
    resolvedDomain,
    curriculum,
    promptDomain,
    promptConfidence,
    problemStructure,
    structureConfidence,
    structureReasonCode,
    answerStatus,
    baselineDomainEvidenceWins = false,
  } = args;

  const primarySkillSupportsDomain =
    curriculum.selectedSource === "primary_skill" &&
    curriculum.primarySkill !== null &&
    curriculum.confidence >= 0.88 &&
    domainsSupportEachOther(
      curriculum.inferredDomain,
      resolvedDomain,
    );

  const exactTopicSupportsDomain =
    domainsSupportEachOther(
      topicDomain(curriculum.topic),
      resolvedDomain,
    ) &&
    topicDomain(curriculum.topic) !== "unknown";

  const promptSupportsDomain =
    promptDomain !== "unknown" &&
    promptConfidence >= 0.82 &&
    domainsSupportEachOther(
      promptDomain,
      resolvedDomain,
    );

  const answerSupportsInterpretation =
    answerStatus === "matched";

  const supportingSignalCount = [
    primarySkillSupportsDomain,
    exactTopicSupportsDomain,
    promptSupportsDomain,
    answerSupportsInterpretation,
  ].filter(Boolean).length;

  const hasCurriculumAnchor =
    primarySkillSupportsDomain ||
    exactTopicSupportsDomain;

  const structureIsGeneric =
    looksGenericStructureReason(
      structureReasonCode,
    );

  const structureIsStrong =
    problemStructure !== "unknown" &&
    structureConfidence >= 0.82 &&
    !structureIsGeneric;

  const noAnswerContradiction =
    answerStatus !== "mismatched";

  /*
   * C2B arbitration rule:
   * - MI can only be superseded by CURRENT evidence, never by confidence alone.
   * - There must be an explicit curriculum anchor (primary skill or exact topic).
   * - At least one second independent current signal must corroborate it.
   * - The deterministic structure must be resolved and strong.
   * - Generic/fallback structures and answer mismatches can never supersede MI.
   */
  const baselineDomainSupersession =
    baselineDomainEvidenceWins &&
    structureIsStrong &&
    noAnswerContradiction;

  const strictDomainSupersession =
    resolvedDomain !== "unknown" &&
    hasCurriculumAnchor &&
    supportingSignalCount >= 2 &&
    structureIsStrong &&
    noAnswerContradiction;

  const safeToSupersedeDomain =
    baselineDomainSupersession ||
    strictDomainSupersession;

  /*
   * Structure supersession is deliberately stricter than domain supersession.
   * Fractions are excluded here because Phase 4A-2C-3 owns the fraction-family
   * structure rebuild. This prevents C2B from masking genuine fraction gaps.
   */
  const baselineStructureSupersession =
    structureConfidence >= 0.9 &&
    !structureIsGeneric &&
    noAnswerContradiction &&
    (
      answerSupportsInterpretation ||
      baselineDomainEvidenceWins
    );

  const strictStructureSupersession =
    strictDomainSupersession &&
    resolvedDomain !== "fractions" &&
    structureConfidence >= 0.86;

  const safeToSupersedeStructure =
    baselineStructureSupersession ||
    strictStructureSupersession;

  const reasonCodes: string[] = [];

  if (primarySkillSupportsDomain) {
    reasonCodes.push(
      "ARBITRATION_PRIMARY_SKILL_SUPPORT",
    );
  }

  if (exactTopicSupportsDomain) {
    reasonCodes.push(
      "ARBITRATION_EXACT_TOPIC_SUPPORT",
    );
  }

  if (promptSupportsDomain) {
    reasonCodes.push(
      "ARBITRATION_PROMPT_SUPPORT",
    );
  }

  if (answerSupportsInterpretation) {
    reasonCodes.push(
      "ARBITRATION_ANSWER_MATCH_SUPPORT",
    );
  }

  if (baselineDomainEvidenceWins) {
    reasonCodes.push(
      "ARBITRATION_C2A_BASELINE_SUPPORT",
    );
  }

  if (structureIsStrong) {
    reasonCodes.push(
      "ARBITRATION_STRONG_STRUCTURE",
    );
  }

  if (structureIsGeneric) {
    reasonCodes.push(
      "ARBITRATION_GENERIC_STRUCTURE_BLOCK",
    );
  }

  if (answerStatus === "mismatched") {
    reasonCodes.push(
      "ARBITRATION_ANSWER_MISMATCH_BLOCK",
    );
  }

  return {
    primarySkillSupportsDomain,
    exactTopicSupportsDomain,
    promptSupportsDomain,
    answerSupportsInterpretation,
    supportingSignalCount,
    hasCurriculumAnchor,
    structureIsStrong,
    structureIsGeneric,
    safeToSupersedeDomain,
    safeToSupersedeStructure,
    reasonCodes,
  };
}
