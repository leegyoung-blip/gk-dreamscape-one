"use client";

import { useEffect } from "react";
import { MILESTONES } from "./milestones";
import styles from "./MilestoneInfoModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

const DESCRIPTIONS: Record<number, string> = {
  1: "Early evidence is forming. Nova is beginning to understand the learner’s current foundations.",
  2: "Foundations are taking shape, with some skills beginning to show more consistent evidence.",
  3: "Progress is becoming clearer as more skills show secure and repeatable understanding.",
  4: "Evidence shows growing consistency across the subject, with fewer areas still needing reinforcement.",
  5: "Learning is increasingly secure and consistent across a broad range of recent evidence.",
  6: "Recent evidence is consistently strong across the subject and shows a well-established learning picture.",
};

export default function MilestoneInfoModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-info-title"
      >
        <div className={styles.header}>
          <div>
            <span>SUBJECT MILESTONES</span>
            <h2 id="milestone-info-title">How milestones work</h2>
            <p>
              Nova uses recorded learning evidence to show where each subject currently stands.
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.pictureCard}>
          <div className={styles.pictureIcon}>◎</div>
          <div>
            <strong>Building Picture</strong>
            <p>
              This appears before a milestone when Nova does not yet have enough recorded evidence to form a reliable subject picture.
            </p>
          </div>
        </div>

        <div className={styles.milestoneGrid}>
          {MILESTONES.map((milestone) => (
            <article key={milestone.level} className={styles.milestoneCard}>
              <span className={styles.levelBadge}>{milestone.level}</span>
              <div>
                <small>MILESTONE {milestone.level}</small>
                <strong>{milestone.label}</strong>
                <p>{DESCRIPTIONS[milestone.level]}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.notes}>
          <div>
            <strong>Evidence-based, not an exam grade</strong>
            <p>
              Milestones summarise Nova’s current learning evidence. They are not exam marks and they are not class rankings.
            </p>
          </div>
          <div>
            <strong>Designed to change</strong>
            <p>
              A milestone can move as new evidence is added. Movement in either direction helps Nova keep the learning picture current.
            </p>
          </div>
          <div>
            <strong>Milestone and status are separate signals</strong>
            <p>
              The milestone shows progress across six stages. Strong, Developing and Needs Attention remain quick status signals for the current evidence picture.
            </p>
          </div>
        </div>

        <button type="button" className={styles.doneButton} onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  );
}
