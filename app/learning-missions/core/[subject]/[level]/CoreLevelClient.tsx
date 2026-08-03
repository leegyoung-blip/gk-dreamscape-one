"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";

type ScreenMode = "desktop" | "tablet" | "mobile";
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

type SubjectTheme = {
  name: string;
  shortName: string;
  icon: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  button: string;
};

const SUBJECT_THEMES: Record<CoreSubject, SubjectTheme> = {
  english: {
    name: "English",
    shortName: "English",
    icon: "Aa",
    accent: "#c084fc",
    accentSoft: "rgba(192,132,252,0.13)",
    accentBorder: "rgba(192,132,252,0.38)",
    button: "linear-gradient(135deg, #a855f7, #22d3ee)",
  },
  math: {
    name: "Mathematics",
    shortName: "Math",
    icon: "∑",
    accent: "#2dd4bf",
    accentSoft: "rgba(45,212,191,0.13)",
    accentBorder: "rgba(45,212,191,0.38)",
    button: "linear-gradient(135deg, #14b8a6, #22d3ee)",
  },
};

const QUIZ_TYPE_NAMES: Record<QuizType, string> = {
  quick: "Quick Practice",
  standard: "Standard Mission",
  challenge: "Challenge Mission",
  assessment: "Assessment Paper",
};

const CORE_TABLES: Record<
  CoreSubject,
  { topics: string; quizzes: string; attempts: string }
> = {
  english: {
    topics: "english_topics",
    quizzes: "english_quizzes",
    attempts: "english_quiz_attempts",
  },
  math: {
    topics: "math_topics",
    quizzes: "math_quizzes",
    attempts: "math_quiz_attempts",
  },
};

