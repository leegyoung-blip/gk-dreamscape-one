"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import MasteryCodeQuickPlay from "@/components/milo/activity-lab/MasteryCodeQuickPlay";
import MasteryCodeSurvival from "@/components/milo/activity-lab/MasteryCodeSurvival";
import CargoRush from "@/components/milo/activity-lab/CargoRush";
import MilosMixAndServe from "@/components/milo/activity-lab/MilosMixAndServe";
import ActivityLabBatteryMeter from "@/components/milo/activity-lab/ActivityLabBatteryMeter";
import ActivityLabTopUpModal from "@/components/milo/activity-lab/ActivityLabTopUpModal";
import { useActivityLabBattery } from "@/hooks/useActivityLabBattery";

type ActivityMode = "mastery" | "cargo" | "merge";
type MasteryMode = "quick" | "survival";


type ActivityMenuProps = {
  activeMode: ActivityMode;
  drawer: boolean;
  dense: boolean;
  collapsed?: boolean;
  onSelectMode: (mode: ActivityMode) => void;
  onNavigate?: () => void;
};

const ACTIVITY_ITEMS: Array<{
  id: ActivityMode;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  comingSoon?: boolean;
}> = [
  {
    id: "mastery",
    eyebrow: "Word Challenge",
    title: "Mastery Code",
    description: "Logic, patterns and strategy.",
    icon: "⌨",
  },
  {
    id: "cargo",
    eyebrow: "New Activity",
    title: "Cargo Rush",
    description: "Logistics, sorting and supply chains.",
    icon: "▣",
  },
  {
    id: "merge",
    eyebrow: "New Activity",
    title: "Milo’s Mix & Serve",
    description: "Kitchen operations, timing and waste control.",
    icon: "◇",
  },
];

function ActivityMenu({
  activeMode,
  drawer,
  dense,
  collapsed = false,
  onSelectMode,
  onNavigate,
}: ActivityMenuProps) {
  return (
    <div
      data-lab-guide-target="games-area"
      style={{
        height: drawer ? "auto" : "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: dense ? "8px" : "10px",
      }}
    >
      {!drawer && !collapsed && (
        <div
          style={{
            padding: dense ? "12px 12px 8px" : "16px 14px 10px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Choose a game
          </p>
          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,0.56)",
              fontSize: dense ? "10px" : "11px",
              lineHeight: 1.45,
            }}
          >
            Play activities, build skills and earn Dream Tokens.
          </p>
        </div>
      )}

      {ACTIVITY_ITEMS.map((item) => {
        const selected = activeMode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            data-lab-guide-target={item.id}
            title={collapsed ? item.title : undefined}
            aria-label={collapsed ? item.title : undefined}
            onClick={() => {
              onSelectMode(item.id);
              onNavigate?.();
            }}
            style={{
              width: "100%",
              minHeight: collapsed ? "58px" : drawer ? "86px" : dense ? "78px" : "92px",
              padding: collapsed
                ? "7px"
                : drawer
                  ? "13px 14px"
                  : dense
                    ? "10px 11px"
                    : "13px",
              borderRadius: drawer ? "18px" : "20px",
              border: selected
                ? "1px solid rgba(126,232,255,0.56)"
                : "1px solid rgba(126,232,255,0.12)",
              background: selected
                ? "linear-gradient(135deg, rgba(31,153,198,0.22), rgba(88,69,177,0.16))"
                : "rgba(255,255,255,0.025)",
              boxShadow: selected
                ? "0 14px 34px rgba(0,0,0,0.18), inset 0 0 26px rgba(83,215,255,0.045)"
                : "none",
              color: "white",
              textAlign: "left",
              cursor: "pointer",
              display: "grid",
              gridTemplateColumns: collapsed ? "1fr" : "42px minmax(0, 1fr)",
              alignItems: "center",
              justifyItems: collapsed ? "center" : undefined,
              gap: collapsed ? 0 : "11px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: collapsed ? "46px" : "42px",
                height: collapsed ? "46px" : "42px",
                borderRadius: "14px",
                border: selected
                  ? "1px solid rgba(142,232,255,0.38)"
                  : "1px solid rgba(255,255,255,0.09)",
                background: selected
                  ? "rgba(83,215,255,0.12)"
                  : "rgba(255,255,255,0.045)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: selected ? "#8ee8ff" : "rgba(255,255,255,0.72)",
                fontSize: "20px",
                fontWeight: 900,
              }}
            >
              {item.icon}
            </span>

            {!collapsed && <span style={{ minWidth: 0, display: "block" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    color: selected ? "#a7efff" : "rgba(255,255,255,0.52)",
                    fontSize: "8px",
                    fontWeight: 900,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.eyebrow}
                </span>

                {item.comingSoon && (
                  <span
                    style={{
                      flex: "0 0 auto",
                      padding: "3px 6px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,214,112,0.2)",
                      background: "rgba(255,192,72,0.07)",
                      color: "#ffd978",
                      fontSize: "7px",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Soon
                  </span>
                )}
              </span>

              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  fontSize: drawer ? "17px" : dense ? "14px" : "16px",
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                {item.title}
              </span>

              {!dense && (
                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "rgba(255,255,255,0.48)",
                    fontSize: "9px",
                    lineHeight: 1.35,
                  }}
                >
                  {item.description}
                </span>
              )}
            </span>}
          </button>
        );
      })}
    </div>
  );
}

