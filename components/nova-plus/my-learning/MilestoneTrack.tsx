import { MILESTONES, type MilestoneLevel } from "./milestones";
import styles from "./SubjectMilestoneCard.module.css";

type Props = {
  level: MilestoneLevel | null;
  accent: string;
  buildingPicture?: boolean;
};

export default function MilestoneTrack({
  level,
  accent,
  buildingPicture = false,
}: Props) {
  return (
    <div
      className={`${styles.trackWrap} ${buildingPicture ? styles.trackPending : ""}`}
      aria-label={
        buildingPicture || !level
          ? "Milestone track. Building picture."
          : `Milestone ${level} of 6`
      }
    >
      <div className={styles.track} aria-hidden="true">
        <span className={styles.trackBase} />
        {!buildingPicture && level ? (
          <span
            className={styles.trackProgress}
            style={{
              width: `${((level - 1) / (MILESTONES.length - 1)) * 100}%`,
              background: accent,
              boxShadow: `0 0 14px ${accent}55`,
            }}
          />
        ) : null}

        {MILESTONES.map((milestone) => {
          const reached = Boolean(level && milestone.level <= level && !buildingPicture);
          const current = Boolean(level === milestone.level && !buildingPicture);

          return (
            <span
              key={milestone.level}
              className={`${styles.node} ${reached ? styles.nodeReached : ""} ${
                current ? styles.nodeCurrent : ""
              }`}
              style={
                reached
                  ? {
                      borderColor: accent,
                      background: current ? accent : "rgba(4, 13, 29, 0.96)",
                      boxShadow: current
                        ? `0 0 0 4px ${accent}22, 0 0 18px ${accent}66`
                        : `0 0 10px ${accent}33`,
                    }
                  : undefined
              }
            >
              <span>{milestone.level}</span>
            </span>
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
