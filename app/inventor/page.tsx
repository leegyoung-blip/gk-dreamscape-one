"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import ObjectivesPanel, {
  type CurrentObjectivesStatus,
} from "@/components/objectives/ObjectivesPanel";
import {
  WorldZoneAdminBar,
  ZoneUnderUpgradeModal,
} from "@/components/world/WorldZoneAccess";

type ScreenMode = "desktop" | "tablet" | "mobile";

type NovaZoneKey =
  | "think_lab"
  | "nova_home"
  | "missions_centre"
  | "knowledge_arena"
  | "skyforge_hangar";

type NovaZoneAccessSettings = Record<NovaZoneKey, boolean>;

const DEFAULT_NOVA_ZONE_ACCESS: NovaZoneAccessSettings = {
  think_lab: true,
  nova_home: true,
  missions_centre: true,
  knowledge_arena: true,
  skyforge_hangar: true,
};

const NOVA_ZONE_KEYS: NovaZoneKey[] = [
  "think_lab",
  "nova_home",
  "missions_centre",
  "knowledge_arena",
  "skyforge_hangar",
];

type DreamTokenTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  created_at: string | null;
};

type DreamGemTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  source: string | null;
  created_at: string | null;
};

type NovaSubscriptionRow = {
  status: string | null;
  access_until: string | null;
};

type StockRow = {
  symbol: string;
  current_price: number;
};

type StockHoldingRow = {
  symbol: string;
  quantity: number;
};

type PropertyRow = {
  id: string;
  current_value: number;
};

type PropertyHoldingRow = {
  property_id: string;
  quantity: number;
};

type ProfileAssetBreakdown = {
  cash: number;
  property: number;
  stocks: number;
};


