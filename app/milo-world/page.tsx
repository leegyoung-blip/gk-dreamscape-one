"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import MasteryCodeQuickPlay from "@/components/milo/activity-lab/MasteryCodeQuickPlay";
import MasteryCodeSurvival from "@/components/milo/activity-lab/MasteryCodeSurvival";
import CargoRush from "@/components/milo/activity-lab/CargoRush";
import MilosMixAndServe from "@/components/milo/activity-lab/MilosMixAndServe";
import ActivityLabBatteryMeter from "@/components/milo/activity-lab/ActivityLabBatteryMeter";
import { useActivityLabBattery } from "@/hooks/useActivityLabBattery";

type ActivityMode = "mastery" | "cargo" | "merge";
type MasteryMode = "quick" | "survival";

const BATTERY_MINIMUM_START_SECONDS = 60;

type ActivityMenuProps = {
  activeMode: ActivityMode;
  drawer: boolean;
  dense: boolean;
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
    description: "Quick Play and Survival now live together in one game tab.",
    icon: "⌨",
  },
  {
    id: "cargo",
    eyebrow: "New Activity",
    title: "Cargo Rush",
    description: "Sort incoming cargo across Milo’s futuristic logistics network.",
    icon: "▣",
  },
  {
    id: "merge",
    eyebrow: "New Activity",
    title: "Milo’s Mix & Serve",
    description: "Progress through Burger Basics and Salad Shift, complete timed orders and earn DT after each stage.",
    icon: "◇",
  },
];

