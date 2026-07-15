"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCoreRoverProgress,
  type CoreRoverUpgrade,
} from "@/lib/coreRoverProgress";

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

export default function CoreMissionsPage() {
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
    <CoreMissionsActivity
      tokenBalance={tokenBalance}
      onTokenBalanceChange={setTokenBalance}
      onExit={() => router.push("/learning-missions")}
    />
  );
}

type CoreSubject = "english" | "math";
type CoreLevelBand = "foundation" | "growth" | "mastery";
type CoreAnswer = "A" | "B" | "C" | "D";

type CoreMissionQuiz = {
  id: string;
  subject: CoreSubject;
  level_band: CoreLevelBand;
  level_label: string;
  title: string;
  description: string;
  quiz_order: number;
};

type CoreMissionQuestion = {
  id: string;
  quiz_id: string;
  question_order: number;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CoreAnswer;
  explanation: string;
  skill: string;
  difficulty: string;
};

type CompletedCoreAttempt = {
  quiz_id: string;
  score: number;
  correct_count: number;
  tokens_earned: number;
};

const coreSubjects: {
  id: CoreSubject;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
}[] = [
  {
    id: "english",
    title: "English",
    subtitle:
      "Practise grammar, vocabulary, comprehension, sentence skills and language use.",
    icon: "✎",
    accent: "#ff9df0",
  },
  {
    id: "math",
    title: "Math",
    subtitle:
      "Strengthen number skills, word problems, geometry, measurement and problem-solving.",
    icon: "∑",
    accent: "#53d7ff",
  },
];

const coreLevelBands: {
  id: CoreLevelBand;
  title: string;
  label: string;
  subtitle: string;
  accent: string;
}[] = [
  {
    id: "foundation",
    title: "Foundation",
    label: "P1–P2",
    subtitle: "Build essential school basics with simple, clear practice.",
    accent: "#7ee8ff",
  },
  {
    id: "growth",
    title: "Growth",
    label: "P3–P4",
    subtitle: "Strengthen accuracy, concepts and problem-solving confidence.",
    accent: "#60f0d0",
  },
  {
    id: "mastery",
    title: "Mastery",
    label: "P5–P6",
    subtitle: "Practise upper primary skills and more challenging questions.",
    accent: "#ffd76a",
  },
];

function normaliseRole(role: string | null | undefined) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function roleHasFullCoreAccess(role: string | null | undefined) {
  const cleanRole = normaliseRole(role);
  return cleanRole === "admin" || cleanRole === "student";
}

