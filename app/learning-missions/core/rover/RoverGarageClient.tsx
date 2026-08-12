"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  coreUpgradeTrack,
  getCoreRoverProgress,
} from "@/lib/coreRoverProgress";

const COURSE_ID = "skyforge-test-track-01";

type GarageTab = "upgrades" | "custom";
type ScreenMode = "desktop" | "tablet" | "mobile";

type SummaryRow = {
  rank: number | string;
  best_score: number;
  best_time_ms: number;
  orbs_collected: number;
  rover_stage: number;
  completed_at: string;
};

type RoverBuildStat = {
  label: string;
  value: number;
};

const roverBuildStatsByStage: Record<number, RoverBuildStat[]> = {
  0: [
    { label: "Speed", value: 2 },
    { label: "Handling", value: 2 },
    { label: "Balance", value: 2 },
    { label: "Jump", value: 1 },
  ],
  1: [
    { label: "Speed", value: 3 },
    { label: "Handling", value: 2 },
    { label: "Balance", value: 2 },
    { label: "Jump", value: 1 },
  ],
  2: [
    { label: "Speed", value: 3 },
    { label: "Handling", value: 4 },
    { label: "Balance", value: 3 },
    { label: "Jump", value: 1 },
  ],
  3: [
    { label: "Speed", value: 5 },
    { label: "Handling", value: 4 },
    { label: "Balance", value: 3 },
    { label: "Jump", value: 2 },
  ],
  4: [
    { label: "Speed", value: 4 },
    { label: "Handling", value: 4 },
    { label: "Balance", value: 5 },
    { label: "Jump", value: 2 },
  ],
  5: [
    { label: "Speed", value: 4 },
    { label: "Handling", value: 5 },
    { label: "Balance", value: 4 },
    { label: "Jump", value: 5 },
  ],
};

function getRoverBuildStats(stage: number): RoverBuildStat[] {
  const configuredStats = roverBuildStatsByStage[stage];

  if (configuredStats) return configuredStats;

  return [
    { label: "Speed", value: Math.min(5, 2 + Math.ceil(stage / 2)) },
    { label: "Handling", value: Math.min(5, 2 + Math.floor(stage / 2)) },
    { label: "Balance", value: Math.min(5, 2 + Math.floor((stage + 1) / 3)) },
    { label: "Jump", value: Math.min(5, 1 + Math.floor(stage / 2)) },
  ];
}

type GarageCustomCategory = "color" | "trail" | "decal";

type GarageCustomOption = {
  key: string;
  category: GarageCustomCategory;
  name: string;
  description: string;
  previewColor: string;
  secondaryColor?: string;
  icon?: string;
  isDefault?: boolean;
};

const garageCustomisationGroups: {
  id: GarageCustomCategory;
  title: string;
  description: string;
  options: GarageCustomOption[];
}[] = [
  {
    id: "color",
    title: "Rover Colour",
    description: "The standard rover artwork is used with no colour overlay.",
    options: [
      {
        key: "color-none",
        category: "color",
        name: "No Tint",
        description: "Use the original rover colours with no added tint.",
        previewColor: "transparent",
        isDefault: true,
      },
      {
        key: "color-sky",
        category: "color",
        name: "Sky Blue",
        description: "A blue Skyforge finish.",
        previewColor: "#8ee8ff",
      },
      {
        key: "color-crimson",
        category: "color",
        name: "Crimson",
        description: "A bold red expedition finish.",
        previewColor: "#ff7184",
      },
      {
        key: "color-emerald",
        category: "color",
        name: "Emerald",
        description: "A bright green exploration finish.",
        previewColor: "#73efb6",
      },
      {
        key: "color-violet",
        category: "color",
        name: "Violet",
        description: "A futuristic purple energy finish.",
        previewColor: "#b28cff",
      },
      {
        key: "color-gold",
        category: "color",
        name: "Solar Gold",
        description: "A premium gold Skyforge finish.",
        previewColor: "#ffd76a",
      },
    ],
  },
  {
    id: "trail",
    title: "Energy Trail",
    description: "The rover currently runs without a cosmetic energy trail.",
    options: [
      {
        key: "trail-none",
        category: "trail",
        name: "No Energy Trail",
        description: "No cosmetic trail is shown behind the rover.",
        previewColor: "transparent",
        isDefault: true,
      },
      {
        key: "trail-plasma",
        category: "trail",
        name: "Plasma Trail",
        description: "A bright cyan trail behind the rover.",
        previewColor: "#6ef4ff",
      },
      {
        key: "trail-spark",
        category: "trail",
        name: "Spark Trail",
        description: "A charged yellow energy trail.",
        previewColor: "#ffe57c",
        secondaryColor: "#ff8fcf",
      },
      {
        key: "trail-starlight",
        category: "trail",
        name: "Starlight Trail",
        description: "A violet and blue light trail.",
        previewColor: "#a978ff",
        secondaryColor: "#6edaff",
      },
    ],
  },
  {
    id: "decal",
    title: "Body Decal",
    description: "The standard rover body is shown without an emblem.",
    options: [
      {
        key: "decal-none",
        category: "decal",
        name: "No Decal",
        description: "Keep the rover body clean and unmarked.",
        previewColor: "transparent",
        icon: "—",
        isDefault: true,
      },
      {
        key: "decal-star",
        category: "decal",
        name: "Sky Star",
        description: "A bright explorer star emblem.",
        previewColor: "#ffd76a",
        icon: "★",
      },
      {
        key: "decal-bolt",
        category: "decal",
        name: "Energy Bolt",
        description: "A lightning emblem for the rover body.",
        previewColor: "#6ef4ff",
        icon: "ϟ",
      },
      {
        key: "decal-crest",
        category: "decal",
        name: "Explorer Crest",
        description: "Nova's expedition crest.",
        previewColor: "#66f0d0",
        icon: "◇",
      },
    ],
  },
];

