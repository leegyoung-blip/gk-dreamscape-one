import type { ProfileSubjectSummary } from "@/lib/nova-plus/types";
import { safeNumber } from "@/lib/nova-plus/helpers";
import MilestoneTrack from "./MilestoneTrack";
import { milestoneForEvidence } from "./milestones";
import styles from "./SubjectMilestoneCard.module.css";

type Props = {
  summary: ProfileSubjectSummary | null;
  label: string;
  icon: string;
  statusLabel: string;
  colour: string;
  soft: string;
  border: string;
};

export default function SubjectMilestoneCard({
  summary,
  label,
  icon,
  statusLabel,
  colour,
  soft,
  border,
}: Props) {
  const milestone = milestoneForEvidence(
    safeNumber(summary?.mastery_score),
    safeNumber(summary?.questions_attempted),
  );

  return (
    <article
      className={styles.card}
      style={{
        borderColor: border,
        background: `linear-gradient(145deg, ${soft}, rgba(4, 13, 29, 0.88))`,
        boxShadow: `inset 0 0 36px ${soft}`,
      }}
    >
      <div className={styles.topRow}>
        <span className={styles.icon} style={{ color: colour, borderColor: border, background: soft }}>
          {icon}
        </span>
        <span className={styles.statusPill} style={{ color: colour, borderColor: border, background: soft }}>
          {statusLabel}
        </span>
      </div>

      <h4>{label}</h4>

      {milestone ? (
        <div className={styles.milestoneHeading}>
          <span>MILESTONE {milestone.level}</span>
          <strong>{milestone.label}</strong>
        </div>
      ) : (
        <div className={styles.milestoneHeading}>
          <span>LEARNING EVIDENCE</span>
          <strong>Building Picture</strong>
          <small>More recorded learning is needed before Nova sets a milestone.</small>
        </div>
      )}

      <MilestoneTrack milestone={milestone} accent={colour} />
    </article>
  );
}
