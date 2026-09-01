"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import ObjectivesPanel, {
  type CurrentObjectivesStatus,
} from "@/components/objectives/ObjectivesPanel";

const STUDENT_COVER_IMAGE = "/nova/membership/student-access-cover.png";

type ScreenMode = "desktop" | "tablet" | "mobile";

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
  adminOnly?: boolean;
  statusLabel?: string;
};

type WalkthroughStep = {
  eyebrow: string;
  title: string;
  text: string;
  zoneNumber?: string;
};

const WALKTHROUGH_STORAGE_KEY = "nova-world-walkthrough-completed-v5";
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
    number: "1",
    title: "Think Lab",
    description: "Where Nova sharpens her mind — and challenges yours.",
    href: "/nova/thinking-skills-lab",
    icon: "◇",
    accent: "#53d7ff",
  },
  {
    id: "nova-home",
    number: "2",
    title: "Nova’s Home",
    description: "Your space. Build it your way.",
    href: "/inventor/hub",
    icon: "⌂",
    accent: "#c58cff",
  },
  {
    id: "missions-centre",
    number: "3",
    title: "Missions Centre",
    description: "Your launch point for English, Maths, Science, and bigger learning missions.",
    href: "/learning-missions",
    icon: "✦",
    accent: "#8dfcff",
  },
  {
    id: "knowledge-arena",
    number: "4",
    title: "Knowledge Arena",
    description: "Jump straight into fast-paced quiz challenges and test what you know.",
    href: "/learning-missions/knowledge-arena",
    icon: "◎",
    accent: "#ffd27d",
  },
  {
    id: "skyforge-hangar",
    number: "5",
    title: "Skyforge Hangar",
    description: "Head straight to your rover, upgrades, and driving challenges.",
    href: ROVER_FROM_NOVA_HREF,
    icon: "⇧",
    accent: "#8effc1",
  },
];

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    eyebrow: "Hi, I’m Nova",
    title: "Want me to show you around?",
    text: "I can show you where we think, learn, earn rewards, build your own space, and launch your rover. It only takes a moment.",
  },
  {
    eyebrow: "Your Rewards",
    title: "Meet Dream Tokens and Dream Gems.",
    text: "Dream Tokens, or DT, are used for play, upgrades, and building inside Dreamscape. Dream Gems, or DG, are special learning rewards earned through eligible activities.",
  },
  {
    eyebrow: "Stop 1 of 5",
    title: "This is my Think Lab.",
    text: "I come here to sharpen my logic, spot patterns, and stretch my reasoning. Want to try a game with me?",
    zoneNumber: "1",
  },
  {
    eyebrow: "Stop 2 of 5",
    title: "This is Nova’s Home.",
    text: "Earn Dream Tokens, unlock new spaces, play at home, and make Nova’s Home feel like yours.",
    zoneNumber: "2",
  },
  {
    eyebrow: "Stop 3 of 5",
    title: "Our missions launch from here.",
    text: "The Missions Centre is where we tackle English, Maths, Science, and bigger learning challenges together — with progress and rewards along the way.",
    zoneNumber: "3",
  },
  {
    eyebrow: "Stop 4 of 5",
    title: "Ready for the Knowledge Arena?",
    text: "Jump straight into the Knowledge Arena whenever you want a fast quiz challenge without going through the Missions Centre first.",
    zoneNumber: "4",
  },
  {
    eyebrow: "Stop 5 of 5",
    title: "And this is Skyforge Hangar.",
    text: "This shortcut takes you straight to your rover, where you can check your build and head into rover challenges without going through Core Missions first.",
    zoneNumber: "5",
  },
  {
    eyebrow: "You’re ready",
    title: "Where should we go first?",
    text: "Choose a place and I’ll meet you there. You can open Nova Guide again anytime you want a reminder.",
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

  useEffect(() => {
    if (!walkthroughOpen) return;

    const activeZoneNumber = WALKTHROUGH_STEPS[walkthroughStep]?.zoneNumber;
    if (!activeZoneNumber || isDesktop) return;

    const timeout = window.setTimeout(() => {
      const target = document.getElementById(`nova-zone-${activeZoneNumber}`);
      if (!target) return;

      // Keep the highlighted location in the open half of the screen so the
      // guide never sits on top of the location Nova is talking about.
      if (isMobile) {
        target.scrollIntoView({
          behavior: "smooth",
          block:
            activeZoneNumber === "1" || activeZoneNumber === "2"
              ? "start"
              : "end",
        });
      } else {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [isDesktop, isMobile, walkthroughOpen, walkthroughStep]);

  const activeWalkthroughZoneNumber = walkthroughOpen
    ? (WALKTHROUGH_STEPS[walkthroughStep]?.zoneNumber ?? null)
    : null;
  const activeWalkthroughZone = activeWalkthroughZoneNumber
    ? (zones.find((zone) => zone.number === activeWalkthroughZoneNumber) ?? null)
    : null;
  const displayedDesktopZone = activeWalkthroughZone ?? hoveredZone;

  function startWalkthrough() {
    setShowMembershipPortal(false);
    setHoveredZone(null);
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

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          left: isDesktop ? "46px" : "auto",
          top: isDesktop ? "80px" : "auto",
          zIndex: 10,
          width: isDesktop
            ? "min(420px, 42vw)"
            : "min(640px, calc(100% - 36px))",
          margin: isDesktop ? 0 : isMobile ? "128px auto 26px" : "118px auto 28px",
          padding: isDesktop ? 0 : "0 2px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: isMobile ? "11px" : "14px",
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
            margin: isMobile ? "12px 0 0" : "16px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? "clamp(46px, 15vw, 64px)"
              : isTablet
              ? "clamp(58px, 9vw, 76px)"
              : "76px",
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
            margin: "18px 0 0",
            fontSize: isMobile ? "18px" : "22px",
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
            marginTop: isMobile ? "24px" : "34px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "#53d7ff",
            fontSize: isMobile ? "16px" : "19px",
            fontWeight: 300,
            letterSpacing: "0.03em",
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
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
          {zones.map((zone) => (
            <NovaHotspot
              key={zone.id}
              zone={zone}
              isActive={displayedDesktopZone?.id === zone.id}
              isWalkthroughActive={Boolean(activeWalkthroughZoneNumber)}
              isHighlighted={activeWalkthroughZoneNumber === zone.number}
              onEnter={() => {
                if (!walkthroughOpen) setHoveredZone(zone);
              }}
              onLeave={() => {
                if (!walkthroughOpen) setHoveredZone(null);
              }}
              onClick={() => {
                if (zone.id === "skyforge-hangar") {
                  rememberNovaRoverOrigin();
                }
                window.location.href = zone.href;
              }}
            />
          ))}

          {displayedDesktopZone && (
            <NovaZoneHoverPopup
              zone={displayedDesktopZone}
              isHighlighted={activeWalkthroughZoneNumber === displayedDesktopZone.number}
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
              Tap a location to enter · hover for details
            </div>
          )}
        </section>
      ) : (
        <section
          style={{
            position: "relative",
            zIndex: activeWalkthroughZoneNumber ? 90 : 20,
            width: isTablet && walkthroughOpen
              ? "min(360px, calc(100% - 48px))"
              : "min(680px, calc(100% - 28px))",
            margin: isTablet && walkthroughOpen ? "0 24px 0 auto" : "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: isMobile ? "12px" : "14px",
            paddingBottom: "24px",
          }}
        >
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              screenMode={screenMode}
              isAdmin={isAdmin}
              walkthroughActive={walkthroughOpen}
              walkthroughHighlighted={
                walkthroughOpen &&
                WALKTHROUGH_STEPS[walkthroughStep]?.zoneNumber === zone.number
              }
            />
          ))}
        </section>
      )}

      {showMembershipPortal && (
        <MembershipPortalPopup onClose={() => setShowMembershipPortal(false)} />
      )}


      {!walkthroughOpen && (
      <div
        style={{
          position: "fixed",
          right: isMobile ? "10px" : "18px",
          bottom: isMobile ? "10px" : "16px",
          zIndex: 70,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isMobile ? "4px" : "8px",
          pointerEvents: "none",
        }}
      >
        <img
          src="/nova/nova-character.png"
          alt="Nova"
          style={{
            height: isDesktop ? "265px" : isMobile ? "150px" : "215px",
            width: "auto",
            transform: isMobile ? "translateX(18px)" : "none",
            pointerEvents: "none",
            filter: "drop-shadow(0 28px 38px rgba(0,0,0,0.55))",
          }}
        />

        <button
          type="button"
          onClick={startWalkthrough}
          style={{
            minHeight: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 14px" : "0 19px",
            borderRadius: "999px",
            border: "1px solid rgba(83,215,255,0.62)",
            background: "rgba(20,84,118,0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: isMobile ? "11px" : "13px",
            fontWeight: 850,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            boxShadow:
              "0 16px 36px rgba(0,0,0,0.32), 0 0 22px rgba(83,215,255,0.18)",
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
      )}

      <GuidedWalkthrough
        open={walkthroughOpen}
        stepIndex={walkthroughStep}
        onStepChange={setWalkthroughStep}
        onClose={closeWalkthrough}
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
              <span>Membership</span>
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
            aria-label="Profile assets"
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
              {profileAssetsLoading ? "..." : formatDreamTokenAmount(profileAssetsTotal)}
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
          right: isDesktop ? "126px" : "18px",
          zIndex: 70,
          display: isDesktop ? "flex" : "contents",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "14px",
        }}
      >
        <Link
          href="/cart"
          aria-label="Cart"
          style={{
            width: "46px",
            height: "46px",
            padding: 0,
            borderRadius: "999px",
            border: "1px solid rgba(116,200,255,0.45)",
            background: "rgba(2,8,19,0.58)",
            backdropFilter: "blur(16px)",
            color: "white",
            textDecoration: "none",
            display: isDesktop ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
            flexShrink: 0,
          }}
        >
          🛒
        </Link>

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

            <span>{isDesktop ? "Profile Assets" : "Assets"}</span>
            <strong
              style={{
                color: "#53d7ff",
                fontSize: isMobile ? "11px" : "14px",
                letterSpacing: "0.04em",
              }}
            >
              {formatDreamTokenAmount(profileAssetsTotal)}
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
            {!isMobile && <span>Dream Gems</span>}
            <strong
              style={{
                color: "#e9d5ff",
                fontSize: isMobile ? "11px" : "14px",
                letterSpacing: "0.04em",
              }}
            >
              {dreamGemsLoading
                ? "..."
                : formatDreamGemAmount(dreamGemBalance)}
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
  const compactTitle = zone.title.length > 18;

  return (
    <button
      id={`nova-zone-${zone.number}`}
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      aria-label={zone.title}
      style={{
        position: "absolute",
        zIndex: isHighlighted ? 94 : 25,
        ...getNovaMarkerPosition(zone.id),
        width: "auto",
        minWidth: compactTitle ? "148px" : "112px",
        maxWidth: "188px",
        height: "46px",
        padding: compactTitle ? "0 13px" : "0 16px",
        transform: isActive
          ? "translate(-50%, -50%) scale(1.06)"
          : "translate(-50%, -50%)",
        borderRadius: "999px",
        border: isActive
          ? `1px solid ${zone.accent}`
          : `1px solid ${zone.accent}99`,
        background: isActive
          ? `linear-gradient(145deg, ${zone.accent}88, rgba(12,50,91,0.62))`
          : "rgba(4,24,53,0.46)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "white",
        fontFamily: "inherit",
        fontSize: compactTitle ? "11px" : "12px",
        lineHeight: 1.1,
        letterSpacing: compactTitle ? "0.025em" : "0.045em",
        fontWeight: 850,
        whiteSpace: "nowrap",
        textAlign: "center",
        cursor: "pointer",
        outline: "none",
        boxShadow: isActive
          ? `0 0 0 4px ${zone.accent}18, 0 0 30px ${zone.accent}88, 0 14px 34px rgba(0,0,0,0.34)`
          : `0 0 18px ${zone.accent}38, 0 12px 28px rgba(0,0,0,0.28)`,
        opacity: isWalkthroughActive && !isHighlighted ? 0.13 : 1,
        filter:
          isWalkthroughActive && !isHighlighted
            ? "saturate(0.25) brightness(0.42)"
            : "none",
        pointerEvents: isWalkthroughActive && !isHighlighted ? "none" : "auto",
        transition:
          "transform 220ms ease, opacity 220ms ease, filter 220ms ease, border-color 220ms ease, background 220ms ease, box-shadow 220ms ease",
      }}
    >
      {zone.title}
    </button>
  );
}

