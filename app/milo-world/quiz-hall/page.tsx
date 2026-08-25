"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type HallSide = "clubs" | "categories" | null;

function useQuizHallViewport() {
  const [viewport, setViewport] = useState({
    width: 1440,
    height: 900,
  });

  useEffect(() => {
    function update() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return viewport;
}

export default function MiloQuizHallPage() {
  const { width, height } = useQuizHallViewport();
  const [activeSide, setActiveSide] = useState<HallSide>(null);

  const landscape = width >= 980 && width > height * 1.15;
  const compact = width <= 720;

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

  const navStyle: CSSProperties = {
    minHeight: compact ? "38px" : "44px",
    padding: compact ? "0 13px" : "0 18px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.30)",
    background: "rgba(2,10,24,0.76)",
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: compact ? "10px" : "12px",
    fontWeight: 850,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.24)",
  };

  const infoCard = (
    side: Exclude<HallSide, null>,
    options?: { mobile?: boolean },
  ): CSSProperties => ({
    width: options?.mobile ? "100%" : "min(420px, calc(100vw - 48px))",
    borderRadius: options?.mobile ? "18px" : "24px",
    border:
      side === "clubs"
        ? "1px solid rgba(255,194,103,0.36)"
        : "1px solid rgba(126,232,255,0.38)",
    background:
      side === "clubs"
        ? "linear-gradient(145deg, rgba(36,22,11,0.92), rgba(3,11,24,0.94))"
        : "linear-gradient(145deg, rgba(5,31,51,0.92), rgba(3,11,24,0.95))",
    padding: options?.mobile ? "17px" : "22px",
    color: "white",
    boxShadow:
      side === "clubs"
        ? "0 24px 70px rgba(0,0,0,0.45), 0 0 34px rgba(229,183,94,0.12)"
        : "0 24px 70px rgba(0,0,0,0.45), 0 0 34px rgba(83,215,255,0.14)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  });

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "#020711",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button, a { -webkit-tap-highlight-color: transparent; }
        @keyframes hallPulse {
          0%, 100% { opacity: .38; }
          50% { opacity: .72; }
        }
      `}</style>

      <img
        src="/milo-world/quiz-hall/quiz-hall-bg.png"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: landscape ? "center" : "52% center",
          filter: "saturate(0.92) brightness(0.82)",
          transform: "scale(1.002)",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(1,6,15,0.56) 0%, rgba(1,6,15,0.10) 22%, rgba(1,6,15,0.18) 68%, rgba(1,6,15,0.72) 100%)",
          pointerEvents: "none",
        }}
      />

      <header
        style={{
          position: "absolute",
          top: compact ? "10px" : "16px",
          left: compact ? "10px" : "20px",
          right: compact ? "10px" : "20px",
          zIndex: 30,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <Link href="/milo-world" style={navStyle}>
            ← Milo’s World
          </Link>

          <div
            style={{
              marginTop: compact ? "11px" : "16px",
              maxWidth: compact ? "80vw" : "640px",
              textShadow: "0 12px 40px rgba(0,0,0,0.76)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: compact ? "9px" : "11px",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Explore · Compete · Master
            </p>
            <h1
              style={{
                margin: compact ? "5px 0 0" : "8px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: compact ? "clamp(35px, 10vw, 48px)" : "clamp(48px, 5vw, 76px)",
                lineHeight: 0.94,
                fontWeight: 400,
              }}
            >
              Milo’s Quiz Hall
            </h1>
            {!compact && (
              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: "590px",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "14px",
                  lineHeight: 1.55,
                }}
              >
                Enter creator-led clubs on the left or head to Dreamscape’s
                Categories Hub on the right.
              </p>
            )}
          </div>
        </div>

        {!compact && (
          <div
            style={{
              marginTop: "2px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(2,10,24,0.68)",
              padding: "10px 14px",
              color: "rgba(255,255,255,0.64)",
              fontSize: "10px",
              fontWeight: 850,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            Choose a side
          </div>
        )}
      </header>

      {landscape ? (
        <>
          <Link
            href="/milo-world/quiz-hall/communities"
            aria-label="Explore Creator Clubs"
            onMouseEnter={() => setActiveSide("clubs")}
            onMouseLeave={() => setActiveSide(null)}
            onFocus={() => setActiveSide("clubs")}
            onBlur={() => setActiveSide(null)}
            style={{
              position: "absolute",
              inset: "0 50% 0 0",
              zIndex: 12,
              textDecoration: "none",
              outline: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "18% 6% 10% 2%",
                borderRadius: "30px",
                border:
                  activeSide === "clubs"
                    ? "1px solid rgba(255,209,138,0.38)"
                    : "1px solid transparent",
                background:
                  activeSide === "clubs"
                    ? "linear-gradient(90deg, rgba(229,183,94,0.07), rgba(229,183,94,0.015))"
                    : "transparent",
                boxShadow:
                  activeSide === "clubs"
                    ? "inset 0 0 70px rgba(229,183,94,0.05), 0 0 42px rgba(229,183,94,0.06)"
                    : "none",
                transition: "all 220ms ease",
              }}
            />

            <span
              style={{
                position: "absolute",
                left: "3.4%",
                bottom: "4.5%",
                opacity: activeSide === "clubs" ? 1 : 0,
                transform:
                  activeSide === "clubs"
                    ? "translateY(0)"
                    : "translateY(12px)",
                pointerEvents: "none",
                transition: "opacity 180ms ease, transform 220ms ease",
                ...infoCard("clubs"),
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#ffd18a",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Community side
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: "7px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: "28px",
                  fontWeight: 400,
                }}
              >
                Creator Clubs
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "rgba(255,255,255,0.68)",
                  fontSize: "13px",
                  lineHeight: 1.55,
                }}
              >
                Join communities built around the topics you love, compete in
                niche challenges and discover creator quiz packs.
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: "13px",
                  color: "#ffd18a",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                Explore Clubs →
              </span>
            </span>
          </Link>

          <Link
            href="/milo-world/categories"
            aria-label="Enter Categories Hub"
            onMouseEnter={() => setActiveSide("categories")}
            onMouseLeave={() => setActiveSide(null)}
            onFocus={() => setActiveSide("categories")}
            onBlur={() => setActiveSide(null)}
            style={{
              position: "absolute",
              inset: "0 0 0 50%",
              zIndex: 12,
              textDecoration: "none",
              outline: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "18% 2% 10% 3%",
                borderRadius: "30px",
                border:
                  activeSide === "categories"
                    ? "1px solid rgba(126,232,255,0.38)"
                    : "1px solid transparent",
                background:
                  activeSide === "categories"
                    ? "linear-gradient(270deg, rgba(83,215,255,0.08), rgba(83,215,255,0.015))"
                    : "transparent",
                boxShadow:
                  activeSide === "categories"
                    ? "inset 0 0 70px rgba(83,215,255,0.055), 0 0 42px rgba(83,215,255,0.07)"
                    : "none",
                transition: "all 220ms ease",
              }}
            />

            <span
              style={{
                position: "absolute",
                right: "3.4%",
                bottom: "4.5%",
                opacity: activeSide === "categories" ? 1 : 0,
                transform:
                  activeSide === "categories"
                    ? "translateY(0)"
                    : "translateY(12px)",
                pointerEvents: "none",
                transition: "opacity 180ms ease, transform 220ms ease",
                ...infoCard("categories"),
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#9bf5ff",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Dreamscape side
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: "7px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: "28px",
                  fontWeight: 400,
                }}
              >
                Categories Hub
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "rgba(255,255,255,0.68)",
                  fontSize: "13px",
                  lineHeight: 1.55,
                }}
              >
                Play Dreamscape’s official History, Geography and Science
                quizzes, build mastery and compete in single or multiplayer.
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: "13px",
                  color: "#9bf5ff",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                Enter Categories →
              </span>
            </span>
          </Link>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "23%",
              bottom: "9%",
              width: "1px",
              zIndex: 11,
              background:
                "linear-gradient(180deg, transparent, rgba(255,255,255,0.14) 24%, rgba(255,255,255,0.14) 76%, transparent)",
              boxShadow: "0 0 20px rgba(83,215,255,0.12)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        <section
          style={{
            position: "absolute",
            left: compact ? "10px" : "18px",
            right: compact ? "10px" : "18px",
            bottom: compact ? "10px" : "16px",
            zIndex: 20,
            display: "grid",
            gridTemplateColumns:
              width >= 720 ? "repeat(2, minmax(0, 1fr))" : "1fr",
            gap: compact ? "8px" : "12px",
          }}
        >
          <Link
            href="/milo-world/quiz-hall/communities"
            style={{
              ...infoCard("clubs", { mobile: true }),
              textDecoration: "none",
              minHeight: compact ? "122px" : "144px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#ffd18a",
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Community side
            </span>
            <strong style={{ marginTop: "5px", fontSize: compact ? "20px" : "24px" }}>
              Creator Clubs
            </strong>
            <span
              style={{
                marginTop: "6px",
                color: "rgba(255,255,255,0.62)",
                fontSize: compact ? "10px" : "12px",
                lineHeight: 1.45,
              }}
            >
              Niche communities, challenges and creator quiz packs.
            </span>
          </Link>

          <Link
            href="/milo-world/categories"
            style={{
              ...infoCard("categories", { mobile: true }),
              textDecoration: "none",
              minHeight: compact ? "122px" : "144px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#9bf5ff",
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Dreamscape side
            </span>
            <strong style={{ marginTop: "5px", fontSize: compact ? "20px" : "24px" }}>
              Categories Hub
            </strong>
            <span
              style={{
                marginTop: "6px",
                color: "rgba(255,255,255,0.62)",
                fontSize: compact ? "10px" : "12px",
                lineHeight: 1.45,
              }}
            >
              Official categories, mastery, rankings and multiplayer.
            </span>
          </Link>
        </section>
      )}
    </main>
  );
}
