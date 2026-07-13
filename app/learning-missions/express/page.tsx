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
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "86px 14px 28px" : "96px 26px 42px",
        background:
          "radial-gradient(circle at 50% 0%, rgba(255,157,240,0.18), transparent 35%), #020813",
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
          onClick={onExit}
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

          <div
            style={{
              width: "210px",
              height: "1px",
              margin: "20px auto 0",
              background:
                "linear-gradient(90deg, transparent, rgba(255,157,240,0.9), transparent)",
            }}
          />
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

              <button type="button" onClick={onExit} style={expressGhostButton}>
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

                  <div style={expressCardButtonLook}>
                    Start {mode.title} ›
                  </div>
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
              <ExpressResultStat
                label="Completed"
                value={`${completedCount}/10`}
              />
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
                onClick={onExit}
                style={expressPrimaryButton}
              >
                Exit Express Missions
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
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