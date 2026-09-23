import type { ProfileSkill } from "@/lib/nova-plus/types";

export type NovaTeachingSubject = "english" | "math";

export type NovaTeachingEvidenceLevel =
  | "observation"
  | "emerging_pattern"
  | "likely_gap";

export type NovaTeachingRecoveryState =
  | "no_transfer_check"
  | "recovery_signal"
  | "needs_reinforcement"
  | "mixed_transfer";

export type NovaTeachingSignal = {
  subject: NovaTeachingSubject;
  misconception_code: string;
  evidence_group_key: string;
  concept_key: string | null;
  skill: string | null;
  topic_title: string | null;
  topic_id: string | null;
  primary_level: number | null;
  occurrences: number;
  distinct_questions: number;
  distinct_attempts: number;
  distinct_quizzes: number;
  first_seen_at: string;
  last_seen_at: string;
  hint_used_occurrences: number;
  teaching_opened_occurrences: number;
  quick_check_attempts: number;
  quick_check_correct_count: number;
  quick_check_incorrect_count: number;
  evidence_level: NovaTeachingEvidenceLevel;
  recovery_state: NovaTeachingRecoveryState;
};

export type NovaTeachingActivity = {
  subject: NovaTeachingSubject;
  hints_opened: number;
  lessons_opened: number;
  teach_me_opened: number;
  misconceptions_shown: number;
  quick_checks_answered: number;
  quick_checks_correct: number;
};

export type NovaTeachingEvidencePayload = {
  student_user_id: string;
  generated_at: string;
  window_days: number;
  subject: NovaTeachingSubject | null;
  signals: NovaTeachingSignal[];
  activity: NovaTeachingActivity[];
};

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normaliseTeachingConceptKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function teachingConceptMapKey(
  subject: string | null | undefined,
  conceptKey: unknown,
) {
  const cleanSubject = String(subject || "").trim().toLowerCase();
  const cleanConcept = normaliseTeachingConceptKey(conceptKey);
  return cleanSubject && cleanConcept ? `${cleanSubject}:${cleanConcept}` : "";
}

function normaliseSignal(raw: any): NovaTeachingSignal | null {
  const subject = String(raw?.subject || "").toLowerCase();
  if (subject !== "english" && subject !== "math") return null;

  const misconceptionCode = String(raw?.misconception_code || "").trim();
  if (!misconceptionCode) return null;

  const evidenceLevel: NovaTeachingEvidenceLevel = [
    "observation",
    "emerging_pattern",
    "likely_gap",
  ].includes(String(raw?.evidence_level))
    ? raw.evidence_level
    : "observation";

  const recoveryState: NovaTeachingRecoveryState = [
    "no_transfer_check",
    "recovery_signal",
    "needs_reinforcement",
    "mixed_transfer",
  ].includes(String(raw?.recovery_state))
    ? raw.recovery_state
    : "no_transfer_check";

  return {
    subject,
    misconception_code: misconceptionCode,
    evidence_group_key: String(
      raw?.evidence_group_key ||
        raw?.concept_key ||
        raw?.skill ||
        misconceptionCode,
    ),
    concept_key: raw?.concept_key ? String(raw.concept_key) : null,
    skill: raw?.skill ? String(raw.skill) : null,
    topic_title: raw?.topic_title ? String(raw.topic_title) : null,
    topic_id: raw?.topic_id ? String(raw.topic_id) : null,
    primary_level: nullableNumber(raw?.primary_level),
    occurrences: numberValue(raw?.occurrences),
    distinct_questions: numberValue(raw?.distinct_questions),
    distinct_attempts: numberValue(raw?.distinct_attempts),
    distinct_quizzes: numberValue(raw?.distinct_quizzes),
    first_seen_at: String(raw?.first_seen_at || ""),
    last_seen_at: String(raw?.last_seen_at || ""),
    hint_used_occurrences: numberValue(raw?.hint_used_occurrences),
    teaching_opened_occurrences: numberValue(raw?.teaching_opened_occurrences),
    quick_check_attempts: numberValue(raw?.quick_check_attempts),
    quick_check_correct_count: numberValue(raw?.quick_check_correct_count),
    quick_check_incorrect_count: numberValue(raw?.quick_check_incorrect_count),
    evidence_level: evidenceLevel,
    recovery_state: recoveryState,
  };
}