function ComingSoonPanel({
  mode,
  mobile,
}: {
  mode: Exclude<ActivityMode, "mastery">;
  mobile: boolean;
}) {
  const isCargo = mode === "cargo";

  return (
    <div
      style={{
        minHeight: mobile ? "420px" : "100%",
        height: mobile ? "auto" : "100%",
        display: "grid",
        placeItems: "center",
        padding: mobile ? "24px 14px" : "32px",
      }}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          padding: mobile ? "28px 20px" : "44px 48px",
          borderRadius: mobile ? "22px" : "30px",
          border: "1px solid rgba(126,232,255,0.16)",
          background:
            "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.1), transparent 42%), linear-gradient(145deg, rgba(8,31,56,0.76), rgba(5,11,28,0.92))",
          boxShadow: "0 30px 80px rgba(0,0,0,0.24)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: mobile ? "72px" : "88px",
            height: mobile ? "72px" : "88px",
            margin: "0 auto",
            borderRadius: mobile ? "22px" : "26px",
            border: "1px solid rgba(142,232,255,0.25)",
            background: "rgba(83,215,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8ee8ff",
            fontSize: mobile ? "34px" : "42px",
            fontWeight: 900,
          }}
        >
          {isCargo ? "▣" : "◇"}
        </div>

        <p
          style={{
            margin: "22px 0 0",
            color: "#8ee8ff",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Activity Lab · Coming Soon
        </p>

        <h2
          style={{
            margin: "8px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: mobile ? "32px" : "44px",
            lineHeight: 1,
            fontWeight: 400,
          }}
        >
          {isCargo ? "Cargo Rush" : "Milo Merge"}
        </h2>

        <p
          style={{
            maxWidth: "500px",
            margin: "16px auto 0",
            color: "rgba(255,255,255,0.56)",
            fontSize: mobile ? "12px" : "13px",
            lineHeight: 1.65,
          }}
        >
          The Activity Lab slot is ready, but the game itself has not been built yet.
          This keeps the new navigation structure in place without adding gameplay early.
        </p>
      </div>
    </div>
  );
}

type LabGuideStep = {
  target?: "games-area" | ActivityMode;
  eyebrow: string;
  title: string;
  body: string;
};

const ACTIVITY_LAB_GUIDE_KEY = "milo-activity-lab-guide-v1";
const ACTIVITY_LAB_GUIDE_STEPS: LabGuideStep[] = [
  {
    eyebrow: "Milo’s Big Dream",
    title: "Why I built the Activity Lab",
    body: "I’ve got a ridiculous dream: becoming a gazillionaire. But I can’t get there by only learning about money. I need to think better, understand how different industries work and keep building useful skills. This is where I train.",
  },
  {
    target: "games-area",
    eyebrow: "Training Rooms",
    title: "Pick a skill to train",
    body: "Each game trains a different part of how businesses and industries work. You can jump between them from the games area whenever you want.",
  },
  {
    target: "mastery",
    eyebrow: "Thinking Skills",
    title: "Mastery Code",
    body: "Crack word codes to train logic, pattern recognition and strategy — the same kind of thinking I need when I’m solving problems and making decisions.",
  },
  {
    target: "cargo",
    eyebrow: "Logistics Skills",
    title: "Cargo Rush",
    body: "Sort moving cargo quickly and accurately while learning how logistics, warehousing and supply chains keep businesses moving.",
  },
  {
    target: "merge",
    eyebrow: "Industry Skills",
    title: "Milo’s Mix & Serve",
    body: "Run a busy kitchen to practise planning, preparation, timing, customer service and waste control. It’s my way of learning how a food business works from the inside.",
  },
];

