"use client";

import { useMemo, useState } from "react";
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
import styles from "./MasteryMapTab.module.css";

type Props = {
  profile: NovaPlusProfilePayload;
  onOpenRecommendations: () => void;
};

type AcademicSubject = "english" | "math" | "science";
type MapState = "strong" | "developing" | "attention" | "unknown";

type TopicGroup = {
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

const SUBJECT_ORDER: AcademicSubject[] = ["english", "math", "science"];

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
    border: "rgba(255,108,114,.3)",
  },
  unknown: {
    label: "Not Yet Assessed",
    colour: "#8999ad",
    soft: "rgba(137,153,173,.07)",
    border: "rgba(137,153,173,.19)",
  },
};

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

function formatDate(value: string | null) {
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

function parentFriendlyExplanation(concept: CurriculumConcept) {
  const supplied = String(concept.public_explanation || "").trim();
  if (supplied) return supplied;

  const name = String(concept.skill_name || "this concept").trim();
  const verbLed = /^(identify|recognise|recognize|use|retrieve|answer|compare|order|represent|solve|add|subtract|multiply|divide|read|write|interpret|explain|apply|find|measure|estimate|classify|describe|infer|sequence|distinguish|calculate|convert|complete|choose|determine|construct|name|match|count|arrange)\b/i.test(name);

  if (verbLed) {
    return `This checks whether the learner can ${name.charAt(0).toLowerCase()}${name.slice(1)} accurately and independently.`;
  }

  return `This checks the learner's understanding and application of ${name.toLowerCase()}.`;
}

function teacherPrompt(concept: CurriculumConcept) {
  const name = String(concept.skill_name || "this concept").trim();
  return `You can ask the teacher: “How is the learner doing with ${name} in class? Can they apply it independently and consistently?”`;
}

function inferCurrentLevel(
  concepts: CurriculumConcept[],
  profile: NovaPlusProfilePayload,
) {
  const evidence = new Map<number, number>();

  for (const skill of profile.skills) {
    const level = safeNumber(skill.primary_level);
    if (level <= 0 || !["english", "math", "science"].includes(skill.subject)) {
      continue;
    }

    evidence.set(
      level,
      (evidence.get(level) || 0) + Math.max(1, safeNumber(skill.questions_attempted)),
    );
  }

  const ranked = [...evidence.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (ranked[0]) return ranked[0][0];

  const availableLevels = [...new Set(concepts.map((concept) => safeNumber(concept.primary_level)))]
    .filter((level) => level > 0)
    .sort((a, b) => a - b);

  return availableLevels[0] || 1;
}

function groupTopics(concepts: CurriculumConcept[]): TopicGroup[] {
  const groups = new Map<string, CurriculumConcept[]>();

  for (const concept of concepts) {
    const domain = String(concept.domain || "Curriculum").trim() || "Curriculum";
    const topic = String(concept.topic || concept.skill_name || "Other").trim() || "Other";
    const key = `${domain.toLowerCase()}::${topic.toLowerCase()}`;
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
        concepts: [...rows].sort((a, b) => {
          const rank: Record<MapState, number> = {
            attention: 0,
            developing: 1,
            strong: 2,
            unknown: 3,
          };
          return (
            rank[conceptState(a)] - rank[conceptState(b)] ||
            a.skill_name.localeCompare(b.skill_name)
          );
        }),
        state: topicState(rows),
        strong: states.filter((state) => state === "strong").length,
        developing: states.filter((state) => state === "developing").length,
        attention: states.filter((state) => state === "attention").length,
        unknown: states.filter((state) => state === "unknown").length,
        assessed: states.filter((state) => state !== "unknown").length,
      } satisfies TopicGroup;
    })
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.topic.localeCompare(b.topic));
}

