"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getThinkGearProgress,
  type ThinkGearUpgrade,
} from "@/lib/thinkGearProgress";

type ScreenMode = "desktop" | "tablet" | "mobile";

type ThinkLevelBand = "foundation" | "growth" | "mastery";
type ThinkAnswer = "A" | "B" | "C" | "D";

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
};

type ThinkMazePlayerRow = {
  rank: number | string;
  user_id: string;
  username: string;
  best_score: number;
  best_time_ms: number;
  gear_stage: number;
  completed_at: string;
};

const THINK_MAZE_COURSE_ID = "logic-maze-01";

const thinkLevelBands: {
  id: ThinkLevelBand;
  title: string;
  label: string;
  subtitle: string;
  accent: string;
}[] = [
  {
    id: "foundation",
    title: "Foundation",
    label: "P1–P2",
    subtitle: "Simple patterns, visual thinking and beginner logic puzzles.",
    accent: "#7ee8ff",
  },
  {
    id: "growth",
    title: "Growth",
    label: "P3–P4",
    subtitle: "Stronger reasoning, rule-based patterns and deduction skills.",
    accent: "#60f0d0",
  },
  {
    id: "mastery",
    title: "Mastery",
    label: "P5–P6",
    subtitle: "Advanced logic, non-routine problems and higher-level thinking.",
    accent: "#ffd76a",
  },
];

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180 || isPortrait) {
        setScreenMode("tablet");
      } else {
        setScreenMode("desktop");
      }
    }

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenMode;
}

function normaliseRole(role: string | null | undefined) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function roleHasMissionAccess(role: string | null | undefined) {
  const cleanRole = normaliseRole(role);

  return (
    cleanRole === "admin" ||
    cleanRole === "student" ||
    cleanRole === "teacher"
  );
}

function formatChallengeTime(milliseconds: number | null) {
  if (milliseconds === null) return "—";

  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

export default function ThinkMissionsPage() {
  const router = useRouter();
  const [tokenBalance, setTokenBalance] = useState(0);

  useEffect(() => {
    async function loadTokens() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setTokenBalance(0);
        return;
      }

      const { data, error } = await supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual");

      if (error) {
        console.warn("Could not load Dreamscape Tokens:", error);
        setTokenBalance(0);
        return;
      }

      const total =
        data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;

      setTokenBalance(total);
    }

    void loadTokens();

    function handleTokenUpdate() {
      void loadTokens();
    }

    window.addEventListener("dream-tokens-updated", handleTokenUpdate);

    return () => {
      window.removeEventListener("dream-tokens-updated", handleTokenUpdate);
    };
  }, []);

  return (
    <ThinkMissionsActivity
      tokenBalance={tokenBalance}
      onTokenBalanceChange={setTokenBalance}
      onExit={() => router.push("/learning-missions")}
      onOpenMaze={() =>
        router.push("/learning-missions/think/maze-challenge")
      }
    />
  );
}

