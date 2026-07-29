"use client";

import { useEffect, useMemo, useState } from "react";
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

const SUBJECT_LABELS: Record<CoreSubject, string> = {
  english: "English",
  math: "Mathematics",
};

const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  quick: "Quick Practice",
  standard: "Standard Mission",
  challenge: "Challenge Mission",
  assessment: "Assessment Paper",
};

function useResponsiveMode() {
  const [mode, setMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 720) setMode("mobile");
      else if (width <= 1180 || height > width) setMode("tablet");
      else setMode("desktop");
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
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
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";
  const { status, userId, tokenBalance, dreamGemBalance } = useCoreMissionAccess();

  const [topics, setTopics] = useState<CoreTopic[]>([]);
  const [quizzes, setQuizzes] = useState<CoreQuiz[]>([]);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [quizPage, setQuizPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const subjectLabel = SUBJECT_LABELS[subject];
  const quizzesPerPage = isMobile ? 4 : isCompact ? 6 : 8;

  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? null;

  const topicQuizzes = useMemo(
    () => quizzes.filter((quiz) => quiz.topic_id === activeTopicId),
    [activeTopicId, quizzes],
  );

  const pageCount = Math.max(1, Math.ceil(topicQuizzes.length / quizzesPerPage));
  const visibleQuizzes = topicQuizzes.slice(
    quizPage * quizzesPerPage,
    quizPage * quizzesPerPage + quizzesPerPage,
  );

  const bestAttemptByQuiz = useMemo(() => {
    const map = new Map<string, AttemptSummary>();

    for (const attempt of attempts) {
      const current = map.get(attempt.quiz_id);
      if (!current || attempt.percentage > current.percentage) {
        map.set(attempt.quiz_id, attempt);
      }
    }

    return map;
  }, [attempts]);

  useEffect(() => {
    if (status !== "allowed") return;
    void loadLevelContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, subject, level, userId]);

  useEffect(() => {
    setQuizPage(0);
  }, [activeTopicId, quizzesPerPage]);

  async function loadLevelContent() {
    setLoading(true);
    setLoadError(null);

    const { data: topicData, error: topicError } = await supabase
      .from("core_topics")
      .select(
        "id, subject, primary_level, slug, title, short_title, description, icon, accent, quiz_target, sort_order, is_assessment_topic",
      )
      .eq("subject", subject)
      .eq("primary_level", level)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (topicError) {
      console.warn("Could not load Core topics:", topicError.message);
      setLoadError("Could not load the curriculum topics for this level.");
      setLoading(false);
      return;
    }

    const resolvedTopics = (topicData ?? []) as CoreTopic[];
    setTopics(resolvedTopics);

    if (resolvedTopics.length === 0) {
      setQuizzes([]);
      setAttempts([]);
      setActiveTopicId(null);
      setLoading(false);
      return;
    }

    const topicIds = resolvedTopics.map((topic) => topic.id);

    const { data: quizData, error: quizError } = await supabase
      .from("core_quizzes")
      .select(
        "id, topic_id, code, title, description, quiz_type, difficulty, question_count, estimated_minutes, quiz_order, reward_tokens, reward_gems",
      )
      .in("topic_id", topicIds)
      .eq("is_published", true)
      .order("quiz_order", { ascending: true });

    if (quizError) {
      console.warn("Could not load Core quizzes:", quizError.message);
      setLoadError("The topics loaded, but the quiz list could not be loaded.");
      setQuizzes([]);
      setAttempts([]);
      setLoading(false);
      return;
    }

    const resolvedQuizzes = (quizData ?? []) as CoreQuiz[];
    setQuizzes(resolvedQuizzes);
    setActiveTopicId((current) =>
      current && resolvedTopics.some((topic) => topic.id === current)
        ? current
        : resolvedTopics[0].id,
    );

    if (userId && resolvedQuizzes.length > 0) {
      const quizIds = resolvedQuizzes.map((quiz) => quiz.id);
      const { data: attemptData, error: attemptError } = await supabase
        .from("core_quiz_attempts")
        .select("quiz_id, percentage, correct_count, total_questions, submitted_at")
        .eq("user_id", userId)
        .eq("status", "marked")
        .in("quiz_id", quizIds)
        .order("submitted_at", { ascending: false });

      if (attemptError) {
        console.warn("Could not load Core quiz attempts:", attemptError.message);
        setAttempts([]);
      } else {
        setAttempts((attemptData ?? []) as AttemptSummary[]);
      }
    } else {
      setAttempts([]);
    }

    setLoading(false);
  }

  function openQuiz(quizId: string) {
    router.push(`/learning-missions/core/${subject}/p${level}/quiz/${quizId}`);
  }

  const completedInTopic = topicQuizzes.filter((quiz) => bestAttemptByQuiz.has(quiz.id)).length;
  const progressPercentage = topicQuizzes.length
    ? Math.round((completedInTopic / topicQuizzes.length) * 100)
    : 0;

  return (
    <main style={pageShell}>
      <header style={headerStyle(isMobile)}>
        <button
          type="button"
          onClick={() => router.push("/learning-missions/core")}
          style={pillButton}
        >
          ← Core
        </button>

        {!isMobile && (
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <p style={headerEyebrow}>CORE MISSIONS</p>
            <p style={headerSubtitle}>{subjectLabel} · Primary {level}</p>
          </div>
        )}

        <div style={headerActions}>
          <div style={{ ...tokenPill, ...(isMobile ? compactPill : {}) }}>
            <span style={{ color: "#ffd76a" }}>✦</span>
            {tokenBalance} DT
          </div>
          <div style={{ ...gemPill, ...(isMobile ? compactPill : {}) }}>
            <span style={{ color: "#e7b7ff" }}>◆</span>
            {dreamGemBalance} DG
          </div>
          <button
            type="button"
            onClick={() => router.push("/learning-missions/core/rover")}
            style={{ ...roverButton, ...(isMobile ? mobileRoverButton : {}) }}
          >
            {isMobile ? "Rover ›" : "My Rover ›"}
          </button>
        </div>
      </header>

      <section style={contentSection(isMobile, isCompact)}>
        <div style={glassPanel(isMobile, isCompact)}>
          {status === "checking" && <CenteredMessage text="Checking Core Missions access..." />}

          {status === "locked" && (
            <div style={centeredFill}>
              <div style={lockedCard}>
                <h2 style={{ margin: 0 }}>Core Missions Locked</h2>
                <p style={lockedText}>Sign in with an account that has Core Missions access.</p>
                <a href="/login" style={{ ...primaryAction, textDecoration: "none", marginTop: "18px" }}>
                  Log In
                </a>
              </div>
            </div>
          )}

          {status === "allowed" && loading && <CenteredMessage text="Loading curriculum and quizzes..." />}

          {status === "allowed" && !loading && (
            <div style={levelLayout}>
              <div style={titleRow(isMobile)}>
                <div style={{ minWidth: 0 }}>
                  <p style={sectionEyebrow}>{subjectLabel.toUpperCase()} · PRIMARY {level}</p>
                  <h1 style={pageTitle(isMobile)}>{subjectLabel} Mission Bank</h1>
                  <p style={pageDescription(isMobile)}>
                    Choose a topic, then select a focused quiz or mixed assessment paper.
                  </p>
                </div>

                {!isMobile && activeTopic && (
                  <div style={progressCard}>
                    <p style={progressLabel}>TOPIC PROGRESS</p>
                    <p style={progressValue}>{progressPercentage}%</p>
                    <p style={progressMeta}>
                      {completedInTopic}/{topicQuizzes.length} published quizzes completed
                    </p>
                  </div>
                )}
              </div>

              {loadError && <div style={errorBanner}>{loadError}</div>}

              {topics.length === 0 ? (
                <div style={emptyState}>
                  <h2 style={{ margin: 0 }}>This level is ready for content setup.</h2>
                  <p style={{ margin: "10px 0 0", opacity: 0.7 }}>
                    Add curriculum topics and published quizzes in Supabase for {subjectLabel} Primary {level}.
                  </p>
                </div>
              ) : (
                <>
                  <div style={topicTabs}>
                    {topics.map((topic) => {
                      const active = topic.id === activeTopicId;
                      const publishedCount = quizzes.filter((quiz) => quiz.topic_id === topic.id).length;

                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setActiveTopicId(topic.id)}
                          style={topicTab(active, topic.accent || "#7ee8ff")}
                        >
                          <span style={topicIcon}>{topic.icon || "•"}</span>
                          <span style={{ minWidth: 0 }}>
                            <strong style={topicTabTitle}>{topic.short_title}</strong>
                            <small style={topicTabMeta}>
                              {publishedCount}/{topic.quiz_target} quizzes
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeTopic && (
                    <div style={topicSummary(isMobile)}>
                      <div style={{ minWidth: 0 }}>
                        <p style={activeTopicEyebrow}>
                          {activeTopic.is_assessment_topic ? "MIXED-TOPIC ASSESSMENTS" : "TOPIC QUIZ BANK"}
                        </p>
                        <h2 style={activeTopicTitle}>{activeTopic.title}</h2>
                        <p style={activeTopicDescription}>
                          {activeTopic.description || "Focused practice for this curriculum area."}
                        </p>
                      </div>

                      <div style={paginationWrap}>
                        <button
                          type="button"
                          disabled={quizPage <= 0}
                          onClick={() => setQuizPage((current) => Math.max(0, current - 1))}
                          style={pageButton(quizPage <= 0)}
                        >
                          ‹
                        </button>
                        <span style={pageCounter}>{quizPage + 1}/{pageCount}</span>
                        <button
                          type="button"
                          disabled={quizPage >= pageCount - 1}
                          onClick={() =>
                            setQuizPage((current) => Math.min(pageCount - 1, current + 1))
                          }
                          style={pageButton(quizPage >= pageCount - 1)}
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={quizArea}>
                    {visibleQuizzes.length === 0 ? (
                      <div style={emptyQuizState}>
                        <h3 style={{ margin: 0 }}>No published quizzes yet</h3>
                        <p style={{ margin: "8px 0 0", opacity: 0.68 }}>
                          Target for this topic: {activeTopic?.quiz_target ?? 0} quizzes.
                        </p>
                      </div>
                    ) : (
                      <div style={quizGrid(isMobile, isCompact)}>
                        {visibleQuizzes.map((quiz) => {
                          const attempt = bestAttemptByQuiz.get(quiz.id);
                          const completed = Boolean(attempt);

                          return (
                            <button
                              key={quiz.id}
                              type="button"
                              onClick={() => openQuiz(quiz.id)}
                              style={quizCard(completed, quiz.quiz_type === "assessment")}
                            >
                              <div style={quizCardTop}>
                                <span style={quizTypeBadge(quiz.quiz_type)}>
                                  {QUIZ_TYPE_LABELS[quiz.quiz_type]}
                                </span>
                                <span style={difficultyBadge}>Level {quiz.difficulty}</span>
                              </div>

                              <h3 style={quizTitle}>{quiz.title}</h3>
                              <p style={quizDescription}>
                                {quiz.description || "Practise this skill and review your answers."}
                              </p>

                              <div style={quizMetaRow}>
                                <span>{quiz.question_count} questions</span>
                                <span>•</span>
                                <span>{quiz.estimated_minutes} min</span>
                              </div>

                              {attempt && (
                                <div style={attemptRow}>
                                  Best: {Math.round(attempt.percentage)}% · {attempt.correct_count}/{attempt.total_questions}
                                </div>
                              )}

                              <div style={quizAction(completed)}>
                                {completed ? "Replay Quiz" : "Start Quiz"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div style={centeredFill}>
      <div style={messageCard}>{text}</div>
    </div>
  );
}

const pageShell: CSSProperties = {
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  backgroundImage: `
    linear-gradient(180deg, rgba(2,8,19,0.28), rgba(2,8,19,0.68)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
};

function headerStyle(isMobile: boolean): CSSProperties {
  return {
    height: isMobile ? "58px" : "68px",
    padding: isMobile ? "8px 10px" : "10px 18px",
    display: "grid",
    gridTemplateColumns: isMobile ? "auto minmax(0,1fr)" : "1fr auto 1fr",
    alignItems: "center",
    gap: "10px",
    textShadow: "0 2px 12px rgba(0,0,0,0.72)",
  };
}

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
  opacity: 0.72,
};

const headerActions: CSSProperties = {
  justifySelf: "end",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

function contentSection(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    height: `calc(100dvh - ${isMobile ? 58 : 68}px)`,
    padding: isMobile ? "8px" : isCompact ? "12px" : "16px 24px 24px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function glassPanel(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    width: isMobile || isCompact ? "100%" : "min(1480px, calc(100vw - 56px))",
    height: isMobile || isCompact ? "100%" : "min(800px, calc(100dvh - 104px))",
    overflow: "hidden",
    borderRadius: isMobile ? "18px" : "26px",
    border: "1px solid rgba(126,232,255,0.32)",
    background: "linear-gradient(145deg, rgba(5,18,42,0.66), rgba(8,26,58,0.82))",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 0 34px rgba(83,215,255,0.12), 0 22px 58px rgba(0,0,0,0.28)",
    padding: isMobile ? "10px" : isCompact ? "16px" : "18px 20px 20px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  };
}

const levelLayout: CSSProperties = {
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

function titleRow(isMobile: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "16px",
    flexShrink: 0,
    padding: isMobile ? "2px 2px 8px" : "0 2px 12px",
  };
}

const sectionEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "10px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

function pageTitle(isMobile: boolean): CSSProperties {
  return {
    margin: "4px 0 0",
    fontSize: isMobile ? "24px" : "clamp(32px,3vw,46px)",
    lineHeight: 1.05,
  };
}

function pageDescription(isMobile: boolean): CSSProperties {
  return {
    margin: "6px 0 0",
    color: "rgba(255,255,255,0.64)",
    fontSize: isMobile ? "11px" : "14px",
  };
}

const progressCard: CSSProperties = {
  minWidth: "210px",
  borderRadius: "15px",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "rgba(255,255,255,0.055)",
  padding: "10px 14px",
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
  fontSize: "26px",
  fontWeight: 900,
};

const progressMeta: CSSProperties = {
  margin: "2px 0 0",
  color: "rgba(255,255,255,0.56)",
  fontSize: "10px",
};

const topicTabs: CSSProperties = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  overflowY: "hidden",
  padding: "2px 2px 8px",
  flexShrink: 0,
  scrollbarWidth: "thin",
};

function topicTab(active: boolean, accent: string): CSSProperties {
  return {
    minWidth: "170px",
    minHeight: "58px",
    borderRadius: "14px",
    border: active ? `1px solid ${accent}` : "1px solid rgba(126,232,255,0.2)",
    background: active
      ? `linear-gradient(135deg, ${accent}35, rgba(53,197,255,0.18))`
      : "rgba(255,255,255,0.045)",
    color: "white",
    padding: "8px 11px",
    display: "grid",
    gridTemplateColumns: "30px minmax(0,1fr)",
    alignItems: "center",
    gap: "8px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: active ? `0 0 20px ${accent}22` : "none",
    flexShrink: 0,
  };
}

const topicIcon: CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
};

const topicTabTitle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const topicTabMeta: CSSProperties = {
  display: "block",
  marginTop: "3px",
  color: "rgba(255,255,255,0.55)",
  fontSize: "9px",
};

function topicSummary(isMobile: boolean): CSSProperties {
  return {
    minHeight: isMobile ? "74px" : "82px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: isMobile ? "7px 2px" : "8px 4px 10px",
    flexShrink: 0,
  };
}

const activeTopicEyebrow: CSSProperties = {
  margin: 0,
  color: "#ffb8ef",
  fontSize: "9px",
  letterSpacing: "0.15em",
  fontWeight: 900,
};

const activeTopicTitle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "clamp(18px,2.5vh,28px)",
};

const activeTopicDescription: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.6)",
  fontSize: "11px",
  lineHeight: 1.35,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const paginationWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0,
};

function pageButton(disabled: boolean): CSSProperties {
  return {
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.25)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1,
  };
}

const pageCounter: CSSProperties = {
  minWidth: "52px",
  height: "34px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
};

const quizArea: CSSProperties = {
  flex: 1,
  minHeight: 0,
};

function quizGrid(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    height: "100%",
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : isCompact
        ? "repeat(3,minmax(0,1fr))"
        : "repeat(4,minmax(0,1fr))",
    gridTemplateRows: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : "repeat(2,minmax(0,1fr))",
    gap: isMobile ? "7px" : "10px",
  };
}

function quizCard(completed: boolean, assessment: boolean): CSSProperties {
  return {
    minHeight: 0,
    height: "100%",
    borderRadius: "16px",
    border: completed
      ? "1px solid rgba(74,222,128,0.48)"
      : assessment
        ? "1px solid rgba(255,215,106,0.48)"
        : "1px solid rgba(126,232,255,0.28)",
    background: completed
      ? "linear-gradient(180deg, rgba(20,92,60,0.66), rgba(8,35,36,0.82))"
      : assessment
        ? "linear-gradient(180deg, rgba(104,72,19,0.72), rgba(45,28,7,0.86))"
        : "linear-gradient(180deg, rgba(20,58,100,0.72), rgba(8,25,56,0.86))",
    color: "white",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    cursor: "pointer",
    overflow: "hidden",
  };
}

const quizCardTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "6px",
};

function quizTypeBadge(type: QuizType): CSSProperties {
  const accent = type === "assessment" ? "#ffd76a" : type === "challenge" ? "#ff9df0" : "#7ee8ff";
  return {
    minWidth: 0,
    borderRadius: "999px",
    background: `${accent}1f`,
    color: accent,
    padding: "4px 7px",
    fontSize: "8px",
    fontWeight: 900,
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

const difficultyBadge: CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "8px",
  whiteSpace: "nowrap",
};

const quizTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(14px,1.9vh,20px)",
  lineHeight: 1.15,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const quizDescription: CSSProperties = {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.65)",
  fontSize: "10px",
  lineHeight: 1.3,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const quizMetaRow: CSSProperties = {
  marginTop: "7px",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  color: "rgba(255,255,255,0.55)",
  fontSize: "9px",
};

const attemptRow: CSSProperties = {
  marginTop: "6px",
  color: "#b8ffdb",
  fontSize: "9px",
  fontWeight: 800,
};

function quizAction(completed: boolean): CSSProperties {
  return {
    marginTop: "auto",
    minHeight: "32px",
    borderRadius: "9px",
    background: completed
      ? "linear-gradient(135deg, #86efac, #22c55e)"
      : "linear-gradient(135deg, #35c5ff, #4c6dff)",
    color: completed ? "#052e16" : "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 900,
  };
}

const emptyState: CSSProperties = {
  flex: 1,
  minHeight: 0,
  borderRadius: "18px",
  border: "1px dashed rgba(126,232,255,0.35)",
  background: "rgba(255,255,255,0.035)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "24px",
};

const emptyQuizState: CSSProperties = {
  height: "100%",
  borderRadius: "18px",
  border: "1px dashed rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.03)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "20px",
};

const errorBanner: CSSProperties = {
  marginBottom: "7px",
  borderRadius: "10px",
  border: "1px solid rgba(255,215,106,0.4)",
  background: "rgba(255,215,106,0.08)",
  color: "#ffe6a8",
  padding: "8px 10px",
  fontSize: "11px",
  flexShrink: 0,
};

const pillButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const roverButton: CSSProperties = {
  ...pillButton,
  border: "1px solid rgba(255,215,106,0.45)",
  background: "linear-gradient(135deg, rgba(255,215,106,0.2), rgba(83,215,255,0.17))",
  color: "#fff3c4",
};

const mobileRoverButton: CSSProperties = {
  minHeight: "34px",
  padding: "0 8px",
  fontSize: "10px",
};

const tokenPill: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.24)",
  background: "rgba(255,215,106,0.08)",
  padding: "0 13px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const gemPill: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(231,183,255,0.3)",
  background: "rgba(168,85,247,0.11)",
  padding: "0 13px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#f4e8ff",
  fontSize: "13px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const compactPill: CSSProperties = {
  minHeight: "34px",
  padding: "0 7px",
  gap: "4px",
  fontSize: "10px",
};

const centeredFill: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const messageCard: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(255,255,255,0.06)",
  padding: "24px",
  color: "rgba(255,255,255,0.78)",
};

const lockedCard: CSSProperties = {
  width: "min(620px,100%)",
  borderRadius: "22px",
  border: "1px solid rgba(255,215,106,0.4)",
  background: "linear-gradient(180deg, rgba(90,62,16,0.55), rgba(30,20,8,0.8))",
  padding: "28px",
  textAlign: "center",
};

const lockedText: CSSProperties = {
  margin: "12px 0 0",
  lineHeight: 1.55,
  opacity: 0.72,
};

const primaryAction: CSSProperties = {
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontWeight: 800,
};
