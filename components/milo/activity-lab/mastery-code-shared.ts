export type LetterFeedback = "correct" | "present" | "absent";

export type MasteryAttempt = {
  guess: string;
  feedback: LetterFeedback[];
};

export type KeyboardLetterState = LetterFeedback;

export const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export function buildPuzzleFeedback(
  guess: string,
  answer: string,
): LetterFeedback[] {
  const guessLetters = guess.toUpperCase().split("");
  const answerLetters = answer.toUpperCase().split("");
  const feedback: LetterFeedback[] = Array.from(
    { length: answerLetters.length },
    () => "absent",
  );
  const used = Array.from({ length: answerLetters.length }, () => false);

  guessLetters.forEach((letter, index) => {
    if (letter === answerLetters[index]) {
      feedback[index] = "correct";
      used[index] = true;
    }
  });

  guessLetters.forEach((letter, index) => {
    if (feedback[index] === "correct") return;

    const foundIndex = answerLetters.findIndex(
      (answerLetter, answerIndex) =>
        answerLetter === letter && !used[answerIndex],
    );

    if (foundIndex >= 0) {
      feedback[index] = "present";
      used[foundIndex] = true;
    }
  });

  return feedback;
}

export function getKeyboardLetterStates(attempts: MasteryAttempt[]) {
  const states: Record<string, KeyboardLetterState> = {};
  const priority: Record<KeyboardLetterState, number> = {
    absent: 1,
    present: 2,
    correct: 3,
  };

  attempts.forEach((attempt) => {
    attempt.guess.split("").forEach((letter, index) => {
      const state = attempt.feedback[index];
      if (!state) return;

      const currentState = states[letter];
      if (!currentState || priority[state] > priority[currentState]) {
        states[letter] = state;
      }
    });
  });

  return states;
}

export function getSingaporeDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

export function getSingaporeDayUtcBounds() {
  const day = getSingaporeDateString();
  const [year, month, date] = day.split("-").map(Number);
  const startMs = Date.UTC(year, month - 1, date) - 8 * 60 * 60 * 1000;
  const endMs = startMs + 24 * 60 * 60 * 1000;

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

export function getSurvivalWordLength(level: number) {
  if (level <= 3) return 5;
  if (level <= 7) return 6;
  return 7;
}

export function getSurvivalMaxAttempts(wordLength: number) {
  return wordLength + 1;
}

export function getSurvivalRewardTarget(failedLevel: number) {
  if (failedLevel <= 1) return 0;
  if (failedLevel === 2) return 3;
  if (failedLevel === 3) return 6;
  if (failedLevel === 4) return 10;
  if (failedLevel === 5) return 14;
  if (failedLevel === 6) return 18;
  if (failedLevel === 7) return 23;
  if (failedLevel === 8) return 28;

  return Math.min(60, 28 + (failedLevel - 8) * 5);
}
