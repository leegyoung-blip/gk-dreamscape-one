export type PrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type TeachingSourceType =
  | "quiz"
  | "assessment"
  | "practice"
  | "unknown";

export type CanonicalQuestionType =
  | "mcq"
  | "open_ended"
  | "multi_select"
  | "unknown";

export type CanonicalMediaType =
  | "image"
  | "svg"
  | "unknown";

export type CanonicalMediaRole =
  | "stimulus"
  | "question_asset"
  | "option_asset"
  | "part_asset"
  | "unknown";

export type CanonicalTeachingMedia = {
  id: string | null;
  mediaType: CanonicalMediaType;
  role: CanonicalMediaRole;
  url: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  altText: string | null;
  title: string | null;
};

export type CanonicalTeachingOption = {
  key: string;
  text: string;
  isCorrect: boolean | null;
  media: CanonicalTeachingMedia[];
};

export type CanonicalNumericAnswer = {
  type: "number";
  value: number;
  unit: string | null;
};

export type CanonicalTextAnswer = {
  type: "text";
  value: string;
};

export type CanonicalOptionAnswer = {
  type: "option";
  key: string;
  text: string | null;
};

export type CanonicalMultipleOptionsAnswer = {
  type: "multiple_options";
  keys: string[];
};

export type CanonicalMultipartAnswer = {
  type: "multipart";
  parts: Array<{
    key: string;
    rawAnswer: string | null;
    canonicalAnswer:
      | CanonicalNumericAnswer
      | CanonicalTextAnswer
      | CanonicalOptionAnswer
      | CanonicalMultipleOptionsAnswer
      | null;
  }>;
};

export type CanonicalAnswer =
  | CanonicalNumericAnswer
  | CanonicalTextAnswer
  | CanonicalOptionAnswer
  | CanonicalMultipleOptionsAnswer
  | CanonicalMultipartAnswer;

export type CanonicalAnswerContext = {
  rawAnswer: string | null;
  canonicalAnswer: CanonicalAnswer | null;
  acceptableAnswers: string[];
};

export type CanonicalSkill = {
  id: string;
  code: string | null;
  name: string;
};

export type CanonicalTeachingPart = {
  key: string;
  label: string | null;
  instruction: string | null;
  prompt: string;
  questionType: CanonicalQuestionType;
  options: CanonicalTeachingOption[];
  answer: CanonicalAnswerContext;
  media: CanonicalTeachingMedia[];
};

export type CanonicalTeachingInputIssueSeverity =
  | "blocking"
  | "warning"
  | "info";

export type CanonicalTeachingInputIssueCode =
  | "MISSING_QUESTION_ID"
  | "MISSING_PROMPT"
  | "MISSING_LEVEL"
  | "INVALID_LEVEL"
  | "MISSING_ANSWER"
  | "INVALID_CORRECT_OPTION"
  | "UNKNOWN_QUESTION_TYPE"
  | "MISSING_SKILL_MAPPING"
  | "INVALID_DIFFICULTY"
  | "BROKEN_MEDIA_REFERENCE"
  | "INVALID_MULTIPART_STRUCTURE";

export type CanonicalTeachingInputIssue = {
  severity: CanonicalTeachingInputIssueSeverity;
  code: CanonicalTeachingInputIssueCode;
  message: string;
  path: string | null;
};

export type CanonicalTeachingQuestion = {
  schemaVersion: "4A-1.1";

  identity: {
    questionId: string | null;
    questionCode: string | null;
    sourceType: TeachingSourceType;
    sourceTable: string | null;
    quizId: string | null;
    quizCode: string | null;
    quizTitle: string | null;
    questionFingerprint: string | null;
  };

  curriculum: {
    subject: "math";
    level: PrimaryLevel | null;
    topicId: string | null;
    topicName: string | null;
    primarySkill: CanonicalSkill | null;
    secondarySkills: CanonicalSkill[];
    legacySkillLabel: string | null;
    skillTags: string[];
    difficulty: 1 | 2 | 3 | 4 | 5 | null;
  };

  content: {
    instruction: string | null;
    prompt: string;
    questionType: CanonicalQuestionType;
    options: CanonicalTeachingOption[];
    parts: CanonicalTeachingPart[];
  };

  answer: CanonicalAnswerContext;

  media: {
    originalMedia: CanonicalTeachingMedia[];
    generatedV2Visual: {
      exists: boolean;
      status: string | null;
      strategy: string | null;
      generatorVersion: string | null;
      spec: unknown | null;
      structuralValidation: unknown | null;
      semanticValidation: unknown | null;
    } | null;
  };

  intelligence: {
    proposalId: string | null;
    domain: string | null;
    problemStructure: string | null;
    target: {
      kind: string | null;
      label: string | null;
      quantityId: string | null;
    } | null;
    confidence: number | null;
  };

  teaching: {
    learnerLevel: PrimaryLevel | null;
    methodId: null;
    steps: [];
  };

  diagnostics: {
    issues: CanonicalTeachingInputIssue[];
    readyForUnderstanding: boolean;
  };
};

export type CanonicalSkillMappingInput = {
  id: string;
  code?: string | null;
  name: string;
};

export type ExistingMathIntelligenceProposalInput = {
  proposal_id?: unknown;
  question_fingerprint?: unknown;

  decision?: {
    domain?: unknown;
    problem_structure?: unknown;
    strategy?: unknown;
    confidence?: unknown;

    target?: {
      kind?: unknown;
      label?: unknown;
      quantity_id?: unknown;
    } | null;
  } | null;

  visual?: {
    status?: unknown;
    strategy?: unknown;
    generator_version?: unknown;
    spec?: unknown;
    structural_validation?: unknown;
    semantic_validation?: unknown;
  } | null;
};

export type NormalizeCanonicalTeachingQuestionInput = {
  question: Record<string, unknown>;
  sourceType?: TeachingSourceType;
  sourceTable?: string | null;
  quizId?: string | null;
  skillMappings?: CanonicalSkillMappingInput[];
  questionFingerprint?: string | null;
  mathIntelligence?: ExistingMathIntelligenceProposalInput | null;
};