function ActivityMenu({
  activeMode,
  drawer,
  dense,
  onSelectMode,
  onNavigate,
}: ActivityMenuProps) {
  return (
    <div
      style={{
        height: drawer ? "auto" : "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: dense ? "8px" : "10px",
      }}
    >
      {!drawer && (
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
            onClick={() => {
              onSelectMode(item.id);
              onNavigate?.();
            }}
            style={{
              width: "100%",
              minHeight: drawer ? "86px" : dense ? "78px" : "92px",
              padding: drawer
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
              gridTemplateColumns: "42px minmax(0, 1fr)",
              alignItems: "center",
              gap: "11px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "42px",
                height: "42px",
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

            <span style={{ minWidth: 0, display: "block" }}>
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
            </span>
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
  const [dreamTokens, setDreamTokens] = useState(0);
  const [batteryPanelOpen, setBatteryPanelOpen] = useState(false);
  const [activeBatteryGame, setActiveBatteryGame] = useState<string | null>(null);
  const [masterySessionActive, setMasterySessionActive] = useState(false);
  const [batteryDepletedDuringRun, setBatteryDepletedDuringRun] = useState(false);

  const batteryGameKey = activeBatteryGame ?? (masterySessionActive ? "mastery_code" : undefined);
  const battery = useActivityLabBattery({
    userId,
    gameKey: batteryGameKey,
    shouldDrain: Boolean(userId && batteryGameKey),
    onDepleted: () => {
      setBatteryDepletedDuringRun(true);
      setBatteryPanelOpen(true);
    },
  });

  const batteryBusyElsewhere = Boolean(
    userId && battery.state?.isDraining && !battery.ownsDrainSession,
  );
  const batteryReadyForNewRun = !userId || (
    battery.status !== "loading" &&
    battery.status !== "error" &&
    !batteryBusyElsewhere &&
    battery.remainingSeconds >= BATTERY_MINIMUM_START_SECONDS
  );

  const setGameplayState = useCallback((gameKey: string, active: boolean) => {
    setActiveBatteryGame((current) => {
      if (active) return gameKey;
      return current === gameKey ? null : current;
    });
    if (active) setBatteryDepletedDuringRun(false);
  }, []);

  const handleCargoGameplay = useCallback(
    (active: boolean) => setGameplayState("cargo_rush", active),
    [setGameplayState],
  );
  const handleMixServeGameplay = useCallback(
    (active: boolean) => setGameplayState("mix_and_serve", active),
    [setGameplayState],
  );

  function openBatteryGate() {
    setBatteryPanelOpen(true);
  }

  function startMasteryBatterySession() {
    if (!batteryReadyForNewRun) {
      setBatteryPanelOpen(true);
      return;
    }
    setBatteryDepletedDuringRun(false);
    setMasterySessionActive(true);
  }

  useEffect(() => {
    if (activeMode !== "mastery") setMasterySessionActive(false);
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
      setUserId(user?.id ?? "");
      setUserEmail(user?.email ?? "");
      setDreamTokens(0);

      if (user) await refreshTokenBalance(user.id);
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
    if (mode !== "mastery") setMasterySessionActive(false);
    setActiveMode(mode);
    setMenuOpen(false);
    syncUrl(mode);
  }

  function selectMasteryMode(mode: MasteryMode) {
    setMasteryMode(mode);
    syncUrl("mastery", mode);
  }

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
            remainingSeconds={battery.remainingSeconds}
            capacitySeconds={battery.capacitySeconds}
            percentage={battery.percentage}
            status={battery.status}
            error={battery.error}
            state={battery.state}
            isDraining={battery.isDraining}
            ownsDrainSession={battery.ownsDrainSession}
            activeGameplay={Boolean(activeBatteryGame || masterySessionActive)}
            minimumStartSeconds={BATTERY_MINIMUM_START_SECONDS}
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
            : wide
              ? "260px minmax(0, 1fr)"
              : "220px minmax(0, 1fr)",
          gap: dense ? "10px" : "14px",
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
          {userId && batteryDepletedDuringRun && (activeBatteryGame || masterySessionActive) && (
            <div style={{ position: "absolute", top: 9, right: 9, zIndex: 45, maxWidth: mobile ? "calc(100% - 18px)" : 360, borderRadius: 12, border: "1px solid rgba(255,113,135,.25)", background: "rgba(40,9,18,.94)", boxShadow: "0 12px 34px rgba(0,0,0,.3)", padding: "8px 11px", color: "#ffdce2", fontSize: 9, lineHeight: 1.4 }}>
              <strong style={{ color: "#ff9ca7" }}>Battery empty.</strong> Finish the current run; recharge begins when gameplay stops.
            </div>
          )}
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
                  {userId && masterySessionActive && (
                    <button
                      type="button"
                      onClick={() => setMasterySessionActive(false)}
                      style={{ ...masteryToggleStyle(false), border: "1px solid rgba(255,214,111,.22)", color: "#ffd66f" }}
                    >
                      End Session
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
                {userId && !masterySessionActive ? (
                  <div style={{ height: "100%", minHeight: 320, display: "grid", placeItems: "center", padding: 16 }}>
                    <div style={{ width: "min(620px,100%)", borderRadius: 22, border: "1px solid rgba(126,232,255,.18)", background: "linear-gradient(145deg,rgba(8,27,46,.88),rgba(4,13,27,.94))", padding: mobile ? 18 : 24, textAlign: "center" }}>
                      <div style={{ width: 58, height: 58, margin: "0 auto", borderRadius: 18, display: "grid", placeItems: "center", border: "1px solid rgba(126,232,255,.22)", background: "rgba(83,215,255,.06)", color: "#8ee8ff", fontSize: 24 }}>⚡</div>
                      <p style={{ margin: "14px 0 0", color: "#8ee8ff", fontSize: 9, fontWeight: 950, letterSpacing: ".14em" }}>ACTIVITY BATTERY</p>
                      <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 28 : 36, fontWeight: 400 }}>Start a Mastery Code session</h3>
                      <p style={{ margin: "9px auto 0", maxWidth: 490, color: "rgba(255,255,255,.48)", fontSize: 11, lineHeight: 1.55 }}>
                        Battery drains while the Mastery Code session is open. Use End Session when you are finished so recharge can begin immediately.
                      </p>
                      <button type="button" onClick={startMasteryBatterySession} style={{ minHeight: 44, marginTop: 16, padding: "0 22px", borderRadius: 13, border: "1px solid rgba(126,232,255,.3)", background: batteryReadyForNewRun ? "linear-gradient(135deg,#71e1ff,#56c9e8)" : "rgba(255,255,255,.05)", color: batteryReadyForNewRun ? "#03101a" : "rgba(255,255,255,.42)", fontSize: 11, fontWeight: 950, cursor: "pointer" }}>
                        {batteryReadyForNewRun ? "Start Mastery Session" : "Battery Recharging"}
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
              batteryCanStart={!userId || activeBatteryGame === "cargo_rush" || batteryReadyForNewRun}
              onBatteryBlocked={openBatteryGate}
              onGameplayActivityChange={handleCargoGameplay}
            />
          ) : (
            <MilosMixAndServe
              userId={userId}
              mobile={mobile}
              dense={dense}
              width={width}
              height={height}
              onTokenTransaction={addTokenTransaction}
              batteryCanStart={!userId || activeBatteryGame === "mix_and_serve" || batteryReadyForNewRun}
              onBatteryBlocked={openBatteryGate}
              onGameplayActivityChange={handleMixServeGameplay}
            />
          )}
        </article>
      </section>

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
    </main>
  );
}
