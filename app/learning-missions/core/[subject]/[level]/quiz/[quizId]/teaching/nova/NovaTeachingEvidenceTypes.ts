import type { CoreSubject } from "../../CoreQuizTypes";

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
  subject: CoreSubject;
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
  subject: CoreSubject;
  hints_opened: number;
  lessons_opened: number;
  teach_me_opened: number;
  misconceptions_shown: number;
  quick_checks_answered: number;
  quick_checks_correct: number;
};

export type NovaTeachingEvidencePayload = {
  generated_at: string;
  window_days: number;
  subject: CoreSubject | null;
  signals: NovaTeachingSignal[];
  activity: NovaTeachingActivity[];
};

export type NovaTeachingEvidenceContribution = {
  subject: CoreSubject;
  conceptKey: string | null;
  skill: string | null;
  topicTitle: string | null;
  misconceptionCode: string;
  evidenceLevel: NovaTeachingEvidenceLevel;
  recoveryState: NovaTeachingRecoveryState;
  distinctQuestions: number;
  distinctAttempts: number;
  lastSeenAt: string;
};
