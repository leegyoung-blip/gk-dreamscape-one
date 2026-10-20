"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type {
  CurriculumConcept,
  NovaPlusProfilePayload,
  NovaSubjectKey,
} from "@/lib/nova-plus/types";
import type {
  EnglishMasteryItem,
} from "@/lib/nova-plus/english-mastery-types";
import {
  isNovaPlusAssessedConcept,
  safeNumber,
  SUBJECT_META,
} from "@/lib/nova-plus/helpers";
import {
  englishMasteriesAtLevel,
  englishMasteryDisplayGroup,
  inferCurrentEnglishLevel,
  type EnglishMasteryDisplayGroup,
} from "@/lib/nova-plus/english-mastery-ui";
import { classifyConceptEvidence } from "@/lib/nova-plus/evidence-presentation";
import { useEnglishMastery } from "@/components/nova-plus/EnglishMasteryProvider";
import { useNovaSchoolworkEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import styles from "./MasteryMapTab.module.css";

type Props = {
  learnerId: string;
  accountName?: string;
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

type SubjectKey = "english" | "math" | "science";
type LiveSubject = "english" | "math";
type LegacyMapState = "strong" | "developing" | "attention" | "limited" | "unknown";
type ConfidenceLabel = "Low" | "Moderate" | "High";
type PurposeState =
  | "secure"
  | "building"
  | "needs_practice"
  | "needs_evidence";

type OrbitGroup = {
  id: string;
  label: string;
  shortLabel: string;
  total: number;
  assessed: number;
  secure: number;
  priority: number;
  needsEvidence: number;
  accent: string;
};

type OrbitNode = {
  id: string;
  label: string;
  statusLabel: string;
  colour: string;
  confidence: ConfidenceLabel;
  kind: "english" | "math";
  english?: EnglishMasteryItem;
  math?: CurriculumConcept;
};

const ENGLISH_FAMILY_ORDER = [
  "Grammar & Sentence Structure",
  "Vocabulary & Word Knowledge",
  "Reading Comprehension",
  "Language Conventions & Editing",
];

const ENGLISH_FAMILY_META: Record<
  string,
  { short: string; accent: string }
> = {
  "Grammar & Sentence Structure": {
    short: "Grammar & Sentences",
    accent: "#f5a84b",
  },
  "Vocabulary & Word Knowledge": {
    short: "Vocabulary & Words",
    accent: "#4de2a1",
  },
  "Reading Comprehension": {
    short: "Reading Comprehension",
    accent: "#ffbd59",
  },
  "Language Conventions & Editing": {
    short: "Language & Editing",
    accent: "#b896ff",
  },
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
    "Data",
    "Problem Solving",
    "Circles",
    "Average",
  ],
};

const MATH_ACCENTS = [
  "#53d7ff",
  "#7ee8ff",
  "#60f0a8",
  "#ffbd59",
  "#b896ff",
  "#ff8bb8",
  "#72e6d2",
  "#ff9d72",
  "#8fa7ff",
  "#d1ff72",
];

const LEGACY_STATE_META: Record<
  LegacyMapState,
  { label: string; colour: string }
> = {
  strong: { label: "Strong", colour: "#4de2a1" },
  developing: { label: "Developing", colour: "#ffae57" },
  attention: { label: "Needs Attention", colour: "#ff6c72" },
  limited: { label: "Limited evidence", colour: "#93a3b8" },
  unknown: { label: "Not assessed", colour: "#8d9caf" },
};

const PURPOSE_STATE_META: Record<
  PurposeState,
  {
    label: string;
    colour: string;
    meaning: string;
  }
> = {
  secure: {
    label: "Secure",
    colour: "#4de2a1",
    meaning:
      "Nova has enough evidence to show that this skill is secure right now.",
  },
  building: {
    label: "Building",
    colour: "#6fc7ff",
    meaning:
      "This skill is developing. Progress is happening, but it is not secure yet.",
  },
  needs_practice: {
    label: "Needs Practice",
    colour: "#ff747c",
    meaning:
      "Nova has enough evidence to treat this as a real practice priority.",
  },
  needs_evidence: {
    label: "Needs More Evidence",
    colour: "#93a3b8",
    meaning:
      "Nova has not seen enough varied work yet, so this is not a confirmed weakness.",
  },
};

const ORBIT_PAGE_SIZE = 12;

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

function confidenceFromLegacyScore(value: number | null | undefined): ConfidenceLabel {
  const score = safeNumber(value);
  if (score >= 70) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

function confidenceGlow(confidence: ConfidenceLabel) {
  if (confidence === "High") return "0 0 0 4px rgba(83,215,255,.26), 0 0 24px rgba(83,215,255,.34)";
  if (confidence === "Moderate") return "0 0 0 3px rgba(83,215,255,.17), 0 0 15px rgba(83,215,255,.18)";
  return "0 0 0 2px rgba(142,169,194,.12), 0 0 8px rgba(142,169,194,.10)";
}

function isCanonicalMathConcept(concept: CurriculumConcept) {
  if (normalise(concept.subject) !== "math") return false;
  if (!isNovaPlusAssessedConcept(concept)) return false;
  if (concept.is_active === false) return false;

  const source = normalise(concept.source);
  if (source && source !== "nova_curriculum_rollout_sql") return false;

  return Boolean(
    String(concept.skill_id || "").trim() &&
      String(concept.skill_code || "").trim() &&
      String(concept.skill_name || "").trim(),
  );
}

// Shared NOVA+ claim policy (lib/nova-plus/evidence-presentation.ts), so the
// map, Strengths & Gaps, Progress and Parent Report agree on each concept.
function mathConceptState(concept: CurriculumConcept): LegacyMapState {
  if (!concept.has_evidence || safeNumber(concept.questions_attempted) <= 0) {
    return "unknown";
  }

  switch (classifyConceptEvidence(concept)) {
    case "supported_strength":
      return "strong";
    case "confirmed_gap":
      return "attention";
    case "developing":
      return "developing";
    default:
      return "limited";
  }
}

function inferMathCurrentLevel(
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
  for (const skill of profile.skills ?? []) {
    if (normalise(skill.subject) !== "math") continue;
    const level = safeNumber(skill.primary_level);
    if (level <= 0) continue;

    historic.set(
      level,
      (historic.get(level) || 0) +
        Math.max(1, safeNumber(skill.questions_attempted)),
    );
  }

  const historicRanked = [...historic.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (historicRanked[0]) return historicRanked[0][0];

  const levels = [...new Set(concepts.map((row) => safeNumber(row.primary_level)))]
    .filter((level) => level > 0)
    .sort((a, b) => a - b);

  return levels[0] || 1;
}

function mathTopicRank(level: number, topic: string) {
  const order = MATH_TOPIC_ORDER[level] || [];
  const index = order.findIndex(
    (candidate) => normalise(candidate) === normalise(topic),
  );
  return index === -1 ? 999 : index;
}

function englishGroup(item: EnglishMasteryItem): EnglishMasteryDisplayGroup {
  return englishMasteryDisplayGroup(item);
}

function englishPurposeState(item: EnglishMasteryItem): PurposeState {
  const group = englishGroup(item);

  if (group === "strong") return "secure";
  if (group === "attention") return "needs_practice";
  if (group === "needs_evidence") return "needs_evidence";
  return "building";
}

function mathPurposeState(concept: CurriculumConcept): PurposeState {
  const state = mathConceptState(concept);

  if (state === "strong") return "secure";
  if (state === "attention") return "needs_practice";
  if (state === "unknown" || state === "limited") return "needs_evidence";
  return "building";
}

function englishNextStep(
  item: EnglishMasteryItem,
  state: PurposeState,
) {
  if (state === "needs_evidence") {
    return `Try a few more questions that use “${item.mastery_name}”. Nova will update this skill once it has seen more varied evidence.`;
  }

  if (state === "needs_practice") {
    return `Focus on “${item.mastery_name}” next with targeted practice, then check the skill again after a few more questions.`;
  }

  if (state === "building") {
    return `Keep practising “${item.mastery_name}” across a few more questions and contexts until it becomes secure.`;
  }

  return `This skill looks secure. Keep it fresh with occasional review, then move on to a new challenge.`;
}

function mathNextStep(
  concept: CurriculumConcept,
  state: PurposeState,
) {
  const skill = String(concept.skill_name || "this skill");

  if (state === "needs_evidence") {
    return `Try a few more questions that use “${skill}”. Nova needs more work samples before making a confident judgement.`;
  }

  if (state === "needs_practice") {
    return `Give “${skill}” focused practice next, then revisit it after a few more questions.`;
  }

  if (state === "building") {
    return `Keep practising “${skill}” until the learner can use it consistently and independently.`;
  }

  return `This concept looks secure. Keep it fresh with occasional review and move on to a new challenge.`;
}

function rememberMasteryFocus(node: OrbitNode) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      "nova-plus-mastery-focus-v1",
      JSON.stringify({
        id: node.id,
        label: node.label,
        kind: node.kind,
        english_mastery_code: node.english?.mastery_code ?? null,
        math_skill_id: node.math?.skill_id ?? null,
        saved_at: new Date().toISOString(),
      }),
    );
  } catch {
    // Recommendation navigation still works if browser storage is unavailable.
  }
}

