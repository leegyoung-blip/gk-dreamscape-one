"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import ObjectivesPanel, {
  type CurrentObjectivesStatus,
} from "@/components/objectives/ObjectivesPanel";
import {
  WorldZoneAdminBar,
  ZoneUnderUpgradeModal,
} from "@/components/world/WorldZoneAccess";

type ScreenMode = "desktop" | "tablet" | "mobile";

type MiloZoneKey =
  | "activity_lab"
  | "exchange"
  | "business_builder"
  | "bank"
  | "quiz_hall";

type MiloZoneAccessSettings = Record<MiloZoneKey, boolean>;

const DEFAULT_MILO_ZONE_ACCESS: MiloZoneAccessSettings = {
  activity_lab: true,
  exchange: true,
  business_builder: false,
  bank: true,
  quiz_hall: true,
};

const MILO_ZONE_KEYS: MiloZoneKey[] = [
  "activity_lab",
  "exchange",
  "business_builder",
  "bank",
  "quiz_hall",
];

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

type MiloClubProfile = {
  role: string | null;
};

type MiloZoneCategory = "learn" | "apply" | "play";

type Zone = {
  number: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  accessKey: MiloZoneKey;
  category: MiloZoneCategory;
  categoryLabel: string;
  primary?: boolean;
  adminOnly?: boolean;
  statusLabel?: string;
};

type WalkthroughStep = {
  eyebrow: string;
  title: string;
  text: string;
  zoneNumber?: string;
};


const WALKTHROUGH_STORAGE_KEY = "milo-world-walkthrough-completed-v3";

const ZONES: Zone[] = [
  {
    number: "1",
    icon: "▣",
    title: "Activity Lab",
    description:
      "Play quick challenges, practise what you know and earn Dream Tokens along the way.",
    href: "/milo-world/activity-lab",
    accessKey: "activity_lab",
    category: "play",
    categoryLabel: "Play & Learn",
  },
  {
    number: "2",
    icon: "◈",
    title: "Milo’s Exchange",
    description:
      "Put financial knowledge into practice through fictional stocks, property and market decisions.",
    href: "/milo-world/exchange",
    accessKey: "exchange",
    category: "apply",
    categoryLabel: "Apply Your Knowledge",
  },
  {
    number: "3",
    icon: "★",
    title: "Milo’s Business Builder",
    description:
      "Build a business, make real trade-offs and see how your decisions affect what happens next.",
    href: "/milo-world/club",
    accessKey: "business_builder",
    category: "apply",
    categoryLabel: "Apply Your Knowledge",
  },
  {
    number: "4",
    icon: "◆",
    title: "Milo’s Bank",
    description:
      "Start here to build strong financial basics, learn how money works and practise smarter money decisions.",
    href: "/milo-world/bank",
    accessKey: "bank",
    category: "learn",
    categoryLabel: "Start Here · Learn",
    primary: true,
  },
  {
    number: "5",
    icon: "◉",
    title: "Creator Clubs",
    description:
      "Join interest-based communities, create and play challenges, and explore Dreamscape’s Categories activities.",
    href: "/milo-world/quiz-hall",
    accessKey: "quiz_hall",
    category: "play",
    categoryLabel: "Play & Learn",
  },
];

const DESKTOP_ZONE_MARKERS: Record<
  string,
  { left: string; top: string }
