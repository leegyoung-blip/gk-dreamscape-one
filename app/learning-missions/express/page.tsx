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

export default function ExpressMissionsPage() {
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
    <ExpressMissionsActivity
      tokenBalance={tokenBalance}
      onTokenBalanceChange={setTokenBalance}
      onExit={() => router.push("/learning-missions")}
    />
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

type CompletedExpressAttempt = {
  mission_id: string;
  mode: ExpressMode;
  completed_tasks: number;
  tokens_earned: number;
};

type ExpressStoryUpgrade = {
  missionsRequired: number;
  name: string;
  description: string;
  image: string;
  icon: string;
  accent: string;
};

const allowedExpressMissionTiers = [
  "admin",
  "gkp_student",
  "paid_student",
  "student",
  "pro",
];

const expressStoryTrack: ExpressStoryUpgrade[] = [
  {
    missionsRequired: 0,
    name: "Blank Story Log",
    description:
      "Nova’s story archive is ready, but the pages are still empty.",
    image: "/learning-missions/express/items/blank-story-log.png",
    icon: "□",
    accent: "#ff9df0",
  },
  {
    missionsRequired: 1,
    name: "Word Beacon",
    description:
      "Nova can send simple word signals across Dreamscape pathways.",
    image: "/learning-missions/express/items/word-beacon.png",
    icon: "✎",
    accent: "#ff9df0",
  },
  {
    missionsRequired: 3,
    name: "Sentence Spark",
    description:
      "Nova can form clearer sentences that activate hidden story doors.",
    image: "/learning-missions/express/items/sentence-spark.png",
    icon: "✦",
    accent: "#ffd76a",
  },
  {
    missionsRequired: 5,
    name: "Description Lens",
    description:
      "Nova can make scenes clearer with stronger details and vivid descriptions.",
    image: "/learning-missions/express/items/description-lens.png",
    icon: "◉",
    accent: "#b58cff",
  },
  {
    missionsRequired: 8,
    name: "Emotion Crystal",
    description:
      "Nova can capture feelings, reactions and inner thoughts more powerfully.",
    image: "/learning-missions/express/items/emotion-crystal.png",
    icon: "◇",
    accent: "#ffb8f5",
  },
  {
    missionsRequired: 12,
    name: "Story Map",
    description:
      "Nova can connect openings, problems, climaxes and endings into stronger stories.",
    image: "/learning-missions/express/items/story-map.png",
    icon: "⌁",
    accent: "#7ee8ff",
  },
  {
    missionsRequired: 16,
    name: "Memory Archive",
    description:
      "Nova can store important moments, character actions and story discoveries.",
    image: "/learning-missions/express/items/memory-archive.png",
    icon: "▣",
    accent: "#60f0d0",
  },
  {
    missionsRequired: 20,
    name: "Dreamscribe System",
    description:
      "Nova’s full writing system is complete and ready to unlock advanced story pathways.",
    image: "/learning-missions/express/items/dreamscribe-system.png",
    icon: "✧",
    accent: "#ff9df0",
  },
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

function getCurrentStoryUpgrade(completedCount: number) {
  let currentUpgrade = expressStoryTrack[0];

  for (const upgrade of expressStoryTrack) {
    if (completedCount >= upgrade.missionsRequired) {
      currentUpgrade = upgrade;
    }
  }

  return currentUpgrade;
}

function getNextStoryUpgrade(completedCount: number) {
  return expressStoryTrack.find(
    (upgrade) => completedCount < upgrade.missionsRequired
  );
}

function getUnlockedStoryItems(completedCount: number) {
  return expressStoryTrack.filter(
    (upgrade) => completedCount >= upgrade.missionsRequired
  );
}

function getPreviewStoryItems(completedCount: number) {
  return expressStoryTrack.filter(
    (upgrade) => upgrade.missionsRequired <= Math.max(5, completedCount + 5)
  );
}

function ExpressMissionsActivity({
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

  const [completedAttempts, setCompletedAttempts] = useState<
    CompletedExpressAttempt[]
  >([]);

  const currentTask = tasks[taskIndex];

  const completedMissionIds = new Set(
    completedAttempts.map((attempt) => attempt.mission_id)
  );

  const completedMissionCount = completedAttempts.length;
  const currentStoryUpgrade = getCurrentStoryUpgrade(completedMissionCount);
  const nextStoryUpgrade = getNextStoryUpgrade(completedMissionCount);

  const unlockedStoryItems = getUnlockedStoryItems(completedMissionCount);
  const previewStoryItems = getPreviewStoryItems(completedMissionCount);

  const progressTarget =
    nextStoryUpgrade?.missionsRequired ??
    expressStoryTrack[expressStoryTrack.length - 1].missionsRequired;

  const previousTarget = currentStoryUpgrade.missionsRequired;
  const progressRange = Math.max(1, progressTarget - previousTarget);
  const progressWithinRange = Math.max(
    0,
    completedMissionCount - previousTarget
  );

  const progressPercentage = nextStoryUpgrade
    ? Math.min(100, Math.round((progressWithinRange / progressRange) * 100))
    : 100;

  const completedCount = Object.keys(submittedResponses).length;

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

    await loadCompletedAttempts(user.id);
    setScreen("level");
  }

  async function loadCompletedAttempts(activeUserId: string) {
    const { data, error } = await supabase
      .from("express_mission_attempts")
      .select("mission_id, mode, completed_tasks, tokens_earned")
      .eq("user_id", activeUserId);

    if (error) {
      console.warn("Could not load completed Express Mission attempts:", error);
      setCompletedAttempts([]);
      return;
    }

    const uniqueAttempts = new Map<string, CompletedExpressAttempt>();

    for (const attempt of data ?? []) {
      if (
        !uniqueAttempts.has(attempt.mission_id) &&
        attempt.tokens_earned > 0
      ) {
        uniqueAttempts.set(attempt.mission_id, {
          mission_id: attempt.mission_id,
          mode: attempt.mode as ExpressMode,
          completed_tasks: attempt.completed_tasks,
          tokens_earned: attempt.tokens_earned,
        });
      }
    }

    setCompletedAttempts(Array.from(uniqueAttempts.values()));
  }

  function isMissionCompleted(missionId: string) {
    return completedMissionIds.has(missionId);
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
    setLoadError(null);
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

  function calculateReward(finalCompletedCount: number, finalTimeLeft: number) {
    if (finalCompletedCount < 10) return 0;

    if (selectedMode === "challenge" && finalTimeLeft > 0) {
      return 6;
    }

    return 4;
  }

  async function finishMission() {
    if (isFinishing) return;

    setIsFinishing(true);

    const finalCompletedCount = Object.keys(submittedResponses).length;
    const finalTimeLeft = timeLeft;
    const finalMode = selectedMode ?? "practice";

    const finalTimeTaken =
      finalMode === "challenge" ? Math.max(0, 20 * 60 - finalTimeLeft) : null;

    if (!userId || !selectedMission) {
      setScreen("results");
      return;
    }

    const hasCompletedThisMissionBefore = isMissionCompleted(
      selectedMission.id
    );

    const finalReward = hasCompletedThisMissionBefore
      ? 0
      : calculateReward(finalCompletedCount, finalTimeLeft);

    setTokensEarned(finalReward);
    setScreen("results");

    const { error: attemptError } = await supabase
      .from("express_mission_attempts")
      .insert({
        user_id: userId,
        mission_id: selectedMission.id,
        mode: finalMode,
        completed_tasks: finalCompletedCount,
        total_tasks: tasks.length,
        time_taken_seconds: finalTimeTaken,
        tokens_earned: finalReward,
      });

    if (attemptError) {
      console.warn("Could not save Express Mission attempt:", attemptError);
      setRewardSaved(false);
      return;
    }

    if (!hasCompletedThisMissionBefore && finalReward > 0) {
      const newAttempt: CompletedExpressAttempt = {
        mission_id: selectedMission.id,
        mode: finalMode,
        completed_tasks: finalCompletedCount,
        tokens_earned: finalReward,
      };

      setCompletedAttempts((prev) => [...prev, newAttempt]);
    }

    if (finalReward <= 0) {
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
            ? "Express Missions Challenge Reward"
            : "Express Missions Reward",
        amount: finalReward,
        token_kind: "virtual",
      });

    if (tokenError) {
      console.warn("Could not award Express Mission tokens:", tokenError);
      setRewardSaved(false);
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
          url("/learning-missions/express/express-story-bg.png")
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
          border: "1px solid rgba(255, 157, 240, 0.7)",
          background: "rgba(2,8,19,0.72)",
          color: "white",
          fontSize: isMobile ? "12px" : "14px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          boxShadow: "0 0 18px rgba(255, 157, 240, 0.22)",
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
                color: "#ff9df0",
                fontSize: "13px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Express Missions
            </p>

            <h1
              style={{
                margin: "12px 0 0",
                fontSize: isMobile ? "38px" : isCompact ? "54px" : "72px",
                lineHeight: 0.95,
                fontWeight: 600,
                letterSpacing: "-0.055em",
                textShadow: "0 0 30px rgba(255, 157, 240, 0.28)",
              }}
            >
              Power Nova’s
              <br />
              Story System
            </h1>

            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "720px",
                fontSize: isMobile ? "16px" : "20px",
                color: "#ffe0fb",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              Some Dreamscape doors only open through powerful words. Complete
              writing missions to unlock Nova’s story log, word beacons,
              description tools and Dreamscribe system.
            </p>
          </div>

          <ExpressStoryShowcase
            isMobile={isMobile}
            completedMissionCount={completedMissionCount}
            previewStoryItems={previewStoryItems}
          />
        </header>

        <ExpressStoryPanel
          isMobile={isMobile}
          completedMissionCount={completedMissionCount}
          currentUpgrade={currentStoryUpgrade}
          nextUpgrade={nextStoryUpgrade}
          progressPercentage={progressPercentage}
        />

        <section
          style={{
            width: "min(1240px, 100%)",
            margin: "0 auto",
            borderRadius: isMobile ? "24px" : "32px",
            border: "1px solid rgba(255,157,240,0.22)",
            background:
              "linear-gradient(145deg, rgba(42,12,52,0.74), rgba(26,18,58,0.82))",
            boxShadow:
              "0 0 34px rgba(255,157,240,0.12), 0 28px 80px rgba(0,0,0,0.34)",
            padding: isMobile ? "20px" : "30px",
          }}
        >
          {screen === "checking" && (
            <ExpressMessageCard message="Checking your Express Missions access..." />
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

                <button
                  type="button"
                  onClick={onExit}
                  style={expressGhostButton}
                >
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
            <div>
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
                {missions.map((mission) => {
                  const completed = isMissionCompleted(mission.id);
                  const completedAttempt = completedAttempts.find(
                    (attempt) => attempt.mission_id === mission.id
                  );

                  return (
                    <button
                      key={mission.id}
                      type="button"
                      onClick={() => chooseMission(mission)}
                      style={{
                        minHeight: isMobile ? "auto" : "290px",
                        borderRadius: "24px",
                        padding: "26px",
                        border: completed
                          ? "1px solid rgba(74,222,128,0.5)"
                          : "1px solid rgba(255,157,240,0.36)",
                        background: completed
                          ? "linear-gradient(180deg, rgba(20, 92, 60, 0.72), rgba(8, 35, 36, 0.9))"
                          : "linear-gradient(180deg, rgba(84, 38, 110, 0.78), rgba(18, 22, 64, 0.92))",
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
                          color: completed ? "#86efac" : "#ff9df0",
                          fontSize: "12px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        {completed
                          ? "Completed Once"
                          : `Express Mission ${mission.mission_order}`}
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

                      {completed && completedAttempt && (
                        <p
                          style={{
                            margin: "14px 0 0",
                            color: "rgba(255,255,255,0.76)",
                            fontSize: "13px",
                            lineHeight: 1.45,
                          }}
                        >
                          Counted completion:{" "}
                          {completedAttempt.completed_tasks}/10 · Tokens: +
                          {completedAttempt.tokens_earned}
                        </p>
                      )}

                      <div
                        style={{
                          ...expressSmallButtonLook,
                          background: completed
                            ? "linear-gradient(135deg, #86efac, #22c55e)"
                            : expressSmallButtonLook.background,
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

          {screen === "mode" && selectedMission && (
            <div>
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

                    <div style={expressCardButtonLook}>
                      Start {mode.title} ›
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen === "task" && currentTask && selectedMission && (
            <div>
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
                margin: "10px auto",
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
                <ExpressResultStat
                  label="Completed"
                  value={`${completedCount}/10`}
                />
                <ExpressResultStat
                  label="Mode"
                  value={selectedMode === "challenge" ? "Timed" : "Practice"}
                />
                <ExpressResultStat label="Tokens" value={`+${tokensEarned}`} />
                <ExpressResultStat
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
                {rewardSaved && tokensEarned > 0
                  ? "Your writing responses, Nova story progress, and Dreamscape Token reward have been saved."
                  : rewardSaved
                  ? "Practice attempt saved. This mission was already completed before, so no extra story progress or tokens were awarded."
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
                  onClick={onExit}
                  style={expressPrimaryButton}
                >
                  Exit Express Missions
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function ExpressStoryShowcase({
  isMobile,
  completedMissionCount,
  previewStoryItems,
}: {
  isMobile: boolean;
  completedMissionCount: number;
  previewStoryItems: ExpressStoryUpgrade[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "repeat(2, minmax(0, 1fr))"
          : "repeat(3, minmax(0, 1fr))",
        gap: "14px",
      }}
    >
      {previewStoryItems.slice(0, isMobile ? 4 : 6).map((item) => {
        const unlocked = completedMissionCount >= item.missionsRequired;

        return <StoryItemCard key={item.name} item={item} unlocked={unlocked} />;
      })}
    </div>
  );
}

function StoryItemCard({
  item,
  unlocked,
}: {
  item: ExpressStoryUpgrade;
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
          ? "linear-gradient(145deg, rgba(64,24,78,0.82), rgba(14,8,34,0.88))"
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

function ExpressStoryPanel({
  isMobile,
  completedMissionCount,
  currentUpgrade,
  nextUpgrade,
  progressPercentage,
}: {
  isMobile: boolean;
  completedMissionCount: number;
  currentUpgrade: ExpressStoryUpgrade;
  nextUpgrade: ExpressStoryUpgrade | undefined;
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
          border: "1px solid rgba(255,157,240,0.35)",
          background:
            "linear-gradient(145deg, rgba(42,12,52,0.72), rgba(78,26,90,0.58))",
          padding: isMobile ? "20px" : "24px",
          boxShadow: "0 0 24px rgba(255,157,240,0.14)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#ff9df0",
            fontSize: "12px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 800,
          }}
        >
          Story System Progress
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
            border: "1px solid rgba(255,157,240,0.28)",
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercentage}%`,
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #ff9df0, #8b5cf6)",
              boxShadow: "0 0 18px rgba(255,157,240,0.45)",
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
          Counted Express Missions:{" "}
          <strong style={{ color: "#ff9df0" }}>
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
          {nextUpgrade ? nextUpgrade.name : "Dreamscribe System Complete"}
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
            : "Nova’s full story system is unlocked. Future Express Missions can still be replayed for writing practice."}
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
            ? `Complete ${missionsToNext} new Express Mission${
                missionsToNext === 1 ? "" : "s"
              } to unlock this story item. Replays are saved, but they do not add story progress.`
            : "All current story system upgrades unlocked."}
        </div>
      </div>
    </section>
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
        margin: "20px auto",
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
    minHeight: "300px",
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