function buildEnglishGroups(items: EnglishMasteryItem[]): OrbitGroup[] {
  return ENGLISH_FAMILY_ORDER.map((family) => {
    const rows = items.filter((item) => item.mastery_family === family);
    const meta = ENGLISH_FAMILY_META[family] ?? {
      short: family,
      accent: "#53d7ff",
    };

    return {
      id: family,
      label: family,
      shortLabel: meta.short,
      total: rows.length,
      assessed: rows.filter((item) => item.stage !== "Not Yet Assessed").length,
      secure: rows.filter((item) => englishGroup(item) === "strong").length,
      priority: rows.filter((item) => englishGroup(item) === "attention").length,
      needsEvidence: rows.filter(
        (item) => englishGroup(item) === "needs_evidence",
      ).length,
      accent: meta.accent,
    };
  }).filter((group) => group.total > 0);
}

function buildMathGroups(
  concepts: CurriculumConcept[],
  level: number,
): OrbitGroup[] {
  const byTopic = new Map<string, CurriculumConcept[]>();

  for (const concept of concepts) {
    const topic =
      String(concept.topic || concept.domain || "Other").trim() || "Other";
    const current = byTopic.get(topic) || [];
    current.push(concept);
    byTopic.set(topic, current);
  }

  return [...byTopic.entries()]
    .map(([topic, rows], index) => ({
      id: topic,
      label: topic,
      shortLabel: topic,
      total: rows.length,
      assessed: rows.filter((row) => mathConceptState(row) !== "unknown").length,
      secure: rows.filter((row) => mathConceptState(row) === "strong").length,
      priority: rows.filter((row) => mathConceptState(row) === "attention").length,
      needsEvidence: rows.filter((row) => {
        const state = mathConceptState(row);
        return state === "unknown" || state === "limited";
      }).length,
      accent: MATH_ACCENTS[index % MATH_ACCENTS.length],
    }))
    .sort(
      (a, b) =>
        mathTopicRank(level, a.label) - mathTopicRank(level, b.label) ||
        a.label.localeCompare(b.label),
    )
    .map((group, index) => ({
      ...group,
      accent: MATH_ACCENTS[index % MATH_ACCENTS.length],
    }));
}

