"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

type GameMode = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
};

const gameModes: GameMode[] = [
  {
    id: "word",
    title: "Word Reasoning",
    subtitle: "Vocabulary, clues, meanings, and word logic puzzles.",
    image: "/nova/thinking-skills/word-reasoning.png",
  },
  {
    id: "spatial",
    title: "Spatial Puzzles",
    subtitle: "Shape, rotation, pattern, and visual thinking puzzles.",
    image: "/nova/thinking-skills/spatial-puzzles.png",
  },
  {
    id: "logic",
    title: "Logic Patterns",
    subtitle: "Number, sequence, rule, and reasoning challenges.",
    image: "/nova/thinking-skills/logic-patterns.png",
  },
];

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180) {
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

export default function ThinkingSkillsLabPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const [tokenBalance, setTokenBalance] = useState(0);

  useEffect(() => {
    loadTokens();

    function handleTokenUpdate() {
      loadTokens();
    }

    window.addEventListener("dream-tokens-updated", handleTokenUpdate);

    return () => {
      window.removeEventListener("dream-tokens-updated", handleTokenUpdate);
    };
  }, []);

  async function loadTokens() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTokenBalance(0);
      return;
    }

    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("token_kind", "virtual");

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error);
      setTokenBalance(0);
      return;
    }

    const total = data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
    setTokenBalance(total);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        backgroundImage: `
          linear-gradient(180deg, rgba(2,8,19,0.62), rgba(2,8,19,0.92)),
          radial-gradient(circle at 50% 0%, rgba(126,232,255,0.18), transparent 38%),
          url("/nova/thinking-skills/thinking-skills-lab-bg.png")
        `,
        backgroundColor: "#020813",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
      }}
    >
      <Link
        href="/inventor"
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
        ← Nova’s World
      </Link>

      <section
        style={{
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: isMobile ? "92px 0 34px" : "104px 0 56px",
        }}
      >
        <header style={{ textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              color: "#7ee8ff",
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Nova’s World
          </p>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "38px" : "64px",
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: "-0.055em",
              textShadow: "0 0 30px rgba(126, 221, 255, 0.28)",
            }}
          >
            Thinking Skills Lab
          </h1>

          <p
            style={{
              margin: "14px auto 0",
              maxWidth: "720px",
              fontSize: isMobile ? "16px" : "20px",
              color: "#c9f9ff",
              lineHeight: 1.55,
              fontWeight: 300,
            }}
          >
            Choose a Thinking Skills mode below. These activities are being
            prepared and will open soon.
          </p>

          <div
            style={{
              margin: "22px auto 0",
              width: "fit-content",
              borderRadius: "999px",
              border: "1px solid rgba(126,232,255,0.4)",
              padding: "10px 16px",
              color: "#7ee8ff",
              fontSize: "14px",
              background: "rgba(2,8,19,0.45)",
              backdropFilter: "blur(12px)",
            }}
          >
            Dreamscape Tokens: {tokenBalance}
          </div>
        </header>

        <section
          style={{
            marginTop: isMobile ? "24px" : "34px",
            borderRadius: isMobile ? "24px" : "32px",
            border: "1px solid rgba(126,232,255,0.22)",
            background:
              "linear-gradient(145deg, rgba(5,18,42,0.82), rgba(8,26,58,0.92))",
            boxShadow:
              "0 0 34px rgba(83,215,255,0.14), 0 28px 80px rgba(0,0,0,0.36)",
            padding: isMobile ? "20px" : "30px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isDesktop
                ? "repeat(3, minmax(0, 1fr))"
                : isMobile
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: isMobile ? "16px" : "22px",
            }}
          >
            {gameModes.map((mode) => (
              <ComingSoonCard key={mode.id} mode={mode} isMobile={isMobile} />
            ))}
          </div>

          <div
            style={{
              margin: isMobile ? "24px 0 0" : "30px auto 0",
              maxWidth: "760px",
              borderRadius: "22px",
              border: "1px solid rgba(126,232,255,0.22)",
              background: "rgba(255,255,255,0.06)",
              padding: isMobile ? "18px" : "22px 26px",
              textAlign: "center",
              color: "rgba(255,255,255,0.7)",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            New thinking activities will be added here later. For now, all game
            modes are locked as coming soon.
          </div>
        </section>
      </section>
    </main>
  );
}

function ComingSoonCard({
  mode,
  isMobile,
}: {
  mode: GameMode;
  isMobile: boolean;
}) {
  return (
    <article
      style={{
        minHeight: isMobile ? "auto" : "440px",
        borderRadius: "24px",
        padding: isMobile ? "18px" : "24px",
        border: "1px solid rgba(150, 220, 255, 0.24)",
        background:
          "linear-gradient(180deg, rgba(20, 58, 100, 0.5), rgba(8, 25, 56, 0.72))",
        boxShadow:
          "inset 0 0 24px rgba(255,255,255,0.03), 0 18px 42px rgba(0,0,0,0.24)",
        color: "white",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        opacity: 0.9,
      }}
    >
      <div
        style={{
          height: isMobile ? "150px" : "190px",
          width: "100%",
          borderRadius: "18px",
          border: "1px solid rgba(126,232,255,0.22)",
          background:
            "linear-gradient(180deg, rgba(20, 58, 100, 0.62), rgba(8, 25, 56, 0.84))",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <img
          src={mode.image}
          alt={mode.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: "8px",
            opacity: 0.82,
          }}
          draggable={false}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(2,8,19,0.02), rgba(2,8,19,0.28))",
            pointerEvents: "none",
          }}
        />
      </div>

      <h3
        style={{
          margin: "22px 0 0",
          fontSize: isMobile ? "23px" : "28px",
          fontWeight: 700,
          lineHeight: 1.25,
        }}
      >
        {mode.title}
      </h3>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "15px",
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.72)",
        }}
      >
        {mode.subtitle}
      </p>

      <button
        type="button"
        disabled
        style={{
          marginTop: "auto",
          height: "52px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.58)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "not-allowed",
        }}
      >
        Coming Soon
      </button>
    </article>
  );
}