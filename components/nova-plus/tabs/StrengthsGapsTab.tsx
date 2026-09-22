"use client";

import type {
  NovaPlusProfilePayload,
  NovaSubjectKey,
  ProfileSkill,
} from "@/lib/nova-plus/types";
import {
  dedupeConceptSkills,
  isQuizFallbackSkill,
  safeNumber,
  SUBJECT_META,
} from "@/lib/nova-plus/helpers";
import { useNovaSchoolworkEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import type { NovaSchoolworkSkillEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import { useNovaTeachingEvidence } from "@/hooks/useNovaTeachingEvidence";
import {
  humaniseMisconceptionCode,
  sortTeachingSignals,
  teachingConceptMapKey,
  teachingEvidenceExplanation,
  teachingEvidenceHeadline,
  teachingRecoveryExplanation,
  teachingSignalsForSkill,
  type NovaTeachingSignal,
} from "@/lib/nova-plus/teaching-evidence";
import styles from "./StrengthsGapsTab.module.css";

type Props = {
  learnerId: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

type ConceptState = "strong" | "developing" | "attention";

const ACADEMIC_SUBJECTS = new Set(["english", "math", "science"]);

const STATE_META: Record<
  ConceptState,
  {
    label: string;
    eyebrow: string;
    colour: string;
    border: string;
    soft: string;
    description: string;
    icon: string;
  }
> = {
  strong: {
    label: "Strong",
    eyebrow: "SECURE CONCEPTS",
    colour: "#4de2a1",
    border: "rgba(77,226,161,.30)",
    soft: "rgba(77,226,161,.075)",
    description: "Concepts supported by consistent evidence.",
    icon: "↗",
  },
  developing: {
    label: "Developing",
    eyebrow: "STILL BUILDING",
    colour: "#ffae57",
    border: "rgba(255,174,87,.30)",
    soft: "rgba(255,174,87,.075)",
    description: "Concepts that are not secure yet or still need more evidence.",
    icon: "◐",
  },
  attention: {
    label: "Needs Attention",
    eyebrow: "CONFIRMED GAPS",
    colour: "#ff6c72",
    border: "rgba(255,108,114,.32)",
    soft: "rgba(255,108,114,.075)",
    description: "Repeated weakness with enough evidence to prioritise support.",
    icon: "!",
  },
};

function hasRepeatedEvidence(skill: ProfileSkill) {
  const questions = safeNumber(skill.questions_attempted);
  const activities = safeNumber(skill.unique_activities);
  const weeks = safeNumber(skill.active_weeks);
  const confidence = safeNumber(skill.confidence_score);

  return (
    questions >= 6 &&
    (activities >= 2 || weeks >= 2) &&
    confidence >= 35
  );
}

function conceptState(skill: ProfileSkill): ConceptState {
  if (
    ["mastered", "secure"].includes(skill.status) &&
    safeNumber(skill.questions_attempted) >= 5
  ) {
    return "strong";
  }

  if (skill.status === "needs_support" && hasRepeatedEvidence(skill)) {
    return "attention";
  }

  return "developing";
}

function evidenceScore(skill: ProfileSkill) {
  return (
    safeNumber(skill.questions_attempted) +
    safeNumber(skill.unique_activities) * 3 +
    safeNumber(skill.active_weeks) * 4 +
    safeNumber(skill.confidence_score) / 10
  );
}

function sortConcepts(state: ConceptState, rows: ProfileSkill[]) {
  return [...rows].sort((a, b) => {
    if (state === "strong") {
      return (
        safeNumber(b.mastery_score) - safeNumber(a.mastery_score) ||
        evidenceScore(b) - evidenceScore(a)
      );
    }

    if (state === "attention") {
      return (
        safeNumber(a.mastery_score) - safeNumber(b.mastery_score) ||
        safeNumber(b.recent_wrong_answers) - safeNumber(a.recent_wrong_answers)
      );
    }

    return (
      safeNumber(a.mastery_score) - safeNumber(b.mastery_score) ||
      evidenceScore(b) - evidenceScore(a)
    );
  });
}

function subjectLabel(subject: string) {
  return SUBJECT_META[subject as NovaSubjectKey]?.label ?? subject;
}

function academicConceptRows(profile: NovaPlusProfilePayload) {
  return dedupeConceptSkills(
    profile.skills.filter((skill) => {
      const subject = String(skill.subject || "").toLowerCase();

      return (
        ACADEMIC_SUBJECTS.has(subject) &&
        safeNumber(skill.questions_attempted) >= 2
      );
    }),
  );
}

function knowledgeRows(profile: NovaPlusProfilePayload) {
  const rows = profile.skills.filter((skill) => {
    const subject = String(skill.subject || "").toLowerCase();

    return (
      subject === "knowledge" &&
      !isQuizFallbackSkill(skill) &&
      safeNumber(skill.questions_attempted) >= 2
    );
  });

  // Knowledge Arena is intentionally broader than curriculum mastery, so its
  // topic-level categories may be shown when no granular concept rows exist.
  const granular = dedupeConceptSkills(rows);
  if (granular.length > 0) return granular;

  const bySkill = new Map<string, ProfileSkill>();
  for (const skill of rows.filter((row) => row.is_topic_level)) {
    const key = String(skill.skill_code || skill.skill_id || skill.skill_name)
      .trim()
      .toLowerCase();
    if (!bySkill.has(key)) bySkill.set(key, skill);
  }

  return [...bySkill.values()];
}


function signalDisplayName(signal: NovaTeachingSignal) {
  return (
    signal.skill ||
    signal.topic_title ||
    humaniseMisconceptionCode(signal.misconception_code)
  );
}

function teachingTone(signal: NovaTeachingSignal) {
  if (signal.recovery_state === "recovery_signal") return "recovered";
  if (signal.recovery_state === "needs_reinforcement") return "reinforce";
  if (signal.recovery_state === "mixed_transfer") return "mixed";
  if (signal.evidence_level === "likely_gap") return "gap";
  if (signal.evidence_level === "emerging_pattern") return "emerging";
  return "observation";
}

function TeachingEvidenceDetails({
  signals,
}: {
  signals: NovaTeachingSignal[];
}) {
  const visible = sortTeachingSignals(signals).slice(0, 3);

  return (
    <div className={styles.teachingEvidence}>
      <div className={styles.teachingEvidenceHeading}>
        <div>
          <span>TEACHING EVIDENCE</span>
          <strong>How the learner responded to support</strong>
        </div>
        <b>{signals.length}</b>
      </div>

      <div className={styles.teachingEvidenceList}>
        {visible.map((signal) => (
          <div
            key={`${signal.evidence_group_key}:${signal.misconception_code}`}
            className={styles.teachingEvidenceItem}
            data-tone={teachingTone(signal)}
          >
            <div className={styles.teachingEvidenceTop}>
              <span>{teachingEvidenceHeadline(signal)}</span>
              <small>
                {signal.distinct_questions} question
                {signal.distinct_questions === 1 ? "" : "s"}
              </small>
            </div>

            <strong>{humaniseMisconceptionCode(signal.misconception_code)}</strong>
            <p>{teachingEvidenceExplanation(signal)}</p>

            <div className={styles.teachingEvidenceMetrics}>
              <span>
                <b>{signal.hint_used_occurrences}</b>
                hints
              </span>
              <span>
                <b>{signal.teaching_opened_occurrences}</b>
                teaching opens
              </span>
              <span>
                <b>
                  {signal.quick_check_attempts > 0
                    ? `${signal.quick_check_correct_count}/${signal.quick_check_attempts}`
                    : "—"}
                </b>
                Quick Checks
              </span>
            </div>

            <small className={styles.teachingRecoveryCopy}>
              {teachingRecoveryExplanation(signal)}
            </small>
          </div>
        ))}
      </div>

      {signals.length > visible.length && (
        <small className={styles.teachingMoreNote}>
          {signals.length - visible.length} more teaching pattern
          {signals.length - visible.length === 1 ? "" : "s"} recorded for this concept.
        </small>
      )}
    </div>
  );
}

function ConceptCard({
  skill,
  state,
  schoolwork,
  teachingSignals = [],
}: {
  skill: ProfileSkill;
  state: ConceptState;
  schoolwork?: NovaSchoolworkSkillEvidence;
  teachingSignals?: NovaTeachingSignal[];
}) {
  const meta = STATE_META[state];
  const primaryTeachingSignal = sortTeachingSignals(teachingSignals)[0] ?? null;
  const recentAccuracy =
    skill.recent_accuracy === null || skill.recent_accuracy === undefined
      ? null
      : Math.round(safeNumber(skill.recent_accuracy));

  return (
    <article
      className={styles.conceptCard}
      style={{
        borderColor: meta.border,
        background: `linear-gradient(145deg, ${meta.soft}, rgba(4,13,29,.78))`,
      }}
    >
      <div className={styles.conceptTop}>
        <span
          className={styles.subjectBadge}
          style={{ color: meta.colour, borderColor: meta.border, background: meta.soft }}
        >
          {SUBJECT_META[skill.subject as NovaSubjectKey]?.icon ?? "◇"}
        </span>
        <small>{subjectLabel(skill.subject)}</small>

        {schoolwork && (
          <span className={styles.schoolworkBadge}>
            Includes uploaded work
          </span>
        )}
      </div>

      <strong>{skill.skill_name}</strong>
      <span className={styles.stateLabel} style={{ color: meta.colour }}>
        {meta.label}
      </span>

      {primaryTeachingSignal && (
        <div
          className={styles.teachingSignalSummary}
          data-tone={teachingTone(primaryTeachingSignal)}
        >
          <span>TEACHING INSIGHT</span>
          <strong>{teachingEvidenceHeadline(primaryTeachingSignal)}</strong>
          <small>
            {humaniseMisconceptionCode(primaryTeachingSignal.misconception_code)} ·{" "}
            {primaryTeachingSignal.distinct_questions} different question
            {primaryTeachingSignal.distinct_questions === 1 ? "" : "s"}
          </small>
        </div>
      )}

      <details className={styles.why}>
        <summary>Why?</summary>
        <div className={styles.evidenceBox}>
          {skill.public_explanation && <p>{skill.public_explanation}</p>}
          <div className={styles.evidenceGrid}>
            <span>
              <b>
                {Math.max(
                  0,
                  safeNumber(skill.questions_attempted) -
                    safeNumber(schoolwork?.event_count),
                )}
              </b>
              Dreamscape questions
            </span>

            <span>
              <b>{schoolwork?.event_count ?? 0}</b>
              uploaded-work questions
            </span>

            <span>
              <b>{skill.unique_activities}</b>
              activities
            </span>

            <span>
              <b>{recentAccuracy === null ? "—" : `${recentAccuracy}%`}</b>
              recent accuracy
            </span>
          </div>

          {schoolwork && (
            <div className={styles.schoolworkEvidence}>
              <span>UPLOADED SCHOOLWORK</span>
              <strong>
                {schoolwork.event_count} approved question
                {schoolwork.event_count === 1 ? "" : "s"} from{" "}
                {schoolwork.upload_count} document
                {schoolwork.upload_count === 1 ? "" : "s"}
              </strong>
              <small>
                Last added{" "}
                {schoolwork.last_evidence_at
                  ? new Intl.DateTimeFormat("en-SG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(schoolwork.last_evidence_at))
                  : "recently"}
                . Uploaded work is reviewed and carries a lower evidence weight
                than native Dreamscape quiz evidence.
              </small>
            </div>
          )}

          {teachingSignals.length > 0 && (
            <TeachingEvidenceDetails signals={teachingSignals} />
          )}

          {state === "attention" && (
            <small>
              Nova marks a gap only after repeated evidence, not from one weak
              result.
            </small>
          )}
        </div>
      </details>
    </article>
  );
}

function StateColumn({
  state,
  skills,
  schoolworkBySkillId,
  teachingByConceptKey,
}: {
  state: ConceptState;
  skills: ProfileSkill[];
  schoolworkBySkillId: Map<string, NovaSchoolworkSkillEvidence>;
  teachingByConceptKey: Map<string, NovaTeachingSignal[]>;
}) {
  const meta = STATE_META[state];
  const visible = sortConcepts(state, skills).slice(0, 8);

  return (
    <section
      className={styles.stateColumn}
      style={{ borderColor: meta.border }}
    >
      <header className={styles.stateHeader}>
        <span
          className={styles.stateIcon}
          style={{ color: meta.colour, borderColor: meta.border, background: meta.soft }}
        >
          {meta.icon}
        </span>
        <div>
          <span style={{ color: meta.colour }}>{meta.eyebrow}</span>
          <h3>{meta.label}</h3>
          <p>{meta.description}</p>
        </div>
        <b style={{ color: meta.colour }}>{skills.length}</b>
      </header>

      <div className={styles.conceptList}>
        {visible.length > 0 ? (
          visible.map((skill) => (
            <ConceptCard
              key={skill.skill_id}
              skill={skill}
              state={state}
              schoolwork={schoolworkBySkillId.get(String(skill.skill_id))}
              teachingSignals={teachingSignalsForSkill(skill, teachingByConceptKey)}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            No concepts are in this group yet.
          </div>
        )}
      </div>

      {skills.length > visible.length && (
        <small className={styles.moreNote}>
          Showing the {visible.length} most relevant of {skills.length} concepts.
        </small>
      )}
    </section>
  );
}


function OtherLearningObservations({
  signals,
}: {
  signals: NovaTeachingSignal[];
}) {
  const visible = sortTeachingSignals(signals).slice(0, 6);

  if (visible.length === 0) return null;

  return (
    <section className={styles.observationsPanel}>
      <div className={styles.observationsHeader}>
        <div>
          <span className={styles.eyebrow}>OTHER LEARNING OBSERVATIONS</span>
          <h3>Useful signals kept separate from mastery concepts</h3>
          <p>
            These Teaching Engine signals are not attached to a visible concept
            card yet. The concept may still be building enough mastery evidence,
            or the event may not carry an exact matching curriculum code. Nova
            keeps them separate rather than guessing where they belong.
          </p>
        </div>
        <b>{signals.length}</b>
      </div>

      <div className={styles.observationsGrid}>
        {visible.map((signal) => (
          <article
            key={`${signal.subject}:${signal.evidence_group_key}:${signal.misconception_code}`}
            className={styles.observationCard}
            data-tone={teachingTone(signal)}
          >
            <div className={styles.observationTop}>
              <span>{subjectLabel(signal.subject)}</span>
              {signal.primary_level ? <b>P{signal.primary_level}</b> : null}
            </div>
            <strong>{signalDisplayName(signal)}</strong>
            <small>{humaniseMisconceptionCode(signal.misconception_code)}</small>
            <div className={styles.observationStatus}>
              {teachingEvidenceHeadline(signal)}
            </div>
            <p>{teachingEvidenceExplanation(signal)}</p>
          </article>
        ))}
      </div>

      {signals.length > visible.length && (
        <small className={styles.observationMore}>
          Showing {visible.length} of {signals.length} unmatched observations.
        </small>
      )}
    </section>
  );
}

export default function StrengthsGapsTab({
  learnerId,
  profile,
  onOpenRecommendations,
}: Props) {
  const schoolworkEvidence = useNovaSchoolworkEvidence(learnerId);
  const teachingEvidence = useNovaTeachingEvidence(learnerId);
  const academicSkills = academicConceptRows(profile);
  const knowledgeSkills = knowledgeRows(profile);

  const knownConceptKeys = new Set(
    academicSkills
      .map((skill) => teachingConceptMapKey(skill.subject, skill.skill_code))
      .filter(Boolean),
  );

  const unmatchedTeachingSignals = teachingEvidence.signals.filter((signal) => {
    const signalKey = teachingConceptMapKey(signal.subject, signal.concept_key);
    return !signalKey || !knownConceptKeys.has(signalKey);
  });

  const strong = academicSkills.filter((skill) => conceptState(skill) === "strong");
  const developing = academicSkills.filter((skill) => conceptState(skill) === "developing");
  const attention = academicSkills.filter((skill) => conceptState(skill) === "attention");

  const recentlyImproved = academicSkills
    .filter(
      (skill) =>
        skill.trend === "improving" &&
        safeNumber(skill.trend_points) > 0 &&
        safeNumber(skill.questions_attempted) >= 4,
    )
    .sort(
      (a, b) =>
        safeNumber(b.trend_points) - safeNumber(a.trend_points) ||
        safeNumber(b.mastery_score) - safeNumber(a.mastery_score),
    )
    .slice(0, 6);

  const knowledgeStrong = knowledgeSkills.filter((skill) => conceptState(skill) === "strong");
  const knowledgeDeveloping = knowledgeSkills.filter((skill) => conceptState(skill) === "developing");
  const knowledgeAttention = knowledgeSkills.filter((skill) => conceptState(skill) === "attention");

  return (
    <div className={styles.page}>
      <section className={styles.introCard}>
        <div>
          <span className={styles.eyebrow}>STRENGTHS & GAPS</span>
          <h2>Strong concepts. Developing concepts. Clear priorities.</h2>
          <p>
            Nova groups concepts by the learner&apos;s current evidence so the important areas are easy to see.
          </p>
        </div>

        <div className={styles.legend} aria-label="Concept status colours">
          <span><i className={styles.greenDot} /> Strong</span>
          <span><i className={styles.orangeDot} /> Developing</span>
          <span><i className={styles.redDot} /> Needs attention</span>
        </div>
      </section>

      {teachingEvidence.error && (
        <div className={styles.teachingLoadNotice}>
          Teaching evidence could not be loaded. The mastery-based Strengths &amp;
          Gaps view is still available.
        </div>
      )}

      <section className={styles.columns}>
        <StateColumn
          state="strong"
          skills={strong}
          schoolworkBySkillId={schoolworkEvidence.bySkillId}
          teachingByConceptKey={teachingEvidence.byConceptKey}
        />
        <StateColumn
          state="developing"
          skills={developing}
          schoolworkBySkillId={schoolworkEvidence.bySkillId}
          teachingByConceptKey={teachingEvidence.byConceptKey}
        />
        <StateColumn
          state="attention"
          skills={attention}
          schoolworkBySkillId={schoolworkEvidence.bySkillId}
          teachingByConceptKey={teachingEvidence.byConceptKey}
        />
      </section>

      {!teachingEvidence.loading && (
        <OtherLearningObservations signals={unmatchedTeachingSignals} />
      )}

      <section className={styles.lowerGrid}>
        <article className={styles.improvedPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>RECENTLY IMPROVED</span>
              <h3>Concepts moving in the right direction</h3>
            </div>
            <span className={styles.improvedCount}>{recentlyImproved.length}</span>
          </div>

          {recentlyImproved.length > 0 ? (
            <div className={styles.improvedList}>
              {recentlyImproved.map((skill) => (
                <div key={skill.skill_id} className={styles.improvedItem}>
                  <span className={styles.improvedArrow}>↗</span>
                  <div>
                    <strong>{skill.skill_name}</strong>
                    <small>{subjectLabel(skill.subject)}</small>
                  </div>
                  <b>+{Math.round(safeNumber(skill.trend_points))}</b>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>Improvement signals will appear as more evidence is recorded.</div>
          )}
        </article>

        <article className={styles.knowledgePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>GENERAL KNOWLEDGE</span>
              <h3>Knowledge Arena</h3>
            </div>
            <span className={styles.knowledgeIcon}>◎</span>
          </div>

          <div className={styles.knowledgeSummary}>
            <div className={styles.knowledgeStat}>
              <span className={styles.greenDot} />
              <strong>{knowledgeStrong.length}</strong>
              <small>Strong</small>
            </div>
            <div className={styles.knowledgeStat}>
              <span className={styles.orangeDot} />
              <strong>{knowledgeDeveloping.length}</strong>
              <small>Developing</small>
            </div>
            <div className={styles.knowledgeStat}>
              <span className={styles.redDot} />
              <strong>{knowledgeAttention.length}</strong>
              <small>Needs attention</small>
            </div>
          </div>

          <p>General Knowledge is kept separate from the academic curriculum picture.</p>
        </article>
      </section>

      <button type="button" className={styles.recommendCta} onClick={onOpenRecommendations}>
        <span className={styles.novaBadge}>N+</span>
        <div>
          <span>NOVA RECOMMENDS</span>
          <strong>See what to work on next</strong>
          <small>Turn the priority concepts above into focused next steps.</small>
        </div>
        <b>→</b>
      </button>
    </div>
  );
}
