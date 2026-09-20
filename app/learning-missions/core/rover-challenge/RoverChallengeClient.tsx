"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  coreUpgradeTrack,
  type CoreRoverGameStats,
  type CoreRoverUpgrade,
} from "@/lib/coreRoverProgress";
import {
  applyRoverPerformanceUpgrades,
  performanceLevelsFromRows,
  type RoverPerformanceBuildRow,
} from "@/lib/coreRoverPerformance";
import {
  getCoreRoverCombatStats,
  type CoreRoverCombatStats,
} from "@/lib/coreRoverCombat";
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

  // Phase 5G combat report.
  combatMode?: boolean;
  weaponLevel?: number;
  weaponName?: string | null;
  boneGuardsDefeated?: number;
  boneGuardsTotal?: number;
  barricadesDestroyed?: number;
  barricadesTotal?: number;
  shotsFired?: number;
  shotsHit?: number;
  accuracyPercent?: number;
  damageDealt?: number;
  damageReceived?: number;
  shieldDamageAbsorbed?: number;
  remainingHp?: number;
  maxHp?: number;
  remainingShield?: number;
  maxShield?: number;
  combatScore?: number;
  accuracyBonus?: number;
  survivalBonus?: number;
};

type SubmitLevelRow = {
  accepted: boolean;
  improved: boolean;
  best_score: number;
  best_time_ms: number;
  unlocked_next_level: boolean;
};

type PurchaseUnlockRow = {
  success: boolean;
  unlocked_level_id: number;
  course_id: string;
  gem_cost: number;
  new_balance: number;
  transaction_id: string;
};

type RoverLoadoutRow = {
  selected_stage: number;
  max_unlocked_stage: number;
  admin_access: boolean;
};

type PhaserGameProps = {
  levelConfig: RoverLevelConfig;
  roverStage: number;
  roverName: string;
  roverBodySrc: string;
  roverFrontWheelSrc: string | null;
  roverBackWheelSrc: string | null;
  roverGameMode: "wheeled" | "hover";
  weaponLevel: number;
  combatMode: boolean;
  combatStats: CoreRoverCombatStats;
  gameStats: CoreRoverGameStats;
};