export default function MasteryMapTab({
  profile,
  onOpenRecommendations,
}: Props) {
  const curriculumConcepts = useMemo(
    () => (profile.curriculum_concepts ?? []).filter(isNovaPlusAssessedConcept),
    [profile.curriculum_concepts],
  );

  const availableLevels = useMemo(
    () =>
      [...new Set(curriculumConcepts.map((concept) => safeNumber(concept.primary_level)))]
        .filter((level) => level > 0)
        .sort((a, b) => a - b),
    [curriculumConcepts],
  );

  const inferredLevel = useMemo(
    () => inferCurrentLevel(curriculumConcepts, profile),
    [curriculumConcepts, profile],
  );

  const [selectedLevel, setSelectedLevel] = useState(inferredLevel);
  const [subject, setSubject] = useState<AcademicSubject>("english");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedConcept, setSelectedConcept] = useState<CurriculumConcept | null>(null);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

  const levelConcepts = useMemo(
    () =>
      curriculumConcepts.filter(
        (concept) =>
          safeNumber(concept.primary_level) === selectedLevel &&
          SUBJECT_ORDER.includes(concept.subject as AcademicSubject),
      ),
    [curriculumConcepts, selectedLevel],
  );

  const subjectSummaries = useMemo(() => {
    return SUBJECT_ORDER.map((key) => {
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
      };
    });
  }, [levelConcepts]);

  const visibleConcepts = useMemo(
    () => levelConcepts.filter((concept) => concept.subject === subject),
    [levelConcepts, subject],
  );

  const topics = useMemo(() => groupTopics(visibleConcepts), [visibleConcepts]);

  const currentSummary = subjectSummaries.find((row) => row.subject === subject);
  const subjectMeta = SUBJECT_META[subject as NovaSubjectKey];

  function toggleTopic(key: string) {
    setExpandedTopics((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (curriculumConcepts.length === 0) {
    return (
      <section className={styles.emptyPage}>
        <span className={styles.eyebrow}>MASTERY MAP</span>
        <h2>Curriculum map data is not available yet.</h2>
        <p>
          Run the NOVA+ Mastery Map payload SQL, then refresh the learner profile.
        </p>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.introCard}>
        <div>
          <span className={styles.eyebrow}>MASTERY MAP</span>
          <h2>See the curriculum. See what is secure. See what comes next.</h2>
          <p>
            Concepts are organised by subject and topic. Grey concepts have not been assessed yet.
          </p>
        </div>

        <div className={styles.introControls}>
          <label className={styles.levelPicker}>
            <span>Primary level</span>
            <select
              value={selectedLevel}
              onChange={(event) => {
                setSelectedLevel(Number(event.target.value));
                setExpandedTopics(new Set());
                setSelectedConcept(null);
                setOpenInfoId(null);
              }}
            >
              {availableLevels.map((level) => (
                <option key={level} value={level}>Primary {level}</option>
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
          return (
            <button
              key={summary.subject}
              type="button"
              className={active ? styles.subjectActive : styles.subjectButton}
              onClick={() => {
                setSubject(summary.subject);
                setSelectedConcept(null);
                setOpenInfoId(null);
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
            <span className={styles.eyebrow}>PRIMARY {selectedLevel} · {subjectMeta.label.toUpperCase()}</span>
            <h3>{subjectMeta.label} curriculum pathway</h3>
            <p>Open a topic to see the individual concepts inside it.</p>
          </div>

          <div className={styles.mapTotals}>
            <span><b>{currentSummary?.strong ?? 0}</b> Strong</span>
            <span><b>{currentSummary?.developing ?? 0}</b> Developing</span>
            <span><b>{currentSummary?.attention ?? 0}</b> Needs attention</span>
            <span><b>{currentSummary?.unknown ?? 0}</b> Not assessed</span>
          </div>
        </header>

        {topics.length === 0 ? (
          <div className={styles.noTopics}>No curriculum concepts are available for this subject and level yet.</div>
        ) : (
          <div className={styles.pathway}>
            {topics.map((topic, index) => {
              const meta = STATE_META[topic.state];
              const expanded = expandedTopics.has(topic.key);
              const total = Math.max(topic.concepts.length, 1);

              return (
                <article key={topic.key} className={styles.topicStep}>
                  <div className={styles.pathNode} style={{ borderColor: meta.border }}>
                    <span style={{ background: meta.colour }} />
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </div>

                  <div
                    className={styles.topicCard}
                    style={{ borderColor: meta.border, background: meta.soft }}
                  >
                    <button
                      type="button"
                      className={styles.topicSummary}
                      onClick={() => toggleTopic(topic.key)}
                      aria-expanded={expanded}
                    >
                      <div className={styles.topicTitle}>
                        <span>{topic.domain}</span>
                        <h4>{topic.topic}</h4>
                        <small>{topic.assessed} of {topic.concepts.length} concepts assessed</small>
                      </div>

                      <div className={styles.topicStatus}>
                        <strong style={{ color: meta.colour }}>{meta.label}</strong>
                        <span>{expanded ? "−" : "+"}</span>
                      </div>
                    </button>

                    <div className={styles.topicBar} aria-hidden="true">
                      {topic.strong > 0 && (
                        <i className={styles.barGreen} style={{ width: `${(topic.strong / total) * 100}%` }} />
                      )}
                      {topic.developing > 0 && (
                        <i className={styles.barOrange} style={{ width: `${(topic.developing / total) * 100}%` }} />
                      )}
                      {topic.attention > 0 && (
                        <i className={styles.barRed} style={{ width: `${(topic.attention / total) * 100}%` }} />
                      )}
                      {topic.unknown > 0 && (
                        <i className={styles.barGrey} style={{ width: `${(topic.unknown / total) * 100}%` }} />
                      )}
                    </div>

                    {expanded && (
                      <div className={styles.conceptGrid}>
                        {topic.concepts.map((concept) => {
                          const state = conceptState(concept);
                          const stateMeta = STATE_META[state];
                          return (
                            <div
                              key={concept.skill_id}
                              className={styles.conceptNode}
                              style={{
                                borderColor: stateMeta.border,
                                background: stateMeta.soft,
                              }}
                              onMouseLeave={() => {
                                if (openInfoId === concept.skill_id) setOpenInfoId(null);
                              }}
                            >
                              <button
                                type="button"
                                className={styles.conceptMain}
                                onClick={() => setSelectedConcept(concept)}
                              >
                                <span className={styles.conceptDot} style={{ background: stateMeta.colour }} />
                                <strong>{concept.skill_name}</strong>
                                <small style={{ color: stateMeta.colour }}>{stateMeta.label}</small>
                              </button>

                              <button
                                type="button"
                                className={styles.conceptInfoButton}
                                aria-label={`Explain ${concept.skill_name}`}
                                aria-expanded={openInfoId === concept.skill_id}
                                onMouseEnter={() => setOpenInfoId(concept.skill_id)}
                                onFocus={() => setOpenInfoId(concept.skill_id)}
                                onBlur={() => setOpenInfoId(null)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenInfoId((current) =>
                                    current === concept.skill_id ? null : concept.skill_id,
                                  );
                                }}
                              >
                                i
                              </button>

                              {openInfoId === concept.skill_id && (
                                <div className={styles.conceptInfoPopover} role="tooltip">
                                  <span>WHAT THIS MEANS</span>
                                  <p>{parentFriendlyExplanation(concept)}</p>
                                  <small>{teacherPrompt(concept)}</small>
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
      </section>

      {selectedConcept && (() => {
        const state = conceptState(selectedConcept);
        const meta = STATE_META[state];
        return (
          <section className={styles.detailPanel} style={{ borderColor: meta.border }}>
            <div className={styles.detailMain}>
              <span className={styles.detailStatus} style={{ color: meta.colour }}>
                <i style={{ background: meta.colour }} /> {meta.label}
              </span>
              <h3>{selectedConcept.skill_name}</h3>
              <p>
                {subjectMeta.label} · Primary {selectedConcept.primary_level} · {selectedConcept.topic}
              </p>
            </div>

            <div className={styles.detailMetrics}>
              <span>
                <small>Mastery</small>
                <strong>{selectedConcept.has_evidence && selectedConcept.mastery_score !== null ? `${Math.round(selectedConcept.mastery_score)}%` : "—"}</strong>
              </span>
              <span>
                <small>Confidence</small>
                <strong>{selectedConcept.has_evidence && selectedConcept.confidence_score !== null ? `${Math.round(selectedConcept.confidence_score)}%` : "—"}</strong>
              </span>
              <span>
                <small>Questions</small>
                <strong>{selectedConcept.questions_attempted}</strong>
              </span>
              <span>
                <small>Trend</small>
                <strong>{selectedConcept.trend === "no_data" ? "—" : selectedConcept.trend}</strong>
              </span>
            </div>

            <div className={styles.detailFooter}>
              <span>Last practised: {formatDate(selectedConcept.last_attempted_at)}</span>
              {state !== "unknown" && (
                <button type="button" onClick={onOpenRecommendations}>
                  See Nova&apos;s recommendation →
                </button>
              )}
              <button
                type="button"
                className={styles.closeDetail}
                onClick={() => setSelectedConcept(null)}
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
