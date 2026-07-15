"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

type ZoneAccessKey = "core" | "think" | "express";

type ZoneUnlocks = Record<ZoneAccessKey, boolean>;

type UserMissionAccess = {
  userId: string | null;
  email: string | null;
  role: string | null;
  hasFullAccess: boolean;
  zoneUnlocks: ZoneUnlocks;
};

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

type MissionZone = {
  id: string;
  title: string;
  description: string;
  position: CSSProperties;
  accent: string;
  accessKey?: ZoneAccessKey;
};

const emptyZoneUnlocks: ZoneUnlocks = {
  core: false,
  think: false,
  express: false,
};

function normaliseRole(role: string | null) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function roleHasFullLearningAccess(role: string | null) {
  const cleanRole = normaliseRole(role);

  return cleanRole === "admin" || cleanRole === "student";
}

function getZoneHref(zoneId: string) {
  if (zoneId === "knowledge-arena") return "/learning-missions/knowledge-arena";
  if (zoneId === "core-missions") return "/learning-missions/core";
  if (zoneId === "think-missions") return "/learning-missions/think";
  if (zoneId === "express-missions") return "/learning-missions/express";
  if (zoneId === "progress-rewards") return "/learning-missions/progress-rewards";

  return null;
}

const missionZones: MissionZone[] = [
  {
    id: "knowledge-arena",
    title: "Knowledge Arena",
    description:
      "Play 10-question topic challenges, answer quickly, earn points, and collect Dreamscape Tokens.",
    accent: "#53d7ff",
    position: {
      left: "37%",
      top: "39%",
      width: "29%",
      height: "31%",
    },
  },
  {
    id: "core-missions",
    title: "Core Missions",
    description:
      "Complete English and Math missions to upgrade Nova’s Skyforge Rover.",
    accent: "#7ecbff",
    accessKey: "core",
    position: {
      left: "4%",
      top: "54%",
      width: "25%",
      height: "34%",
    },
  },
  {
    id: "think-missions",
    title: "Think Missions",
    description:
      "Train reasoning, logic, pattern spotting and HAP-style thinking to unlock Nova’s gear inventory.",
    accent: "#60f0d0",
    accessKey: "think",
    position: {
      left: "0%",
      top: "40%",
      width: "28%",
      height: "30%",
    },
  },
  {
    id: "express-missions",
    title: "Express Missions",
    description:
      "Complete writing missions to power Nova’s story system, word tools and Dreamscribe archive.",
    accent: "#ff9df0",
    accessKey: "express",
    position: {
      right: "5%",
      top: "53%",
      width: "27%",
      height: "34%",
    },
  },
  {
    id: "stretch-missions",
    title: "Stretch Missions",
    description:
      "Attempt advanced challenge tasks, HAP extensions, boss questions and harder problem-solving missions.",
    accent: "#ffd76a",
    position: {
      right: "4%",
      top: "19%",
      width: "28%",
      height: "31%",
    },
  },
  {
    id: "progress-rewards",
    title: "Progress & Rewards",
    description:
      "Track completed missions, score records, unlocked upgrades and Dreamscape Token rewards.",
    accent: "#8dfcff",
    position: {
      left: "38%",
      top: "17%",
      width: "25%",
      height: "18%",
    },
  },
];

