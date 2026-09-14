"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { coreUpgradeTrack } from "@/lib/coreRoverProgress";
import {
  getEffectiveRoverRatings,
  getRoverBaseRatings,
  isRoverPerformanceCategory,
  roverPerformanceCategories,
  type RoverCustomBuildCategory,
  type RoverPerformanceBuildRow,
  type RoverPerformanceCategory,
  type RoverPerformanceLevels,
  type RoverPerformancePurchaseRow,
} from "@/lib/coreRoverPerformance";
import type {
  RoverLevelAccess,
  RoverLevelId,
} from "../rover-challenge/levels";

const COURSE_ID = "skyforge-test-track-01";

type RoverOrigin = "core" | "nova";

const ROVER_ORIGIN_STORAGE_KEY = "dreamscape-rover-origin";
const ROVER_NOVA_RETURN_PATH_STORAGE_KEY =
  "dreamscape-rover-nova-return-path";

function isRoverOrigin(value: string | null): value is RoverOrigin {
  return value === "core" || value === "nova";
}

function getStoredRoverOrigin(): RoverOrigin | null {
  if (typeof window === "undefined") return null;

  const storedOrigin = window.sessionStorage.getItem(
    ROVER_ORIGIN_STORAGE_KEY,
  );

  return isRoverOrigin(storedOrigin) ? storedOrigin : null;
}

function getNovaReturnPath() {
  /*
   * Nova's World now lives at /inventor.
   *
   * Older sessions may still contain /nova or /nova-world in
   * dreamscape-rover-nova-return-path. Do not trust those legacy values:
   * they point to retired routes and can produce a 404.
   */
  return "/inventor";
}

type GarageTab = "courses" | "upgrades" | "custom";
type GarageView = "hangar" | "expeditions";
type ScreenMode = "desktop" | "tablet" | "mobile";

type SummaryRow = {
  rank: number | string;
  best_score: number;
  best_time_ms: number;
  orbs_collected: number;
  rover_stage: number;
  completed_at: string;
};

type LeaderboardRow = SummaryRow & {
  user_id: string;
  username: string;
};

type LeaderboardsByLevel = Record<RoverLevelId, LeaderboardRow[]>;

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

type CoreRoverOwnershipRow = {
  stage: number;
  acquisition_method: "starter" | "legacy" | "purchase" | null;
  dt_spent: number | null;
  acquired_at: string | null;
};

type RoverCatalogRow = {
  stage: number;
  rover_number: number;
  display_name: string;
  price_dt: number;
  owned: boolean;
  equipped: boolean;
  previous_stage_owned: boolean;
  can_purchase: boolean;
  can_afford: boolean;
  dt_balance: number;
  acquisition_method: "starter" | "legacy" | "purchase" | null;
  dt_spent: number | null;
  acquired_at: string | null;
  admin_access: boolean;
};

type RoverPurchaseRow = {
  success: boolean;
  purchased_stage: number;
  dt_cost: number;
  new_balance: number;
  transaction_id: string | null;
  result_message: string;
  equipped_stage: number;
  max_owned_stage: number;
};

type RoverCourseMeta = {
  id: RoverLevelId;
  courseId: string;
  title: string;
  description: string;
  orbTotal: number;
};

