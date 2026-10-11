import type {
  CanonicalAnswer,
  CanonicalAnswerContext,
  CanonicalTeachingMedia,
  CanonicalTeachingQuestion,
} from "../canonical";
import type {
  TeachingPartUnderstanding,
  TeachingQuestionUnderstanding,
} from "../understanding/types";

import {
  TEACHING_CONTRACT_SCHEMA_VERSION,
  type TeachingContract,
  type TeachingContractBlockedResult,
  type TeachingContractBuildDiagnostic,
  type TeachingContractBuildResult,
  type TeachingContractDomain,
  type TeachingContractPart,
  type TeachingContractProblemStructure,
  type TeachingContractReasoning,
  type TeachingContractSkill,
} from "./types";

function cloneMedia(media: CanonicalTeachingMedia[]): CanonicalTeachingMedia[] {
  return media.map((item) => ({ ...item }));
}

function cloneCanonicalAnswer(answer: CanonicalAnswer | null): CanonicalAnswer | null {
  if (!answer) return null;

  switch (answer.type) {
    case "number":
    case "text":
    case "option":
      return { ...answer };
    case "multiple_options":
      return { ...answer, keys: [...answer.keys] };
    case "multipart":
      return {
        ...answer,
        parts: answer.parts.map((part) => ({
          ...part,
          canonicalAnswer: cloneCanonicalAnswer(part.canonicalAnswer) as
            | Exclude<CanonicalAnswer, { type: "multipart" }>
            | null,
        })),
      };
  }
}

function cloneAnswerContext(answer: CanonicalAnswerContext): CanonicalAnswerContext {
  return {
    rawAnswer: answer.rawAnswer,
    canonicalAnswer: cloneCanonicalAnswer(answer.canonicalAnswer),
    acceptableAnswers: [...answer.acceptableAnswers],
  };
}

function skillFromCanonical(
  skill: CanonicalTeachingQuestion["curriculum"]["primarySkill"],
  fallbackName: string | null,
): TeachingContractSkill | null {
  if (skill) {
    return {
      id: skill.id,
      code: skill.code,
      name: skill.name,
    };
  }

  return fallbackName
    ? { id: null, code: null, name: fallbackName }
    : null;
}

function secondarySkillsFromCanonical(
  skills: CanonicalTeachingQuestion["curriculum"]["secondarySkills"],
  fallbackNames: string[],
): TeachingContractSkill[] {
  if (skills.length > 0) {
    return skills.map((skill) => ({
      id: skill.id,
      code: skill.code,
      name: skill.name,
    }));
  }

  return fallbackNames.map((name) => ({ id: null, code: null, name }));
}

function contentOptionFromCanonical(
  option: CanonicalTeachingQuestion["content"]["options"][number],
) {
  return {
    key: option.key,
    text: option.text,
    media: cloneMedia(option.media),
  };
}

function addBlocker(
  blockers: TeachingContractBuildDiagnostic[],
  code: TeachingContractBuildDiagnostic["code"],
  message: string,
  path: string | null,
): void {
  if (blockers.some((item) => item.code === code && item.path === path)) return;
  blockers.push({ code, message, path });
}

function isSpecificDomain(
  value: TeachingQuestionUnderstanding["domain"],
): value is TeachingContractDomain {
  return value !== "unknown";
}

function isSpecificStructure(
  value: TeachingQuestionUnderstanding["problemStructure"],
): value is TeachingContractProblemStructure {
  return value !== "unknown";
}

function hasSpecificReasoning(
  values: TeachingQuestionUnderstanding["requiredReasoning"],
): values is TeachingContractReasoning[] {
  return values.length > 0 && values.every((value) => value !== "unknown");
}

function isPartReady(part: TeachingPartUnderstanding): boolean {
  return (
    part.status === "ready" &&
    part.readyForMethodSelection === true &&
    part.gateDiagnostics.readyFor4C === true &&
    part.gateDiagnostics.blockers.length === 0 &&
    part.domain !== "unknown" &&
    part.problemStructure !== "unknown" &&
    part.target !== null &&
    part.requiredReasoning.length > 0 &&
    part.requiredReasoning.every((reasoning) => reasoning !== "unknown")
  );
}

