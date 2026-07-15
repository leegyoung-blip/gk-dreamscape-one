"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const MILOS_CLUB_URL =
  "https://gurukidspro.com/products/milos-club-membership";

type PopupKind =
  | "membership"
  | "masteryLab";

type ServiceFormKind =
  | "corporateBulk"
  | "eventPurchase"
  | "fileQuote"
  | "designQuote";

type ActivityKind = "designChallenge" | "dailyPuzzle" | "categoriesQuiz";

type ScreenMode = "desktop" | "tablet" | "mobile";

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180 || isPortrait) {
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

function ResponsiveMiloStyles() {
  return (
    <style>{`
      .milo-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(40, 117, 160, 0.45) rgba(255,255,255,0.2);
      }

      .milo-scrollbar::-webkit-scrollbar {
        height: 8px;
        width: 8px;
      }

      .milo-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(40, 117, 160, 0.45);
        border-radius: 999px;
      }

      @media (max-width: 720px) {
        .milo-popup article {
          min-width: 0 !important;
        }

        .milo-popup input,
        .milo-popup textarea,
        .milo-popup select,
        .milo-popup button {
          max-width: 100%;
        }
      }
    `}</style>
  );
}


type Zone = {
  number: string;
  icon: string;
  title: string;
  description: string;
  action?: PopupKind;
  href?: string;
  style: CSSProperties;
};

type CustomisationConfig = {
  designLabel: string;
  designOptions: string[];
};

type PopupOption = {
  name: string;
  subtitle: string;
  description: string;
  imageSrc?: string;
  imageFit?: "contain" | "cover";
  priceFrom?: string;
  buttonLabel: string;
  formKind?: ServiceFormKind;
  activityKind?: ActivityKind;
  href?: string;
  customisation?: CustomisationConfig;
};

type PopupContent = {
  eyebrow: string;
  title: string;
  description: string;
  options: PopupOption[];
};

type CustomChoices = {
  baseColour: string;
  design: string;
  primaryColour: string;
  secondaryColour: string;
  customName: string;
};

type DailyPuzzle = {
  id: string;
  date_sg: string;
  answer: string;
  base_clue: string;
  clue_text: string;
};

type DailyPuzzleAttempt = {
  guess: string;
  feedback: ("correct" | "present" | "absent")[];
};

type KeyboardLetterState = "correct" | "present" | "absent";

const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const DAILY_CODE_MAX_ATTEMPTS = 6;
const DAILY_CODE_REWARDS = [60, 50, 40, 30, 20, 10] as const;

function getDailyCodeReward(attemptNumber: number) {
  return DAILY_CODE_REWARDS[attemptNumber - 1] ?? 10;
}

function getKeyboardLetterStates(attempts: DailyPuzzleAttempt[]) {
  const states: Record<string, KeyboardLetterState> = {};

  const priority: Record<KeyboardLetterState, number> = {
    absent: 1,
    present: 2,
    correct: 3,
  };

  attempts.forEach((attempt) => {
    attempt.guess.split("").forEach((letter, index) => {
      const state = attempt.feedback[index];
      const existingState = states[letter];

      if (!existingState || priority[state] > priority[existingState]) {
        states[letter] = state;
      }
    });
  });

  return states;
}

const baseColourOptions = [
  "Matte Warm White",
  "Charcoal Black",
  "Stone Grey",
  "Deep Navy",
  "Soft Sand",
];

const primaryColourOptions = [
  "Dark Navy",
  "Muted Gold",
  "Slate Grey",
  "Forest Green",
  "Burgundy",
  "Bronze",
];

const secondaryColourOptions = [
  "Warm Gold",
  "Cream",
  "Charcoal",
  "Soft Grey",
  "Deep Navy",
  "Copper",
];

const zones: Zone[] = [
  {
    number: "1",
    icon: "✦",
    title: "Membership Portal",
    description: "Choose your Dreamscape One access level.",
    action: "membership",
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
    title: "Milo’s Stock Exchange",
    description: "Use earned Dreamscape Tokens to trade fictional Dreamscape stocks.",
    href: "/milo-world/stock-exchange",
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
    description: "Play daily challenges, quiz battles, and party games to earn tokens.",
    action: "masteryLab",
    style: {
      top: "480px",
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
      top: "570px",
      left: "365px",
      width: "455px",
    },
  },
  {
    number: "5",
    icon: "★",
    title: "Milo’s Club",
    description: "Coming soon: bonus challenges, rewards, and club-only perks.",
    href: "/milo-world/club",
    style: {
      top: "370px",
      left: "140px",
      width: "455px",
    },
  },
];

const popupContent: Record<PopupKind, PopupContent> = {
  membership: {
    eyebrow: "Dreamscape One Membership",
    title: "Membership Portal",
    description: "",
    options: [],
  },

  masteryLab: {
    eyebrow: "Milo’s Token-Earning Games",
    title: "Activity Lab",
    description:
      "Play Milo’s challenge modes to earn Dreamscape Tokens. Tokens can be used inside Milo’s World, including Milo’s Stock Exchange for eligible 16+ users.",
    options: [
      {
        name: "Mastery Code",
        subtitle: "Daily 5-letter code puzzle with hints and limited attempts.",
        description: "",
        priceFrom: "Daily challenge",
        imageSrc: "/milo-world/activities/daily-puzzle.png",
        imageFit: "cover",
        buttonLabel: "Play Mastery Code",
        activityKind: "dailyPuzzle",
      },
      {
        name: "Categories",
        subtitle: "Timed quiz with solo and multiplayer modes.",
        description: "",
        priceFrom: "Single or multiplayer",
        imageSrc: "/milo-world/activities/categories-quiz.png",
        imageFit: "cover",
        buttonLabel: "Enter Categories",
        href: "/milo-world/categories",
      },
      {
        name: "Who’s Bluffing",
        subtitle: "A fast group game where players create fake answers and spot the truth.",
        description: "",
        priceFrom: "Multiplayer 2–10",
        imageSrc: "/milo-world/activities/whos-bluffing.png",
        imageFit: "cover",
        buttonLabel: "Enter Who’s Bluffing",
        href: "/milo-world/whos-bluffing",
      },
    ],
  },
};

const introText =
  "Hi, I’m Milo. Welcome to my economy world. This is where Dreamscape users play challenges, earn Dreamscape Tokens, visit the Dream Shop, and use tokens in Milo’s Stock Exchange if they are 16 or above. Choose any zone to begin.";

  function createInitialChoices(option: PopupOption): CustomChoices {
  return {
    baseColour: baseColourOptions[0],
    design: option.customisation?.designOptions[0] || "",
    primaryColour: primaryColourOptions[0],
    secondaryColour: secondaryColourOptions[0],
    customName: "YOUR NAME",
  };
}

function ZoneCard({
  zone,
  onOpenPopup,
  screenMode,
}: {
  zone: Zone;
  onOpenPopup: (popup: PopupKind) => void;
  screenMode: ScreenMode;
}) {
  const [hovered, setHovered] = useState(false);

  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const baseTransform =
    isDesktop && typeof zone.style.transform === "string"
      ? zone.style.transform
      : "";

  const desktopStyle = isDesktop ? zone.style : {};

  const zoneCardStyle: CSSProperties = {
    position: isDesktop ? "absolute" : "relative",
    minHeight: isMobile ? "82px" : "94px",
    display: "grid",
    gridTemplateColumns: isMobile ? "50px 1px 1fr 24px" : "74px 1px 1fr 32px",
    alignItems: "center",
    gap: isMobile ? "12px" : "20px",
    padding: isMobile ? "16px" : "22px 26px 22px 24px",
    borderRadius: "16px",
    color: "white",
    textDecoration: "none",
    background: hovered ? "rgba(5, 13, 28, 0.74)" : "rgba(5, 13, 28, 0.42)",
    border: hovered
      ? "1px solid rgba(132, 218, 255, 0.52)"
      : "1px solid rgba(132, 218, 255, 0.24)",
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
    width: isDesktop ? undefined : "100%",
    ...desktopStyle,
    transform: isDesktop
      ? `${baseTransform} ${hovered ? "translateY(-6px) scale(1.015)" : ""}`.trim()
      : hovered
      ? "translateY(-4px)"
      : "none",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
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

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: isMobile ? "10px" : "16px",
          }}
        >
          <span
            style={{
              fontSize: isMobile ? "15px" : "19px",
              color: "rgba(255,255,255,0.86)",
              lineHeight: 1.2,
            }}
          >
            {zone.number}
          </span>

          <div>
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
          </div>
        </div>
      </div>

      <div
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
        style={zoneCardStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (zone.action) {
          onOpenPopup(zone.action);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={zoneCardStyle}
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

    setTypedLength(0);

    const interval = window.setInterval(() => {
      setTypedLength((current) => {
        if (current >= introText.length) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 22);

    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const completed = typedLength >= introText.length;

  return (
    <div
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
      onClick={onClose}
    >
      <div
        className="milo-scrollbar"
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
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
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
          {introText.slice(0, typedLength)}
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

function MembershipPlans({ onClose }: { onClose: () => void }) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const [clubHovered, setClubHovered] = useState(false);

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
            Basic access lets users explore selected parts of Milo’s World before
            joining the full club experience.
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
                    boxShadow: "0 0 14px rgba(190,124,45,0.12)",
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
          onMouseEnter={() => setClubHovered(true)}
          onMouseLeave={() => setClubHovered(false)}
          onTouchStart={() => setClubHovered((current) => !current)}
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
            alt="Milo’s Club Membership"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              transform: clubHovered ? "scale(1.035)" : "scale(1)",
              transition: "transform 320ms ease",
              filter: "saturate(0.92)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: clubHovered
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

          <div
            style={{
              position: "absolute",
              left: "24px",
              right: "24px",
              bottom: "24px",
              zIndex: 2,
              transform: clubHovered ? "translateY(0)" : "translateY(18px)",
              opacity: clubHovered ? 1 : 0,
              transition: "opacity 240ms ease, transform 240ms ease",
            }}
          >
            <div
              style={{
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
                Milo’s Club Preview
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
                More rewards, games, and maker perks.
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
                  "Dreamscape Token rewards",
                  "Bonus Activity Lab challenges",
                  "Future Milo Market events",
                  "Access to Milo’s Club",
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "not-allowed",
                }}
              >
                Coming Soon
              </button>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "rgba(255,255,255,0.54)",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                Shopify link is kept in the code but disabled until launch.
              </p>
            </div>
          </div>

          {!clubHovered && (
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
                Monthly Membership
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
                Milo’s Club
              </h4>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(29,20,12,0.62)",
                  fontSize: "13px",
                  lineHeight: 1.45,
                }}
              >
                Coming soon. Membership checkout is not open yet.
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

function OptionCard({
  option,
  onStartCustomisation,
  onOpenServiceForm,
  onOpenActivity,
}: {
  option: PopupOption;
  onStartCustomisation?: (option: PopupOption) => void;
  onOpenServiceForm?: (option: PopupOption) => void;
  onOpenActivity?: (option: PopupOption) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";

  return (
    <article
      style={{
        flex: isMobile ? "0 0 86vw" : "0 0 360px",
        width: "100%",
        scrollSnapAlign: "start",
        minHeight: isMobile ? "auto" : "430px",
        borderRadius: "26px",
        border: "1px solid rgba(5,13,28,0.12)",
        background: "rgba(255,255,255,0.76)",
        boxShadow: "0 22px 55px rgba(0,0,0,0.14)",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: option.imageSrc ? (isMobile ? "190px 1fr" : "230px 1fr") : "1fr",
      }}
    >
      {option.imageSrc && (
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 50% 42%, rgba(83,215,255,0.15), rgba(255,255,255,0.56) 42%, rgba(255,255,255,0.82))",
            borderBottom: "1px solid rgba(5,13,28,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "24px",
              borderRadius: "22px",
              border: "1px dashed rgba(5,13,28,0.16)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                option.imageFit === "cover"
                  ? "rgba(255,255,255,0.58)"
                  : "transparent",
            }}
          >
            {!imageError && (
              <img
                src={option.imageSrc}
                alt={option.name}
                onError={() => setImageError(true)}
                style={{
                  width: option.imageFit === "cover" ? "100%" : "84%",
                  height: option.imageFit === "cover" ? "100%" : "84%",
                  objectFit: option.imageFit === "cover" ? "cover" : "contain",
                  objectPosition: "50% 25%",
                  filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.18))",
                }}
              />
            )}

            {imageError && (
              <div
                style={{
                  color: "rgba(5,13,28,0.42)",
                  fontSize: "13px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                Product image
                <br />
                coming later
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          padding: "24px",
          color: "#07111f",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {option.priceFrom && (
          <p
            style={{
              margin: 0,
              color: "#2875a0",
              fontSize: "12px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            {option.priceFrom}
          </p>
        )}

        <h3
          style={{
            margin: option.priceFrom ? "10px 0 0" : 0,
            fontSize: "24px",
            lineHeight: 1.12,
            fontWeight: 850,
          }}
        >
          {option.name}
        </h3>

        <p
          style={{
            margin: "9px 0 0",
            color: "rgba(7,17,31,0.62)",
            fontSize: "14px",
            lineHeight: 1.45,
            fontWeight: 650,
          }}
        >
          {option.subtitle}
        </p>

        {option.description && (
          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(7,17,31,0.62)",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {option.description}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            if (option.href) {
              window.location.href = option.href;
              return;
            }

            if (option.customisation) {
              onStartCustomisation?.(option);
              return;
            }

            if (option.formKind) {
              onOpenServiceForm?.(option);
              return;
            }

            if (option.activityKind) {
              onOpenActivity?.(option);
            }
          }}

          style={{
            marginTop: "auto",
            width: "100%",
            height: "44px",
            border: "none",
            borderRadius: "12px",
            background: "#07111f",
            color: "white",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          {option.buttonLabel}
        </button>
      </div>
    </article>
  );
}

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: "48px",
        padding: "12px 16px",
        borderRadius: "14px",
        border: selected
          ? "1px solid rgba(40,117,160,0.7)"
          : "1px solid rgba(7,17,31,0.12)",
        background: selected ? "rgba(40,117,160,0.12)" : "rgba(255,255,255,0.7)",
        color: "#07111f",
        fontSize: "14px",
        fontWeight: 750,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

function CustomisationWizard({
  option,
  choices,
  setChoices,
  step,
  setStep,
  onBackToGallery,
  onFinish,
}: {
  option: PopupOption;
  choices: CustomChoices;
  setChoices: (choices: CustomChoices) => void;
  step: number;
  setStep: (step: number) => void;
  onBackToGallery: () => void;
  onFinish: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const screenMode = useResponsiveMode();
  const isCompact = screenMode !== "desktop";
  const isMobile = screenMode === "mobile";
  const designOptions = option.customisation?.designOptions || [];
  const maxStep = 4;

  const stepTitle = [
    "Step 1: Choose Base Colour",
    `Step 2: Choose ${option.customisation?.designLabel || "Main Design"}`,
    "Step 3: Choose Primary Colour",
    "Step 4: Choose Secondary Colour",
    "Step 5: Enter Name",
  ][step];

  function updateChoice(key: keyof CustomChoices, value: string) {
    setChoices({ ...choices, [key]: value });
  }

  function handleNext() {
    if (step < maxStep) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  }

  return (
    <div style={{ padding: isMobile ? "28px 18px 32px" : "40px 58px 58px", color: "#07111f" }}>
      <button
        type="button"
        onClick={onBackToGallery}
        style={{
          border: "none",
          background: "transparent",
          color: "#2875a0",
          fontWeight: 850,
          cursor: "pointer",
          padding: 0,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "12px",
        }}
      >
        ← Back to products
      </button>

      <div
        style={{
          marginTop: "26px",
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "420px 1fr",
          gap: isCompact ? "24px" : "44px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            borderRadius: "28px",
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(7,17,31,0.1)",
            minHeight: isMobile ? "auto" : "520px",
            overflow: "hidden",
            boxShadow: "0 22px 55px rgba(0,0,0,0.12)",
          }}
        >
          <div
            style={{
              height: isMobile ? "230px" : "320px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              background:
                "radial-gradient(circle at 50% 42%, rgba(83,215,255,0.15), rgba(255,255,255,0.56) 42%, rgba(255,255,255,0.82))",
              borderBottom: "1px solid rgba(7,17,31,0.08)",
            }}
          >
            {!imageError && option.imageSrc && (
              <img
                src={option.imageSrc}
                alt={option.name}
                onError={() => setImageError(true)}
                style={{
                  maxWidth: "84%",
                  maxHeight: "84%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.18))",
                }}
              />
            )}

            {imageError && (
              <div
                style={{
                  color: "rgba(5,13,28,0.42)",
                  fontSize: "13px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                Product image
                <br />
                coming later
              </div>
            )}
          </div>

          <div style={{ padding: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "25px", lineHeight: 1.12 }}>
              {option.name}
            </h3>
            <p
              style={{
                margin: "12px 0 0",
                color: "rgba(7,17,31,0.6)",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              {option.subtitle}
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "16px",
                background: "rgba(7,17,31,0.05)",
                border: "1px solid rgba(7,17,31,0.08)",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "rgba(7,17,31,0.68)",
              }}
            >
              <strong style={{ color: "#07111f" }}>Current choices</strong>
              <br />
              Base: {choices.baseColour}
              <br />
              Design: {choices.design}
              <br />
              Primary: {choices.primaryColour}
              <br />
              Secondary: {choices.secondaryColour}
              <br />
              Name: {choices.customName}
            </div>
          </div>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              color: "#2875a0",
              fontSize: "13px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            Customisation Flow
          </p>

          <h2
            style={{
              margin: "14px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "34px" : "48px",
              lineHeight: 1,
              fontWeight: 500,
            }}
          >
            {stepTitle}
          </h2>

          <div
            style={{
              marginTop: "26px",
              height: "8px",
              borderRadius: "999px",
              background: "rgba(7,17,31,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((step + 1) / 5) * 100}%`,
                background: "#2875a0",
                borderRadius: "999px",
                transition: "width 250ms ease",
              }}
            />
          </div>

          <div style={{ marginTop: "34px" }}>
            {step === 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                {baseColourOptions.map((colour) => (
                  <ChoiceButton
                    key={colour}
                    label={colour}
                    selected={choices.baseColour === colour}
                    onClick={() => updateChoice("baseColour", colour)}
                  />
                ))}
              </div>
            )}

            {step === 1 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                {designOptions.map((design) => (
                  <ChoiceButton
                    key={design}
                    label={design}
                    selected={choices.design === design}
                    onClick={() => updateChoice("design", design)}
                  />
                ))}
              </div>
            )}

            {step === 2 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                {primaryColourOptions.map((colour) => (
                  <ChoiceButton
                    key={colour}
                    label={colour}
                    selected={choices.primaryColour === colour}
                    onClick={() => updateChoice("primaryColour", colour)}
                  />
                ))}
              </div>
            )}

            {step === 3 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                {secondaryColourOptions.map((colour) => (
                  <ChoiceButton
                    key={colour}
                    label={colour}
                    selected={choices.secondaryColour === colour}
                    onClick={() => updateChoice("secondaryColour", colour)}
                  />
                ))}
              </div>
            )}

            {step === 4 && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: "rgba(7,17,31,0.62)",
                    fontSize: "13px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 850,
                    marginBottom: "12px",
                  }}
                >
                  Name Text
                </label>

                <input
                  value={choices.customName}
                  onChange={(event) => updateChoice("customName", event.target.value)}
                  placeholder="YOUR NAME"
                  style={{
                    width: "100%",
                    height: "58px",
                    borderRadius: "16px",
                    border: "1px solid rgba(7,17,31,0.14)",
                    background: "rgba(255,255,255,0.78)",
                    padding: "0 18px",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#07111f",
                    outline: "none",
                  }}
                />
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              style={{
                height: "48px",
                padding: "0 22px",
                borderRadius: "12px",
                border: "1px solid rgba(7,17,31,0.12)",
                background: step === 0 ? "rgba(7,17,31,0.04)" : "rgba(255,255,255,0.74)",
                color: step === 0 ? "rgba(7,17,31,0.28)" : "#07111f",
                fontWeight: 850,
                cursor: step === 0 ? "not-allowed" : "pointer",
              }}
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              style={{
                height: "48px",
                padding: "0 26px",
                borderRadius: "12px",
                border: "none",
                background: "#07111f",
                color: "white",
                fontWeight: 850,
                cursor: "pointer",
              }}
            >
              {step === maxStep ? "Add to Cart" : "Next Step"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span
        style={{
          color: "rgba(7,17,31,0.58)",
          fontSize: "12px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 850,
        }}
      >
        {label}
      </span>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            resize: "vertical",
            borderRadius: "14px",
            border: "1px solid rgba(7,17,31,0.12)",
            background: "rgba(255,255,255,0.75)",
            padding: "14px 16px",
            fontSize: "15px",
            color: "#07111f",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          style={{
            height: "48px",
            borderRadius: "14px",
            border: "1px solid rgba(7,17,31,0.12)",
            background: "rgba(255,255,255,0.75)",
            padding: "0 16px",
            fontSize: "15px",
            color: "#07111f",
            outline: "none",
          }}
        />
      )}
    </label>
  );
}

function PricingGuidelinesTable() {
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";

  const rows = [
    ["Simple design support", "$15 – $30", "Minor edits, text, simple layout changes"],
    ["Small custom design", "$35 – $80", "Simple object, gift, display piece, or accessory"],
    ["Detailed custom model", "Quote first", "Complex shapes, multiple parts, or technical fitting"],
    ["Basic print", "From $6", "Small PLA/PVA-style prints, simple colours"],
    ["Large / multi-colour print", "Quote first", "Bigger items, longer print time, or multiple colours"],
  ];

  return (
    <div
      style={{
        borderRadius: "22px",
        border: "1px solid rgba(7,17,31,0.1)",
        background: "rgba(255,255,255,0.72)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid rgba(7,17,31,0.08)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "22px" }}>Pricing Guidelines</h3>
        <p
          style={{
            margin: "8px 0 0",
            color: "rgba(7,17,31,0.58)",
            fontSize: "13px",
            lineHeight: 1.45,
          }}
        >
          These are guide ranges only. Final pricing depends on size, design
          complexity, material, colour, and print time.
        </p>
      </div>

      {rows.map(([service, price, note]) => (
        <div
          key={service}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.7fr 1.4fr",
            gap: "12px",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(7,17,31,0.06)",
            fontSize: "13px",
            color: "rgba(7,17,31,0.7)",
          }}
        >
          <strong style={{ color: "#07111f" }}>{service}</strong>
          <span>{price}</span>
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}

function ServiceRequestForm({
  option,
  onBackToOptions,
}: {
  option: PopupOption;
  onBackToOptions: () => void;
}) {
  const screenMode = useResponsiveMode();
  const isCompact = screenMode !== "desktop";
  const isMobile = screenMode === "mobile";
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    organisation: "",
    contactName: "",
    contactInfo: "",
    quantity: "",
    deadline: "",
    eventTheme: "",
    itemType: "",
    budget: "",
    fileNotes: "",
    designBrief: "",
    size: "",
    material: "",
    colour: "",
  });

  function updateField(key: keyof typeof formData, value: string) {
    setFormData({ ...formData, [key]: value });
  }

  function saveRequest() {
    const request = {
      id: `${option.name}-${Date.now()}`,
      service: option.name,
      formKind: option.formKind,
      ...formData,
    };

    const savedRequests = JSON.parse(
      localStorage.getItem("milo-service-requests") || "[]"
    );
    localStorage.setItem(
      "milo-service-requests",
      JSON.stringify([...savedRequests, request])
    );
    setSubmitted(true);
  }

  const isCorporate =
    option.formKind === "corporateBulk" || option.formKind === "eventPurchase";
  const isFileQuote = option.formKind === "fileQuote";
  const isDesignQuote = option.formKind === "designQuote";

  return (
    <div style={{ padding: isMobile ? "28px 18px 32px" : "40px 58px 58px", color: "#07111f" }}>
      <button
        type="button"
        onClick={onBackToOptions}
        style={{
          border: "none",
          background: "transparent",
          color: "#2875a0",
          fontWeight: 850,
          cursor: "pointer",
          padding: 0,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "12px",
        }}
      >
        ← Back to service options
      </button>

      <p
        style={{
          margin: "26px 0 0",
          color: "#2875a0",
          fontSize: "13px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        Guided Request Form
      </p>

      <h2
        style={{
          margin: "14px 0 0",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "52px",
          lineHeight: 1,
          fontWeight: 500,
        }}
      >
        {option.name}
      </h2>

      <p
        style={{
          margin: "18px 0 0",
          maxWidth: "780px",
          color: "rgba(7,17,31,0.62)",
          fontSize: "17px",
          lineHeight: 1.6,
        }}
      >
        {option.description}
      </p>

      {isCorporate && (
        <div
          style={{
            marginTop: "34px",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: "18px",
            maxWidth: "980px",
          }}
        >
          <FormField
            label="Company / School Name"
            value={formData.organisation}
            onChange={(value) => updateField("organisation", value)}
            placeholder="e.g. ABC School / Company Name"
          />
          <FormField
            label="Contact Person"
            value={formData.contactName}
            onChange={(value) => updateField("contactName", value)}
            placeholder="Name of person-in-charge"
          />
          <FormField
            label="Email / Phone"
            value={formData.contactInfo}
            onChange={(value) => updateField("contactInfo", value)}
            placeholder="Email or phone number"
          />
          <FormField
            label="Quantity Required"
            value={formData.quantity}
            onChange={(value) => updateField("quantity", value)}
            placeholder="e.g. 30 / 50 / 100 pieces"
          />
          <FormField
            label="Deadline / Event Date"
            value={formData.deadline}
            onChange={(value) => updateField("deadline", value)}
            placeholder="When do you need it?"
          />
          <FormField
            label="Budget Range"
            value={formData.budget}
            onChange={(value) => updateField("budget", value)}
            placeholder="Optional estimated budget"
          />
          <FormField
            label="Preferred Item Type"
            value={formData.itemType}
            onChange={(value) => updateField("itemType", value)}
            placeholder="Trophy, keychain, token, plaque, souvenir..."
          />
          <FormField
            label="Event Theme / Brand Direction"
            value={formData.eventTheme}
            onChange={(value) => updateField("eventTheme", value)}
            placeholder="Corporate, school, mahjong, festive, appreciation..."
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <FormField
              label="Additional Details"
              value={formData.designBrief}
              onChange={(value) => updateField("designBrief", value)}
              placeholder="Share names, logos, colours, packaging notes, or event context."
              textarea
            />
          </div>
        </div>
      )}

      {isFileQuote && (
        <div
          style={{
            marginTop: "34px",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "420px 1fr",
            gap: "34px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              minHeight: "420px",
              borderRadius: "26px",
              border: "1px dashed rgba(40,117,160,0.38)",
              background: "rgba(255,255,255,0.65)",
              display: "grid",
              placeItems: "center",
              padding: "28px",
              textAlign: "center",
            }}
          >
            <div>
              <div
                style={{
                  width: "74px",
                  height: "74px",
                  margin: "0 auto 18px",
                  borderRadius: "22px",
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(40,117,160,0.12)",
                  border: "1px solid rgba(40,117,160,0.18)",
                  fontSize: "32px",
                }}
              >
                ⬆
              </div>
              <h3 style={{ margin: 0, fontSize: "24px" }}>Upload Your File</h3>
              <p
                style={{
                  margin: "12px 0 20px",
                  color: "rgba(7,17,31,0.58)",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                Upload STL, OBJ, 3MF, ZIP, or reference files. This is a visual
                input for now and can be connected to storage later.
              </p>
              <input
                type="file"
                multiple
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(7,17,31,0.12)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            <FormField
              label="Contact Name"
              value={formData.contactName}
              onChange={(value) => updateField("contactName", value)}
              placeholder="Your name"
            />
            <FormField
              label="Email / Phone"
              value={formData.contactInfo}
              onChange={(value) => updateField("contactInfo", value)}
              placeholder="Where should we reply?"
            />
            <FormField
              label="Quantity"
              value={formData.quantity}
              onChange={(value) => updateField("quantity", value)}
              placeholder="How many prints?"
            />
            <FormField
              label="Approx Size"
              value={formData.size}
              onChange={(value) => updateField("size", value)}
              placeholder="e.g. 8cm tall / palm-sized"
            />
            <FormField
              label="Material Preference"
              value={formData.material}
              onChange={(value) => updateField("material", value)}
              placeholder="PLA, matte finish, flexible, not sure..."
            />
            <FormField
              label="Colour Preference"
              value={formData.colour}
              onChange={(value) => updateField("colour", value)}
              placeholder="White, black, navy, gold, etc."
            />
            <FormField
              label="Deadline"
              value={formData.deadline}
              onChange={(value) => updateField("deadline", value)}
              placeholder="When do you need it?"
            />
            <FormField
              label="Budget Range"
              value={formData.budget}
              onChange={(value) => updateField("budget", value)}
              placeholder="Optional budget"
            />
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField
                label="Print Notes"
                value={formData.fileNotes}
                onChange={(value) => updateField("fileNotes", value)}
                placeholder="Tell us if this is for prototype, display, gift, school project, etc."
                textarea
              />
            </div>
          </div>
        </div>
      )}

      {isDesignQuote && (
        <div
          style={{
            marginTop: "34px",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 560px",
            gap: "34px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            <FormField
              label="Contact Name"
              value={formData.contactName}
              onChange={(value) => updateField("contactName", value)}
              placeholder="Your name"
            />
            <FormField
              label="Email / Phone"
              value={formData.contactInfo}
              onChange={(value) => updateField("contactInfo", value)}
              placeholder="Where should we reply?"
            />
            <FormField
              label="Project / Idea Name"
              value={formData.itemType}
              onChange={(value) => updateField("itemType", value)}
              placeholder="e.g. Custom trophy, prop, casing..."
            />
            <FormField
              label="Quantity"
              value={formData.quantity}
              onChange={(value) => updateField("quantity", value)}
              placeholder="How many pieces?"
            />
            <FormField
              label="Approx Size"
              value={formData.size}
              onChange={(value) => updateField("size", value)}
              placeholder="Rough dimensions or palm-sized"
            />
            <FormField
              label="Deadline"
              value={formData.deadline}
              onChange={(value) => updateField("deadline", value)}
              placeholder="When do you need it?"
            />
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField
                label="Design Brief"
                value={formData.designBrief}
                onChange={(value) => updateField("designBrief", value)}
                placeholder="Describe what you want to create. Include references, function, style, colours, and purpose."
                textarea
              />
            </div>
          </div>

          <PricingGuidelinesTable />
        </div>
      )}

      <div
        style={{
          marginTop: "34px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: "16px",
        }}
      >
        <button
          type="button"
          onClick={saveRequest}
          style={{
            height: "48px",
            padding: "0 26px",
            borderRadius: "12px",
            border: "none",
            background: "#07111f",
            color: "white",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          Submit Request
        </button>

        {submitted && (
          <span style={{ color: "#2875a0", fontWeight: 750 }}>
            Request saved. Backend connection can be added later.
          </span>
        )}
      </div>
    </div>
  );
}




function getSingaporeDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function buildPuzzleFeedback(guess: string, answer: string): DailyPuzzleAttempt["feedback"] {
  const guessLetters = guess.toUpperCase().split("");
  const answerLetters = answer.toUpperCase().split("");
  const feedback: DailyPuzzleAttempt["feedback"] = ["absent", "absent", "absent", "absent", "absent"];
  const used = [false, false, false, false, false];

  guessLetters.forEach((letter, index) => {
    if (letter === answerLetters[index]) {
      feedback[index] = "correct";
      used[index] = true;
    }
  });

  guessLetters.forEach((letter, index) => {
    if (feedback[index] === "correct") return;

    const foundIndex = answerLetters.findIndex(
      (answerLetter, answerIndex) => answerLetter === letter && !used[answerIndex]
    );

    if (foundIndex >= 0) {
      feedback[index] = "present";
      used[foundIndex] = true;
    }
  });

  return feedback;
}

type CategoryQuizQuestion = {
  id: string;
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string | null;
};

type CategoriesStage =
  | "mode"
  | "category"
  | "playing"
  | "answered"
  | "finished";

const fallbackCategoryNames = [
  "World Capitals",
  "Geography",
  "History",
  "Science",
  "Culture",
];

function ActivityDetail({
  option,
  onBackToOptions,
}: {
  option: PopupOption;
  onBackToOptions: () => void;
}) {
  const screenMode = useResponsiveMode();
  const isCompact = screenMode !== "desktop";
  const isMobile = screenMode === "mobile";
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [attempts, setAttempts] = useState<DailyPuzzleAttempt[]>([]);
  const [solvedToday, setSolvedToday] = useState(false);
  const [clueBought, setClueBought] = useState(false);
  const [letterBought, setLetterBought] = useState(false);
  const [revealedLetter, setRevealedLetter] = useState("");
  const [puzzleAnswer, setPuzzleAnswer] = useState("");
  const guessInputRef = useRef<HTMLInputElement | null>(null);
  const [puzzleMessage, setPuzzleMessage] = useState("");
  const [uploadedSketchNames, setUploadedSketchNames] = useState<string[]>([]);
  const [challengeForm, setChallengeForm] = useState({
    name: "",
    contact: "",
    designTitle: "",
    category: "Desk Item",
    description: "",
    notes: "",
  });

  const isDesignChallenge = option.activityKind === "designChallenge";
  const isDailyPuzzle = option.activityKind === "dailyPuzzle";
  const isCategoriesQuiz = option.activityKind === "categoriesQuiz";
  const remainingAttempts = Math.max(0, DAILY_CODE_MAX_ATTEMPTS - attempts.length);

  const [categoriesStage, setCategoriesStage] =
    useState<CategoriesStage>("mode");
  const [categoryMode, setCategoryMode] = useState<"single" | "multiplayer">(
    "single"
  );
  const [availableCategories, setAvailableCategories] =
    useState<string[]>(fallbackCategoryNames);
  const [selectedCategory, setSelectedCategory] = useState(
    fallbackCategoryNames[0]
  );
  const [categoryQuestions, setCategoryQuestions] = useState<
    CategoryQuizQuestion[]
  >([]);
  const [categoryQuestionIndex, setCategoryQuestionIndex] = useState(0);
  const [selectedCategoryAnswer, setSelectedCategoryAnswer] =
    useState<"A" | "B" | "C" | "D" | null>(null);
  const [categoryScore, setCategoryScore] = useState(0);
  const [questionCountdown, setQuestionCountdown] = useState(10);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(3);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [isLoadingCategoryQuiz, setIsLoadingCategoryQuiz] = useState(false);

  const currentCategoryQuestion = categoryQuestions[categoryQuestionIndex];

  useEffect(() => {
    if (!isDailyPuzzle) return;

    async function loadDailyPuzzle() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPuzzleMessage("Please log in to play Milo Daily Code and earn rewards.");
        return;
      }

      const today = getSingaporeDateString();

      const { data: puzzleData, error: puzzleError } = await supabase
        .from("milo_daily_puzzles")
        .select("id,date_sg,answer,base_clue,clue_text")
        .eq("date_sg", today)
        .eq("is_active", true)
        .single();

      if (puzzleError || !puzzleData) {
        setPuzzleMessage("No daily puzzle has been published for today yet.");
        return;
      }

      setPuzzle(puzzleData as DailyPuzzle);

      const { data: progressData } = await supabase
        .from("milo_daily_puzzle_progress")
        .select("attempts,solved,clue_bought,letter_bought,revealed_letter")
        .eq("user_id", user.id)
        .eq("puzzle_id", puzzleData.id)
        .maybeSingle();

      if (progressData) {
        setAttempts((progressData.attempts || []) as DailyPuzzleAttempt[]);
        setSolvedToday(Boolean(progressData.solved));
        setClueBought(Boolean(progressData.clue_bought));
        setLetterBought(Boolean(progressData.letter_bought));
        setRevealedLetter(String(progressData.revealed_letter || ""));
      }

      const { count } = await supabase
        .from("milo_daily_puzzle_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("solved", true);

      setCompleted(count || 0);
    }

    loadDailyPuzzle();
  }, [isDailyPuzzle]);

  useEffect(() => {
    if (!isCategoriesQuiz) return;

    async function loadCategories() {
      const { data, error } = await supabase
        .from("milo_category_questions")
        .select("category")
        .eq("is_active", true);

      if (error) {
        console.warn("Could not load Milo quiz categories:", error.message);
        return;
      }

      const uniqueCategories = Array.from(
        new Set((data || []).map((item) => item.category).filter(Boolean))
      );

      if (uniqueCategories.length > 0) {
        setAvailableCategories(uniqueCategories);
        setSelectedCategory(uniqueCategories[0]);
      }
    }

    loadCategories();
  }, [isCategoriesQuiz]);

  useEffect(() => {
    if (!isCategoriesQuiz) return;
    if (categoriesStage !== "playing") return;
    if (!currentCategoryQuestion) return;

    if (questionCountdown <= 0) {
      submitCategoryAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setQuestionCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    isCategoriesQuiz,
    categoriesStage,
    questionCountdown,
    currentCategoryQuestion,
  ]);

  useEffect(() => {
    if (!isCategoriesQuiz) return;
    if (categoriesStage !== "answered") return;

    if (nextQuestionCountdown <= 0) {
      goToNextCategoryQuestion();
      return;
    }

    const timer = window.setTimeout(() => {
      setNextQuestionCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isCategoriesQuiz, categoriesStage, nextQuestionCountdown]);

  function updateChallengeField(key: keyof typeof challengeForm, value: string) {
    setChallengeForm({ ...challengeForm, [key]: value });
  }

  async function getVirtualTokenBalance(userId: string) {
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("token_kind", "virtual");

    if (error) return 0;

    return data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
  }

  async function addTokenTransaction(userId: string, amount: number, description: string) {
    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: userId,
      amount,
      token_kind: "virtual",
      type: amount < 0 ? "spend" : "earn",
      title: description,
    });

    if (error) {
      console.warn("Token transaction failed:", error);
      return false;
    }

    window.dispatchEvent(new Event("dream-tokens-updated"));
    return true;
  }

  async function savePuzzleProgress({
    nextAttempts,
    solved,
    nextClueBought = clueBought,
    nextLetterBought = letterBought,
    nextRevealedLetter = revealedLetter,
  }: {
    nextAttempts: DailyPuzzleAttempt[];
    solved: boolean;
    nextClueBought?: boolean;
    nextLetterBought?: boolean;
    nextRevealedLetter?: string;
  }) {
    if (!puzzle) return false;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const payload = {
      user_id: user.id,
      puzzle_id: puzzle.id,
      puzzle_date_sg: puzzle.date_sg,
      attempts: nextAttempts,
      solved,
      clue_bought: nextClueBought,
      letter_bought: nextLetterBought,
      revealed_letter: nextRevealedLetter,
      updated_at: new Date().toISOString(),
    };

    const { data: existingProgress, error: existingError } = await supabase
      .from("milo_daily_puzzle_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("puzzle_id", puzzle.id)
      .maybeSingle();

    if (existingError) {
      console.warn("Could not check existing puzzle progress:", existingError);
      setPuzzleMessage("Could not save puzzle progress. Please check Supabase policies.");
      return false;
    }

    const result = existingProgress?.id
      ? await supabase
          .from("milo_daily_puzzle_progress")
          .update(payload)
          .eq("id", existingProgress.id)
      : await supabase.from("milo_daily_puzzle_progress").insert(payload);

    if (result.error) {
      console.warn("Could not save puzzle progress:", result.error);
      setPuzzleMessage("Could not save puzzle progress. Please check Supabase policies.");
      return false;
    }

    return true;
  }

  function saveDesignChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submission = {
      id: `design-challenge-${Date.now()}`,
      type: "monthly-design-challenge",
      ...challengeForm,
      fileNames: uploadedSketchNames,
      createdAt: new Date().toISOString(),
    };

    const saved = JSON.parse(localStorage.getItem("milo-design-challenge-submissions") || "[]");
    localStorage.setItem(
      "milo-design-challenge-submissions",
      JSON.stringify([...saved, submission])
    );
    setSubmitted(true);
  }

  async function buyClue() {
    if (!puzzle || clueBought) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPuzzleMessage("Please log in to buy a clue.");
      return;
    }

    const balance = await getVirtualTokenBalance(user.id);

    if (balance < 1) {
      setPuzzleMessage("You need at least 1 Dreamscape Token to buy a clue.");
      return;
    }

    const spent = await addTokenTransaction(user.id, -1, `Bought clue for Milo Daily Code ${puzzle.date_sg}`);
    if (!spent) return;

    const saved = await savePuzzleProgress({
      nextAttempts: attempts,
      solved: solvedToday,
      nextClueBought: true,
    });

    if (saved) {
      setClueBought(true);
      setPuzzleMessage("Clue unlocked.");
    }
  }

  async function buyLetter() {
    if (!puzzle || letterBought) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPuzzleMessage("Please log in to buy a letter.");
      return;
    }

    const balance = await getVirtualTokenBalance(user.id);

    if (balance < 1) {
      setPuzzleMessage("You need at least 1 Dreamscape Token to buy a letter.");
      return;
    }

    const letterHint = `${puzzle.answer[0].toUpperCase()} is in position 1`;
    const spent = await addTokenTransaction(user.id, -1, `Bought letter for Milo Daily Code ${puzzle.date_sg}`);
    if (!spent) return;

    const saved = await savePuzzleProgress({
      nextAttempts: attempts,
      solved: solvedToday,
      nextLetterBought: true,
      nextRevealedLetter: letterHint,
    });

    if (saved) {
      setLetterBought(true);
      setRevealedLetter(letterHint);
      setPuzzleMessage("Letter unlocked.");
    }
  }

  async function submitPuzzle(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!puzzle) {
    setPuzzleMessage("No puzzle is available yet.");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setPuzzleMessage("Please log in to play Milo Daily Code.");
    return;
  }

  const guess = puzzleAnswer.trim().toUpperCase();

  if (solvedToday) {
    setPuzzleMessage("You already solved today’s puzzle.");
    return;
  }

  if (attempts.length >= DAILY_CODE_MAX_ATTEMPTS) {
    setPuzzleMessage(`You have used all ${DAILY_CODE_MAX_ATTEMPTS} attempts for today.`);
    return;
  }

  if (!/^[A-Z]{5}$/.test(guess)) {
    setPuzzleMessage("Enter a 5-letter word.");
    return;
  }

  const feedback = buildPuzzleFeedback(guess, puzzle.answer);
  const nextAttempts = [...attempts, { guess, feedback }];
  const solved = guess === puzzle.answer.toUpperCase();

  const saved = await savePuzzleProgress({
    nextAttempts,
    solved,
  });

  if (!saved) return;

  setAttempts(nextAttempts);
  setPuzzleAnswer("");

  if (!solved) {
    setPuzzleMessage(
      nextAttempts.length >= DAILY_CODE_MAX_ATTEMPTS
        ? "No more attempts today. Try again tomorrow."
        : "Attempt saved. Try again."
    );
    return;
  }

  setSolvedToday(true);

  const nextCompleted = completed + 1;
  setCompleted(nextCompleted);

  const reward = getDailyCodeReward(nextAttempts.length);

  const awarded = await addTokenTransaction(
    user.id,
    reward,
    `Solved Milo Daily Code ${puzzle.date_sg} in ${nextAttempts.length} guess${
      nextAttempts.length === 1 ? "" : "es"
    }`
  );

  if (awarded) {
    setPuzzleMessage(
      `Solved in ${nextAttempts.length} guess${
        nextAttempts.length === 1 ? "" : "es"
      }. You earned ${reward} Dreamscape Tokens.`
    );
  } else {
    setPuzzleMessage("Puzzle solved, but the token reward could not be saved.");
  }
}

  function chooseCategoriesMode(mode: "single" | "multiplayer") {
    setCategoryMode(mode);

    if (mode === "multiplayer") {
      setCategoryMessage(
        "Multiplayer mode will be connected after single-player mode is complete."
      );
      return;
    }

    setCategoryMessage("");
    setCategoriesStage("category");
  }

  async function startSinglePlayerCategoryQuiz() {
    setIsLoadingCategoryQuiz(true);
    setCategoryMessage("");

    const { data, error } = await supabase.rpc("get_milo_category_quiz", {
      p_category: selectedCategory,
      p_limit: 10,
    });

    if (error) {
      setCategoryMessage(`Could not load quiz: ${error.message}`);
      setIsLoadingCategoryQuiz(false);
      return;
    }

    const questions = (data || []) as CategoryQuizQuestion[];

    if (questions.length < 10) {
      setCategoryMessage(
        `This category needs at least 10 active questions. It currently has ${questions.length}.`
      );
      setIsLoadingCategoryQuiz(false);
      return;
    }

    setCategoryQuestions(questions);
    setCategoryQuestionIndex(0);
    setSelectedCategoryAnswer(null);
    setCategoryScore(0);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoriesStage("playing");
    setIsLoadingCategoryQuiz(false);
  }

  function resetCategoriesQuiz() {
    setCategoriesStage("mode");
    setCategoryQuestions([]);
    setCategoryQuestionIndex(0);
    setSelectedCategoryAnswer(null);
    setCategoryScore(0);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoryMessage("");
  }

  function submitCategoryAnswer(answer: "A" | "B" | "C" | "D" | null) {
    if (!currentCategoryQuestion) return;
    if (categoriesStage !== "playing") return;

    const finalAnswer = answer || selectedCategoryAnswer;
    const isCorrect = finalAnswer === currentCategoryQuestion.correct_option;

    if (isCorrect) {
      setCategoryScore((score) => score + 1);
    }

    setSelectedCategoryAnswer(finalAnswer);
    setCategoryMessage(
      finalAnswer
        ? isCorrect
          ? "Correct."
          : "Not quite."
        : "Time is up."
    );

    setNextQuestionCountdown(3);
    setCategoriesStage("answered");
  }

  function goToNextCategoryQuestion() {
    const nextIndex = categoryQuestionIndex + 1;

    if (nextIndex >= categoryQuestions.length) {
      setCategoriesStage("finished");
      return;
    }

    setCategoryQuestionIndex(nextIndex);
    setSelectedCategoryAnswer(null);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoryMessage("");
    setCategoriesStage("playing");
  }

  function getCategoryOptionStyle(optionLetter: "A" | "B" | "C" | "D") {
    const isSelected = selectedCategoryAnswer === optionLetter;
    const isCorrect = currentCategoryQuestion?.correct_option === optionLetter;
    const showResult = categoriesStage === "answered";

    if (showResult && isCorrect) {
      return {
        border: "1px solid rgba(34, 197, 94, 0.8)",
        background: "rgba(34, 197, 94, 0.18)",
        color: "#14532d",
      };
    }

    if (showResult && isSelected && !isCorrect) {
      return {
        border: "1px solid rgba(239, 68, 68, 0.8)",
        background: "rgba(239, 68, 68, 0.18)",
        color: "#7f1d1d",
      };
    }

    if (!showResult && isSelected) {
      return {
        border: "1px solid rgba(40,117,160,0.7)",
        background: "rgba(40,117,160,0.12)",
        color: "#07111f",
      };
    }

    return {
      border: "1px solid rgba(7,17,31,0.12)",
      background: "rgba(255,255,255,0.72)",
      color: "#07111f",
    };
  }

  const uploadBoxStyle: CSSProperties = {
    borderRadius: "18px",
    border: "1px dashed rgba(40,117,160,0.32)",
    background: "rgba(40,117,160,0.06)",
    padding: "18px",
    color: "rgba(7,17,31,0.62)",
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        padding: isMobile ? "0 14px 28px" : "0 58px 58px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <button
        type="button"
        onClick={onBackToOptions}
        style={{
          border: "1px solid rgba(7,17,31,0.12)",
          background: "rgba(255,255,255,0.74)",
          color: "#07111f",
          borderRadius: "999px",
          padding: "10px 18px",
          fontWeight: 850,
          cursor: "pointer",
        }}
      >
        ← Back to Activities
      </button>

      <div
        style={{
          marginTop: "28px",
          display: "grid",
          gridTemplateColumns:
            isDailyPuzzle || isCategoriesQuiz
              ? "1fr"
              : isCompact
              ? "1fr"
              : isDesignChallenge
              ? "0.9fr 1.1fr"
              : "1fr 1fr",
          gap: "28px",
          alignItems: "start",
        }}
      >
        {!isCategoriesQuiz && !isDailyPuzzle && (
        <div
          style={{
            borderRadius: "26px",
            border: "1px solid rgba(7,17,31,0.1)",
            background: "rgba(255,255,255,0.74)",
            padding: "28px",
            boxShadow: "0 22px 55px rgba(0,0,0,0.12)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#2875a0",
              fontSize: "12px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            {isDesignChallenge ? "Monthly Activity" : isCategoriesQuiz ? "Quiz Activity" : "Daily Activity"}
          </p>

          <h3 style={{ margin: "12px 0 0", fontSize: "34px", lineHeight: 1.05 }}>
            {option.name}
          </h3>

          <p
            style={{
              margin: "16px 0 0",
              color: "rgba(7,17,31,0.64)",
              fontSize: "16px",
              lineHeight: 1.65,
            }}
          >
            {option.description}
          </p>

          {isDesignChallenge && (
            <div style={{ marginTop: "24px", display: "grid", gap: "14px" }}>
              <MilestoneCard
                title="Monthly Winner"
                text="The selected sketch is converted into a 3D printable model and printed as a real item."
              />
              <MilestoneCard
                title="Winner Reward"
                text="1 physical print, 50 Dreamscape Tokens, and feature placement on Milo’s Design Wall."
              />
              <MilestoneCard
                title="Shortlist Reward"
                text="Shortlisted ideas can receive 10 Dreamscape Tokens and a monthly gallery mention."
              />

              <div
                style={{
                  marginTop: "10px",
                  borderRadius: "22px",
                  border: "1px solid rgba(7,17,31,0.1)",
                  background: "rgba(255,255,255,0.62)",
                  padding: "18px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#2875a0",
                        fontSize: "11px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontWeight: 900,
                      }}
                    >
                      Past Shortlisted Submissions
                    </p>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "rgba(7,17,31,0.52)",
                        fontSize: "12px",
                        lineHeight: 1.35,
                      }}
                    >
                      Monthly highlights will appear here.
                    </p>
                  </div>
                  <span style={{ color: "rgba(7,17,31,0.4)", fontSize: "12px" }}>
                    Scroll →
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    overflowX: "auto",
                    overflowY: "hidden",
                    paddingBottom: "8px",
                    scrollSnapType: "x mandatory",
                  }}
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      style={{
                        flex: "0 0 150px",
                        scrollSnapAlign: "start",
                        borderRadius: "18px",
                        border: "1px dashed rgba(40,117,160,0.22)",
                        background:
                          "linear-gradient(145deg, rgba(255,255,255,0.82), rgba(239,244,248,0.72))",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          height: "88px",
                          borderRadius: "14px",
                          border: "1px dashed rgba(7,17,31,0.14)",
                          background:
                            "radial-gradient(circle at 50% 42%, rgba(40,117,160,0.08), rgba(255,255,255,0.72))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(7,17,31,0.3)",
                          fontSize: "24px",
                        }}
                      >
                        ✦
                      </div>

                      <strong
                        style={{
                          display: "block",
                          marginTop: "10px",
                          color: "#07111f",
                          fontSize: "13px",
                          lineHeight: 1.25,
                        }}
                      >
                        Submission {index + 1}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          marginTop: "5px",
                          color: "rgba(7,17,31,0.52)",
                          fontSize: "11px",
                          lineHeight: 1.35,
                        }}
                      >
                        Placeholder showcase
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isDailyPuzzle && (
            <div style={{ marginTop: "24px", display: "grid", gap: "14px" }}>
              <MilestoneCard title="Current Progress" text={`${completed} completed puzzles`} />
              <MilestoneCard title="10 Completed" text="Redeem 10 Dreamscape Tokens." />
              <MilestoneCard title="25 Completed" text="Unlock 1 Spin & Win chance for a small item." />
              <MilestoneCard title="Attempts Today" text={`${remainingAttempts}/5 attempts left`} />
            </div>
          )}
        </div>
        )}

        {isDesignChallenge && (
          <form
            onSubmit={saveDesignChallenge}
            style={{
              borderRadius: "26px",
              border: "1px solid rgba(7,17,31,0.1)",
              background: "rgba(255,255,255,0.78)",
              padding: "28px",
              boxShadow: "0 22px 55px rgba(0,0,0,0.12)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "26px" }}>Submit Your Sketch</h3>
            <p style={{ margin: "10px 0 22px", color: "rgba(7,17,31,0.58)", lineHeight: 1.5 }}>
              Upload your sketch and tell us what you want Milo’s team to create.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
              <FormField
                label="Your Name"
                value={challengeForm.name}
                onChange={(value) => updateChallengeField("name", value)}
                placeholder="Name"
              />
              <FormField
                label="Email / Phone"
                value={challengeForm.contact}
                onChange={(value) => updateChallengeField("contact", value)}
                placeholder="Contact"
              />
            </div>

            <div style={{ marginTop: "14px" }}>
              <FormField
                label="Design Title"
                value={challengeForm.designTitle}
                onChange={(value) => updateChallengeField("designTitle", value)}
                placeholder="e.g. Rocket Pencil Holder"
              />
            </div>

            <label style={{ display: "grid", gap: "8px", marginTop: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(7,17,31,0.58)" }}>
                Product Category
              </span>
              <select
                value={challengeForm.category}
                onChange={(event) => updateChallengeField("category", event.target.value)}
                style={{
                  height: "48px",
                  borderRadius: "14px",
                  border: "1px solid rgba(7,17,31,0.12)",
                  background: "rgba(255,255,255,0.75)",
                  padding: "0 16px",
                  fontSize: "15px",
                  color: "#07111f",
                  outline: "none",
                }}
              >
                <option>Desk Item</option>
                <option>Gift / Keepsake</option>
                <option>Learning Tool</option>
                <option>Charm / Keychain</option>
                <option>Other</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "8px", marginTop: "14px" }}>
              <span style={{ fontSize: "12px", fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(7,17,31,0.58)" }}>
                Upload Sketch
              </span>
              <div style={uploadBoxStyle}>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    const names = Array.from(event.target.files || []).map((file) => file.name);
                    setUploadedSketchNames(names);
                  }}
                />
                <p style={{ margin: "10px 0 0", fontSize: "13px" }}>
                  {uploadedSketchNames.length > 0
                    ? uploadedSketchNames.join(", ")
                    : "Upload image files or PDFs of your sketch."}
                </p>
              </div>
            </label>

            <div style={{ marginTop: "14px" }}>
              <FormField
                label="Short Description"
                value={challengeForm.description}
                onChange={(value) => updateChallengeField("description", value)}
                placeholder="What is it, who is it for, and what makes it special?"
                textarea
              />
            </div>

            <div style={{ marginTop: "14px" }}>
              <FormField
                label="Extra Notes"
                value={challengeForm.notes}
                onChange={(value) => updateChallengeField("notes", value)}
                placeholder="Colours, size, wording, special details, or anything Milo should know."
                textarea
              />
            </div>

            <button type="submit" style={{
              marginTop: "20px",
              width: "100%",
              height: "48px",
              borderRadius: "12px",
              border: "none",
              background: "#07111f",
              color: "white",
              fontWeight: 850,
              cursor: "pointer",
            }}>
              Submit Design Challenge Entry
            </button>

            {submitted && (
              <p style={{ margin: "14px 0 0", color: "#2875a0", fontWeight: 800 }}>
                Entry saved. Backend submission can be connected later.
              </p>
            )}
          </form>
        )}

        {isDailyPuzzle && (
  <div
    style={{
      maxWidth: "900px",
      width: "100%",
      boxSizing: "border-box",
      margin: "0 auto",
      borderRadius: "26px",
      border: "1px solid rgba(7,17,31,0.1)",
      background: "rgba(255,255,255,0.78)",
      padding: isMobile ? "22px 12px" : "34px",
      boxShadow: "0 22px 55px rgba(0,0,0,0.12)",
      textAlign: "center",
    }}
  >
    <h3
      style={{
        margin: 0,
        fontSize: isMobile ? "30px" : "42px",
        letterSpacing: "0.02em",
      }}
    >
      Milo Daily Code
    </h3>

    <p
      style={{
        margin: "12px auto 24px",
        maxWidth: "720px",
        color: "rgba(7,17,31,0.58)",
        lineHeight: 1.7,
        fontSize: isMobile ? "15px" : "17px",
      }}
    >
      Guess the 5-letter design word in 6 attempts. Earn more Dreamscape Tokens
      when you solve it faster. Buy a clue or letter if you need help.
    </p>

    <div
      style={{
        margin: "0 auto 24px",
        maxWidth: "620px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: "10px",
      }}
    >
      {[
        ["1st guess", "60 DT"],
        ["2nd guess", "50 DT"],
        ["3rd guess", "40 DT"],
        ["4th guess", "30 DT"],
        ["5th guess", "20 DT"],
        ["6th guess", "10 DT"],
      ].map(([label, reward]) => (
        <div
          key={label}
          style={{
            borderRadius: "16px",
            border: "1px solid rgba(40,117,160,0.16)",
            background: "rgba(255,255,255,0.54)",
            padding: "12px",
          }}
        >
          <span
            style={{
              display: "block",
              color: "rgba(7,17,31,0.48)",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>

          <strong
            style={{
              display: "block",
              marginTop: "5px",
              color: "#2875a0",
              fontSize: "18px",
            }}
          >
            {reward}
          </strong>
        </div>
      ))}
    </div>

    <form onSubmit={submitPuzzle} style={{ marginTop: "24px" }}>
      <input
        ref={guessInputRef}
        value={puzzleAnswer}
        onChange={(event) =>
          setPuzzleAnswer(
            event.target.value
              .toUpperCase()
              .replace(/[^A-Z]/g, "")
              .slice(0, 5)
          )
        }
        maxLength={5}
        autoComplete="off"
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />

      <p
        style={{
          margin: "0 0 12px",
          color: "rgba(7,17,31,0.58)",
          fontSize: "12px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 850,
        }}
      >
        Your Guesses
      </p>

      <button
        type="button"
        onClick={() => guessInputRef.current?.focus()}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          display: "grid",
          gridTemplateRows: `repeat(${DAILY_CODE_MAX_ATTEMPTS}, ${
            isMobile ? "46px" : "56px"
          })`,
          gap: isMobile ? "6px" : "8px",
          cursor: "text",
          justifyContent: "center",
          margin: "0 auto",
        }}
      >
        {Array.from({ length: DAILY_CODE_MAX_ATTEMPTS }).map((_, rowIndex) => {
          const attempt = attempts[rowIndex];
          const isCurrentRow =
            rowIndex === attempts.length &&
            !solvedToday &&
            attempts.length < DAILY_CODE_MAX_ATTEMPTS;

          return (
            <span
              key={rowIndex}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(5, ${isMobile ? "46px" : "56px"})`,
                gap: isMobile ? "6px" : "8px",
                justifyContent: "center",
              }}
            >
              {Array.from({ length: 5 }).map((_, letterIndex) => {
                const attemptedLetter = attempt?.guess[letterIndex] || "";
                const currentLetter =
                  isCurrentRow ? puzzleAnswer[letterIndex] || "" : "";
                const letter = attemptedLetter || currentLetter;
                const feedback = attempt?.feedback[letterIndex];

                const background =
                  feedback === "correct"
                    ? "#4f9f64"
                    : feedback === "present"
                    ? "#d2a742"
                    : feedback === "absent"
                    ? "#8b919a"
                    : "rgba(255,255,255,0.78)";

                const color = feedback ? "white" : "#07111f";

                return (
                  <span
                    key={letterIndex}
                    style={{
                      width: isMobile ? "46px" : "56px",
                      height: isMobile ? "46px" : "56px",
                      borderRadius: "12px",
                      border: letter
                        ? "2px solid rgba(7,17,31,0.7)"
                        : "2px solid rgba(7,17,31,0.16)",
                      background,
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: isMobile ? "19px" : "23px",
                      boxShadow: feedback
                        ? "inset 0 -3px 0 rgba(0,0,0,0.12)"
                        : "none",
                    }}
                  >
                    {letter}
                  </span>
                );
              })}
            </span>
          );
        })}
      </button>

      <DailyCodeKeyboard
        attempts={attempts}
        onLetterClick={(letter) => {
          setPuzzleAnswer((current) =>
            `${current}${letter}`
              .toUpperCase()
              .replace(/[^A-Z]/g, "")
              .slice(0, 5)
          );

          guessInputRef.current?.focus();
        }}
        onDelete={() => {
          setPuzzleAnswer((current) => current.slice(0, -1));
          guessInputRef.current?.focus();
        }}
      />

      {(clueBought || letterBought) && (
        <div
          style={{
            maxWidth: "620px",
            margin: "18px auto 0",
            borderRadius: "16px",
            border: "1px solid rgba(40,117,160,0.18)",
            background: "rgba(40,117,160,0.07)",
            padding: "14px 16px",
            color: "#2875a0",
            fontWeight: 800,
            lineHeight: 1.5,
            textAlign: "left",
          }}
        >
          {clueBought && puzzle?.clue_text && <div>Clue: {puzzle.clue_text}</div>}
          {letterBought && revealedLetter && <div>Letter: {revealedLetter}</div>}
        </div>
      )}

      <div
        style={{
          maxWidth: "620px",
          margin: "22px auto 0",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={buyClue}
          disabled={!puzzle || clueBought || solvedToday}
          style={{
            height: "50px",
            borderRadius: "14px",
            border: "1px solid rgba(40,117,160,0.22)",
            background:
              !puzzle || clueBought || solvedToday
                ? "rgba(7,17,31,0.08)"
                : "rgba(40,117,160,0.12)",
            color: "#07111f",
            fontWeight: 850,
            cursor: !puzzle || clueBought || solvedToday ? "not-allowed" : "pointer",
          }}
        >
          Buy Clue — 1 DT
        </button>

        <button
          type="button"
          onClick={buyLetter}
          disabled={!puzzle || letterBought || solvedToday}
          style={{
            height: "50px",
            borderRadius: "14px",
            border: "1px solid rgba(40,117,160,0.22)",
            background:
              !puzzle || letterBought || solvedToday
                ? "rgba(7,17,31,0.08)"
                : "rgba(40,117,160,0.12)",
            color: "#07111f",
            fontWeight: 850,
            cursor:
              !puzzle || letterBought || solvedToday ? "not-allowed" : "pointer",
          }}
        >
          Buy Letter — 1 DT
        </button>
      </div>

      <button
        type="submit"
        disabled={!puzzle || solvedToday || attempts.length >= DAILY_CODE_MAX_ATTEMPTS}
        style={{
          margin: "18px auto 0",
          width: "100%",
          maxWidth: "620px",
          height: "54px",
          borderRadius: "14px",
          border: "none",
          background:
            !puzzle || solvedToday || attempts.length >= DAILY_CODE_MAX_ATTEMPTS
              ? "rgba(7,17,31,0.28)"
              : "#07111f",
          color: "white",
          fontWeight: 850,
          cursor:
            !puzzle || solvedToday || attempts.length >= DAILY_CODE_MAX_ATTEMPTS
              ? "not-allowed"
              : "pointer",
        }}
      >
        Submit Guess
      </button>
    </form>

    {puzzleMessage && (
      <p
        style={{
          maxWidth: "620px",
          margin: "16px auto 0",
          color: "#2875a0",
          fontWeight: 800,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        {puzzleMessage}
      </p>
    )}

    <p
      style={{
        maxWidth: "620px",
        margin: "20px auto 0",
        color: "rgba(7,17,31,0.48)",
        fontSize: "13px",
        lineHeight: 1.5,
      }}
    >
      Attempts left today: {remainingAttempts} / {DAILY_CODE_MAX_ATTEMPTS}
    </p>
  </div>
)}

        {isCategoriesQuiz && (
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              maxWidth: "820px",
              margin: "0 auto",
              borderRadius: "26px",
              border: "1px solid rgba(207,168,103,0.28)",
              background:
                categoriesStage === "mode"
                  ? "linear-gradient(145deg, rgba(255,250,241,0.9), rgba(242,231,214,0.88))"
                  : "rgba(255,255,255,0.78)",
              padding: isMobile ? "22px" : "28px",
              boxShadow: "0 22px 55px rgba(0,0,0,0.12)",
            }}
          >
            {categoriesStage === "mode" && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(145deg, rgba(255,255,255,0.26), rgba(255,246,232,0.38)), url('/milo-world/activities/categories-mode-bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.52,
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.24), rgba(255,255,255,0.72) 68%)",
                    pointerEvents: "none",
                  }}
                />
              </>
            )}
            {categoriesStage !== "mode" && (
              <>
                <h3 style={{ margin: 0, fontSize: "26px" }}>Categories</h3>

                <p
                  style={{
                    margin: "10px 0 22px",
                    color: "rgba(7,17,31,0.58)",
                    lineHeight: 1.5,
                  }}
                >
                  Choose a topic and begin the timed quiz.
                </p>
              </>
            )}

            {categoriesStage === "mode" && (
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: "18px",
                  minHeight: isMobile ? "auto" : "300px",
                  alignItems: "stretch",
                }}
              >
                <button
                  type="button"
                  onClick={() => chooseCategoriesMode("single")}
                  style={{
                    minHeight: isMobile ? "150px" : "260px",
                    borderRadius: "20px",
                    border: "1px solid rgba(40,117,160,0.22)",
                    background: "rgba(244,251,255,0.78)",
                    color: "#07111f",
                    fontWeight: 900,
                    cursor: "pointer",
                    padding: "18px",
                    textAlign: "left",
                    boxShadow: "0 18px 38px rgba(0,0,0,0.08)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  <span style={{ display: "block", fontSize: "22px" }}>
                    Single Player
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: "8px",
                      color: "rgba(7,17,31,0.58)",
                      fontSize: "14px",
                      lineHeight: 1.4,
                    }}
                  >
                    10 random questions. 10 seconds per question.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => chooseCategoriesMode("multiplayer")}
                  style={{
                    minHeight: isMobile ? "150px" : "260px",
                    borderRadius: "20px",
                    border: "1px solid rgba(161,94,28,0.24)",
                    background: "rgba(255,247,235,0.78)",
                    color: "#07111f",
                    fontWeight: 900,
                    cursor: "pointer",
                    padding: "18px",
                    textAlign: "left",
                    boxShadow: "0 18px 38px rgba(0,0,0,0.08)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  <span style={{ display: "block", fontSize: "22px" }}>
                    Multiplayer
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: "8px",
                      color: "rgba(7,17,31,0.58)",
                      fontSize: "14px",
                      lineHeight: 1.4,
                    }}
                  >
                    Coming next: challenge another player.
                  </span>
                </button>
              </div>
            )}

            {categoriesStage === "category" && (
              <div>
                <button
                  type="button"
                  onClick={() => setCategoriesStage("mode")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#2875a0",
                    fontWeight: 850,
                    cursor: "pointer",
                    padding: 0,
                    marginBottom: "18px",
                  }}
                >
                  ← Back to mode select
                </button>

                <label style={{ display: "grid", gap: "8px" }}>
                  <span
                    style={{
                      color: "rgba(7,17,31,0.58)",
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 850,
                    }}
                  >
                    Choose Topic
                  </span>

                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    style={{
                      height: "48px",
                      borderRadius: "14px",
                      border: "1px solid rgba(7,17,31,0.12)",
                      background: "rgba(255,255,255,0.75)",
                      padding: "0 16px",
                      fontSize: "15px",
                      color: "#07111f",
                      outline: "none",
                    }}
                  >
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={startSinglePlayerCategoryQuiz}
                  disabled={isLoadingCategoryQuiz}
                  style={{
                    marginTop: "18px",
                    width: "100%",
                    height: "50px",
                    borderRadius: "14px",
                    border: "none",
                    background: "#07111f",
                    color: "white",
                    fontWeight: 900,
                    cursor: isLoadingCategoryQuiz ? "wait" : "pointer",
                  }}
                >
                  {isLoadingCategoryQuiz ? "Loading Quiz..." : "Start 10-Question Quiz"}
                </button>
              </div>
            )}

            {(categoriesStage === "playing" || categoriesStage === "answered") &&
              currentCategoryQuestion && (
                <div style={{ marginTop: "18px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginBottom: "18px",
                    }}
                  >
                    <span
                      style={{
                        borderRadius: "999px",
                        background: "rgba(40,117,160,0.1)",
                        color: "#2875a0",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {selectedCategory}
                    </span>

                    <span
                      style={{
                        borderRadius: "999px",
                        background: "rgba(7,17,31,0.06)",
                        color: "#07111f",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 900,
                      }}
                    >
                      Question {categoryQuestionIndex + 1} / 10
                    </span>

                    <span
                      style={{
                        borderRadius: "999px",
                        background:
                          categoriesStage === "answered"
                            ? "rgba(196,122,37,0.12)"
                            : "rgba(239,68,68,0.1)",
                        color:
                          categoriesStage === "answered" ? "#8a4f13" : "#991b1b",
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: 900,
                      }}
                    >
                      {categoriesStage === "answered"
                        ? `Next in ${nextQuestionCountdown}s`
                        : `${questionCountdown}s`}
                    </span>
                  </div>

                  <h4
                    style={{
                      margin: 0,
                      fontSize: "25px",
                      lineHeight: 1.28,
                      color: "#07111f",
                    }}
                  >
                    {currentCategoryQuestion.question}
                  </h4>

                  <div style={{ marginTop: "22px", display: "grid", gap: "12px" }}>
                    {[
                      ["A", currentCategoryQuestion.option_a],
                      ["B", currentCategoryQuestion.option_b],
                      ["C", currentCategoryQuestion.option_c],
                      ["D", currentCategoryQuestion.option_d],
                    ].map(([letter, answer]) => {
                      const optionStyle = getCategoryOptionStyle(
                        letter as "A" | "B" | "C" | "D"
                      );

                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={categoriesStage === "answered"}
                          onClick={() =>
                            submitCategoryAnswer(letter as "A" | "B" | "C" | "D")
                          }
                          style={{
                            minHeight: "54px",
                            borderRadius: "14px",
                            textAlign: "left",
                            padding: "14px 16px",
                            fontWeight: 850,
                            cursor:
                              categoriesStage === "answered" ? "default" : "pointer",
                            ...optionStyle,
                          }}
                        >
                          {letter}. {answer}
                        </button>
                      );
                    })}
                  </div>

                  {categoryMessage && (
                    <p
                      style={{
                        margin: "14px 0 0",
                        color: "#2875a0",
                        fontWeight: 800,
                        lineHeight: 1.5,
                      }}
                    >
                      {categoryMessage}
                      {categoriesStage === "answered" &&
                        currentCategoryQuestion.explanation && (
                          <>
                            <br />
                            <span style={{ color: "rgba(7,17,31,0.62)" }}>
                              {currentCategoryQuestion.explanation}
                            </span>
                          </>
                        )}
                    </p>
                  )}
                </div>
              )}

            {categoriesStage === "finished" && (
              <div
                style={{
                  marginTop: "18px",
                  borderRadius: "22px",
                  border: "1px solid rgba(7,17,31,0.1)",
                  background: "rgba(255,255,255,0.72)",
                  padding: "22px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#2875a0",
                    fontSize: "12px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Quiz Complete
                </p>

                <h4 style={{ margin: "10px 0 0", fontSize: "32px" }}>
                  Score: {categoryScore} / 10
                </h4>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "rgba(7,17,31,0.62)",
                    lineHeight: 1.5,
                  }}
                >
                  {categoryScore >= 8
                    ? "Excellent. That was a strong mastery score."
                    : categoryScore >= 6
                    ? "Good pass. Try another category to improve your score."
                    : "Keep practising. These questions are designed to be tougher."}
                </p>

                <button
                  type="button"
                  onClick={resetCategoriesQuiz}
                  style={{
                    marginTop: "18px",
                    width: "100%",
                    height: "48px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#07111f",
                    color: "white",
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  Back to Mode Select
                </button>
              </div>
            )}

            {categoryMessage && categoriesStage === "mode" && (
              <p
                style={{
                  position: "relative",
                  zIndex: 2,
                  margin: "16px 0 0",
                  color: "#2875a0",
                  fontWeight: 800,
                  lineHeight: 1.5,
                }}
              >
                {categoryMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DailyCodeKeyboard({
  attempts,
  onLetterClick,
  onDelete,
}: {
  attempts: DailyPuzzleAttempt[];
  onLetterClick: (letter: string) => void;
  onDelete: () => void;
}) {
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const letterStates = getKeyboardLetterStates(attempts);

  function getKeyStyle(letter: string) {
    const state = letterStates[letter];

    if (state === "correct") {
      return {
        background: "#4f9f64",
        border: "1px solid rgba(79,159,100,0.7)",
        color: "white",
      };
    }

    if (state === "present") {
      return {
        background: "#d2a742",
        border: "1px solid rgba(210,167,66,0.7)",
        color: "white",
      };
    }

    if (state === "absent") {
      return {
        background: "#8b919a",
        border: "1px solid rgba(139,145,154,0.7)",
        color: "white",
      };
    }

    return {
      background: "rgba(255,255,255,0.78)",
      border: "1px solid rgba(7,17,31,0.14)",
      color: "#07111f",
    };
  }

  const keyWidth = isMobile ? "calc((100vw - 76px) / 10)" : "48px";
  const keyHeight = isMobile ? "48px" : "54px";
  const keyGap = isMobile ? "4px" : "8px";

  return (
    <div
      style={{
        margin: "24px auto 0",
        width: isMobile ? "calc(100vw - 34px)" : "100%",
        maxWidth: isMobile ? "calc(100vw - 34px)" : "700px",
        borderRadius: "22px",
        border: "1px solid rgba(7,17,31,0.1)",
        background: "rgba(255,255,255,0.58)",
        padding: isMobile ? "14px 8px" : "20px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          margin: "0 0 16px",
          color: "rgba(7,17,31,0.58)",
          fontSize: "12px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 850,
          textAlign: "center",
        }}
      >
        Letter Board
      </p>

      <div style={{ display: "grid", gap: isMobile ? "7px" : "10px" }}>
        {keyboardRows.map((row, rowIndex) => (
          <div
            key={row}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: keyGap,
              paddingLeft: isMobile
                ? 0
                : rowIndex === 1
                ? "22px"
                : rowIndex === 2
                ? "42px"
                : 0,
              paddingRight: isMobile
                ? 0
                : rowIndex === 1
                ? "22px"
                : rowIndex === 2
                ? "42px"
                : 0,
            }}
          >
            {row.split("").map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => onLetterClick(letter)}
                style={{
                  width: keyWidth,
                  height: keyHeight,
                  borderRadius: isMobile ? "9px" : "12px",
                  fontSize: isMobile ? "13px" : "16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.1)",
                  flexShrink: 0,
                  ...getKeyStyle(letter),
                }}
              >
                {letter}
              </button>
            ))}

            {rowIndex === 2 && (
              <button
                type="button"
                onClick={onDelete}
                style={{
                  width: isMobile ? "52px" : "76px",
                  height: keyHeight,
                  borderRadius: isMobile ? "9px" : "12px",
                  border: "1px solid rgba(7,17,31,0.14)",
                  background: "rgba(255,255,255,0.78)",
                  color: "#07111f",
                  fontSize: isMobile ? "11px" : "13px",
                  fontWeight: 900,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                DEL
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestoneCard({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        borderRadius: "18px",
        border: "1px solid rgba(7,17,31,0.1)",
        background: "rgba(255,255,255,0.62)",
        padding: "16px",
      }}
    >
      <strong style={{ display: "block", fontSize: "14px", color: "#07111f" }}>{title}</strong>
      <span style={{ display: "block", marginTop: "6px", color: "rgba(7,17,31,0.6)", fontSize: "13px", lineHeight: 1.45 }}>
        {text}
      </span>
    </div>
  );
}

function WorldPopup({
  activePopup,
  onClose,
}: {
  activePopup: PopupKind | null;
  onClose: () => void;
}) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [selectedOption, setSelectedOption] = useState<PopupOption | null>(null);
  const [selectedServiceOption, setSelectedServiceOption] = useState<PopupOption | null>(null);
  const [selectedActivityOption, setSelectedActivityOption] = useState<PopupOption | null>(null);
  const [customStep, setCustomStep] = useState(0);
  const [choices, setChoices] = useState<CustomChoices | null>(null);

  useEffect(() => {
    setSelectedOption(null);
    setSelectedServiceOption(null);
    setSelectedActivityOption(null);
    setCustomStep(0);
    setChoices(null);
  }, [activePopup]);

  if (!activePopup) return null;

  const content = popupContent[activePopup];
  const supportsCustomisation = false;

  const isActivityLabOptions =
    activePopup === "masteryLab" &&
    !selectedOption &&
    !selectedServiceOption &&
    !selectedActivityOption;

  const isCategoriesActivity =
    selectedActivityOption?.activityKind === "categoriesQuiz";

  const useCompactPopup = isActivityLabOptions || isCategoriesActivity;

const popupWidth = isMobile
  ? "calc(100vw - 20px)"
  : isActivityLabOptions
  ? "min(1380px, 96vw)"
  : isCategoriesActivity
  ? "min(980px, 92vw)"
  : "min(1680px, 96vw)";

const popupHeight = isMobile
  ? "calc(100dvh - 20px)"
  : useCompactPopup
  ? "min(720px, 86vh)"
  : "min(900px, 90vh)";

  function startCustomisation(option: PopupOption) {
    if (!option.customisation) return;
    setSelectedOption(option);
    setChoices(createInitialChoices(option));
    setCustomStep(0);
  }

  function openServiceForm(option: PopupOption) {
    if (!option.formKind) return;
    setSelectedServiceOption(option);
  }

  function openActivity(option: PopupOption) {
    if (!option.activityKind) return;
    setSelectedActivityOption(option);
  }

  function finishCustomisation() {
    if (!selectedOption || !choices) return;

    const cartItem = {
      id: `${selectedOption.name}-${Date.now()}`,
      productType: "milo-custom-gift",
      name: selectedOption.name,
      customName: choices.customName,
      baseColour: choices.baseColour,
      design: choices.design,
      primaryColour: choices.primaryColour,
      secondaryColour: choices.secondaryColour,
      image: selectedOption.imageSrc,
      quantity: 1,
    };

    const savedCart = JSON.parse(localStorage.getItem("dreamscape-cart") || "[]");
    localStorage.setItem("dreamscape-cart", JSON.stringify([...savedCart, cartItem]));

    setSelectedOption(null);
    setChoices(null);
    setCustomStep(0);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        padding: isMobile ? "10px" : isCompact ? "22px" : "44px",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      }}
      onClick={onClose}
    >
      <div
        className="milo-popup milo-scrollbar"
        style={{
          position: "relative",
          width: popupWidth,
          height: popupHeight,
          maxHeight: popupHeight,
          borderRadius: isMobile ? "20px" : "34px",
          overflowY: "auto",
          overflowX: "hidden",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(239,244,248,0.95))",
          boxShadow: "0 38px 120px rgba(0,0,0,0.58)",
          border: "1px solid rgba(255,255,255,0.72)",
          color: "#07111f",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "sticky",
            top: isMobile ? "10px" : "24px",
            left: "calc(100% - 58px)",
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

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 16% 18%, rgba(83,215,255,0.18), transparent 30%), radial-gradient(circle at 82% 18%, rgba(197,140,255,0.16), transparent 28%)",
            pointerEvents: "none",
          }}
        />

        {!selectedOption && !selectedServiceOption && !selectedActivityOption && (
          <>
            <div style={{ position: "relative", zIndex: 2, padding: isMobile ? "8px 18px 0" : "10px 58px 0" }}>
              <p
                style={{
                  margin: 0,
                  color: "#2875a0",
                  fontSize: "13px",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  fontWeight: 900,
                }}
              >
                {content.eyebrow}
              </p>

              <h2
                style={{
                  margin: "14px 0 0",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "38px" : "58px",
                  fontWeight: 500,
                  lineHeight: 1,
                  color: "#07111f",
                }}
              >
                {content.title}
              </h2>

              <p
                style={{
                  margin: "18px 0 0",
                  maxWidth: "900px",
                  color: "rgba(7,17,31,0.62)",
                  fontSize: "18px",
                  lineHeight: 1.6,
                }}
              >
                {content.description}
              </p>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 2,
                marginTop: "30px",
                padding: isMobile ? "0 18px 32px" : "0 58px 58px",
              }}
            >
              {activePopup === "membership" ? (
  <MembershipPlans onClose={onClose} />
) : (
  <>
    <div
      style={{
        display: isActivityLabOptions ? "grid" : "flex",
        gridTemplateColumns: isActivityLabOptions
          ? isMobile
            ? "1fr"
            : isCompact
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(3, minmax(0, 1fr))"
          : undefined,
        gap: isMobile ? "18px" : "24px",
        overflowX: isActivityLabOptions ? "visible" : "auto",
        overflowY: "visible",
        padding: isMobile ? "8px 0 28px" : "8px 4px 28px",
        scrollSnapType: isActivityLabOptions ? "none" : "x mandatory",
      }}
    >
      {content.options.map((option) => (
        <OptionCard
          key={option.name}
          option={option}
          onStartCustomisation={
            supportsCustomisation ? startCustomisation : undefined
          }
          onOpenServiceForm={openServiceForm}
          onOpenActivity={openActivity}
        />
      ))}
    </div>

    {!isActivityLabOptions && (
      <div
        style={{
          marginTop: "4px",
          display: isMobile ? "none" : "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "rgba(7,17,31,0.46)",
          fontSize: "13px",
        }}
      >
        <span>Scroll sideways to view more options.</span>
        <span>{content.options.length} options</span>
      </div>
    )}
  </>
)}
</div>
</>
)}

        {selectedServiceOption && (
          <ServiceRequestForm
            option={selectedServiceOption}
            onBackToOptions={() => setSelectedServiceOption(null)}
          />
        )}

        {selectedActivityOption && (
          <ActivityDetail
            option={selectedActivityOption}
            onBackToOptions={() => setSelectedActivityOption(null)}
          />
        )}

        {selectedOption && choices && (
          <CustomisationWizard
            option={selectedOption}
            choices={choices}
            setChoices={setChoices}
            step={customStep}
            setStep={setCustomStep}
            onBackToGallery={() => {
              setSelectedOption(null);
              setChoices(null);
              setCustomStep(0);
            }}
            onFinish={finishCustomisation}
          />
        )}
      </div>
    </div>
  );
}
export default function MiloWorldPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isTablet = screenMode === "tablet";
  const isMobile = screenMode === "mobile";
  const isCompact = !isDesktop;

  const [introOpen, setIntroOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<PopupKind | null>(null);
  const [dreamTokens, setDreamTokens] = useState(0);

  useEffect(() => {
    async function loadDreamTokens() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setDreamTokens(0);
        return;
      }

      const { data, error } = await supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual");

      if (error) {
        console.warn("Could not load Dreamscape Tokens:", error);
        setDreamTokens(0);
        return;
      }

      const total = data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
      setDreamTokens(total);
    }

    loadDreamTokens();

    window.addEventListener("dream-tokens-updated", loadDreamTokens);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadDreamTokens();
    });

    return () => {
      window.removeEventListener("dream-tokens-updated", loadDreamTokens);
      subscription.unsubscribe();
    };
  }, []);

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

          <Link
            href="/profile"
            style={{
              ...navButtonStyle,
              padding: isMobile ? "0 12px" : "0 24px 0 16px",
              border: "1px solid rgba(83,215,255,0.34)",
              boxShadow: "0 0 22px rgba(83,215,255,0.12)",
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
            {isMobile ? `DT ${dreamTokens}` : `Dreamscape Tokens ${dreamTokens}`}
          </Link>

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

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          top: isDesktop ? "88px" : "auto",
          left: isDesktop ? "56px" : "auto",
          zIndex: 12,
          width: isDesktop ? "auto" : "min(920px, calc(100% - 36px))",
          margin: isDesktop ? 0 : isMobile ? "38px auto 24px" : "58px auto 28px",
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
          Play, earn, and trade inside Dreamscape.
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
          width: isDesktop ? "100%" : "min(920px, calc(100% - 36px))",
          height: isDesktop ? "100%" : "auto",
          margin: isDesktop ? 0 : "0 auto",
          display: isDesktop ? "block" : "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: isMobile ? "14px" : "18px",
        }}
      >
        {zones.map((zone) => (
          <ZoneCard
            key={zone.number}
            zone={zone}
            screenMode={screenMode}
            onOpenPopup={(popup) => setActivePopup(popup)}
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
          <strong style={{ display: "block", fontSize: isMobile ? "14px" : "16px", marginBottom: "6px" }}>
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

      <WorldPopup
        activePopup={activePopup}
        onClose={() => setActivePopup(null)}
      />
    </main>
  );
}
