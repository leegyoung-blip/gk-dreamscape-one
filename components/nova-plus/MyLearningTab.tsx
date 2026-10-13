"use client";

import { useState } from "react";
import LearnerAvatarPicker from "@/components/nova-plus/LearnerAvatarPicker";
import { useEnglishMastery } from "@/components/nova-plus/EnglishMasteryProvider";
import type {
  NovaPlusProfilePayload,
  NovaSubjectKey,
  ProfileSubjectSummary,
} from "@/lib/nova-plus/types";
import {
  safeNumber,
  SUBJECT_META,
  subjectState,
  subjectStateLabel,
  type SubjectState,
} from "@/lib/nova-plus/helpers";
import {
  ENGLISH_STAGE_COLOURS,
  ENGLISH_STAGE_ORDER,
  englishMasteriesAtLevel,
  englishStageCounts,
  inferCurrentEnglishLevel,
  priorityEnglishMastery,
  strongestEnglishMastery,
} from "@/lib/nova-plus/english-mastery-ui";
import styles from "./MyLearningTab.module.css";

type Props = {
  learnerId: string;
  learnerLabel: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

const LEGACY_CURRICULUM_SUBJECTS: NovaSubjectKey[] = ["math", "science"];

const STATE_META: Record<
  SubjectState,
  { colour: string; soft: string; border: string }
> = {
  strong: {
    colour: "#4de2a1",
    soft: "rgba(77, 226, 161, 0.09)",
    border: "rgba(77, 226, 161, 0.34)",
  },
  developing: {
    colour: "#ffae57",
    soft: "rgba(255, 174, 87, 0.09)",
    border: "rgba(255, 174, 87, 0.34)",
  },
  attention: {
    colour: "#ff6c72",
    soft: "rgba(255, 108, 114, 0.09)",
    border: "rgba(255, 108, 114, 0.36)",
  },
  unknown: {
    colour: "#8ea2ba",
    soft: "rgba(142, 162, 186, 0.07)",
    border: "rgba(142, 162, 186, 0.22)",
  },
};

function summaryFor(profile: NovaPlusProfilePayload, subject: NovaSubjectKey) {
  return (
    profile.subject_summaries.find(
      (summary) => String(summary.subject).toLowerCase() === subject,
    ) ?? null
  );
}

function strongestSubject(rows: Array<ProfileSubjectSummary | null>) {
  return (
    [...rows]
      .filter(
        (row): row is ProfileSubjectSummary =>
          Boolean(row && row.questions_attempted >= 5),
      )
      .sort(
        (a, b) =>
          safeNumber(b.mastery_score) - safeNumber(a.mastery_score),
      )[0] ?? null
  );
}

function prioritySubject(rows: Array<ProfileSubjectSummary | null>) {
  return (
    [...rows]
      .filter(
        (row): row is ProfileSubjectSummary =>
          Boolean(row && row.questions_attempted >= 5),
      )
      .sort(
        (a, b) =>
          safeNumber(a.mastery_score) - safeNumber(b.mastery_score),
      )[0] ?? null
  );
}

function ScoreInfo() {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`${styles.scoreInfo} ${open ? styles.scoreInfoOpen : ""}`}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={styles.scoreInfoButton}
        aria-label="How does Nova measure mastery?"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      >
        i
      </button>

      <span className={styles.scoreInfoPopover} role="tooltip">
        <strong>How Nova measures learning</strong>
        <span>
          English uses six mastery stages from <b>Starting</b> to <b>Strong</b>.
        </span>
        <span>
          <b>Evidence Confidence</b> tells you how certain Nova is about that
          judgement.
        </span>
        <span>
          Mathematics and Science keep their current NOVA+ status model while
          their mastery engines are upgraded.
        </span>
        <small>
          A low English mastery stage with Low evidence is not treated as a
          confirmed weakness. Nova first asks for more evidence.
        </small>
      </span>
    </span>
  );
}

