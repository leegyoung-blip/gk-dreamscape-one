
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

type MissionZone = {
  id: string;
  title: string;
  description: string;
  position: CSSProperties;
  accent: string;
};

const missionZones: MissionZone[] = [
  {
    id: "knowledge-arena",
    title: "Knowledge Arena",
    description:
      "Play 10-question topic challenges, answer quickly, earn points, and collect Dreamscape Tokens.",
    accent: "#53d7ff",
    position: {
      left: "37%",
      top: "39%",
      width: "29%",
      height: "31%",
    },
  },
  {
    id: "core-missions",
    title: "Core Missions",
    description:
      "Build foundation skills in grammar, vocabulary, comprehension, arithmetic, fractions, and word problem basics.",
    accent: "#7ecbff",
    position: {
      left: "4%",
      top: "54%",
      width: "25%",
      height: "34%",
    },
  },
  {
    id: "think-missions",
    title: "Think Missions",
    description:
      "Train reasoning, logic, pattern spotting, clue-based thinking, visual reasoning, and HAP-style problem solving.",
    accent: "#60f0d0",
    position: {
      left: "5%",
      top: "21%",
      width: "28%",
      height: "30%",
    },
  },
  {
    id: "express-missions",
    title: "Express Missions",
    description:
      "Improve writing, sentence expression, show-don’t-tell, paragraph flow, story planning, and vocabulary choices.",
    accent: "#ff9df0",
    position: {
      right: "5%",
      top: "53%",
      width: "27%",
      height: "34%",
    },
  },
  {
    id: "stretch-missions",
    title: "Stretch Missions",
    description:
      "Attempt advanced challenge tasks, HAP extensions, boss questions, timed reasoning sets, and harder problem-solving missions.",
    accent: "#ffd76a",
    position: {
      right: "4%",
      top: "19%",
      width: "28%",
      height: "31%",
    },
  },
  {
    id: "progress-rewards",
    title: "Progress & Rewards",
    description:
      "Track completed missions, Dreamscape Tokens earned, weekly streaks, badges, strongest skill areas, and reward progress.",
    accent: "#8dfcff",
    position: {
      left: "38%",
      top: "17%",
      width: "25%",
      height: "18%",
    },
  },
];

export default function LearningMissionsPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const [hoveredZone, setHoveredZone] = useState<MissionZone | null>(null);
  const [showKnowledgeArena, setShowKnowledgeArena] = useState(false);
  const [showCoreMissions, setShowCoreMissions] = useState(false);
  const [showThinkMissions, setShowThinkMissions] = useState(false);
  const [showExpressMissions, setShowExpressMissions] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);

  useEffect(() => {
    async function loadUserAndTokens() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserEmail(null);
        setTokenBalance(0);
        return;
      }

      setUserEmail(user.email ?? null);

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

    loadUserAndTokens();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAndTokens();
    });

    function handleTokenUpdate() {
      loadUserAndTokens();
    }

    window.addEventListener("dream-tokens-updated", handleTokenUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("dream-tokens-updated", handleTokenUpdate);
    };
  }, []);

  function getZoneClick(zoneId: string) {
  if (zoneId === "knowledge-arena") return () => setShowKnowledgeArena(true);
  if (zoneId === "core-missions") return () => setShowCoreMissions(true);
  if (zoneId === "think-missions") return () => setShowThinkMissions(true);
  if (zoneId === "express-missions") return () => setShowExpressMissions(true);

  return undefined;
}

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        overflowX: "hidden",
        overflowY: isDesktop ? "hidden" : "auto",
        background: "#020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        paddingBottom: isDesktop ? 0 : "80px",
      }}
    >
      <img
        src="/nova/learning-missions/learning-missions-bg.png"
        alt="Learning Missions"
        draggable={false}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: isDesktop ? "center" : "center top",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: `
            linear-gradient(
              180deg,
              rgba(2, 8, 18, 0.36) 0%,
              rgba(2, 8, 18, 0.10) 35%,
              rgba(2, 8, 18, 0.84) 100%
            ),
            radial-gradient(
              circle at 50% 45%,
              transparent 0%,
              rgba(2,8,18,0.10) 45%,
              rgba(2,8,18,0.62) 100%
            )
          `,
          pointerEvents: "none",
        }}
      />

      <FloatingMissionControls
        userEmail={userEmail}
        tokenBalance={tokenBalance}
        screenMode={screenMode}
      />

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          left: isDesktop ? "46px" : "auto",
          top: isDesktop ? "92px" : "auto",
          zIndex: 10,
          width: isDesktop ? "min(470px, 42vw)" : "min(760px, calc(100% - 36px))",
          margin: isDesktop ? 0 : isMobile ? "126px auto 28px" : "108px auto 30px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: isMobile ? "11px" : "14px",
            fontWeight: 500,
            letterSpacing: isMobile ? "0.18em" : "0.24em",
            textTransform: "uppercase",
            color: "#7ee8ff",
            textShadow: "0 8px 22px rgba(0,0,0,0.5)",
          }}
        >
          Dreamscape One
        </p>

        <h1
          style={{
            margin: "16px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? "clamp(42px, 13vw, 60px)"
              : isDesktop
              ? "68px"
              : "clamp(56px, 8vw, 68px)",
            fontWeight: 400,
            lineHeight: 1.02,
            letterSpacing: "0.01em",
            textShadow: "0 18px 48px rgba(0,0,0,0.55)",
          }}
        >
          Learning Missions
        </h1>

        <p
          style={{
            margin: "18px 0 0",
            fontSize: isMobile ? "17px" : "22px",
            fontWeight: 300,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 12px 30px rgba(0,0,0,0.48)",
          }}
        >
          Complete weekly missions, build skills, and earn Dreamscape Tokens.
        </p>
      </section>

      {isDesktop ? (
        <>
          {missionZones.map((zone) => (
            <MissionHotspot
              key={zone.id}
              zone={zone}
              isHovered={hoveredZone?.id === zone.id}
              onEnter={() => setHoveredZone(zone)}
              onLeave={() => setHoveredZone(null)}
              onClick={getZoneClick(zone.id)}
            />
          ))}

          {hoveredZone && <ZoneHoverPopup zone={hoveredZone} />}
        </>
      ) : (
        <div
          style={{
            position: "relative",
            zIndex: 20,
            width: "min(920px, calc(100% - 36px))",
            margin: "0 auto 80px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: isMobile ? "14px" : "18px",
          }}
        >
          {missionZones.map((zone) => (
            <MissionCard key={zone.id} zone={zone} onClick={getZoneClick(zone.id)} />
          ))}
        </div>
      )}

      {showKnowledgeArena && (
        <KnowledgeArenaPopup
          onClose={() => setShowKnowledgeArena(false)}
          tokenBalance={tokenBalance}
          onTokenBalanceChange={setTokenBalance}
        />
      )}

      {showCoreMissions && (
        <CoreMissionsPopup
          onClose={() => setShowCoreMissions(false)}
          tokenBalance={tokenBalance}
          onTokenBalanceChange={setTokenBalance}
        />
      )}

      {showThinkMissions && (
        <ThinkMissionsPopup
          onClose={() => setShowThinkMissions(false)}
          tokenBalance={tokenBalance}
          onTokenBalanceChange={setTokenBalance}
        />
      )}

      {showExpressMissions && (
        <ExpressMissionsPopup
          onClose={() => setShowExpressMissions(false)}
          tokenBalance={tokenBalance}
          onTokenBalanceChange={setTokenBalance}
        />
      )}
    </main>
  );
}

