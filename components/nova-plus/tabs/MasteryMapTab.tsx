"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CurriculumConcept,
  NovaPlusProfilePayload,
  NovaSubjectKey,
} from "@/lib/nova-plus/types";
import type {
  EnglishMasteryItem,
  EnglishMasteryStage,
} from "@/lib/nova-plus/english-mastery-types";
import {
  isNovaPlusAssessedConcept,
  safeNumber,
  SUBJECT_META,
} from "@/lib/nova-plus/helpers";
import { useNovaSchoolworkEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import { useEnglishMastery } from "@/components/nova-plus/EnglishMasteryProvider";
import {
  ENGLISH_STAGE_COLOURS,
  englishMasteriesAtLevel,
  englishMasteryDisplayGroup,
  inferCurrentEnglishLevel,
  type EnglishMasteryDisplayGroup,
} from "@/lib/nova-plus/english-mastery-ui";
import styles from "./MasteryMapTab.module.css";

type Props = {
  learnerId: string;
  accountName?: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

type AcademicSubject = "english" | "math" | "science";
type LiveAcademicSubject = "english" | "math";
type MapState = "strong" | "developing" | "attention" | "unknown";

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

type MathTopic = {
  key: string;
  domain: string;
  topic: string;
  concepts: CurriculumConcept[];
  state: MapState;
  strong: number;
  developing: number;
  attention: number;
  unknown: number;
  assessed: number;
};

type EnglishFamily = {
  family: string;
  masteries: EnglishMasteryItem[];
  state: MapState;
  strong: number;
  developing: number;
  attention: number;
  needsEvidence: number;
  assessed: number;
};

const SUBJECT_ORDER: AcademicSubject[] = ["english", "math", "science"];
const CANONICAL_SOURCE = "nova_curriculum_rollout_sql";

const ENGLISH_FAMILIES = [
  "Grammar & Sentence Structure",
  "Vocabulary & Word Knowledge",
  "Reading Comprehension",
  "Language Conventions & Editing",
];

const FAMILY_SHORT: Record<string, string> = {
  "Grammar & Sentence Structure": "GRAMMAR",
  "Vocabulary & Word Knowledge": "VOCABULARY",
  "Reading Comprehension": "READING",
  "Language Conventions & Editing": "EDITING",
};

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

const STATE_META: Record<
  MapState,
  { label: string; colour: string; soft: string; border: string }
> = {
  strong: {
    label: "Strong",
    colour: "#4de2a1",
    soft: "rgba(77,226,161,.08)",
    border: "rgba(77,226,161,.28)",
  },
  developing: {
    label: "Developing",
    colour: "#ffae57",
    soft: "rgba(255,174,87,.08)",
    border: "rgba(255,174,87,.28)",
  },
  attention: {
    label: "Needs Attention",
    colour: "#ff6c72",
    soft: "rgba(255,108,114,.08)",
    border: "rgba(255,108,114,.30)",
  },
  unknown: {
    label: "Not Yet Assessed",
    colour: "#8999ad",
    soft: "rgba(137,153,173,.07)",
    border: "rgba(137,153,173,.19)",
  },
};

function normalise(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not practised yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not practised yet";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isCanonicalMathConcept(concept: CurriculumConcept) {
  if (normalise(concept.subject) !== "math") return false;
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

function hasRepeatedMathEvidence(concept: CurriculumConcept) {
  return (
    safeNumber(concept.questions_attempted) >= 6 &&
    (safeNumber(concept.unique_activities) >= 2 ||
      safeNumber(concept.active_weeks) >= 2) &&
    safeNumber(concept.confidence_score) >= 35
  );
}

function mathState(concept: CurriculumConcept): MapState {
  if (!concept.has_evidence || safeNumber(concept.questions_attempted) <= 0) {
    return "unknown";
  }

  if (
    ["secure", "mastered"].includes(concept.status) &&
    safeNumber(concept.questions_attempted) >= 5
  ) {
    return "strong";
  }

  if (
    concept.status === "needs_support" &&
    hasRepeatedMathEvidence(concept)
  ) {
    return "attention";
  }

  return "developing";
}

function mathTopicState(concepts: CurriculumConcept[]): MapState {
  const states = concepts.map(mathState);
  const assessed = states.filter((state) => state !== "unknown");
  if (assessed.length === 0) return "unknown";
  if (assessed.includes("attention")) return "attention";

  const strong = assessed.filter((state) => state === "strong").length;
  return strong / assessed.length >= 0.6 ? "strong" : "developing";
}

function mathSequence(concept: CurriculumConcept) {
  const code = String(concept.skill_code || "");
  const canonicalMatch = code.match(/-C(\d+)$/i);
  if (canonicalMatch) return Number(canonicalMatch[1]);
  const lastNumber = code.match(/(\d+)(?!.*\d)/);
  return lastNumber ? Number(lastNumber[1]) : 9999;
}

function mathTopicRank(level: number, topic: string) {
  const order = MATH_TOPIC_ORDER[level] || [];
  const index = order.findIndex(
    (candidate) => candidate.toLowerCase() === topic.toLowerCase(),
  );
  return index === -1 ? 999 : index;
}

function groupMathTopics(
  concepts: CurriculumConcept[],
  level: number,
): MathTopic[] {
  const groups = new Map<string, CurriculumConcept[]>();

  for (const concept of concepts) {
    const domain = String(concept.domain || "Curriculum").trim() || "Curriculum";
    const topic =
      String(concept.topic || concept.skill_name || "Other").trim() || "Other";
    const key = `math::p${level}::${domain.toLowerCase()}::${topic.toLowerCase()}`;
    const rows = groups.get(key) || [];
    rows.push(concept);
    groups.set(key, rows);
  }

  return [...groups.entries()]
    .map(([key, rows]) => {
      const states = rows.map(mathState);
      return {
        key,
        domain: String(rows[0]?.domain || "Curriculum"),
        topic: String(rows[0]?.topic || "Other"),
        concepts: [...rows].sort(
          (a, b) =>
            mathSequence(a) - mathSequence(b) ||
            a.skill_name.localeCompare(b.skill_name),
        ),
        state: mathTopicState(rows),
        strong: states.filter((state) => state === "strong").length,
        developing: states.filter((state) => state === "developing").length,
        attention: states.filter((state) => state === "attention").length,
        unknown: states.filter((state) => state === "unknown").length,
        assessed: states.filter((state) => state !== "unknown").length,
      } satisfies MathTopic;
    })
    .sort(
      (a, b) =>
        mathTopicRank(level, a.topic) - mathTopicRank(level, b.topic) ||
        a.domain.localeCompare(b.domain) ||
        a.topic.localeCompare(b.topic),
    );
}

function inferMathLevel(
  concepts: CurriculumConcept[],
  profile: NovaPlusProfilePayload,
) {
  const canonical = new Map<number, number>();

  for (const concept of concepts) {
    const level = safeNumber(concept.primary_level);
    if (level <= 0 || !concept.has_evidence) continue;
    canonical.set(
      level,
      (canonical.get(level) || 0) +
        Math.max(1, safeNumber(concept.questions_attempted)),
    );
  }

  const canonicalRanked = [...canonical.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (canonicalRanked[0]) return canonicalRanked[0][0];

  const historic = new Map<number, number>();
  for (const skill of profile.skills) {
    if (normalise(skill.subject) !== "math") continue;
    const level = safeNumber(skill.primary_level);
    if (level <= 0) continue;
    historic.set(
      level,
      (historic.get(level) || 0) +
        Math.max(1, safeNumber(skill.questions_attempted)),
    );
  }

  const ranked = [...historic.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (ranked[0]) return ranked[0][0];

  return (
    [...new Set(concepts.map((item) => safeNumber(item.primary_level)))]
      .filter((level) => level > 0)
      .sort((a, b) => a - b)[0] || 1
  );
}

function englishFamilyState(group: Omit<EnglishFamily, "state">): MapState {
  if (group.assessed === 0) return "unknown";
  if (group.attention > 0) return "attention";
  if (group.strong >= Math.ceil(group.assessed * 0.6)) return "strong";
  return "developing";
}

function groupEnglish(items: EnglishMasteryItem[]): EnglishFamily[] {
  return ENGLISH_FAMILIES.map((family) => {
    const masteries = items
      .filter((item) => item.mastery_family === family)
      .sort(
        (a, b) =>
          a.progression_key.localeCompare(b.progression_key) ||
          a.mastery_name.localeCompare(b.mastery_name),
      );

    const strong = masteries.filter(
      (item) => englishMasteryDisplayGroup(item) === "strong",
    ).length;
    const developing = masteries.filter(
      (item) => englishMasteryDisplayGroup(item) === "developing",
    ).length;
    const attention = masteries.filter(
      (item) => englishMasteryDisplayGroup(item) === "attention",
    ).length;
    const needsEvidence = masteries.filter(
      (item) => englishMasteryDisplayGroup(item) === "needs_evidence",
    ).length;
    const assessed = masteries.filter(
      (item) => item.stage !== "Not Yet Assessed",
    ).length;

    const partial = {
      family,
      masteries,
      strong,
      developing,
      attention,
      needsEvidence,
      assessed,
    };

    return {
      ...partial,
      state: englishFamilyState(partial),
    };
  }).filter((group) => group.masteries.length > 0);
}

function englishGroupMeta(group: EnglishMasteryDisplayGroup) {
  if (group === "strong") return STATE_META.strong;
  if (group === "attention") return STATE_META.attention;
  if (group === "needs_evidence") return STATE_META.unknown;

  return {
    label: "Developing",
    colour: "#7bc8ff",
    soft: "rgba(123,200,255,.08)",
    border: "rgba(123,200,255,.28)",
  };
}

function englishExplanation(item: EnglishMasteryItem) {
  const group = englishMasteryDisplayGroup(item);

  if (item.stage === "Not Yet Assessed") {
    return "Nova has not yet seen enough eligible evidence for this mastery.";
  }
  if (group === "needs_evidence") {
    return "Nova has some early evidence, but confidence is still Low. This is not treated as a confirmed weakness.";
  }
  if (group === "attention") {
    return "The learner is at an early mastery stage and Nova has enough evidence to treat this as a genuine priority.";
  }
  if (group === "strong") {
    return "The learner has reached Consolidating or Strong with supporting evidence.";
  }
  return "The learner is progressing through this mastery but has not yet reached the secure upper stages.";
}

function stageCount(items: EnglishMasteryItem[], stage: EnglishMasteryStage) {
  return items.filter((item) => item.stage === stage).length;
}

function mathExplanation(concept: CurriculumConcept) {
  const supplied = String(concept.public_explanation || "").trim();
  if (supplied) return supplied;
  return `This checks the learner's understanding and application of ${String(
    concept.skill_name || "this concept",
  ).toLowerCase()}.`;
}

export default function MasteryMapTab({
  learnerId,
  accountName: _accountName,
  profile,
  onOpenRecommendations,
}: Props) {
  const englishMastery = useEnglishMastery();
  const schoolworkEvidence = useNovaSchoolworkEvidence(learnerId);

  const mathConcepts = useMemo(
    () => (profile.curriculum_concepts ?? []).filter(isCanonicalMathConcept),
    [profile.curriculum_concepts],
  );

  const currentEnglishLevel = useMemo(
    () => inferCurrentEnglishLevel(englishMastery.profile, profile),
    [englishMastery.profile, profile],
  );

  const currentMathLevel = useMemo(
    () => inferMathLevel(mathConcepts, profile),
    [mathConcepts, profile],
  );

  const [subject, setSubject] = useState<LiveAcademicSubject>("english");
  const [selectedLevel, setSelectedLevel] = useState(currentEnglishLevel);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedEnglish, setSelectedEnglish] =
    useState<EnglishMasteryItem | null>(null);
  const [selectedMath, setSelectedMath] =
    useState<CurriculumConcept | null>(null);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

  useEffect(() => {
    setSubject("english");
    setSelectedLevel(currentEnglishLevel);
    setExpandedKeys(new Set());
    setSelectedEnglish(null);
    setSelectedMath(null);
    setOpenInfoId(null);
  }, [profile.student_user_id, currentEnglishLevel]);

  const mathLevels = useMemo(
    () =>
      [...new Set(mathConcepts.map((item) => safeNumber(item.primary_level)))]
        .filter((level) => level > 0)
        .sort((a, b) => a - b),
    [mathConcepts],
  );

  const levelOptions =
    subject === "english"
      ? Array.from({ length: currentEnglishLevel }, (_, index) => index + 1)
      : mathLevels.length > 0
        ? mathLevels
        : [currentMathLevel];

  const englishItems = englishMasteriesAtLevel(
    englishMastery.profile,
    selectedLevel,
  );
  const englishFamilies = groupEnglish(englishItems);

  const levelMath = mathConcepts.filter(
    (concept) => safeNumber(concept.primary_level) === selectedLevel,
  );
  const mathTopics = groupMathTopics(levelMath, selectedLevel);

  const englishSummary: SubjectSummary = {
    subject: "english",
    total: englishItems.length,
    assessed: englishItems.filter((item) => item.stage !== "Not Yet Assessed")
      .length,
    strong: englishItems.filter(
      (item) => englishMasteryDisplayGroup(item) === "strong",
    ).length,
    developing: englishItems.filter(
      (item) => englishMasteryDisplayGroup(item) === "developing",
    ).length,
    attention: englishItems.filter(
      (item) => englishMasteryDisplayGroup(item) === "attention",
    ).length,
    unknown: englishItems.filter(
      (item) => englishMasteryDisplayGroup(item) === "needs_evidence",
    ).length,
    locked: false,
  };

  const mathStates = levelMath.map(mathState);
  const mathSummary: SubjectSummary = {
    subject: "math",
    total: levelMath.length,
    assessed: mathStates.filter((state) => state !== "unknown").length,
    strong: mathStates.filter((state) => state === "strong").length,
    developing: mathStates.filter((state) => state === "developing").length,
    attention: mathStates.filter((state) => state === "attention").length,
    unknown: mathStates.filter((state) => state === "unknown").length,
    locked: false,
  };

  const currentEnglishItems = englishMasteriesAtLevel(
    englishMastery.profile,
    currentEnglishLevel,
  );
  const currentMathItems = mathConcepts.filter(
    (concept) => safeNumber(concept.primary_level) === currentMathLevel,
  );
  const currentMathStates = currentMathItems.map(mathState);

  const summaries: SubjectSummary[] = [
    subject === "english"
      ? englishSummary
      : {
          subject: "english",
          total: currentEnglishItems.length,
          assessed: currentEnglishItems.filter(
            (item) => item.stage !== "Not Yet Assessed",
          ).length,
          strong: currentEnglishItems.filter(
            (item) => englishMasteryDisplayGroup(item) === "strong",
          ).length,
          developing: currentEnglishItems.filter(
            (item) => englishMasteryDisplayGroup(item) === "developing",
          ).length,
          attention: currentEnglishItems.filter(
            (item) => englishMasteryDisplayGroup(item) === "attention",
          ).length,
          unknown: currentEnglishItems.filter(
            (item) => englishMasteryDisplayGroup(item) === "needs_evidence",
          ).length,
          locked: false,
        },
    subject === "math"
      ? mathSummary
      : {
          subject: "math",
          total: currentMathItems.length,
          assessed: currentMathStates.filter((state) => state !== "unknown")
            .length,
          strong: currentMathStates.filter((state) => state === "strong")
            .length,
          developing: currentMathStates.filter(
            (state) => state === "developing",
          ).length,
          attention: currentMathStates.filter(
            (state) => state === "attention",
          ).length,
          unknown: currentMathStates.filter((state) => state === "unknown")
            .length,
          locked: false,
        },
    {
      subject: "science",
      total: 0,
      assessed: 0,
      strong: 0,
      developing: 0,
      attention: 0,
      unknown: 0,
      locked: true,
    },
  ];

  function toggle(key: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function switchSubject(next: LiveAcademicSubject) {
    setSubject(next);
    setSelectedLevel(
      next === "english" ? currentEnglishLevel : currentMathLevel,
    );
    setExpandedKeys(new Set());
    setSelectedEnglish(null);
    setSelectedMath(null);
    setOpenInfoId(null);
  }

  const subjectMeta = SUBJECT_META[subject as NovaSubjectKey];

  return (
    <div className={styles.page}>
      <section className={styles.introCard}>
        <div>
          <span className={styles.eyebrow}>MASTERY MAP</span>
          <h2>See the curriculum. See what is secure. See what comes next.</h2>
          <p>
            English uses NOVA+ mastery stages and Evidence Confidence.
            Mathematics keeps its canonical concept map. Science remains locked
            until its mastery layer is released.
          </p>
        </div>

        <div className={styles.introControls}>
          <label className={styles.levelPicker}>
            <span>Primary level</span>
            <select
              value={selectedLevel}
              onChange={(event) => {
                setSelectedLevel(Number(event.target.value));
                setExpandedKeys(new Set());
                setSelectedEnglish(null);
                setSelectedMath(null);
                setOpenInfoId(null);
              }}
            >
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  Primary {level}
                  {subject === "english" && level === currentEnglishLevel
                    ? " · Current"
                    : ""}
                </option>
              ))}
            </select>
          </label>

          {subject === "english" ? (
            <div className={styles.legend} aria-label="English mastery stages">
              {(
                [
                  "Starting",
                  "Building",
                  "Progressing",
                  "Developing",
                  "Consolidating",
                  "Strong",
                  "Not Yet Assessed",
                ] as EnglishMasteryStage[]
              ).map((stage) => (
                <span key={stage}>
                  <i style={{ background: ENGLISH_STAGE_COLOURS[stage] }} />
                  {stage}
                </span>
              ))}
            </div>
          ) : (
            <div className={styles.legend} aria-label="Mathematics map legend">
              {(Object.keys(STATE_META) as MapState[]).map((state) => (
                <span key={state}>
                  <i style={{ background: STATE_META[state].colour }} />
                  {STATE_META[state].label}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.subjectStrip}>
        {SUBJECT_ORDER.map((subjectKey) => {
          const summary = summaries.find((row) => row.subject === subjectKey)!;
          const meta = SUBJECT_META[subjectKey as NovaSubjectKey];
          const active = subject === subjectKey;

          if (summary.locked) {
            return (
              <button
                key={subjectKey}
                type="button"
                className={styles.subjectLocked}
                disabled
                aria-label="Science Mastery Map is locked"
              >
                <span
                  className={`${styles.subjectIcon} ${styles.subjectIconLocked}`}
                >
                  {meta.icon}
                </span>
                <span className={styles.subjectCopy}>
                  <strong>{meta.label}</strong>
                  <small>Mastery layer locked</small>
                </span>
                <span className={styles.lockedBadge}>LOCKED</span>
              </button>
            );
          }

          return (
            <button
              key={subjectKey}
              type="button"
              className={active ? styles.subjectActive : styles.subjectButton}
              onClick={() => switchSubject(subjectKey as LiveAcademicSubject)}
            >
              <span className={styles.subjectIcon}>{meta.icon}</span>
              <span className={styles.subjectCopy}>
                <strong>{meta.label}</strong>
                <small>
                  {subjectKey === "english"
                    ? `${summary.assessed} of ${summary.total} masteries assessed`
                    : `${summary.assessed} of ${summary.total} concepts assessed`}
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
        {subject === "english" ? (
          <>
            <header className={styles.mapHeader}>
              <div>
                <span className={styles.eyebrow}>
                  PRIMARY {selectedLevel} · ENGLISH
                </span>
                <h3>English mastery pathway</h3>
                <p>
                  {englishItems.length} masteries are grouped into four learning
                  families. Open a family to see stage and Evidence Confidence.
                </p>
              </div>

              <div className={styles.mapTotals}>
                <span><b>{englishSummary.assessed}</b> Assessed</span>
                <span>
                  <b>
                    {stageCount(englishItems, "Strong") +
                      stageCount(englishItems, "Consolidating")}
                  </b>{" "}
                  Secure upper stages
                </span>
                <span><b>{englishSummary.attention}</b> Confirmed priorities</span>
                <span><b>{englishSummary.unknown}</b> Need more evidence</span>
              </div>
            </header>

            {englishMastery.error ? (
              <div className={styles.noTopics}>
                English mastery could not be loaded. Use NOVA+ Refresh and try
                again.
              </div>
            ) : englishMastery.loading && !englishMastery.profile ? (
              <div className={styles.noTopics}>
                Nova is loading the English mastery map…
              </div>
            ) : englishFamilies.length === 0 ? (
              <div className={styles.noTopics}>
                No English mastery definitions are available for this level.
              </div>
            ) : (
              <div className={styles.pathway}>
                {englishFamilies.map((family, index) => {
                  const meta = STATE_META[family.state];
                  const open = expandedKeys.has(family.family);
                  const total = family.masteries.length;

                  return (
                    <article key={family.family} className={styles.topicStep}>
                      <div
                        className={styles.pathNode}
                        style={{ borderColor: meta.border }}
                      >
                        <b>{index + 1}</b>
                        <span style={{ background: meta.colour }} />
                      </div>

                      <div
                        className={styles.topicCard}
                        style={{
                          borderColor: meta.border,
                          background: `linear-gradient(145deg, ${meta.soft}, rgba(4,13,29,.76))`,
                        }}
                      >
                        <button
                          type="button"
                          className={styles.topicSummary}
                          onClick={() => toggle(family.family)}
                          aria-expanded={open}
                        >
                          <div className={styles.topicTitle}>
                            <span>{FAMILY_SHORT[family.family]}</span>
                            <h4>{family.family}</h4>
                            <small>
                              {family.assessed} of {total} masteries assessed ·{" "}
                              {family.attention} confirmed{" "}
                              {family.attention === 1 ? "priority" : "priorities"}
                            </small>
                          </div>

                          <div className={styles.topicStatus}>
                            <strong style={{ color: meta.colour }}>
                              {meta.label}
                            </strong>
                            <span>{open ? "−" : "+"}</span>
                          </div>
                        </button>

                        <div className={styles.topicBar}>
                          <i
                            className={styles.barGreen}
                            style={{ width: `${(family.strong / total) * 100}%` }}
                          />
                          <i
                            style={{
                              width: `${(family.developing / total) * 100}%`,
                              background: "#7bc8ff",
                            }}
                          />
                          <i
                            className={styles.barRed}
                            style={{
                              width: `${(family.attention / total) * 100}%`,
                            }}
                          />
                          <i
                            className={styles.barGrey}
                            style={{
                              width: `${(family.needsEvidence / total) * 100}%`,
                            }}
                          />
                        </div>

                        {open && (
                          <div className={styles.conceptGrid}>
                            {family.masteries.map((item) => {
                              const group = englishMasteryDisplayGroup(item);
                              const groupMeta = englishGroupMeta(group);
                              const stageColour = ENGLISH_STAGE_COLOURS[item.stage];
                              const infoId = item.mastery_code;

                              return (
                                <div
                                  key={item.mastery_code}
                                  className={styles.conceptNode}
                                  style={{
                                    borderColor: groupMeta.border,
                                    background: `linear-gradient(145deg, ${groupMeta.soft}, rgba(3,12,26,.72))`,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={styles.conceptMain}
                                    onClick={() => {
                                      setSelectedEnglish(item);
                                      setSelectedMath(null);
                                      setOpenInfoId(null);
                                    }}
                                  >
                                    <i
                                      className={styles.conceptDot}
                                      style={{
                                        background: stageColour,
                                        color: stageColour,
                                      }}
                                    />
                                    <strong>{item.mastery_name}</strong>
                                    <small style={{ color: stageColour }}>
                                      {item.stage} · {item.evidence_confidence} evidence
                                    </small>
                                  </button>

                                  <button
                                    type="button"
                                    className={styles.conceptInfoButton}
                                    aria-label={`More information about ${item.mastery_name}`}
                                    aria-expanded={openInfoId === infoId}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenInfoId((current) =>
                                        current === infoId ? null : infoId,
                                      );
                                    }}
                                  >
                                    i
                                  </button>

                                  {openInfoId === infoId && (
                                    <div
                                      className={styles.conceptInfoPopover}
                                      role="tooltip"
                                    >
                                      <span>WHAT THIS MEANS</span>
                                      <p>{englishExplanation(item)}</p>
                                      <small>
                                        {item.unique_questions} unique questions ·{" "}
                                        {item.bands_encountered.length} difficulty
                                        bands · {item.contexts_seen.length} contexts
                                      </small>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <header className={styles.mapHeader}>
              <div>
                <span className={styles.eyebrow}>
                  PRIMARY {selectedLevel} · {subjectMeta.label.toUpperCase()}
                </span>
                <h3>{subjectMeta.label} curriculum pathway</h3>
                <p>
                  Open a topic to see every canonical Mathematics concept inside
                  it. Untouched concepts stay grey.
                </p>
              </div>

              <div className={styles.mapTotals}>
                <span><b>{mathSummary.strong}</b> Strong</span>
                <span><b>{mathSummary.developing}</b> Developing</span>
                <span><b>{mathSummary.attention}</b> Needs attention</span>
                <span><b>{mathSummary.unknown}</b> Not assessed</span>
              </div>
            </header>

            {mathTopics.length === 0 ? (
              <div className={styles.noTopics}>
                No canonical Mathematics concepts are available for this level.
              </div>
            ) : (
              <div className={styles.pathway}>
                {mathTopics.map((topic, index) => {
                  const meta = STATE_META[topic.state];
                  const open = expandedKeys.has(topic.key);
                  const total = topic.concepts.length;

                  return (
                    <article key={topic.key} className={styles.topicStep}>
                      <div
                        className={styles.pathNode}
                        style={{ borderColor: meta.border }}
                      >
                        <b>{index + 1}</b>
                        <span style={{ background: meta.colour }} />
                      </div>

                      <div
                        className={styles.topicCard}
                        style={{
                          borderColor: meta.border,
                          background: `linear-gradient(145deg, ${meta.soft}, rgba(4,13,29,.76))`,
                        }}
                      >
                        <button
                          type="button"
                          className={styles.topicSummary}
                          onClick={() => toggle(topic.key)}
                          aria-expanded={open}
                        >
                          <div className={styles.topicTitle}>
                            <span>{topic.domain}</span>
                            <h4>{topic.topic}</h4>
                            <small>
                              {topic.assessed} of {total} concepts assessed
                            </small>
                          </div>
                          <div className={styles.topicStatus}>
                            <strong style={{ color: meta.colour }}>
                              {meta.label}
                            </strong>
                            <span>{open ? "−" : "+"}</span>
                          </div>
                        </button>

                        <div className={styles.topicBar}>
                          <i
                            className={styles.barGreen}
                            style={{ width: `${(topic.strong / total) * 100}%` }}
                          />
                          <i
                            className={styles.barOrange}
                            style={{
                              width: `${(topic.developing / total) * 100}%`,
                            }}
                          />
                          <i
                            className={styles.barRed}
                            style={{
                              width: `${(topic.attention / total) * 100}%`,
                            }}
                          />
                          <i
                            className={styles.barGrey}
                            style={{ width: `${(topic.unknown / total) * 100}%` }}
                          />
                        </div>

                        {open && (
                          <div className={styles.conceptGrid}>
                            {topic.concepts.map((concept) => {
                              const state = mathState(concept);
                              const conceptMeta = STATE_META[state];
                              const infoId = String(concept.skill_id);

                              return (
                                <div
                                  key={concept.skill_id}
                                  className={styles.conceptNode}
                                  style={{
                                    borderColor: conceptMeta.border,
                                    background: `linear-gradient(145deg, ${conceptMeta.soft}, rgba(3,12,26,.72))`,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={styles.conceptMain}
                                    onClick={() => {
                                      setSelectedMath(concept);
                                      setSelectedEnglish(null);
                                      setOpenInfoId(null);
                                    }}
                                  >
                                    <i
                                      className={styles.conceptDot}
                                      style={{
                                        background: conceptMeta.colour,
                                        color: conceptMeta.colour,
                                      }}
                                    />
                                    <strong>{concept.skill_name}</strong>
                                    <small style={{ color: conceptMeta.colour }}>
                                      {conceptMeta.label}
                                    </small>
                                  </button>

                                  <button
                                    type="button"
                                    className={styles.conceptInfoButton}
                                    aria-label={`More information about ${concept.skill_name}`}
                                    aria-expanded={openInfoId === infoId}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenInfoId((current) =>
                                        current === infoId ? null : infoId,
                                      );
                                    }}
                                  >
                                    i
                                  </button>

                                  {openInfoId === infoId && (
                                    <div
                                      className={styles.conceptInfoPopover}
                                      role="tooltip"
                                    >
                                      <span>WHAT THIS MEANS</span>
                                      <p>{mathExplanation(concept)}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {selectedEnglish && (
        <section
          className={styles.detailPanel}
          style={{
            borderColor: englishGroupMeta(
              englishMasteryDisplayGroup(selectedEnglish),
            ).border,
          }}
        >
          <div className={styles.detailMain}>
            <span
              className={styles.detailStatus}
              style={{ color: ENGLISH_STAGE_COLOURS[selectedEnglish.stage] }}
            >
              <i
                style={{
                  background: ENGLISH_STAGE_COLOURS[selectedEnglish.stage],
                }}
              />{" "}
              {selectedEnglish.stage}
            </span>
            <h3>{selectedEnglish.mastery_name}</h3>
            <p>
              English · Primary {selectedEnglish.primary_level} ·{" "}
              {selectedEnglish.mastery_family}
            </p>
          </div>

          <div className={styles.detailMetrics}>
            <span>
              <small>Mastery stage</small>
              <strong>{selectedEnglish.stage}</strong>
            </span>
            <span>
              <small>Evidence</small>
              <strong>{selectedEnglish.evidence_confidence}</strong>
            </span>
            <span>
              <small>Unique questions</small>
              <strong>{selectedEnglish.unique_questions}</strong>
            </span>
            <span>
              <small>Difficulty bands</small>
              <strong>{selectedEnglish.bands_encountered.length}</strong>
            </span>
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
              padding: "11px 13px",
              borderRadius: 12,
              border: "1px solid rgba(142,232,255,.08)",
              background: "rgba(255,255,255,.025)",
              color: "rgba(235,247,255,.58)",
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            {englishExplanation(selectedEnglish)}
            <br />
            <strong style={{ color: "rgba(235,247,255,.82)" }}>
              Contexts:
            </strong>{" "}
            {selectedEnglish.contexts_seen.length > 0
              ? selectedEnglish.contexts_seen.join(", ")
              : "No context evidence yet"}
          </div>

          <div className={styles.detailFooter}>
            <span>
              Last evidence: {formatDate(selectedEnglish.last_evidence_at)}
            </span>
            {englishMasteryDisplayGroup(selectedEnglish) !==
              "needs_evidence" && (
              <button type="button" onClick={onOpenRecommendations}>
                See Nova&apos;s recommendation →
              </button>
            )}
            <button
              type="button"
              className={styles.closeDetail}
              onClick={() => setSelectedEnglish(null)}
              aria-label="Close mastery detail"
            >
              ×
            </button>
          </div>
        </section>
      )}

      {selectedMath &&
        (() => {
          const state = mathState(selectedMath);
          const meta = STATE_META[state];
          const schoolwork = schoolworkEvidence.bySkillId.get(
            String(selectedMath.skill_id),
          );

          return (
            <section
              className={styles.detailPanel}
              style={{ borderColor: meta.border }}
            >
              <div className={styles.detailMain}>
                <span
                  className={styles.detailStatus}
                  style={{ color: meta.colour }}
                >
                  <i style={{ background: meta.colour }} /> {meta.label}
                </span>
                <h3>{selectedMath.skill_name}</h3>
                <p>
                  Mathematics · Primary {selectedMath.primary_level} ·{" "}
                  {selectedMath.topic}
                </p>
              </div>

              <div className={styles.detailMetrics}>
                <span>
                  <small>Mastery</small>
                  <strong>
                    {selectedMath.has_evidence &&
                    selectedMath.mastery_score !== null
                      ? `${Math.round(selectedMath.mastery_score)}%`
                      : "—"}
                  </strong>
                </span>
                <span>
                  <small>Confidence</small>
                  <strong>
                    {selectedMath.has_evidence &&
                    selectedMath.confidence_score !== null
                      ? `${Math.round(selectedMath.confidence_score)}%`
                      : "—"}
                  </strong>
                </span>
                <span>
                  <small>Questions</small>
                  <strong>{selectedMath.questions_attempted}</strong>
                </span>
                <span>
                  <small>Trend</small>
                  <strong>
                    {selectedMath.trend === "no_data"
                      ? "—"
                      : selectedMath.trend}
                  </strong>
                </span>
              </div>

              {schoolwork && (
                <div className={styles.schoolworkEvidence}>
                  <span>UPLOADED SCHOOLWORK</span>
                  <strong>
                    {schoolwork.event_count} approved question
                    {schoolwork.event_count === 1 ? "" : "s"} from{" "}
                    {schoolwork.upload_count} upload
                    {schoolwork.upload_count === 1 ? "" : "s"}
                  </strong>
                  <small>
                    This evidence is weighted below Dreamscape quiz evidence and
                    was added only after review.
                  </small>
                </div>
              )}

              <div className={styles.detailFooter}>
                <span>
                  Last practised: {formatDate(selectedMath.last_attempted_at)}
                </span>
                {state !== "unknown" && (
                  <button type="button" onClick={onOpenRecommendations}>
                    See Nova&apos;s recommendation →
                  </button>
                )}
                <button
                  type="button"
                  className={styles.closeDetail}
                  onClick={() => setSelectedMath(null)}
                  aria-label="Close concept detail"
                >
                  ×
                </button>
              </div>
            </section>
          );
        })()}
    </div>
  );
}
