"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  coreUpgradeTrack,
  getCoreRoverProgress,
} from "@/lib/coreRoverProgress";
import {
  DEFAULT_ROVER_LOADOUT,
  getRoverCustomisationItem,
  getRoverCustomisationItems,
  roverCustomisationItems,
  type RoverCustomisationCategory,
  type RoverCustomisationItem,
  type RoverLoadout,
} from "@/lib/roverCustomisation";

const COURSE_ID = "skyforge-test-track-01";

type GarageTab = "upgrades" | "custom";
type ScreenMode = "desktop" | "tablet" | "mobile";

type PurchaseRow = {
  success: boolean;
  result_message: string;
  new_balance: number;
  equipped_key: string | null;
};

type EquipRow = {
  success: boolean;
  result_message: string;
  equipped_key: string | null;
};

type SummaryRow = {
  rank: number | string;
  best_score: number;
  best_time_ms: number;
  orbs_collected: number;
  rover_stage: number;
  completed_at: string;
};

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
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [completedMissionCount, setCompletedMissionCount] = useState(0);
  const [ownedKeys, setOwnedKeys] = useState<Set<string>>(new Set());
  const [loadout, setLoadout] =
    useState<RoverLoadout>(DEFAULT_ROVER_LOADOUT);

  const [rank, setRank] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [bestTimeMs, setBestTimeMs] = useState<number | null>(null);
  const [orbsCollected, setOrbsCollected] = useState<number | null>(null);

  const progress = useMemo(
    () => getCoreRoverProgress(completedMissionCount),
    [completedMissionCount]
  );

  const currentColor =
    getRoverCustomisationItem(loadout.colorKey) ??
    getRoverCustomisationItem(DEFAULT_ROVER_LOADOUT.colorKey)!;

  const currentTrail =
    getRoverCustomisationItem(loadout.trailKey) ??
    getRoverCustomisationItem(DEFAULT_ROVER_LOADOUT.trailKey)!;

  const currentDecal =
    getRoverCustomisationItem(loadout.decalKey) ??
    getRoverCustomisationItem(DEFAULT_ROVER_LOADOUT.decalKey)!;

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

    const [
      tokensResult,
      attemptsResult,
      ownedResult,
      loadoutResult,
      summaryResult,
    ] = await Promise.all([
      supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual"),

      supabase
        .from("core_mission_attempts")
        .select("quiz_id, tokens_earned")
        .eq("user_id", user.id)
        .gt("tokens_earned", 0),

      supabase
        .from("user_rover_customisations")
        .select("item_key")
        .eq("user_id", user.id),

      supabase
        .from("user_rover_loadouts")
        .select("color_key, trail_key, decal_key")
        .eq("user_id", user.id)
        .maybeSingle(),

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
          0
        ) || 0
      );
    }

    if (attemptsResult.error) {
      console.warn(
        "Could not load rover progress:",
        attemptsResult.error.message
      );
    } else {
      const completed = new Set(
        (attemptsResult.data ?? []).map((row) => row.quiz_id)
      );
      setCompletedMissionCount(completed.size);
    }

    if (ownedResult.error) {
      console.warn(
        "Could not load rover purchases:",
        ownedResult.error.message
      );
    } else {
      const keys = new Set(
        (ownedResult.data ?? []).map((row) => row.item_key)
      );
      for (const item of roverCustomisationItems) {
        if (item.price === 0) keys.add(item.key);
      }
      setOwnedKeys(keys);
    }

    if (loadoutResult.error) {
      console.warn(
        "Could not load rover loadout:",
        loadoutResult.error.message
      );
    } else if (loadoutResult.data) {
      setLoadout({
        colorKey:
          loadoutResult.data.color_key ?? DEFAULT_ROVER_LOADOUT.colorKey,
        trailKey:
          loadoutResult.data.trail_key ?? DEFAULT_ROVER_LOADOUT.trailKey,
        decalKey:
          loadoutResult.data.decal_key ?? DEFAULT_ROVER_LOADOUT.decalKey,
      });
    } else {
      setLoadout(DEFAULT_ROVER_LOADOUT);
    }

    if (summaryResult.error) {
      console.warn(
        "Could not load rover rank summary:",
        summaryResult.error.message
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

    function handleTokenUpdate() {
      void loadGarage();
    }

    window.addEventListener("dream-tokens-updated", handleTokenUpdate);

    return () => {
      window.removeEventListener("dream-tokens-updated", handleTokenUpdate);
    };
  }, [loadGarage]);

  async function purchaseOrEquip(item: RoverCustomisationItem) {
    if (!userId || actionKey) return;

    setActionKey(item.key);
    setMessage("");

    const owned = ownedKeys.has(item.key) || item.price === 0;

    if (owned) {
      const { data, error } = await supabase.rpc(
        "equip_rover_customisation",
        {
          p_item_key: item.key,
        }
      );

      if (error) {
        setMessage(`Could not equip this item: ${error.message}`);
        setActionKey(null);
        return;
      }

      const row = ((data ?? []) as EquipRow[])[0];
      setMessage(row?.result_message || "Customisation equipped.");
    } else {
      const { data, error } = await supabase.rpc(
        "purchase_rover_customisation",
        {
          p_item_key: item.key,
        }
      );

      if (error) {
        setMessage(`Could not complete purchase: ${error.message}`);
        setActionKey(null);
        return;
      }

      const row = ((data ?? []) as PurchaseRow[])[0];

      if (!row?.success) {
        setMessage(row?.result_message || "Purchase was not completed.");
        setActionKey(null);
        return;
      }

      setMessage(row.result_message);
      setTokenBalance(Number(row.new_balance));
    }

    await loadGarage();
    setActionKey(null);
  }

  function equipped(item: RoverCustomisationItem) {
    if (item.category === "color") return loadout.colorKey === item.key;
    if (item.category === "trail") return loadout.trailKey === item.key;
    return loadout.decalKey === item.key;
  }

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
        <header style={topHeader}>
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
            <a href="/login" style={{ ...primaryButton, textDecoration: "none" }}>
              Log In
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageBackground}>
      <header style={topHeader}>
        <button
          type="button"
          onClick={() => router.push("/learning-missions/core")}
          style={headerButton}
        >
          ← Core Missions
        </button>

        <div style={{ textAlign: "center" }}>
          <p style={headerEyebrow}>SKYFORGE HANGAR</p>
          <h1 style={headerTitle}>My Rover</h1>
        </div>

        <div style={headerRight}>
          <div style={balancePill}>
            <span style={{ color: "#ffd76a" }}>DT</span>
            {tokenBalance}
          </div>
          <button
            type="button"
            onClick={() =>
              router.push("/learning-missions/core/rover-challenge")
            }
            style={challengeHeaderButton}
          >
            Rover Challenge ›
          </button>
        </div>
      </header>

      <section style={garageShell(isMobile)}>
        <div style={previewColumn(isCompact)}>
          <div style={previewCard(progress.currentUpgrade.accent)}>
            <div style={previewTopRow}>
              <div>
                <p style={smallEyebrow}>CURRENT BUILD</p>
                <h2 style={currentBuildTitle}>
                  Stage {progress.currentUpgrade.stage} ·{" "}
                  {progress.currentUpgrade.name}
                </h2>
              </div>
              <div style={rankPill(rank)}>
                {rank ? `Rank #${rank}` : "Unranked"}
              </div>
            </div>

            <RoverPreview
              imageSrc={progress.currentUpgrade.imageSrc}
              color={currentColor}
              trail={currentTrail}
              decal={currentDecal}
              isMobile={isMobile}
            />

            <p style={upgradeDescription}>
              {progress.currentUpgrade.description}
            </p>

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

          {message && <div style={messageBanner}>{message}</div>}

          {tab === "upgrades" ? (
            <UpgradeTrack completedMissionCount={completedMissionCount} />
          ) : (
            <CustomBuildPanel
              tokenBalance={tokenBalance}
              ownedKeys={ownedKeys}
              equipped={equipped}
              actionKey={actionKey}
              onChoose={(item) => void purchaseOrEquip(item)}
              isMobile={isMobile}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function RoverPreview({
  imageSrc,
  color,
  trail,
  decal,
  isMobile,
}: {
  imageSrc: string;
  color: RoverCustomisationItem;
  trail: RoverCustomisationItem;
  decal: RoverCustomisationItem;
  isMobile: boolean;
}) {
  const hasTrail = trail.key !== "trail-none";

  return (
    <div style={previewStage(isMobile)}>
      {hasTrail && (
        <>
          <div
            style={{
              ...trailGlow,
              background: `linear-gradient(90deg, transparent, ${trail.previewColor}, ${
                trail.secondaryColor || trail.previewColor
              })`,
              boxShadow: `0 0 28px ${trail.previewColor}`,
            }}
          />
          <div
            style={{
              ...trailCore,
              background: `linear-gradient(90deg, transparent, ${
                trail.secondaryColor || trail.previewColor
              })`,
            }}
          />
        </>
      )}

      <img
        src={imageSrc}
        alt="Current Skyforge Rover"
        draggable={false}
        style={roverImage}
      />

      <div
        aria-hidden="true"
        style={{
          ...roverTintMask,
          background: `linear-gradient(135deg, ${color.previewColor}, ${
            color.secondaryColor || color.previewColor
          })`,
          WebkitMaskImage: `url("${imageSrc}")`,
          maskImage: `url("${imageSrc}")`,
        }}
      />

      {decal.icon && (
        <div
          style={{
            ...decalBadge,
            color: decal.previewColor,
            textShadow: `0 0 16px ${decal.previewColor}`,
          }}
        >
          {decal.icon}
        </div>
      )}

      <div style={loadoutLabels}>
        <span>{color.name}</span>
        <span>{trail.name}</span>
        <span>{decal.name}</span>
      </div>
    </div>
  );
}

function UpgradeTrack({
  completedMissionCount,
}: {
  completedMissionCount: number;
}) {
  return (
    <div style={scrollPanel}>
      <div style={panelHeading}>
        <p style={smallEyebrow}>MISSION UNLOCKS</p>
        <h2 style={{ margin: "7px 0 0" }}>Rover Upgrade Track</h2>
        <p style={panelDescription}>
          Complete new Core Mission quizzes to unlock performance upgrades.
          Replays do not add progress.
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

          return (
            <div
              key={upgrade.stage}
              style={upgradeRow(unlocked, current, upgrade.accent)}
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

              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={upgradeStatus(unlocked, current, upgrade.accent)}>
                  {current
                    ? "CURRENT BUILD"
                    : unlocked
                    ? "UNLOCKED"
                    : `${upgrade.missionsRequired} MISSIONS`}
                </p>
                <h3 style={{ margin: "5px 0 0", fontSize: "18px" }}>
                  {upgrade.name}
                </h3>
                <p style={upgradeRowDescription}>{upgrade.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomBuildPanel({
  tokenBalance,
  ownedKeys,
  equipped,
  actionKey,
  onChoose,
  isMobile,
}: {
  tokenBalance: number;
  ownedKeys: Set<string>;
  equipped: (item: RoverCustomisationItem) => boolean;
  actionKey: string | null;
  onChoose: (item: RoverCustomisationItem) => void;
  isMobile: boolean;
}) {
  const categories: {
    id: RoverCustomisationCategory;
    title: string;
    description: string;
  }[] = [
    {
      id: "color",
      title: "Rover Colour",
      description: "Change the main Skyforge finish.",
    },
    {
      id: "trail",
      title: "Energy Trail",
      description: "Choose the light trail behind your rover.",
    },
    {
      id: "decal",
      title: "Body Decal",
      description: "Add an emblem to your build.",
    },
  ];

  return (
    <div style={scrollPanel}>
      <div style={panelHeading}>
        <p style={smallEyebrow}>COSMETIC CUSTOMISATION</p>
        <h2 style={{ margin: "7px 0 0" }}>Custom Build</h2>
        <p style={panelDescription}>
          Cosmetic options use Dreamscape Tokens but do not improve rover
          performance. Balance: <strong>{tokenBalance} DT</strong>
        </p>
      </div>

      <div style={{ display: "grid", gap: "18px" }}>
        {categories.map((category) => (
          <section key={category.id}>
            <h3 style={{ margin: 0, fontSize: "19px" }}>{category.title}</h3>
            <p style={{ margin: "5px 0 10px", opacity: 0.58, fontSize: "13px" }}>
              {category.description}
            </p>

            <div style={customGrid(isMobile)}>
              {getRoverCustomisationItems(category.id).map((item) => {
                const isOwned = ownedKeys.has(item.key) || item.price === 0;
                const isEquipped = equipped(item);
                const isWorking = actionKey === item.key;
                const canAfford = tokenBalance >= item.price;

                return (
                  <div
                    key={item.key}
                    style={customCard(isEquipped, item.previewColor)}
                  >
                    <CustomSwatch item={item} />

                    <div style={{ minWidth: 0 }}>
                      <p style={customName}>{item.name}</p>
                      <p style={customDescription}>{item.description}</p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        isEquipped ||
                        Boolean(actionKey) ||
                        (!isOwned && !canAfford)
                      }
                      onClick={() => onChoose(item)}
                      style={customActionButton(
                        isEquipped,
                        isOwned,
                        !isOwned && !canAfford
                      )}
                    >
                      {isWorking
                        ? "Saving..."
                        : isEquipped
                        ? "Equipped"
                        : isOwned
                        ? "Equip"
                        : canAfford
                        ? `${item.price} DT`
                        : `Need ${item.price} DT`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CustomSwatch({ item }: { item: RoverCustomisationItem }) {
  if (item.category === "decal") {
    return (
      <div
        style={{
          ...swatch,
          color: item.previewColor,
          fontSize: "28px",
          textShadow: `0 0 14px ${item.previewColor}`,
        }}
      >
        {item.icon || "—"}
      </div>
    );
  }

  if (item.category === "trail" && item.key !== "trail-none") {
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
              ? "rgba(255,255,255,0.08)"
              : `linear-gradient(135deg, ${item.previewColor}, ${
                  item.secondaryColor || item.previewColor
                })`,
          border: "1px solid rgba(255,255,255,0.25)",
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
    linear-gradient(180deg, rgba(2,8,19,0.58), rgba(2,8,19,0.94)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const topHeader: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  minHeight: "68px",
  padding: "10px 18px",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: "12px",
  borderBottom: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(2,8,19,0.78)",
  backdropFilter: "blur(18px)",
};

const headerButton: CSSProperties = {
  justifySelf: "start",
  minHeight: "40px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 15px",
  cursor: "pointer",
  fontWeight: 700,
};

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

const headerRight: CSSProperties = {
  justifySelf: "end",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const balancePill: CSSProperties = {
  minHeight: "40px",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.28)",
  background: "rgba(255,215,106,0.08)",
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
  gap: "7px",
  fontWeight: 900,
};

const challengeHeaderButton: CSSProperties = {
  ...headerButton,
  border: "1px solid rgba(126,232,255,0.45)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
};

function garageShell(isMobile: boolean): CSSProperties {
  return {
    width: "min(1500px,100%)",
    margin: "0 auto",
    padding: isMobile ? "12px" : "22px",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(360px,0.92fr) minmax(0,1.25fr)",
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
  filter: "drop-shadow(0 24px 34px rgba(0,0,0,0.55)) saturate(0.85)",
};

const roverTintMask: CSSProperties = {
  position: "absolute",
  zIndex: 5,
  width: "88%",
  height: "80%",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  mixBlendMode: "color",
  opacity: 0.65,
  pointerEvents: "none",
};

const trailGlow: CSSProperties = {
  position: "absolute",
  zIndex: 1,
  left: "7%",
  top: "51%",
  width: "44%",
  height: "28px",
  borderRadius: "999px",
  filter: "blur(8px)",
  opacity: 0.85,
  transform: "skewX(-20deg)",
};

const trailCore: CSSProperties = {
  position: "absolute",
  zIndex: 2,
  left: "10%",
  top: "54%",
  width: "38%",
  height: "7px",
  borderRadius: "999px",
  opacity: 0.9,
  transform: "skewX(-20deg)",
};

const decalBadge: CSSProperties = {
  position: "absolute",
  zIndex: 8,
  left: "53%",
  top: "47%",
  transform: "translate(-50%,-50%)",
  fontSize: "clamp(32px,5vw,54px)",
  fontWeight: 900,
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
  background:
    "linear-gradient(145deg, rgba(5,18,42,0.88), rgba(8,26,58,0.94))",
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

const messageBanner: CSSProperties = {
  margin: "12px 14px 0",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(126,232,255,0.07)",
  color: "#c9f9ff",
  padding: "10px 12px",
  fontSize: "12px",
};

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
  accent: string
): CSSProperties {
  return {
    borderRadius: "16px",
    border: current
      ? `1px solid ${accent}88`
      : unlocked
      ? "1px solid rgba(134,239,172,0.22)"
      : "1px solid rgba(255,255,255,0.08)",
    background: current
      ? `linear-gradient(135deg, ${accent}18, rgba(255,255,255,0.04))`
      : "rgba(255,255,255,0.035)",
    padding: "11px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    opacity: unlocked ? 1 : 0.58,
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
  accent: string
): CSSProperties {
  return {
    margin: 0,
    color: current ? accent : unlocked ? "#86efac" : "rgba(255,255,255,0.4)",
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
    gridTemplateColumns: isMobile
      ? "1fr"
      : "repeat(2,minmax(0,1fr))",
    gap: "9px",
  };
}

function customCard(equipped: boolean, accent: string): CSSProperties {
  return {
    borderRadius: "15px",
    border: equipped
      ? `1px solid ${accent === "transparent" ? "#7ee8ff" : accent}88`
      : "1px solid rgba(255,255,255,0.09)",
    background: equipped
      ? "rgba(126,232,255,0.08)"
      : "rgba(255,255,255,0.035)",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "50px minmax(0,1fr) auto",
    gap: "10px",
    alignItems: "center",
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

function customActionButton(
  equipped: boolean,
  owned: boolean,
  unaffordable: boolean
): CSSProperties {
  return {
    minWidth: "78px",
    minHeight: "36px",
    borderRadius: "10px",
    border: equipped
      ? "1px solid rgba(134,239,172,0.36)"
      : "1px solid rgba(126,232,255,0.24)",
    background: equipped
      ? "rgba(34,197,94,0.15)"
      : owned
      ? "rgba(126,232,255,0.1)"
      : "linear-gradient(135deg, #35c5ff, #4c6dff)",
    color: equipped
      ? "#86efac"
      : unaffordable
      ? "rgba(255,255,255,0.34)"
      : "white",
    padding: "0 10px",
    fontSize: "11px",
    fontWeight: 900,
    cursor: equipped || unaffordable ? "default" : "pointer",
    opacity: unaffordable ? 0.6 : 1,
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