export function normaliseTeachingEvidencePayload(
  raw: any,
  learnerId: string,
): NovaTeachingEvidencePayload {
  const rawSubject = String(raw?.subject || "").toLowerCase();

  const signals = Array.isArray(raw?.signals)
    ? (raw.signals.map(normaliseSignal).filter(Boolean) as NovaTeachingSignal[])
    : [];

  const activity = Array.isArray(raw?.activity)
    ? raw.activity
        .filter((item: any) => {
          const subject = String(item?.subject || "").toLowerCase();
          return subject === "english" || subject === "math";
        })
        .map((item: any): NovaTeachingActivity => ({
          subject: String(item.subject).toLowerCase() as NovaTeachingSubject,
          hints_opened: numberValue(item.hints_opened),
          lessons_opened: numberValue(item.lessons_opened),
          teach_me_opened: numberValue(item.teach_me_opened),
          misconceptions_shown: numberValue(item.misconceptions_shown),
          quick_checks_answered: numberValue(item.quick_checks_answered),
          quick_checks_correct: numberValue(item.quick_checks_correct),
        }))
    : [];

  return {
    student_user_id: String(raw?.student_user_id || learnerId),
    generated_at: String(raw?.generated_at || new Date().toISOString()),
    window_days: numberValue(raw?.window_days) || 90,
    subject:
      rawSubject === "english" || rawSubject === "math" ? rawSubject : null,
    signals,
    activity,
  };
}

function evidenceLevelRank(level: NovaTeachingEvidenceLevel) {
  switch (level) {
    case "likely_gap":
      return 3;
    case "emerging_pattern":
      return 2;
    default:
      return 1;
  }
}

function recoveryRank(state: NovaTeachingRecoveryState) {
  switch (state) {
    case "needs_reinforcement":
      return 4;
    case "mixed_transfer":
      return 3;
    case "no_transfer_check":
      return 2;
    case "recovery_signal":
      return 1;
  }
}

export function sortTeachingSignals(signals: NovaTeachingSignal[]) {
  return [...signals].sort((a, b) => {
    return (
      evidenceLevelRank(b.evidence_level) - evidenceLevelRank(a.evidence_level) ||
      recoveryRank(b.recovery_state) - recoveryRank(a.recovery_state) ||
      b.distinct_questions - a.distinct_questions ||
      Date.parse(b.last_seen_at || "") - Date.parse(a.last_seen_at || "")
    );
  });
}

export function buildTeachingSignalsByConceptKey(signals: NovaTeachingSignal[]) {
  const result = new Map<string, NovaTeachingSignal[]>();

  for (const signal of signals) {
    const key = teachingConceptMapKey(signal.subject, signal.concept_key);
    if (!key) continue;
    result.set(key, [...(result.get(key) || []), signal]);
  }

  for (const [key, rows] of result.entries()) {
    result.set(key, sortTeachingSignals(rows));
  }

  return result;
}

export function teachingSignalsForSkill(
  skill: ProfileSkill,
  byConceptKey: Map<string, NovaTeachingSignal[]>,
) {
  const key = teachingConceptMapKey(skill.subject, skill.skill_code);
  return key ? byConceptKey.get(key) || [] : [];
}

export function humaniseMisconceptionCode(code: string) {
  const text = String(code || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!text) return "Learning pattern";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function teachingEvidenceHeadline(signal: NovaTeachingSignal) {
  if (signal.recovery_state === "needs_reinforcement") return "Needs more practice";
  if (signal.recovery_state === "recovery_signal") return "Responding to support";
  if (signal.recovery_state === "mixed_transfer") return "Mixed response to support";
  if (signal.evidence_level === "likely_gap") return "Repeated difficulty";
  if (signal.evidence_level === "emerging_pattern") return "Pattern emerging";
  return "Observed once";
}

export function teachingEvidenceExplanation(signal: NovaTeachingSignal) {
  if (signal.evidence_level === "observation") {
    return "This has been seen once, so Nova treats it as an observation rather than a confirmed gap.";
  }

  if (signal.evidence_level === "emerging_pattern") {
    return `The same difficulty has appeared across ${signal.distinct_questions} different questions.`;
  }

  return `The same difficulty has appeared across ${signal.distinct_questions} different questions, giving Nova repeated evidence.`;
}

export function teachingRecoveryExplanation(
  signal: NovaTeachingSignal,
  accountName = "This account",
) {
  switch (signal.recovery_state) {
    case "recovery_signal":
      return `${accountName} then answered the transfer check correctly, suggesting the support helped.`;
    case "needs_reinforcement":
      return "The transfer check was still difficult after support, so this concept may need another explanation or more practice.";
    case "mixed_transfer":
      return "Transfer checks have been mixed, so Nova will keep gathering evidence before drawing a stronger conclusion.";
    default:
      return "There is no transfer-check evidence for this pattern yet.";
  }
}
