"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfileView = "overview" | "mastery" | "patterns";

type ProfileSnapshot = {
  id?: string;
  snapshot_date?: string;
  snapshot_type?: string;
  overall_mastery?: number | null;
  profile_confidence?: number | null;
  strongest_subject?: string | null;
  priority_subject?: string | null;
  source_event_count?: number | null;
  source_question_count?: number | null;
  generated_at?: string | null;
  thinking_skills_summary?: {
    status?: string;
    event_count?: number;
    last_activity_at?: string | null;
    message?: string;
  } | null;
};

type SubjectSummary = {
  subject: string;
  mastery_score: number | null;
  confidence_score: number | null;
  questions_attempted: number;
  skills_count: number;
  secure_skills: number;
  priority_skills: number;
  last_activity_at: string | null;
};

type SkillMastery = {
  skill_id: string;
  subject: string;
  primary_level: number | null;
  domain: string;
  topic: string;
  skill_name: string;
  skill_code: string;
  is_topic_level: boolean;
  mastery_score: number;
  confidence_score: number;
  recent_accuracy: number | null;
  lifetime_accuracy: number | null;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  recent_wrong_answers: number;
  unique_activities: number;
  active_weeks: number;
  trend_points: number | null;
  trend: "improving" | "stable" | "declining" | "no_data";
  status:
    | "not_enough_data"
    | "needs_support"
    | "emerging"
    | "developing"
    | "secure"
    | "mastered"
    | "review_due";
  first_seen_at: string | null;
  last_attempted_at: string | null;
};

type LearningPattern = {
  id: string;
  pattern_key: string;
  subject: string;
  current_value: number | null;
  previous_value: number | null;
  unit: string;
  confidence_score: number;
  evidence_count: number;
  window_start: string | null;
  window_end: string | null;
  interpretation: string | null;
  metadata: Record<string, unknown>;
};

type ProfileInsight = {
  id: string;
  insight_key: string;
  insight_type: string;
  subject: string | null;
  skill_id: string | null;
  title: string;
  summary: string;
  confidence_score: number;
  severity: "info" | "low" | "medium" | "high";
  status: "active" | "resolved" | "dismissed";
  evidence: Record<string, unknown>;
  first_detected_at: string;
  last_confirmed_at: string;
  resolved_at?: string | null;
};

type TimelineSnapshot = ProfileSnapshot & {
  subject_summaries?: SubjectSummary[];
  priority_skills?: Array<{
    subject?: string;
    skill_name?: string;
    mastery_score?: number;
    status?: string;
  }>;
  strongest_skills?: Array<{
    subject?: string;
    skill_name?: string;
    mastery_score?: number;
    status?: string;
  }>;
};

type ProcessingRun = {
  status?: "running" | "completed" | "failed";
  started_at?: string;
  completed_at?: string | null;
  events_processed?: number;
  message?: string | null;
};

type LearningProfilePayload = {
  student_user_id: string;
  generated_at: string;
  latest_snapshot: ProfileSnapshot;
  subject_summaries: SubjectSummary[];
  skills: SkillMastery[];
  patterns: LearningPattern[];
  insights: ProfileInsight[];
  resolved_insights: ProfileInsight[];
  timeline: TimelineSnapshot[];
  processing: ProcessingRun;
};

type Props = {
  studentUserId: string | null;
  studentLabel: string;
};

const SUBJECT_META: Record<
  string,
  { label: string; icon: string; accent: string; soft: string }
> = {
  english: {
    label: "English",
    icon: "✎",
    accent: "#ff9df0",
    soft: "rgba(255,157,240,0.1)",
  },
  math: {
    label: "Mathematics",
    icon: "∑",
    accent: "#53d7ff",
    soft: "rgba(83,215,255,0.1)",
  },
  science: {
    label: "Science",
    icon: "⚗",
    accent: "#a6ff7a",
    soft: "rgba(166,255,122,0.1)",
  },
  knowledge: {
    label: "Knowledge Arena",
    icon: "◎",
    accent: "#ffd76a",
    soft: "rgba(255,215,106,0.1)",
  },
  thinking: {
    label: "Thinking Skills",
    icon: "◇",
    accent: "#c4b5fd",
    soft: "rgba(196,181,253,0.1)",
  },
};

const STATUS_META: Record<
  SkillMastery["status"],
  { label: string; colour: string; background: string }
> = {
  not_enough_data: {
    label: "More evidence needed",
    colour: "#cbd5e1",
    background: "rgba(148,163,184,0.1)",
  },
  needs_support: {
    label: "Needs support",
    colour: "#fecaca",
    background: "rgba(248,113,113,0.12)",
  },
  emerging: {
    label: "Emerging",
    colour: "#fed7aa",
    background: "rgba(251,146,60,0.12)",
  },
  developing: {
    label: "Developing",
    colour: "#fde68a",
    background: "rgba(250,204,21,0.1)",
  },
  secure: {
    label: "Secure",
    colour: "#a7f3d0",
    background: "rgba(52,211,153,0.1)",
  },
  mastered: {
    label: "Mastered",
    colour: "#99f6e4",
    background: "rgba(45,212,191,0.14)",
  },
  review_due: {
    label: "Review due",
    colour: "#ddd6fe",
    background: "rgba(167,139,250,0.12)",
  },
};

