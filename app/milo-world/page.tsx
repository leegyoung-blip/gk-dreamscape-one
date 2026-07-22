"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

type DreamTokenTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  created_at: string | null;
};

type ReferralMilestone = 1 | 5 | 15;

type ReferralObjectiveDefinition = {
  milestone: ReferralMilestone;
  title: string;
  reward: number;
};

type ReferralObjectiveStatus = {
  referral_count?: number;
  claimed_milestones?: number[];
};

type Zone = {
  number: string;
  icon: string;
  title: string;
  description: string;
  href?: string;
  opensMembership?: boolean;
  style: CSSProperties;
};

const REFERRAL_OBJECTIVES: ReferralObjectiveDefinition[] = [
  {
    milestone: 1,
    title: "Complete your first successful referral",
    reward: 25,
  },
  {
    milestone: 5,
    title: "Reach 5 successful referrals",
    reward: 100,
  },
  {
    milestone: 15,
    title: "Reach 15 successful referrals",
    reward: 500,
  },
];

const INTRO_TEXT =
  "Hi, I’m Milo. Welcome to my economy world. This is where Dreamscape users play challenges, earn Dreamscape Tokens, visit the Dream Shop, build businesses, and use tokens in Milo’s Stock Exchange if they are 16 or above. Choose any zone to begin.";

const ZONES: Zone[] = [
  {
    number: "1",
    icon: "✦",
    title: "Membership Portal",
    description: "Choose your Dreamscape One access level.",
    opensMembership: true,
    style: {
      top: "185px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "455px",
    },
  },
  {
    number: "2",
    icon: "◈",
    title: "Milo’s Exchange",
    description:
      "Use earned Dreamscape Tokens to trade fictional Dreamscape stocks.",
    href: "/milo-world/exchange",
    style: {
      top: "300px",
      right: "180px",
      width: "455px",
    },
  },
  {
    number: "3",
    icon: "▣",
    title: "Activity Lab",
    description:
      "Play daily challenges, quiz battles, and party games to earn tokens.",
    href: "/milo-world/activity-lab",
    style: {
      top: "800px",
      right: "275px",
      width: "455px",
    },
  },
  {
    number: "4",
    icon: "◆",
    title: "Dream Shop",
    description: "Collectibles, limited drops, and Dreamscape items.",
    href: "/milo-world/dream-shop",
    style: {
      top: "800px",
      left: "365px",
      width: "455px",
    },
  },
  {
    number: "5",
    icon: "★",
    title: "Milo’s Business Builder",
    description:
      "Build, manage, and grow a Dreamscape business through strategic decisions.",
    href: "/milo-world/club",
    style: {
      top: "370px",
      left: "140px",
      width: "455px",
    },
  },
];

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const aspectRatio = width / Math.max(height, 1);
      const shouldUseCompactLayout =
        width < 1760 || isPortrait || aspectRatio < 1.65;

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

function ResponsiveMiloStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      .milo-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(40, 117, 160, 0.45) rgba(255,255,255,0.08);
      }

      .milo-scrollbar::-webkit-scrollbar {
        height: 8px;
        width: 8px;
      }

      .milo-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(40, 117, 160, 0.45);
        border-radius: 999px;
      }

      button,
      a {
        -webkit-tap-highlight-color: transparent;
      }
    `}</style>
  );
}

function ZoneCard({
  zone,
  screenMode,
  onOpenMembership,
}: {
  zone: Zone;
  screenMode: ScreenMode;
  onOpenMembership: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const baseTransform =
    isDesktop && typeof zone.style.transform === "string"
      ? zone.style.transform
      : "";
  const desktopStyle = isDesktop ? zone.style : {};

  const cardStyle: CSSProperties = {
    position: isDesktop ? "absolute" : "relative",
    minHeight: isMobile ? "82px" : "94px",
    width: isDesktop ? undefined : "100%",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "50px 1px minmax(0, 1fr) 24px"
      : "74px 1px minmax(0, 1fr) 32px",
    alignItems: "center",
    gap: isMobile ? "12px" : "20px",
    padding: isMobile ? "16px" : "22px 26px 22px 24px",
    borderRadius: "16px",
    border: hovered
      ? "1px solid rgba(132, 218, 255, 0.52)"
      : "1px solid rgba(132, 218, 255, 0.24)",
    background: hovered
      ? "rgba(5, 13, 28, 0.74)"
      : "rgba(5, 13, 28, 0.42)",
    color: "white",
    textDecoration: "none",
    textAlign: "left",
    fontFamily: "inherit",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: hovered
      ? "0 0 42px rgba(83,215,255,0.28), 0 26px 70px rgba(0,0,0,0.42)"
      : "0 14px 34px rgba(0,0,0,0.22)",
    opacity: isDesktop ? (hovered ? 1 : 0.42) : hovered ? 1 : 0.78,
    filter: hovered ? "none" : "saturate(0.75) brightness(0.88)",
    transition:
      "transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease, opacity 260ms ease, filter 260ms ease",
    zIndex: hovered ? 20 : 8,
    cursor: "pointer",
    ...desktopStyle,
    transform: isDesktop
      ? `${baseTransform} ${
          hovered ? "translateY(-6px) scale(1.015)" : ""
        }`.trim()
      : hovered
        ? "translateY(-4px)"
        : "none",
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
          color: "#8ee8ff",
          background:
            "radial-gradient(circle, rgba(83,215,255,0.2), rgba(2,8,19,0.88))",
          border: "1px solid rgba(83,215,255,0.45)",
          boxShadow:
            "0 0 22px rgba(83,215,255,0.22), inset 0 0 18px rgba(83,215,255,0.08)",
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
            gap: isMobile ? "10px" : "16px",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              fontSize: isMobile ? "15px" : "19px",
              color: "rgba(255,255,255,0.86)",
              lineHeight: 1.2,
            }}
          >
            {zone.number}
          </span>

          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: isMobile ? "15px" : "18px",
                lineHeight: 1.35,
                fontWeight: 700,
                color: "white",
              }}
            >
              {zone.title}
            </h3>

            {!isMobile && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "rgba(255,255,255,0.55)",
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
          fontSize: isMobile ? "22px" : "28px",
          color: "rgba(255,255,255,0.78)",
        }}
      >
        →
      </div>
    </>
  );

  if (zone.href) {
    return (
      <Link
        href={zone.href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={cardStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenMembership}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle}
    >
      {content}
    </button>
  );
}

function IntroDialogue({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [typedLength, setTypedLength] = useState(0);
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  useEffect(() => {
    if (!open) {
      setTypedLength(0);
      return;
    }

    const interval = window.setInterval(() => {
      setTypedLength((current) => {
        if (current >= INTRO_TEXT.length) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 22);

    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const completed = typedLength >= INTRO_TEXT.length;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "16px" : "28px",
        background:
          "radial-gradient(circle at 50% 50%, rgba(83,215,255,0.12), rgba(0,0,0,0.46))",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        className="milo-scrollbar"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "min(880px, 92vw)",
          maxHeight: "88dvh",
          overflowY: "auto",
          minHeight: isMobile ? "auto" : "330px",
          borderRadius: isMobile ? "22px" : "26px",
          padding: isCompact ? "28px 24px" : "36px 38px 36px 260px",
          border: "1px solid rgba(132,218,255,0.24)",
          background: "rgba(5, 13, 28, 0.92)",
          boxShadow:
            "0 34px 100px rgba(0,0,0,0.6), inset 0 0 50px rgba(83,215,255,0.04)",
        }}
      >
        <button
          type="button"
          aria-label="Close introduction"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "18px",
            right: "20px",
            width: "38px",
            height: "38px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            cursor: "pointer",
            fontSize: "20px",
            zIndex: 4,
          }}
        >
          ×
        </button>

        <img
          src="/milo-world/milo-character.png"
          alt="Milo"
          style={{
            position: isCompact ? "relative" : "absolute",
            left: isCompact ? "auto" : "28px",
            bottom: isCompact ? "auto" : "-4px",
            height: isMobile ? "150px" : isCompact ? "190px" : "310px",
            width: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.55))",
            pointerEvents: "none",
            display: "block",
            margin: isCompact ? "0 auto 18px" : 0,
          }}
        />

        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "13px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Milo says
        </p>

        <h2
          style={{
            margin: "12px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "32px" : "42px",
            fontWeight: 500,
            color: "white",
            lineHeight: 1.08,
          }}
        >
          Welcome to Milo’s World.
        </h2>

        <p
          style={{
            margin: "24px 0 0",
            minHeight: isMobile ? "auto" : "118px",
            color: "rgba(255,255,255,0.82)",
            fontSize: isMobile ? "16px" : "19px",
            lineHeight: 1.7,
            fontWeight: 300,
            whiteSpace: "pre-wrap",
          }}
        >
          {INTRO_TEXT.slice(0, typedLength)}
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "20px",
              marginLeft: "3px",
              background: "rgba(255,255,255,0.75)",
              transform: "translateY(3px)",
              opacity: completed ? 0 : 1,
            }}
          />
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: "26px",
            border: "1px solid rgba(83,215,255,0.32)",
            background: "rgba(83,215,255,0.14)",
            color: "white",
            borderRadius: "12px",
            padding: "13px 22px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Start Exploring
        </button>
      </div>
    </div>
  );
}

function MembershipPlans() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const [builderHovered, setBuilderHovered] = useState(false);

  return (
    <div
      style={{
        borderRadius: "28px",
        border: "1px solid rgba(210, 151, 65, 0.38)",
        background:
          "linear-gradient(145deg, rgba(255,250,239,0.96), rgba(242,226,198,0.94))",
        padding: isMobile ? "22px 16px 26px" : "30px 42px 40px",
        color: "#1d140c",
        boxShadow:
          "0 24px 70px rgba(89, 54, 18, 0.16), inset 0 0 70px rgba(255,255,255,0.4)",
      }}
    >
      <h3
        style={{
          margin: 0,
          textAlign: "center",
          color: "#6f461c",
          fontSize: isMobile ? "20px" : "24px",
          fontWeight: 900,
          letterSpacing: "-0.02em",
        }}
      >
        Choose your Milo’s World access level.
      </h3>

      <div
        style={{
          width: "240px",
          height: "1px",
          margin: "26px auto 34px",
          background:
            "linear-gradient(90deg, transparent, rgba(196,124,42,0.42), transparent)",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "0.85fr 1.15fr" : "1fr",
          gap: "24px",
          alignItems: "stretch",
        }}
      >
        <article
          style={{
            minHeight: isDesktop ? "520px" : "auto",
            borderRadius: "26px",
            padding: isMobile ? "28px 22px" : "34px 30px",
            border: "1px solid rgba(115, 78, 38, 0.18)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,247,231,0.88))",
            boxShadow: "0 18px 42px rgba(90,55,20,0.08)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8a4f13",
              fontSize: "12px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            Basic Access
          </p>

          <h4
            style={{
              margin: "20px 0 0",
              fontSize: isMobile ? "34px" : "42px",
              lineHeight: 1.05,
              fontWeight: 900,
              color: "#1d140c",
              letterSpacing: "-0.04em",
            }}
          >
            Explore Milo’s World
          </h4>

          <p
            style={{
              margin: "20px 0 0",
              fontSize: isMobile ? "52px" : "64px",
              lineHeight: 1,
              fontWeight: 900,
              color: "#1d140c",
            }}
          >
            $0
          </p>

          <p
            style={{
              margin: "18px 0 0",
              color: "rgba(29,20,12,0.62)",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            Basic access lets users explore selected parts of Milo’s World
            before joining the full experience.
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "30px 0 0",
              display: "grid",
              gap: "16px",
            }}
          >
            {[
              "Explore selected Milo zones",
              "Play selected Activity Lab games",
              "Earn Dreamscape Tokens through activities",
              "View Dream Shop previews",
            ].map((feature) => (
              <li
                key={feature}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr",
                  gap: "12px",
                  alignItems: "start",
                  color: "rgba(29,20,12,0.78)",
                  fontSize: "14px",
                  lineHeight: 1.35,
                }}
              >
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "999px",
                    border: "1px solid rgba(161, 94, 28, 0.5)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8a4f13",
                    fontSize: "13px",
                    fontWeight: 900,
                    background: "rgba(255,255,255,0.55)",
                  }}
                >
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled
            style={{
              marginTop: "auto",
              width: "100%",
              height: "56px",
              borderRadius: "14px",
              border: "1px solid rgba(115,78,38,0.16)",
              background: "rgba(255,255,255,0.54)",
              color: "rgba(29,20,12,0.36)",
              fontSize: "16px",
              fontWeight: 900,
              cursor: "not-allowed",
            }}
          >
            Current Plan
          </button>
        </article>

        <article
          onMouseEnter={() => setBuilderHovered(true)}
          onMouseLeave={() => setBuilderHovered(false)}
          onTouchStart={() => setBuilderHovered((current) => !current)}
          style={{
            position: "relative",
            minHeight: isDesktop ? "520px" : isMobile ? "430px" : "520px",
            borderRadius: "26px",
            overflow: "hidden",
            border: "1px solid rgba(205, 132, 42, 0.82)",
            background:
              "linear-gradient(180deg, rgba(255,239,199,0.98), rgba(241,196,111,0.92))",
            boxShadow:
              "0 0 42px rgba(219,150,56,0.26), 0 26px 60px rgba(90,55,20,0.14)",
            cursor: "not-allowed",
          }}
        >
          <img
            src="/milo-world/membership/milos-club-cover.png"
            alt="Milo’s Business Builder"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              transform: builderHovered ? "scale(1.035)" : "scale(1)",
              transition: "transform 320ms ease",
              filter: "saturate(0.92)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: builderHovered
                ? "linear-gradient(180deg, rgba(25,12,4,0.42), rgba(25,12,4,0.88))"
                : "linear-gradient(180deg, rgba(25,12,4,0.18), rgba(25,12,4,0.44))",
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
                background: "rgba(199,94,16,0.82)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              ✦ Coming Soon
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
              $9.90/month
            </div>
          </div>

          {builderHovered ? (
            <div
              style={{
                position: "absolute",
                left: "24px",
                right: "24px",
                bottom: "24px",
                zIndex: 2,
                borderRadius: "22px",
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(24,12,4,0.78)",
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
                  color: "#ffd18a",
                  fontSize: "12px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 900,
                }}
              >
                Milo’s Business Builder Preview
              </p>

              <h4
                style={{
                  margin: "10px 0 0",
                  fontSize: isMobile ? "28px" : "34px",
                  lineHeight: 1.05,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                }}
              >
                Build a business, make decisions, and grow its value.
              </h4>

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
                  "Choose a business concept",
                  "Manage staffing, stock, and operating costs",
                  "Complete business cycles and review profits",
                  "Reinvest earnings or distribute dividends",
                ].map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "22px 1fr",
                      gap: "10px",
                      alignItems: "start",
                      color: "rgba(255,255,255,0.86)",
                      fontSize: "14px",
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: "#ffd18a", fontWeight: 900 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled
                style={{
                  marginTop: "20px",
                  width: "100%",
                  height: "52px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.26)",
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.58)",
                  fontSize: "16px",
                  fontWeight: 900,
                  cursor: "not-allowed",
                }}
              >
                Coming Soon
              </button>
            </div>
          ) : (
            <div
              style={{
                position: "absolute",
                left: "24px",
                right: "24px",
                bottom: "24px",
                zIndex: 2,
                borderRadius: "18px",
                background: "rgba(255,255,255,0.86)",
                border: "1px solid rgba(196,122,37,0.24)",
                padding: "16px 18px",
                color: "#1d140c",
                boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#8a4f13",
                  fontSize: "12px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontWeight: 900,
                }}
              >
                Business Simulation
              </p>

              <h4
                style={{
                  margin: "6px 0 0",
                  fontSize: "24px",
                  lineHeight: 1.08,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                }}
              >
                Milo’s Business Builder
              </h4>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(29,20,12,0.62)",
                  fontSize: "13px",
                  lineHeight: 1.45,
                }}
              >
                Learn to manage costs, profits, ownership, reinvestment, and
                dividends through a guided Dreamscape business.
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

function MembershipPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";

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
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        padding: isMobile ? "10px" : "28px",
        background: "rgba(0,0,0,0.52)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      }}
    >
      <div
        className="milo-scrollbar"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: isMobile
            ? "calc(100vw - 20px)"
            : "min(1180px, calc(100vw - 56px))",
          maxHeight: isMobile ? "calc(100dvh - 20px)" : "90dvh",
          overflowY: "auto",
          borderRadius: isMobile ? "20px" : "34px",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(239,244,248,0.95))",
          boxShadow: "0 38px 120px rgba(0,0,0,0.58)",
          border: "1px solid rgba(255,255,255,0.72)",
          color: "#07111f",
          padding: isMobile ? "58px 10px 10px" : "74px 22px 22px",
        }}
      >
        <button
          type="button"
          aria-label="Close membership portal"
          onClick={onClose}
          style={{
            position: "absolute",
            top: isMobile ? "12px" : "20px",
            right: isMobile ? "12px" : "20px",
            zIndex: 20,
            width: isMobile ? "40px" : "44px",
            height: isMobile ? "40px" : "44px",
            borderRadius: "999px",
            border: "1px solid rgba(7,17,31,0.12)",
            background: "rgba(255,255,255,0.82)",
            color: "#07111f",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <MembershipPlans />
      </div>
    </div>
  );
}

function ReferralObjectivesPanel({
  isLoggedIn,
  referralCount,
  claimedMilestones,
  isLoading,
  screenMode,
}: {
  isLoggedIn: boolean;
  referralCount: number;
  claimedMilestones: ReferralMilestone[];
  isLoading: boolean;
  screenMode: ScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const isTablet = screenMode === "tablet";
  const isDesktop = screenMode === "desktop";
  const [isOpen, setIsOpen] = useState(false);

  const completedCount = REFERRAL_OBJECTIVES.filter((objective) =>
    claimedMilestones.includes(objective.milestone),
  ).length;

  const nextMilestone =
    REFERRAL_OBJECTIVES.find(
      (objective) => !claimedMilestones.includes(objective.milestone),
    )?.milestone ?? 15;

  const overallProgress = Math.min(
    100,
    Math.max(0, (referralCount / nextMilestone) * 100),
  );

  return (
    <aside
      style={{
        position: isDesktop ? "fixed" : "relative",
        top: isDesktop ? "72px" : "auto",
        right: isDesktop ? "28px" : "auto",
        left: "auto",
        zIndex: 29,
        width: isMobile ? "calc(100% - 24px)" : "min(380px, calc(100% - 44px))",
        margin: isDesktop
          ? 0
          : isMobile
            ? "10px auto 0"
            : isTablet
              ? "18px 22px 0 auto"
              : 0,
        borderRadius: isOpen ? "20px" : "999px",
        border: "1px solid rgba(126,232,255,0.38)",
        background:
          "linear-gradient(145deg, rgba(3,20,39,0.94), rgba(3,10,25,0.96))",
        boxShadow:
          "0 20px 48px rgba(0,0,0,0.38), 0 0 24px rgba(83,215,255,0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden",
        color: "white",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          minHeight: isMobile ? "50px" : "54px",
          padding: isMobile ? "10px 14px" : "10px 16px",
          border: "none",
          background: "transparent",
          color: "white",
          display: "grid",
          gridTemplateColumns: "36px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "12px",
            border: "1px solid rgba(126,232,255,0.42)",
            background: "rgba(83,215,255,0.12)",
            color: "#8dfcff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}
        >
          ↗
        </span>

        <span style={{ minWidth: 0 }}>
          <strong
            style={{
              display: "block",
              fontSize: isMobile ? "12px" : "13px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Referral Objectives
          </strong>

          <span
            style={{
              display: "block",
              marginTop: "3px",
              color: "rgba(255,255,255,0.56)",
              fontSize: isMobile ? "10px" : "11px",
            }}
          >
            {isLoading
              ? "Loading progress..."
              : isLoggedIn
                ? `${completedCount}/3 complete · ${referralCount} successful referral${
                    referralCount === 1 ? "" : "s"
                  }`
                : "Log in to start earning bonuses"}
          </span>
        </span>

        <span
          aria-hidden="true"
          style={{
            color: "#8dfcff",
            fontSize: "18px",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        >
          ›
        </span>
      </button>

      {!isLoading && isLoggedIn && !isOpen && (
        <div style={{ height: "3px", background: "rgba(255,255,255,0.07)" }}>
          <div
            style={{
              width: `${overallProgress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #53d7ff, #60f0d0)",
              boxShadow: "0 0 12px rgba(96,240,208,0.4)",
              transition: "width 300ms ease",
            }}
          />
        </div>
      )}

      {isOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(126,232,255,0.14)",
            padding: isMobile ? "12px" : "14px",
          }}
        >
          {!isLoggedIn ? (
            <Link
              href="/login"
              style={{
                minHeight: "54px",
                borderRadius: "15px",
                border: "1px solid rgba(126,232,255,0.28)",
                background: "rgba(83,215,255,0.09)",
                color: "white",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Log in to view objectives
            </Link>
          ) : isLoading ? (
            <div
              style={{
                padding: "18px",
                color: "rgba(255,255,255,0.58)",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              Loading referral progress...
            </div>
          ) : (
            <>
              <p
                style={{
                  margin: "0 2px 12px",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                You receive the normal +10 DT for every successful referral.
                These milestone rewards are additional one-time bonuses.
              </p>

              <div style={{ display: "grid", gap: "9px" }}>
                {REFERRAL_OBJECTIVES.map((objective) => {
                  const isCompleted = claimedMilestones.includes(
                    objective.milestone,
                  );
                  const progress = Math.min(referralCount, objective.milestone);

                  const rowStyle: CSSProperties = {
                    minHeight: "66px",
                    borderRadius: "16px",
                    border: isCompleted
                      ? "1px solid rgba(93,255,181,0.5)"
                      : "1px solid rgba(126,232,255,0.18)",
                    background: isCompleted
                      ? "linear-gradient(145deg, rgba(18,116,76,0.52), rgba(8,56,45,0.66))"
                      : "rgba(255,255,255,0.035)",
                    color: "white",
                    textDecoration: "none",
                    display: "grid",
                    gridTemplateColumns: "34px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: "10px",
                    padding: "11px 12px",
                    boxShadow: isCompleted
                      ? "0 0 18px rgba(93,255,181,0.1)"
                      : "none",
                    cursor: isCompleted ? "default" : "pointer",
                    fontFamily: "inherit",
                  };

                  const rowContent = (
                    <>
                      <span
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "999px",
                          border: isCompleted
                            ? "1px solid rgba(137,255,204,0.7)"
                            : "1px solid rgba(126,232,255,0.32)",
                          background: isCompleted
                            ? "rgba(93,255,181,0.18)"
                            : "rgba(83,215,255,0.08)",
                          color: isCompleted ? "#9fffd2" : "#8dfcff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: 900,
                        }}
                      >
                        {isCompleted ? "✓" : progress}
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: isCompleted ? "#d9ffed" : "white",
                            fontSize: "12px",
                            lineHeight: 1.35,
                          }}
                        >
                          {objective.title}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "4px",
                            color: isCompleted
                              ? "#9fffd2"
                              : "rgba(255,255,255,0.48)",
                            fontSize: "10px",
                            lineHeight: 1.35,
                          }}
                        >
                          {isCompleted
                            ? "Completed · reward awarded"
                            : `${progress}/${objective.milestone} referrals`}
                        </span>
                      </span>

                      <strong
                        style={{
                          color: isCompleted ? "#9fffd2" : "#8dfcff",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                          textAlign: "right",
                        }}
                      >
                        {isCompleted
                          ? `+${objective.reward} DT ✓`
                          : `+${objective.reward} DT`}
                      </strong>
                    </>
                  );

                  if (isCompleted) {
                    return (
                      <div
                        key={objective.milestone}
                        aria-disabled="true"
                        style={{
                          ...rowStyle,
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      >
                        {rowContent}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={objective.milestone}
                      href="/profile"
                      style={rowStyle}
                    >
                      {rowContent}
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/profile"
                style={{
                  marginTop: "11px",
                  minHeight: "42px",
                  borderRadius: "13px",
                  border: "1px solid rgba(126,232,255,0.2)",
                  background: "rgba(83,215,255,0.07)",
                  color: "#bdf6ff",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                View and copy referral code
              </Link>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

export default function MiloWorldPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isTablet = screenMode === "tablet";
  const isMobile = screenMode === "mobile";

  const [introOpen, setIntroOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [dreamTokens, setDreamTokens] = useState(0);
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [tokenTransactionsOpen, setTokenTransactionsOpen] = useState(false);
  const [tokenTransactionsLoading, setTokenTransactionsLoading] =
    useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [claimedMilestones, setClaimedMilestones] = useState<
    ReferralMilestone[]
  >([]);
  const [objectivesLoading, setObjectivesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDreamTokensAndObjectives() {
      if (isMounted) setObjectivesLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setUserEmail(null);
        setDreamTokens(0);
        setTokenTransactions([]);
        setTokenTransactionsLoading(false);
        setTokenTransactionsOpen(false);
        setReferralCount(0);
        setClaimedMilestones([]);
        setObjectivesLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: objectiveData, error: objectiveError } = await supabase.rpc(
        "get_referral_objective_status",
      );

      if (!isMounted) return;

      if (objectiveError) {
        console.warn(
          "Could not load referral objectives:",
          objectiveError.message,
        );
        setReferralCount(0);
        setClaimedMilestones([]);
      } else {
        const status = objectiveData as ReferralObjectiveStatus | null;
        setReferralCount(Math.max(0, Number(status?.referral_count ?? 0)));

        const milestones = Array.isArray(status?.claimed_milestones)
          ? status.claimed_milestones
              .map((value) => Number(value))
              .filter(
                (value): value is ReferralMilestone =>
                  value === 1 || value === 5 || value === 15,
              )
          : [];

        setClaimedMilestones(milestones);
      }

      setTokenTransactionsLoading(true);

      const [balanceResult, recentTransactionsResult] = await Promise.all([
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
      ]);

      if (!isMounted) return;

      if (balanceResult.error) {
        console.warn("Could not load Dreamscape Tokens:", balanceResult.error);
        setDreamTokens(0);
      } else {
        const total =
          balanceResult.data?.reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0,
          ) || 0;
        setDreamTokens(total);
      }

      if (recentTransactionsResult.error) {
        console.warn(
          "Could not load recent Dreamscape Token transactions:",
          recentTransactionsResult.error,
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

      setTokenTransactionsLoading(false);
      setObjectivesLoading(false);
    }

    loadDreamTokensAndObjectives();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadDreamTokensAndObjectives();
    });

    window.addEventListener("focus", loadDreamTokensAndObjectives);
    window.addEventListener(
      "dream-tokens-updated",
      loadDreamTokensAndObjectives,
    );
    window.addEventListener(
      "dream-referral-objectives-updated",
      loadDreamTokensAndObjectives,
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", loadDreamTokensAndObjectives);
      window.removeEventListener(
        "dream-tokens-updated",
        loadDreamTokensAndObjectives,
      );
      window.removeEventListener(
        "dream-referral-objectives-updated",
        loadDreamTokensAndObjectives,
      );
    };
  }, []);

  useEffect(() => {
    if (!tokenTransactionsOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTokenTransactionsOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [tokenTransactionsOpen]);

  const navButtonStyle: CSSProperties = {
    height: isMobile ? "38px" : "42px",
    padding: isMobile ? "0 14px" : "0 22px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: isMobile ? "8px" : "12px",
    color: "rgba(255,255,255,0.9)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: isMobile ? "0.08em" : "0.16em",
    fontSize: isMobile ? "11px" : "13px",
    fontWeight: 700,
    border: "1px solid rgba(132,218,255,0.22)",
    background: "rgba(5,13,28,0.62)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
    whiteSpace: "nowrap",
  };

  return (
    <main
      className="milo-scrollbar"
      style={{
        position: "relative",
        width: "100%",
        minHeight: isDesktop ? "850px" : "100dvh",
        height: isDesktop ? "100vh" : "auto",
        overflowX: "hidden",
        overflowY: isDesktop ? "hidden" : "auto",
        paddingBottom: isDesktop ? 0 : isMobile ? "210px" : "230px",
        background: "#020817",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <ResponsiveMiloStyles />

      <video
        src="/milo-world/milo-world-bg-loop.mp4"
        poster="/milo-world/milo-world-bg.png"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          transform: "scale(1.01)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(to bottom, rgba(2,8,23,0.18), rgba(2,8,23,0.32) 42%, rgba(2,8,23,0.82)), linear-gradient(to right, rgba(2,8,23,0.28), transparent 35%, transparent 65%, rgba(2,8,23,0.3))",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          boxShadow: "inset 0 0 190px rgba(0,0,0,0.72)",
        }}
      />

      {tokenTransactionsOpen && (
        <button
          type="button"
          aria-label="Close token transactions"
          onClick={() => setTokenTransactionsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 29,
            border: "none",
            background: "transparent",
            cursor: "default",
          }}
        />
      )}

      <header
        style={{
          position: isDesktop ? "absolute" : "relative",
          top: isDesktop ? "15px" : "auto",
          left: isDesktop ? "28px" : "auto",
          right: isDesktop ? "28px" : "auto",
          zIndex: 30,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: isDesktop ? 0 : isMobile ? "12px" : "18px 22px 0",
        }}
      >
        <Link href="/" style={navButtonStyle}>
          <span style={{ fontSize: isMobile ? "14px" : "17px" }}>←</span>
          {isMobile ? "Home" : "Return to Home"}
        </Link>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: isMobile ? "8px" : "12px",
            alignItems: "center",
            justifyContent: isMobile ? "space-between" : "flex-end",
          }}
        >
          <Link href="/profile" style={navButtonStyle}>
            {isMobile ? "Account" : "My Account"}
          </Link>

          <div style={{ position: "relative", zIndex: 42 }}>
            <button
              type="button"
              onClick={() => setTokenTransactionsOpen((current) => !current)}
              aria-expanded={tokenTransactionsOpen}
              aria-haspopup="menu"
              style={{
                ...navButtonStyle,
                padding: isMobile ? "0 12px" : "0 18px 0 16px",
                border: "1px solid rgba(83,215,255,0.34)",
                boxShadow: tokenTransactionsOpen
                  ? "0 0 30px rgba(83,215,255,0.24)"
                  : "0 0 22px rgba(83,215,255,0.12)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  width: isMobile ? "19px" : "22px",
                  height: isMobile ? "19px" : "22px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#8ee8ff",
                  background: "rgba(83,215,255,0.15)",
                  border: "1px solid rgba(83,215,255,0.35)",
                  flexShrink: 0,
                }}
              >
                ✦
              </span>

              {isMobile
                ? `DT ${dreamTokens}`
                : `Dreamscape Tokens ${dreamTokens}`}

              <span
                aria-hidden="true"
                style={{
                  marginLeft: isMobile ? "2px" : "4px",
                  color: "#8ee8ff",
                  fontSize: "15px",
                  transform: tokenTransactionsOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              >
                ▾
              </span>
            </button>

            {tokenTransactionsOpen && (
              <div
                role="menu"
                className="milo-scrollbar"
                style={{
                  position: isMobile ? "fixed" : "absolute",
                  top: isMobile ? "108px" : "calc(100% + 10px)",
                  right: isMobile ? "12px" : 0,
                  width: isMobile ? "min(360px, calc(100vw - 24px))" : "380px",
                  maxHeight: "min(520px, calc(100dvh - 92px))",
                  overflowY: "auto",
                  borderRadius: "20px",
                  border: "1px solid rgba(126,232,255,0.3)",
                  background:
                    "linear-gradient(145deg, rgba(3,20,39,0.98), rgba(3,10,25,0.99))",
                  boxShadow:
                    "0 28px 72px rgba(0,0,0,0.56), 0 0 28px rgba(83,215,255,0.12)",
                  backdropFilter: "blur(22px)",
                  WebkitBackdropFilter: "blur(22px)",
                  overflowX: "hidden",
                  color: "white",
                }}
              >
                <div
                  style={{
                    padding: "18px 18px 14px",
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
                    Dreamscape Tokens
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
                      {dreamTokens} DT
                    </strong>

                    <Link
                      href="/profile"
                      onClick={() => setTokenTransactionsOpen(false)}
                      style={{
                        color: "#bdf6ff",
                        fontSize: "11px",
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      View account →
                    </Link>
                  </div>
                </div>

                <div style={{ padding: "12px" }}>
                  <p
                    style={{
                      margin: "0 4px 10px",
                      color: "rgba(255,255,255,0.48)",
                      fontSize: "10px",
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      fontWeight: 800,
                    }}
                  >
                    Latest transactions
                  </p>

                  {tokenTransactionsLoading ? (
                    <div
                      style={{
                        padding: "24px 14px",
                        color: "rgba(255,255,255,0.58)",
                        fontSize: "13px",
                        textAlign: "center",
                      }}
                    >
                      Loading transactions...
                    </div>
                  ) : !userEmail ? (
                    <Link
                      href="/login"
                      onClick={() => setTokenTransactionsOpen(false)}
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
                        fontWeight: 850,
                      }}
                    >
                      Log in to view transactions
                    </Link>
                  ) : tokenTransactions.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 14px",
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
                                  lineHeight: 1.35,
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

          <Link
            href="/cart"
            aria-label="Open cart"
            style={{
              ...navButtonStyle,
              width: isMobile ? "42px" : "48px",
              padding: 0,
              fontSize: isMobile ? "17px" : "19px",
            }}
          >
            🛒
          </Link>
        </div>
      </header>

      <ReferralObjectivesPanel
        isLoggedIn={Boolean(userEmail)}
        referralCount={referralCount}
        claimedMilestones={claimedMilestones}
        isLoading={objectivesLoading}
        screenMode={screenMode}
      />

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          top: isDesktop ? "88px" : "auto",
          left: isDesktop ? "56px" : "auto",
          zIndex: 12,
          width: isDesktop
            ? "auto"
            : isTablet
              ? "min(720px, calc(100% - 36px))"
              : "min(720px, calc(100% - 28px))",
          margin: isDesktop
            ? 0
            : isMobile
              ? "38px auto 24px"
              : "58px auto 28px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? "clamp(44px, 14vw, 62px)"
              : isTablet
                ? "clamp(62px, 9vw, 74px)"
                : "74px",
            fontWeight: 400,
            lineHeight: 0.95,
            color: "white",
            letterSpacing: "0.01em",
            textShadow: "0 18px 60px rgba(0,0,0,0.45)",
          }}
        >
          Milo’s World
        </h1>

        <p
          style={{
            margin: isMobile ? "16px 0 0" : "22px 0 0",
            fontSize: isMobile ? "18px" : "25px",
            fontWeight: 300,
            letterSpacing: "0.02em",
            color: "rgba(255,255,255,0.82)",
            textShadow: "0 8px 30px rgba(0,0,0,0.45)",
          }}
        >
          Play, earn, build, and trade inside Dreamscape.
        </p>

        <div
          style={{
            marginTop: isMobile ? "24px" : "38px",
            display: "inline-flex",
            alignItems: "center",
            gap: "16px",
            color: "#8ee8ff",
            fontSize: isMobile ? "16px" : "18px",
            fontWeight: 400,
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(83,215,255,0.46)",
              background: "rgba(83,215,255,0.12)",
              fontSize: "22px",
              flexShrink: 0,
            }}
          >
            ›
          </span>
          Choose a zone to begin
        </div>
      </section>

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          inset: isDesktop ? 0 : "auto",
          zIndex: 10,
          width: isDesktop
            ? "100%"
            : isTablet
              ? "min(720px, calc(100% - 36px))"
              : "min(720px, calc(100% - 28px))",
          height: isDesktop ? "100%" : "auto",
          margin: isDesktop ? 0 : "0 auto",
          display: isDesktop ? "block" : "grid",
          gridTemplateColumns: "1fr",
          gap: isMobile ? "14px" : "16px",
        }}
      >
        {ZONES.map((zone) => (
          <ZoneCard
            key={zone.number}
            zone={zone}
            screenMode={screenMode}
            onOpenMembership={() => setMembershipOpen(true)}
          />
        ))}
      </section>

      <img
        src="/milo-world/milo-character.png"
        alt="Milo"
        style={{
          position: "fixed",
          right: isDesktop ? "88px" : isMobile ? "-42px" : "12px",
          bottom: isDesktop ? "88px" : "0px",
          height: isDesktop ? "260px" : isMobile ? "180px" : "230px",
          width: "auto",
          zIndex: 15,
          objectFit: "contain",
          filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.58))",
          pointerEvents: "none",
        }}
      />

      <button
        type="button"
        onClick={() => setIntroOpen(true)}
        style={{
          position: "fixed",
          right: isDesktop ? "250px" : isMobile ? "100px" : "210px",
          left: isMobile ? "14px" : "auto",
          bottom: isDesktop ? "48px" : "16px",
          width: isDesktop ? "360px" : isMobile ? "auto" : "330px",
          minHeight: isMobile ? "74px" : "82px",
          display: "grid",
          gridTemplateColumns: isMobile ? "48px 1fr" : "64px 1fr",
          gap: isMobile ? "10px" : "18px",
          alignItems: "center",
          padding: isMobile ? "12px" : "16px 20px",
          borderRadius: "14px",
          color: "white",
          textAlign: "left",
          cursor: "pointer",
          border: "1px solid rgba(132,218,255,0.2)",
          background: "rgba(5,13,28,0.66)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 22px 54px rgba(0,0,0,0.34)",
          zIndex: 16,
        }}
      >
        <span
          style={{
            width: isMobile ? "44px" : "52px",
            height: isMobile ? "44px" : "52px",
            borderRadius: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? "19px" : "22px",
            color: "#8ee8ff",
            background:
              "radial-gradient(circle, rgba(83,215,255,0.2), rgba(2,8,19,0.88))",
            border: "1px solid rgba(83,215,255,0.45)",
            flexShrink: 0,
          }}
        >
          ✦
        </span>

        <span>
          <strong
            style={{
              display: "block",
              fontSize: isMobile ? "14px" : "16px",
              marginBottom: "6px",
            }}
          >
            Hi, I’m Milo!
          </strong>

          <span
            style={{
              display: "block",
              color: "rgba(255,255,255,0.7)",
              fontSize: isMobile ? "12px" : "13px",
              lineHeight: 1.45,
            }}
          >
            Click me to learn about Milo’s World.
          </span>
        </span>
      </button>

      <IntroDialogue open={introOpen} onClose={() => setIntroOpen(false)} />

      <MembershipPopup
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
      />
    </main>
  );
}
