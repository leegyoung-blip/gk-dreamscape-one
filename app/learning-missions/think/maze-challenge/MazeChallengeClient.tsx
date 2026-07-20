"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getThinkGearProgress,
  thinkGearTrack,
  type ThinkGearUpgrade,
  type ThinkMazeAbilities,
} from "@/lib/thinkGearProgress";

const COURSE_ID = "logic-maze-01";

type ThinkMazeCompleteDetail = {
  runId: string;
  courseId: string;
  gearStage: number;
  score: number;
  completionTimeMs: number;
  coresCollected: number;
  cluesCollected: number;
  puzzlesSolved: number;
  mistakes: number;
  trapsTriggered: number;
};

type LeaderboardRow = {
  rank: number | string;
  user_id: string;
  username: string;
  best_score: number;
  best_time_ms: number;
  cores_collected: number;
  clues_collected: number;
  puzzles_solved: number;
  gear_stage: number;
  completed_at: string;
};

type PlayerResultRow = {
  rank: number | string;
  user_id: string;
  username: string;
  best_score: number;
  best_time_ms: number;
  gear_stage: number;
  completed_at: string;
};

type SubmitScoreRow = {
  saved: boolean;
  improved: boolean;
  best_score: number;
  best_time_ms: number;
};

type PhaserGameProps = {
  gearStage: number;
  gearName: string;
  abilities: ThinkMazeAbilities;
};

const PhaserGame = dynamic<PhaserGameProps>(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[500px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-emerald-300" />
        <p className="text-sm font-medium tracking-[0.18em] text-white/60">
          PREPARING LOGIC MAZE
        </p>
      </div>
    </div>
  ),
});

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

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function stageName(stage: number) {
  return thinkGearTrack.find((upgrade) => upgrade.stage === stage)?.shortName ??
    `Stage ${stage}`;
}

