"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";

type CoreSubject = "english" | "math";
type PrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;
type QuizType = "quick" | "standard" | "challenge" | "assessment";

type CoreTopic = {
  id: string;
  subject: CoreSubject;
  primary_level: number;
  slug: string;
  title: string;
  short_title: string;
  description: string | null;
  icon: string | null;
  accent: string | null;
  quiz_target: number;
  sort_order: number;
  is_assessment_topic: boolean;
};

type CoreQuiz = {
  id: string;
  topic_id: string;
  code: string;
  title: string;
  description: string | null;
  quiz_type: QuizType;
  difficulty: number;
  question_count: number;
  estimated_minutes: number;
  quiz_order: number;
  reward_tokens: number;
  reward_gems: number;
};

type AttemptSummary = {
  quiz_id: string;
  percentage: number;
  correct_count: number;
  total_questions: number;
  submitted_at: string | null;
};

const SUBJECT_NAMES: Record<CoreSubject, string> = {
  english: "English",
  math: "Mathematics",
};

const QUIZ_TYPE_NAMES: Record<QuizType, string> = {
  quick: "Quick Practice",
  standard: "Standard Mission",
  challenge: "Challenge Mission",
  assessment: "Assessment Paper",
};

export default function CoreLevelClient({
  subject,
  level,
}: {
  subject: CoreSubject;
  level: PrimaryLevel;
}) {
  const router = useRouter();

  const {
    status,
    userId,
    tokenBalance,
    dreamGemBalance,
  } = useCoreMissionAccess();

  const [topics, setTopics] = useState<CoreTopic[]>([]);
  const [quizzes, setQuizzes] = useState<CoreQuiz[]>([]);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const subjectName = SUBJECT_NAMES[subject];

  useEffect(() => {
    if (status !== "allowed") {
      return;
    }

    let cancelled = false;

    async function loadLevelContent() {
      setLoading(true);
      setLoadError(null);

      const { data: topicData, error: topicError } = await supabase
        .from("core_topics")
        .select(
          `
            id,
            subject,
            primary_level,
            slug,
            title,
            short_title,
            description,
            icon,
            accent,
            quiz_target,
            sort_order,
            is_assessment_topic
          `,
        )
        .eq("subject", subject)
        .eq("primary_level", level)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (topicError) {
        console.error("Core topic loading error:", topicError);

        setLoadError(
          `Could not load the ${subjectName} Primary ${level} topics.`,
        );
        setTopics([]);
        setQuizzes([]);
        setAttempts([]);
        setLoading(false);
        return;
      }

      const loadedTopics = (topicData ?? []) as CoreTopic[];

      setTopics(loadedTopics);

      if (loadedTopics.length === 0) {
        setActiveTopicId(null);
        setQuizzes([]);
        setAttempts([]);
        setLoading(false);
        return;
      }

      setActiveTopicId((current) => {
        const currentStillExists = loadedTopics.some(
          (topic) => topic.id === current,
        );

        return currentStillExists ? current : loadedTopics[0].id;
      });

      const topicIds = loadedTopics.map((topic) => topic.id);

      const { data: quizData, error: quizError } = await supabase
        .from("core_quizzes")
        .select(
          `
            id,
            topic_id,
            code,
            title,
            description,
            quiz_type,
            difficulty,
            question_count,
            estimated_minutes,
            quiz_order,
            reward_tokens,
            reward_gems
          `,
        )
        .in("topic_id", topicIds)
        .eq("is_published", true)
        .order("quiz_order", { ascending: true });

      if (cancelled) return;

      if (quizError) {
        console.error("Core quiz loading error:", quizError);

        setLoadError(
          "The topics loaded, but the published quizzes could not be loaded.",
        );
        setQuizzes([]);
        setAttempts([]);
        setLoading(false);
        return;
      }

      const loadedQuizzes = (quizData ?? []) as CoreQuiz[];

      setQuizzes(loadedQuizzes);

      if (!userId || loadedQuizzes.length === 0) {
        setAttempts([]);
        setLoading(false);
        return;
      }

      const quizIds = loadedQuizzes.map((quiz) => quiz.id);

      const { data: attemptData, error: attemptError } = await supabase
        .from("core_quiz_attempts")
        .select(
          `
            quiz_id,
            percentage,
            correct_count,
            total_questions,
            submitted_at
          `,
        )
        .eq("user_id", userId)
        .eq("status", "marked")
        .in("quiz_id", quizIds)
        .order("submitted_at", { ascending: false });

      if (cancelled) return;

      if (attemptError) {
        console.warn("Could not load quiz progress:", attemptError);
        setAttempts([]);
      } else {
        setAttempts((attemptData ?? []) as AttemptSummary[]);
      }

      setLoading(false);
    }

    void loadLevelContent();

    return () => {
      cancelled = true;
    };
  }, [status, subject, level, userId, subjectName]);

  const activeTopic = useMemo(
    () =>
      topics.find((topic) => topic.id === activeTopicId) ??
      topics[0] ??
      null,
    [topics, activeTopicId],
  );

  const visibleQuizzes = useMemo(() => {
    if (!activeTopic) return [];

    return quizzes.filter((quiz) => quiz.topic_id === activeTopic.id);
  }, [quizzes, activeTopic]);

  const bestAttemptByQuiz = useMemo(() => {
    const result = new Map<string, AttemptSummary>();

    for (const attempt of attempts) {
      const existing = result.get(attempt.quiz_id);

      if (!existing || attempt.percentage > existing.percentage) {
        result.set(attempt.quiz_id, attempt);
      }
    }

    return result;
  }, [attempts]);

  const completedQuizCount = visibleQuizzes.filter((quiz) =>
    bestAttemptByQuiz.has(quiz.id),
  ).length;

  const progressPercentage =
    visibleQuizzes.length > 0
      ? Math.round(
          (completedQuizCount / visibleQuizzes.length) * 100,
        )
      : 0;

  function openQuiz(quizId: string) {
    router.push(
      `/learning-missions/core/${subject}/p${level}/quiz/${quizId}`,
    );
  }

  if (status === "checking") {
    return (
      <main style={pageShell}>
        <StatusCard text="Checking Core Missions access..." />
      </main>
    );
  }

  if (status === "locked") {
    return (
      <main style={pageShell}>
        <div style={statusCard}>
          <h1 style={{ margin: 0 }}>Core Missions Locked</h1>

          <p style={statusText}>
            Sign in with an account that has access to Core Missions.
          </p>

          <button
            type="button"
            onClick={() => router.push("/login")}
            style={primaryButton}
          >
            Log In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageShell}>
      <header style={header}>
        <button
          type="button"
          onClick={() => router.push("/learning-missions/core")}
          style={backButton}
        >
          ← Core
        </button>

        <div style={headerTitle}>
          <p style={headerEyebrow}>CORE MISSIONS</p>

          <p style={headerSubtitle}>
            {subjectName} · Primary {level}
          </p>
        </div>

        <div style={balanceArea}>
          <div style={tokenPill}>
            <span style={{ color: "#ffd76a" }}>✦</span>
            {tokenBalance} DT
          </div>

          <div style={gemPill}>
            <span style={{ color: "#e7b7ff" }}>◆</span>
            {dreamGemBalance} DG
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/learning-missions/core/rover")
            }
            style={roverButton}
          >
            My Rover ›
          </button>
        </div>
      </header>

      <section style={contentArea}>
        <div style={mainPanel}>
          {loading ? (
            <StatusCard text="Loading curriculum and quizzes..." />
          ) : (
            <>
              <div style={pageHeadingRow}>
                <div>
                  <p style={sectionEyebrow}>
                    {subjectName.toUpperCase()} · PRIMARY {level}
                  </p>

                  <h1 style={pageTitle}>
                    {subjectName} Mission Bank
                  </h1>

                  <p style={pageDescription}>
                    Choose a topic, then select a quiz or mixed-topic
                    assessment paper.
                  </p>
                </div>

                {activeTopic && (
                  <div style={progressCard}>
                    <p style={progressLabel}>TOPIC PROGRESS</p>

                    <p style={progressValue}>
                      {progressPercentage}%
                    </p>

                    <p style={progressDescription}>
                      {completedQuizCount}/{visibleQuizzes.length} published
                      quizzes completed
                    </p>
                  </div>
                )}
              </div>

              {loadError && (
                <div style={errorBanner}>
                  {loadError}
                </div>
              )}

              {topics.length === 0 ? (
                <div style={emptyState}>
                  <h2 style={{ margin: 0 }}>
                    No curriculum topics found
                  </h2>

                  <p style={emptyDescription}>
                    Add active topics for {subjectName} Primary {level} in
                    the <code>core_topics</code> table.
                  </p>
                </div>
              ) : (
                <>
                  <div style={topicTabs}>
                    {topics.map((topic) => {
                      const isActive = topic.id === activeTopic?.id;

                      const publishedCount = quizzes.filter(
                        (quiz) => quiz.topic_id === topic.id,
                      ).length;

                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setActiveTopicId(topic.id)}
                          style={{
                            ...topicTab,
                            border: isActive
                              ? `1px solid ${
                                  topic.accent || "#7ee8ff"
                                }`
                              : topicTab.border,
                            background: isActive
                              ? "rgba(83,215,255,0.16)"
                              : topicTab.background,
                          }}
                        >
                          <span style={topicIcon}>
                            {topic.icon || "✦"}
                          </span>

                          <span style={topicText}>
                            <strong>{topic.short_title}</strong>

                            <small style={topicCount}>
                              {publishedCount}/{topic.quiz_target} quizzes
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeTopic && (
                    <div style={topicHeading}>
                      <div>
                        <p style={topicEyebrow}>
                          {activeTopic.is_assessment_topic
                            ? "MIXED-TOPIC ASSESSMENTS"
                            : "TOPIC QUIZ BANK"}
                        </p>

                        <h2 style={topicTitle}>
                          {activeTopic.title}
                        </h2>

                        <p style={topicDescription}>
                          {activeTopic.description ||
                            "Focused practice for this curriculum topic."}
                        </p>
                      </div>

                      <div style={topicTarget}>
                        Target: {activeTopic.quiz_target} quizzes
                      </div>
                    </div>
                  )}

                  {visibleQuizzes.length === 0 ? (
                    <div style={emptyState}>
                      <h2 style={{ margin: 0 }}>
                        No published quizzes yet
                      </h2>

                      <p style={emptyDescription}>
                        This tab is working, but it does not have a
                        published quiz in Supabase yet.
                      </p>
                    </div>
                  ) : (
                    <div style={quizGrid}>
                      {visibleQuizzes.map((quiz) => {
                        const attempt = bestAttemptByQuiz.get(quiz.id);
                        const completed = Boolean(attempt);

                        return (
                          <button
                            key={quiz.id}
                            type="button"
                            onClick={() => openQuiz(quiz.id)}
                            style={{
                              ...quizCard,
                              border: completed
                                ? "1px solid rgba(74,222,128,0.55)"
                                : quizCard.border,
                              background: completed
                                ? "linear-gradient(180deg, rgba(18,88,61,0.76), rgba(7,38,39,0.92))"
                                : quizCard.background,
                            }}
                          >
                            <div style={quizCardTop}>
                              <span style={quizTypeBadge}>
                                {QUIZ_TYPE_NAMES[quiz.quiz_type] ??
                                  quiz.quiz_type}
                              </span>

                              <span style={difficultyBadge}>
                                Difficulty {quiz.difficulty}
                              </span>
                            </div>

                            <h3 style={quizTitle}>
                              {quiz.title}
                            </h3>

                            <p style={quizDescription}>
                              {quiz.description ||
                                "Complete this mission and review your answers."}
                            </p>

                            <div style={quizMeta}>
                              <span>{quiz.question_count} questions</span>
                              <span>•</span>
                              <span>{quiz.estimated_minutes} min</span>
                            </div>

                            {attempt && (
                              <div style={attemptResult}>
                                Best score:{" "}
                                {Math.round(attempt.percentage)}% ·{" "}
                                {attempt.correct_count}/
                                {attempt.total_questions}
                              </div>
                            )}

                            <div
                              style={{
                                ...quizAction,
                                background: completed
                                  ? "linear-gradient(135deg, #86efac, #22c55e)"
                                  : quizAction.background,
                                color: completed ? "#052e16" : "white",
                              }}
                            >
                              {completed ? "Replay Quiz" : "Start Quiz"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function StatusCard({ text }: { text: string }) {
  return (
    <div style={statusCard}>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  );
}

const pageShell: CSSProperties = {
  minHeight: "100dvh",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  backgroundImage: `
    linear-gradient(180deg, rgba(2,8,19,0.34), rgba(2,8,19,0.74)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

const header: CSSProperties = {
  minHeight: "68px",
  padding: "10px 18px",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: "12px",
};

const headerTitle: CSSProperties = {
  textAlign: "center",
};

const headerEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.2em",
  fontWeight: 900,
};

const headerSubtitle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "13px",
  opacity: 0.74,
};

const balanceArea: CSSProperties = {
  justifySelf: "end",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: "8px",
};

const backButton: CSSProperties = {
  justifySelf: "start",
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.07)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 800,
};

const tokenPill: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.28)",
  background: "rgba(255,215,106,0.1)",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 900,
};

const gemPill: CSSProperties = {
  ...tokenPill,
  border: "1px solid rgba(231,183,255,0.32)",
  background: "rgba(168,85,247,0.12)",
};

const roverButton: CSSProperties = {
  ...backButton,
  border: "1px solid rgba(255,215,106,0.42)",
  background:
    "linear-gradient(135deg, rgba(255,215,106,0.18), rgba(83,215,255,0.16))",
  color: "#fff1bd",
};

const contentArea: CSSProperties = {
  padding: "12px 20px 28px",
};

const mainPanel: CSSProperties = {
  width: "min(1480px, 100%)",
  minHeight: "calc(100dvh - 110px)",
  margin: "0 auto",
  borderRadius: "26px",
  border: "1px solid rgba(126,232,255,0.32)",
  background:
    "linear-gradient(145deg, rgba(5,18,42,0.72), rgba(8,26,58,0.88))",
  backdropFilter: "blur(12px)",
  padding: "22px",
  boxShadow:
    "0 0 34px rgba(83,215,255,0.12), 0 22px 58px rgba(0,0,0,0.3)",
};

const pageHeadingRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "14px",
};

const sectionEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const pageTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(30px, 4vw, 50px)",
  lineHeight: 1.05,
};

const pageDescription: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.67)",
  lineHeight: 1.5,
};

const progressCard: CSSProperties = {
  minWidth: "220px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.26)",
  background: "rgba(255,255,255,0.06)",
  padding: "12px 15px",
  textAlign: "right",
};

const progressLabel: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.14em",
  fontWeight: 900,
};

const progressValue: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "28px",
  fontWeight: 900,
};

const progressDescription: CSSProperties = {
  margin: "2px 0 0",
  color: "rgba(255,255,255,0.58)",
  fontSize: "10px",
};

const topicTabs: CSSProperties = {
  marginTop: "20px",
  display: "flex",
  gap: "9px",
  overflowX: "auto",
  paddingBottom: "10px",
};

const topicTab: CSSProperties = {
  minWidth: "180px",
  minHeight: "62px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
  cursor: "pointer",
};

const topicIcon: CSSProperties = {
  fontSize: "21px",
  color: "#7ee8ff",
};

const topicText: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const topicCount: CSSProperties = {
  color: "rgba(255,255,255,0.58)",
};

const topicHeading: CSSProperties = {
  marginTop: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  flexWrap: "wrap",
  gap: "12px",
};

const topicEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.15em",
  fontWeight: 900,
};

const topicTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(24px, 3vw, 34px)",
};

const topicDescription: CSSProperties = {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.64)",
};

const topicTarget: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.055)",
  padding: "8px 12px",
  fontSize: "12px",
  color: "#c9f6ff",
};

const quizGrid: CSSProperties = {
  marginTop: "15px",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
  gap: "12px",
};

const quizCard: CSSProperties = {
  minHeight: "260px",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.3)",
  background:
    "linear-gradient(180deg, rgba(20,58,100,0.74), rgba(8,25,56,0.91))",
  color: "white",
  padding: "17px",
  display: "flex",
  flexDirection: "column",
  textAlign: "left",
  cursor: "pointer",
};

const quizCardTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
};

const quizTypeBadge: CSSProperties = {
  borderRadius: "999px",
  background: "rgba(83,215,255,0.15)",
  color: "#9cecff",
  padding: "5px 8px",
  fontSize: "9px",
  letterSpacing: "0.08em",
  fontWeight: 900,
  textTransform: "uppercase",
};

const difficultyBadge: CSSProperties = {
  ...quizTypeBadge,
  background: "rgba(255,215,106,0.12)",
  color: "#ffe29a",
};

const quizTitle: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "22px",
  lineHeight: 1.15,
};

const quizDescription: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(255,255,255,0.69)",
  lineHeight: 1.45,
};

const quizMeta: CSSProperties = {
  marginTop: "13px",
  display: "flex",
  gap: "7px",
  color: "#ffe6a8",
  fontSize: "12px",
  fontWeight: 800,
};

const attemptResult: CSSProperties = {
  marginTop: "10px",
  color: "#b8ffdb",
  fontSize: "12px",
  fontWeight: 800,
};

const quizAction: CSSProperties = {
  marginTop: "auto",
  minHeight: "42px",
  borderRadius: "11px",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const emptyState: CSSProperties = {
  marginTop: "20px",
  minHeight: "220px",
  borderRadius: "18px",
  border: "1px dashed rgba(126,232,255,0.3)",
  background: "rgba(255,255,255,0.04)",
  padding: "28px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const emptyDescription: CSSProperties = {
  margin: "10px 0 0",
  color: "rgba(255,255,255,0.67)",
  lineHeight: 1.5,
};

const errorBanner: CSSProperties = {
  marginTop: "15px",
  borderRadius: "12px",
  border: "1px solid rgba(248,113,113,0.4)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "11px 13px",
};

const statusCard: CSSProperties = {
  width: "min(620px, calc(100% - 30px))",
  margin: "20vh auto 0",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.32)",
  background:
    "linear-gradient(145deg, rgba(5,18,42,0.86), rgba(8,26,58,0.96))",
  padding: "26px",
  textAlign: "center",
};

const statusText: CSSProperties = {
  margin: "12px 0 0",
  color: "rgba(255,255,255,0.7)",
};

const primaryButton: CSSProperties = {
  marginTop: "18px",
  minHeight: "43px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 18px",
  cursor: "pointer",
  fontWeight: 900,
};