"use client";

import { useState } from "react";
import LearnerAvatarPicker from "@/components/nova-plus/LearnerAvatarPicker";
import SubjectMilestoneCard from "@/components/nova-plus/my-learning/SubjectMilestoneCard";
import MilestoneInfoModal from "@/components/nova-plus/my-learning/MilestoneInfoModal";
import { milestoneForEvidence, milestoneText } from "@/components/nova-plus/my-learning/milestones";
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
import styles from "./MyLearningTab.module.css";

type Props = {
  learnerId: string;
  learnerLabel: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

const CURRICULUM_SUBJECTS: NovaSubjectKey[] = ["english", "math", "science"];

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
  const [milestoneInfoOpen, setMilestoneInfoOpen] = useState(false);

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

  const strongestMilestone = strongest
    ? milestoneForEvidence(
        safeNumber(strongest.mastery_score),
        safeNumber(strongest.questions_attempted),
      )
    : null;

  return (
    <div className={styles.page}>
      <section className={styles.introCard}>
        <div>
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

      <section className={styles.overviewGrid}>
        <aside className={styles.learnerPanel}>
          <div className={styles.avatarWrap}>
            <LearnerAvatarPicker learnerId={learnerId} learnerLabel={learnerLabel} />
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
              <small>Quiz results now. Uploaded work can feed this same profile later.</small>
            </div>
          </div>
        </aside>

        <div className={styles.subjectPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>SUBJECT MILESTONES</span>
              <h3>Where your subjects currently stand</h3>
            </div>
            <button
              type="button"
              className={styles.scoreInfoButton}
              aria-label="How do subject milestones work?"
              aria-haspopup="dialog"
              onClick={() => setMilestoneInfoOpen(true)}
            >
              i
            </button>
          </div>

          <div className={styles.subjectGrid}>
            {CURRICULUM_SUBJECTS.map((subjectKey) => {
              const summary = summaryFor(profile, subjectKey);
              const state = subjectState(summary);
              const stateMeta = STATE_META[state];
              const subjectMeta = SUBJECT_META[subjectKey];

              return (
                <SubjectMilestoneCard
                  key={subjectKey}
                  summary={summary}
                  label={subjectMeta.label}
                  icon={subjectMeta.icon}
                  statusLabel={subjectStateLabel(state)}
                  colour={stateMeta.colour}
                  soft={stateMeta.soft}
                  border={stateMeta.border}
                />
              );
            })}
          </div>

          {(() => {
            const state = subjectState(knowledge);
            const stateMeta = STATE_META[state];
            const knowledgeMilestone = milestoneForEvidence(
              safeNumber(knowledge?.mastery_score),
              safeNumber(knowledge?.questions_attempted),
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
                <span className={styles.knowledgeStatus} style={{ color: stateMeta.colour }}>
                  {subjectStateLabel(state)}
                </span>
                <b>{milestoneText(knowledgeMilestone)}</b>
              </article>
            );
          })()}
        </div>
      </section>

      <MilestoneInfoModal open={milestoneInfoOpen} onClose={() => setMilestoneInfoOpen(false)} />

      <section className={styles.actionGrid}>
        <article className={`${styles.actionCard} ${styles.strongCard}`}>
          <span className={styles.actionMarker}>↗</span>
          <div>
            <span>STRONGEST RIGHT NOW</span>
            <strong>
              {strongest
                ? SUBJECT_META[strongest.subject as NovaSubjectKey]?.label ?? strongest.subject
                : "Building your picture"}
            </strong>
            <small>
              {strongest ? milestoneText(strongestMilestone) : "Complete more missions"}
            </small>
          </div>
        </article>

        <article className={`${styles.actionCard} ${styles.attentionCard}`}>
          <span className={styles.actionMarker}>!</span>
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
          <span className={styles.novaMark}>N+</span>
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