function collectBlockers(
  understanding: TeachingQuestionUnderstanding,
): TeachingContractBuildDiagnostic[] {
  const blockers: TeachingContractBuildDiagnostic[] = [];
  const canonical = understanding.source.canonical;

  if (understanding.schemaVersion !== "4A-2.4") {
    addBlocker(
      blockers,
      "UNSUPPORTED_UNDERSTANDING_SCHEMA",
      `Teaching Contract 4A-3.1 requires understanding schema 4A-2.4; received ${String(
        understanding.schemaVersion,
      )}.`,
      "schemaVersion",
    );
  }

  if (canonical.schemaVersion !== "4A-1.1") {
    addBlocker(
      blockers,
      "UNSUPPORTED_CANONICAL_SCHEMA",
      `Teaching Contract 4A-3.1 requires canonical schema 4A-1.1; received ${String(
        canonical.schemaVersion,
      )}.`,
      "source.canonical.schemaVersion",
    );
  }

  const understandingId = understanding.questionId;
  const canonicalId = canonical.identity.questionId;

  if (!understandingId || !canonicalId) {
    addBlocker(
      blockers,
      "MISSING_QUESTION_ID",
      "A stable canonical question ID is required before a Teaching Contract can be created.",
      "questionId",
    );
  } else if (understandingId !== canonicalId) {
    addBlocker(
      blockers,
      "QUESTION_ID_MISMATCH",
      "The understanding question ID does not match the canonical source question ID.",
      "questionId",
    );
  }

  if (!understanding.learnerLevel || !canonical.curriculum.level) {
    addBlocker(
      blockers,
      "MISSING_LEARNER_LEVEL",
      "A valid Primary 1-6 learner level is required before a Teaching Contract can be created.",
      "learnerLevel",
    );
  } else if (understanding.learnerLevel !== canonical.curriculum.level) {
    addBlocker(
      blockers,
      "LEVEL_MISMATCH",
      "The understanding learner level does not match the canonical curriculum level.",
      "learnerLevel",
    );
  }

  if (!canonical.diagnostics.readyForUnderstanding) {
    addBlocker(
      blockers,
      "CANONICAL_NOT_READY",
      "The canonical teaching input is not marked ready for understanding.",
      "source.canonical.diagnostics.readyForUnderstanding",
    );
  }

  if (understanding.status !== "ready") {
    addBlocker(
      blockers,
      "UNDERSTANDING_STATUS_NOT_READY",
      `Only understanding status 'ready' may produce a Teaching Contract; received '${understanding.status}'.`,
      "status",
    );
  }

  if (!understanding.gateDiagnostics.readyFor4C) {
    addBlocker(
      blockers,
      "UNDERSTANDING_GATE_NOT_READY",
      "The strict Phase 4C gate did not approve this understanding.",
      "gateDiagnostics.readyFor4C",
    );
  }

  if (understanding.gateDiagnostics.blockers.length > 0) {
    addBlocker(
      blockers,
      "UNDERSTANDING_GATE_BLOCKERS_PRESENT",
      "The understanding still contains one or more Phase 4C gate blockers.",
      "gateDiagnostics.blockers",
    );
  }

  if (!understanding.readyForMethodSelection) {
    addBlocker(
      blockers,
      "METHOD_SELECTION_GATE_NOT_READY",
      "The understanding is not approved for downstream teaching-method selection.",
      "readyForMethodSelection",
    );
  }

  if (!isSpecificDomain(understanding.domain)) {
    addBlocker(
      blockers,
      "DOMAIN_NOT_SPECIFIC",
      "A Teaching Contract requires a specific mathematical domain.",
      "domain",
    );
  }

  if (!isSpecificStructure(understanding.problemStructure)) {
    addBlocker(
      blockers,
      "STRUCTURE_NOT_SPECIFIC",
      "A Teaching Contract requires a specific mathematical problem structure.",
      "problemStructure",
    );
  }

  if (!understanding.target) {
    addBlocker(
      blockers,
      "TARGET_MISSING",
      "A Teaching Contract requires a resolved mathematical target.",
      "target",
    );
  }

  if (!hasSpecificReasoning(understanding.requiredReasoning)) {
    addBlocker(
      blockers,
      "REASONING_NOT_SPECIFIC",
      "A Teaching Contract requires at least one specific required-reasoning family and may not contain 'unknown'.",
      "requiredReasoning",
    );
  }

  if (
    understanding.multipart.hasParts &&
    understanding.multipart.parts.some((part) => !isPartReady(part))
  ) {
    addBlocker(
      blockers,
      "MULTIPART_PART_NOT_READY",
      "Every part of a multipart question must independently be ready for method selection before one Teaching Contract can represent the whole question.",
      "multipart.parts",
    );
  }

  return blockers;
}

