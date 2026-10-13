"use client";

import type {
  NovaPlusProfilePayload,
  NovaSubjectKey,
  ProfileSkill,
} from "@/lib/nova-plus/types";
import type { EnglishMasteryItem } from "@/lib/nova-plus/english-mastery-types";
import {
  dedupeConceptSkills,
  isQuizFallbackSkill,
  safeNumber,
  SUBJECT_META,
} from "@/lib/nova-plus/helpers";
import { useNovaSchoolworkEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import type { NovaSchoolworkSkillEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import { useEnglishMastery } from "@/components/nova-plus/EnglishMasteryProvider";
import {
  ENGLISH_STAGE_COLOURS,
  englishMasteriesAtLevel,
  englishMasteryDisplayGroup,
  evidenceLabel,
  inferCurrentEnglishLevel,
  sortEnglishMasteries,
  type EnglishMasteryDisplayGroup,
} from "@/lib/nova-plus/english-mastery-ui";
import styles from "./StrengthsGapsTab.module.css";

type Props = {
  learnerId: string;
  accountName?: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

type ConceptState = "strong" | "developing" | "attention";
const LEGACY_ACADEMIC_SUBJECTS = new Set(["math", "science"]);

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
    description: "Concepts that are not secure yet or are still developing.",
    icon: "◐",
  },
  attention: {
    label: "Needs Attention",
    eyebrow: "CONFIRMED GAPS",
    colour: "#ff6c72",
    border: "rgba(255,108,114,.32)",
    soft: "rgba(255,108,114,.075)",
    description: "Lower mastery with enough evidence to prioritise support.",
    icon: "!",
  },
};

const ENGLISH_GROUP_META: Record<
  EnglishMasteryDisplayGroup,
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
    eyebrow: "ENGLISH STRENGTHS",
    colour: "#4de2a1",
    border: "rgba(77,226,161,.30)",
    soft: "rgba(77,226,161,.075)",
    description: "Consolidating or Strong English masteries.",
    icon: "↗",
  },
  developing: {
    label: "Developing",
    eyebrow: "ENGLISH BUILDING",
    colour: "#7bc8ff",
    border: "rgba(123,200,255,.30)",
    soft: "rgba(123,200,255,.075)",
    description: "Masteries that are progressing but are not secure yet.",
    icon: "◐",
  },
  attention: {
    label: "Needs Attention",
    eyebrow: "CONFIRMED ENGLISH GAPS",
    colour: "#ff6c72",
    border: "rgba(255,108,114,.32)",
    soft: "rgba(255,108,114,.075)",
    description: "Starting or Building with Moderate/High evidence.",
    icon: "!",
  },
  needs_evidence: {
    label: "Needs More Evidence",
    eyebrow: "NOT A CONFIRMED GAP",
    colour: "#8999ad",
    border: "rgba(137,153,173,.24)",
    soft: "rgba(137,153,173,.07)",
    description: "Nova needs more evidence before judging these masteries.",
    icon: "?",
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
        safeNumber(b.recent_wrong_answers) -
          safeNumber(a.recent_wrong_answers)
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

function legacyAcademicConceptRows(profile: NovaPlusProfilePayload) {
  return dedupeConceptSkills(
    profile.skills.filter((skill) => {
      const subject = String(skill.subject || "").toLowerCase();

      return (
        LEGACY_ACADEMIC_SUBJECTS.has(subject) &&
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

  const granular = dedupeConceptSkills(rows);
  if (granular.length > 0) return granular;

  const bySkill = new Map<string, ProfileSkill>();
  for (const skill of rows.filter((row) => row.is_topic_level)) {
    const key = String(
      skill.skill_code || skill.skill_id || skill.skill_name,
    )
      .trim()
      .toLowerCase();

    if (!bySkill.has(key)) bySkill.set(key, skill);
  }

  return [...bySkill.values()];
}

function LegacyConceptCard({
  skill,
  state,
  schoolwork,
}: {
  skill: ProfileSkill;
  state: ConceptState;
  schoolwork?: NovaSchoolworkSkillEvidence;
}) {
  const meta = STATE_META[state];
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
          style={{
            color: meta.colour,
            borderColor: meta.border,
            background: meta.soft,
          }}
        >
          {SUBJECT_META[skill.subject as NovaSubjectKey]?.icon ?? "◇"}
        </span>
        <small>{subjectLabel(skill.subject)}</small>

        {schoolwork && (
          <span className={styles.schoolworkBadge}>Includes uploaded work</span>
        )}
      </div>

      <strong>{skill.skill_name}</strong>
      <span className={styles.stateLabel} style={{ color: meta.colour }}>
        {meta.label}
      </span>

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
              <b>
                {recentAccuracy === null ? "—" : `${recentAccuracy}%`}
              </b>
              recent accuracy
            </span>
          </div>
        </div>
      </details>
    </article>
  );
}

function LegacyStateColumn({
  state,
  skills,
  schoolworkBySkillId,
}: {
  state: ConceptState;
  skills: ProfileSkill[];
  schoolworkBySkillId: Map<string, NovaSchoolworkSkillEvidence>;
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
          style={{
            color: meta.colour,
            borderColor: meta.border,
            background: meta.soft,
          }}
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
            <LegacyConceptCard
              key={skill.skill_id}
              skill={skill}
              state={state}
              schoolwork={schoolworkBySkillId.get(String(skill.skill_id))}
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

function EnglishMasteryCard({
  item,
  group,
}: {
  item: EnglishMasteryItem;
  group: EnglishMasteryDisplayGroup;
}) {
  const meta = ENGLISH_GROUP_META[group];
  const stageColour = ENGLISH_STAGE_COLOURS[item.stage];

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
          style={{
            color: stageColour,
            borderColor: meta.border,
            background: meta.soft,
          }}
        >
          {SUBJECT_META.english.icon}
        </span>
        <small>English · P{item.primary_level}</small>
      </div>

      <strong>{item.mastery_name}</strong>

      <span className={styles.stateLabel} style={{ color: stageColour }}>
        {item.stage}
      </span>

      <details className={styles.why}>
        <summary>Why?</summary>
        <div className={styles.evidenceBox}>
          <p>
            {group === "attention"
              ? "Nova has enough evidence to treat this as a genuine priority."
              : group === "needs_evidence"
                ? "This is not a confirmed weakness. Nova needs more varied evidence first."
                : "This judgement comes from the calibrated English mastery model."}
          </p>

          <div className={styles.evidenceGrid}>
            <span>
              <b>{item.unique_questions}</b>
              unique questions
            </span>
            <span>
              <b>{item.evidence_confidence}</b>
              Evidence Confidence
            </span>
            <span>
              <b>{item.bands_encountered.length}</b>
              difficulty bands
            </span>
            <span>
              <b>{item.contexts_seen.length}</b>
              learning contexts
            </span>
          </div>

          <small>
            {evidenceLabel(item)}
            {item.last_evidence_at
              ? ` · Last evidence ${new Intl.DateTimeFormat("en-SG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(item.last_evidence_at))}`
              : ""}
          </small>
        </div>
      </details>
    </article>
  );
}

function EnglishGroupColumn({
  group,
  items,
  limit = 6,
}: {
  group: EnglishMasteryDisplayGroup;
  items: EnglishMasteryItem[];
  limit?: number;
}) {
  const meta = ENGLISH_GROUP_META[group];
  const ordered = sortEnglishMasteries(group, items);
  const visible = ordered.slice(0, limit);

  return (
    <section
      className={styles.stateColumn}
      style={{ borderColor: meta.border }}
    >
      <header className={styles.stateHeader}>
        <span
          className={styles.stateIcon}
          style={{
            color: meta.colour,
            borderColor: meta.border,
            background: meta.soft,
          }}
        >
          {meta.icon}
        </span>
        <div>
          <span style={{ color: meta.colour }}>{meta.eyebrow}</span>
          <h3>{meta.label}</h3>
          <p>{meta.description}</p>
        </div>
        <b style={{ color: meta.colour }}>{items.length}</b>
      </header>

      <div className={styles.conceptList}>
        {visible.length > 0 ? (
          visible.map((item) => (
            <EnglishMasteryCard
              key={item.mastery_code}
              item={item}
              group={group}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            No English masteries are in this group right now.
          </div>
        )}
      </div>

      {items.length > visible.length && (
        <small className={styles.moreNote}>
          Showing the {visible.length} most relevant of {items.length} masteries.
        </small>
      )}
    </section>
  );
}

export default function StrengthsGapsTab({
  learnerId,
  accountName: _accountName,
  profile,
  onOpenRecommendations,
}: Props) {
  const englishMastery = useEnglishMastery();
  const schoolworkEvidence = useNovaSchoolworkEvidence(learnerId);

  const level = inferCurrentEnglishLevel(englishMastery.profile, profile);
  const englishItems = englishMasteriesAtLevel(
    englishMastery.profile,
    level,
  );

  const englishStrong = englishItems.filter(
    (item) => englishMasteryDisplayGroup(item) === "strong",
  );
  const englishDeveloping = englishItems.filter(
    (item) => englishMasteryDisplayGroup(item) === "developing",
  );
  const englishAttention = englishItems.filter(
    (item) => englishMasteryDisplayGroup(item) === "attention",
  );
  const englishNeedsEvidence = englishItems.filter(
    (item) => englishMasteryDisplayGroup(item) === "needs_evidence",
  );

  const legacyAcademicSkills = legacyAcademicConceptRows(profile);
  const legacyStrong = legacyAcademicSkills.filter(
    (skill) => conceptState(skill) === "strong",
  );
  const legacyDeveloping = legacyAcademicSkills.filter(
    (skill) => conceptState(skill) === "developing",
  );
  const legacyAttention = legacyAcademicSkills.filter(
    (skill) => conceptState(skill) === "attention",
  );

  const recentlyImproved = legacyAcademicSkills
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

  const knowledgeSkills = knowledgeRows(profile);
  const knowledgeStrong = knowledgeSkills.filter(
    (skill) => conceptState(skill) === "strong",
  );
  const knowledgeDeveloping = knowledgeSkills.filter(
    (skill) => conceptState(skill) === "developing",
  );
  const knowledgeAttention = knowledgeSkills.filter(
    (skill) => conceptState(skill) === "attention",
  );

  return (
    <div className={styles.page}>
      <section className={styles.introCard}>
        <div>
          <span className={styles.eyebrow}>STRENGTHS & GAPS</span>
          <h2>Strong concepts. Developing concepts. Confirmed priorities.</h2>
          <p>
            English now separates true gaps from skills where Nova simply needs
            more evidence.
          </p>
        </div>

        <div className={styles.legend} aria-label="Concept status colours">
          <span><i className={styles.greenDot} /> Strong</span>
          <span><i className={styles.orangeDot} /> Developing</span>
          <span><i className={styles.redDot} /> Needs attention</span>
        </div>
      </section>

      <section
        style={{
          marginBottom: 20,
          padding: "18px",
          border: "1px solid rgba(123,200,255,.18)",
          borderRadius: 22,
          background:
            "linear-gradient(145deg, rgba(123,200,255,.045), rgba(4,13,29,.56))",
        }}
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>ENGLISH · PRIMARY {level}</span>
            <h3>Mastery + Evidence Confidence</h3>
          </div>
          <span className={styles.improvedCount}>
            {englishItems.filter(
              (item) => item.stage !== "Not Yet Assessed",
            ).length}
            /{englishItems.length}
          </span>
        </div>

        {englishMastery.error ? (
          <div className={styles.emptyState}>
            English mastery could not be loaded. Use Refresh and try again.
          </div>
        ) : englishMastery.loading && !englishMastery.profile ? (
          <div className={styles.emptyState}>
            Nova is loading the English mastery picture…
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: 14,
              marginTop: 14,
            }}
          >
            <EnglishGroupColumn group="strong" items={englishStrong} />
            <EnglishGroupColumn
              group="developing"
              items={englishDeveloping}
            />
            <EnglishGroupColumn
              group="attention"
              items={englishAttention}
            />
            <EnglishGroupColumn
              group="needs_evidence"
              items={englishNeedsEvidence}
            />
          </div>
        )}
      </section>

      <section style={{ marginBottom: 16 }}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>MATHEMATICS & SCIENCE</span>
            <h3>Current NOVA+ concept picture</h3>
          </div>
        </div>
      </section>

      <section className={styles.columns}>
        <LegacyStateColumn
          state="strong"
          skills={legacyStrong}
          schoolworkBySkillId={schoolworkEvidence.bySkillId}
        />
        <LegacyStateColumn
          state="developing"
          skills={legacyDeveloping}
          schoolworkBySkillId={schoolworkEvidence.bySkillId}
        />
        <LegacyStateColumn
          state="attention"
          skills={legacyAttention}
          schoolworkBySkillId={schoolworkEvidence.bySkillId}
        />
      </section>

      <section className={styles.lowerGrid}>
        <article className={styles.improvedPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>RECENTLY IMPROVED</span>
              <h3>Mathematics & Science moving in the right direction</h3>
            </div>
            <span className={styles.improvedCount}>
              {recentlyImproved.length}
            </span>
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
            <div className={styles.emptyState}>
              Improvement signals will appear as more evidence is recorded.
            </div>
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

          <p>
            General Knowledge remains separate from the academic curriculum
            mastery picture.
          </p>
        </article>
      </section>

      <button
        type="button"
        className={styles.recommendCta}
        onClick={onOpenRecommendations}
      >
        <span className={styles.novaBadge}>N+</span>
        <div>
          <span>NOVA RECOMMENDS</span>
          <strong>See what to work on next</strong>
          <small>
            Recommendation ranking remains unchanged in C3B while we validate
            the new learner-facing mastery surfaces.
          </small>
        </div>
        <b>→</b>
      </button>
    </div>
  );
}
