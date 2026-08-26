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
  href: string;
  adminOnly?: boolean;
  statusLabel?: string;
};

type WalkthroughStep = {
  eyebrow: string;
  title: string;
  text: string;
  zoneNumber?: string;
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

const WALKTHROUGH_STORAGE_KEY = "milo-world-walkthrough-completed-v2";

const ZONES: Zone[] = [
  {
    number: "1",
    icon: "▣",
    title: "Activity Lab",
    description: "Daily challenges and social games where you can earn Dream Tokens.",
    href: "/milo-world/activity-lab",
  },
  {
    number: "2",
    icon: "◈",
    title: "Milo’s Exchange",
    description: "Where you put your Dream Tokens to work.",
    href: "/milo-world/exchange",
  },
  {
    number: "3",
    icon: "★",
    title: "Milo’s Business Builder",
    description:
      "Where ideas become businesses — and your decisions shape what happens next.",
    href: "/milo-world/club",
    adminOnly: true,
    statusLabel: "Coming Soon",
  },
  {
    number: "4",
    icon: "◆",
    title: "Dream Shop",
    description:
      "Where you decide what your hard-earned Tokens are worth spending on.",
    href: "/milo-world/dream-shop",
  },
  {
    number: "5",
    icon: "◉",
    title: "Milo’s Quiz Hall",
    description:
      "Enter creator clubs or test yourself in Dreamscape’s official Categories Hub.",
    href: "/milo-world/quiz-hall",
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
    title: "Want me to show you around?",
    text:
      "Hey! I’m Milo. I’ll show you how to earn Dream Tokens, put them to work, build something of your own, test what you know and decide what’s worth spending on.",
  },
  {
    eyebrow: "Your Money",
    title: "Dream Tokens are your starting point.",
    text:
      "Earn DT through activities, then choose what to do with them. Spend them, invest them, or use them as you build your way through Milo’s World.",
  },
  {
    eyebrow: "Stop 1 of 5",
    title: "Need some Dream Tokens? Start here.",
    text:
      "The Activity Lab has daily challenges and social games where you can play, compete and earn your first Dream Tokens.",
    zoneNumber: "1",
  },
  {
    eyebrow: "Stop 2 of 5",
    title: "Now put those Tokens to work.",
    text:
      "Milo’s Exchange lets you experiment with fictional stocks and property without risking real money — and see how value, risk and returns can change.",
    zoneNumber: "2",
  },
  {
    eyebrow: "Stop 3 of 5 · Coming Soon",
    title: "What if you built the business yourself?",
    text:
      "Business Builder is coming soon. You’ll make decisions about costs, staff, operations and growth, then see what happens to the business you create.",
    zoneNumber: "3",
  },
  {
    eyebrow: "Stop 4 of 5",
    title: "Earning also means choosing how to spend.",
    text:
      "The Dream Shop is where you decide what your hard-earned Tokens are worth spending on, from collectibles to special Dreamscape items.",
    zoneNumber: "4",
  },
  {
    eyebrow: "Stop 5 of 5",
    title: "Welcome to Milo’s Quiz Hall.",
    text:
      "Enter creator-led quiz clubs built around different interests, or head to Dreamscape’s Categories Hub to test your knowledge, build mastery and compete.",
    zoneNumber: "5",
  },
  {
    eyebrow: "Your Turn",
    title: "Where do you want to start?",
    text:
      "That’s the idea: earn, explore, compete, build and decide what happens next. Pick a place and let’s go.",
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

function ZoneCard({
  zone,
  screenMode,
  isAdmin,
  walkthroughActive,
  walkthroughHighlighted,
}: {
  zone: Zone;
  screenMode: ScreenMode;
  isAdmin: boolean;
  walkthroughActive: boolean;
  walkthroughHighlighted: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isMobile = screenMode === "mobile";
  const isUnavailable = Boolean(zone.adminOnly && !isAdmin);
  const isEmphasised = hovered || walkthroughHighlighted;

  const cardStyle: CSSProperties = {
    position: "relative",
    minHeight: isMobile ? "82px" : "94px",
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
      ? "1px solid rgba(142, 232, 255, 0.88)"
      : isUnavailable
        ? "1px solid rgba(255,190,105,0.3)"
        : "1px solid rgba(132, 218, 255, 0.32)",
    background: isEmphasised
      ? "rgba(5, 18, 36, 0.94)"
      : isUnavailable
        ? "rgba(30,20,18,0.72)"
        : "rgba(5, 13, 28, 0.68)",
    color: "white",
    textDecoration: "none",
    textAlign: "left",
    fontFamily: "inherit",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: walkthroughHighlighted
      ? "0 0 0 3px rgba(83,215,255,0.18), 0 0 54px rgba(83,215,255,0.48), 0 28px 74px rgba(0,0,0,0.55)"
      : hovered && !isUnavailable
        ? "0 0 42px rgba(83,215,255,0.28), 0 26px 70px rgba(0,0,0,0.42)"
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
    cursor: walkthroughActive || isUnavailable ? "default" : "pointer",
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
          color: isUnavailable ? "#ffd18a" : "#8ee8ff",
          background: isUnavailable
            ? "radial-gradient(circle, rgba(255,189,115,0.18), rgba(24,14,12,0.9))"
            : "radial-gradient(circle, rgba(83,215,255,0.2), rgba(2,8,19,0.88))",
          border: isUnavailable
            ? "1px solid rgba(255,189,115,0.4)"
            : "1px solid rgba(83,215,255,0.45)",
          boxShadow: isUnavailable
            ? "0 0 20px rgba(255,189,115,0.12)"
            : "0 0 22px rgba(83,215,255,0.22), inset 0 0 18px rgba(83,215,255,0.08)",
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

  if (isUnavailable) {
    return (
      <div
        {...commonProps}
        aria-disabled="true"
        title="Coming soon. Admin preview only."
      >
        {content}
      </div>
    );
  }

  return (
    <Link href={zone.href} {...commonProps}>
      {content}
    </Link>
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
}: {
  zone: Zone;
  isAdmin: boolean;
  isWalkthroughActive: boolean;
  isHighlighted: boolean;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const isUnavailable = Boolean(zone.adminOnly && !isAdmin);
  const position = DESKTOP_ZONE_MARKERS[zone.number];

  return (
    <button
      id={`milo-zone-${zone.number}`}
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={() => {
        if (!isUnavailable && !isWalkthroughActive) {
          window.location.href = zone.href;
        }
      }}
      aria-label={
        isUnavailable
          ? `Location ${zone.number}: ${zone.title}, coming soon`
          : `Location ${zone.number}: ${zone.title}`
      }
      aria-disabled={isUnavailable}
      style={{
        position: "absolute",
        zIndex: isHighlighted ? 92 : isActive ? 35 : 25,
        left: position.left,
        top: position.top,
        width: "60px",
        height: "60px",
        padding: 0,
        transform: isActive
          ? "translate(-50%, -50%) scale(1.10)"
          : "translate(-50%, -50%)",
        borderRadius: "12px",
        border: isActive
          ? "1px solid rgba(142,232,255,0.98)"
          : isUnavailable
            ? "1px solid rgba(255,209,138,0.72)"
            : "1px solid rgba(126,232,255,0.76)",
        background: isActive
          ? "linear-gradient(145deg, rgba(72,211,244,0.96), rgba(19,69,120,0.98))"
          : isUnavailable
            ? "linear-gradient(145deg, rgba(96,60,28,0.94), rgba(37,24,18,0.98))"
            : "rgba(4,24,53,0.94)",
        color: isUnavailable ? "#ffd18a" : "white",
        boxShadow: isActive
          ? "0 0 0 6px rgba(83,215,255,0.14), 0 0 42px rgba(83,215,255,0.62), 0 20px 46px rgba(0,0,0,0.48)"
          : isUnavailable
            ? "0 0 0 4px rgba(2,8,19,0.48), 0 0 24px rgba(255,209,138,0.24), 0 16px 36px rgba(0,0,0,0.42)"
            : "0 0 0 4px rgba(2,8,19,0.48), 0 0 24px rgba(83,215,255,0.30), 0 16px 36px rgba(0,0,0,0.42)",
        cursor:
          isWalkthroughActive || isUnavailable ? "default" : "pointer",
        outline: "none",
        fontFamily: "inherit",
        fontSize: "25px",
        fontWeight: 900,
        opacity:
          isWalkthroughActive && !isHighlighted
            ? 0.14
            : isUnavailable
              ? 0.78
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
          "transform 220ms ease, opacity 220ms ease, filter 220ms ease, border-color 220ms ease, background 220ms ease, box-shadow 220ms ease",
      }}
    >
      {zone.number}
    </button>
  );
}

function MiloZoneHoverPopup({
  zone,
  isAdmin,
  isHighlighted,
}: {
  zone: Zone;
  isAdmin: boolean;
  isHighlighted: boolean;
}) {
  const marker = DESKTOP_ZONE_MARKERS[zone.number];
  const isUnavailable = Boolean(zone.adminOnly && !isAdmin);
  const shouldOpenBelow = zone.number === "1" || zone.number === "4";

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 60,
        left: marker.left,
        top: marker.top,
        width: "330px",
        transform: shouldOpenBelow
          ? `translate(-50%, 46px)${isHighlighted ? " scale(1.025)" : ""}`
          : `translate(-50%, calc(-100% - 46px))${isHighlighted ? " scale(1.025)" : ""}`,
        borderRadius: "20px",
        border: `${isHighlighted ? 2 : 1}px solid ${
          isUnavailable
            ? "rgba(255,209,138,0.86)"
            : "rgba(126,232,255,0.72)"
        }`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.95), rgba(3,13,34,0.97))",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: isHighlighted
          ? "0 0 0 8px rgba(83,215,255,0.12), 0 0 46px rgba(83,215,255,0.38), 0 24px 60px rgba(0,0,0,0.52)"
          : "0 0 28px rgba(83,215,255,0.18), 0 24px 60px rgba(0,0,0,0.45)",
        padding: "21px 23px",
        pointerEvents: "none",
        color: "white",
        transition:
          "border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease",
      }}
    >
      <p
        style={{
          margin: 0,
          color: isUnavailable ? "#ffd18a" : "#8ee8ff",
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
          margin: "8px 0 0",
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

      <div
        style={{
          marginTop: "16px",
          color: isUnavailable ? "#ffd18a" : "#8ee8ff",
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}
      >
        {isUnavailable ? "Admin Preview Only" : "Click the number to enter →"}
      </div>
    </div>
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
      // Dream Shop: marker is upper-right.
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
          <button type="button" onClick={() => onStepChange(1)} style={primaryActionStyle}>
            Sure!
          </button>
          <button type="button" onClick={onClose} style={secondaryActionStyle}>
            Maybe later
          </button>
        </>
      );
    }

    if (stepIndex === 2) {
      return (
        <>
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/activity-lab")}
            style={primaryActionStyle}
          >
            Let’s play!
          </button>
          <button type="button" onClick={() => onStepChange(3)} style={secondaryActionStyle}>
            Keep touring
          </button>
        </>
      );
    }

    if (stepIndex === 3) {
      return (
        <>
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/exchange")}
            style={primaryActionStyle}
          >
            Visit the Exchange
          </button>
          <button type="button" onClick={() => onStepChange(4)} style={secondaryActionStyle}>
            Keep touring
          </button>
        </>
      );
    }

    if (stepIndex === 4) {
      return (
        <>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => onNavigate("/milo-world/club")}
              style={primaryActionStyle}
            >
              Admin Preview
            </button>
          ) : (
            <button
              type="button"
              disabled
              style={{
                ...secondaryActionStyle,
                cursor: "not-allowed",
                color: "rgba(255,255,255,0.48)",
              }}
            >
              Coming Soon
            </button>
          )}
          <button type="button" onClick={() => onStepChange(5)} style={secondaryActionStyle}>
            Keep touring
          </button>
        </>
      );
    }

    if (stepIndex === 5) {
      return (
        <>
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/dream-shop")}
            style={primaryActionStyle}
          >
            Browse the Shop
          </button>
          <button type="button" onClick={() => onStepChange(6)} style={secondaryActionStyle}>
            Keep touring
          </button>
        </>
      );
    }

    if (stepIndex === 6) {
      return (
        <>
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/quiz-hall")}
            style={primaryActionStyle}
          >
            Enter Quiz Hall
          </button>
          <button type="button" onClick={() => onStepChange(7)} style={secondaryActionStyle}>
            Keep touring
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

      return (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/activity-lab")}
            style={choiceStyle}
          >
            Play & Earn
          </button>
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/exchange")}
            style={choiceStyle}
          >
            Invest
          </button>
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => isAdmin && onNavigate("/milo-world/club")}
            style={{
              ...choiceStyle,
              cursor: isAdmin ? "pointer" : "not-allowed",
              color: isAdmin ? "white" : "rgba(255,255,255,0.44)",
            }}
          >
            {isAdmin ? "Business Builder" : "Business · Coming Soon"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/dream-shop")}
            style={choiceStyle}
          >
            Visit the Shop
          </button>
          <button
            type="button"
            onClick={() => onNavigate("/milo-world/quiz-hall")}
            style={choiceStyle}
          >
            Quiz Hall
          </button>
        </div>
      );
    }

    return (
      <>
        {!isFirstStep && (
          <button type="button" onClick={() => onStepChange(stepIndex - 1)} style={secondaryActionStyle}>
            Back
          </button>
        )}
        <button type="button" onClick={() => onStepChange(stepIndex + 1)} style={primaryActionStyle}>
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

  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [hoveredDesktopZone, setHoveredDesktopZone] = useState<Zone | null>(null);
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
        setProfileAssets({ cash: 0, property: 0, stocks: 0 });
        setTokenTransactions([]);
        setProfileAssetsLoading(false);
        setProfileAssetsOpen(false);
        setReferralCount(0);
        setClaimedMilestones([]);
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
  }

  function navigateFromWalkthrough(href: string) {
    markWalkthroughComplete();
    setWalkthroughOpen(false);
    setWalkthroughStep(0);
    window.location.href = href;
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

  const activeWalkthroughZoneNumber = walkthroughOpen
    ? WALKTHROUGH_STEPS[walkthroughStep]?.zoneNumber ?? null
    : null;

  const activeWalkthroughZone = activeWalkthroughZoneNumber
    ? ZONES.find((zone) => zone.number === activeWalkthroughZoneNumber) ?? null
    : null;

  const displayedDesktopZone =
    activeWalkthroughZone ?? hoveredDesktopZone;

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
            gap: isMobile ? "7px" : "12px",
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
                padding: isMobile ? "0 12px" : "0 18px 0 16px",
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

              {isMobile
                ? `Assets ${formatDreamTokenAmount(profileAssetsTotal)}`
                : `Profile Assets ${formatDreamTokenAmount(profileAssetsTotal)}`}

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
                  <span>Membership</span>
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
              ? "34px auto 22px"
              : "46px auto 26px",
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
          Learn how money, business and decisions work — by actually using them.
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
          Choose a location to begin
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
            {ZONES.map((zone) => (
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
                  if (!walkthroughOpen) setHoveredDesktopZone(zone);
                }}
                onLeave={() => {
                  if (!walkthroughOpen) setHoveredDesktopZone(null);
                }}
              />
            ))}

            {displayedDesktopZone && (
              <MiloZoneHoverPopup
                zone={displayedDesktopZone}
                isAdmin={isAdmin}
                isHighlighted={
                  activeWalkthroughZoneNumber === displayedDesktopZone.number
                }
              />
            )}
          </>
        ) : (
          ZONES.map((zone) => (
            <div key={zone.number}>
              <ZoneCard
                zone={zone}
                screenMode={screenMode}
                isAdmin={isAdmin}
                walkthroughActive={walkthroughOpen}
                walkthroughHighlighted={
                  activeWalkthroughZoneNumber === zone.number
                }
              />
            </div>
          ))
        )}
      </section>

      {!walkthroughOpen && (
        <div
          style={{
            position: "fixed",
            right: isMobile ? "8px" : isDesktop ? "34px" : "14px",
            bottom: isMobile ? "8px" : "16px",
            zIndex: 70,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isMobile ? "4px" : "7px",
            pointerEvents: "none",
          }}
        >
          <img
            src="/milo-world/milo-character.png"
            alt="Milo"
            style={{
              height: isDesktop ? "220px" : isMobile ? "145px" : "195px",
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.58))",
              pointerEvents: "none",
            }}
          />

          <button
            type="button"
            onClick={startWalkthrough}
            style={{
              minHeight: isMobile ? "40px" : "46px",
              padding: isMobile ? "0 14px" : "0 19px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.6)",
              background: "rgba(22,81,105,0.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: isMobile ? "11px" : "13px",
              fontWeight: 850,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow:
                "0 16px 36px rgba(0,0,0,0.32), 0 0 22px rgba(83,215,255,0.16)",
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