function blockedResult(
  understanding: TeachingQuestionUnderstanding,
  blockers: TeachingContractBuildDiagnostic[],
): TeachingContractBlockedResult {
  return {
    status: "blocked",
    schemaVersion: TEACHING_CONTRACT_SCHEMA_VERSION,
    questionId: understanding.questionId,
    blockers,
    sourceGate: {
      readyFor4C: understanding.gateDiagnostics.readyFor4C,
      blockers: understanding.gateDiagnostics.blockers.map((item) => ({ ...item })),
      warnings: understanding.gateDiagnostics.warnings.map((item) => ({ ...item })),
    },
    sourceUnderstanding: {
      status: understanding.status,
      issues: understanding.issues.map((item) => ({ ...item })),
    },
  };
}

function buildPartContract(part: TeachingPartUnderstanding): TeachingContractPart {
  if (
    part.domain === "unknown" ||
    part.problemStructure === "unknown" ||
    !part.target ||
    part.requiredReasoning.some((reasoning) => reasoning === "unknown")
  ) {
    throw new Error("Invariant violation: attempted to build a contract for an unresolved multipart part.");
  }

  return {
    key: part.key,
    label: part.label,
    prompt: part.prompt,
    mathematics: {
      domain: part.domain,
      problemStructure: part.problemStructure,
      quantities: part.quantities.map((item) => ({ ...item })),
      relationships: part.relationships.map((item) => ({ ...item })),
      requiredReasoning: [...part.requiredReasoning] as TeachingContractReasoning[],
      target: { ...part.target },
    },
    dependsOnPartKeys: [...part.dependsOnPartKeys],
    provenance: {
      resolution: { ...part.resolution },
      confidenceBreakdown: { ...part.confidenceBreakdown },
      confidence: part.confidence,
    },
  };
}

/**
 * Phase 4A-3.1 deterministic builder.
 *
 * It does not infer mathematics and it does not select a teaching method.
 * Its only job is to enforce the closed 4A-2 safety gate and project the
 * validated canonical + understanding data into the stable Teaching Contract.
 */