function ThinkMissionsActivity({
  onExit,
  onOpenMaze,
  tokenBalance,
  onTokenBalanceChange,
}: {
  onExit: () => void;
  onOpenMaze: () => void;
  tokenBalance: number;
  onTokenBalanceChange: (newBalance: number) => void;
}) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = !isDesktop;

  const [screen, setScreen] = useState<
    | "checking"
    | "locked"
    | "level"
    | "quiz-list"
    | "loading"
    | "quiz"
    | "results"
  >("checking");

  const [userId, setUserId] = useState<string | null>(null);

  const [mazeRank, setMazeRank] = useState<number | null>(null);
  const [mazeBestScore, setMazeBestScore] = useState<number | null>(null);
  const [mazeBestTimeMs, setMazeBestTimeMs] = useState<number | null>(null);
  const [mazeRankLoading, setMazeRankLoading] = useState(false);

  const [selectedLevelBand, setSelectedLevelBand] =
    useState<ThinkLevelBand | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<ThinkMissionQuiz | null>(
    null,
  );

  const [quizzes, setQuizzes] = useState<ThinkMissionQuiz[]>([]);
  const [questions, setQuestions] = useState<ThinkMissionQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<ThinkAnswer | null>(
    null,
  );
  const [answerLocked, setAnswerLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [rewardSaved, setRewardSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const [completedAttempts, setCompletedAttempts] = useState<
    CompletedThinkAttempt[]
  >([]);

  const currentQuestion = questions[questionIndex];

  const completedQuizIds = new Set(
    completedAttempts.map((attempt) => attempt.quiz_id),
  );

  const completedMissionCount = completedAttempts.length;

  const {
    currentUpgrade,
    nextUpgrade,
    progressPercentage,
    missionsToNext,
    isComplete,
  } = getThinkGearProgress(completedMissionCount);

  useEffect(() => {
    void checkAccess();
  }, []);

  async function checkAccess() {
    setScreen("checking");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setScreen("locked");
      return;
    }

    setUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn("Could not check Think Missions profile:", profileError);
      setScreen("locked");
      return;
    }

    const userRole = profile.role || profile.tier || null;

    if (!roleHasMissionAccess(userRole)) {
      setScreen("locked");
      return;
    }

    await Promise.all([
      loadCompletedAttempts(user.id),
      loadMazeRank(user.id),
    ]);

    setScreen("level");
  }

  async function loadMazeRank(activeUserId: string) {
    setMazeRankLoading(true);

    const { data, error } = await supabase.rpc(
      "get_think_maze_player_result",
      {
        p_course_id: THINK_MAZE_COURSE_ID,
      },
    );

    if (error) {
      console.warn("Could not load Logic Maze rank:", error.message);
      setMazeRank(null);
      setMazeBestScore(null);
      setMazeBestTimeMs(null);
      setMazeRankLoading(false);
      return;
    }

    const rows = (data ?? []) as ThinkMazePlayerRow[];
    const playerRow = rows.find((row) => row.user_id === activeUserId);

    if (!playerRow) {
      setMazeRank(null);
      setMazeBestScore(null);
      setMazeBestTimeMs(null);
      setMazeRankLoading(false);
      return;
    }

    const parsedRank = Number(playerRow.rank);

    setMazeRank(Number.isFinite(parsedRank) ? parsedRank : null);
    setMazeBestScore(playerRow.best_score);
    setMazeBestTimeMs(playerRow.best_time_ms);
    setMazeRankLoading(false);
  }

  async function loadCompletedAttempts(activeUserId: string) {
    const { data, error } = await supabase
      .from("think_mission_attempts")
      .select("quiz_id, score, correct_count, tokens_earned")
      .eq("user_id", activeUserId);

    if (error) {
      console.warn("Could not load completed Think Mission attempts:", error);
      setCompletedAttempts([]);
      return;
    }

    const uniqueAttempts = new Map<string, CompletedThinkAttempt>();

    for (const attempt of data ?? []) {
      if (!uniqueAttempts.has(attempt.quiz_id) && attempt.tokens_earned > 0) {
        uniqueAttempts.set(attempt.quiz_id, {
          quiz_id: attempt.quiz_id,
          score: attempt.score,
          correct_count: attempt.correct_count,
          tokens_earned: attempt.tokens_earned,
        });
      }
    }

    setCompletedAttempts(Array.from(uniqueAttempts.values()));
  }

  function isQuizCompleted(quizId: string) {
    return completedQuizIds.has(quizId);
  }

  async function chooseLevel(levelBand: ThinkLevelBand) {
    setSelectedLevelBand(levelBand);
    setSelectedQuiz(null);
    setQuizzes([]);
    setQuestions([]);
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
    setTokensEarned(0);
    setRewardSaved(false);
    setIsFinishing(false);
    setScreen("quiz");
  }

  function chooseAnswer(answer: ThinkAnswer) {
    if (!currentQuestion || answerLocked || isFinishing) return;

    setSelectedAnswer(answer);

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = isCorrect ? 5 : 0;

    if (isCorrect) {
      setScore((previous) => previous + points);
      setCorrectCount((previous) => previous + 1);
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

    setQuestionIndex((previous) => previous + 1);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
  }

  function calculateTokenReward(
    finalScore: number,
    finalCorrectCount: number,
  ) {
    let reward = 2;

    if (finalCorrectCount >= 14) reward += 1;
    if (finalCorrectCount >= 18) reward += 1;
    if (finalScore === 100) reward += 1;

    return reward;
  }

  async function finishQuiz() {
    if (isFinishing) return;

    setIsFinishing(true);

    if (!userId || !selectedQuiz) {
      setScreen("results");
      return;
    }

    const finalScore = score;
    const finalCorrectCount = correctCount;
    const hasCompletedThisQuizBefore = isQuizCompleted(selectedQuiz.id);

    const reward = hasCompletedThisQuizBefore
      ? 0
      : calculateTokenReward(finalScore, finalCorrectCount);

    setTokensEarned(reward);
    setScreen("results");

    const { error: attemptError } = await supabase
      .from("think_mission_attempts")
      .insert({
        user_id: userId,
        quiz_id: selectedQuiz.id,
        mode: "normal",
        score: finalScore,
        correct_count: finalCorrectCount,
        total_questions: questions.length,
        time_taken_seconds: null,
        tokens_earned: reward,
      });

    if (attemptError) {
      console.warn("Could not save Think Mission attempt:", attemptError);
      setRewardSaved(false);
      return;
    }

    if (!hasCompletedThisQuizBefore) {
      const newAttempt: CompletedThinkAttempt = {
        quiz_id: selectedQuiz.id,
        score: finalScore,
        correct_count: finalCorrectCount,
        tokens_earned: reward,
      };

      setCompletedAttempts((previous) => [...previous, newAttempt]);
    }

    if (reward <= 0) {
      setRewardSaved(true);
      return;
    }

    const { error: tokenError } = await supabase
      .from("dream_token_transactions")
      .insert({
        user_id: userId,
        type: "earn",
        title: "Think Missions Reward",
        amount: reward,
        token_kind: "virtual",
      });

    if (tokenError) {
      console.warn("Could not award Think Mission tokens:", tokenError);
      setRewardSaved(false);
      return;
    }

    setRewardSaved(true);
    onTokenBalanceChange(tokenBalance + reward);
    window.dispatchEvent(new Event("dream-tokens-updated"));
  }

  function resetToLevels() {
    setSelectedLevelBand(null);
    setSelectedQuiz(null);
    setQuizzes([]);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setTokensEarned(0);
    setRewardSaved(false);
    setIsFinishing(false);
    setLoadError(null);
    setScreen("level");
  }

  function resetToQuizList() {
    setSelectedQuiz(null);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setTokensEarned(0);
    setRewardSaved(false);
    setIsFinishing(false);
    setLoadError(null);
    setScreen("quiz-list");
  }

  const selectedLevelInfo = thinkLevelBands.find(
    (level) => level.id === selectedLevelBand,
  );

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(2,8,19,0.58),
            rgba(2,8,19,0.9)
          ),
          url("/activities/learning-missions/think/think-inventory-bg.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onExit}
        style={{
          position: "fixed",
          top: isMobile ? "14px" : "22px",
          left: isMobile ? "14px" : "22px",
          zIndex: 40,
          height: isMobile ? "40px" : "46px",
          padding: isMobile ? "0 14px" : "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(150, 231, 255, 0.7)",
          background: "rgba(2,8,19,0.72)",
          color: "white",
          fontSize: isMobile ? "12px" : "14px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          boxShadow: "0 0 18px rgba(83, 215, 255, 0.22)",
        }}
      >
        ← Missions
      </button>

      <section
        style={{
          minHeight: "100dvh",
          width: "100%",
          padding: isMobile
            ? "82px 16px 32px"
            : isCompact
              ? "92px 28px 42px"
              : "92px 4vw 54px",
        }}
      >
        <div
          style={{
            width: "min(1440px, 100%)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(360px, 0.9fr) minmax(720px, 1.35fr)",
            gap: isMobile ? "20px" : "34px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              position: isDesktop ? "sticky" : "relative",
              top: isDesktop ? "92px" : "auto",
              display: "grid",
              gap: isMobile ? "18px" : "22px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#60f0d0",
                  fontSize: "13px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                }}
              >
                Think Missions
              </p>

              <h1
                style={{
                  margin: "12px 0 0",
                  fontSize: isMobile ? "38px" : isCompact ? "54px" : "68px",
                  lineHeight: 0.95,
                  fontWeight: 600,
                  letterSpacing: "-0.055em",
                  textShadow: "0 0 30px rgba(96, 240, 208, 0.28)",
                }}
              >
                Unlock Nova’s
                <br />
                Gear Inventory
              </h1>

              <p
                style={{
                  margin: "20px 0 0",
                  maxWidth: "640px",
                  fontSize: isMobile ? "16px" : "18px",
                  color: "#c8fff3",
                  lineHeight: 1.6,
                  fontWeight: 300,
                }}
              >
                Complete new Think Missions to unlock maze tools. Replays are
                saved, but only first completions add gear progress.
              </p>
            </div>

            <GearProgressCard
              isMobile={isMobile}
              completedMissionCount={completedMissionCount}
              currentUpgrade={currentUpgrade}
              nextUpgrade={nextUpgrade}
              progressPercentage={progressPercentage}
              missionsToNext={missionsToNext}
              isComplete={isComplete}
              mazeRank={mazeRank}
              mazeBestScore={mazeBestScore}
              mazeBestTimeMs={mazeBestTimeMs}
              mazeRankLoading={mazeRankLoading}
              onOpenMaze={onOpenMaze}
            />
          </aside>

          <section
            style={{
              borderRadius: isMobile ? "24px" : "32px",
              border: "1px solid rgba(96,240,208,0.24)",
              background:
                "linear-gradient(145deg, rgba(5,18,42,0.82), rgba(8,34,58,0.92))",
              boxShadow:
                "0 0 34px rgba(96,240,208,0.14), 0 28px 80px rgba(0,0,0,0.36)",
              padding: isMobile ? "20px" : "30px",
              minHeight: isDesktop ? "720px" : "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {screen === "checking" && (
              <ThinkMessageCard message="Checking your Think Missions access..." />
            )}

            {screen === "locked" && (
              <div
                style={{
                  margin: "18px auto",
                  maxWidth: "680px",
                  borderRadius: "26px",
                  border: "1px solid rgba(255,215,106,0.5)",
                  background:
                    "linear-gradient(180deg, rgba(90, 62, 16, 0.55), rgba(30, 20, 8, 0.72))",
                  padding: "34px",
                  textAlign: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "30px" }}>
                  Think Missions Locked
                </h3>

                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: "16px",
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  Think Missions are available for student, teacher and admin
                  accounts.
                </p>

                <div
                  style={{
                    marginTop: "26px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <a href="/login" style={thinkPrimaryLinkStyle}>
                    Log In
                  </a>

                  <button type="button" onClick={onExit} style={thinkGhostButton}>
                    Exit
                  </button>
                </div>
              </div>
            )}

            {screen === "level" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <QuizPanelHeader
                  eyebrow="Choose Level"
                  title="Start a Think Mission"
                  description="Select a level band, then complete a new quiz to unlock Nova’s next maze tool."
                />

                <div
                  style={{
                    marginTop: "22px",
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : isCompact
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(3, minmax(0, 1fr))",
                    gap: "20px",
                    flex: 1,
                  }}
                >
                  {thinkLevelBands.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => void chooseLevel(level.id)}
                      style={thinkLargeCardStyle(level.accent)}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: level.accent,
                          fontSize: "14px",
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                        }}
                      >
                        {level.label}
                      </p>

                      <h3 style={thinkCardTitleStyle}>{level.title}</h3>
                      <p style={thinkCardTextStyle}>{level.subtitle}</p>
                      <div style={thinkCardButtonLook}>View Quizzes ›</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === "loading" && (
              <ThinkMessageCard message="Loading Think Mission..." />
            )}

            {screen === "quiz-list" && selectedLevelInfo && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <ThinkTopRow
                  leftButton="← Back to Levels"
                  onLeftClick={resetToLevels}
                  rightText={`${selectedLevelInfo.title} · ${selectedLevelInfo.label}`}
                />

                <QuizPanelHeader
                  eyebrow="Choose Quiz"
                  title={`${selectedLevelInfo.title} Mission Set`}
                  description="Complete a new quiz to earn Dreamscape Tokens and unlock the next gear upgrade."
                />

                {loadError && <ThinkErrorMessage message={loadError} />}

                <div
                  style={{
                    marginTop: "22px",
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : isCompact
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(3, minmax(0, 1fr))",
                    gap: "16px",
                  }}
                >
                  {quizzes.map((quiz) => {
                    const completed = isQuizCompleted(quiz.id);
                    const completedAttempt = completedAttempts.find(
                      (attempt) => attempt.quiz_id === quiz.id,
                    );

                    return (
                      <button
                        key={quiz.id}
                        type="button"
                        onClick={() => void startQuiz(quiz)}
                        style={{
                          minHeight: isMobile ? "auto" : "250px",
                          borderRadius: "22px",
                          padding: "20px",
                          border: completed
                            ? "1px solid rgba(74,222,128,0.5)"
                            : "1px solid rgba(126,232,255,0.36)",
                          background: completed
                            ? "linear-gradient(180deg, rgba(20, 92, 60, 0.72), rgba(8, 35, 36, 0.9))"
                            : "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                          color: "white",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          opacity: completed ? 0.9 : 1,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color: completed ? "#86efac" : "#7ee8ff",
                            fontSize: "12px",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                          }}
                        >
                          {completed
                            ? "Completed Once"
                            : `Think Quiz ${quiz.quiz_order}`}
                        </p>

                        <h3
                          style={{
                            margin: "12px 0 0",
                            fontSize: "21px",
                            lineHeight: 1.2,
                          }}
                        >
                          {quiz.title}
                        </h3>

                        <p
                          style={{
                            margin: "10px 0 0",
                            fontSize: "13px",
                            lineHeight: 1.45,
                            color: "rgba(255,255,255,0.72)",
                          }}
                        >
                          {quiz.description}
                        </p>

                        {completed && completedAttempt && (
                          <p
                            style={{
                              margin: "14px 0 0",
                              color: "rgba(255,255,255,0.76)",
                              fontSize: "13px",
                              lineHeight: 1.45,
                            }}
                          >
                            Counted score: {completedAttempt.score}/100 ·
                            Correct: {completedAttempt.correct_count}/20 ·
                            Tokens: +{completedAttempt.tokens_earned}
                          </p>
                        )}

                        <div
                          style={{
                            ...thinkSmallButtonLook,
                            background: completed
                              ? "linear-gradient(135deg, #86efac, #22c55e)"
                              : thinkSmallButtonLook.background,
                            color: completed ? "#052e16" : "white",
                          }}
                        >
                          {completed ? "Replay Mission" : "Start 20 Questions ›"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {screen === "quiz" && currentQuestion && selectedQuiz && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: isDesktop ? "660px" : "auto",
                }}
              >
                <ThinkTopRow
                  leftButton="← Back to Quiz List"
                  onLeftClick={resetToQuizList}
                  rightText={`Score: ${score} · Question ${questionIndex + 1}/20`}
                />

                <div
                  style={{
                    marginTop: "22px",
                    display: "grid",
                    gridTemplateColumns: isDesktop
                      ? "minmax(0, 1.05fr) minmax(320px, 0.95fr)"
                      : "1fr",
                    gap: "24px",
                    flex: 1,
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "26px",
                      border: "1px solid rgba(150, 220, 255, 0.42)",
                      background:
                        "linear-gradient(180deg, rgba(20, 58, 100, 0.8), rgba(8, 25, 56, 0.94))",
                      padding: isMobile ? "20px" : "30px",
                      minHeight: isDesktop ? "590px" : "auto",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#60f0d0",
                        fontSize: "13px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      {currentQuestion.skill || selectedQuiz.title}
                    </p>

                    <h3
                      style={{
                        margin: "12px 0 0",
                        fontSize: isMobile ? "28px" : "36px",
                        fontWeight: 700,
                      }}
                    >
                      Question {questionIndex + 1}
                    </h3>

                    {currentQuestion.question_image && (
                      <div
                        style={{
                          marginTop: "24px",
                          borderRadius: "20px",
                          border: "1px solid rgba(126,232,255,0.28)",
                          background: "rgba(255,255,255,0.95)",
                          minHeight: "260px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={currentQuestion.question_image}
                          alt={`Question ${questionIndex + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                          draggable={false}
                        />
                      </div>
                    )}

                    <p
                      style={{
                        margin: currentQuestion.question_image
                          ? "26px 0 0"
                          : "34px 0 0",
                        fontSize: isMobile ? "23px" : "32px",
                        lineHeight: 1.35,
                        fontWeight: 500,
                        color: "white",
                      }}
                    >
                      {currentQuestion.question_text}
                    </p>

                    <p
                      style={{
                        margin: "18px 0 0",
                        color: "rgba(255,255,255,0.62)",
                        fontSize: "15px",
                      }}
                    >
                      Skill: {currentQuestion.skill}
                    </p>

                    {feedback && (
                      <div
                        style={{
                          marginTop: "auto",
                          borderRadius: "18px",
                          border:
                            selectedAnswer === currentQuestion.correct_answer
                              ? "1px solid rgba(74, 222, 128, 0.6)"
                              : "1px solid rgba(248, 113, 113, 0.6)",
                          background:
                            selectedAnswer === currentQuestion.correct_answer
                              ? "rgba(34, 197, 94, 0.14)"
                              : "rgba(239, 68, 68, 0.14)",
                          padding: "18px 20px",
                          fontSize: "16px",
                          lineHeight: 1.5,
                          color: "rgba(255,255,255,0.92)",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            color:
                              selectedAnswer === currentQuestion.correct_answer
                                ? "#86efac"
                                : "#fca5a5",
                            fontSize: "18px",
                          }}
                        >
                          {selectedAnswer === currentQuestion.correct_answer
                            ? "Correct!"
                            : "Not quite."}
                        </strong>
                        {feedback}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      borderRadius: "26px",
                      border: "1px solid rgba(150, 220, 255, 0.42)",
                      background:
                        "linear-gradient(180deg, rgba(17, 82, 136, 0.86), rgba(7, 27, 68, 0.98))",
                      padding: isMobile ? "20px" : "26px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 600 }}>
                      Choose your answer
                    </h3>

                    <div
                      style={{
                        marginTop: "20px",
                        display: "grid",
                        gap: "12px",
                      }}
                    >
                      <ThinkAnswerButton
                        label="A"
                        text={currentQuestion.option_a}
                        selected={selectedAnswer === "A"}
                        disabled={answerLocked || isFinishing}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("A")}
                      />
                      <ThinkAnswerButton
                        label="B"
                        text={currentQuestion.option_b}
                        selected={selectedAnswer === "B"}
                        disabled={answerLocked || isFinishing}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("B")}
                      />
                      <ThinkAnswerButton
                        label="C"
                        text={currentQuestion.option_c}
                        selected={selectedAnswer === "C"}
                        disabled={answerLocked || isFinishing}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("C")}
                      />
                      <ThinkAnswerButton
                        label="D"
                        text={currentQuestion.option_d}
                        selected={selectedAnswer === "D"}
                        disabled={answerLocked || isFinishing}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("D")}
                      />
                    </div>

                    {answerLocked && (
                      <button
                        type="button"
                        onClick={() => void nextQuestion()}
                        style={thinkNextButtonStyle}
                      >
                        {questionIndex >= 19
                          ? "Finish Mission"
                          : "Next Question"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {screen === "results" && selectedQuiz && (
              <div
                style={{
                  margin: "10px auto",
                  width: "min(760px, 100%)",
                  borderRadius: "26px",
                  border: "1px solid rgba(126,232,255,0.5)",
                  background:
                    "linear-gradient(180deg, rgba(17, 82, 136, 0.86), rgba(7, 27, 68, 0.98))",
                  padding: isMobile ? "24px" : "36px",
                  textAlign: "center",
                  boxShadow: "0 0 34px rgba(83, 215, 255, 0.28)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#60f0d0",
                    fontSize: "13px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Think Mission Complete
                </p>

                <h3
                  style={{
                    margin: "12px 0 0",
                    fontSize: isMobile ? "30px" : "38px",
                    fontWeight: 600,
                  }}
                >
                  {selectedQuiz.title}
                </h3>

                <div
                  style={{
                    marginTop: "28px",
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(4, minmax(0, 1fr))",
                    gap: "12px",
                  }}
                >
                  <ThinkResultStat label="Correct" value={`${correctCount}/20`} />
                  <ThinkResultStat label="Score" value={`${score}/100`} />
                  <ThinkResultStat label="Tokens" value={`+${tokensEarned}`} />
                  <ThinkResultStat label="Balance" value={String(tokenBalance)} />
                </div>

                <p
                  style={{
                    margin: "26px 0 0",
                    fontSize: "15px",
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  {rewardSaved && tokensEarned > 0
                    ? "Your attempt, gear progress and Dreamscape Token reward have been saved."
                    : rewardSaved
                      ? "Practice attempt saved. This quiz was already completed before, so no extra gear progress or tokens were awarded."
                      : "Your mission is complete, but the reward may not have been saved."}
                </p>

                <div
                  style={{
                    marginTop: "28px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={resetToQuizList}
                    style={thinkGhostButton}
                  >
                    Choose Another Quiz
                  </button>

                  <button
                    type="button"
                    onClick={onOpenMaze}
                    style={thinkPrimaryButton}
                  >
                    Enter Logic Maze
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function GearProgressCard({
  isMobile,
  completedMissionCount,
  currentUpgrade,
  nextUpgrade,
  progressPercentage,
  missionsToNext,
  isComplete,
  mazeRank,
  mazeBestScore,
  mazeBestTimeMs,
  mazeRankLoading,
  onOpenMaze,
}: {
  isMobile: boolean;
  completedMissionCount: number;
  currentUpgrade: ThinkGearUpgrade;
  nextUpgrade: ThinkGearUpgrade | undefined;
  progressPercentage: number;
  missionsToNext: number;
  isComplete: boolean;
  mazeRank: number | null;
  mazeBestScore: number | null;
  mazeBestTimeMs: number | null;
  mazeRankLoading: boolean;
  onOpenMaze: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [currentUpgrade.imageSrc]);

  return (
    <section
      style={{
        overflow: "hidden",
        borderRadius: isMobile ? "24px" : "30px",
        border: `1px solid ${currentUpgrade.accent}66`,
        background:
          "linear-gradient(155deg, rgba(5,22,48,0.94), rgba(8,42,58,0.92))",
        boxShadow: `0 0 30px ${currentUpgrade.accent}25, 0 24px 70px rgba(0,0,0,0.32)`,
      }}
    >
      <div style={{ padding: isMobile ? "20px" : "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: currentUpgrade.accent,
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Current Gear Loadout
            </p>

            <h2
              style={{
                margin: "10px 0 0",
                fontSize: isMobile ? "26px" : "32px",
                lineHeight: 1.08,
              }}
            >
              {currentUpgrade.name}
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: "rgba(255,255,255,0.62)",
                fontSize: "13px",
              }}
            >
              {completedMissionCount} counted Think Mission
              {completedMissionCount === 1 ? "" : "s"}
            </p>
          </div>

          <div
            style={{
              minWidth: "48px",
              height: "48px",
              borderRadius: "16px",
              border: `1px solid ${currentUpgrade.accent}66`,
              background: `${currentUpgrade.accent}18`,
              color: currentUpgrade.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 900,
            }}
          >
            {currentUpgrade.icon}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "20px",
            minHeight: isMobile ? "220px" : "270px",
            overflow: "hidden",
            borderRadius: "24px",
            border: `1px solid ${currentUpgrade.accent}4d`,
            background: `
              radial-gradient(circle at 50% 34%, ${currentUpgrade.accent}2f, transparent 42%),
              linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))
            `,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.24,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />

          {!imageFailed && (
            <img
              src={currentUpgrade.imageSrc}
              alt={currentUpgrade.name}
              onError={() => setImageFailed(true)}
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                height: isMobile ? "220px" : "270px",
                objectFit: "contain",
                filter: `drop-shadow(0 0 22px ${currentUpgrade.accent}55)`,
              }}
              draggable={false}
            />
          )}

          {imageFailed && (
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "150px",
                height: "150px",
                borderRadius: "40px",
                border: `1px solid ${currentUpgrade.accent}88`,
                background: `${currentUpgrade.accent}16`,
                boxShadow: `0 0 36px ${currentUpgrade.accent}35`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: currentUpgrade.accent,
                fontSize: "72px",
              }}
            >
              {currentUpgrade.icon}
            </div>
          )}
        </div>

        <p
          style={{
            margin: "18px 0 0",
            color: "rgba(255,255,255,0.78)",
            fontSize: "14px",
            lineHeight: 1.55,
          }}
        >
          {currentUpgrade.description}
        </p>

        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              color: "rgba(255,255,255,0.66)",
              fontSize: "12px",
            }}
          >
            <span>
              {isComplete
                ? "All current gear unlocked"
                : `Progress to ${nextUpgrade?.shortName}`}
            </span>
            <strong style={{ color: currentUpgrade.accent }}>
              {progressPercentage}%
            </strong>
          </div>

          <div
            style={{
              marginTop: "9px",
              height: "12px",
              overflow: "hidden",
              borderRadius: "999px",
              border: `1px solid ${currentUpgrade.accent}3d`,
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: "100%",
                borderRadius: "999px",
                background: `linear-gradient(90deg, ${currentUpgrade.accent}, #35c5ff)`,
                boxShadow: `0 0 18px ${currentUpgrade.accent}66`,
              }}
            />
          </div>

          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,0.58)",
              fontSize: "12px",
              lineHeight: 1.45,
            }}
          >
            {isComplete
              ? "Nova’s full Think Mission inventory is ready."
              : `${missionsToNext} more new Think Mission${
                  missionsToNext === 1 ? "" : "s"
                } required.`}
          </p>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(2,10,24,0.44)",
          padding: isMobile ? "18px 20px 20px" : "20px 24px 24px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#ffd76a",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 900,
          }}
        >
          Logic Maze Challenge
        </p>

        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px",
          }}
        >
          <ChallengeStat
            label="Current Rank"
            value={mazeRankLoading ? "..." : mazeRank ? `#${mazeRank}` : "Unranked"}
          />
          <ChallengeStat
            label="Best Score"
            value={
              mazeRankLoading
                ? "..."
                : mazeBestScore === null
                  ? "—"
                  : mazeBestScore.toLocaleString()
            }
          />
          <ChallengeStat
            label="Best Time"
            value={mazeRankLoading ? "..." : formatChallengeTime(mazeBestTimeMs)}
          />
        </div>

        <button
          type="button"
          onClick={onOpenMaze}
          style={{
            marginTop: "16px",
            width: "100%",
            minHeight: "52px",
            borderRadius: "15px",
            border: "1px solid rgba(255,255,255,0.45)",
            background: "linear-gradient(135deg, #60f0d0, #35c5ff)",
            color: "#041522",
            fontSize: "15px",
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 0 22px rgba(96,240,208,0.24)",
          }}
        >
          Enter Logic Maze ›
        </button>
      </div>
    </section>
  );
}

function ChallengeStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)",
        padding: "12px 8px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.5)",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "7px 0 0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: "15px",
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function QuizPanelHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginTop: "18px" }}>
      <p
        style={{
          margin: 0,
          color: "#60f0d0",
          fontSize: "11px",
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>
      <h2 style={{ margin: "8px 0 0", fontSize: "30px", lineHeight: 1.15 }}>
        {title}
      </h2>
      <p
        style={{
          margin: "10px 0 0",
          color: "rgba(255,255,255,0.66)",
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function ThinkAnswerButton({
  label,
  text,
  selected,
  disabled,
  correctAnswer,
  answerLocked,
  onClick,
}: {
  label: ThinkAnswer;
  text: string;
  selected: boolean;
  disabled: boolean;
  correctAnswer: ThinkAnswer;
  answerLocked: boolean;
  onClick: () => void;
}) {
  const isCorrectChoice = label === correctAnswer;
  const isWrongSelected = selected && answerLocked && !isCorrectChoice;
  const isCorrectSelected = selected && answerLocked && isCorrectChoice;

  let border = "1px solid rgba(126,232,255,0.32)";
  let background = "rgba(255,255,255,0.08)";
  let color = disabled ? "rgba(255,255,255,0.5)" : "white";

  if (selected && !answerLocked) {
    border = "1px solid rgba(126,232,255,0.95)";
    background = "linear-gradient(135deg, #35c5ff, #4c6dff)";
    color = "white";
  }

  if (isCorrectSelected) {
    border = "1px solid rgba(74, 222, 128, 0.9)";
    background =
      "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))";
    color = "white";
  }

  if (isWrongSelected) {
    border = "1px solid rgba(248, 113, 113, 0.9)";
    background =
      "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))";
    color = "white";
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        borderRadius: "16px",
        border,
        background,
        color,
        minHeight: "62px",
        padding: "12px 14px",
        display: "grid",
        gridTemplateColumns: "34px 1fr",
        gap: "12px",
        alignItems: "center",
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        transition: "background 180ms ease, border 180ms ease",
      }}
    >
      <strong
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
        }}
      >
        {label}
      </strong>
      <span style={{ fontSize: "15px", lineHeight: 1.35 }}>{text}</span>
    </button>
  );
}

