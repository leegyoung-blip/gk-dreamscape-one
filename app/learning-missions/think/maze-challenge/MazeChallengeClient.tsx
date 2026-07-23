"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getThinkGearProgress } from "@/lib/thinkGearProgress";

type ThinkForestLevel = 1 | 2;

const MAX_THINK_GEAR_STAGE = 7;

const NOVA_INTRO_MESSAGE =
  "The evil Dreamkeeper has captured vast regions of Dreamscape, filling everyone’s dreams with nightmares. No one knows what the Dreamkeeper looks like, but we have to find and defeat him. The journey will take us through long-uncharted regions of Dreamscape. This forest is the first area we must cross. The Dreamkeeper has filled it with traps and sent Bone Guards to stop us. Stay close, recover the Energy Cores and reach the exit.";

const LEVEL_META: Record<
  ThinkForestLevel,
  {
    courseId: string;
    title: string;
    shortTitle: string;
    description: string;
    requiredGearStage: number;
    requiredGearName: string;
  }
> = {
  1: {
    courseId: "uncharted-forest-01",
    title: "The Uncharted Forest",
    shortTitle: "Level 1",
    description:
      "Recover all three energy cores, survive the Bone Guards and reach the forest exit.",
    requiredGearStage: 0,
    requiredGearName: "Explorer Gear",
  },
  2: {
    courseId: "eclipse-ruins-02",
    title: "Eclipse Ruins",
    shortTitle: "Level 2",
    description:
      "Enter a city destroyed beneath a permanent eclipse. The Shadow Visor widens Nova’s vision through the fog while larger Bone Guard patrols defend the ruined courtyards.",
    requiredGearStage: 1,
    requiredGearName: "Shadow Visor",
  },
};

const PhaserGame = dynamic(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#030816]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        <p className="mt-4 text-xs font-bold tracking-[0.22em] text-cyan-100/60">
          ENTERING DREAMSCAPE
        </p>
      </div>
    </div>
  ),
});

type FullscreenElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type ThinkForestCompletionDetail = {
  courseId: string;
  score: number;
  completionTimeMs: number;
  coresCollected: number;
  guardsDefeated: number;
};

type LeaderboardRow = {
  rank: number | string;
  user_id: string;
  username: string;
  best_score: number;
  best_time_ms: number;
  cores_collected: number;
  guards_defeated: number;
  completed_at: string;
};

type SubmitScoreRow = {
  saved: boolean;
  improved: boolean;
  best_score: number;
  best_time_ms: number;
};