export function buildTeachingContract(
  understanding: TeachingQuestionUnderstanding,
): TeachingContractBuildResult {
  const blockers = collectBlockers(understanding);
  if (blockers.length > 0) return blockedResult(understanding, blockers);

  const canonical = understanding.source.canonical;

  // Guards above prove these values are present/specific.
  const questionId = understanding.questionId as string;
  const learnerLevel = understanding.learnerLevel as NonNullable<
    TeachingQuestionUnderstanding["learnerLevel"]
  >;
  const domain = understanding.domain as TeachingContractDomain;
  const problemStructure = understanding.problemStructure as TeachingContractProblemStructure;
  const requiredReasoning = understanding.requiredReasoning as TeachingContractReasoning[];
  const target = understanding.target!;

  const contract: TeachingContract = {
    schemaVersion: TEACHING_CONTRACT_SCHEMA_VERSION,
    identity: {
      questionId,
      questionCode: canonical.identity.questionCode,
      questionFingerprint: canonical.identity.questionFingerprint,
      sourceType: canonical.identity.sourceType,
      sourceTable: canonical.identity.sourceTable,
      quizId: canonical.identity.quizId,
      quizCode: canonical.identity.quizCode,
      quizTitle: canonical.identity.quizTitle,
    },
    curriculum: {
      subject: "math",
      learnerLevel,
      topic: {
        id: canonical.curriculum.topicId,
        name: canonical.curriculum.topicName ?? understanding.curriculumContext.topic,
      },
      primarySkill: skillFromCanonical(
        canonical.curriculum.primarySkill,
        understanding.curriculumContext.primarySkill,
      ),
      secondarySkills: secondarySkillsFromCanonical(
        canonical.curriculum.secondarySkills,
        understanding.curriculumContext.secondarySkills,
      ),
      legacySkillLabel: canonical.curriculum.legacySkillLabel,
      skillTags: [...canonical.curriculum.skillTags],
      difficulty: canonical.curriculum.difficulty,
    },
    content: {
      instruction: canonical.content.instruction,
      prompt: canonical.content.prompt,
      questionType: canonical.content.questionType,
      options: canonical.content.options.map(contentOptionFromCanonical),
      parts: canonical.content.parts.map((part) => ({
        key: part.key,
        label: part.label,
        instruction: part.instruction,
        prompt: part.prompt,
        questionType: part.questionType,
        options: part.options.map(contentOptionFromCanonical),
        media: cloneMedia(part.media),
      })),
    },
    mathematics: {
      domain,
      problemStructure,
      quantities: understanding.quantities.map((item) => ({ ...item })),
      relationships: understanding.relationships.map((item) => ({ ...item })),
      requiredReasoning: [...requiredReasoning],
      constraints: [...understanding.constraints],
      units: [...understanding.units],
      target: { ...target },
    },
    visual: {
      hasVisual: understanding.visualContext.hasVisual,
      role: understanding.visualContext.role,
      dependency: understanding.visualContext.mathematicalDependency,
      manipulability: understanding.visualContext.potentiallyManipulable,
      sourceMedia: cloneMedia(understanding.visualContext.sourceMedia),
      generatedV2: understanding.visualContext.generatedV2
        ? {
            ...understanding.visualContext.generatedV2,
            spec: canonical.media.generatedV2Visual?.spec ?? null,
            structuralValidation:
              canonical.media.generatedV2Visual?.structuralValidation ?? null,
            semanticValidation:
              canonical.media.generatedV2Visual?.semanticValidation ?? null,
          }
        : canonical.media.generatedV2Visual
          ? {
              exists: canonical.media.generatedV2Visual.exists,
              status: canonical.media.generatedV2Visual.status,
              strategy: canonical.media.generatedV2Visual.strategy,
              generatorVersion: canonical.media.generatedV2Visual.generatorVersion,
              hasSpec: canonical.media.generatedV2Visual.spec != null,
              spec: canonical.media.generatedV2Visual.spec,
              structuralValidation:
                canonical.media.generatedV2Visual.structuralValidation,
              semanticValidation: canonical.media.generatedV2Visual.semanticValidation,
            }
          : null,
    },
    multipart: {
      hasParts: understanding.multipart.hasParts,
      parts: understanding.multipart.parts.map(buildPartContract),
      dependencies: understanding.multipart.dependencies.map((item) => ({ ...item })),
    },
    internalValidation: {
      audience: "internal_only",
      answer: cloneAnswerContext(canonical.answer),
      answerValidation: { ...understanding.answerValidation },
    },
    provenance: {
      canonicalSchemaVersion: canonical.schemaVersion,
      understandingSchemaVersion: understanding.schemaVersion,
      understandingStatus: "ready",
      curriculumSource: understanding.curriculumContext.selectedSource,
      resolution: { ...understanding.resolution },
      confidenceBreakdown: { ...understanding.confidenceBreakdown },
      confidence: understanding.confidence,
    },
    readyForMethodSelection: true,
  };

  return {
    status: "ready",
    schemaVersion: TEACHING_CONTRACT_SCHEMA_VERSION,
    questionId,
    contract,
  };
}

export function isReadyTeachingContractResult(
  result: TeachingContractBuildResult,
): result is Extract<TeachingContractBuildResult, { status: "ready" }> {
  return result.status === "ready";
}
