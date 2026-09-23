"use client";

import { useMemo, useState } from "react";
import type { NovaPlusProfilePayload, NovaSubjectKey } from "@/lib/nova-plus/types";
import { SUBJECT_META } from "@/lib/nova-plus/helpers";
import { milestoneForEvidence, type Milestone } from "./milestones";
import styles from "./MilestoneJourney.module.css";

type JourneySubject = "english" | "math" | "science";

type SnapshotLike = {
  snapshot_date?: string | null;
  generated_at?: string | null;
  subject_summaries?: unknown;
};

type JourneyPoint = {
  id: string;
  date: Date;
  dateLabel: string;
  milestone: Milestone;
  score: number;
};

const SUBJECTS: JourneySubject[] = ["english", "math", "science"];

const SUBJECT_STYLE: Record<JourneySubject, { colour: string; glow: string }> = {
  english: { colour: "#53d7ff", glow: "rgba(83,215,255,.32)" },
  math: { colour: "#c58cff", glow: "rgba(197,140,255,.32)" },
  science: { colour: "#ffd76a", glow: "rgba(255,215,106,.30)" },
};

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-SG", { month: "short" }).format(date);
}

function snapshotPoint(snapshot: SnapshotLike, subject: JourneySubject): JourneyPoint | null {
  const date = safeDate(snapshot.snapshot_date ?? snapshot.generated_at);
  if (!date || !Array.isArray(snapshot.subject_summaries)) return null;

  const row = snapshot.subject_summaries.find((item) => {
    if (!item || typeof item !== "object") return false;
    return String((item as Record<string, unknown>).subject ?? "").toLowerCase() === subject;
  });

  if (!row || typeof row !== "object") return null;

  const data = row as Record<string, unknown>;
  const score = asNumber(data.mastery_score);
  const questions = asNumber(data.questions_attempted);
  const milestone = milestoneForEvidence(score, questions);

  if (score === null || !milestone) return null;

  return {
    id: `${subject}-${date.toISOString()}-${milestone.level}`,
    date,
    dateLabel: formatDate(date),
    milestone,
    score,
  };
}

function buildSeries(profile: NovaPlusProfilePayload, subject: JourneySubject) {
  const historical = ((profile.timeline ?? []) as SnapshotLike[])
    .map((snapshot) => snapshotPoint(snapshot, subject))
    .filter((point): point is JourneyPoint => Boolean(point))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const current = profile.subject_summaries.find(
    (summary) => String(summary.subject).toLowerCase() === subject,
  );

  const currentMilestone = milestoneForEvidence(
    current?.mastery_score,
    current?.questions_attempted,
  );

  if (current && currentMilestone) {
    const latest = historical[historical.length - 1];
    const sameState = latest && latest.milestone.level === currentMilestone.level;

    if (!sameState) {
      const date = new Date();
      historical.push({
        id: `${subject}-current-${currentMilestone.level}`,
        date,
        dateLabel: "Now",
        milestone: currentMilestone,
        score: Number(current.mastery_score ?? 0),
      });
    }
  }

  return historical;
}

function movementCopy(points: JourneyPoint[]) {
  if (points.length < 2) return "Nova is still building a reliable milestone history.";

  const first = points[0].milestone.level;
  const last = points[points.length - 1].milestone.level;

  if (last > first) return "Growing stronger across recent evidence.";
  if (last < first) return "Recent evidence shows some areas that may need reinforcement.";
  return "Holding steady while Nova gathers more learning evidence.";
}