function NovaZoneHoverPopup({
  zone,
  isHighlighted = false,
}: {
  zone: Zone;
  isHighlighted?: boolean;
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
        zIndex: 62,
        ...popupPositionWithoutTransform,
        width: "330px",
        padding: "22px 24px",
        borderRadius: "20px",
        border: `${isHighlighted ? 2 : 1}px solid ${zone.accent}${isHighlighted ? "" : "aa"}`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.95), rgba(3,13,34,0.97))",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: isHighlighted
          ? `0 0 0 8px ${zone.accent}18, 0 0 46px ${zone.accent}aa, 0 24px 60px rgba(0,0,0,0.52)`
          : `0 0 28px ${zone.accent}55, 0 24px 60px rgba(0,0,0,0.45)`,
        color: "white",
        pointerEvents: "none",
        transform: `${popupTransform}${isHighlighted ? " scale(1.035)" : ""}`.trim(),
        transition: "border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease",
      }}
    >
      <p
        style={{
          margin: 0,
          color: zone.accent,
          fontSize: "11px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 800,
        }}
      >
        Location {zone.number}
      </p>
      <h2
        style={{
          margin: "10px 0 0",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "28px",
          lineHeight: 1.12,
          fontWeight: 500,
        }}
      >
        {zone.title}
      </h2>
      <p
        style={{
          margin: "12px 0 0",
          color: "rgba(255,255,255,0.78)",
          fontSize: "14px",
          lineHeight: 1.55,
        }}
      >
        {zone.description}
      </p>
      <div
        style={{
          marginTop: "18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: zone.accent,
          fontSize: "12px",
          fontWeight: 850,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Enter location <span aria-hidden="true">→</span>
      </div>
    </div>
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
      ? "1px solid rgba(142,232,255,0.88)"
      : isLocked
        ? "1px solid rgba(255,209,138,0.34)"
        : "1px solid rgba(135,216,255,0.32)",
    background: isEmphasised
      ? "rgba(4,22,48,0.95)"
      : isLocked
        ? "linear-gradient(145deg, rgba(42,30,35,0.82), rgba(14,18,38,0.82))"
        : "rgba(7,20,45,0.72)",
    color: "white",
    textDecoration: "none",
    textAlign: "left",
    fontFamily: "inherit",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: walkthroughHighlighted
      ? "0 0 0 3px rgba(83,215,255,0.18), 0 0 54px rgba(83,215,255,0.48), 0 28px 74px rgba(0,0,0,0.55)"
      : hovered && !isLocked
        ? "0 0 42px rgba(83,215,255,0.28), 0 26px 70px rgba(0,0,0,0.42)"
        : isLocked
          ? "0 14px 34px rgba(0,0,0,0.3), inset 0 0 24px rgba(255,186,94,0.04)"
          : "0 14px 34px rgba(0,0,0,0.3)",
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
      "transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease, opacity 260ms ease, filter 260ms ease, background 260ms ease",
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
          color: isLocked ? "#ffd18a" : "#8ee8ff",
          background: isLocked
            ? "radial-gradient(circle, rgba(255,186,94,0.18), rgba(23,14,24,0.92))"
            : "radial-gradient(circle, rgba(83,215,255,0.22), rgba(2,8,19,0.9))",
          border: isLocked
            ? "1px solid rgba(255,209,138,0.42)"
            : "1px solid rgba(83,215,255,0.48)",
          boxShadow: isLocked
            ? "0 0 22px rgba(255,186,94,0.1), inset 0 0 18px rgba(255,186,94,0.05)"
            : "0 0 22px rgba(83,215,255,0.22), inset 0 0 18px rgba(83,215,255,0.08)",
        }}
      >
        {zone.icon}
      </div>

      <div
        style={{
          width: "1px",
          height: isMobile ? "52px" : "58px",
          background: "rgba(255,255,255,0.16)",
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
              color: "rgba(255,255,255,0.86)",
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
            : "1px solid rgba(126,232,255,0.16)",
          background: isLocked
            ? "rgba(255,186,94,0.08)"
            : "rgba(83,215,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isLocked ? (isMobile ? "16px" : "18px") : isMobile ? "22px" : "26px",
          color: isLocked ? "#ffd18a" : "rgba(255,255,255,0.78)",
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
  const [studentHovered, setStudentHovered] = useState(false);

  function openStudentAccessPage() {
    onClose();
    window.location.href = "/pricing";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "14px" : "26px",
        background: "rgba(2, 8, 19, 0.56)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(1160px, 94vw)",
          maxHeight: isMobile ? "88dvh" : "92vh",
          overflowY: "auto",
          borderRadius: isMobile ? "22px" : "30px",
          border: "1px solid rgba(126, 221, 255, 0.62)",
          background:
            "linear-gradient(145deg, rgba(15, 48, 88, 0.96), rgba(9, 24, 56, 0.98))",
          boxShadow:
            "0 0 45px rgba(85, 215, 255, 0.35), 0 30px 90px rgba(0, 0, 0, 0.55)",
          padding: isMobile ? "28px 18px 24px" : "34px 46px 38px",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: isMobile ? "14px" : "22px",
            right: isMobile ? "14px" : "22px",
            width: isMobile ? "38px" : "44px",
            height: isMobile ? "38px" : "44px",
            borderRadius: "999px",
            border: "1px solid rgba(150, 231, 255, 0.7)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "white",
            fontSize: isMobile ? "24px" : "28px",
            lineHeight: 1,
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(83, 215, 255, 0.22)",
          }}
        >
          ×
        </button>

        <div
          style={{
            textAlign: "center",
            padding: isMobile ? "0 42px" : "0 70px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7ee8ff",
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Dreamscape One
          </p>

          <h2
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "32px" : "44px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              textShadow: "0 0 24px rgba(126, 221, 255, 0.35)",
            }}
          >
            Membership Portal
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "16px" : "20px",
              color: "#7ee8ff",
              fontWeight: 300,
            }}
          >
            Choose your Nova’s World access level.
          </p>

          <div
            style={{
              width: "210px",
              maxWidth: "70%",
              height: "1px",
              margin: "20px auto 0",
              background:
                "linear-gradient(90deg, transparent, rgba(126,232,255,0.9), transparent)",
            }}
          />
        </div>

        <div
          style={{
            marginTop: isMobile ? "26px" : "38px",
            display: "grid",
            gridTemplateColumns: isDesktop ? "0.9fr 1.1fr" : "1fr",
            gap: isMobile ? "16px" : "24px",
            alignItems: "stretch",
          }}
        >
          <article
            style={{
              minHeight: isDesktop ? "540px" : "auto",
              borderRadius: "26px",
              padding: isMobile ? "28px 22px" : "34px 30px",
              border: "1px solid rgba(150, 220, 255, 0.38)",
              background:
                "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
              boxShadow:
                "inset 0 0 24px rgba(255,255,255,0.03), 0 18px 42px rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at top left, rgba(126,232,255,0.13), transparent 42%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: "#7ee8ff",
                  fontSize: "13px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Basic Access
              </p>

              <h3
                style={{
                  margin: "24px 0 0",
                  fontSize: isMobile ? "36px" : "48px",
                  lineHeight: 1.04,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                }}
              >
                Explore Nova’s World
              </h3>

              <p
                style={{
                  margin: "28px 0 0",
                  fontSize: isMobile ? "58px" : "78px",
                  lineHeight: 0.95,
                  fontWeight: 800,
                  color: "#7ee8ff",
                  textShadow: "0 0 24px rgba(126,232,255,0.22)",
                }}
              >
                $0
              </p>

              <p
                style={{
                  margin: "22px 0 0",
                  color: "rgba(255,255,255,0.78)",
                  fontSize: "16px",
                  lineHeight: 1.6,
                }}
              >
                Basic access lets students enter Nova’s World and preview
                selected parts of the Dreamscape experience.
              </p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "32px 0 0",
                  display: "grid",
                  gap: "16px",
                }}
              >
                {[
                  "Explore selected Nova zones",
                  "Preview selected learning areas",
                  "Access basic Dreamscape Token features",
                  "Upgrade anytime to Student Access",
                ].map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr",
                      gap: "12px",
                      alignItems: "start",
                      color: "rgba(255,255,255,0.84)",
                      fontSize: "15px",
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "999px",
                        border: "1px solid rgba(126,232,255,0.65)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#7ee8ff",
                        fontSize: "13px",
                        fontWeight: 900,
                        background: "rgba(126,232,255,0.1)",
                        boxShadow: "0 0 12px rgba(126,232,255,0.24)",
                      }}
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              disabled
              style={{
                position: "relative",
                zIndex: 1,
                marginTop: "48px",
                width: "100%",
                height: "56px",
                borderRadius: "16px",
                border: "1px solid rgba(126,232,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.42)",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "not-allowed",
              }}
            >
              Current Plan
            </button>
          </article>

          <article
            onMouseEnter={() => setStudentHovered(true)}
            onMouseLeave={() => setStudentHovered(false)}
            onTouchStart={() => setStudentHovered((current) => !current)}
            onClick={openStudentAccessPage}
            style={{
              position: "relative",
              minHeight: isDesktop ? "560px" : isMobile ? "610px" : "560px",
              borderRadius: "26px",
              overflow: "hidden",
              border: "1px solid rgba(99, 232, 255, 0.85)",
              background:
                "linear-gradient(180deg, rgba(17, 82, 136, 0.94), rgba(7, 27, 68, 0.98))",
              boxShadow:
                "0 0 34px rgba(83, 215, 255, 0.42), 0 26px 74px rgba(0,0,0,0.34)",
              cursor: "pointer",
            }}
          >
            <img
              src={STUDENT_COVER_IMAGE}
              alt="Nova Student Access"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "30% center",
                display: "block",
                transform: studentHovered ? "scale(1.035)" : "scale(1)",
                transition: "transform 320ms ease",
              }}
              draggable={false}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: studentHovered
                  ? "linear-gradient(180deg, rgba(2,8,19,0.22), rgba(2,8,19,0.84))"
                  : "linear-gradient(180deg, rgba(2,8,19,0.02), rgba(2,8,19,0.16))",
                transition: "background 260ms ease",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "22px",
                left: "22px",
                right: "22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  minHeight: "34px",
                  padding: "0 16px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.42)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 900,
                  background: "rgba(53,197,255,0.82)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                ✦ Recommended
              </div>

              <div
                style={{
                  minHeight: "34px",
                  padding: "0 16px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.38)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 900,
                  background: "rgba(0,0,0,0.34)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                SGD 24.90/month
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: "24px",
                right: "24px",
                bottom: "24px",
                zIndex: 2,
                transform:
                  studentHovered || isMobile
                    ? "translateY(0)"
                    : "translateY(18px)",
                opacity: studentHovered || isMobile ? 1 : 0,
                transition: "opacity 240ms ease, transform 240ms ease",
              }}
            >
              <div
                style={{
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(4,16,38,0.78)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  padding: isMobile ? "20px" : "24px",
                  color: "white",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#7ee8ff",
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Student Access Includes
                </p>

                <h3
                  style={{
                    margin: "10px 0 0",
                    fontSize: isMobile ? "27px" : "34px",
                    lineHeight: 1.08,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Complete Missions for SGD 24.90/month.
                </h3>

                <p
                  style={{
                    margin: "12px 0 0",
                    color: "rgba(255,255,255,0.74)",
                    fontSize: isMobile ? "13px" : "14px",
                    lineHeight: 1.55,
                  }}
                >
                  Full Nova Student Access across English, Mathematics, and
                  Science, with Milo’s Business Builder included when it
                  launches.
                </p>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "18px 0 0",
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  {[
                    "Full English Learning Missions",
                    "Full Mathematics Learning Missions",
                    "Full Science Learning Missions",
                    "Topic quizzes and mixed assessments",
                    "Progress, Dream Token, and Dream Gem rewards",
                    "Milo’s Business Builder included when launched",
                  ].map((feature) => (
                    <li
                      key={feature}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "22px 1fr",
                        gap: "10px",
                        alignItems: "start",
                        color: "rgba(255,255,255,0.88)",
                        fontSize: "14px",
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: "#7ee8ff", fontWeight: 900 }}>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    marginTop: "20px",
                    height: "52px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.32)",
                    background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 14px 28px rgba(83,215,255,0.2)",
                  }}
                >
                  View Student Access Plans ›
                </div>
              </div>
            </div>

            {!studentHovered && !isMobile && (
              <div
                style={{
                  position: "absolute",
                  left: "24px",
                  right: "24px",
                  bottom: "24px",
                  zIndex: 2,
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(126,232,255,0.24)",
                  padding: "16px 18px",
                  color: "#061632",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#256d91",
                    fontSize: "12px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Student Access
                </p>

                <h3
                  style={{
                    margin: "6px 0 0",
                    fontSize: "24px",
                    lineHeight: 1.08,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                  }}
                >
                  SGD 24.90/month
                </h3>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "rgba(6,22,50,0.62)",
                    fontSize: "13px",
                    lineHeight: 1.45,
                  }}
                >
                  Complete English, Mathematics, and Science missions. Milo’s
                  Business Builder is included when launched.
                </p>
              </div>
            )}
          </article>
        </div>

        <p
          style={{
            margin: "22px 0 0",
            color: "rgba(255,255,255,0.66)",
            fontSize: "13px",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          View the pricing page for all monthly and annual options. Existing
          Guru Kids Pro students may have separate eligible access arrangements.
        </p>
      </div>
    </div>
  );
}

function GuidedWalkthrough({
  open,
  stepIndex,
  onStepChange,
  onClose,
}: {
  open: boolean;
  stepIndex: number;
  onStepChange: (nextStep: number) => void;
  onClose: () => void;
}) {
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const step = WALKTHROUGH_STEPS[stepIndex] ?? WALKTHROUGH_STEPS[0];
  const isFirstStep = stepIndex === 0;
  const isRewardsStep = stepIndex === 1;
  const isThinkStep = step.zoneNumber === "1";
  const isHomeStep = step.zoneNumber === "2";
  const isMissionsStep = step.zoneNumber === "3";
  const isKnowledgeStep = step.zoneNumber === "4";
  const isHangarStep = step.zoneNumber === "5";
  const isLastStep = stepIndex === WALKTHROUGH_STEPS.length - 1;
  const dockGuideAtTop =
    isMobile && (isMissionsStep || isKnowledgeStep || isHangarStep);
  const dockGuideAtRight = !isMobile && (isThinkStep || isHomeStep);
  const [typedLength, setTypedLength] = useState(0);

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
        style={{
          position: "fixed",
          left: isMobile ? "10px" : dockGuideAtRight ? "auto" : "30px",
          right: isMobile ? "10px" : dockGuideAtRight ? "30px" : "auto",
          top: dockGuideAtTop ? "10px" : "auto",
          bottom: isMobile ? (dockGuideAtTop ? "auto" : "10px") : "24px",
          zIndex: 100,
          width: isMobile ? "auto" : "min(570px, calc(100vw - 60px))",
          maxHeight: isMobile
            ? dockGuideAtTop
              ? "48dvh"
              : "62dvh"
            : "min(620px, calc(100dvh - 48px))",
          overflowY: "auto",
          borderRadius: isMobile ? "20px" : "28px",
          border: "1px solid rgba(142,232,255,0.42)",
          background:
            "radial-gradient(circle at 10% 0%, rgba(83,215,255,0.12), transparent 34%), linear-gradient(145deg, rgba(4,21,47,0.985), rgba(3,9,24,0.985))",
          boxShadow:
            "0 32px 90px rgba(0,0,0,0.68), 0 0 40px rgba(83,215,255,0.14)",
          color: "white",
          padding: isMobile ? "18px" : "26px 28px 24px 190px",
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

        <img
          src="/nova/nova-character.png"
          alt="Nova"
          style={{
            position: isMobile ? "relative" : "absolute",
            left: isMobile ? "auto" : "3px",
            bottom: isMobile ? "auto" : "-8px",
            height: isMobile ? (step.zoneNumber ? "76px" : "105px") : "250px",
            width: "auto",
            objectFit: "contain",
            display: "block",
            margin: isMobile ? "0 auto 8px" : 0,
            filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.52))",
            pointerEvents: "none",
          }}
        />

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
            margin: "9px 42px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "26px" : "35px",
            lineHeight: 1.08,
            fontWeight: 500,
          }}
        >
          {step.title}
        </h2>

        <p
          style={{
            margin: "14px 0 0",
            minHeight: isMobile ? "64px" : "72px",
            color: "rgba(255,255,255,0.78)",
            fontSize: isMobile ? "14px" : "16px",
            lineHeight: 1.58,
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
            marginTop: "18px",
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
                  Sure!
                </button>
              </>
            ) : isThinkStep ? (
              <>
                <button
                  type="button"
                  onClick={() => onStepChange(stepIndex + 1)}
                  style={secondaryStyle}
                >
                  Keep touring
                </button>
                <Link
                  href="/nova/thinking-skills-lab"
                  onClick={onClose}
                  style={actionStyle}
                >
                  Sure! Let’s play
                </Link>
              </>
            ) : isHomeStep ? (
              <>
                <button
                  type="button"
                  onClick={() => onStepChange(stepIndex + 1)}
                  style={secondaryStyle}
                >
                  Keep touring
                </button>
                <Link href="/inventor/hub" onClick={onClose} style={actionStyle}>
                  Visit Nova’s Home
                </Link>
              </>
            ) : isMissionsStep ? (
              <>
                <button
                  type="button"
                  onClick={() => onStepChange(stepIndex + 1)}
                  style={secondaryStyle}
                >
                  Keep touring
                </button>
                <Link
                  href="/learning-missions"
                  onClick={onClose}
                  style={actionStyle}
                >
                  Enter Missions Centre
                </Link>
              </>
            ) : isKnowledgeStep ? (
              <>
                <button
                  type="button"
                  onClick={() => onStepChange(stepIndex + 1)}
                  style={secondaryStyle}
                >
                  Keep touring
                </button>
                <Link
                  href="/learning-missions/knowledge-arena"
                  onClick={onClose}
                  style={actionStyle}
                >
                  Enter Knowledge Arena
                </Link>
              </>
            ) : isHangarStep ? (
              <>
                <button
                  type="button"
                  onClick={() => onStepChange(stepIndex + 1)}
                  style={secondaryStyle}
                >
                  Keep touring
                </button>
                <Link
                  href={ROVER_FROM_NOVA_HREF}
                  onClick={() => {
                    rememberNovaRoverOrigin();
                    onClose();
                  }}
                  style={actionStyle}
                >
                  Go to My Rover
                </Link>
              </>
            ) : isLastStep ? (
              <>
                <Link
                  href="/nova/thinking-skills-lab"
                  onClick={onClose}
                  style={secondaryStyle}
                >
                  Think Lab
                </Link>
                <Link
                  href="/inventor/hub"
                  onClick={onClose}
                  style={secondaryStyle}
                >
                  Nova’s Home
                </Link>
                <Link
                  href="/learning-missions"
                  onClick={onClose}
                  style={secondaryStyle}
                >
                  Missions Centre
                </Link>
                <Link
                  href="/learning-missions/knowledge-arena"
                  onClick={onClose}
                  style={secondaryStyle}
                >
                  Knowledge Arena
                </Link>
                <Link
                  href={ROVER_FROM_NOVA_HREF}
                  onClick={() => {
                    rememberNovaRoverOrigin();
                    onClose();
                  }}
                  style={actionStyle}
                >
                  Skyforge Hangar
                </Link>
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

