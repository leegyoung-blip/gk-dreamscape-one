import type { NovaSubjectKey, ProfileSubjectSummary } from "@/lib/nova-plus/types";
import { safeNumber, SUBJECT_META } from "@/lib/nova-plus/helpers";
import MilestoneTrack from "./MilestoneTrack";
import { milestoneFromScore } from "./milestones";
import styles from "./SubjectMilestoneCard.module.css";

type StatusMeta = {
  colour: string;
  soft: string;
  border: string;
};

type Props = {
  subjectKey: NovaSubjectKey;
  summary: ProfileSubjectSummary | null;
  statusLabel: string;
  statusMeta: StatusMeta;
};

export default function SubjectMilestoneCard({
  subjectKey,
  summary,
  statusLabel,
  statusMeta,
}: Props) {
  const subjectMeta = SUBJECT_META[subjectKey];
  const hasEvidence = Boolean(summary && safeNumber(summary.questions_attempted) >= 5);
  const milestone = hasEvidence
    ? milestoneFromScore(safeNumber(summary?.mastery_score))
    : null;

  return (
    <article
      className={styles.card}
      style={{
        borderColor: statusMeta.border,
        background: `radial-gradient(circle at 84% 14%, ${statusMeta.soft}, transparent 34%), linear-gradient(145deg, ${statusMeta.soft}, rgba(4, 13, 29, 0.91))`,
        boxShadow: `inset 0 0 42px ${statusMeta.soft}`,
      }}
    >
      <div className={styles.topRow}>
        <span
          className={styles.subjectIcon}
          style={{
            color: statusMeta.colour,
            borderColor: statusMeta.border,
            background: statusMeta.soft,
          }}
          aria-hidden="true"
        >
          {subjectMeta.icon}
        </span>

        <span
          className={styles.statusPill}
          style={{
            color: statusMeta.colour,
            borderColor: statusMeta.border,
            background: statusMeta.soft,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className={styles.subjectHeading}>
        <h4>{subjectMeta.label}</h4>
        {hasEvidence && milestone ? (
          <span className={styles.milestoneNumber}>MILESTONE {milestone.level}</span>
        ) : (
          <span className={styles.milestoneNumber}>LEARNING PICTURE</span>
        )}
      </div>

      <div className={styles.milestoneSummary}>
        {hasEvidence && milestone ? (
          <>
            <strong style={{ color: statusMeta.colour }}>{milestone.label}</strong>
            <small>Milestone {milestone.level} of 6</small>
          </>
        ) : (
          <>
            <strong className={styles.pendingTitle}>Building Picture</strong>
            <small>Nova needs a little more recorded learning evidence.</small>
          </>
        )}
      </div>

      <MilestoneTrack
        level={milestone?.level ?? null}
        accent={statusMeta.colour}
        buildingPicture={!hasEvidence}
      />
    </article>
  );
}
