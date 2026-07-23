"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getThinkGearProgress,
  thinkGearTrack,
} from "@/lib/thinkGearProgress";

type ScreenMode = "desktop" | "tablet" | "mobile";

type MazePlayerResult = {
  rank: number | string;
  user_id: string;
  username: string;
  best_score: number;
  best_time_ms: number;
  gear_stage: number;
  completed_at: string;
};

const THINK_MAZE_COURSE_ID = "logic-maze-01";

const THINK_GEAR_IMAGES: Record<number, string> = {
  0: "/activities/learning-missions/think/items/explorer-gear.png",
  1: "/activities/learning-missions/think/items/shadow-visor.png",
  2: "/activities/learning-missions/think/items/mist-tracker.png",
  3: "/activities/learning-missions/think/items/soul-compass.png",
  4: "/activities/learning-missions/think/items/electric-shield.png",
  5: "/activities/learning-missions/think/items/rift-breaker.png",
  6: "/activities/learning-missions/think/items/storm-staff.png",
  7: "/activities/learning-missions/think/items/dreamforged-arsenal.png",
};

function getThinkGearImage(stage: number, fallbackImage: string) {
  return THINK_GEAR_IMAGES[stage] ?? fallbackImage;
}

const THINK_GEAR_NAMES: Record<number, string> = {
  0: "Explorer Gear",
  1: "Shadow Visor",
  2: "Mist Tracker",
  3: "Soul Compass",
  4: "Electric Shield",
  5: "Rift Breaker",
  6: "Storm Staff",
  7: "Dreamforged Arsenal",
};

function getThinkGearName(stage: number, fallbackName: string) {
  return THINK_GEAR_NAMES[stage] ?? fallbackName;
}

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