const PhaserGame = dynamic<PhaserGameProps>(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => <LoadingScreen label="PREPARING ROVER EXPEDITION" />,
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
  const [currentGameStats, setCurrentGameStats] = useState<CoreRoverGameStats>(
    coreUpgradeTrack[0].gameStats,
  );
  const [currentWeaponLevel, setCurrentWeaponLevel] = useState(0);
  const [highestOwnedStage, setHighestOwnedStage] = useState(0);
  const [access, setAccess] = useState<RoverLevelAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [completion, setCompletion] =
    useState<RoverCourseCompleteDetail | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [nextLevelUnlocked, setNextLevelUnlocked] = useState(false);
  const [unlockingEarly, setUnlockingEarly] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState("");

  const submittedRunRef = useRef<string | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  /*
   * Only the newest player-state request is allowed to update React state.
   * This prevents an older Supabase request from finishing after a newer
   * auth refresh and replacing the current access/progression result.
   */
  const playerStateRequestIdRef = useRef(0);

  const loadPlayerState = useCallback(
    async ({
      showLoading = false,
    }: {
      showLoading?: boolean;
    } = {}) => {
      const requestId = ++playerStateRequestIdRef.current;

      /*
       * CRITICAL:
       *
       * The full-screen loading gate is only used before the Phaser game
       * has mounted for the first time.
       *
       * Token refreshes and other background auth events revalidate silently.
       * They must never replace <PhaserGame /> with <LoadingScreen />, because
       * doing so destroys the live Phaser.Game instance and restarts the run.
       */
      if (showLoading) {
        setLoading(true);
        setLoadError("");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (requestId !== playerStateRequestIdRef.current) {
        return;
      }

      if (userError) {
        console.warn(
          "Could not check the current Rover Expedition user:",
          userError.message,
        );

        /*
         * A temporary background auth/network error is not proof that the
         * learner has lost access. Keep an already-running game mounted.
         */
        if (showLoading) {
          setLoadError(
            "Rover Expedition access could not be checked. Please try again.",
          );
        }

        setLoading(false);
        return;
      }

      if (!user) {
        setUserId(null);
        setAccess(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [loadoutResult, accessResult, performanceResult] = await Promise.all([
        supabase.rpc("get_my_core_rover_loadout"),
        supabase.rpc("get_rover_level_access"),
        supabase.rpc("get_my_rover_performance_build"),
      ]);

      if (requestId !== playerStateRequestIdRef.current) {
        return;
      }

      if (loadoutResult.error) {
        console.warn(
          "Could not load equipped rover:",
          loadoutResult.error.message,
        );

        /*
         * Fail safely to the base rover if the new loadout migration has not
         * been installed yet. A silent/background refresh never needs to
         * restart the current Phaser run.
         */
        if (showLoading) {
          setCurrentUpgrade(coreUpgradeTrack[0]);
          setCurrentGameStats(coreUpgradeTrack[0].gameStats);
          setCurrentWeaponLevel(0);
          setHighestOwnedStage(0);
        }
      } else {
        const loadout = ((loadoutResult.data ?? []) as RoverLoadoutRow[])[0];

        const selectedStage = Number(loadout?.selected_stage ?? 0);
        const maxUnlockedStage = Number(
          loadout?.max_unlocked_stage ?? selectedStage,
        );

        const selectedUpgrade =
          coreUpgradeTrack.find(
            (upgrade) => upgrade.stage === selectedStage,
          ) ?? coreUpgradeTrack[0];

        setCurrentUpgrade(selectedUpgrade);
        setHighestOwnedStage(maxUnlockedStage);

        if (performanceResult.error) {
          console.warn(
            "Could not load equipped rover performance upgrades:",
            performanceResult.error.message,
          );
          setCurrentGameStats(selectedUpgrade.gameStats);
          setCurrentWeaponLevel(0);
        } else {
          const buildRows =
            (performanceResult.data ?? []) as RoverPerformanceBuildRow[];
          const performanceLevels = performanceLevelsFromRows(buildRows);
          const weaponLevel = Math.max(
            0,
            Math.min(
              5,
              Number(
                buildRows.find((row) => row.category === "weapon")
                  ?.current_level ?? 0,
              ),
            ),
          );

          setCurrentWeaponLevel(weaponLevel);
          setCurrentGameStats(
            applyRoverPerformanceUpgrades(
              selectedUpgrade.gameStats,
              performanceLevels,
            ),
          );
        }
      }

      if (accessResult.error) {
        console.warn(
          "Could not load rover level access:",
          accessResult.error.message,
        );

        /*
         * Initial entry remains fail-closed.
         *
         * Background revalidation is non-destructive: a temporary Supabase
         * error must not remove <PhaserGame /> from the React tree.
         */
        if (showLoading) {
          setAccess(null);
          setLoadError(
            "Level access could not be checked. Run the Rover Level Access System SQL in Supabase.",
          );
        }
      } else {
        const rows =
          (accessResult.data ??
            []) as RoverLevelAccess[];

        setAccess(
          rows.find(
            (row) =>
              Number(row.level_id) === levelId,
          ) ?? null,
        );

        setLoadError("");
      }

      setLoading(false);
    },
    [levelId],
  );

  const saveCompletedRun = useCallback(
    async (result: RoverCourseCompleteDetail) => {
      const runKey = [
        result.courseId,
        result.roverStage,
        result.score,
        result.completionTimeMs,
        result.orbsCollected,
        result.crashPenalty,
        result.boneGuardsDefeated ?? 0,
        result.shotsFired ?? 0,
        result.shotsHit ?? 0,
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
      const hasNextLevel = result.levelId < 6;
      const nextIsReady = Boolean(saved?.accepted && saved.unlocked_next_level);

      setNextLevelUnlocked(nextIsReady);

      setSaveMessage(
        saved?.improved
          ? `New personal best: ${saved.best_score.toLocaleString()} points.`
          : hasNextLevel
            ? nextIsReady
              ? `Level ${result.levelId} completion saved. Level ${result.levelId + 1} is ready.`
              : `Level ${result.levelId} completion saved. Level ${result.levelId + 1} now needs its required rover ownership or a Dream Gem early unlock.`
            : result.levelId === 6
              ? "Fractured Frontier saved. The frontier is secure; Boneguard Stronghold remains sealed for now."
              : result.levelId === 5
                ? "Boneguard Breach saved. Fractured Frontier is now available."
                : "Completion saved. You can replay this level at any time.",
      );

      window.dispatchEvent(new Event("rover-level-progress-updated"));
    },
    [userId],
  );

  const purchaseEarlyUnlock = useCallback(async () => {
    if (!access?.can_early_unlock || access.early_unlock_price <= 0) {
      return;
    }

    const price = access.early_unlock_price;
    const balance = access.dream_gem_balance;

    if (balance < price) {
      setUnlockMessage(
        `You need ${price - balance} more Dream Gems to unlock Level ${levelId}.`,
      );
      return;
    }

    const confirmed = window.confirm(
      [
        `Unlock Level ${levelId} — ${levelConfig.title} early?`,
        "",
        `Cost: ${price} Dream Gems`,
        `Balance: ${balance} → ${balance - price}`,
        "",
        "This permanently bypasses the normal rover ownership requirement for this level. Previous Rover Levels must still be completed in order.",
      ].join("\n"),
    );

    if (!confirmed) return;

    setUnlockingEarly(true);
    setUnlockMessage("");

    const { data, error } = await supabase.rpc(
      "purchase_rover_level_unlock",
      {
        p_level_id: levelId,
      },
    );

    setUnlockingEarly(false);

    if (error) {
      setUnlockMessage(error.message || "The level could not be unlocked.");
      return;
    }

    const result = ((data ?? []) as PurchaseUnlockRow[])[0];

    setUnlockMessage(
      result?.success
        ? `Level ${levelId} unlocked permanently for ${result.gem_cost} Dream Gems.`
        : "The level could not be unlocked.",
    );

    window.dispatchEvent(new Event("dream-gems-updated"));
    window.dispatchEvent(new Event("rover-level-progress-updated"));
    await loadPlayerState();
  }, [access, levelConfig.title, levelId, loadPlayerState]);

  useEffect(() => {
    /*
     * Initial route entry may show the access loading screen.
     */
    void loadPlayerState({
      showLoading: true,
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        /*
         * The initial route load above already resolves the current session.
         * Ignoring INITIAL_SESSION avoids an unnecessary duplicate request.
         */
        if (event === "INITIAL_SESSION") {
          return;
        }

        /*
         * A real sign-out should end access immediately.
         */
        if (event === "SIGNED_OUT") {
          playerStateRequestIdRef.current += 1;
          setUserId(null);
          setAccess(null);
          setLoading(false);
          return;
        }

        /*
         * TOKEN_REFRESHED, SIGNED_IN and USER_UPDATED can occur while the
         * player is halfway through a course. Revalidate silently outside
         * the Supabase auth callback so Phaser stays mounted.
         */
        window.setTimeout(() => {
          void loadPlayerState({
            showLoading: false,
          });
        }, 0);
      },
    );

    const handleLoadoutUpdate = () => {
      void loadPlayerState({
        showLoading: false,
      });
    };

    window.addEventListener(
      "rover-loadout-updated",
      handleLoadoutUpdate,
    );
    window.addEventListener(
      "rover-performance-updated",
      handleLoadoutUpdate,
    );

    return () => {
      playerStateRequestIdRef.current += 1;
      subscription.unsubscribe();
      window.removeEventListener(
        "rover-loadout-updated",
        handleLoadoutUpdate,
      );
      window.removeEventListener(
        "rover-performance-updated",
        handleLoadoutUpdate,
      );
    };
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


  const replay = () => {
    setCompletion(null);
    setSaveMessage("");
    setNextLevelUnlocked(false);
    setUnlockMessage("");
    submittedRunRef.current = null;
    window.dispatchEvent(new Event("rover-restart-requested"));
  };

  const combatWeaponRequired =
    levelId >= 5 &&
    Boolean(userId && access?.unlocked) &&
    currentWeaponLevel <= 0;

  const canPlay =
    Boolean(userId && access?.unlocked) &&
    levelConfig.status === "playable" &&
    !combatWeaponRequired;

  return (
    <main className="fixed inset-0 h-[100dvh] w-[100vw] max-w-none overflow-hidden bg-[#050713] text-white">
      <div
        ref={gameAreaRef}
        className="absolute inset-0 h-full w-full max-w-none overflow-hidden bg-[#050713]"
      >
        {loading ? (
          <LoadingScreen label="CHECKING LEVEL ACCESS" />
        ) : combatWeaponRequired ? (
          <CombatLoadoutGate
            roverName={currentUpgrade.name}
            levelId={levelId}
            title={levelConfig.title}
          />
        ) : canPlay ? (
          <PhaserGame
            levelConfig={levelConfig}
            roverStage={currentUpgrade.stage}
            roverName={currentUpgrade.name}
            roverBodySrc={currentUpgrade.gameBodySrc}
            roverFrontWheelSrc={currentUpgrade.gameFrontWheelSrc}
            roverBackWheelSrc={currentUpgrade.gameBackWheelSrc}
            roverGameMode={currentUpgrade.gameMode}
            weaponLevel={currentWeaponLevel}
            combatMode={Number(levelConfig.id) >= 5}
            combatStats={getCoreRoverCombatStats(currentUpgrade.stage)}
            gameStats={currentGameStats}
          />
        ) : (
          <LevelGate
            level={levelConfig}
            access={access}
            currentStage={highestOwnedStage}
            signedIn={Boolean(userId)}
            error={loadError}
            unlockingEarly={unlockingEarly}
            unlockMessage={unlockMessage}
            onUnlockEarly={() => void purchaseEarlyUnlock()}
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

function CombatLoadoutGate({
  roverName,
  levelId,
  title,
}: {
  roverName: string;
  levelId: RoverLevelId;
  title: string;
}) {
  return (
    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_24%,#29134b_0%,#0b1025_46%,#050713_100%)] px-5">
      <section className="w-full max-w-xl rounded-3xl border border-amber-200/25 bg-[#071126]/95 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        <p className="text-xs font-black tracking-[0.28em] text-amber-300">
          EXPEDITION {levelId} · COMBAT LOADOUT
        </p>

        <h1 className="mt-4 text-3xl font-black">
          Install a weapon before deployment
        </h1>

        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-300">
          {title} is a combat expedition and requires an installed weapon.
          Your active rover, <strong>{roverName}</strong>, currently has no
          weapon installed.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-200/15 bg-amber-300/[0.06] p-4 text-left text-sm text-amber-50/80">
          <strong className="text-amber-200">Minimum requirement</strong>
          <p className="mt-1">
            Install at least the Tier 1 Skyforge Machine Gun in My Rover →
            Custom Build → Weapons.
          </p>
        </div>

        <Link
          href="/learning-missions/core/rover"
          className="mt-7 inline-flex rounded-xl bg-gradient-to-r from-[#ffe08a] to-[#efa93e] px-6 py-3 font-black text-[#241704] shadow-[0_12px_30px_rgba(217,155,50,0.2)]"
        >
          Return to My Rover
        </Link>
      </section>
    </div>
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
  unlockingEarly,
  unlockMessage,
  onUnlockEarly,
}: {
  level: RoverLevelConfig;
  access: RoverLevelAccess | null;
  currentStage: number;
  signedIn: boolean;
  error: string;
  unlockingEarly: boolean;
  unlockMessage: string;
  onUnlockEarly: () => void;
}) {
  let title = `Level ${level.id} is locked`;
  let message = `Complete Level ${level.prerequisiteLevel} first to unlock this course.`;

  if (!signedIn) {
    title = "Log in to start a rover course";
    message = "Your course unlocks and personal bests are saved to your account.";
  } else if (error) {
    title = "Level access unavailable";
    message = error;
  } else if (access?.admin_access) {
    title = `${level.title} · Admin access`;
    message = "Admins can enter every Rover Level without rover ownership or prerequisite checks.";
  } else if (!access?.prerequisite_completed) {
    title = `Complete Level ${level.prerequisiteLevel} first`;
    message = "Dream Gems can bypass the rover ownership requirement, but they do not skip Rover Levels themselves.";
  } else if (access?.can_early_unlock) {
    title = `Rover ${level.minimumRoverStage + 1} normally required`;
    message = `Your highest owned rover is Rover ${currentStage + 1}. Purchase Rover ${level.minimumRoverStage + 1}, or permanently unlock this level early for ${access.early_unlock_price} Dream Gems.`;
  } else if (!access?.unlocked && !access?.stage_ready) {
    title = `Rover ${level.minimumRoverStage + 1} required`;
    message = `Your highest owned rover is Rover ${currentStage + 1}. Purchase Rover ${level.minimumRoverStage + 1} from My Rover to unlock this course normally.`;
  } else if (level.status === "phase-2") {
    title = `${level.title} unlocked`;
    message = "This Rover Level is unlocked but is not yet playable.";
  }

  const price = access?.early_unlock_price ?? 0;
  const balance = access?.dream_gem_balance ?? 0;
  const canAfford = balance >= price;

  return (
    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_20%,#173354_0%,#081225_45%,#050713_100%)] px-5">
      <section className="w-full max-w-xl rounded-3xl border border-cyan-200/25 bg-[#071126]/90 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <p className="text-xs font-bold tracking-[0.28em] text-cyan-300">
          ROVER EXPEDITION · LEVEL {level.id}
        </p>
        <h1 className="mt-4 text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-300">
          {message}
        </p>

        {access?.can_early_unlock && (
          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-fuchsia-200/20 bg-fuchsia-400/[0.06] p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-fuchsia-100">Early unlock</span>
              <span className="font-black text-fuchsia-200">◆ {price} DG</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/55">
              <span>Your Dream Gems</span>
              <span>◆ {balance} DG</span>
            </div>
            {canAfford ? (
              <p className="mt-3 text-xs leading-5 text-white/50">
                Permanent for this account. No Dream Gem payment is needed again for this level.
              </p>
            ) : (
              <p className="mt-3 text-xs font-bold text-amber-200">
                You need {price - balance} more Dream Gems.
              </p>
            )}
          </div>
        )}

        {unlockMessage && (
          <p className="mx-auto mt-4 max-w-md rounded-xl border border-fuchsia-200/15 bg-fuchsia-400/[0.06] px-4 py-3 text-sm text-fuchsia-100">
            {unlockMessage}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {!signedIn ? (
            <Link
              className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#071126]"
              href="/login"
            >
              Log In
            </Link>
          ) : (
            <Link
              className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/10"
              href="/learning-missions/core/rover"
            >
              Back to My Rover
            </Link>
          )}

          {access?.can_early_unlock && (
            <button
              type="button"
              disabled={!canAfford || unlockingEarly}
              onClick={onUnlockEarly}
              className="rounded-xl bg-fuchsia-300 px-5 py-3 font-black text-[#16051f] transition hover:bg-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {unlockingEarly ? "Unlocking..." : `Unlock for ${price} DG`}
            </button>
          )}

          {level.prerequisiteLevel !== null && (
            <Link
              className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/10"
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
  const isCombatResult =
    result.levelId >= 5 || Boolean(result.combatMode);

  const combatBonus =
    (result.combatScore ?? 0) +
    (result.accuracyBonus ?? 0) +
    (result.survivalBonus ?? 0);

  const accuracy = result.accuracyPercent ?? 0;
  const totalGuards =
    result.boneGuardsTotal ??
    (result.levelId === 6 ? 9 : 7);
  const totalBarricades =
    result.barricadesTotal ?? 0;
  const barricadesDestroyed =
    result.barricadesDestroyed ?? 0;
  const hpRatio =
    (result.maxHp ?? 0) > 0
      ? (result.remainingHp ?? 0) / (result.maxHp ?? 1)
      : 0;
  const shieldRatio =
    (result.maxShield ?? 0) > 0
      ? (result.remainingShield ?? 0) /
        (result.maxShield ?? 1)
      : 0;

  const achievements = isCombatResult
    ? [
        (result.boneGuardsDefeated ?? 0) >= totalGuards &&
        totalGuards > 0
          ? `ALL ${totalGuards} BONE GUARDS DEFEATED`
          : null,
        result.levelId === 6 &&
        totalBarricades > 0 &&
        barricadesDestroyed >= totalBarricades
          ? "ALL COVER DESTROYED"
          : null,
        hpRatio >= 0.999 ? "FLAWLESS HULL" : null,
        shieldRatio >= 0.75 ? "SHIELD MASTER" : null,
        accuracy >= 70 ? "SHARPSHOOTER" : null,
        combatBonus >= 2500 ? "ELITE COMBAT BONUS" : null,
      ].filter(Boolean) as string[]
    : [];

  return (
    <div className="absolute inset-0 z-[120] overflow-y-auto bg-[radial-gradient(circle_at_50%_15%,rgba(100,55,190,0.32),rgba(3,5,15,0.96)_44%,#02030a_100%)] px-3 py-4 backdrop-blur-md sm:px-5">
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
        <section
          className={
            isCombatResult
              ? "relative w-full overflow-hidden rounded-[28px] border border-violet-300/35 bg-[#071126]/95 p-5 text-center shadow-[0_0_90px_rgba(113,65,210,0.28),0_35px_100px_rgba(0,0,0,0.7)] sm:p-7"
              : "w-full max-w-2xl rounded-3xl border border-emerald-200/30 bg-[#071126]/95 p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-10"
          }
        >
          {isCombatResult && (
            <>
              <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black tracking-[0.24em] text-amber-200 sm:text-xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300 shadow-[0_0_14px_rgba(253,211,77,0.9)]" />
                EXPEDITION {result.levelId} COMPLETE
              </div>

              <p className="relative mt-4 text-xs font-black tracking-[0.34em] text-violet-300 sm:text-sm">
                {result.levelId === 6
                  ? "FRONTIER SECURED"
                  : "BONE GATE SECURED"}
              </p>

              <div className="relative mt-2">
                <p className="bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-5xl font-black leading-none text-transparent drop-shadow-[0_0_22px_rgba(255,221,130,0.24)] sm:text-6xl">
                  {result.score.toLocaleString()}
                </p>
                <p className="mt-1 text-sm font-black tracking-[0.22em] text-white/55">
                  TOTAL POINTS
                </p>
              </div>

              <div className="relative mx-auto mt-5 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
                {result.levelId === 6 ? (
                  <>
                    <VictoryStat
                      label="Barricades"
                      value={`${barricadesDestroyed}/${totalBarricades}`}
                      note="Cover Destroyed"
                      tone="gold"
                    />
                    <VictoryStat
                      label="Bone Guards"
                      value={`${result.boneGuardsDefeated ?? 0}/${totalGuards}`}
                      note="Frontier Cleared"
                      tone="violet"
                    />
                  </>
                ) : (
                  <>
                    <VictoryStat
                      label="Bone Guards"
                      value={`${result.boneGuardsDefeated ?? 0}/${totalGuards}`}
                      note="Sector Cleared"
                      tone="gold"
                    />
                    <VictoryStat
                      label="Combat Bonus"
                      value={`+${combatBonus.toLocaleString()}`}
                      note="Performance"
                      tone="violet"
                    />
                  </>
                )}
                <VictoryStat
                  label="Accuracy"
                  value={`${accuracy.toFixed(1)}%`}
                  note={`${result.shotsHit ?? 0}/${result.shotsFired ?? 0} hits`}
                  tone="cyan"
                />
                <VictoryStat
                  label="Time"
                  value={formatMilliseconds(result.completionTimeMs)}
                  note="Clear Time"
                  tone="green"
                />
              </div>

              {achievements.length > 0 && (
                <div className="relative mx-auto mt-4 flex max-w-4xl flex-wrap justify-center gap-2">
                  {achievements.map((achievement) => (
                    <span
                      key={achievement}
                      className="rounded-full border border-amber-200/25 bg-gradient-to-r from-amber-300/10 to-violet-400/10 px-3 py-1.5 text-[9px] font-black tracking-[0.1em] text-amber-100 sm:text-[10px]"
                    >
                      ✦ {achievement}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative mx-auto mt-5 grid max-w-4xl grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <ResultStat
                  label="Damage Dealt"
                  value={(result.damageDealt ?? 0).toLocaleString()}
                  accent="text-rose-200"
                />
                <ResultStat
                  label="Damage Taken"
                  value={(result.damageReceived ?? 0).toLocaleString()}
                  accent="text-orange-200"
                />
                <ResultStat
                  label="HP Remaining"
                  value={`${result.remainingHp ?? 0}/${result.maxHp ?? 0}`}
                  accent="text-emerald-200"
                />
                <ResultStat
                  label="Shield Remaining"
                  value={`${result.remainingShield ?? 0}/${result.maxShield ?? 0}`}
                  accent="text-cyan-200"
                />
              </div>

              <div className="relative mx-auto mt-2 grid max-w-4xl grid-cols-2 gap-2 text-sm">
                <ResultStat
                  label="Shield Absorbed"
                  value={(result.shieldDamageAbsorbed ?? 0).toLocaleString()}
                  accent="text-sky-200"
                />
                <ResultStat
                  label={
                    result.levelId === 6
                      ? "Combat Bonus"
                      : "Weapon"
                  }
                  value={
                    result.levelId === 6
                      ? `+${combatBonus.toLocaleString()}`
                      : result.weaponName ?? "Unknown"
                  }
                  accent="text-violet-200"
                />
              </div>

              <div className="relative mx-auto mt-5 max-w-3xl">
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3">
                  <p className="text-sm font-black text-emerald-200">
                    {saveMessage || "Expedition result saved."}
                  </p>
                </div>

                <div className="mt-2 rounded-2xl border border-violet-300/20 bg-violet-400/[0.07] px-4 py-3 text-sm text-violet-100/75">
                  <strong className="text-violet-200">
                    NEXT SECTOR DETECTED
                  </strong>
                  <span className="mx-2 text-violet-400/50">·</span>
                  {result.levelId === 6
                    ? "The Fractured Frontier is secure. Boneguard Stronghold has been located, but Expedition 7 remains sealed for now."
                    : "Stage 2 progression updated. Fractured Frontier is now available as Expedition 6."}
                </div>
              </div>

              <div className="relative mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/learning-missions/core/rover"
                  className="min-w-[210px] rounded-xl border border-amber-100/30 bg-gradient-to-r from-[#ffe08a] via-[#ffc85d] to-[#efa93e] px-6 py-3.5 font-black text-[#261804] shadow-[0_12px_34px_rgba(239,169,62,0.25)] transition hover:brightness-110"
                >
                  Return to Expeditions ›
                </Link>

                <button
                  type="button"
                  onClick={onReplay}
                  className="rounded-xl border border-violet-200/25 bg-violet-300/[0.07] px-6 py-3.5 font-bold text-violet-100 transition hover:bg-violet-300/[0.14]"
                >
                  Replay Expedition
                </button>
              </div>
            </>
          )}

          {!isCombatResult && (
            <>
              <p className="text-xs font-black tracking-[0.28em] text-emerald-300">
                LEVEL {result.levelId} COMPLETE
              </p>

              <h2 className="mt-3 text-4xl font-black">
                {result.score.toLocaleString()} points
              </h2>

              <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-3 text-sm">
                <ResultStat
                  label="Time"
                  value={formatMilliseconds(result.completionTimeMs)}
                />
                <ResultStat
                  label="Orbs"
                  value={String(result.orbsCollected)}
                />
                <ResultStat
                  label="Checkpoints"
                  value={String(result.checkpointsReached)}
                />
              </div>

              <p className="mt-5 min-h-6 text-sm text-cyan-100/75">
                {saveMessage}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={onReplay}
                  className="rounded-xl border border-white/20 px-5 py-3 font-bold hover:bg-white/10"
                >
                  Replay
                </button>

                <Link
                  href="/learning-missions/core/rover"
                  className="rounded-xl border border-white/20 px-5 py-3 font-bold hover:bg-white/10"
                >
                  Back to My Rover
                </Link>

                {result.levelId < 5 && (
                  <Link
                    href={`/learning-missions/core/rover-challenge/${result.levelId + 1}`}
                    className={
                      nextLevelUnlocked
                        ? "rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#071126] hover:bg-cyan-200"
                        : "rounded-xl bg-fuchsia-300 px-5 py-3 font-black text-[#16051f] hover:bg-fuchsia-200"
                    }
                  >
                    {nextLevelUnlocked
                      ? `Continue to Level ${result.levelId + 1} →`
                      : `View Level ${result.levelId + 1} Unlock →`}
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function VictoryStat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "gold" | "violet" | "cyan" | "green";
}) {
  const toneClass = {
    gold: "border-amber-300/25 from-amber-300/15 to-amber-300/[0.03] text-amber-200",
    violet:
      "border-violet-300/25 from-violet-400/15 to-violet-400/[0.03] text-violet-200",
    cyan: "border-cyan-300/25 from-cyan-300/15 to-cyan-300/[0.03] text-cyan-200",
    green:
      "border-emerald-300/25 from-emerald-300/15 to-emerald-300/[0.03] text-emerald-200",
  }[tone];

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${toneClass}`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] opacity-55">
        {note}
      </p>
    </div>
  );
}

function ResultStat({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-100/45">
        {label}
      </p>
      <p className={`mt-1 font-black ${accent}`}>
        {value}
      </p>
    </div>
  );
}

function formatMilliseconds(milliseconds: number) {
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}