function englishNodes(
  items: EnglishMasteryItem[],
  familyId: string,
): OrbitNode[] {
  return items
    .filter((item) => item.mastery_family === familyId)
    .sort(
      (a, b) =>
        a.progression_key.localeCompare(b.progression_key) ||
        a.mastery_name.localeCompare(b.mastery_name),
    )
    .map((item) => {
      const purposeState = englishPurposeState(item);
      const purposeMeta = PURPOSE_STATE_META[purposeState];

      return {
        id: item.mastery_code,
        label: item.mastery_name,
        statusLabel: `${purposeMeta.label} · ${item.evidence_confidence} evidence`,
        colour: purposeMeta.colour,
        confidence: item.evidence_confidence,
        kind: "english" as const,
        english: item,
      };
    });
}

function mathNodes(
  concepts: CurriculumConcept[],
  topicId: string,
): OrbitNode[] {
  return concepts
    .filter(
      (concept) =>
        String(concept.topic || concept.domain || "Other").trim() === topicId,
    )
    .sort((a, b) =>
      String(a.skill_name || "").localeCompare(String(b.skill_name || "")),
    )
    .map((concept) => {
      const purposeState = mathPurposeState(concept);
      const purposeMeta = PURPOSE_STATE_META[purposeState];

      return {
        id: String(concept.skill_id),
        label: concept.skill_name,
        statusLabel: purposeMeta.label,
        colour: purposeMeta.colour,
        confidence: confidenceFromLegacyScore(concept.confidence_score),
        kind: "math" as const,
        math: concept,
      };
    });
}

