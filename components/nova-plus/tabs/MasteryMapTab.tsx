"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  CurriculumConcept,
  NovaPlusProfilePayload,
  NovaSubjectKey,
} from "@/lib/nova-plus/types";
import {
  isNovaPlusAssessedConcept,
  safeNumber,
  SUBJECT_META,
} from "@/lib/nova-plus/helpers";
import { useNovaSchoolworkEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import { useNovaTeachingEvidence } from "@/hooks/useNovaTeachingEvidence";
import { teachingConceptMapKey } from "@/lib/nova-plus/teaching-evidence";
import MasteryOrbit, {
  type MasteryOrbitState,
  type MasteryOrbitTopic,
} from "@/components/nova-plus/mastery/MasteryOrbit";
import MasteryConceptDetail from "@/components/nova-plus/mastery/MasteryConceptDetail";
import styles from "./MasteryMapTab.module.css";

type Props = {
  learnerId: string;
  accountName: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

type AcademicSubject = "english" | "math" | "science";
type LiveAcademicSubject = "english" | "math";
type MapState = MasteryOrbitState;

type TopicGroup = MasteryOrbitTopic;

type SubjectSummary = {
  subject: AcademicSubject;
  total: number;
  assessed: number;
  strong: number;
  developing: number;
  attention: number;
  unknown: number;
  locked: boolean;
};

const SUBJECT_ORDER: AcademicSubject[] = ["english", "math", "science"];
const LIVE_SUBJECTS: LiveAcademicSubject[] = ["english", "math"];
const CANONICAL_SOURCE = "nova_curriculum_rollout_sql";

const MATH_TOPIC_ORDER: Record<number, string[]> = {
  1: [
    "Whole Numbers and Operations",
    "Measurement",
    "Geometry",
    "Data",
    "Problem Solving",
  ],
  2: [
    "Whole Numbers and Operations",
    "Fractions",
    "Measurement",
    "Geometry",
    "Data",
    "Problem Solving",
  ],
  3: [
    "Whole Numbers",
    "Fractions",
    "Measurement",
    "Geometry",
    "Data",
    "Problem Solving",
  ],
  4: [
    "Whole Numbers",
    "Fractions",
    "Decimals",
    "Measurement",
    "Geometry",
    "Data",
    "Problem Solving",
    "Money",
  ],
  5: [
    "Whole Numbers",
    "Fractions",
    "Decimals",
    "Percentage",
    "Ratio and Rate",
    "Measurement",
    "Geometry",
    "Data",
    "Problem Solving",
  ],
  6: [
    "Whole Numbers and Algebra",
    "Fractions and Decimals",
    "Percentage",
    "Ratio and Proportion",
    "Geometry",
    "Problem Solving",
    "Circles",
    "Average",
  ],
};

const ENGLISH_TOPIC_HINTS = [
  "grammar",
  "vocabulary",
  "reading",
  "comprehension",
  "cloze",
  "writing",
  "composition",
  "speaking",
  "oral",
  "mixed",
  "assessment",
];

const STATE_META: Record<
  MapState,
  { label: string; colour: string; soft: string; border: string }
> = {
  strong: {
    label: "Strong",
    colour: "#4de2a1",
    soft: "rgba(77,226,161,.09)",
    border: "rgba(77,226,161,.28)",
  },
  developing: {
    label: "Developing",
    colour: "#ffae57",
    soft: "rgba(255,174,87,.09)",
    border: "rgba(255,174,87,.28)",
  },
  attention: {
    label: "Needs Attention",
    colour: "#ff6c72",
    soft: "rgba(255,108,114,.09)",
    border: "rgba(255,108,114,.3)",
  },
  unknown: {
    label: "Not Yet Assessed",
    colour: "#8999ad",
    soft: "rgba(137,153,173,.075)",
    border: "rgba(137,153,173,.19)",
  },
};

function normalise(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function isCanonicalMapConcept(concept: CurriculumConcept) {
  const subject = normalise(concept.subject);
  if (!LIVE_SUBJECTS.includes(subject as LiveAcademicSubject)) return false;
  if (!isNovaPlusAssessedConcept(concept)) return false;
  if (concept.is_active === false) return false;

  const source = normalise(concept.source);
  if (source && source !== CANONICAL_SOURCE) return false;

  return Boolean(
    String(concept.skill_id || "").trim() &&
      String(concept.skill_code || "").trim() &&
      String(concept.skill_name || "").trim(),
  );
}

function hasRepeatedEvidence(concept: CurriculumConcept) {
  return (
    safeNumber(concept.questions_attempted) >= 6 &&
    (safeNumber(concept.unique_activities) >= 2 ||
      safeNumber(concept.active_weeks) >= 2) &&
    safeNumber(concept.confidence_score) >= 35
  );
}

function conceptState(concept: CurriculumConcept): MapState {
  if (!concept.has_evidence || safeNumber(concept.questions_attempted) <= 0) {
    return "unknown";
  }

  if (
    ["secure", "mastered"].includes(concept.status) &&
    safeNumber(concept.questions_attempted) >= 5
  ) {
    return "strong";
  }

  if (concept.status === "needs_support" && hasRepeatedEvidence(concept)) {
    return "attention";
  }

  return "developing";
}

function topicState(concepts: CurriculumConcept[]): MapState {
  const states = concepts.map(conceptState);
  const assessed = states.filter((state) => state !== "unknown");

  if (assessed.length === 0) return "unknown";
  if (assessed.includes("attention")) return "attention";

  const strongCount = assessed.filter((state) => state === "strong").length;
  if (strongCount / assessed.length >= 0.6) return "strong";

  return "developing";
}

function inferCurrentLevel(
  concepts: CurriculumConcept[],
  profile: NovaPlusProfilePayload,
) {
  const canonicalEvidence = new Map<number, number>();

  for (const concept of concepts) {
    const level = safeNumber(concept.primary_level);
    if (level <= 0 || !concept.has_evidence) continue;

    canonicalEvidence.set(
      level,
      (canonicalEvidence.get(level) || 0) +
        Math.max(1, safeNumber(concept.questions_attempted)),
    );
  }

  const canonicalRanked = [...canonicalEvidence.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (canonicalRanked[0]) return canonicalRanked[0][0];

  // Fallback only for choosing the learner's likely level. These rows never
  // appear as Mastery Map concepts.
  const historicEvidence = new Map<number, number>();

  for (const skill of profile.skills) {
    const level = safeNumber(skill.primary_level);
    const subject = normalise(skill.subject);
    if (level <= 0 || !LIVE_SUBJECTS.includes(subject as LiveAcademicSubject)) {
      continue;
    }

    historicEvidence.set(
      level,
      (historicEvidence.get(level) || 0) +
        Math.max(1, safeNumber(skill.questions_attempted)),
    );
  }

  const historicRanked = [...historicEvidence.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (historicRanked[0]) return historicRanked[0][0];

  const availableLevels = [
    ...new Set(concepts.map((concept) => safeNumber(concept.primary_level))),
  ]
    .filter((level) => level > 0)
    .sort((a, b) => a - b);

  return availableLevels[0] || 1;
}

function conceptSequence(concept: CurriculumConcept) {
  const code = String(concept.skill_code || "");
  const canonicalMatch = code.match(/-C(\d+)$/i);
  if (canonicalMatch) return Number(canonicalMatch[1]);

  const lastNumber = code.match(/(\d+)(?!.*\d)/);
  return lastNumber ? Number(lastNumber[1]) : 9999;
}

function englishTopicRank(topic: string) {
  const clean = topic.toLowerCase();
  const index = ENGLISH_TOPIC_HINTS.findIndex((hint) => clean.includes(hint));
  return index === -1 ? 999 : index;
}

function topicRank(subject: LiveAcademicSubject, level: number, topic: string) {
  if (subject === "math") {
    const order = MATH_TOPIC_ORDER[level] || [];
    const index = order.findIndex(
      (candidate) => candidate.toLowerCase() === topic.toLowerCase(),
    );
    return index === -1 ? 999 : index;
  }

  return englishTopicRank(topic);
}

function groupTopics(
  concepts: CurriculumConcept[],
  subject: LiveAcademicSubject,
  level: number,
): TopicGroup[] {
  const groups = new Map<string, CurriculumConcept[]>();

  for (const concept of concepts) {
    const domain = String(concept.domain || "Curriculum").trim() || "Curriculum";
    const topic =
      String(concept.topic || concept.skill_name || "Other").trim() || "Other";
    const key = `${subject}::p${level}::${domain.toLowerCase()}::${topic.toLowerCase()}`;
    const current = groups.get(key) || [];
    current.push(concept);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, rows]) => {
      const states = rows.map(conceptState);
      return {
        key,
        domain: String(rows[0]?.domain || "Curriculum"),
        topic: String(rows[0]?.topic || "Other"),
        concepts: [...rows].sort(
          (a, b) =>
            conceptSequence(a) - conceptSequence(b) ||
            a.skill_name.localeCompare(b.skill_name),
        ),
        state: topicState(rows),
        strong: states.filter((state) => state === "strong").length,
        developing: states.filter((state) => state === "developing").length,
        attention: states.filter((state) => state === "attention").length,
        unknown: states.filter((state) => state === "unknown").length,
        assessed: states.filter((state) => state !== "unknown").length,
      } satisfies TopicGroup;
    })
    .sort(
      (a, b) =>
        topicRank(subject, level, a.topic) - topicRank(subject, level, b.topic) ||
        a.domain.localeCompare(b.domain) ||
        a.topic.localeCompare(b.topic),
    );
}

export default function MasteryMapTab({
  learnerId,
  accountName,
  profile,
  onOpenRecommendations,
}: Props) {
  const schoolworkEvidence = useNovaSchoolworkEvidence(learnerId);
  const teachingEvidence = useNovaTeachingEvidence(learnerId);

  const curriculumConcepts = useMemo(
    () => (profile.curriculum_concepts ?? []).filter(isCanonicalMapConcept),
    [profile.curriculum_concepts],
  );

  const availableLevels = useMemo(
    () =>
      [
        ...new Set(
          curriculumConcepts.map((concept) => safeNumber(concept.primary_level)),
        ),
      ]
        .filter((level) => level > 0)
        .sort((a, b) => a - b),
    [curriculumConcepts],
  );

  const inferredLevel = useMemo(
    () => inferCurrentLevel(curriculumConcepts, profile),
    [curriculumConcepts, profile],
  );

  const [selectedLevel, setSelectedLevel] = useState(inferredLevel);
  const [subject, setSubject] = useState<LiveAcademicSubject>("english");
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] =
    useState<CurriculumConcept | null>(null);

  useEffect(() => {
    setSelectedLevel(inferredLevel);
    setSubject("english");
    setSelectedTopicKey(null);
    setSelectedConcept(null);
  }, [profile.student_user_id, inferredLevel]);

  const levelConcepts = useMemo(
    () =>
      curriculumConcepts.filter(
        (concept) => safeNumber(concept.primary_level) === selectedLevel,
      ),
    [curriculumConcepts, selectedLevel],
  );

  const subjectSummaries = useMemo<SubjectSummary[]>(() => {
    return SUBJECT_ORDER.map((key) => {
      if (key === "science") {
        return {
          subject: key,
          total: 0,
          assessed: 0,
          strong: 0,
          developing: 0,
          attention: 0,
          unknown: 0,
          locked: true,
        };
      }

      const rows = levelConcepts.filter((concept) => concept.subject === key);
      const states = rows.map(conceptState);
      return {
        subject: key,
        total: rows.length,
        assessed: states.filter((state) => state !== "unknown").length,
        strong: states.filter((state) => state === "strong").length,
        developing: states.filter((state) => state === "developing").length,
        attention: states.filter((state) => state === "attention").length,
        unknown: states.filter((state) => state === "unknown").length,
        locked: false,
      };
    });
  }, [levelConcepts]);

  const visibleConcepts = useMemo(
    () => levelConcepts.filter((concept) => concept.subject === subject),
    [levelConcepts, subject],
  );

  const topics = useMemo(
    () => groupTopics(visibleConcepts, subject, selectedLevel),
    [visibleConcepts, subject, selectedLevel],
  );

  useEffect(() => {
    if (
      selectedTopicKey &&
      !topics.some((topic) => topic.key === selectedTopicKey)
    ) {
      setSelectedTopicKey(null);
      setSelectedConcept(null);
    }
  }, [selectedTopicKey, topics]);

  const currentSummary = subjectSummaries.find((row) => row.subject === subject);
  const subjectMeta = SUBJECT_META[subject as NovaSubjectKey];

  function teachingSignalsForConcept(concept: CurriculumConcept) {
    const key = teachingConceptMapKey(concept.subject, concept.skill_code);
    return key ? teachingEvidence.byConceptKey.get(key) || [] : [];
  }

  function selectTopic(topicKey: string | null) {
    setSelectedTopicKey(topicKey);
    setSelectedConcept(null);
  }

  function selectConcept(concept: CurriculumConcept | null) {
    setSelectedConcept(concept);
  }

  function stepBack() {
    if (selectedConcept) {
      setSelectedConcept(null);
      return;
    }
    if (selectedTopicKey) setSelectedTopicKey(null);
  }

  if (curriculumConcepts.length === 0) {
    return (
      <section className={styles.emptyPage}>
        <span className={styles.eyebrow}>MASTERY MAP</span>
        <h2>Curriculum map data is not available yet.</h2>
        <p>
          Refresh {accountName}&apos;s NOVA+ profile after installing the current Mastery
          Map payload function.
        </p>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.introCard}>
        <div>
          <span className={styles.eyebrow}>MASTERY MAP</span>
          <h2>Explore the curriculum as a live mastery orbit.</h2>
          <p>
            Topic sectors show {accountName}&apos;s curriculum picture at a glance.
            Select a topic to reveal its concepts; select a concept for detailed
            mastery, schoolwork and Teaching Engine evidence.
          </p>
        </div>

        <div className={styles.introControls}>
          <label className={styles.levelPicker}>
            <span>Primary level</span>
            <select
              value={selectedLevel}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setSelectedLevel(Number(event.target.value));
                setSelectedTopicKey(null);
                setSelectedConcept(null);
              }}
            >
              {availableLevels.map((level) => (
                <option key={level} value={level}>
                  Primary {level}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.legend} aria-label="Mastery Map legend">
            {(Object.keys(STATE_META) as MapState[]).map((state) => (
              <span key={state}>
                <i style={{ background: STATE_META[state].colour }} />
                {STATE_META[state].label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.subjectStrip}>
        {subjectSummaries.map((summary) => {
          const meta = SUBJECT_META[summary.subject as NovaSubjectKey];
          const active = subject === summary.subject;

          if (summary.locked) {
            return (
              <button
                key={summary.subject}
                type="button"
                className={styles.subjectLocked}
                disabled
                aria-label="Science Mastery Map is locked"
              >
                <span className={`${styles.subjectIcon} ${styles.subjectIconLocked}`}>
                  {meta.icon}
                </span>
                <span className={styles.subjectCopy}>
                  <strong>{meta.label}</strong>
                  <small>Assessment map locked</small>
                </span>
                <span className={styles.lockedBadge}>LOCKED</span>
              </button>
            );
          }

          return (
            <button
              key={summary.subject}
              type="button"
              className={active ? styles.subjectActive : styles.subjectButton}
              onClick={() => {
                setSubject(summary.subject as LiveAcademicSubject);
                setSelectedTopicKey(null);
                setSelectedConcept(null);
              }}
            >
              <span className={styles.subjectIcon}>{meta.icon}</span>
              <span className={styles.subjectCopy}>
                <strong>{meta.label}</strong>
                <small>
                  {summary.assessed} of {summary.total} concepts assessed
                </small>
              </span>
              <span className={styles.miniStatuses}>
                <i className={styles.miniGreen}>{summary.strong}</i>
                <i className={styles.miniOrange}>{summary.developing}</i>
                <i className={styles.miniRed}>{summary.attention}</i>
                <i className={styles.miniGrey}>{summary.unknown}</i>
              </span>
            </button>
          );
        })}
      </section>

      <section className={styles.mapShell}>
        <header className={styles.mapHeader}>
          <div>
            <span className={styles.eyebrow}>
              PRIMARY {selectedLevel} · {subjectMeta.label.toUpperCase()}
            </span>
            <h3>{subjectMeta.label} curriculum orbit</h3>
            <p>
              Sector colour follows mastery status. The segmented rim shows the
              actual concept mix, so one weak concept does not visually make an
              entire topic look weak.
            </p>
          </div>

          <div className={styles.mapTotals}>
            <span><b>{currentSummary?.strong ?? 0}</b> Strong</span>
            <span><b>{currentSummary?.developing ?? 0}</b> Developing</span>
            <span><b>{currentSummary?.attention ?? 0}</b> Needs attention</span>
            <span><b>{currentSummary?.unknown ?? 0}</b> Not assessed</span>
          </div>
        </header>

        {teachingEvidence.error && (
          <div className={styles.teachingWarning}>
            Teaching evidence could not be loaded. Mastery and schoolwork evidence
            are still available.
          </div>
        )}

        {topics.length === 0 ? (
          <div className={styles.noTopics}>
            No canonical concepts are available for this subject and level yet.
          </div>
        ) : (
          <MasteryOrbit
            subjectLabel={subjectMeta.label}
            subjectIcon={subjectMeta.icon}
            primaryLevel={selectedLevel}
            topics={topics}
            totalConcepts={currentSummary?.total ?? visibleConcepts.length}
            assessedConcepts={currentSummary?.assessed ?? 0}
            selectedTopicKey={selectedTopicKey}
            selectedConcept={selectedConcept}
            stateMeta={STATE_META}
            conceptState={conceptState}
            hasSchoolwork={(concept) =>
              schoolworkEvidence.bySkillId.has(String(concept.skill_id))
            }
            teachingSignalsForConcept={teachingSignalsForConcept}
            onSelectTopic={selectTopic}
            onSelectConcept={selectConcept}
            onBack={stepBack}
          />
        )}
      </section>

      {selectedConcept && (
        <MasteryConceptDetail
          concept={selectedConcept}
          accountName={accountName}
          state={conceptState(selectedConcept)}
          stateMeta={STATE_META[conceptState(selectedConcept)]}
          subjectLabel={subjectMeta.label}
          schoolwork={schoolworkEvidence.bySkillId.get(
            String(selectedConcept.skill_id),
          )}
          teachingSignals={teachingSignalsForConcept(selectedConcept)}
          onOpenRecommendations={onOpenRecommendations}
          onClose={() => setSelectedConcept(null)}
        />
      )}
    </div>
  );
}
