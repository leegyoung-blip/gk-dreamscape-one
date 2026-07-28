"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";
type ThinkLevelBand = "foundation" | "growth" | "mastery";
type ThinkAnswer = "A" | "B" | "C" | "D";
type ThinkScreen =
  | "checking"
  | "locked"
  | "level"
  | "quiz-list"
  | "loading"
  | "quiz"
  | "results";

type ThinkMissionQuiz = {
  id: string;
  level_band: ThinkLevelBand;
  level_label: string;
  title: string;
  description: string;
  quiz_order: number;
};

type ThinkMissionQuestion = {
  id: string;
  quiz_id: string;
  question_order: number;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: ThinkAnswer;
  explanation: string;
  skill: string;
  difficulty: string;
};

type CompletedThinkAttempt = {
  quiz_id: string;
  score: number;
  correct_count: number;
  tokens_earned: number;
  gems_earned: number;
  created_at?: string;
};

type ThinkAnswerRecord = {
  question_id: string;
  answer: ThinkAnswer;
};

type SaveThinkAttemptResult = {
  attempt_id: string;
  score: number;
  correct_count: number;
  total_questions: number;
  tokens_earned: number;
  gems_earned: number;
  first_completion: boolean;
  token_balance: number;
  gem_balance: number;
};

const thinkLevelBands = [
  {
    id: "foundation" as const,
    title: "Foundation",
    label: "P1–P2",
    subtitle: "Simple patterns, visual thinking and beginner logic puzzles.",
    accent: "#7ee8ff",
    icon: "◇",
  },
  {
    id: "growth" as const,
    title: "Growth",
    label: "P3–P4",
    subtitle: "Rule-based patterns, deduction and stronger reasoning skills.",
    accent: "#60f0d0",
    icon: "⌁",
  },
  {
    id: "mastery" as const,
    title: "Mastery",
    label: "P5–P6",
    subtitle: "Advanced logic, non-routine problems and higher-level thinking.",
    accent: "#ffd76a",
    icon: "✦",
  },
];

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

function normaliseRole(role: string | null | undefined) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function roleHasThinkAccess(role: string | null | undefined) {
  const cleanRole = normaliseRole(role);
  return (
    cleanRole === "admin" || cleanRole === "student" || cleanRole === "teacher"
  );
}