function ThinkTopRow({
  leftButton,
  onLeftClick,
  rightText,
}: {
  leftButton: string;
  onLeftClick: () => void;
  rightText: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "18px",
      }}
    >
      <button type="button" onClick={onLeftClick} style={thinkBackButtonStyle}>
        {leftButton}
      </button>
      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.74)",
          fontSize: "14px",
        }}
      >
        {rightText}
      </p>
    </div>
  );
}

function ThinkMessageCard({ message }: { message: string }) {
  return (
    <div
      style={{
        margin: "20px auto",
        maxWidth: "560px",
        borderRadius: "24px",
        border: "1px solid rgba(126,232,255,0.36)",
        background: "rgba(255,255,255,0.08)",
        padding: "30px",
        textAlign: "center",
        color: "rgba(255,255,255,0.82)",
      }}
    >
      {message}
    </div>
  );
}

function ThinkErrorMessage({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: "22px",
        borderRadius: "16px",
        border: "1px solid rgba(255,215,106,0.45)",
        background: "rgba(255,215,106,0.1)",
        padding: "14px 16px",
        color: "#ffe6a8",
        fontSize: "14px",
      }}
    >
      {message}
    </div>
  );
}

function ThinkResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(126,232,255,0.28)",
        background: "rgba(255,255,255,0.08)",
        padding: "16px 10px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#7ee8ff",
          fontSize: "12px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: "22px", fontWeight: 700 }}>
        {value}
      </p>
    </div>
  );
}