function EnglishMasteryCard({
  profile,
  legacyProfile,
  loading,
  error,
}: {
  profile: ReturnType<typeof useEnglishMastery>["profile"];
  legacyProfile: NovaPlusProfilePayload;
  loading: boolean;
  error: string | null;
}) {
  const level = inferCurrentEnglishLevel(profile, legacyProfile);
  const items = englishMasteriesAtLevel(profile, level);
  const counts = englishStageCounts(items);
  const assessed = items.filter(
    (item) => item.stage !== "Not Yet Assessed",
  ).length;
  const highConfidence = items.filter(
    (item) =>
      item.stage !== "Not Yet Assessed" &&
      item.evidence_confidence === "High",
  ).length;
  const strong = counts.Strong + counts.Consolidating;

  return (
    <article
      className={styles.subjectCard}
      style={{
        borderColor: "rgba(123, 200, 255, .34)",
        background:
          "linear-gradient(145deg, rgba(123, 200, 255, .09), rgba(4, 13, 29, .88))",
        boxShadow: "inset 0 0 36px rgba(123, 200, 255, .06)",
      }}
    >
      <div className={styles.subjectTop}>
        <span
          className={styles.subjectIcon}
          style={{
            color: "#7bc8ff",
            borderColor: "rgba(123, 200, 255, .34)",
            background: "rgba(123, 200, 255, .09)",
          }}
        >
          {SUBJECT_META.english.icon}
        </span>
        <span
          className={styles.statusPill}
          style={{
            color: "#7bc8ff",
            borderColor: "rgba(123, 200, 255, .34)",
            background: "rgba(123, 200, 255, .09)",
          }}
        >
          {loading
            ? "Loading mastery"
            : error
              ? "Mastery unavailable"
              : assessed
                ? `P${level} · ${assessed}/${items.length} assessed`
                : `P${level} · Not Yet Assessed`}
        </span>
      </div>

      <h4>English</h4>

      {error ? (
        <div className={styles.masteryLine}>
          <strong style={{ color: "#8999ad", fontSize: "1rem" }}>—</strong>
          <span>Use Refresh to try again</span>
        </div>
      ) : loading && !profile ? (
        <div className={styles.masteryLine}>
          <strong style={{ color: "#8999ad", fontSize: "1rem" }}>…</strong>
          <span>building mastery picture</span>
        </div>
      ) : (
        <>
          <div className={styles.masteryLine}>
            <strong style={{ color: "#7bc8ff", fontSize: "1.15rem" }}>
              {strong}
            </strong>
            <span>
              {strong === 1
                ? "mastery Consolidating or Strong"
                : "masteries Consolidating or Strong"}
            </span>
          </div>

          <div
            aria-label={`English P${level} mastery-stage distribution`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              gap: 4,
              marginTop: 10,
            }}
          >
            {ENGLISH_STAGE_ORDER.map((stage) => (
              <div
                key={stage}
                title={`${stage}: ${counts[stage]}`}
                style={{
                  minWidth: 0,
                  borderRadius: 999,
                  height: 7,
                  background:
                    counts[stage] > 0
                      ? ENGLISH_STAGE_COLOURS[stage]
                      : "rgba(137,153,173,.14)",
                  opacity: counts[stage] > 0 ? 1 : 0.55,
                }}
              />
            ))}
          </div>

          <small
            style={{
              display: "block",
              marginTop: 9,
              color: "rgba(215,228,246,.58)",
              lineHeight: 1.45,
            }}
          >
            {counts["Not Yet Assessed"]} not yet assessed · {highConfidence}{" "}
            high-confidence judgement{highConfidence === 1 ? "" : "s"}
          </small>
        </>
      )}
    </article>
  );
}