const ROVER_COURSES: RoverCourseMeta[] = [
  {
    id: 1,
    courseId: "skyforge-test-track-01",
    title: "Skyforge Test Track",
    description:
      "Master the controls, clear both gaps and reach all three checkpoints.",
    orbTotal: 8,
  },
  {
    id: 2,
    courseId: "dreamkeeper-divide-02",
    title: "Dreamkeeper Divide",
    description:
      "Choose the faster upper jump or the longer lower road, then survive the Dreamkeeper's dynamite traps.",
    orbTotal: 8,
  },
  {
    id: 3,
    courseId: "dreamkeeper-gauntlet-03",
    title: "Dreamkeeper's Gauntlet",
    description:
      "Time the pulse gates, cross the broken road and survive the Dreamkeeper's final ambush.",
    orbTotal: 8,
  },
  {
    id: 4,
    courseId: "fracture-run-04",
    title: "Fracture Run",
    description:
      "Keep moving across unstable roads as the Dreamkeeper tears the course apart.",
    orbTotal: 9,
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

  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    function updateOrientation() {
      setIsPortrait(window.innerHeight > window.innerWidth);
    }

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const shouldRotate =
    screenMode !== "desktop" && isPortrait;

  const [roverOrigin, setRoverOrigin] = useState<RoverOrigin>("core");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedOrigin = query.get("from");
    const nextOrigin = isRoverOrigin(requestedOrigin)
      ? requestedOrigin
      : getStoredRoverOrigin() ?? "core";

    setRoverOrigin(nextOrigin);
    window.sessionStorage.setItem(ROVER_ORIGIN_STORAGE_KEY, nextOrigin);

    if (requestedOrigin === "core") {
      window.sessionStorage.removeItem(ROVER_NOVA_RETURN_PATH_STORAGE_KEY);
    }
  }, []);

  function goBack() {
    if (garageView === "expeditions") {
      setGarageView("hangar");
      return;
    }

    const destination =
      roverOrigin === "nova" ? getNovaReturnPath() : "/learning-missions/core";

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ROVER_ORIGIN_STORAGE_KEY);
      window.sessionStorage.removeItem(ROVER_NOVA_RETURN_PATH_STORAGE_KEY);
    }

    router.push(destination);
  }

  function openRoverChallenge(level: RoverLevelId) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ROVER_ORIGIN_STORAGE_KEY, roverOrigin);
    }

    router.push(`/learning-missions/core/rover-challenge/${level}`);
  }

  const [tab, setTab] = useState<GarageTab>("custom");
  const [garageView, setGarageView] = useState<GarageView>("hangar");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [tokenBalance, setTokenBalance] = useState(0);
  const [dreamGemBalance, setDreamGemBalance] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const [roverCatalog, setRoverCatalog] = useState<RoverCatalogRow[]>([]);
  const [equippedStage, setEquippedStage] = useState(0);
  const [highestOwnedStage, setHighestOwnedStage] = useState(0);
  const [selectedUpgradeStage, setSelectedUpgradeStage] = useState<
    number | null
  >(null);

  const [savingRoverStage, setSavingRoverStage] = useState<number | null>(null);
  const [purchasingRoverStage, setPurchasingRoverStage] = useState<
    number | null
  >(null);

  const [loadoutMessage, setLoadoutMessage] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");

  const [rank, setRank] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [bestTimeMs, setBestTimeMs] = useState<number | null>(null);
  const [orbsCollected, setOrbsCollected] = useState<number | null>(null);

  const [levelAccess, setLevelAccess] = useState<RoverLevelAccess[]>([]);

  const [leaderboards, setLeaderboards] = useState<LeaderboardsByLevel>({
    1: [],
    2: [],
    3: [],
    4: [],
  });

  const [courseLoadMessage, setCourseLoadMessage] = useState("");
  const [courseActionMessage, setCourseActionMessage] = useState("");
  const [purchasingLevel, setPurchasingLevel] =
    useState<RoverLevelId | null>(null);

  const [performanceBuild, setPerformanceBuild] =
    useState<RoverPerformanceBuildRow[]>([]);
  const [performanceMessage, setPerformanceMessage] = useState("");
  const [purchasingPerformanceCategory, setPurchasingPerformanceCategory] =
    useState<RoverCustomBuildCategory | null>(null);
  const [
    confirmingPerformanceCategory,
    setConfirmingPerformanceCategory,
  ] = useState<RoverCustomBuildCategory | null>(null);
  const [novaGuideOpen, setNovaGuideOpen] = useState(false);

  useEffect(() => {
    setConfirmingPerformanceCategory(null);
  }, [equippedStage]);

  const displayedUpgrade = useMemo(() => {
    const requestedStage = selectedUpgradeStage ?? equippedStage;

    return (
      coreUpgradeTrack.find(
        (upgrade) => upgrade.stage === requestedStage,
      ) ??
      coreUpgradeTrack.find(
        (upgrade) => upgrade.stage === equippedStage,
      ) ??
      coreUpgradeTrack[0]
    );
  }, [equippedStage, selectedUpgradeStage]);

  const displayedCatalog = useMemo(
    () =>
      roverCatalog.find(
        (row) => Number(row.stage) === displayedUpgrade.stage,
      ),
    [displayedUpgrade.stage, roverCatalog],
  );

  const viewingEquippedBuild = displayedUpgrade.stage === equippedStage;

  const weaponsUnlocked = Boolean(
    levelAccess.find((row) => Number(row.level_id) === 4)?.completed,
  );

  const ownedRoverCount = useMemo(() => {
    if (isAdmin) return coreUpgradeTrack.length;
    return roverCatalog.filter((row) => Boolean(row.owned)).length;
  }, [isAdmin, roverCatalog]);

  const nextPurchasableRover = useMemo(
    () =>
      roverCatalog.find(
        (row) => !row.owned && row.can_purchase,
      ) ?? null,
    [roverCatalog],
  );

  const loadGarage = useCallback(
    async ({
      showLoading = true,
    }: {
      showLoading?: boolean;
    } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

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
        catalogResult,
        ownershipResult,
        tokensResult,
        profileResult,
        loadoutResult,
        summaryResult,
        accessResult,
        performanceResult,
        levelOneLeaderboardResult,
        levelTwoLeaderboardResult,
        levelThreeLeaderboardResult,
        levelFourLeaderboardResult,
      ] = await Promise.all([
        supabase.rpc("get_my_core_rover_catalog"),

        supabase
          .from("core_rover_ownership")
          .select("stage,acquisition_method,dt_spent,acquired_at")
          .eq("user_id", user.id),

        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),

        supabase
          .from("profiles")
          .select("dream_gem_balance,role,tier")
          .eq("id", user.id)
          .maybeSingle(),

        supabase.rpc("get_my_core_rover_loadout"),

        supabase.rpc("get_my_rover_challenge_summary", {
          p_course_id: COURSE_ID,
        }),

        supabase.rpc("get_rover_level_access"),

        supabase.rpc("get_my_rover_performance_build"),

        supabase.rpc("get_rover_challenge_visible_leaderboard", {
          p_course_id: "skyforge-test-track-01",
          p_limit: 10,
        }),

        supabase.rpc("get_rover_challenge_visible_leaderboard", {
          p_course_id: "dreamkeeper-divide-02",
          p_limit: 10,
        }),

        supabase.rpc("get_rover_challenge_visible_leaderboard", {
          p_course_id: "dreamkeeper-gauntlet-03",
          p_limit: 10,
        }),

        supabase.rpc("get_rover_challenge_visible_leaderboard", {
          p_course_id: "fracture-run-04",
          p_limit: 10,
        }),
      ]);

      const resolvedRole = String(
        profileResult.data?.role ?? profileResult.data?.tier ?? "",
      )
        .trim()
        .toLowerCase();

      const resolvedAdmin = resolvedRole === "admin";

      if (profileResult.error) {
        console.warn(
          "Could not load profile balances:",
          profileResult.error.message,
        );
        setDreamGemBalance(0);
      } else {
        setDreamGemBalance(
          Math.max(0, Number(profileResult.data?.dream_gem_balance || 0)),
        );
      }

      let catalogRows: RoverCatalogRow[] = [];

      const fallbackTokenBalance =
        tokensResult.data?.reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0,
        ) || 0;

      const fallbackSelectedStage = Number(
        ((loadoutResult.data ?? []) as RoverLoadoutRow[])[0]?.selected_stage ?? 0,
      );

      if (catalogResult.error) {
        console.warn(
          "Could not load rover ownership catalogue RPC; using direct ownership fallback:",
          catalogResult.error.message,
        );

        const ownershipRows = ownershipResult.error
          ? []
          : ((ownershipResult.data ?? []) as CoreRoverOwnershipRow[]);

        const ownershipByStage = new Map(
          ownershipRows.map((row) => [Number(row.stage), row]),
        );

        catalogRows = coreUpgradeTrack.map((upgrade) => {
          const row = ownershipByStage.get(upgrade.stage);
          const owned =
            resolvedAdmin || upgrade.stage === 0 || Boolean(row);
          const previousStageOwned =
            resolvedAdmin ||
            upgrade.stage === 0 ||
            upgrade.stage === 1 ||
            ownershipByStage.has(upgrade.stage - 1);

          return {
            stage: upgrade.stage,
            rover_number: upgrade.roverNumber,
            display_name: upgrade.name,
            price_dt: upgrade.priceDt,
            owned,
            equipped: fallbackSelectedStage === upgrade.stage,
            previous_stage_owned: previousStageOwned,
            can_purchase:
              !resolvedAdmin &&
              !owned &&
              upgrade.stage > 0 &&
              previousStageOwned,
            can_afford: fallbackTokenBalance >= upgrade.priceDt,
            dt_balance: fallbackTokenBalance,
            acquisition_method:
              upgrade.stage === 0
                ? "starter"
                : row?.acquisition_method ?? null,
            dt_spent: row?.dt_spent ?? null,
            acquired_at: row?.acquired_at ?? null,
            admin_access: resolvedAdmin,
          };
        });

        setRoverCatalog(catalogRows);
        setTokenBalance(Math.max(0, fallbackTokenBalance));

        if (ownershipResult.error && !resolvedAdmin) {
          console.warn(
            "Direct rover ownership fallback also failed:",
            ownershipResult.error.message,
          );
        }

        // Do not expose the old migration-stage warning to users.
        // The repair SQL supplied with this release fixes the RPCs themselves.
        setPurchaseMessage("");
      } else {
        catalogRows = (catalogResult.data ?? []) as RoverCatalogRow[];
        setRoverCatalog(catalogRows);

        const catalogBalance = Number(catalogRows[0]?.dt_balance);

        if (Number.isFinite(catalogBalance)) {
          setTokenBalance(Math.max(0, catalogBalance));
        }

        setPurchaseMessage("");
      }

      if (
        catalogResult.error ||
        catalogRows.length === 0 ||
        !Number.isFinite(Number(catalogRows[0]?.dt_balance))
      ) {
        if (tokensResult.error) {
          console.warn(
            "Could not load fallback DT balance:",
            tokensResult.error.message,
          );
        } else {
          setTokenBalance(
            tokensResult.data?.reduce(
              (sum, row) => sum + Number(row.amount || 0),
              0,
            ) || 0,
          );
        }
      }

      if (loadoutResult.error) {
        console.warn(
          "Could not load equipped rover:",
          loadoutResult.error.message,
        );

        const fallbackOwnedStages = catalogRows
          .filter((row) => Boolean(row.owned))
          .map((row) => Number(row.stage));

        const fallbackHighest =
          fallbackOwnedStages.length > 0
            ? Math.max(...fallbackOwnedStages)
            : 0;

        const fallbackEquipped =
          catalogRows.find((row) => Boolean(row.equipped))?.stage ??
          fallbackHighest;

        setHighestOwnedStage(fallbackHighest);
        setEquippedStage(Number(fallbackEquipped));
        setSelectedUpgradeStage(Number(fallbackEquipped));
        setIsAdmin(
          Boolean(
            catalogRows.some((row) => row.admin_access) ||
              resolvedAdmin,
          ),
        );
        setLoadoutMessage(
          "Equipped rover data could not be loaded. Run the supplied Rover Ownership repair SQL.",
        );
      } else {
        const loadout = ((loadoutResult.data ?? []) as RoverLoadoutRow[])[0];

        const resolvedStage = Number(loadout?.selected_stage ?? 0);
        const resolvedHighest = Number(
          loadout?.max_unlocked_stage ?? 0,
        );
        const adminAccess = Boolean(
          loadout?.admin_access ||
            catalogRows.some((row) => row.admin_access) ||
            resolvedAdmin,
        );

        setEquippedStage(resolvedStage);
        setHighestOwnedStage(
          adminAccess
            ? coreUpgradeTrack[coreUpgradeTrack.length - 1].stage
            : Math.max(0, resolvedHighest),
        );
        setSelectedUpgradeStage((current) =>
          current === null ? resolvedStage : current,
        );
        setIsAdmin(adminAccess);
        setLoadoutMessage("");
      }

      if (performanceResult.error) {
        console.warn(
          "Could not load rover performance build:",
          performanceResult.error.message,
        );
        setPerformanceBuild([]);
        setPerformanceMessage(
          "Custom Build could not be loaded. Run the Rover Performance Custom Build SQL in Supabase.",
        );
      } else {
        const rows = (performanceResult.data ?? []) as RoverPerformanceBuildRow[];
        setPerformanceBuild(rows);
        setPerformanceMessage("");

        const performanceBalance = Number(rows[0]?.dt_balance);
        if (Number.isFinite(performanceBalance)) {
          setTokenBalance(Math.max(0, performanceBalance));
        }
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

      if (accessResult.error) {
        console.warn(
          "Could not load rover courses:",
          accessResult.error.message,
        );
        setLevelAccess([]);
        setCourseLoadMessage(
          "Expedition access is unavailable. Run the supplied Rover Ownership repair SQL.",
        );
      } else {
        setLevelAccess((accessResult.data ?? []) as RoverLevelAccess[]);
        setCourseLoadMessage("");
      }

      const leaderboardError =
        levelOneLeaderboardResult.error ||
        levelTwoLeaderboardResult.error ||
        levelThreeLeaderboardResult.error ||
        levelFourLeaderboardResult.error;

      if (leaderboardError) {
        console.warn(
          "Could not load rover leaderboard:",
          leaderboardError.message,
        );
        setLeaderboards({ 1: [], 2: [], 3: [], 4: [] });
      } else {
        setLeaderboards({
          1: (levelOneLeaderboardResult.data ?? []) as LeaderboardRow[],
          2: (levelTwoLeaderboardResult.data ?? []) as LeaderboardRow[],
          3: (levelThreeLeaderboardResult.data ?? []) as LeaderboardRow[],
          4: (levelFourLeaderboardResult.data ?? []) as LeaderboardRow[],
        });
      }

      setLoading(false);
    },
    [],
  );

  const previewRover = useCallback((stage: number) => {
    if (
      coreUpgradeTrack.some(
        (upgrade) => upgrade.stage === stage,
      )
    ) {
      setSelectedUpgradeStage(stage);
      setLoadoutMessage("");
    }
  }, []);

  const selectAndEquipRover = useCallback(
    async (stage: number) => {
      const upgrade = coreUpgradeTrack.find(
        (item) => item.stage === stage,
      );

      const catalogRow = roverCatalog.find(
        (row) => Number(row.stage) === stage,
      );

      if (!upgrade) return;

      const owned = isAdmin || Boolean(catalogRow?.owned);

      if (!owned || savingRoverStage !== null) {
        return;
      }

      const previousEquippedStage = equippedStage;

      setSelectedUpgradeStage(stage);
      setSavingRoverStage(stage);
      setLoadoutMessage("");

      const { data, error } = await supabase.rpc(
        "set_my_core_rover_stage",
        {
          p_stage: stage,
        },
      );

      setSavingRoverStage(null);

      if (error) {
        console.warn("Could not equip rover:", error.message);
        setSelectedUpgradeStage(previousEquippedStage);
        setLoadoutMessage(
          error.message || "This rover could not be equipped.",
        );
        return;
      }

      const loadout = ((data ?? []) as RoverLoadoutRow[])[0];
      const savedStage = Number(loadout?.selected_stage ?? stage);

      setEquippedStage(savedStage);
      setSelectedUpgradeStage(savedStage);
      setHighestOwnedStage(
        isAdmin
          ? coreUpgradeTrack[coreUpgradeTrack.length - 1].stage
          : Number(loadout?.max_unlocked_stage ?? highestOwnedStage),
      );
      setIsAdmin(Boolean(loadout?.admin_access ?? isAdmin));

      window.dispatchEvent(new Event("rover-loadout-updated"));

      await loadGarage({
        showLoading: false,
      });

      setLoadoutMessage(
        `Rover ${stage + 1} · ${upgrade.name} equipped. Rover Expeditions will use this build.`,
      );
    },
    [
      equippedStage,
      highestOwnedStage,
      isAdmin,
      loadGarage,
      roverCatalog,
      savingRoverStage,
    ],
  );

  const purchaseRover = useCallback(
    async (stage: number) => {
      const catalogRow = roverCatalog.find(
        (row) => Number(row.stage) === stage,
      );
      const upgrade = coreUpgradeTrack.find(
        (row) => row.stage === stage,
      );

      if (!catalogRow || !upgrade || catalogRow.owned || isAdmin) {
        return;
      }

      if (!catalogRow.can_purchase) {
        setPurchaseMessage(
          `Purchase Rover ${stage} first to continue the upgrade track.`,
        );
        return;
      }

      const price = Number(catalogRow.price_dt || upgrade.priceDt);

      if (tokenBalance < price) {
        setPurchaseMessage(
          `You need ${price - tokenBalance} more Dream Tokens to purchase Rover ${stage + 1}.`,
        );
        return;
      }

      const confirmed = window.confirm(
        [
          `Purchase Rover ${stage + 1} — ${upgrade.name}?`,
          "",
          `Cost: ${price.toLocaleString("en-SG")} Dream Tokens`,
          `Balance: ${tokenBalance.toLocaleString("en-SG")} → ${(tokenBalance - price).toLocaleString("en-SG")} DT`,
          "",
          "This rover will be permanently owned. You can switch back to any rover you own at any time.",
        ].join("\n"),
      );

      if (!confirmed) return;

      setPurchasingRoverStage(stage);
      setPurchaseMessage("");

      const { data, error } = await supabase.rpc(
        "purchase_core_rover_stage",
        {
          p_stage: stage,
        },
      );

      setPurchasingRoverStage(null);

      if (error) {
        console.warn("Could not purchase rover:", error.message);
        setPurchaseMessage(
          error.message || "This rover could not be purchased.",
        );
        return;
      }

      const result = ((data ?? []) as RoverPurchaseRow[])[0];

      if (!result?.success) {
        setPurchaseMessage(
          result?.result_message ||
            `Rover ${stage + 1} could not be purchased.`,
        );
        return;
      }

      const successMessage =
        result.result_message ||
        `Rover ${stage + 1} purchased permanently.`;

      setTokenBalance(Number(result.new_balance));
      setHighestOwnedStage(Number(result.max_owned_stage));

      window.dispatchEvent(new Event("dream-tokens-updated"));
      window.dispatchEvent(new Event("rover-level-progress-updated"));

      await loadGarage({
        showLoading: false,
      });

      setSelectedUpgradeStage(stage);
      setPurchaseMessage(successMessage);
    },
    [isAdmin, loadGarage, roverCatalog, tokenBalance],
  );

  const purchasePerformanceUpgrade = useCallback(
    async (category: RoverCustomBuildCategory) => {
      if (purchasingPerformanceCategory !== null) return;

      const buildRow = performanceBuild.find(
        (row) => row.category === category,
      );

      if (category === "weapon" && !weaponsUnlocked) {
        setPerformanceMessage(
          "Weapons unlock after you complete Expedition 4 · Fracture Run.",
        );
        return;
      }

      if (!buildRow?.can_purchase || !buildRow.next_level) {
        setPerformanceMessage(
          category === "weapon"
            ? "The equipped rover already has the highest weapon tier available."
            : "This performance stat is already at its maximum for the equipped rover.",
        );
        return;
      }

      const price = Number(buildRow.next_price_dt ?? 0);

      if (tokenBalance < price) {
        setPerformanceMessage(
          `You need ${price - tokenBalance} more Dream Tokens for ${buildRow.next_name}.`,
        );
        return;
      }

      setPurchasingPerformanceCategory(category);
      setPerformanceMessage("");

      const { data, error } = await supabase.rpc(
        "purchase_my_rover_performance_upgrade",
        { p_category: category },
      );

      setPurchasingPerformanceCategory(null);

      if (error) {
        console.warn("Could not purchase rover performance upgrade:", error.message);
        setPerformanceMessage(
          error.message || "The Custom Build upgrade could not be purchased.",
        );
        return;
      }

      const result = ((data ?? []) as RoverPerformancePurchaseRow[])[0];

      if (!result?.success) {
        setPerformanceMessage(
          result?.result_message || "The Custom Build upgrade could not be purchased.",
        );
        return;
      }

      const successMessage = result.result_message;

      setTokenBalance(Number(result.new_balance));
      window.dispatchEvent(new Event("dream-tokens-updated"));
      window.dispatchEvent(new Event("rover-performance-updated"));

      await loadGarage({ showLoading: false });
      setConfirmingPerformanceCategory(null);
      setPerformanceMessage(successMessage);
    },
    [
      equippedStage,
      loadGarage,
      performanceBuild,
      purchasingPerformanceCategory,
      tokenBalance,
      weaponsUnlocked,
    ],
  );

  const purchaseEarlyUnlock = useCallback(
    async (levelId: RoverLevelId) => {
      const access = levelAccess.find(
        (row) => Number(row.level_id) === Number(levelId),
      );

      if (!access?.can_early_unlock || access.early_unlock_price <= 0) {
        return;
      }

      if (dreamGemBalance < access.early_unlock_price) {
        setCourseActionMessage(
          `You need ${access.early_unlock_price - dreamGemBalance} more Dream Gems to unlock Level ${levelId}.`,
        );
        return;
      }

      const confirmed = window.confirm(
        [
          `Unlock Level ${levelId} — ${access.title} early?`,
          "",
          `Cost: ${access.early_unlock_price} Dream Gems`,
          `Balance: ${dreamGemBalance} → ${dreamGemBalance - access.early_unlock_price}`,
          "",
          "This permanent unlock bypasses the normal rover ownership requirement. The previous Rover Level must still be completed first.",
        ].join("\n"),
      );

      if (!confirmed) return;

      setPurchasingLevel(levelId);
      setCourseActionMessage("");

      const { data, error } = await supabase.rpc(
        "purchase_rover_level_unlock",
        {
          p_level_id: levelId,
        },
      );

      setPurchasingLevel(null);

      if (error) {
        setCourseActionMessage(
          error.message || "The Rover Level could not be unlocked.",
        );
        return;
      }

      const result = ((data ?? []) as PurchaseUnlockRow[])[0];

      if (result?.success) {
        setDreamGemBalance(Number(result.new_balance));
        setCourseActionMessage(
          `Level ${levelId} unlocked permanently for ${result.gem_cost} Dream Gems.`,
        );
        window.dispatchEvent(new Event("dream-gems-updated"));
        window.dispatchEvent(new Event("rover-level-progress-updated"));
        await loadGarage({
          showLoading: false,
        });
      } else {
        setCourseActionMessage(`Level ${levelId} could not be unlocked.`);
      }
    },
    [dreamGemBalance, levelAccess, loadGarage],
  );

  useEffect(() => {
    void loadGarage({
      showLoading: true,
    });

    function handleBalanceUpdate() {
      void loadGarage({
        showLoading: false,
      });
    }

    window.addEventListener("dream-tokens-updated", handleBalanceUpdate);
    window.addEventListener("dream-gems-updated", handleBalanceUpdate);
    window.addEventListener("rover-loadout-updated", handleBalanceUpdate);
    window.addEventListener("rover-performance-updated", handleBalanceUpdate);
    window.addEventListener("rover-level-progress-updated", handleBalanceUpdate);

    return () => {
      window.removeEventListener("dream-tokens-updated", handleBalanceUpdate);
      window.removeEventListener("dream-gems-updated", handleBalanceUpdate);
      window.removeEventListener("rover-loadout-updated", handleBalanceUpdate);
      window.removeEventListener("rover-performance-updated", handleBalanceUpdate);
      window.removeEventListener("rover-level-progress-updated", handleBalanceUpdate);
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
            onClick={goBack}
            style={headerButton}
          >
            ← Back
          </button>
        </header>
        <div style={loadingFill}>
          <div style={loginCard}>
            <h1 style={{ margin: 0 }}>My Rover</h1>
            <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
              Log in to view your rover collection, upgrades and custom build.
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

  if (shouldRotate) {
    return (
      <main style={rotateGatePage}>
        <div style={rotateGateCard}>
          <div style={rotateDeviceIcon}>↻</div>
          <p style={smallEyebrow}>SKYFORGE HANGAR</p>
          <h1 style={rotateGateTitle}>Rotate to landscape</h1>
          <p style={rotateGateCopy}>
            My Rover is designed as a landscape hangar. Rotate your phone or
            iPad to continue.
          </p>
        </div>
      </main>
    );
  }

  const selectedOwned =
    isAdmin ||
    displayedUpgrade.stage === 0 ||
    Boolean(displayedCatalog?.owned);

  const selectedEquipped = displayedUpgrade.stage === equippedStage;
  const selectedCanPurchase = Boolean(displayedCatalog?.can_purchase);
  const selectedCanAfford = Boolean(displayedCatalog?.can_afford);

  return (
    <main style={pageBackground}>
      <header style={topHeader(isMobile)}>
        <button
          type="button"
          onClick={goBack}
          style={headerButton}
        >
          ← {garageView === "expeditions" ? "Hangar" : "Back"}
        </button>

        <div style={headerIdentity(isMobile)}>
          <p style={headerEyebrow}>
            {garageView === "expeditions"
              ? "DREAMSCAPE EXPEDITIONS"
              : "SKYFORGE HANGAR"}
          </p>
          <h1 style={headerTitle}>
            {garageView === "expeditions" ? "Rover Expeditions" : "My Rover"}
          </h1>
        </div>

        <div style={headerRight(isMobile)}>
          <div style={balancePill("dt")}>
            <span style={pillIcon("dt")}>◇</span>
            {!isMobile && <span style={pillLabel}>DREAM TOKENS</span>}
            <strong style={pillValue("dt")}>
              {tokenBalance.toLocaleString("en-SG")} DT
            </strong>
          </div>

          <div style={balancePill("dg")}>
            <span style={pillIcon("dg")}>◆</span>
            {!isMobile && <span style={pillLabel}>DREAM GEMS</span>}
            <strong style={pillValue("dg")}>
              {dreamGemBalance.toLocaleString("en-SG")} DG
            </strong>
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

      {garageView === "expeditions" ? (
        <ExpeditionMap
          access={levelAccess}
          currentStage={highestOwnedStage}
          equippedRover={coreUpgradeTrack[equippedStage] ?? coreUpgradeTrack[0]}
          isAdmin={isAdmin}
          onOpenLevel={openRoverChallenge}
        />
      ) : (
        <section style={hangarWorkspace(isCompact)}>
          <aside style={fleetPane(isCompact)}>
            <div style={compactPaneHeading}>
              <p style={smallEyebrow}>ROVER FLEET</p>
              <h2 style={compactPaneTitle}>Select Rover</h2>
            </div>

            <UpgradeTrack
              catalog={roverCatalog}
              tokenBalance={tokenBalance}
              isAdmin={isAdmin}
              equippedStage={equippedStage}
              selectedStage={displayedUpgrade.stage}
              savingStage={savingRoverStage}
              purchasingStage={purchasingRoverStage}
              onPreviewStage={previewRover}
              onEquipStage={(stage) => void selectAndEquipRover(stage)}
              onPurchaseStage={(stage) => void purchaseRover(stage)}
            />
          </aside>

          <section style={roverFocusPane(isCompact)}>
            <div style={roverFocusTop}>
              <div>
                <p style={smallEyebrow}>
                  {selectedEquipped
                    ? "EQUIPPED ROVER"
                    : selectedOwned
                      ? "OWNED ROVER"
                      : "ROVER PREVIEW"}
                </p>
                <h2 style={roverFocusTitle}>
                  Rover {displayedUpgrade.roverNumber} · {displayedUpgrade.name}
                </h2>
              </div>

              {rank && <div style={rankPill(rank)}>Rank #{rank}</div>}
            </div>

            <div style={roverFocusVehicleStage}>
              <div style={vehicleHalo(displayedUpgrade.accent)} />
              <img
                src={displayedUpgrade.imageSrc}
                alt={displayedUpgrade.name}
                draggable={false}
                style={roverFocusVehicleImage}
              />
            </div>

            <div style={roverFocusActionArea}>
              {selectedEquipped ? (
                <button
                  type="button"
                  onClick={() => setGarageView("expeditions")}
                  style={expeditionsButton}
                >
                  To Expeditions ›
                </button>
              ) : selectedOwned ? (
                <button
                  type="button"
                  disabled={savingRoverStage !== null}
                  onClick={() =>
                    void selectAndEquipRover(displayedUpgrade.stage)
                  }
                  style={expeditionsButton}
                >
                  {savingRoverStage === displayedUpgrade.stage
                    ? "Equipping..."
                    : "Equip This Rover"}
                </button>
              ) : selectedCanPurchase ? (
                <button
                  type="button"
                  disabled={!selectedCanAfford || purchasingRoverStage !== null}
                  onClick={() => void purchaseRover(displayedUpgrade.stage)}
                  style={expeditionsButton}
                >
                  {selectedCanAfford
                    ? `Purchase · ${Number(
                        displayedCatalog?.price_dt ?? displayedUpgrade.priceDt,
                      ).toLocaleString("en-SG")} DT`
                    : "Need More DT"}
                </button>
              ) : (
                <button type="button" disabled style={disabledCenterButton}>
                  Purchase Previous Rover First
                </button>
              )}
            </div>

            {(loadoutMessage || purchaseMessage) && (
              <div style={focusMessageStrip}>
                {loadoutMessage || purchaseMessage}
              </div>
            )}

            <div style={statsBottomDock}>
              <RoverBuildStats
                stage={displayedUpgrade.stage}
                accent={displayedUpgrade.accent}
                performanceBuild={
                  selectedEquipped ? performanceBuild : []
                }
                previewCategory={
                  selectedEquipped &&
                  isRoverPerformanceCategory(confirmingPerformanceCategory)
                    ? confirmingPerformanceCategory
                    : null
                }
              />

              <div style={compactRunSummary}>
                <SummaryStat
                  label="Rank"
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
            </div>
          </section>

          <aside style={buildPane(isCompact)}>
            <div style={compactPaneHeading}>
              <p style={smallEyebrow}>CUSTOM BUILD</p>
              <h2 style={compactPaneTitle}>Performance Parts</h2>
            </div>

            {selectedEquipped ? (
              <CustomBuildPanel
                tokenBalance={tokenBalance}
                isMobile={isMobile}
                equippedStage={equippedStage}
                performanceBuild={performanceBuild}
                message={performanceMessage}
                purchasingCategory={purchasingPerformanceCategory}
                confirmingCategory={confirmingPerformanceCategory}
                weaponsUnlocked={weaponsUnlocked}
                isAdmin={isAdmin}
                onConfirmingCategoryChange={setConfirmingPerformanceCategory}
                onPurchase={(category) =>
                  void purchasePerformanceUpgrade(category)
                }
              />
            ) : (
              <div style={equipToTuneCompact}>
                <span style={equipToTuneIcon}>◇</span>
                <strong>Equip Rover {displayedUpgrade.roverNumber}</strong>
                <span style={compactMutedText}>
                  Custom parts are stored separately for every rover.
                </span>
                {selectedOwned && (
                  <button
                    type="button"
                    onClick={() =>
                      void selectAndEquipRover(displayedUpgrade.stage)
                    }
                    style={equipRoverButton(true)}
                  >
                    Equip
                  </button>
                )}
              </div>
            )}
          </aside>
        </section>
      )}

      <NovaGarageGuide
        open={novaGuideOpen}
        mode={garageView}
        roverName={displayedUpgrade.name}
        onToggle={() => setNovaGuideOpen((current) => !current)}
        onClose={() => setNovaGuideOpen(false)}
      />
    </main>
  );
}

function NovaGarageGuide({
  open,
  mode,
  roverName,
  onToggle,
  onClose,
}: {
  open: boolean;
  mode: GarageView;
  roverName: string;
  onToggle: () => void;
  onClose: () => void;
}) {
  const content =
    mode === "expeditions"
      ? {
          title: "Rover Expeditions",
          body:
            "Travel through Dreamscape in order. Complete an unlocked location to open the next route, while meeting the rover requirement for that expedition.",
        }
      : {
          title: `${roverName} · Skyforge Hangar`,
          body:
            "Choose a rover from the left, equip it, then tune that rover's Custom Build on the right. Weapons unlock after Expedition 4. Your stats appear beneath the vehicle. When your build is ready, press To Expeditions.",
        };

  return (
    <>
      {open && (
        <aside style={novaGuidePanel} aria-label="Nova rover guide">
          <div style={novaGuidePanelTop}>
            <div style={novaGuideIdentity}>
              <span style={novaGuideAvatar}>✦</span>
              <div>
                <p style={novaGuideEyebrow}>NOVA GUIDE</p>
                <strong style={novaGuideTitle}>{content.title}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Nova guide"
              style={novaGuideClose}
            >
              ×
            </button>
          </div>
          <p style={novaGuideBody}>{content.body}</p>
          {mode === "hangar" && (
            <div style={novaGuideTip}>
              When you press Install on a performance part, the stat bar previews
              the increase in green before you confirm the purchase.
            </div>
          )}
        </aside>
      )}

      <button
        type="button"
        onClick={onToggle}
        style={novaGuideButton}
        aria-expanded={open}
        aria-label="Open Nova guide"
      >
        <span style={novaGuideButtonIcon}>✦</span>
        <span>NOVA GUIDE</span>
      </button>
    </>
  );
}

function ExpeditionMap({
  access,
  currentStage,
  equippedRover,
  isAdmin,
  onOpenLevel,
}: {
  access: RoverLevelAccess[];
  currentStage: number;
  equippedRover: (typeof coreUpgradeTrack)[number];
  isAdmin: boolean;
  onOpenLevel: (level: RoverLevelId) => void;
}) {
  const positions: Record<
    RoverLevelId,
    { left: string; top: string; x: number; y: number }
  > = {
    1: { left: "12%", top: "69%", x: 120, y: 440 },
    2: { left: "35%", top: "43%", x: 350, y: 270 },
    3: { left: "61%", top: "61%", x: 610, y: 390 },
    4: { left: "83%", top: "27%", x: 830, y: 170 },
  };

  const accessFor = (levelId: RoverLevelId) =>
    access.find((row) => Number(row.level_id) === levelId);

  return (
    <section style={expeditionShell}>
      <div style={expeditionTopRow}>
        <div>
          <p style={smallEyebrow}>DREAMSCAPE ROUTE</p>
          <h2 style={expeditionHeading}>Expedition Map</h2>
          <p style={expeditionLead}>
            Explore each location in order. Completed routes remain open for replay.
          </p>
        </div>

        <div style={expeditionRoverPill}>
          <img
            src={equippedRover.imageSrc}
            alt=""
            style={expeditionRoverThumb}
          />
          <div>
            <span style={expeditionPillLabel}>EQUIPPED</span>
            <strong>
              Rover {equippedRover.roverNumber} · {equippedRover.name}
            </strong>
          </div>
        </div>
      </div>

      <div style={dreamscapeMapCanvas}>
        <div style={mapNebulaOne} />
        <div style={mapNebulaTwo} />
        <div style={mapPlanet} />
        <div style={mapMountainA} />
        <div style={mapMountainB} />

        <svg
          viewBox="0 0 1000 620"
          preserveAspectRatio="none"
          style={expeditionRouteSvg}
          aria-hidden="true"
        >
          <path
            d="M120 440 C210 420 250 300 350 270 C445 240 510 390 610 390 C705 390 750 210 830 170"
            fill="none"
            stroke="rgba(126,232,255,0.22)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M120 440 C210 420 250 300 350 270 C445 240 510 390 610 390 C705 390 750 210 830 170"
            fill="none"
            stroke="rgba(126,232,255,0.72)"
            strokeWidth="3"
            strokeDasharray="11 13"
            strokeLinecap="round"
          />
        </svg>

        {ROVER_COURSES.map((course) => {
          const row = accessFor(course.id);
          const completed = Boolean(row?.completed);
          const unlocked = isAdmin || Boolean(row?.unlocked) || course.id === 1;
          const position = positions[course.id];

          let status = "LOCKED";
          let detail = "Complete the previous expedition first.";

          if (completed) {
            status = "COMPLETED";
            detail = "Replay available";
          } else if (unlocked) {
            status = "UNLOCKED";
            detail = "Ready to explore";
          } else if (row && !row.prerequisite_completed) {
            detail = `Complete Expedition ${row.prerequisite_level} first`;
          } else if (row) {
            detail = `Requires Rover ${Number(row.minimum_rover_stage) + 1}`;
          }

          return (
            <div
              key={course.id}
              style={{
                ...expeditionNodeWrap,
                left: position.left,
                top: position.top,
              }}
            >
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && onOpenLevel(course.id)}
                style={expeditionNode(unlocked, completed)}
                aria-label={`${course.title} · ${status}`}
              >
                <span style={expeditionNodeNumber(unlocked, completed)}>
                  {completed ? "✓" : course.id}
                </span>
              </button>

              <div style={expeditionNodeCard(unlocked, completed)}>
                <p style={expeditionNodeStatus(unlocked, completed)}>
                  EXPEDITION {course.id} · {status}
                </p>
                <h3 style={expeditionNodeTitle}>{course.title}</h3>
                <p style={expeditionNodeDetail}>{detail}</p>
                {unlocked && (
                  <button
                    type="button"
                    onClick={() => onOpenLevel(course.id)}
                    style={mapEnterButton}
                  >
                    {completed ? "Replay Expedition" : "Enter Expedition"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div style={mapLegend}>
          <span>● Unlocked</span>
          <span>✓ Completed</span>
          <span>◆ Locked</span>
          {!isAdmin && <span>Highest owned: Rover {currentStage + 1}</span>}
        </div>
      </div>
    </section>
  );
}
function RoverCoursesPanel({
  access,
  leaderboards,
  loadMessage,
  actionMessage,
  currentStage,
  dreamGemBalance,
  purchasingLevel,
  userId,
  onOpenLevel,
  onPurchaseEarlyUnlock,
}: {
  access: RoverLevelAccess[];
  leaderboards: LeaderboardsByLevel;
  loadMessage: string;
  actionMessage: string;
  currentStage: number;
  dreamGemBalance: number;
  purchasingLevel: RoverLevelId | null;
  userId: string;
  onOpenLevel: (level: RoverLevelId) => void;
  onPurchaseEarlyUnlock: (level: RoverLevelId) => void;
}) {
  const [leaderboardLevel, setLeaderboardLevel] =
    useState<RoverLevelId>(1);

  const leaderboardRows = leaderboards[leaderboardLevel];
  const selectedLeaderboardCourse =
    ROVER_COURSES.find((course) => course.id === leaderboardLevel) ??
    ROVER_COURSES[0];

  return (
    <div style={coursesPanel}>
      <div>
        <p style={smallEyebrow}>COURSE SELECT</p>
        <h2 style={{ margin: "7px 0 0" }}>Rover Expeditions</h2>
        <p style={coursesIntro}>
          Complete Rover Expeditions levels in order. Some courses require a
          stronger rover that you own. Dream Gems can still permanently unlock
          the next eligible course early without purchasing the required rover.
          Admin accounts can enter every level immediately.
        </p>
      </div>

      {loadMessage && <div style={courseNotice}>{loadMessage}</div>}
      {actionMessage && <div style={courseNotice}>{actionMessage}</div>}

      <div style={courseGrid}>
        {ROVER_COURSES.map((course) => (
          <CourseCard
            key={course.id}
            number={course.id}
            title={course.title}
            description={course.description}
            access={access.find(
              (row) => Number(row.level_id) === Number(course.id),
            )}
            currentStage={currentStage}
            dreamGemBalance={dreamGemBalance}
            purchasing={purchasingLevel === course.id}
            onOpen={() => onOpenLevel(course.id)}
            onPurchaseEarlyUnlock={() =>
              onPurchaseEarlyUnlock(course.id)
            }
          />
        ))}
      </div>

      <div style={leaderboardPanel}>
        <div style={leaderboardHeadingRow}>
          <div>
            <p style={smallEyebrow}>LEVEL {leaderboardLevel}</p>
            <h3 style={{ margin: "5px 0 0" }}>Top Explorers</h3>
          </div>
          <span style={leaderboardCoursePill}>
            {selectedLeaderboardCourse.title}
          </span>
        </div>

        <div
          style={{
            ...leaderboardLevelTabs,
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
          }}
        >
          {ROVER_COURSES.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => setLeaderboardLevel(course.id)}
              style={leaderboardLevelButton(
                leaderboardLevel === course.id,
              )}
            >
              Level {course.id}
            </button>
          ))}
        </div>

        {leaderboardRows.length === 0 ? (
          <p style={emptyLeaderboard}>
            No completed runs yet. Finish Level {leaderboardLevel} to set the
            first score.
          </p>
        ) : (
          <div style={leaderboardList}>
            {leaderboardRows.map((row) => {
              const isCurrentUser = row.user_id === userId;

              return (
                <div
                  key={`${row.user_id}-${row.rank}`}
                  style={leaderboardRow(isCurrentUser)}
                >
                  <strong style={leaderboardRank}>#{row.rank}</strong>

                  <div style={{ minWidth: 0 }}>
                    <p style={leaderboardName}>
                      {row.username || "Explorer"}
                      {isCurrentUser ? " · You" : ""}
                    </p>

                    <p style={leaderboardMeta}>
                      Rover {Number(row.rover_stage) + 1} · {row.orbs_collected}/
                      {selectedLeaderboardCourse.orbTotal} orbs ·{" "}
                      {formatMilliseconds(Number(row.best_time_ms))}
                    </p>
                  </div>

                  <strong style={leaderboardScore}>
                    {Number(row.best_score).toLocaleString()}
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  number,
  title,
  description,
  access,
  currentStage,
  dreamGemBalance,
  purchasing,
  onOpen,
  onPurchaseEarlyUnlock,
}: {
  number: RoverLevelId;
  title: string;
  description: string;
  access?: RoverLevelAccess;
  currentStage: number;
  dreamGemBalance: number;
  purchasing: boolean;
  onOpen: () => void;
  onPurchaseEarlyUnlock: () => void;
}) {
  const unlocked = Boolean(access?.unlocked);
  const completed = Boolean(access?.completed);
  const adminAccess = Boolean(access?.admin_access);
  const earlyUnlockPurchased = Boolean(access?.early_unlock_purchased);
  const canEarlyUnlock = Boolean(access?.can_early_unlock);
  const earlyUnlockPrice = Number(access?.early_unlock_price ?? 0);
  const hasEnoughGems =
    canEarlyUnlock && dreamGemBalance >= earlyUnlockPrice;

  // get_rover_level_access() is authoritative. Admin and purchased early
  // unlocks intentionally bypass stage_ready, so do not re-check it here.
  const canOpen = unlocked;

  let status = "ACCESS DATA UNAVAILABLE";

  if (access) {
    if (adminAccess) {
      status = completed
        ? "COMPLETED · ADMIN REPLAY"
        : "ADMIN ACCESS · READY TO DRIVE";
    } else if (completed) {
      status = "COMPLETED · REPLAY AVAILABLE";
    } else if (earlyUnlockPurchased) {
      status = "EARLY UNLOCK · PERMANENT";
    } else if (!access.prerequisite_completed) {
      status = `LOCKED · COMPLETE LEVEL ${access.prerequisite_level}`;
    } else if (canEarlyUnlock) {
      status = `ROVER ${Number(access.minimum_rover_stage) + 1} NORMALLY REQUIRED · EARLY UNLOCK AVAILABLE`;
    } else if (canOpen) {
      status = "READY TO DRIVE";
    } else {
      status = `ROVER ${Number(access.minimum_rover_stage) + 1} REQUIRED · HIGHEST OWNED ROVER ${currentStage + 1}`;
    }
  }

  const highlighted = canOpen || canEarlyUnlock;

  return (
    <article style={courseCard(highlighted, completed)}>
      <div style={courseNumber(highlighted)}>{number}</div>

      <div style={{ minWidth: 0 }}>
        <p style={courseStatus(highlighted)}>{status}</p>
        <h3 style={courseTitle}>{title}</h3>
        <p style={courseDescription}>{description}</p>

        {access?.best_score != null && (
          <p style={courseBest}>
            Best {Number(access.best_score).toLocaleString()} points ·{" "}
            {formatMilliseconds(Number(access.best_time_ms))}
          </p>
        )}

        {canEarlyUnlock && (
          <p
            style={{
              ...courseBest,
              color: hasEnoughGems ? "#e7d2ff" : "#ffc9b5",
            }}
          >
            Early unlock: ◆ {earlyUnlockPrice} DG · Balance:{" "}
            {dreamGemBalance} DG
          </p>
        )}
      </div>

      {canOpen ? (
        <button
          type="button"
          onClick={onOpen}
          style={courseButton(true, "play")}
        >
          {completed ? "Replay" : "Play"}
        </button>
      ) : canEarlyUnlock ? (
        <button
          type="button"
          disabled={!hasEnoughGems || purchasing}
          onClick={onPurchaseEarlyUnlock}
          style={courseButton(
            hasEnoughGems && !purchasing,
            "gem",
          )}
        >
          {purchasing
            ? "Unlocking..."
            : hasEnoughGems
              ? `${earlyUnlockPrice} DG`
              : "Need DG"}
        </button>
      ) : (
        <button
          type="button"
          disabled
          style={courseButton(false, "locked")}
        >
          Locked
        </button>
      )}
    </article>
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

function RoverBuildStats({
  stage,
  accent,
  performanceBuild,
  previewCategory,
}: {
  stage: number;
  accent: string;
  performanceBuild: RoverPerformanceBuildRow[];
  previewCategory: RoverPerformanceCategory | null;
}) {
  const base = getRoverBaseRatings(stage);

  const levels: RoverPerformanceLevels = {
    engine:
      performanceBuild.find((row) => row.category === "engine")?.current_level ?? 0,
    traction:
      performanceBuild.find((row) => row.category === "traction")?.current_level ?? 0,
    stability:
      performanceBuild.find((row) => row.category === "stability")?.current_level ?? 0,
    suspension:
      performanceBuild.find((row) => row.category === "suspension")?.current_level ?? 0,
    energy:
      performanceBuild.find((row) => row.category === "energy")?.current_level ?? 0,
  };

  const effective = getEffectiveRoverRatings(stage, levels);
  const previewLevels: RoverPerformanceLevels = { ...levels };

  if (previewCategory) {
    const previewRow = performanceBuild.find(
      (row) => row.category === previewCategory,
    );

    if (previewRow?.can_purchase && previewRow.next_level != null) {
      previewLevels[previewCategory] = Math.min(
        Number(previewRow.max_useful_level ?? 5),
        Number(previewRow.next_level),
      );
    }
  }

  const previewEffective = getEffectiveRoverRatings(stage, previewLevels);

  const stats = [
    {
      label: "Speed",
      category: "engine" as const,
      base: base.speed,
      value: effective.speed,
      previewValue: previewEffective.speed,
    },
    {
      label: "Handling",
      category: "traction" as const,
      base: base.handling,
      value: effective.handling,
      previewValue: previewEffective.handling,
    },
    {
      label: "Balance",
      category: "stability" as const,
      base: base.balance,
      value: effective.balance,
      previewValue: previewEffective.balance,
    },
    {
      label: "Air Mobility",
      category: "suspension" as const,
      base: base.airMobility,
      value: effective.airMobility,
      previewValue: previewEffective.airMobility,
    },
    {
      label: "Boost",
      category: "energy" as const,
      base: base.boost,
      value: effective.boost,
      previewValue: previewEffective.boost,
    },
  ];

  return (
    <section
      aria-label={`Rover ${stage + 1} build statistics`}
      style={buildStatsPanel}
    >
      <div style={buildStatsHeadingRow}>
        <p style={smallEyebrow}>BUILD STATS</p>
        <span style={buildStatsScale}>0–100</span>
      </div>

      <div style={buildStatsGrid}>
        {stats.map((stat) => {
          const installedBonus = Math.max(0, stat.value - stat.base);
          const previewGain = Math.max(0, stat.previewValue - stat.value);
          const previewing =
            previewCategory === stat.category && previewGain > 0;

          return (
            <div key={stat.label} style={buildStatRow}>
              <div style={buildStatLabelRow}>
                <span>{stat.label}</span>
                <span style={buildStatValueGroup}>
                  <strong style={{ color: accent }}>
                    {stat.value}/100
                    {installedBonus > 0 ? ` +${installedBonus}` : ""}
                  </strong>
                  {previewing && (
                    <strong style={buildStatPreviewValue}>
                      +{previewGain} preview
                    </strong>
                  )}
                </span>
              </div>

              <div style={buildStatTrack}>
                <div
                  style={{
                    ...buildStatFill,
                    width: `${stat.value}%`,
                    background: `linear-gradient(90deg, ${accent}, #35c5ff)`,
                    boxShadow: `0 0 12px ${accent}55`,
                  }}
                />
                {previewing && (
                  <div
                    style={{
                      ...buildStatPreviewFill,
                      left: `${stat.value}%`,
                      width: `${previewGain}%`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UpgradeTrack({
  catalog,
  tokenBalance,
  isAdmin,
  equippedStage,
  selectedStage,
  savingStage,
  purchasingStage,
  onPreviewStage,
  onEquipStage,
  onPurchaseStage,
}: {
  catalog: RoverCatalogRow[];
  tokenBalance: number;
  isAdmin: boolean;
  equippedStage: number;
  selectedStage: number;
  savingStage: number | null;
  purchasingStage: number | null;
  onPreviewStage: (stage: number) => void;
  onEquipStage: (stage: number) => void;
  onPurchaseStage: (stage: number) => void;
}) {
  return (
    <div style={fleetCompactList}>
      {coreUpgradeTrack.map((upgrade) => {
        const catalogRow = catalog.find(
          (row) => Number(row.stage) === upgrade.stage,
        );

        const owned =
          isAdmin ||
          upgrade.stage === 0 ||
          Boolean(catalogRow?.owned);

        const equipped = equippedStage === upgrade.stage;
        const selected = selectedStage === upgrade.stage;
        const saving = savingStage === upgrade.stage;
        const purchasing = purchasingStage === upgrade.stage;
        const price = Number(
          catalogRow?.price_dt ?? upgrade.priceDt,
        );

        const canPurchase =
          !isAdmin &&
          !owned &&
          Boolean(catalogRow?.can_purchase);

        const canAfford =
          canPurchase &&
          tokenBalance >= price;

        return (
          <article
            key={upgrade.stage}
            onClick={() => onPreviewStage(upgrade.stage)}
            style={fleetCompactRow(selected, equipped, upgrade.accent)}
          >
            <img
              src={upgrade.imageSrc}
              alt={upgrade.name}
              draggable={false}
              style={fleetCompactImage}
            />

            <div style={fleetCompactIdentity}>
              <strong style={fleetCompactName}>
                Rover {upgrade.roverNumber} · {upgrade.name}
              </strong>

              <span style={fleetCompactMeta(equipped, upgrade.accent)}>
                {equipped
                  ? "Equipped"
                  : owned
                    ? "Owned"
                    : upgrade.stage === 0
                      ? "Free"
                      : `${price.toLocaleString("en-SG")} DT`}
              </span>
            </div>

            <div style={fleetCompactAction}>
              {equipped ? (
                <span style={compactEquippedBadge}>✓</span>
              ) : owned ? (
                <button
                  type="button"
                  disabled={
                    savingStage !== null ||
                    purchasingStage !== null
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onEquipStage(upgrade.stage);
                  }}
                  style={compactFleetButton(
                    savingStage === null &&
                      purchasingStage === null,
                    "equip",
                  )}
                >
                  {saving ? "..." : "Equip"}
                </button>
              ) : canPurchase ? (
                <button
                  type="button"
                  disabled={
                    !canAfford ||
                    purchasingStage !== null ||
                    savingStage !== null
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onPurchaseStage(upgrade.stage);
                  }}
                  style={compactFleetButton(
                    canAfford &&
                      purchasingStage === null &&
                      savingStage === null,
                    "buy",
                  )}
                >
                  {purchasing ? "..." : "Buy"}
                </button>
              ) : (
                <span style={compactLockedBadge}>Locked</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CustomBuildPanel({
  tokenBalance,
  equippedStage,
  performanceBuild,
  message,
  purchasingCategory,
  confirmingCategory,
  weaponsUnlocked,
  isAdmin: _isAdmin,
  onConfirmingCategoryChange,
  onPurchase,
}: {
  tokenBalance: number;
  isMobile: boolean;
  equippedStage: number;
  performanceBuild: RoverPerformanceBuildRow[];
  message: string;
  purchasingCategory: RoverCustomBuildCategory | null;
  confirmingCategory: RoverCustomBuildCategory | null;
  weaponsUnlocked: boolean;
  isAdmin: boolean;
  onConfirmingCategoryChange: (
    category: RoverCustomBuildCategory | null,
  ) => void;
  onPurchase: (category: RoverCustomBuildCategory) => void;
}) {
  if (performanceBuild.length === 0) {
    return (
      <div style={compactBuildUnavailable}>
        Custom Build data is unavailable.
      </div>
    );
  }

  return (
    <div style={compactBuildShell}>
      <div style={compactBuildGrid}>
        {roverPerformanceCategories.map((category) => {
          const row = performanceBuild.find(
            (item) => item.category === category.id,
          );

          if (!row) return null;

          return (
            <PerformanceUpgradeBox
              key={`${equippedStage}-${category.id}-${row.current_level}`}
              category={category}
              row={row}
              tokenBalance={tokenBalance}
              purchasingCategory={purchasingCategory}
              confirmingCategory={confirmingCategory}
              categoryUnlocked={
                category.id !== "weapon" || weaponsUnlocked
              }
              onConfirmingCategoryChange={onConfirmingCategoryChange}
              onPurchase={onPurchase}
            />
          );
        })}
      </div>

      {message && (
        <div style={compactBuildMessage}>{message}</div>
      )}
    </div>
  );
}

function PerformanceUpgradeBox({
  category,
  row,
  tokenBalance,
  purchasingCategory,
  confirmingCategory,
  categoryUnlocked,
  onConfirmingCategoryChange,
  onPurchase,
}: {
  category: (typeof roverPerformanceCategories)[number];
  row: RoverPerformanceBuildRow;
  tokenBalance: number;
  purchasingCategory: RoverCustomBuildCategory | null;
  confirmingCategory: RoverCustomBuildCategory | null;
  categoryUnlocked: boolean;
  onConfirmingCategoryChange: (
    category: RoverCustomBuildCategory | null,
  ) => void;
  onPurchase: (category: RoverCustomBuildCategory) => void;
}) {
  const isWeapon = category.id === "weapon";
  const currentLevel = Number(row.current_level ?? 0);
  const initialLevel = Math.max(
    1,
    Math.min(
      5,
      Number(row.next_level ?? currentLevel || 1),
    ),
  );

  const [viewLevel, setViewLevel] = useState(initialLevel);

  const tier =
    category.tiers[
      Math.max(0, Math.min(category.tiers.length - 1, viewLevel - 1))
    ];

  const owned = viewLevel <= currentLevel;
  const isNext = viewLevel === Number(row.next_level);
  const unavailable =
    !isWeapon && viewLevel > Number(row.max_useful_level ?? 5);
  const locked =
    !owned &&
    !isNext &&
    !unavailable;

  const canAfford =
    categoryUnlocked &&
    Boolean(row.can_afford) &&
    tokenBalance >= Number(row.next_price_dt ?? 0);

  const purchasing = purchasingCategory === category.id;
  const confirming =
    confirmingCategory === category.id && isNext;

  function move(delta: number) {
    onConfirmingCategoryChange(null);
    setViewLevel((current) =>
      Math.max(1, Math.min(5, current + delta)),
    );
  }

  return (
    <section
      style={upgradeCarouselBox}
      aria-disabled={isWeapon && !categoryUnlocked}
    >
      <div style={upgradeCarouselHeader}>
        <div>
          <p style={upgradeCarouselEyebrow}>
            {isWeapon
              ? "UNLOCKS AFTER EXPEDITION 4"
              : category.statLabel?.toUpperCase() ?? "CUSTOM BUILD"}
          </p>
          <h3 style={upgradeCarouselTitle}>{category.title}</h3>
        </div>

        <span style={upgradeCarouselRating}>
          {isWeapon
            ? `Tier ${currentLevel}/5`
            : `${Number(row.current_rating ?? row.base_rating)}/100`}
        </span>
      </div>

      <div
        style={{
          ...upgradeCarouselViewer,
          opacity: isWeapon && !categoryUnlocked ? 0.42 : 1,
        }}
      >
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!categoryUnlocked || viewLevel <= 1}
          style={upgradeArrow(categoryUnlocked && viewLevel > 1)}
          aria-label={`Previous ${category.title} upgrade`}
        >
          ‹
        </button>

        <div style={upgradeCarouselPart}>
          {tier?.imageSrc ? (
            <img
              src={tier.imageSrc}
              alt={tier.name}
              draggable={false}
              style={upgradeCarouselImage}
            />
          ) : (
            <div style={upgradeCarouselFallback}>◇</div>
          )}

          <strong style={upgradeCarouselPartName}>
            {tier?.name ?? category.title}
          </strong>

          <span style={upgradeCarouselTier}>
            Tier {viewLevel}/5
          </span>
        </div>

        <button
          type="button"
          onClick={() => move(1)}
          disabled={!categoryUnlocked || viewLevel >= 5}
          style={upgradeArrow(categoryUnlocked && viewLevel < 5)}
          aria-label={`Next ${category.title} upgrade`}
        >
          ›
        </button>
      </div>

      <div style={upgradeCarouselFooter}>
        {isWeapon && !categoryUnlocked ? (
          <span style={weaponLockedState}>
            🔒 Complete Expedition 4
          </span>
        ) : unavailable ? (
          <span style={upgradeStateMuted}>Not needed</span>
        ) : owned ? (
          <span style={upgradeStateInstalled}>Installed</span>
        ) : locked ? (
          <span style={upgradeStateMuted}>Locked</span>
        ) : confirming ? (
          <div style={upgradeConfirmRow}>
            <button
              type="button"
              disabled={purchasingCategory !== null}
              onClick={() => onConfirmingCategoryChange(null)}
              style={smallCancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canAfford || purchasingCategory !== null}
              onClick={() => {
                onConfirmingCategoryChange(null);
                onPurchase(category.id);
              }}
              style={smallConfirmButton(
                canAfford && purchasingCategory === null,
              )}
            >
              {purchasing
                ? "Installing..."
                : `Confirm ${Number(
                    row.next_price_dt,
                  ).toLocaleString("en-SG")} DT`}
            </button>
          </div>
        ) : isNext ? (
          <button
            type="button"
            disabled={!canAfford || purchasingCategory !== null}
            onClick={() =>
              onConfirmingCategoryChange(category.id)
            }
            style={smallInstallButton(
              canAfford && purchasingCategory === null,
            )}
          >
            {canAfford
              ? `Install · ${tier.priceDt.toLocaleString("en-SG")} DT`
              : `Need ${Math.max(
                  0,
                  Number(row.next_price_dt ?? 0) - tokenBalance,
                ).toLocaleString("en-SG")} DT`}
          </button>
        ) : null}
      </div>
    </section>
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
  height: "100dvh",
  minHeight: "100dvh",
  width: "100%",
  overflow: "hidden",
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
    position: "relative",
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
    width: "100%",
    maxWidth: "none",
    margin: 0,
    padding: isMobile
      ? "12px"
      : "22px clamp(22px, 2.4vw, 44px) 30px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(520px, 0.94fr) minmax(720px, 1.16fr)",
    gap: "clamp(18px, 1.6vw, 30px)",
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
    padding: "clamp(18px, 1.5vw, 26px)",
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
    height: isMobile ? "255px" : "clamp(390px, 34vw, 540px)",
    minHeight: isMobile ? undefined : "390px",
    borderRadius: "22px",
    border: "1px solid rgba(255,255,255,0.1)",
    background:
      "radial-gradient(circle at 50% 48%, rgba(126,232,255,0.17), rgba(255,255,255,0.035) 50%, rgba(0,0,0,0.2))",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

const roverImage: CSSProperties = {
  position: "relative",
  zIndex: 4,
  width: "97%",
  height: "93%",
  maxWidth: "none",
  objectFit: "contain",
  filter: "drop-shadow(0 30px 42px rgba(0,0,0,0.58))",
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
  position: "relative",
  marginTop: "6px",
  height: "7px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const buildStatFill: CSSProperties = {
  position: "absolute",
  inset: "0 auto 0 0",
  height: "100%",
  borderRadius: "999px",
  transition: "width 220ms ease",
};

const buildStatPreviewFill: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  background: "linear-gradient(90deg,#6fff9d,#3eea76)",
  boxShadow: "0 0 12px rgba(111,255,157,0.72)",
  transition: "left 180ms ease, width 180ms ease",
};

const buildStatValueGroup: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "7px",
  flexWrap: "wrap",
};

const buildStatPreviewValue: CSSProperties = {
  color: "#6fff9d",
  fontSize: "9px",
  fontWeight: 900,
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
  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
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
  equipped: boolean,
  selected: boolean,
  accent: string,
): CSSProperties {
  return {
    width: "100%",
    borderRadius: "16px",
    border: selected
      ? `1px solid ${accent}`
      : equipped
        ? `1px solid ${accent}88`
        : unlocked
          ? "1px solid rgba(134,239,172,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
    background: selected
      ? `linear-gradient(135deg, ${accent}26, rgba(255,255,255,0.06))`
      : equipped
        ? `linear-gradient(135deg, ${accent}18, rgba(255,255,255,0.04))`
        : "rgba(255,255,255,0.035)",
    padding: "11px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    opacity: unlocked ? 1 : 0.58,
    color: "white",
    fontFamily: "inherit",
    cursor: "pointer",
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
  equipped: boolean,
  selected: boolean,
  accent: string,
): CSSProperties {
  return {
    margin: 0,
    color: equipped
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


const purchaseNotice: CSSProperties = {
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(53,197,255,0.08)",
  color: "#c9f9ff",
  padding: "12px 14px",
  fontSize: "12px",
  lineHeight: 1.45,
};

const ownershipPanel: CSSProperties = {
  marginTop: "15px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(255,255,255,0.035)",
  padding: "12px 13px",
  display: "grid",
  gap: "9px",
};

const ownershipRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const ownershipLabel: CSSProperties = {
  color: "rgba(255,255,255,0.42)",
  fontSize: "9px",
  letterSpacing: "0.12em",
  fontWeight: 900,
};

const ownershipValue: CSSProperties = {
  color: "#d8f9ff",
  fontSize: "11px",
  textAlign: "right",
};

const upgradeActionColumn: CSSProperties = {
  flex: "0 0 auto",
  minWidth: "82px",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
};

const roverPriceText: CSSProperties = {
  margin: "7px 0 0",
  color: "#9ceeff",
  fontSize: "11px",
};

const equippedBadge: CSSProperties = {
  minWidth: "88px",
  minHeight: "38px",
  borderRadius: "11px",
  border: "1px solid rgba(134,239,172,0.36)",
  background: "rgba(34,197,94,0.14)",
  color: "#9af7bc",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const lockedRoverBadge: CSSProperties = {
  maxWidth: "108px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.38)",
  padding: "9px 10px",
  fontSize: "9px",
  fontWeight: 900,
  textAlign: "center",
  textTransform: "uppercase",
};

function equipRoverButton(enabled: boolean): CSSProperties {
  return {
    minWidth: "88px",
    minHeight: "40px",
    borderRadius: "11px",
    border: enabled
      ? "1px solid rgba(126,232,255,0.44)"
      : "1px solid rgba(255,255,255,0.08)",
    background: enabled
      ? "linear-gradient(135deg,#35c5ff,#5c6cff)"
      : "rgba(255,255,255,0.035)",
    color: enabled ? "white" : "rgba(255,255,255,0.35)",
    padding: "0 13px",
    fontSize: "11px",
    fontWeight: 900,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function purchaseRoverButton(enabled: boolean): CSSProperties {
  return {
    minWidth: "96px",
    minHeight: "42px",
    borderRadius: "11px",
    border: enabled
      ? "1px solid rgba(255,224,120,0.58)"
      : "1px solid rgba(255,255,255,0.08)",
    background: enabled
      ? "linear-gradient(135deg,#ffd76a,#ff9f43)"
      : "rgba(255,255,255,0.035)",
    color: enabled ? "#241400" : "rgba(255,255,255,0.34)",
    padding: "0 12px",
    fontSize: "11px",
    fontWeight: 950,
    cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: enabled
      ? "0 0 18px rgba(255,215,106,0.18)"
      : "none",
  };
}


const performanceCategoryCard: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.13)",
  background: "rgba(255,255,255,0.028)",
  padding: "16px",
};

const performanceCategoryHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
};

const performanceCategoryEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const performanceCategoryTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "20px",
};

const performanceCategoryDescription: CSSProperties = {
  margin: "6px 0 0",
  maxWidth: "680px",
  color: "rgba(255,255,255,0.58)",
  fontSize: "12px",
  lineHeight: 1.45,
};

const performanceRatingBadge: CSSProperties = {
  flex: "0 0 auto",
  minWidth: "80px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(83,215,255,0.07)",
  padding: "9px 12px",
  color: "#9af6ff",
  display: "flex",
  justifyContent: "center",
  alignItems: "baseline",
  gap: "3px",
};

function performanceTierGrid(isMobile: boolean): CSSProperties {
  return {
    display: "grid",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    gridTemplateColumns: isMobile
      ? "1fr"
      : "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "10px",
    marginTop: "14px",
    overflow: "hidden",
  };
}

function performanceTierCard(
  owned: boolean,
  next: boolean,
  unavailable: boolean,
): CSSProperties {
  return {
    minWidth: 0,
    minHeight: "280px",
    borderRadius: "14px",
    border: owned
      ? "1px solid rgba(111,255,184,0.28)"
      : next
        ? "1px solid rgba(255,215,106,0.36)"
        : "1px solid rgba(255,255,255,0.07)",
    background: owned
      ? "rgba(70,210,140,0.07)"
      : next
        ? "rgba(255,215,106,0.055)"
        : "rgba(255,255,255,0.018)",
    padding: "11px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    opacity: unavailable ? 0.34 : 1,
  };
}

const performanceTierTopRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const performanceTierMiniStatus = (
  owned: boolean,
  next: boolean,
): CSSProperties => ({
  color: owned
    ? "#8dffbf"
    : next
      ? "#ffd76a"
      : "rgba(255,255,255,0.33)",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: "0.08em",
});

const performanceTierImageStage: CSSProperties = {
  height: "126px",
  width: "100%",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.09)",
  background:
    "radial-gradient(circle at 50% 45%, rgba(126,232,255,0.09), rgba(255,255,255,0.015) 68%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const performanceTierImage: CSSProperties = {
  width: "96%",
  height: "96%",
  objectFit: "contain",
  filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.45))",
};

const performanceTierNumber: CSSProperties = {
  width: "25px",
  height: "25px",
  borderRadius: "8px",
  display: "grid",
  placeItems: "center",
  background: "rgba(126,232,255,0.08)",
  color: "#8ee8ff",
  fontSize: "10px",
  fontWeight: 900,
};

const performanceTierName: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 900,
};

const performanceTierDescription: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.48)",
  fontSize: "10px",
  lineHeight: 1.35,
};

function performanceTierStatus(owned: boolean, next: boolean): CSSProperties {
  return {
    marginTop: "auto",
    color: owned ? "#8dffbf" : next ? "#ffd76a" : "rgba(255,255,255,0.28)",
    fontSize: "9px",
    letterSpacing: "0.07em",
  };
}

const performanceCategoryFooter: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginTop: "13px",
  color: "rgba(255,255,255,0.53)",
  fontSize: "11px",
};

const performanceConfirmActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "8px",
  flexWrap: "wrap",
};

function performanceCancelButton(enabled: boolean): CSSProperties {
  return {
    minHeight: "40px",
    borderRadius: "11px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: enabled
      ? "rgba(255,255,255,0.055)"
      : "rgba(255,255,255,0.025)",
    color: enabled
      ? "rgba(255,255,255,0.82)"
      : "rgba(255,255,255,0.32)",
    padding: "0 15px",
    fontSize: "10px",
    fontWeight: 900,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function performanceConfirmButton(enabled: boolean): CSSProperties {
  return {
    minHeight: "40px",
    borderRadius: "11px",
    border: enabled
      ? "1px solid rgba(255,224,120,0.58)"
      : "1px solid rgba(255,255,255,0.08)",
    background: enabled
      ? "linear-gradient(135deg,#ffd76a,#ff9f43)"
      : "rgba(255,255,255,0.035)",
    color: enabled
      ? "#241400"
      : "rgba(255,255,255,0.34)",
    padding: "0 15px",
    fontSize: "10px",
    fontWeight: 950,
    cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: enabled
      ? "0 0 18px rgba(255,215,106,0.18)"
      : "none",
  };
}

const performanceMaxBadge: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid rgba(111,255,184,0.24)",
  background: "rgba(70,210,140,0.08)",
  color: "#8dffbf",
  padding: "9px 12px",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const coursesPanel: CSSProperties = {
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(5,18,42,0.72)",
  padding: "22px",
  display: "grid",
  gap: "18px",
};

const coursesIntro: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(255,255,255,0.55)",
  fontSize: "13px",
  lineHeight: 1.55,
};

const courseNotice: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(255,190,102,0.3)",
  background: "rgba(255,160,66,0.08)",
  color: "#ffd9a0",
  padding: "12px 14px",
  fontSize: "12px",
};

const courseGrid: CSSProperties = {
  display: "grid",
  gap: "12px",
};

function courseCard(canOpen: boolean, completed: boolean): CSSProperties {
  return {
    borderRadius: "17px",
    border: `1px solid ${
      completed
        ? "rgba(102,240,208,0.34)"
        : canOpen
          ? "rgba(126,232,255,0.3)"
          : "rgba(255,255,255,0.09)"
    }`,
    background: canOpen
      ? "linear-gradient(135deg,rgba(24,72,107,0.36),rgba(16,28,65,0.62))"
      : "rgba(255,255,255,0.025)",
    padding: "15px",
    display: "grid",
    gridTemplateColumns: "46px minmax(0,1fr) auto",
    alignItems: "center",
    gap: "14px",
    opacity: canOpen ? 1 : 0.62,
  };
}

function courseNumber(canOpen: boolean): CSSProperties {
  return {
    width: "46px",
    height: "46px",
    borderRadius: "12px",
    border: `1px solid ${canOpen ? "rgba(126,232,255,0.55)" : "rgba(255,255,255,0.12)"}`,
    background: canOpen ? "rgba(53,197,255,0.13)" : "rgba(255,255,255,0.03)",
    color: canOpen ? "#9af2ff" : "rgba(255,255,255,0.45)",
    display: "grid",
    placeItems: "center",
    fontSize: "20px",
    fontWeight: 950,
  };
}

function courseStatus(canOpen: boolean): CSSProperties {
  return {
    margin: 0,
    color: canOpen ? "#77efdc" : "rgba(255,255,255,0.38)",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "0.13em",
  };
}

const courseTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "16px",
};

const courseDescription: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.5)",
  fontSize: "11px",
  lineHeight: 1.45,
};

const courseBest: CSSProperties = {
  margin: "7px 0 0",
  color: "#8ee8ff",
  fontSize: "10px",
  fontWeight: 800,
};

function courseButton(
  enabled: boolean,
  kind: "play" | "gem" | "locked" = "play",
): CSSProperties {
  const activeBackground =
    kind === "gem"
      ? "linear-gradient(135deg,#9b6dff,#d27cff)"
      : "linear-gradient(135deg,#35c5ff,#5c6cff)";

  return {
    minWidth: kind === "gem" ? "96px" : "78px",
    minHeight: "40px",
    borderRadius: "11px",
    border: enabled
      ? kind === "gem"
        ? "1px solid rgba(225,200,255,0.52)"
        : "1px solid rgba(126,232,255,0.42)"
      : "1px solid rgba(255,255,255,0.08)",
    background: enabled ? activeBackground : "rgba(255,255,255,0.03)",
    color: enabled ? "white" : "rgba(255,255,255,0.3)",
    padding: "0 13px",
    fontWeight: 900,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

const leaderboardPanel: CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.08)",
  paddingTop: "18px",
};

const leaderboardHeadingRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const leaderboardCoursePill: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.22)",
  color: "rgba(174,240,255,0.7)",
  padding: "7px 10px",
  fontSize: "9px",
  fontWeight: 800,
};

const leaderboardLevelTabs: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "7px",
};

function leaderboardLevelButton(active: boolean): CSSProperties {
  return {
    minHeight: "36px",
    borderRadius: "10px",
    border: active
      ? "1px solid rgba(126,232,255,0.48)"
      : "1px solid rgba(255,255,255,0.08)",
    background: active
      ? "rgba(53,197,255,0.16)"
      : "rgba(255,255,255,0.025)",
    color: active ? "#c8f8ff" : "rgba(255,255,255,0.46)",
    fontSize: "11px",
    fontWeight: 850,
    cursor: "pointer",
  };
}

const leaderboardList: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gap: "7px",
};

function leaderboardRow(isCurrentUser: boolean): CSSProperties {
  return {
    borderRadius: "12px",
    border: isCurrentUser
      ? "1px solid rgba(102,240,208,0.34)"
      : "1px solid rgba(255,255,255,0.07)",
    background: isCurrentUser
      ? "rgba(28,130,111,0.12)"
      : "rgba(255,255,255,0.025)",
    padding: "10px 12px",
    display: "grid",
    gridTemplateColumns: "38px minmax(0,1fr) auto",
    alignItems: "center",
    gap: "9px",
  };
}

const leaderboardRank: CSSProperties = {
  color: "#8ee8ff",
  fontSize: "14px",
};

const leaderboardName: CSSProperties = {
  margin: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "12px",
  fontWeight: 850,
};

const leaderboardMeta: CSSProperties = {
  margin: "3px 0 0",
  color: "rgba(255,255,255,0.42)",
  fontSize: "9px",
};

const leaderboardScore: CSSProperties = {
  color: "#ffffff",
  fontSize: "13px",
};

const emptyLeaderboard: CSSProperties = {
  margin: "12px 0 0",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.025)",
  padding: "16px",
  color: "rgba(255,255,255,0.45)",
  fontSize: "11px",
  textAlign: "center",
};

const novaGuideButton: CSSProperties = {
  position: "fixed",
  left: "18px",
  bottom: "18px",
  zIndex: 80,
  minHeight: "46px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.48)",
  background:
    "linear-gradient(135deg, rgba(4,25,48,0.96), rgba(28,43,98,0.96))",
  color: "white",
  padding: "0 16px 0 10px",
  display: "inline-flex",
  alignItems: "center",
  gap: "9px",
  boxShadow:
    "0 14px 38px rgba(0,0,0,0.42), 0 0 22px rgba(83,215,255,0.18)",
  backdropFilter: "blur(14px)",
  cursor: "pointer",
  fontSize: "10px",
  fontWeight: 950,
  letterSpacing: "0.09em",
};

const novaGuideButtonIcon: CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(circle at 35% 30%, #d8fbff, #53d7ff 46%, #526cff 100%)",
  color: "#041025",
  boxShadow: "0 0 14px rgba(83,215,255,0.55)",
  fontSize: "15px",
};

const novaGuidePanel: CSSProperties = {
  position: "fixed",
  left: "18px",
  bottom: "76px",
  zIndex: 81,
  width: "min(380px, calc(100vw - 36px))",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.34)",
  background:
    "linear-gradient(145deg, rgba(4,17,37,0.98), rgba(12,27,60,0.98))",
  boxShadow: "0 24px 65px rgba(0,0,0,0.5)",
  padding: "15px",
  backdropFilter: "blur(18px)",
};

const novaGuidePanelTop: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const novaGuideIdentity: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const novaGuideAvatar: CSSProperties = {
  width: "38px",
  height: "38px",
  flex: "0 0 38px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(circle at 35% 30%, #e9fdff, #53d7ff 48%, #5967ff 100%)",
  color: "#061023",
  fontSize: "19px",
  boxShadow: "0 0 18px rgba(83,215,255,0.5)",
};

const novaGuideEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "8px",
  fontWeight: 950,
  letterSpacing: "0.14em",
};

const novaGuideTitle: CSSProperties = {
  display: "block",
  marginTop: "3px",
  fontSize: "14px",
};

const novaGuideClose: CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "9px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.8)",
  cursor: "pointer",
  fontSize: "18px",
};

const novaGuideBody: CSSProperties = {
  margin: "13px 0 0",
  color: "rgba(255,255,255,0.72)",
  fontSize: "12px",
  lineHeight: 1.55,
};

const novaGuideTip: CSSProperties = {
  marginTop: "11px",
  borderRadius: "11px",
  border: "1px solid rgba(111,255,157,0.22)",
  background: "rgba(111,255,157,0.07)",
  color: "#aaffc4",
  padding: "9px 10px",
  fontSize: "10px",
  lineHeight: 1.45,
};

const rotateGatePage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999,
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background:
    "radial-gradient(circle at 50% 30%, rgba(53,197,255,0.18), transparent 34%), linear-gradient(180deg,#07152b,#020711)",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const rotateGateCard: CSSProperties = {
  width: "min(420px, 92vw)",
  textAlign: "center",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(5,17,39,0.92)",
  padding: "30px 24px",
  boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
};

const rotateDeviceIcon: CSSProperties = {
  width: "74px",
  height: "74px",
  margin: "0 auto 18px",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.42)",
  display: "grid",
  placeItems: "center",
  fontSize: "38px",
  color: "#7ee8ff",
  background: "rgba(126,232,255,0.07)",
};

const rotateGateTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "27px",
};

const rotateGateCopy: CSSProperties = {
  margin: "12px auto 0",
  maxWidth: "330px",
  color: "rgba(255,255,255,0.68)",
  lineHeight: 1.55,
  fontSize: "13px",
};

function hangarWorkspace(isCompact: boolean): CSSProperties {
  return {
    height: "calc(100dvh - 72px)",
    width: "100%",
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "minmax(210px, 25%) minmax(360px, 42%) minmax(330px, 33%)"
      : "minmax(250px, 18%) minmax(560px, 48%) minmax(430px, 34%)",
    gap: 0,
    overflow: "hidden",
    padding: isCompact ? "10px 12px 12px" : "12px 18px 16px",
  };
}

function fleetPane(_isCompact: boolean): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    display: "grid",
    gridTemplateRows: "auto minmax(0,1fr)",
    overflow: "hidden",
    padding: "6px 14px 6px 2px",
    borderRight: "1px solid rgba(126,232,255,0.14)",
  };
}

function roverFocusPane(_isCompact: boolean): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    display: "grid",
    gridTemplateRows: "auto minmax(0,1fr) auto auto auto",
    overflow: "hidden",
    padding: "6px clamp(16px,2vw,30px)",
  };
}

function buildPane(_isCompact: boolean): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    display: "grid",
    gridTemplateRows: "auto minmax(0,1fr)",
    overflow: "hidden",
    padding: "6px 2px 6px 16px",
    borderLeft: "1px solid rgba(126,232,255,0.14)",
  };
}

const compactPaneHeading: CSSProperties = {
  minHeight: "52px",
  padding: "2px 4px 8px",
};

const compactPaneTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "18px",
};

const fleetCompactList: CSSProperties = {
  minHeight: 0,
  height: "100%",
  display: "grid",
  gridTemplateRows: "repeat(6, minmax(0, 1fr))",
  gap: "7px",
  overflow: "hidden",
};

function fleetCompactRow(
  selected: boolean,
  equipped: boolean,
  accent: string,
): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    borderRadius: "13px",
    border: selected
      ? `1px solid ${accent}aa`
      : equipped
        ? `1px solid ${accent}66`
        : "1px solid rgba(255,255,255,0.08)",
    background: selected
      ? `linear-gradient(135deg,${accent}20,rgba(255,255,255,0.045))`
      : "rgba(255,255,255,0.025)",
    display: "grid",
    gridTemplateColumns: "64px minmax(0,1fr) auto",
    alignItems: "center",
    gap: "9px",
    padding: "7px 8px",
    cursor: "pointer",
    overflow: "hidden",
  };
}

const fleetCompactImage: CSSProperties = {
  width: "64px",
  height: "52px",
  objectFit: "contain",
};

const fleetCompactIdentity: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
};