function FloatingMissionControls({
  userEmail,
  tokenBalance,
  screenMode,
}: {
  userEmail: string | null;
  tokenBalance: number;
  screenMode: ScreenMode;
}) {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  return (
    <>
      <Link
        href="/inventor"
        style={{
          position: "fixed",
          top: isMobile ? "12px" : "22px",
          left: isMobile ? "12px" : "22px",
          zIndex: 70,
          height: isMobile ? "40px" : "46px",
          padding: isMobile ? "0 14px" : "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(126,232,255,0.55)",
          background: "rgba(2,8,19,0.58)",
          backdropFilter: "blur(16px)",
          color: "white",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "8px" : "12px",
          fontSize: isMobile ? "11px" : "14px",
          letterSpacing: isMobile ? "0.08em" : "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 16px 36px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: isMobile ? "15px" : "18px" }}>←</span>
        {isMobile ? "Back" : "Exit Mission Centre"}
      </Link>

      <div
        style={{
          position: "fixed",
          top: isMobile ? "60px" : "22px",
          right: isMobile ? "12px" : "22px",
          left: isMobile ? "12px" : "auto",
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-end",
          gap: isMobile ? "8px" : "12px",
        }}
      >
        <Link
          href={userEmail ? "/profile" : "/login"}
          style={{
            ...controlButtonStyle,
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 14px" : "0 22px",
            fontSize: isMobile ? "11px" : "14px",
            letterSpacing: isMobile ? "0.08em" : "0.1em",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail ? "My Account" : "Log In"}
        </Link>

        <Link
          href="/cart"
          aria-label="Cart"
          style={{
            ...controlButtonStyle,
            width: isMobile ? "40px" : "46px",
            height: isMobile ? "40px" : "46px",
            padding: 0,
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          🛒
        </Link>

        <div
          style={{
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 12px" : "0 20px",
            borderRadius: "999px",
            border: "1px solid rgba(83,215,255,0.6)",
            background:
              "linear-gradient(145deg, rgba(2,14,28,0.66), rgba(2,8,19,0.74))",
            backdropFilter: "blur(16px)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "8px" : "12px",
            fontSize: isMobile ? "11px" : "14px",
            letterSpacing: isMobile ? "0.05em" : "0.08em",
            textTransform: "uppercase",
            boxShadow:
              "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(83,215,255,0.18)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: isMobile ? "22px" : "25px",
              height: isMobile ? "22px" : "25px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle, rgba(83,215,255,0.42), rgba(2,8,19,0.82))",
              border: "1px solid rgba(83,215,255,0.65)",
              color: "#bdf6ff",
              fontSize: "13px",
              boxShadow: "0 0 14px rgba(83,215,255,0.35)",
              flexShrink: 0,
            }}
          >
            ✦
          </span>

          <span>{isDesktop ? "Dreamscape Tokens" : "Tokens"}</span>

          <strong
            style={{
              color: "#53d7ff",
              fontSize: isMobile ? "13px" : "15px",
              letterSpacing: "0.08em",
            }}
          >
            {tokenBalance}
          </strong>
        </div>
      </div>
    </>
  );
}

const controlButtonStyle: CSSProperties = {
  height: "46px",
  padding: "0 22px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.48)",
  background: "rgba(2,8,19,0.58)",
  backdropFilter: "blur(16px)",
  color: "white",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
};

function MissionHotspot({
  zone,
  isHovered,
  onEnter,
  onLeave,
  onClick,
}: {
  zone: MissionZone;
  isHovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: "absolute",
        zIndex: 25,
        ...zone.position,
        border: "none",
        background: "transparent",
        borderRadius: "28px",
        cursor: onClick ? "pointer" : "default",
        outline: "none",
        boxShadow: "none",
        transition: "none",
      }}
      aria-label={zone.title}
    />
  );
}

function MissionCard({
  zone,
  onClick,
}: {
  zone: MissionZone;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        minHeight: "150px",
        borderRadius: "22px",
        border: `1px solid ${zone.accent}88`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.84), rgba(3,13,34,0.92))",
        backdropFilter: "blur(18px)",
        boxShadow: `0 0 24px ${zone.accent}33, 0 18px 42px rgba(0,0,0,0.35)`,
        padding: "22px",
        color: "white",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        opacity: onClick ? 1 : 0.66,
      }}
    >
      <p
        style={{
          margin: 0,
          color: zone.accent,
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Learning Zone
      </p>

      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "24px",
          lineHeight: 1.18,
          fontWeight: 700,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {zone.description}
      </p>

      <div
        style={{
          marginTop: "18px",
          color: onClick ? zone.accent : "rgba(255,255,255,0.45)",
          fontSize: "14px",
          fontWeight: 700,
        }}
      >
        {onClick ? "Enter Mission ›" : "Coming Soon"}
      </div>
    </button>
  );
}

function ZoneHoverPopup({ zone }: { zone: MissionZone }) {
  const popupPosition = getPopupPosition(zone.id);

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 60,
        ...popupPosition,
        width: "330px",
        borderRadius: "20px",
        border: `1px solid ${zone.accent}aa`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.88), rgba(3,13,34,0.92))",
        backdropFilter: "blur(18px)",
        boxShadow: `0 0 28px ${zone.accent}55, 0 24px 60px rgba(0,0,0,0.45)`,
        padding: "22px 24px",
        pointerEvents: "none",
        color: "white",
      }}
    >
      <p
        style={{
          margin: 0,
          color: zone.accent,
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Learning Zone
      </p>

      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "25px",
          lineHeight: 1.18,
          fontWeight: 700,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: "14px",
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {zone.description}
      </p>

      <div
        style={{
          marginTop: "18px",
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${zone.accent}, transparent)`,
        }}
      />
    </div>
  );
}

function getPopupPosition(zoneId: string): CSSProperties {
  switch (zoneId) {
    case "knowledge-arena":
      return {
        left: "50%",
        top: "45%",
        transform: "translateX(-50%)",
      };

    case "core-missions":
      return {
        left: "6%",
        bottom: "10%",
      };

    case "think-missions":
      return {
        left: "18%",
        top: "8%",
      };

    case "express-missions":
      return {
        right: "7%",
        bottom: "10%",
      };

    case "stretch-missions":
      return {
        right: "7%",
        top: "16%",
      };

    case "progress-rewards":
      return {
        left: "50%",
        top: "9%",
        transform: "translateX(-50%)",
      };

    default:
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
  }
}

type KnowledgeArenaTopic =
  | "world_explorer"
  | "time_traveller"
  | "science_sparks"
  | "mystery_logic";

type KnowledgeArenaAnswer = "A" | "B" | "C" | "D";

type KnowledgeArenaQuestion = {
  id: string;
  topic: KnowledgeArenaTopic;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: KnowledgeArenaAnswer;
  explanation: string;
  difficulty: string;
};

type PlayerAnswer = {
  questionId: string;
  selectedAnswer: KnowledgeArenaAnswer | null;
  correctAnswer: KnowledgeArenaAnswer;
  isCorrect: boolean;
  points: number;
  secondsUsed: number;
};

const knowledgeArenaTopics: {
  id: KnowledgeArenaTopic;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
}[] = [
  {
    id: "world_explorer",
    title: "World Explorer",
    subtitle: "Geography, countries, landmarks, cultures, and nature.",
    icon: "🌍",
    accent: "#53d7ff",
  },
  {
    id: "time_traveller",
    title: "Time Traveller",
    subtitle: "History, inventions, ancient worlds, and famous moments.",
    icon: "⏳",
    accent: "#ffd76a",
  },
  {
    id: "science_sparks",
    title: "Science Sparks",
    subtitle: "Space, animals, nature, the body, and simple science.",
    icon: "⚡",
    accent: "#60f0d0",
  },
  {
    id: "mystery_logic",
    title: "Mystery Logic",
    subtitle: "Riddles, clues, deduction, patterns, and smart guesses.",
    icon: "◇",
    accent: "#ff9df0",
  },
];

function KnowledgeArenaPopup({
  onClose,
  tokenBalance,
  onTokenBalanceChange,
}: {
  onClose: () => void;
  tokenBalance: number;
  onTokenBalanceChange: (newBalance: number) => void;
}) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = !isDesktop;

  const [screen, setScreen] = useState<
    "mode" | "topic" | "loading" | "quiz" | "results"
  >("mode");

  const [selectedTopic, setSelectedTopic] =
    useState<KnowledgeArenaTopic | null>(null);

  const [questions, setQuestions] = useState<KnowledgeArenaQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] =
    useState<KnowledgeArenaAnswer | null>(null);

  const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswer[]>([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [timeLeft, setTimeLeft] = useState(20);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nextCountdown, setNextCountdown] = useState(5);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [rewardSaved, setRewardSaved] = useState(false);

  const currentQuestion = questions[questionIndex];

  useEffect(() => {
    if (screen !== "quiz" || answerLocked || !currentQuestion) return;

    if (timeLeft <= 0) {
      lockAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [screen, timeLeft, answerLocked, currentQuestion]);

    useEffect(() => {
        if (screen !== "quiz" || !answerLocked) return;

        if (nextCountdown <= 0) {
            nextQuestion();
            return;
        }

        const timer = window.setTimeout(() => {
            setNextCountdown((prev) => prev - 1);
        }, 1000);

        return () => window.clearTimeout(timer);
        }, [screen, answerLocked, nextCountdown]);

  async function loadQuestions(topic: KnowledgeArenaTopic) {
    setScreen("loading");
    setLoadError(null);
    setSelectedTopic(topic);

    const { data, error } = await supabase.rpc(
      "get_knowledge_arena_questions",
      {
        selected_topic: topic,
        question_limit: 10,
      }
    );

    if (error || !data) {
      console.warn("Could not load Knowledge Arena questions:", error);
      setLoadError("Could not load the quiz questions. Please try again.");
      setScreen("topic");
      return;
    }

    if (data.length < 10) {
      setLoadError(
        "This topic does not have 10 active questions yet. Please add more questions in Supabase."
      );
      setScreen("topic");
      return;
    }

    setQuestions(data as KnowledgeArenaQuestion[]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setPlayerAnswers([]);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(20);
    setAnswerLocked(false);
    setFeedback(null);
    setTokensEarned(0);
    setRewardSaved(false);
    setScreen("quiz");
  }

  function calculatePoints(isCorrect: boolean, secondsRemaining: number) {
    if (!isCorrect) return 0;

    const points = 40 + secondsRemaining * 3;
    return Math.min(points, 100);
  }

  function lockAnswer(answer: KnowledgeArenaAnswer | null) {
    if (!currentQuestion || answerLocked) return;

    const isCorrect = answer === currentQuestion.correct_answer;
    const secondsUsed = 20 - timeLeft;
    const points = calculatePoints(isCorrect, timeLeft);

    const answerRecord: PlayerAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: answer,
      correctAnswer: currentQuestion.correct_answer,
      isCorrect,
      points,
      secondsUsed,
    };

    setPlayerAnswers((prev) => [...prev, answerRecord]);
    setScore((prev) => prev + points);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setFeedback(
        `Correct! +${points} points. ${currentQuestion.explanation}`
      );
    } else if (answer === null) {
      setFeedback(
        `Time's up. The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`
      );
    } else {
      setFeedback(
        `Not quite. The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`
      );
    }

    setAnswerLocked(true);
  }

  function chooseAnswer(answer: KnowledgeArenaAnswer) {
    if (answerLocked) return;

    setSelectedAnswer(answer);
    lockAnswer(answer);
    }

  async function nextQuestion() {
    if (questionIndex >= questions.length - 1) {
      await finishQuiz();
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setTimeLeft(20);
    setNextCountdown(5);
    setAnswerLocked(false);
    setFeedback(null);
  }

  function calculateTokenReward(finalScore: number, finalCorrectCount: number) {
    let reward = 1;

    if (finalCorrectCount >= 6) reward += 1;
    if (finalScore >= 700) reward += 1;
    if (finalScore >= 900) reward += 1;

    return reward;
  }

  async function finishQuiz() {
    const finalScore = score;
    const finalCorrectCount = correctCount;
    const reward = calculateTokenReward(finalScore, finalCorrectCount);

    setTokensEarned(reward);
    setScreen("results");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !selectedTopic) {
      return;
    }

    const { error: attemptError } = await supabase
      .from("knowledge_arena_attempts")
      .insert({
        user_id: user.id,
        topic: selectedTopic,
        score: finalScore,
        correct_count: finalCorrectCount,
        total_questions: questions.length,
        tokens_earned: reward,
      });

    if (attemptError) {
      console.warn("Could not save Knowledge Arena attempt:", attemptError);
    }

    const { error: tokenError } = await supabase
      .from("dream_token_transactions")
      .insert({
        user_id: user.id,
        type: "earn",
        title: "Knowledge Arena Reward",
        amount: reward,
        token_kind: "virtual",
      });

    if (tokenError) {
      console.warn("Could not award Dreamscape Tokens:", tokenError);
      return;
    }

    setRewardSaved(true);
    onTokenBalanceChange(tokenBalance + reward);
    window.dispatchEvent(new Event("dream-tokens-updated"));
  }

  function resetToTopics() {
    setScreen("topic");
    setSelectedTopic(null);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setPlayerAnswers([]);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(20);
    setNextCountdown(5);
    setAnswerLocked(false);
    setFeedback(null);
    setTokensEarned(0);
    setRewardSaved(false);
  }

  const selectedTopicInfo = knowledgeArenaTopics.find(
    (topic) => topic.id === selectedTopic
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 140,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "14px" : "26px",
        background: "rgba(2, 8, 19, 0.55)",
        backdropFilter: "blur(14px)",
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
          onClick={onClose}
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

        <div style={{ textAlign: "center", padding: isMobile ? "0 42px" : "0 70px" }}>
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
            Knowledge Arena
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "16px" : "20px",
              color: "#7ee8ff",
              fontWeight: 300,
            }}
          >
            Answer 10 questions. You have 20 seconds each. Faster correct
            answers earn more points.
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

        {screen === "mode" && (
          <div
            style={{
              marginTop: "42px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: "24px",
            }}
          >
            <button
              type="button"
              onClick={() => setScreen("topic")}
              style={modeCardStyle("#53d7ff")}
            >
              <div style={{ fontSize: "46px" }}>🎮</div>
              <h3 style={modeTitleStyle}>Single Player</h3>
              <p style={modeTextStyle}>
                Play a 10-question topic challenge on your own.
              </p>
              <div style={primaryButtonLook}>Start Solo Challenge ›</div>
            </button>

            <button
              type="button"
              disabled
              style={{
                ...modeCardStyle("#a9a9ff"),
                opacity: 0.55,
                cursor: "default",
              }}
            >
              <div style={{ fontSize: "46px" }}>👥</div>
              <h3 style={modeTitleStyle}>Multiplayer</h3>
              <p style={modeTextStyle}>
                Create or join a lobby to play with friends. Coming later.
              </p>
              <div style={disabledButtonLook}>Coming Soon</div>
            </button>
          </div>
        )}

        {screen === "topic" && (
          <div style={{ marginTop: "38px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                marginBottom: "22px",
              }}
            >
              <button
                type="button"
                onClick={() => setScreen("mode")}
                style={backButtonStyle}
              >
                ← Back to Mode
              </button>

              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.74)",
                  fontSize: "14px",
                }}
              >
                Choose 1 topic world to begin.
              </p>
            </div>

            {loadError && (
              <div
                style={{
                  marginBottom: "22px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,215,106,0.45)",
                  background: "rgba(255,215,106,0.1)",
                  padding: "14px 16px",
                  color: "#ffe6a8",
                  fontSize: "14px",
                }}
              >
                {loadError}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: "18px",
              }}
            >
              {knowledgeArenaTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => loadQuestions(topic.id)}
                  style={{
                    minHeight: isMobile ? "auto" : "330px",
                    borderRadius: "24px",
                    padding: "24px",
                    border: `1px solid ${topic.accent}88`,
                    background:
                      "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
                    boxShadow: `0 0 22px ${topic.accent}22, inset 0 0 24px rgba(255,255,255,0.03)`,
                    color: "white",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "22px",
                      border: `1px solid ${topic.accent}99`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "34px",
                      background: `${topic.accent}18`,
                      boxShadow: `0 0 20px ${topic.accent}33`,
                    }}
                  >
                    {topic.icon}
                  </div>

                  <h3
                    style={{
                      margin: "24px 0 0",
                      fontSize: "25px",
                      lineHeight: 1.2,
                      fontWeight: 700,
                    }}
                  >
                    {topic.title}
                  </h3>

                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: "14px",
                      lineHeight: 1.5,
                      color: "rgba(255,255,255,0.76)",
                    }}
                  >
                    {topic.subtitle}
                  </p>

                  <div
                    style={{
                      marginTop: "auto",
                      height: "48px",
                      borderRadius: "14px",
                      background:
                        "linear-gradient(135deg, #35c5ff, #4c6dff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      fontWeight: 600,
                    }}
                  >
                    Start Quiz ›
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === "loading" && (
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
            Loading your Knowledge Arena questions...
          </div>
        )}

        {screen === "quiz" && currentQuestion && selectedTopicInfo && (
          <div style={{ marginTop: "34px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                gap: "18px",
                alignItems: isMobile ? "stretch" : "center",
                marginBottom: "22px",
              }}
            >
              <button
                type="button"
                onClick={resetToTopics}
                style={backButtonStyle}
              >
                ← Change Topic
              </button>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <StatusPill label="Topic" value={selectedTopicInfo.title} />
                <StatusPill label="Score" value={String(score)} />
                <StatusPill label="Question" value={`${questionIndex + 1}/10`} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 360px",
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
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "16px",
                    alignItems: "start",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: selectedTopicInfo.accent,
                        fontSize: "13px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      {selectedTopicInfo.title}
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
                  </div>

                  <div
                    style={{
                      width: "86px",
                      height: "86px",
                      borderRadius: "999px",
                      border:
                        timeLeft <= 5
                          ? "1px solid rgba(255,130,130,0.8)"
                          : "1px solid rgba(126,232,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      color: timeLeft <= 5 ? "#ffb3b3" : "#7ee8ff",
                      boxShadow:
                        timeLeft <= 5
                          ? "0 0 22px rgba(255,130,130,0.32)"
                          : "0 0 22px rgba(126,232,255,0.26)",
                    }}
                  >
                    <strong style={{ fontSize: "28px" }}>{timeLeft}</strong>
                    <span style={{ fontSize: "11px" }}>seconds</span>
                  </div>
                </div>

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
                  Difficulty: {currentQuestion.difficulty}
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
                            : selectedAnswer === null
                            ? "Time's up!"
                            : "Not quite."}
                        </strong>

                        {feedback}

                        {answerLocked && (
                        <div
                            style={{
                            marginTop: "12px",
                            color: "#7ee8ff",
                            fontSize: "14px",
                            fontWeight: 700,
                            }}
                        >
                            Next question in {nextCountdown}...
                        </div>
                        )}
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
                  <AnswerButton
                    label="A"
                    text={currentQuestion.option_a}
                    selected={selectedAnswer === "A"}
                    disabled={answerLocked}
                    correctAnswer={currentQuestion.correct_answer}
                    answerLocked={answerLocked}
                    onClick={() => chooseAnswer("A")}
                    />

                    <AnswerButton
                    label="B"
                    text={currentQuestion.option_b}
                    selected={selectedAnswer === "B"}
                    disabled={answerLocked}
                    correctAnswer={currentQuestion.correct_answer}
                    answerLocked={answerLocked}
                    onClick={() => chooseAnswer("B")}
                    />

                    <AnswerButton
                    label="C"
                    text={currentQuestion.option_c}
                    selected={selectedAnswer === "C"}
                    disabled={answerLocked}
                    correctAnswer={currentQuestion.correct_answer}
                    answerLocked={answerLocked}
                    onClick={() => chooseAnswer("C")}
                    />

                    <AnswerButton
                    label="D"
                    text={currentQuestion.option_d}
                    selected={selectedAnswer === "D"}
                    disabled={answerLocked}
                    correctAnswer={currentQuestion.correct_answer}
                    answerLocked={answerLocked}
                    onClick={() => chooseAnswer("D")}
                    />
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "results" && (
          <div
            style={{
              margin: "42px auto 0",
              maxWidth: "700px",
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
              Challenge Complete
            </p>

            <h3
              style={{
                margin: "12px 0 0",
                fontSize: isMobile ? "30px" : "38px",
                fontWeight: 600,
              }}
            >
              Final Score: {score}
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
              <MissionResultStat label="Correct" value={`${correctCount}/10`} />
              <MissionResultStat label="Score" value={String(score)} />
              <MissionResultStat label="Tokens" value={`+${tokensEarned}`} />
              <MissionResultStat
                label="Balance"
                value={String(tokenBalance)}
              />
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
                ? "Your attempt and Dreamscape Token reward have been saved."
                : "Log in to save your attempt and receive Dreamscape Tokens."}
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
                onClick={resetToTopics}
                style={{
                  height: "52px",
                  borderRadius: "14px",
                  border: "1px solid rgba(126,232,255,0.36)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  padding: "0 22px",
                  cursor: "pointer",
                }}
              >
                Play Another Topic
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  height: "52px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.45)",
                  background:
                    "linear-gradient(135deg, #35c5ff, #4c6dff)",
                  color: "white",
                  padding: "0 22px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Exit Knowledge Arena
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerButton({
  label,
  text,
  selected,
  disabled,
  correctAnswer,
  answerLocked,
  onClick,
}: {
  label: KnowledgeArenaAnswer;
  text: string;
  selected: boolean;
  disabled: boolean;
  correctAnswer: KnowledgeArenaAnswer;
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
    background = "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))";
    color = "white";
  }

  if (isWrongSelected) {
    border = "1px solid rgba(248, 113, 113, 0.9)";
    background = "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))";
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

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "999px",
        border: "1px solid rgba(126,232,255,0.36)",
        background: "rgba(255,255,255,0.07)",
        padding: "9px 14px",
        fontSize: "13px",
        color: "rgba(255,255,255,0.72)",
      }}
    >
      {label}: <strong style={{ color: "#7ee8ff" }}>{value}</strong>
    </div>
  );
}

function MissionResultStat({ label, value }: { label: string; value: string }) {
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

function modeCardStyle(accent: string): CSSProperties {
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

const modeTitleStyle: CSSProperties = {
  margin: "24px 0 0",
  fontSize: "30px",
  fontWeight: 700,
};

const modeTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "16px",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.76)",
};

const primaryButtonLook: CSSProperties = {
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

const disabledButtonLook: CSSProperties = {
  marginTop: "auto",
  height: "52px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.68)",
};

const backButtonStyle: CSSProperties = {
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 16px",
  cursor: "pointer",
};

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

function CoreMissionsPopup({
  onClose,
  tokenBalance,
  onTokenBalanceChange,
}: {
  onClose: () => void;
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 145,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "14px" : "26px",
        background: "rgba(2, 8, 19, 0.55)",
        backdropFilter: "blur(14px)",
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
          onClick={onClose}
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

        <div style={{ textAlign: "center", padding: isMobile ? "0 42px" : "0 70px" }}>
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

              <button type="button" onClick={onClose} style={coreGhostButton}>
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
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
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
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 360px",
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

              <button type="button" onClick={onClose} style={corePrimaryButton}>
                Exit Core Missions
              </button>
            </div>
          </div>
        )}
      </div>
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

const allowedThinkMissionTiers = [
  "admin",
  "gkp_student",
  "paid_student",
  "student",
  "pro",
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

function ThinkMissionsPopup({
  onClose,
  tokenBalance,
  onTokenBalanceChange,
}: {
  onClose: () => void;
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
  const [accessTier, setAccessTier] = useState<string | null>(null);

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

  const currentQuestion = questions[questionIndex];

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
      .select("tier")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.warn("Could not check Think Missions access:", error);
      setScreen("locked");
      return;
    }

    setAccessTier(data.tier);

    if (!allowedThinkMissionTiers.includes(data.tier)) {
      setScreen("locked");
      return;
    }

    setScreen("level");
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

    const finalMode = selectedMode ?? "normal";
    const finalTimeTaken =
      finalMode === "challenge" ? Math.max(0, 15 * 60 - timeLeft) : null;

    const reward = calculateTokenReward(
      finalMode,
      score,
      correctCount,
      timeLeft
    );

    setTokensEarned(reward);
    setScreen("results");

    if (!userId || !selectedQuiz) return;

    const { error: attemptError } = await supabase
      .from("think_mission_attempts")
      .insert({
        user_id: userId,
        quiz_id: selectedQuiz.id,
        mode: finalMode,
        score,
        correct_count: correctCount,
        total_questions: questions.length,
        time_taken_seconds: finalTimeTaken,
        tokens_earned: reward,
      });

    if (attemptError) {
      console.warn("Could not save Think Mission attempt:", attemptError);
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "14px" : "26px",
        background: "rgba(2, 8, 19, 0.55)",
        backdropFilter: "blur(14px)",
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
            "linear-gradient(145deg, rgba(30, 32, 90, 0.96), rgba(10, 22, 56, 0.98))",
          boxShadow:
            "0 0 45px rgba(126, 232, 255, 0.28), 0 30px 90px rgba(0, 0, 0, 0.55)",
          padding: isMobile ? "28px 18px 24px" : "34px 46px 38px",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={onClose}
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

        <div style={{ textAlign: "center", padding: isMobile ? "0 42px" : "0 70px" }}>
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
            Think Missions
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "16px" : "20px",
              color: "#7ee8ff",
              fontWeight: 300,
            }}
          >
            Logic, patterns, deduction and non-routine thinking challenges.
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
          <ThinkMessageCard message="Checking your Think Missions access..." />
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
              Think Missions are available for GKP students, paid Student
              Access members, Pro users and admins.
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

              <button type="button" onClick={onClose} style={thinkGhostButton}>
                Exit
              </button>
            </div>
          </div>
        )}

        {screen === "level" && (
          <div
            style={{
              marginTop: "42px",
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
          <div style={{ marginTop: "38px" }}>
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
              {quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  type="button"
                  onClick={() => chooseQuiz(quiz)}
                  style={{
                    minHeight: isMobile ? "auto" : "280px",
                    borderRadius: "24px",
                    padding: "26px",
                    border: "1px solid rgba(126,232,255,0.36)",
                    background:
                      "linear-gradient(180deg, rgba(35, 60, 120, 0.78), rgba(8, 25, 56, 0.92))",
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
                    Think Quiz {quiz.quiz_order}
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

                  <div style={thinkSmallButtonLook}>Choose Mode ›</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === "mode" && selectedQuiz && (
          <div style={{ marginTop: "38px" }}>
            <ThinkTopRow
              leftButton="← Back to Quizzes"
              onLeftClick={resetToQuizList}
              rightText={selectedQuiz.title}
            />

            <div
              style={{
                marginTop: "28px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
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
          <div style={{ marginTop: "34px" }}>
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
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 360px",
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
              {rewardSaved
                ? "Your Think Mission attempt and Dreamscape Token reward have been saved."
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
                style={thinkGhostButton}
              >
                Choose Another Quiz
              </button>

              <button type="button" onClick={onClose} style={thinkPrimaryButton}>
                Exit Think Missions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ExpressLevelBand = "foundation" | "growth" | "mastery";
type ExpressMode = "practice" | "challenge";

type ExpressMissionSet = {
  id: string;
  level_band: ExpressLevelBand;
  level_label: string;
  title: string;
  description: string;
  mission_order: number;
};

type ExpressMissionTask = {
  id: string;
  mission_id: string;
  task_order: number;
  prompt_text: string;
  starter_text: string | null;
  hint_text: string;
  checklist: string[];
  sample_answer: string;
  explanation: string;
  skill: string;
  difficulty: string;
};

const allowedExpressMissionTiers = [
  "admin",
  "gkp_student",
  "paid_student",
  "student",
  "pro",
];

const expressLevelBands: {
  id: ExpressLevelBand;
  title: string;
  label: string;
  subtitle: string;
  accent: string;
}[] = [
  {
    id: "foundation",
    title: "Foundation Express Missions",
    label: "P1–P2",
    subtitle: "Simple sentences, better words and clear picture sentences.",
    accent: "#ff9df0",
  },
  {
    id: "growth",
    title: "Growth Express Missions",
    label: "P3–P4",
    subtitle: "Show-don’t-tell, paragraph building and natural feelings.",
    accent: "#ffd76a",
  },
  {
    id: "mastery",
    title: "Mastery Express Missions",
    label: "P5–P6",
    subtitle: "Openings, climaxes, endings and PSLE-style composition craft.",
    accent: "#b58cff",
  },
];

const expressModes: {
  id: ExpressMode;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
}[] = [
  {
    id: "practice",
    title: "Practice Mode",
    subtitle: "No timer. Focus on quality and learn from sample answers.",
    badge: "Writing Practice",
    accent: "#ff9df0",
  },
  {
    id: "challenge",
    title: "Challenge Mode",
    subtitle: "20-minute writing challenge. Complete all 10 tasks in time.",
    badge: "Timed Writing",
    accent: "#ffd76a",
  },
];

function ExpressMissionsPopup({
  onClose,
  tokenBalance,
  onTokenBalanceChange,
}: {
  onClose: () => void;
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
    | "mission-list"
    | "mode"
    | "loading"
    | "task"
    | "results"
  >("checking");

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedLevelBand, setSelectedLevelBand] =
    useState<ExpressLevelBand | null>(null);
  const [selectedMission, setSelectedMission] =
    useState<ExpressMissionSet | null>(null);
  const [selectedMode, setSelectedMode] = useState<ExpressMode | null>(null);

  const [missions, setMissions] = useState<ExpressMissionSet[]>([]);
  const [tasks, setTasks] = useState<ExpressMissionTask[]>([]);
  const [taskIndex, setTaskIndex] = useState(0);

  const [studentResponse, setStudentResponse] = useState("");
  const [submittedResponses, setSubmittedResponses] = useState<
    Record<string, string>
  >({});

  const [hasSubmittedCurrentTask, setHasSubmittedCurrentTask] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [isFinishing, setIsFinishing] = useState(false);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [rewardSaved, setRewardSaved] = useState(false);

  const currentTask = tasks[taskIndex];

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (screen !== "task") return;
    if (selectedMode !== "challenge") return;
    if (isFinishing) return;

    if (timeLeft <= 0) {
      void finishMission();
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
      .select("tier")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.warn("Could not check Express Missions access:", error);
      setScreen("locked");
      return;
    }

    if (!allowedExpressMissionTiers.includes(data.tier)) {
      setScreen("locked");
      return;
    }

    setScreen("level");
  }

  async function chooseLevel(levelBand: ExpressLevelBand) {
    setSelectedLevelBand(levelBand);
    setSelectedMission(null);
    setSelectedMode(null);
    setMissions([]);
    setTasks([]);
    setLoadError(null);
    setScreen("loading");

    const { data, error } = await supabase
      .from("express_mission_sets")
      .select("id, level_band, level_label, title, description, mission_order")
      .eq("level_band", levelBand)
      .eq("is_active", true)
      .order("mission_order", { ascending: true });

    if (error || !data) {
      console.warn("Could not load Express Mission sets:", error);
      setLoadError("Could not load the writing missions. Please try again.");
      setScreen("level");
      return;
    }

    setMissions(data as ExpressMissionSet[]);
    setScreen("mission-list");
  }

  function chooseMission(mission: ExpressMissionSet) {
    setSelectedMission(mission);
    setSelectedMode(null);
    setScreen("mode");
  }

  async function startMission(mode: ExpressMode) {
    if (!selectedMission) return;

    setSelectedMode(mode);
    setLoadError(null);
    setScreen("loading");

    const { data, error } = await supabase
      .from("express_mission_tasks")
      .select(
        "id, mission_id, task_order, prompt_text, starter_text, hint_text, checklist, sample_answer, explanation, skill, difficulty"
      )
      .eq("mission_id", selectedMission.id)
      .eq("is_active", true)
      .order("task_order", { ascending: true })
      .limit(10);

    if (error || !data) {
      console.warn("Could not load Express Mission tasks:", error);
      setLoadError("Could not load this writing mission. Please try again.");
      setScreen("mission-list");
      return;
    }

    if (data.length < 10) {
      setLoadError(
        "This Express Mission does not have 10 active writing tasks yet. Please add more tasks in Supabase."
      );
      setScreen("mission-list");
      return;
    }

    setTasks(data as ExpressMissionTask[]);
    setTaskIndex(0);
    setStudentResponse("");
    setSubmittedResponses({});
    setHasSubmittedCurrentTask(false);
    setTimeLeft(20 * 60);
    setTokensEarned(0);
    setRewardSaved(false);
    setIsFinishing(false);
    setScreen("task");
  }

  async function submitCurrentTask() {
    if (!currentTask || !selectedMission || !userId) return;

    const cleanResponse = studentResponse.trim();

    if (cleanResponse.length < 5) {
      setLoadError("Write at least one complete sentence before submitting.");
      return;
    }

    setLoadError(null);

    const { error } = await supabase.from("express_mission_responses").insert({
      user_id: userId,
      mission_id: selectedMission.id,
      task_id: currentTask.id,
      student_response: cleanResponse,
    });

    if (error) {
      console.warn("Could not save Express Mission response:", error);
      setLoadError("Could not save your response. Please try again.");
      return;
    }

    setSubmittedResponses((prev) => ({
      ...prev,
      [currentTask.id]: cleanResponse,
    }));

    setHasSubmittedCurrentTask(true);
  }

  function goToNextTask() {
    if (taskIndex >= tasks.length - 1) {
      void finishMission();
      return;
    }

    const nextIndex = taskIndex + 1;
    const nextTask = tasks[nextIndex];

    setTaskIndex(nextIndex);
    setStudentResponse(submittedResponses[nextTask.id] ?? "");
    setHasSubmittedCurrentTask(Boolean(submittedResponses[nextTask.id]));
    setLoadError(null);
  }

  function calculateReward(finalCompletedCount: number) {
    if (finalCompletedCount < 10) return 0;

    if (selectedMode === "challenge" && timeLeft > 0) {
      return 6;
    }

    return 4;
  }

  async function finishMission() {
    if (isFinishing) return;

    setIsFinishing(true);

    const completedCount = Object.keys(submittedResponses).length;
    const finalReward = calculateReward(completedCount);
    const finalTimeTaken =
      selectedMode === "challenge" ? Math.max(0, 20 * 60 - timeLeft) : null;

    setTokensEarned(finalReward);
    setScreen("results");

    if (!userId || !selectedMission) return;

    const { error: attemptError } = await supabase
      .from("express_mission_attempts")
      .insert({
        user_id: userId,
        mission_id: selectedMission.id,
        mode: selectedMode ?? "practice",
        completed_tasks: completedCount,
        total_tasks: tasks.length,
        time_taken_seconds: finalTimeTaken,
        tokens_earned: finalReward,
      });

    if (attemptError) {
      console.warn("Could not save Express Mission attempt:", attemptError);
    }

    if (finalReward <= 0) return;

    const { error: tokenError } = await supabase
      .from("dream_token_transactions")
      .insert({
        user_id: userId,
        type: "earn",
        title:
          selectedMode === "challenge"
            ? "Express Missions Challenge Reward"
            : "Express Missions Reward",
        amount: finalReward,
        token_kind: "virtual",
      });

    if (tokenError) {
      console.warn("Could not award Express Mission tokens:", tokenError);
      return;
    }

    setRewardSaved(true);
    onTokenBalanceChange(tokenBalance + finalReward);
    window.dispatchEvent(new Event("dream-tokens-updated"));
  }

  function resetToLevels() {
    setSelectedLevelBand(null);
    setSelectedMission(null);
    setSelectedMode(null);
    setMissions([]);
    setTasks([]);
    setTaskIndex(0);
    setStudentResponse("");
    setSubmittedResponses({});
    setHasSubmittedCurrentTask(false);
    setLoadError(null);
    setTimeLeft(20 * 60);
    setTokensEarned(0);
    setRewardSaved(false);
    setIsFinishing(false);
    setScreen("level");
  }

  function resetToMissionList() {
    setSelectedMission(null);
    setSelectedMode(null);
    setTasks([]);
    setTaskIndex(0);
    setStudentResponse("");
    setSubmittedResponses({});
    setHasSubmittedCurrentTask(false);
    setLoadError(null);
    setTimeLeft(20 * 60);
    setTokensEarned(0);
    setRewardSaved(false);
    setIsFinishing(false);
    setScreen("mission-list");
  }

  function resetToMode() {
    setSelectedMode(null);
    setTasks([]);
    setTaskIndex(0);
    setStudentResponse("");
    setSubmittedResponses({});
    setHasSubmittedCurrentTask(false);
    setLoadError(null);
    setTimeLeft(20 * 60);
    setTokensEarned(0);
    setRewardSaved(false);
    setIsFinishing(false);
    setScreen("mode");
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  const selectedLevelInfo = expressLevelBands.find(
    (level) => level.id === selectedLevelBand
  );

  const completedCount = Object.keys(submittedResponses).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 155,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "14px" : "26px",
        background: "rgba(2, 8, 19, 0.55)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(1180px, 94vw)",
          maxHeight: isMobile ? "88dvh" : "92vh",
          overflowY: "auto",
          borderRadius: isMobile ? "22px" : "30px",
          border: "1px solid rgba(255, 157, 240, 0.62)",
          background:
            "linear-gradient(145deg, rgba(64, 24, 78, 0.96), rgba(15, 20, 58, 0.98))",
          boxShadow:
            "0 0 45px rgba(255, 157, 240, 0.28), 0 30px 90px rgba(0, 0, 0, 0.55)",
          padding: isMobile ? "28px 18px 24px" : "34px 46px 38px",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: isMobile ? "14px" : "22px",
            right: isMobile ? "14px" : "22px",
            width: isMobile ? "38px" : "44px",
            height: isMobile ? "38px" : "44px",
            borderRadius: "999px",
            border: "1px solid rgba(255, 180, 245, 0.7)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "white",
            fontSize: isMobile ? "24px" : "28px",
            lineHeight: 1,
            cursor: "pointer",
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
              color: "#ff9df0",
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
              textShadow: "0 0 24px rgba(255, 157, 240, 0.35)",
            }}
          >
            Express Missions
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "16px" : "20px",
              color: "#ffb8f5",
              fontWeight: 300,
            }}
          >
            Build writing skills through guided sentence, paragraph and
            composition tasks.
          </p>
        </div>

        {screen === "checking" && (
          <ExpressMessageCard message="Checking your Express Missions access..." />
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
              Express Missions Locked
            </h3>

            <p
              style={{
                margin: "14px 0 0",
                fontSize: "16px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              Express Missions are available for GKP students, paid Student
              Access members, Pro users and admins.
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
              <a href="/login" style={expressPrimaryLinkStyle}>
                Log In
              </a>

              <button type="button" onClick={onClose} style={expressGhostButton}>
                Exit
              </button>
            </div>
          </div>
        )}

        {screen === "level" && (
          <div
            style={{
              marginTop: "42px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: "22px",
            }}
          >
            {expressLevelBands.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => chooseLevel(level.id)}
                style={expressLargeCardStyle(level.accent)}
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

                <h3 style={expressCardTitleStyle}>{level.title}</h3>

                <p style={expressCardTextStyle}>{level.subtitle}</p>

                <div style={expressCardButtonLook}>Enter Writing Lab ›</div>
              </button>
            ))}
          </div>
        )}

        {screen === "loading" && (
          <ExpressMessageCard message="Loading Express Mission..." />
        )}

        {screen === "mission-list" && selectedLevelInfo && (
          <div style={{ marginTop: "38px" }}>
            <ExpressTopRow
              leftButton="← Back to Levels"
              onLeftClick={resetToLevels}
              rightText={`${selectedLevelInfo.title} · ${selectedLevelInfo.label}`}
            />

            {loadError && <ExpressErrorMessage message={loadError} />}

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
              {missions.map((mission) => (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => chooseMission(mission)}
                  style={{
                    minHeight: isMobile ? "auto" : "280px",
                    borderRadius: "24px",
                    padding: "26px",
                    border: "1px solid rgba(255,157,240,0.36)",
                    background:
                      "linear-gradient(180deg, rgba(84, 38, 110, 0.78), rgba(18, 22, 64, 0.92))",
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
                      color: "#ff9df0",
                      fontSize: "12px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    Express Mission {mission.mission_order}
                  </p>

                  <h3
                    style={{
                      margin: "16px 0 0",
                      fontSize: "28px",
                      lineHeight: 1.15,
                    }}
                  >
                    {mission.title}
                  </h3>

                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: "15px",
                      lineHeight: 1.5,
                      color: "rgba(255,255,255,0.72)",
                    }}
                  >
                    {mission.description}
                  </p>

                  <div style={expressSmallButtonLook}>Choose Mode ›</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === "mode" && selectedMission && (
          <div style={{ marginTop: "38px" }}>
            <ExpressTopRow
              leftButton="← Back to Missions"
              onLeftClick={resetToMissionList}
              rightText={selectedMission.title}
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
              {expressModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => startMission(mode.id)}
                  style={expressLargeCardStyle(mode.accent)}
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

                  <h3 style={expressCardTitleStyle}>{mode.title}</h3>

                  <p style={expressCardTextStyle}>{mode.subtitle}</p>

                  <div style={expressCardButtonLook}>Start {mode.title} ›</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === "task" && currentTask && selectedMission && (
          <div style={{ marginTop: "34px" }}>
            <ExpressTopRow
              leftButton="← Back to Mode"
              onLeftClick={resetToMode}
              rightText={
                selectedMode === "challenge"
                  ? `Challenge Mode · ${formatTime(timeLeft)}`
                  : `Practice Mode · Task ${taskIndex + 1}/10`
              }
            />

            {loadError && <ExpressErrorMessage message={loadError} />}

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
                  border: "1px solid rgba(255,157,240,0.42)",
                  background:
                    "linear-gradient(180deg, rgba(84, 38, 110, 0.74), rgba(18, 22, 64, 0.9))",
                  padding: "26px",
                  minHeight: isMobile ? "auto" : "520px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#ff9df0",
                    fontSize: "13px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  {selectedMission.title}
                </p>

                <h3
                  style={{
                    margin: "8px 0 0",
                    fontSize: isMobile ? "25px" : "30px",
                    fontWeight: 600,
                  }}
                >
                  Task {taskIndex + 1}
                </h3>

                <p
                  style={{
                    margin: "26px 0 0",
                    fontSize: isMobile ? "21px" : "28px",
                    lineHeight: 1.35,
                    fontWeight: 500,
                    color: "white",
                  }}
                >
                  {currentTask.prompt_text}
                </p>

                {currentTask.starter_text && (
                  <div
                    style={{
                      marginTop: "18px",
                      borderRadius: "18px",
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.07)",
                      padding: "16px",
                      color: "rgba(255,255,255,0.82)",
                      fontSize: "15px",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ color: "#ffb8f5" }}>Starter:</strong>{" "}
                    {currentTask.starter_text}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "18px",
                    borderRadius: "18px",
                    border: "1px solid rgba(255,215,106,0.28)",
                    background: "rgba(255,215,106,0.09)",
                    padding: "16px",
                    color: "#ffe6a8",
                    fontSize: "15px",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Hint:</strong> {currentTask.hint_text}
                </div>

                <textarea
                  value={studentResponse}
                  onChange={(event) => setStudentResponse(event.target.value)}
                  disabled={hasSubmittedCurrentTask}
                  placeholder="Write your answer here..."
                  style={{
                    marginTop: "22px",
                    width: "100%",
                    minHeight: "170px",
                    resize: "vertical",
                    borderRadius: "18px",
                    border: "1px solid rgba(255,157,240,0.42)",
                    background: "rgba(255,255,255,0.94)",
                    color: "#111827",
                    padding: "18px",
                    fontSize: "16px",
                    lineHeight: 1.55,
                    outline: "none",
                  }}
                />

                {hasSubmittedCurrentTask && (
                  <div
                    style={{
                      marginTop: "22px",
                      borderRadius: "20px",
                      border: "1px solid rgba(74, 222, 128, 0.44)",
                      background: "rgba(34, 197, 94, 0.12)",
                      padding: "18px",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "15px",
                      lineHeight: 1.55,
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: "#86efac",
                        fontSize: "17px",
                        marginBottom: "8px",
                      }}
                    >
                      Sample Answer
                    </strong>
                    {currentTask.sample_answer}

                    <strong
                      style={{
                        display: "block",
                        color: "#86efac",
                        fontSize: "17px",
                        margin: "16px 0 8px",
                      }}
                    >
                      Why it works
                    </strong>
                    {currentTask.explanation}
                  </div>
                )}
              </div>

              <div
                style={{
                  borderRadius: "24px",
                  border: "1px solid rgba(255,157,240,0.42)",
                  background:
                    "linear-gradient(180deg, rgba(94, 42, 122, 0.86), rgba(20, 22, 70, 0.98))",
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
                  Writing Checklist
                </h3>

                {selectedMode === "challenge" && (
                  <div
                    style={{
                      marginTop: "14px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,215,106,0.5)",
                      background: "rgba(255,215,106,0.12)",
                      padding: "10px 12px",
                      color: "#ffe6a8",
                      fontSize: "14px",
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    {formatTime(timeLeft)}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "18px",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  {currentTask.checklist.map((item) => (
                    <div
                      key={item}
                      style={{
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        padding: "13px 14px",
                        fontSize: "14px",
                        lineHeight: 1.4,
                        color: "rgba(255,255,255,0.82)",
                      }}
                    >
                      □ {item}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "22px",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  {!hasSubmittedCurrentTask ? (
                    <button
                      type="button"
                      onClick={submitCurrentTask}
                      style={expressNextButtonStyle}
                    >
                      Submit Writing
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goToNextTask}
                      style={expressNextButtonStyle}
                    >
                      {taskIndex >= 9 ? "Finish Mission" : "Next Task"}
                    </button>
                  )}

                  <p
                    style={{
                      margin: 0,
                      color: "rgba(255,255,255,0.62)",
                      fontSize: "13px",
                      lineHeight: 1.4,
                      textAlign: "center",
                    }}
                  >
                    Completed: {completedCount}/10
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "results" && selectedMission && (
          <div
            style={{
              margin: "42px auto 0",
              maxWidth: "760px",
              borderRadius: "26px",
              border: "1px solid rgba(255,157,240,0.5)",
              background:
                "linear-gradient(180deg, rgba(94, 42, 122, 0.86), rgba(20, 22, 70, 0.98))",
              padding: isMobile ? "24px" : "36px",
              textAlign: "center",
              boxShadow: "0 0 34px rgba(255, 157, 240, 0.26)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ff9df0",
                fontSize: "13px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Express Mission Complete
            </p>

            <h3
              style={{
                margin: "12px 0 0",
                fontSize: isMobile ? "30px" : "38px",
                fontWeight: 600,
              }}
            >
              {selectedMission.title}
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
              <ExpressResultStat label="Completed" value={`${completedCount}/10`} />
              <ExpressResultStat
                label="Mode"
                value={selectedMode === "challenge" ? "Timed" : "Practice"}
              />
              <ExpressResultStat label="Tokens" value={`+${tokensEarned}`} />
              <ExpressResultStat label="Balance" value={String(tokenBalance)} />
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
                ? "Your writing responses and Dreamscape Token reward have been saved."
                : tokensEarned > 0
                ? "Your writing responses were saved. Token reward may not have been saved."
                : "Complete all 10 writing tasks to earn the full Express Mission reward."}
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
                onClick={resetToMissionList}
                style={expressGhostButton}
              >
                Choose Another Mission
              </button>

              <button
                type="button"
                onClick={onClose}
                style={expressPrimaryButton}
              >
                Exit Express Missions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpressTopRow({
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
      <button type="button" onClick={onLeftClick} style={expressBackButtonStyle}>
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

function ExpressMessageCard({ message }: { message: string }) {
  return (
    <div
      style={{
        margin: "52px auto 20px",
        maxWidth: "560px",
        borderRadius: "24px",
        border: "1px solid rgba(255,157,240,0.36)",
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

function ExpressErrorMessage({ message }: { message: string }) {
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

function ExpressResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(255,157,240,0.28)",
        background: "rgba(255,255,255,0.08)",
        padding: "16px 10px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#ff9df0",
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

function expressLargeCardStyle(accent: string): CSSProperties {
  return {
    minHeight: "320px",
    borderRadius: "24px",
    padding: "30px",
    border: `1px solid ${accent}88`,
    background:
      "linear-gradient(180deg, rgba(84, 38, 110, 0.76), rgba(18, 22, 64, 0.92))",
    boxShadow: `0 0 22px ${accent}22, inset 0 0 24px rgba(255,255,255,0.03)`,
    color: "white",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
  };
}

const expressCardTitleStyle: CSSProperties = {
  margin: "24px 0 0",
  fontSize: "30px",
  fontWeight: 700,
};

const expressCardTextStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "16px",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.76)",
};

const expressCardButtonLook: CSSProperties = {
  marginTop: "auto",
  height: "52px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #ff9df0, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 700,
};

const expressSmallButtonLook: CSSProperties = {
  marginTop: "auto",
  height: "44px",
  borderRadius: "13px",
  background: "linear-gradient(135deg, #ff9df0, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 700,
};

const expressBackButtonStyle: CSSProperties = {
  border: "1px solid rgba(255,157,240,0.36)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 16px",
  cursor: "pointer",
};

const expressNextButtonStyle: CSSProperties = {
  width: "100%",
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #ff9df0, #8b5cf6)",
  color: "white",
  fontSize: "16px",
  fontWeight: 800,
  cursor: "pointer",
};

const expressPrimaryButton: CSSProperties = {
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #ff9df0, #8b5cf6)",
  color: "white",
  padding: "0 22px",
  fontWeight: 700,
  cursor: "pointer",
};

const expressPrimaryLinkStyle: CSSProperties = {
  ...expressPrimaryButton,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

const expressGhostButton: CSSProperties = {
  height: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(255,157,240,0.36)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 22px",
  cursor: "pointer",
};

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
    minHeight: "320px",
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