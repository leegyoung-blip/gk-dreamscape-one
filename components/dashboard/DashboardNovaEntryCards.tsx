"use client";

import Link from "next/link";
import styles from "./DashboardNovaEntryCards.module.css";

type DashboardNovaEntryCardsProps = {
  studentId: string | null;
  showNovaPlus: boolean;
  onOpenLearningSummary: () => void;
};

export default function DashboardNovaEntryCards({
  studentId,
  showNovaPlus,
  onOpenLearningSummary,
}: DashboardNovaEntryCardsProps) {
  const novaPlusHref = studentId
    ? `/nova-plus?student=${encodeURIComponent(studentId)}`
    : "/nova-plus";

  return (
    <section className={styles.grid} aria-label="Nova learning tools">
      <button
        type="button"
        className={`${styles.card} ${styles.summaryCard}`}
        onClick={onOpenLearningSummary}
      >
        <div className={styles.topRow}>
          <span className={styles.brand}>NOVA</span>
          <span className={styles.icon} aria-hidden="true">
            ◎
          </span>
        </div>

        <div className={styles.copy}>
          <h2>Learning Summary</h2>
          <p>
            Weekly performance, strengths and next steps from the learner&apos;s
            recent activity.
          </p>
        </div>

        <span className={styles.action}>
          Open summary
          <b>→</b>
        </span>
      </button>

      {showNovaPlus && (
        <Link
          href={novaPlusHref}
          className={`${styles.card} ${styles.novaPlusCard}`}
        >
          <div className={styles.topRow}>
            <span className={styles.novaPlusBrand}>NOVA+</span>
            <span className={styles.premiumMark} aria-hidden="true">
              ✦
            </span>
          </div>

          <div className={styles.copy}>
            <h2>Learning Intelligence</h2>
            <p>
              Deeper strengths, learning gaps, mastery progress and personalised
              next steps.
            </p>
          </div>

          <span className={`${styles.action} ${styles.novaPlusAction}`}>
            Open NOVA+
            <b>→</b>
          </span>
        </Link>
      )}
    </section>
  );
}
