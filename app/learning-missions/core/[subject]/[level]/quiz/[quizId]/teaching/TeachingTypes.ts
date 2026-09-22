export type TeachingEvidence = {
  text: string;
  label?: string;
  role?: string;
  occurrence?: number;
};

export type TeachingTextObject = {
  title?: string;
  text?: string;
  summary?: string;
  body?: string;
  code?: string;
  evidence?: TeachingEvidence[];
  clues?: TeachingEvidence[];
};

export type TeachingTextBlock = string | TeachingTextObject;

export type TeachingLessonItem =
  | string
  | {
      title?: string;
      text?: string;
      body?: string;
    };

export type TeachingMatrixAxisItem =
  | string
  | {
      key?: string;
      label?: string;
      text?: string;
    };

export type TeachingMatrixCell =
  | string
  | {
      text?: string;
      label?: string;
      emphasis?: boolean;
    };

export type TeachingMatrix = {
  columns?: TeachingMatrixAxisItem[];
  rows?: TeachingMatrixAxisItem[];
  cells?: Record<string, Record<string, TeachingMatrixCell>>;
  highlight?: string | { row?: string; column?: string };
};

export type TeachingLessonObject = {
  type?: string;
  title?: string;
  text?: string;
  summary?: string;
  body?: string;
  steps?: TeachingLessonItem[];
  examples?: TeachingLessonItem[];

  // English Teaching V1 fields. These are optional so legacy/simple lessons
  // and future subject renderers remain backwards-compatible.
  rule?: string;
  conclusion?: string;
  contrast?: string;
  sentence?: string;
  evidence?: TeachingEvidence[];
  clues?: TeachingEvidence[];
  matrix?: TeachingMatrix;

  word?: string;
  meaning?: string;
  context_clue?: string;
  context_sentence?: string;
  example_sentence?: string;

  original?: string;
  corrected?: string;
  problem?: string;
  correction?: string;
};

export type TeachingLesson = string | TeachingLessonObject;

export type TeachingMisconception = TeachingTextObject & {
  lesson?: TeachingLesson;
};

export type TeachingConfig = {
  version?: number;
  hint?: TeachingTextBlock;
  correct?: TeachingTextBlock;
  incorrect?: TeachingTextBlock;
  lesson?: TeachingLesson;
  teach_me?: TeachingLesson;
  misconceptions?: Record<string, TeachingTextBlock | TeachingMisconception>;
};

export type NormalisedTeachingEvidence = {
  text: string;
  label: string | null;
  role: string | null;
  occurrence: number;
};

export type NormalisedTeachingText = {
  title: string | null;
  text: string;
  code: string | null;
  evidence: NormalisedTeachingEvidence[];
};

export type NormalisedTeachingLesson = {
  type: string;
  title: string | null;
  text: string | null;
  steps: Array<{ title: string | null; text: string }>;
  examples: Array<{ title: string | null; text: string }>;
  source: TeachingLessonObject | null;
};

export type NormalisedTeachingMisconception = NormalisedTeachingText & {
  lesson: NormalisedTeachingLesson | null;
};