const fleetCompactName: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "12px",
};

function fleetCompactMeta(
  equipped: boolean,
  accent: string,
): CSSProperties {
  return {
    color: equipped ? accent : "rgba(255,255,255,0.52)",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.03em",
  };
}

const fleetCompactAction: CSSProperties = {
  display: "grid",
  placeItems: "center",
};

function compactFleetButton(
  enabled: boolean,
  kind: "equip" | "buy",
): CSSProperties {
  return {
    minWidth: kind === "buy" ? "48px" : "54px",
    minHeight: "32px",
    borderRadius: "9px",
    border: enabled
      ? kind === "buy"
        ? "1px solid rgba(255,215,106,0.55)"
        : "1px solid rgba(126,232,255,0.4)"
      : "1px solid rgba(255,255,255,0.07)",
    background: enabled
      ? kind === "buy"
        ? "linear-gradient(135deg,#ffd76a,#ff9f43)"
        : "linear-gradient(135deg,#35c5ff,#5867ff)"
      : "rgba(255,255,255,0.03)",
    color: enabled
      ? kind === "buy"
        ? "#241400"
        : "white"
      : "rgba(255,255,255,0.3)",
    padding: "0 8px",
    fontSize: "9px",
    fontWeight: 950,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

const compactEquippedBadge: CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  color: "#8dffbf",
  border: "1px solid rgba(111,255,184,0.34)",
  background: "rgba(111,255,184,0.08)",
  fontWeight: 950,
};

const compactLockedBadge: CSSProperties = {
  color: "rgba(255,255,255,0.3)",
  fontSize: "8px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const roverFocusTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const roverFocusTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(22px,2.2vw,34px)",
  lineHeight: 1.05,
};

const roverFocusVehicleStage: CSSProperties = {
  position: "relative",
  minHeight: 0,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const roverFocusVehicleImage: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "97%",
  height: "97%",
  objectFit: "contain",
  filter: "drop-shadow(0 34px 34px rgba(0,0,0,0.55))",
};

const roverFocusActionArea: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  paddingTop: "4px",
};