export default function MyLearningTab({
  learnerId,
  learnerLabel,
  profile,
  onOpenRecommendations,
}: Props) {
  const englishMastery = useEnglishMastery();
  const currentEnglishLevel = inferCurrentEnglishLevel(
    englishMastery.profile,
    profile,
  );
  const englishItems = englishMasteriesAtLevel(
    englishMastery.profile,
    currentEnglishLevel,
  );
  const englishStrongest = strongestEnglishMastery(englishItems);
  const englishPriority = priorityEnglishMastery(englishItems);

  const legacyRows = LEGACY_CURRICULUM_SUBJECTS.map((subject) =>
    summaryFor(profile, subject),
  );
  const strongestLegacy = strongestSubject(legacyRows);
  const priorityLegacy = prioritySubject(legacyRows);
  const knowledge = summaryFor(profile, "knowledge");

  // Keep the existing recommendation feed untouched in C3B. C3B only
  // converts learner-facing English mastery; recommendation ranking is later.
  const prioritySkills = profile.skills
    .filter(
      (skill) =>
        String(skill.subject || "").toLowerCase() !== "english" &&
        !skill.is_topic_level &&
        ["needs_support", "emerging", "developing", "review_due"].includes(
          skill.status,
        ),
    )
    .sort(
      (a, b) =>
        safeNumber(a.mastery_score) - safeNumber(b.mastery_score),
    );

  const nextLegacySkill = prioritySkills[0] ?? null;
  const recommendationSubject = nextLegacySkill?.subject
    ? SUBJECT_META[nextLegacySkill.subject as NovaSubjectKey]?.label ??
      nextLegacySkill.subject
    : priorityLegacy
      ? SUBJECT_META[priorityLegacy.subject as NovaSubjectKey]?.label ??
        priorityLegacy.subject
      : "Keep exploring";

  return (
    <div className={styles.page}>
      <section className={styles.introCard}>
        <div>
          <span className={styles.eyebrow}>MY LEARNING</span>
          <h2>Your learning at a glance</h2>
          <p>
            See what is strong, what is still developing, and where Nova needs
            more evidence.
          </p>
        </div>

        <div className={styles.legend} aria-label="Learning status">
          <span><i className={styles.legendStrong} /> Strong</span>
          <span><i className={styles.legendDeveloping} /> Developing</span>
          <span><i className={styles.legendAttention} /> Needs attention</span>
        </div>
      </section>

      <section className={styles.overviewGrid}>
        <aside className={styles.learnerPanel}>
          <div className={styles.avatarWrap}>
            <LearnerAvatarPicker
              learnerId={learnerId}
              learnerLabel={learnerLabel}
            />
          </div>

          <div className={styles.learnerIdentity}>
            <span>LEARNER PROFILE</span>
            <strong>{learnerLabel || "Learner"}</strong>
            <small>Choose the profile picture above at any time.</small>
          </div>

          <div className={styles.coachNote}>
            <img src="/nova/nova-character.png" alt="" aria-hidden="true" />
            <div>
              <span>NOVA</span>
              <strong>Learning from every piece of evidence.</strong>
              <small>
                English now uses difficulty, recency, repeated-question
                protection and Evidence Confidence.
              </small>
            </div>
          </div>
        </aside>

        <div className={styles.subjectPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>ACADEMIC PICTURE</span>
              <h3>English, Mathematics & Science</h3>
            </div>
            <ScoreInfo />
          </div>

          <div className={styles.subjectGrid}>
            <EnglishMasteryCard
              profile={englishMastery.profile}
              legacyProfile={profile}
              loading={englishMastery.loading}
              error={englishMastery.error}
            />

            {LEGACY_CURRICULUM_SUBJECTS.map((subjectKey) => {
              const summary = summaryFor(profile, subjectKey);
              const state = subjectState(summary);
              const stateMeta = STATE_META[state];
              const subjectMeta = SUBJECT_META[subjectKey];
              const hasEvidence = Boolean(
                summary && summary.questions_attempted >= 5,
              );

              return (
                <article
                  key={subjectKey}
                  className={styles.subjectCard}
                  style={{
                    borderColor: stateMeta.border,
                    background: `linear-gradient(145deg, ${stateMeta.soft}, rgba(4, 13, 29, 0.88))`,
                    boxShadow: `inset 0 0 36px ${stateMeta.soft}`,
                  }}
                >
                  <div className={styles.subjectTop}>
                    <span
                      className={styles.subjectIcon}
                      style={{
                        color: stateMeta.colour,
                        borderColor: stateMeta.border,
                        background: stateMeta.soft,
                      }}
                    >
                      {subjectMeta.icon}
                    </span>
                    <span
                      className={styles.statusPill}
                      style={{
                        color: stateMeta.colour,
                        borderColor: stateMeta.border,
                        background: stateMeta.soft,
                      }}
                    >
                      {subjectStateLabel(state)}
                    </span>
                  </div>

                  <h4>{subjectMeta.label}</h4>

                  <div className={styles.masteryLine}>
                    <strong style={{ color: stateMeta.colour }}>
                      {hasEvidence
                        ? `${Math.round(safeNumber(summary?.mastery_score))}%`
                        : "—"}
                    </strong>
                    <span>
                      {hasEvidence ? "current NOVA+ score" : "building picture"}
                    </span>
                  </div>

                  <div className={styles.statusBar}>
                    <div
                      style={{
                        width: hasEvidence
                          ? `${Math.max(
                              0,
                              Math.min(
                                100,
                                safeNumber(summary?.mastery_score),
                              ),
                            )}%`
                          : "18%",
                        background: stateMeta.colour,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          {(() => {
            const state = subjectState(knowledge);
            const stateMeta = STATE_META[state];
            const hasEvidence = Boolean(
              knowledge && knowledge.questions_attempted >= 5,
            );

            return (
              <article
                className={styles.knowledgeRow}
                style={{
                  borderColor: stateMeta.border,
                  background: `linear-gradient(145deg, ${stateMeta.soft}, rgba(4, 13, 29, 0.76))`,
                }}
              >
                <span
                  className={styles.knowledgeIcon}
                  style={{
                    color: stateMeta.colour,
                    borderColor: stateMeta.border,
                    background: stateMeta.soft,
                  }}
                >
                  ◎
                </span>
                <div>
                  <small>GENERAL KNOWLEDGE</small>
                  <strong>Knowledge Arena</strong>
                </div>
                <span
                  className={styles.knowledgeStatus}
                  style={{ color: stateMeta.colour }}
                >
                  {subjectStateLabel(state)}
                </span>
                <b>
                  {hasEvidence
                    ? `${Math.round(safeNumber(knowledge?.mastery_score))}%`
                    : "—"}
                </b>
              </article>
            );
          })()}
        </div>
      </section>

      <section className={styles.actionGrid}>
        <article className={`${styles.actionCard} ${styles.strongCard}`}>
          <span className={styles.actionMarker}>↗</span>
          <div>
            <span>
              {englishStrongest
                ? "STRONGEST ENGLISH MASTERY"
                : "STRONGEST RIGHT NOW"}
            </span>
            <strong>
              {englishStrongest?.mastery_name ??
                (strongestLegacy
                  ? SUBJECT_META[
                      strongestLegacy.subject as NovaSubjectKey
                    ]?.label ?? strongestLegacy.subject
                  : "Building your picture")}
            </strong>
            <small>
              {englishStrongest
                ? `${englishStrongest.stage} · ${englishStrongest.evidence_confidence} evidence`
                : strongestLegacy
                  ? `${Math.round(
                      safeNumber(strongestLegacy.mastery_score),
                    )}% current score`
                  : "Complete more missions"}
            </small>
          </div>
        </article>

        <article className={`${styles.actionCard} ${styles.attentionCard}`}>
          <span className={styles.actionMarker}>!</span>
          <div>
            <span>NEEDS ATTENTION</span>
            <strong>
              {englishPriority?.mastery_name ??
                (priorityLegacy
                  ? SUBJECT_META[
                      priorityLegacy.subject as NovaSubjectKey
                    ]?.label ?? priorityLegacy.subject
                  : "No confirmed priority yet")}
            </strong>
            <small>
              {englishPriority
                ? `${englishPriority.stage} · ${englishPriority.evidence_confidence} evidence`
                : priorityLegacy
                  ? "Nova is narrowing down the next skill"
                  : englishItems.length
                    ? "Low-evidence English skills are not labelled as gaps."
                    : "More learning evidence needed"}
            </small>
          </div>
        </article>

        <button
          type="button"
          className={`${styles.actionCard} ${styles.recommendCard}`}
          onClick={onOpenRecommendations}
        >
          <span className={styles.novaMark}>N+</span>
          <div>
            <span>NOVA RECOMMENDS</span>
            <strong>{nextLegacySkill?.skill_name || recommendationSubject}</strong>
            <small>
              Recommendation ranking is unchanged in C3B; its mastery-engine
              upgrade comes after learner-facing validation.
            </small>
          </div>
          <b>→</b>
        </button>
      </section>
    </div>
  );
}