function formatTime(milliseconds: number | null) {
  if (milliseconds === null) return "—";

  const totalSeconds = Math.max(0, milliseconds) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toFixed(1)
    .padStart(4, "0")}`;
}

export default function ThinkGearClient() {
  const router = useRouter();
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [status, setStatus] = useState<"loading" | "ready" | "locked">(
    "loading",
  );
  const [tokenBalance, setTokenBalance] = useState(0);
  const [completedMissionCount, setCompletedMissionCount] = useState(0);
  const [mazeRank, setMazeRank] = useState<number | null>(null);
  const [mazeBestScore, setMazeBestScore] = useState<number | null>(null);
  const [mazeBestTimeMs, setMazeBestTimeMs] = useState<number | null>(null);

  const {
    currentUpgrade,
    nextUpgrade,
    progressPercentage,
    missionsToNext,
    isComplete,
  } = getThinkGearProgress(completedMissionCount);

  useEffect(() => {
    void initialise();
  }, []);

  useEffect(() => {
    const refreshTokens = () => void loadTokens();
    window.addEventListener("dream-tokens-updated", refreshTokens);
    return () =>
      window.removeEventListener("dream-tokens-updated", refreshTokens);
  }, []);

  async function initialise() {
    setStatus("loading");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("locked");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn("Could not load Think Gear profile:", profileError);
      setStatus("locked");
      return;
    }

    if (!roleHasThinkAccess(profile.role || profile.tier || null)) {
      setStatus("locked");
      return;
    }

    await Promise.all([
      loadTokens(user.id),
      loadMissionProgress(user.id),
      loadMazeResult(),
    ]);

    setStatus("ready");
  }

  async function loadTokens(activeUserId?: string) {
    const resolvedUserId =
      activeUserId ?? (await supabase.auth.getUser()).data.user?.id;

    if (!resolvedUserId) return;

    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", resolvedUserId)
      .eq("token_kind", "virtual");

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error);
      return;
    }

    setTokenBalance(
      data?.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0,
    );
  }

  async function loadMissionProgress(activeUserId: string) {
    const { data, error } = await supabase
      .from("think_mission_attempts")
      .select("quiz_id, tokens_earned")
      .eq("user_id", activeUserId)
      .gt("tokens_earned", 0);

    if (error) {
      console.warn("Could not load Think Gear progress:", error);
      setCompletedMissionCount(0);
      return;
    }

    setCompletedMissionCount(
      new Set((data ?? []).map((attempt) => attempt.quiz_id)).size,
    );
  }

  async function loadMazeResult() {
    const { data, error } = await supabase.rpc(
      "get_think_maze_player_result",
      { p_course_id: THINK_MAZE_COURSE_ID },
    );

    if (error) {
      console.warn("Could not load Logic Maze result:", error.message);
      setMazeRank(null);
      setMazeBestScore(null);
      setMazeBestTimeMs(null);
      return;
    }

    const row = ((data ?? []) as MazePlayerResult[])[0];

    if (!row) {
      setMazeRank(null);
      setMazeBestScore(null);
      setMazeBestTimeMs(null);
      return;
    }

    const parsedRank = Number(row.rank);
    setMazeRank(Number.isFinite(parsedRank) ? parsedRank : null);
    setMazeBestScore(row.best_score);
    setMazeBestTimeMs(row.best_time_ms);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundImage: `
          linear-gradient(180deg, rgba(2,8,19,0.22), rgba(2,8,19,0.7)),
          url("/activities/learning-missions/think/think-inventory-bg.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          minHeight: isMobile ? "58px" : "68px",
          padding: isMobile ? "8px 10px" : "10px 18px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "10px",
          background: "transparent",
          textShadow: "0 2px 12px rgba(0,0,0,0.72)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/learning-missions/think")}
          style={{ ...pillButton, justifySelf: "start" }}
        >
          ← Think Missions
        </button>

        <div style={{ textAlign: "center", minWidth: 0 }}>
          <p style={headerEyebrow}>MY GEAR</p>
          {!isMobile && (
            <p style={{ margin: "3px 0 0", fontSize: "13px", opacity: 0.72 }}>
              Nova’s Logic Maze Inventory
            </p>
          )}
        </div>

        <div
          style={{
            justifySelf: "end",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {!isMobile && (
            <div style={tokenPill}>
              <span style={{ color: "#ffd76a" }}>DT</span> {tokenBalance}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              router.push("/learning-missions/think/maze-challenge")
            }
            style={mazeButton}
          >
            Challenge
          </button>
        </div>
      </header>

      {status === "loading" && (
        <div style={centeredState}>Loading Nova’s gear inventory...</div>
      )}

      {status === "locked" && (
        <div style={centeredState}>
          <div style={lockedCard}>
            <h1 style={{ margin: 0 }}>My Gear Locked</h1>
            <p style={{ margin: "12px 0 0", opacity: 0.72 }}>
              Sign in with a student, teacher or admin account to view Nova’s
              inventory.
            </p>
            <a href="/login" style={{ ...primaryButton, marginTop: "18px" }}>
              Log In
            </a>
          </div>
        </div>
      )}

      {status === "ready" && (
        <section
          style={{
            width: "min(1320px, calc(100% - 28px))",
            margin: "0 auto",
            padding: isMobile ? "12px 0 28px" : "20px 0 48px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0,1.08fr) minmax(360px,0.92fr)",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            <section style={currentGearCard(currentUpgrade.accent)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div>
                  <p style={{ ...panelEyebrow, color: currentUpgrade.accent }}>
                    CURRENT GEAR LOADOUT
                  </p>
                  <h1
                    style={{
                      margin: "8px 0 0",
                      fontSize: isMobile ? "32px" : "clamp(38px,4vw,58px)",
                      lineHeight: 1.05,
                    }}
                  >
                    {getThinkGearName(
                      currentUpgrade.stage,
                      currentUpgrade.name,
                    )}
                  </h1>
                </div>

                <div style={missionPill}>{completedMissionCount} done</div>
              </div>

              <div style={gearImageBox}>
                <img
                  src={getThinkGearImage(currentUpgrade.stage, currentUpgrade.imageSrc)}
                  alt={getThinkGearName(
                    currentUpgrade.stage,
                    currentUpgrade.name,
                  )}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter: "drop-shadow(0 22px 32px rgba(0,0,0,0.48))",
                  }}
                />
              </div>

              <p
                style={{
                  margin: "18px 0 0",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "16px",
                  lineHeight: 1.55,
                }}
              >
                {currentUpgrade.description}
              </p>

              <div style={progressTrack}>
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

              <div style={nextUnlockBox(nextUpgrade?.accent || "#86efac")}>
                <p
                  style={{
                    ...panelEyebrow,
                    color: nextUpgrade?.accent || "#86efac",
                  }}
                >
                  {nextUpgrade ? "NEXT UNLOCK" : "INVENTORY COMPLETE"}
                </p>
                <h2 style={{ margin: "8px 0 0", fontSize: "26px" }}>
                  {nextUpgrade
                    ? getThinkGearName(nextUpgrade.stage, nextUpgrade.name)
                    : "All Tools Unlocked"}
                </h2>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "rgba(255,255,255,0.74)",
                    lineHeight: 1.45,
                  }}
                >
                  {nextUpgrade
                    ? `Complete ${missionsToNext} new Think Mission${
                        missionsToNext === 1 ? "" : "s"
                      } to unlock this tool.`
                    : "Nova’s full Logic Maze inventory is ready."}
                </p>
              </div>
            </section>

            <aside
              style={{
                display: "grid",
                gridTemplateRows: "auto 1fr",
                gap: "20px",
              }}
            >
              <section style={challengeCard}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div>
                    <p style={panelEyebrow}>LOGIC MAZE CHALLENGE</p>
                    <h2
                      style={{
                        margin: "8px 0 0",
                        fontSize: isMobile ? "28px" : "34px",
                      }}
                    >
                      Dreamscape Maze
                    </h2>
                  </div>
                  <div style={rankPill}>
                    {mazeRank === null ? "Unranked" : `Rank #${mazeRank}`}
                  </div>
                </div>

                <p
                  style={{
                    margin: "14px 0 0",
                    color: "rgba(255,255,255,0.72)",
                    lineHeight: 1.5,
                  }}
                >
                  Use the tools unlocked through Think Missions to reveal
                  clues, avoid traps and reach the maze exit.
                </p>

                <div style={statGrid}>
                  <StatCard
                    label="Best Score"
                    value={
                      mazeBestScore === null
                        ? "—"
                        : mazeBestScore.toLocaleString()
                    }
                  />
                  <StatCard
                    label="Best Time"
                    value={formatTime(mazeBestTimeMs)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/learning-missions/think/maze-challenge")
                  }
                  style={{ ...primaryButton, width: "100%", marginTop: "16px" }}
                >
                  Enter Logic Maze ›
                </button>
              </section>

              <section style={abilityCard}>
                <p style={panelEyebrow}>CURRENT MAZE ABILITIES</p>
                <div style={{ marginTop: "14px", display: "grid", gap: "9px" }}>
                  <AbilityRow
                    name="Logic Lens"
                    value={currentUpgrade.mazeAbilities.logicLensCharges}
                  />
                  <AbilityRow
                    name="Pattern Scanner"
                    value={currentUpgrade.mazeAbilities.scannerCharges}
                  />
                  <AbilityRow
                    name="Clue Compass"
                    value={currentUpgrade.mazeAbilities.compassCharges}
                  />
                  <AbilityRow
                    name="Puzzle Shield"
                    value={currentUpgrade.mazeAbilities.shieldCharges}
                  />
                  <AbilityRow
                    name="Energy Wrench"
                    value={currentUpgrade.mazeAbilities.wrenchCharges}
                  />
                  <AbilityRow
                    name="Spark Staff"
                    value={currentUpgrade.mazeAbilities.sparkCharges}
                  />
                </div>
              </section>
            </aside>
          </div>

          <section style={{ marginTop: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "end",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "14px",
              }}
            >
              <div>
                <p style={panelEyebrow}>GEAR UPGRADE TRACK</p>
                <h2
                  style={{
                    margin: "7px 0 0",
                    fontSize: isMobile ? "28px" : "38px",
                  }}
                >
                  Nova’s Inventory
                </h2>
              </div>
              <p
                style={{
                  margin: 0,
                  color: isComplete ? "#86efac" : "rgba(255,255,255,0.62)",
                  fontSize: "13px",
                }}
              >
                {completedMissionCount}/20 counted missions
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isCompact
                    ? "repeat(2,minmax(0,1fr))"
                    : "repeat(4,minmax(0,1fr))",
                gap: "14px",
              }}
            >
              {thinkGearTrack.map((upgrade) => {
                const unlocked = completedMissionCount >= upgrade.missionsRequired;
                const current = upgrade.stage === currentUpgrade.stage;

                return (
                  <article
                    key={upgrade.stage}
                    style={upgradeCard(upgrade.accent, unlocked, current)}
                  >
                    <div style={upgradeImageBox}>
                      <img
                        src={getThinkGearImage(upgrade.stage, upgrade.imageSrc)}
                        alt={getThinkGearName(upgrade.stage, upgrade.name)}
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          opacity: unlocked ? 1 : 0.38,
                          filter: unlocked
                            ? "drop-shadow(0 12px 18px rgba(0,0,0,0.38))"
                            : "grayscale(1)",
                        }}
                      />
                    </div>
                    <p
                      style={{
                        margin: "12px 0 0",
                        color: unlocked ? upgrade.accent : "rgba(255,255,255,0.42)",
                        fontSize: "10px",
                        letterSpacing: "0.14em",
                        fontWeight: 900,
                      }}
                    >
                      {current
                        ? "CURRENT LOADOUT"
                        : unlocked
                          ? "UNLOCKED"
                          : `${upgrade.missionsRequired} MISSIONS`}
                    </p>
                    <h3 style={{ margin: "7px 0 0", fontSize: "21px" }}>
                      {getThinkGearName(upgrade.stage, upgrade.name)}
                    </h3>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "rgba(255,255,255,0.66)",
                        fontSize: "13px",
                        lineHeight: 1.42,
                      }}
                    >
                      {upgrade.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <p style={statLabel}>{label}</p>
      <p style={statValue}>{value}</p>
    </div>
  );
}

function AbilityRow({ name, value }: { name: string; value: number }) {
  return (
    <div style={abilityRow}>
      <span>{name}</span>
      <strong style={{ color: value > 0 ? "#60f0d0" : "rgba(255,255,255,0.38)" }}>
        {value > 0 ? `${value} charge${value === 1 ? "" : "s"}` : "Locked"}
      </strong>
    </div>
  );
}

const headerEyebrow: CSSProperties = {
  margin: 0,
  color: "#60f0d0",
  fontSize: "11px",
  letterSpacing: "0.2em",
  fontWeight: 900,
};

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

const mazeButton: CSSProperties = {
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
};

const centeredState: CSSProperties = {
  minHeight: "calc(100dvh - 68px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const lockedCard: CSSProperties = {
  width: "min(600px,100%)",
  borderRadius: "24px",
  border: "1px solid rgba(255,215,106,0.4)",
  background: "rgba(20,14,8,0.82)",
  padding: "30px",
  textAlign: "center",
};

function currentGearCard(accent: string): CSSProperties {
  return {
    borderRadius: "28px",
    border: `1px solid ${accent}66`,
    background:
      "linear-gradient(145deg, rgba(5,24,46,0.72), rgba(5,42,54,0.74))",
    backdropFilter: "blur(12px)",
    padding: "clamp(18px,2.5vw,30px)",
    boxShadow: `0 0 32px ${accent}1f, 0 24px 60px rgba(0,0,0,0.28)`,
  };
}

const panelEyebrow: CSSProperties = {
  margin: 0,
  color: "#60f0d0",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const missionPill: CSSProperties = {
  flexShrink: 0,
  borderRadius: "999px",
  border: "1px solid rgba(96,240,208,0.25)",
  background: "rgba(96,240,208,0.08)",
  padding: "9px 12px",
  color: "#c8fff3",
  fontSize: "12px",
  fontWeight: 900,
};

const gearImageBox: CSSProperties = {
  marginTop: "20px",
  height: "clamp(250px,34vw,440px)",
  borderRadius: "22px",
  border: "1px solid rgba(255,255,255,0.1)",
  background:
    "radial-gradient(circle at center, rgba(96,240,208,0.14), rgba(255,255,255,0.025) 52%, rgba(0,0,0,0.12))",
  overflow: "hidden",
};

const progressTrack: CSSProperties = {
  marginTop: "20px",
  height: "13px",
  borderRadius: "999px",
  border: "1px solid rgba(96,240,208,0.24)",
  background: "rgba(255,255,255,0.07)",
  overflow: "hidden",
};

function nextUnlockBox(accent: string): CSSProperties {
  return {
    marginTop: "18px",
    borderRadius: "17px",
    border: `1px solid ${accent}44`,
    background: "rgba(255,255,255,0.045)",
    padding: "16px",
  };
}

const challengeCard: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid rgba(96,240,208,0.32)",
  background:
    "linear-gradient(145deg, rgba(8,58,70,0.72), rgba(5,25,48,0.84))",
  backdropFilter: "blur(12px)",
  padding: "22px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.24)",
};

const rankPill: CSSProperties = {
  flexShrink: 0,
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.4)",
  background: "rgba(255,215,106,0.1)",
  color: "#ffe6a8",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: 900,
};