const focusMessageStrip: CSSProperties = {
  margin: "6px auto 0",
  width: "min(520px,100%)",
  minHeight: "28px",
  display: "grid",
  placeItems: "center",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(126,232,255,0.04)",
  color: "rgba(255,255,255,0.7)",
  padding: "5px 10px",
  fontSize: "9px",
  textAlign: "center",
};

const statsBottomDock: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0,1.5fr) minmax(250px,0.8fr)",
  gap: "10px",
  alignItems: "stretch",
  paddingTop: "8px",
};

const compactRunSummary: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "7px",
};

const equipToTuneCompact: CSSProperties = {
  minHeight: 0,
  height: "100%",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "10px",
  textAlign: "center",
  color: "rgba(255,255,255,0.72)",
};

const compactMutedText: CSSProperties = {
  maxWidth: "260px",
  color: "rgba(255,255,255,0.48)",
  fontSize: "10px",
  lineHeight: 1.45,
};

const compactBuildShell: CSSProperties = {
  minHeight: 0,
  height: "100%",
  display: "grid",
  gridTemplateRows: "minmax(0,1fr) auto",
  gap: "8px",
  overflow: "hidden",
};

const compactBuildGrid: CSSProperties = {
  minHeight: 0,
  height: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gridTemplateRows: "repeat(3,minmax(0,1fr))",
  gap: "9px",
  overflow: "hidden",
};

