export type CoreSubject = "english" | "math";
export type PrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type CoreQuizType =
  | "quick"
  | "standard"
  | "challenge"
  | "assessment";

export type CoreSubjectTheme = {
  name: string;
  shortName: string;
  icon: string;
  description: string;
  eyebrowClass: string;
  softClass: string;
  borderClass: string;
  textClass: string;
  barClass: string;
  progressClass: string;
  cardBackground: string;
};

export const CORE_SUBJECT_THEMES: Record<
  CoreSubject,
  CoreSubjectTheme
> = {
  english: {
    name: "English",
    shortName: "English",
    icon: "Aa",
    description:
      "Build grammar, vocabulary, comprehension, writing, listening and oral skills through focused curriculum missions.",
    eyebrowClass: "text-violet-200",
    softClass: "bg-violet-300/10",
    borderClass: "border-violet-200/20",
    textClass: "text-violet-100",
    barClass:
      "bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400",
    progressClass:
      "bg-gradient-to-r from-violet-400 to-cyan-400",
    cardBackground:
      "bg-[linear-gradient(145deg,rgba(29,28,70,0.76),rgba(7,17,40,0.9))]",
  },
  math: {
    name: "Mathematics",
    shortName: "Math",
    icon: "∑",
    description:
      "Strengthen number skills, measurement, geometry, data handling and problem-solving through focused curriculum missions.",
    eyebrowClass: "text-emerald-200",
    softClass: "bg-emerald-300/10",
    borderClass: "border-emerald-200/20",
    textClass: "text-emerald-100",
    barClass:
      "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400",
    progressClass:
      "bg-gradient-to-r from-emerald-400 to-cyan-400",
    cardBackground:
      "bg-[linear-gradient(145deg,rgba(8,40,61,0.76),rgba(4,17,37,0.9))]",
  },
};

export const CORE_TABLES: Record<
  CoreSubject,
  {
    topics: string;
    quizzes: string;
    attempts: string;
  }
> = {
  english: {
    topics: "english_topics",
    quizzes: "english_quizzes",
    attempts: "english_quiz_attempts",
  },
  math: {
    topics: "math_topics",
    quizzes: "math_quizzes",
    attempts: "math_quiz_attempts",
  },
};

export const CORE_LEVEL_COPY: Record<
  PrimaryLevel,
  {
    title: string;
    subtitle: string;
  }
> = {
  1: {
    title: "Primary 1",
    subtitle: "Build strong curriculum foundations.",
  },
  2: {
    title: "Primary 2",
    subtitle: "Strengthen essential knowledge and skills.",
  },
  3: {
    title: "Primary 3",
    subtitle: "Develop accuracy, confidence and application.",
  },
  4: {
    title: "Primary 4",
    subtitle: "Apply skills across more complex tasks.",
  },
  5: {
    title: "Primary 5",
    subtitle: "Prepare for upper-primary mastery.",
  },
  6: {
    title: "Primary 6",
    subtitle: "Consolidate learning and prepare for PSLE.",
  },
};

export const CORE_QUIZ_TYPE_LABELS: Record<CoreQuizType, string> = {
  quick: "Quick Practice",
  standard: "Standard Mission",
  challenge: "Challenge Mission",
  assessment: "Assessment Paper",
};

export const CORE_QUIZ_TYPE_DESCRIPTIONS: Record<
  CoreQuizType,
  string
> = {
  quick: "Short, focused practice for one specific skill.",
  standard: "A complete topic mission with guided curriculum practice.",
  challenge: "More demanding questions for deeper application.",
  assessment: "A mixed or formal assessment of the topic.",
};

export function isCoreSubject(value: string): value is CoreSubject {
  return value === "english" || value === "math";
}

export function parsePrimaryLevel(
  value: string,
): PrimaryLevel | null {
  const match = /^p([1-6])$/.exec(value);
  return match ? (Number(match[1]) as PrimaryLevel) : null;
}

export function normaliseRole(
  value: string | null | undefined,
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function canEditCore(
  value: string | null | undefined,
) {
  const role = normaliseRole(value);
  return role === "admin" || role === "curriculum-lead";
}
