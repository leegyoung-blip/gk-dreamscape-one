export type MoneyLabLessonKey =
  | "saving-basics"
  | "interest-basics"
  | "bond-basics"
  | "saving-vs-investing"
  | "risk-and-return"
  | "needs-vs-wants";

export type MoneyLabInfoStep = {
  type: "info";
  eyebrow: string;
  title: string;
  body: string;
  example?: string;
};

export type MoneyLabQuizStep = {
  type: "quiz";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type MoneyLabStep = MoneyLabInfoStep | MoneyLabQuizStep;

export type MoneyLabLesson = {
  key: MoneyLabLessonKey;
  order: number;
  icon: string;
  title: string;
  shortTitle: string;
  description: string;
  duration: string;
  rewardDt: number;
  concepts: string[];
  steps: MoneyLabStep[];
};

export type MoneyLabProgress = {
  lessonKey: MoneyLabLessonKey;
  completedAt: string;
  rewardAmount: number;
};

export type MoneyLabCompletionResult = MoneyLabProgress & {
  newlyCompleted: boolean;
};