const statGrid: CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "10px",
};

const statCard: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid rgba(96,240,208,0.18)",
  background: "rgba(255,255,255,0.055)",
  padding: "13px",
};

const statLabel: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.5)",
  fontSize: "10px",
  letterSpacing: "0.12em",
  fontWeight: 900,
};

const statValue: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "21px",
  fontWeight: 900,
};

const primaryButton: CSSProperties = {
  minHeight: "48px",
  borderRadius: "13px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg, #60f0d0, #35c5ff)",
  color: "#062532",
  padding: "0 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};

const abilityCard: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(5,22,42,0.72)",
  backdropFilter: "blur(12px)",
  padding: "22px",
};

const abilityRow: CSSProperties = {
  minHeight: "40px",
  borderRadius: "11px",
  background: "rgba(255,255,255,0.05)",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  fontSize: "13px",
};

function upgradeCard(
  accent: string,
  unlocked: boolean,
  current: boolean,
): CSSProperties {
  return {
    borderRadius: "20px",
    border: current
      ? `2px solid ${accent}`
      : `1px solid ${unlocked ? `${accent}66` : "rgba(255,255,255,0.12)"}`,
    background: unlocked
      ? "linear-gradient(145deg, rgba(7,42,58,0.72), rgba(5,22,42,0.82))"
      : "linear-gradient(145deg, rgba(20,24,32,0.68), rgba(7,14,28,0.82))",
    padding: "16px",
    boxShadow: current ? `0 0 28px ${accent}28` : "none",
  };
}

const upgradeImageBox: CSSProperties = {
  height: "150px",
  borderRadius: "15px",
  background: "rgba(255,255,255,0.045)",
  overflow: "hidden",
};
