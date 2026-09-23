import { MILESTONES, type Milestone } from "./milestones";
import styles from "./SubjectMilestoneCard.module.css";

type Props = {
  milestone: Milestone | null;
  accent: string;
};

export default function MilestoneTrack({ milestone, accent }: Props) {
  return (
    <div className={`${styles.trackWrap} ${!milestone ? styles.trackPending : ""}`}>
      <div className={styles.track} aria-label={milestone ? `Milestone ${milestone.level} of 6` : "Building picture"}>
        {MILESTONES.map((item, index) => {
          const reached = Boolean(milestone && item.level <= milestone.level);
          const current = Boolean(milestone && item.level === milestone.level);

          return (
            <div className={styles.trackStep} key={item.level}>
              <span
                className={`${styles.trackDot} ${reached ? styles.trackDotReached : ""} ${current ? styles.trackDotCurrent : ""}`}
                style={reached ? { borderColor: accent, background: accent } : undefined}
              />
              {index < MILESTONES.length - 1 && (
                <span
                  className={`${styles.trackLine} ${milestone && item.level < milestone.level ? styles.trackLineReached : ""}`}
                  style={milestone && item.level < milestone.level ? { background: accent } : undefined}
                />
              )}
              <span className={styles.trackNumber}>{item.level}</span>
            </div>
          );
        })}
      </div>
      <div className={styles.trackEnds} aria-hidden="true">
        <span>Starting</span>
        <span>Strong</span>
      </div>
    </div>
  );
}