const compactBuildUnavailable: CSSProperties = {
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "rgba(255,255,255,0.5)",
  fontSize: "11px",
};

const compactBuildMessage: CSSProperties = {
  minHeight: "26px",
  borderRadius: "9px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(126,232,255,0.04)",
  color: "#c8f8ff",
  padding: "6px 9px",
  fontSize: "9px",
};

const upgradeCarouselBox: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(255,255,255,0.025)",
  padding: "9px",
  display: "grid",
  gridTemplateRows: "auto minmax(0,1fr) auto",
  gap: "6px",
};

const upgradeCarouselHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "8px",
};

const upgradeCarouselEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "7px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const upgradeCarouselTitle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "12px",
};

const upgradeCarouselRating: CSSProperties = {
  borderRadius: "8px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(83,215,255,0.06)",
  color: "#9af6ff",
  padding: "4px 6px",
  fontSize: "9px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const appearanceBadge: CSSProperties = {
  ...upgradeCarouselRating,
  color: "#ffd76a",
  border: "1px solid rgba(255,215,106,0.22)",
  background: "rgba(255,215,106,0.05)",
};

const upgradeCarouselViewer: CSSProperties = {
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "30px minmax(0,1fr) 30px",
  alignItems: "center",
  gap: "4px",
};

function upgradeArrow(enabled: boolean): CSSProperties {
  return {
    width: "28px",
    height: "36px",
    borderRadius: "9px",
    border: enabled
      ? "1px solid rgba(126,232,255,0.26)"
      : "1px solid rgba(255,255,255,0.05)",
    background: enabled
      ? "rgba(126,232,255,0.055)"
      : "rgba(255,255,255,0.015)",
    color: enabled ? "#bdf7ff" : "rgba(255,255,255,0.18)",
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "22px",
    lineHeight: 1,
  };
}

