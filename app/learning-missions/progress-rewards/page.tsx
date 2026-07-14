"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type Upgrade = {
  missionsRequired: number;
  name: string;
  description: string;
};

type CoreAttempt = {
  id?: string;
  quiz_id: string;
  score: number;
  correct_count: number;
  total_questions: number;
  tokens_earned: number;
  created_at?: string;
};

type ThinkAttempt = {
  id?: string;
  quiz_id: string;
  mode: string;
  score: number;
  correct_count: number;
  total_questions: number;
  tokens_earned: number;
  created_at?: string;
};

type ExpressAttempt = {
  id?: string;
  mission_id: string;
  mode: string;
  completed_tasks: number;
  total_tasks: number;
  tokens_earned: number;
  created_at?: string;
};

type KnowledgeAttempt = {
  id?: string;
  topic?: string;
  mode?: string;
  score?: number;
  correct_count?: number;
  total_questions?: number;
  tokens_earned?: number;
  created_at?: string;
};

const coreUpgradeTrack: Upgrade[] = [
  {
    missionsRequired: 0,
    name: "Basic Rover Frame",
    description: "Nova has the starting frame of her Skyforge Rover.",
  },
  {
    missionsRequired: 1,
    name: "Energy Engine",
    description: "The rover can now power up and move through Dreamscape.",
  },
  {
    missionsRequired: 3,
    name: "Navigation Console",
    description: "Nova can now find safer paths through mission zones.",
  },
  {
    missionsRequired: 5,
    name: "Turbo Wheels",
    description: "The rover moves faster across learning routes.",
  },
  {
    missionsRequired: 8,
    name: "Shield Plating",
    description: "The rover is protected during harder missions.",
  },
  {
    missionsRequired: 12,
    name: "Hover Boosters",
    description: "Nova can now cross broken paths and floating platforms.",
  },
  {
    missionsRequired: 16,
    name: "Sky Wings",
    description: "The rover begins transforming into a flying vehicle.",
  },
  {
    missionsRequired: 20,
    name: "Skyforge Rover Complete",
    description: "Nova’s vehicle is fully upgraded for major expeditions.",
  },
];

const thinkInventoryTrack: Upgrade[] = [
  {
    missionsRequired: 0,
    name: "Empty Gear Wall",
    description:
      "Nova’s inventory station is ready, but her mission tools are still locked.",
  },
  {
    missionsRequired: 1,
    name: "Logic Lens",
    description:
      "Nova can scan hidden clues and identify important patterns in Dreamscape.",
  },
  {
    missionsRequired: 3,
    name: "Pattern Scanner",
    description:
      "Nova can detect repeating sequences, visual rules and puzzle structures.",
  },
  {
    missionsRequired: 5,
    name: "Clue Compass",
    description:
      "Nova can track missing information and find the next step in harder missions.",
  },
  {
    missionsRequired: 8,
    name: "Puzzle Shield",
    description:
      "Nova gains protection against confusing traps, false clues and tricky choices.",
  },
  {
    missionsRequired: 12,
    name: "Energy Wrench",
    description:
      "Nova can repair broken logic gates and restore puzzle systems across Dreamscape.",
  },
  {
    missionsRequired: 16,
    name: "Spark Staff",
    description:
      "Nova unlocks an advanced reasoning tool that powers complex mission routes.",
  },
  {
    missionsRequired: 20,
    name: "Advanced Gear Inventory",
    description:
      "Nova’s full Think Mission inventory is ready for major Dreamscape expeditions.",
  },
];

const expressStoryTrack: Upgrade[] = [
  {
    missionsRequired: 0,
    name: "Blank Story Log",
    description: "Nova’s story archive is ready, but the pages are still empty.",
  },
  {
    missionsRequired: 1,
    name: "Word Beacon",
    description:
      "Nova can send simple word signals across Dreamscape pathways.",
  },
  {
    missionsRequired: 3,
    name: "Sentence Spark",
    description:
      "Nova can form clearer sentences that activate hidden story doors.",
  },
  {
    missionsRequired: 5,
    name: "Description Lens",
    description:
      "Nova can make scenes clearer with stronger details and vivid descriptions.",
  },
  {
    missionsRequired: 8,
    name: "Emotion Crystal",
    description:
      "Nova can capture feelings, reactions and inner thoughts more powerfully.",
  },
  {
    missionsRequired: 12,
    name: "Story Map",
    description:
      "Nova can connect openings, problems, climaxes and endings into stronger stories.",
  },
  {
    missionsRequired: 16,
    name: "Memory Archive",
    description:
      "Nova can store important moments, character actions and story discoveries.",
  },
  {
    missionsRequired: 20,
    name: "Dreamscribe System",
    description:
      "Nova’s full writing system is complete and ready to unlock advanced story pathways.",
  },
];

