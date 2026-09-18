"use client";

import { useMemo, useState } from "react";
import type {
  NovaPlusProfilePayload,
  ProfileInsight,
  ProfileSkill,
  ProfileSnapshot,
} from "@/lib/nova-plus/types";
import styles from "./ProgressTab.module.css";

type ProgressTabProps = {
  profile: NovaPlusProfilePayload;
  learnerLabel: string;
  onOpenRecommendations: () => void;
};

type TimeframeKey = "7" | "30" | "90" | "all";
type SubjectKey = "academic" | "english" | "math";

type ChartPoint = {
  date: string;
  label: string;
  academic: number | null;
  english: number | null;
  math: number | null;
};

type SubjectSnapshotSummary = {
  subject: string;
  mastery_score: number | null;
  questions_attempted: number | null;
  secure_skills: number | null;
  priority_skills: number | null;
};

type Milestone = {
  id: string;
  date: string;
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "attention";
};

const TIMEFRAMES: Array<{ key: TimeframeKey; label: string; days: number | null }> = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "3 months", days: 90 },
  { key: "all", label: "All time", days: null },
];

const SUBJECTS: Array<{ key: SubjectKey; label: string }> = [
  { key: "academic", label: "Academic" },
  { key: "english", label: "English" },
  { key: "math", label: "Mathematics" },
];

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWindow(days: number | null): Date | null {
  if (days === null) return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date;
}

function inWindow(value: string | null | undefined, days: number | null) {
  if (days === null) return true;
  const date = safeDate(value);
  const start = startOfWindow(days);
  if (!date || !start) return false;
  return date >= start;
}

function formatDate(value: string | null | undefined, short = false) {
  const date = safeDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: short ? "short" : "short",
    ...(short ? {} : { year: "numeric" }),
  }).format(date);
}

function subjectLabel(subject: string) {
  if (subject.toLowerCase() === "math") return "Mathematics";
  if (subject.toLowerCase() === "english") return "English";
  return subject;
}

function isAcademicSkill(skill: ProfileSkill) {
  const subject = skill.subject.toLowerCase();
  if (!["english", "math"].includes(subject)) return false;
  if (skill.is_topic_level) return false;

  if (subject === "english") {
    const scope = `${skill.domain} ${skill.topic} ${skill.skill_name}`.toLowerCase();
    if (scope.includes("listening") || scope.includes("viewing")) return false;
  }

  return skill.source === "nova_curriculum_rollout_sql";
}

function parseSubjectSummaries(snapshot: ProfileSnapshot): SubjectSnapshotSummary[] {
  const raw = snapshot.subject_summaries;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const subject = String(row.subject ?? "").toLowerCase();
      if (!subject) return null;

      return {
        subject,
        mastery_score: asNumber(row.mastery_score),
        questions_attempted: asNumber(row.questions_attempted),
        secure_skills: asNumber(row.secure_skills),
        priority_skills: asNumber(row.priority_skills),
      } satisfies SubjectSnapshotSummary;
    })
    .filter((item): item is SubjectSnapshotSummary => Boolean(item));
}

function snapshotSubjectMastery(snapshot: ProfileSnapshot, subject: "english" | "math") {
  return (
    parseSubjectSummaries(snapshot).find((item) => item.subject === subject)
      ?.mastery_score ?? null
  );
}

function snapshotAcademicMastery(snapshot: ProfileSnapshot) {
  const direct = asNumber(snapshot.overall_mastery);
  if (direct !== null) return direct;

  const summaries = parseSubjectSummaries(snapshot).filter((item) =>
    ["english", "math"].includes(item.subject),
  );

  const scored = summaries.filter((item) => item.mastery_score !== null);
  if (!scored.length) return null;

  return (
    scored.reduce((sum, item) => sum + (item.mastery_score ?? 0), 0) /
    scored.length
  );
}

function statusLabel(skill: ProfileSkill) {
  if (skill.status === "mastered" || skill.status === "secure") return "Strong";
  if (skill.status === "needs_support" || skill.status === "emerging") {
    return "Needs Attention";
  }
  if (skill.status === "review_due") return "Ready to Reassess";
  return "Developing";
}