export default function MazeChallengeClient() {
  const [accessState, setAccessState] = useState<
    "checking" | "allowed" | "locked"
  >("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUpgrade, setCurrentUpgrade] = useState<ThinkGearUpgrade>(
    thinkGearTrack[0],
  );
  const [gearProgressLoading, setGearProgressLoading] = useState(true);
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
  const [playerResult, setPlayerResult] = useState<PlayerResultRow | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardMessage, setLeaderboardMessage] = useState("");
  const [scoreSaveMessage, setScoreSaveMessage] = useState("");
  const submittedRunRef = useRef<string | null>(null);

  const loadGearProgress = useCallback(async (activeUserId: string | null) => {
    setGearProgressLoading(true);

    if (!activeUserId) {
      setCurrentUpgrade(thinkGearTrack[0]);
      setGearProgressLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("think_mission_attempts")
      .select("quiz_id, tokens_earned")
      .eq("user_id", activeUserId)
      .gt("tokens_earned", 0);

    if (error) {
      console.warn("Could not load Think gear progress:", error.message);
      setCurrentUpgrade(thinkGearTrack[0]);
      setGearProgressLoading(false);
      return;
    }

    const completedQuizIds = new Set(
      (data ?? []).map((attempt) => String(attempt.quiz_id)),
    );
    const progress = getThinkGearProgress(completedQuizIds.size);

    setCurrentUpgrade(progress.currentUpgrade);
    setGearProgressLoading(false);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardMessage("");

    const { data, error } = await supabase.rpc(
      "get_think_maze_leaderboard",
      {
        p_course_id: COURSE_ID,
        p_limit: 10,
      },
    );

    if (error) {
      console.warn("Logic Maze leaderboard load failed:", error.message);
      setLeaderboardRows([]);
      setLeaderboardMessage(
        "Could not load the leaderboard. Run the Think Maze SQL in Supabase first.",
      );
      setLeaderboardLoading(false);
      return;
    }

    const rows = (data ?? []) as LeaderboardRow[];
    setLeaderboardRows(rows);

    if (rows.length === 0) {
      setLeaderboardMessage(
        "No completed runs yet. Be the first player on the leaderboard.",
      );
    }

    setLeaderboardLoading(false);
  }, []);

  const loadPlayerResult = useCallback(async () => {
    const { data, error } = await supabase.rpc(
      "get_think_maze_player_result",
      { p_course_id: COURSE_ID },
    );

    if (error) {
      console.warn("Logic Maze player result load failed:", error.message);
      setPlayerResult(null);
      return;
    }

    const row = ((data ?? []) as PlayerResultRow[])[0] ?? null;
    setPlayerResult(row);
  }, []);

  const saveCompletedRun = useCallback(
    async (result: ThinkMazeCompleteDetail) => {
      if (submittedRunRef.current === result.runId) return;
      submittedRunRef.current = result.runId;

      if (!userId) {
        setScoreSaveMessage(
          "Maze complete. Log in before playing to save your score.",
        );
        return;
      }

      setScoreSaveMessage("Saving your completed run...");

      const { data, error } = await supabase.rpc(
        "submit_think_maze_score",
        {
          p_course_id: result.courseId,
          p_score: result.score,
          p_completion_time_ms: result.completionTimeMs,
          p_cores_collected: result.coresCollected,
          p_clues_collected: result.cluesCollected,
          p_puzzles_solved: result.puzzlesSolved,
          p_mistakes: result.mistakes,
          p_traps_triggered: result.trapsTriggered,
        },
      );

      if (error) {
        console.warn("Logic Maze score save failed:", error.message);
        setScoreSaveMessage(
          "The run was completed, but the score could not be saved. Check the Think Maze SQL in Supabase.",
        );
        return;
      }

      const resultRow = ((data ?? []) as SubmitScoreRow[])[0];

      if (resultRow?.improved) {
        setScoreSaveMessage(
          `New personal best saved: ${resultRow.best_score.toLocaleString()} points in ${formatTime(
            resultRow.best_time_ms,
          )}.`,
        );
      } else {
        setScoreSaveMessage(
          `Run recorded. Your best remains ${(
            resultRow?.best_score ?? result.score
          ).toLocaleString()} points.`,
        );
      }

      await Promise.all([loadLeaderboard(), loadPlayerResult()]);
    },
    [loadLeaderboard, loadPlayerResult, userId],
  );

  useEffect(() => {
    let active = true;

    async function loadAccessAndUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setUserId(null);
        setAccessState("locked");
        setGearProgressLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !profile) {
        console.warn("Could not check Logic Maze access:", error?.message);
        setAccessState("locked");
        setGearProgressLoading(false);
        return;
      }

      const role = profile.role || profile.tier || null;

      if (!roleHasMissionAccess(role)) {
        setAccessState("locked");
        setGearProgressLoading(false);
        return;
      }

      setUserId(user.id);
      await loadGearProgress(user.id);

      if (!active) return;
      setAccessState("allowed");
    }

    void loadAccessAndUser();
    void loadLeaderboard();
    void loadPlayerResult();

    return () => {
      active = false;
    };
  }, [loadGearProgress, loadLeaderboard, loadPlayerResult]);

  useEffect(() => {
    function handleMazeComplete(event: Event) {
      const customEvent = event as CustomEvent<ThinkMazeCompleteDetail>;
      void saveCompletedRun(customEvent.detail);
    }

    function handleMazeRestart() {
      submittedRunRef.current = null;
      setScoreSaveMessage("");
    }

    window.addEventListener("think-maze-complete", handleMazeComplete);
    window.addEventListener("think-maze-restart-requested", handleMazeRestart);

    return () => {
      window.removeEventListener("think-maze-complete", handleMazeComplete);
      window.removeEventListener(
        "think-maze-restart-requested",
        handleMazeRestart,
      );
    };
  }, [saveCompletedRun]);

  const playerRow = playerResult;

  if (accessState === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050914] text-white">
        <div className="rounded-3xl border border-emerald-300/20 bg-white/[0.05] px-8 py-7 text-center backdrop-blur-xl">
          Checking Logic Maze access...
        </div>
      </main>
    );
  }

  if (accessState === "locked") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050914] px-5 text-white">
        <div className="w-full max-w-xl rounded-[28px] border border-amber-300/30 bg-amber-300/[0.08] p-8 text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-amber-200">
            LOGIC MAZE LOCKED
          </p>
          <h1 className="mt-3 text-3xl font-bold">Think Mission Access Required</h1>
          <p className="mt-4 leading-7 text-white/65">
            The Logic Maze is available for student, teacher and admin accounts.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-6 py-3 font-bold text-slate-950"
            >
              Log In
            </Link>
            <Link
              href="/learning-missions/think"
              className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold text-white"
            >
              Back to Think Missions
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050914] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/learning-missions/think"
            className="rounded-full border border-cyan-300/30 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur-xl transition hover:bg-white/[0.09]"
          >
            ← Think Missions
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              SYSTEM ONLINE
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/55">
              Course 01
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-emerald-300/15 bg-gradient-to-br from-[#0a1730] via-[#081225] to-[#07101e] shadow-[0_35px_120px_rgba(0,0,0,0.48)]">
          <div className="grid gap-6 border-b border-white/10 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.24em] text-emerald-300">
                THINK CHALLENGE · LOGIC MAZE 01
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                Logic Maze Challenge
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
                Collect all three energy cores, solve the puzzle terminals and
                reach the exit. Nova’s unlocked Think tools provide extra
                abilities during the run.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-5 py-4">
              <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-300/80">
                CURRENT LOADOUT
              </p>
              <p className="mt-2 text-lg font-bold">
                {gearProgressLoading ? "Loading..." : currentUpgrade.name}
              </p>
              <p className="mt-1 text-xs text-white/50">
                Gear Stage {currentUpgrade.stage}
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-5">
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/30 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
              <PhaserGame
                gearStage={currentUpgrade.stage}
                gearName={currentUpgrade.name}
                abilities={currentUpgrade.mazeAbilities}
              />
            </div>

            {scoreSaveMessage && (
              <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-5 py-4 text-sm text-emerald-100">
                {scoreSaveMessage}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard label="Objective" value="3 Cores + 3 Puzzles" />
              <InfoCard
                label="Your Rank"
                value={playerRow ? `#${playerRow.rank}` : "Unranked"}
              />
              <InfoCard
                label="Personal Best"
                value={
                  playerRow
                    ? playerRow.best_score.toLocaleString()
                    : "No completed run"
                }
              />
              <InfoCard
                label="Best Time"
                value={playerRow ? formatTime(playerRow.best_time_ms) : "—"}
              />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-300/70">
                      CONTROLS AND TOOLS
                    </p>
                    <p className="mt-2 text-sm text-white/50">
                      Keyboard controls are listed below. Touch controls appear
                      inside the game on mobile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new Event("think-maze-restart-requested"),
                      )
                    }
                    className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                  >
                    Restart Maze
                  </button>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                  <ControlLine keys="WASD / Arrows" label="Move Nova" />
                  <ControlLine keys="E" label="Use nearby puzzle terminal" />
                  <ControlLine keys="1" label="Logic Lens" />
                  <ControlLine keys="2" label="Pattern Scanner" />
                  <ControlLine keys="3" label="Clue Compass" />
                  <ControlLine keys="4" label="Energy Wrench" />
                  <ControlLine keys="5" label="Spark Staff during puzzle" />
                  <ControlLine keys="R" label="Restart the maze" />
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <AbilityChip
                    name="Logic Lens"
                    charges={currentUpgrade.mazeAbilities.logicLensCharges}
                  />
                  <AbilityChip
                    name="Pattern Scanner"
                    charges={currentUpgrade.mazeAbilities.scannerCharges}
                  />
                  <AbilityChip
                    name="Clue Compass"
                    charges={currentUpgrade.mazeAbilities.compassCharges}
                  />
                  <AbilityChip
                    name="Puzzle Shield"
                    charges={currentUpgrade.mazeAbilities.shieldCharges}
                    passive
                  />
                  <AbilityChip
                    name="Energy Wrench"
                    charges={currentUpgrade.mazeAbilities.wrenchCharges}
                  />
                  <AbilityChip
                    name="Spark Staff"
                    charges={currentUpgrade.mazeAbilities.sparkCharges}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.22em] text-amber-300/80">
                      TOP EXPLORERS
                    </p>
                    <h2 className="mt-2 text-xl font-bold">Leaderboard</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadLeaderboard()}
                    className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/70"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  {leaderboardLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-white/50">
                      Loading leaderboard...
                    </div>
                  ) : leaderboardRows.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-white/50">
                      {leaderboardMessage}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {leaderboardRows.map((row) => (
                        <div
                          key={row.user_id}
                          className={`grid grid-cols-[38px_1fr_auto] items-center gap-3 px-4 py-3 text-sm ${
                            row.user_id === userId ? "bg-emerald-300/[0.08]" : ""
                          }`}
                        >
                          <div className="font-bold text-amber-200">
                            #{row.rank}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {row.username}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/45">
                              {stageName(row.gear_stage)} · {formatTime(row.best_time_ms)}
                            </p>
                          </div>
                          <div className="text-right font-bold text-emerald-200">
                            {row.best_score.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-white/40">
        {label.toUpperCase()}
      </p>
      <p className="mt-2 font-bold text-white">{value}</p>
    </div>
  );
}

function ControlLine({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
      <strong className="min-w-[92px] text-white">{keys}</strong>
      <span>{label}</span>
    </div>
  );
}

function AbilityChip({
  name,
  charges,
  passive = false,
}: {
  name: string;
  charges: number;
  passive?: boolean;
}) {
  const unlocked = charges > 0;

  return (
    <div
      className={`rounded-xl border px-3 py-3 text-xs ${
        unlocked
          ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100"
          : "border-white/10 bg-white/[0.025] text-white/35"
      }`}
    >
      <p className="font-semibold">{name}</p>
      <p className="mt-1">
        {unlocked
          ? passive
            ? `${charges} trap block${charges === 1 ? "" : "s"}`
            : `${charges} charge${charges === 1 ? "" : "s"}`
          : "Locked"}
      </p>
    </div>
  );
}
