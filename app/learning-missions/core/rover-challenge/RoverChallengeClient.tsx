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

const COURSE_ID = "skyforge-test-track-01";

type RoverCourseCompleteDetail = {
  courseId: string;
  roverStage: number;
  score: number;
  completionTimeMs: number;
  orbsCollected: number;
  checkpointsReached: number;
  crashPenalty: number;
};

type PhaserGameProps = {
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
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#050713]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        <p className="text-sm font-medium tracking-[0.18em] text-white/60">
          PREPARING ROVER CHALLENGE
        </p>
      </div>
    </div>
  ),
});

export default function RoverChallengeClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUpgrade, setCurrentUpgrade] = useState<CoreRoverUpgrade>(
    coreUpgradeTrack[0],
  );
  const [roverProgressLoading, setRoverProgressLoading] = useState(true);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const submittedRunRef = useRef<string | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  const loadRoverProgress = useCallback(async (activeUserId: string | null) => {
    setRoverProgressLoading(true);

    if (!activeUserId) {
      setCurrentUpgrade(coreUpgradeTrack[0]);
      setRoverProgressLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("core_mission_attempts")
      .select("quiz_id, tokens_earned")
      .eq("user_id", activeUserId)
      .gt("tokens_earned", 0);

    if (error) {
      console.warn("Could not load rover progress:", error.message);
      setCurrentUpgrade(coreUpgradeTrack[0]);
      setRoverProgressLoading(false);
      return;
    }

    const completedQuizIds = new Set(
      (data ?? []).map((attempt) => attempt.quiz_id),
    );
    const progress = getCoreRoverProgress(completedQuizIds.size);

    setCurrentUpgrade(progress.currentUpgrade);
    setRoverProgressLoading(false);
  }, []);

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

      if (!userId) return;

      const { error } = await supabase.rpc("submit_rover_challenge_score", {
        p_course_id: COURSE_ID,
        p_score: result.score,
        p_completion_time_ms: result.completionTimeMs,
        p_orbs_collected: result.orbsCollected,
        p_checkpoints_reached: result.checkpointsReached,
        p_crash_penalty: result.crashPenalty,
      });

      if (error) {
        console.warn("Rover score save failed:", error.message);
      }
    },
    [userId],
  );

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      const activeUserId = user?.id ?? null;
      setUserId(activeUserId);
      await loadRoverProgress(activeUserId);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const activeUserId = session?.user.id ?? null;
      setUserId(activeUserId);
      void loadRoverProgress(activeUserId);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadRoverProgress]);

  useEffect(() => {
    const handleCourseComplete = (event: Event) => {
      const customEvent = event as CustomEvent<RoverCourseCompleteDetail>;
      void saveCompletedRun(customEvent.detail);
    };

    window.addEventListener("rover-course-complete", handleCourseComplete);
    return () => {
      window.removeEventListener("rover-course-complete", handleCourseComplete);
    };
  }, [saveCompletedRun]);

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
      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreenState,
      );
    };
  }, [refreshGameSize]);

  return (
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-[#050713] text-white">
      <div
        ref={gameAreaRef}
        className="relative h-full w-full overflow-hidden bg-[#050713]"
      >
        {roverProgressLoading ? (
          <div className="grid h-full w-full place-items-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
              <p className="text-sm font-medium tracking-[0.18em] text-white/60">
                LOADING ROVER STAGE
              </p>
            </div>
          </div>
        ) : (
          <PhaserGame
            roverStage={currentUpgrade.stage}
            roverName={currentUpgrade.name}
            gameStats={currentUpgrade.gameStats}
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

        <button
          type="button"
          onClick={toggleGameFullscreen}
          aria-label={
            isNativeFullscreen
              ? "Exit native fullscreen"
              : "Enter native fullscreen"
          }
          title={isNativeFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="absolute bottom-3 left-3 z-[90] grid h-11 w-11 place-items-center rounded-xl border border-cyan-200/35 bg-[#050816]/80 text-xl text-cyan-100 shadow-[0_0_22px_rgba(83,215,255,0.22)] backdrop-blur-md transition hover:border-cyan-100/60 hover:bg-[#0a1730]/90"
        >
          {isNativeFullscreen ? "↙" : "⛶"}
        </button>
      </div>
    </main>
  );
}