function thinkLargeCardStyle(accent: string): CSSProperties {
  return {
    minHeight: "280px",
    borderRadius: "24px",
    padding: "26px",
    border: `1px solid ${accent}88`,
    background:
      "linear-gradient(180deg, rgba(35, 60, 120, 0.76), rgba(8, 25, 56, 0.92))",
    boxShadow: `0 0 22px ${accent}22, inset 0 0 24px rgba(255,255,255,0.03)`,
    color: "white",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
  };
}

const thinkCardTitleStyle: CSSProperties = {
  margin: "24px 0 0",
  fontSize: "28px",
  fontWeight: 700,
};

const thinkCardTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "15px",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.76)",
};

const thinkCardButtonLook: CSSProperties = {
  marginTop: "auto",
  minHeight: "52px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #60f0d0, #35c5ff)",
  color: "#041522",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 800,
};

const thinkSmallButtonLook: CSSProperties = {
  marginTop: "auto",
  minHeight: "44px",
  borderRadius: "13px",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 700,
};

const thinkBackButtonStyle: CSSProperties = {
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 16px",
  cursor: "pointer",
};

const thinkNextButtonStyle: CSSProperties = {
  marginTop: "20px",
  width: "100%",
  minHeight: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #7ee8ff, #35c5ff)",
  color: "#06142d",
  fontSize: "16px",
  fontWeight: 800,
  cursor: "pointer",
};

const thinkPrimaryButton: CSSProperties = {
  minHeight: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #60f0d0, #35c5ff)",
  color: "#041522",
  padding: "0 22px",
  fontWeight: 800,
  cursor: "pointer",
};

const thinkPrimaryLinkStyle: CSSProperties = {
  ...thinkPrimaryButton,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

const thinkGhostButton: CSSProperties = {
  minHeight: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 22px",
  cursor: "pointer",
};