function statusTone(skill: ProfileSkill) {
  if (skill.status === "mastered" || skill.status === "secure") return "strong";
  if (skill.status === "needs_support" || skill.status === "emerging") {
    return "attention";
  }
  if (skill.status === "review_due") return "reassess";
  return "developing";
}

function skillMovementLabel(skill: ProfileSkill) {
  const current = statusLabel(skill);

  if (skill.trend === "improving") {
    if (current === "Strong") return "Strengthened to Strong";
    if (current === "Developing") return "Moving Forward";
    if (current === "Ready to Reassess") return "Ready to Check Again";
    return "Early Improvement";
  }

  if (skill.trend === "declining") return "Needs Continued Attention";
  if (skill.status === "review_due") return "Ready to Reassess";
  return current;
}

function currentSubjectMastery(
  profile: NovaPlusProfilePayload,
  subject: "english" | "math",
) {
  return (
    profile.subject_summaries.find(
      (item) => item.subject.toLowerCase() === subject,
    )?.mastery_score ?? null
  );
}

function currentAcademicMastery(profile: NovaPlusProfilePayload) {
  const values = (["english", "math"] as const)
    .map((subject) => currentSubjectMastery(profile, subject))
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (!values.length) return asNumber(profile.latest_snapshot?.overall_mastery);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percent(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? "—"
    : `${Math.round(Number(value))}%`;
}

function signedPoints(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "No baseline";
  }

  const rounded = Math.round(Number(value));
  if (rounded === 0) return "No change";
  return `${rounded > 0 ? "+" : ""}${rounded} pts`;
}

function buildChartPoints(
  profile: NovaPlusProfilePayload,
  days: number | null,
): ChartPoint[] {
  const source = [...(profile.timeline ?? [])]
    .filter((snapshot) => snapshot.snapshot_date || snapshot.generated_at)
    .sort((a, b) => {
      const left = safeDate(a.snapshot_date ?? a.generated_at)?.getTime() ?? 0;
      const right = safeDate(b.snapshot_date ?? b.generated_at)?.getTime() ?? 0;
      return left - right;
    });

  const start = startOfWindow(days);

  const filtered = source.filter((snapshot) => {
    const date = safeDate(snapshot.snapshot_date ?? snapshot.generated_at);
    if (!date) return false;
    return !start || date >= start;
  });

  const points: ChartPoint[] = filtered.map((snapshot) => {
    const dateValue = snapshot.snapshot_date ?? snapshot.generated_at ?? "";
    return {
      date: dateValue,
      label: formatDate(dateValue, true),
      academic: snapshotAcademicMastery(snapshot),
      english: snapshotSubjectMastery(snapshot, "english"),
      math: snapshotSubjectMastery(snapshot, "math"),
    };
  });

  const nowPoint: ChartPoint = {
    date: profile.generated_at,
    label: "Now",
    academic: currentAcademicMastery(profile),
    english: currentSubjectMastery(profile, "english"),
    math: currentSubjectMastery(profile, "math"),
  };

  const last = points[points.length - 1];
  const lastDate = safeDate(last?.date)?.getTime() ?? 0;
  const nowDate = safeDate(nowPoint.date)?.getTime() ?? Date.now();

  if (!points.length || Math.abs(nowDate - lastDate) > 12 * 60 * 60 * 1000) {
    points.push(nowPoint);
  } else if (points.length) {
    points[points.length - 1] = nowPoint;
  }

  return points.slice(-18);
}

function baselineSnapshot(profile: NovaPlusProfilePayload, days: number | null) {
  if (days === null) return null;

  const start = startOfWindow(days);
  if (!start) return null;

  const snapshots = [...(profile.timeline ?? [])]
    .filter((snapshot) => snapshot.snapshot_date || snapshot.generated_at)
    .sort((a, b) => {
      const left = safeDate(a.snapshot_date ?? a.generated_at)?.getTime() ?? 0;
      const right = safeDate(b.snapshot_date ?? b.generated_at)?.getTime() ?? 0;
      return left - right;
    });

  const before = snapshots.filter((snapshot) => {
    const date = safeDate(snapshot.snapshot_date ?? snapshot.generated_at);
    return date ? date <= start : false;
  });

  if (before.length) return before[before.length - 1];

  return snapshots[0] ?? null;
}