const PATTERN_LABELS: Record<string, string> = {
  weekly_consistency: "Weekly consistency",
  retry_persistence: "Retry persistence",
  review_effectiveness: "Review effectiveness",
  challenge_readiness: "Challenge readiness",
};

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return `${Math.round(Number(value))}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No activity yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
  }).format(date);
}

function subjectMeta(subject: string) {
  return (
    SUBJECT_META[subject] ?? {
      label: subject
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      icon: "◇",
      accent: "#8dfcff",
      soft: "rgba(141,252,255,0.1)",
    }
  );
}

function insightOrder(insight: ProfileInsight) {
  const severityOrder: Record<ProfileInsight["severity"], number> = {
    high: 0,
    medium: 1,
    low: 2,
    info: 3,
  };

  const typeOrder: Record<string, number> = {
    persistent_weakness: 0,
    review_due: 1,
    recent_improvement: 2,
    challenge_ready: 3,
    secure_strength: 4,
  };

  return severityOrder[insight.severity] * 10 +
    (typeOrder[insight.insight_type] ?? 5);
}

export default function LearningProfilePanel({
  studentUserId,
  studentLabel,
}: Props) {
  const [view, setView] = useState<ProfileView>("overview");
  const [profile, setProfile] = useState<LearningProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const autoRefreshAttempted = useRef(false);

  async function loadProfile(forceRefresh = false) {
    if (!studentUserId) {
      setProfile(null);
      setMessage("Choose a learner before opening the Learning Profile.");
      return;
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setMessage("");

    const rpcName = forceRefresh
      ? "admin_refresh_learning_profile"
      : "admin_get_learning_profile";

    const { data, error } = await supabase.rpc(rpcName, {
      p_student_user_id: studentUserId,
    });

    if (error) {
      console.error(`Learning Profile ${rpcName} error:`, error);
      setMessage(
        error.message.includes("does not exist")
          ? "The Learning Profile SQL has not been installed yet. Run the Phase 1–2 migration in Supabase."
          : error.message,
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const nextProfile = (data ?? null) as LearningProfilePayload | null;
    setProfile(nextProfile);
    setLoading(false);
    setRefreshing(false);

    const hasData =
      Boolean(nextProfile?.latest_snapshot?.id) ||
      (nextProfile?.skills?.length ?? 0) > 0;

    if (!forceRefresh && !hasData && !autoRefreshAttempted.current) {
      autoRefreshAttempted.current = true;
      await loadProfile(true);
    }
  }

  useEffect(() => {
    autoRefreshAttempted.current = false;
    setProfile(null);
    setView("overview");
    setSubjectFilter("all");
    void loadProfile(false);
    // studentUserId is the only identity input for this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUserId]);

  const subjects = profile?.subject_summaries ?? [];
  const allSkills = profile?.skills ?? [];
  const patterns = profile?.patterns ?? [];
  const insights = useMemo(
    () => [...(profile?.insights ?? [])].sort((a, b) => insightOrder(a) - insightOrder(b)),
    [profile?.insights],
  );
  const timeline = profile?.timeline ?? [];
  const snapshot = profile?.latest_snapshot ?? {};

  const filteredSkills = useMemo(() => {
    const rows =
      subjectFilter === "all"
        ? allSkills
        : allSkills.filter((skill) => skill.subject === subjectFilter);

    return [...rows].sort((first, second) => {
      const statusOrder: Record<SkillMastery["status"], number> = {
        needs_support: 0,
        emerging: 1,
        review_due: 2,
        developing: 3,
        secure: 4,
        mastered: 5,
        not_enough_data: 6,
      };

      const statusDifference =
        statusOrder[first.status] - statusOrder[second.status];

      if (statusDifference !== 0) return statusDifference;
      return first.mastery_score - second.mastery_score;
    });
  }, [allSkills, subjectFilter]);

  const strongestSubject = useMemo(
    () =>
      [...subjects]
        .filter((subject) => subject.questions_attempted > 0)
        .sort(
          (first, second) =>
            safeNumber(second.mastery_score) - safeNumber(first.mastery_score),
        )[0] ?? null,
    [subjects],
  );

  const prioritySubject = useMemo(
    () =>
      [...subjects]
        .filter((subject) => subject.questions_attempted >= 5)
        .sort(
          (first, second) =>
            safeNumber(first.mastery_score) - safeNumber(second.mastery_score),
        )[0] ?? null,
    [subjects],
  );

  const profileSummary = useMemo(() => {
    if (allSkills.length === 0) {
      return `Nova is still collecting enough evidence to build ${studentLabel}’s persistent Learning Profile.`;
    }

    const pieces: string[] = [];

    if (strongestSubject) {
      pieces.push(
        `${subjectMeta(strongestSubject.subject).label} is currently the strongest recorded subject at ${formatPercent(strongestSubject.mastery_score)} mastery`,
      );
    }

    if (
      prioritySubject &&
      prioritySubject.subject !== strongestSubject?.subject
    ) {
      pieces.push(
        `${subjectMeta(prioritySubject.subject).label} is the main priority at ${formatPercent(prioritySubject.mastery_score)} mastery`,
      );
    }

    const improving = allSkills.filter((skill) => skill.trend === "improving");
    if (improving.length > 0) {
      pieces.push(`${improving.length} skill area${improving.length === 1 ? " is" : "s are"} improving`);
    }

    return `${pieces.join(". ")}.`;
  }, [allSkills, prioritySubject, strongestSubject, studentLabel]);

  if (loading && !profile) {
    return (
      <section className="lp-shell">
        <div className="lp-loading-card">
          <span className="lp-spinner" aria-hidden="true" />
          <strong>Building {studentLabel}’s Learning Profile…</strong>
          <p>Nova is combining mission history, mastery and long-term trends.</p>
        </div>
        <LearningProfileStyles />
      </section>
    );
  }

  if (message && !profile) {
    return (
      <section className="lp-shell">
        <div className="lp-error-card">
          <strong>Learning Profile unavailable</strong>
          <p>{message}</p>
          <button type="button" onClick={() => void loadProfile(false)}>
            Try again
          </button>
        </div>
        <LearningProfileStyles />
      </section>
    );
  }

  return (
    <section className="lp-shell">
      <header className="lp-header">
        <div>
          <p className="lp-eyebrow">Persistent learner model</p>
          <h3>{studentLabel}’s Learning Profile</h3>
          <p>
            Nova’s long-term understanding of this learner, built from verified
            Dreamscape activity and refreshed as new evidence is recorded.
          </p>
        </div>

        <div className="lp-header-actions">
          <span className="lp-admin-badge">Admin preview</span>
          <button
            type="button"
            className="lp-refresh-button"
            onClick={() => void loadProfile(true)}
            disabled={refreshing || !studentUserId}
          >
            {refreshing ? "Refreshing…" : "Refresh profile"}
          </button>
        </div>
      </header>

      {message && <div className="lp-inline-message">{message}</div>}

      <nav className="lp-view-tabs" aria-label="Learning Profile sections">
        <button
          type="button"
          className={view === "overview" ? "active" : ""}
          onClick={() => setView("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={view === "mastery" ? "active" : ""}
          onClick={() => setView("mastery")}
        >
          Mastery Map
        </button>
        <button
          type="button"
          className={view === "patterns" ? "active" : ""}
          onClick={() => setView("patterns")}
        >
          Patterns & Timeline
        </button>
      </nav>

      {view === "overview" && (
        <div className="lp-view-content">
          <article className="lp-summary-card">
            <div>
              <div className="lp-heading-with-info">
                <p className="lp-eyebrow">Nova’s current understanding</p>
                <InfoTip text="This summary is based on recorded Dreamscape activity. It is not a diagnosis of ability, personality or a learning condition." />
              </div>
              <h4>{profileSummary}</h4>
            </div>

            <div className="lp-summary-metrics">
              <Metric
                label="Overall mastery"
                value={formatPercent(snapshot.overall_mastery)}
              />
              <Metric
                label="Profile confidence"
                value={formatPercent(snapshot.profile_confidence)}
              />
              <Metric
                label="Recorded events"
                value={String(snapshot.source_event_count ?? 0)}
              />
              <Metric
                label="Questions represented"
                value={String(snapshot.source_question_count ?? 0)}
              />
            </div>
          </article>

          <section className="lp-section-block">
            <div className="lp-section-heading">
              <div>
                <p className="lp-eyebrow">Subject mastery</p>
                <h4>Current subject picture</h4>
              </div>
              <span>{subjects.length} subjects with recorded evidence</span>
            </div>

            {subjects.length === 0 ? (
              <EmptyState text="No subject evidence has been processed yet." />
            ) : (
              <div className="lp-subject-grid">
                {subjects.map((subject) => {
                  const meta = subjectMeta(subject.subject);

                  return (
                    <article
                      key={subject.subject}
                      className="lp-subject-card"
                      style={{
                        borderColor: `${meta.accent}40`,
                        background: meta.soft,
                      }}
                    >
                      <div className="lp-subject-top">
                        <span
                          className="lp-subject-icon"
                          style={{ color: meta.accent, borderColor: `${meta.accent}55` }}
                        >
                          {meta.icon}
                        </span>
                        <span>{subject.skills_count} tracked areas</span>
                      </div>

                      <h5>{meta.label}</h5>
                      <strong style={{ color: meta.accent }}>
                        {formatPercent(subject.mastery_score)}
                      </strong>
                      <p>
                        {subject.questions_attempted} questions · {subject.secure_skills} secure · {subject.priority_skills} priority
                      </p>

                      <div className="lp-progress-track">
                        <div
                          className="lp-progress-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, safeNumber(subject.mastery_score)))}%`,
                            background: meta.accent,
                          }}
                        />
                      </div>

                      <small>
                        Last activity: {formatDate(subject.last_activity_at)}
                      </small>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="lp-two-column">
            <section className="lp-section-block">
              <div className="lp-section-heading">
                <div>
                  <p className="lp-eyebrow">Priority insights</p>
                  <h4>What requires attention</h4>
                </div>
              </div>

              {insights.filter((insight) => insight.insight_type !== "secure_strength").length === 0 ? (
                <EmptyState text="No persistent concern has enough evidence yet." />
              ) : (
                <div className="lp-insight-list">
                  {insights
                    .filter((insight) => insight.insight_type !== "secure_strength")
                    .slice(0, 6)
                    .map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                </div>
              )}
            </section>

            <section className="lp-section-block">
              <div className="lp-section-heading">
                <div>
                  <p className="lp-eyebrow">Strengths and growth</p>
                  <h4>What Nova should build on</h4>
                </div>
              </div>

              {insights.filter((insight) =>
                ["secure_strength", "recent_improvement", "challenge_ready"].includes(
                  insight.insight_type,
                ),
              ).length === 0 ? (
                <EmptyState text="More varied attempts are needed before Nova confirms stable strengths." />
              ) : (
                <div className="lp-insight-list">
                  {insights
                    .filter((insight) =>
                      [
                        "secure_strength",
                        "recent_improvement",
                        "challenge_ready",
                      ].includes(insight.insight_type),
                    )
                    .slice(0, 6)
                    .map((insight) => (
                      <InsightCard key={insight.id} insight={insight} positive />
                    ))}
                </div>
              )}
            </section>
          </div>

        </div>
      )}

      {view === "mastery" && (
        <div className="lp-view-content">
          <section className="lp-section-block">
            <div className="lp-mastery-heading">
              <div>
                <p className="lp-eyebrow">Skill and topic mastery</p>
                <h4>Mastery Map</h4>
                <p>
                  See the areas your child understands well, the areas still
                  developing and the skills that need more practice. As Nova
                  reviews more completed questions, the guidance becomes more
                  specific.
                </p>
              </div>

              <label className="lp-subject-filter">
                <span>Subject</span>
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                >
                  <option value="all">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.subject} value={subject.subject}>
                      {subjectMeta(subject.subject).label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredSkills.length === 0 ? (
              <EmptyState text="No mastery rows match this subject yet." />
            ) : (
              <div className="lp-mastery-list">
                {filteredSkills.map((skill) => {
                  const meta = subjectMeta(skill.subject);
                  const status = STATUS_META[skill.status];
                  const trendText =
                    skill.trend === "no_data"
                      ? "No trend yet"
                      : skill.trend_points === null
                        ? skill.trend
                        : `${skill.trend_points >= 0 ? "+" : ""}${Math.round(skill.trend_points)} pts · ${skill.trend}`;

                  return (
                    <article key={skill.skill_id} className="lp-mastery-row">
                      <div className="lp-mastery-main">
                        <span
                          className="lp-subject-icon"
                          style={{ color: meta.accent, borderColor: `${meta.accent}55` }}
                        >
                          {meta.icon}
                        </span>
                        <div>
                          <div className="lp-mastery-title-line">
                            <h5>{skill.skill_name}</h5>
                            {skill.is_topic_level && <span>Topic overview</span>}
                          </div>
                          <p>
                            {meta.label}
                            {skill.primary_level ? ` · Primary ${skill.primary_level}` : ""}
                            {skill.domain !== skill.skill_name
                              ? ` · ${skill.domain}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="lp-mastery-score">
                        <strong>{formatPercent(skill.mastery_score)}</strong>
                        <span
                          style={{
                            color: status.colour,
                            background: status.background,
                          }}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="lp-mastery-evidence">
                        <span>{skill.questions_attempted} questions</span>
                        <span>{formatPercent(skill.confidence_score)} confidence</span>
                        <span>{skill.recent_wrong_answers} recent errors</span>
                        <span>{trendText}</span>
                      </div>

                      <div className="lp-mastery-bar">
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, skill.mastery_score))}%`,
                            background: meta.accent,
                          }}
                        />
                      </div>

                      <small>
                        Last practised: {formatDate(skill.last_attempted_at)}
                      </small>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {view === "patterns" && (
        <div className="lp-view-content">
          <section className="lp-section-block">
            <div className="lp-section-heading">
              <div>
                <div className="lp-heading-with-info">
                  <p className="lp-eyebrow">Measured learning behaviours</p>
                  <InfoTip text="These patterns describe recent recorded activity. They should not be treated as fixed personality labels." />
                </div>
                <h4>Learning Patterns</h4>
              </div>
            </div>

            {patterns.length === 0 ? (
              <EmptyState text="Nova needs more repeated activity before calculating learning patterns." />
            ) : (
              <div className="lp-pattern-grid">
                {patterns.map((pattern) => (
                  <article key={pattern.id} className="lp-pattern-card">
                    <div>
                      <p className="lp-eyebrow">
                        {pattern.subject === "all"
                          ? "Across Dreamscape"
                          : subjectMeta(pattern.subject).label}
                      </p>
                      <h5>
                        {PATTERN_LABELS[pattern.pattern_key] ??
                          pattern.pattern_key.replaceAll("_", " ")}
                      </h5>
                    </div>

                    <strong>
                      {pattern.current_value === null
                        ? "—"
                        : pattern.unit === "percentage_points"
                          ? `${pattern.current_value >= 0 ? "+" : ""}${Math.round(pattern.current_value)} pts`
                          : formatPercent(pattern.current_value)}
                    </strong>

                    <p>{pattern.interpretation ?? "More evidence is required."}</p>

                    <div className="lp-pattern-footer">
                      <span>{pattern.evidence_count} evidence points</span>
                      <span>{formatPercent(pattern.confidence_score)} confidence</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="lp-two-column">
            <section className="lp-section-block">
              <div className="lp-section-heading">
                <div>
                  <p className="lp-eyebrow">Development history</p>
                  <h4>Profile Timeline</h4>
                </div>
              </div>

              {timeline.length === 0 ? (
                <EmptyState text="The first weekly and monthly snapshots will appear after the profile refresh." />
              ) : (
                <div className="lp-timeline-list">
                  {timeline.slice(0, 12).map((entry, index) => (
                    <article
                      key={`${entry.snapshot_type}-${entry.snapshot_date}-${index}`}
                      className="lp-timeline-row"
                    >
                      <div className="lp-timeline-dot" />
                      <div>
                        <span>
                          {entry.snapshot_type === "monthly"
                            ? "Monthly snapshot"
                            : entry.snapshot_type === "manual"
                              ? "Admin refresh"
                              : "Weekly snapshot"}
                        </span>
                        <strong>{formatShortDate(entry.snapshot_date)}</strong>
                        <p>
                          Overall mastery {formatPercent(entry.overall_mastery)} ·
                          confidence {formatPercent(entry.profile_confidence)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="lp-section-block">
              <div className="lp-section-heading">
                <div>
                  <p className="lp-eyebrow">Resolved signals</p>
                  <h4>What has changed</h4>
                </div>
              </div>

              {(profile?.resolved_insights?.length ?? 0) === 0 ? (
                <EmptyState text="Resolved weaknesses and expired findings will appear here over time." />
              ) : (
                <div className="lp-insight-list">
                  {profile?.resolved_insights.slice(0, 10).map((insight) => (
                    <article key={insight.id} className="lp-resolved-card">
                      <span>Resolved</span>
                      <strong>{insight.title}</strong>
                      <p>{insight.summary}</p>
                      <small>{formatDate(insight.resolved_at)}</small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <footer className="lp-footer">
        <span>
          Last generated: {formatDate(snapshot.generated_at ?? profile?.generated_at)}
        </span>
        <span>
          Processor: {profile?.processing?.status ?? "not run"}
          {profile?.processing?.events_processed
            ? ` · ${profile.processing.events_processed} events synchronised`
            : ""}
        </span>
      </footer>

      <LearningProfileStyles />
    </section>
  );
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`lp-info-tip ${open ? "open" : ""}`}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="lp-info-button"
        aria-label="More information"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
      >
        i
      </button>

      <span className="lp-info-popover" role="tooltip">
        {text}
      </span>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="lp-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="lp-empty-state">{text}</div>;
}

function InsightCard({
  insight,
  positive = false,
}: {
  insight: ProfileInsight;
  positive?: boolean;
}) {
  const meta = subjectMeta(insight.subject ?? "thinking");

  return (
    <article
      className={`lp-insight-card ${positive ? "positive" : insight.severity}`}
    >
      <span
        className="lp-insight-icon"
        style={{ color: meta.accent, borderColor: `${meta.accent}55` }}
      >
        {positive ? "↗" : insight.severity === "high" ? "!" : meta.icon}
      </span>
      <div>
        <div className="lp-insight-heading">
          <strong>{insight.title}</strong>
          <span>{Math.round(insight.confidence_score)}% confidence</span>
        </div>
        <p>{insight.summary}</p>
      </div>
    </article>
  );
}

function LearningProfileStyles() {
  return (
    <style jsx global>{`
      .lp-shell {
        color: white;
        font-family: Arial, Helvetica, sans-serif;
      }

      .lp-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 22px;
        padding: 22px;
        border-radius: 23px;
        border: 1px solid rgba(142, 232, 255, 0.15);
        background:
          radial-gradient(circle at 100% 0%, rgba(192, 132, 252, 0.12), transparent 38%),
          rgba(255, 255, 255, 0.028);
      }

      .lp-eyebrow {
        margin: 0;
        color: #8dfcff;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.17em;
        text-transform: uppercase;
      }

      .lp-header h3,
      .lp-section-heading h4,
      .lp-mastery-heading h4 {
        margin: 8px 0 0;
        letter-spacing: -0.035em;
      }

      .lp-header h3 {
        font-size: clamp(30px, 4vw, 43px);
        line-height: 1.05;
      }

      .lp-header > div:first-child > p:last-child,
      .lp-mastery-heading > div > p:last-child,
      .lp-section-heading > div > p:last-child {
        max-width: 840px;
        margin: 11px 0 0;
        color: rgba(235, 247, 255, 0.6);
        font-size: 14px;
        line-height: 1.6;
      }

      .lp-header-actions {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .lp-admin-badge,
      .lp-refresh-button {
        min-height: 42px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .lp-admin-badge {
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        border: 1px solid rgba(216, 180, 254, 0.28);
        background: rgba(192, 132, 252, 0.09);
        color: #e9d5ff;
      }

      .lp-refresh-button {
        padding: 0 16px;
        border: 1px solid rgba(142, 232, 255, 0.32);
        background: rgba(83, 215, 255, 0.1);
        color: #c7f7ff;
        cursor: pointer;
      }

      .lp-refresh-button:disabled {
        cursor: wait;
        opacity: 0.55;
      }

      .lp-inline-message {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(255, 215, 106, 0.22);
        background: rgba(255, 215, 106, 0.07);
        color: #ffe6a7;
        font-size: 13px;
        line-height: 1.5;
      }

      .lp-view-tabs {
        margin-top: 14px;
        padding: 5px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        border-radius: 17px;
        border: 1px solid rgba(142, 232, 255, 0.11);
        background: rgba(255, 255, 255, 0.025);
      }

      .lp-view-tabs button {
        min-height: 44px;
        border-radius: 13px;
        border: 1px solid transparent;
        background: transparent;
        color: rgba(235, 247, 255, 0.55);
        font-size: 12px;
        font-weight: 850;
        cursor: pointer;
      }

      .lp-view-tabs button.active {
        border-color: rgba(142, 232, 255, 0.28);
        background: rgba(83, 215, 255, 0.1);
        color: white;
        box-shadow: 0 0 20px rgba(83, 215, 255, 0.08);
      }

      .lp-view-content {
        margin-top: 14px;
        display: grid;
        gap: 14px;
      }

      .lp-summary-card,
      .lp-section-block,
      .lp-thinking-card,
      .lp-loading-card,
      .lp-error-card {
        border-radius: 22px;
        border: 1px solid rgba(142, 232, 255, 0.11);
        background: rgba(255, 255, 255, 0.026);
      }

      .lp-summary-card {
        padding: 21px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(390px, 0.68fr);
        gap: 20px;
        align-items: center;
      }

      .lp-summary-card h4 {
        margin: 8px 0 0;
        font-size: clamp(24px, 3vw, 32px);
        line-height: 1.25;
        letter-spacing: -0.035em;
      }

      .lp-summary-card > div:first-child > p:last-child {
        margin: 11px 0 0;
        color: rgba(235, 247, 255, 0.53);
        font-size: 13px;
        line-height: 1.55;
      }

      .lp-summary-metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .lp-metric {
        min-height: 84px;
        padding: 13px;
        border-radius: 15px;
        border: 1px solid rgba(142, 232, 255, 0.1);
        background: rgba(0, 0, 0, 0.14);
      }

      .lp-metric span {
        color: rgba(235, 247, 255, 0.46);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .lp-metric strong {
        display: block;
        margin-top: 9px;
        color: #8dfcff;
        font-size: 25px;
        letter-spacing: -0.03em;
      }

      .lp-section-block {
        padding: 20px;
      }

      .lp-section-heading,
      .lp-mastery-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .lp-section-heading h4,
      .lp-mastery-heading h4 {
        font-size: 24px;
      }

      .lp-section-heading > span {
        color: rgba(235, 247, 255, 0.42);
        font-size: 11px;
      }

      .lp-subject-grid {
        margin-top: 17px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 11px;
      }

      .lp-subject-card {
        min-height: 220px;
        padding: 16px;
        border-radius: 18px;
        border: 1px solid;
      }

      .lp-subject-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .lp-subject-top > span:last-child {
        color: rgba(235, 247, 255, 0.45);
        font-size: 10px;
        font-weight: 800;
      }

      .lp-subject-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        border: 1px solid;
        background: rgba(255, 255, 255, 0.035);
        font-size: 18px;
        font-weight: 900;
      }

      .lp-subject-card h5 {
        margin: 17px 0 0;
        font-size: 15px;
      }

      .lp-subject-card > strong {
        display: block;
        margin-top: 8px;
        font-size: 31px;
        letter-spacing: -0.04em;
      }

      .lp-subject-card > p {
        min-height: 36px;
        margin: 7px 0 0;
        color: rgba(235, 247, 255, 0.5);
        font-size: 11px;
        line-height: 1.45;
      }

      .lp-progress-track,
      .lp-mastery-bar {
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.07);
      }

      .lp-progress-track {
        height: 7px;
        margin-top: 13px;
      }

      .lp-progress-fill,
      .lp-mastery-bar > div {
        height: 100%;
        border-radius: inherit;
      }

      .lp-subject-card small {
        display: block;
        margin-top: 10px;
        color: rgba(235, 247, 255, 0.4);
        font-size: 10px;
      }

      .lp-two-column {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .lp-insight-list {
        margin-top: 15px;
        display: grid;
        gap: 9px;
      }

      .lp-insight-card {
        min-height: 76px;
        padding: 12px;
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 11px;
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.025);
      }

      .lp-insight-card.high,
      .lp-insight-card.medium {
        border-color: rgba(248, 113, 113, 0.18);
        background: rgba(248, 113, 113, 0.045);
      }

      .lp-insight-card.positive {
        border-color: rgba(52, 211, 153, 0.16);
        background: rgba(52, 211, 153, 0.04);
      }

      .lp-insight-icon {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        border: 1px solid;
        background: rgba(255, 255, 255, 0.03);
        font-weight: 900;
      }

      .lp-insight-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .lp-insight-heading strong {
        font-size: 13px;
        line-height: 1.4;
      }

      .lp-insight-heading span {
        flex: 0 0 auto;
        color: rgba(235, 247, 255, 0.4);
        font-size: 9px;
      }

      .lp-insight-card p {
        margin: 6px 0 0;
        color: rgba(235, 247, 255, 0.52);
        font-size: 11px;
        line-height: 1.5;
      }

      .lp-heading-with-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .lp-info-tip {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      .lp-info-button {
        width: 21px;
        height: 21px;
        padding: 0;
        border-radius: 999px;
        border: 1px solid rgba(142, 232, 255, 0.3);
        background: rgba(83, 215, 255, 0.08);
        color: #8dfcff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        cursor: pointer;
      }

      .lp-info-button:hover,
      .lp-info-button:focus-visible {
        border-color: rgba(142, 232, 255, 0.64);
        background: rgba(83, 215, 255, 0.16);
        outline: none;
      }

      .lp-info-popover {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 9px);
        z-index: 40;
        width: min(310px, calc(100vw - 48px));
        padding: 11px 12px;
        border-radius: 12px;
        border: 1px solid rgba(142, 232, 255, 0.22);
        background: rgba(3, 12, 27, 0.98);
        color: rgba(245, 251, 255, 0.82);
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
        font-size: 12px;
        line-height: 1.5;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translate(-50%, 5px);
        transition:
          opacity 150ms ease,
          transform 150ms ease,
          visibility 150ms ease;
      }

      .lp-info-tip:hover .lp-info-popover,
      .lp-info-tip:focus-within .lp-info-popover,
      .lp-info-tip.open .lp-info-popover {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, 0);
      }

      .lp-subject-filter {
        min-width: 190px;
        min-height: 54px;
        padding: 8px 12px;
        display: grid;
        gap: 4px;
        border-radius: 14px;
        border: 1px solid rgba(142, 232, 255, 0.14);
        background: rgba(255, 255, 255, 0.03);
      }

      .lp-subject-filter span {
        color: rgba(235, 247, 255, 0.42);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .lp-subject-filter select {
        border: 0;
        outline: 0;
        background: transparent;
        color: white;
        font-size: 12px;
      }

      .lp-subject-filter option {
        color: #071326;
      }

      .lp-mastery-list {
        margin-top: 17px;
        display: grid;
        gap: 9px;
      }

      .lp-mastery-row {
        padding: 14px;
        display: grid;
        grid-template-columns: minmax(300px, 1.25fr) 150px minmax(310px, 1fr);
        align-items: center;
        gap: 13px;
        border-radius: 17px;
        border: 1px solid rgba(142, 232, 255, 0.09);
        background: rgba(255, 255, 255, 0.022);
      }

      .lp-mastery-main {
        min-width: 0;
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        align-items: center;
        gap: 11px;
      }

      .lp-mastery-title-line {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 7px;
      }

      .lp-mastery-title-line h5 {
        margin: 0;
        font-size: 14px;
      }

      .lp-mastery-title-line span {
        padding: 4px 7px;
        border-radius: 999px;
        border: 1px solid rgba(142, 232, 255, 0.12);
        color: rgba(235, 247, 255, 0.42);
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-mastery-main p {
        margin: 5px 0 0;
        color: rgba(235, 247, 255, 0.42);
        font-size: 10px;
      }

      .lp-mastery-score {
        display: grid;
        justify-items: start;
        gap: 6px;
      }

      .lp-mastery-score strong {
        font-size: 24px;
      }

      .lp-mastery-score span {
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .lp-mastery-evidence {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .lp-mastery-evidence span {
        padding: 5px 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(235, 247, 255, 0.48);
        font-size: 9px;
      }

      .lp-mastery-bar {
        grid-column: 1 / -1;
        height: 5px;
      }

      .lp-mastery-row > small {
        grid-column: 1 / -1;
        color: rgba(235, 247, 255, 0.36);
        font-size: 9px;
      }

      .lp-pattern-grid {
        margin-top: 17px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .lp-pattern-card {
        min-height: 210px;
        padding: 16px;
        border-radius: 18px;
        border: 1px solid rgba(142, 232, 255, 0.1);
        background: rgba(255, 255, 255, 0.024);
      }

      .lp-pattern-card h5 {
        margin: 8px 0 0;
        font-size: 16px;
        text-transform: capitalize;
      }

      .lp-pattern-card > strong {
        display: block;
        margin-top: 16px;
        color: #8dfcff;
        font-size: 29px;
        letter-spacing: -0.04em;
      }

      .lp-pattern-card > p {
        min-height: 54px;
        margin: 8px 0 0;
        color: rgba(235, 247, 255, 0.51);
        font-size: 11px;
        line-height: 1.5;
      }

      .lp-pattern-footer {
        margin-top: 13px;
        padding-top: 11px;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        border-top: 1px solid rgba(142, 232, 255, 0.07);
        color: rgba(235, 247, 255, 0.38);
        font-size: 9px;
      }

      .lp-timeline-list {
        position: relative;
        margin-top: 15px;
        display: grid;
        gap: 9px;
      }

      .lp-timeline-row {
        position: relative;
        padding: 12px 12px 12px 34px;
        border-radius: 14px;
        border: 1px solid rgba(142, 232, 255, 0.08);
        background: rgba(255, 255, 255, 0.022);
      }

      .lp-timeline-dot {
        position: absolute;
        top: 17px;
        left: 13px;
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #8dfcff;
        box-shadow: 0 0 13px rgba(83, 215, 255, 0.48);
      }

      .lp-timeline-row span,
      .lp-resolved-card > span {
        color: rgba(235, 247, 255, 0.4);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .lp-timeline-row strong {
        display: block;
        margin-top: 5px;
        font-size: 13px;
      }

      .lp-timeline-row p {
        margin: 5px 0 0;
        color: rgba(235, 247, 255, 0.48);
        font-size: 10px;
      }

      .lp-resolved-card {
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(52, 211, 153, 0.12);
        background: rgba(52, 211, 153, 0.035);
      }

      .lp-resolved-card strong {
        display: block;
        margin-top: 6px;
        font-size: 13px;
      }

      .lp-resolved-card p {
        margin: 6px 0 0;
        color: rgba(235, 247, 255, 0.5);
        font-size: 11px;
        line-height: 1.45;
      }

      .lp-resolved-card small {
        display: block;
        margin-top: 8px;
        color: rgba(235, 247, 255, 0.35);
        font-size: 9px;
      }

      .lp-footer {
        margin-top: 13px;
        padding: 0 3px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: rgba(235, 247, 255, 0.35);
        font-size: 9px;
      }

      .lp-empty-state {
        margin-top: 15px;
        padding: 24px;
        border-radius: 16px;
        border: 1px dashed rgba(142, 232, 255, 0.14);
        background: rgba(255, 255, 255, 0.018);
        color: rgba(235, 247, 255, 0.47);
        font-size: 12px;
        line-height: 1.5;
        text-align: center;
      }

      .lp-loading-card,
      .lp-error-card {
        min-height: 280px;
        padding: 28px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .lp-loading-card strong,
      .lp-error-card strong {
        margin-top: 15px;
        font-size: 21px;
      }

      .lp-loading-card p,
      .lp-error-card p {
        max-width: 600px;
        margin: 9px 0 0;
        color: rgba(235, 247, 255, 0.52);
        font-size: 13px;
        line-height: 1.55;
      }

      .lp-error-card button {
        min-height: 42px;
        margin-top: 17px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid rgba(142, 232, 255, 0.25);
        background: rgba(83, 215, 255, 0.1);
        color: white;
        font-weight: 850;
        cursor: pointer;
      }

      .lp-spinner {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        border: 3px solid rgba(142, 232, 255, 0.15);
        border-top-color: #8dfcff;
        animation: lp-spin 0.85s linear infinite;
      }

      @keyframes lp-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1100px) {
        .lp-summary-card {
          grid-template-columns: 1fr;
        }

        .lp-subject-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lp-pattern-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lp-mastery-row {
          grid-template-columns: minmax(260px, 1fr) 130px;
        }

        .lp-mastery-evidence {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 760px) {
        .lp-info-popover {
          left: 0;
          transform: translate(0, 5px);
          width: min(280px, calc(100vw - 52px));
        }

        .lp-info-tip:hover .lp-info-popover,
        .lp-info-tip:focus-within .lp-info-popover,
        .lp-info-tip.open .lp-info-popover {
          transform: translate(0, 0);
        }

        .lp-header {
          padding: 16px;
          flex-direction: column;
        }

        .lp-header h3 {
          font-size: 28px;
        }

        .lp-header-actions {
          width: 100%;
        }

        .lp-admin-badge,
        .lp-refresh-button {
          flex: 1;
          justify-content: center;
        }

        .lp-view-tabs button {
          padding: 0 7px;
          font-size: 10px;
          line-height: 1.2;
        }

        .lp-summary-card,
        .lp-section-block {
          padding: 15px;
          border-radius: 18px;
        }

        .lp-summary-metrics,
        .lp-subject-grid,
        .lp-pattern-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lp-two-column {
          grid-template-columns: 1fr;
        }

        .lp-subject-card {
          min-height: 225px;
          padding: 13px;
        }

        .lp-section-heading,
        .lp-mastery-heading {
          flex-direction: column;
        }

        .lp-subject-filter {
          width: 100%;
        }

        .lp-mastery-row {
          grid-template-columns: 1fr auto;
          padding: 12px;
        }

        .lp-mastery-main {
          grid-column: 1 / -1;
        }

        .lp-mastery-score {
          grid-column: 1;
        }

        .lp-mastery-evidence {
          grid-column: 1 / -1;
        }

        .lp-footer {
          flex-direction: column;
        }
      }

      @media (max-width: 480px) {
        .lp-summary-metrics,
        .lp-subject-grid,
        .lp-pattern-grid {
          grid-template-columns: 1fr;
        }

        .lp-view-tabs {
          gap: 4px;
        }

        .lp-view-tabs button {
          min-height: 48px;
          font-size: 9.5px;
        }
      }
    `}</style>
  );
}