function useResponsiveMode() {
  const [mode, setMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 720) setMode("mobile");
      else if (width <= 1180 || height > width) setMode("tablet");
      else setMode("desktop");
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
}

export default function RoverGarageClient() {
  const router = useRouter();
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [tab, setTab] = useState<GarageTab>("upgrades");

  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);

  const [tokenBalance, setTokenBalance] = useState(0);

  const [dreamGemBalance, setDreamGemBalance] = useState(0);

  const [completedMissionCount, setCompletedMissionCount] = useState(0);

  const [selectedUpgradeStage, setSelectedUpgradeStage] = useState<
    number | null
  >(null);

  const [rank, setRank] = useState<number | null>(null);

  const [bestScore, setBestScore] = useState<number | null>(null);

  const [bestTimeMs, setBestTimeMs] = useState<number | null>(null);

  const [orbsCollected, setOrbsCollected] = useState<number | null>(null);

  const progress = useMemo(
    () => getCoreRoverProgress(completedMissionCount),
    [completedMissionCount],
  );

  const displayedUpgrade = useMemo(() => {
    const requestedStage =
      selectedUpgradeStage ?? progress.currentUpgrade.stage;

    const requestedUpgrade = coreUpgradeTrack.find(
      (upgrade) => upgrade.stage === requestedStage,
    );

    if (
      requestedUpgrade &&
      completedMissionCount >= requestedUpgrade.missionsRequired
    ) {
      return requestedUpgrade;
    }

    return progress.currentUpgrade;
  }, [completedMissionCount, progress.currentUpgrade, selectedUpgradeStage]);

  const viewingCurrentBuild =
    displayedUpgrade.stage === progress.currentUpgrade.stage;

  const loadGarage = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [tokensResult, profileResult, attemptsResult, summaryResult] =
      await Promise.all([
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),

        supabase
          .from("profiles")
          .select("dream_gem_balance")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("core_mission_attempts")
          .select("quiz_id, tokens_earned")
          .eq("user_id", user.id)
          .gt("tokens_earned", 0),

        supabase.rpc("get_my_rover_challenge_summary", {
          p_course_id: COURSE_ID,
        }),
      ]);

    if (tokensResult.error) {
      console.warn("Could not load DT balance:", tokensResult.error.message);
    } else {
      setTokenBalance(
        tokensResult.data?.reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0,
        ) || 0,
      );
    }

    if (profileResult.error) {
      console.warn("Could not load DG balance:", profileResult.error.message);
      setDreamGemBalance(0);
    } else {
      setDreamGemBalance(
        Math.max(0, Number(profileResult.data?.dream_gem_balance || 0)),
      );
    }

    if (attemptsResult.error) {
      console.warn(
        "Could not load rover progress:",
        attemptsResult.error.message,
      );
    } else {
      const completed = new Set(
        (attemptsResult.data ?? []).map((row) => row.quiz_id),
      );
      setCompletedMissionCount(completed.size);
    }

    if (summaryResult.error) {
      console.warn(
        "Could not load rover rank summary:",
        summaryResult.error.message,
      );
      setRank(null);
      setBestScore(null);
      setBestTimeMs(null);
      setOrbsCollected(null);
    } else {
      const summary = ((summaryResult.data ?? []) as SummaryRow[])[0];

      if (summary) {
        const parsedRank = Number(summary.rank);
        setRank(Number.isFinite(parsedRank) ? parsedRank : null);
        setBestScore(Number(summary.best_score));
        setBestTimeMs(Number(summary.best_time_ms));
        setOrbsCollected(Number(summary.orbs_collected));
      } else {
        setRank(null);
        setBestScore(null);
        setBestTimeMs(null);
        setOrbsCollected(null);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadGarage();

    function handleBalanceUpdate() {
      void loadGarage();
    }

    window.addEventListener("dream-tokens-updated", handleBalanceUpdate);
    window.addEventListener("dream-gems-updated", handleBalanceUpdate);

    return () => {
      window.removeEventListener("dream-tokens-updated", handleBalanceUpdate);
      window.removeEventListener("dream-gems-updated", handleBalanceUpdate);
    };
  }, [loadGarage]);

  if (loading) {
    return (
      <main style={pageBackground}>
        <div style={loadingFill}>Preparing My Rover...</div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main style={pageBackground}>
        <header style={topHeader(isMobile)}>
          <button
            type="button"
            onClick={() => router.push("/learning-missions/core")}
            style={headerButton}
          >
            ← Core Missions
          </button>
        </header>
        <div style={loadingFill}>
          <div style={loginCard}>
            <h1 style={{ margin: 0 }}>My Rover</h1>
            <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
              Log in to view your rover, upgrades and custom build.
            </p>
            <a
              href="/login"
              style={{ ...primaryButton, textDecoration: "none" }}
            >
              Log In
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageBackground}>
      <header style={topHeader(isMobile)}>
        <button
          type="button"
          onClick={() => router.push("/learning-missions/core")}
          style={headerButton}
        >
          ← Core Missions
        </button>

        <div style={headerIdentity(isMobile)}>
          <p style={headerEyebrow}>SKYFORGE HANGAR</p>
          <h1 style={headerTitle}>My Rover</h1>
        </div>

        <div style={headerRight(isMobile)}>
          <div style={balancePill("dt")}>
            <span style={pillIcon("dt")}>◇</span>
            {!isMobile && <span style={pillLabel}>PROFILE ASSETS</span>}
            <strong style={pillValue("dt")}>
              {tokenBalance.toLocaleString("en-SG")} DT
            </strong>
            <span style={pillChevron}>⌄</span>
          </div>
          <div style={balancePill("dg")}>
            <span style={pillIcon("dg")}>◆</span>
            {!isMobile && <span style={pillLabel}>DREAM GEMS</span>}
            <strong style={pillValue("dg")}>
              {dreamGemBalance.toLocaleString("en-SG")} DG
            </strong>
            <span style={pillChevron}>⌄</span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            style={accountHeaderButton}
          >
            My Account
          </button>
        </div>
      </header>

      <section style={garageShell(isMobile)}>
        <div style={previewColumn(isCompact)}>
          <div style={previewCard(displayedUpgrade.accent)}>
            <div style={previewTopRow}>
              <div>
                <p style={smallEyebrow}>
                  {viewingCurrentBuild
                    ? "CURRENT BUILD"
                    : "VIEWING UNLOCKED BUILD"}
                </p>
                <h2 style={currentBuildTitle}>
                  Stage {displayedUpgrade.stage} · {displayedUpgrade.name}
                </h2>
              </div>
              <div style={rankPill(rank)}>
                {rank ? `Rank #${rank}` : "Unranked"}
              </div>
            </div>

            <RoverPreview
              imageSrc={displayedUpgrade.imageSrc}
              isMobile={isMobile}
            />

            <p style={upgradeDescription}>{displayedUpgrade.description}</p>

            <RoverBuildStats
              stage={displayedUpgrade.stage}
              accent={displayedUpgrade.accent}
            />

            {!viewingCurrentBuild && (
              <button
                type="button"
                onClick={() =>
                  setSelectedUpgradeStage(progress.currentUpgrade.stage)
                }
                style={returnCurrentButton}
              >
                Return to Current Build
              </button>
            )}

            <div style={progressTrack}>
              <div
                style={{
                  ...progressFill,
                  width: `${progress.progressPercentage}%`,
                  background: `linear-gradient(90deg, ${progress.currentUpgrade.accent}, #35c5ff)`,
                }}
              />
            </div>

            <div style={progressBottomRow}>
              <p style={progressText}>
                {completedMissionCount} counted Core Missions
              </p>
              <p style={progressText}>
                {progress.nextUpgrade
                  ? `${progress.missionsToNext} to ${progress.nextUpgrade.shortName}`
                  : "All stages unlocked"}
              </p>
            </div>

            <div style={summaryGrid(isMobile)}>
              <SummaryStat
                label="Current Rank"
                value={rank ? `#${rank}` : "—"}
              />
              <SummaryStat
                label="Best Score"
                value={bestScore === null ? "—" : bestScore.toLocaleString()}
              />
              <SummaryStat
                label="Best Time"
                value={
                  bestTimeMs === null ? "—" : formatMilliseconds(bestTimeMs)
                }
              />
              <SummaryStat
                label="Best Orbs"
                value={orbsCollected === null ? "—" : `${orbsCollected}/8`}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/learning-missions/core/rover-challenge")
              }
              style={largeChallengeButton}
            >
              Enter Rover Challenge ›
            </button>
          </div>
        </div>

        <div style={controlColumn}>
          <div style={tabBar}>
            <button
              type="button"
              onClick={() => setTab("upgrades")}
              style={tabButton(tab === "upgrades")}
            >
              Rover Upgrades
            </button>
            <button
              type="button"
              onClick={() => setTab("custom")}
              style={tabButton(tab === "custom")}
            >
              Custom Build
            </button>
          </div>

          {tab === "upgrades" ? (
            <UpgradeTrack
              completedMissionCount={completedMissionCount}
              selectedStage={displayedUpgrade.stage}
              onSelectStage={setSelectedUpgradeStage}
            />
          ) : (
            <CustomBuildPanel tokenBalance={tokenBalance} isMobile={isMobile} />
          )}
        </div>
      </section>
    </main>
  );
}

