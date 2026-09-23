import type { NovaTeachingSignal } from "@/lib/nova-plus/teaching-evidence";
import {
  humaniseMisconceptionCode,
  teachingEvidenceExplanation,
  teachingEvidenceHeadline,
  teachingRecoveryExplanation,
} from "@/lib/nova-plus/teaching-evidence";
import styles from "./MasteryTeachingSignal.module.css";

export type TeachingHaloKind =
  | "observed"
  | "recovery"
  | "mixed"
  | "reinforcement";

export function teachingHaloKind(
  signal: NovaTeachingSignal | null | undefined,
): TeachingHaloKind | null {
  if (!signal) return null;
  if (signal.recovery_state === "needs_reinforcement") return "reinforcement";
  if (signal.recovery_state === "recovery_signal") return "recovery";
  if (signal.recovery_state === "mixed_transfer") return "mixed";
  return "observed";
}

export function teachingHaloClassName(
  kind: TeachingHaloKind | null,
  classNames: Record<string, string>,
) {
  if (!kind) return "";
  if (kind === "reinforcement") return classNames.haloReinforcement || "";
  if (kind === "recovery") return classNames.haloRecovery || "";
  if (kind === "mixed") return classNames.haloMixed || "";
  return classNames.haloObserved || "";
}

export default function MasteryTeachingSignal({
  signals,
  accountName,
}: {
  signals: NovaTeachingSignal[];
  accountName: string;
}) {
  const primary = signals[0];
  if (!primary) return null;

  const correct = primary.quick_check_correct_count;
  const attempts = primary.quick_check_attempts;

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div className={styles.mark}>N+</div>
        <div>
          <span>TEACHING RESPONSE</span>
          <strong>{teachingEvidenceHeadline(primary)}</strong>
        </div>
      </div>

      <div className={styles.signalCopy}>
        <strong>{humaniseMisconceptionCode(primary.misconception_code)}</strong>
        <p>{teachingEvidenceExplanation(primary)}</p>
        {attempts > 0 && (
          <p>{teachingRecoveryExplanation(primary, accountName)}</p>
        )}
      </div>

      <div className={styles.metrics}>
        <span>
          <small>Questions</small>
          <b>{primary.distinct_questions}</b>
        </span>
        <span>
          <small>Teaching opens</small>
          <b>{primary.teaching_opened_occurrences}</b>
        </span>
        <span>
          <small>Quick Checks</small>
          <b>{attempts > 0 ? `${correct}/${attempts}` : "—"}</b>
        </span>
      </div>

      {signals.length > 1 && (
        <small className={styles.moreSignals}>
          +{signals.length - 1} other teaching pattern
          {signals.length - 1 === 1 ? "" : "s"} recorded for this concept.
        </small>
      )}
    </section>
  );
}
