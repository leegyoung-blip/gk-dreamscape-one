"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180) {
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

type ThinkingCategoryId = "word" | "spatial" | "logic";
type AnswerChoice = "A" | "B" | "C" | "D";

type ThinkingSkillQuestionRow = {
  id: string;
  week_id: string;
  category: ThinkingCategoryId;
  category_title: string;
  category_subtitle: string;
  category_cover_image: string;
  question_order: number;
  level: string;
  skill: string;
  question_image: string;
  correct_answer: AnswerChoice;
  hint: string;
  explanation: string;
};

type ThinkingSkillCategory = {
  title: string;
  subtitle: string;
  image: string;
  questions: ThinkingSkillQuestionRow[];
};

export default function ThinkingSkillsLabPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const [tokenBalance, setTokenBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [weeklyChallenges, setWeeklyChallenges] = useState<
    Record<ThinkingCategoryId, ThinkingSkillCategory> | null
  >(null);

  const [selectedCategory, setSelectedCategory] =
    useState<ThinkingCategoryId | null>(null);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] =
    useState<AnswerChoice | null>(null);

  const [score, setScore] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealsUsed, setRevealsUsed] = useState(0);

  const [shownHint, setShownHint] = useState<string | null>(null);
  const [revealedAnswer, setRevealedAnswer] =
    useState<AnswerChoice | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [answerLocked, setAnswerLocked] = useState(false);

  useEffect(() => {
    loadTokens();

    function handleTokenUpdate() {
      loadTokens();
    }

    window.addEventListener("dream-tokens-updated", handleTokenUpdate);

    return () => {
      window.removeEventListener("dream-tokens-updated", handleTokenUpdate);
    };
  }, []);

  useEffect(() => {
    async function loadWeeklyChallenge() {
      setLoading(true);
      setLoadError(null);

      const { data: activeWeek, error: weekError } = await supabase
        .from("thinking_skill_weeks")
        .select("id, title, week_start, week_end")
        .eq("is_active", true)
        .single();

      if (weekError || !activeWeek) {
        setLoadError("No active Thinking Skills Lab challenge is available yet.");
        setLoading(false);
        return;
      }

      const { data: questions, error: questionError } = await supabase
        .from("thinking_skill_questions")
        .select(
          `
          id,
          week_id,
          category,
          category_title,
          category_subtitle,
          category_cover_image,
          question_order,
          level,
          skill,
          question_image,
          correct_answer,
          hint,
          explanation
        `
        )
        .eq("week_id", activeWeek.id)
        .order("category", { ascending: true })
        .order("question_order", { ascending: true });

      if (questionError || !questions) {
        setLoadError("Could not load this week’s Thinking Skills questions.");
        setLoading(false);
        return;
      }

      const grouped = buildWeeklyChallengeData(
        questions as ThinkingSkillQuestionRow[]
      );

      if (!grouped) {
        setLoadError(
          "This week’s challenge is incomplete. Please check that each category has 3 questions."
        );
        setLoading(false);
        return;
      }

      setWeeklyChallenges(grouped);
      setLoading(false);
    }

    loadWeeklyChallenge();
  }, []);

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

    const total = data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;

    setTokenBalance(total);
  }

  const category =
    selectedCategory && weeklyChallenges
      ? weeklyChallenges[selectedCategory]
      : null;

  const currentQuestion = category?.questions[questionIndex];

  function buildWeeklyChallengeData(rows: ThinkingSkillQuestionRow[]) {
    const categoryIds: ThinkingCategoryId[] = ["word", "spatial", "logic"];

    const grouped = categoryIds.reduce((acc, categoryId) => {
      const categoryRows = rows
        .filter((row) => row.category === categoryId)
        .sort((a, b) => a.question_order - b.question_order);

      if (categoryRows.length !== 3) {
        return acc;
      }

      acc[categoryId] = {
        title: categoryRows[0].category_title,
        subtitle: categoryRows[0].category_subtitle,
        image: categoryRows[0].category_cover_image,
        questions: categoryRows,
      };

      return acc;
    }, {} as Record<ThinkingCategoryId, ThinkingSkillCategory>);

    const isComplete = categoryIds.every(
      (categoryId) => grouped[categoryId]?.questions.length === 3
    );

    return isComplete ? grouped : null;
  }

  function resetQuiz(categoryId: ThinkingCategoryId) {
    setSelectedCategory(categoryId);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setSkipped(0);
    setHintsUsed(0);
    setRevealsUsed(0);
    setShownHint(null);
    setRevealedAnswer(null);
    setFeedback(null);
    setCompleted(false);
    setAnswerLocked(false);
  }

  async function spendTokens(amount: number, title: string) {
    if (tokenBalance < amount) {
      setFeedback("You do not have enough Dreamscape Tokens.");
      return false;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFeedback("Please log in to use Dreamscape Tokens.");
      return false;
    }

    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: user.id,
      type: "spend",
      title,
      amount: -amount,
      token_kind: "virtual",
    });

    if (error) {
      console.warn("Token transaction failed:", error);
      setFeedback("Could not update Dreamscape Tokens. Please try again.");
      return false;
    }

    setTokenBalance((current) => current - amount);
    window.dispatchEvent(new Event("dream-tokens-updated"));
    return true;
  }

  async function useHint() {
    if (!currentQuestion || shownHint || answerLocked) return;

    const spent = await spendTokens(1, "Thinking Skills Lab Hint");
    if (!spent) return;

    setHintsUsed((prev) => prev + 1);
    setShownHint(currentQuestion.hint);
    setFeedback("Hint unlocked.");
  }

  async function revealAnswer() {
    if (!currentQuestion || revealedAnswer || answerLocked) return;

    const spent = await spendTokens(3, "Thinking Skills Lab Answer Reveal");
    if (!spent) return;

    setRevealsUsed((prev) => prev + 1);
    setRevealedAnswer(currentQuestion.correct_answer);
    setFeedback(`Answer revealed: ${currentQuestion.correct_answer}`);
  }

  function submitAnswer() {
    if (!currentQuestion || answerLocked) return;

    if (!selectedAnswer) {
      setFeedback("Choose A, B, C, or D before submitting.");
      return;
    }

    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback(`Correct! ${currentQuestion.explanation}`);
    } else {
      setFeedback(
        `Not quite. The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`
      );
    }

    setAnswerLocked(true);
  }

  function skipQuestion() {
    if (answerLocked) return;

    setSkipped((prev) => prev + 1);
    setFeedback(
      currentQuestion
        ? `Question skipped. The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`
        : "Question skipped."
    );
    setAnswerLocked(true);
  }

  function nextQuestion() {
    if (!category) return;

    if (questionIndex >= category.questions.length - 1) {
      setCompleted(true);
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setShownHint(null);
    setRevealedAnswer(null);
    setFeedback(null);
    setAnswerLocked(false);
  }

  function backToCategories() {
    setSelectedCategory(null);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setShownHint(null);
    setRevealedAnswer(null);
    setFeedback(null);
    setCompleted(false);
    setAnswerLocked(false);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        backgroundImage: `
          linear-gradient(180deg, rgba(2,8,19,0.62), rgba(2,8,19,0.92)),
          radial-gradient(circle at 50% 0%, rgba(126,232,255,0.18), transparent 38%),
          url("/nova/thinking-skills-lab/thinking-skills-lab-bg.png")
        `,
        backgroundColor: "#020813",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
      }}
    >
      <Link
        href="/inventor"
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
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          backdropFilter: "blur(14px)",
          boxShadow: "0 0 18px rgba(83, 215, 255, 0.22)",
        }}
      >
        ← Nova’s World
      </Link>

      <section
        style={{
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: isMobile ? "92px 0 34px" : "104px 0 56px",
        }}
      >
        <header style={{ textAlign: "center" }}>
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
            Free Weekly Feature
          </p>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "38px" : "64px",
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: "-0.055em",
              textShadow: "0 0 30px rgba(126, 221, 255, 0.28)",
            }}
          >
            Thinking Skills Lab
          </h1>

          <p
            style={{
              margin: "14px auto 0",
              maxWidth: "720px",
              fontSize: isMobile ? "16px" : "20px",
              color: "#c9f9ff",
              lineHeight: 1.55,
              fontWeight: 300,
            }}
          >
            Try this week’s HAP-style 3-question challenge. Use Dreamscape Tokens
            for hints or answer reveals.
          </p>

          <div
            style={{
              margin: "22px auto 0",
              width: "fit-content",
              borderRadius: "999px",
              border: "1px solid rgba(126,232,255,0.4)",
              padding: "10px 16px",
              color: "#7ee8ff",
              fontSize: "14px",
              background: "rgba(2,8,19,0.45)",
              backdropFilter: "blur(12px)",
            }}
          >
            Dreamscape Tokens: {tokenBalance}
          </div>
        </header>

        <section
          style={{
            marginTop: isMobile ? "24px" : "34px",
            borderRadius: isMobile ? "24px" : "32px",
            border: "1px solid rgba(126,232,255,0.22)",
            background:
              "linear-gradient(145deg, rgba(5,18,42,0.82), rgba(8,26,58,0.92))",
            boxShadow:
              "0 0 34px rgba(83,215,255,0.14), 0 28px 80px rgba(0,0,0,0.36)",
            padding: isMobile ? "20px" : "30px",
          }}
        >
          {loading && (
            <MessageCard message="Loading this week’s Thinking Skills challenge..." />
          )}

          {!loading && loadError && <MessageCard message={loadError} />}

          {!loading && !loadError && weeklyChallenges && !selectedCategory && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isDesktop
                  ? "repeat(3, minmax(0, 1fr))"
                  : isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: isMobile ? "16px" : "22px",
              }}
            >
              {(["word", "spatial", "logic"] as ThinkingCategoryId[]).map(
                (categoryId) => {
                  const item = weeklyChallenges[categoryId];

                  return (
                    <button
                      key={categoryId}
                      type="button"
                      onClick={() => resetQuiz(categoryId)}
                      style={{
                        minHeight: isDesktop ? "440px" : "auto",
                        borderRadius: "24px",
                        padding: isMobile ? "18px" : "24px",
                        border: "1px solid rgba(150, 220, 255, 0.42)",
                        background:
                          "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                        boxShadow:
                          "inset 0 0 24px rgba(255,255,255,0.03), 0 18px 42px rgba(0,0,0,0.28)",
                        color: "white",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          height: isMobile ? "150px" : "190px",
                          width: "100%",
                          borderRadius: "18px",
                          border: "1px solid rgba(126,232,255,0.28)",
                          background:
                            "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: "8px",
                          }}
                          draggable={false}
                        />
                      </div>

                      <h3
                        style={{
                          margin: "22px 0 0",
                          fontSize: isMobile ? "23px" : "28px",
                          fontWeight: 700,
                          lineHeight: 1.25,
                          minHeight: isDesktop ? "70px" : "auto",
                        }}
                      >
                        {item.title}
                      </h3>

                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: "15px",
                          lineHeight: 1.45,
                          color: "rgba(255,255,255,0.78)",
                          minHeight: isDesktop ? "66px" : "auto",
                        }}
                      >
                        {item.subtitle}
                      </p>

                      <div
                        style={{
                          marginTop: "22px",
                          height: "52px",
                          borderRadius: "14px",
                          background:
                            "linear-gradient(135deg, #35c5ff, #4c6dff)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          fontWeight: 700,
                          boxShadow: "0 0 24px rgba(83, 215, 255, 0.36)",
                        }}
                      >
                        Start 3-Question Challenge ›
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {selectedCategory && category && currentQuestion && !completed && (
            <div>
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: isMobile ? "stretch" : "center",
                  marginBottom: "22px",
                }}
              >
                <button
                  type="button"
                  onClick={backToCategories}
                  style={ghostButtonStyle}
                >
                  ← Back to Categories
                </button>

                <div
                  style={{
                    borderRadius: "999px",
                    border: "1px solid rgba(126,232,255,0.4)",
                    padding: "10px 16px",
                    color: "#7ee8ff",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  Score: {score} · Question {questionIndex + 1}/3
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop
                    ? "minmax(0, 1.1fr) 360px"
                    : "1fr",
                  gap: "24px",
                }}
              >
                <div
                  style={{
                    borderRadius: "24px",
                    border: "1px solid rgba(150, 220, 255, 0.42)",
                    background:
                      "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                    padding: isMobile ? "18px" : "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      gap: "16px",
                      alignItems: isMobile ? "stretch" : "start",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#7ee8ff",
                          fontSize: "13px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        {category.title}
                      </p>

                      <h3
                        style={{
                          margin: "8px 0 0",
                          fontSize: isMobile ? "25px" : "30px",
                          fontWeight: 600,
                        }}
                      >
                        Question {questionIndex + 1} of 3
                      </h3>
                    </div>

                    <div
                      style={{
                        textAlign: isMobile ? "left" : "right",
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.78)",
                      }}
                    >
                      <div>Level: {currentQuestion.level}</div>
                      <div>Skill: {currentQuestion.skill}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "24px",
                      borderRadius: "20px",
                      border: "1px solid rgba(126,232,255,0.28)",
                      background:
                        "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                      minHeight: isMobile ? "240px" : "360px",
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

                  {shownHint && <InfoBox label="Hint" text={shownHint} />}

                  {revealedAnswer && (
                    <InfoBox label="Revealed Answer" text={revealedAnswer} />
                  )}
                </div>

                <div
                  style={{
                    borderRadius: "24px",
                    border: "1px solid rgba(150, 220, 255, 0.42)",
                    background:
                      "linear-gradient(180deg, rgba(17, 82, 136, 0.86), rgba(7, 27, 68, 0.98))",
                    padding: isMobile ? "18px" : "24px",
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
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {(["A", "B", "C", "D"] as AnswerChoice[]).map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        disabled={answerLocked}
                        onClick={() => setSelectedAnswer(choice)}
                        style={{
                          height: "64px",
                          borderRadius: "16px",
                          border:
                            selectedAnswer === choice
                              ? "1px solid rgba(126,232,255,0.95)"
                              : "1px solid rgba(126,232,255,0.32)",
                          background:
                            selectedAnswer === choice
                              ? "linear-gradient(135deg, #35c5ff, #4c6dff)"
                              : "rgba(255,255,255,0.08)",
                          color: answerLocked
                            ? "rgba(255,255,255,0.45)"
                            : "white",
                          fontSize: "24px",
                          fontWeight: 700,
                          cursor: answerLocked ? "default" : "pointer",
                          boxShadow:
                            selectedAnswer === choice
                              ? "0 0 24px rgba(83, 215, 255, 0.4)"
                              : "none",
                        }}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: "24px",
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={answerLocked}
                      style={primaryButtonStyle(answerLocked)}
                    >
                      Submit Answer
                    </button>

                    <button
                      type="button"
                      onClick={skipQuestion}
                      disabled={answerLocked}
                      style={secondaryButtonStyle(answerLocked)}
                    >
                      Skip Question
                    </button>

                    <button
                      type="button"
                      onClick={useHint}
                      disabled={Boolean(shownHint) || answerLocked}
                      style={secondaryButtonStyle(Boolean(shownHint) || answerLocked)}
                    >
                      Use Hint — 1 DT
                    </button>

                    <button
                      type="button"
                      onClick={revealAnswer}
                      disabled={Boolean(revealedAnswer) || answerLocked}
                      style={secondaryButtonStyle(Boolean(revealedAnswer) || answerLocked)}
                    >
                      Reveal Answer — 3 DT
                    </button>
                  </div>

                  {feedback && <InfoBox label="Feedback" text={feedback} />}

                  {answerLocked && (
                    <button
                      type="button"
                      onClick={nextQuestion}
                      style={{
                        marginTop: "16px",
                        width: "100%",
                        height: "52px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.45)",
                        background:
                          "linear-gradient(135deg, #7ee8ff, #35c5ff)",
                        color: "#06142d",
                        fontSize: "16px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {questionIndex >= 2 ? "Finish Challenge" : "Next Question"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedCategory && category && completed && (
            <div
              style={{
                margin: "10px auto",
                maxWidth: "680px",
                borderRadius: "26px",
                border: "1px solid rgba(126,232,255,0.5)",
                background:
                  "linear-gradient(180deg, rgba(17, 82, 136, 0.86), rgba(7, 27, 68, 0.98))",
                padding: isMobile ? "24px" : "34px",
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
                Challenge Complete
              </p>

              <h3
                style={{
                  margin: "12px 0 0",
                  fontSize: isMobile ? "28px" : "34px",
                  fontWeight: 600,
                }}
              >
                {category.title}
              </h3>

              <div
                style={{
                  marginTop: "26px",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                <ResultStat label="Score" value={`${score}/3`} />
                <ResultStat label="Skipped" value={String(skipped)} />
                <ResultStat label="Hints" value={String(hintsUsed)} />
                <ResultStat label="Reveals" value={String(revealsUsed)} />
              </div>

              <p
                style={{
                  margin: "26px 0 0",
                  fontSize: "15px",
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                New weekly challenges will appear automatically when the active
                Supabase quiz is updated.
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
                  onClick={backToCategories}
                  style={ghostButtonStyle}
                >
                  Choose Another Category
                </button>

                <Link
                  href="/inventor"
                  style={{
                    height: "52px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.45)",
                    background:
                      "linear-gradient(135deg, #35c5ff, #4c6dff)",
                    color: "white",
                    padding: "0 22px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Back to Nova’s World
                </Link>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function MessageCard({ message }: { message: string }) {
  return (
    <div
      style={{
        margin: "20px auto",
        maxWidth: "620px",
        borderRadius: "24px",
        border: "1px solid rgba(126,232,255,0.36)",
        background: "rgba(255,255,255,0.08)",
        padding: "30px",
        textAlign: "center",
        color: "rgba(255,255,255,0.86)",
      }}
    >
      {message}
    </div>
  );
}

function InfoBox({ label, text }: { label: string; text: string }) {
  return (
    <div
      style={{
        marginTop: "18px",
        borderRadius: "16px",
        border: "1px solid rgba(126,232,255,0.36)",
        background: "rgba(255,255,255,0.08)",
        padding: "14px 16px",
        fontSize: "14px",
        lineHeight: 1.45,
        color: "rgba(255,255,255,0.88)",
      }}
    >
      <strong style={{ color: "#7ee8ff" }}>{label}: </strong>
      {text}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
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

const ghostButtonStyle: CSSProperties = {
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 16px",
  cursor: "pointer",
};

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    height: "52px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.45)",
    background: disabled
      ? "rgba(255,255,255,0.08)"
      : "linear-gradient(135deg, #35c5ff, #4c6dff)",
    color: disabled ? "rgba(255,255,255,0.45)" : "white",
    fontSize: "16px",
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
  };
}

function secondaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(126,232,255,0.28)",
    background: disabled ? "rgba(255,255,255,0.04)" : "rgba(126,232,255,0.12)",
    color: disabled ? "rgba(255,255,255,0.45)" : "#d9fbff",
    fontSize: "15px",
    cursor: disabled ? "default" : "pointer",
  };
}
