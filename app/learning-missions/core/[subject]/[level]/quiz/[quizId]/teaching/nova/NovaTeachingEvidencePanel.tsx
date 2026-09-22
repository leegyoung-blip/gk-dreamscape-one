"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoreSubject } from "../../CoreQuizTypes";
import { loadNovaTeachingEvidence } from "./NovaTeachingEvidence";
import type {
  NovaTeachingEvidencePayload,
  NovaTeachingSignal,
} from "./NovaTeachingEvidenceTypes";
import styles from "./NovaTeachingEvidencePanel.module.css";

function signalLabel(signal: NovaTeachingSignal) {
  if (signal.evidence_level === "likely_gap") return "Likely gap";
  if (signal.evidence_level === "emerging_pattern") return "Emerging pattern";
  return "Observation";
}

function recoveryLabel(signal: NovaTeachingSignal) {
  switch (signal.recovery_state) {
    case "recovery_signal":
      return "Transfer check recovered";
    case "needs_reinforcement":
      return "Transfer check still difficult";
    case "mixed_transfer":
      return "Mixed transfer results";
    default:
      return "No transfer check yet";
  }
}

function displayName(signal: NovaTeachingSignal) {
  return signal.skill || signal.topic_title || signal.misconception_code.replaceAll("_", " ");
}

export default function NovaTeachingEvidencePanel({
  subject,
  days = 90,
  maxSignals = 6,
}: {
  subject?: CoreSubject;
  days?: number;
  maxSignals?: number;
}) {
  const [payload, setPayload] = useState<NovaTeachingEvidencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await loadNovaTeachingEvidence({ subject, days });
        if (!cancelled) setPayload(next);
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || "Teaching evidence could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [days, subject]);

  const signals = useMemo(
    () => (payload?.signals || []).slice(0, Math.max(1, maxSignals)),
    [maxSignals, payload?.signals],
  );

  if (loading) {
    return <section className={styles.panel}>Loading teaching evidence…</section>;
  }

  if (error) {
    return (
      <section className={styles.panel}>
        <p className={styles.muted}>{error}</p>
      </section>
    );
  }

  if (!payload || payload.signals.length === 0) {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>TEACHING EVIDENCE</p>
            <h3 className={styles.title}>No repeated teaching patterns yet</h3>
          </div>
        </div>
        <p className={styles.muted}>
          Nova+ will show patterns here after authored misconception feedback and
          Quick Checks have been used across Core Missions.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>TEACHING EVIDENCE</p>
          <h3 className={styles.title}>Patterns from recent Core Missions</h3>
          <p className={styles.subtitle}>
            Based on the last {payload.window_days} days. This is supporting
            evidence and does not change mastery scores by itself.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {signals.map((signal) => (
          <article
            key={`${signal.subject}:${signal.evidence_group_key}:${signal.misconception_code}`}
            className={styles.card}
            data-evidence-level={signal.evidence_level}
            data-recovery-state={signal.recovery_state}
          >
            <div className={styles.cardTop}>
              <span className={styles.levelBadge}>{signalLabel(signal)}</span>
              {signal.primary_level ? (
                <span className={styles.levelMeta}>P{signal.primary_level}</span>
              ) : null}
            </div>

            <h4 className={styles.cardTitle}>{displayName(signal)}</h4>
            <p className={styles.code}>{signal.misconception_code.replaceAll("_", " ")}</p>

            <div className={styles.metrics}>
              <span>{signal.distinct_questions} question{signal.distinct_questions === 1 ? "" : "s"}</span>
              <span>{signal.distinct_attempts} attempt{signal.distinct_attempts === 1 ? "" : "s"}</span>
            </div>

            <div className={styles.recovery}>{recoveryLabel(signal)}</div>

            {signal.quick_check_attempts > 0 ? (
              <p className={styles.quickCheck}>
                Quick Check: {signal.quick_check_correct_count}/{signal.quick_check_attempts} correct
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