export default function ThinkMissionsPage() {
  const router = useRouter();
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [screen, setScreen] = useState<ThinkScreen>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [dreamGemBalance, setDreamGemBalance] = useState(0);

  const [selectedLevelBand, setSelectedLevelBand] =
    useState<ThinkLevelBand | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<ThinkMissionQuiz | null>(
    null,
  );

  const [quizzes, setQuizzes] = useState<ThinkMissionQuiz[]>([]);
  const [questions, setQuestions] = useState<ThinkMissionQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizPage, setQuizPage] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<ThinkAnswer | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [answerRecords, setAnswerRecords] = useState<ThinkAnswerRecord[]>([]);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [gemsEarned, setGemsEarned] = useState(0);
  const [firstCompletion, setFirstCompletion] = useState(false);
  const [rewardSaved, setRewardSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completedAttempts, setCompletedAttempts] = useState<
    CompletedThinkAttempt[]
  >([]);

  const currentQuestion = questions[questionIndex];

  const completedQuizIds = useMemo(
    () => new Set(completedAttempts.map((attempt) => attempt.quiz_id)),
    [completedAttempts],
  );

  const quizzesPerPage = isMobile ? 3 : isCompact ? 4 : 6;
  const pageCount = Math.max(1, Math.ceil(quizzes.length / quizzesPerPage));
  const visibleQuizzes = quizzes.slice(
    quizPage * quizzesPerPage,
    quizPage * quizzesPerPage + quizzesPerPage,
  );

  const selectedLevelInfo = thinkLevelBands.find(
    (level) => level.id === selectedLevelBand,
  );

  useEffect(() => {
    void initialise();
  }, []);

  useEffect(() => {
    function handleRewardUpdate() {
      void loadBalances();
    }

    window.addEventListener("dream-tokens-updated", handleRewardUpdate);
    window.addEventListener("dream-gems-updated", handleRewardUpdate);
    window.addEventListener("focus", handleRewardUpdate);

    return () => {
      window.removeEventListener("dream-tokens-updated", handleRewardUpdate);
      window.removeEventListener("dream-gems-updated", handleRewardUpdate);
      window.removeEventListener("focus", handleRewardUpdate);
    };
  }, []);

  async function initialise() {
    setScreen("checking");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setScreen("locked");
      return;
    }

    setUserId(user.id);
    await loadBalances(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn("Could not check Think Missions profile:", profileError);
      setScreen("locked");
      return;
    }

    const role = profile.role || profile.tier || null;

    if (!roleHasThinkAccess(role)) {
      setScreen("locked");
      return;
    }

    await loadCompletedAttempts(user.id);
    setScreen("level");
  }

  async function loadBalances(activeUserId?: string) {
    const resolvedUserId =
      activeUserId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!resolvedUserId) {
      setTokenBalance(0);
      setDreamGemBalance(0);
      return;
    }

    const [tokenResult, profileResult] = await Promise.all([
      supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", resolvedUserId)
        .eq("token_kind", "virtual"),
      supabase
        .from("profiles")
        .select("dream_gem_balance")
        .eq("id", resolvedUserId)
        .maybeSingle(),
    ]);

    if (tokenResult.error) {
      console.warn("Could not load Dreamscape Tokens:", tokenResult.error);
    } else {
      setTokenBalance(
        tokenResult.data?.reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0,
        ) || 0,
      );
    }

    if (profileResult.error) {
      console.warn("Could not load Dream Gems:", profileResult.error);
    } else {
      setDreamGemBalance(
        Math.max(0, Number(profileResult.data?.dream_gem_balance || 0)),
      );
    }
  }

  async function loadCompletedAttempts(activeUserId: string) {
    const { data, error } = await supabase
      .from("think_mission_attempts")
      .select(
        "quiz_id, score, correct_count, tokens_earned, gems_earned, created_at",
      )
      .eq("user_id", activeUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Could not load Think Mission attempts:", error);
      setCompletedAttempts([]);
      return;
    }

    const uniqueAttempts = new Map<string, CompletedThinkAttempt>();

    for (const attempt of data ?? []) {
      if (!uniqueAttempts.has(attempt.quiz_id)) {
        uniqueAttempts.set(attempt.quiz_id, {
          quiz_id: String(attempt.quiz_id),
          score: Number(attempt.score || 0),
          correct_count: Number(attempt.correct_count || 0),
          tokens_earned: Number(attempt.tokens_earned || 0),
          gems_earned: Number(attempt.gems_earned || 0),
          created_at: attempt.created_at
            ? String(attempt.created_at)
            : undefined,
        });
      }
    }

    setCompletedAttempts(Array.from(uniqueAttempts.values()));
  }

  async function chooseLevel(levelBand: ThinkLevelBand) {
    setSelectedLevelBand(levelBand);
    setSelectedQuiz(null);
    setQuizzes([]);
    setQuestions([]);
    setQuizPage(0);
    setLoadError(null);
    setScreen("loading");

    const { data, error } = await supabase
      .from("think_mission_quizzes")
      .select("id, level_band, level_label, title, description, quiz_order")
      .eq("level_band", levelBand)
      .eq("is_active", true)
      .order("quiz_order", { ascending: true });

    if (error || !data) {
      console.warn("Could not load Think Mission quizzes:", error);
      setLoadError("Could not load the quiz list. Please try again.");
      setScreen("level");
      return;
    }

    setQuizzes(data as ThinkMissionQuiz[]);
    setScreen("quiz-list");
  }

  async function startQuiz(quiz: ThinkMissionQuiz) {
    setSelectedQuiz(quiz);
    setLoadError(null);
    setScreen("loading");

    const { data, error } = await supabase
      .from("think_mission_questions")
      .select(
        "id, quiz_id, question_order, question_text, question_image, option_a, option_b, option_c, option_d, correct_answer, explanation, skill, difficulty",
      )
      .eq("quiz_id", quiz.id)
      .eq("is_active", true)
      .order("question_order", { ascending: true })
      .limit(20);

    if (error || !data) {
      console.warn("Could not load Think Mission questions:", error);
      setLoadError("Could not load this quiz. Please try again.");
      setScreen("quiz-list");
      return;
    }

    if (data.length < 20) {
      setLoadError(
        "This quiz does not have 20 active questions yet. Please add more questions in Supabase.",
      );
      setScreen("quiz-list");
      return;
    }

    setQuestions(data as ThinkMissionQuestion[]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setAnswerRecords([]);
    setTokensEarned(0);
    setGemsEarned(0);
    setFirstCompletion(false);
    setRewardSaved(false);
    setSaveError(null);
    setIsFinishing(false);
    setScreen("quiz");
  }

  function chooseAnswer(answer: ThinkAnswer) {
    if (!currentQuestion || answerLocked || isFinishing) return;

    setSelectedAnswer(answer);
    setAnswerRecords((current) => [
      ...current.filter(
        (record) => record.question_id !== currentQuestion.id,
      ),
      {
        question_id: currentQuestion.id,
        answer,
      },
    ]);

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = isCorrect ? 5 : 0;

    if (isCorrect) {
      setScore((current) => current + points);
      setCorrectCount((current) => current + 1);
      setFeedback(`+${points} points. ${currentQuestion.explanation}`);
    } else {
      setFeedback(
        `The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`,
      );
    }

    setAnswerLocked(true);
  }

  async function nextQuestion() {
    if (questionIndex >= questions.length - 1) {
      await finishQuiz();
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
  }

  async function finishQuiz() {
    if (isFinishing) return;

    setIsFinishing(true);
    setRewardSaved(false);
    setSaveError(null);
    setScreen("results");

    if (!userId || !selectedQuiz) {
      setSaveError("Log in again before saving this quiz.");
      setIsFinishing(false);
      return;
    }

    if (answerRecords.length !== questions.length) {
      setSaveError(
        "The quiz could not be saved because one or more answers are missing.",
      );
      setIsFinishing(false);
      return;
    }

    const orderedAnswers = questions.map((question) => {
      const record = answerRecords.find(
        (answer) => answer.question_id === question.id,
      );

      return {
        question_id: question.id,
        answer: record?.answer ?? null,
      };
    });

    const { data, error } = await supabase.rpc(
      "save_think_mission_attempt",
      {
        p_quiz_id: selectedQuiz.id,
        p_answers: orderedAnswers,
        p_mode: "normal",
        p_time_taken_seconds: null,
      },
    );

    if (error) {
      console.warn("Could not save Think Mission attempt:", error);
      setSaveError(error.message);
      setIsFinishing(false);
      return;
    }

    const result = data as SaveThinkAttemptResult | null;

    if (!result) {
      setSaveError("Supabase did not return the saved quiz result.");
      setIsFinishing(false);
      return;
    }

    const officialScore = Number(result.score || 0);
    const officialCorrectCount = Number(result.correct_count || 0);
    const officialTokens = Number(result.tokens_earned || 0);
    const officialGems = Number(result.gems_earned || 0);
    const wasFirstCompletion = Boolean(result.first_completion);

    setScore(officialScore);
    setCorrectCount(officialCorrectCount);
    setTokensEarned(officialTokens);
    setGemsEarned(officialGems);
    setFirstCompletion(wasFirstCompletion);
    setTokenBalance(Number(result.token_balance || 0));
    setDreamGemBalance(Number(result.gem_balance || 0));
    setRewardSaved(true);
    setIsFinishing(false);

    await loadCompletedAttempts(userId);

    if (officialTokens > 0) {
      window.dispatchEvent(new Event("dream-tokens-updated"));
    }

    if (officialGems > 0) {
      window.dispatchEvent(new Event("dream-gems-updated"));
    }
  }

  function resetQuizState() {
    setSelectedQuiz(null);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setAnswerRecords([]);
    setTokensEarned(0);
    setGemsEarned(0);
    setFirstCompletion(false);
    setRewardSaved(false);
    setSaveError(null);
    setIsFinishing(false);
    setLoadError(null);
  }

  function resetToLevels() {
    resetQuizState();
    setSelectedLevelBand(null);
    setQuizzes([]);
    setQuizPage(0);
    setScreen("level");
  }

  function resetToQuizList() {
    resetQuizState();
    setScreen("quiz-list");
  }

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundImage: `
          linear-gradient(180deg, rgba(2,8,19,0.24), rgba(2,8,19,0.58)),
          url("/activities/learning-missions/think/think-inventory-bg.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          height: isMobile ? "58px" : "68px",
          padding: isMobile ? "8px 10px" : "10px 18px",
          display: "grid",
          gridTemplateColumns: isMobile
            ? "auto minmax(0,1fr)"
            : "1fr auto 1fr",
          alignItems: "center",
          gap: "10px",
          background: "transparent",
          textShadow: "0 2px 12px rgba(0,0,0,0.72)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/learning-missions")}
          style={{ ...pillButton, justifySelf: "start" }}
        >
          ← Missions
        </button>

        {!isMobile && (
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "#60f0d0",
                fontSize: "11px",
                letterSpacing: "0.2em",
                fontWeight: 900,
              }}
            >
              THINK MISSIONS
            </p>
            <p style={{ margin: "3px 0 0", fontSize: "13px", opacity: 0.72 }}>
              Logic & Reasoning
            </p>
          </div>
        )}

        <div
          style={{
            justifySelf: "end",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              ...tokenPill,
              ...(isMobile ? compactBalancePill : {}),
            }}
            aria-label={`${tokenBalance} Dream Tokens`}
          >
            <span style={{ color: "#ffd76a" }}>✦</span>
            {tokenBalance} DT
          </div>

          <div
            style={{
              ...gemPill,
              ...(isMobile ? compactBalancePill : {}),
            }}
            aria-label={`${dreamGemBalance} Dream Gems`}
          >
            <span style={{ color: "#e7b7ff" }}>◆</span>
            {dreamGemBalance} DG
          </div>

          <button
            type="button"
            onClick={() => router.push("/learning-missions/think/gear")}
            style={{
              ...myGearButton,
              ...(isMobile
                ? {
                    minHeight: "34px",
                    padding: "0 8px",
                    fontSize: "10px",
                  }
                : {}),
            }}
          >
            {isMobile ? "Gear ›" : "My Gear ›"}
          </button>
        </div>
      </header>

      <section
        style={{
          height: `calc(100dvh - ${isMobile ? 58 : 68}px)`,
          padding: isMobile ? "8px" : isCompact ? "12px" : "20px 28px 28px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width:
              isMobile || isCompact
                ? "100%"
                : "min(1420px, calc(100vw - 72px))",
            height:
              isMobile || isCompact
                ? "100%"
                : "min(760px, calc(100dvh - 118px))",
            overflow: "hidden",
            borderRadius: isMobile ? "18px" : "26px",
            border: "1px solid rgba(96,240,208,0.32)",
            background:
              "linear-gradient(145deg, rgba(5,18,42,0.54), rgba(8,34,58,0.68))",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow:
              "0 0 34px rgba(96,240,208,0.12), 0 22px 58px rgba(0,0,0,0.28)",
            padding: isMobile ? "12px" : isCompact ? "18px" : "22px 24px 24px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {screen === "checking" && (
            <CenteredMessage message="Checking Think Missions access..." />
          )}

          {screen === "locked" && (
            <LockedScreen
              isMobile={isMobile}
              onExit={() => router.push("/learning-missions")}
            />
          )}

          {screen === "loading" && (
            <CenteredMessage message="Loading Think Mission..." />
          )}

          {screen === "level" && (
            <ScreenFrame
              isMobile={isMobile}
              eyebrow="Choose Level"
              title="Start a Think Mission"
              description="Select the level band for your logic and reasoning mission."
            >
              <div style={threeCardGrid(isMobile, isCompact)}>
                {thinkLevelBands.map((level) => (
                  <ChoiceCard
                    key={level.id}
                    accent={level.accent}
                    title={level.title}
                    subtitle={level.subtitle}
                    label={`${level.icon}  ${level.label}`}
                    onClick={() => void chooseLevel(level.id)}
                  />
                ))}
              </div>
            </ScreenFrame>
          )}

          {screen === "quiz-list" && selectedLevelInfo && (
            <ScreenFrame
              isMobile={isMobile}
              eyebrow={`Think Missions · ${selectedLevelInfo.label}`}
              title={`${selectedLevelInfo.title} Mission Set`}
              description="Complete a new quiz to earn DT and DG. Replays are saved without extra rewards."
              backLabel="← Levels"
              onBack={resetToLevels}
              rightSlot={
                pageCount > 1 ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      disabled={quizPage <= 0}
                      onClick={() =>
                        setQuizPage((current) => Math.max(0, current - 1))
                      }
                      style={{
                        ...smallPageButton,
                        opacity: quizPage <= 0 ? 0.35 : 1,
                      }}
                    >
                      ‹
                    </button>
                    <div style={pageCounter}>
                      {quizPage + 1}/{pageCount}
                    </div>
                    <button
                      type="button"
                      disabled={quizPage >= pageCount - 1}
                      onClick={() =>
                        setQuizPage((current) =>
                          Math.min(pageCount - 1, current + 1),
                        )
                      }
                      style={{
                        ...smallPageButton,
                        opacity: quizPage >= pageCount - 1 ? 0.35 : 1,
                      }}
                    >
                      ›
                    </button>
                  </div>
                ) : null
              }
            >
              {loadError && <ErrorBanner message={loadError} />}
              <div style={quizGrid(isMobile, isCompact)}>
                {visibleQuizzes.map((quiz) => {
                  const completed = completedQuizIds.has(quiz.id);
                  const attempt = completedAttempts.find(
                    (item) => item.quiz_id === quiz.id,
                  );

                  return (
                    <button
                      key={quiz.id}
                      type="button"
                      onClick={() => void startQuiz(quiz)}
                      style={quizCard(completed)}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: completed ? "#86efac" : "#60f0d0",
                          fontSize: isMobile ? "10px" : "12px",
                          letterSpacing: "0.14em",
                          fontWeight: 900,
                        }}
                      >
                        {completed ? "COMPLETED" : `QUIZ ${quiz.quiz_order}`}
                      </p>
                      <h3 style={quizTitle}>{quiz.title}</h3>
                      <p style={clampedDescription}>{quiz.description}</p>
                      {completed && attempt && (
                        <p style={attemptText}>
                          {attempt.correct_count}/20 · {attempt.score}/100 · +
                          {attempt.tokens_earned} DT · +{attempt.gems_earned} DG
                        </p>
                      )}
                      <div
                        style={{
                          ...smallAction,
                          background: completed
                            ? "linear-gradient(135deg, #86efac, #22c55e)"
                            : smallAction.background,
                          color: completed ? "#052e16" : "white",
                        }}
                      >
                        {completed ? "Replay" : "Start"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScreenFrame>
          )}

          {screen === "quiz" && currentQuestion && selectedQuiz && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                gap: isMobile ? "8px" : "12px",
              }}
            >
              <div style={quizTopBar}>
                <button
                  type="button"
                  onClick={resetToQuizList}
                  style={backButton}
                >
                  ← Quiz List
                </button>
                <div style={{ textAlign: "center", minWidth: 0 }}>
                  <p style={quizTopTitle}>{selectedQuiz.title}</p>
                  <p style={quizTopMeta}>Question {questionIndex + 1}/20</p>
                </div>
                <div style={scorePill}>Score {score}</div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0,1.08fr) minmax(340px,0.92fr)",
                  gridTemplateRows: isCompact
                    ? "minmax(0,0.9fr) minmax(0,1.1fr)"
                    : "1fr",
                  gap: isMobile ? "8px" : "12px",
                }}
              >
                <div style={questionPanel}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={skillLabel}>
                      {currentQuestion.skill || "Think Mission"}
                    </p>
                    <h2 style={questionHeading}>
                      Question {questionIndex + 1}
                    </h2>
                    {currentQuestion.question_image && (
                      <div style={questionImageBox(isMobile, isCompact)}>
                        <img
                          src={currentQuestion.question_image}
                          alt={`Question ${questionIndex + 1}`}
                          draggable={false}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    )}
                    <p style={questionText(isMobile, isCompact)}>
                      {currentQuestion.question_text}
                    </p>
                  </div>

                  {feedback && (
                    <div
                      style={feedbackBox(
                        selectedAnswer === currentQuestion.correct_answer,
                      )}
                    >
                      <strong>
                        {selectedAnswer === currentQuestion.correct_answer
                          ? "Correct! "
                          : "Not quite. "}
                      </strong>
                      {feedback}
                    </div>
                  )}
                </div>

                <div style={answerPanel}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        isMobile || !isCompact
                          ? "1fr"
                          : "repeat(2,minmax(0,1fr))",
                      gap: isMobile ? "6px" : "9px",
                      minHeight: 0,
                    }}
                  >
                    <AnswerButton
                      label="A"
                      text={currentQuestion.option_a}
                      selected={selectedAnswer === "A"}
                      answerLocked={answerLocked || isFinishing}
                      correctAnswer={currentQuestion.correct_answer}
                      onClick={() => chooseAnswer("A")}
                    />
                    <AnswerButton
                      label="B"
                      text={currentQuestion.option_b}
                      selected={selectedAnswer === "B"}
                      answerLocked={answerLocked || isFinishing}
                      correctAnswer={currentQuestion.correct_answer}
                      onClick={() => chooseAnswer("B")}
                    />
                    <AnswerButton
                      label="C"
                      text={currentQuestion.option_c}
                      selected={selectedAnswer === "C"}
                      answerLocked={answerLocked || isFinishing}
                      correctAnswer={currentQuestion.correct_answer}
                      onClick={() => chooseAnswer("C")}
                    />
                    <AnswerButton
                      label="D"
                      text={currentQuestion.option_d}
                      selected={selectedAnswer === "D"}
                      answerLocked={answerLocked || isFinishing}
                      correctAnswer={currentQuestion.correct_answer}
                      onClick={() => chooseAnswer("D")}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!answerLocked || isFinishing}
                    onClick={() => void nextQuestion()}
                    style={{
                      ...nextButton,
                      opacity: answerLocked && !isFinishing ? 1 : 0.35,
                      cursor:
                        answerLocked && !isFinishing ? "pointer" : "default",
                    }}
                  >
                    {questionIndex >= 19
                      ? "Finish Mission"
                      : answerLocked
                        ? "Next Question"
                        : "Choose an answer"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {screen === "results" && selectedQuiz && (
            <ResultsScreen
              isMobile={isMobile}
              quizTitle={selectedQuiz.title}
              correctCount={correctCount}
              score={score}
              tokensEarned={tokensEarned}
              gemsEarned={gemsEarned}
              tokenBalance={tokenBalance}
              dreamGemBalance={dreamGemBalance}
              firstCompletion={firstCompletion}
              rewardSaved={rewardSaved}
              saveError={saveError}
              isSaving={isFinishing}
              onAnotherQuiz={resetToQuizList}
              onMyGear={() => router.push("/learning-missions/think/gear")}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function ScreenFrame({
  isMobile,
  eyebrow,
  title,
  description,
  backLabel,
  onBack,
  rightSlot,
  children,
}: {
  isMobile: boolean;
  eyebrow: string;
  title: string;
  description: string;
  backLabel?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={sectionTopRow}>
        <div>
          {backLabel && onBack && (
            <button type="button" onClick={onBack} style={backButton}>
              {backLabel}
            </button>
          )}
        </div>
        {rightSlot}
      </div>

      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <p style={sectionEyebrow}>{eyebrow}</p>
        <h1
          style={{
            margin: "5px 0 0",
            fontSize: isMobile ? "24px" : "clamp(38px,3vw,52px)",
            lineHeight: 1.05,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "7px auto 0",
            maxWidth: "700px",
            fontSize: isMobile ? "12px" : "16px",
            color: "rgba(255,255,255,0.68)",
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: isMobile ? "10px" : "16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ChoiceCard({
  accent,
  title,
  subtitle,
  label,
  onClick,
}: {
  accent: string;
  title: string;
  subtitle: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={choiceCard(accent)}>
      <div style={{ color: accent, fontSize: "clamp(22px,3.5vh,40px)" }}>
        {label}
      </div>
      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "clamp(22px,3vh,34px)",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "8px auto 0",
          maxWidth: "420px",
          color: "rgba(255,255,255,0.72)",
          lineHeight: 1.45,
          fontSize: "clamp(12px,1.7vh,16px)",
        }}
      >
        {subtitle}
      </p>
      <div style={choiceAction}>Choose ›</div>
    </button>
  );
}

function AnswerButton({
  label,
  text,
  selected,
  answerLocked,
  correctAnswer,
  onClick,
}: {
  label: ThinkAnswer;
  text: string;
  selected: boolean;
  answerLocked: boolean;
  correctAnswer: ThinkAnswer;
  onClick: () => void;
}) {
  const correctSelected = selected && answerLocked && label === correctAnswer;
  const wrongSelected = selected && answerLocked && label !== correctAnswer;

  let background = "rgba(255,255,255,0.075)";
  let border = "1px solid rgba(96,240,208,0.26)";

  if (correctSelected) {
    background = "rgba(34,197,94,0.78)";
    border = "1px solid rgba(134,239,172,0.9)";
  } else if (wrongSelected) {
    background = "rgba(220,38,38,0.78)";
    border = "1px solid rgba(252,165,165,0.9)";
  }

  return (
    <button
      type="button"
      disabled={answerLocked}
      onClick={onClick}
      style={{
        minHeight: 0,
        height: "100%",
        borderRadius: "14px",
        border,
        background,
        color: "white",
        display: "grid",
        gridTemplateColumns: "32px 1fr",
        alignItems: "center",
        gap: "10px",
        padding: "8px 11px",
        textAlign: "left",
        cursor: answerLocked ? "default" : "pointer",
      }}
    >
      <strong style={answerLetter}>{label}</strong>
      <span
        style={{
          fontSize: "clamp(12px,1.6vh,16px)",
          lineHeight: 1.3,
          fontWeight: 700,
        }}
      >
        {text}
      </span>
    </button>
  );
}

function ResultsScreen({
  isMobile,
  quizTitle,
  correctCount,
  score,
  tokensEarned,
  gemsEarned,
  tokenBalance,
  dreamGemBalance,
  firstCompletion,
  rewardSaved,
  saveError,
  isSaving,
  onAnotherQuiz,
  onMyGear,
}: {
  isMobile: boolean;
  quizTitle: string;
  correctCount: number;
  score: number;
  tokensEarned: number;
  gemsEarned: number;
  tokenBalance: number;
  dreamGemBalance: number;
  firstCompletion: boolean;
  rewardSaved: boolean;
  saveError: string | null;
  isSaving: boolean;
  onAnotherQuiz: () => void;
  onMyGear: () => void;
}) {
  return (
    <div style={resultsWrap}>
      <p style={sectionEyebrow}>THINK MISSION COMPLETE</p>
      <h1
        style={{
          margin: "8px 0 0",
          fontSize: isMobile ? "27px" : "clamp(34px,5vh,54px)",
        }}
      >
        {quizTitle}
      </h1>

      <div style={resultsGrid(isMobile)}>
        <ResultStat label="Correct" value={`${correctCount}/20`} />
        <ResultStat label="Score" value={`${score}/100`} />
        <ResultStat label="DT Earned" value={`+${tokensEarned}`} />
        <ResultStat label="DG Earned" value={`+${gemsEarned}`} />
        <ResultStat label="DT Balance" value={`${tokenBalance} DT`} />
        <ResultStat label="DG Balance" value={`${dreamGemBalance} DG`} />
      </div>

      <p
        style={{
          margin: "14px 0 0",
          color: rewardSaved ? "#b8ffdb" : "#ffe6a8",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        {isSaving
          ? "Saving the attempt, individual answers, and rewards..."
          : saveError
            ? `The mission is complete, but it could not be saved: ${saveError}`
            : rewardSaved && firstCompletion
              ? tokensEarned > 0
                ? `First completion saved. You received ${tokensEarned} DT and ${gemsEarned} DG.`
                : `First completion saved. You received ${gemsEarned} DG. DT rewards begin at 60%.`
              : rewardSaved
                ? "Replay saved to the Teaching Dashboard. Replays do not award extra DT, DG, or gear progress."
                : "The mission is complete, but the result has not been saved yet."}
      </p>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={onAnotherQuiz}
          disabled={isSaving}
          style={{
            ...ghostAction,
            opacity: isSaving ? 0.45 : 1,
            cursor: isSaving ? "default" : "pointer",
          }}
        >
          Choose Another Quiz
        </button>
        <button
          type="button"
          onClick={onMyGear}
          disabled={isSaving}
          style={{
            ...primaryAction,
            opacity: isSaving ? 0.45 : 1,
            cursor: isSaving ? "default" : "pointer",
          }}
        >
          View My Gear
        </button>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={resultStat}>
      <p style={resultLabel}>{label}</p>
      <p style={resultValue}>{value}</p>
    </div>
  );
}

function CenteredMessage({ message }: { message: string }) {
  return (
    <div style={centeredFill}>
      <div style={messageCard}>{message}</div>
    </div>
  );
}

function LockedScreen({
  isMobile,
  onExit,
}: {
  isMobile: boolean;
  onExit: () => void;
}) {
  return (
    <div style={centeredFill}>
      <div style={lockedCard}>
        <h2 style={{ margin: 0, fontSize: isMobile ? "26px" : "34px" }}>
          Think Missions Locked
        </h2>
        <p style={{ margin: "12px 0 0", lineHeight: 1.55, opacity: 0.72 }}>
          Sign in with a student, teacher or admin account to enter Think
          Missions.
        </p>
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <a href="/login" style={{ ...primaryAction, textDecoration: "none" }}>
            Log In
          </a>
          <button type="button" onClick={onExit} style={ghostAction}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div style={errorBanner}>{message}</div>;
}

const pillButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(96,240,208,0.32)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const myGearButton: CSSProperties = {
  ...pillButton,
  border: "1px solid rgba(255,215,106,0.45)",
  background:
    "linear-gradient(135deg, rgba(255,215,106,0.2), rgba(96,240,208,0.17))",
  color: "#fff3c4",
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

const compactBalancePill: CSSProperties = {
  minHeight: "34px",
  padding: "0 7px",
  gap: "4px",
  fontSize: "10px",
};

const sectionTopRow: CSSProperties = {
  minHeight: "38px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexShrink: 0,
};

const sectionEyebrow: CSSProperties = {
  margin: 0,
  color: "#60f0d0",
  fontSize: "12px",
  letterSpacing: "0.2em",
  fontWeight: 900,
};

const backButton: CSSProperties = {
  minHeight: "34px",
  borderRadius: "999px",
  border: "1px solid rgba(96,240,208,0.28)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "0 12px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

function threeCardGrid(isMobile: boolean, isCompact: boolean): CSSProperties {
  const shouldStack = isMobile || isCompact;

  return {
    width: "100%",
    height: shouldStack ? "100%" : "min(450px, 100%)",
    maxWidth: shouldStack ? "760px" : "1200px",
    minHeight: 0,
    margin: "auto",
    display: "grid",
    gridTemplateColumns: shouldStack
      ? "1fr"
      : "repeat(3,minmax(0,1fr))",
    gridTemplateRows: shouldStack
      ? "repeat(3,minmax(0,1fr))"
      : "1fr",
    gap: isMobile ? "10px" : isCompact ? "14px" : "16px",
  };
}

function choiceCard(accent: string): CSSProperties {
  return {
    minHeight: 0,
    height: "100%",
    borderRadius: "20px",
    border: `1px solid ${accent}77`,
    background:
      "linear-gradient(180deg, rgba(20,70,92,0.62), rgba(8,30,52,0.76))",
    color: "white",
    padding: "clamp(12px,2.2vh,24px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: `0 0 24px ${accent}18`,
    overflow: "hidden",
  };
}

const choiceAction: CSSProperties = {
  marginTop: "clamp(10px,2vh,22px)",
  minHeight: "38px",
  minWidth: "140px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: 800,
};

function quizGrid(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    height: "100%",
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : isCompact
        ? "repeat(2,minmax(0,1fr))"
        : "repeat(3,minmax(0,1fr))",
    gridTemplateRows: isMobile
      ? "repeat(3,minmax(0,1fr))"
      : "repeat(2,minmax(0,1fr))",
    gap: "10px",
  };
}

function quizCard(completed: boolean): CSSProperties {
  return {
    minHeight: 0,
    height: "100%",
    borderRadius: "17px",
    border: completed
      ? "1px solid rgba(74,222,128,0.48)"
      : "1px solid rgba(96,240,208,0.3)",
    background: completed
      ? "linear-gradient(180deg, rgba(20,92,60,0.66), rgba(8,35,36,0.8))"
      : "linear-gradient(180deg, rgba(20,70,92,0.62), rgba(8,30,52,0.78))",
    color: "white",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    cursor: "pointer",
    overflow: "hidden",
  };
}

const quizTitle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(21px,2.5vh,29px)",
  lineHeight: 1.15,
};

const clampedDescription: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(255,255,255,0.78)",
  fontSize: "clamp(13px,1.45vh,16px)",
  lineHeight: 1.35,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const attemptText: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(255,255,255,0.82)",
  fontSize: "12px",
};

const smallAction: CSSProperties = {
  marginTop: "auto",
  minHeight: "40px",
  borderRadius: "10px",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 800,
};

const smallPageButton: CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  border: "1px solid rgba(96,240,208,0.25)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
};

const pageCounter: CSSProperties = {
  minWidth: "52px",
  height: "34px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
};

const quizTopBar: CSSProperties = {
  minHeight: "38px",
  display: "grid",
  gridTemplateColumns: "1fr minmax(0,1fr) 1fr",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
};

const quizTopTitle: CSSProperties = {
  margin: 0,
  fontWeight: 800,
  fontSize: "12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const quizTopMeta: CSSProperties = {
  margin: "2px 0 0",
  color: "rgba(255,255,255,0.58)",
  fontSize: "10px",
};

const scorePill: CSSProperties = {
  justifySelf: "end",
  minHeight: "34px",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.3)",
  background: "rgba(255,215,106,0.08)",
  color: "#ffe6a8",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  fontSize: "12px",
  fontWeight: 900,
};

const questionPanel: CSSProperties = {
  minHeight: 0,
  borderRadius: "18px",
  border: "1px solid rgba(96,240,208,0.28)",
  background:
    "linear-gradient(180deg, rgba(20,70,92,0.76), rgba(8,30,52,0.9))",
  padding: "clamp(10px,1.8vh,20px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const skillLabel: CSSProperties = {
  margin: 0,
  color: "#60f0d0",
  fontSize: "9px",
  letterSpacing: "0.16em",
  fontWeight: 900,
};

const questionHeading: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "clamp(17px,2.4vh,27px)",
};

function questionImageBox(
  isMobile: boolean,
  isCompact: boolean,
): CSSProperties {
  return {
    marginTop: "7px",
    height: isMobile ? "70px" : isCompact ? "95px" : "clamp(120px,26vh,250px)",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.95)",
    overflow: "hidden",
  };
}

function questionText(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    margin: "8px 0 0",
    fontSize: isMobile
      ? "clamp(14px,2.2vh,18px)"
      : isCompact
        ? "clamp(17px,2.5vh,23px)"
        : "clamp(21px,3vh,31px)",
    lineHeight: 1.3,
    fontWeight: 600,
  };
}

function feedbackBox(correct: boolean): CSSProperties {
  return {
    marginTop: "8px",
    borderRadius: "12px",
    border: correct
      ? "1px solid rgba(74,222,128,0.5)"
      : "1px solid rgba(248,113,113,0.5)",
    background: correct ? "rgba(34,197,94,0.13)" : "rgba(239,68,68,0.13)",
    padding: "8px 10px",
    fontSize: "clamp(10px,1.45vh,13px)",
    lineHeight: 1.35,
    overflow: "hidden",
    flexShrink: 0,
  };
}

const answerPanel: CSSProperties = {
  minHeight: 0,
  borderRadius: "18px",
  border: "1px solid rgba(96,240,208,0.28)",
  background:
    "linear-gradient(180deg, rgba(14,82,104,0.84), rgba(6,36,52,0.95))",
  padding: "clamp(8px,1.5vh,16px)",
  display: "grid",
  gridTemplateRows: "minmax(0,1fr) auto",
  gap: "8px",
  overflow: "hidden",
};

const answerLetter: CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.13)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const nextButton: CSSProperties = {
  minHeight: "40px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.35)",
  background: "linear-gradient(135deg, #60f0d0, #35c5ff)",
  color: "#06142d",
  fontWeight: 900,
};

const resultsWrap: CSSProperties = {
  margin: "auto",
  width: "min(820px,100%)",
  maxHeight: "100%",
  borderRadius: "24px",
  border: "1px solid rgba(96,240,208,0.44)",
  background:
    "linear-gradient(180deg, rgba(14,82,104,0.84), rgba(6,36,52,0.96))",
  padding: "clamp(18px,3vh,34px)",
  textAlign: "center",
};

function resultsGrid(isMobile: boolean): CSSProperties {
  return {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : "repeat(3,minmax(0,1fr))",
    gap: "8px",
  };
}

const resultStat: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(96,240,208,0.22)",
  background: "rgba(255,255,255,0.06)",
  padding: "12px 8px",
};

const resultLabel: CSSProperties = {
  margin: 0,
  color: "#60f0d0",
  fontSize: "9px",
  letterSpacing: "0.13em",
  fontWeight: 900,
};

const resultValue: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "clamp(18px,2.6vh,27px)",
  fontWeight: 900,
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

const ghostAction: CSSProperties = {
  ...primaryAction,
  border: "1px solid rgba(96,240,208,0.28)",
  background: "rgba(255,255,255,0.06)",
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
  border: "1px solid rgba(96,240,208,0.3)",
  background: "rgba(255,255,255,0.06)",
  padding: "24px",
  color: "rgba(255,255,255,0.8)",
};

const lockedCard: CSSProperties = {
  width: "min(620px,100%)",
  borderRadius: "22px",
  border: "1px solid rgba(255,215,106,0.4)",
  background: "linear-gradient(180deg, rgba(90,62,16,0.55), rgba(30,20,8,0.8))",
  padding: "28px",
  textAlign: "center",
};

const errorBanner: CSSProperties = {
  marginBottom: "8px",
  borderRadius: "10px",
  border: "1px solid rgba(255,215,106,0.4)",
  background: "rgba(255,215,106,0.08)",
  color: "#ffe6a8",
  padding: "8px 10px",
  fontSize: "11px",
};