function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const aspectRatio = width / Math.max(height, 1);

      // Match Milo’s World responsive breakpoint behavior.
      // Keep the spatial hotspot layout on normal landscape desktops/laptops,
      // and only stack the locations when the viewport is genuinely narrow
      // or portrait.
      const shouldUseCompactLayout =
        width < 1180 || isPortrait || aspectRatio < 1.35;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (shouldUseCompactLayout) {
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

function formatDreamTokenAmount(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

function formatDreamTokenTransactionDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDreamGemAmount(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DG`;
}

function formatDreamGemSource(source: string | null) {
  switch (source) {
    case "class_attendance":
      return "Class attendance";
    case "core_mission":
      return "Core Mission";
    case "think_mission":
      return "Think Mission";
    case "redemption":
      return "Reward redemption";
    case "admin_adjustment":
      return "Admin adjustment";
    case "reversal":
      return "Reversal";
    default:
      return "Dream Gem activity";
  }
}

function hasActiveNovaSubscription(rows: NovaSubscriptionRow[]) {
  const now = Date.now();

  return rows.some((row) => {
    if (String(row.status || "").trim().toLowerCase() !== "active") {
      return false;
    }

    if (!row.access_until) return true;

    const expiry = new Date(row.access_until).getTime();
    return Number.isNaN(expiry) || expiry > now;
  });
}

function roleHasStudentRewardsAccess(role: string | null) {
  const cleanRole = String(role || "").trim().toLowerCase();

  return (
    cleanRole === "admin" ||
    cleanRole === "student" ||
    cleanRole === "teacher"
  );
}

type Zone = {
  id: string;
  number: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  accent: string;
  activityLabel: string;
  accessKey: NovaZoneKey;
  adminOnly?: boolean;
  statusLabel?: string;
};

type WalkthroughStep = {
  eyebrow: string;
  title: string;
  text: string;
  zoneNumber?: string;
  showActivityLegend?: boolean;
  showWorldPath?: boolean;
};

const WALKTHROUGH_STORAGE_KEY = "nova-world-walkthrough-completed-v10";
const ROVER_ORIGIN_STORAGE_KEY = "dreamscape-rover-origin";
const ROVER_NOVA_RETURN_PATH_STORAGE_KEY =
  "dreamscape-rover-nova-return-path";
const ROVER_FROM_NOVA_HREF = "/learning-missions/core/rover?from=nova";

function rememberNovaRoverOrigin() {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(ROVER_ORIGIN_STORAGE_KEY, "nova");
  window.sessionStorage.setItem(
    ROVER_NOVA_RETURN_PATH_STORAGE_KEY,
    window.location.pathname,
  );
}

const zones: Zone[] = [
  {
    id: "thinking-skills-lab",
    number: "2",
    title: "Think Lab",
    description: "Where Nova sharpens her mind — and challenges yours.",
    href: "/nova/thinking-skills-lab",
    accessKey: "think_lab",
    icon: "◇",
    accent: "#53d7ff",
    activityLabel: "Academic Challenge",
  },
  {
    id: "nova-home",
    number: "5",
    title: "Nova’s Home",
    description: "Your space. Build it your way.",
    href: "/inventor/hub",
    accessKey: "nova_home",
    icon: "⌂",
    accent: "#c58cff",
    activityLabel: "Play & Build",
  },
  {
    id: "missions-centre",
    number: "1",
    title: "Missions Centre",
    description: "Your launch point for English, Maths, Science, and bigger learning missions.",
    href: "/learning-missions",
    accessKey: "missions_centre",
    icon: "✦",
    accent: "#f6c453",
    activityLabel: "Pure Academics",
  },
  {
    id: "knowledge-arena",
    number: "3",
    title: "Knowledge Arena",
    description: "Jump straight into fast-paced quiz challenges and test what you know.",
    href: "/learning-missions/knowledge-arena",
    accessKey: "knowledge_arena",
    icon: "◎",
    accent: "#53d7ff",
    activityLabel: "Academic Challenge",
  },
  {
    id: "skyforge-hangar",
    number: "4",
    title: "Skyforge Hangar",
    description: "Head straight to your rover, upgrades, and driving challenges.",
    href: ROVER_FROM_NOVA_HREF,
    accessKey: "skyforge_hangar",
    icon: "⇧",
    accent: "#c58cff",
    activityLabel: "Play & Build",
  },
];


const NOVA_WORLD_PATH = [
  { label: "Missions Centre", colour: "#f6c453", zone: "Pure Academics", symbol: "1" },
  { label: "Think Lab", colour: "#53d7ff", zone: "Academic Challenge", symbol: "2" },
  { label: "Knowledge Arena", colour: "#53d7ff", zone: "Academic Challenge", symbol: "3" },
  { label: "Skyforge Hangar", colour: "#c58cff", zone: "Play & Build", symbol: "4" },
  { label: "Nova’s Home", colour: "#c58cff", zone: "Play & Build", symbol: "5" },
];

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    eyebrow: "Hi, I’m Nova",
    title: "Let me show you the best way through Nova’s World.",
    text: "There are three sections. Start with the Missions Centre for your main learning, move into Think Lab and Knowledge Arena for academic challenges, then head to Skyforge Hangar and Nova’s Home for play and building.",
  },
  {
    eyebrow: "Nova’s World Path",
    title: "Follow the locations from 1 to 5.",
    text: "The numbers show the recommended route. Gold is your main academic starting point, blue is for academic challenges, and purple is for play and building.",
    showActivityLegend: true,
    showWorldPath: true,
  },
  {
    eyebrow: "Your Rewards",
    title: "Meet Dream Tokens and Dream Gems.",
    text: "Dream Tokens, or DT, are used for play, upgrades, and building inside Dreamscape. Dream Gems, or DG, are special learning rewards earned through eligible activities.",
  },
  {
    eyebrow: "Gold · Pure Academics · Location 1",
    title: "Start at the Missions Centre.",
    text: "This is your main learning hub for structured English, Maths, Science, and larger curriculum missions.",
    zoneNumber: "1",
  },
  {
    eyebrow: "Blue · Academic Challenge · Location 2",
    title: "Next, sharpen your thinking.",
    text: "Think Lab helps you build logic, memory, pattern recognition, and reasoning through thinking challenges.",
    zoneNumber: "2",
  },
  {
    eyebrow: "Blue · Academic Challenge · Location 3",
    title: "Then test what you know.",
    text: "Knowledge Arena turns curriculum practice into fast-paced quiz battles where you can challenge yourself and apply what you have learned.",
    zoneNumber: "3",
  },
  {
    eyebrow: "Purple · Play & Build · Location 4",
    title: "Now head to Skyforge Hangar.",
    text: "Check your rover, upgrade your build, and launch into rover challenges using what you have earned and unlocked.",
    zoneNumber: "4",
  },
  {
    eyebrow: "Purple · Play & Build · Location 5",
    title: "Finish at Nova’s Home.",
    text: "Use Dream Tokens to unlock spaces, customise your world, and enjoy activities you have earned through learning.",
    zoneNumber: "5",
  },
  {
    eyebrow: "Tour Complete",
    title: "Where do you want to start?",
    text: "That’s the full route: Missions Centre first, then academic challenges, then play and building. Pick any location below, or follow the numbered path whenever you want more direction.",
    showWorldPath: true,
  },
];

export default function NovaWorldPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isTablet = screenMode === "tablet";
  const isMobile = screenMode === "mobile";
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profileAssets, setProfileAssets] = useState<ProfileAssetBreakdown>({
    cash: 0,
    property: 0,
    stocks: 0,
  });
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [dreamGemBalance, setDreamGemBalance] = useState(0);
  const [dreamGemTransactions, setDreamGemTransactions] = useState<
    DreamGemTransaction[]
  >([]);
  const [hasStudentRewardsAccess, setHasStudentRewardsAccess] = useState(false);
  const [dreamGemsLoading, setDreamGemsLoading] = useState(true);
  const [profileAssetsLoading, setProfileAssetsLoading] = useState(true);
  const [objectiveStatus, setObjectiveStatus] =
    useState<CurrentObjectivesStatus | null>(null);
  const [objectivesLoading, setObjectivesLoading] = useState(true);
  const [showMembershipPortal, setShowMembershipPortal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [zoneAccessSettings, setZoneAccessSettings] =
    useState<NovaZoneAccessSettings>(DEFAULT_NOVA_ZONE_ACCESS);
  const [zoneAccessLoading, setZoneAccessLoading] = useState(true);
  const [updatingZoneAccess, setUpdatingZoneAccess] =
    useState<NovaZoneKey | null>(null);
  const [maintenanceZone, setMaintenanceZone] = useState<Zone | null>(null);
  const [zoneAccessMessage, setZoneAccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUserTokensAndObjectives() {
      if (isMounted) {
        setObjectivesLoading(true);
        setDreamGemsLoading(true);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setUserEmail(null);
        setProfileAssets({ cash: 0, property: 0, stocks: 0 });
        setTokenTransactions([]);
        setDreamGemBalance(0);
        setDreamGemTransactions([]);
        setHasStudentRewardsAccess(false);
        setIsAdmin(false);
        setDreamGemsLoading(false);
        setProfileAssetsLoading(false);
        setObjectiveStatus(null);
        setObjectivesLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      // Resolve the user's global Referral Objective + Nova Progress Objective.
      // The scoped RPC also settles a newly completed Nova Progress Objective
      // before the DT/DG balances below are reloaded.
      const { data: objectiveData, error: objectiveError } =
        await supabase.rpc("get_current_objectives", {
          p_scope: "nova",
        });

      if (!isMounted) return;

      if (objectiveError) {
        console.warn(
          "Could not load Nova objectives:",
          objectiveError.message,
        );
        setObjectiveStatus(null);
      } else {
        setObjectiveStatus(
          (objectiveData as CurrentObjectivesStatus | null) ?? null,
        );
      }

      setProfileAssetsLoading(true);

      const [
        profileResult,
        subscriptionResult,
        gemTransactionsResult,
        balanceResult,
        recentTransactionsResult,
        stocksResult,
        stockHoldingsResult,
        propertiesResult,
        propertyHoldingsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,dream_gem_balance")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("nova_subscriptions")
          .select("status,access_until")
          .eq("user_id", user.id),
        supabase
          .from("dream_gem_transactions")
          .select("id,amount,type,title,source,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),
        supabase
          .from("dream_token_transactions")
          .select("id,amount,type,title,created_at")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("milo_exchange_stocks")
          .select("symbol,current_price")
          .eq("is_active", true),
        supabase
          .from("milo_exchange_holdings")
          .select("symbol,quantity")
          .eq("user_id", user.id),
        supabase
          .from("milo_exchange_properties")
          .select("id,current_value")
          .eq("is_active", true),
        supabase
          .from("milo_exchange_property_holdings")
          .select("property_id,quantity")
          .eq("user_id", user.id),
      ]);

      if (!isMounted) return;

      if (profileResult.error) {
        console.warn(
          "Could not load Dream Gem balance:",
          profileResult.error.message,
        );
        setDreamGemBalance(0);
      } else {
        setDreamGemBalance(
          Math.max(0, Number(profileResult.data?.dream_gem_balance || 0)),
        );
      }

      const role = profileResult.data?.role
        ? String(profileResult.data.role)
        : null;

      setIsAdmin(String(role || "").trim().toLowerCase() === "admin");

      const subscriptionRows = subscriptionResult.error
        ? []
        : ((subscriptionResult.data || []) as NovaSubscriptionRow[]);

      if (subscriptionResult.error) {
        console.warn(
          "Could not load Nova Student Access status:",
          subscriptionResult.error.message,
        );
      }

      setHasStudentRewardsAccess(
        roleHasStudentRewardsAccess(role) ||
          hasActiveNovaSubscription(subscriptionRows),
      );

      if (gemTransactionsResult.error) {
        console.warn(
          "Could not load Dream Gem transactions:",
          gemTransactionsResult.error.message,
        );
        setDreamGemTransactions([]);
      } else {
        setDreamGemTransactions(
          (gemTransactionsResult.data || []).map((transaction) => ({
            id: String(transaction.id),
            amount: Number(transaction.amount || 0),
            type: transaction.type ? String(transaction.type) : null,
            title: transaction.title ? String(transaction.title) : null,
            source: transaction.source ? String(transaction.source) : null,
            created_at: transaction.created_at
              ? String(transaction.created_at)
              : null,
          })),
        );
      }

      const cashValue = balanceResult.error
        ? 0
        : balanceResult.data?.reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0,
          ) || 0;

      if (balanceResult.error) {
        console.warn("Could not load Dreamscape Tokens:", balanceResult.error);
      }

      const stockPrices = new Map(
        ((stocksResult.data || []) as StockRow[]).map((stock) => [
          stock.symbol,
          Number(stock.current_price || 0),
        ]),
      );
      const stockValue = stockHoldingsResult.error
        ? 0
        : ((stockHoldingsResult.data || []) as StockHoldingRow[]).reduce(
            (total, holding) =>
              total +
              Number(holding.quantity || 0) *
                Number(stockPrices.get(holding.symbol) || 0),
            0,
          );

      const propertyPrices = new Map(
        ((propertiesResult.data || []) as PropertyRow[]).map((property) => [
          property.id,
          Number(property.current_value || 0),
        ]),
      );
      const propertyValue = propertyHoldingsResult.error
        ? 0
        : ((propertyHoldingsResult.data || []) as PropertyHoldingRow[]).reduce(
            (total, holding) =>
              total +
              Number(holding.quantity || 0) *
                Number(propertyPrices.get(holding.property_id) || 0),
            0,
          );

      if (stocksResult.error || stockHoldingsResult.error) {
        console.warn(
          "Could not load stock assets:",
          stocksResult.error?.message || stockHoldingsResult.error?.message,
        );
      }

      if (propertiesResult.error || propertyHoldingsResult.error) {
        console.warn(
          "Could not load property assets:",
          propertiesResult.error?.message || propertyHoldingsResult.error?.message,
        );
      }

      setProfileAssets({
        cash: cashValue,
        property: propertyValue,
        stocks: stockValue,
      });

      if (recentTransactionsResult.error) {
        console.warn(
          "Could not load recent Dreamscape Token transactions:",
          recentTransactionsResult.error.message,
        );
        setTokenTransactions([]);
      } else {
        setTokenTransactions(
          (recentTransactionsResult.data || []).map((transaction) => ({
            id: String(transaction.id),
            amount: Number(transaction.amount || 0),
            type: transaction.type ? String(transaction.type) : null,
            title: transaction.title ? String(transaction.title) : null,
            created_at: transaction.created_at
              ? String(transaction.created_at)
              : null,
          })),
        );
      }

      setProfileAssetsLoading(false);
      setDreamGemsLoading(false);
      setObjectivesLoading(false);
    }

    loadUserTokensAndObjectives();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserTokensAndObjectives();
    });

    function refreshObjectives() {
      loadUserTokensAndObjectives();
    }

    window.addEventListener("focus", refreshObjectives);
    window.addEventListener("dream-tokens-updated", refreshObjectives);
    window.addEventListener("dream-gems-updated", refreshObjectives);
    window.addEventListener("dream-objectives-updated", refreshObjectives);
    window.addEventListener(
      "dream-referral-objectives-updated",
      refreshObjectives,
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshObjectives);
      window.removeEventListener("dream-tokens-updated", refreshObjectives);
      window.removeEventListener("dream-gems-updated", refreshObjectives);
      window.removeEventListener("dream-objectives-updated", refreshObjectives);
      window.removeEventListener(
        "dream-referral-objectives-updated",
        refreshObjectives,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorldZoneAccess() {
      const { data, error } = await supabase
        .from("world_zone_settings")
        .select("zone_key,public_access_enabled")
        .eq("world_key", "nova")
        .in("zone_key", NOVA_ZONE_KEYS);

      if (cancelled) return;

      if (error) {
        console.warn("Could not load Nova zone access settings:", error.message);
        setZoneAccessLoading(false);
        return;
      }

      const nextSettings: NovaZoneAccessSettings = {
        ...DEFAULT_NOVA_ZONE_ACCESS,
      };

      for (const row of data || []) {
        const zoneKey = String(row.zone_key) as NovaZoneKey;
        if (zoneKey in nextSettings) {
          nextSettings[zoneKey] = Boolean(row.public_access_enabled);
        }
      }

      setZoneAccessSettings(nextSettings);
      setZoneAccessLoading(false);
    }

    function refreshWorldZoneAccess() {
      void loadWorldZoneAccess();
    }

    void loadWorldZoneAccess();
    window.addEventListener("world-zone-access-updated", refreshWorldZoneAccess);
    window.addEventListener("focus", refreshWorldZoneAccess);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "world-zone-access-updated",
        refreshWorldZoneAccess,
      );
      window.removeEventListener("focus", refreshWorldZoneAccess);
    };
  }, []);

  useEffect(() => {
    try {
      const walkthroughCompleted = window.localStorage.getItem(
        WALKTHROUGH_STORAGE_KEY,
      );

      if (!walkthroughCompleted) {
        setWalkthroughStep(0);
        setWalkthroughOpen(true);
      }
    } catch {
      setWalkthroughStep(0);
      setWalkthroughOpen(true);
    }
  }, []);


  const worldZones: Zone[] = zones.map((zone) => {
    const enabled = zoneAccessSettings[zone.accessKey];
    return {
      ...zone,
      adminOnly: !isAdmin && !enabled,
      statusLabel: !enabled ? "Upgrading" : undefined,
    };
  });

  const activeWalkthroughZoneNumber = walkthroughOpen
    ? (WALKTHROUGH_STEPS[walkthroughStep]?.zoneNumber ?? null)
    : null;
  const activeWalkthroughZone = activeWalkthroughZoneNumber
    ? (worldZones.find((zone) => zone.number === activeWalkthroughZoneNumber) ?? null)
    : null;
  const displayedDesktopZone =
    activeWalkthroughZone ?? selectedZone ?? hoveredZone;

  function startWalkthrough() {
    setShowMembershipPortal(false);
    setHoveredZone(null);
    setSelectedZone(null);
    setWalkthroughStep(0);
    setWalkthroughOpen(true);
  }

  function closeWalkthrough() {
    try {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
    } catch {
      // The walkthrough still closes if browser storage is unavailable.
    }

    setWalkthroughOpen(false);
    setWalkthroughStep(0);
    setHoveredZone(null);
    setSelectedZone(null);
  }

  function isZonePubliclyOpen(zone: Zone) {
    return zoneAccessSettings[zone.accessKey];
  }

  function showUpgradeNotice(zone: Zone) {
    setHoveredZone(null);
    setSelectedZone(null);
    setMaintenanceZone(zone);
  }

  function selectZone(zone: Zone) {
    if (walkthroughOpen) return;

    if (!isAdmin && !isZonePubliclyOpen(zone)) {
      showUpgradeNotice(zone);
      return;
    }

    setHoveredZone(null);
    setSelectedZone(zone);
  }

  function enterZone(zone: Zone) {
    if (!isAdmin && !isZonePubliclyOpen(zone)) {
      showUpgradeNotice(zone);
      return;
    }

    if (zone.id === "skyforge-hangar") {
      rememberNovaRoverOrigin();
    }

    window.location.href = zone.href;
  }

  function navigateFromGuide(href: string) {
    const targetZone = zones.find((zone) => zone.href === href);

    if (targetZone && !isAdmin && !isZonePubliclyOpen(targetZone)) {
      closeWalkthrough();
      showUpgradeNotice(targetZone);
      return;
    }

    if (targetZone?.id === "skyforge-hangar") {
      rememberNovaRoverOrigin();
    }

    closeWalkthrough();
    window.location.href = href;
  }

  async function toggleZoneAccess(zoneKey: NovaZoneKey) {
    if (!isAdmin || updatingZoneAccess) return;

    const nextEnabled = !zoneAccessSettings[zoneKey];
    setUpdatingZoneAccess(zoneKey);
    setZoneAccessMessage("");

    const { error } = await supabase.rpc("admin_set_world_zone_access", {
      p_world_key: "nova",
      p_zone_key: zoneKey,
      p_public_access_enabled: nextEnabled,
    });

    if (error) {
      console.warn("Could not update Nova zone access:", error.message);
      setZoneAccessMessage(`Could not update access. ${error.message}`);
      setUpdatingZoneAccess(null);
      return;
    }

    setZoneAccessSettings((current) => ({
      ...current,
      [zoneKey]: nextEnabled,
    }));
    setUpdatingZoneAccess(null);

    const zoneTitle =
      zones.find((zone) => zone.accessKey === zoneKey)?.title || zoneKey;
    setZoneAccessMessage(
      `${zoneTitle} public access is now ${nextEnabled ? "OPEN" : "BLOCKED"}.`,
    );

    window.dispatchEvent(new Event("world-zone-access-updated"));
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        color: "white",
        background: "#020813",
        fontFamily: "Arial, Helvetica, sans-serif",
        paddingBottom: isDesktop ? "42px" : isMobile ? "170px" : "190px",
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/nova/nova-world-bg.png"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/nova/nova-world-bg-loop.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: `
            linear-gradient(
              180deg,
              rgba(2, 8, 18, 0.42) 0%,
              rgba(2, 8, 18, 0.16) 34%,
              rgba(2, 8, 18, 0.88) 100%
            ),
            radial-gradient(
              circle at 50% 38%,
              transparent 0%,
              rgba(2,8,18,0.04) 42%,
              rgba(2,8,18,0.54) 100%
            )
          `,
          pointerEvents: "none",
        }}
      />

      <FloatingControls
        userEmail={userEmail}
        profileAssets={profileAssets}
        tokenTransactions={tokenTransactions}
        dreamGemBalance={dreamGemBalance}
        dreamGemTransactions={dreamGemTransactions}
        dreamGemsLoading={dreamGemsLoading}
        hasStudentRewardsAccess={hasStudentRewardsAccess}
        profileAssetsLoading={profileAssetsLoading}
        screenMode={screenMode}
        onOpenMembership={() => setShowMembershipPortal(true)}
      />

      <ObjectivesPanel
        isLoggedIn={Boolean(userEmail)}
        status={objectiveStatus}
        isLoading={objectivesLoading}
        screenMode={screenMode}
        scope="nova"
      />

      {isAdmin && !walkthroughOpen && (
        <WorldZoneAdminBar
          worldLabel="Nova’s World"
          items={worldZones.map((zone) => ({
            key: zone.accessKey,
            label: zone.title
              .replace("Nova’s ", "")
              .replace("Nova's ", ""),
            enabled: zoneAccessSettings[zone.accessKey],
          }))}
          loading={zoneAccessLoading}
          updatingKey={updatingZoneAccess}
          onToggle={(zoneKey) => void toggleZoneAccess(zoneKey)}
        />
      )}

      {isAdmin && zoneAccessMessage && !walkthroughOpen && (
        <div
          style={{
            position: "fixed",
            top: "124px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 95,
            padding: "8px 12px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(3,10,25,0.84)",
            color: "rgba(255,255,255,0.76)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.05em",
          }}
        >
          {zoneAccessMessage}
        </div>
      )}

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          left: isDesktop ? "46px" : "auto",
          top: isDesktop ? "86px" : "auto",
          zIndex: 10,
          width: isDesktop
            ? "min(365px, 34vw)"
            : "min(640px, calc(100% - 36px))",
          margin: isDesktop ? 0 : isMobile ? "128px auto 26px" : "118px auto 28px",
          padding: isDesktop ? 0 : "0 2px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: 500,
            letterSpacing: isMobile ? "0.18em" : "0.24em",
            textTransform: "uppercase",
            color: "#69d9ff",
            textShadow: "0 8px 22px rgba(0,0,0,0.45)",
          }}
        >
          Dreamscape One Learning Hub
        </p>

        <h1
          style={{
            margin: isMobile ? "10px 0 0" : "12px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? "clamp(42px, 13vw, 58px)"
              : isTablet
              ? "clamp(52px, 7vw, 64px)"
              : "64px",
            fontWeight: 400,
            lineHeight: 1.03,
            letterSpacing: "0.01em",
            textShadow: "0 18px 48px rgba(0,0,0,0.5)",
          }}
        >
          Nova’s World
        </h1>

        <p
          style={{
            margin: "12px 0 0",
            fontSize: isMobile ? "16px" : "18px",
            fontWeight: 300,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.92)",
            textShadow: "0 12px 30px rgba(0,0,0,0.45)",
          }}
        >
          Think, learn, earn, and build Nova’s world.
        </p>

        <div
          style={{
            marginTop: isMobile ? "20px" : "22px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#53d7ff",
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: 300,
            letterSpacing: "0.03em",
          }}
        >
          <span
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(83,215,255,0.4)",
              flexShrink: 0,
            }}
          >
            ›
          </span>

          <span>Choose a location to begin</span>
        </div>
      </section>

      {isDesktop ? (
        <section
          style={{
            position: "absolute",
            inset: 0,
            zIndex: activeWalkthroughZoneNumber ? 90 : 20,
            pointerEvents: "none",
          }}
        >
          {worldZones.map((zone) => (
            <NovaHotspot
              key={zone.id}
              zone={zone}
              isActive={displayedDesktopZone?.id === zone.id}
              isWalkthroughActive={Boolean(activeWalkthroughZoneNumber)}
              isHighlighted={activeWalkthroughZoneNumber === zone.number}
              onEnter={() => {
                if (!walkthroughOpen && !selectedZone) {
                  setHoveredZone(zone);
                }
              }}
              onLeave={() => {
                if (!walkthroughOpen && !selectedZone) {
                  setHoveredZone(null);
                }
              }}
              onClick={() => selectZone(zone)}
            />
          ))}

          {displayedDesktopZone && (
            <NovaZoneHoverPopup
              zone={displayedDesktopZone}
              isHighlighted={
                activeWalkthroughZoneNumber === displayedDesktopZone.number
              }
              isSelected={
                !walkthroughOpen &&
                selectedZone?.id === displayedDesktopZone.id
              }
              onClose={() => setSelectedZone(null)}
              onEnterLocation={() => enterZone(displayedDesktopZone)}
            />
          )}

          {!walkthroughOpen && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "30px",
                transform: "translateX(-50%)",
                zIndex: 30,
                padding: "11px 17px",
                borderRadius: "999px",
                border: "1px solid rgba(141,252,255,0.24)",
                background: "rgba(2,8,19,0.5)",
                backdropFilter: "blur(14px)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "12px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
                pointerEvents: "none",
              }}
            >
              Select a location · then choose Enter
            </div>
          )}
        </section>
      ) : (
        <section
          style={{
            position: "relative",
            zIndex: activeWalkthroughZoneNumber ? 90 : 20,
            width: "min(790px, calc(100% - 28px))",
            margin: "0 auto",
            paddingBottom: "24px",
          }}
        >
          {(() => {
            const missionZone = worldZones.find((zone) => zone.number === "1");
            const challengeZones = worldZones
              .filter((zone) => zone.number === "2" || zone.number === "3")
              .sort((a, b) => Number(a.number) - Number(b.number));
            const playZones = worldZones
              .filter((zone) => zone.number === "4" || zone.number === "5")
              .sort((a, b) => Number(a.number) - Number(b.number));

            return (
              <div style={{ display: "grid", gap: isMobile ? "18px" : "22px" }}>
                {missionZone && (
                  <section aria-label="Learn">
                    <div
                      style={{
                        marginBottom: "9px",
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                      }}
                    >
                      <span
                        style={{
                          color: "#f6c453",
                          fontSize: "10px",
                          fontWeight: 950,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        1 · Learn
                      </span>
                      <span
                        style={{
                          height: "1px",
                          flex: 1,
                          background:
                            "linear-gradient(90deg, rgba(246,196,83,0.42), transparent)",
                        }}
                      />
                    </div>

                    <ZoneCard
                      zone={missionZone}
                      screenMode={screenMode}
                      isAdmin={isAdmin}
                      onClick={() => selectZone(missionZone)}
                      walkthroughActive={walkthroughOpen}
                      walkthroughHighlighted={
                        activeWalkthroughZoneNumber === missionZone.number
                      }
                    />
                  </section>
                )}

                <section aria-label="Academic Challenge">
                  <div
                    style={{
                      marginBottom: "9px",
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                    }}
                  >
                    <span
                      style={{
                        color: "#53d7ff",
                        fontSize: "10px",
                        fontWeight: 950,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      2 · Academic Challenge
                    </span>
                    <span
                      style={{
                        height: "1px",
                        flex: 1,
                        background:
                          "linear-gradient(90deg, rgba(83,215,255,0.36), transparent)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: isMobile ? "12px" : "14px",
                    }}
                  >
                    {challengeZones.map((zone) => (
                      <ZoneCard
                        key={zone.id}
                        zone={zone}
                        screenMode={screenMode}
                        isAdmin={isAdmin}
                        onClick={() => selectZone(zone)}
                        walkthroughActive={walkthroughOpen}
                        walkthroughHighlighted={
                          activeWalkthroughZoneNumber === zone.number
                        }
                      />
                    ))}
                  </div>
                </section>

                <section aria-label="Play and Build">
                  <div
                    style={{
                      marginBottom: "9px",
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                    }}
                  >
                    <span
                      style={{
                        color: "#c58cff",
                        fontSize: "10px",
                        fontWeight: 950,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      3 · Play & Build
                    </span>
                    <span
                      style={{
                        height: "1px",
                        flex: 1,
                        background:
                          "linear-gradient(90deg, rgba(197,140,255,0.36), transparent)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: isMobile ? "12px" : "14px",
                    }}
                  >
                    {playZones.map((zone) => (
                      <ZoneCard
                        key={zone.id}
                        zone={zone}
                        screenMode={screenMode}
                        isAdmin={isAdmin}
                        onClick={() => selectZone(zone)}
                        walkthroughActive={walkthroughOpen}
                        walkthroughHighlighted={
                          activeWalkthroughZoneNumber === zone.number
                        }
                      />
                    ))}
                  </div>
                </section>
              </div>
            );
          })()}
        </section>
      )}

      {!isDesktop && selectedZone && !walkthroughOpen && (
        <CompactZoneInfoCard
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
          onEnter={() => enterZone(selectedZone)}
        />
      )}

      {showMembershipPortal && (
        <MembershipPortalPopup onClose={() => setShowMembershipPortal(false)} />
      )}


      {!walkthroughOpen && (
        <>
          <div
            style={{
              position: "fixed",
              left: isMobile ? "10px" : "18px",
              bottom: isMobile ? "10px" : "16px",
              zIndex: 70,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "flex-end",
              gap: isMobile ? "6px" : "10px",
              pointerEvents: "none",
            }}
          >
            <img
              src="/nova/nova-character.png"
              alt="Nova"
              style={{
                height: isDesktop ? "126px" : isMobile ? "72px" : "92px",
                width: "auto",
                display: "block",
                opacity: 0.96,
                pointerEvents: "none",
                filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.42))",
              }}
            />

            <button
              type="button"
              onClick={startWalkthrough}
              style={{
                minHeight: isMobile ? "34px" : "38px",
                marginBottom: isMobile ? 0 : "4px",
                padding: isMobile ? "0 11px" : "0 14px",
                borderRadius: "999px",
                border: "1px solid rgba(83,215,255,0.36)",
                background: "rgba(2,18,36,0.78)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: isMobile ? "9px" : "11px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow:
                  "0 10px 24px rgba(0,0,0,0.26), 0 0 14px rgba(83,215,255,0.12)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                fontFamily: "inherit",
                pointerEvents: "auto",
              }}
            >
              <span aria-hidden="true">✦</span>
              {isMobile ? "Guide" : "Nova Guide"}
            </button>
          </div>

          <Link
            href="/milo-world"
            style={{
              position: "fixed",
              right: isMobile ? "10px" : "18px",
              bottom: isMobile ? "10px" : "16px",
              zIndex: 70,
              minHeight: isMobile ? "36px" : "42px",
              padding: isMobile ? "0 13px" : "0 17px",
              borderRadius: "999px",
              border: "1px solid rgba(213,181,255,0.46)",
              background:
                "linear-gradient(135deg, rgba(71,36,112,0.82), rgba(18,12,48,0.82))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: isMobile ? "9px" : "11px",
              fontWeight: 850,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow:
                "0 12px 28px rgba(0,0,0,0.3), 0 0 18px rgba(197,140,255,0.16)",
              whiteSpace: "nowrap",
            }}
          >
            <span>To Milo’s World</span>
            <span aria-hidden="true" style={{ color: "#d5b5ff" }}>
              →
            </span>
          </Link>
        </>
      )}

      {maintenanceZone && (
        <ZoneUnderUpgradeModal
          zoneTitle={maintenanceZone.title}
          onClose={() => setMaintenanceZone(null)}
        />
      )}

      <GuidedWalkthrough
        open={walkthroughOpen}
        stepIndex={walkthroughStep}
        onStepChange={setWalkthroughStep}
        onClose={closeWalkthrough}
        onNavigate={navigateFromGuide}
      />
    </main>
  );
}

function FloatingControls({
  userEmail,
  profileAssets,
  tokenTransactions,
  dreamGemBalance,
  dreamGemTransactions,
  dreamGemsLoading,
  hasStudentRewardsAccess,
  profileAssetsLoading,
  screenMode,
  onOpenMembership,
}: {
  userEmail: string | null;
  profileAssets: ProfileAssetBreakdown;
  tokenTransactions: DreamTokenTransaction[];
  dreamGemBalance: number;
  dreamGemTransactions: DreamGemTransaction[];
  dreamGemsLoading: boolean;
  hasStudentRewardsAccess: boolean;
  profileAssetsLoading: boolean;
  screenMode: ScreenMode;
  onOpenMembership: () => void;
}) {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = !isDesktop;
  const [profileAssetsOpen, setProfileAssetsOpen] = useState(false);
  const [dreamGemsOpen, setDreamGemsOpen] = useState(false);
  const [compactMenuOpen, setCompactMenuOpen] = useState(false);
  const profileAssetsTotal =
    profileAssets.cash + profileAssets.property + profileAssets.stocks;

  useEffect(() => {
    if (!profileAssetsOpen && !dreamGemsOpen && !compactMenuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileAssetsOpen(false);
        setDreamGemsOpen(false);
        setCompactMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [profileAssetsOpen, dreamGemsOpen, compactMenuOpen]);

  return (
    <>
      {(profileAssetsOpen || dreamGemsOpen || compactMenuOpen) && (
        <button
          type="button"
          aria-label="Close account panels"
          onClick={() => {
            setProfileAssetsOpen(false);
            setDreamGemsOpen(false);
            setCompactMenuOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 78,
            border: "none",
            background: "transparent",
            cursor: "default",
          }}
        />
      )}

      <Link
        href="/"
        style={{
          position: "fixed",
          top: isMobile ? "12px" : "18px",
          left: isMobile ? "12px" : "18px",
          zIndex: 70,
          height: isMobile ? "40px" : "46px",
          padding: isMobile ? "0 14px" : "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(116,200,255,0.5)",
          background: "rgba(2,8,19,0.58)",
          backdropFilter: "blur(16px)",
          color: "white",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "8px" : "12px",
          fontSize: isMobile ? "11px" : "14px",
          letterSpacing: isMobile ? "0.08em" : "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
        }}
      >
        <span style={{ fontSize: isMobile ? "15px" : "18px" }}>←</span>
        {isMobile ? "Home" : "Return to Home"}
      </Link>

      <div
        style={{
          position: "fixed",
          top: isMobile ? "12px" : "18px",
          right: isMobile ? "12px" : "18px",
          zIndex: 84,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setProfileAssetsOpen(false);
            setDreamGemsOpen(false);
            setCompactMenuOpen((current) => !current);
          }}
          aria-expanded={compactMenuOpen}
          aria-haspopup="menu"
          style={{
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 14px" : "0 18px",
            borderRadius: "999px",
            border: "1px solid rgba(126,232,255,0.5)",
            background: compactMenuOpen
              ? "rgba(20,84,118,0.92)"
              : "rgba(2,8,19,0.72)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "9px",
            fontSize: isMobile ? "11px" : "13px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            boxShadow: "0 16px 36px rgba(0,0,0,0.3)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "16px" }}>☰</span>
          Menu
        </button>

        {compactMenuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 9px)",
              right: 0,
              width: isMobile ? "min(310px, calc(100vw - 24px))" : "320px",
              borderRadius: "20px",
              border: "1px solid rgba(126,232,255,0.3)",
              background:
                "linear-gradient(145deg, rgba(3,20,39,0.98), rgba(3,10,25,0.99))",
              boxShadow:
                "0 28px 72px rgba(0,0,0,0.58), 0 0 28px rgba(83,215,255,0.14)",
              backdropFilter: "blur(22px)",
              WebkitBackdropFilter: "blur(22px)",
              padding: "10px",
              display: "grid",
              gap: "8px",
              color: "white",
            }}
          >
            <Link
              href={userEmail ? "/profile" : "/login"}
              onClick={() => setCompactMenuOpen(false)}
              style={compactMenuItemStyle}
            >
              <span aria-hidden="true">◎</span>
              <span>{userEmail ? "My Account" : "Log In"}</span>
              <span aria-hidden="true">›</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setCompactMenuOpen(false);
                onOpenMembership();
              }}
              style={{
                ...compactMenuItemStyle,
                width: "100%",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span aria-hidden="true" style={{ color: "#8ee8ff" }}>✦</span>
              <span>Plans & Memberships</span>
              <span aria-hidden="true">›</span>
            </button>

            <Link
              href="/cart"
              onClick={() => setCompactMenuOpen(false)}
              style={compactMenuItemStyle}
            >
              <span aria-hidden="true">🛒</span>
              <span>Cart</span>
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        )}
      </div>

      {!isDesktop && (
        <div
          style={{
            position: "fixed",
            top: isMobile ? "60px" : "74px",
            right: isMobile ? "12px" : "18px",
            zIndex: 82,
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setDreamGemsOpen(false);
              setProfileAssetsOpen((current) => !current);
            }}
            aria-label="Dream Tokens and profile assets"
            style={{
              minHeight: isMobile ? "38px" : "42px",
              padding: isMobile ? "0 10px" : "0 13px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.55)",
              background: "rgba(2,14,28,0.78)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              cursor: "pointer",
              boxShadow: "0 12px 28px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ color: "#8ee8ff" }}>◈</span>
            <strong style={{ color: "#53d7ff", fontSize: isMobile ? "10px" : "12px" }}>
              {profileAssetsLoading ? "..." : formatDreamTokenAmount(profileAssets.cash)}
            </strong>
          </button>

          <button
            type="button"
            onClick={() => {
              setProfileAssetsOpen(false);
              setDreamGemsOpen((current) => !current);
            }}
            aria-label="Dream Gems"
            style={{
              minHeight: isMobile ? "38px" : "42px",
              padding: isMobile ? "0 10px" : "0 13px",
              borderRadius: "999px",
              border: "1px solid rgba(216,180,254,0.58)",
              background: "rgba(50,22,88,0.82)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              cursor: "pointer",
              boxShadow: "0 12px 28px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ color: "#e9d5ff" }}>◆</span>
            <strong style={{ color: "#e9d5ff", fontSize: isMobile ? "10px" : "12px" }}>
              {dreamGemsLoading ? "..." : formatDreamGemAmount(dreamGemBalance)}
            </strong>
          </button>
        </div>
      )}

      <div
        style={{
          position: isDesktop ? "fixed" : "static",
          top: "18px",
          right: isDesktop ? "138px" : "18px",
          zIndex: 70,
          display: isDesktop ? "flex" : "contents",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
        }}
      >

        <div style={{ position: "relative", zIndex: 82 }}>
          <button
            type="button"
            onClick={() => {
              setDreamGemsOpen(false);
              setProfileAssetsOpen((current) => !current);
            }}
            aria-expanded={profileAssetsOpen}
            aria-haspopup="menu"
            style={{
              display: isDesktop ? "flex" : "none",
              height: "46px",
              padding: "0 18px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.55)",
              background:
                "linear-gradient(145deg, rgba(2,14,28,0.72), rgba(2,8,19,0.8))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "white",
              alignItems: "center",
              gap: isMobile ? "7px" : "10px",
              fontSize: isMobile ? "10px" : "14px",
              letterSpacing: isMobile ? "0.03em" : "0.08em",
              textTransform: "uppercase",
              boxShadow: profileAssetsOpen
                ? "0 16px 38px rgba(0,0,0,0.34), 0 0 30px rgba(83,215,255,0.28)"
                : "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(83,215,255,0.16)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                width: isMobile ? "21px" : "25px",
                height: isMobile ? "21px" : "25px",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle, rgba(83,215,255,0.38), rgba(2,8,19,0.8))",
                border: "1px solid rgba(83,215,255,0.6)",
                color: "#bdf6ff",
                fontSize: "12px",
                boxShadow: "0 0 14px rgba(83,215,255,0.32)",
                flexShrink: 0,
              }}
            >
              ◈
            </span>

            <span>DT</span>
            <strong
              style={{
                color: "#53d7ff",
                fontSize: isMobile ? "11px" : "14px",
                letterSpacing: "0.04em",
              }}
            >
              {profileAssetsLoading
                ? "..."
                : Math.round(Number(profileAssets.cash || 0)).toLocaleString(
                    "en-SG",
                  )}
            </strong>
            <span
              aria-hidden="true"
              style={{
                color: "#8ee8ff",
                fontSize: "13px",
                transform: profileAssetsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 180ms ease",
              }}
            >
              ▾
            </span>
          </button>

          {profileAssetsOpen && (
            <div
              role="menu"
              style={{
                position: isCompact ? "fixed" : "absolute",
                top: isCompact ? (isMobile ? "112px" : "132px") : "calc(100% + 10px)",
                right: isCompact ? (isMobile ? "12px" : "18px") : 0,
                left: "auto",
                width: isCompact ? "min(380px, calc(100vw - 24px))" : "380px",
                maxHeight: "min(560px, calc(100dvh - 92px))",
                overflowY: "auto",
                overflowX: "hidden",
                borderRadius: "20px",
                border: "1px solid rgba(126,232,255,0.3)",
                background:
                  "linear-gradient(145deg, rgba(3,20,39,0.98), rgba(3,10,25,0.99))",
                boxShadow:
                  "0 28px 72px rgba(0,0,0,0.56), 0 0 28px rgba(83,215,255,0.12)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                color: "white",
              }}
            >
              <div
                style={{
                  padding: "18px",
                  borderBottom: "1px solid rgba(126,232,255,0.13)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: "11px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Profile Assets
                </p>
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "end",
                    justifyContent: "space-between",
                    gap: "14px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "32px",
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {profileAssetsLoading
                      ? "Loading..."
                      : formatDreamTokenAmount(profileAssetsTotal)}
                  </strong>
                  <Link
                    href={userEmail ? "/profile" : "/login"}
                    onClick={() => setProfileAssetsOpen(false)}
                    style={{
                      color: "#bdf6ff",
                      fontSize: "11px",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    {userEmail ? "View account →" : "Log in →"}
                  </Link>
                </div>
              </div>

              <div style={{ padding: "12px" }}>
                <div style={{ display: "grid", gap: "8px" }}>
                  {[
                    ["Cash", profileAssets.cash, "✦"],
                    ["Property", profileAssets.property, "⌂"],
                    ["Stocks", profileAssets.stocks, "↗"],
                  ].map(([label, value, icon]) => (
                    <div
                      key={String(label)}
                      role="menuitem"
                      style={{
                        minHeight: "58px",
                        borderRadius: "14px",
                        border: "1px solid rgba(126,232,255,0.12)",
                        background: "rgba(255,255,255,0.035)",
                        display: "grid",
                        gridTemplateColumns: "34px minmax(0, 1fr) auto",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                      }}
                    >
                      <span
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "11px",
                          border: "1px solid rgba(83,215,255,0.26)",
                          background: "rgba(83,215,255,0.09)",
                          color: "#8ee8ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                        }}
                      >
                        {icon}
                      </span>
                      <strong style={{ color: "white", fontSize: "13px" }}>
                        {label}
                      </strong>
                      <strong
                        style={{
                          color: "#9fffd2",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {profileAssetsLoading
                          ? "—"
                          : formatDreamTokenAmount(Number(value))}
                      </strong>
                    </div>
                  ))}
                </div>

                <p
                  style={{
                    margin: "16px 4px 10px",
                    color: "rgba(255,255,255,0.48)",
                    fontSize: "10px",
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    fontWeight: 800,
                  }}
                >
                  Latest cash transactions
                </p>

                {profileAssetsLoading ? (
                  <div
                    style={{
                      padding: "20px 14px",
                      color: "rgba(255,255,255,0.58)",
                      fontSize: "13px",
                      textAlign: "center",
                    }}
                  >
                    Loading assets...
                  </div>
                ) : !userEmail ? (
                  <Link
                    href="/login"
                    onClick={() => setProfileAssetsOpen(false)}
                    style={{
                      minHeight: "50px",
                      borderRadius: "14px",
                      border: "1px solid rgba(126,232,255,0.24)",
                      background: "rgba(83,215,255,0.08)",
                      color: "white",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    Log in to view assets
                  </Link>
                ) : tokenTransactions.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 14px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.035)",
                      color: "rgba(255,255,255,0.58)",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      textAlign: "center",
                    }}
                  >
                    No token transactions yet.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {tokenTransactions.map((transaction) => {
                      const isPositive = transaction.amount >= 0;
                      return (
                        <div
                          key={transaction.id}
                          role="menuitem"
                          style={{
                            minHeight: "58px",
                            borderRadius: "14px",
                            border: "1px solid rgba(126,232,255,0.12)",
                            background: "rgba(255,255,255,0.035)",
                            display: "grid",
                            gridTemplateColumns: "34px minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                          }}
                        >
                          <span
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "11px",
                              border: isPositive
                                ? "1px solid rgba(93,255,181,0.34)"
                                : "1px solid rgba(255,167,120,0.34)",
                              background: isPositive
                                ? "rgba(93,255,181,0.1)"
                                : "rgba(255,138,92,0.1)",
                              color: isPositive ? "#9fffd2" : "#ffc0a0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                            }}
                          >
                            {isPositive ? "+" : "−"}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "white",
                                fontSize: "12px",
                              }}
                            >
                              {transaction.title ||
                                (isPositive
                                  ? "Dreamscape Token reward"
                                  : "Dreamscape Token spend")}
                            </strong>
                            <span
                              style={{
                                display: "block",
                                marginTop: "4px",
                                color: "rgba(255,255,255,0.43)",
                                fontSize: "10px",
                              }}
                            >
                              {formatDreamTokenTransactionDate(
                                transaction.created_at,
                              )}
                            </span>
                          </span>
                          <strong
                            style={{
                              color: isPositive ? "#9fffd2" : "#ffc0a0",
                              fontSize: "12px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isPositive ? "+" : ""}
                            {transaction.amount} DT
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: "relative", zIndex: 83 }}>
          <button
            type="button"
            onClick={() => {
              setProfileAssetsOpen(false);
              setDreamGemsOpen((current) => !current);
            }}
            aria-expanded={dreamGemsOpen}
            aria-haspopup="menu"
            style={{
              display: isDesktop ? "flex" : "none",
              height: "46px",
              padding: isMobile ? "0 9px" : "0 16px",
              borderRadius: "999px",
              border: "1px solid rgba(216,180,254,0.62)",
              background:
                "linear-gradient(145deg, rgba(50,22,88,0.82), rgba(13,8,35,0.88))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "white",
              alignItems: "center",
              gap: isMobile ? "6px" : "9px",
              fontSize: isMobile ? "10px" : "14px",
              letterSpacing: isMobile ? "0.02em" : "0.08em",
              textTransform: "uppercase",
              boxShadow: dreamGemsOpen
                ? "0 16px 38px rgba(0,0,0,0.34), 0 0 30px rgba(192,132,252,0.32)"
                : "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(192,132,252,0.2)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: isMobile ? "21px" : "25px",
                height: isMobile ? "21px" : "25px",
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle, rgba(216,180,254,0.42), rgba(30,12,58,0.9))",
                border: "1px solid rgba(216,180,254,0.72)",
                color: "#f3e8ff",
                fontSize: isMobile ? "12px" : "14px",
                boxShadow: "0 0 14px rgba(192,132,252,0.38)",
                flexShrink: 0,
              }}
            >
              ◆
            </span>
            <span>DG</span>
            <strong
              style={{
                color: "#e9d5ff",
                fontSize: isMobile ? "11px" : "14px",
                letterSpacing: "0.04em",
              }}
            >
              {dreamGemsLoading
                ? "..."
                : Math.round(Number(dreamGemBalance || 0)).toLocaleString(
                    "en-SG",
                  )}
            </strong>
            <span
              aria-hidden="true"
              style={{
                color: "#e9d5ff",
                fontSize: "13px",
                transform: dreamGemsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 180ms ease",
              }}
            >
              ▾
            </span>
          </button>

          {dreamGemsOpen && (
            <div
              role="menu"
              style={{
                position: isCompact ? "fixed" : "absolute",
                top: isCompact ? (isMobile ? "112px" : "132px") : "calc(100% + 10px)",
                right: isCompact ? (isMobile ? "12px" : "18px") : 0,
                left: "auto",
                width: isCompact ? "min(390px, calc(100vw - 24px))" : "390px",
                maxHeight: "min(590px, calc(100dvh - 92px))",
                overflowY: "auto",
                overflowX: "hidden",
                borderRadius: "20px",
                border: "1px solid rgba(216,180,254,0.36)",
                background:
                  "linear-gradient(145deg, rgba(35,16,65,0.98), rgba(10,8,29,0.99))",
                boxShadow:
                  "0 28px 72px rgba(0,0,0,0.58), 0 0 32px rgba(192,132,252,0.17)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                color: "white",
              }}
            >
              <div
                style={{
                  padding: "18px",
                  borderBottom: "1px solid rgba(216,180,254,0.16)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#e9d5ff",
                    fontSize: "11px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Dream Gem Wallet
                </p>

                <div
                  style={{
                    marginTop: "9px",
                    display: "flex",
                    alignItems: "end",
                    justifyContent: "space-between",
                    gap: "14px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "34px",
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {dreamGemsLoading
                      ? "Loading..."
                      : formatDreamGemAmount(dreamGemBalance)}
                  </strong>

                  <Link
                    href={userEmail ? "/profile" : "/login"}
                    onClick={() => setDreamGemsOpen(false)}
                    style={{
                      color: "#f3e8ff",
                      fontSize: "11px",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    {userEmail ? "View wallet →" : "Log in →"}
                  </Link>
                </div>

                <p
                  style={{
                    margin: "12px 0 0",
                    color: "rgba(255,255,255,0.62)",
                    fontSize: "12px",
                    lineHeight: 1.55,
                  }}
                >
                  Dream Gems are premium learning rewards. Eligible users can
                  earn them through verified class attendance, Core Missions,
                  and Think Missions. They may be redeemed for selected tangible
                  or premium rewards, but never exchanged for cash.
                </p>
              </div>

              <div style={{ padding: "12px" }}>
                {!userEmail ? (
                  <Link
                    href="/login"
                    onClick={() => setDreamGemsOpen(false)}
                    style={{
                      minHeight: "52px",
                      borderRadius: "14px",
                      border: "1px solid rgba(216,180,254,0.3)",
                      background: "rgba(192,132,252,0.1)",
                      color: "white",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 850,
                    }}
                  >
                    Log in to view Dream Gems
                  </Link>
                ) : !hasStudentRewardsAccess ? (
                  <div
                    style={{
                      borderRadius: "16px",
                      border: "1px solid rgba(216,180,254,0.26)",
                      background: "rgba(192,132,252,0.08)",
                      padding: "16px",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: "white",
                        fontSize: "14px",
                      }}
                    >
                      Get Student Access for bigger rewards
                    </strong>
                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      Your Dream Gem wallet is ready and currently starts at 0.
                      Student Access unlocks eligible Core and Think activities
                      that can award Dream Gems.
                    </p>
                    <Link
                      href="/pricing"
                      onClick={() => setDreamGemsOpen(false)}
                      style={{
                        marginTop: "13px",
                        minHeight: "46px",
                        borderRadius: "13px",
                        background:
                          "linear-gradient(135deg, #c084fc, #7c3aed)",
                        color: "white",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 14px",
                        fontSize: "11px",
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Get Student Access
                    </Link>
                  </div>
                ) : null}

                <p
                  style={{
                    margin: "16px 4px 10px",
                    color: "rgba(255,255,255,0.48)",
                    fontSize: "10px",
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    fontWeight: 800,
                  }}
                >
                  Latest Dream Gem activity
                </p>

                {dreamGemsLoading ? (
                  <div
                    style={{
                      padding: "20px 14px",
                      color: "rgba(255,255,255,0.58)",
                      fontSize: "13px",
                      textAlign: "center",
                    }}
                  >
                    Loading Dream Gems...
                  </div>
                ) : dreamGemTransactions.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 14px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.035)",
                      color: "rgba(255,255,255,0.58)",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      textAlign: "center",
                    }}
                  >
                    No Dream Gem transactions yet.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {dreamGemTransactions.map((transaction) => {
                      const isPositive = transaction.amount >= 0;

                      return (
                        <div
                          key={transaction.id}
                          role="menuitem"
                          style={{
                            minHeight: "62px",
                            borderRadius: "14px",
                            border: "1px solid rgba(216,180,254,0.14)",
                            background: "rgba(255,255,255,0.035)",
                            display: "grid",
                            gridTemplateColumns: "34px minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                          }}
                        >
                          <span
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "11px",
                              border: isPositive
                                ? "1px solid rgba(167,139,250,0.5)"
                                : "1px solid rgba(255,167,120,0.34)",
                              background: isPositive
                                ? "rgba(167,139,250,0.14)"
                                : "rgba(255,138,92,0.1)",
                              color: isPositive ? "#ddd6fe" : "#ffc0a0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                            }}
                          >
                            {isPositive ? "◆" : "−"}
                          </span>

                          <span style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "white",
                                fontSize: "12px",
                              }}
                            >
                              {transaction.title || "Dream Gem activity"}
                            </strong>
                            <span
                              style={{
                                display: "block",
                                marginTop: "4px",
                                color: "rgba(255,255,255,0.43)",
                                fontSize: "10px",
                              }}
                            >
                              {formatDreamGemSource(transaction.source)}
                              {transaction.created_at
                                ? ` · ${formatDreamTokenTransactionDate(
                                    transaction.created_at,
                                  )}`
                                : ""}
                            </span>
                          </span>

                          <strong
                            style={{
                              color: isPositive ? "#ddd6fe" : "#ffc0a0",
                              fontSize: "12px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isPositive ? "+" : ""}
                            {transaction.amount} DG
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  );
}


const compactMenuItemStyle: CSSProperties = {
  minHeight: "52px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  textDecoration: "none",
  display: "grid",
  gridTemplateColumns: "30px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  padding: "10px 13px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 800,
};

function getNovaMarkerPosition(zoneId: string): CSSProperties {
  switch (zoneId) {
    case "thinking-skills-lab":
      // Keep Think Lab exactly where it is today: bottom-left platform.
      return { left: "19%", top: "61%" };
    case "nova-home":
      return { left: "29%", top: "34%" };
    case "missions-centre":
      return { left: "55%", top: "54%" };
    case "knowledge-arena":
      return { left: "76%", top: "34%" };
    case "skyforge-hangar":
      return { left: "86%", top: "61%" };
    default:
      return { left: "50%", top: "50%" };
  }
}

function getNovaPopupPosition(zoneId: string): CSSProperties {
  const marker = getNovaMarkerPosition(zoneId);

  switch (zoneId) {
    case "thinking-skills-lab":
      return {
        ...marker,
        transform: "translate(-18%, calc(-100% - 48px))",
      };
    case "nova-home":
      // Top-left location: open the card below the marker so it stays clear
      // of the page title and top account controls.
      return {
        ...marker,
        transform: "translate(-28%, 48px)",
      };
    case "knowledge-arena":
      // Top-right location: open the card below and back toward the centre
      // so it does not collide with the referral/account controls.
      return {
        ...marker,
        transform: "translate(-80%, 48px)",
      };
    case "skyforge-hangar":
      return {
        ...marker,
        transform: "translate(-86%, calc(-100% - 48px))",
      };
    default:
      return {
        ...marker,
        transform: "translate(-50%, calc(-100% - 48px))",
      };
  }
}

function NovaHotspot({
  zone,
  isActive,
  isWalkthroughActive,
  isHighlighted,
  onEnter,
  onLeave,
  onClick,
}: {
  zone: Zone;
  isActive: boolean;
  isWalkthroughActive: boolean;
  isHighlighted: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  return (
    <button
      id={`nova-zone-${zone.number}`}
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      aria-label={`View ${zone.title}`}
      style={{
        position: "absolute",
        zIndex: isHighlighted ? 94 : 25,
        ...getNovaMarkerPosition(zone.id),
        minHeight: "38px",
        padding: "4px 11px 4px 4px",
        transform: isActive
          ? "translate(-50%, -50%) scale(1.08)"
          : "translate(-50%, -50%)",
        borderRadius: "999px",
        border: isActive
          ? `1px solid ${zone.accent}`
          : `1px solid ${zone.accent}70`,
        background: isActive
          ? `linear-gradient(135deg, ${zone.accent}38, rgba(3,18,40,0.96))`
          : `linear-gradient(135deg, ${zone.accent}20, rgba(3,18,40,0.78))`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "white",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        whiteSpace: "nowrap",
        cursor: "pointer",
        outline: "none",
        boxShadow: isActive
          ? `0 0 0 3px ${zone.accent}16, 0 0 24px ${zone.accent}72, 0 12px 28px rgba(0,0,0,0.34)`
          : `0 0 16px ${zone.accent}28, 0 10px 24px rgba(0,0,0,0.24)`,
        opacity: isWalkthroughActive && !isHighlighted ? 0.13 : 1,
        filter:
          isWalkthroughActive && !isHighlighted
            ? "saturate(0.25) brightness(0.42)"
            : "none",
        pointerEvents: isWalkthroughActive && !isHighlighted ? "none" : "auto",
        transition:
          "transform 420ms cubic-bezier(.2,.82,.24,1), opacity 360ms ease, filter 360ms ease, border-color 360ms ease, background 360ms ease, box-shadow 360ms ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "999px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: `1px solid ${zone.accent}`,
          background: `${zone.accent}18`,
          color: zone.accent,
          fontSize: "11px",
          fontWeight: 950,
          boxShadow: `0 0 14px ${zone.accent}42`,
        }}
      >
        {zone.number}
      </span>

      <span
        style={{
          fontSize: "11px",
          lineHeight: 1,
          letterSpacing: "0.045em",
          fontWeight: 850,
        }}
      >
        {zone.title}
      </span>
    </button>
  );
}

function NovaZoneHoverPopup({
  zone,
  isHighlighted = false,
  isSelected = false,
  onClose,
  onEnterLocation,
}: {
  zone: Zone;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onClose?: () => void;
  onEnterLocation?: () => void;
}) {
  const popupPosition = getNovaPopupPosition(zone.id);
  const popupTransform =
    typeof popupPosition.transform === "string" ? popupPosition.transform : "";
  const popupPositionWithoutTransform = {
    ...popupPosition,
    transform: undefined,
  };

  return (
    <div
      style={{
        position: "absolute",
        zIndex: isSelected ? 72 : 62,
        ...popupPositionWithoutTransform,
        width: "330px",
        padding: isSelected ? "22px 24px 20px" : "20px 22px",
        borderRadius: "20px",
        border: `${isHighlighted || isSelected ? 2 : 1}px solid ${
          zone.accent
        }${isHighlighted || isSelected ? "" : "aa"}`,
        background: `linear-gradient(145deg, ${zone.accent}24, rgba(3,13,34,0.985) 46%)`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow:
          isHighlighted || isSelected
            ? `0 0 0 6px ${zone.accent}14, 0 0 40px ${zone.accent}72, 0 24px 60px rgba(0,0,0,0.52)`
            : `0 0 24px ${zone.accent}42, 0 20px 48px rgba(0,0,0,0.42)`,
        color: "white",
        pointerEvents: isSelected ? "auto" : "none",
        transform: `${popupTransform}${
          isHighlighted || isSelected ? " scale(1.025)" : ""
        }`.trim(),
        transition:
          "border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease",
      }}
    >
      {isSelected && (
        <button
          type="button"
          aria-label="Close location details"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "30px",
            height: "30px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontSize: "17px",
          }}
        >
          ×
        </button>
      )}

      <p
        style={{
          margin: 0,
          color: zone.accent,
          fontSize: "10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 850,
        }}
      >
        {zone.activityLabel} · Location {zone.number}
      </p>

      <h2
        style={{
          margin: "9px 34px 0 0",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "27px",
          lineHeight: 1.12,
          fontWeight: 500,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "11px 0 0",
          color: "rgba(255,255,255,0.76)",
          fontSize: "13px",
          lineHeight: 1.55,
        }}
      >
        {zone.description}
      </p>

      {isSelected ? (
        <button
          type="button"
          onClick={onEnterLocation}
          style={{
            marginTop: "17px",
            width: "100%",
            minHeight: "44px",
            borderRadius: "13px",
            border: `1px solid ${zone.accent}aa`,
            background: `linear-gradient(135deg, ${zone.accent}42, rgba(15,58,100,0.9))`,
            color: "white",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            boxShadow: `0 10px 24px ${zone.accent}20`,
          }}
        >
          Enter {zone.title} →
        </button>
      ) : (
        <div
          style={{
            marginTop: "15px",
            color: zone.accent,
            fontSize: "10px",
            fontWeight: 850,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Select this location to continue
        </div>
      )}
    </div>
  );
}


function CompactZoneInfoCard({
  zone,
  onClose,
  onEnter,
}: {
  zone: Zone;
  onClose: () => void;
  onEnter: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close location details"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 74,
          border: "none",
          background: "rgba(0,3,12,0.48)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          cursor: "default",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${zone.title} details`}
        style={{
          position: "fixed",
          left: "50%",
          bottom: "14px",
          zIndex: 75,
          width: "min(520px, calc(100% - 24px))",
          transform: "translateX(-50%)",
          borderRadius: "22px",
          border: `1px solid ${zone.accent}aa`,
          background: `linear-gradient(145deg, ${zone.accent}24, rgba(3,11,29,0.99) 48%)`,
          boxShadow: `0 0 34px ${zone.accent}32, 0 28px 72px rgba(0,0,0,0.58)`,
          color: "white",
          padding: "20px",
        }}
      >
        <button
          type="button"
          aria-label="Close location details"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.17)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingRight: "38px",
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              border: `1px solid ${zone.accent}`,
              background: `${zone.accent}18`,
              color: zone.accent,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "12px",
              fontWeight: 950,
              boxShadow: `0 0 14px ${zone.accent}38`,
            }}
          >
            {zone.number}
          </span>

          <div>
            <p
              style={{
                margin: 0,
                color: zone.accent,
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 850,
              }}
            >
              {zone.activityLabel}
            </p>
            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "24px",
                lineHeight: 1.08,
                fontWeight: 500,
              }}
            >
              {zone.title}
            </h2>
          </div>
        </div>

        <p
          style={{
            margin: "14px 0 0",
            color: "rgba(255,255,255,0.76)",
            fontSize: "13px",
            lineHeight: 1.55,
          }}
        >
          {zone.description}
        </p>

        <button
          type="button"
          onClick={onEnter}
          style={{
            marginTop: "17px",
            width: "100%",
            minHeight: "46px",
            borderRadius: "14px",
            border: `1px solid ${zone.accent}aa`,
            background: `linear-gradient(135deg, ${zone.accent}42, rgba(15,58,100,0.94))`,
            color: "white",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          Enter {zone.title} →
        </button>
      </div>
    </>
  );
}