function CoreMissionsActivity({
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
    | "subject"
    | "level"
    | "quiz-list"
    | "loading"
    | "quiz"
    | "results"
  >("checking");

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CoreSubject | null>(
    null
  );
  const [selectedLevelBand, setSelectedLevelBand] =
    useState<CoreLevelBand | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<CoreMissionQuiz | null>(
    null
  );

  const [quizzes, setQuizzes] = useState<CoreMissionQuiz[]>([]);
  const [questions, setQuestions] = useState<CoreMissionQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<CoreAnswer | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [rewardSaved, setRewardSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [completedAttempts, setCompletedAttempts] = useState<
    CompletedCoreAttempt[]
  >([]);

  const currentQuestion = questions[questionIndex];

  const completedQuizIds = new Set(
    completedAttempts.map((attempt) => attempt.quiz_id)
  );

  const completedMissionCount = completedAttempts.length;

  const {
    currentUpgrade,
    nextUpgrade,
    progressPercentage,
    missionsToNext,
    isComplete,
  } = getCoreRoverProgress(completedMissionCount);

  useEffect(() => {
    checkAccess();
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
      console.warn("Could not check Core Missions profile:", profileError);
      setScreen("locked");
      return;
    }

    const userRole = profile.role || profile.tier || null;

    if (roleHasFullCoreAccess(userRole)) {
      await loadCompletedAttempts(user.id);
      setScreen("subject");
      return;
    }

    const { data: accessRow, error: accessError } = await supabase
      .from("learning_mission_zone_access")
      .select("is_unlocked")
      .eq("user_id", user.id)
      .eq("zone_key", "core")
      .maybeSingle();

    if (accessError) {
      console.warn("Could not check Core zone unlock:", accessError.message);
      setScreen("locked");
      return;
    }

    if (!accessRow?.is_unlocked) {
      setScreen("locked");
      return;
    }

    await loadCompletedAttempts(user.id);
    setScreen("subject");
  }

  async function loadCompletedAttempts(activeUserId: string) {
    const { data, error } = await supabase
      .from("core_mission_attempts")
      .select("quiz_id, score, correct_count, tokens_earned")
      .eq("user_id", activeUserId);

    if (error) {
      console.warn("Could not load completed Core Mission attempts:", error);
      setCompletedAttempts([]);
      return;
    }

    const uniqueAttempts = new Map<string, CompletedCoreAttempt>();

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

  async function chooseSubject(subject: CoreSubject) {
    setSelectedSubject(subject);
    setSelectedLevelBand(null);
    setSelectedQuiz(null);
    setQuizzes([]);
    setQuestions([]);
    setLoadError(null);
    setScreen("level");
  }

  async function chooseLevel(levelBand: CoreLevelBand) {
    if (!selectedSubject) return;

    setSelectedLevelBand(levelBand);
    setLoadError(null);
    setScreen("loading");

    const { data, error } = await supabase
      .from("core_mission_quizzes")
      .select(
        "id, subject, level_band, level_label, title, description, quiz_order"
      )
      .eq("subject", selectedSubject)
      .eq("level_band", levelBand)
      .eq("is_active", true)
      .order("quiz_order", { ascending: true });

    if (error || !data) {
      console.warn("Could not load Core Mission quizzes:", error);
      setLoadError("Could not load the quiz list. Please try again.");
      setScreen("level");
      return;
    }

    setQuizzes(data as CoreMissionQuiz[]);
    setScreen("quiz-list");
  }

  async function startQuiz(quiz: CoreMissionQuiz) {
    setSelectedQuiz(quiz);
    setLoadError(null);
    setScreen("loading");

    const { data, error } = await supabase
      .from("core_mission_questions")
      .select(
        "id, quiz_id, question_order, question_text, question_image, option_a, option_b, option_c, option_d, correct_answer, explanation, skill, difficulty"
      )
      .eq("quiz_id", quiz.id)
      .eq("is_active", true)
      .order("question_order", { ascending: true })
      .limit(20);

    if (error || !data) {
      console.warn("Could not load Core Mission questions:", error);
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

    setQuestions(data as CoreMissionQuestion[]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setTokensEarned(0);
    setRewardSaved(false);
    setScreen("quiz");
  }

  function chooseAnswer(answer: CoreAnswer) {
    if (!currentQuestion || answerLocked) return;

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

  function calculateTokenReward(finalScore: number, finalCorrectCount: number) {
    let reward = 2;

    if (finalCorrectCount >= 14) reward += 1;
    if (finalCorrectCount >= 18) reward += 1;
    if (finalScore === 100) reward += 1;

    return reward;
  }

  async function finishQuiz() {
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
      .from("core_mission_attempts")
      .insert({
        user_id: userId,
        quiz_id: selectedQuiz.id,
        score: finalScore,
        correct_count: finalCorrectCount,
        total_questions: questions.length,
        tokens_earned: reward,
      });

    if (attemptError) {
      console.warn("Could not save Core Mission attempt:", attemptError);
      setRewardSaved(false);
      return;
    }

    if (!hasCompletedThisQuizBefore) {
      const newAttempt: CompletedCoreAttempt = {
        quiz_id: selectedQuiz.id,
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
        title: "Core Missions Reward",
        amount: reward,
        token_kind: "virtual",
      });

    if (tokenError) {
      console.warn("Could not award Core Mission tokens:", tokenError);
      setRewardSaved(false);
      return;
    }

    setRewardSaved(true);
    onTokenBalanceChange(tokenBalance + reward);
    window.dispatchEvent(new Event("dream-tokens-updated"));
  }

  function resetToSubjects() {
    setSelectedSubject(null);
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
    setLoadError(null);
    setScreen("subject");
  }

  function resetToLevels() {
    setSelectedLevelBand(null);
    setSelectedQuiz(null);
    setQuizzes([]);
    setQuestions([]);
    setQuestionIndex(0);
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
    setLoadError(null);
    setScreen("quiz-list");
  }

  const selectedSubjectInfo = coreSubjects.find(
    (subject) => subject.id === selectedSubject
  );

  const selectedLevelInfo = coreLevelBands.find(
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
            rgba(2,8,19,0.88)
          ),
          url("/activities/learning-missions/core/skyforge-hangar-bg.png")
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
                  color: "#7ee8ff",
                  fontSize: "13px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                }}
              >
                Core Missions
              </p>

              <h1
                style={{
                  margin: "12px 0 0",
                  fontSize: isMobile ? "38px" : isCompact ? "54px" : "68px",
                  lineHeight: 0.95,
                  fontWeight: 600,
                  letterSpacing: "-0.055em",
                  textShadow: "0 0 30px rgba(126, 221, 255, 0.28)",
                }}
              >
                Build Nova’s
                <br />
                Skyforge Rover
              </h1>

              <p
                style={{
                  margin: "20px 0 0",
                  maxWidth: "640px",
                  fontSize: isMobile ? "16px" : "18px",
                  color: "#c9f9ff",
                  lineHeight: 1.6,
                  fontWeight: 300,
                }}
              >
                Complete English and Math missions to unlock each rover upgrade.
                Replays are saved, but only first completions add upgrade
                progress.
              </p>
            </div>

            <RoverProgressCard
              isMobile={isMobile}
              completedMissionCount={completedMissionCount}
              currentUpgrade={currentUpgrade}
              nextUpgrade={nextUpgrade}
              progressPercentage={progressPercentage}
              missionsToNext={missionsToNext}
              isComplete={isComplete}
            />
          </aside>

          <section
            style={{
              borderRadius: isMobile ? "24px" : "32px",
              border: "1px solid rgba(126,232,255,0.24)",
              background:
                "linear-gradient(145deg, rgba(5,18,42,0.82), rgba(8,26,58,0.92))",
              boxShadow:
                "0 0 34px rgba(83,215,255,0.14), 0 28px 80px rgba(0,0,0,0.36)",
              padding: isMobile ? "20px" : "30px",
              minHeight: isDesktop ? "720px" : "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {screen === "checking" && (
              <CoreMessageCard message="Checking your Core Missions access..." />
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
                  Core Missions Locked
                </h3>

                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: "16px",
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  Core Missions are available for accounts with Core zone access.
                  Ask your teacher or admin to unlock this zone based on your
                  current course.
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
                  <a href="/login" style={corePrimaryLinkStyle}>
                    Log In
                  </a>

                  <button type="button" onClick={onExit} style={coreGhostButton}>
                    Exit
                  </button>
                </div>
              </div>
            )}

            {screen === "subject" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <QuizPanelHeader
                  eyebrow="Choose Subject"
                  title="Start a Core Mission"
                  description="Pick English or Math, then choose your level band."
                />

                <div
                  style={{
                    marginTop: "22px",
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: "22px",
                    flex: 1,
                  }}
                >
                  {coreSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => chooseSubject(subject.id)}
                      style={coreLargeCardStyle(subject.accent)}
                    >
                      <div style={{ fontSize: "46px", color: subject.accent }}>
                        {subject.icon}
                      </div>

                      <h3 style={coreCardTitleStyle}>{subject.title}</h3>

                      <p style={coreCardTextStyle}>{subject.subtitle}</p>

                      <div style={coreCardButtonLook}>
                        Choose {subject.title} ›
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === "level" && selectedSubjectInfo && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <CoreTopRow
                  leftButton="← Back to Subjects"
                  onLeftClick={resetToSubjects}
                  rightText={`Subject: ${selectedSubjectInfo.title}`}
                />

                <QuizPanelHeader
                  eyebrow="Choose Level"
                  title={`${selectedSubjectInfo.title} Missions`}
                  description="Select the level band that matches the mission set you want to practise."
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
                  {coreLevelBands.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => chooseLevel(level.id)}
                      style={coreLargeCardStyle(level.accent)}
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

                      <h3 style={coreCardTitleStyle}>{level.title}</h3>

                      <p style={coreCardTextStyle}>{level.subtitle}</p>

                      <div style={coreCardButtonLook}>View Quizzes ›</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === "loading" && (
              <CoreMessageCard message="Loading Core Mission..." />
            )}

            {screen === "quiz-list" &&
              selectedSubjectInfo &&
              selectedLevelInfo && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <CoreTopRow
                    leftButton="← Back to Levels"
                    onLeftClick={resetToLevels}
                    rightText={`${selectedSubjectInfo.title} · ${selectedLevelInfo.title} ${selectedLevelInfo.label}`}
                  />

                  <QuizPanelHeader
                    eyebrow="Choose Quiz"
                    title={`${selectedLevelInfo.title} Mission Set`}
                    description="Complete a new quiz to earn tokens and unlock the next rover upgrade."
                  />

                  {loadError && <CoreErrorMessage message={loadError} />}

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
                        (attempt) => attempt.quiz_id === quiz.id
                      );

                      return (
                        <button
                          key={quiz.id}
                          type="button"
                          onClick={() => startQuiz(quiz)}
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
                              : `Quiz ${quiz.quiz_order}`}
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
                              ...coreSmallButtonLook,
                              background: completed
                                ? "linear-gradient(135deg, #86efac, #22c55e)"
                                : coreSmallButtonLook.background,
                              color: completed ? "#052e16" : "white",
                            }}
                          >
                            {completed
                              ? "Replay Mission"
                              : "Start 20 Questions ›"}
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
                <CoreTopRow
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
                        color: "#7ee8ff",
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
                        "linear-gradient(180deg, rgba(17, 82, 136, 0.9), rgba(7, 27, 68, 0.98))",
                      padding: isMobile ? "20px" : "30px",
                      minHeight: isDesktop ? "590px" : "auto",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: isMobile ? "24px" : "30px",
                        fontWeight: 700,
                      }}
                    >
                      Choose your answer
                    </h3>

                    <div
                      style={{
                        marginTop: "26px",
                        display: "grid",
                        gap: "14px",
                      }}
                    >
                      <CoreAnswerButton
                        label="A"
                        text={currentQuestion.option_a}
                        selected={selectedAnswer === "A"}
                        disabled={answerLocked}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("A")}
                      />

                      <CoreAnswerButton
                        label="B"
                        text={currentQuestion.option_b}
                        selected={selectedAnswer === "B"}
                        disabled={answerLocked}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("B")}
                      />

                      <CoreAnswerButton
                        label="C"
                        text={currentQuestion.option_c}
                        selected={selectedAnswer === "C"}
                        disabled={answerLocked}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("C")}
                      />

                      <CoreAnswerButton
                        label="D"
                        text={currentQuestion.option_d}
                        selected={selectedAnswer === "D"}
                        disabled={answerLocked}
                        correctAnswer={currentQuestion.correct_answer}
                        answerLocked={answerLocked}
                        onClick={() => chooseAnswer("D")}
                      />
                    </div>

                    {answerLocked && (
                      <button
                        type="button"
                        onClick={nextQuestion}
                        style={coreNextButtonStyle}
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
                  maxWidth: "800px",
                  borderRadius: "26px",
                  border: "1px solid rgba(126,232,255,0.5)",
                  background:
                    "linear-gradient(180deg, rgba(17, 82, 136, 0.86), rgba(7, 27, 68, 0.98))",
                  padding: isMobile ? "24px" : "40px",
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
                  Core Mission Complete
                </p>

                <h3
                  style={{
                    margin: "12px 0 0",
                    fontSize: isMobile ? "30px" : "42px",
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
                      : "repeat(4, minmax(0, 1fr))",
                    gap: "12px",
                  }}
                >
                  <CoreResultStat label="Correct" value={`${correctCount}/20`} />
                  <CoreResultStat label="Score" value={`${score}/100`} />
                  <CoreResultStat label="Tokens" value={`+${tokensEarned}`} />
                  <CoreResultStat label="Balance" value={String(tokenBalance)} />
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
                    ? "Your Core Mission attempt, Skyforge Rover progress, and Dreamscape Token reward have been saved."
                    : rewardSaved
                    ? "Practice attempt saved. This quiz was already completed before, so no extra upgrade progress or tokens were awarded."
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
                    style={coreGhostButton}
                  >
                    Choose Another Quiz
                  </button>

                  <button
                    type="button"
                    onClick={onExit}
                    style={corePrimaryButton}
                  >
                    Exit Core Missions
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

function RoverProgressCard({
  isMobile,
  completedMissionCount,
  currentUpgrade,
  nextUpgrade,
  progressPercentage,
  missionsToNext,
  isComplete,
}: {
  isMobile: boolean;
  completedMissionCount: number;
  currentUpgrade: CoreRoverUpgrade;
  nextUpgrade: CoreRoverUpgrade | undefined;
  progressPercentage: number;
  missionsToNext: number;
  isComplete: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: "30px",
        border: `1px solid ${currentUpgrade.accent}88`,
        background:
          "linear-gradient(145deg, rgba(6,24,52,0.82), rgba(3,13,34,0.92))",
        boxShadow: `0 0 30px ${currentUpgrade.accent}24, 0 24px 70px rgba(0,0,0,0.4)`,
        overflow: "hidden",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          padding: isMobile ? "18px" : "22px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "14px",
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
            Current Rover Build
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              fontSize: isMobile ? "26px" : "32px",
              lineHeight: 1.08,
              fontWeight: 800,
            }}
          >
            {currentUpgrade.name}
          </h2>
        </div>

        <div
          style={{
            minWidth: "82px",
            padding: "9px 12px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.08)",
            color: "#c9f9ff",
            fontSize: "12px",
            fontWeight: 900,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {completedMissionCount} done
        </div>
      </div>

      <div
        style={{
          margin: "0 22px",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
          background:
            "radial-gradient(circle at 50% 42%, rgba(126,232,255,0.12), rgba(255,255,255,0.03) 48%, rgba(0,0,0,0.12))",
          minHeight: isMobile ? "230px" : "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={currentUpgrade.imageSrc}
          alt={currentUpgrade.name}
          draggable={false}
          style={{
            width: "100%",
            maxWidth: isMobile ? "360px" : "520px",
            height: "100%",
            maxHeight: isMobile ? "230px" : "300px",
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 24px 34px rgba(0,0,0,0.45))",
          }}
        />
      </div>

      <div style={{ padding: isMobile ? "18px" : "22px" }}>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.78)",
            fontSize: "15px",
            lineHeight: 1.5,
          }}
        >
          {currentUpgrade.description}
        </p>

        <div
          style={{
            marginTop: "18px",
            height: "14px",
            borderRadius: "999px",
            border: "1px solid rgba(126,232,255,0.28)",
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
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

        <div
          style={{
            marginTop: "16px",
            borderRadius: "18px",
            border: `1px solid ${
              nextUpgrade ? nextUpgrade.accent : "#86efac"
            }55`,
            background: nextUpgrade
              ? "rgba(255,215,106,0.1)"
              : "rgba(34,197,94,0.1)",
            padding: "16px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: nextUpgrade ? nextUpgrade.accent : "#86efac",
              fontSize: "11px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            {nextUpgrade ? "Next Unlock" : "Rover Complete"}
          </p>

          <h3
            style={{
              margin: "8px 0 0",
              fontSize: "21px",
              lineHeight: 1.15,
            }}
          >
            {nextUpgrade ? nextUpgrade.name : "All Upgrades Complete"}
          </h3>

          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,0.76)",
              fontSize: "14px",
              lineHeight: 1.45,
            }}
          >
            {nextUpgrade
              ? `Complete ${missionsToNext} new Core Mission${
                  missionsToNext === 1 ? "" : "s"
                } to unlock.`
              : "Nova’s Skyforge Rover is fully upgraded."}
          </p>
        </div>

        <p
          style={{
            margin: "14px 0 0",
            color: isComplete ? "#86efac" : "rgba(255,255,255,0.62)",
            fontSize: "13px",
            lineHeight: 1.45,
          }}
        >
          Counted Core Missions:{" "}
          <strong style={{ color: currentUpgrade.accent }}>
            {completedMissionCount}
          </strong>
        </p>
      </div>
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
          color: "#7ee8ff",
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        {eyebrow}
      </p>

      <h2
        style={{
          margin: "8px 0 0",
          fontSize: "32px",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "10px 0 0",
          color: "rgba(255,255,255,0.68)",
          fontSize: "15px",
          lineHeight: 1.55,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function CoreAnswerButton({
  label,
  text,
  selected,
  disabled,
  correctAnswer,
  answerLocked,
  onClick,
}: {
  label: CoreAnswer;
  text: string;
  selected: boolean;
  disabled: boolean;
  correctAnswer: CoreAnswer;
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
        minHeight: "72px",
        padding: "14px 16px",
        display: "grid",
        gridTemplateColumns: "38px 1fr",
        gap: "14px",
        alignItems: "center",
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        transition: "background 180ms ease, border 180ms ease",
      }}
    >
      <strong
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "17px",
        }}
      >
        {label}
      </strong>

      <span
        style={{
          fontSize: "16px",
          lineHeight: 1.35,
          fontWeight: 700,
        }}
      >
        {text}
      </span>
    </button>
  );
}

function CoreTopRow({
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
      <button type="button" onClick={onLeftClick} style={coreBackButtonStyle}>
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

function CoreMessageCard({ message }: { message: string }) {
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

function CoreErrorMessage({ message }: { message: string }) {
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

function CoreResultStat({ label, value }: { label: string; value: string }) {
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
          fontSize: "24px",
          fontWeight: 700,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function coreLargeCardStyle(accent: string): CSSProperties {
  return {
    minHeight: "280px",
    borderRadius: "24px",
    padding: "28px",
    border: `1px solid ${accent}88`,
    background:
      "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
    boxShadow: `0 0 22px ${accent}22, inset 0 0 24px rgba(255,255,255,0.03)`,
    color: "white",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
  };
}

const coreCardTitleStyle: CSSProperties = {
  margin: "24px 0 0",
  fontSize: "30px",
  fontWeight: 700,
};

const coreCardTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "16px",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.76)",
};

const coreCardButtonLook: CSSProperties = {
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

const coreSmallButtonLook: CSSProperties = {
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

const coreBackButtonStyle: CSSProperties = {
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 16px",
  cursor: "pointer",
};

const coreNextButtonStyle: CSSProperties = {
  marginTop: "auto",
  width: "100%",
  height: "56px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #7ee8ff, #35c5ff)",
  color: "#06142d",
  fontSize: "16px",
  fontWeight: 800,
  cursor: "pointer",
};

const corePrimaryButton: CSSProperties = {
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 22px",
  fontWeight: 700,
  cursor: "pointer",
};

const corePrimaryLinkStyle: CSSProperties = {
  ...corePrimaryButton,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

const coreGhostButton: CSSProperties = {
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 22px",
  cursor: "pointer",
};