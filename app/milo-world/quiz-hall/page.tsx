"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  getMiloQuizHallCreatorClubsAccess,
  setMiloQuizHallCreatorClubsPublicAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

const FAIL_CLOSED_ACCESS: MiloQuizHallCreatorClubsAccess = {
  publicAccessEnabled: false,
  isAdmin: false,
  canAccess: false,
};

type CreatorJourneyStep = {
  number: string;
  label: string;
  title: string;
  description: string;
  accent: string;
  status: "live" | "preview" | "future";
  href?: string;
};

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
  const { width } = useQuizHallViewport();
  const compact = width <= 720;
  const tablet = width <= 1060;

  const [creatorAccess, setCreatorAccess] =
    useState<MiloQuizHallCreatorClubsAccess>(FAIL_CLOSED_ACCESS);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessUpdating, setAccessUpdating] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      const result = await getMiloQuizHallCreatorClubsAccess();
      if (cancelled) return;

      setCreatorAccess(result.access);
      setAccessMessage(result.error || "");
      setAccessLoading(false);
    }

    void loadAccess();
    window.addEventListener("focus", loadAccess);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadAccess);
    };
  }, []);

  async function toggleCreatorClubsPublicAccess() {
    if (!creatorAccess.isAdmin || accessUpdating) return;

    const nextEnabled = !creatorAccess.publicAccessEnabled;

    setAccessUpdating(true);
    setAccessMessage("");

    const result =
      await setMiloQuizHallCreatorClubsPublicAccess(nextEnabled);

    if (result.error) {
      setAccessMessage(result.error);
      setAccessUpdating(false);
      return;
    }

    setCreatorAccess((current) => ({
      ...current,
      publicAccessEnabled: nextEnabled,
      canAccess: nextEnabled || current.isAdmin,
    }));

    setAccessMessage(
      `Creator Clubs public access is now ${nextEnabled ? "ON" : "OFF"}.`,
    );

    setAccessUpdating(false);
  }

  const clubsPublic = creatorAccess.publicAccessEnabled;
  const clubsCanEnter = creatorAccess.canAccess;
  const isAdmin = creatorAccess.isAdmin;

  const creatorJourney: CreatorJourneyStep[] = [
    {
      number: "01",
      label: "Compete",
      title: "Categories Hub",
      description:
        "Jump into Dreamscape’s official category challenges, test what you know and compete in single or multiplayer.",
      accent: "#8dfcff",
      status: "live",
      href: "/milo-world/categories",
    },
    {
      number: "02",
      label: "Join",
      title: "Creator Clubs",
      description:
        "Discover communities built around topics people love, join niche challenges and follow creators.",
      accent: "#ffd18a",
      status: clubsCanEnter ? "live" : "preview",
      href: clubsCanEnter ? "/milo-world/quiz-hall/communities" : undefined,
    },
    {
      number: "03",
      label: "Create",
      title: "Build a Club",
      description:
        "Turn something you know into your own club, create challenges and start building a community.",
      accent: "#d8b4fe",
      status: "future",
    },
    {
      number: "04",
      label: "Grow",
      title: "Creator Studio",
      description:
        "Grow your audience, improve your club, track participation and build your creator reputation.",
      accent: "#86efac",
      status: "future",
    },
    {
      number: "05",
      label: "Earn",
      title: "Creator Rewards",
      description:
        "Strong communities can eventually unlock Dream Token rewards and creator milestones.",
      accent: "#fde68a",
      status: "future",
    },
  ];

  const navStyle: CSSProperties = {
    minHeight: compact ? "38px" : "44px",
    padding: compact ? "0 13px" : "0 18px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.3)",
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

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        overflowX: "hidden",
        background: "#020711",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button, a { -webkit-tap-highlight-color: transparent; }

        @keyframes quizHallGlow {
          0%, 100% { opacity: 0.42; transform: scale(1); }
          50% { opacity: 0.72; transform: scale(1.035); }
        }

        @keyframes quizHallFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        .quiz-hall-step {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease,
            background 220ms ease;
        }

        .quiz-hall-step:hover {
          transform: translateY(-5px);
        }

        @media (prefers-reduced-motion: reduce) {
          .quiz-hall-step,
          .quiz-hall-orb {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <img
          src="/milo-world/quiz-hall/quiz-hall-bg.png"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: compact ? "52% center" : "center",
            filter: "saturate(0.78) brightness(0.42)",
            transform: "scale(1.01)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(
                180deg,
                rgba(1,6,15,0.68) 0%,
                rgba(1,6,15,0.34) 22%,
                rgba(1,6,15,0.54) 62%,
                rgba(1,6,15,0.94) 100%
              ),
              radial-gradient(
                circle at 50% 18%,
                rgba(83,215,255,0.13),
                transparent 38%
              )
            `,
          }}
        />

        <div
          className="quiz-hall-orb"
          style={{
            position: "absolute",
            left: "16%",
            top: "18%",
            width: "340px",
            height: "340px",
            borderRadius: "999px",
            background:
              "radial-gradient(circle, rgba(255,196,103,0.18), transparent 68%)",
            filter: "blur(16px)",
            animation: "quizHallGlow 5s ease-in-out infinite",
          }}
        />

        <div
          className="quiz-hall-orb"
          style={{
            position: "absolute",
            right: "10%",
            top: "26%",
            width: "360px",
            height: "360px",
            borderRadius: "999px",
            background:
              "radial-gradient(circle, rgba(83,215,255,0.19), transparent 68%)",
            filter: "blur(16px)",
            animation: "quizHallGlow 5.8s ease-in-out 400ms infinite",
          }}
        />
      </div>

      <header
        style={{
          position: "relative",
          zIndex: 20,
          width: "100%",
          padding: compact ? "12px 12px 0" : "18px 22px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Link href="/milo-world" style={navStyle}>
          ← Milo’s World
        </Link>

        {isAdmin && (
          <div
            style={{
              display: "grid",
              justifyItems: "end",
              gap: "7px",
            }}
          >
            <div
              style={{
                borderRadius: "18px",
                border: "1px solid rgba(196,181,253,0.26)",
                background: "rgba(19,9,48,0.84)",
                padding: "9px 10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 18px 42px rgba(0,0,0,0.35)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              }}
            >
              {!compact && (
                <span
                  style={{
                    color: "#ddd6fe",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Creator Clubs
                </span>
              )}

              <button
                type="button"
                disabled={accessLoading || accessUpdating}
                onClick={() => void toggleCreatorClubsPublicAccess()}
                style={{
                  minHeight: compact ? "36px" : "38px",
                  minWidth: compact ? "112px" : "142px",
                  padding: "0 12px",
                  borderRadius: "999px",
                  border: clubsPublic
                    ? "1px solid rgba(110,231,183,0.46)"
                    : "1px solid rgba(196,181,253,0.42)",
                  background: clubsPublic
                    ? "rgba(16,185,129,0.16)"
                    : "rgba(124,58,237,0.18)",
                  color: clubsPublic ? "#a7f3d0" : "#ddd6fe",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  cursor:
                    accessLoading || accessUpdating ? "wait" : "pointer",
                  opacity: accessLoading || accessUpdating ? 0.58 : 1,
                }}
              >
                {accessUpdating
                  ? "Saving..."
                  : `Public Access ${clubsPublic ? "ON" : "OFF"}`}
              </button>
            </div>

            {accessMessage && (
              <span
                style={{
                  maxWidth: "300px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(2,10,24,0.78)",
                  padding: "7px 10px",
                  color: "rgba(255,255,255,0.58)",
                  fontSize: "9px",
                  lineHeight: 1.4,
                }}
              >
                {accessMessage}
              </span>
            )}
          </div>
        )}
      </header>

      <section
        style={{
          position: "relative",
          zIndex: 10,
          width: "min(1180px, calc(100% - 28px))",
          margin: compact ? "34px auto 0" : "54px auto 0",
          textAlign: "center",
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
          Compete · Create · Grow
        </p>

        <h1
          style={{
            margin: compact ? "7px 0 0" : "10px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: compact
              ? "clamp(42px, 12vw, 58px)"
              : "clamp(58px, 6vw, 88px)",
            lineHeight: 0.94,
            fontWeight: 400,
            letterSpacing: "-0.045em",
            textShadow: "0 18px 48px rgba(0,0,0,0.54)",
          }}
        >
          Milo’s Quiz Hall
        </h1>

        <p
          style={{
            margin: "16px auto 0",
            maxWidth: "760px",
            color: "rgba(255,255,255,0.76)",
            fontSize: compact ? "14px" : "17px",
            lineHeight: 1.62,
          }}
        >
          Knowledge can become more than a score. Compete in challenges, join
          communities, create something people enjoy and build a reputation
          around what you know.
        </p>

        <div
          style={{
            margin: compact ? "22px auto 0" : "28px auto 0",
            width: "min(880px, 100%)",
            borderRadius: "22px",
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(255,209,138,0.065), rgba(83,215,255,0.06))",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            padding: compact ? "14px 16px" : "16px 20px",
            display: "grid",
            gridTemplateColumns: compact
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: compact ? "8px" : "14px",
          }}
        >
          {[
            ["KNOW", "Bring what you know"],
            ["BUILD", "Turn it into a community"],
            ["VALUE", "Grow reputation and rewards"],
          ].map(([title, text], index) => (
            <div
              key={title}
              style={{
                minHeight: compact ? "56px" : "68px",
                display: "flex",
                alignItems: "center",
                justifyContent: compact ? "flex-start" : "center",
                gap: "10px",
                textAlign: compact ? "left" : "center",
                borderLeft:
                  !compact && index > 0
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "none",
              }}
            >
              <span
                style={{
                  color: index === 0 ? "#8dfcff" : index === 1 ? "#d8b4fe" : "#ffd18a",
                  fontSize: compact ? "11px" : "12px",
                  fontWeight: 950,
                  letterSpacing: "0.14em",
                }}
              >
                {title}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.58)",
                  fontSize: compact ? "11px" : "12px",
                  lineHeight: 1.35,
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          position: "relative",
          zIndex: 10,
          width: "min(1240px, calc(100% - 28px))",
          margin: compact ? "28px auto 0" : "38px auto 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-between",
            gap: "14px",
            marginBottom: "14px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#8dfcff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Your Creator Journey
            </p>
            <h2
              style={{
                margin: "5px 0 0",
                fontSize: compact ? "23px" : "30px",
                lineHeight: 1.12,
              }}
            >
              From player to creator
            </h2>
          </div>

          {!compact && (
            <span
              style={{
                color: "rgba(255,255,255,0.42)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Two live today · more coming next
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: tablet
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(5, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {creatorJourney.map((step) => {
            const isFuture = step.status === "future";
            const isLocked =
              step.title === "Creator Clubs" && !clubsCanEnter;

            const content = (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      color: step.accent,
                      fontSize: "10px",
                      fontWeight: 950,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {step.number}
                  </span>

                  <span
                    style={{
                      padding: "4px 7px",
                      borderRadius: "999px",
                      border:
                        step.status === "live"
                          ? "1px solid rgba(110,231,183,0.28)"
                          : step.status === "preview"
                            ? "1px solid rgba(255,209,138,0.26)"
                            : "1px solid rgba(196,181,253,0.24)",
                      background:
                        step.status === "live"
                          ? "rgba(16,185,129,0.09)"
                          : step.status === "preview"
                            ? "rgba(255,209,138,0.08)"
                            : "rgba(124,58,237,0.08)",
                      color:
                        step.status === "live"
                          ? "#a7f3d0"
                          : step.status === "preview"
                            ? "#ffd18a"
                            : "#ddd6fe",
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {step.status === "live"
                      ? "Open"
                      : step.status === "preview"
                        ? isAdmin
                          ? "Admin Preview"
                          : "Preparing"
                        : "Coming Soon"}
                  </span>
                </div>

                <p
                  style={{
                    margin: "18px 0 0",
                    color: step.accent,
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  {step.label}
                </p>

                <h3
                  style={{
                    margin: "6px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: compact ? "23px" : "25px",
                    lineHeight: 1.08,
                    fontWeight: 500,
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    margin: "11px 0 0",
                    color: "rgba(255,255,255,0.62)",
                    fontSize: "12px",
                    lineHeight: 1.55,
                  }}
                >
                  {step.description}
                </p>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "18px",
                    color: isFuture
                      ? "rgba(255,255,255,0.38)"
                      : isLocked
                        ? "#ffd18a"
                        : step.accent,
                    fontSize: "10px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {isFuture
                    ? "Roadmap Feature"
                    : isLocked
                      ? "Public Access Closed"
                      : step.title === "Creator Clubs" && isAdmin && !clubsPublic
                        ? "Enter Admin Preview →"
                        : "Enter →"}
                </div>
              </>
            );

            const sharedStyle: CSSProperties = {
              minHeight: tablet ? "250px" : "300px",
              borderRadius: "22px",
              border: `1px solid ${step.accent}33`,
              background:
                step.status === "future"
                  ? "linear-gradient(145deg, rgba(12,16,32,0.82), rgba(3,9,22,0.9))"
                  : "linear-gradient(145deg, rgba(9,27,47,0.91), rgba(3,10,24,0.95))",
              boxShadow:
                step.status === "live"
                  ? `0 18px 46px rgba(0,0,0,0.34), 0 0 24px ${step.accent}12`
                  : "0 18px 44px rgba(0,0,0,0.3)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              color: "white",
              textDecoration: "none",
              opacity: isFuture ? 0.74 : 1,
            };

            if (step.href) {
              return (
                <Link
                  key={step.number}
                  href={step.href}
                  className="quiz-hall-step"
                  style={sharedStyle}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={step.number}
                className="quiz-hall-step"
                aria-disabled="true"
                style={{
                  ...sharedStyle,
                  cursor: "default",
                }}
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section
        style={{
          position: "relative",
          zIndex: 10,
          width: "min(1240px, calc(100% - 28px))",
          margin: compact ? "24px auto 0" : "30px auto 0",
          display: "grid",
          gridTemplateColumns: tablet ? "1fr" : "1.25fr 0.75fr",
          gap: "14px",
        }}
      >
        <div
          style={{
            borderRadius: "24px",
            border: "1px solid rgba(255,209,138,0.19)",
            background:
              "linear-gradient(135deg, rgba(51,30,13,0.72), rgba(4,12,27,0.91))",
            padding: compact ? "20px" : "24px 26px",
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) auto",
            alignItems: "center",
            gap: "20px",
            boxShadow: "0 22px 54px rgba(0,0,0,0.32)",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Milo’s Idea
            </p>
            <h2
              style={{
                margin: "6px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: compact ? "27px" : "34px",
                lineHeight: 1.08,
                fontWeight: 500,
              }}
            >
              Knowledge can create value too.
            </h2>
            <p
              style={{
                margin: "11px 0 0",
                maxWidth: "720px",
                color: "rgba(255,255,255,0.67)",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              In Milo’s World, you learn how money moves through banks,
              businesses, stocks and property. Quiz Hall adds another idea:
              people can create value by sharing knowledge, building an
              audience and bringing a community together.
            </p>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: compact ? "100%" : "210px",
              minHeight: compact ? "86px" : "118px",
              borderRadius: "20px",
              border: "1px solid rgba(255,209,138,0.16)",
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,209,138,0.14), rgba(255,255,255,0.02))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "11px",
              color: "#ffd18a",
              fontWeight: 950,
              letterSpacing: "0.08em",
            }}
          >
            <span>KNOW</span>
            <span style={{ opacity: 0.5 }}>→</span>
            <span>CREATE</span>
            <span style={{ opacity: 0.5 }}>→</span>
            <span>VALUE</span>
          </div>
        </div>

        <div
          style={{
            borderRadius: "24px",
            border: "1px solid rgba(126,232,255,0.18)",
            background:
              "linear-gradient(145deg, rgba(4,28,47,0.78), rgba(3,10,24,0.92))",
            padding: compact ? "20px" : "24px",
            boxShadow: "0 22px 54px rgba(0,0,0,0.3)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8dfcff",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            What changes here
          </p>

          <div
            style={{
              marginTop: "13px",
              display: "grid",
              gap: "10px",
            }}
          >
            {[
              "Official quizzes become the entry point, not the whole page.",
              "Creator Clubs become part of a larger creator journey.",
              "Future creation, reputation and rewards are visible from day one.",
            ].map((text, index) => (
              <div
                key={text}
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px minmax(0,1fr)",
                  gap: "9px",
                  alignItems: "start",
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "999px",
                    border: "1px solid rgba(83,215,255,0.26)",
                    background: "rgba(83,215,255,0.07)",
                    color: "#8dfcff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    fontWeight: 950,
                  }}
                >
                  {index + 1}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        style={{
          position: "relative",
          zIndex: 10,
          width: "min(1240px, calc(100% - 28px))",
          margin: "18px auto 0",
          padding: compact ? "0 0 34px" : "0 0 44px",
          color: "rgba(255,255,255,0.38)",
          fontSize: "10px",
          textAlign: "center",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Milo’s World · Knowledge → Community → Value
      </footer>
    </main>
  );
}