function pathFor(points: JourneyPoint[], minTime: number, maxTime: number) {
  if (!points.length) return "";

  const left = 70;
  const right = 930;
  const top = 34;
  const bottom = 286;
  const span = Math.max(1, maxTime - minTime);

  return points
    .map((point, index) => {
      const x = left + ((point.date.getTime() - minTime) / span) * (right - left);
      const y = bottom - ((point.milestone.level - 1) / 5) * (bottom - top);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function pointPosition(point: JourneyPoint, minTime: number, maxTime: number) {
  const left = 70;
  const right = 930;
  const top = 34;
  const bottom = 286;
  const span = Math.max(1, maxTime - minTime);

  return {
    x: left + ((point.date.getTime() - minTime) / span) * (right - left),
    y: bottom - ((point.milestone.level - 1) / 5) * (bottom - top),
  };
}

export default function MilestoneJourney({ profile }: { profile: NovaPlusProfilePayload }) {
  const [activeSubject, setActiveSubject] = useState<JourneySubject>("math");
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const series = useMemo(
    () => Object.fromEntries(SUBJECTS.map((subject) => [subject, buildSeries(profile, subject)])) as Record<JourneySubject, JourneyPoint[]>,
    [profile],
  );

  const activePoints = series[activeSubject];
  const selectedPoint =
    activePoints.find((point) => point.id === selectedPointId) ??
    activePoints[activePoints.length - 1] ??
    null;

  const allPoints = SUBJECTS.flatMap((subject) => series[subject]);
  const minTime = allPoints.length ? Math.min(...allPoints.map((point) => point.date.getTime())) : Date.now();
  const maxTime = allPoints.length ? Math.max(...allPoints.map((point) => point.date.getTime())) : minTime + 1;

  const first = activePoints[0] ?? null;
  const latest = activePoints[activePoints.length - 1] ?? null;
  const delta = first && latest ? latest.milestone.level - first.milestone.level : 0;
  const activeLabel = SUBJECT_META[activeSubject as NovaSubjectKey]?.label ?? activeSubject;

  const monthTicks = useMemo(() => {
    const byMonth = new Map<string, Date>();
    allPoints.forEach((point) => {
      const key = `${point.date.getFullYear()}-${point.date.getMonth()}`;
      if (!byMonth.has(key)) byMonth.set(key, point.date);
    });
    return [...byMonth.values()].slice(-5);
  }, [allPoints]);

  return (
    <section className={styles.section}>
      <div className={styles.headingRow}>
        <div>
          <span className={styles.eyebrow}>YOUR MILESTONE JOURNEY</span>
          <h3>See how your learning picture is changing</h3>
        </div>
        <button
          type="button"
          className={styles.infoButton}
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((open) => !open)}
        >
          i
        </button>
      </div>

      {infoOpen && (
        <div className={styles.infoNote}>
          The journey shows how Nova&apos;s evidence-based milestone has changed over time. It does not represent exam marks or class ranking.
        </div>
      )}

      <div className={styles.subjectTabs} role="tablist" aria-label="Milestone journey subject">
        {SUBJECTS.map((subject) => (
          <button
            key={subject}
            type="button"
            role="tab"
            aria-selected={activeSubject === subject}
            className={activeSubject === subject ? styles.activeTab : ""}
            onClick={() => {
              setActiveSubject(subject);
              setSelectedPointId(null);
            }}
          >
            {SUBJECT_META[subject as NovaSubjectKey]?.label ?? subject}
          </button>
        ))}
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span>{activeLabel.toUpperCase()}</span>
          <strong>
            {first && latest
              ? `Milestone ${first.milestone.level} → Milestone ${latest.milestone.level}`
              : "Building Picture"}
          </strong>
          <small>{movementCopy(activePoints)}</small>
        </div>
        {first && latest && (
          <b className={delta < 0 ? styles.neutralDelta : ""}>
            {delta > 0 ? `+${delta} milestone${delta === 1 ? "" : "s"}` : delta < 0 ? `${delta} milestone${delta === -1 ? "" : "s"}` : "Steady"}
          </b>
        )}
      </div>

      <div className={styles.chartShell}>
        {allPoints.length === 0 ? (
          <div className={styles.emptyState}>More recorded learning evidence is needed before the milestone journey can appear.</div>
        ) : (
          <svg className={styles.chart} viewBox="0 0 1000 350" role="img" aria-label="Milestone journey chart">
            {[1, 2, 3, 4, 5, 6].map((level) => {
              const y = 286 - ((level - 1) / 5) * 252;
              const label = ["Starting", "Building", "Progressing", "Developing", "Consolidating", "Strong"][level - 1];
              return (
                <g key={level}>
                  <line x1="70" y1={y} x2="930" y2={y} className={styles.gridLine} />
                  <text x="12" y={y + 4} className={styles.axisLevel}>{level}</text>
                  <text x="30" y={y + 4} className={styles.axisLabel}>{label}</text>
                </g>
              );
            })}

            {SUBJECTS.map((subject) => {
              const points = series[subject];
              const active = subject === activeSubject;
              if (!points.length) return null;
              const style = SUBJECT_STYLE[subject];

              return (
                <g key={subject} className={active ? styles.seriesActive : styles.seriesMuted}>
                  <path
                    d={pathFor(points, minTime, maxTime)}
                    fill="none"
                    stroke={style.colour}
                    strokeWidth={active ? 6 : 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: active ? `drop-shadow(0 0 8px ${style.glow})` : "none" }}
                  />
                  {points.map((point) => {
                    const position = pointPosition(point, minTime, maxTime);
                    const selected = subject === activeSubject && selectedPoint?.id === point.id;
                    return (
                      <circle
                        key={point.id}
                        cx={position.x}
                        cy={position.y}
                        r={selected ? 9 : active ? 7 : 4}
                        fill={style.colour}
                        stroke={selected ? "white" : "rgba(255,255,255,.7)"}
                        strokeWidth={selected ? 3 : 1.5}
                        tabIndex={active ? 0 : -1}
                        className={active ? styles.point : undefined}
                        onMouseEnter={() => active && setSelectedPointId(point.id)}
                        onClick={() => active && setSelectedPointId(point.id)}
                        onKeyDown={(event) => {
                          if (active && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            setSelectedPointId(point.id);
                          }
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}

            {monthTicks.map((date) => {
              const x = 70 + ((date.getTime() - minTime) / Math.max(1, maxTime - minTime)) * 860;
              return <text key={date.toISOString()} x={x} y="330" textAnchor="middle" className={styles.monthLabel}>{monthLabel(date)}</text>;
            })}
          </svg>
        )}
      </div>

      {selectedPoint && (
        <div className={styles.pointDetail}>
          <span>{selectedPoint.dateLabel}</span>
          <strong>Milestone {selectedPoint.milestone.level} · {selectedPoint.milestone.label}</strong>
          {(() => {
            const index = activePoints.findIndex((point) => point.id === selectedPoint.id);
            const previous = index > 0 ? activePoints[index - 1] : null;
            return previous ? <small>Previous: Milestone {previous.milestone.level} · {previous.milestone.label}</small> : <small>First recorded milestone in this journey</small>;
          })()}
        </div>
      )}
    </section>
  );
}