function useViewport() {
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return viewport;
}

export default function ActivityLabPage() {
  const { width, height } = useViewport();
  const mobile = width <= 760;
  const wide = width >= 1320;
  const compact = width < 1180;
  const dense = height < 790;
  const needsVerticalScroll = mobile || compact || height < 960;

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ActivityMode>("mastery");
  const fixedGame = activeMode === "cargo" || activeMode === "merge";
  const [masteryMode, setMasteryMode] = useState<MasteryMode>("quick");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [dreamTokens, setDreamTokens] = useState(0);
  const [batteryPanelOpen, setBatteryPanelOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [masteryRunActive, setMasteryRunActive] = useState(false);
  const [labGuideOpen, setLabGuideOpen] = useState(false);
  const [labGuideStep, setLabGuideStep] = useState(0);
  const [labGuideSpotlight, setLabGuideSpotlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [labGuidePanel, setLabGuidePanel] = useState<{ top: number; left: number; width: number }>({ top: 18, left: 18, width: 380 });
  const guidePanelRef = useRef<HTMLDivElement | null>(null);

  const battery = useActivityLabBattery({ userId, unlimited: isAdmin });
  const batteryReadyForNewRun = !userId || isAdmin || (
    battery.status !== "loading" &&
    battery.status !== "error" &&
    !battery.isChargingRun &&
    battery.canStartRun
  );

  function openBatteryGate() {
    setBatteryPanelOpen(true);
  }

  const consumeActivityRun = useCallback(async (gameKey: string) => {
    if (!userId || isAdmin) return true;
    const result = await battery.consumeRun(gameKey);
    if (!result?.accepted) {
      setBatteryPanelOpen(true);
      return false;
    }
    return true;
  }, [battery, isAdmin, userId]);

  async function startMasteryBatteryRun() {
    if (!batteryReadyForNewRun) {
      setBatteryPanelOpen(true);
      return;
    }
    const accepted = await consumeActivityRun("mastery_code");
    if (accepted) setMasteryRunActive(true);
  }

  useEffect(() => {
    if (activeMode !== "mastery") setMasteryRunActive(false);
  }, [activeMode]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const play = params.get("play");

    // Backwards compatibility with the old ?mode=survival URL.
    if (mode === "survival") {
      setActiveMode("mastery");
      setMasteryMode("survival");
      return;
    }

    if (mode === "cargo" || mode === "merge" || mode === "mastery") {
      setActiveMode(mode);
    }

    if (play === "survival" || play === "quick") {
      setMasteryMode(play);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const creditStatus = params.get("credits");
    if (creditStatus === "success") {
      setBatteryPanelOpen(false);
      setTopUpOpen(true);
    }
  }, []);

  async function refreshTokenBalance(activeUserId: string) {
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", activeUserId)
      .eq("token_kind", "virtual");

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error.message);
      return;
    }

    const total = data?.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;
    setDreamTokens(total);
  }

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setIsAdmin(false);
        setUserId("");
        setUserEmail("");
        setDreamTokens(0);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        console.warn("Could not load Activity Lab account role:", profileError.message);
      }

      const role = String(profile?.role || "")
        .trim()
        .toLowerCase()
        .replace(/_/g, "-");

      setIsAdmin(role === "admin");
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      setDreamTokens(0);

      await refreshTokenBalance(user.id);
    }

    loadAccount();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAccount();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function addTokenTransaction(amount: number, description: string) {
    if (!userId) return false;

    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: userId,
      amount,
      token_kind: "virtual",
      type: amount < 0 ? "spend" : "earn",
      title: description,
    });

    if (error) {
      console.warn("Token transaction failed:", error.message);
      return false;
    }

    await refreshTokenBalance(userId);
    window.dispatchEvent(new Event("dream-tokens-updated"));
    return true;
  }

  function syncUrl(nextMode: ActivityMode, nextMasteryMode: MasteryMode = masteryMode) {
    let next = "/milo-world/activity-lab";

    if (nextMode === "mastery" && nextMasteryMode === "survival") {
      next += "?mode=mastery&play=survival";
    } else if (nextMode !== "mastery") {
      next += `?mode=${nextMode}`;
    }

    window.history.replaceState({}, "", next);
  }

  function selectMode(mode: ActivityMode) {
    if (mode !== "mastery") setMasteryRunActive(false);
    setActiveMode(mode);
    setMenuOpen(false);
    syncUrl(mode);
  }

  function selectMasteryMode(mode: MasteryMode) {
    setMasteryMode(mode);
    syncUrl("mastery", mode);
  }

  function closeLabGuide() {
    setLabGuideOpen(false);
    setLabGuideSpotlight(null);
    if (mobile) setMenuOpen(false);
    try {
      window.localStorage.setItem(ACTIVITY_LAB_GUIDE_KEY, "1");
    } catch {
      // Local persistence is optional.
    }
  }

  function openLabGuide() {
    setLabGuideStep(0);
    setLabGuideOpen(true);
  }

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ACTIVITY_LAB_GUIDE_KEY)) {
        const timer = window.setTimeout(() => setLabGuideOpen(true), 450);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // The guide can still be opened manually.
    }
  }, []);

  useEffect(() => {
    if (!labGuideOpen) {
      setLabGuideSpotlight(null);
      return;
    }

    const step = ACTIVITY_LAB_GUIDE_STEPS[labGuideStep];
    if (mobile && step.target) setMenuOpen(true);

    const positionGuide = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = Math.min(mobile ? 336 : 390, viewportWidth - 24);
      const panelHeight = Math.min(guidePanelRef.current?.getBoundingClientRect().height || 260, viewportHeight - 24);
      const target = step.target
        ? document.querySelector(`[data-lab-guide-target="${step.target}"]`) as HTMLElement | null
        : null;

      if (!target) {
        setLabGuideSpotlight(null);
        setLabGuidePanel({
          width: panelWidth,
          left: Math.max(12, (viewportWidth - panelWidth) / 2),
          top: Math.max(12, (viewportHeight - panelHeight) / 2),
        });
        return;
      }

      const rect = target.getBoundingClientRect();
      const pad = 7;
      const spotlight = {
        top: Math.max(4, rect.top - pad),
        left: Math.max(4, rect.left - pad),
        width: Math.max(20, Math.min(viewportWidth - Math.max(4, rect.left - pad) - 4, rect.width + pad * 2)),
        height: Math.max(20, Math.min(viewportHeight - Math.max(4, rect.top - pad) - 4, rect.height + pad * 2)),
      };
      setLabGuideSpotlight(spotlight);

      const gap = 14;
      let left = rect.right + gap;
      let top = rect.top + rect.height / 2 - panelHeight / 2;

      if (mobile || left + panelWidth > viewportWidth - 12) {
        left = Math.max(12, Math.min(viewportWidth - panelWidth - 12, rect.left + rect.width / 2 - panelWidth / 2));
        if (rect.bottom + gap + panelHeight <= viewportHeight - 12) top = rect.bottom + gap;
        else if (rect.top - gap - panelHeight >= 12) top = rect.top - gap - panelHeight;
        else top = viewportHeight - panelHeight - 12;
      }

      setLabGuidePanel({
        width: panelWidth,
        left: Math.max(12, Math.min(viewportWidth - panelWidth - 12, left)),
        top: Math.max(12, Math.min(viewportHeight - panelHeight - 12, top)),
      });
    };

    const first = window.requestAnimationFrame(() => {
      positionGuide();
      window.requestAnimationFrame(positionGuide);
    });
    window.addEventListener("resize", positionGuide);
    return () => {
      window.cancelAnimationFrame(first);
      window.removeEventListener("resize", positionGuide);
    };
  }, [labGuideOpen, labGuideStep, mobile, menuOpen]);

  const navButtonStyle: CSSProperties = {
    minHeight: mobile ? "36px" : "40px",
    padding: mobile ? "0 11px" : "0 17px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.2)",
    background: "rgba(4,14,31,0.72)",
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: mobile ? "10px" : "12px",
    fontWeight: 850,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    whiteSpace: "nowrap",
  };

  const masteryToggleStyle = (selected: boolean): CSSProperties => ({
    minHeight: mobile ? "38px" : "42px",
    padding: mobile ? "0 14px" : "0 18px",
    borderRadius: "999px",
    border: selected
      ? "1px solid rgba(126,232,255,0.5)"
      : "1px solid rgba(126,232,255,0.12)",
    background: selected
      ? "linear-gradient(135deg, rgba(37,159,204,0.24), rgba(97,75,186,0.18))"
      : "rgba(255,255,255,0.035)",
    color: selected ? "#b8f3ff" : "rgba(255,255,255,0.58)",
    fontSize: mobile ? "10px" : "11px",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 52% 18%, rgba(30,116,156,0.17), transparent 32%), radial-gradient(circle at 86% 72%, rgba(106,62,181,0.14), transparent 30%), linear-gradient(145deg, #020713, #030b1c 50%, #020611)",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: "grid",
        gridTemplateRows: mobile
          ? dense
            ? "52px minmax(0, 1fr)"
            : "58px minmax(0, 1fr)"
          : dense
            ? "58px minmax(0, 1fr)"
            : "68px minmax(0, 1fr)",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button, a { -webkit-tap-highlight-color: transparent; }
        .activity-lab-scroll { scrollbar-width: thin; scrollbar-color: rgba(83,215,255,0.32) rgba(255,255,255,0.04); }
        .activity-lab-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .activity-lab-scroll::-webkit-scrollbar-thumb { background: rgba(83,215,255,0.3); border-radius: 999px; }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.22,
          backgroundImage:
            "linear-gradient(rgba(126,232,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(126,232,255,0.06) 1px, transparent 1px)",
          backgroundSize: mobile ? "32px 32px" : "46px 46px",
        }}
      />

      <header
        style={{
          position: "relative",
          zIndex: 30,
          minWidth: 0,
          borderBottom: "1px solid rgba(126,232,255,0.11)",
          background: "rgba(2,8,21,0.68)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: mobile ? "8px 9px" : "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: mobile ? "7px" : "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {mobile && (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open Activity Lab game menu"
              style={{
                ...navButtonStyle,
                width: "38px",
                padding: 0,
                fontSize: "17px",
                cursor: "pointer",
              }}
            >
              ☰
            </button>
          )}

          <Link href="/milo-world" style={navButtonStyle}>
            <span>←</span>
            {mobile ? "Milo" : "Milo’s World"}
          </Link>

          <button
            type="button"
            onClick={openLabGuide}
            style={{ ...navButtonStyle, cursor: "pointer", border: "1px solid rgba(255,211,104,.24)", color: "#ffe09b" }}
          >
            <span>✦</span>
            {mobile ? "Guide" : "Milo Guide"}
          </button>
        </div>

        {!mobile && (
          <div style={{ minWidth: 0, textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Milo’s Token-Earning Games
            </p>
            <h1
              style={{
                margin: "3px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: dense ? "23px" : "27px",
                lineHeight: 1,
                fontWeight: 400,
              }}
            >
              Activity Lab
            </h1>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ActivityLabBatteryMeter
            mobile={mobile}
            userId={userId}
            open={batteryPanelOpen}
            onOpen={() => setBatteryPanelOpen(true)}
            onClose={() => setBatteryPanelOpen(false)}
            onAddBolts={() => { setBatteryPanelOpen(false); setTopUpOpen(true); }}
            batteryBolts={battery.batteryBolts}
            bonusBolts={battery.bonusBolts}
            totalBolts={battery.totalBolts}
            capacityBolts={battery.capacityBolts}
            percentage={battery.percentage}
            status={battery.status}
            error={battery.error}
            state={battery.state}
            nextRechargeInSeconds={battery.nextRechargeInSeconds}
            fullRechargeInSeconds={battery.fullRechargeInSeconds}
          />

          <Link
            href={userId ? "/profile" : "/login"}
            style={{ ...navButtonStyle, border: "1px solid rgba(126,232,255,0.3)" }}
          >
            <span style={{ color: "#8ee8ff" }}>✦</span>
            {userId ? `${dreamTokens} DT` : "Guest · 0 DT"}
          </Link>

          <Link href={userEmail ? "/profile" : "/login"} style={navButtonStyle}>
            {mobile
              ? userEmail
                ? "Account"
                : "Login"
              : userEmail
                ? "My Account"
                : "Log In"}
          </Link>
        </div>
      </header>

      <section
        className="activity-lab-scroll"
        style={{
          position: "relative",
          zIndex: 4,
          minWidth: 0,
          minHeight: 0,
          padding: fixedGame
            ? mobile
              ? "4px"
              : dense
                ? "7px"
                : "9px"
            : mobile
              ? dense
                ? "6px"
                : "8px"
              : dense
                ? "10px"
                : "14px",
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : "72px minmax(0, 1fr)",
          gap: fixedGame ? "8px" : dense ? "10px" : "12px",
          overflowX: "hidden",
          overflowY: fixedGame ? "hidden" : needsVerticalScroll ? "auto" : "hidden",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          paddingBottom: fixedGame ? undefined : needsVerticalScroll ? "18px" : undefined,
        }}
      >
        {!mobile && (
          <aside style={{ minWidth: 0, minHeight: 0 }}>
            <ActivityMenu
              activeMode={activeMode}
              drawer={false}
              dense={dense}
              collapsed
              onSelectMode={selectMode}
            />
          </aside>
        )}

        <article
          style={{
            position: "relative",
            minWidth: 0,
            minHeight: 0,
            height: fixedGame ? "100%" : needsVerticalScroll ? "max-content" : "100%",
            overflow: fixedGame ? "hidden" : needsVerticalScroll ? "visible" : "hidden",
            borderRadius: mobile ? "17px" : "24px",
            border: "1px solid rgba(126,232,255,0.17)",
            background:
              "linear-gradient(145deg, rgba(5,22,43,0.88), rgba(3,9,24,0.95))",
            boxShadow:
              "0 30px 90px rgba(0,0,0,0.35), inset 0 0 50px rgba(83,215,255,0.025)",
            padding: fixedGame
              ? mobile
                ? "4px"
                : dense
                  ? "7px"
                  : "9px"
              : mobile
                ? "6px"
                : dense
                  ? "14px"
                  : "18px",
          }}
        >
          {activeMode === "mastery" ? (
            <div
              style={{
                minWidth: 0,
                minHeight: 0,
                height: needsVerticalScroll ? "auto" : "100%",
                display: "grid",
                gridTemplateRows: "auto minmax(0, 1fr)",
                gap: mobile ? "7px" : "10px",
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  alignItems: mobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  flexDirection: mobile ? "column" : "row",
                  gap: mobile ? "7px" : "12px",
                  padding: mobile ? "5px 4px 2px" : "3px 2px 2px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#8ee8ff",
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    Mastery Code
                  </p>
                  {!mobile && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "rgba(255,255,255,0.44)",
                        fontSize: "10px",
                      }}
                    >
                      Choose how you want to play.
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    overflowX: "auto",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => selectMasteryMode("quick")}
                    style={masteryToggleStyle(masteryMode === "quick")}
                  >
                    Quick Play
                  </button>
                  <button
                    type="button"
                    onClick={() => selectMasteryMode("survival")}
                    style={masteryToggleStyle(masteryMode === "survival")}
                  >
                    Survival
                  </button>
                  {userId && masteryRunActive && (
                    <button
                      type="button"
                      onClick={() => setMasteryRunActive(false)}
                      style={{ ...masteryToggleStyle(false), border: "1px solid rgba(255,214,111,.22)", color: "#ffd66f" }}
                    >
                      End Run
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  minWidth: 0,
                  minHeight: 0,
                  overflow: needsVerticalScroll ? "visible" : "hidden",
                }}
              >
                {!masteryRunActive ? (
                  <div style={{ height: "100%", minHeight: 320, display: "grid", placeItems: "center", padding: mobile ? 10 : 16 }}>
                    <div style={{ width: "min(780px,100%)", maxHeight: "100%", overflowY: "auto", borderRadius: 22, border: "1px solid rgba(126,232,255,.18)", background: "linear-gradient(145deg,rgba(8,27,46,.94),rgba(4,13,27,.97))", padding: mobile ? 16 : 22 }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ margin: 0, color: "#8ee8ff", fontSize: 9, fontWeight: 950, letterSpacing: ".15em" }}>MASTERY CODE</p>
                        <h3 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 29 : 38, fontWeight: 400 }}>Train your thinking</h3>
                        <p style={{ margin: "9px auto 0", maxWidth: 560, color: "rgba(255,255,255,.64)", fontSize: mobile ? 11 : 12.5, lineHeight: 1.5 }}>
                          Crack codes to practise logic, pattern recognition and strategy.
                        </p>
                      </div>

                      <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", textAlign: "center" }}>
                        <span style={{ color: "rgba(255,255,255,.48)", fontSize: 10.5 }}>
                          {!userId
                            ? "Guest preview · log in to earn Dream Tokens."
                            : isAdmin
                              ? "Admin access is unlimited."
                              : `This run costs ${battery.runCostBolts} Bolts.`}
                        </span>
                      </div>

                      <button type="button" onClick={startMasteryBatteryRun} style={{ width: "100%", minHeight: 46, marginTop: 12, padding: "0 22px", borderRadius: 13, border: "1px solid rgba(126,232,255,.3)", background: batteryReadyForNewRun ? "linear-gradient(135deg,#71e1ff,#56c9e8)" : "rgba(255,255,255,.05)", color: batteryReadyForNewRun ? "#03101a" : "rgba(255,255,255,.42)", fontSize: 11, fontWeight: 950, cursor: "pointer" }}>
                        {batteryReadyForNewRun
                          ? !userId
                            ? "Start Mastery Code"
                            : isAdmin
                              ? "Start Mastery Run · Unlimited"
                              : `Start Mastery Run · ${battery.runCostBolts} Bolts`
                          : "Need More Bolts"}
                      </button>
                    </div>
                  </div>
                ) : masteryMode === "quick" ? (
                  <MasteryCodeQuickPlay
                    userId={userId}
                    dreamTokens={dreamTokens}
                    mobile={mobile}
                    wide={wide}
                    compact={compact}
                    dense={dense}
                    width={width}
                    onTokenTransaction={addTokenTransaction}
                  />
                ) : (
                  <MasteryCodeSurvival
                    userId={userId}
                    mobile={mobile}
                    wide={wide}
                    dense={dense}
                    width={width}
                    height={height}
                    onTokenTransaction={addTokenTransaction}
                  />
                )}
              </div>
            </div>
          ) : activeMode === "cargo" ? (
            <CargoRush
              userId={userId}
              mobile={mobile}
              dense={dense}
              width={width}
              height={height}
              onTokenTransaction={addTokenTransaction}
              batteryCanStart={batteryReadyForNewRun}
              onBatteryBlocked={openBatteryGate}
              onBatteryRunStart={() => consumeActivityRun("cargo_rush")}
            />
          ) : (
            <MilosMixAndServe
              userId={userId}
              mobile={mobile}
              dense={dense}
              width={width}
              height={height}
              onTokenTransaction={addTokenTransaction}
              batteryCanStart={batteryReadyForNewRun}
              batteryUnlimited={isAdmin}
              onBatteryBlocked={openBatteryGate}
              onBatteryRunStart={() => consumeActivityRun("mix_and_serve")}
            />
          )}
        </article>
      </section>

      <ActivityLabTopUpModal
        mobile={mobile}
        userId={userId}
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onBatteryRefresh={battery.refresh}
      />

      {mobile && menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.58)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
          }}
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="activity-lab-scroll"
            style={{
              width: "min(340px, calc(100vw - 38px))",
              height: "100dvh",
              overflowY: "auto",
              borderRight: "1px solid rgba(126,232,255,0.22)",
              background:
                "linear-gradient(160deg, rgba(4,18,38,0.99), rgba(2,8,21,0.99))",
              boxShadow: "28px 0 80px rgba(0,0,0,0.54)",
              padding: "16px",
              display: "grid",
              gridTemplateRows: "auto auto auto",
              gap: "18px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Choose a game
                </p>
                <h2
                  style={{
                    margin: "5px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "30px",
                    fontWeight: 400,
                  }}
                >
                  Activity Lab
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close Activity Lab menu"
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "999px",
                  border: "1px solid rgba(126,232,255,0.2)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontSize: "23px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ minHeight: 0 }}>
              <ActivityMenu
                activeMode={activeMode}
                drawer
                dense={false}
                onSelectMode={selectMode}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>

            <Link
              href="/milo-world"
              onClick={() => setMenuOpen(false)}
              style={{
                minHeight: "48px",
                borderRadius: "14px",
                border: "1px solid rgba(126,232,255,0.18)",
                background: "rgba(83,215,255,0.06)",
                color: "white",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 850,
              }}
            >
              ← Return to Milo’s World
            </Link>
          </aside>
        </div>
      )}

      {labGuideOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 240, pointerEvents: "none" }}>
          {labGuideSpotlight ? (
            <div
              style={{
                position: "fixed",
                top: labGuideSpotlight.top,
                left: labGuideSpotlight.left,
                width: labGuideSpotlight.width,
                height: labGuideSpotlight.height,
                borderRadius: 16,
                border: "2px solid rgba(255,211,104,.82)",
                boxShadow: "0 0 0 9999px rgba(0,4,12,.74), 0 0 34px rgba(255,211,104,.28)",
                pointerEvents: "none",
              }}
            />
          ) : (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,4,12,.74)" }} />
          )}

          <div
            ref={guidePanelRef}
            style={{
              position: "fixed",
              top: labGuidePanel.top,
              left: labGuidePanel.left,
              width: labGuidePanel.width,
              maxHeight: "calc(100dvh - 24px)",
              overflowY: "auto",
              pointerEvents: "auto",
              borderRadius: 22,
              border: "1px solid rgba(255,211,104,.3)",
              background: "linear-gradient(155deg,rgba(18,28,42,.98),rgba(5,12,24,.99))",
              boxShadow: "0 28px 90px rgba(0,0,0,.58)",
              padding: mobile ? 16 : 19,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(126,232,255,.24)", background: "rgba(83,215,255,.06)" }}>
                <img src="/milo-world/milo-character.png" alt="Milo" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 16%" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: "#ffd98a", fontSize: 9, fontWeight: 950, letterSpacing: ".13em" }}>{ACTIVITY_LAB_GUIDE_STEPS[labGuideStep].eyebrow.toUpperCase()}</p>
                <h3 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 23 : 27, fontWeight: 400 }}>{ACTIVITY_LAB_GUIDE_STEPS[labGuideStep].title}</h3>
              </div>
            </div>

            <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,.7)", fontSize: mobile ? 11.5 : 12.5, lineHeight: 1.55 }}>
              {ACTIVITY_LAB_GUIDE_STEPS[labGuideStep].body}
            </p>

            <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: `repeat(${ACTIVITY_LAB_GUIDE_STEPS.length},minmax(0,1fr))`, gap: 4 }}>
              {ACTIVITY_LAB_GUIDE_STEPS.map((_, index) => (
                <span key={index} style={{ height: 5, borderRadius: 999, background: index <= labGuideStep ? "#ffd16a" : "rgba(255,255,255,.09)" }} />
              ))}
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 7 }}>
              <button
                type="button"
                disabled={labGuideStep === 0}
                onClick={() => setLabGuideStep((value) => Math.max(0, value - 1))}
                style={{ minHeight: 40, padding: "0 13px", borderRadius: 11, border: "1px solid rgba(126,232,255,.15)", background: "rgba(83,215,255,.04)", color: labGuideStep === 0 ? "rgba(255,255,255,.24)" : "white", fontWeight: 900, cursor: labGuideStep === 0 ? "default" : "pointer" }}
              >Back</button>
              <button type="button" onClick={closeLabGuide} style={{ minHeight: 40, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.035)", color: "rgba(255,255,255,.62)", fontWeight: 900, cursor: "pointer" }}>Skip Guide</button>
              {labGuideStep < ACTIVITY_LAB_GUIDE_STEPS.length - 1 ? (
                <button type="button" onClick={() => setLabGuideStep((value) => Math.min(ACTIVITY_LAB_GUIDE_STEPS.length - 1, value + 1))} style={{ minHeight: 40, padding: "0 15px", borderRadius: 11, border: "1px solid rgba(255,211,104,.35)", background: "rgba(255,190,65,.09)", color: "#ffd98a", fontWeight: 950, cursor: "pointer" }}>Next</button>
              ) : (
                <button type="button" onClick={closeLabGuide} style={{ minHeight: 40, padding: "0 15px", borderRadius: 11, border: "1px solid rgba(126,232,255,.3)", background: "linear-gradient(135deg,#71e1ff,#56c9e8)", color: "#03101a", fontWeight: 950, cursor: "pointer" }}>Start Training</button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