function ZoneCard({
  zone,
  onClick,
  screenMode,
  walkthroughActive,
  walkthroughHighlighted,
  isAdmin,
}: {
  zone: Zone;
  onClick?: () => void;
  screenMode: ScreenMode;
  walkthroughActive: boolean;
  walkthroughHighlighted: boolean;
  isAdmin: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isMobile = screenMode === "mobile";
  const isAdminOnly = Boolean(zone.adminOnly);
  const isLocked = isAdminOnly && !isAdmin;
  const isEmphasised = (hovered && !isLocked) || walkthroughHighlighted;

  const cardStyle: CSSProperties = {
    position: "relative",
    zIndex: walkthroughHighlighted ? 4 : hovered ? 3 : 1,
    width: "100%",
    minHeight: isMobile ? "82px" : "94px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "50px 1px minmax(0, 1fr) 42px"
      : "64px 1px minmax(0, 1fr) 52px",
    alignItems: "center",
    gap: isMobile ? "12px" : "18px",
    padding: isMobile ? "16px" : "20px 24px 20px 20px",
    borderRadius: "16px",
    border: isEmphasised
      ? `1px solid ${zone.accent}e0`
      : isLocked
        ? "1px solid rgba(255,209,138,0.34)"
        : `1px solid ${zone.accent}66`,
    background: isEmphasised
      ? `linear-gradient(145deg, ${zone.accent}34, rgba(3,11,29,0.96))`
      : isLocked
        ? "linear-gradient(145deg, rgba(42,30,35,0.82), rgba(14,18,38,0.82))"
        : `linear-gradient(145deg, ${zone.accent}1c, rgba(7,20,45,0.78))`,
    color: "white",
    textDecoration: "none",
    textAlign: "left",
    fontFamily: "inherit",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: walkthroughHighlighted
      ? `0 0 0 3px ${zone.accent}24, 0 0 54px ${zone.accent}72, 0 28px 74px rgba(0,0,0,0.55)`
      : hovered && !isLocked
        ? `0 0 42px ${zone.accent}48, 0 26px 70px rgba(0,0,0,0.42)`
        : isLocked
          ? "0 14px 34px rgba(0,0,0,0.3), inset 0 0 24px rgba(255,186,94,0.04)"
          : `0 14px 34px rgba(0,0,0,0.3), inset 0 0 28px ${zone.accent}0b`,
    opacity:
      walkthroughActive && !walkthroughHighlighted
        ? 0.2
        : isLocked
          ? 0.78
          : isEmphasised
            ? 1
            : 0.88,
    filter:
      walkthroughActive && !walkthroughHighlighted
        ? "saturate(0.35) brightness(0.5)"
        : isLocked
          ? "saturate(0.62) brightness(0.86)"
          : isEmphasised
            ? "none"
            : "saturate(0.86) brightness(0.94)",
    transform:
      isEmphasised && !isLocked ? "translateY(-4px) scale(1.012)" : "none",
    transition:
      "transform 420ms cubic-bezier(.2,.82,.24,1), box-shadow 360ms ease, border-color 360ms ease, opacity 360ms ease, filter 360ms ease, background 360ms ease",
    cursor: walkthroughActive ? "default" : isLocked ? "not-allowed" : "pointer",
    pointerEvents: walkthroughActive ? "none" : "auto",
    appearance: "none",
  };

  const content = (
    <>
      <div
        style={{
          width: isMobile ? "44px" : "52px",
          height: isMobile ? "44px" : "52px",
          borderRadius: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isMobile ? "20px" : "23px",
          color: isLocked ? "#ffd18a" : zone.accent,
          background: isLocked
            ? "radial-gradient(circle, rgba(255,186,94,0.18), rgba(23,14,24,0.92))"
            : `radial-gradient(circle, ${zone.accent}32, rgba(2,8,19,0.9))`,
          border: isLocked
            ? "1px solid rgba(255,209,138,0.42)"
            : `1px solid ${zone.accent}88`,
          boxShadow: isLocked
            ? "0 0 22px rgba(255,186,94,0.1), inset 0 0 18px rgba(255,186,94,0.05)"
            : `0 0 22px ${zone.accent}42, inset 0 0 18px ${zone.accent}18`,
        }}
      >
        {zone.icon}
      </div>

      <div
        style={{
          width: "1px",
          height: isMobile ? "52px" : "58px",
          background: `${zone.accent}38`,
        }}
      />

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: isMobile ? "10px" : "14px",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              fontSize: isMobile ? "15px" : "18px",
              color: isLocked ? "#ffd18a" : zone.accent,
              lineHeight: 1.2,
            }}
          >
            {zone.number}
          </span>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                  fontSize: isMobile ? "15px" : "17px",
                  lineHeight: 1.35,
                  fontWeight: 750,
                  color: "white",
                }}
              >
                {zone.title}
              </h2>

              <span
                style={{
                  minHeight: "22px",
                  padding: "0 8px",
                  borderRadius: "999px",
                  border: `1px solid ${zone.accent}66`,
                  background: `${zone.accent}16`,
                  color: zone.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isMobile ? "7px" : "8px",
                  fontWeight: 900,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {zone.activityLabel}
              </span>

              {zone.statusLabel && (
                <span
                  style={{
                    minHeight: "24px",
                    padding: "0 9px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,209,138,0.34)",
                    background: "rgba(255,186,94,0.12)",
                    color: "#ffd18a",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isMobile ? "8px" : "9px",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {zone.statusLabel}
                </span>
              )}

              {isAdminOnly && isAdmin && (
                <span
                  style={{
                    minHeight: "24px",
                    padding: "0 9px",
                    borderRadius: "999px",
                    border: "1px solid rgba(126,232,255,0.28)",
                    background: "rgba(83,215,255,0.09)",
                    color: "#bdf6ff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isMobile ? "8px" : "9px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Admin Preview
                </span>
              )}
            </div>

            {!isMobile && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: isLocked
                    ? "rgba(255,224,178,0.68)"
                    : "rgba(255,255,255,0.64)",
                  fontSize: "12px",
                  lineHeight: 1.45,
                }}
              >
                {zone.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          width: isMobile ? "38px" : "46px",
          height: isMobile ? "38px" : "46px",
          borderRadius: "999px",
          border: isLocked
            ? "1px solid rgba(255,209,138,0.3)"
            : `1px solid ${zone.accent}42`,
          background: isLocked
            ? "rgba(255,186,94,0.08)"
            : `${zone.accent}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isLocked ? (isMobile ? "16px" : "18px") : isMobile ? "22px" : "26px",
          color: isLocked ? "#ffd18a" : zone.accent,
        }}
      >
        {isLocked ? "🔒" : "→"}
      </div>
    </>
  );

  const commonProps = {
    id: `nova-zone-${zone.number}`,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: cardStyle,
  };

  if (isLocked) {
    return (
      <button
        type="button"
        aria-label={`${zone.title} is coming soon`}
        aria-disabled="true"
        disabled
        {...commonProps}
      >
        {content}
      </button>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...commonProps}>
        {content}
      </button>
    );
  }

  return (
    <Link
      href={zone.href}
      onClick={
        zone.id === "skyforge-hangar"
          ? rememberNovaRoverOrigin
          : undefined
      }
      {...commonProps}
    >
      {content}
    </Link>
  );
}

function MembershipPortalPopup({ onClose }: { onClose: () => void }) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const plans = [
    {
      key: "core",
      eyebrow: "English + Mathematics",
      name: "Core Missions",
      price: "SGD 19.90",
      suffix: "/month",
      badge: "Launch Price",
      accent: "#c58cff",
      description:
        "Structured English and Mathematics learning across Dreamscape, with curriculum practice, thinking activities, rewards and progress tracking.",
      features: [
        "Primary 1–6 English Learning Missions",
        "Primary 1–6 Mathematics Learning Missions",
        "Think Lab and Knowledge Arena access",
        "Topic mastery and progress insights",
        "Dream Token and Dream Gem rewards",
      ],
    },
    {
      key: "nova",
      eyebrow: "Learning Intelligence",
      name: "NOVA+",
      price: "SGD 24.90",
      suffix: "/month",
      badge: "Launch Price",
      accent: "#8ee8ff",
      description:
        "Everything in Core Missions plus Dreamscape learning intelligence for families who want a clearer view of progress, strengths, gaps and mastery.",
      features: [
        "Everything in Core Missions",
        "My Learning weekly intelligence",
        "Concept-level Strengths & Gaps",
        "Curriculum Mastery Map",
        "Personalised Nova recommendations",
        "Downloadable parent learning reports",
      ],
    },
    {
      key: "milo",
      eyebrow: "Real-World Learning",
      name: "Milo Finance",
      price: "SGD 12.90",
      suffix: "/month",
      badge: "Coming Soon",
      accent: "#9fffd2",
      comingSoon: true,
      description:
        "Financial literacy, business and market learning across Milo’s World, designed to turn money concepts into practical decisions.",
      features: [
        "Milo’s Bank financial literacy lessons",
        "Milo’s Business Builder",
        "Exclusive Exchange finance lessons",
        "Early access to selected property launches",
        "Additional property upgrades and development options",
        "Finance progression and achievements",
      ],
    },
    {
      key: "full",
      eyebrow: "Complete Dreamscape",
      name: "Full Access",
      price: "Price coming soon",
      suffix: "",
      badge: "Coming Soon",
      accent: "#ffbd73",
      comingSoon: true,
      description:
        "The complete Dreamscape membership, combining NOVA+, Science and Milo Finance in one connected academic and real-world learning experience.",
      features: [
        "Everything in NOVA+",
        "Primary 1–6 Science Learning Missions",
        "Science topic quizzes and mixed assessments",
        "Science mastery tracking",
        "Everything in Milo Finance",
        "Complete academic + real-world learning access",
      ],
    },
  ];

  function openPricingPage() {
    onClose();
    window.location.href = "/pricing";
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        padding: isMobile ? "10px" : "26px",
        background: "rgba(2,8,19,0.68)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "min(1280px, 96vw)",
          maxHeight: isMobile ? "calc(100dvh - 20px)" : "92vh",
          overflowY: "auto",
          borderRadius: isMobile ? "22px" : "30px",
          border: "1px solid rgba(126,221,255,0.46)",
          background:
            "radial-gradient(circle at 10% 0%, rgba(83,215,255,0.13), transparent 32%), radial-gradient(circle at 90% 100%, rgba(197,140,255,0.12), transparent 32%), linear-gradient(145deg, rgba(12,37,72,0.98), rgba(5,15,38,0.99))",
          boxShadow:
            "0 0 45px rgba(85,215,255,0.24), 0 30px 90px rgba(0,0,0,0.62)",
          padding: isMobile ? "62px 16px 22px" : "68px 34px 34px",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close membership portal"
          style={{
            position: "absolute",
            top: isMobile ? "12px" : "18px",
            right: isMobile ? "12px" : "18px",
            width: isMobile ? "40px" : "44px",
            height: isMobile ? "40px" : "44px",
            borderRadius: "999px",
            border: "1px solid rgba(150,231,255,0.56)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            fontSize: isMobile ? "24px" : "28px",
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <div style={{ textAlign: "center", padding: isMobile ? "0 8px" : "0 70px" }}>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "12px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Dreamscape One Memberships
          </p>

          <h2
            style={{
              margin: "12px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "34px" : "48px",
              fontWeight: 400,
              lineHeight: 1.06,
            }}
          >
            Choose how far you want to go.
          </h2>

          <p
            style={{
              margin: "14px auto 0",
              maxWidth: "820px",
              color: "rgba(255,255,255,0.72)",
              fontSize: isMobile ? "14px" : "16px",
              lineHeight: 1.65,
            }}
          >
            Start with Core Missions, add NOVA+ learning intelligence, explore real-world
            learning with Milo Finance, or choose Full Access for the complete Dreamscape
            experience.
          </p>
        </div>

        <div
          style={{
            marginTop: isMobile ? "26px" : "38px",
            display: "grid",
            gridTemplateColumns: isDesktop ? "repeat(4, minmax(0, 1fr))" : "1fr",
            gap: isMobile ? "14px" : "18px",
            alignItems: "stretch",
          }}
        >
          {plans.map((plan) => (
            <article
              key={plan.key}
              style={{
                position: "relative",
                minHeight: isDesktop ? "560px" : "auto",
                padding: isMobile ? "24px 20px" : "28px 24px",
                display: "flex",
                flexDirection: "column",
                borderRadius: "24px",
                border: `1px solid ${plan.accent}55`,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.022))",
                boxShadow: `0 18px 48px rgba(0,0,0,0.24), 0 0 24px ${plan.accent}10`,
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: `radial-gradient(circle at 12% 0%, ${plan.accent}18, transparent 34%)`,
                }}
              />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: plan.accent,
                      fontSize: "10px",
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      lineHeight: 1.5,
                    }}
                  >
                    {plan.eyebrow}
                  </p>

                  <span
                    style={{
                      flexShrink: 0,
                      padding: "6px 9px",
                      borderRadius: "999px",
                      border: `1px solid ${plan.accent}55`,
                      background: `${plan.accent}12`,
                      color: plan.accent,
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {plan.badge}
                  </span>
                </div>

                <h3
                  style={{
                    margin: "14px 0 0",
                    fontSize: isMobile ? "29px" : "31px",
                    lineHeight: 1.08,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {plan.name}
                </h3>

                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "7px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong
                    style={{
                      color: "white",
                      fontSize: plan.key === "full" ? "23px" : isMobile ? "34px" : "36px",
                      lineHeight: 1,
                      fontWeight: 900,
                    }}
                  >
                    {plan.price}
                  </strong>
                  {plan.suffix && (
                    <span
                      style={{
                        paddingBottom: "3px",
                        color: "rgba(255,255,255,0.48)",
                        fontSize: "12px",
                      }}
                    >
                      {plan.suffix}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: "18px 0 0",
                    minHeight: isDesktop ? "104px" : "auto",
                    color: "rgba(255,255,255,0.68)",
                    fontSize: "13px",
                    lineHeight: 1.62,
                  }}
                >
                  {plan.description}
                </p>
              </div>

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginTop: "22px",
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  display: "grid",
                  gap: "11px",
                  flex: 1,
                }}
              >
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px minmax(0,1fr)",
                      gap: "9px",
                      alignItems: "start",
                      color: "rgba(255,255,255,0.82)",
                      fontSize: "12px",
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ color: plan.accent, fontWeight: 900 }}>✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={openPricingPage}
                style={{
                  position: "relative",
                  zIndex: 1,
                  marginTop: "24px",
                  minHeight: "50px",
                  width: "100%",
                  borderRadius: "14px",
                  border: `1px solid ${plan.accent}66`,
                  background: plan.comingSoon
                    ? "rgba(255,255,255,0.055)"
                    : `linear-gradient(135deg, ${plan.accent}36, rgba(30,61,120,0.86))`,
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {plan.comingSoon ? "View Coming Soon Plan" : "View Plan & Pricing"} →
              </button>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: isMobile ? "16px" : "18px 22px",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffbd73",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Complete Membership
            </p>
            <p
              style={{
                margin: "6px 0 0",
                color: "white",
                fontSize: "14px",
                fontWeight: 800,
                lineHeight: 1.45,
              }}
            >
              Full Access includes both NOVA+ and Milo Finance, plus Science.
            </p>
          </div>

          <button
            type="button"
            onClick={openPricingPage}
            style={{
              minHeight: "44px",
              padding: "0 16px",
              borderRadius: "999px",
              border: "1px solid rgba(255,189,115,0.42)",
              background: "rgba(255,189,115,0.1)",
              color: "#ffd18a",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            Compare All Plans →
          </button>
        </div>
      </div>
    </div>
  );
}

function GuidedWalkthrough({
  open,
  stepIndex,
  onStepChange,
  onClose,
  onNavigate,
}: {
  open: boolean;
  stepIndex: number;
  onStepChange: (nextStep: number) => void;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isDesktop = screenMode === "desktop";
  const isTablet = screenMode === "tablet";
  const useFullWalkthroughLayout = isDesktop;
  const step = WALKTHROUGH_STEPS[stepIndex] ?? WALKTHROUGH_STEPS[0];
  const isFirstStep = stepIndex === 0;
  const isRewardsStep = step.eyebrow === "Your Rewards";
  const isActivityTypesStep = Boolean(step.showActivityLegend);
  const isWorldPathStep = Boolean(step.showWorldPath);
  const isLastStep = stepIndex === WALKTHROUGH_STEPS.length - 1;
  const [typedLength, setTypedLength] = useState(0);
  const guideRef = useRef<HTMLDivElement | null>(null);
  const [guideAnchor, setGuideAnchor] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open) {
      setTypedLength(0);
      return;
    }

    setTypedLength(0);
    const interval = window.setInterval(() => {
      setTypedLength((current) => {
        if (current >= step.text.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 13);

    return () => window.clearInterval(interval);
  }, [open, step.text]);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let settleTimer: number | null = null;
    let resizeTimer: number | null = null;

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), Math.max(min, max));

    function setNeutralPosition() {
      if (cancelled) return;

      const viewportWidth = window.innerWidth;
      const margin = isMobile ? 12 : 20;
      const guideWidth = isMobile
        ? viewportWidth - margin * 2
        : isTablet
          ? Math.min(620, viewportWidth - 48)
          : Math.min(570, viewportWidth - 60);

      setGuideAnchor({
        left: `${Math.max(margin, (viewportWidth - guideWidth) / 2)}px`,
        top: "auto",
        right: "auto",
        bottom: isMobile ? "14px" : "24px",
        transform: "none",
      });
    }

    function positionAtLocation(allowScrollAdjustment = true) {
      if (cancelled || !step.zoneNumber) {
        setNeutralPosition();
        return;
      }

      const target = document.getElementById(`nova-zone-${step.zoneNumber}`);
      if (!target) {
        setNeutralPosition();
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = isMobile ? 12 : 20;
      const gap = isMobile ? 14 : 18;

      const guideRect = guideRef.current?.getBoundingClientRect();
      const guideWidth =
        guideRect?.width ||
        (isMobile
          ? viewportWidth - margin * 2
          : isTablet
            ? Math.min(620, viewportWidth - 48)
            : Math.min(570, viewportWidth - 60));
      const guideHeight =
        guideRect?.height ||
        (isMobile ? Math.min(360, viewportHeight * 0.48) : 360);

      const targetRect = target.getBoundingClientRect();
      const targetCentreX = targetRect.left + targetRect.width / 2;
      const targetCentreY = targetRect.top + targetRect.height / 2;

      const spaceAbove = targetRect.top - margin - gap;
      const spaceBelow = viewportHeight - targetRect.bottom - margin - gap;
      const spaceLeft = targetRect.left - margin - gap;
      const spaceRight = viewportWidth - targetRect.right - margin - gap;

      // On landscape/desktop, attach to a side whenever there is room.
      // On portrait/tablet/mobile, attach directly above or below the card.
      const candidates: Array<{
        side: "right" | "left" | "below" | "above";
        x: number;
        y: number;
        fits: boolean;
        room: number;
      }> = [];

      if (isDesktop) {
        candidates.push(
          {
            side: "right",
            x: targetRect.right + gap,
            y: clamp(
              targetCentreY - guideHeight / 2,
              margin,
              viewportHeight - guideHeight - margin,
            ),
            fits: spaceRight >= guideWidth,
            room: spaceRight,
          },
          {
            side: "left",
            x: targetRect.left - gap - guideWidth,
            y: clamp(
              targetCentreY - guideHeight / 2,
              margin,
              viewportHeight - guideHeight - margin,
            ),
            fits: spaceLeft >= guideWidth,
            room: spaceLeft,
          },
        );
      }

      candidates.push(
        {
          side: "below",
          x: clamp(
            targetCentreX - guideWidth / 2,
            margin,
            viewportWidth - guideWidth - margin,
          ),
          y: targetRect.bottom + gap,
          fits: spaceBelow >= guideHeight,
          room: spaceBelow,
        },
        {
          side: "above",
          x: clamp(
            targetCentreX - guideWidth / 2,
            margin,
            viewportWidth - guideWidth - margin,
          ),
          y: targetRect.top - gap - guideHeight,
          fits: spaceAbove >= guideHeight,
          room: spaceAbove,
        },
      );

      let chosen =
        candidates.find((candidate) => candidate.fits) ||
        [...candidates].sort((a, b) => b.room - a.room)[0];

      if (
        allowScrollAdjustment &&
        !chosen.fits &&
        (chosen.side === "above" || chosen.side === "below")
      ) {
        const missing = Math.max(0, guideHeight - chosen.room + 20);

        if (missing > 4) {
          window.scrollBy({
            top: chosen.side === "below" ? missing : -missing,
            behavior: "smooth",
          });

          settleTimer = window.setTimeout(
            () => positionAtLocation(false),
            360,
          );
          return;
        }
      }

      const x = clamp(
        chosen.x,
        margin,
        viewportWidth - guideWidth - margin,
      );
      const y = clamp(
        chosen.y,
        margin,
        viewportHeight - guideHeight - margin,
      );

      if (!cancelled) {
        setGuideAnchor({
          left: `${x}px`,
          top: `${y}px`,
          right: "auto",
          bottom: "auto",
          transform: "none",
        });
      }
    }

    if (!step.zoneNumber) {
      setNeutralPosition();
    } else {
      const target = document.getElementById(`nova-zone-${step.zoneNumber}`);

      if (target) {
        const targetRect = target.getBoundingClientRect();
        const fullyVisible =
          targetRect.top >= 80 &&
          targetRect.bottom <= window.innerHeight - 80;

        if (!fullyVisible) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          settleTimer = window.setTimeout(
            () => positionAtLocation(true),
            340,
          );
        } else {
          settleTimer = window.setTimeout(
            () => positionAtLocation(true),
            60,
          );
        }
      } else {
        setNeutralPosition();
      }
    }

    function handleResize() {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(
        () =>
          step.zoneNumber
            ? positionAtLocation(false)
            : setNeutralPosition(),
        120,
      );
    }

    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      if (settleTimer) window.clearTimeout(settleTimer);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDesktop, isMobile, isTablet, open, step.zoneNumber]);

  if (!open) return null;

  const actionStyle: CSSProperties = {
    minHeight: "42px",
    padding: "0 17px",
    borderRadius: "12px",
    border: "1px solid rgba(83,215,255,0.42)",
    background: "rgba(83,215,255,0.16)",
    color: "white",
    cursor: "pointer",
    fontWeight: 850,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontSize: "13px",
  };

  const secondaryStyle: CSSProperties = {
    ...actionStyle,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 750,
  };

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(0,3,12,0.74)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nova’s World interactive guide"
        ref={guideRef}
        style={{
          position: "fixed",
          ...guideAnchor,
          zIndex: 100,
          width: isMobile
            ? "calc(100vw - 24px)"
            : isDesktop
              ? "min(570px, calc(100vw - 60px))"
              : "min(620px, calc(100vw - 48px))",
          maxHeight: isMobile
            ? "min(500px, 56dvh)"
            : isDesktop
              ? "min(620px, calc(100dvh - 48px))"
              : "min(560px, 52dvh)",
          overflowY: "auto",
          overflowX: "hidden",
          borderRadius: isMobile ? "20px" : "26px",
          border: "1px solid rgba(142,232,255,0.42)",
          background:
            "radial-gradient(circle at 10% 0%, rgba(83,215,255,0.12), transparent 34%), linear-gradient(145deg, rgba(4,21,47,0.985), rgba(3,9,24,0.985))",
          boxShadow:
            "0 32px 90px rgba(0,0,0,0.68), 0 0 40px rgba(83,215,255,0.14)",
          color: "white",
          padding: isMobile
            ? "16px"
            : useFullWalkthroughLayout
              ? "26px 28px 24px 190px"
              : "20px 22px 20px",
          transition:
            "left 480ms cubic-bezier(.2,.82,.24,1), top 480ms cubic-bezier(.2,.82,.24,1), bottom 480ms cubic-bezier(.2,.82,.24,1), transform 480ms cubic-bezier(.2,.82,.24,1), max-height 300ms ease",
          willChange: "left, top, bottom, transform",
        }}
      >
        <button
          type="button"
          aria-label="Close guide"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "13px",
            right: "13px",
            width: "36px",
            height: "36px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            cursor: "pointer",
            fontSize: "19px",
            zIndex: 3,
          }}
        >
          ×
        </button>

        {(!isWorldPathStep && !isRewardsStep) && (
          <img
            src="/nova/nova-character.png"
            alt="Nova"
            style={{
              position: isDesktop ? "absolute" : "relative",
              left: isDesktop ? "3px" : "auto",
              bottom: isDesktop ? "-8px" : "auto",
              height: isDesktop
                ? "250px"
                : step.zoneNumber
                  ? isMobile
                    ? "62px"
                    : "78px"
                  : isMobile
                    ? "68px"
                    : "86px",
              width: "auto",
              objectFit: "contain",
              display: "block",
              margin: isDesktop ? 0 : "0 0 5px",
              filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.52))",
              pointerEvents: "none",
            }}
          />
        )}

        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 850,
          }}
        >
          {step.eyebrow}
        </p>

        <h2
          style={{
            margin: isMobile ? "6px 34px 0 0" : "8px 42px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "22px" : isTablet ? "30px" : "35px",
            lineHeight: 1.08,
            fontWeight: 500,
          }}
        >
          {step.title}
        </h2>

        <p
          style={{
            margin: isMobile ? "9px 0 0" : "12px 0 0",
            minHeight: isDesktop ? "72px" : "0",
            color: "rgba(255,255,255,0.78)",
            fontSize: isMobile ? "13px" : isTablet ? "14px" : "16px",
            lineHeight: isMobile ? 1.46 : 1.55,
          }}
        >
          {step.text.slice(0, typedLength)}
          {typedLength < step.text.length && (
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: "7px",
                height: "16px",
                marginLeft: "3px",
                background: "rgba(255,255,255,0.72)",
                transform: "translateY(2px)",
              }}
            />
          )}
        </p>

        {isWorldPathStep && (
          <div
            style={{
              marginTop: "16px",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.035)",
              padding: isMobile ? "13px 12px" : "14px 16px",
            }}
          >
            <div
              style={{
                display: isMobile ? "grid" : "flex",
                gridTemplateColumns: isMobile ? "1fr" : undefined,
                alignItems: "center",
                gap: isMobile ? "8px" : "7px",
                overflowX: isMobile ? "visible" : "auto",
                overflowY: "hidden",
                paddingBottom: isMobile ? 0 : "6px",
                scrollbarWidth: "thin",
              }}
            >
              {NOVA_WORLD_PATH.map((item, index) => (
                <div
                  key={item.label}
                  style={{
                    display: isMobile ? "contents" : "flex",
                    alignItems: "center",
                    gap: "7px",
                    flex: "0 0 auto",
                  }}
                >
                  <div
                    style={{
                      minWidth: isMobile ? 0 : "112px",
                      borderRadius: "14px",
                      border: `1px solid ${item.colour}66`,
                      background: `linear-gradient(145deg, ${item.colour}20, rgba(3,11,29,0.7))`,
                      padding: "10px 11px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          border: `1px solid ${item.colour}`,
                          background: `${item.colour}18`,
                          color: item.colour,
                          fontSize: "10px",
                          fontWeight: 950,
                        }}
                      >
                        {item.symbol}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: item.colour,
                            fontSize: isMobile ? "10px" : "11px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.label}
                        </strong>
                        <small
                          style={{
                            display: "block",
                            marginTop: "3px",
                            color: "rgba(255,255,255,0.58)",
                            fontSize: isMobile ? "8px" : "9px",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.zone}
                        </small>
                      </div>
                    </div>
                  </div>

                  {index < NOVA_WORLD_PATH.length - 1 && (
                    <div
                      aria-hidden="true"
                      style={{
                        height: isMobile ? "18px" : "2px",
                        width: isMobile ? "2px" : "24px",
                        margin: isMobile ? "0 auto" : 0,
                        borderRadius: "999px",
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.58), rgba(255,255,255,0.18))",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          right: isMobile ? "50%" : "-2px",
                          bottom: isMobile ? "-3px" : "50%",
                          transform: isMobile ? "translateX(50%) rotate(90deg)" : "translateY(50%)",
                          color: "rgba(255,255,255,0.68)",
                          fontSize: "13px",
                        }}
                      >
                        ›
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isActivityTypesStep && (
          <div
            style={{
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {[
              { label: "Academic Challenge", colour: "#53d7ff", note: "Think Lab · Knowledge Arena" },
              { label: "Play & Build", colour: "#c58cff", note: "Nova’s Home · Skyforge Hangar" },
              { label: "Pure Academics", colour: "#f6c453", note: "Missions Centre" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  minHeight: isMobile ? "86px" : "94px",
                  padding: isMobile ? "10px 8px" : "12px 10px",
                  borderRadius: "16px",
                  border: `1px solid ${item.colour}66`,
                  background: `linear-gradient(145deg, ${item.colour}20, rgba(3,11,29,0.72))`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "30px",
                    height: "8px",
                    borderRadius: "999px",
                    background: item.colour,
                    boxShadow: `0 0 18px ${item.colour}88`,
                    marginBottom: "9px",
                  }}
                />
                <strong style={{ fontSize: isMobile ? "9px" : "10px", color: item.colour }}>
                  {item.label}
                </strong>
                <small
                  style={{
                    marginTop: "5px",
                    fontSize: isMobile ? "7px" : "8px",
                    lineHeight: 1.3,
                    color: "rgba(255,255,255,0.62)",
                  }}
                >
                  {item.note}
                </small>
              </div>
            ))}
          </div>
        )}

        {isRewardsStep && (
          <div
            style={{
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div className="nova-reward-token nova-reward-dt">
              <span>◈</span>
              <strong>Dream Tokens</strong>
              <small>DT · Play & build</small>
            </div>
            <div className="nova-reward-token nova-reward-dg">
              <span>◆</span>
              <strong>Dream Gems</strong>
              <small>DG · Learning rewards</small>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: isMobile ? "12px" : "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            aria-label={`Guide step ${stepIndex + 1} of ${WALKTHROUGH_STEPS.length}`}
            style={{ display: "flex", gap: "6px", alignItems: "center" }}
          >
            {WALKTHROUGH_STEPS.map((_, index) => (
              <span
                key={index}
                style={{
                  width: index === stepIndex ? "22px" : "7px",
                  height: "7px",
                  borderRadius: "999px",
                  background:
                    index === stepIndex ? "#8ee8ff" : "rgba(255,255,255,0.2)",
                  transition: "width 180ms ease, background 180ms ease",
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {isFirstStep ? (
              <>
                <button type="button" onClick={onClose} style={secondaryStyle}>
                  Maybe later
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange(1)}
                  style={actionStyle}
                >
                  Start tour
                </button>
              </>
            ) : isLastStep ? (
              <>
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => onNavigate(zone.href)}
                    style={{
                      ...secondaryStyle,
                      border: `1px solid ${zone.accent}88`,
                      background: `${zone.accent}18`,
                      color: zone.accent,
                    }}
                  >
                    {zone.title}
                  </button>
                ))}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
                  style={secondaryStyle}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange(stepIndex + 1)}
                  style={actionStyle}
                >
                  Next
                </button>
              </>
            )}
          </div>
        </div>

        <style>{`
          .nova-reward-token {
            min-height: 102px;
            padding: 14px 10px;
            border-radius: 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            animation: novaRewardArrive 520ms cubic-bezier(.2,.85,.25,1.2) both;
          }
          .nova-reward-token > span {
            width: 38px;
            height: 38px;
            border-radius: 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            font-size: 20px;
            animation: novaRewardFloat 1.8s ease-in-out infinite alternate;
          }
          .nova-reward-token strong { font-size: 12px; }
          .nova-reward-token small { margin-top: 3px; font-size: 9px; opacity: .62; }
          .nova-reward-dt {
            border: 1px solid rgba(83,215,255,.3);
            background: rgba(83,215,255,.07);
          }
          .nova-reward-dt > span {
            color: #bdf6ff;
            border: 1px solid rgba(83,215,255,.52);
            background: radial-gradient(circle, rgba(83,215,255,.34), rgba(2,8,19,.8));
            box-shadow: 0 0 24px rgba(83,215,255,.28);
          }
          .nova-reward-dg {
            border: 1px solid rgba(216,180,254,.3);
            background: rgba(192,132,252,.08);
            animation-delay: 120ms;
          }
          .nova-reward-dg > span {
            color: #f3e8ff;
            border: 1px solid rgba(216,180,254,.58);
            background: radial-gradient(circle, rgba(216,180,254,.38), rgba(30,12,58,.9));
            box-shadow: 0 0 24px rgba(192,132,252,.32);
          }
          @keyframes novaRewardArrive {
            from { opacity: 0; transform: translateY(18px) scale(.84); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes novaRewardFloat {
            from { transform: translateY(0) rotate(-2deg); }
            to { transform: translateY(-5px) rotate(2deg); }
          }
        `}</style>
      </div>
    </>
  );
}