function skillSortValue(skill: ProfileSkill) {
  return Math.abs(Number(skill.trend_points ?? 0));
}

function ProgressChart({
  points,
  subject,
}: {
  points: ChartPoint[];
  subject: SubjectKey;
}) {
  const width = 860;
  const height = 235;
  const padX = 30;
  const padTop = 18;
  const padBottom = 32;
  const innerHeight = height - padTop - padBottom;

  const rawValues = points.map((point) => point[subject]);
  const validValues = rawValues.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (validValues.length < 2) {
    return (
      <div className={styles.chartEmpty}>
        <div className={styles.chartEmptyMark}>↗</div>
        <strong>Progress is starting to build.</strong>
        <p>
          More profile snapshots are needed before Nova can draw a meaningful
          mastery trend for this view.
        </p>
      </div>
    );
  }

  const minimum = Math.max(0, Math.floor(Math.min(...validValues) / 10) * 10 - 10);
  const maximum = Math.min(
    100,
    Math.ceil(Math.max(...validValues) / 10) * 10 + 10,
  );
  const range = Math.max(10, maximum - minimum);

  const coords = points
    .map((point, index) => {
      const value = point[subject];
      if (value === null || !Number.isFinite(value)) return null;

      const x =
        points.length === 1
          ? width / 2
          : padX + (index / (points.length - 1)) * (width - padX * 2);
      const y =
        padTop + (1 - (value - minimum) / range) * innerHeight;

      return { x, y, value, label: point.label, date: point.date };
    })
    .filter(
      (
        point,
      ): point is {
        x: number;
        y: number;
        value: number;
        label: string;
        date: string;
      } => Boolean(point),
    );

  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padX},${height - padBottom} ${line} ${
    coords[coords.length - 1]?.x ?? width - padX
  },${height - padBottom}`;

  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Mastery trend over time"
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = padTop + ratio * innerHeight;
          const value = Math.round(maximum - ratio * range);
          return (
            <g key={ratio}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                className={styles.gridLine}
              />
              <text x={0} y={y + 4} className={styles.axisText}>
                {value}
              </text>
            </g>
          );
        })}

        <polygon points={area} className={styles.chartArea} />
        <polyline points={line} className={styles.chartLine} />

        {coords.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={index === coords.length - 1 ? 5.5 : 4}
              className={
                index === coords.length - 1
                  ? styles.chartDotCurrent
                  : styles.chartDot
              }
            />
            {(index === 0 ||
              index === coords.length - 1 ||
              index % Math.max(1, Math.floor(coords.length / 4)) === 0) && (
              <text
                x={point.x}
                y={height - 8}
                textAnchor="middle"
                className={styles.dateText}
              >
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className={styles.chartCurrent}>
        <small>CURRENT</small>
        <strong>{percent(coords[coords.length - 1]?.value)}</strong>
      </div>
    </div>
  );
}

export default function ProgressTab({
  profile,
  learnerLabel,
  onOpenRecommendations,
}: ProgressTabProps) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("30");
  const [chartSubject, setChartSubject] = useState<SubjectKey>("academic");

  const timeframeMeta =
    TIMEFRAMES.find((item) => item.key === timeframe) ?? TIMEFRAMES[1];
  const days = timeframeMeta.days;

  const academicSkills = useMemo(
    () => profile.skills.filter(isAcademicSkill),
    [profile.skills],
  );

  const recentSkills = useMemo(
    () => academicSkills.filter((skill) => inWindow(skill.last_attempted_at, days)),
    [academicSkills, days],
  );

  const improvedSkills = useMemo(
    () =>
      recentSkills
        .filter(
          (skill) =>
            skill.trend === "improving" &&
            Number(skill.trend_points ?? 0) > 0,
        )
        .sort((a, b) => skillSortValue(b) - skillSortValue(a)),
    [recentSkills],
  );

  const newlySecure = useMemo(
    () =>
      improvedSkills.filter(
        (skill) => skill.status === "secure" || skill.status === "mastered",
      ),
    [improvedSkills],
  );

  const resolvedWeaknesses = useMemo(
    () =>
      (profile.resolved_insights ?? []).filter((insight) => {
        if (!inWindow(insight.resolved_at, days)) return false;
        return ["persistent_weakness", "priority_gap", "weakness"].some((token) =>
          insight.insight_type.toLowerCase().includes(token),
        );
      }),
    [profile.resolved_insights, days],
  );

  const attentionSkills = useMemo(
    () =>
      recentSkills
        .filter(
          (skill) =>
            ["needs_support", "emerging", "review_due"].includes(skill.status) ||
            skill.trend === "declining",
        )
        .sort((a, b) => {
          const aDecline = a.trend === "declining" ? 1 : 0;
          const bDecline = b.trend === "declining" ? 1 : 0;
          if (aDecline !== bDecline) return bDecline - aDecline;
          return a.mastery_score - b.mastery_score;
        }),
    [recentSkills],
  );

  const baseline = useMemo(
    () => baselineSnapshot(profile, days),
    [profile, days],
  );

  const chartPoints = useMemo(
    () => buildChartPoints(profile, days),
    [profile, days],
  );

  const currentAcademic = currentAcademicMastery(profile);
  const baselineAcademic = baseline ? snapshotAcademicMastery(baseline) : null;
  const academicDelta =
    currentAcademic !== null && baselineAcademic !== null
      ? currentAcademic - baselineAcademic
      : null;

  const latestQuestionCount =
    asNumber(profile.latest_snapshot?.source_question_count) ??
    profile.subject_summaries
      .filter((item) => ["english", "math"].includes(item.subject.toLowerCase()))
      .reduce((sum, item) => sum + Number(item.questions_attempted ?? 0), 0);

  const baselineQuestionCount = baseline
    ? asNumber(baseline.source_question_count)
    : null;

  const questionsCompleted =
    days === null || baselineQuestionCount === null
      ? latestQuestionCount
      : Math.max(0, latestQuestionCount - baselineQuestionCount);

  const subjectCards = (["english", "math"] as const).map((subject) => {
    const current = currentSubjectMastery(profile, subject);
    const previous = baseline ? snapshotSubjectMastery(baseline, subject) : null;
    const delta =
      current !== null && previous !== null ? current - previous : null;

    const subjectImproved = improvedSkills.filter(
      (skill) => skill.subject.toLowerCase() === subject,
    );

    const strongestImprovement = subjectImproved[0] ?? null;
    const needsAttention =
      attentionSkills.find((skill) => skill.subject.toLowerCase() === subject) ??
      null;

    return {
      subject,
      current,
      delta,
      improvedCount: subjectImproved.length,
      strongestImprovement,
      needsAttention,
    };
  });

  const whatChanged = useMemo(() => {
    const combined = [
      ...improvedSkills.slice(0, 4),
      ...attentionSkills.filter(
        (skill) => !improvedSkills.some((item) => item.skill_id === skill.skill_id),
      ),
    ];

    const seen = new Set<string>();
    return combined
      .filter((skill) => {
        if (seen.has(skill.skill_id)) return false;
        seen.add(skill.skill_id);
        return true;
      })
      .slice(0, 5);
  }, [improvedSkills, attentionSkills]);

  const milestones = useMemo<Milestone[]>(() => {
    const items: Milestone[] = [];

    for (const skill of improvedSkills.slice(0, 4)) {
      items.push({
        id: `skill-${skill.skill_id}`,
        date: skill.last_attempted_at ?? profile.generated_at,
        title:
          skill.status === "secure" || skill.status === "mastered"
            ? `${skill.skill_name} is now strong`
            : `${skill.skill_name} is improving`,
        detail: `${subjectLabel(skill.subject)} · ${skill.topic}`,
        tone: "positive",
      });
    }

    for (const insight of resolvedWeaknesses.slice(0, 3)) {
      items.push({
        id: `insight-${insight.id}`,
        date: insight.resolved_at ?? insight.last_confirmed_at,
        title: insight.title || "A previous learning concern was resolved",
        detail: insight.summary || "Nova has enough new evidence to close this concern.",
        tone: "positive",
      });
    }

    for (const skill of attentionSkills
      .filter((skill) => skill.trend === "declining")
      .slice(0, 2)) {
      items.push({
        id: `attention-${skill.skill_id}`,
        date: skill.last_attempted_at ?? profile.generated_at,
        title: `${skill.skill_name} needs another look`,
        detail: `${subjectLabel(skill.subject)} · ${skill.topic}`,
        tone: "attention",
      });
    }

    return items
      .sort((a, b) => {
        const left = safeDate(a.date)?.getTime() ?? 0;
        const right = safeDate(b.date)?.getTime() ?? 0;
        return right - left;
      })
      .slice(0, 6);
  }, [
    improvedSkills,
    attentionSkills,
    resolvedWeaknesses,
    profile.generated_at,
  ]);

  const periodComparison =
    days === null
      ? "All available learning history"
      : baseline
        ? `Compared with the profile around ${formatDate(
            baseline.snapshot_date ?? baseline.generated_at,
            true,
          )}`
        : `Showing the last ${days} days`;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>PROGRESS</span>
          <h2>See how learning is changing over time</h2>
          <p>
            {learnerLabel}&apos;s progress is measured against their own earlier
            learning — not against other students.
          </p>
        </div>

        <div className={styles.timeframes} aria-label="Progress timeframe">
          {TIMEFRAMES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={timeframe === item.key ? styles.activeTimeframe : ""}
              onClick={() => setTimeframe(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>↗</span>
          <small>CONCEPTS STRENGTHENED</small>
          <strong>{improvedSkills.length}</strong>
          <p>Concepts with positive recent movement.</p>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>◆</span>
          <small>NEWLY SECURE</small>
          <strong>{newlySecure.length}</strong>
          <p>Improving concepts currently sitting in Strong.</p>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>✓</span>
          <small>NEEDS LESS SUPPORT</small>
          <strong>{resolvedWeaknesses.length}</strong>
          <p>Earlier learning concerns resolved in this period.</p>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>◎</span>
          <small>QUESTIONS COMPLETED</small>
          <strong>{Math.round(questionsCompleted)}</strong>
          <p>Academic question evidence added to the learner profile.</p>
        </article>
      </section>

      <section className={styles.trendCard}>
        <div className={styles.trendHeader}>
          <div>
            <span className={styles.eyebrow}>MASTERY OVER TIME</span>
            <h3>
              {chartSubject === "academic"
                ? "Academic mastery"
                : `${subjectLabel(chartSubject)} mastery`}
            </h3>
            <p>
              {periodComparison}
              {academicDelta !== null && chartSubject === "academic"
                ? ` · ${signedPoints(academicDelta)} overall`
                : ""}
            </p>
          </div>

          <div className={styles.subjectToggle}>
            {SUBJECTS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={chartSubject === item.key ? styles.activeSubject : ""}
                onClick={() => setChartSubject(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <ProgressChart points={chartPoints} subject={chartSubject} />
      </section>

      <section className={styles.subjectSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>BY SUBJECT</span>
            <h3>Where progress is happening</h3>
          </div>
          <p>Concept progress first, activity counts second.</p>
        </div>

        <div className={styles.subjectGrid}>
          {subjectCards.map((card) => (
            <article className={styles.subjectCard} key={card.subject}>
              <div className={styles.subjectCardTop}>
                <div>
                  <small>{subjectLabel(card.subject)}</small>
                  <strong>{percent(card.current)}</strong>
                </div>
                <span
                  className={
                    card.delta !== null && card.delta > 0
                      ? styles.deltaPositive
                      : card.delta !== null && card.delta < 0
                        ? styles.deltaNegative
                        : styles.deltaNeutral
                  }
                >
                  {signedPoints(card.delta)}
                </span>
              </div>

              <div className={styles.subjectBar}>
                <span
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, Number(card.current ?? 0)),
                    )}%`,
                  }}
                />
              </div>

              <div className={styles.subjectStats}>
                <div>
                  <small>Concepts improved</small>
                  <b>{card.improvedCount}</b>
                </div>
                <div>
                  <small>Best movement</small>
                  <b>
                    {card.strongestImprovement?.skill_name ?? "Building evidence"}
                  </b>
                </div>
                <div>
                  <small>Keep watching</small>
                  <b>{card.needsAttention?.skill_name ?? "No urgent concern"}</b>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.changedSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>WHAT CHANGED</span>
            <h3>Concept movement</h3>
          </div>
          <p>Only concepts with meaningful recent signals are surfaced here.</p>
        </div>

        {whatChanged.length ? (
          <div className={styles.changeGrid}>
            {whatChanged.map((skill) => (
              <article className={styles.changeCard} key={skill.skill_id}>
                <div className={styles.changeTop}>
                  <span
                    className={`${styles.statusPill} ${
                      styles[`status_${statusTone(skill)}`]
                    }`}
                  >
                    {skillMovementLabel(skill)}
                  </span>
                  <small>
                    {subjectLabel(skill.subject)} · P{skill.primary_level}
                  </small>
                </div>

                <h4>{skill.skill_name}</h4>
                <p>{skill.topic}</p>

                <div className={styles.changeMetrics}>
                  <span>
                    <small>Mastery</small>
                    <b>{percent(skill.mastery_score)}</b>
                  </span>
                  <span>
                    <small>Trend</small>
                    <b>
                      {skill.trend_points !== null
                        ? signedPoints(skill.trend_points)
                        : "Building"}
                    </b>
                  </span>
                  <span>
                    <small>Evidence</small>
                    <b>{skill.questions_attempted} questions</b>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.inlineEmpty}>
            Nova needs more repeated evidence in this timeframe before showing
            concept movement.
          </div>
        )}
      </section>

      <div className={styles.dualGrid}>
        <section className={styles.listSection}>
          <div className={styles.sectionHeadingCompact}>
            <div>
              <span className={styles.eyebrow}>RECENTLY IMPROVED</span>
              <h3>Momentum to keep</h3>
            </div>
          </div>

          <div className={styles.skillList}>
            {improvedSkills.slice(0, 5).map((skill, index) => (
              <article key={skill.skill_id}>
                <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{skill.skill_name}</strong>
                  <small>
                    {subjectLabel(skill.subject)} · {skill.topic}
                  </small>
                </div>
                <b>{signedPoints(skill.trend_points)}</b>
              </article>
            ))}

            {!improvedSkills.length && (
              <div className={styles.listEmpty}>
                No clear improvement signal yet for this timeframe.
              </div>
            )}
          </div>
        </section>

        <section className={styles.listSection}>
          <div className={styles.sectionHeadingCompact}>
            <div>
              <span className={styles.eyebrow}>NEEDS CONTINUED ATTENTION</span>
              <h3>Worth another look</h3>
            </div>
          </div>

          <div className={styles.skillList}>
            {attentionSkills.slice(0, 5).map((skill, index) => (
              <article key={skill.skill_id}>
                <span className={`${styles.rank} ${styles.attentionRank}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{skill.skill_name}</strong>
                  <small>
                    {subjectLabel(skill.subject)} · {skill.topic}
                  </small>
                </div>
                <b>{statusLabel(skill)}</b>
              </article>
            ))}

            {!attentionSkills.length && (
              <div className={styles.listEmpty}>
                No concept currently needs extra attention in this timeframe.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className={styles.timelineSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>RECENT LEARNING MILESTONES</span>
            <h3>Progress you can point to</h3>
          </div>
          <p>A short record of meaningful changes, not a full activity log.</p>
        </div>

        {milestones.length ? (
          <div className={styles.timeline}>
            {milestones.map((milestone) => (
              <article key={milestone.id}>
                <div
                  className={`${styles.timelineDot} ${
                    milestone.tone === "positive"
                      ? styles.timelinePositive
                      : milestone.tone === "attention"
                        ? styles.timelineAttention
                        : styles.timelineNeutral
                  }`}
                />
                <time>{formatDate(milestone.date, true)}</time>
                <div>
                  <strong>{milestone.title}</strong>
                  <p>{milestone.detail}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.inlineEmpty}>
            Milestones will appear as Nova gathers enough evidence of real change.
          </div>
        )}
      </section>

      <footer className={styles.recommendBridge}>
        <div>
          <span className={styles.eyebrow}>TURN PROGRESS INTO THE NEXT STEP</span>
          <h3>See what Nova recommends now</h3>
          <p>
            Progress shows what changed. Nova Recommends decides what deserves
            attention next.
          </p>
        </div>

        <button type="button" onClick={onOpenRecommendations}>
          Open Nova Recommends
          <span>→</span>
        </button>
      </footer>
    </section>
  );
}
