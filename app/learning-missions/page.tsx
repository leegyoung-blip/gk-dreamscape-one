"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

type UserMissionAccess = {
  userId: string | null;
  email: string | null;
  role: string | null;
  hasFullAccess: boolean;
};

type DreamTokenTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  created_at: string | null;
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

type WalkthroughStep = {
  eyebrow: string;
  title: string;
  text: string;
  zoneId?: string;
};

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const aspectRatio = width / Math.max(height, 1);

      // Only use the floating mission-map layout on genuinely wide screens.
      // Half-screen windows and ordinary laptop layouts use the vertical stack.
      const shouldUseFloatingLayout =
        width >= 1760 && !isPortrait && aspectRatio >= 1.65;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (shouldUseFloatingLayout) {
        setScreenMode("desktop");
      } else {
        setScreenMode("tablet");
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

type MissionZone = {
  id: string;
  title: string;
  description: string;
  position: CSSProperties;
  accent: string;
  requiresRoleAccess?: boolean;
  comingSoon?: boolean;
};

function normaliseRole(role: string | null) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function roleHasFullLearningAccess(role: string | null) {
  const cleanRole = normaliseRole(role);

  return (
    cleanRole === "admin" ||
    cleanRole === "student" ||
    cleanRole === "teacher"
  );
}

function getZoneHref(zoneId: string) {
  if (zoneId === "knowledge-arena") return "/learning-missions/knowledge-arena";
  if (zoneId === "core-missions") return "/learning-missions/core";
  if (zoneId === "think-missions") return "/learning-missions/think";
  if (zoneId === "express-missions") return "/learning-missions/express";
  if (zoneId === "progress-rewards") return "/learning-missions/progress-rewards";

  return null;
}

const missionZones: MissionZone[] = [
  {
    id: "knowledge-arena",
    title: "Knowledge Arena",
    description:
      "Enter fast topic challenges through the central launch hatch, earn points, and collect Dreamscape Tokens.",
    accent: "#53d7ff",
    requiresRoleAccess: false,
    position: {
      left: "31%",
      top: "39%",
      width: "42%",
      height: "40%",
    },
  },
  {
    id: "core-missions",
    title: "Core Missions",
    description:
      "Complete English and Math missions to prepare and upgrade Nova’s Skyforge Rover.",
    accent: "#7ecbff",
    requiresRoleAccess: true,
    position: {
      left: "35%",
      top: "5%",
      width: "35%",
      height: "32%",
    },
  },
  {
    id: "think-missions",
    title: "Think Missions",
    description:
      "Train reasoning, logic, pattern spotting and HAP-style thinking in Nova’s strategy and gear area.",
    accent: "#60f0d0",
    requiresRoleAccess: true,
    position: {
      right: "1%",
      top: "5%",
      width: "28%",
      height: "43%",
    },
  },
  {
    id: "express-missions",
    title: "Express Missions",
    description: "LOCKED — Coming soon.",
    accent: "#ff9df0",
    requiresRoleAccess: true,
    comingSoon: true,
    position: {
      right: "1%",
      top: "50%",
      width: "32%",
      height: "47%",
    },
  },
  {
    id: "progress-rewards",
    title: "Progress & Rewards",
    description:
      "Review completed missions, score records, unlocked upgrades and Dreamscape Token rewards.",
    accent: "#8dfcff",
    requiresRoleAccess: true,
    position: {
      left: "1%",
      top: "50%",
      width: "29%",
      height: "47%",
    },
  },
];

const WALKTHROUGH_STORAGE_KEY = "learning-missions-walkthrough-completed-v1";

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    eyebrow: "Welcome",
    title: "Let me show you around the Mission Centre.",
    text:
      "This is where you choose different challenges, prepare Nova’s equipment, earn Dreamscape Tokens, and review your progress. I’ll show you what each zone is for.",
  },
  {
    eyebrow: "Stop 1 of 5",
    title: "Warm up in the Knowledge Arena.",
    text:
      "Enter quick topic challenges, test what you know, earn points, and collect Dreamscape Tokens. This zone is available to everyone.",
    zoneId: "knowledge-arena",
  },
  {
    eyebrow: "Stop 2 of 5",
    title: "Build strong foundations in Core Missions.",
    text:
      "Complete English and Math missions to prepare and upgrade Nova’s Skyforge Rover. Student, teacher, or admin access is required.",
    zoneId: "core-missions",
  },
  {
    eyebrow: "Stop 3 of 5",
    title: "Train your reasoning in Think Missions.",
    text:
      "Practise logic, patterns, strategy, and HAP-style thinking while unlocking gear for Nova’s challenges.",
    zoneId: "think-missions",
  },
  {
    eyebrow: "Stop 4 of 5",
    title: "Express Missions are being prepared.",
    text:
      "This creative learning zone is currently locked and coming soon. It will appear here when it is ready.",
    zoneId: "express-missions",
  },
  {
    eyebrow: "Stop 5 of 5",
    title: "Track everything in Progress & Rewards.",
    text:
      "Review completed missions, best scores, unlocked upgrades, and the Dreamscape Tokens you have earned.",
    zoneId: "progress-rewards",
  },
  {
    eyebrow: "You’re ready",
    title: "Choose your first mission.",
    text:
      "Start with the Knowledge Arena or enter an unlocked mission zone. You can restart this walkthrough anytime using the Mission Guide button at the top.",
  },
];

