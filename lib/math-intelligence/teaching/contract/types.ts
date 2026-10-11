import type {
  CanonicalAnswerContext,
  CanonicalQuestionType,
  CanonicalTeachingMedia,
  PrimaryLevel,
  TeachingSourceType,
} from "../canonical";

import type {
  AnswerValidation,
  ConfidenceBreakdown,
  CurriculumContext,
  GateDiagnostic,
  Manipulability,
  MathematicalDomain,
  MathematicalQuantity,
  MathematicalRelationship,
  ProblemStructure,
  RequiredReasoning,
  ResolutionMetadata,
  TeachingTarget,
  TeachingUnderstandingStatus,
  UnderstandingIssue,
  VisualDependency,
  VisualRole,
} from "../understanding/types";

export const TEACHING_CONTRACT_SCHEMA_VERSION = "4A-3.1" as const;
export type TeachingContractSchemaVersion = typeof TEACHING_CONTRACT_SCHEMA_VERSION;

export type TeachingContractDomain = Exclude<MathematicalDomain, "unknown">;
export type TeachingContractProblemStructure = Exclude<ProblemStructure, "unknown">;
export type TeachingContractReasoning = Exclude<RequiredReasoning, "unknown">;

export type TeachingContractSkill = {
  id: string | null;
  code: string | null;
  name: string;
};

export type TeachingContractIdentity = {
  questionId: string;
  questionCode: string | null;
  questionFingerprint: string | null;
  sourceType: TeachingSourceType;
  sourceTable: string | null;
  quizId: string | null;
  quizCode: string | null;
  quizTitle: string | null;
};

export type TeachingContractCurriculum = {
  subject: "math";
  learnerLevel: PrimaryLevel;
  topic: {
    id: string | null;
    name: string | null;
  };
  primarySkill: TeachingContractSkill | null;
  secondarySkills: TeachingContractSkill[];
  legacySkillLabel: string | null;
  skillTags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5 | null;
};

export type TeachingContractContentOption = {
  key: string;
  text: string;
  media: CanonicalTeachingMedia[];
};

export type TeachingContractContentPart = {
  key: string;
  label: string | null;
  instruction: string | null;
  prompt: string;
  questionType: CanonicalQuestionType;
  options: TeachingContractContentOption[];
  media: CanonicalTeachingMedia[];
};

export type TeachingContractContent = {
  instruction: string | null;
  prompt: string;
  questionType: CanonicalQuestionType;
  options: TeachingContractContentOption[];
  parts: TeachingContractContentPart[];
};

export type TeachingContractMathematics = {
  domain: TeachingContractDomain;
  problemStructure: TeachingContractProblemStructure;
  quantities: MathematicalQuantity[];
  relationships: MathematicalRelationship[];
  requiredReasoning: TeachingContractReasoning[];
  constraints: string[];
  units: string[];
  target: TeachingTarget;
};

export type TeachingContractVisual = {
  hasVisual: boolean;
  role: VisualRole;
  dependency: VisualDependency;
  manipulability: Manipulability;
  sourceMedia: CanonicalTeachingMedia[];
  generatedV2: {
    exists: boolean;
    status: string | null;
    strategy: string | null;
    generatorVersion: string | null;
    hasSpec: boolean;
    spec: unknown | null;
    structuralValidation: unknown | null;
    semanticValidation: unknown | null;
  } | null;
};

export type TeachingContractPart = {
  key: string;
  label: string | null;
  prompt: string;
  mathematics: {
    domain: TeachingContractDomain;
    problemStructure: TeachingContractProblemStructure;
    quantities: MathematicalQuantity[];
    relationships: MathematicalRelationship[];
    requiredReasoning: TeachingContractReasoning[];
    target: TeachingTarget;
  };
  dependsOnPartKeys: string[];
  provenance: {
    resolution: ResolutionMetadata;
    confidenceBreakdown: ConfidenceBreakdown;
    confidence: number;
  };
};

export type TeachingContractMultipart = {
  hasParts: boolean;
  parts: TeachingContractPart[];
  dependencies: Array<{
    fromPartKey: string;
    dependsOnPartKey: string;
    reason: string;
  }>;
};

export type TeachingContractInternalValidation = {
  audience: "internal_only";
  answer: CanonicalAnswerContext;
  answerValidation: AnswerValidation;
};

export type TeachingContractProvenance = {
  canonicalSchemaVersion: "4A-1.1";
  understandingSchemaVersion: "4A-2.4";
  understandingStatus: "ready";
  curriculumSource: CurriculumContext["selectedSource"];
  resolution: ResolutionMetadata;
  confidenceBreakdown: ConfidenceBreakdown;
  confidence: number;
};

/**
 * Stable, method-agnostic bridge from Phase 4A understanding into later
 * pedagogy phases. A TeachingContract exists only after the strict 4A-2 gate
 * has passed. It deliberately contains no teaching-method selection.
 */
export type TeachingContract = {
  schemaVersion: TeachingContractSchemaVersion;
  identity: TeachingContractIdentity;
  curriculum: TeachingContractCurriculum;
  content: TeachingContractContent;
  mathematics: TeachingContractMathematics;
  visual: TeachingContractVisual;
  multipart: TeachingContractMultipart;
  internalValidation: TeachingContractInternalValidation;
  provenance: TeachingContractProvenance;
  readyForMethodSelection: true;
};

export type TeachingContractBuildDiagnosticCode =
  | "UNSUPPORTED_UNDERSTANDING_SCHEMA"
  | "UNSUPPORTED_CANONICAL_SCHEMA"
  | "MISSING_QUESTION_ID"
  | "QUESTION_ID_MISMATCH"
  | "MISSING_LEARNER_LEVEL"
  | "LEVEL_MISMATCH"
  | "CANONICAL_NOT_READY"
  | "UNDERSTANDING_STATUS_NOT_READY"
  | "UNDERSTANDING_GATE_NOT_READY"
  | "UNDERSTANDING_GATE_BLOCKERS_PRESENT"
  | "METHOD_SELECTION_GATE_NOT_READY"
  | "DOMAIN_NOT_SPECIFIC"
  | "STRUCTURE_NOT_SPECIFIC"
  | "TARGET_MISSING"
  | "REASONING_NOT_SPECIFIC"
  | "MULTIPART_PART_NOT_READY";

export type TeachingContractBuildDiagnostic = {
  code: TeachingContractBuildDiagnosticCode;
  message: string;
  path: string | null;
};

export type TeachingContractReadyResult = {
  status: "ready";
  schemaVersion: TeachingContractSchemaVersion;
  questionId: string;
  contract: TeachingContract;
};

export type TeachingContractBlockedResult = {
  status: "blocked";
  schemaVersion: TeachingContractSchemaVersion;
  questionId: string | null;
  blockers: TeachingContractBuildDiagnostic[];
  sourceGate: {
    readyFor4C: boolean;
    blockers: GateDiagnostic[];
    warnings: GateDiagnostic[];
  };
  sourceUnderstanding: {
    status: TeachingUnderstandingStatus;
    issues: UnderstandingIssue[];
  };
};

export type TeachingContractBuildResult =
  | TeachingContractReadyResult
  | TeachingContractBlockedResult;