function polarPoint(radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(radians),
    y: 50 + radius * Math.sin(radians),
  };
}

function donutSegmentPath(
  startDegrees: number,
  endDegrees: number,
  outerRadius = 30.2,
  innerRadius = 19.0,
) {
  const startOuter = polarPoint(outerRadius, endDegrees);
  const endOuter = polarPoint(outerRadius, startDegrees);
  const startInner = polarPoint(innerRadius, endDegrees);
  const endInner = polarPoint(innerRadius, startDegrees);
  const largeArc = endDegrees - startDegrees <= 180 ? 0 : 1;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function segmentGeometry(index: number, count: number) {
  const width = 360 / Math.max(1, count);
  const gap = Math.min(2.2, width * 0.08);
  const start = -90 + index * width + gap;
  const end = -90 + (index + 1) * width - gap;
  const mid = (start + end) / 2;
  const labelPoint = polarPoint(24.6, mid);
  return { start, end, mid, labelPoint };
}

function handleSegmentKey(
  event: KeyboardEvent<SVGPathElement>,
  onActivate: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

function nodePosition(index: number, count: number) {
  const angle = -90 + (360 / Math.max(1, count)) * index;
  const point = polarPoint(43.8, angle);
  return { angle, point };
}

function nodeLabelPlacement(point: { x: number; y: number }) {
  if (point.x >= 58) return "right" as const;
  if (point.x <= 42) return "left" as const;
  if (point.y < 50) return "top" as const;
  return "bottom" as const;
}

export default function MasteryMapTab({
  learnerId,
  accountName: _accountName,
  profile,
  onOpenRecommendations,
}: Props) {
  const mastery = useEnglishMastery();
  const schoolworkEvidence = useNovaSchoolworkEvidence(learnerId);

  const mathConcepts = useMemo(
    () => (profile.curriculum_concepts ?? []).filter(isCanonicalMathConcept),
    [profile.curriculum_concepts],
  );

  const currentEnglishLevel = useMemo(
    () => inferCurrentEnglishLevel(mastery.profile, profile),
    [mastery.profile, profile],
  );

  const currentMathLevel = useMemo(
    () => inferMathCurrentLevel(mathConcepts, profile),
    [mathConcepts, profile],
  );

  const [subject, setSubject] = useState<LiveSubject>("english");
  const [level, setLevel] = useState(currentEnglishLevel);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    "Reading Comprehension",
  );
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);
  const [orbitPage, setOrbitPage] = useState(0);

  useEffect(() => {
    setSubject("english");
    setLevel(currentEnglishLevel);
    setSelectedGroupId("Reading Comprehension");
    setHoveredGroupId(null);
    setSelectedNode(null);
    setOrbitPage(0);
  }, [profile.student_user_id, currentEnglishLevel]);

  const englishItems = englishMasteriesAtLevel(mastery.profile, level);
  const levelMathConcepts = mathConcepts.filter(
    (concept) => safeNumber(concept.primary_level) === level,
  );

  const groups = useMemo(
    () =>
      subject === "english"
        ? buildEnglishGroups(englishItems)
        : buildMathGroups(levelMathConcepts, level),
    [subject, englishItems, levelMathConcepts, level],
  );

  useEffect(() => {
    if (!groups.length) return;

    if (!groups.some((group) => group.id === selectedGroupId)) {
      const preferred =
        subject === "english"
          ? groups.find((group) => group.id === "Reading Comprehension")
          : null;

      setSelectedGroupId(preferred?.id ?? groups[0].id);
      setHoveredGroupId(null);
      setSelectedNode(null);
      setOrbitPage(0);
    }
  }, [groups, selectedGroupId, subject]);

  // Selection controls the centre disc and outer skill orbit.
  // Hover is visual-only: it illuminates another sector without changing
  // the currently selected family's/topic's skills.
  const visualActiveGroupId =
    hoveredGroupId && groups.some((group) => group.id === hoveredGroupId)
      ? hoveredGroupId
      : selectedGroupId;

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;

  const allNodes = useMemo(() => {
    if (!selectedGroup) return [];
    return subject === "english"
      ? englishNodes(englishItems, selectedGroup.id)
      : mathNodes(levelMathConcepts, selectedGroup.id);
  }, [subject, selectedGroup, englishItems, levelMathConcepts]);

  const pageCount = Math.max(1, Math.ceil(allNodes.length / ORBIT_PAGE_SIZE));
  const safePage = Math.min(orbitPage, pageCount - 1);
  const pageNodes = allNodes.slice(
    safePage * ORBIT_PAGE_SIZE,
    safePage * ORBIT_PAGE_SIZE + ORBIT_PAGE_SIZE,
  );

  useEffect(() => {
    if (orbitPage !== safePage) setOrbitPage(safePage);
  }, [orbitPage, safePage]);

  const englishLevelOptions = Array.from(
    { length: Math.max(1, currentEnglishLevel) },
    (_, index) => index + 1,
  );

  const mathLevelOptions = [
    ...new Set(
      mathConcepts.map((concept) => safeNumber(concept.primary_level)),
    ),
  ]
    .filter((candidate) => candidate > 0 && candidate <= currentMathLevel)
    .sort((a, b) => a - b);

  const levelOptions =
    subject === "english"
      ? englishLevelOptions
      : mathLevelOptions.length
        ? mathLevelOptions
        : [currentMathLevel];

  function switchSubject(next: LiveSubject) {
    const nextLevel =
      next === "english" ? currentEnglishLevel : currentMathLevel;

    setSubject(next);
    setLevel(nextLevel);
    setSelectedGroupId(
      next === "english" ? "Reading Comprehension" : "",
    );
    setHoveredGroupId(null);
    setSelectedNode(null);
    setOrbitPage(0);
  }

  const subjectMeta = SUBJECT_META[subject as NovaSubjectKey];

  return (
    <div className={styles.page}>
      <section className={styles.controlBar}>
        <div className={styles.subjectTabs}>
          <button
            type="button"
            className={subject === "english" ? styles.subjectActive : ""}
            onClick={() => switchSubject("english")}
          >
            <span>{SUBJECT_META.english.icon}</span>
            English
          </button>

          <button
            type="button"
            className={subject === "math" ? styles.subjectActive : ""}
            onClick={() => switchSubject("math")}
          >
            <span>{SUBJECT_META.math.icon}</span>
            Mathematics
          </button>

          <button
            type="button"
            className={styles.subjectLocked}
            disabled
            aria-label="Science Mastery Map is locked"
          >
            <span>{SUBJECT_META.science.icon}</span>
            Science
            <small>LOCKED</small>
          </button>
        </div>

        <label className={styles.levelPicker}>
          <span>Primary level</span>
          <select
            value={level}
            onChange={(event) => {
              setLevel(Number(event.target.value));
              setSelectedGroupId(
                subject === "english" ? "Reading Comprehension" : "",
              );
              setHoveredGroupId(null);
              setSelectedNode(null);
              setOrbitPage(0);
            }}
          >
            {levelOptions.map((candidate) => (
              <option key={candidate} value={candidate}>
                Primary {candidate}
                {candidate ===
                (subject === "english"
                  ? currentEnglishLevel
                  : currentMathLevel)
                  ? " · Current"
                  : ""}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.orbitPanel}>
        <header className={styles.orbitHeader}>
          <div>
            <span className={styles.eyebrow}>INTERACTIVE MASTERY ORBIT</span>
            <h2>
              Exploring{" "}
              {selectedGroup?.shortLabel ??
                (subject === "english" ? "English" : "Mathematics")}
            </h2>
          </div>

          <div className={styles.legend}>
            <span>
              <i className={styles.legendStage} />
              Node colour = learning status
            </span>
            <span>
              <i className={styles.legendHalo} />
              Halo = strength of evidence
            </span>
          </div>
        </header>

        <section className={styles.purposeGuide}>
          <div className={styles.purposeCopy}>
            <span>WHAT THIS MAP IS FOR</span>
            <h3>See what you know and what to work on next.</h3>
            <p>
              Choose a learning area, then select a skill. Nova shows what is
              secure, what is still building, and where more practice or more
              evidence is needed.
            </p>
          </div>

          <div className={styles.purposeSteps} aria-label="How to use the Mastery Map">
            <span>
              <b>1</b>
              <strong>Choose an area</strong>
              <small>Inner ring</small>
            </span>
            <span>
              <b>2</b>
              <strong>Select a skill</strong>
              <small>Outer orbit</small>
            </span>
            <span>
              <b>3</b>
              <strong>Read your next step</strong>
              <small>Coaching panel</small>
            </span>
          </div>
        </section>

        {subject === "english" && mastery.error ? (
          <div className={styles.stateCard}>
            English mastery could not be loaded. Use NOVA+ Refresh and try again.
          </div>
        ) : subject === "english" && mastery.loading && !mastery.profile ? (
          <div className={styles.stateCard}>
            Nova is loading the English mastery orbit…
          </div>
        ) : !groups.length ? (
          <div className={styles.stateCard}>
            No mastery-map data is available for this subject and level yet.
          </div>
        ) : (
          <div
            className={styles.orbitStage}
            onMouseLeave={() => setHoveredGroupId(null)}
          >
            <div className={styles.radarGrid} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>

            <div className={styles.outerOrbit} aria-hidden="true" />
            <div className={styles.tickRing} aria-hidden="true" />

            <svg
              className={styles.segmentSvg}
              viewBox="0 0 100 100"
              aria-label={`${subjectMeta.label} mastery groups`}
            >
              {groups.map((group, index) => {
                const geometry = segmentGeometry(index, groups.length);
                const active = group.id === visualActiveGroupId;

                return (
                  <path
                    key={group.id}
                    d={donutSegmentPath(geometry.start, geometry.end)}
                    className={active ? styles.segmentActive : styles.segment}
                    style={
                      {
                        "--segment-accent": group.accent,
                      } as CSSProperties
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`${group.label}. ${group.assessed} of ${group.total} assessed.`}
                    aria-pressed={group.id === selectedGroupId}
                    onMouseEnter={() => {
                      setHoveredGroupId(group.id);
                    }}
                    onFocus={() => {
                      setHoveredGroupId(group.id);
                    }}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setHoveredGroupId(null);
                      setSelectedNode(null);
                      setOrbitPage(0);
                    }}
                    onKeyDown={(event) =>
                      handleSegmentKey(event, () => {
                        setSelectedGroupId(group.id);
                        setHoveredGroupId(null);
                        setSelectedNode(null);
                        setOrbitPage(0);
                      })
                    }
                  />
                );
              })}
            </svg>

            <div
              className={`${styles.segmentLabels} ${
                groups.length > 6 ? styles.segmentLabelsDense : ""
              }`}
            >
              {groups.map((group, index) => {
                const geometry = segmentGeometry(index, groups.length);
                const active = group.id === visualActiveGroupId;

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={
                      active ? styles.segmentLabelActive : styles.segmentLabel
                    }
                    style={{
                      left: `${geometry.labelPoint.x}%`,
                      top: `${geometry.labelPoint.y}%`,
                      borderColor: active ? group.accent : undefined,
                    }}
                    onMouseEnter={() => {
                      setHoveredGroupId(group.id);
                    }}
                    onFocus={() => {
                      setHoveredGroupId(group.id);
                    }}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setHoveredGroupId(null);
                      setSelectedNode(null);
                      setOrbitPage(0);
                    }}
                  >
                    <strong>{group.shortLabel}</strong>
                    <small>
                      {group.assessed}/{group.total}
                    </small>
                  </button>
                );
              })}
            </div>

            <div className={styles.core}>
              <span>{subject === "english" ? "FAMILY" : "TOPIC"}</span>
              <strong>
                {selectedGroup?.shortLabel ?? subjectMeta.label}
              </strong>

              <div className={styles.coreMetric}>
                <b>{selectedGroup?.assessed ?? 0}</b>
                <small>
                  of {selectedGroup?.total ?? 0} assessed
                </small>
              </div>

              <div className={styles.coreCounts}>
                <span>
                  <i className={styles.coreStrong} />
                  {selectedGroup?.secure ?? 0} secure
                </span>
                <span>
                  <i className={styles.corePriority} />
                  {selectedGroup?.priority ?? 0} need practice
                </span>
              </div>
            </div>

            <div className={styles.nodeLayer}>
              {pageNodes.map((node, index) => {
                const { point } = nodePosition(index, pageNodes.length);
                const labelPlacement = nodeLabelPlacement(point);
                const nodeStyle = {
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  "--node-colour": node.colour,
                  "--node-glow": confidenceGlow(node.confidence),
                } as CSSProperties;

                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`${styles.orbitNode} ${
                      selectedNode?.id === node.id ? styles.orbitNodeActive : ""
                    }`}
                    style={nodeStyle}
                    onClick={() => {
                      if (selectedGroup) {
                        setSelectedGroupId(selectedGroup.id);
                        setHoveredGroupId(null);
                      }
                      setSelectedNode(node);
                    }}
                    aria-label={`${node.label}. ${node.statusLabel}`}
                    title={`${node.label} — ${node.statusLabel}`}
                  >
                    <span className={styles.nodeDot} />
                    <span
                      className={
                        labelPlacement === "right"
                          ? styles.nodeLabelRight
                          : labelPlacement === "left"
                            ? styles.nodeLabelLeft
                            : labelPlacement === "top"
                              ? styles.nodeLabelTop
                              : styles.nodeLabelBottom
                      }
                    >
                      {node.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {pageCount > 1 && (
              <div className={styles.orbitPager}>
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => {
                    setOrbitPage((current) => Math.max(0, current - 1));
                    setSelectedNode(null);
                  }}
                >
                  ←
                </button>
                <span>
                  Orbit {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => {
                    setOrbitPage((current) =>
                      Math.min(pageCount - 1, current + 1),
                    );
                    setSelectedNode(null);
                  }}
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        <footer className={styles.statusLegend}>
          <strong className={styles.legendTitle}>MAP KEY</strong>
          {(
            [
              "secure",
              "building",
              "needs_practice",
              "needs_evidence",
            ] as PurposeState[]
          ).map((state) => (
            <span key={state}>
              <i style={{ background: PURPOSE_STATE_META[state].colour }} />
              {PURPOSE_STATE_META[state].label}
            </span>
          ))}
        </footer>
      </section>

      {!selectedNode && (
        <section className={styles.selectionPrompt}>
          <span>SELECT A SKILL</span>
          <strong>Choose any skill dot around the orbit.</strong>
          <p>
            Nova will explain what the status means, what evidence it has seen,
            and what the learner should do next.
          </p>
        </section>
      )}

      {selectedNode?.english &&
        (() => {
          const item = selectedNode.english;
          const purposeState = englishPurposeState(item);
          const purposeMeta = PURPOSE_STATE_META[purposeState];

          return (
            <section className={styles.detailPanel}>
              <div className={styles.detailIdentity}>
                <span
                  className={styles.detailStatus}
                  style={{ color: purposeMeta.colour }}
                >
                  <i style={{ background: purposeMeta.colour }} />
                  {purposeMeta.label}
                </span>

                <h3>{item.mastery_name}</h3>
                <p>
                  Primary {item.primary_level} English · {item.mastery_family}
                </p>
              </div>

              <div className={styles.coachingGrid}>
                <article className={styles.coachingCard}>
                  <span>WHAT THIS MEANS</span>
                  <strong>{purposeMeta.label}</strong>
                  <p>{purposeMeta.meaning}</p>
                </article>

                <article className={`${styles.coachingCard} ${styles.nextStepCard}`}>
                  <span>WHAT TO DO NEXT</span>
                  <strong>Nova&apos;s suggested next move</strong>
                  <p>{englishNextStep(item, purposeState)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      rememberMasteryFocus(selectedNode);
                      onOpenRecommendations();
                    }}
                  >
                    Open Nova Recommends →
                  </button>
                </article>
              </div>

              <section className={styles.evidenceSummary}>
                <span>
                  <b>{item.unique_questions}</b>
                  <small>
                    different question{item.unique_questions === 1 ? "" : "s"}
                  </small>
                </span>
                <span>
                  <b>{item.bands_encountered.length}</b>
                  <small>
                    difficulty level
                    {item.bands_encountered.length === 1 ? "" : "s"}
                  </small>
                </span>
                <span>
                  <b>{item.contexts_seen.length}</b>
                  <small>
                    learning context
                    {item.contexts_seen.length === 1 ? "" : "s"}
                  </small>
                </span>
                <span>
                  <b>{formatDate(item.last_evidence_at)}</b>
                  <small>last practised</small>
                </span>
              </section>

              <details className={styles.technicalDetails}>
                <summary>How Nova reached this judgement</summary>
                <div className={styles.technicalGrid}>
                  <span>
                    <small>Mastery stage</small>
                    <strong>{item.stage}</strong>
                  </span>
                  <span>
                    <small>Evidence Confidence</small>
                    <strong>{item.evidence_confidence}</strong>
                  </span>
                  <span>
                    <small>Difficulty bands</small>
                    <strong>
                      {item.bands_encountered.length
                        ? item.bands_encountered.join(", ")
                        : "None yet"}
                    </strong>
                  </span>
                  <span>
                    <small>Contexts seen</small>
                    <strong>
                      {item.contexts_seen.length
                        ? item.contexts_seen.join(", ")
                        : "None yet"}
                    </strong>
                  </span>
                </div>
              </details>

              <button
                type="button"
                className={styles.closeDetail}
                onClick={() => setSelectedNode(null)}
                aria-label="Close mastery detail"
              >
                ×
              </button>
            </section>
          );
        })()}

      {selectedNode?.math &&
        (() => {
          const concept = selectedNode.math;
          const purposeState = mathPurposeState(concept);
          const purposeMeta = PURPOSE_STATE_META[purposeState];
          const schoolwork = schoolworkEvidence.bySkillId.get(
            String(concept.skill_id),
          );

          return (
            <section className={styles.detailPanel}>
              <div className={styles.detailIdentity}>
                <span
                  className={styles.detailStatus}
                  style={{ color: purposeMeta.colour }}
                >
                  <i style={{ background: purposeMeta.colour }} />
                  {purposeMeta.label}
                </span>

                <h3>{concept.skill_name}</h3>
                <p>
                  Primary {concept.primary_level} Mathematics · {concept.topic}
                </p>
              </div>

              <div className={styles.coachingGrid}>
                <article className={styles.coachingCard}>
                  <span>WHAT THIS MEANS</span>
                  <strong>{purposeMeta.label}</strong>
                  <p>{purposeMeta.meaning}</p>
                </article>

                <article className={`${styles.coachingCard} ${styles.nextStepCard}`}>
                  <span>WHAT TO DO NEXT</span>
                  <strong>Nova&apos;s suggested next move</strong>
                  <p>{mathNextStep(concept, purposeState)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      rememberMasteryFocus(selectedNode);
                      onOpenRecommendations();
                    }}
                  >
                    Open Nova Recommends →
                  </button>
                </article>
              </div>

              <section className={styles.evidenceSummary}>
                <span>
                  <b>{concept.questions_attempted}</b>
                  <small>
                    question{concept.questions_attempted === 1 ? "" : "s"} seen
                  </small>
                </span>
                <span>
                  <b>{concept.unique_activities}</b>
                  <small>
                    learning activit
                    {concept.unique_activities === 1 ? "y" : "ies"}
                  </small>
                </span>
                <span>
                  <b>{concept.active_weeks}</b>
                  <small>
                    active week{concept.active_weeks === 1 ? "" : "s"}
                  </small>
                </span>
                <span>
                  <b>{formatDate(concept.last_attempted_at)}</b>
                  <small>last practised</small>
                </span>
              </section>

              <details className={styles.technicalDetails}>
                <summary>How Nova reached this judgement</summary>
                <div className={styles.technicalGrid}>
                  <span>
                    <small>Current model status</small>
                    <strong>{LEGACY_STATE_META[mathConceptState(concept)].label}</strong>
                  </span>
                  <span>
                    <small>Mastery</small>
                    <strong>
                      {concept.has_evidence && concept.mastery_score !== null
                        ? `${Math.round(concept.mastery_score)}%`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    <small>Confidence</small>
                    <strong>
                      {concept.has_evidence && concept.confidence_score !== null
                        ? `${Math.round(concept.confidence_score)}%`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    <small>Trend</small>
                    <strong>
                      {concept.trend === "no_data" ? "—" : concept.trend}
                    </strong>
                  </span>
                  {schoolwork && (
                    <span className={styles.technicalWide}>
                      <small>Uploaded schoolwork</small>
                      <strong>
                        {schoolwork.event_count} approved question
                        {schoolwork.event_count === 1 ? "" : "s"} from{" "}
                        {schoolwork.upload_count} upload
                        {schoolwork.upload_count === 1 ? "" : "s"}
                      </strong>
                    </span>
                  )}
                </div>
              </details>

              <button
                type="button"
                className={styles.closeDetail}
                onClick={() => setSelectedNode(null)}
                aria-label="Close concept detail"
              >
                ×
              </button>
            </section>
          );
        })()}

    </div>
  );
}
