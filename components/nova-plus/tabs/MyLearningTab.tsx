"use client";

import LearnerAvatarPicker from "@/components/nova-plus/LearnerAvatarPicker";
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
} from "@/lib/nova-plus/helpers";
import styles from "./MyLearningTab.module.css";

type Props = {
  learnerId: string;
  learnerLabel: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

const CURRICULUM_SUBJECTS: NovaSubjectKey[] = ["english", "math", "science"];

function summaryFor(profile: NovaPlusProfilePayload, subject: NovaSubjectKey) {
  return (
    profile.subject_summaries.find(
      (summary) => String(summary.subject).toLowerCase() === subject,
    ) ?? null
  );
}

function strongestSubject(rows: Array<ProfileSubjectSummary | null>) {
  return [...rows]
    .filter((row): row is ProfileSubjectSummary => Boolean(row && row.questions_attempted >= 5))
    .sort((a, b) => safeNumber(b.mastery_score) - safeNumber(a.mastery_score))[0] ?? null;
}

function prioritySubject(rows: Array<ProfileSubjectSummary | null>) {
  return [...rows]
    .filter((row): row is ProfileSubjectSummary => Boolean(row && row.questions_attempted >= 5))
    .sort((a, b) => safeNumber(a.mastery_score) - safeNumber(b.mastery_score))[0] ?? null;
}

export default function MyLearningTab({
  learnerId,
  learnerLabel,
  profile,
  onOpenRecommendations,
}: Props) {
  const curriculumRows = CURRICULUM_SUBJECTS.map((subject) =>
    summaryFor(profile, subject),
  );
  const strongest = strongestSubject(curriculumRows);
  const priority = prioritySubject(curriculumRows);
  const knowledge = summaryFor(profile, "knowledge");

  const prioritySkills = profile.skills
    .filter(
      (skill) =>
        !skill.is_topic_level &&
        ["needs_support", "emerging", "developing", "review_due"].includes(skill.status),
    )
    .sort((a, b) => safeNumber(a.mastery_score) - safeNumber(b.mastery_score));

  const nextSkill = prioritySkills[0] ?? null;
  const recommendationSubject = nextSkill?.subject
    ? SUBJECT_META[nextSkill.subject as NovaSubjectKey]?.label ?? nextSkill.subject
    : priority
      ? SUBJECT_META[priority.subject as NovaSubjectKey]?.label ?? priority.subject
      : "Keep exploring";

  return (
    <div className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>MY LEARNING</span>
          <h2>Your learning at a glance</h2>
          <p>See what is strong, what needs work, and what Nova recommends next.</p>
        </div>

        <div className={styles.legend} aria-label="Subject status colours">
          <span><i className={styles.legendStrong} /> Strong</span>
          <span><i className={styles.legendDeveloping} /> Developing</span>
          <span><i className={styles.legendAttention} /> Needs attention</span>
        </div>
      </section>

      <section className={styles.learningMap}>
        <div className={styles.orbitLineOne} aria-hidden="true" />
        <div className={styles.orbitLineTwo} aria-hidden="true" />

        <div className={styles.learnerCore}>
          <LearnerAvatarPicker learnerId={learnerId} learnerLabel={learnerLabel} />
          <strong>{learnerLabel || "Learner"}</strong>
          <span>Learning profile</span>
        </div>

        {CURRICULUM_SUBJECTS.map((subject, index) => {
          const summary = summaryFor(profile, subject);
          const state = subjectState(summary);
          const meta = SUBJECT_META[subject];

          return (
            <article
              key={subject}
              className={`${styles.subjectNode} ${styles[`subject${index + 1}`]}`}
              data-state={state}
            >
              <div className={styles.subjectIcon}>{meta.icon}</div>
              <div>
                <strong>{meta.label}</strong>
                <span>{subjectStateLabel(state)}</span>
              </div>
              {summary && summary.questions_attempted >= 5 ? (
                <small>{Math.round(safeNumber(summary.mastery_score))}% mastery</small>
              ) : (
                <small>More evidence needed</small>
              )}
            </article>
          );
        })}

        <article className={styles.knowledgeNode} data-state={subjectState(knowledge)}>
          <div className={styles.knowledgeIcon}>◎</div>
          <div>
            <span>GENERAL KNOWLEDGE</span>
            <strong>{subjectStateLabel(subjectState(knowledge))}</strong>
          </div>
        </article>
      </section>

      <section className={styles.actionGrid}>
        <article className={`${styles.actionCard} ${styles.strongCard}`}>
          <div className={styles.actionIcon}>↗</div>
          <div>
            <span>STRONGEST RIGHT NOW</span>
            <strong>
              {strongest
                ? SUBJECT_META[strongest.subject as NovaSubjectKey]?.label ?? strongest.subject
                : "Building your picture"}
            </strong>
            <small>
              {strongest
                ? `${Math.round(safeNumber(strongest.mastery_score))}% mastery`
                : "Complete more missions"}
            </small>
          </div>
        </article>

        <article className={`${styles.actionCard} ${styles.attentionCard}`}>
          <div className={styles.actionIcon}>!</div>
          <div>
            <span>NEEDS ATTENTION</span>
            <strong>
              {priority
                ? SUBJECT_META[priority.subject as NovaSubjectKey]?.label ?? priority.subject
                : "No clear priority yet"}
            </strong>
            <small>
              {nextSkill?.skill_name
                ? nextSkill.skill_name
                : priority
                  ? "Nova is narrowing down the next skill"
                  : "More learning evidence needed"}
            </small>
          </div>
        </article>

        <button
          type="button"
          className={`${styles.actionCard} ${styles.recommendCard}`}
          onClick={onOpenRecommendations}
        >
          <div className={styles.novaBadge}>N+</div>
          <div>
            <span>NOVA RECOMMENDS</span>
            <strong>{nextSkill?.skill_name || recommendationSubject}</strong>
            <small>
              {nextSkill
                ? `${recommendationSubject} · Focus here next`
                : "Open Nova Recommends for your next step"}
            </small>
          </div>
          <b>→</b>
        </button>
      </section>
    </div>
  );
}
