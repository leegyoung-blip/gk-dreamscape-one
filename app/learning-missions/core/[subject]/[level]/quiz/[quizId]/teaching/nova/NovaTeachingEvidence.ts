"use client";

import { supabase } from "@/lib/supabase";
import type { CoreSubject } from "../../CoreQuizTypes";
import type {
  NovaTeachingEvidenceContribution,
  NovaTeachingEvidencePayload,
  NovaTeachingSignal,
} from "./NovaTeachingEvidenceTypes";

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseSignal(raw: any): NovaTeachingSignal | null {
  if (!raw || (raw.subject !== "english" && raw.subject !== "math")) return null;
  if (!raw.misconception_code) return null;

  const evidenceLevel = ["observation", "emerging_pattern", "likely_gap"].includes(
    String(raw.evidence_level),
  )
    ? raw.evidence_level
    : "observation";

  const recoveryState = [
    "no_transfer_check",
    "recovery_signal",
    "needs_reinforcement",
    "mixed_transfer",
  ].includes(String(raw.recovery_state))
    ? raw.recovery_state
    : "no_transfer_check";

  return {
    subject: raw.subject,
    misconception_code: String(raw.misconception_code),
    evidence_group_key: String(
      raw.evidence_group_key || raw.concept_key || raw.skill || raw.misconception_code,
    ),
    concept_key: raw.concept_key ? String(raw.concept_key) : null,
    skill: raw.skill ? String(raw.skill) : null,
    topic_title: raw.topic_title ? String(raw.topic_title) : null,
    topic_id: raw.topic_id ? String(raw.topic_id) : null,
    primary_level: nullableNumber(raw.primary_level),
    occurrences: numberValue(raw.occurrences),
    distinct_questions: numberValue(raw.distinct_questions),
    distinct_attempts: numberValue(raw.distinct_attempts),
    distinct_quizzes: numberValue(raw.distinct_quizzes),
    first_seen_at: String(raw.first_seen_at || ""),
    last_seen_at: String(raw.last_seen_at || ""),
    hint_used_occurrences: numberValue(raw.hint_used_occurrences),
    teaching_opened_occurrences: numberValue(raw.teaching_opened_occurrences),
    quick_check_attempts: numberValue(raw.quick_check_attempts),
    quick_check_correct_count: numberValue(raw.quick_check_correct_count),
    quick_check_incorrect_count: numberValue(raw.quick_check_incorrect_count),
    evidence_level: evidenceLevel,
    recovery_state: recoveryState,
  };
}

export async function loadNovaTeachingEvidence({
  subject,
  days = 90,
}: {
  subject?: CoreSubject | null;
  days?: number;
} = {}): Promise<NovaTeachingEvidencePayload> {
  const { data, error } = await supabase.rpc("get_my_core_teaching_evidence", {
    p_subject: subject || null,
    p_days: Math.max(7, Math.min(Math.round(days), 365)),
  });

  if (error) throw error;

  const raw = (data || {}) as any;
  const signals = Array.isArray(raw.signals)
    ? raw.signals.map(normaliseSignal).filter(Boolean) as NovaTeachingSignal[]
    : [];

  const activity = Array.isArray(raw.activity)
    ? raw.activity
        .filter((item: any) => item?.subject === "english" || item?.subject === "math")
        .map((item: any) => ({
          subject: item.subject as CoreSubject,
          hints_opened: numberValue(item.hints_opened),
          lessons_opened: numberValue(item.lessons_opened),
          teach_me_opened: numberValue(item.teach_me_opened),
          misconceptions_shown: numberValue(item.misconceptions_shown),
          quick_checks_answered: numberValue(item.quick_checks_answered),
          quick_checks_correct: numberValue(item.quick_checks_correct),
        }))
    : [];

  return {
    generated_at: String(raw.generated_at || new Date().toISOString()),
    window_days: numberValue(raw.window_days) || 90,
    subject:
      raw.subject === "english" || raw.subject === "math" ? raw.subject : null,
    signals,
    activity,
  };
}

/**
 * Read-only adapter for Nova+.
 * These contributions are evidence overlays only: callers must not turn them
 * directly into mastery scores without the later mastery-integration policy.
 */
export function toNovaTeachingEvidenceContributions(
  payload: NovaTeachingEvidencePayload,
): NovaTeachingEvidenceContribution[] {
  return payload.signals.map((signal) => ({
    subject: signal.subject,
    conceptKey: signal.concept_key,
    skill: signal.skill,
    topicTitle: signal.topic_title,
    misconceptionCode: signal.misconception_code,
    evidenceLevel: signal.evidence_level,
    recoveryState: signal.recovery_state,
    distinctQuestions: signal.distinct_questions,
    distinctAttempts: signal.distinct_attempts,
    lastSeenAt: signal.last_seen_at,
  }));
}
