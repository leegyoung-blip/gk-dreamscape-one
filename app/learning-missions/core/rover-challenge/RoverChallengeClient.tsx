"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  coreUpgradeTrack,
  type CoreRoverGameStats,
  type CoreRoverUpgrade,
  getCoreRoverProgress,
} from "@/lib/coreRoverProgress";
import {
  getRoverLevel,
  type RoverLevelAccess,
  type RoverLevelConfig,
  type RoverLevelId,
} from "./levels";

type RoverCourseCompleteDetail = {
  levelId: RoverLevelId;
  courseId: string;
  roverStage: number;
  score: number;
  completionTimeMs: number;
  orbsCollected: number;
  checkpointsReached: number;
  crashPenalty: number;
};

type SubmitLevelRow = {
  accepted: boolean;
  improved: boolean;
  best_score: number;
  best_time_ms: number;
  unlocked_next_level: boolean;
};

type PhaserGameProps = {
  levelConfig: RoverLevelConfig;
  roverStage: number;
  roverName: string;
  gameStats: CoreRoverGameStats;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenGameElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const PhaserGame = dynamic<PhaserGameProps>(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => <LoadingScreen label="PREPARING ROVER CHALLENGE" />,
});

export default function RoverChallengeClient({
  levelId,
}: {
  levelId: RoverLevelId;
}) {
  const levelConfig = getRoverLevel(levelId);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUpgrade, setCurrentUpgrade] = useState<CoreRoverUpgrade>(
    coreUpgradeTrack[0],
  );
  const [access, setAccess] = useState<RoverLevelAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [completion, setCompletion] =
    useState<RoverCourseCompleteDetail | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [nextLevelUnlocked, setNextLevelUnlocked] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const submittedRunRef = useRef<string | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  const loadPlayerState = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setAccess(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [attemptsResult, accessResult] = await Promise.all([
      supabase
        .from("core_mission_attempts")
        .select("quiz_id, tokens_earned")
        .eq("user_id", user.id)
        .gt("tokens_earned", 0),
      supabase.rpc("get_rover_level_access"),
    ]);

    if (attemptsResult.error) {
      console.warn("Could not load rover stage:", attemptsResult.error.message);
      setCurrentUpgrade(coreUpgradeTrack[0]);
    } else {
      const completedQuizIds = new Set(
        (attemptsResult.data ?? []).map((attempt) => attempt.quiz_id),
      );
      setCurrentUpgrade(
        getCoreRoverProgress(completedQuizIds.size).currentUpgrade,
      );
    }

    if (accessResult.error) {
      console.warn("Could not load rover level access:", accessResult.error.message);
      setAccess(null);
      setLoadError(
        "Level access could not be checked. Run the Phase 1 Supabase migration first.",
      );
    } else {
      const rows = (accessResult.data ?? []) as RoverLevelAccess[];
      setAccess(rows.find((row) => Number(row.level_id) === levelId) ?? null);
    }

    setLoading(false);
  }, [levelId]);

  const saveCompletedRun = useCallback(
    async (result: RoverCourseCompleteDetail) => {
      const runKey = [
        result.courseId,
        result.roverStage,
        result.score,
        result.completionTimeMs,
        result.orbsCollected,
        result.crashPenalty,
      ].join(":");

      if (submittedRunRef.current === runKey) return;
      submittedRunRef.current = runKey;
      setCompletion(result);

      if (!userId) {
        setSaveMessage("Log in to save this completion and unlock the next level.");
        return;
      }

      setSaveMessage("Saving completion and checking the next level...");

      const { data, error } = await supabase.rpc("submit_rover_level_result", {
        p_level_id: result.levelId,
        p_course_id: result.courseId,
        p_score: result.score,
        p_completion_time_ms: result.completionTimeMs,
        p_orbs_collected: result.orbsCollected,
        p_checkpoints_reached: result.checkpointsReached,
        p_crash_penalty: result.crashPenalty,
      });

      if (error) {
        console.warn("Rover completion save failed:", error.message);
        setSaveMessage(
          "The course was completed, but progress could not be saved. Please try again.",
        );
        return;
      }

      const saved = ((data ?? []) as SubmitLevelRow[])[0];
      const hasNextLevel = result.levelId < 3;

      setNextLevelUnlocked(
        Boolean(saved?.accepted && (saved.unlocked_next_level || hasNextLevel)),
      );

      setSaveMessage(
        saved?.improved
          ? `New personal best: ${saved.best_score.toLocaleString()} points.`
          : hasNextLevel
            ? `Level ${result.levelId} completion saved. The next level is now available.`
            : "Completion saved. You can replay this level at any time.",
      );
    },
    [userId],
  );

  useEffect(() => {
    void loadPlayerState();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void loadPlayerState());
    return () => subscription.unsubscribe();
  }, [loadPlayerState]);

  useEffect(() => {
    const handleCourseComplete = (event: Event) => {
      const result = (event as CustomEvent<RoverCourseCompleteDetail>).detail;
      if (result.levelId === levelId && result.courseId === levelConfig.courseId) {
        void saveCompletedRun(result);
      }
    };

    window.addEventListener("rover-course-complete", handleCourseComplete);
    return () =>
      window.removeEventListener("rover-course-complete", handleCourseComplete);
  }, [levelConfig.courseId, levelId, saveCompletedRun]);

  useEffect(() => {
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  const refreshGameSize = useCallback(() => {
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
  }, []);

  const toggleGameFullscreen = useCallback(async () => {
    const fullscreenDocument = document as FullscreenDocument;
    const gameElement = gameAreaRef.current as FullscreenGameElement | null;
    if (!gameElement) return;

    try {
      if (
        fullscreenDocument.fullscreenElement ||
        fullscreenDocument.webkitFullscreenElement
      ) {
        if (fullscreenDocument.exitFullscreen) {
          await fullscreenDocument.exitFullscreen();
        } else {
          await fullscreenDocument.webkitExitFullscreen?.();
        }
      } else if (gameElement.requestFullscreen) {
        await gameElement.requestFullscreen({ navigationUI: "hide" });
      } else {
        await gameElement.webkitRequestFullscreen?.();
      }
    } catch (error) {
      console.warn("Could not change Rover Challenge fullscreen mode:", error);
    }

    refreshGameSize();
  }, [refreshGameSize]);

  useEffect(() => {
    const fullscreenDocument = document as FullscreenDocument;
    const syncFullscreenState = () => {
      setIsNativeFullscreen(
        Boolean(
          fullscreenDocument.fullscreenElement ||
            fullscreenDocument.webkitFullscreenElement,
        ),
      );
      refreshGameSize();
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
    };
  }, [refreshGameSize]);

  const replay = () => {
    setCompletion(null);
    setSaveMessage("");
    setNextLevelUnlocked(false);
    submittedRunRef.current = null;
    window.dispatchEvent(new Event("rover-restart-requested"));
  };

  const canPlay =
    Boolean(userId && access?.unlocked && access.stage_ready) &&
    levelConfig.status === "playable";

  return (
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-[#050713] text-white">
      <div ref={gameAreaRef} className="relative h-full w-full overflow-hidden bg-[#050713]">
        {loading ? (
          <LoadingScreen label="CHECKING LEVEL ACCESS" />
        ) : canPlay ? (
          <PhaserGame
            levelConfig={levelConfig}
            roverStage={currentUpgrade.stage}
            roverName={currentUpgrade.name}
            gameStats={currentUpgrade.gameStats}
          />
        ) : (
          <LevelGate
            level={levelConfig}
            access={access}
            currentStage={currentUpgrade.stage}
            signedIn={Boolean(userId)}
            error={loadError}
          />
        )}

        <Link
          href="/learning-missions/core/rover"
          aria-label="Back to My Rover"
          className="absolute left-3 top-3 z-[90] flex h-11 items-center gap-2 rounded-xl border border-cyan-200/35 bg-[#050816]/80 px-3 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(83,215,255,0.22)] backdrop-blur-md transition hover:border-cyan-100/60 hover:bg-[#0a1730]/90"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">My Rover</span>
        </Link>

        {canPlay && (
          <button
            type="button"
            onClick={toggleGameFullscreen}
            aria-label={isNativeFullscreen ? "Exit native fullscreen" : "Enter native fullscreen"}
            title={isNativeFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="absolute bottom-3 left-3 z-[90] grid h-11 w-11 place-items-center rounded-xl border border-cyan-200/35 bg-[#050816]/80 text-xl text-cyan-100 shadow-[0_0_22px_rgba(83,215,255,0.22)] backdrop-blur-md transition hover:border-cyan-100/60 hover:bg-[#0a1730]/90"
          >
            {isNativeFullscreen ? "↙" : "⛶"}
          </button>
        )}

        {completion && (
          <CompletionOverlay
            result={completion}
            saveMessage={saveMessage}
            nextLevelUnlocked={nextLevelUnlocked}
            onReplay={replay}
          />
        )}
      </div>
    </main>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-[#050713]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        <p className="text-sm font-medium tracking-[0.18em] text-white/60">{label}</p>
      </div>
    </div>
  );
}

function LevelGate({
  level,
  access,
  currentStage,
  signedIn,
  error,
}: {
  level: RoverLevelConfig;
  access: RoverLevelAccess | null;
  currentStage: number;
  signedIn: boolean;
  error: string;
}) {
  let title = `Level ${level.id} is locked`;
  let message = `Complete Level ${level.prerequisiteLevel} first to unlock this course.`;

  if (!signedIn) {
    title = "Log in to start a rover course";
    message = "Your course unlocks and personal bests are saved to your account.";
  } else if (error) {
    title = "Level access unavailable";
    message = error;
  } else if (access?.unlocked && !access.stage_ready) {
    title = `Stage ${level.minimumRoverStage} rover required`;
    message = `Your current rover is Stage ${currentStage}. Complete more Core Missions to upgrade before entering this course.`;
  } else if (access?.unlocked && access.stage_ready && level.status === "phase-2") {
    title = `${level.title} unlocked`;
    message = "Your progression gate is ready. The branching map and Dreamkeeper traps arrive in Phase 2.";
  }

  return (
    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_20%,#173354_0%,#081225_45%,#050713_100%)] px-5">
      <section className="w-full max-w-xl rounded-3xl border border-cyan-200/25 bg-[#071126]/90 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <p className="text-xs font-bold tracking-[0.28em] text-cyan-300">ROVER CHALLENGE · LEVEL {level.id}</p>
        <h1 className="mt-4 text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-300">{message}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {!signedIn ? (
            <Link className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#071126]" href="/login">Log In</Link>
          ) : (
            <Link className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#071126]" href="/learning-missions/core/rover">Back to My Rover</Link>
          )}
          {level.prerequisiteLevel !== null && (
            <Link
              className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white"
              href={`/learning-missions/core/rover-challenge/${level.prerequisiteLevel}`}
            >
              Replay Level {level.prerequisiteLevel}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function CompletionOverlay({
  result,
  saveMessage,
  nextLevelUnlocked,
  onReplay,
}: {
  result: RoverCourseCompleteDetail;
  saveMessage: string;
  nextLevelUnlocked: boolean;
  onReplay: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[120] grid place-items-center bg-[#02040c]/80 px-5 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-3xl border border-emerald-200/30 bg-[#071126]/95 p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-10">
        <p className="text-xs font-black tracking-[0.28em] text-emerald-300">LEVEL {result.levelId} COMPLETE</p>
        <h2 className="mt-3 text-4xl font-black">{result.score.toLocaleString()} points</h2>
        <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-3 text-sm">
          <ResultStat label="Time" value={formatMilliseconds(result.completionTimeMs)} />
          <ResultStat label="Orbs" value={String(result.orbsCollected)} />
          <ResultStat label="Checkpoints" value={String(result.checkpointsReached)} />
        </div>
        <p className="mt-5 min-h-6 text-sm text-cyan-100/75">{saveMessage}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onReplay} className="rounded-xl border border-white/20 px-5 py-3 font-bold hover:bg-white/10">Replay</button>
          <Link href="/learning-missions/core/rover" className="rounded-xl border border-white/20 px-5 py-3 font-bold hover:bg-white/10">Back to My Rover</Link>
          {result.levelId < 3 && nextLevelUnlocked && (
            <Link
              href={`/learning-missions/core/rover-challenge/${result.levelId + 1}`}
              className="rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#071126] hover:bg-cyan-200"
            >
              Continue to Level {result.levelId + 1} →
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/60">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function formatMilliseconds(milliseconds: number) {
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}