const upgradeCarouselPart: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  display: "grid",
  gridTemplateRows: "minmax(0,1fr) auto auto",
  placeItems: "center",
  textAlign: "center",
  gap: "2px",
};

const upgradeCarouselImage: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  maxHeight: "110px",
  objectFit: "contain",
  filter: "drop-shadow(0 10px 12px rgba(0,0,0,0.4))",
};

const appearancePreviewImage: CSSProperties = {
  ...upgradeCarouselImage,
  maxHeight: "100px",
};

const upgradeCarouselFallback: CSSProperties = {
  width: "54px",
  height: "54px",
  borderRadius: "14px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(126,232,255,0.2)",
  color: "#7ee8ff",
};

const upgradeCarouselPartName: CSSProperties = {
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "9px",
};

const upgradeCarouselTier: CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "8px",
  fontWeight: 800,
};

const upgradeCarouselFooter: CSSProperties = {
  minHeight: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const weaponLockedState: CSSProperties = {
  color: "#ffcf72",
  fontSize: "8px",
  fontWeight: 950,
  textTransform: "uppercase",
  textAlign: "center",
  letterSpacing: "0.04em",
};

const upgradeStateInstalled: CSSProperties = {
  color: "#8dffbf",
  fontSize: "8px",
  fontWeight: 950,
  textTransform: "uppercase",
};

const upgradeStateMuted: CSSProperties = {
  color: "rgba(255,255,255,0.32)",
  fontSize: "8px",
  fontWeight: 900,
  textTransform: "uppercase",
  textAlign: "center",
};

const upgradeConfirmRow: CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "0.8fr 1.2fr",
  gap: "5px",
};

