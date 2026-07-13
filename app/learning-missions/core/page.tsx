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

const allowedCoreMissionTiers = [
  "admin",
  "gkp_student",
  "paid_student",
  "student",
  "pro",
];

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
  const [accessTier, setAccessTier] = useState<string | null>(null);

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

  const currentQuestion = questions[questionIndex];

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

    const { data, error } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.warn("Could not check Core Missions access:", error);
      setScreen("locked");
      return;
    }

    setAccessTier(data.tier);

    if (!allowedCoreMissionTiers.includes(data.tier)) {
      setScreen("locked");
      return;
    }

    setScreen("subject");
  }

  async function chooseSubject(subject: CoreSubject) {
    setSelectedSubject(subject);
    setSelectedLevelBand(null);
    setSelectedQuiz(null);
    setQuizzes([]);
    setQuestions([]);
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

    const reward = calculateTokenReward(score, correctCount);

    setTokensEarned(reward);
    setScreen("results");

    const { error: attemptError } = await supabase
      .from("core_mission_attempts")
      .insert({
        user_id: userId,
        quiz_id: selectedQuiz.id,
        score,
        correct_count: correctCount,
        total_questions: questions.length,
        tokens_earned: reward,
      });

    if (attemptError) {
      console.warn("Could not save Core Mission attempt:", attemptError);
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
    setScreen("subject");
  }

  function resetToLevels() {
    setSelectedLevelBand(null);
    setSelectedQuiz(null);
    setQuizzes([]);
    setQuestions([]);
    setQuestionIndex(0);
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "86px 14px 28px" : "96px 26px 42px",
        background:
          "radial-gradient(circle at 50% 0%, rgba(126,232,255,0.2), transparent 35%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(1180px, 94vw)",
          maxHeight: isMobile ? "88dvh" : "92vh",
          overflowY: "auto",
          borderRadius: isMobile ? "22px" : "30px",
          border: "1px solid rgba(126, 221, 255, 0.62)",
          background:
            "linear-gradient(145deg, rgba(15, 48, 88, 0.96), rgba(9, 24, 56, 0.98))",
          boxShadow:
            "0 0 45px rgba(85, 215, 255, 0.35), 0 30px 90px rgba(0, 0, 0, 0.55)",
          padding: isMobile ? "28px 18px 24px" : "34px 46px 38px",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={onExit}
          style={{
            position: "absolute",
            top: isMobile ? "14px" : "22px",
            right: isMobile ? "14px" : "22px",
            width: isMobile ? "38px" : "44px",
            height: isMobile ? "38px" : "44px",
            borderRadius: "999px",
            border: "1px solid rgba(150, 231, 255, 0.7)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "white",
            fontSize: isMobile ? "24px" : "28px",
            lineHeight: 1,
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(83, 215, 255, 0.22)",
          }}
        >
          ×
        </button>

        <div
          style={{
            textAlign: "center",
            padding: isMobile ? "0 42px" : "0 70px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7ee8ff",
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Learning Missions
          </p>

          <h2
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "32px" : "44px",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              textShadow: "0 0 24px rgba(126, 221, 255, 0.35)",
            }}
          >
            Core Missions
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "16px" : "20px",
              color: "#7ee8ff",
              fontWeight: 300,
            }}
          >
            Practise focused English and Math missions by level band.
          </p>

          <div
            style={{
              width: "210px",
              height: "1px",
              margin: "20px auto 0",
              background:
                "linear-gradient(90deg, transparent, rgba(126,232,255,0.9), transparent)",
            }}
          />
        </div>

        {screen === "checking" && (
          <CoreMessageCard message="Checking your Core Missions access..." />
        )}

        {screen === "locked" && (
          <div
            style={{
              margin: "42px auto 0",
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
              Core Missions are available for GKP students, paid Student Access
              members, Pro users and admins.
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
          <div
            style={{
              marginTop: "42px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: "24px",
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

                <div style={coreCardButtonLook}>Choose {subject.title} ›</div>
              </button>
            ))}
          </div>
        )}

        {screen === "level" && selectedSubjectInfo && (
          <div style={{ marginTop: "38px" }}>
            <CoreTopRow
              leftButton="← Back to Subjects"
              onLeftClick={resetToSubjects}
              rightText={`Subject: ${selectedSubjectInfo.title}`}
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
            <div style={{ marginTop: "38px" }}>
              <CoreTopRow
                leftButton="← Back to Levels"
                onLeftClick={resetToLevels}
                rightText={`${selectedSubjectInfo.title} · ${selectedLevelInfo.title} ${selectedLevelInfo.label}`}
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
                    : "repeat(5, minmax(0, 1fr))",
                  gap: "16px",
                }}
              >
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    type="button"
                    onClick={() => startQuiz(quiz)}
                    style={{
                      minHeight: isMobile ? "auto" : "210px",
                      borderRadius: "22px",
                      padding: "20px",
                      border: "1px solid rgba(126,232,255,0.36)",
                      background:
                        "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                      color: "white",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#7ee8ff",
                        fontSize: "12px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      Quiz {quiz.quiz_order}
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

                    <div style={coreSmallButtonLook}>Start 20 Questions ›</div>
                  </button>
                ))}
              </div>
            </div>
          )}

        {screen === "quiz" && currentQuestion && selectedQuiz && (
          <div style={{ marginTop: "34px" }}>
            <CoreTopRow
              leftButton="← Back to Quiz List"
              onLeftClick={resetToQuizList}
              rightText={`Score: ${score} · Question ${questionIndex + 1}/20`}
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
                <h3
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 600,
                  }}
                >
                  Choose your answer
                </h3>

                <div
                  style={{
                    marginTop: "20px",
                    display: "grid",
                    gap: "12px",
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
                    {questionIndex >= 19 ? "Finish Mission" : "Next Question"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {screen === "results" && selectedQuiz && (
          <div
            style={{
              margin: "42px auto 0",
              maxWidth: "720px",
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
              Core Mission Complete
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
              {rewardSaved
                ? "Your Core Mission attempt and Dreamscape Token reward have been saved."
                : "Your mission is complete. Token reward may not have been saved."}
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

              <button type="button" onClick={onExit} style={corePrimaryButton}>
                Exit Core Missions
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
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
        margin: "52px auto 20px",
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
    minHeight: "330px",
    borderRadius: "24px",
    padding: "30px",
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