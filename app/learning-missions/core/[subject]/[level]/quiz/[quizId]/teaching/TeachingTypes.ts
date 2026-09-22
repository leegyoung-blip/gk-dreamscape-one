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

/* --------------------------------------------------------------------------
 * Math Teaching V1 structured content
 * ----------------------------------------------------------------------- */

export type TeachingVerticalWorking = {
  operator?: string;
  operands?: string[];
  carries?: string[];
  result?: string;
  note?: string;
};

export type TeachingPlaceValueRow = {
  label?: string;
  values?: string[];
  emphasis?: boolean;
};

export type TeachingPlaceValue = {
  columns?: string[];
  rows?: TeachingPlaceValueRow[];
  highlight_columns?: string[];
};

export type TeachingFraction = {
  left?: string;
  operator?: string;
  right?: string;
  common_denominator?: string;
  equivalent_left?: string;
  equivalent_right?: string;
  working?: string;
  result?: string;
  simplified?: string;
  note?: string;
};

export type TeachingGeometry = {
  known?: TeachingLessonItem[];
  rule?: string;
  formula?: string;
  substitution?: string;
  working?: string;
  answer?: string;
  unit?: string;
};

export type TeachingUnitConversion = {
  from?: string;
  to?: string;
  relationship?: string;
  calculation?: string;
  result?: string;
};

export type TeachingWordProblem = {
  known?: TeachingLessonItem[];
  find?: string;
  strategy?: string;
  working?: TeachingLessonItem[];
  answer?: string;
  unit?: string;
  check?: string;
};

export type TeachingLessonObject = {
  type?: string;
  title?: string;
  text?: string;
  summary?: string;
  body?: string;
  steps?: TeachingLessonItem[];
  examples?: TeachingLessonItem[];

  // Shared / English Teaching V1 fields.
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

  // Math Teaching V1 fields. The same generic steps/examples fields remain
  // available, while these fields let the renderer present mathematical
  // reasoning as a method rather than as one paragraph.
  method?: string;
  expression?: string;
  formula?: string;
  substitution?: string;
  calculation?: string;
  result?: string;
  answer?: string;
  unit?: string;
  check?: string;
  known?: TeachingLessonItem[];
  find?: string;
  strategy?: string;
  working?: TeachingLessonItem[];
  vertical_working?: TeachingVerticalWorking;
  place_value?: TeachingPlaceValue;
  fraction?: TeachingFraction;
  geometry?: TeachingGeometry;
  conversion?: TeachingUnitConversion;
  word_problem?: TeachingWordProblem;
};

export type TeachingLesson = string | TeachingLessonObject;

export type TeachingMisconception = TeachingTextObject & {
  lesson?: TeachingLesson;
};


export type TeachingQuickCheckType =
  | "multiple_choice"
  | "short_text"
  | "numeric"
  | "fraction";

export type TeachingQuickCheckOption = {
  id: string;
  text: string;
};

export type TeachingQuickCheck = {
  title?: string;
  instruction?: string;
  prompt?: string;
  type?: TeachingQuickCheckType;
  options?: TeachingQuickCheckOption[];
  correct_option_id?: string;
  accepted_answers?: string[];
  value?: number;
  tolerance?: number;
  numerator?: number;
  denominator?: number;
  allow_equivalent?: boolean;
  explanation?: string;
};

export type NormalisedTeachingQuickCheck = {
  title: string | null;
  instruction: string | null;
  prompt: string;
  type: TeachingQuickCheckType;
  options: TeachingQuickCheckOption[];
  correctOptionId: string | null;
  acceptedAnswers: string[];
  value: number | null;
  tolerance: number;
  numerator: number | null;
  denominator: number | null;
  allowEquivalent: boolean;
  explanation: string | null;
};

export type TeachingConfig = {
  version?: number;
  hint?: TeachingTextBlock;
  correct?: TeachingTextBlock;
  incorrect?: TeachingTextBlock;
  lesson?: TeachingLesson;
  teach_me?: TeachingLesson;
  misconceptions?: Record<string, TeachingTextBlock | TeachingMisconception>;
  quick_check?: TeachingQuickCheck;
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