export default function LearningMissionsPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const [hoveredZone, setHoveredZone] = useState<MissionZone | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [lockedZoneMessage, setLockedZoneMessage] = useState("");

  const [userMissionAccess, setUserMissionAccess] =
    useState<UserMissionAccess>({
      userId: null,
      email: null,
      role: null,
      hasFullAccess: false,
      zoneUnlocks: emptyZoneUnlocks,
    });

  useEffect(() => {
    async function loadUserAndTokens() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserMissionAccess({
          userId: null,
          email: null,
          role: null,
          hasFullAccess: false,
          zoneUnlocks: emptyZoneUnlocks,
        });

        setTokenBalance(0);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("Could not load user profile role:", profileError.message);
      }

      const role = profile?.role || null;
      const hasFullAccess = roleHasFullLearningAccess(role);

      let nextZoneUnlocks: ZoneUnlocks = {
        core: false,
        think: false,
        express: false,
      };

      if (hasFullAccess) {
        nextZoneUnlocks = {
          core: true,
          think: true,
          express: true,
        };
      } else {
        const { data: accessRows, error: accessError } = await supabase
          .from("learning_mission_zone_access")
          .select("zone_key,is_unlocked")
          .eq("user_id", user.id);

        if (accessError) {
          console.warn(
            "Could not load learning mission access:",
            accessError.message
          );
        }

        (accessRows || []).forEach((row) => {
          const zoneKey = row.zone_key as ZoneAccessKey;

          if (
            zoneKey === "core" ||
            zoneKey === "think" ||
            zoneKey === "express"
          ) {
            nextZoneUnlocks[zoneKey] = Boolean(row.is_unlocked);
          }
        });
      }

      setUserMissionAccess({
        userId: user.id,
        email: user.email ?? null,
        role,
        hasFullAccess,
        zoneUnlocks: nextZoneUnlocks,
      });

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

      const total =
        data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;

      setTokenBalance(total);
    }

    loadUserAndTokens();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAndTokens();
    });

    function handleTokenUpdate() {
      loadUserAndTokens();
    }

    window.addEventListener("dream-tokens-updated", handleTokenUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("dream-tokens-updated", handleTokenUpdate);
    };
  }, []);

  function isZoneUnlocked(zone: MissionZone) {
    if (!zone.accessKey) return true;

    if (userMissionAccess.hasFullAccess) return true;

    return userMissionAccess.zoneUnlocks[zone.accessKey];
  }

  function isZoneLocked(zone: MissionZone) {
    return Boolean(zone.accessKey && !isZoneUnlocked(zone));
  }

  function getLockedMessage(zone: MissionZone) {
    if (!userMissionAccess.userId) {
      return "Please log in to access this mission zone.";
    }

    return `${zone.title} is not unlocked for this account yet. Ask your teacher or admin to unlock it based on your current course.`;
  }

  function getZoneClick(zone: MissionZone) {
    const href = getZoneHref(zone.id);

    if (!href) return undefined;

    return () => {
      if (isZoneLocked(zone)) {
        setLockedZoneMessage(getLockedMessage(zone));
        return;
      }

      window.location.href = href;
    };
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        background:
          "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.18), transparent 38%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "hidden",
      }}
    >
      <FloatingMissionControls
        userEmail={userMissionAccess.email}
        tokenBalance={tokenBalance}
        screenMode={screenMode}
      />

      {isDesktop ? (
        <section
          style={{
            position: "relative",
            minHeight: "100dvh",
            width: "100%",
            backgroundImage: `
              linear-gradient(
                180deg,
                rgba(2,8,19,0.12),
                rgba(2,8,19,0.34)
              ),
              url("/nova/learning-missions/learning-missions-bg.png")
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "5vw",
              top: "13%",
              zIndex: 20,
              width: "min(620px, 42vw)",
              textAlign: "left",
              pointerEvents: "none",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8dfcff",
                fontSize: "13px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 800,
                textShadow: "0 0 16px rgba(83,215,255,0.42)",
              }}
            >
              Nova’s Mission Centre
            </p>

            <h1
              style={{
                margin: "12px 0 0",
                fontSize: "64px",
                lineHeight: 0.95,
                fontWeight: 600,
                letterSpacing: "-0.055em",
                textShadow: "0 0 32px rgba(83,215,255,0.3)",
              }}
            >
              Learning Missions
            </h1>

            <p
              style={{
                margin: "18px 0 0",
                maxWidth: "560px",
                color: "rgba(229,250,255,0.82)",
                fontSize: "18px",
                lineHeight: 1.55,
                fontWeight: 300,
              }}
            >
              Choose a mission zone to train skills, unlock Nova upgrades and
              earn Dreamscape Tokens.
            </p>

            {lockedZoneMessage && (
              <div
                style={{
                  marginTop: "18px",
                  maxWidth: "560px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,215,106,0.36)",
                  background: "rgba(255,215,106,0.1)",
                  color: "#ffd76a",
                  padding: "14px 16px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  pointerEvents: "auto",
                }}
              >
                {lockedZoneMessage}
              </div>
            )}
          </div>

          {missionZones.map((zone) => (
            <MissionHotspot
              key={zone.id}
              zone={zone}
              isLocked={isZoneLocked(zone)}
              onEnter={() => setHoveredZone(zone)}
              onLeave={() => setHoveredZone(null)}
              onClick={getZoneClick(zone)}
            />
          ))}

          {hoveredZone && (
            <ZoneHoverPopup
              zone={hoveredZone}
              isLocked={isZoneLocked(hoveredZone)}
            />
          )}

          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "28px",
              transform: "translateX(-50%)",
              zIndex: 30,
              padding: "12px 18px",
              borderRadius: "999px",
              border: "1px solid rgba(141,252,255,0.26)",
              background: "rgba(2,8,19,0.52)",
              backdropFilter: "blur(14px)",
              color: "rgba(255,255,255,0.72)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
            }}
          >
            Hover over a zone, then click to enter
          </div>
        </section>
      ) : (
        <section
          style={{
            minHeight: "100dvh",
            width: "100%",
            padding: isMobile ? "126px 16px 34px" : "128px 32px 46px",
            backgroundImage: `
              linear-gradient(
                180deg,
                rgba(2,8,19,0.34),
                rgba(2,8,19,0.88)
              ),
              url("/nova/learning-missions/learning-missions-bg.png")
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            style={{
              width: "min(980px, 100%)",
              margin: "0 auto",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8dfcff",
                fontSize: "12px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Nova’s Mission Centre
            </p>

            <h1
              style={{
                margin: "10px 0 0",
                fontSize: isMobile ? "42px" : "58px",
                lineHeight: 0.96,
                fontWeight: 600,
                letterSpacing: "-0.055em",
                textShadow: "0 0 30px rgba(83,215,255,0.24)",
              }}
            >
              Learning Missions
            </h1>

            <p
              style={{
                margin: "16px 0 0",
                maxWidth: "680px",
                color: "rgba(229,250,255,0.82)",
                fontSize: isMobile ? "16px" : "19px",
                lineHeight: 1.55,
                fontWeight: 300,
              }}
            >
              Choose a mission zone to train skills, unlock Nova upgrades and
              earn Dreamscape Tokens.
            </p>

            {lockedZoneMessage && (
              <div
                style={{
                  marginTop: "18px",
                  maxWidth: "680px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,215,106,0.36)",
                  background: "rgba(255,215,106,0.1)",
                  color: "#ffd76a",
                  padding: "14px 16px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                {lockedZoneMessage}
              </div>
            )}

            <div
              style={{
                marginTop: "28px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: "18px",
              }}
            >
              {missionZones.map((zone) => (
                <MissionCard
                  key={zone.id}
                  zone={zone}
                  isLocked={isZoneLocked(zone)}
                  onClick={getZoneClick(zone)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function FloatingMissionControls({
  userEmail,
  tokenBalance,
  screenMode,
}: {
  userEmail: string | null;
  tokenBalance: number;
  screenMode: ScreenMode;
}) {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  return (
    <>
      <Link
        href="/inventor"
        style={{
          position: "fixed",
          top: isMobile ? "12px" : "22px",
          left: isMobile ? "12px" : "22px",
          zIndex: 70,
          height: isMobile ? "40px" : "46px",
          padding: isMobile ? "0 14px" : "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(126,232,255,0.55)",
          background: "rgba(2,8,19,0.58)",
          backdropFilter: "blur(16px)",
          color: "white",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "8px" : "12px",
          fontSize: isMobile ? "11px" : "14px",
          letterSpacing: isMobile ? "0.08em" : "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 16px 36px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: isMobile ? "15px" : "18px" }}>←</span>
        {isMobile ? "Back" : "Exit Mission Centre"}
      </Link>

      <div
        style={{
          position: "fixed",
          top: isMobile ? "60px" : "22px",
          right: isMobile ? "12px" : "22px",
          left: isMobile ? "12px" : "auto",
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-end",
          gap: isMobile ? "8px" : "12px",
        }}
      >
        <Link
          href={userEmail ? "/profile" : "/login"}
          style={{
            ...controlButtonStyle,
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 14px" : "0 22px",
            fontSize: isMobile ? "11px" : "14px",
            letterSpacing: isMobile ? "0.08em" : "0.1em",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail ? "My Account" : "Log In"}
        </Link>

        <Link
          href="/cart"
          aria-label="Cart"
          style={{
            ...controlButtonStyle,
            width: isMobile ? "40px" : "46px",
            height: isMobile ? "40px" : "46px",
            padding: 0,
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          🛒
        </Link>

        <div
          style={{
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 12px" : "0 20px",
            borderRadius: "999px",
            border: "1px solid rgba(83,215,255,0.6)",
            background:
              "linear-gradient(145deg, rgba(2,14,28,0.66), rgba(2,8,19,0.74))",
            backdropFilter: "blur(16px)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "8px" : "12px",
            fontSize: isMobile ? "11px" : "14px",
            letterSpacing: isMobile ? "0.05em" : "0.08em",
            textTransform: "uppercase",
            boxShadow:
              "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(83,215,255,0.18)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: isMobile ? "22px" : "25px",
              height: isMobile ? "22px" : "25px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle, rgba(83,215,255,0.42), rgba(2,8,19,0.82))",
              border: "1px solid rgba(83,215,255,0.65)",
              color: "#bdf6ff",
              fontSize: "13px",
              boxShadow: "0 0 14px rgba(83,215,255,0.35)",
              flexShrink: 0,
            }}
          >
            ✦
          </span>

          <span>{isDesktop ? "Dreamscape Tokens" : "Tokens"}</span>

          <strong
            style={{
              color: "#53d7ff",
              fontSize: isMobile ? "13px" : "15px",
              letterSpacing: "0.08em",
            }}
          >
            {tokenBalance}
          </strong>
        </div>
      </div>
    </>
  );
}

function MissionHotspot({
  zone,
  isLocked,
  onEnter,
  onLeave,
  onClick,
}: {
  zone: MissionZone;
  isLocked: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: "absolute",
        zIndex: 25,
        ...zone.position,
        border: "1px solid transparent",
        background: "transparent",
        borderRadius: "28px",
        cursor: onClick ? "pointer" : "default",
        outline: "none",
      }}
      aria-label={isLocked ? `${zone.title} locked` : zone.title}
    />
  );
}

function MissionCard({
  zone,
  isLocked,
  onClick,
}: {
  zone: MissionZone;
  isLocked: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        minHeight: "170px",
        borderRadius: "22px",
        border: `1px solid ${zone.accent}88`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.84), rgba(3,13,34,0.92))",
        backdropFilter: "blur(18px)",
        boxShadow: `0 0 24px ${zone.accent}33, 0 18px 42px rgba(0,0,0,0.35)`,
        padding: "22px",
        color: "white",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        opacity: isLocked ? 0.58 : onClick ? 1 : 0.66,
        filter: isLocked ? "saturate(0.45)" : "none",
      }}
    >
      <p
        style={{
          margin: 0,
          color: isLocked ? "#ffd76a" : zone.accent,
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {isLocked ? "Locked Zone" : "Learning Zone"}
      </p>

      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "24px",
          lineHeight: 1.18,
          fontWeight: 700,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {zone.description}
      </p>

      <div
        style={{
          marginTop: "18px",
          color: isLocked ? "#ffd76a" : onClick ? zone.accent : "rgba(255,255,255,0.45)",
          fontSize: "14px",
          fontWeight: 700,
        }}
      >
        {isLocked ? "Locked" : onClick ? "Enter Mission ›" : "Coming Soon"}
      </div>
    </button>
  );
}

function ZoneHoverPopup({
  zone,
  isLocked,
}: {
  zone: MissionZone;
  isLocked: boolean;
}) {
  const popupPosition = getPopupPosition(zone.id);

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 60,
        ...popupPosition,
        width: "330px",
        borderRadius: "20px",
        border: `1px solid ${isLocked ? "#ffd76a" : zone.accent}aa`,
        background:
          "linear-gradient(145deg, rgba(8,35,70,0.88), rgba(3,13,34,0.92))",
        backdropFilter: "blur(18px)",
        boxShadow: `0 0 28px ${
          isLocked ? "#ffd76a55" : `${zone.accent}55`
        }, 0 24px 60px rgba(0,0,0,0.45)`,
        padding: "22px 24px",
        pointerEvents: "none",
        color: "white",
      }}
    >
      <p
        style={{
          margin: 0,
          color: isLocked ? "#ffd76a" : zone.accent,
          fontSize: "12px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {isLocked ? "Locked Zone" : "Learning Zone"}
      </p>

      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "25px",
          lineHeight: 1.18,
          fontWeight: 700,
        }}
      >
        {zone.title}
      </h2>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: "14px",
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.78)",
        }}
      >
        {zone.description}
      </p>

      {isLocked && (
        <p
          style={{
            margin: "14px 0 0",
            color: "#ffd76a",
            fontSize: "13px",
            lineHeight: 1.45,
            fontWeight: 700,
          }}
        >
          This zone is not unlocked for your account yet.
        </p>
      )}

      <div
        style={{
          marginTop: "18px",
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${
            isLocked ? "#ffd76a" : zone.accent
          }, transparent)`,
        }}
      />
    </div>
  );
}

function getPopupPosition(zoneId: string): CSSProperties {
  switch (zoneId) {
    case "knowledge-arena":
      return {
        left: "50%",
        top: "45%",
        transform: "translateX(-50%)",
      };

    case "core-missions":
      return {
        left: "6%",
        bottom: "10%",
      };

    case "think-missions":
      return {
        left: "18%",
        top: "8%",
      };

    case "express-missions":
      return {
        right: "7%",
        bottom: "10%",
      };

    case "stretch-missions":
      return {
        right: "7%",
        top: "16%",
      };

    case "progress-rewards":
      return {
        left: "50%",
        top: "9%",
        transform: "translateX(-50%)",
      };

    default:
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
  }
}

const controlButtonStyle: CSSProperties = {
  height: "46px",
  padding: "0 22px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.48)",
  background: "rgba(2,8,19,0.58)",
  backdropFilter: "blur(16px)",
  color: "white",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
};