> = {
  "1": { left: "13%", top: "34%" },
  "2": { left: "13%", top: "72%" },
  "3": { left: "82%", top: "72%" },
  "4": { left: "82%", top: "34%" },
  "5": { left: "50%", top: "72%" },
};

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    eyebrow: "Welcome",
    title: "Milo’s World has a path.",
    text:
      "Hey! I’m Milo. Instead of five equal places, I’ll show you the easiest way to use this world: learn the basics first, put them into practice, then explore and play.",
  },
  {
    eyebrow: "The Milo Path",
    title: "Learn → Apply → Play & Explore",
    text:
      "Gold is your learning hub, emerald is where you apply financial and business ideas, and blue is for lighter challenges, clubs and exploration. You can visit anywhere, but this path gives you the clearest place to begin.",
  },
  {
    eyebrow: "Step 1 · Learn",
    title: "Start at Milo’s Bank.",
    text:
      "Milo’s Bank is the main financial learning hub. Build strong money basics here first through lessons, practice and simulations, then take those ideas into the rest of Milo’s World.",
    zoneNumber: "4",
  },
  {
    eyebrow: "Step 2 · Apply",
    title: "Use what you learn in Milo’s Exchange.",
    text:
      "The Exchange lets you practise with fictional stocks, property and market decisions without risking real money. It is where financial concepts start becoming choices.",
    zoneNumber: "2",
  },
  {
    eyebrow: "Step 2 · Apply",
    title: "Then build with Business Builder.",
    text:
      "Business Builder turns knowledge into entrepreneurship. Make decisions about costs, operations, people and growth, then see how those decisions shape your business.",
    zoneNumber: "3",
  },
  {
    eyebrow: "Step 3 · Play & Learn",
    title: "Activity Lab keeps learning light.",
    text:
      "Use Activity Lab for quick challenges, social games and practice. It is a lower-pressure way to keep learning, compete and earn Dream Tokens.",
    zoneNumber: "1",
  },
  {
    eyebrow: "Step 3 · Play & Learn",
    title: "Creator Clubs adds community.",
    text:
      "Join interest-based communities, create and play challenges, and explore Categories activities with other learners. This is the social and creative side of Milo’s World.",
    zoneNumber: "5",
  },
  {
    eyebrow: "Your Turn",
    title: "Ready to begin?",
    text:
      "If you’re new to Milo’s World, I recommend starting with Milo’s Bank. You can also jump straight into applying your knowledge or choose a play-and-learn activity.",
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
      // Keep the spatial world-map layout on normal landscape desktops/laptops.
      // Only collapse to the stacked layout when the viewport is genuinely
      // narrow/windowed or portrait.
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

      @keyframes miloTokenArrive {
        0% { opacity: 0; transform: translateY(14px) scale(0.72) rotate(-12deg); }
        65% { opacity: 1; transform: translateY(-4px) scale(1.08) rotate(3deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
      }

      @keyframes miloAssetArrive {
        0% { opacity: 0; transform: translateX(14px) scale(0.86); }
        100% { opacity: 1; transform: translateX(0) scale(1); }
      }

      @keyframes miloFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      @media (prefers-reduced-motion: reduce) {
        .milo-guide-token,
        .milo-guide-asset { animation: none !important; }
      }
    `}</style>
  );
}

const MILO_ZONE_THEMES: Record<
  MiloZoneCategory,
  {
    accent: string;
    border: string;
    borderStrong: string;
    glow: string;
    glowStrong: string;
    iconBackground: string;
    cardBackground: string;
    cardBackgroundStrong: string;
  }
> = {
  learn: {
    accent: "#ffd67a",
    border: "rgba(255,208,92,0.42)",
    borderStrong: "rgba(255,216,122,0.92)",
    glow: "rgba(255,190,65,0.18)",
    glowStrong: "rgba(255,190,65,0.42)",
    iconBackground:
      "radial-gradient(circle, rgba(255,208,92,0.24), rgba(31,22,5,0.9))",
    cardBackground:
      "linear-gradient(145deg, rgba(42,30,7,0.82), rgba(10,13,22,0.9))",
    cardBackgroundStrong:
      "linear-gradient(145deg, rgba(64,44,8,0.96), rgba(12,15,24,0.98))",
  },
  apply: {
    accent: "#8ff1c5",
    border: "rgba(91,220,163,0.38)",
    borderStrong: "rgba(143,241,197,0.9)",
    glow: "rgba(67,209,145,0.16)",
    glowStrong: "rgba(67,209,145,0.4)",
    iconBackground:
      "radial-gradient(circle, rgba(67,209,145,0.2), rgba(3,31,24,0.9))",
    cardBackground:
      "linear-gradient(145deg, rgba(5,43,31,0.8), rgba(6,15,24,0.9))",
    cardBackgroundStrong:
      "linear-gradient(145deg, rgba(6,63,44,0.95), rgba(6,17,26,0.98))",
  },
  play: {
    accent: "#8ee8ff",
    border: "rgba(83,215,255,0.36)",
    borderStrong: "rgba(142,232,255,0.9)",
    glow: "rgba(83,215,255,0.16)",
    glowStrong: "rgba(83,215,255,0.4)",
    iconBackground:
      "radial-gradient(circle, rgba(83,215,255,0.2), rgba(2,8,19,0.88))",
    cardBackground:
      "linear-gradient(145deg, rgba(5,31,52,0.8), rgba(5,13,28,0.9))",
    cardBackgroundStrong:
      "linear-gradient(145deg, rgba(7,47,76,0.95), rgba(5,14,30,0.98))",
  },
};

function getZoneTheme(zone: Zone) {
  return MILO_ZONE_THEMES[zone.category];
}

function ZoneCard({
  zone,
  screenMode,
  isAdmin,
  onClick,
  walkthroughActive,
  walkthroughHighlighted,
}: {
  zone: Zone;
  screenMode: ScreenMode;
  isAdmin: boolean;
  onClick?: () => void;
  walkthroughActive: boolean;
  walkthroughHighlighted: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isMobile = screenMode === "mobile";
  const isUnavailable = Boolean(zone.adminOnly && !isAdmin);
  const isEmphasised = hovered || walkthroughHighlighted;
  const theme = getZoneTheme(zone);
  const isPrimary = Boolean(zone.primary);

  const cardStyle: CSSProperties = {
    position: "relative",
    minHeight: isPrimary
      ? isMobile
        ? "118px"
        : "132px"
      : isMobile
        ? "82px"
        : "94px",
    width: "100%",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "50px 1px minmax(0, 1fr) 24px"
      : "64px 1px minmax(0, 1fr) 32px",
    alignItems: "center",
    gap: isMobile ? "12px" : "18px",
    padding: isMobile ? "16px" : "20px 24px 20px 20px",
    borderRadius: "16px",
    border: isEmphasised
      ? `1px solid ${theme.borderStrong}`
      : isUnavailable
        ? "1px solid rgba(255,190,105,0.3)"
        : `1px solid ${theme.border}`,
    background: isEmphasised
      ? theme.cardBackgroundStrong
      : isUnavailable
        ? "rgba(30,20,18,0.72)"
        : theme.cardBackground,
    color: "white",
    textDecoration: "none",
    textAlign: "left",
    fontFamily: "inherit",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: walkthroughHighlighted
      ? `0 0 0 3px ${theme.glow}, 0 0 54px ${theme.glowStrong}, 0 28px 74px rgba(0,0,0,0.55)`
      : hovered && !isUnavailable
        ? `0 0 42px ${theme.glowStrong}, 0 26px 70px rgba(0,0,0,0.42)`
        : isPrimary
          ? `0 0 34px ${theme.glow}, 0 18px 42px rgba(0,0,0,0.34)`
          : "0 14px 34px rgba(0,0,0,0.3)",
    opacity:
      walkthroughActive && !walkthroughHighlighted
        ? 0.2
        : isUnavailable
          ? 0.76
          : isEmphasised
            ? 1
            : 0.88,
    filter:
      walkthroughActive && !walkthroughHighlighted
        ? "saturate(0.35) brightness(0.5)"
        : isUnavailable
          ? "saturate(0.72) brightness(0.9)"
          : isEmphasised
            ? "none"
            : "saturate(0.86) brightness(0.94)",
    transition:
      "transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease, opacity 260ms ease, filter 260ms ease, background 260ms ease",
    zIndex: walkthroughHighlighted ? 4 : hovered ? 3 : 1,
    cursor: walkthroughActive ? "default" : "pointer",
    pointerEvents: walkthroughActive ? "none" : "auto",
    transform:
      isEmphasised && !isUnavailable ? "translateY(-4px) scale(1.012)" : "none",
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
          color: isUnavailable ? "#ffd18a" : theme.accent,
          background: isUnavailable
            ? "radial-gradient(circle, rgba(255,189,115,0.18), rgba(24,14,12,0.9))"
            : theme.iconBackground,
          border: isUnavailable
            ? "1px solid rgba(255,189,115,0.4)"
            : `1px solid ${theme.border}`,
          boxShadow: isUnavailable
            ? "0 0 20px rgba(255,189,115,0.12)"
            : `0 0 22px ${theme.glow}, inset 0 0 18px ${theme.glow}`,
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

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {isPrimary && (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: `1px solid ${theme.border}`,
                    background: theme.glow,
                    color: theme.accent,
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Start Here
                </span>
              )}
              <h3
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
              </h3>

              {zone.statusLabel && (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,189,115,0.35)",
                    background: "rgba(255,189,115,0.1)",
                    color: "#ffd18a",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {zone.statusLabel}
                </span>
              )}
            </div>

            {!isMobile && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: theme.accent,
                  fontSize: "9px",
                  lineHeight: 1.35,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {zone.categoryLabel}
              </p>
            )}

            {!isMobile && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "rgba(255,255,255,0.64)",
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
          color: isUnavailable ? "rgba(255,209,138,0.6)" : "rgba(255,255,255,0.78)",
        }}
      >
        {isUnavailable ? "•" : "→"}
      </div>
    </>
  );

  const commonProps = {
    id: `milo-zone-${zone.number}`,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: cardStyle,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        isUnavailable
          ? `View ${zone.title}, coming soon`
          : `View ${zone.title}`
      }
      {...commonProps}
      style={{
        ...cardStyle,
        appearance: "none",
      }}
    >
      {content}
    </button>
  );
}

function MiloZoneHotspot({
  zone,
  isAdmin,
  isWalkthroughActive,
  isHighlighted,
  isActive,
  onEnter,
  onLeave,
  onClick,
}: {
  zone: Zone;
  isAdmin: boolean;
  isWalkthroughActive: boolean;
  isHighlighted: boolean;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const isUnavailable = Boolean(zone.adminOnly && !isAdmin);
  const position = DESKTOP_ZONE_MARKERS[zone.number];
  const theme = getZoneTheme(zone);
  const isPrimary = Boolean(zone.primary);

  return (
    <button
      id={`milo-zone-${zone.number}`}
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={() => {
        if (!isWalkthroughActive) onClick();
      }}
      aria-label={
        isUnavailable
          ? `View ${zone.title}, coming soon`
          : `View ${zone.title}`
      }
      style={{
        position: "absolute",
        zIndex: isHighlighted ? 92 : isActive ? 35 : 25,
        left: position.left,
        top: position.top,
        minHeight: isPrimary ? "46px" : "38px",
        padding: isPrimary ? "5px 14px 5px 5px" : "4px 11px 4px 4px",
        transform: isActive
          ? `translate(-50%, -50%) scale(${isPrimary ? 1.14 : 1.08})`
          : `translate(-50%, -50%) scale(${isPrimary ? 1.06 : 1})`,
        borderRadius: "999px",
        border: isActive
          ? isUnavailable
            ? "1px solid rgba(255,209,138,0.92)"
            : `1px solid ${theme.borderStrong}`
          : isUnavailable
            ? "1px solid rgba(255,209,138,0.5)"
            : `1px solid ${theme.border}`,
        background: isActive
          ? theme.cardBackgroundStrong
          : isUnavailable
            ? "rgba(48,31,21,0.72)"
            : theme.cardBackground,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: isUnavailable ? "#ffd18a" : "white",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        whiteSpace: "nowrap",
        cursor: isWalkthroughActive ? "default" : "pointer",
        outline: "none",
        fontFamily: "inherit",
        boxShadow: isActive
          ? isUnavailable
            ? "0 0 0 3px rgba(255,209,138,0.10), 0 0 24px rgba(255,209,138,0.28), 0 12px 28px rgba(0,0,0,0.34)"
            : `0 0 0 3px ${theme.glow}, 0 0 28px ${theme.glowStrong}, 0 12px 28px rgba(0,0,0,0.34)`
          : isUnavailable
            ? "0 0 15px rgba(255,209,138,0.12), 0 10px 24px rgba(0,0,0,0.24)"
            : isPrimary
              ? `0 0 28px ${theme.glowStrong}, 0 12px 30px rgba(0,0,0,0.26)`
              : `0 0 15px ${theme.glow}, 0 10px 24px rgba(0,0,0,0.24)`,
        opacity:
          isWalkthroughActive && !isHighlighted
            ? 0.14
            : isUnavailable
              ? 0.82
              : 1,
        filter:
          isWalkthroughActive && !isHighlighted
            ? "saturate(0.3) brightness(0.45)"
            : isUnavailable
              ? "saturate(0.72)"
              : "none",
        pointerEvents:
          isWalkthroughActive && !isHighlighted ? "none" : "auto",
        transition:
          "transform 200ms ease, opacity 200ms ease, filter 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "999px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: isUnavailable
            ? "1px solid rgba(255,209,138,0.78)"
            : `1px solid ${theme.borderStrong}`,
          background: isUnavailable
            ? "rgba(255,209,138,0.08)"
            : theme.glow,
          color: isUnavailable ? "#ffd18a" : theme.accent,
          fontSize: "11px",
          fontWeight: 950,
          boxShadow: isUnavailable
            ? "0 0 12px rgba(255,209,138,0.16)"
            : "0 0 12px rgba(83,215,255,0.22)",
        }}
      >
        {zone.number}
      </span>

      <span
        style={{
          fontSize: "11px",
          lineHeight: 1,
          letterSpacing: "0.04em",
          fontWeight: 850,
        }}
      >
        {zone.title}
      </span>

      {isPrimary && !isUnavailable && (
        <span
          style={{
            padding: "3px 7px",
            borderRadius: "999px",
            background: theme.glow,
            color: theme.accent,
            fontSize: "8px",
            fontWeight: 950,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
          }}
        >
          Start Here
        </span>
      )}
    </button>
  );
}

function MiloZoneHoverPopup({
  zone,
  isAdmin,
  isHighlighted,
  isSelected = false,
  onClose,
  onEnterLocation,
}: {
  zone: Zone;
  isAdmin: boolean;
  isHighlighted: boolean;
  isSelected?: boolean;
  onClose?: () => void;
  onEnterLocation?: () => void;
}) {
  const marker = DESKTOP_ZONE_MARKERS[zone.number];
  const isUnavailable = Boolean(zone.adminOnly && !isAdmin);
  const theme = getZoneTheme(zone);
  const shouldOpenBelow = zone.number === "1" || zone.number === "4";
  const isLeftSideZone = zone.number === "1" || zone.number === "2";
  const horizontalPopupTransform = isLeftSideZone ? "-12%" : "-50%";

  return (
    <div
      style={{
        position: "absolute",
        zIndex: isSelected ? 70 : 60,
        left: marker.left,
        top: marker.top,
        width: "min(330px, calc(100vw - 24px))",
        maxWidth: "calc(100vw - 24px)",
        transform: shouldOpenBelow
          ? `translate(${horizontalPopupTransform}, 46px)${
              isHighlighted || isSelected ? " scale(1.025)" : ""
            }`
          : `translate(${horizontalPopupTransform}, calc(-100% - 46px))${
              isHighlighted || isSelected ? " scale(1.025)" : ""
            }`,
        borderRadius: "20px",
        border: `${isHighlighted || isSelected ? 2 : 1}px solid ${
          isUnavailable ? "rgba(255,209,138,0.86)" : theme.borderStrong
        }`,
        background: isUnavailable
          ? "linear-gradient(145deg, rgba(48,31,21,0.97), rgba(16,12,10,0.985))"
          : theme.cardBackgroundStrong,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow:
          isHighlighted || isSelected
            ? isUnavailable
              ? "0 0 0 6px rgba(255,209,138,0.08), 0 0 38px rgba(255,209,138,0.22), 0 24px 60px rgba(0,0,0,0.52)"
              : `0 0 0 6px ${theme.glow}, 0 0 40px ${theme.glowStrong}, 0 24px 60px rgba(0,0,0,0.52)`
            : `0 0 24px ${theme.glow}, 0 20px 48px rgba(0,0,0,0.42)`,
        padding: isSelected ? "22px 23px 20px" : "20px 22px",
        pointerEvents: isSelected ? "auto" : "none",
        color: "white",
        transition:
          "border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease",
      }}
    >
      {isSelected && (
        <button
          type="button"
          aria-label="Close location details"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "30px",
            height: "30px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontSize: "17px",
          }}
        >
          ×
        </button>
      )}

      <p
        style={{
          margin: 0,
          color: isUnavailable ? "#ffd18a" : theme.accent,
          fontSize: "10px",
          letterSpacing: "0.17em",
          textTransform: "uppercase",
          fontWeight: 850,
        }}
      >
        Location {zone.number}
        {isUnavailable ? " · Coming Soon" : ""}
      </p>

      <h2
        style={{
          margin: "8px 34px 0 0",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "25px",
          lineHeight: 1.12,
          fontWeight: 500,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "11px 0 0",
          color: "rgba(255,255,255,0.72)",
          fontSize: "13px",
          lineHeight: 1.55,
        }}
      >
        {zone.description}
      </p>

      {isSelected ? (
        isUnavailable ? (
          <div
            style={{
              marginTop: "16px",
              minHeight: "42px",
              borderRadius: "13px",
              border: "1px solid rgba(255,209,138,0.28)",
              background: "rgba(255,209,138,0.07)",
              color: "#ffd18a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            Coming Soon
          </div>
        ) : (
          <button
            type="button"
            onClick={onEnterLocation}
            style={{
              marginTop: "16px",
              width: "100%",
              minHeight: "44px",
              borderRadius: "13px",
              border: `1px solid ${theme.borderStrong}`,
              background: theme.cardBackgroundStrong,
              color: "white",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              boxShadow: "0 10px 24px rgba(83,215,255,0.12)",
            }}
          >
            {zone.adminOnly ? "Enter Admin Preview" : `Enter ${zone.title}`} →
          </button>
        )
      ) : (
        <div
          style={{
            marginTop: "15px",
            color: isUnavailable ? "#ffd18a" : "#8ee8ff",
            fontSize: "10px",
            fontWeight: 850,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {isUnavailable
            ? "Select for details"
            : "Select this location to continue"}
        </div>
      )}
    </div>
  );
}

function CompactMiloZoneInfoCard({
  zone,
  isAdmin,
  onClose,
  onEnter,
}: {
  zone: Zone;
  isAdmin: boolean;
  onClose: () => void;
  onEnter: () => void;
}) {
  const isUnavailable = Boolean(zone.adminOnly && !isAdmin);
  const theme = getZoneTheme(zone);

  return (
    <>
      <button
        type="button"
        aria-label="Close location details"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 73,
          border: "none",
          background: "rgba(0,3,12,0.48)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          cursor: "default",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${zone.title} details`}
        style={{
          position: "fixed",
          left: "50%",
          bottom: "14px",
          zIndex: 74,
          width: "min(520px, calc(100% - 24px))",
          transform: "translateX(-50%)",
          borderRadius: "22px",
          border: isUnavailable
            ? "1px solid rgba(255,209,138,0.58)"
            : `1px solid ${theme.borderStrong}`,
          background: isUnavailable
            ? "linear-gradient(145deg, rgba(48,31,21,0.985), rgba(17,12,10,0.99))"
            : theme.cardBackgroundStrong,
          boxShadow: isUnavailable
            ? "0 0 30px rgba(255,209,138,0.14), 0 28px 72px rgba(0,0,0,0.58)"
            : `0 0 30px ${theme.glowStrong}, 0 28px 72px rgba(0,0,0,0.58)`,
          color: "white",
          padding: "20px",
        }}
      >
        <button
          type="button"
          aria-label="Close location details"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.17)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingRight: "38px",
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              border: isUnavailable
                ? "1px solid rgba(255,209,138,0.72)"
                : `1px solid ${theme.borderStrong}`,
              background: isUnavailable
                ? "rgba(255,209,138,0.08)"
                : theme.glow,
              color: isUnavailable ? "#ffd18a" : theme.accent,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "12px",
              fontWeight: 950,
            }}
          >
            {zone.number}
          </span>

          <div>
            <p
              style={{
                margin: 0,
                color: isUnavailable ? "#ffd18a" : theme.accent,
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 850,
              }}
            >
              Milo’s World Location
              {isUnavailable ? " · Coming Soon" : ""}
            </p>

            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "24px",
                lineHeight: 1.08,
                fontWeight: 500,
              }}
            >
              {zone.title}
            </h2>
          </div>
        </div>

        <p
          style={{
            margin: "14px 0 0",
            color: "rgba(255,255,255,0.76)",
            fontSize: "13px",
            lineHeight: 1.55,
          }}
        >
          {zone.description}
        </p>

        {isUnavailable ? (
          <div
            style={{
              marginTop: "17px",
              minHeight: "46px",
              borderRadius: "14px",
              border: "1px solid rgba(255,209,138,0.28)",
              background: "rgba(255,209,138,0.07)",
              color: "#ffd18a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            Coming Soon
          </div>
        ) : (
          <button
            type="button"
            onClick={onEnter}
            style={{
              marginTop: "17px",
              width: "100%",
              minHeight: "46px",
              borderRadius: "14px",
              border: `1px solid ${theme.borderStrong}`,
              background: theme.cardBackgroundStrong,
              color: "white",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            {zone.adminOnly ? "Enter Admin Preview" : `Enter ${zone.title}`} →
          </button>
        )}
      </div>
    </>
  );
}


function getMiloGuidePosition(
  zoneNumber: string | undefined,
  screenMode: ScreenMode,
): CSSProperties {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  if (!isDesktop) {
    const openAtTop = Boolean(
      zoneNumber && ["2", "3", "5"].includes(zoneNumber),
    );

    return {
      left: isMobile ? "12px" : "50%",
      right: isMobile ? "12px" : "auto",
      top: openAtTop ? (isMobile ? "12px" : "18px") : "auto",
      bottom: openAtTop ? "auto" : isMobile ? "12px" : "18px",
      transform: isMobile ? "none" : "translateX(-50%)",
    };
  }

  switch (zoneNumber) {
    case "1":
      // Activity Lab: marker is upper-left, so keep Milo lower-right.
      return { right: "26px", bottom: "26px" };
    case "2":
      // Exchange: marker is lower-left. This fixes the old Slide 4 overlap.
      return { right: "26px", top: "92px" };
    case "3":
      // Business Builder: marker is lower-right.
      return { left: "26px", top: "92px" };
    case "4":
      // Milo’s Bank: marker is upper-right.
      return { left: "26px", bottom: "26px" };
    case "5":
      // Quiz Hall: marker is lower-centre.
      return { right: "26px", top: "92px" };
    default:
      return { left: "26px", bottom: "26px" };
  }
}

function GuidedWalkthrough({
  open,
  stepIndex,
  isAdmin,
  onStepChange,
  onClose,
  onNavigate,
}: {
  open: boolean;
  stepIndex: number;
  isAdmin: boolean;
  onStepChange: (nextStep: number) => void;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const useFullWalkthroughLayout = !isMobile;
  const step = WALKTHROUGH_STEPS[stepIndex] ?? WALKTHROUGH_STEPS[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === WALKTHROUGH_STEPS.length - 1;
  const isCurrencyStep = stepIndex === 1;
  const isLocationStep = Boolean(step.zoneNumber);
  const [typedLength, setTypedLength] = useState(0);
  const guidePosition = getMiloGuidePosition(step.zoneNumber, screenMode);

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

  const primaryActionStyle: CSSProperties = {
    minHeight: "42px",
    padding: "0 18px",
    borderRadius: "12px",
    border: "1px solid rgba(83,215,255,0.42)",
    background: "rgba(83,215,255,0.16)",
    color: "white",
    cursor: "pointer",
    fontWeight: 850,
    fontFamily: "inherit",
  };

  const secondaryActionStyle: CSSProperties = {
    minHeight: "42px",
    padding: "0 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 750,
    fontFamily: "inherit",
  };

  function renderStepActions() {
    if (stepIndex === 0) {
      return (
        <>
          <button
            type="button"
            onClick={() => onStepChange(1)}
            style={primaryActionStyle}
          >
            Show me the path
          </button>
          <button type="button" onClick={onClose} style={secondaryActionStyle}>
            Maybe later
          </button>
        </>
      );
    }

    if (isLastStep) {
      const choiceStyle: CSSProperties = {
        ...secondaryActionStyle,
        minHeight: "48px",
        width: isMobile ? "100%" : "auto",
        flex: isMobile ? "1 1 100%" : "1 1 150px",
        justifyContent: "center",
      };

      const bankChoiceStyle: CSSProperties = {
        ...choiceStyle,
        border: "1px solid rgba(255,216,122,0.72)",
        background:
          "linear-gradient(135deg, rgba(255,199,79,0.24), rgba(81,55,8,0.92))",
        color: "#fff4cf",
        boxShadow: "0 0 24px rgba(255,190,65,0.16)",
      };

      return (
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/bank")}
            style={{
              ...bankChoiceStyle,
              gridColumn: isMobile ? "auto" : "1 / -1",
            }}
          >
            Start at Milo’s Bank
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/milo-world/exchange")}
            style={choiceStyle}
          >
            Explore the Exchange
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/milo-world/club")}
            style={choiceStyle}
          >
            Build a Business
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/milo-world/activity-lab")}
            style={choiceStyle}
          >
            Activity Lab
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/milo-world/quiz-hall")}
            style={choiceStyle}
          >
            Creator Clubs
          </button>
        </div>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => onStepChange(stepIndex - 1)}
          style={secondaryActionStyle}
        >
          Back
        </button>

        <button
          type="button"
          onClick={() => onStepChange(stepIndex + 1)}
          style={primaryActionStyle}
        >
          Next
        </button>
      </>
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(0, 3, 12, 0.74)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Milo’s World guided walkthrough"
        style={{
          position: "fixed",
          ...guidePosition,
          zIndex: 80,
          width: isMobile ? "auto" : "min(560px, calc(100vw - 72px))",
          maxHeight: isMobile ? "48dvh" : "none",
          overflowY: isMobile ? "auto" : "visible",
          borderRadius: isMobile ? "20px" : "26px",
          border: "1px solid rgba(142,232,255,0.4)",
          background:
            "linear-gradient(145deg, rgba(4,17,34,0.98), rgba(3,9,24,0.98))",
          boxShadow:
            "0 32px 90px rgba(0,0,0,0.68), 0 0 40px rgba(83,215,255,0.12)",
          color: "white",
          padding: isMobile
            ? "18px"
            : useFullWalkthroughLayout
              ? "26px 28px 24px 190px"
              : "20px",
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
          src="/milo-world/milo-character.png"
          alt="Milo"
          style={{
            position: isMobile ? "relative" : "absolute",
            left: isMobile ? "auto" : "18px",
            bottom: isMobile ? "auto" : "-8px",
            height: isMobile ? (isLocationStep ? "78px" : "92px") : "245px",
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
            fontSize: isMobile ? "25px" : "35px",
            lineHeight: 1.08,
            fontWeight: 500,
          }}
        >
          {step.title}
        </h2>

        <p
          style={{
            margin: "14px 0 0",
            minHeight: isMobile ? "58px" : "76px",
            color: "rgba(255,255,255,0.78)",
            fontSize: isMobile ? "14px" : "16px",
            lineHeight: 1.56,
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

        {isCurrencyStep && (
          <div
            style={{
              marginTop: "16px",
              padding: isMobile ? "12px" : "14px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "150px minmax(0,1fr)",
              gap: "12px",
              alignItems: "center",
              borderRadius: "18px",
              border: "1px solid rgba(83,215,255,0.2)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="milo-guide-token"
              style={{
                minHeight: "76px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                animation:
                  "miloTokenArrive 560ms ease-out both, miloFloat 2.6s ease-in-out 650ms infinite",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(83,215,255,0.68)",
                  background:
                    "radial-gradient(circle at 35% 30%, rgba(189,246,255,0.72), rgba(83,215,255,0.2) 38%, rgba(3,15,31,0.94) 72%)",
                  color: "#d9fbff",
                  fontSize: "17px",
                  fontWeight: 950,
                  boxShadow:
                    "0 0 28px rgba(83,215,255,0.36), inset 0 0 18px rgba(83,215,255,0.2)",
                }}
              >
                DT
              </span>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: "block", color: "white", fontSize: "13px" }}>
                  Dream Tokens
                </strong>
                <small style={{ color: "rgba(255,255,255,0.56)", lineHeight: 1.35 }}>
                  Earn · spend · invest
                </small>
              </span>
            </div>

            <div
              className="milo-guide-asset"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: "7px",
                animation: "miloAssetArrive 420ms ease-out 300ms both",
              }}
            >
              {["Cash", "Stocks", "Property"].map((label, index) => (
                <div
                  key={label}
                  style={{
                    minHeight: "58px",
                    padding: "8px 6px",
                    borderRadius: "12px",
                    border: "1px solid rgba(126,232,255,0.13)",
                    background: "rgba(83,215,255,0.055)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    textAlign: "center",
                  }}
                >
                  <span aria-hidden="true" style={{ color: "#8ee8ff", fontSize: "16px" }}>
                    {index === 0 ? "✦" : index === 1 ? "↗" : "⌂"}
                  </span>
                  <strong style={{ fontSize: "10px", color: "rgba(255,255,255,0.82)" }}>
                    {label}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: "18px",
            display: "flex",
            alignItems: isLastStep ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {!isLastStep && (
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
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: "9px",
              width: isLastStep ? "100%" : "auto",
            }}
          >
            {renderStepActions()}
          </div>
        </div>
      </div>
    </>
  );
}

function MembershipPlans() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const freeFeatures = [
    "Explore selected Milo’s World zones",
    "Play selected Activity Lab games",
    "Earn Dream Tokens through activities",
    "Use selected free Bank and Exchange experiences",
  ];

  const financeFeatures = [
    "Full Milo’s Bank financial literacy lessons",
    "Milo’s Business Builder access",
    "Exclusive Milo’s Exchange finance lessons",
    "Early access to selected property launches",
    "Additional property upgrade and development options",
    "Milo Finance progression and achievements",
  ];

  return (
    <div
      style={{
        borderRadius: "28px",
        border: "1px solid rgba(210, 151, 65, 0.38)",
        background:
          "radial-gradient(circle at 90% 8%, rgba(57,184,127,0.14), transparent 25%), linear-gradient(145deg, rgba(255,250,239,0.97), rgba(242,226,198,0.95))",
        padding: isMobile ? "22px 16px 26px" : "30px 42px 40px",
        color: "#1d140c",
        boxShadow:
          "0 24px 70px rgba(89, 54, 18, 0.16), inset 0 0 70px rgba(255,255,255,0.4)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            color: "#2f7d5d",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 900,
          }}
        >
          Milo Finance
        </p>

        <h3
          style={{
            margin: "10px 0 0",
            color: "#5a3617",
            fontSize: isMobile ? "28px" : "34px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
          }}
        >
          Learn money by actually using it.
        </h3>

        <p
          style={{
            margin: "13px auto 0",
            maxWidth: "760px",
            color: "rgba(29,20,12,0.62)",
            fontSize: isMobile ? "14px" : "15px",
            lineHeight: 1.65,
          }}
        >
          Explore Milo’s World for free, then unlock the complete financial literacy,
          business and market-learning experience with Milo Finance.
        </p>
      </div>

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
            minHeight: isDesktop ? "570px" : "auto",
            borderRadius: "26px",
            padding: isMobile ? "28px 22px" : "34px 30px",
            border: "1px solid rgba(115, 78, 38, 0.18)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,247,231,0.9))",
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
            Free Access
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
            Start exploring money, activities and selected Milo experiences before
            moving into the full Milo Finance pathway.
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
            {freeFeatures.map((feature) => (
              <li
                key={feature}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr",
                  gap: "12px",
                  alignItems: "start",
                  color: "rgba(29,20,12,0.78)",
                  fontSize: "14px",
                  lineHeight: 1.4,
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

          <div
            style={{
              marginTop: "auto",
              paddingTop: "30px",
            }}
          >
            <div
              style={{
                width: "100%",
                minHeight: "56px",
                borderRadius: "14px",
                border: "1px solid rgba(115,78,38,0.16)",
                background: "rgba(255,255,255,0.54)",
                color: "rgba(29,20,12,0.48)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15px",
                fontWeight: 900,
              }}
            >
              Free to Explore
            </div>
          </div>
        </article>

        <article
          style={{
            position: "relative",
            minHeight: isDesktop ? "570px" : "auto",
            borderRadius: "26px",
            overflow: "hidden",
            border: "1px solid rgba(47,125,93,0.48)",
            background:
              "radial-gradient(circle at 84% 10%, rgba(82,219,160,0.18), transparent 28%), linear-gradient(145deg, rgba(248,255,247,0.98), rgba(229,242,217,0.96))",
            boxShadow:
              "0 0 42px rgba(65,145,99,0.16), 0 26px 60px rgba(90,55,20,0.13)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              position: "relative",
              height: isMobile ? "180px" : "210px",
              overflow: "hidden",
              borderBottom: "1px solid rgba(47,125,93,0.14)",
              background: "#173626",
            }}
          >
            <img
              src="/milo-world/membership/milos-club-cover.png"
              alt="Milo Finance"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
                filter: "saturate(0.9) brightness(0.86)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(16,34,24,0.08), rgba(16,34,24,0.68))",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "18px",
                left: "18px",
                right: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <span
                style={{
                  minHeight: "32px",
                  padding: "0 13px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.42)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "rgba(38,112,80,0.86)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Coming Soon
              </span>

              <span
                style={{
                  minHeight: "32px",
                  padding: "0 13px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.38)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 900,
                  background: "rgba(0,0,0,0.42)",
                  backdropFilter: "blur(8px)",
                }}
              >
                SGD 12.90/month
              </span>
            </div>

            <div
              style={{
                position: "absolute",
                left: isMobile ? "20px" : "26px",
                right: isMobile ? "20px" : "26px",
                bottom: isMobile ? "18px" : "22px",
                color: "white",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#b8ffd9",
                  fontSize: "10px",
                  letterSpacing: "0.17em",
                  textTransform: "uppercase",
                  fontWeight: 900,
                }}
              >
                Financial Literacy · Business · Markets
              </p>
              <h4
                style={{
                  margin: "6px 0 0",
                  fontSize: isMobile ? "29px" : "36px",
                  lineHeight: 1.05,
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                }}
              >
                Milo Finance
              </h4>
            </div>
          </div>

          <div
            style={{
              padding: isMobile ? "26px 22px 28px" : "30px 30px 32px",
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(29,20,12,0.66)",
                fontSize: "15px",
                lineHeight: 1.6,
              }}
            >
              The complete Milo learning membership: learn financial concepts, apply
              them in Dreamscape, build a business and unlock deeper market and
              property experiences.
            </p>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "24px 0 0",
                display: "grid",
                gap: "13px",
              }}
            >
              {financeFeatures.map((feature) => (
                <li
                  key={feature}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr",
                    gap: "10px",
                    alignItems: "start",
                    color: "rgba(29,20,12,0.82)",
                    fontSize: "14px",
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{
                      color: "#2f7d5d",
                      fontWeight: 950,
                      fontSize: "16px",
                      lineHeight: 1.2,
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
                minHeight: "56px",
                borderRadius: "14px",
                border: "1px solid rgba(47,125,93,0.28)",
                background: "rgba(47,125,93,0.09)",
                color: "rgba(35,94,70,0.62)",
                fontSize: "15px",
                fontWeight: 900,
                cursor: "not-allowed",
              }}
            >
              Milo Finance Coming Soon
            </button>
          </div>
        </article>
      </div>

      <div
        style={{
          marginTop: "24px",
          padding: isMobile ? "20px" : "22px 26px",
          borderRadius: "22px",
          border: "1px solid rgba(111,70,28,0.16)",
          background: "rgba(255,255,255,0.48)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#8a4f13",
              fontSize: "10px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            Full Access · Coming Soon
          </p>
          <p
            style={{
              margin: "6px 0 0",
              color: "#1d140c",
              fontSize: isMobile ? "16px" : "18px",
              fontWeight: 900,
              lineHeight: 1.35,
            }}
          >
            Milo Finance is also included in Dreamscape Full Access.
          </p>
          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(29,20,12,0.6)",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Full Access combines NOVA+, Science and the complete Milo Finance experience.
          </p>
        </div>

        <Link
          href="/pricing"
          style={{
            minHeight: "44px",
            padding: "0 18px",
            borderRadius: "999px",
            border: "1px solid rgba(111,70,28,0.22)",
            background: "rgba(255,255,255,0.72)",
            color: "#5a3617",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontSize: "12px",
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          Compare Plans →
        </Link>
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
          aria-label="Close Milo Finance membership"
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

export default function MiloWorldPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isTablet = screenMode === "tablet";
  const isMobile = screenMode === "mobile";

  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [hoveredDesktopZone, setHoveredDesktopZone] = useState<Zone | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileAssets, setProfileAssets] = useState<ProfileAssetBreakdown>({
    cash: 0,
    property: 0,
    stocks: 0,
  });
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [profileAssetsOpen, setProfileAssetsOpen] = useState(false);
  const [profileAssetsLoading, setProfileAssetsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [zoneAccessSettings, setZoneAccessSettings] =
    useState<MiloZoneAccessSettings>(DEFAULT_MILO_ZONE_ACCESS);
  const [zoneAccessLoading, setZoneAccessLoading] = useState(true);
  const [updatingZoneAccess, setUpdatingZoneAccess] =
    useState<MiloZoneKey | null>(null);
  const [maintenanceZone, setMaintenanceZone] = useState<Zone | null>(null);
  const [zoneAccessMessage, setZoneAccessMessage] = useState("");
  const [objectiveStatus, setObjectiveStatus] =
    useState<CurrentObjectivesStatus | null>(null);
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
        setProfileAssets({ cash: 0, property: 0, stocks: 0 });
        setTokenTransactions([]);
        setProfileAssetsLoading(false);
        setProfileAssetsOpen(false);
        setObjectiveStatus(null);
        setIsAdmin(false);
        setObjectivesLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: clubProfile, error: clubProfileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (clubProfileError || !clubProfile) {
        console.warn(
          "Could not load Milo’s Club access:",
          clubProfileError?.message || "Profile not found",
        );
        setIsAdmin(false);
      } else {
        const profile = clubProfile as MiloClubProfile;
        const role = String(profile.role || "").trim().toLowerCase();
        setIsAdmin(role === "admin");
      }

      // Resolve the user's global Referral Objective + Milo Progress Objective.
      // The scoped RPC also settles a newly completed Milo Progress Objective
      // before the DT balance below is reloaded.
      const { data: objectiveData, error: objectiveError } = await supabase.rpc(
        "get_current_objectives",
        { p_scope: "milo" },
      );

      if (!isMounted) return;

      if (objectiveError) {
        console.warn(
          "Could not load Milo objectives:",
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

      setProfileAssetsLoading(false);
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
      "dream-objectives-updated",
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
        "dream-objectives-updated",
        loadDreamTokensAndObjectives,
      );
      window.removeEventListener(
        "dream-referral-objectives-updated",
        loadDreamTokensAndObjectives,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorldZoneAccess() {
      const { data, error } = await supabase
        .from("world_zone_settings")
        .select("zone_key,public_access_enabled")
        .eq("world_key", "milo")
        .in("zone_key", MILO_ZONE_KEYS);

      if (cancelled) return;

      if (error) {
        console.warn("Could not load Milo zone access settings:", error.message);
        setZoneAccessLoading(false);
        return;
      }

      const nextSettings: MiloZoneAccessSettings = {
        ...DEFAULT_MILO_ZONE_ACCESS,
      };

      for (const row of data || []) {
        const zoneKey = String(row.zone_key) as MiloZoneKey;
        if (zoneKey in nextSettings) {
          nextSettings[zoneKey] = Boolean(row.public_access_enabled);
        }
      }

      setZoneAccessSettings(nextSettings);
      setZoneAccessLoading(false);
    }

    function refreshWorldZoneAccess() {
      void loadWorldZoneAccess();
    }

    void loadWorldZoneAccess();
    window.addEventListener("world-zone-access-updated", refreshWorldZoneAccess);
    window.addEventListener("focus", refreshWorldZoneAccess);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "world-zone-access-updated",
        refreshWorldZoneAccess,
      );
      window.removeEventListener("focus", refreshWorldZoneAccess);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("open") === "membership") {
      setMembershipOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
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
    if (!activeZoneNumber) return;

    const timeout = window.setTimeout(() => {
      document.getElementById(`milo-zone-${activeZoneNumber}`)?.scrollIntoView({
        behavior: "smooth",
        block:
          isMobile && ["3", "4", "5"].includes(activeZoneNumber)
            ? "end"
            : "center",
      });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [isMobile, walkthroughOpen, walkthroughStep]);

  function startWalkthrough() {
    setProfileAssetsOpen(false);
    setMembershipOpen(false);
    setMenuOpen(false);
    setHoveredDesktopZone(null);
    setSelectedZone(null);
    setWalkthroughStep(0);
    setWalkthroughOpen(true);
  }

  function markWalkthroughComplete() {
    try {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
    } catch {
      // Navigation and closing still work if browser storage is unavailable.
    }
  }

  function closeWalkthrough() {
    markWalkthroughComplete();
    setWalkthroughOpen(false);
    setWalkthroughStep(0);
    setHoveredDesktopZone(null);
    setSelectedZone(null);
  }

  function isZonePubliclyOpen(zone: Zone) {
    return zoneAccessSettings[zone.accessKey];
  }

  function showUpgradeNotice(zone: Zone) {
    setHoveredDesktopZone(null);
    setSelectedZone(null);
    setMaintenanceZone(zone);
  }

  function selectZone(zone: Zone) {
    if (walkthroughOpen) return;

    if (!isAdmin && !isZonePubliclyOpen(zone)) {
      showUpgradeNotice(zone);
      return;
    }

    setHoveredDesktopZone(null);
    setSelectedZone(zone);
  }

  function enterZone(zone: Zone) {
    if (!isAdmin && !isZonePubliclyOpen(zone)) {
      showUpgradeNotice(zone);
      return;
    }

    window.location.href = zone.href;
  }

  function navigateFromWalkthrough(href: string) {
    const targetZone = ZONES.find((zone) => zone.href === href);

    markWalkthroughComplete();
    setWalkthroughOpen(false);
    setWalkthroughStep(0);

    if (targetZone && !isAdmin && !isZonePubliclyOpen(targetZone)) {
      showUpgradeNotice(targetZone);
      return;
    }

    window.location.href = href;
  }

  async function toggleZoneAccess(zoneKey: MiloZoneKey) {
    if (!isAdmin || updatingZoneAccess) return;

    const nextEnabled = !zoneAccessSettings[zoneKey];
    setUpdatingZoneAccess(zoneKey);
    setZoneAccessMessage("");

    const { error } = await supabase.rpc("admin_set_world_zone_access", {
      p_world_key: "milo",
      p_zone_key: zoneKey,
      p_public_access_enabled: nextEnabled,
    });

    if (error) {
      console.warn("Could not update Milo zone access:", error.message);
      setZoneAccessMessage(`Could not update access. ${error.message}`);
      setUpdatingZoneAccess(null);
      return;
    }

    setZoneAccessSettings((current) => ({
      ...current,
      [zoneKey]: nextEnabled,
    }));
    setUpdatingZoneAccess(null);

    const zoneTitle =
      ZONES.find((zone) => zone.accessKey === zoneKey)?.title || zoneKey;
    setZoneAccessMessage(
      `${zoneTitle} public access is now ${nextEnabled ? "OPEN" : "BLOCKED"}.`,
    );

    window.dispatchEvent(new Event("world-zone-access-updated"));
  }

  useEffect(() => {
    if (!profileAssetsOpen && !menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileAssetsOpen(false);
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen, profileAssetsOpen]);

  const worldZones: Zone[] = ZONES.map((zone) => {
    const enabled = zoneAccessSettings[zone.accessKey];
    return {
      ...zone,
      adminOnly: !isAdmin && !enabled,
      statusLabel: !enabled ? "Upgrading" : undefined,
    };
  });

  const bankZone = worldZones.find((zone) => zone.accessKey === "bank") ?? null;
  const applyZones = worldZones.filter((zone) => zone.category === "apply");
  const playZones = worldZones.filter((zone) => zone.category === "play");

  const activeWalkthroughZoneNumber = walkthroughOpen
    ? WALKTHROUGH_STEPS[walkthroughStep]?.zoneNumber ?? null
    : null;

  const activeWalkthroughZone = activeWalkthroughZoneNumber
    ? worldZones.find((zone) => zone.number === activeWalkthroughZoneNumber) ?? null
    : null;

  const displayedDesktopZone =
    activeWalkthroughZone ?? selectedZone ?? hoveredDesktopZone;

  const profileAssetsTotal =
    profileAssets.cash + profileAssets.property + profileAssets.stocks;

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

  const menuItemStyle: CSSProperties = {
    minHeight: "50px",
    padding: "0 14px",
    borderRadius: "13px",
    border: "1px solid rgba(126,232,255,0.14)",
    background: "rgba(255,255,255,0.035)",
    color: "white",
    textDecoration: "none",
    display: "grid",
    gridTemplateColumns: "28px minmax(0,1fr) 20px",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 800,
  };

  return (
    <main
      className="milo-scrollbar"
      style={{
        position: "relative",
        width: "100%",
        minHeight: isDesktop ? "880px" : "100dvh",
        height: isDesktop ? "100vh" : "auto",
        overflowX: "hidden",
        overflowY: "auto",
        paddingBottom: isDesktop ? "40px" : isMobile ? "190px" : "210px",
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

      {(profileAssetsOpen || menuOpen) && (
        <button
          type="button"
          aria-label="Close account panels"
          onClick={() => { setProfileAssetsOpen(false); setMenuOpen(false); }}
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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: isDesktop ? 0 : isMobile ? "12px" : "18px 22px 0",
        }}
      >
        <Link href="/" style={{...navButtonStyle, flexShrink: 0}}>
          <span style={{ fontSize: isMobile ? "14px" : "17px" }}>←</span>
          {isMobile ? "Home" : "Return to Home"}
        </Link>

        <div
          style={{
            display: "flex",
            gap: isMobile ? "7px" : "10px",
            alignItems: "center",
            justifyContent: "flex-end",
            minWidth: 0,
          }}
        >
          <div style={{ position: "relative", zIndex: 42 }}>
            <button
              type="button"
              onClick={() => setProfileAssetsOpen((current) => !current)}
              aria-expanded={profileAssetsOpen}
              aria-haspopup="menu"
              style={{
                ...navButtonStyle,
                padding: isMobile ? "0 10px" : "0 14px 0 12px",
                border: "1px solid rgba(83,215,255,0.34)",
                boxShadow: profileAssetsOpen
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
                ◈
              </span>

              <span>DT</span>
              <strong
                style={{
                  color: "#8ee8ff",
                  fontSize: isMobile ? "11px" : "13px",
                  letterSpacing: "0.02em",
                }}
              >
                {profileAssetsLoading
                  ? "..."
                  : Math.round(Number(profileAssets.cash || 0)).toLocaleString(
                      "en-SG",
                    )}
              </strong>

              <span
                aria-hidden="true"
                style={{
                  marginLeft: isMobile ? "2px" : "4px",
                  color: "#8ee8ff",
                  fontSize: "15px",
                  transform: profileAssetsOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              >
                ▾
              </span>
            </button>

            {profileAssetsOpen && (
              <div
                role="menu"
                className="milo-scrollbar"
                style={{
                  position: isMobile ? "fixed" : "absolute",
                  top: isMobile ? "64px" : "calc(100% + 10px)",
                  right: isMobile ? "12px" : 0,
                  width: isMobile ? "min(360px, calc(100vw - 24px))" : "380px",
                  maxHeight: "min(560px, calc(100dvh - 92px))",
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

                        <strong
                          style={{
                            color: "white",
                            fontSize: "13px",
                            lineHeight: 1.35,
                          }}
                        >
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
                        fontWeight: 850,
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

          <div style={{ position: "relative", zIndex: 43 }}>
            <button
              type="button"
              onClick={() => {
                setProfileAssetsOpen(false);
                setMenuOpen((current) => !current);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              style={{
                ...navButtonStyle,
                minWidth: isMobile ? "42px" : "96px",
                padding: isMobile ? "0 12px" : "0 17px",
                border: "1px solid rgba(126,232,255,0.38)",
                background: menuOpen ? "rgba(22,81,105,0.88)" : "rgba(5,13,28,0.7)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: "16px" }}>☰</span>
              {!isMobile && "Menu"}
            </button>

            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 9px)",
                  right: 0,
                  width: isMobile ? "min(300px, calc(100vw - 24px))" : "310px",
                  padding: "10px",
                  display: "grid",
                  gap: "8px",
                  borderRadius: "18px",
                  border: "1px solid rgba(126,232,255,0.28)",
                  background:
                    "linear-gradient(145deg, rgba(3,20,39,0.98), rgba(3,10,25,0.99))",
                  boxShadow:
                    "0 28px 72px rgba(0,0,0,0.58), 0 0 28px rgba(83,215,255,0.12)",
                  backdropFilter: "blur(22px)",
                  WebkitBackdropFilter: "blur(22px)",
                  color: "white",
                }}
              >
                <Link
                  href={userEmail ? "/profile" : "/login"}
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                >
                  <span aria-hidden="true">◎</span>
                  <span>{userEmail ? "My Account" : "Log In"}</span>
                  <span aria-hidden="true">›</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setMembershipOpen(true);
                  }}
                  style={{...menuItemStyle, width: "100%", cursor: "pointer", fontFamily: "inherit"}}
                >
                  <span aria-hidden="true">✦</span>
                  <span>Milo Finance</span>
                  <span aria-hidden="true">›</span>
                </button>

                <Link href="/cart" onClick={() => setMenuOpen(false)} style={menuItemStyle}>
                  <span aria-hidden="true">🛒</span>
                  <span>Cart</span>
                  <span aria-hidden="true">›</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <ObjectivesPanel
        isLoggedIn={Boolean(userEmail)}
        status={objectiveStatus}
        isLoading={objectivesLoading}
        screenMode={screenMode}
        scope="milo"
      />

      {isAdmin && !walkthroughOpen && (
        <WorldZoneAdminBar
          worldLabel="Milo’s World"
          items={worldZones.map((zone) => ({
            key: zone.accessKey,
            label: zone.title
              .replace("Milo’s ", "")
              .replace("Milo's ", ""),
            enabled: zoneAccessSettings[zone.accessKey],
          }))}
          loading={zoneAccessLoading}
          updatingKey={updatingZoneAccess}
          onToggle={(zoneKey) => void toggleZoneAccess(zoneKey)}
        />
      )}

      {isAdmin && zoneAccessMessage && !walkthroughOpen && (
        <div
          style={{
            position: "fixed",
            top: "124px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 95,
            padding: "8px 12px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(3,10,25,0.84)",
            color: "rgba(255,255,255,0.76)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.05em",
          }}
        >
          {zoneAccessMessage}
        </div>
      )}

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          top: isDesktop ? "90px" : "auto",
          left: isDesktop ? "46px" : "auto",
          zIndex: 12,
          width: isDesktop
            ? "min(520px, 42vw)"
            : isTablet
              ? "min(720px, calc(100% - 36px))"
              : "min(720px, calc(100% - 28px))",
          margin: isDesktop
            ? 0
            : isMobile
              ? "34px auto 22px"
              : "46px auto 26px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? "clamp(40px, 12vw, 56px)"
              : isTablet
                ? "clamp(52px, 7vw, 64px)"
                : "64px",
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
            margin: isMobile ? "12px 0 0" : "14px 0 0",
            fontSize: isMobile ? "16px" : "18px",
            fontWeight: 300,
            letterSpacing: "0.02em",
            color: "rgba(255,255,255,0.82)",
            textShadow: "0 8px 30px rgba(0,0,0,0.45)",
          }}
        >
          Learn how money, business and decisions work — by actually using them.
        </p>

        <div
          style={{
            marginTop: isMobile ? "20px" : "22px",
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            color: "#8ee8ff",
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: 400,
          }}
        >
          <span
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(83,215,255,0.46)",
              background: "rgba(83,215,255,0.12)",
              fontSize: "19px",
              flexShrink: 0,
            }}
          >
            ›
          </span>
          Start with the Bank, then put what you learn into practice
        </div>

        <div
          aria-label="Milo learning path"
          style={{
            marginTop: isMobile ? "16px" : "18px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: isMobile ? "7px" : "9px",
          }}
        >
          {[
            ["1", "Learn", "#ffd67a", "rgba(255,190,65,0.14)", "rgba(255,208,92,0.38)"],
            ["2", "Apply", "#8ff1c5", "rgba(67,209,145,0.12)", "rgba(91,220,163,0.34)"],
            ["3", "Play & Learn", "#8ee8ff", "rgba(83,215,255,0.12)", "rgba(83,215,255,0.32)"],
          ].map(([number, label, color, background, border], index) => (
            <div
              key={String(label)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    color: "rgba(255,255,255,0.34)",
                    fontSize: "12px",
                  }}
                >
                  →
                </span>
              )}

              <span
                style={{
                  minHeight: "28px",
                  padding: "0 10px",
                  borderRadius: "999px",
                  border: `1px solid ${border}`,
                  background,
                  color,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: isMobile ? "9px" : "10px",
                  fontWeight: 900,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                <strong>{number}</strong>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Milo's World locations"
        style={{
          position: isDesktop ? "absolute" : "relative",
          inset: isDesktop ? 0 : "auto",
          zIndex: walkthroughOpen ? 72 : 10,
          width: isDesktop
            ? "100%"
            : isTablet
              ? walkthroughOpen
                ? "min(420px, calc(100% - 48px))"
                : "min(720px, calc(100% - 36px))"
              : "min(720px, calc(100% - 28px))",
          height: isDesktop ? "100%" : "auto",
          margin: isDesktop
            ? 0
            : isTablet && walkthroughOpen
              ? "0 24px 0 auto"
              : "0 auto",
          display: isDesktop ? "block" : "grid",
          gridTemplateColumns: isDesktop ? undefined : "1fr",
          gap: isMobile ? "12px" : "14px",
          pointerEvents: "auto",
        }}
      >
        {isDesktop ? (
          <>
            {worldZones.map((zone) => (
              <MiloZoneHotspot
                key={zone.number}
                zone={zone}
                isAdmin={isAdmin}
                isWalkthroughActive={walkthroughOpen}
                isHighlighted={
                  activeWalkthroughZoneNumber === zone.number
                }
                isActive={displayedDesktopZone?.number === zone.number}
                onEnter={() => {
                  if (!walkthroughOpen && !selectedZone) {
                    setHoveredDesktopZone(zone);
                  }
                }}
                onLeave={() => {
                  if (!walkthroughOpen && !selectedZone) {
                    setHoveredDesktopZone(null);
                  }
                }}
                onClick={() => selectZone(zone)}
              />
            ))}

            {displayedDesktopZone && (
              <MiloZoneHoverPopup
                zone={displayedDesktopZone}
                isAdmin={isAdmin}
                isHighlighted={
                  activeWalkthroughZoneNumber === displayedDesktopZone.number
                }
                isSelected={
                  !walkthroughOpen &&
                  selectedZone?.number === displayedDesktopZone.number
                }
                onClose={() => setSelectedZone(null)}
                onEnterLocation={() => enterZone(displayedDesktopZone)}
              />
            )}
          </>
        ) : (
          <div style={{ display: "grid", gap: isMobile ? "18px" : "22px" }}>
            {bankZone && (
              <section aria-label="Start with Milo's Bank">
                <div
                  style={{
                    marginBottom: "9px",
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                  }}
                >
                  <span
                    style={{
                      color: "#ffd67a",
                      fontSize: "10px",
                      fontWeight: 950,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    1 · Learn
                  </span>
                  <span
                    style={{
                      height: "1px",
                      flex: 1,
                      background:
                        "linear-gradient(90deg, rgba(255,208,92,0.38), transparent)",
                    }}
                  />
                </div>

                <ZoneCard
                  zone={bankZone}
                  screenMode={screenMode}
                  isAdmin={isAdmin}
                  onClick={() => selectZone(bankZone)}
                  walkthroughActive={walkthroughOpen}
                  walkthroughHighlighted={
                    activeWalkthroughZoneNumber === bankZone.number
                  }
                />
              </section>
            )}

            <section aria-label="Apply what you learn">
              <div
                style={{
                  marginBottom: "9px",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                }}
              >
                <span
                  style={{
                    color: "#8ff1c5",
                    fontSize: "10px",
                    fontWeight: 950,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  2 · Apply Your Knowledge
                </span>
                <span
                  style={{
                    height: "1px",
                    flex: 1,
                    background:
                      "linear-gradient(90deg, rgba(91,220,163,0.34), transparent)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    !isMobile && !walkthroughOpen
                      ? "repeat(2, minmax(0, 1fr))"
                      : "1fr",
                  gap: isMobile ? "12px" : "14px",
                }}
              >
                {applyZones.map((zone) => (
                  <ZoneCard
                    key={zone.number}
                    zone={zone}
                    screenMode={screenMode}
                    isAdmin={isAdmin}
                    onClick={() => selectZone(zone)}
                    walkthroughActive={walkthroughOpen}
                    walkthroughHighlighted={
                      activeWalkthroughZoneNumber === zone.number
                    }
                  />
                ))}
              </div>
            </section>

            <section aria-label="Play and learn">
              <div
                style={{
                  marginBottom: "9px",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                }}
              >
                <span
                  style={{
                    color: "#8ee8ff",
                    fontSize: "10px",
                    fontWeight: 950,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  3 · Play & Learn
                </span>
                <span
                  style={{
                    height: "1px",
                    flex: 1,
                    background:
                      "linear-gradient(90deg, rgba(83,215,255,0.32), transparent)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    !isMobile && !walkthroughOpen
                      ? "repeat(2, minmax(0, 1fr))"
                      : "1fr",
                  gap: isMobile ? "12px" : "14px",
                }}
              >
                {playZones.map((zone) => (
                  <ZoneCard
                    key={zone.number}
                    zone={zone}
                    screenMode={screenMode}
                    isAdmin={isAdmin}
                    onClick={() => selectZone(zone)}
                    walkthroughActive={walkthroughOpen}
                    walkthroughHighlighted={
                      activeWalkthroughZoneNumber === zone.number
                    }
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      {!isDesktop && selectedZone && !walkthroughOpen && (
        <CompactMiloZoneInfoCard
          zone={selectedZone}
          isAdmin={isAdmin}
          onClose={() => setSelectedZone(null)}
          onEnter={() => enterZone(selectedZone)}
        />
      )}

      {!walkthroughOpen && (
        <>
          <Link
            href="/inventor"
            style={{
              position: "fixed",
              left: isMobile ? "10px" : "18px",
              bottom: isMobile ? "10px" : "16px",
              zIndex: 70,
              minHeight: isMobile ? "36px" : "42px",
              padding: isMobile ? "0 13px" : "0 17px",
              borderRadius: "999px",
              border: "1px solid rgba(126,232,255,0.42)",
              background:
                "linear-gradient(135deg, rgba(10,57,88,0.82), rgba(4,21,47,0.84))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: isMobile ? "9px" : "11px",
              fontWeight: 850,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow:
                "0 12px 28px rgba(0,0,0,0.3), 0 0 18px rgba(83,215,255,0.14)",
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden="true" style={{ color: "#8ee8ff" }}>
              ←
            </span>
            <span>To Nova’s World</span>
          </Link>

          <div
            style={{
              position: "fixed",
              right: isMobile ? "8px" : isDesktop ? "14px" : "12px",
              bottom: isMobile ? "8px" : "12px",
              zIndex: 70,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0,
              pointerEvents: "none",
            }}
          >
            <img
              src="/milo-world/milo-character.png"
              alt="Milo"
              style={{
                height: isDesktop ? "150px" : isMobile ? "82px" : "115px",
                width: "auto",
                objectFit: "contain",
                marginBottom: "-9px",
                opacity: 0.94,
                transform: isMobile ? "translateX(8px)" : "translateX(2px)",
                filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.42))",
                pointerEvents: "none",
              }}
            />

            <button
              type="button"
              onClick={startWalkthrough}
              style={{
                minHeight: isMobile ? "34px" : "38px",
                padding: isMobile ? "0 11px" : "0 14px",
                borderRadius: "999px",
                border: "1px solid rgba(83,215,255,0.36)",
                background: "rgba(2,18,36,0.72)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: isMobile ? "9px" : "11px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow:
                  "0 10px 24px rgba(0,0,0,0.26), 0 0 14px rgba(83,215,255,0.12)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                fontFamily: "inherit",
                pointerEvents: "auto",
              }}
            >
              <span aria-hidden="true">✦</span>
              {isMobile ? "Guide" : "Milo Guide"}
            </button>
          </div>
        </>
      )}

      {maintenanceZone && (
        <ZoneUnderUpgradeModal
          zoneTitle={maintenanceZone.title}
          onClose={() => setMaintenanceZone(null)}
        />
      )}

      <GuidedWalkthrough
        open={walkthroughOpen}
        stepIndex={walkthroughStep}
        isAdmin={isAdmin}
        onStepChange={setWalkthroughStep}
        onClose={closeWalkthrough}
        onNavigate={navigateFromWalkthrough}
      />

      <MembershipPopup
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
      />
    </main>
  );
}