function useResponsiveMode() {
  const [mode, setMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function updateMode() {
      const width = window.innerWidth;

      if (width <= 720) {
        setMode("mobile");
      } else if (width <= 1180) {
        setMode("tablet");
      } else {
        setMode("desktop");
      }
    }

    updateMode();
    window.addEventListener("resize", updateMode);

    return () => {
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  return mode;
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function CoreLevelClient({
  subject,
  level,
}: {
  subject: CoreSubject;
  level: PrimaryLevel;
}) {
  const router = useRouter();
  const screenMode = useResponsiveMode();
  const topicStripRef = useRef<HTMLDivElement | null>(null);

  const { status, userId, tokenBalance, dreamGemBalance } =
    useCoreMissionAccess();

  const [topics, setTopics] = useState<CoreTopic[]>([]);
  const [quizzes, setQuizzes] = useState<CoreQuiz[]>([]);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const theme = SUBJECT_THEMES[subject];
  const tables = CORE_TABLES[subject];
  const isMobile = screenMode === "mobile";

  useEffect(() => {
    if (status !== "allowed") {
      return;
    }

    let cancelled = false;

    async function loadLevelContent() {
      setLoading(true);
      setLoadError(null);

      const { data: topicData, error: topicError } = await supabase
        .from(tables.topics)
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
          `Could not load the ${theme.name} Primary ${level} topics.`,
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
        .from(tables.quizzes)
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
        .from(tables.attempts)
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
  }, [
    status,
    subject,
    level,
    userId,
    theme.name,
    tables.topics,
    tables.quizzes,
    tables.attempts,
  ]);

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

      if (
        !existing ||
        safeNumber(attempt.percentage) > safeNumber(existing.percentage)
      ) {
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
      ? Math.round((completedQuizCount / visibleQuizzes.length) * 100)
      : 0;

  function selectTopic(topicId: string) {
    setActiveTopicId(topicId);
  }

  function openQuiz(quizId: string) {
    router.push(
      `/learning-missions/core/${subject}/p${level}/quiz/${quizId}`,
    );
  }

  function scrollTopics(direction: "left" | "right") {
    const strip = topicStripRef.current;
    if (!strip) return;

    strip.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  }

  if (status === "checking") {
    return (
      <main style={pageShell(screenMode)}>
        <StatusCard text="Checking Core Missions access..." />
      </main>
    );
  }

  if (status === "locked") {
    return (
      <main style={pageShell(screenMode)}>
        <div style={statusCard}>
          <div style={statusIcon}>🔒</div>
          <h1 style={statusTitle}>Core Missions Locked</h1>
          <p style={statusText}>
            Sign in with an account that has access to Core Missions.
          </p>

          <div style={statusActions}>
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={{
                ...primaryButton,
                background: theme.button,
              }}
            >
              Log In
            </button>

            <button
              type="button"
              onClick={() => router.push("/learning-missions")}
              style={secondaryButton}
            >
              Exit
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageShell(screenMode)}>
      <header style={header(screenMode)}>
        <button
          type="button"
          onClick={() => router.push("/learning-missions/core")}
          style={backButton(screenMode)}
        >
          ← {isMobile ? "Core" : "Core Missions"}
        </button>

        <div style={headerTitle(screenMode)}>
          <p style={{ ...headerEyebrow, color: theme.accent }}>
            CORE MISSIONS
          </p>
          <p style={headerSubtitle}>
            {theme.name} · Primary {level}
          </p>
        </div>

        <div style={balanceArea(screenMode)}>
          <div
            style={{
              ...balancePill(screenMode),
              borderColor: "rgba(250,204,21,0.26)",
              background: "rgba(250,204,21,0.07)",
            }}
            title="Dream Tokens"
          >
            <span style={{ color: "#facc15" }}>✦</span>
            {tokenBalance} DT
          </div>

          <div
            style={{
              ...balancePill(screenMode),
              borderColor: "rgba(216,180,254,0.28)",
              background: "rgba(168,85,247,0.09)",
            }}
            title="Dream Gems"
          >
            <span style={{ color: "#d8b4fe" }}>◆</span>
            {dreamGemBalance} DG
          </div>

          <button
            type="button"
            onClick={() => router.push("/learning-missions/core/rover")}
            style={roverButton(screenMode, theme)}
          >
            {isMobile ? "Rover ›" : "My Rover ›"}
          </button>
        </div>
      </header>

      <section style={contentArea(screenMode)}>
        <div style={mainPanel(screenMode)}>
          {loading ? (
            <StatusCard text="Loading curriculum and quizzes..." embedded />
          ) : (
            <>
              <div style={pageHeadingRow(screenMode)}>
                <div style={{ minWidth: 0 }}>
                  <div style={subjectMarker(theme)}>
                    <span style={subjectMarkerIcon(theme)}>{theme.icon}</span>
                    <span>
                      {theme.name.toUpperCase()} · PRIMARY {level}
                    </span>
                  </div>

                  <h1 style={pageTitle(screenMode)}>
                    {theme.name} Mission Bank
                  </h1>

                  <p style={pageDescription(screenMode)}>
                    Choose a topic, then select a focused mission or
                    mixed-topic assessment.
                  </p>
                </div>

                {activeTopic && (
                  <div style={progressCard(screenMode)}>
                    <div style={progressTopRow}>
                      <div>
                        <p style={progressLabel}>TOPIC PROGRESS</p>
                        <p style={progressDescription}>
                          {completedQuizCount} of {visibleQuizzes.length} missions
                          completed
                        </p>
                      </div>

                      <p style={{ ...progressValue, color: theme.accent }}>
                        {progressPercentage}%
                      </p>
                    </div>

                    <div style={progressTrack}>
                      <div
                        style={{
                          ...progressFill,
                          width: `${progressPercentage}%`,
                          background: theme.button,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {loadError && <div style={errorBanner}>{loadError}</div>}

              {topics.length === 0 ? (
                <EmptyState
                  title="No curriculum topics found"
                  description={`Add active topics for ${theme.name} Primary ${level} in the ${tables.topics} table.`}
                />
              ) : (
                <>
                  <div style={topicNavigation}>
                    <button
                      type="button"
                      aria-label="Scroll topics left"
                      onClick={() => scrollTopics("left")}
                      style={topicArrowButton(screenMode)}
                    >
                      ‹
                    </button>

                    <div
                      ref={topicStripRef}
                      className="core-topic-strip"
                      style={topicStrip}
                      role="tablist"
                      aria-label={`${theme.name} Primary ${level} topics`}
                    >
                      {topics.map((topic) => {
                        const isActive = topic.id === activeTopic?.id;
                        const publishedCount = quizzes.filter(
                          (quiz) => quiz.topic_id === topic.id,
                        ).length;
                        const completedForTopic = quizzes
                          .filter((quiz) => quiz.topic_id === topic.id)
                          .filter((quiz) => bestAttemptByQuiz.has(quiz.id)).length;

                        return (
                          <button
                            key={topic.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => selectTopic(topic.id)}
                            className="core-topic-tab"
                            style={topicTab(isActive, theme, screenMode)}
                          >
                            <span style={topicIcon(isActive, theme)}>
                              {topic.icon || theme.icon}
                            </span>

                            <span style={topicText}>
                              <strong style={topicName}>
                                {topic.short_title}
                              </strong>

                              <small style={topicCount}>
                                {completedForTopic}/{publishedCount} completed
                              </small>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      aria-label="Scroll topics right"
                      onClick={() => scrollTopics("right")}
                      style={topicArrowButton(screenMode)}
                    >
                      ›
                    </button>
                  </div>

                  {activeTopic && (
                    <div style={topicHeading(screenMode)}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ ...topicEyebrow, color: theme.accent }}>
                          {activeTopic.is_assessment_topic
                            ? "MIXED-TOPIC ASSESSMENTS"
                            : "TOPIC MISSION BANK"}
                        </p>

                        <h2 style={topicTitle(screenMode)}>
                          {activeTopic.title}
                        </h2>

                        <p style={topicDescription}>
                          {activeTopic.description ||
                            "Focused practice for this curriculum topic."}
                        </p>
                      </div>

                      <div style={topicSummary(theme)}>
                        <span>{visibleQuizzes.length} published</span>
                        <span style={summaryDivider}>•</span>
                        <span>{activeTopic.quiz_target} target</span>
                      </div>
                    </div>
                  )}

                  {visibleQuizzes.length === 0 ? (
                    <EmptyState
                      title="No published missions yet"
                      description="This topic is ready, but it does not have a published quiz in Supabase yet."
                    />
                  ) : (
                    <div style={quizGrid(screenMode)}>
                      {visibleQuizzes.map((quiz) => {
                        const attempt = bestAttemptByQuiz.get(quiz.id);
                        const completed = Boolean(attempt);
                        const percentage = attempt
                          ? Math.round(safeNumber(attempt.percentage))
                          : 0;

                        return (
                          <button
                            key={quiz.id}
                            type="button"
                            onClick={() => openQuiz(quiz.id)}
                            className="core-quiz-card"
                            style={quizCard(completed, theme, screenMode)}
                          >
                            <div style={quizCardTop}>
                              <span style={quizTypeBadge(theme)}>
                                {QUIZ_TYPE_NAMES[quiz.quiz_type] ??
                                  quiz.quiz_type}
                              </span>

                              {completed ? (
                                <span style={completedBadge}>✓ Completed</span>
                              ) : (
                                <span style={difficultyBadge}>
                                  Level {quiz.difficulty}
                                </span>
                              )}
                            </div>

                            <h3 className="core-clamp-2" style={quizTitle}>
                              {quiz.title}
                            </h3>

                            <p className="core-clamp-3" style={quizDescription}>
                              {quiz.description ||
                                "Complete this mission and review your answers."}
                            </p>

                            <div style={quizMeta}>
                              <span style={metaItem}>
                                <span style={metaIcon}>?</span>
                                {quiz.question_count} questions
                              </span>

                              <span style={metaItem}>
                                <span style={metaIcon}>◷</span>
                                {quiz.estimated_minutes} min
                              </span>
                            </div>

                            <div style={rewardRow}>
                              <span>{quiz.reward_tokens} DT</span>
                              <span style={summaryDivider}>•</span>
                              <span>{quiz.reward_gems} DG</span>
                            </div>

                            {attempt ? (
                              <div style={attemptResult}>
                                <span style={scoreCircle}>{percentage}%</span>
                                <span>
                                  Best score · {attempt.correct_count}/
                                  {attempt.total_questions} correct
                                </span>
                              </div>
                            ) : (
                              <div style={notStartedMessage}>
                                Ready when you are.
                              </div>
                            )}

                            <div
                              style={{
                                ...quizAction,
                                background: completed
                                  ? "linear-gradient(135deg, #34d399, #10b981)"
                                  : theme.button,
                                color: completed ? "#042f2e" : "#ffffff",
                              }}
                            >
                              {completed ? "Replay Mission" : "Start Mission"}
                              <span aria-hidden="true">→</span>
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

      <style jsx>{`
        .core-topic-strip {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .core-topic-strip::-webkit-scrollbar {
          display: none;
        }

        .core-topic-tab,
        .core-quiz-card {
          transition:
            transform 170ms ease,
            border-color 170ms ease,
            background 170ms ease,
            box-shadow 170ms ease;
        }

        .core-topic-tab:hover {
          transform: translateY(-2px);
        }

        .core-quiz-card:hover {
          transform: translateY(-4px);
          border-color: ${theme.accentBorder};
          box-shadow:
            0 20px 42px rgba(0, 0, 0, 0.3),
            0 0 28px ${theme.accentSoft};
        }

        .core-topic-tab:focus-visible,
        .core-quiz-card:focus-visible {
          outline: 3px solid ${theme.accent};
          outline-offset: 3px;
        }

        .core-clamp-2 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        .core-clamp-3 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .core-topic-tab,
          .core-quiz-card {
            transition: none;
          }

          .core-topic-tab:hover,
          .core-quiz-card:hover {
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={emptyState}>
      <div style={emptyIcon}>◇</div>
      <h2 style={emptyTitle}>{title}</h2>
      <p style={emptyDescription}>{description}</p>
    </div>
  );
}

function StatusCard({
  text,
  embedded = false,
}: {
  text: string;
  embedded?: boolean;
}) {
  return (
    <div
      style={{
        ...statusCard,
        ...(embedded
          ? {
              margin: "12vh auto 0",
              background: "rgba(255,255,255,0.045)",
            }
          : {}),
      }}
    >
      <div style={loadingDot} />
      <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>{text}</p>
    </div>
  );
}

function pageShell(mode: ScreenMode): CSSProperties {
  return {
    minHeight: "100dvh",
    color: "#f8fafc",
    fontFamily: "Arial, Helvetica, sans-serif",
    backgroundImage: `
      linear-gradient(180deg, rgba(2,8,19,0.48), rgba(2,8,19,0.86)),
      url("/activities/learning-missions/core/skyforge-hangar-bg.png")
    `,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: mode === "mobile" ? "scroll" : "fixed",
  };
}

function header(mode: ScreenMode): CSSProperties {
  return {
    position: "sticky",
    top: 0,
    zIndex: 20,
    minHeight: mode === "mobile" ? "64px" : "70px",
    padding:
      mode === "mobile"
        ? "8px 10px"
        : mode === "tablet"
          ? "9px 14px"
          : "10px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: mode === "mobile" ? "wrap" : "nowrap",
    gap: mode === "mobile" ? "8px" : "14px",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    background:
      "linear-gradient(180deg, rgba(3,10,24,0.9), rgba(3,10,24,0.68))",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
}

function headerTitle(mode: ScreenMode): CSSProperties {
  return {
    textAlign: "center",
    order: mode === "mobile" ? 3 : 2,
    width: mode === "mobile" ? "100%" : "auto",
    paddingBottom: mode === "mobile" ? "2px" : 0,
  };
}

const headerEyebrow: CSSProperties = {
  margin: 0,
  fontSize: "10px",
  letterSpacing: "0.2em",
  fontWeight: 900,
};

const headerSubtitle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "12px",
  color: "rgba(226,232,240,0.68)",
};

function balanceArea(mode: ScreenMode): CSSProperties {
  return {
    order: mode === "mobile" ? 2 : 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: mode === "mobile" ? "5px" : "8px",
    minWidth: 0,
  };
}

function backButton(mode: ScreenMode): CSSProperties {
  return {
    order: 1,
    minHeight: mode === "mobile" ? "34px" : "38px",
    borderRadius: "999px",
    border: "1px solid rgba(148,163,184,0.24)",
    background: "rgba(255,255,255,0.055)",
    color: "#f8fafc",
    padding: mode === "mobile" ? "0 10px" : "0 14px",
    cursor: "pointer",
    fontSize: mode === "mobile" ? "11px" : "12px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

function balancePill(mode: ScreenMode): CSSProperties {
  return {
    minHeight: mode === "mobile" ? "32px" : "37px",
    borderRadius: "999px",
    border: "1px solid",
    padding: mode === "mobile" ? "0 7px" : "0 11px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: mode === "mobile" ? "9px" : "11px",
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function roverButton(
  mode: ScreenMode,
  theme: SubjectTheme,
): CSSProperties {
  return {
    minHeight: mode === "mobile" ? "32px" : "37px",
    borderRadius: "999px",
    border: `1px solid ${theme.accentBorder}`,
    background: theme.accentSoft,
    color: "#f8fafc",
    padding: mode === "mobile" ? "0 8px" : "0 13px",
    cursor: "pointer",
    fontSize: mode === "mobile" ? "9px" : "11px",
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function contentArea(mode: ScreenMode): CSSProperties {
  return {
    padding:
      mode === "mobile"
        ? "10px 8px 22px"
        : mode === "tablet"
          ? "14px 14px 28px"
          : "20px 24px 36px",
  };
}

function mainPanel(mode: ScreenMode): CSSProperties {
  return {
    width: "min(1420px, 100%)",
    minHeight:
      mode === "mobile"
        ? "calc(100dvh - 118px)"
        : "calc(100dvh - 126px)",
    margin: "0 auto",
    overflow: "hidden",
    borderRadius:
      mode === "mobile" ? "20px" : mode === "tablet" ? "24px" : "30px",
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "linear-gradient(145deg, rgba(4,12,28,0.94), rgba(7,18,39,0.91))",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    padding:
      mode === "mobile"
        ? "15px"
        : mode === "tablet"
          ? "20px"
          : "28px",
    boxShadow:
      "0 30px 80px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.035)",
  };
}

function pageHeadingRow(mode: ScreenMode): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns:
      mode === "mobile"
        ? "1fr"
        : mode === "tablet"
          ? "minmax(0,1fr) minmax(260px,0.7fr)"
          : "minmax(0,1fr) minmax(320px,0.62fr)",
    alignItems: "end",
    gap: mode === "mobile" ? "16px" : "24px",
  };
}

function subjectMarker(theme: SubjectTheme): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "9px",
    color: theme.accent,
    fontSize: "10px",
    letterSpacing: "0.17em",
    fontWeight: 900,
  };
}

function subjectMarkerIcon(theme: SubjectTheme): CSSProperties {
  return {
    minWidth: "28px",
    height: "28px",
    borderRadius: "9px",
    border: `1px solid ${theme.accentBorder}`,
    background: theme.accentSoft,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: 0,
    fontSize: "13px",
  };
}

function pageTitle(mode: ScreenMode): CSSProperties {
  return {
    margin: "10px 0 0",
    fontSize:
      mode === "mobile"
        ? "clamp(30px,10vw,40px)"
        : mode === "tablet"
          ? "clamp(38px,5vw,50px)"
          : "clamp(44px,4vw,58px)",
    lineHeight: 0.98,
    letterSpacing: "-0.045em",
  };
}

function pageDescription(mode: ScreenMode): CSSProperties {
  return {
    margin: "12px 0 0",
    maxWidth: "720px",
    color: "rgba(226,232,240,0.62)",
    fontSize: mode === "mobile" ? "13px" : "15px",
    lineHeight: 1.6,
  };
}

function progressCard(mode: ScreenMode): CSSProperties {
  return {
    width: "100%",
    borderRadius: "18px",
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(255,255,255,0.035)",
    padding: mode === "mobile" ? "14px" : "16px 18px",
  };
}

const progressTopRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
};

const progressLabel: CSSProperties = {
  margin: 0,
  color: "rgba(226,232,240,0.74)",
  fontSize: "9px",
  letterSpacing: "0.16em",
  fontWeight: 900,
};

const progressDescription: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(226,232,240,0.5)",
  fontSize: "11px",
  lineHeight: 1.4,
};

const progressValue: CSSProperties = {
  margin: 0,
  fontSize: "27px",
  fontWeight: 900,
  lineHeight: 1,
};

const progressTrack: CSSProperties = {
  width: "100%",
  height: "7px",
  marginTop: "14px",
  overflow: "hidden",
  borderRadius: "999px",
  background: "rgba(148,163,184,0.14)",
};

const progressFill: CSSProperties = {
  height: "100%",
  minWidth: "0",
  borderRadius: "999px",
  transition: "width 240ms ease",
};

const topicNavigation: CSSProperties = {
  marginTop: "24px",
  display: "grid",
  gridTemplateColumns: "auto minmax(0,1fr) auto",
  alignItems: "center",
  gap: "8px",
};

const topicStrip: CSSProperties = {
  minWidth: 0,
  display: "flex",
  gap: "9px",
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  scrollSnapType: "x proximity",
  padding: "2px 1px 7px",
};

function topicArrowButton(mode: ScreenMode): CSSProperties {
  return {
    width: mode === "mobile" ? "32px" : "38px",
    height: mode === "mobile" ? "52px" : "60px",
    borderRadius: "13px",
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(255,255,255,0.035)",
    color: "rgba(248,250,252,0.84)",
    cursor: "pointer",
    fontSize: "24px",
    fontWeight: 600,
  };
}

function topicTab(
  isActive: boolean,
  theme: SubjectTheme,
  mode: ScreenMode,
): CSSProperties {
  return {
    flex: "0 0 auto",
    width: mode === "mobile" ? "170px" : "215px",
    minHeight: mode === "mobile" ? "58px" : "64px",
    scrollSnapAlign: "start",
    borderRadius: "15px",
    border: isActive
      ? `1px solid ${theme.accentBorder}`
      : "1px solid rgba(148,163,184,0.14)",
    background: isActive
      ? theme.accentSoft
      : "rgba(255,255,255,0.028)",
    color: "#f8fafc",
    padding: mode === "mobile" ? "9px 10px" : "11px 12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: isActive
      ? `inset 0 0 24px ${theme.accentSoft}`
      : "none",
  };
}

function topicIcon(
  isActive: boolean,
  theme: SubjectTheme,
): CSSProperties {
  return {
    flex: "0 0 auto",
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    background: isActive
      ? "rgba(255,255,255,0.08)"
      : "rgba(148,163,184,0.08)",
    color: isActive ? theme.accent : "rgba(226,232,240,0.66)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: 900,
  };
}

const topicText: CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const topicName: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const topicCount: CSSProperties = {
  color: "rgba(226,232,240,0.48)",
  fontSize: "10px",
};

function topicHeading(mode: ScreenMode): CSSProperties {
  return {
    marginTop: mode === "mobile" ? "20px" : "25px",
    paddingTop: mode === "mobile" ? "18px" : "22px",
    borderTop: "1px solid rgba(148,163,184,0.12)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: mode === "mobile" ? "flex-start" : "flex-end",
    flexDirection: mode === "mobile" ? "column" : "row",
    gap: "14px",
  };
}

const topicEyebrow: CSSProperties = {
  margin: 0,
  fontSize: "9px",
  letterSpacing: "0.16em",
  fontWeight: 900,
};

function topicTitle(mode: ScreenMode): CSSProperties {
  return {
    margin: "7px 0 0",
    fontSize: mode === "mobile" ? "26px" : "clamp(28px,3vw,38px)",
    lineHeight: 1.08,
    letterSpacing: "-0.025em",
  };
}

const topicDescription: CSSProperties = {
  margin: "9px 0 0",
  maxWidth: "860px",
  color: "rgba(226,232,240,0.58)",
  fontSize: "13px",
  lineHeight: 1.55,
};

function topicSummary(theme: SubjectTheme): CSSProperties {
  return {
    flex: "0 0 auto",
    borderRadius: "999px",
    border: `1px solid ${theme.accentBorder}`,
    background: theme.accentSoft,
    padding: "8px 12px",
    color: "rgba(248,250,252,0.84)",
    fontSize: "10px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

const summaryDivider: CSSProperties = {
  margin: "0 6px",
  color: "rgba(226,232,240,0.34)",
};

function quizGrid(mode: ScreenMode): CSSProperties {
  return {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns:
      mode === "mobile"
        ? "1fr"
        : mode === "tablet"
          ? "repeat(2,minmax(0,1fr))"
          : "repeat(3,minmax(0,1fr))",
    gap: mode === "mobile" ? "12px" : "15px",
  };
}

function quizCard(
  completed: boolean,
  theme: SubjectTheme,
  mode: ScreenMode,
): CSSProperties {
  return {
    minWidth: 0,
    minHeight: mode === "mobile" ? "250px" : "286px",
    borderRadius: mode === "mobile" ? "17px" : "20px",
    border: completed
      ? "1px solid rgba(52,211,153,0.32)"
      : "1px solid rgba(148,163,184,0.15)",
    background: completed
      ? "linear-gradient(180deg, rgba(11,48,48,0.6), rgba(7,22,34,0.92))"
      : "linear-gradient(180deg, rgba(17,33,59,0.75), rgba(7,20,40,0.94))",
    color: "#f8fafc",
    padding: mode === "mobile" ? "16px" : "19px",
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: completed
      ? "inset 0 1px 0 rgba(52,211,153,0.05)"
      : `inset 0 1px 0 ${theme.accentSoft}`,
  };
}

const quizCardTop: CSSProperties = {
  minHeight: "25px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

function quizTypeBadge(theme: SubjectTheme): CSSProperties {
  return {
    maxWidth: "65%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: "999px",
    border: `1px solid ${theme.accentBorder}`,
    background: theme.accentSoft,
    color: theme.accent,
    padding: "5px 8px",
    fontSize: "8px",
    letterSpacing: "0.08em",
    fontWeight: 900,
    textTransform: "uppercase",
  };
}

const difficultyBadge: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(148,163,184,0.16)",
  background: "rgba(148,163,184,0.07)",
  color: "rgba(226,232,240,0.6)",
  padding: "5px 8px",
  fontSize: "8px",
  letterSpacing: "0.06em",
  fontWeight: 900,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const completedBadge: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(52,211,153,0.24)",
  background: "rgba(52,211,153,0.09)",
  color: "#6ee7b7",
  padding: "5px 8px",
  fontSize: "8px",
  letterSpacing: "0.05em",
  fontWeight: 900,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const quizTitle: CSSProperties = {
  margin: "17px 0 0",
  minHeight: "49px",
  fontSize: "21px",
  lineHeight: 1.16,
  letterSpacing: "-0.02em",
};

const quizDescription: CSSProperties = {
  margin: "9px 0 0",
  minHeight: "58px",
  color: "rgba(226,232,240,0.61)",
  fontSize: "13px",
  lineHeight: 1.48,
};

const quizMeta: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  flexWrap: "wrap",
  gap: "9px 13px",
  color: "rgba(226,232,240,0.68)",
  fontSize: "11px",
  fontWeight: 700,
};

const metaItem: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const metaIcon: CSSProperties = {
  width: "18px",
  height: "18px",
  borderRadius: "6px",
  background: "rgba(148,163,184,0.09)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(226,232,240,0.7)",
  fontSize: "9px",
};

const rewardRow: CSSProperties = {
  marginTop: "10px",
  color: "rgba(226,232,240,0.43)",
  fontSize: "10px",
  fontWeight: 800,
};

const attemptResult: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color: "#a7f3d0",
  fontSize: "11px",
  fontWeight: 800,
};

const scoreCircle: CSSProperties = {
  minWidth: "38px",
  height: "26px",
  borderRadius: "999px",
  border: "1px solid rgba(52,211,153,0.22)",
  background: "rgba(52,211,153,0.09)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
};

const notStartedMessage: CSSProperties = {
  marginTop: "14px",
  color: "rgba(226,232,240,0.38)",
  fontSize: "11px",
};

const quizAction: CSSProperties = {
  marginTop: "16px",
  minHeight: "43px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontSize: "12px",
  fontWeight: 900,
  boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
};

const emptyState: CSSProperties = {
  marginTop: "22px",
  minHeight: "240px",
  borderRadius: "20px",
  border: "1px dashed rgba(148,163,184,0.2)",
  background: "rgba(255,255,255,0.025)",
  padding: "30px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const emptyIcon: CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(148,163,184,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(226,232,240,0.54)",
  fontSize: "22px",
};

const emptyTitle: CSSProperties = {
  margin: "15px 0 0",
  fontSize: "24px",
};

const emptyDescription: CSSProperties = {
  margin: "9px 0 0",
  maxWidth: "620px",
  color: "rgba(226,232,240,0.56)",
  fontSize: "13px",
  lineHeight: 1.55,
};

const errorBanner: CSSProperties = {
  marginTop: "17px",
  borderRadius: "14px",
  border: "1px solid rgba(248,113,113,0.28)",
  background: "rgba(239,68,68,0.09)",
  color: "#fecaca",
  padding: "12px 14px",
  fontSize: "12px",
};

const statusCard: CSSProperties = {
  width: "min(620px, calc(100% - 28px))",
  margin: "20vh auto 0",
  borderRadius: "22px",
  border: "1px solid rgba(148,163,184,0.18)",
  background:
    "linear-gradient(145deg, rgba(4,12,28,0.94), rgba(7,18,39,0.96))",
  padding: "28px",
  textAlign: "center",
  boxShadow: "0 28px 70px rgba(0,0,0,0.4)",
};

const statusIcon: CSSProperties = {
  width: "56px",
  height: "56px",
  margin: "0 auto",
  borderRadius: "18px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(148,163,184,0.07)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const statusTitle: CSSProperties = {
  margin: "17px 0 0",
  fontSize: "30px",
};

const statusText: CSSProperties = {
  margin: "11px auto 0",
  maxWidth: "480px",
  color: "rgba(226,232,240,0.62)",
  fontSize: "14px",
  lineHeight: 1.55,
};

const statusActions: CSSProperties = {
  marginTop: "20px",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "10px",
};

const primaryButton: CSSProperties = {
  minHeight: "43px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "white",
  padding: "0 19px",
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryButton: CSSProperties = {
  ...primaryButton,
  border: "1px solid rgba(148,163,184,0.2)",
  background: "rgba(255,255,255,0.045)",
};

const loadingDot: CSSProperties = {
  width: "12px",
  height: "12px",
  margin: "0 auto 12px",
  borderRadius: "999px",
  background: "#67e8f9",
  boxShadow: "0 0 20px rgba(103,232,249,0.8)",
};