export default function LearningMissionsPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const [hoveredZone, setHoveredZone] = useState<MissionZone | null>(null);
  const [profileAssets, setProfileAssets] = useState<ProfileAssetBreakdown>({
    cash: 0,
    property: 0,
    stocks: 0,
  });
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [profileAssetsLoading, setProfileAssetsLoading] = useState(true);
  const [lockedZoneMessage, setLockedZoneMessage] = useState("");
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  const [userMissionAccess, setUserMissionAccess] =
    useState<UserMissionAccess>({
      userId: null,
      email: null,
      role: null,
      hasFullAccess: false,
    });

  useEffect(() => {
    let isMounted = true;

    async function loadUserAndAssets() {
      if (isMounted) setProfileAssetsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setUserMissionAccess({
          userId: null,
          email: null,
          role: null,
          hasFullAccess: false,
        });
        setProfileAssets({ cash: 0, property: 0, stocks: 0 });
        setTokenTransactions([]);
        setProfileAssetsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError) {
        console.warn("Could not load user profile role:", profileError.message);
      }

      const role = profile?.role || null;
      setUserMissionAccess({
        userId: user.id,
        email: user.email ?? null,
        role,
        hasFullAccess: roleHasFullLearningAccess(role),
      });

      const [
        balanceResult,
        recentTransactionsResult,
        stocksResult,
        stockHoldingsResult,
        propertiesResult,
        propertyHoldingsResult,
      ] = await Promise.all([
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

      const cashValue = balanceResult.error
        ? 0
        : balanceResult.data?.reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0,
          ) || 0;

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

      if (balanceResult.error) {
        console.warn("Could not load Dreamscape Tokens:", balanceResult.error);
      }
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
    }

    loadUserAndAssets();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAndAssets();
    });

    window.addEventListener("focus", loadUserAndAssets);
    window.addEventListener("dream-tokens-updated", loadUserAndAssets);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", loadUserAndAssets);
      window.removeEventListener("dream-tokens-updated", loadUserAndAssets);
    };
  }, []);

  useEffect(() => {
    try {
      const completed = window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
      if (!completed) {
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

    const zoneId = WALKTHROUGH_STEPS[walkthroughStep]?.zoneId;
    if (!zoneId || screenMode === "desktop") return;

    const timeout = window.setTimeout(() => {
      document.getElementById(`mission-zone-${zoneId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [screenMode, walkthroughOpen, walkthroughStep]);

  function isZoneUnlocked(zone: MissionZone) {
    if (zone.comingSoon) return false;
    if (!zone.requiresRoleAccess) return true;

    return userMissionAccess.hasFullAccess;
  }

  function isZoneLocked(zone: MissionZone) {
    return Boolean(zone.requiresRoleAccess && !isZoneUnlocked(zone));
  }

  function getLockedMessage(zone: MissionZone) {
    if (zone.comingSoon) {
      return `${zone.title} is LOCKED and coming soon.`;
    }

    if (!userMissionAccess.userId) {
      return "Please log in to access this mission zone.";
    }

    return `${zone.title} is only available to student, teacher, or admin accounts.`;
  }

  function getZoneClick(zone: MissionZone) {
    const href = getZoneHref(zone.id);

    if (zone.comingSoon) {
      return () => {
        setLockedZoneMessage(getLockedMessage(zone));
      };
    }

    if (!href) return undefined;

    return () => {
      if (isZoneLocked(zone)) {
        setLockedZoneMessage(getLockedMessage(zone));
        return;
      }

      window.location.href = href;
    };
  }


  const activeWalkthroughZoneId =
    WALKTHROUGH_STEPS[walkthroughStep]?.zoneId ?? null;

  function startWalkthrough() {
    setLockedZoneMessage("");
    setHoveredZone(null);
    setWalkthroughStep(0);
    setWalkthroughOpen(true);
  }

  function closeWalkthrough() {
    try {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
    } catch {
      // The guide still closes when browser storage is unavailable.
    }

    setWalkthroughOpen(false);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        background:
          "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.18), transparent 38%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "hidden",
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          pointerEvents: "none",
        }}
      >
        <source
          src="/nova/learning-missions/learning-missions-bg-loop.mp4"
          type="video/mp4"
        />
      </video>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: isDesktop
            ? "linear-gradient(180deg, rgba(2,8,19,0.12), rgba(2,8,19,0.34))"
            : "linear-gradient(180deg, rgba(2,8,19,0.34), rgba(2,8,19,0.88))",
          pointerEvents: "none",
        }}
      />

      <FloatingMissionControls
        userEmail={userMissionAccess.email}
        profileAssets={profileAssets}
        tokenTransactions={tokenTransactions}
        profileAssetsLoading={profileAssetsLoading}
        screenMode={screenMode}
        onStartWalkthrough={startWalkthrough}
      />

      {isDesktop ? (
        <section
          style={{
            position: "relative",
            zIndex: activeWalkthroughZoneId ? 85 : 2,
            minHeight: "100dvh",
            width: "100%",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "4vw",
              top: "12%",
              zIndex: 20,
              width: "min(500px, 27vw)",
              textAlign: "left",
              pointerEvents: "none",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8dfcff",
                fontSize: "13px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 800,
                textShadow: "0 0 16px rgba(83,215,255,0.42)",
              }}
            >
              Nova’s Mission Centre
            </p>

            <h1
              style={{
                margin: "12px 0 0",
                fontSize: "64px",
                lineHeight: 0.95,
                fontWeight: 600,
                letterSpacing: "-0.055em",
                textShadow: "0 0 32px rgba(83,215,255,0.3)",
              }}
            >
              Learning Missions
            </h1>

            <p
              style={{
                margin: "18px 0 0",
                maxWidth: "470px",
                color: "rgba(229,250,255,0.82)",
                fontSize: "18px",
                lineHeight: 1.55,
                fontWeight: 300,
              }}
            >
              Choose one of five mission zones to train skills, prepare Nova’s gear and
              earn Dreamscape Tokens.
            </p>

            {lockedZoneMessage && (
              <div
                style={{
                  marginTop: "18px",
                  maxWidth: "560px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,215,106,0.36)",
                  background: "rgba(255,215,106,0.1)",
                  color: "#ffd76a",
                  padding: "14px 16px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  pointerEvents: "auto",
                }}
              >
                {lockedZoneMessage}
              </div>
            )}
          </div>

          {missionZones.map((zone) => (
            <MissionHotspot
              key={zone.id}
              zone={zone}
              isLocked={isZoneLocked(zone)}
              isWalkthroughActive={Boolean(activeWalkthroughZoneId)}
              isHighlighted={activeWalkthroughZoneId === zone.id}
              onEnter={() => setHoveredZone(zone)}
              onLeave={() => setHoveredZone(null)}
              onClick={getZoneClick(zone)}
            />
          ))}

          {hoveredZone && (
            <ZoneHoverPopup
              zone={hoveredZone}
              isLocked={isZoneLocked(hoveredZone)}
            />
          )}

          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "28px",
              transform: "translateX(-50%)",
              zIndex: 30,
              padding: "12px 18px",
              borderRadius: "999px",
              border: "1px solid rgba(141,252,255,0.26)",
              background: "rgba(2,8,19,0.52)",
              backdropFilter: "blur(14px)",
              color: "rgba(255,255,255,0.72)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
            }}
          >
            Hover over a zone, then click to enter
          </div>
        </section>
      ) : (
        <section
          style={{
            position: "relative",
            zIndex: activeWalkthroughZoneId ? 85 : 2,
            minHeight: "100dvh",
            width: "100%",
            padding: isMobile ? "126px 16px 34px" : "128px 32px 46px",
          }}
        >
          <div
            style={{
              width: "min(980px, 100%)",
              margin: "0 auto",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8dfcff",
                fontSize: "12px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Nova’s Mission Centre
            </p>

            <h1
              style={{
                margin: "10px 0 0",
                fontSize: isMobile ? "42px" : "58px",
                lineHeight: 0.96,
                fontWeight: 600,
                letterSpacing: "-0.055em",
                textShadow: "0 0 30px rgba(83,215,255,0.24)",
              }}
            >
              Learning Missions
            </h1>

            <p
              style={{
                margin: "16px 0 0",
                maxWidth: "680px",
                color: "rgba(229,250,255,0.82)",
                fontSize: isMobile ? "16px" : "19px",
                lineHeight: 1.55,
                fontWeight: 300,
              }}
            >
              Choose one of five mission zones to train skills, prepare Nova’s gear and
              earn Dreamscape Tokens.
            </p>

            {lockedZoneMessage && (
              <div
                style={{
                  marginTop: "18px",
                  maxWidth: "680px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,215,106,0.36)",
                  background: "rgba(255,215,106,0.1)",
                  color: "#ffd76a",
                  padding: "14px 16px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                {lockedZoneMessage}
              </div>
            )}

            <div
              style={{
                marginTop: "28px",
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "18px",
              }}
            >
              {missionZones.map((zone) => (
                <MissionCard
                  key={zone.id}
                  zone={zone}
                  isLocked={isZoneLocked(zone)}
                  isWalkthroughActive={Boolean(activeWalkthroughZoneId)}
                  isHighlighted={activeWalkthroughZoneId === zone.id}
                  onClick={getZoneClick(zone)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <MissionGuidedWalkthrough
        open={walkthroughOpen}
        stepIndex={walkthroughStep}
        onStepChange={setWalkthroughStep}
        onClose={closeWalkthrough}
      />
    </main>
  );
}

function FloatingMissionControls({
  userEmail,
  profileAssets,
  tokenTransactions,
  profileAssetsLoading,
  screenMode,
  onStartWalkthrough,
}: {
  userEmail: string | null;
  profileAssets: ProfileAssetBreakdown;
  tokenTransactions: DreamTokenTransaction[];
  profileAssetsLoading: boolean;
  screenMode: ScreenMode;
  onStartWalkthrough: () => void;
}) {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const [profileAssetsOpen, setProfileAssetsOpen] = useState(false);
  const profileAssetsTotal =
    profileAssets.cash + profileAssets.property + profileAssets.stocks;

  useEffect(() => {
    if (!profileAssetsOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileAssetsOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [profileAssetsOpen]);

  const guideButton = (
    <button
      type="button"
      onClick={onStartWalkthrough}
      style={{
        ...controlButtonStyle,
        height: isMobile ? "40px" : "46px",
        padding: isMobile ? "0 12px" : "0 18px",
        border: "1px solid rgba(83,215,255,0.58)",
        background: "rgba(20,84,118,0.72)",
        fontSize: isMobile ? "11px" : "14px",
        letterSpacing: isMobile ? "0.06em" : "0.1em",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span aria-hidden="true">✦</span>
      {isMobile ? "Guide" : "Mission Guide"}
    </button>
  );

  return (
    <>
      {profileAssetsOpen && (
        <button
          type="button"
          aria-label="Close profile assets"
          onClick={() => setProfileAssetsOpen(false)}
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
        href="/inventor"
        style={{
          position: "fixed",
          top: isMobile ? "12px" : "22px",
          left: isMobile ? "12px" : "22px",
          zIndex: 70,
          height: isMobile ? "40px" : "46px",
          padding: isMobile ? "0 14px" : "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(126,232,255,0.55)",
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
          boxShadow: "0 16px 36px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: isMobile ? "15px" : "18px" }}>←</span>
        {isMobile ? "Back" : "Exit Mission Centre"}
      </Link>

      {isMobile && (
        <div
          style={{
            position: "fixed",
            top: "12px",
            right: "12px",
            zIndex: 70,
          }}
        >
          {guideButton}
        </div>
      )}

      <div
        style={{
          position: "fixed",
          top: isMobile ? "60px" : "22px",
          right: isMobile ? "12px" : "22px",
          left: isMobile ? "12px" : "auto",
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-end",
          gap: isMobile ? "8px" : "12px",
        }}
      >
        {!isMobile && guideButton}

        <Link
          href={userEmail ? "/profile" : "/login"}
          style={{
            ...controlButtonStyle,
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 12px" : "0 20px",
            fontSize: isMobile ? "10px" : "14px",
            letterSpacing: isMobile ? "0.06em" : "0.1em",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail ? (isMobile ? "Account" : "My Account") : "Log In"}
        </Link>

        <Link
          href="/cart"
          aria-label="Cart"
          style={{
            ...controlButtonStyle,
            width: isMobile ? "40px" : "46px",
            height: isMobile ? "40px" : "46px",
            padding: 0,
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          🛒
        </Link>

        <div style={{ position: "relative", zIndex: 82 }}>
          <button
            type="button"
            onClick={() => setProfileAssetsOpen((current) => !current)}
            aria-expanded={profileAssetsOpen}
            aria-haspopup="menu"
            style={{
              height: isMobile ? "40px" : "46px",
              padding: isMobile ? "0 9px" : "0 18px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.6)",
              background:
                "linear-gradient(145deg, rgba(2,14,28,0.72), rgba(2,8,19,0.8))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "6px" : "10px",
              fontSize: isMobile ? "10px" : "14px",
              letterSpacing: isMobile ? "0.02em" : "0.08em",
              textTransform: "uppercase",
              boxShadow: profileAssetsOpen
                ? "0 16px 38px rgba(0,0,0,0.34), 0 0 30px rgba(83,215,255,0.28)"
                : "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(83,215,255,0.18)",
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
                  "radial-gradient(circle, rgba(83,215,255,0.42), rgba(2,8,19,0.82))",
                border: "1px solid rgba(83,215,255,0.65)",
                color: "#bdf6ff",
                fontSize: "12px",
                boxShadow: "0 0 14px rgba(83,215,255,0.35)",
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
                position: isMobile ? "fixed" : "absolute",
                top: isMobile ? "108px" : "calc(100% + 10px)",
                right: isMobile ? "12px" : 0,
                width: isMobile ? "min(360px, calc(100vw - 24px))" : "380px",
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
      </div>
    </>
  );
}

function MissionHotspot({
  zone,
  isLocked,
  isWalkthroughActive,
  isHighlighted,
  onEnter,
  onLeave,
  onClick,
}: {
  zone: MissionZone;
  isLocked: boolean;
  isWalkthroughActive: boolean;
  isHighlighted: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: "absolute",
        zIndex: isHighlighted ? 92 : 25,
        ...zone.position,
        border: isHighlighted
          ? `2px solid ${zone.accent}`
          : "1px solid transparent",
        background: isHighlighted ? `${zone.accent}22` : "transparent",
        boxShadow: isHighlighted
          ? `0 0 0 8px ${zone.accent}18, 0 0 40px ${zone.accent}88`
          : "none",
        borderRadius: "28px",
        cursor: onClick ? "pointer" : "default",
        outline: "none",
        opacity: isWalkthroughActive && !isHighlighted ? 0.12 : 1,
        pointerEvents: isWalkthroughActive && !isHighlighted ? "none" : "auto",
        transition: "opacity 220ms ease, border 220ms ease, background 220ms ease, box-shadow 220ms ease",
      }}
      aria-label={isLocked ? `${zone.title} locked` : zone.title}
    />
  );
}

function MissionCard({
  zone,
  isLocked,
  isWalkthroughActive,
  isHighlighted,
  onClick,
}: {
  zone: MissionZone;
  isLocked: boolean;
  isWalkthroughActive: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      id={`mission-zone-${zone.id}`}
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        minHeight: "170px",
        borderRadius: "22px",
        border: isHighlighted
          ? `2px solid ${zone.accent}`
          : `1px solid ${zone.accent}88`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.10), rgba(3,13,34,0.10))",
        backdropFilter: "blur(15px)",
        WebkitBackdropFilter: "blur(15px)",
        boxShadow: isHighlighted
          ? `0 0 0 7px ${zone.accent}18, 0 0 34px ${zone.accent}88, 0 18px 42px rgba(0,0,0,0.28)`
          : `0 0 24px ${zone.accent}2b, 0 18px 42px rgba(0,0,0,0.28)`,
        padding: "22px",
        color: "white",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        opacity:
          isWalkthroughActive && !isHighlighted
            ? 0.14
            : isLocked
              ? 0.58
              : onClick
                ? 1
                : 0.66,
        filter: isLocked && !isHighlighted ? "saturate(0.45)" : "none",
        transform: isHighlighted ? "translateY(-4px)" : "none",
        transition:
          "opacity 220ms ease, border 220ms ease, box-shadow 220ms ease, transform 220ms ease",
      }}
    >
      <p
        style={{
          margin: 0,
          color: isLocked ? "#ffd76a" : zone.accent,
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {zone.comingSoon
          ? "Locked · Coming Soon"
          : isLocked
          ? "Locked Zone"
          : "Learning Zone"}
      </p>

      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "24px",
          lineHeight: 1.18,
          fontWeight: 700,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {zone.description}
      </p>

      <div
        style={{
          marginTop: "18px",
          color: isLocked
            ? "#ffd76a"
            : onClick
            ? zone.accent
            : "rgba(255,255,255,0.45)",
          fontSize: "14px",
          fontWeight: 700,
        }}
      >
        {zone.comingSoon
          ? "LOCKED · Coming Soon"
          : isLocked
          ? "Locked"
          : onClick
          ? "Enter Mission ›"
          : "Coming Soon"}
      </div>
    </button>
  );
}

function ZoneHoverPopup({
  zone,
  isLocked,
}: {
  zone: MissionZone;
  isLocked: boolean;
}) {
  const popupPosition = getPopupPosition(zone.id);

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 60,
        ...popupPosition,
        width: "330px",
        borderRadius: "20px",
        border: `1px solid ${isLocked ? "#ffd76a" : zone.accent}aa`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.88), rgba(3,13,34,0.92))",
        backdropFilter: "blur(18px)",
        boxShadow: `0 0 28px ${
          isLocked ? "#ffd76a55" : `${zone.accent}55`
        }, 0 24px 60px rgba(0,0,0,0.45)`,
        padding: "22px 24px",
        pointerEvents: "none",
        color: "white",
      }}
    >
      <p
        style={{
          margin: 0,
          color: isLocked ? "#ffd76a" : zone.accent,
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {zone.comingSoon
          ? "Locked · Coming Soon"
          : isLocked
          ? "Locked Zone"
          : "Learning Zone"}
      </p>

      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "25px",
          lineHeight: 1.18,
          fontWeight: 700,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: "14px",
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {zone.description}
      </p>

      {isLocked && (
        <p
          style={{
            margin: "14px 0 0",
            color: "#ffd76a",
            fontSize: "13px",
            lineHeight: 1.45,
            fontWeight: 700,
          }}
        >
          {zone.comingSoon
            ? "This mission zone is LOCKED and will be released in a future update."
            : "This zone is only available to student, teacher, or admin accounts."}
        </p>
      )}

      <div
        style={{
          marginTop: "18px",
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${
            isLocked ? "#ffd76a" : zone.accent
          }, transparent)`,
        }}
      />
    </div>
  );
}

function getPopupPosition(zoneId: string): CSSProperties {
  switch (zoneId) {
    case "knowledge-arena":
      return {
        left: "53%",
        bottom: "20%",
        transform: "translateX(-50%)",
      };

    case "core-missions":
      return {
        left: "50%",
        top: "7%",
        transform: "translateX(-50%)",
      };

    case "think-missions":
      return {
        right: "3%",
        top: "13%",
      };

    case "express-missions":
      return {
        right: "3%",
        bottom: "9%",
      };

    case "progress-rewards":
      return {
        left: "3%",
        bottom: "9%",
      };

    default:
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
  }
}

function MissionGuidedWalkthrough({
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
  const isLastStep = stepIndex === WALKTHROUGH_STEPS.length - 1;
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
    }, 14);

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

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(0,3,12,0.76)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Learning Missions guided walkthrough"
        style={{
          position: "fixed",
          left: isMobile ? "12px" : "36px",
          right: isMobile ? "12px" : "auto",
          bottom: isMobile ? "12px" : "26px",
          zIndex: 100,
          width: isMobile ? "auto" : "min(520px, calc(100vw - 72px))",
          maxHeight: isMobile ? "62dvh" : "none",
          overflowY: isMobile ? "auto" : "visible",
          borderRadius: isMobile ? "20px" : "26px",
          border: "1px solid rgba(142,232,255,0.42)",
          background:
            "linear-gradient(145deg, rgba(4,21,47,0.98), rgba(3,9,24,0.98))",
          boxShadow:
            "0 32px 90px rgba(0,0,0,0.68), 0 0 40px rgba(83,215,255,0.14)",
          color: "white",
          padding: isMobile ? "20px" : "26px 28px 24px 190px",
        }}
      >
        <button
          type="button"
          aria-label="Close walkthrough"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
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
            left: isMobile ? "auto" : "4px",
            bottom: isMobile ? "auto" : "-8px",
            height: isMobile ? "108px" : "245px",
            width: "auto",
            objectFit: "contain",
            display: "block",
            margin: isMobile ? "0 auto 10px" : 0,
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
            minHeight: isMobile ? "72px" : "78px",
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
            aria-label={`Walkthrough step ${stepIndex + 1} of ${WALKTHROUGH_STEPS.length}`}
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

          <div style={{ display: "flex", gap: "9px" }}>
            {!isFirstStep && (
              <button
                type="button"
                onClick={() => onStepChange(stepIndex - 1)}
                style={{
                  minHeight: "42px",
                  padding: "0 16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 750,
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                isLastStep ? onClose() : onStepChange(stepIndex + 1)
              }
              style={{
                minHeight: "42px",
                padding: "0 18px",
                borderRadius: "12px",
                border: "1px solid rgba(83,215,255,0.42)",
                background: "rgba(83,215,255,0.16)",
                color: "white",
                cursor: "pointer",
                fontWeight: 850,
              }}
            >
              {isLastStep ? "Start Exploring" : isFirstStep ? "Show Me" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const controlButtonStyle: CSSProperties = {
  height: "46px",
  padding: "0 22px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.48)",
  background: "rgba(2,8,19,0.58)",
  backdropFilter: "blur(16px)",
  color: "white",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
};