export default function MazeChallengeClient() {
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [scoreMessage, setScoreMessage] = useState("");
  const [activeLevel, setActiveLevel] = useState<ThinkForestLevel>(1);
  const [thinkGearStage, setThinkGearStage] = useState(0);
  const [gearProgressLoading, setGearProgressLoading] = useState(true);
  const [levelMessage, setLevelMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNovaIntro, setShowNovaIntro] = useState(true);

  const activeLevelMeta = LEVEL_META[activeLevel];

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);

    const { data, error } = await supabase.rpc(
      "get_think_forest_leaderboard",
      {
        p_course_id: activeLevelMeta.courseId,
        p_limit: 10,
      },
    );

    if (error) {
      console.warn("Could not load Think Forest leaderboard:", error.message);
      setLeaderboard([]);
    } else {
      setLeaderboard((data ?? []) as LeaderboardRow[]);
    }

    setLeaderboardLoading(false);
  }, [activeLevelMeta.courseId]);

  useEffect(() => {
    setScoreMessage("");
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    let mounted = true;

    async function loadThinkGearStage() {
      setGearProgressLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUserId(user?.id ?? null);

      if (!user) {
        setThinkGearStage(0);
        setGearProgressLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, tier")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      const resolvedRole = String(profile?.role || profile?.tier || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/_/g, "-");
      const adminAccess = !profileError && resolvedRole === "admin";

      setIsAdmin(adminAccess);

      if (adminAccess) {
        setThinkGearStage(MAX_THINK_GEAR_STAGE);
        setGearProgressLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("think_mission_attempts")
        .select("quiz_id, tokens_earned")
        .eq("user_id", user.id)
        .gt("tokens_earned", 0);

      if (!mounted) return;

      if (error) {
        console.warn("Could not load Think Gear stage:", error.message);
        setThinkGearStage(0);
        setGearProgressLoading(false);
        return;
      }

      const completedMissionCount = new Set(
        (data ?? []).map((attempt) => String(attempt.quiz_id)),
      ).size;

      const progress = getThinkGearProgress(completedMissionCount);
      setThinkGearStage(progress.currentUpgrade.stage);
      setGearProgressLoading(false);
    }

    void loadThinkGearStage();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const requiredStage = LEVEL_META[activeLevel].requiredGearStage;

    if (!gearProgressLoading && !isAdmin && thinkGearStage < requiredStage) {
      setActiveLevel(1);
    }
  }, [activeLevel, gearProgressLoading, isAdmin, thinkGearStage]);

  const saveCompletedRun = useCallback(
    async (detail: ThinkForestCompletionDetail) => {
      setScoreMessage("Saving completed run...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setScoreMessage("Log in to save this run to the leaderboard.");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase.rpc(
        "submit_think_forest_score",
        {
          p_course_id: detail.courseId,
          p_score: detail.score,
          p_completion_time_ms: detail.completionTimeMs,
          p_cores_collected: detail.coresCollected,
          p_guards_defeated: detail.guardsDefeated,
        },
      );

      if (error) {
        console.error("Could not save Think Forest score:", error.message);
        setScoreMessage(`Could not save this run: ${error.message}`);
        return;
      }

      const result = ((data ?? []) as SubmitScoreRow[])[0];

      if (result?.improved) {
        setScoreMessage("New personal best saved to the leaderboard.");
      } else {
        setScoreMessage("Run completed. Your existing personal best remains.");
      }

      await loadLeaderboard();
    },
    [loadLeaderboard],
  );

  useEffect(() => {
    function handleCompletion(event: Event) {
      const customEvent = event as CustomEvent<ThinkForestCompletionDetail>;
      void saveCompletedRun(customEvent.detail);
    }

    window.addEventListener("think-forest-complete", handleCompletion);

    return () => {
      window.removeEventListener("think-forest-complete", handleCompletion);
    };
  }, [saveCompletedRun]);

  const requestFullscreen = useCallback(async () => {
    const element = gameAreaRef.current as FullscreenElement | null;

    if (!element) {
      return;
    }

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen({ navigationUI: "hide" });
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen could not be started:", error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const fullscreenDocument = document as FullscreenDocument;

    try {
      if (fullscreenDocument.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (
        fullscreenDocument.webkitFullscreenElement &&
        fullscreenDocument.webkitExitFullscreen
      ) {
        await fullscreenDocument.webkitExitFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen could not be closed:", error);
    }
  }, []);

  useEffect(() => {
    const fullscreenDocument = document as FullscreenDocument;

    function syncFullscreen() {
      setIsFullscreen(
        Boolean(
          fullscreenDocument.fullscreenElement ||
            fullscreenDocument.webkitFullscreenElement,
        ),
      );

      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030611] text-white">
      <header className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href="/learning-missions/think"
          className="rounded-full border border-cyan-200/20 bg-white/[0.05] px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          ← Think Missions
        </Link>

        <div className="text-right">
          <p className="text-[10px] font-bold tracking-[0.24em] text-cyan-300/70">
            UNCHARTED DREAMSCAPE
          </p>
          <p className="mt-1 text-sm font-semibold text-white/85">
            {activeLevelMeta.shortTitle} · Dreamkeeper Expedition
          </p>
        </div>
      </header>

      <section className="px-3 pb-10 sm:px-5">
        <div className="mx-auto mb-5 flex w-full max-w-[1500px] flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
              THINK MISSION CHALLENGE
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              {activeLevelMeta.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58 sm:text-base">
              {activeLevelMeta.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {([1, 2] as ThinkForestLevel[]).map((level) => {
                const selected = activeLevel === level;
                const meta = LEVEL_META[level];
                const locked =
                  gearProgressLoading ||
                  (!isAdmin && thinkGearStage < meta.requiredGearStage);

                return (
                  <button
                    key={level}
                    type="button"
                    aria-disabled={locked}
                    onClick={() => {
                      if (locked) {
                        setLevelMessage(
                          gearProgressLoading
                            ? "Checking your Think Gear progress..."
                            : `Unlock ${meta.requiredGearName} to enter Level ${level}.`,
                        );
                        return;
                      }

                      setLevelMessage("");
                      setActiveLevel(level);
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-black tracking-[0.14em] transition ${
                      selected
                        ? "border-cyan-200/55 bg-cyan-300/20 text-cyan-50"
                        : locked
                          ? "cursor-not-allowed border-white/10 bg-black/20 text-white/30"
                          : "border-white/12 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
                    }`}
                  >
                    {locked ? "🔒 " : ""}
                    LEVEL {level}
                  </button>
                );
              })}
            </div>

            {levelMessage && (
              <p className="mt-3 text-sm font-semibold text-amber-200/85">
                {levelMessage}
              </p>
            )}
          </div>

          <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
            PLAYABLE PROTOTYPE
          </span>
        </div>

        <div
          ref={gameAreaRef}
          className={
            isFullscreen
              ? "relative h-screen w-screen overflow-hidden bg-[#030816]"
              : "relative mx-auto aspect-video w-full max-w-[1500px] overflow-hidden rounded-[24px] border border-cyan-200/15 bg-[#030816] shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
          }
        >
          {showNovaIntro ? (
            <NovaIntroDialog
              message={NOVA_INTRO_MESSAGE}
              onBegin={() => setShowNovaIntro(false)}
            />
          ) : (
            <PhaserGame
              key={`${activeLevel}-${isAdmin ? "admin" : thinkGearStage}`}
              level={activeLevel}
              gearStage={isAdmin ? MAX_THINK_GEAR_STAGE : thinkGearStage}
            />
          )}

          <button
            type="button"
            onClick={() => {
              if (isFullscreen) {
                void exitFullscreen();
              } else {
                void requestFullscreen();
              }
            }}
            className="absolute bottom-3 left-1/2 z-[90] grid h-11 w-11 -translate-x-1/2 place-items-center rounded-xl border border-cyan-200/35 bg-[#030816]/80 text-xl text-cyan-100 backdrop-blur-md transition hover:bg-[#11233b]/90"
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            title={isFullscreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullscreen ? "↙" : "⛶"}
          </button>
        </div>

        <div className="mx-auto mt-4 grid w-full max-w-[1500px] gap-3 sm:grid-cols-5">
          <InfoCard label="Objective" value="Collect 3 cores and reach the exit" />
          <InfoCard label="Movement" value="Orbit pad on touch · WASD/arrows on desktop" />
          <InfoCard label="Combat" value="Attack button on touch · Space on desktop" />
          <InfoCard label="Pause" value="Use the top Pause button or press P" />
          <InfoCard label="Restart" value="Press R at any time" />
        </div>

        <section className="mx-auto mt-4 w-full max-w-[1500px] overflow-hidden rounded-[22px] border border-cyan-200/15 bg-white/[0.035] backdrop-blur-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300/70">
                DREAMKEEPER EXPEDITION RANKINGS
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {activeLevelMeta.shortTitle} Leaderboard
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {scoreMessage && (
                <p className="text-sm text-cyan-100/75">{scoreMessage}</p>
              )}

              <button
                type="button"
                onClick={() => void loadLeaderboard()}
                className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[70px_minmax(170px,1fr)_120px_130px_100px_120px] gap-3 border-b border-white/8 px-5 py-3 text-[10px] font-bold tracking-[0.17em] text-white/35 sm:px-7">
                <span>RANK</span>
                <span>PLAYER</span>
                <span>SCORE</span>
                <span>BEST TIME</span>
                <span>CORES</span>
                <span>GUARDS</span>
              </div>

              {leaderboardLoading ? (
                <div className="px-5 py-8 text-sm text-white/50 sm:px-7">
                  Loading leaderboard...
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="px-5 py-8 text-sm text-white/50 sm:px-7">
                  No completed runs yet. Be the first explorer to escape.
                </div>
              ) : (
                leaderboard.map((row) => {
                  const isCurrentUser = row.user_id === userId;

                  return (
                    <div
                      key={row.user_id}
                      className={`grid grid-cols-[70px_minmax(170px,1fr)_120px_130px_100px_120px] gap-3 border-b border-white/[0.06] px-5 py-4 text-sm sm:px-7 ${
                        isCurrentUser
                          ? "bg-cyan-300/[0.08] text-white"
                          : "text-white/72"
                      }`}
                    >
                      <span className="font-black text-cyan-200">
                        #{Number(row.rank)}
                      </span>
                      <span className="truncate font-semibold">
                        {row.username}
                        {isCurrentUser ? " (You)" : ""}
                      </span>
                      <span className="font-bold text-white">
                        {Number(row.best_score).toLocaleString()}
                      </span>
                      <span>{formatMilliseconds(Number(row.best_time_ms))}</span>
                      <span>{Number(row.cores_collected)}/3</span>
                      <span>{Number(row.guards_defeated)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-4 w-full max-w-[1500px] rounded-[22px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-7">
          <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300/70">
            CURRENT BUILD
          </p>
          <h2 className="mt-2 text-2xl font-bold">What is included</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-white/58">
            Level 1 crosses the Uncharted Forest. Level 2 enters Eclipse
            Ruins using a separate destroyed-city map, invisible ruin collision
            zones, a wider Shadow Visor fog reveal and ten Bone Guards. Touch
            devices use a circular Orbit Control, while desktop and laptop users
            retain WASD and arrow-key movement. The Pause menu separates sound
            effects and background-music volume.
          </p>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("think-forest-restart"))}
            className="mt-5 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            Restart Game
          </button>
        </section>
      </section>
    </main>
  );
}

function NovaIntroDialog({
  message,
  onBegin,
}: {
  message: string;
  onBegin: () => void;
}) {
  const [visibleText, setVisibleText] = useState("");
  const isComplete = visibleText.length >= message.length;

  useEffect(() => {
    setVisibleText("");
    let characterIndex = 0;

    const timer = window.setInterval(() => {
      characterIndex += 1;
      setVisibleText(message.slice(0, characterIndex));

      if (characterIndex >= message.length) {
        window.clearInterval(timer);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [message]);

  function revealOrBegin() {
    if (!isComplete) {
      setVisibleText(message);
      return;
    }

    onBegin();
  }

  return (
    <div className="absolute inset-0 z-[80] grid place-items-center bg-[#020611]/88 p-4 backdrop-blur-md sm:p-8">
      <section className="relative w-full max-w-[920px] overflow-hidden rounded-[28px] border border-cyan-200/25 bg-[linear-gradient(145deg,rgba(5,20,42,0.98),rgba(4,10,27,0.98))] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.65)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_24%,rgba(83,215,255,0.16),transparent_30%),radial-gradient(circle_at_88%_80%,rgba(116,79,255,0.12),transparent_32%)]" />

        <div className="relative grid gap-5 sm:grid-cols-[190px_1fr] sm:items-center">
          <div className="mx-auto grid h-[180px] w-[180px] place-items-center overflow-hidden rounded-[24px] border border-cyan-200/20 bg-cyan-300/[0.06]">
            <div
              aria-label="Nova"
              className="h-[168px] w-[168px] bg-no-repeat"
              style={{
                backgroundImage: 'url("/games/think-forest/nova-idle.png")',
                backgroundSize: "400% 400%",
                backgroundPosition: "0% 66.666%",
              }}
            />
          </div>

          <div>
            <p className="text-[11px] font-black tracking-[0.24em] text-cyan-300">
              NOVA · EXPEDITION BRIEFING
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              The journey begins here.
            </h2>

            <button
              type="button"
              onClick={revealOrBegin}
              className="mt-5 block min-h-[190px] w-full rounded-2xl border border-white/10 bg-black/20 p-5 text-left text-base leading-7 text-white/82 transition hover:bg-black/25 sm:text-lg"
              aria-label={isComplete ? "Begin expedition" : "Show full briefing"}
            >
              {visibleText}
              {!isComplete && (
                <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-cyan-200 align-middle" />
              )}
            </button>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-white/38">
                {!isComplete
                  ? "Tap the message to reveal the full briefing."
                  : "Briefing complete. Prepare to enter Level 1."}
              </p>

              <button
                type="button"
                onClick={revealOrBegin}
                className="rounded-full border border-cyan-100/35 bg-cyan-300/15 px-5 py-2.5 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/22"
              >
                {isComplete ? "Begin Expedition →" : "Show Full Message"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
      <p className="text-[10px] font-bold tracking-[0.2em] text-white/35">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-sm font-medium text-white/82">{value}</p>
    </div>
  );
}

function formatMilliseconds(milliseconds: number) {
  const totalSeconds = Math.max(0, milliseconds) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toFixed(1)
    .padStart(4, "0")}`;
}