function RoverPreview({
  imageSrc,
  isMobile,
}: {
  imageSrc: string;
  isMobile: boolean;
}) {
  return (
    <div style={previewStage(isMobile)}>
      <img
        src={imageSrc}
        alt="Selected Skyforge Rover"
        draggable={false}
        style={roverImage}
      />

      <div style={loadoutLabels}>
        <span>No Tint</span>
        <span>No Energy Trail</span>
        <span>No Decal</span>
      </div>
    </div>
  );
}

function RoverBuildStats({ stage, accent }: { stage: number; accent: string }) {
  const stats = getRoverBuildStats(stage);

  return (
    <section
      aria-label={`Stage ${stage} rover build statistics`}
      style={buildStatsPanel}
    >
      <div style={buildStatsHeadingRow}>
        <p style={smallEyebrow}>BUILD STATS</p>
        <span style={buildStatsScale}>1–5</span>
      </div>

      <div style={buildStatsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} style={buildStatRow}>
            <div style={buildStatLabelRow}>
              <span>{stat.label}</span>
              <strong style={{ color: accent }}>{stat.value}/5</strong>
            </div>
            <div style={buildStatTrack}>
              <div
                style={{
                  ...buildStatFill,
                  width: `${stat.value * 20}%`,
                  background: `linear-gradient(90deg, ${accent}, #35c5ff)`,
                  boxShadow: `0 0 12px ${accent}55`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpgradeTrack({
  completedMissionCount,
  selectedStage,
  onSelectStage,
}: {
  completedMissionCount: number;
  selectedStage: number;
  onSelectStage: (stage: number) => void;
}) {
  return (
    <div style={scrollPanel}>
      <div style={panelHeading}>
        <p style={smallEyebrow}>MISSION UNLOCKS</p>

        <h2 style={{ margin: "7px 0 0" }}>Rover Upgrade Track</h2>

        <p style={panelDescription}>
          Complete new Core Mission quizzes to unlock performance upgrades.
          Select any previously unlocked build to view it. Replays do not add
          progress.
        </p>
      </div>

      <div style={upgradeList}>
        {coreUpgradeTrack.map((upgrade, index) => {
          const unlocked = completedMissionCount >= upgrade.missionsRequired;

          const current =
            unlocked &&
            (index === coreUpgradeTrack.length - 1 ||
              completedMissionCount <
                coreUpgradeTrack[index + 1].missionsRequired);

          const selected = selectedStage === upgrade.stage;

          return (
            <button
              key={upgrade.stage}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                if (unlocked) {
                  onSelectStage(upgrade.stage);
                }
              }}
              aria-pressed={selected}
              style={upgradeRow(unlocked, current, selected, upgrade.accent)}
            >
              <div style={stageNumber(unlocked, upgrade.accent)}>
                {upgrade.stage}
              </div>

              <img
                src={upgrade.imageSrc}
                alt={upgrade.name}
                draggable={false}
                style={{
                  width: "110px",
                  height: "76px",
                  objectFit: "contain",
                  opacity: unlocked ? 1 : 0.35,
                }}
              />

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                  textAlign: "left",
                }}
              >
                <p
                  style={upgradeStatus(
                    unlocked,
                    current,
                    selected,
                    upgrade.accent,
                  )}
                >
                  {current
                    ? "CURRENT BUILD"
                    : selected
                      ? "VIEWING"
                      : unlocked
                        ? "UNLOCKED · SELECT"
                        : `${upgrade.missionsRequired} MISSIONS`}
                </p>

                <h3
                  style={{
                    margin: "5px 0 0",
                    fontSize: "18px",
                  }}
                >
                  {upgrade.name}
                </h3>

                <p style={upgradeRowDescription}>{upgrade.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomBuildPanel({
  tokenBalance,
  isMobile,
}: {
  tokenBalance: number;
  isMobile: boolean;
}) {
  return (
    <div style={scrollPanel}>
      <div style={panelHeading}>
        <p style={smallEyebrow}>COSMETIC CUSTOMISATION</p>

        <h2 style={{ margin: "7px 0 0" }}>Custom Build</h2>

        <p style={panelDescription}>
          The standard build currently uses no tint, no energy trail and no
          decal. Additional cosmetic options are locked for now. Balance:{" "}
          <strong>{tokenBalance} DT</strong>
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "18px",
        }}
      >
        {garageCustomisationGroups.map((group) => (
          <section key={group.id}>
            <h3
              style={{
                margin: 0,
                fontSize: "19px",
              }}
            >
              {group.title}
            </h3>

            <p
              style={{
                margin: "5px 0 10px",
                opacity: 0.58,
                fontSize: "13px",
              }}
            >
              {group.description}
            </p>

            <div style={customGrid(isMobile)}>
              {group.options.map((item) => (
                <div
                  key={item.key}
                  style={customCard(Boolean(item.isDefault), item.previewColor)}
                >
                  <CustomSwatch item={item} />

                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <p style={customName}>{item.name}</p>

                    <p style={customDescription}>{item.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled
                    style={customActionButton(Boolean(item.isDefault))}
                  >
                    {item.isDefault ? "Default" : "Locked"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CustomSwatch({ item }: { item: GarageCustomOption }) {
  if (item.category === "decal") {
    return (
      <div
        style={{
          ...swatch,
          color:
            item.previewColor === "transparent"
              ? "rgba(255,255,255,0.55)"
              : item.previewColor,
          fontSize: "28px",
          textShadow:
            item.previewColor === "transparent"
              ? "none"
              : `0 0 14px ${item.previewColor}`,
        }}
      >
        {item.icon || "—"}
      </div>
    );
  }

  if (item.category === "trail" && !item.isDefault) {
    return (
      <div style={swatch}>
        <div
          style={{
            width: "42px",
            height: "8px",
            borderRadius: "999px",
            background: `linear-gradient(90deg, transparent, ${
              item.previewColor
            }, ${item.secondaryColor || item.previewColor})`,
            boxShadow: `0 0 16px ${item.previewColor}`,
          }}
        />
      </div>
    );
  }

  return (
    <div style={swatch}>
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "999px",
          background:
            item.previewColor === "transparent"
              ? "rgba(255,255,255,0.025)"
              : `linear-gradient(135deg, ${item.previewColor}, ${
                  item.secondaryColor || item.previewColor
                })`,
          border:
            item.previewColor === "transparent"
              ? "1px dashed rgba(255,255,255,0.32)"
              : "1px solid rgba(255,255,255,0.25)",
        }}
      />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryStat}>
      <p style={summaryLabel}>{label}</p>
      <p style={summaryValue}>{value}</p>
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

const pageBackground: CSSProperties = {
  minHeight: "100dvh",
  width: "100%",
  backgroundImage: `
    radial-gradient(circle at 14% 8%, rgba(38, 193, 255, 0.16), transparent 29%),
    radial-gradient(circle at 88% 17%, rgba(155, 92, 255, 0.14), transparent 27%),
    linear-gradient(115deg, transparent 0 47%, rgba(88, 216, 255, 0.035) 47% 47.15%, transparent 47.15% 100%),
    repeating-linear-gradient(90deg, rgba(126,232,255,0.026) 0 1px, transparent 1px 96px),
    repeating-linear-gradient(0deg, rgba(126,232,255,0.018) 0 1px, transparent 1px 96px),
    linear-gradient(180deg, #09172b 0%, #050d1d 48%, #020711 100%)
  `,
  backgroundSize: "cover, cover, cover, auto, auto, cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  backgroundColor: "#020711",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
};

function topHeader(isMobile: boolean): CSSProperties {
  return {
    position: "sticky",
    top: 0,
    zIndex: 30,
    minHeight: isMobile ? "112px" : "72px",
    padding: isMobile ? "9px 12px 10px" : "10px 20px",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr auto" : "1fr auto 1fr",
    gridTemplateRows: isMobile ? "auto auto" : "auto",
    alignItems: "center",
    gap: isMobile ? "8px 10px" : "14px",
    borderBottom: "1px solid rgba(126,232,255,0.14)",
    background: "rgba(3,11,25,0.9)",
    boxShadow: "0 12px 35px rgba(0,0,0,0.22)",
    backdropFilter: "blur(18px)",
  };
}

const headerButton: CSSProperties = {
  justifySelf: "start",
  minHeight: "44px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.38)",
  background: "rgba(4,16,35,0.82)",
  color: "white",
  padding: "0 19px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

function headerIdentity(isMobile: boolean): CSSProperties {
  return {
    textAlign: "center",
    minWidth: 0,
    ...(isMobile
      ? {
          gridColumn: "2",
          gridRow: "1",
          justifySelf: "end",
        }
      : {}),
  };
}

const headerEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.22em",
  fontWeight: 900,
};

const headerTitle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "21px",
  lineHeight: 1,
};

function headerRight(isMobile: boolean): CSSProperties {
  return {
    justifySelf: "end",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: 0,
    ...(isMobile
      ? {
          gridColumn: "1 / -1",
          gridRow: "2",
          justifySelf: "stretch",
          width: "100%",
          overflowX: "auto",
          paddingBottom: "1px",
          scrollbarWidth: "none",
        }
      : {}),
  };
}

function balancePill(kind: "dt" | "dg"): CSSProperties {
  const isDreamGem = kind === "dg";

  return {
    minHeight: "44px",
    borderRadius: "999px",
    border: isDreamGem
      ? "1px solid rgba(216,180,254,0.52)"
      : "1px solid rgba(89,220,255,0.48)",
    background: isDreamGem
      ? "linear-gradient(135deg, rgba(99,54,137,0.34), rgba(20,10,42,0.88))"
      : "linear-gradient(135deg, rgba(5,42,62,0.88), rgba(2,14,31,0.9))",
    padding: "0 13px 0 9px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    fontWeight: 900,
    whiteSpace: "nowrap",
    boxShadow: isDreamGem
      ? "inset 0 0 18px rgba(192,132,252,0.09)"
      : "inset 0 0 18px rgba(53,197,255,0.08)",
  };
}

function pillIcon(kind: "dt" | "dg"): CSSProperties {
  const isDreamGem = kind === "dg";

  return {
    width: "26px",
    height: "26px",
    flexShrink: 0,
    borderRadius: "999px",
    border: isDreamGem
      ? "1px solid rgba(233,213,255,0.58)"
      : "1px solid rgba(126,232,255,0.58)",
    background: isDreamGem
      ? "rgba(192,132,252,0.18)"
      : "rgba(53,197,255,0.14)",
    color: isDreamGem ? "#f0ddff" : "#98efff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    lineHeight: 1,
    boxShadow: isDreamGem
      ? "0 0 14px rgba(192,132,252,0.2)"
      : "0 0 14px rgba(53,197,255,0.18)",
  };
}

const pillLabel: CSSProperties = {
  color: "rgba(255,255,255,0.92)",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.06em",
};

function pillValue(kind: "dt" | "dg"): CSSProperties {
  return {
    color: kind === "dg" ? "#ead6ff" : "#78e7ff",
    fontSize: "12px",
    letterSpacing: "0.03em",
  };
}

const pillChevron: CSSProperties = {
  color: "rgba(255,255,255,0.78)",
  fontSize: "11px",
  transform: "translateY(-1px)",
};

const accountHeaderButton: CSSProperties = {
  ...headerButton,
  border: "1px solid rgba(126,232,255,0.45)",
  background: "rgba(4,16,35,0.88)",
  backdropFilter: "blur(16px)",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
};

function garageShell(isMobile: boolean): CSSProperties {
  return {
    width: "min(1500px,100%)",
    margin: "0 auto",
    padding: isMobile ? "12px" : "22px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(360px,0.92fr) minmax(0,1.25fr)",
    gap: "18px",
    alignItems: "start",
  };
}

function previewColumn(isCompact: boolean): CSSProperties {
  return {
    position: isCompact ? "relative" : "sticky",
    top: isCompact ? "auto" : "90px",
  };
}

function previewCard(accent: string): CSSProperties {
  return {
    borderRadius: "28px",
    border: `1px solid ${accent}77`,
    background:
      "linear-gradient(145deg, rgba(6,24,52,0.9), rgba(3,13,34,0.97))",
    boxShadow: `0 0 30px ${accent}20, 0 24px 70px rgba(0,0,0,0.38)`,
    padding: "20px",
    overflow: "hidden",
  };
}

const previewTopRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const smallEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "10px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const currentBuildTitle: CSSProperties = {
  margin: "7px 0 0",
  fontSize: "clamp(22px,3vw,32px)",
  lineHeight: 1.1,
};

function rankPill(rank: number | null): CSSProperties {
  return {
    flexShrink: 0,
    borderRadius: "999px",
    border:
      rank === 1
        ? "1px solid rgba(255,215,106,0.62)"
        : "1px solid rgba(126,232,255,0.35)",
    background:
      rank === 1 ? "rgba(255,215,106,0.12)" : "rgba(126,232,255,0.08)",
    color: rank === 1 ? "#ffd76a" : "#c9f9ff",
    padding: "9px 12px",
    fontSize: "12px",
    fontWeight: 900,
  };
}

function previewStage(isMobile: boolean): CSSProperties {
  return {
    position: "relative",
    marginTop: "16px",
    height: isMobile ? "245px" : "330px",
    borderRadius: "22px",
    border: "1px solid rgba(255,255,255,0.1)",
    background:
      "radial-gradient(circle at 50% 48%, rgba(126,232,255,0.15), rgba(255,255,255,0.035) 46%, rgba(0,0,0,0.18))",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

const roverImage: CSSProperties = {
  position: "relative",
  zIndex: 4,
  width: "88%",
  height: "80%",
  objectFit: "contain",
  filter: "drop-shadow(0 24px 34px rgba(0,0,0,0.55))",
};

const loadoutLabels: CSSProperties = {
  position: "absolute",
  zIndex: 10,
  inset: "auto 10px 10px",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "6px",
  fontSize: "9px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.62)",
};

const upgradeDescription: CSSProperties = {
  margin: "15px 0 0",
  color: "rgba(255,255,255,0.72)",
  fontSize: "14px",
  lineHeight: 1.5,
};

const buildStatsPanel: CSSProperties = {
  marginTop: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(255,255,255,0.035)",
  padding: "13px",
};

const buildStatsHeadingRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const buildStatsScale: CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "9px",
  letterSpacing: "0.1em",
  fontWeight: 800,
};

const buildStatsGrid: CSSProperties = {
  marginTop: "10px",
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "11px 14px",
};

const buildStatRow: CSSProperties = {
  minWidth: 0,
};

const buildStatLabelRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  color: "rgba(255,255,255,0.68)",
  fontSize: "11px",
};

const buildStatTrack: CSSProperties = {
  marginTop: "6px",
  height: "7px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const buildStatFill: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  transition: "width 220ms ease",
};

const returnCurrentButton: CSSProperties = {
  marginTop: "11px",
  minHeight: "38px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(126,232,255,0.08)",
  color: "#c9f9ff",
  padding: "0 14px",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
};

const progressTrack: CSSProperties = {
  marginTop: "15px",
  height: "12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
  border: "1px solid rgba(126,232,255,0.2)",
};

const progressFill: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
};

const progressBottomRow: CSSProperties = {
  marginTop: "9px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
};

const progressText: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.52)",
  fontSize: "11px",
};

function summaryGrid(isMobile: boolean): CSSProperties {
  return {
    marginTop: "15px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : "repeat(4,minmax(0,1fr))",
    gap: "8px",
  };
}

const summaryStat: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.17)",
  background: "rgba(255,255,255,0.05)",
  padding: "10px",
};

const summaryLabel: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.4)",
  fontSize: "8px",
  letterSpacing: "0.12em",
  fontWeight: 900,
};

const summaryValue: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "16px",
  fontWeight: 900,
};

const largeChallengeButton: CSSProperties = {
  marginTop: "14px",
  width: "100%",
  minHeight: "50px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.32)",
  background: "linear-gradient(135deg, #31d3ff, #4c6dff)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const controlColumn: CSSProperties = {
  minWidth: 0,
  borderRadius: "26px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "linear-gradient(145deg, rgba(5,18,42,0.88), rgba(8,26,58,0.94))",
  boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
  overflow: "hidden",
};

const tabBar: CSSProperties = {
  padding: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "8px",
  borderBottom: "1px solid rgba(126,232,255,0.12)",
};

function tabButton(active: boolean): CSSProperties {
  return {
    minHeight: "45px",
    borderRadius: "12px",
    border: active
      ? "1px solid rgba(126,232,255,0.5)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "linear-gradient(135deg, rgba(53,197,255,0.22), rgba(76,109,255,0.22))"
      : "rgba(255,255,255,0.04)",
    color: active ? "white" : "rgba(255,255,255,0.58)",
    fontWeight: 800,
    cursor: "pointer",
  };
}

const scrollPanel: CSSProperties = {
  padding: "18px",
};

const panelHeading: CSSProperties = {
  marginBottom: "16px",
};

const panelDescription: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.58)",
  lineHeight: 1.5,
  fontSize: "13px",
};

const upgradeList: CSSProperties = {
  display: "grid",
  gap: "10px",
};

function upgradeRow(
  unlocked: boolean,
  current: boolean,
  selected: boolean,
  accent: string,
): CSSProperties {
  return {
    width: "100%",
    borderRadius: "16px",
    border: selected
      ? `1px solid ${accent}`
      : current
        ? `1px solid ${accent}88`
        : unlocked
          ? "1px solid rgba(134,239,172,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
    background: selected
      ? `linear-gradient(135deg, ${accent}26, rgba(255,255,255,0.06))`
      : current
        ? `linear-gradient(135deg, ${accent}18, rgba(255,255,255,0.04))`
        : "rgba(255,255,255,0.035)",
    padding: "11px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    opacity: unlocked ? 1 : 0.58,
    color: "white",
    fontFamily: "inherit",
    cursor: unlocked ? "pointer" : "not-allowed",
    boxShadow: selected ? `0 0 22px ${accent}22` : "none",
    transition:
      "border 160ms ease, background 160ms ease, box-shadow 160ms ease",
  };
}

function stageNumber(unlocked: boolean, accent: string): CSSProperties {
  return {
    flexShrink: 0,
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    border: `1px solid ${unlocked ? accent : "rgba(255,255,255,0.18)"}`,
    background: unlocked ? `${accent}20` : "rgba(255,255,255,0.04)",
    color: unlocked ? accent : "rgba(255,255,255,0.42)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  };
}

function upgradeStatus(
  unlocked: boolean,
  current: boolean,
  selected: boolean,
  accent: string,
): CSSProperties {
  return {
    margin: 0,
    color: current
      ? accent
      : selected
        ? "#7ee8ff"
        : unlocked
          ? "#86efac"
          : "rgba(255,255,255,0.4)",
    fontSize: "9px",
    letterSpacing: "0.14em",
    fontWeight: 900,
  };
}

const upgradeRowDescription: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.56)",
  fontSize: "12px",
  lineHeight: 1.4,
};

function customGrid(isMobile: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
    gap: "9px",
  };
}

