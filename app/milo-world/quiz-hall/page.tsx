"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  getMiloQuizHallCreatorClubsAccess,
  setMiloQuizHallCreatorClubsPublicAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

type HallSide = "clubs" | "categories" | null;

const FAIL_CLOSED_ACCESS: MiloQuizHallCreatorClubsAccess = {
  publicAccessEnabled: false,
  isAdmin: false,
  canAccess: false,
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
  const { width, height } = useQuizHallViewport();
  const [activeSide, setActiveSide] = useState<HallSide>(null);
  const [creatorAccess, setCreatorAccess] =
    useState<MiloQuizHallCreatorClubsAccess>(FAIL_CLOSED_ACCESS);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessUpdating, setAccessUpdating] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

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
        ? "linear-gradient(145deg, rgba(36,22,11,0.94), rgba(3,11,24,0.96))"
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

  const clubsPublic = creatorAccess.publicAccessEnabled;
  const isAdmin = creatorAccess.isAdmin;
  const clubsCanEnter = creatorAccess.canAccess;

  const clubsEyebrow =
    isAdmin && !clubsPublic
      ? "Admin Preview · Public Access Off"
      : clubsPublic
        ? "Community side"
        : "Locked for now";

  const clubsDescription = clubsPublic
    ? "Join communities built around the topics you love, compete in niche challenges and discover creator quiz packs."
    : isAdmin
      ? "Creator Clubs are hidden from the public. You can enter this side as an administrator to test the creator system."
      : "Creator Clubs are still being prepared and are not open to the public yet.";

  const clubsAction = clubsCanEnter
    ? isAdmin && !clubsPublic
      ? "Enter Admin Preview →"
      : "Explore Clubs →"
    : "Public Access Closed";

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
                fontSize: compact
                  ? "clamp(35px, 10vw, 48px)"
                  : "clamp(48px, 5vw, 76px)",
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
                Creator Clubs are on the left. Dreamscape’s official Categories
                Hub remains on the right.
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            pointerEvents: "auto",
            display: "grid",
            justifyItems: "end",
            gap: "8px",
          }}
        >
          {isAdmin ? (
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
                    letterSpacing: "0.10em",
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
          ) : (
            !compact && (
              <div
                style={{
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
            )
          )}

          {accessMessage && isAdmin && (
            <span
              style={{
                maxWidth: "300px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.10)",
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
      </header>

      {landscape ? (
        <>
          {clubsCanEnter ? (
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
              <CreatorSideContent
                active={activeSide === "clubs"}
                infoCard={infoCard("clubs")}
                eyebrow={clubsEyebrow}
                description={clubsDescription}
                action={clubsAction}
                locked={!clubsPublic}
              />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Creator Clubs are currently locked"
              onMouseEnter={() => setActiveSide("clubs")}
              onMouseLeave={() => setActiveSide(null)}
              onFocus={() => setActiveSide("clubs")}
              onBlur={() => setActiveSide(null)}
              style={{
                position: "absolute",
                inset: "0 50% 0 0",
                zIndex: 12,
                padding: 0,
                border: "none",
                background: "transparent",
                outline: "none",
                cursor: "default",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <CreatorSideContent
                active={activeSide === "clubs"}
                infoCard={infoCard("clubs")}
                eyebrow={clubsEyebrow}
                description={clubsDescription}
                action={clubsAction}
                locked
              />
            </button>
          )}

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
          {clubsCanEnter ? (
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
              <CompactCreatorCard
                compact={compact}
                eyebrow={clubsEyebrow}
                description={clubsDescription}
                locked={!clubsPublic}
              />
            </Link>
          ) : (
            <div
              aria-disabled="true"
              style={{
                ...infoCard("clubs", { mobile: true }),
                minHeight: compact ? "122px" : "144px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                opacity: 0.78,
              }}
            >
              <CompactCreatorCard
                compact={compact}
                eyebrow={clubsEyebrow}
                description={clubsDescription}
                locked
              />
            </div>
          )}

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
            <strong
              style={{
                marginTop: "5px",
                fontSize: compact ? "20px" : "24px",
              }}
            >
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

function CreatorSideContent({
  active,
  infoCard,
  eyebrow,
  description,
  action,
  locked,
}: {
  active: boolean;
  infoCard: CSSProperties;
  eyebrow: string;
  description: string;
  action: string;
  locked: boolean;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "18% 6% 10% 2%",
          borderRadius: "30px",
          border: active
            ? locked
              ? "1px solid rgba(255,209,138,0.42)"
              : "1px solid rgba(255,209,138,0.38)"
            : "1px solid transparent",
          background: active
            ? "linear-gradient(90deg, rgba(229,183,94,0.075), rgba(229,183,94,0.015))"
            : "transparent",
          boxShadow: active
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
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
          pointerEvents: "none",
          transition: "opacity 180ms ease, transform 220ms ease",
          ...infoCard,
        }}
      >
        <span
          style={{
            display: "block",
            color: "#ffd18a",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
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
          {locked ? "◇ " : ""}
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
          {description}
        </span>
        <span
          style={{
            display: "block",
            marginTop: "13px",
            color: locked ? "#ffd18a" : "#ffd18a",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          {action}
        </span>
      </span>
    </>
  );
}

function CompactCreatorCard({
  compact,
  eyebrow,
  description,
  locked,
}: {
  compact: boolean;
  eyebrow: string;
  description: string;
  locked: boolean;
}) {
  return (
    <>
      <span
        style={{
          color: "#ffd18a",
          fontSize: "8px",
          fontWeight: 900,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </span>
      <strong
        style={{
          marginTop: "5px",
          fontSize: compact ? "20px" : "24px",
        }}
      >
        {locked ? "◇ " : ""}
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
        {description}
      </span>
    </>
  );
}
