import type { TeachingContractConsumerEnvelope } from "../../contract/consumer";
import {
  getPhase4BReasoningCoverageRule,
  getPhase4BStructureCoverageRule,
  isKnownPhase4BMethodFamilyId,
} from "./methodFamilyTaxonomy";
import {
  PHASE4B1_TAXONOMY_SCHEMA_VERSION,
  type Phase4B1CoverageIssue,
  type Phase4BMethodFamilyId,
  type Phase4BQuestionCoverageRequirement,
} from "./types";

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export type Phase4BQuestionCoverageBuildResult =
  | {
      status: "covered";
      requirement: Phase4BQuestionCoverageRequirement;
      issues: [];
    }
  | {
      status: "uncovered";
      requirement: Phase4BQuestionCoverageRequirement | null;
      issues: Phase4B1CoverageIssue[];
    };

export function buildPhase4BQuestionCoverageRequirement(
  envelope: TeachingContractConsumerEnvelope,
): Phase4BQuestionCoverageBuildResult {
  const issues: Phase4B1CoverageIssue[] = [];

  if (envelope.consumer !== "phase_4b_method_library") {
    return {
      status: "uncovered",
      requirement: null,
      issues: [
        {
          code: "PHASE4B_CONSUMER_NOT_READY",
          message: "Phase 4B-1 accepts only a phase_4b_method_library consumer envelope.",
          path: "consumer",
        },
      ],
    };
  }

  const contract = envelope.contract;
  const structure = contract.mathematics.problemStructure;
  const reasoning = contract.mathematics.requiredReasoning;
  const structureRule = getPhase4BStructureCoverageRule(structure);

  if (!structureRule) {
    issues.push({
      code: "UNMAPPED_STRUCTURE",
      message: `No Phase 4B method-family coverage rule exists for structure '${structure}'.`,
      path: "contract.mathematics.problemStructure",
    });
  }

  const reasoningFamilies: Phase4BMethodFamilyId[] = [];
  reasoning.forEach((reasoningValue, index) => {
    const reasoningRule = getPhase4BReasoningCoverageRule(reasoningValue);
    if (!reasoningRule) {
      issues.push({
        code: "UNMAPPED_REASONING",
        message: `No Phase 4B method-family coverage rule exists for reasoning '${reasoningValue}'.`,
        path: `contract.mathematics.requiredReasoning[${index}]`,
      });
      return;
    }
    reasoningFamilies.push(...reasoningRule.supportingFamilies);
  });

  if (!structureRule) {
    return { status: "uncovered", requirement: null, issues };
  }

  const primaryFamilies = unique(structureRule.primaryFamilies);
  const supportingFamilies = unique([
    ...structureRule.supportingFamilies,
    ...reasoningFamilies,
  ]).filter((familyId) => !primaryFamilies.includes(familyId));
  const allCandidateFamilies = unique([...primaryFamilies, ...supportingFamilies]);

  allCandidateFamilies.forEach((familyId) => {
    if (!isKnownPhase4BMethodFamilyId(familyId)) {
      issues.push({
        code: "UNKNOWN_FAMILY_ID",
        message: `Coverage rule references unknown method family '${familyId}'.`,
        path: "methodFamilies",
      });
    }
  });

  const requirement: Phase4BQuestionCoverageRequirement = {
    schemaVersion: PHASE4B1_TAXONOMY_SCHEMA_VERSION,
    learnerLevel: contract.curriculum.learnerLevel,
    domain: contract.mathematics.domain,
    problemStructure: structure,
    requiredReasoning: [...reasoning],
    primaryFamilies,
    supportingFamilies,
    allCandidateFamilies,
  };

  return issues.length
    ? { status: "uncovered", requirement, issues }
    : { status: "covered", requirement, issues: [] };
}