function customCard(isDefault: boolean, accent: string): CSSProperties {
  const effectiveAccent = accent === "transparent" ? "#7ee8ff" : accent;

  return {
    borderRadius: "15px",
    border: isDefault
      ? `1px solid ${effectiveAccent}88`
      : "1px solid rgba(255,255,255,0.07)",
    background: isDefault
      ? "rgba(126,232,255,0.08)"
      : "rgba(255,255,255,0.025)",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "50px minmax(0,1fr) auto",
    gap: "10px",
    alignItems: "center",
    opacity: isDefault ? 1 : 0.48,
  };
}

const swatch: CSSProperties = {
  width: "50px",
  height: "50px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const customName: CSSProperties = {
  margin: 0,
  fontWeight: 800,
  fontSize: "14px",
};

const customDescription: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.48)",
  fontSize: "10px",
  lineHeight: 1.35,
};

function customActionButton(isDefault: boolean): CSSProperties {
  return {
    minWidth: "78px",
    minHeight: "36px",
    borderRadius: "10px",
    border: isDefault
      ? "1px solid rgba(134,239,172,0.36)"
      : "1px solid rgba(255,255,255,0.1)",
    background: isDefault ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
    color: isDefault ? "#86efac" : "rgba(255,255,255,0.42)",
    padding: "0 10px",
    fontSize: "11px",
    fontWeight: 900,
    cursor: "default",
  };
}

const loadingFill: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.7)",
};

const loginCard: CSSProperties = {
  width: "min(520px,calc(100% - 28px))",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(5,18,42,0.9)",
  padding: "28px",
  textAlign: "center",
};

const primaryButton: CSSProperties = {
  minHeight: "46px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 20px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
};