const smallCancelButton: CSSProperties = {
  minHeight: "28px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.76)",
  fontSize: "8px",
  fontWeight: 900,
  cursor: "pointer",
};

function smallConfirmButton(enabled: boolean): CSSProperties {
  return {
    minHeight: "28px",
    borderRadius: "8px",
    border: enabled
      ? "1px solid rgba(111,255,157,0.38)"
      : "1px solid rgba(255,255,255,0.06)",
    background: enabled
      ? "linear-gradient(135deg,#79f5a6,#39d77a)"
      : "rgba(255,255,255,0.025)",
    color: enabled ? "#052112" : "rgba(255,255,255,0.28)",
    fontSize: "8px",
    fontWeight: 950,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function smallInstallButton(enabled: boolean): CSSProperties {
  return {
    minHeight: "28px",
    width: "100%",
    borderRadius: "8px",
    border: enabled
      ? "1px solid rgba(255,215,106,0.4)"
      : "1px solid rgba(255,255,255,0.06)",
    background: enabled
      ? "linear-gradient(135deg,#ffd76a,#ff9f43)"
      : "rgba(255,255,255,0.025)",
    color: enabled ? "#241400" : "rgba(255,255,255,0.3)",
    padding: "0 6px",
    fontSize: "8px",
    fontWeight: 950,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function hangarLayout(isCompact: boolean): CSSProperties {
  return {
    width: "100%",
    maxWidth: "none",
    padding: isCompact ? "14px" : "20px clamp(18px,2vw,34px) 34px",
    display: "grid",
    gridTemplateColumns: isCompact
      ? "1fr"
      : "minmax(285px,0.72fr) minmax(520px,1.28fr) minmax(390px,1fr)",
    gap: "18px",
    alignItems: "start",
  };
}

function fleetRail(isCompact: boolean): CSSProperties {
  return {
    minWidth: 0,
    maxHeight: isCompact ? "none" : "calc(100dvh - 112px)",
    overflowY: isCompact ? "visible" : "auto",
    overflowX: "hidden",
    borderRadius: "22px",
    border: "1px solid rgba(126,232,255,0.16)",
    background: "rgba(4,15,34,0.74)",
    padding: "14px",
  };
}

function centerRoverColumn(isCompact: boolean): CSSProperties {
  return {
    minWidth: 0,
    display: "grid",
    gap: "14px",
    position: isCompact ? "static" : "sticky",
    top: isCompact ? undefined : "82px",
  };
}

function partsRail(isCompact: boolean): CSSProperties {
  return {
    minWidth: 0,
    maxHeight: isCompact ? "none" : "calc(100dvh - 112px)",
    overflowY: isCompact ? "visible" : "auto",
    overflowX: "hidden",
    borderRadius: "22px",
    border: "1px solid rgba(126,232,255,0.16)",
    background: "rgba(4,15,34,0.74)",
    padding: "14px",
  };
}

const hangarSectionHeading: CSSProperties = {
  padding: "4px 4px 12px",
};

const hangarSectionTitle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "20px",
};

const hangarSectionCopy: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(255,255,255,0.57)",
  fontSize: "11px",
  lineHeight: 1.5,
};

function centerRoverCard(accent: string): CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: "24px",
    border: `1px solid ${accent}50`,
    background:
      "linear-gradient(155deg,rgba(6,21,47,0.98),rgba(8,15,38,0.96))",
    boxShadow: `0 0 44px ${accent}12`,
    padding: "clamp(18px,1.6vw,26px)",
  };
}

const centerRoverTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
};

const centerRoverTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(22px,2vw,34px)",
  lineHeight: 1.08,
};

const centerVehicleStage: CSSProperties = {
  position: "relative",
  height: "clamp(390px,42vw,610px)",
  minHeight: "390px",
  marginTop: "10px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

function vehicleHalo(accent: string): CSSProperties {
  return {
    position: "absolute",
    width: "72%",
    aspectRatio: "1 / 0.42",
    borderRadius: "50%",
    background: `radial-gradient(ellipse, ${accent}32, transparent 68%)`,
    filter: "blur(12px)",
    bottom: "12%",
  };
}

const centerVehicleImage: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "98%",
  height: "96%",
  objectFit: "contain",
  filter: "drop-shadow(0 34px 34px rgba(0,0,0,0.56))",
};

const centerVehicleDescription: CSSProperties = {
  margin: "0 auto",
  maxWidth: "760px",
  color: "rgba(255,255,255,0.68)",
  textAlign: "center",
  fontSize: "12px",
  lineHeight: 1.55,
};

const centerPrimaryActions: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: "16px",
};

const expeditionsButton: CSSProperties = {
  width: "min(420px,100%)",
  minHeight: "54px",
  border: "1px solid rgba(126,232,255,0.48)",
  borderRadius: "15px",
  background: "linear-gradient(135deg,#35c5ff,#5867ff)",
  color: "white",
  fontWeight: 950,
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(53,197,255,0.18)",
};

const disabledCenterButton: CSSProperties = {
  ...expeditionsButton,
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.09)",
  color: "rgba(255,255,255,0.35)",
  cursor: "not-allowed",
  boxShadow: "none",
};

const centerStatsCard: CSSProperties = {
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.15)",
  background: "rgba(5,17,39,0.9)",
  padding: "14px",
};

const centerRunSummary: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
  gap: "9px",
  marginTop: "10px",
};

const equipToTuneCard: CSSProperties = {
  borderRadius: "18px",
  border: "1px dashed rgba(126,232,255,0.25)",
  background: "rgba(126,232,255,0.035)",
  padding: "24px 18px",
  display: "grid",
  gap: "12px",
  justifyItems: "start",
};

const equipToTuneIcon: CSSProperties = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  display: "grid",
  placeItems: "center",
  color: "#7ee8ff",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "rgba(126,232,255,0.06)",
};

const expeditionShell: CSSProperties = {
  padding: "18px clamp(16px,3vw,48px) 36px",
  minHeight: "calc(100dvh - 70px)",
};

const expeditionTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  marginBottom: "14px",
};

const expeditionHeading: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(26px,3vw,42px)",
};

const expeditionLead: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(255,255,255,0.58)",
  fontSize: "12px",
};

const expeditionRoverPill: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  padding: "8px 13px 8px 8px",
  borderRadius: "15px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(7,24,50,0.82)",
};

const expeditionRoverThumb: CSSProperties = {
  width: "78px",
  height: "48px",
  objectFit: "contain",
};

const expeditionPillLabel: CSSProperties = {
  display: "block",
  color: "#7ee8ff",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: "0.13em",
};

const dreamscapeMapCanvas: CSSProperties = {
  position: "relative",
  minHeight: "clamp(620px,72vh,860px)",
  overflow: "hidden",
  borderRadius: "28px",
  border: "1px solid rgba(126,232,255,0.2)",
  background:
    "radial-gradient(circle at 22% 24%,rgba(72,92,255,0.22),transparent 26%), radial-gradient(circle at 77% 35%,rgba(183,78,255,0.18),transparent 24%), linear-gradient(180deg,#071631 0%,#0a1740 48%,#071123 100%)",
  boxShadow: "inset 0 0 120px rgba(0,0,0,0.42)",
};

const mapNebulaOne: CSSProperties = {
  position: "absolute", left: "8%", top: "5%", width: "38%", height: "38%",
  background: "radial-gradient(circle,rgba(71,209,255,0.18),transparent 66%)",
  filter: "blur(18px)",
};
const mapNebulaTwo: CSSProperties = {
  position: "absolute", right: "3%", top: "8%", width: "40%", height: "38%",
  background: "radial-gradient(circle,rgba(184,80,255,0.18),transparent 66%)",
  filter: "blur(20px)",
};
const mapPlanet: CSSProperties = {
  position: "absolute", right: "10%", top: "7%", width: "150px", height: "150px",
  borderRadius: "50%",
  background: "radial-gradient(circle at 35% 35%,#5c7aff,#27347e 52%,#101737 74%)",
  opacity: 0.42,
  boxShadow: "0 0 60px rgba(92,122,255,0.24)",
};
const mapMountainA: CSSProperties = {
  position: "absolute", left: "-5%", bottom: "0", width: "60%", height: "38%",
  background: "linear-gradient(150deg,transparent 37%,rgba(13,35,67,0.95) 38% 62%,transparent 63%)",
  opacity: 0.8,
};
const mapMountainB: CSSProperties = {
  position: "absolute", right: "-8%", bottom: "0", width: "68%", height: "42%",
  background: "linear-gradient(32deg,transparent 36%,rgba(15,31,67,0.96) 37% 63%,transparent 64%)",
  opacity: 0.76,
};

const expeditionRouteSvg: CSSProperties = {
  position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none",
};

const expeditionNodeWrap: CSSProperties = {
  position: "absolute",
  transform: "translate(-50%,-50%)",
  zIndex: 5,
};

function expeditionNode(unlocked: boolean, completed: boolean): CSSProperties {
  return {
    width: "66px", height: "66px", borderRadius: "50%",
    border: completed
      ? "2px solid rgba(111,255,157,0.9)"
      : unlocked
        ? "2px solid rgba(126,232,255,0.92)"
        : "2px solid rgba(255,255,255,0.16)",
    background: completed
      ? "radial-gradient(circle,#1c6d49,#0b2d25 72%)"
      : unlocked
        ? "radial-gradient(circle,#186f8f,#0b2b4c 72%)"
        : "radial-gradient(circle,#222b3b,#111723 72%)",
    color: "white",
    cursor: unlocked ? "pointer" : "not-allowed",
    boxShadow: unlocked ? "0 0 30px rgba(83,215,255,0.34)" : "none",
  };
}

function expeditionNodeNumber(unlocked: boolean, completed: boolean): CSSProperties {
  return {
    display: "grid", placeItems: "center", fontSize: "19px", fontWeight: 950,
    color: completed ? "#aaffc4" : unlocked ? "#c7f8ff" : "rgba(255,255,255,0.36)",
  };
}

function expeditionNodeCard(unlocked: boolean, completed: boolean): CSSProperties {
  return {
    position: "absolute",
    left: "78px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "220px",
    borderRadius: "14px",
    border: completed
      ? "1px solid rgba(111,255,157,0.28)"
      : unlocked
        ? "1px solid rgba(126,232,255,0.28)"
        : "1px solid rgba(255,255,255,0.1)",
    background: "rgba(5,16,37,0.9)",
    padding: "11px 12px",
    backdropFilter: "blur(12px)",
    opacity: unlocked || completed ? 1 : 0.7,
  };
}

function expeditionNodeStatus(unlocked: boolean, completed: boolean): CSSProperties {
  return {
    margin: 0,
    color: completed ? "#8dffbc" : unlocked ? "#7ee8ff" : "rgba(255,255,255,0.38)",
    fontSize: "7px", fontWeight: 950, letterSpacing: "0.11em",
  };
}

const expeditionNodeTitle: CSSProperties = {
  margin: "5px 0 0", fontSize: "14px",
};
const expeditionNodeDetail: CSSProperties = {
  margin: "5px 0 0", color: "rgba(255,255,255,0.55)", fontSize: "9px", lineHeight: 1.4,
};
const mapEnterButton: CSSProperties = {
  marginTop: "9px", minHeight: "30px", borderRadius: "8px",
  border: "1px solid rgba(126,232,255,0.3)", background: "rgba(53,197,255,0.12)",
  color: "#bdf5ff", padding: "0 10px", fontSize: "8px", fontWeight: 900, cursor: "pointer",
};
const mapLegend: CSSProperties = {
  position: "absolute", left: "18px", bottom: "16px", display: "flex", gap: "14px",
  flexWrap: "wrap", padding: "9px 11px", borderRadius: "10px",
  background: "rgba(3,12,29,0.74)", border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.55)", fontSize: "8px",
};

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
