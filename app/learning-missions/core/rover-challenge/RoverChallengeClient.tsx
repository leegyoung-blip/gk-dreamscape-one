"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

const COURSE_ID =
  "skyforge-test-track-01";

type RoverCourseCompleteDetail = {
  courseId: string;
  score: number;
  completionTimeMs: number;
  orbsCollected: number;
  checkpointsReached: number;
  crashPenalty: number;
};

type LeaderboardRow = {
  rank: number | string;
  user_id: string;
  username: string;
  best_score: number;
  best_time_ms: number;
  orbs_collected: number;
  completed_at: string;
};

type SubmitScoreRow = {
  saved: boolean;
  improved: boolean;
  best_score: number;
  best_time_ms: number;
};

const PhaserGame = dynamic(
  () => import("./PhaserGame"),
  {
    ssr: false,

    loading: () => (
      <div className="flex min-h-[500px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />

          <p className="text-sm font-medium tracking-[0.18em] text-white/60">
            PREPARING ROVER CHALLENGE
          </p>
        </div>
      </div>
    ),
  },
);

export default function RoverChallengeClient() {
  const [userId, setUserId] =
    useState<string | null>(null);

  const [
    leaderboardRows,
    setLeaderboardRows,
  ] = useState<LeaderboardRow[]>([]);

  const [
    leaderboardLoading,
    setLeaderboardLoading,
  ] = useState(true);

  const [
    leaderboardMessage,
    setLeaderboardMessage,
  ] = useState("");

  const [
    scoreSaveMessage,
    setScoreSaveMessage,
  ] = useState("");

  const submittedRunRef =
    useRef<string | null>(null);

  const loadLeaderboard =
    useCallback(async () => {
      setLeaderboardLoading(true);
      setLeaderboardMessage("");

      const { data, error } =
        await supabase.rpc(
          "get_rover_challenge_leaderboard",
          {
            p_course_id: COURSE_ID,
            p_limit: 10,
          },
        );

      if (error) {
        console.warn(
          "Rover leaderboard load failed:",
          error.message,
        );

        setLeaderboardRows([]);
        setLeaderboardMessage(
          "Could not load the leaderboard. Run the rover leaderboard SQL in Supabase first.",
        );

        setLeaderboardLoading(false);
        return;
      }

      const rows =
        (data ?? []) as LeaderboardRow[];

      setLeaderboardRows(rows);

      if (rows.length === 0) {
        setLeaderboardMessage(
          "No completed runs yet. Be the first player on the leaderboard.",
        );
      }

      setLeaderboardLoading(false);
    }, []);

  const saveCompletedRun =
    useCallback(
      async (
        result:
          RoverCourseCompleteDetail,
      ) => {
        const runKey = [
          result.courseId,
          result.score,
          result.completionTimeMs,
          result.orbsCollected,
          result.crashPenalty,
        ].join(":");

        if (
          submittedRunRef.current ===
          runKey
        ) {
          return;
        }

        submittedRunRef.current =
          runKey;

        if (!userId) {
          setScoreSaveMessage(
            "Course complete. Log in before playing to save your score to the leaderboard.",
          );
          return;
        }

        setScoreSaveMessage(
          "Saving your completed run...",
        );

        const { data, error } =
          await supabase.rpc(
            "submit_rover_challenge_score",
            {
              p_course_id:
                result.courseId,
              p_score: result.score,
              p_completion_time_ms:
                result.completionTimeMs,
              p_orbs_collected:
                result.orbsCollected,
              p_checkpoints_reached:
                result.checkpointsReached,
              p_crash_penalty:
                result.crashPenalty,
            },
          );

        if (error) {
          console.warn(
            "Rover score save failed:",
            error.message,
          );

          setScoreSaveMessage(
            "The run was completed, but the score could not be saved. Check the Supabase leaderboard SQL and policies.",
          );
          return;
        }

        const resultRow = (
          (data ?? []) as SubmitScoreRow[]
        )[0];

        if (resultRow?.improved) {
          setScoreSaveMessage(
            `New personal best saved: ${resultRow.best_score.toLocaleString()} points.`,
          );
        } else {
          setScoreSaveMessage(
            `Run saved. Your best remains ${(
              resultRow?.best_score ??
              result.score
            ).toLocaleString()} points.`,
          );
        }

        await loadLeaderboard();
      },
      [loadLeaderboard, userId],
    );

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!active) {
        return;
      }

      setUserId(user?.id ?? null);
    }

    void loadUser();
    void loadLeaderboard();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!active) {
            return;
          }

          setUserId(
            session?.user.id ?? null,
          );
        },
      );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadLeaderboard]);

  useEffect(() => {
    const handleCourseComplete = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<RoverCourseCompleteDetail>;

      void saveCompletedRun(
        customEvent.detail,
      );
    };

    window.addEventListener(
      "rover-course-complete",
      handleCourseComplete,
    );

    return () => {
      window.removeEventListener(
        "rover-course-complete",
        handleCourseComplete,
      );
    };
  }, [saveCompletedRun]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050713] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 10%, rgba(85, 73, 255, 0.18), transparent 35%), radial-gradient(circle at 85% 70%, rgba(0, 213, 255, 0.1), transparent 30%)",
        }}
      />

      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/learning-missions"
          className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/75 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          ← Learning Missions
        </Link>

        <div className="hidden text-right sm:block">
          <p className="text-xs tracking-[0.24em] text-cyan-300/70">
            CORE MISSIONS
          </p>

          <p className="mt-1 text-sm font-semibold text-white/90">
            Skyforge Rover Programme
          </p>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-4 pb-8 sm:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-cyan-300">
              TEST COURSE 01
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Rover Challenge
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              Drive, jump and boost through
              the Skyforge calibration
              course. Reach the finish gate
              and collect as many energy
              orbs as possible.
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2 sm:mt-0">
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              SYSTEM ONLINE
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/55">
              Test Build
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/30 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

          <PhaserGame />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <InfoCard
            label="Course"
            value="Skyforge Test Track"
          />

          <InfoCard
            label="Rover"
            value="Detailed Rover Prototype"
          />

          <InfoCard
            label="Current Objective"
            value="Reach the Finish Gate"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-300/70">
            CONTROLS
          </p>

          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
            <span>
              <strong className="text-white">
                A / D or ← / →
              </strong>{" "}
              Drive
            </span>

            <span>
              <strong className="text-white">
                W or ↑
              </strong>{" "}
              Jump
            </span>

            <span>
              <strong className="text-white">
                Space
              </strong>{" "}
              Boost
            </span>

            <span>
              <strong className="text-white">
                R
              </strong>{" "}
              Restart
            </span>
          </div>
        </div>

        <section className="mt-4 overflow-hidden rounded-[24px] border border-cyan-200/15 bg-[#070b19]/85 backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-[10px] font-bold tracking-[0.24em] text-cyan-300/70">
                COMPLETED RUNS
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Rover Leaderboard
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/50">
                Ranked by highest score.
                Completion time breaks tied
                scores.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadLeaderboard();
              }}
              disabled={
                leaderboardLoading
              }
              className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {leaderboardLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {scoreSaveMessage && (
            <div className="border-b border-white/10 bg-cyan-300/[0.06] px-5 py-3 text-sm text-cyan-100 sm:px-7">
              {scoreSaveMessage}
            </div>
          )}

          <div className="p-4 sm:p-6">
            {leaderboardLoading ? (
              <div className="grid min-h-40 place-items-center rounded-2xl border border-white/8 bg-white/[0.035] text-sm text-white/55">
                Loading leaderboard...
              </div>
            ) : leaderboardRows.length ===
              0 ? (
              <div className="grid min-h-40 place-items-center rounded-2xl border border-white/8 bg-white/[0.035] px-6 text-center text-sm leading-6 text-white/55">
                {leaderboardMessage ||
                  "No completed runs yet."}
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="hidden grid-cols-[70px_minmax(0,1fr)_130px_130px_100px] gap-3 px-4 pb-2 text-[10px] font-bold tracking-[0.16em] text-white/35 sm:grid">
                  <span>RANK</span>
                  <span>PLAYER</span>
                  <span>SCORE</span>
                  <span>TIME</span>
                  <span>ORBS</span>
                </div>

                {leaderboardRows.map(
                  (row) => {
                    const isCurrentUser =
                      Boolean(
                        userId &&
                          row.user_id ===
                            userId,
                      );

                    return (
                      <div
                        key={row.user_id}
                        className={`grid gap-2 rounded-2xl border px-4 py-4 sm:grid-cols-[70px_minmax(0,1fr)_130px_130px_100px] sm:items-center sm:gap-3 ${
                          isCurrentUser
                            ? "border-cyan-200/30 bg-cyan-300/10"
                            : "border-white/8 bg-white/[0.035]"
                        }`}
                      >
                        <span className="text-lg font-black text-cyan-200">
                          #{row.rank}
                        </span>

                        <div>
                          <p className="font-semibold text-white">
                            {row.username ||
                              "Player"}
                          </p>

                          {isCurrentUser && (
                            <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-cyan-300/70">
                              YOUR BEST
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] font-bold tracking-[0.14em] text-white/35 sm:hidden">
                            SCORE
                          </p>

                          <p className="font-bold text-white">
                            {row.best_score.toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold tracking-[0.14em] text-white/35 sm:hidden">
                            TIME
                          </p>

                          <p className="text-white/75">
                            {formatMilliseconds(
                              row.best_time_ms,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold tracking-[0.14em] text-white/35 sm:hidden">
                            ORBS
                          </p>

                          <p className="text-white/75">
                            {row.orbs_collected}/8
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            {!userId && (
              <p className="mt-4 text-center text-xs leading-5 text-white/40">
                You can view the
                leaderboard without logging
                in, but only logged-in users
                can save completed runs.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
      <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35">
        {label.toUpperCase()}
      </p>

      <p className="mt-1 text-sm font-medium text-white/80">
        {value}
      </p>
    </div>
  );
}

function formatMilliseconds(
  milliseconds: number,
) {
  const totalSeconds =
    Math.max(0, milliseconds) /
    1000;

  const minutes = Math.floor(
    totalSeconds / 60,
  );

  const seconds =
    totalSeconds % 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${seconds
    .toFixed(1)
    .padStart(4, "0")}`;
}
