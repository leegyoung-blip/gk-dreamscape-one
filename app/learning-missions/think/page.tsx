"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

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

    loadTokens();

    function handleTokenUpdate() {
      loadTokens();
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
    />
  );
}

type ThinkLevelBand = "foundation" | "growth" | "mastery";
type ThinkAnswer = "A" | "B" | "C" | "D";
type ThinkMode = "normal" | "challenge";

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
  mode: ThinkMode;
};

type ThinkInventoryUpgrade = {
  missionsRequired: number;
  name: string;
  description: string;
  image: string;
  icon: string;
  accent: string;
};

function normaliseRole(role: string | null) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function roleHasMissionAccess(role: string | null) {
  const cleanRole = normaliseRole(role);

  return (
    cleanRole === "admin" ||
    cleanRole === "student" ||
    cleanRole === "teacher"
  );
}

const thinkInventoryTrack: ThinkInventoryUpgrade[] = [
  {
    missionsRequired: 0,
    name: "Empty Gear Wall",
    description:
      "Nova’s inventory station is ready, but her mission tools are still locked.",
    image: "/learning-missions/think/items/empty-gear-wall.png",
    icon: "□",
    accent: "#7ee8ff",
  },
  {
    missionsRequired: 1,
    name: "Logic Lens",
    description:
      "Nova can scan hidden clues and identify important patterns in Dreamscape.",
    image: "/learning-missions/think/items/logic-lens.png",
    icon: "◉",
    accent: "#60f0d0",
  },
  {
    missionsRequired: 3,
    name: "Pattern Scanner",
    description:
      "Nova can detect repeating sequences, visual rules and puzzle structures.",
    image: "/learning-missions/think/items/pattern-scanner.png",
    icon: "⌁",
    accent: "#7ee8ff",
  },
  {
    missionsRequired: 5,
    name: "Clue Compass",
    description:
      "Nova can track missing information and find the next step in harder missions.",
    image: "/learning-missions/think/items/clue-compass.png",
    icon: "◇",
    accent: "#ffd76a",
  },
  {
    missionsRequired: 8,
    name: "Puzzle Shield",
    description:
      "Nova gains protection against confusing traps, false clues and tricky choices.",
    image: "/learning-missions/think/items/puzzle-shield.png",
    icon: "⬡",
    accent: "#b58cff",
  },
  {
    missionsRequired: 12,
    name: "Energy Wrench",
    description:
      "Nova can repair broken logic gates and restore puzzle systems across Dreamscape.",
    image: "/learning-missions/think/items/energy-wrench.png",
    icon: "⚙",
    accent: "#ffcc66",
  },
  {
    missionsRequired: 16,
    name: "Spark Staff",
    description:
      "Nova unlocks an advanced reasoning tool that powers complex mission routes.",
    image: "/learning-missions/think/items/spark-staff.png",
    icon: "✦",
    accent: "#ff9df0",
  },
  {
    missionsRequired: 20,
    name: "Advanced Gear Inventory",
    description:
      "Nova’s full Think Mission inventory is ready for major Dreamscape expeditions.",
    image: "/learning-missions/think/items/advanced-gear-inventory.png",
    icon: "✧",
    accent: "#60f0d0",
  },
];

const thinkLevelBands: {
  id: ThinkLevelBand;
  title: string;
  label: string;
  subtitle: string;
  accent: string;
}[] = [
  {
    id: "foundation",
    title: "Foundation Think Missions",
    label: "P1–P2",
    subtitle: "Simple patterns, visual thinking and beginner logic puzzles.",
    accent: "#7ee8ff",
  },
  {
    id: "growth",
    title: "Growth Think Missions",
    label: "P3–P4",
    subtitle: "Stronger reasoning, rule-based patterns and deduction skills.",
    accent: "#60f0d0",
  },
  {
    id: "mastery",
    title: "Mastery Think Missions",
    label: "P5–P6",
    subtitle: "Advanced logic, non-routine problems and higher-level thinking.",
    accent: "#ffd76a",
  },
];

const thinkModes: {
  id: ThinkMode;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
}[] = [
  {
    id: "normal",
    title: "Normal Mode",
    subtitle: "No timer. Think carefully and learn from each question.",
    badge: "Learn",
    accent: "#7ee8ff",
  },
  {
    id: "challenge",
    title: "Challenge Mode",
    subtitle: "15-minute timer for 20 questions. Best for speed and focus.",
    badge: "Timed",
    accent: "#ffcc66",
  },
];

