"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import ActivityMenu, {
  type ActivityMode,
} from "@/components/milo/activity-lab/ActivityMenu";
import MasteryCodeQuickPlay from "@/components/milo/activity-lab/MasteryCodeQuickPlay";
import MasteryCodeSurvival from "@/components/milo/activity-lab/MasteryCodeSurvival";

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
  const [activeMode, setActiveMode] = useState<ActivityMode>("quick");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [dreamTokens, setDreamTokens] = useState(0);

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
    if (mode === "survival") setActiveMode("survival");
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

  function selectMode(mode: ActivityMode) {
    setActiveMode(mode);
    setMenuOpen(false);
    const next = mode === "survival"
      ? "/milo-world/activity-lab?mode=survival"
      : "/milo-world/activity-lab";
    window.history.replaceState({}, "", next);
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
        @keyframes labGlow {
          0%, 100% { opacity: 0.34; transform: translate3d(0, 0, 0); }
          50% { opacity: 0.52; transform: translate3d(0, -8px, 0); }
        }
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
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Milo’s Token-Earning Games
            </p>
            <h1 style={{ margin: "3px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: dense ? "23px" : "27px", lineHeight: 1, fontWeight: 400 }}>
              Activity Lab
            </h1>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Link href={userId ? "/profile" : "/login"} style={{ ...navButtonStyle, border: "1px solid rgba(126,232,255,0.3)" }}>
            <span style={{ color: "#8ee8ff" }}>✦</span>
            {userId ? `${dreamTokens} DT` : "Guest · 0 DT"}
          </Link>

          <Link href={userEmail ? "/profile" : "/login"} style={navButtonStyle}>
            {mobile ? (userEmail ? "Account" : "Login") : userEmail ? "My Account" : "Log In"}
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
          padding: mobile ? (dense ? "6px" : "8px") : dense ? "10px" : "14px",
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : wide
              ? "260px minmax(0, 1fr)"
              : "220px minmax(0, 1fr)",
          gap: dense ? "10px" : "14px",
          overflowX: "hidden",
          overflowY: needsVerticalScroll ? "auto" : "hidden",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          paddingBottom: needsVerticalScroll ? "18px" : undefined,
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
            minWidth: 0,
            minHeight: 0,
            height: needsVerticalScroll ? "max-content" : "100%",
            overflow: needsVerticalScroll ? "visible" : "hidden",
            borderRadius: mobile ? "17px" : "24px",
            border: "1px solid rgba(126,232,255,0.17)",
            background:
              "linear-gradient(145deg, rgba(5,22,43,0.88), rgba(3,9,24,0.95))",
            boxShadow:
              "0 30px 90px rgba(0,0,0,0.35), inset 0 0 50px rgba(83,215,255,0.025)",
            padding: mobile ? "6px" : dense ? "14px" : "18px",
          }}
        >
          {activeMode === "quick" ? (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div>
                <p style={{ margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  Choose a game
                </p>
                <h2 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "30px", fontWeight: 400 }}>
                  Activity Lab
                </h2>
              </div>

              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close Activity Lab menu" style={{ width: "42px", height: "42px", borderRadius: "999px", border: "1px solid rgba(126,232,255,0.2)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: "23px", cursor: "pointer" }}>
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

            <Link href="/milo-world" onClick={() => setMenuOpen(false)} style={{ minHeight: "48px", borderRadius: "14px", border: "1px solid rgba(126,232,255,0.18)", background: "rgba(83,215,255,0.06)", color: "white", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 850 }}>
              ← Return to Milo’s World
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