function getCurrentUpgrade(track: Upgrade[], completedCount: number) {
  let current = track[0];

  for (const upgrade of track) {
    if (completedCount >= upgrade.missionsRequired) {
      current = upgrade;
    }
  }

  return current;
}

function getNextUpgrade(track: Upgrade[], completedCount: number) {
  return track.find((upgrade) => completedCount < upgrade.missionsRequired);
}

function countUniqueRewarded<T extends { tokens_earned?: number }>(
  attempts: T[],
  idGetter: (attempt: T) => string
) {
  const ids = new Set<string>();

  for (const attempt of attempts) {
    if ((attempt.tokens_earned ?? 0) > 0) {
      ids.add(idGetter(attempt));
    }
  }

  return ids.size;
}

function getBestScore<T>(
  attempts: T[],
  scoreGetter: (attempt: T) => number | null | undefined
) {
  if (attempts.length === 0) return 0;

  return attempts.reduce((best, attempt) => {
    const score = scoreGetter(attempt) ?? 0;
    return Math.max(best, score);
  }, 0);
}

function formatDate(value?: string) {
  if (!value) return "Saved attempt";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Saved attempt";

  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProgressRewardsPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = !isDesktop;

  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);

  const [coreAttempts, setCoreAttempts] = useState<CoreAttempt[]>([]);
  const [thinkAttempts, setThinkAttempts] = useState<ThinkAttempt[]>([]);
  const [expressAttempts, setExpressAttempts] = useState<ExpressAttempt[]>([]);
  const [knowledgeAttempts, setKnowledgeAttempts] = useState<KnowledgeAttempt[]>(
    []
  );

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProgress() {
      setIsLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserEmail(null);
        setIsLoading(false);
        setMessage("Please log in to view your mission progress.");
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: tokenData, error: tokenError } = await supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual");

      if (tokenError) {
        console.warn("Could not load token balance:", tokenError);
        setTokenBalance(0);
      } else {
        const total =
          tokenData?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;

        setTokenBalance(total);
      }

      const { data: coreData, error: coreError } = await supabase
        .from("core_mission_attempts")
        .select(
          "id, quiz_id, score, correct_count, total_questions, tokens_earned, created_at"
        )
        .eq("user_id", user.id);

      if (coreError) {
        console.warn("Could not load Core attempts:", coreError);
        setCoreAttempts([]);
      } else {
        setCoreAttempts((coreData || []) as CoreAttempt[]);
      }

      const { data: thinkData, error: thinkError } = await supabase
        .from("think_mission_attempts")
        .select(
          "id, quiz_id, mode, score, correct_count, total_questions, tokens_earned, created_at"
        )
        .eq("user_id", user.id);

      if (thinkError) {
        console.warn("Could not load Think attempts:", thinkError);
        setThinkAttempts([]);
      } else {
        setThinkAttempts((thinkData || []) as ThinkAttempt[]);
      }

      const { data: expressData, error: expressError } = await supabase
        .from("express_mission_attempts")
        .select(
          "id, mission_id, mode, completed_tasks, total_tasks, tokens_earned, created_at"
        )
        .eq("user_id", user.id);

      if (expressError) {
        console.warn("Could not load Express attempts:", expressError);
        setExpressAttempts([]);
      } else {
        setExpressAttempts((expressData || []) as ExpressAttempt[]);
      }

      const { data: knowledgeData, error: knowledgeError } = await supabase
        .from("knowledge_arena_attempts")
        .select(
          "id, topic, mode, score, correct_count, total_questions, tokens_earned, created_at"
        )
        .eq("user_id", user.id);

      if (knowledgeError) {
        console.warn(
          "Could not load Knowledge Arena attempts. Check table name if needed:",
          knowledgeError
        );
        setKnowledgeAttempts([]);
      } else {
        setKnowledgeAttempts((knowledgeData || []) as KnowledgeAttempt[]);
      }

      setIsLoading(false);
    }

    loadProgress();
  }, []);

  const coreCompleted = useMemo(
    () => countUniqueRewarded(coreAttempts, (attempt) => attempt.quiz_id),
    [coreAttempts]
  );

  const thinkCompleted = useMemo(
    () => countUniqueRewarded(thinkAttempts, (attempt) => attempt.quiz_id),
    [thinkAttempts]
  );

  const expressCompleted = useMemo(
    () =>
      countUniqueRewarded(expressAttempts, (attempt) => attempt.mission_id),
    [expressAttempts]
  );

  const knowledgeCompleted = useMemo(
    () =>
      knowledgeAttempts.filter((attempt) => (attempt.tokens_earned ?? 0) > 0)
        .length,
    [knowledgeAttempts]
  );

  const totalAttempts =
    coreAttempts.length +
    thinkAttempts.length +
    expressAttempts.length +
    knowledgeAttempts.length;

  const totalCountedMissions =
    coreCompleted + thinkCompleted + expressCompleted + knowledgeCompleted;

  const coreCurrent = getCurrentUpgrade(coreUpgradeTrack, coreCompleted);
  const coreNext = getNextUpgrade(coreUpgradeTrack, coreCompleted);

  const thinkCurrent = getCurrentUpgrade(thinkInventoryTrack, thinkCompleted);
  const thinkNext = getNextUpgrade(thinkInventoryTrack, thinkCompleted);

  const expressCurrent = getCurrentUpgrade(
    expressStoryTrack,
    expressCompleted
  );
  const expressNext = getNextUpgrade(expressStoryTrack, expressCompleted);

  const bestCoreScore = getBestScore(coreAttempts, (attempt) => attempt.score);
  const bestThinkScore = getBestScore(thinkAttempts, (attempt) => attempt.score);
  const bestKnowledgeScore = getBestScore(
    knowledgeAttempts,
    (attempt) => attempt.score
  );

  const recentRecords = useMemo(() => {
    const records = [
      ...coreAttempts.map((attempt) => ({
        id: `core-${attempt.id ?? attempt.quiz_id}-${attempt.created_at ?? ""}`,
        type: "Core",
        title: "Core Mission Quiz",
        detail: `${attempt.correct_count}/${attempt.total_questions} correct · Score ${attempt.score}/100`,
        tokens: attempt.tokens_earned,
        date: attempt.created_at,
      })),
      ...thinkAttempts.map((attempt) => ({
        id: `think-${attempt.id ?? attempt.quiz_id}-${attempt.created_at ?? ""}`,
        type: "Think",
        title: `Think Mission · ${attempt.mode || "normal"}`,
        detail: `${attempt.correct_count}/${attempt.total_questions} correct · Score ${attempt.score}/100`,
        tokens: attempt.tokens_earned,
        date: attempt.created_at,
      })),
      ...expressAttempts.map((attempt) => ({
        id: `express-${attempt.id ?? attempt.mission_id}-${
          attempt.created_at ?? ""
        }`,
        type: "Express",
        title: `Express Mission · ${attempt.mode || "practice"}`,
        detail: `${attempt.completed_tasks}/${attempt.total_tasks} writing tasks completed`,
        tokens: attempt.tokens_earned,
        date: attempt.created_at,
      })),
      ...knowledgeAttempts.map((attempt) => ({
        id: `knowledge-${attempt.id ?? attempt.topic ?? "arena"}-${
          attempt.created_at ?? ""
        }`,
        type: "Arena",
        title: attempt.topic
          ? `Knowledge Arena · ${attempt.topic}`
          : "Knowledge Arena",
        detail:
          typeof attempt.score === "number"
            ? `${attempt.correct_count ?? 0}/${
                attempt.total_questions ?? 10
              } correct · Score ${attempt.score}`
            : "Arena attempt saved",
        tokens: attempt.tokens_earned ?? 0,
        date: attempt.created_at,
      })),
    ];

    return records
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 16);
  }, [coreAttempts, thinkAttempts, expressAttempts, knowledgeAttempts]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(2,8,19,0.56),
            rgba(2,8,19,0.9)
          ),
          radial-gradient(circle at 50% 0%, rgba(126,232,255,0.18), transparent 36%),
          url("/nova/learning-missions/learning-missions-bg.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <Link
        href="/learning-missions"
        style={{
          position: "fixed",
          top: isMobile ? "14px" : "22px",
          left: isMobile ? "14px" : "22px",
          zIndex: 40,
          height: isMobile ? "40px" : "46px",
          padding: isMobile ? "0 14px" : "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(150, 231, 255, 0.7)",
          background: "rgba(2,8,19,0.72)",
          color: "white",
          fontSize: isMobile ? "12px" : "14px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          backdropFilter: "blur(14px)",
          boxShadow: "0 0 18px rgba(83, 215, 255, 0.22)",
        }}
      >
        ← Missions
      </Link>

      <section
        style={{
          minHeight: "100dvh",
          width: "100%",
          padding: isMobile
            ? "86px 18px 34px"
            : isCompact
            ? "96px 32px 46px"
            : "96px 5vw 56px",
        }}
      >
        <header
          style={{
            width: "min(1240px, 100%)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1.1fr 0.9fr",
            gap: "28px",
            alignItems: "end",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#8dfcff",
                fontSize: "13px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Progress & Rewards
            </p>

            <h1
              style={{
                margin: "12px 0 0",
                fontSize: isMobile ? "38px" : isCompact ? "54px" : "72px",
                lineHeight: 0.95,
                fontWeight: 600,
                letterSpacing: "-0.055em",
                textShadow: "0 0 30px rgba(126, 232, 255, 0.28)",
              }}
            >
              Mission
              <br />
              Progress Log
            </h1>

            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "720px",
                fontSize: isMobile ? "16px" : "20px",
                color: "#d9fbff",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              View your counted completions, replay attempts, best scores,
              unlocked Nova upgrades, and Dreamscape Token rewards.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr 1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: "14px",
            }}
          >
            <SummaryTile label="Tokens" value={String(tokenBalance)} />
            <SummaryTile
              label="Counted Missions"
              value={String(totalCountedMissions)}
            />
            <SummaryTile label="All Attempts" value={String(totalAttempts)} />
            <SummaryTile
              label="Account"
              value={userEmail ? "Active" : "Log In"}
            />
          </div>
        </header>

        {isLoading && (
          <div style={messageCardStyle}>Loading your mission progress...</div>
        )}

        {!isLoading && message && (
          <div style={messageCardStyle}>
            <p style={{ margin: 0 }}>{message}</p>

            <Link
              href="/login"
              style={{
                ...primaryButtonStyle,
                margin: "22px auto 0",
                textDecoration: "none",
              }}
            >
              Log In
            </Link>
          </div>
        )}

        {!isLoading && !message && (
          <>
            <section
              style={{
                width: "min(1240px, 100%)",
                margin: "32px auto 0",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: "16px",
              }}
            >
              <MissionSummaryCard
                title="Core Missions"
                subtitle="Skyforge Rover"
                completed={coreCompleted}
                attempts={coreAttempts.length}
                bestScore={bestCoreScore}
                accent="#7ee8ff"
              />

              <MissionSummaryCard
                title="Think Missions"
                subtitle="Gear Inventory"
                completed={thinkCompleted}
                attempts={thinkAttempts.length}
                bestScore={bestThinkScore}
                accent="#60f0d0"
              />

              <MissionSummaryCard
                title="Express Missions"
                subtitle="Story System"
                completed={expressCompleted}
                attempts={expressAttempts.length}
                bestScore={null}
                accent="#ff9df0"
              />

              <MissionSummaryCard
                title="Knowledge Arena"
                subtitle="Arena Records"
                completed={knowledgeCompleted}
                attempts={knowledgeAttempts.length}
                bestScore={bestKnowledgeScore}
                accent="#ffd76a"
              />
            </section>

            <section
              style={{
                width: "min(1240px, 100%)",
                margin: "28px auto 0",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: "18px",
              }}
            >
              <UpgradePanel
                title="Skyforge Rover"
                label="Core Upgrade"
                completed={coreCompleted}
                current={coreCurrent}
                next={coreNext}
                accent="#7ee8ff"
              />

              <UpgradePanel
                title="Gear Inventory"
                label="Think Upgrade"
                completed={thinkCompleted}
                current={thinkCurrent}
                next={thinkNext}
                accent="#60f0d0"
              />

              <UpgradePanel
                title="Story System"
                label="Express Upgrade"
                completed={expressCompleted}
                current={expressCurrent}
                next={expressNext}
                accent="#ff9df0"
              />
            </section>

            <section
              style={{
                width: "min(1240px, 100%)",
                margin: "28px auto 0",
                borderRadius: isMobile ? "24px" : "32px",
                border: "1px solid rgba(141,252,255,0.22)",
                background:
                  "linear-gradient(145deg, rgba(5,18,42,0.74), rgba(8,30,58,0.82))",
                boxShadow:
                  "0 0 34px rgba(126,232,255,0.12), 0 28px 80px rgba(0,0,0,0.34)",
                padding: isMobile ? "20px" : "30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: isMobile ? "flex-start" : "center",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#8dfcff",
                      fontSize: "12px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontWeight: 800,
                    }}
                  >
                    Score Records
                  </p>

                  <h2
                    style={{
                      margin: "8px 0 0",
                      fontSize: isMobile ? "28px" : "36px",
                      lineHeight: 1.1,
                    }}
                  >
                    Recent Mission Attempts
                  </h2>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.68)",
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                >
                  Replays are saved here, but only first completions with token
                  rewards count toward upgrades.
                </p>
              </div>

              {recentRecords.length === 0 ? (
                <div style={emptyStateStyle}>
                  No mission attempts yet. Complete a mission to start your
                  progress log.
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "22px",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  {recentRecords.map((record) => (
                    <RecentRecordCard key={record.id} record={record} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "24px",
        border: "1px solid rgba(141,252,255,0.28)",
        background:
          "linear-gradient(145deg, rgba(5,22,48,0.76), rgba(10,48,82,0.58))",
        padding: "22px",
        boxShadow: "0 0 24px rgba(83,215,255,0.12)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#8dfcff",
          fontSize: "11px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "30px",
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function MissionSummaryCard({
  title,
  subtitle,
  completed,
  attempts,
  bestScore,
  accent,
}: {
  title: string;
  subtitle: string;
  completed: number;
  attempts: number;
  bestScore: number | null;
  accent: string;
}) {
  return (
    <div
      style={{
        minHeight: "230px",
        borderRadius: "26px",
        border: `1px solid ${accent}55`,
        background:
          "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
        boxShadow: `0 0 22px ${accent}22`,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p
        style={{
          margin: 0,
          color: accent,
          fontSize: "12px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        {subtitle}
      </p>

      <h3
        style={{
          margin: "12px 0 0",
          fontSize: "26px",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          marginTop: "auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        <SmallStat label="Counted" value={String(completed)} accent={accent} />
        <SmallStat label="Attempts" value={String(attempts)} accent={accent} />
        <SmallStat
          label="Best"
          value={bestScore === null ? "—" : String(bestScore)}
          accent={accent}
        />
        <SmallStat label="Replay" value="Saved" accent={accent} />
      </div>
    </div>
  );
}

function UpgradePanel({
  title,
  label,
  completed,
  current,
  next,
  accent,
}: {
  title: string;
  label: string;
  completed: number;
  current: Upgrade;
  next?: Upgrade;
  accent: string;
}) {
  const progressTarget = next?.missionsRequired ?? current.missionsRequired;
  const previousTarget = current.missionsRequired;
  const range = Math.max(1, progressTarget - previousTarget);
  const progress = next
    ? Math.min(100, Math.round(((completed - previousTarget) / range) * 100))
    : 100;

  const missionsToNext = next
    ? Math.max(0, next.missionsRequired - completed)
    : 0;

  return (
    <div
      style={{
        minHeight: "310px",
        borderRadius: "26px",
        border: `1px solid ${accent}55`,
        background:
          "linear-gradient(145deg, rgba(5,22,48,0.74), rgba(8,26,58,0.82))",
        padding: "24px",
        boxShadow: `0 0 24px ${accent}18`,
      }}
    >
      <p
        style={{
          margin: 0,
          color: accent,
          fontSize: "12px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        {label}
      </p>

      <h3
        style={{
          margin: "10px 0 0",
          fontSize: "28px",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "18px 0 0",
          color: "rgba(255,255,255,0.62)",
          fontSize: "13px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Current Unlock
      </p>

      <h4
        style={{
          margin: "8px 0 0",
          fontSize: "22px",
          color: "white",
        }}
      >
        {current.name}
      </h4>

      <p
        style={{
          margin: "10px 0 0",
          color: "rgba(255,255,255,0.76)",
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {current.description}
      </p>

      <div
        style={{
          marginTop: "18px",
          height: "12px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.08)",
          border: `1px solid ${accent}44`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${accent}, #ffffff)`,
            boxShadow: `0 0 18px ${accent}66`,
          }}
        />
      </div>

      <p
        style={{
          margin: "12px 0 0",
          color: next ? "#ffe6a8" : "#86efac",
          fontSize: "14px",
          lineHeight: 1.45,
        }}
      >
        {next
          ? `Next: ${next.name}. Complete ${missionsToNext} new mission${
              missionsToNext === 1 ? "" : "s"
            } to unlock it.`
          : "All current upgrades unlocked."}
      </p>
    </div>
  );
}

function SmallStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: `1px solid ${accent}33`,
        background: "rgba(255,255,255,0.06)",
        padding: "12px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.58)",
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "6px 0 0",
          color: accent,
          fontSize: "18px",
          fontWeight: 800,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function RecentRecordCard({
  record,
}: {
  record: {
    id: string;
    type: string;
    title: string;
    detail: string;
    tokens: number;
    date?: string;
  };
}) {
  const accent =
    record.type === "Core"
      ? "#7ee8ff"
      : record.type === "Think"
      ? "#60f0d0"
      : record.type === "Express"
      ? "#ff9df0"
      : "#ffd76a";

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${accent}33`,
        background: "rgba(255,255,255,0.06)",
        padding: "16px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "14px",
        alignItems: "center",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: accent,
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 900,
          }}
        >
          {record.type} · {formatDate(record.date)}
        </p>

        <h3
          style={{
            margin: "7px 0 0",
            fontSize: "18px",
          }}
        >
          {record.title}
        </h3>

        <p
          style={{
            margin: "6px 0 0",
            color: "rgba(255,255,255,0.72)",
            fontSize: "14px",
            lineHeight: 1.45,
          }}
        >
          {record.detail}
        </p>
      </div>

      <div
        style={{
          minWidth: "82px",
          borderRadius: "999px",
          border: `1px solid ${record.tokens > 0 ? "#86efac55" : "#ffffff22"}`,
          background:
            record.tokens > 0
              ? "rgba(34,197,94,0.12)"
              : "rgba(255,255,255,0.06)",
          color: record.tokens > 0 ? "#86efac" : "rgba(255,255,255,0.58)",
          padding: "9px 12px",
          textAlign: "center",
          fontSize: "13px",
          fontWeight: 900,
        }}
      >
        +{record.tokens}
      </div>
    </div>
  );
}

const messageCardStyle: CSSProperties = {
  width: "min(680px, 100%)",
  margin: "44px auto 0",
  borderRadius: "26px",
  border: "1px solid rgba(141,252,255,0.28)",
  background:
    "linear-gradient(145deg, rgba(5,22,48,0.76), rgba(10,48,82,0.58))",
  padding: "30px",
  textAlign: "center",
  color: "rgba(255,255,255,0.82)",
};

const emptyStateStyle: CSSProperties = {
  marginTop: "22px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  padding: "24px",
  color: "rgba(255,255,255,0.72)",
  textAlign: "center",
};

const primaryButtonStyle: CSSProperties = {
  minHeight: "50px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 22px",
  fontWeight: 800,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
};