function getCurrentInventoryUpgrade(completedCount: number) {
  let currentUpgrade = thinkInventoryTrack[0];

  for (const upgrade of thinkInventoryTrack) {
    if (completedCount >= upgrade.missionsRequired) {
      currentUpgrade = upgrade;
    }
  }

  return currentUpgrade;
}

function getNextInventoryUpgrade(completedCount: number) {
  return thinkInventoryTrack.find(
    (upgrade) => completedCount < upgrade.missionsRequired
  );
}

function getUnlockedInventoryItems(completedCount: number) {
  return thinkInventoryTrack.filter(
    (upgrade) => completedCount >= upgrade.missionsRequired
  );
}

function getPreviewInventoryItems(completedCount: number) {
  return thinkInventoryTrack.filter(
    (upgrade) => upgrade.missionsRequired <= Math.max(5, completedCount + 5)
  );
}

function ThinkMissionsActivity({
  onExit,
  tokenBalance,
  onTokenBalanceChange,
}: {
  onExit: () => void;
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
    | "mode"
    | "loading"
    | "quiz"
    | "results"
  >("checking");

  const [userId, setUserId] = useState<string | null>(null);

  const [selectedLevelBand, setSelectedLevelBand] =
    useState<ThinkLevelBand | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<ThinkMissionQuiz | null>(
    null
  );
  const [selectedMode, setSelectedMode] = useState<ThinkMode | null>(null);

  const [quizzes, setQuizzes] = useState<ThinkMissionQuiz[]>([]);
  const [questions, setQuestions] = useState<ThinkMissionQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<ThinkAnswer | null>(
    null
  );
  const [answerLocked, setAnswerLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [rewardSaved, setRewardSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isFinishing, setIsFinishing] = useState(false);

  const [completedAttempts, setCompletedAttempts] = useState<
    CompletedThinkAttempt[]
  >([]);

  const currentQuestion = questions[questionIndex];

  const completedQuizIds = new Set(
    completedAttempts.map((attempt) => attempt.quiz_id)
  );

  const completedMissionCount = completedAttempts.length;
  const currentInventoryUpgrade =
    getCurrentInventoryUpgrade(completedMissionCount);
  const nextInventoryUpgrade =
    getNextInventoryUpgrade(completedMissionCount);

  const unlockedInventoryItems = getUnlockedInventoryItems(
    completedMissionCount
  );

  const previewInventoryItems = getPreviewInventoryItems(completedMissionCount);

  const progressTarget =
    nextInventoryUpgrade?.missionsRequired ??
    thinkInventoryTrack[thinkInventoryTrack.length - 1].missionsRequired;

  const previousTarget = currentInventoryUpgrade.missionsRequired;
  const progressRange = Math.max(1, progressTarget - previousTarget);
  const progressWithinRange = Math.max(
    0,
    completedMissionCount - previousTarget
  );

  const progressPercentage = nextInventoryUpgrade
    ? Math.min(100, Math.round((progressWithinRange / progressRange) * 100))
    : 100;

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (screen !== "quiz") return;
    if (selectedMode !== "challenge") return;
    if (isFinishing) return;

    if (timeLeft <= 0) {
      void finishQuiz();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [screen, selectedMode, timeLeft, isFinishing]);

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

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      console.warn("Could not check Think Missions access:", error);
      setScreen("locked");
      return;
    }

    if (!roleHasMissionAccess(data.role || null)) {
      setScreen("locked");
      return;
    }

    await loadCompletedAttempts(user.id);
    setScreen("level");
  }

  async function loadCompletedAttempts(activeUserId: string) {
    const { data, error } = await supabase
      .from("think_mission_attempts")
      .select("quiz_id, mode, score, correct_count, tokens_earned")
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
          mode: attempt.mode as ThinkMode,
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
    setSelectedMode(null);
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

  function chooseQuiz(quiz: ThinkMissionQuiz) {
    setSelectedQuiz(quiz);
    setSelectedMode(null);
    setLoadError(null);
    setScreen("mode");
  }

  async function startQuiz(mode: ThinkMode) {
    if (!selectedQuiz) return;

    setSelectedMode(mode);
    setLoadError(null);
    setScreen("loading");

    const { data, error } = await supabase
      .from("think_mission_questions")
      .select(
        "id, quiz_id, question_order, question_text, question_image, option_a, option_b, option_c, option_d, correct_answer, explanation, skill, difficulty"
      )
      .eq("quiz_id", selectedQuiz.id)
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
        "This quiz does not have 20 active questions yet. Please add more questions in Supabase."
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
    setTimeLeft(15 * 60);
    setIsFinishing(false);
    setScreen("quiz");
  }

  function chooseAnswer(answer: ThinkAnswer) {
    if (!currentQuestion || answerLocked || isFinishing) return;

    setSelectedAnswer(answer);

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = isCorrect ? 5 : 0;

    if (isCorrect) {
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setFeedback(`+${points} points. ${currentQuestion.explanation}`);
    } else {
      setFeedback(
        `The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`
      );
    }

    setAnswerLocked(true);
  }

  async function nextQuestion() {
    if (questionIndex >= questions.length - 1) {
      await finishQuiz();
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
  }

  function calculateTokenReward(
    mode: ThinkMode,
    finalScore: number,
    finalCorrectCount: number,
    finalTimeLeft: number
  ) {
    let reward = mode === "challenge" ? 3 : 2;

    if (finalCorrectCount >= 14) reward += 1;
    if (finalCorrectCount >= 18) reward += 1;
    if (finalScore === 100) reward += 1;

    if (mode === "challenge" && finalTimeLeft > 0) {
      reward += 1;
    }

    return reward;
  }

  async function finishQuiz() {
    if (isFinishing) return;

    setIsFinishing(true);

    if (!userId || !selectedQuiz) {
      setScreen("results");
      return;
    }

    const finalMode = selectedMode ?? "normal";
    const finalScore = score;
    const finalCorrectCount = correctCount;
    const finalTimeLeft = timeLeft;

    const finalTimeTaken =
      finalMode === "challenge"
        ? Math.max(0, 15 * 60 - finalTimeLeft)
        : null;

    const hasCompletedThisQuizBefore = isQuizCompleted(selectedQuiz.id);

    const reward = hasCompletedThisQuizBefore
      ? 0
      : calculateTokenReward(
          finalMode,
          finalScore,
          finalCorrectCount,
          finalTimeLeft
        );

    setTokensEarned(reward);
    setScreen("results");

    const { error: attemptError } = await supabase
      .from("think_mission_attempts")
      .insert({
        user_id: userId,
        quiz_id: selectedQuiz.id,
        mode: finalMode,
        score: finalScore,
        correct_count: finalCorrectCount,
        total_questions: questions.length,
        time_taken_seconds: finalTimeTaken,
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
        mode: finalMode,
        score: finalScore,
        correct_count: finalCorrectCount,
        tokens_earned: reward,
      };

      setCompletedAttempts((prev) => [...prev, newAttempt]);
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
        title:
          finalMode === "challenge"
            ? "Think Missions Challenge Reward"
            : "Think Missions Reward",
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
    setSelectedMode(null);
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
    setTimeLeft(15 * 60);
    setIsFinishing(false);
    setLoadError(null);
    setScreen("level");
  }

  function resetToQuizList() {
    setSelectedQuiz(null);
    setSelectedMode(null);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setTokensEarned(0);
    setRewardSaved(false);
    setTimeLeft(15 * 60);
    setIsFinishing(false);
    setLoadError(null);
    setScreen("quiz-list");
  }

  function resetToMode() {
    setSelectedMode(null);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setTokensEarned(0);
    setRewardSaved(false);
    setTimeLeft(15 * 60);
    setIsFinishing(false);
    setLoadError(null);
    setScreen("mode");
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  const selectedLevelInfo = thinkLevelBands.find(
    (level) => level.id === selectedLevelBand
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
            ? "82px 18px 32px"
            : isCompact
            ? "92px 32px 42px"
            : "92px 5vw 54px",
          display: "grid",
          gridTemplateRows: "auto auto 1fr",
          gap: isMobile ? "24px" : "30px",
        }}
      >
        <header
          style={{
            width: "min(1240px, 100%)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.05fr 0.95fr",
            gap: isMobile ? "22px" : "34px",
            alignItems: "end",
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
                fontSize: isMobile ? "38px" : isCompact ? "54px" : "72px",
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
                maxWidth: "720px",
                fontSize: isMobile ? "16px" : "20px",
                color: "#c8fff3",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              Dreamscape is filled with hidden clues, puzzle gates and strange
              patterns. Complete Think Missions to unlock Nova’s scanners,
              shields and advanced reasoning tools.
            </p>
          </div>

          <ThinkGearShowcase
            isMobile={isMobile}
            completedMissionCount={completedMissionCount}
            previewInventoryItems={previewInventoryItems}
          />
        </header>

        <ThinkInventoryPanel
          isMobile={isMobile}
          completedMissionCount={completedMissionCount}
          currentUpgrade={currentInventoryUpgrade}
          nextUpgrade={nextInventoryUpgrade}
          progressPercentage={progressPercentage}
        />

        <section
          style={{
            width: "min(1240px, 100%)",
            margin: "0 auto",
            borderRadius: isMobile ? "24px" : "32px",
            border: "1px solid rgba(96,240,208,0.22)",
            background:
              "linear-gradient(145deg, rgba(5,18,42,0.74), rgba(8,34,58,0.82))",
            boxShadow:
              "0 0 34px rgba(96,240,208,0.12), 0 28px 80px rgba(0,0,0,0.34)",
            padding: isMobile ? "20px" : "30px",
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
                Think Missions are available for student, teacher, and admin
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
                gap: "22px",
              }}
            >
              {thinkLevelBands.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => chooseLevel(level.id)}
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

                  <div style={thinkCardButtonLook}>Enter Missions ›</div>
                </button>
              ))}
            </div>
          )}

          {screen === "loading" && (
            <ThinkMessageCard message="Loading Think Mission..." />
          )}

          {screen === "quiz-list" && selectedLevelInfo && (
            <div>
              <ThinkTopRow
                leftButton="← Back to Levels"
                onLeftClick={resetToLevels}
                rightText={`${selectedLevelInfo.title} · ${selectedLevelInfo.label}`}
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
                  gap: "20px",
                }}
              >
                {quizzes.map((quiz) => {
                  const completed = isQuizCompleted(quiz.id);
                  const completedAttempt = completedAttempts.find(
                    (attempt) => attempt.quiz_id === quiz.id
                  );

                  return (
                    <button
                      key={quiz.id}
                      type="button"
                      onClick={() => chooseQuiz(quiz)}
                      style={{
                        minHeight: isMobile ? "auto" : "290px",
                        borderRadius: "24px",
                        padding: "26px",
                        border: completed
                          ? "1px solid rgba(74,222,128,0.5)"
                          : "1px solid rgba(126,232,255,0.36)",
                        background: completed
                          ? "linear-gradient(180deg, rgba(20, 92, 60, 0.72), rgba(8, 35, 36, 0.9))"
                          : "linear-gradient(180deg, rgba(35, 60, 120, 0.78), rgba(8, 25, 56, 0.92))",
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
                          margin: "16px 0 0",
                          fontSize: "28px",
                          lineHeight: 1.15,
                        }}
                      >
                        {quiz.title}
                      </h3>

                      <p
                        style={{
                          margin: "12px 0 0",
                          fontSize: "15px",
                          lineHeight: 1.5,
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
                        {completed ? "Replay Mission" : "Choose Mode ›"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {screen === "mode" && selectedQuiz && (
            <div>
              <ThinkTopRow
                leftButton="← Back to Quizzes"
                onLeftClick={resetToQuizList}
                rightText={selectedQuiz.title}
              />

              <div
                style={{
                  marginTop: "28px",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: "24px",
                }}
              >
                {thinkModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => startQuiz(mode.id)}
                    style={thinkLargeCardStyle(mode.accent)}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: mode.accent,
                        fontSize: "14px",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      {mode.badge}
                    </p>

                    <h3 style={thinkCardTitleStyle}>{mode.title}</h3>

                    <p style={thinkCardTextStyle}>{mode.subtitle}</p>

                    <div style={thinkCardButtonLook}>
                      Start {mode.title} ›
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen === "quiz" && currentQuestion && selectedQuiz && (
            <div>
              <ThinkTopRow
                leftButton="← Back to Mode"
                onLeftClick={resetToMode}
                rightText={
                  selectedMode === "challenge"
                    ? `Challenge Mode · ${formatTime(timeLeft)}`
                    : `Normal Mode · Question ${questionIndex + 1}/20`
                }
              />

              <div
                style={{
                  marginTop: "22px",
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0, 1.1fr) 360px",
                  gap: "24px",
                }}
              >
                <div
                  style={{
                    borderRadius: "24px",
                    border: "1px solid rgba(150, 220, 255, 0.42)",
                    background:
                      "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                    padding: "26px",
                    minHeight: isMobile ? "auto" : "470px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#7ee8ff",
                      fontSize: "13px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedQuiz.title}
                  </p>

                  <h3
                    style={{
                      margin: "8px 0 0",
                      fontSize: isMobile ? "25px" : "30px",
                      fontWeight: 600,
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
                        minHeight: "220px",
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
                      margin: "26px 0 0",
                      fontSize: isMobile ? "21px" : "28px",
                      lineHeight: 1.35,
                      fontWeight: 500,
                      color: "white",
                    }}
                  >
                    {currentQuestion.question_text}
                  </p>

                  <p
                    style={{
                      margin: "14px 0 0",
                      color: "rgba(255,255,255,0.62)",
                      fontSize: "14px",
                    }}
                  >
                    Skill: {currentQuestion.skill}
                  </p>

                  {feedback && (
                    <div
                      style={{
                        marginTop: "24px",
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
                    borderRadius: "24px",
                    border: "1px solid rgba(150, 220, 255, 0.42)",
                    background:
                      "linear-gradient(180deg, rgba(17, 82, 136, 0.86), rgba(7, 27, 68, 0.98))",
                    padding: "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 600,
                      }}
                    >
                      Choose your answer
                    </h3>

                    {selectedMode === "challenge" && (
                      <div
                        style={{
                          borderRadius: "999px",
                          border: "1px solid rgba(255,215,106,0.5)",
                          background: "rgba(255,215,106,0.12)",
                          padding: "8px 10px",
                          color: "#ffe6a8",
                          fontSize: "13px",
                          fontWeight: 800,
                        }}
                      >
                        {formatTime(timeLeft)}
                      </div>
                    )}
                  </div>

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
                      onClick={nextQuestion}
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
                maxWidth: "760px",
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
                  color: "#7ee8ff",
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
                    : isCompact
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(5, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                <ThinkResultStat label="Correct" value={`${correctCount}/20`} />
                <ThinkResultStat label="Score" value={`${score}/100`} />
                <ThinkResultStat
                  label="Mode"
                  value={selectedMode === "challenge" ? "Timed" : "Normal"}
                />
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
                  ? "Your Think Mission attempt, Nova gear progress, and Dreamscape Token reward have been saved."
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
                  onClick={onExit}
                  style={thinkPrimaryButton}
                >
                  Exit Think Missions
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function ThinkGearShowcase({
  isMobile,
  completedMissionCount,
  previewInventoryItems,
}: {
  isMobile: boolean;
  completedMissionCount: number;
  previewInventoryItems: ThinkInventoryUpgrade[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
        gap: "14px",
      }}
    >
      {previewInventoryItems.slice(0, isMobile ? 4 : 6).map((item) => {
        const unlocked = completedMissionCount >= item.missionsRequired;

        return (
          <GearItemCard
            key={item.name}
            item={item}
            unlocked={unlocked}
          />
        );
      })}
    </div>
  );
}

function GearItemCard({
  item,
  unlocked,
}: {
  item: ThinkInventoryUpgrade;
  unlocked: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "178px",
        borderRadius: "24px",
        border: `1px solid ${
          unlocked ? `${item.accent}aa` : "rgba(255,255,255,0.15)"
        }`,
        background: unlocked
          ? "linear-gradient(145deg, rgba(8,34,64,0.82), rgba(4,14,34,0.88))"
          : "linear-gradient(145deg, rgba(30,30,42,0.62), rgba(8,12,28,0.86))",
        padding: "16px",
        boxShadow: unlocked ? `0 0 24px ${item.accent}28` : "none",
        opacity: unlocked ? 1 : 0.78,
      }}
    >
      <div
        style={{
          height: "72px",
          borderRadius: "18px",
          border: `1px solid ${
            unlocked ? `${item.accent}66` : "rgba(255,255,255,0.12)"
          }`,
          backgroundImage: `
            linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
            url("${item.image}")
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: item.accent,
          fontSize: "30px",
          fontWeight: 900,
        }}
      >
        {item.icon}
      </div>

      <p
        style={{
          margin: "12px 0 0",
          color: unlocked ? item.accent : "rgba(255,255,255,0.45)",
          fontSize: "10px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        {unlocked ? "Unlocked" : `${item.missionsRequired} missions`}
      </p>

      <h3
        style={{
          margin: "7px 0 0",
          fontSize: "18px",
          lineHeight: 1.15,
        }}
      >
        {item.name}
      </h3>
    </div>
  );
}

function ThinkInventoryPanel({
  isMobile,
  completedMissionCount,
  currentUpgrade,
  nextUpgrade,
  progressPercentage,
}: {
  isMobile: boolean;
  completedMissionCount: number;
  currentUpgrade: ThinkInventoryUpgrade;
  nextUpgrade: ThinkInventoryUpgrade | undefined;
  progressPercentage: number;
}) {
  const missionsToNext = nextUpgrade
    ? Math.max(0, nextUpgrade.missionsRequired - completedMissionCount)
    : 0;

  return (
    <section
      style={{
        width: "min(1240px, 100%)",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
        gap: "20px",
      }}
    >
      <div
        style={{
          borderRadius: "26px",
          border: "1px solid rgba(96,240,208,0.35)",
          background:
            "linear-gradient(145deg, rgba(5,22,48,0.72), rgba(16,62,74,0.58))",
          padding: isMobile ? "20px" : "24px",
          boxShadow: "0 0 24px rgba(96,240,208,0.14)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#60f0d0",
            fontSize: "12px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 800,
          }}
        >
          Gear Inventory Progress
        </p>

        <h3
          style={{
            margin: "12px 0 0",
            fontSize: isMobile ? "26px" : "34px",
            lineHeight: 1.15,
          }}
        >
          {currentUpgrade.name}
        </h3>

        <p
          style={{
            margin: "12px 0 0",
            color: "rgba(255,255,255,0.78)",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          {currentUpgrade.description}
        </p>

        <div
          style={{
            marginTop: "22px",
            height: "14px",
            borderRadius: "999px",
            border: "1px solid rgba(96,240,208,0.28)",
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercentage}%`,
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #60f0d0, #35c5ff)",
              boxShadow: "0 0 18px rgba(96,240,208,0.45)",
            }}
          />
        </div>

        <p
          style={{
            margin: "12px 0 0",
            color: "rgba(255,255,255,0.66)",
            fontSize: "14px",
          }}
        >
          Counted Think Missions:{" "}
          <strong style={{ color: "#60f0d0" }}>
            {completedMissionCount}
          </strong>
        </p>
      </div>

      <div
        style={{
          borderRadius: "26px",
          border: "1px solid rgba(255,215,106,0.35)",
          background:
            "linear-gradient(145deg, rgba(74,47,12,0.58), rgba(18,22,45,0.76))",
          padding: isMobile ? "20px" : "24px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#ffd76a",
            fontSize: "12px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 800,
          }}
        >
          Next Unlock
        </p>

        <h3
          style={{
            margin: "12px 0 0",
            fontSize: isMobile ? "24px" : "30px",
            lineHeight: 1.15,
          }}
        >
          {nextUpgrade ? nextUpgrade.name : "Advanced Gear Inventory Complete"}
        </h3>

        <p
          style={{
            margin: "12px 0 0",
            color: "rgba(255,255,255,0.78)",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          {nextUpgrade
            ? nextUpgrade.description
            : "Nova’s full thinking inventory is unlocked. Future Think Missions can still be replayed for practice."}
        </p>

        <div
          style={{
            marginTop: "18px",
            borderRadius: "16px",
            background: "rgba(255,215,106,0.12)",
            border: "1px solid rgba(255,215,106,0.28)",
            padding: "14px 16px",
            color: "#ffe6a8",
            fontSize: "14px",
            lineHeight: 1.45,
          }}
        >
          {nextUpgrade
            ? `Complete ${missionsToNext} new Think Mission${
                missionsToNext === 1 ? "" : "s"
              } to unlock this gear. Replays are saved, but they do not add gear progress.`
            : "All current gear inventory upgrades unlocked."}
        </div>
      </div>
    </section>
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

      <span
        style={{
          fontSize: "15px",
          lineHeight: 1.35,
        }}
      >
        {text}
      </span>
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

      <p
        style={{
          margin: "8px 0 0",
          fontSize: "22px",
          fontWeight: 700,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function thinkLargeCardStyle(accent: string): CSSProperties {
  return {
    minHeight: "300px",
    borderRadius: "24px",
    padding: "30px",
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
  fontSize: "30px",
  fontWeight: 700,
};

const thinkCardTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "16px",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.76)",
};

const thinkCardButtonLook: CSSProperties = {
  marginTop: "auto",
  height: "52px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 700,
};

const thinkSmallButtonLook: CSSProperties = {
  marginTop: "auto",
  height: "44px",
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
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #7ee8ff, #35c5ff)",
  color: "#06142d",
  fontSize: "16px",
  fontWeight: 800,
  cursor: "pointer",
};

const thinkPrimaryButton: CSSProperties = {
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 22px",
  fontWeight: 700,
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
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 22px",
  cursor: "pointer",
};