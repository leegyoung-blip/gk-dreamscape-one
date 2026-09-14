import type {
  NovaSubjectKey,
  ProfileSubjectSummary,
} from "./types";

export const SUBJECT_META: Record<
  NovaSubjectKey,
  { label: string; short: string; icon: string }
> = {
  english: { label: "English", short: "English", icon: "✎" },
  math: { label: "Mathematics", short: "Math", icon: "∑" },
  science: { label: "Science", short: "Science", icon: "⚗" },
  knowledge: { label: "General Knowledge", short: "Knowledge", icon: "◎" },
};

export type SubjectState = "strong" | "developing" | "attention" | "unknown";

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function subjectState(
  summary: ProfileSubjectSummary | null | undefined,
): SubjectState {
  if (!summary || safeNumber(summary.questions_attempted) < 5) return "unknown";
  const mastery = safeNumber(summary.mastery_score);
  if (mastery >= 85) return "strong";
  if (mastery >= 70) return "developing";
  return "attention";
}

export function subjectStateLabel(state: SubjectState) {
  switch (state) {
    case "strong":
      return "Strong";
    case "developing":
      return "Developing";
    case "attention":
      return "Needs attention";
    default:
      return "Building picture";
  }
}

export function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}
