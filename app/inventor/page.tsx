"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

const STUDENT_COVER_IMAGE = "/nova/membership/student-access-cover.png";

type ScreenMode = "desktop" | "tablet" | "mobile";

type ObjectiveKey =
  | "create-account"
  | "invite-friend"
  | "knowledge-arena-solo"
  | "milo-mastery-code"
  | "multiplayer-game"
  | "thinking-skills-lab"
  | "learning-mission";

type ObjectiveDefinition = {
  key: ObjectiveKey;
  title: string;
  description: string;
  reward: number;
  href: string;
};

type ObjectiveProgressRow = {
  objective_key: ObjectiveKey;
  stage: number;
  reward_amount: number;
  completed_at: string;
};

const STAGE_ONE_OBJECTIVES: ObjectiveDefinition[] = [
  {
    key: "create-account",
    title: "Create your Dreamscape account",
    description: "Claim your one-time account objective bonus.",
    reward: 100,
    href: "/login",
  },
  {
    key: "invite-friend",
    title: "Invite a friend",
    description: "Ask a new user to join with your referral code.",
    reward: 50,
    href: "/profile",
  },
  {
    key: "knowledge-arena-solo",
    title: "Complete a solo Knowledge Arena quiz",
    description: "Finish one 10-question single-player challenge.",
    reward: 10,
    href: "/learning-missions/knowledge-arena",
  },
  {
    key: "milo-mastery-code",
    title: "Solve Milo’s Mastery Code",
    description: "Complete one daily Mastery Code puzzle.",
    reward: 10,
    href: "/milo-world",
  },
];

const STAGE_TWO_OBJECTIVES: ObjectiveDefinition[] = [
  {
    key: "multiplayer-game",
    title: "Complete a multiplayer game",
    description: "Finish one multiplayer game with other players.",
    reward: 20,
    href: "/learning-missions/knowledge-arena",
  },
  {
    key: "thinking-skills-lab",
    title: "Complete a Thinking Skills Lab session",
    description: "Finish one full logic, pattern, or reasoning session.",
    reward: 10,
    href: "/nova/thinking-skills-lab",
  },
  {
    key: "learning-mission",
    title: "Complete a Learning Mission",
    description: "Student Access is required for this objective.",
    reward: 100,
    href: "/learning-missions",
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

type Zone = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  position: CSSProperties;
};

const zones: Zone[] = [
  {
    id: "membership-portal",
    title: "Membership Portal",
    description: "Unlock extra missions, premium access, and learning packs.",
    href: "/nova/membership-portal",
    icon: "✦",
    position: {
      right: "20%",
      top: "20%",
    },
  },
  {
    id: "thinking-skills-lab",
    title: "Thinking Skills Lab",
    description: "Play puzzles that train logic, patterns, and reasoning.",
    href: "/nova/thinking-skills-lab",
    icon: "◇",
    position: {
      left: "15%",
      top: "60%",
    },
  },
  {
    id: "learning-missions",
    title: "Learning Missions",
    description: "Complete weekly English, Math and writing missions.",
    href: "/learning-missions",
    icon: "✦",
    position: {
      right: "5%",
      top: "50%",
    },
  },
  {
    id: "inventor-hub",
    title: "Inventor Hub",
    description: "Customise student creations, reward items, and Nova products.",
    href: "/inventor/hub",
    icon: "⌂",
    position: {
      left: "53%",
      top: "50%",
      transform: "translateX(-50%)",
    },
  },
];

const novaDialogue =
  "Welcome to Nova’s World! Start at the Inventor Hub to customise creations and reward items. Visit the Thinking Skills Lab for puzzles, explore Learning Missions for weekly academic tasks, and unlock extra access through the Membership Portal.";
export default function NovaWorldPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isTablet = screenMode === "tablet";
  const isMobile = screenMode === "mobile";
  const isCompact = !isDesktop;

  const [showDialogue, setShowDialogue] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [showMembershipPortal, setShowMembershipPortal] = useState(false);
  const [completedObjectiveKeys, setCompletedObjectiveKeys] = useState<
    ObjectiveKey[]
  >([]);
  const [objectivesLoading, setObjectivesLoading] = useState(true);

  useEffect(() => {
    async function loadUserAndTokens() {
      setObjectivesLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserEmail(null);
        setTokenBalance(0);
        setCompletedObjectiveKeys([]);
        setObjectivesLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: objectiveRows, error: objectiveError } = await supabase.rpc(
        "sync_dream_objectives"
      );

      if (objectiveError) {
        console.warn(
          "Could not sync Dream Token objectives:",
          objectiveError.message
        );

        const { data: savedObjectiveRows } = await supabase
          .from("dream_objective_progress")
          .select("objective_key,stage,reward_amount,completed_at")
          .eq("user_id", user.id);

        setCompletedObjectiveKeys(
          ((savedObjectiveRows || []) as ObjectiveProgressRow[]).map(
            (row) => row.objective_key
          )
        );
      } else {
        setCompletedObjectiveKeys(
          ((objectiveRows || []) as ObjectiveProgressRow[]).map(
            (row) => row.objective_key
          )
        );
      }

      const { data, error } = await supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual");

      if (error) {
        console.warn("Could not load Dreamscape Tokens:", error);
        setTokenBalance(0);
        setObjectivesLoading(false);
        return;
      }

      const total =
        data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;

      setTokenBalance(total);
      setObjectivesLoading(false);
    }

    loadUserAndTokens();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAndTokens();
    });

    function handleProgressUpdate() {
      loadUserAndTokens();
    }

    window.addEventListener("dream-tokens-updated", handleProgressUpdate);
    window.addEventListener("dream-objectives-updated", handleProgressUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("dream-tokens-updated", handleProgressUpdate);
      window.removeEventListener(
        "dream-objectives-updated",
        handleProgressUpdate
      );
    };
  }, []);

  useEffect(() => {
    if (!showDialogue) {
      setTypedText("");
      return;
    }

    setTypedText("");

    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setTypedText(novaDialogue.slice(0, index));

      if (index >= novaDialogue.length) {
        window.clearInterval(interval);
      }
    }, 20);

    return () => {
      window.clearInterval(interval);
    };
  }, [showDialogue]);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        overflowX: "hidden",
        overflowY: isDesktop ? "hidden" : "auto",
        color: "white",
        background: "#020813",
        fontFamily: "Arial, Helvetica, sans-serif",
        paddingBottom: isDesktop ? 0 : isMobile ? "170px" : "190px",
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/nova/nova-world-bg.png"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source src="/nova/nova-world-bg-loop.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: `
            linear-gradient(
              180deg,
              rgba(2, 8, 18, 0.42) 0%,
              rgba(2, 8, 18, 0.16) 34%,
              rgba(2, 8, 18, 0.88) 100%
            ),
            radial-gradient(
              circle at 50% 38%,
              transparent 0%,
              rgba(2,8,18,0.04) 42%,
              rgba(2,8,18,0.54) 100%
            )
          `,
          pointerEvents: "none",
        }}
      />

      <FloatingControls
        userEmail={userEmail}
        tokenBalance={tokenBalance}
        screenMode={screenMode}
        completedObjectiveKeys={completedObjectiveKeys}
        objectivesLoading={objectivesLoading}
      />

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          left: isDesktop ? "46px" : "auto",
          top: isDesktop ? "80px" : "auto",
          zIndex: 10,
          width: isDesktop
            ? "min(420px, 42vw)"
            : "min(640px, calc(100% - 36px))",
          margin: isDesktop ? 0 : isMobile ? "190px auto 26px" : "108px auto 28px",
          padding: isDesktop ? 0 : "0 2px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: isMobile ? "11px" : "14px",
            fontWeight: 500,
            letterSpacing: isMobile ? "0.18em" : "0.24em",
            textTransform: "uppercase",
            color: "#69d9ff",
            textShadow: "0 8px 22px rgba(0,0,0,0.45)",
          }}
        >
          Dreamscape One Learning Hub
        </p>

        <h1
          style={{
            margin: isMobile ? "12px 0 0" : "16px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? "clamp(46px, 15vw, 64px)"
              : isTablet
              ? "clamp(58px, 9vw, 76px)"
              : "76px",
            fontWeight: 400,
            lineHeight: 1.03,
            letterSpacing: "0.01em",
            textShadow: "0 18px 48px rgba(0,0,0,0.5)",
          }}
        >
          Nova’s World
        </h1>

        <p
          style={{
            margin: "18px 0 0",
            fontSize: isMobile ? "18px" : "22px",
            fontWeight: 300,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.92)",
            textShadow: "0 12px 30px rgba(0,0,0,0.45)",
          }}
        >
          Think, learn, earn, and unlock creations.
        </p>

        <div
          style={{
            marginTop: isMobile ? "24px" : "34px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "#53d7ff",
            fontSize: isMobile ? "16px" : "19px",
            fontWeight: 300,
            letterSpacing: "0.03em",
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(83,215,255,0.4)",
              flexShrink: 0,
            }}
          >
            ›
          </span>

          <span>Choose a zone to begin</span>
        </div>
      </section>

      <div
        style={{
          position: isDesktop ? "absolute" : "relative",
          inset: isDesktop ? 0 : "auto",
          zIndex: 20,
          display: isDesktop ? "block" : "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: isMobile ? "14px" : "18px",
          width: isDesktop ? "100%" : "min(920px, calc(100% - 36px))",
          margin: isDesktop ? 0 : "0 auto",
          padding: isDesktop ? 0 : "0 0 24px",
        }}
      >
        {zones.map((zone) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            screenMode={screenMode}
            onClick={
              zone.id === "membership-portal"
                ? () => setShowMembershipPortal(true)
                : undefined
            }
          />
        ))}
      </div>

      {showMembershipPortal && (
        <MembershipPortalPopup onClose={() => setShowMembershipPortal(false)} />
      )}

      <NovaAssistant
        showDialogue={showDialogue}
        typedText={typedText}
        onOpen={() => setShowDialogue(true)}
        onClose={() => setShowDialogue(false)}
        screenMode={screenMode}
      />
    </main>
  );
}

function FloatingControls({
  userEmail,
  tokenBalance,
  screenMode,
  completedObjectiveKeys,
  objectivesLoading,
}: {
  userEmail: string | null;
  tokenBalance: number;
  screenMode: ScreenMode;
  completedObjectiveKeys: ObjectiveKey[];
  objectivesLoading: boolean;
}) {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  return (
    <>
      <Link
        href="/"
        style={{
          position: "fixed",
          top: isMobile ? "12px" : "18px",
          left: isMobile ? "12px" : "18px",
          zIndex: 70,
          height: isMobile ? "40px" : "46px",
          padding: isMobile ? "0 14px" : "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(116,200,255,0.5)",
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
          boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
        }}
      >
        <span style={{ fontSize: isMobile ? "15px" : "18px" }}>←</span>
        {isMobile ? "Home" : "Return to Home"}
      </Link>

      <div
        style={{
          position: "fixed",
          top: isMobile ? "60px" : "18px",
          right: isMobile ? "12px" : "18px",
          left: isMobile ? "12px" : "auto",
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-end",
          gap: isMobile ? "8px" : "14px",
        }}
      >
        <Link
          href={userEmail ? "/profile" : "/login"}
          style={{
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 14px" : "0 22px",
            borderRadius: "999px",
            border: "1px solid rgba(116,200,255,0.45)",
            background: "rgba(2,8,19,0.58)",
            backdropFilter: "blur(16px)",
            color: "white",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: isMobile ? "11px" : "14px",
            letterSpacing: isMobile ? "0.08em" : "0.1em",
            textTransform: "uppercase",
            boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail ? "My Account" : "Log In"}
        </Link>

        <div
          style={{
            height: isMobile ? "40px" : "46px",
            padding: isMobile ? "0 12px" : "0 20px",
            borderRadius: "999px",
            border: "1px solid rgba(83,215,255,0.55)",
            background:
              "linear-gradient(145deg, rgba(2,14,28,0.62), rgba(2,8,19,0.7))",
            backdropFilter: "blur(16px)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "8px" : "12px",
            fontSize: isMobile ? "11px" : "14px",
            letterSpacing: isMobile ? "0.05em" : "0.08em",
            textTransform: "uppercase",
            boxShadow:
              "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(83,215,255,0.16)",
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
                "radial-gradient(circle, rgba(83,215,255,0.38), rgba(2,8,19,0.8))",
              border: "1px solid rgba(83,215,255,0.6)",
              color: "#bdf6ff",
              fontSize: "13px",
              boxShadow: "0 0 14px rgba(83,215,255,0.32)",
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

      <ObjectiveBar
        userEmail={userEmail}
        completedObjectiveKeys={completedObjectiveKeys}
        objectivesLoading={objectivesLoading}
        screenMode={screenMode}
      />
    </>
  );
}


function ObjectiveBar({
  userEmail,
  completedObjectiveKeys,
  objectivesLoading,
  screenMode,
}: {
  userEmail: string | null;
  completedObjectiveKeys: ObjectiveKey[];
  objectivesLoading: boolean;
  screenMode: ScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const [isExpanded, setIsExpanded] = useState(false);

  const completedSet = new Set(completedObjectiveKeys);
  const stageOneComplete = STAGE_ONE_OBJECTIVES.every((objective) =>
    completedSet.has(objective.key)
  );

  const currentStage = stageOneComplete ? 2 : 1;
  const currentObjectives = stageOneComplete
    ? STAGE_TWO_OBJECTIVES
    : STAGE_ONE_OBJECTIVES;

  const completedCount = currentObjectives.filter((objective) =>
    completedSet.has(objective.key)
  ).length;

  const progressPercent = Math.round(
    (completedCount / currentObjectives.length) * 100
  );

  const firstIncompleteObjective = currentObjectives.find(
    (objective) => !completedSet.has(objective.key)
  );

  return (
    <aside
      style={{
        position: "fixed",
        top: isMobile ? "110px" : "78px",
        right: isMobile ? "12px" : "18px",
        left: isMobile ? "12px" : "auto",
        zIndex: 69,
        width: isMobile ? "auto" : "min(390px, calc(100vw - 36px))",
        borderRadius: isExpanded ? "20px" : "999px",
        border: "1px solid rgba(83,215,255,0.44)",
        background:
          "linear-gradient(145deg, rgba(2,14,28,0.88), rgba(2,8,19,0.92))",
        backdropFilter: "blur(18px)",
        boxShadow:
          "0 18px 44px rgba(0,0,0,0.34), 0 0 24px rgba(83,215,255,0.14)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        style={{
          width: "100%",
          minHeight: isMobile ? "52px" : "58px",
          border: "none",
          background: "transparent",
          color: "white",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: "12px",
          padding: isMobile ? "10px 14px" : "11px 16px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: isMobile ? "32px" : "36px",
            height: isMobile ? "32px" : "36px",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(83,215,255,0.62)",
            background: "rgba(83,215,255,0.12)",
            color: "#8dfcff",
            fontSize: "15px",
            flexShrink: 0,
          }}
        >
          ◎
        </span>

        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#8dfcff",
              fontSize: isMobile ? "10px" : "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Dream Token Objectives
            <span
              style={{
                borderRadius: "999px",
                background: "rgba(83,215,255,0.13)",
                padding: "3px 7px",
                color: "#bdf6ff",
                letterSpacing: "0.08em",
              }}
            >
              Stage {currentStage}
            </span>
          </span>

          <span
            style={{
              display: "block",
              marginTop: "4px",
              color: "rgba(255,255,255,0.78)",
              fontSize: isMobile ? "11px" : "12px",
              lineHeight: 1.35,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {objectivesLoading
              ? "Checking your objectives..."
              : !userEmail
              ? "Create an account to begin earning bonus DT."
              : firstIncompleteObjective
              ? `Next: ${firstIncompleteObjective.title}`
              : "All current objectives completed."}
          </span>
        </span>

        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <strong
            style={{
              color: "white",
              fontSize: isMobile ? "12px" : "13px",
              letterSpacing: "0.04em",
            }}
          >
            {completedCount}/{currentObjectives.length}
          </strong>

          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              color: "#8dfcff",
              fontSize: "16px",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          >
            ⌄
          </span>
        </span>
      </button>

      <div
        style={{
          height: "4px",
          background: "rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: "linear-gradient(90deg, #53d7ff, #8dfcff)",
            boxShadow: "0 0 14px rgba(83,215,255,0.7)",
            transition: "width 280ms ease",
          }}
        />
      </div>

      {isExpanded && (
        <div style={{ padding: isMobile ? "12px" : "14px" }}>
          {stageOneComplete && currentStage === 2 && (
            <div
              style={{
                marginBottom: "10px",
                borderRadius: "12px",
                border: "1px solid rgba(96,240,208,0.28)",
                background: "rgba(96,240,208,0.08)",
                padding: "10px 12px",
                color: "#9fffe6",
                fontSize: "12px",
                lineHeight: 1.45,
              }}
            >
              Stage 1 complete. Stage 2 is now unlocked.
            </div>
          )}

          <div style={{ display: "grid", gap: "8px" }}>
            {currentObjectives.map((objective) => {
              const isCompleted = completedSet.has(objective.key);
              const targetHref = userEmail ? objective.href : "/login";

              return (
                <Link
                  key={objective.key}
                  href={isCompleted ? "#" : targetHref}
                  onClick={(event) => {
                    if (isCompleted) event.preventDefault();
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px 1fr auto",
                    alignItems: "center",
                    gap: "10px",
                    minHeight: "64px",
                    padding: "10px 11px",
                    borderRadius: "14px",
                    border: isCompleted
                      ? "1px solid rgba(96,240,208,0.25)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: isCompleted
                      ? "rgba(96,240,208,0.08)"
                      : "rgba(255,255,255,0.04)",
                    color: "white",
                    textDecoration: "none",
                    opacity: objectivesLoading ? 0.65 : 1,
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
                      border: isCompleted
                        ? "1px solid rgba(96,240,208,0.58)"
                        : "1px solid rgba(83,215,255,0.36)",
                      background: isCompleted
                        ? "rgba(96,240,208,0.14)"
                        : "rgba(83,215,255,0.08)",
                      color: isCompleted ? "#9fffe6" : "#8dfcff",
                      fontWeight: 900,
                    }}
                  >
                    {isCompleted ? "✓" : "○"}
                  </span>

                  <span style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        color: isCompleted
                          ? "rgba(255,255,255,0.72)"
                          : "white",
                        fontSize: "13px",
                        lineHeight: 1.3,
                      }}
                    >
                      {objective.title}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "11px",
                        lineHeight: 1.35,
                      }}
                    >
                      {objective.description}
                    </span>
                  </span>

                  <strong
                    style={{
                      color: isCompleted ? "#9fffe6" : "#ffd76a",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isCompleted ? "Claimed" : `+${objective.reward} DT`}
                  </strong>
                </Link>
              );
            })}
          </div>

          <p
            style={{
              margin: "11px 4px 0",
              color: "rgba(255,255,255,0.42)",
              fontSize: "10px",
              lineHeight: 1.45,
            }}
          >
            Each objective bonus can be earned once and is added on top of the
            activity’s normal token reward.
          </p>
        </div>
      )}
    </aside>
  );
}

function ZoneCard({
  zone,
  onClick,
  screenMode,
}: {
  zone: Zone;
  onClick?: () => void;
  screenMode: ScreenMode;
}) {
  const [hovered, setHovered] = useState(false);

  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const desktopPosition = isDesktop ? zone.position : {};
  const baseTransform =
    isDesktop && typeof zone.position.transform === "string"
      ? zone.position.transform
      : "";

  const hoverTransform = hovered
    ? `${baseTransform} translateY(-3px)`.trim()
    : baseTransform || "none";

  const cardStyle: CSSProperties = {
    position: isDesktop ? "absolute" : "relative",
    zIndex: 20,
    ...desktopPosition,
    width: isDesktop ? "clamp(220px, 20vw, 280px)" : "100%",
    minHeight: isMobile ? "64px" : "70px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: isMobile ? "14px 18px" : "16px 22px",
    borderRadius: "999px",
    border: hovered
      ? "1px solid rgba(83,215,255,0.42)"
      : "1px solid rgba(135,216,255,0.24)",
    background: hovered
      ? "rgba(8, 44, 82, 0.34)"
      : "rgba(7, 20, 45, 0.28)",
    boxShadow: hovered
      ? "0 0 18px rgba(83,215,255,0.16), 0 18px 38px rgba(0,0,0,0.22)"
      : "0 12px 30px rgba(0,0,0,0.18)",
    backdropFilter: "blur(10px)",
    textDecoration: "none",
    color: "white",
    transform: hoverTransform,
    transition:
      "transform 220ms ease, border 220ms ease, box-shadow 220ms ease, background 220ms ease, opacity 220ms ease",
    cursor: "pointer",
    fontFamily: "inherit",
    opacity: hovered ? 1.2 : 0.6,
  };

  const content = (
    <h2
      style={{
        margin: 0,
        fontSize: isMobile ? "13px" : "15px",
        fontWeight: 500,
        letterSpacing: "0.12em",
        lineHeight: 1.2,
        textTransform: "uppercase",
        textAlign: "center",
        color: "rgba(255,255,255,0.92)",
        whiteSpace: "nowrap",
      }}
    >
      {zone.title}
    </h2>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...cardStyle,
          appearance: "none",
        }}
      >
        {content}
      </button>
    );
  }

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

function MembershipPortalPopup({ onClose }: { onClose: () => void }) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const [studentHovered, setStudentHovered] = useState(false);

  function openStudentAccessPage() {
  onClose();
  window.location.href = "/nova/membership-portal";
}

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "14px" : "26px",
        background: "rgba(2, 8, 19, 0.56)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(1160px, 94vw)",
          maxHeight: isMobile ? "88dvh" : "92vh",
          overflowY: "auto",
          borderRadius: isMobile ? "22px" : "30px",
          border: "1px solid rgba(126, 221, 255, 0.62)",
          background:
            "linear-gradient(145deg, rgba(15, 48, 88, 0.96), rgba(9, 24, 56, 0.98))",
          boxShadow:
            "0 0 45px rgba(85, 215, 255, 0.35), 0 30px 90px rgba(0, 0, 0, 0.55)",
          padding: isMobile ? "28px 18px 24px" : "34px 46px 38px",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: isMobile ? "14px" : "22px",
            right: isMobile ? "14px" : "22px",
            width: isMobile ? "38px" : "44px",
            height: isMobile ? "38px" : "44px",
            borderRadius: "999px",
            border: "1px solid rgba(150, 231, 255, 0.7)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "white",
            fontSize: isMobile ? "24px" : "28px",
            lineHeight: 1,
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(83, 215, 255, 0.22)",
          }}
        >
          ×
        </button>

        <div
          style={{
            textAlign: "center",
            padding: isMobile ? "0 42px" : "0 70px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7ee8ff",
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Dreamscape One
          </p>

          <h2
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "32px" : "44px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              textShadow: "0 0 24px rgba(126, 221, 255, 0.35)",
            }}
          >
            Membership Portal
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "16px" : "20px",
              color: "#7ee8ff",
              fontWeight: 300,
            }}
          >
            Choose your Nova’s World access level.
          </p>

          <div
            style={{
              width: "210px",
              maxWidth: "70%",
              height: "1px",
              margin: "20px auto 0",
              background:
                "linear-gradient(90deg, transparent, rgba(126,232,255,0.9), transparent)",
            }}
          />
        </div>

        <div
          style={{
            marginTop: isMobile ? "26px" : "38px",
            display: "grid",
            gridTemplateColumns: isDesktop ? "0.9fr 1.1fr" : "1fr",
            gap: isMobile ? "16px" : "24px",
            alignItems: "stretch",
          }}
        >
          <article
            style={{
              minHeight: isDesktop ? "540px" : "auto",
              borderRadius: "26px",
              padding: isMobile ? "28px 22px" : "34px 30px",
              border: "1px solid rgba(150, 220, 255, 0.38)",
              background:
                "linear-gradient(180deg, rgba(20, 58, 100, 0.74), rgba(8, 25, 56, 0.9))",
              boxShadow:
                "inset 0 0 24px rgba(255,255,255,0.03), 0 18px 42px rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at top left, rgba(126,232,255,0.13), transparent 42%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: "#7ee8ff",
                  fontSize: "13px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Basic Access
              </p>

              <h3
                style={{
                  margin: "24px 0 0",
                  fontSize: isMobile ? "36px" : "48px",
                  lineHeight: 1.04,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                }}
              >
                Explore Nova’s World
              </h3>

              <p
                style={{
                  margin: "28px 0 0",
                  fontSize: isMobile ? "58px" : "78px",
                  lineHeight: 0.95,
                  fontWeight: 800,
                  color: "#7ee8ff",
                  textShadow: "0 0 24px rgba(126,232,255,0.22)",
                }}
              >
                $0
              </p>

              <p
                style={{
                  margin: "22px 0 0",
                  color: "rgba(255,255,255,0.78)",
                  fontSize: "16px",
                  lineHeight: 1.6,
                }}
              >
                Basic access lets students enter Nova’s World and preview
                selected parts of the Dreamscape experience.
              </p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "32px 0 0",
                  display: "grid",
                  gap: "16px",
                }}
              >
                {[
                  "Explore selected Nova zones",
                  "Preview selected learning areas",
                  "Access basic Dreamscape Token features",
                  "Upgrade anytime to Student Access",
                ].map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr",
                      gap: "12px",
                      alignItems: "start",
                      color: "rgba(255,255,255,0.84)",
                      fontSize: "15px",
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "999px",
                        border: "1px solid rgba(126,232,255,0.65)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#7ee8ff",
                        fontSize: "13px",
                        fontWeight: 900,
                        background: "rgba(126,232,255,0.1)",
                        boxShadow: "0 0 12px rgba(126,232,255,0.24)",
                      }}
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              disabled
              style={{
                position: "relative",
                zIndex: 1,
                marginTop: "48px",
                width: "100%",
                height: "56px",
                borderRadius: "16px",
                border: "1px solid rgba(126,232,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.42)",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "not-allowed",
              }}
            >
              Current Plan
            </button>
          </article>

          <article
            onMouseEnter={() => setStudentHovered(true)}
            onMouseLeave={() => setStudentHovered(false)}
            onTouchStart={() => setStudentHovered((current) => !current)}
            onClick={openStudentAccessPage}
            style={{
              position: "relative",
              minHeight: isDesktop ? "540px" : isMobile ? "430px" : "520px",
              borderRadius: "26px",
              overflow: "hidden",
              border: "1px solid rgba(99, 232, 255, 0.85)",
              background:
                "linear-gradient(180deg, rgba(17, 82, 136, 0.94), rgba(7, 27, 68, 0.98))",
              boxShadow:
                "0 0 34px rgba(83, 215, 255, 0.42), 0 26px 74px rgba(0,0,0,0.34)",
              cursor: "pointer",
            }}
          >
            <img
              src={STUDENT_COVER_IMAGE}
              alt="Nova Student Access"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "30%center",
                display: "block",
                transform: studentHovered ? "scale(1.035)" : "scale(1)",
                transition: "transform 320ms ease",
              }}
              draggable={false}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: studentHovered
                  ? "linear-gradient(180deg, rgba(2,8,19,0.22), rgba(2,8,19,0.84))"
                  : "linear-gradient(180deg, rgba(2,8,19,0.02), rgba(2,8,19,0.16))",
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
                  background: "rgba(53,197,255,0.82)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                ✦ Recommended
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
                $1 first month
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: "24px",
                right: "24px",
                bottom: "24px",
                zIndex: 2,
                transform: studentHovered
                  ? "translateY(0)"
                  : "translateY(18px)",
                opacity: studentHovered ? 1 : 0,
                transition: "opacity 240ms ease, transform 240ms ease",
              }}
            >
              <div
                style={{
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(4,16,38,0.78)",
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
                    color: "#7ee8ff",
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Student Access Includes
                </p>

                <h3
                  style={{
                    margin: "10px 0 0",
                    fontSize: isMobile ? "28px" : "34px",
                    lineHeight: 1.05,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Full missions, rewards, and learning upgrades.
                </h3>

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
                    "Full access to Learning Missions",
                    "Regularly updated activities",
                    "Dreamscape Token rewards",
                    "Unlock and purchase future items",
                  ].map((feature) => (
                    <li
                      key={feature}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "22px 1fr",
                        gap: "10px",
                        alignItems: "start",
                        color: "rgba(255,255,255,0.88)",
                        fontSize: "14px",
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: "#7ee8ff", fontWeight: 900 }}>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    marginTop: "20px",
                    height: "52px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.32)",
                    background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 14px 28px rgba(83,215,255,0.2)",
                  }}
                >
                  Start Student Access ›
                </div>
              </div>
            </div>

            {!studentHovered && (
              <div
                style={{
                  position: "absolute",
                  left: "24px",
                  right: "24px",
                  bottom: "24px",
                  zIndex: 2,
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(126,232,255,0.24)",
                  padding: "16px 18px",
                  color: "#061632",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#256d91",
                    fontSize: "12px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Student Access
                </p>

                <h3
                  style={{
                    margin: "6px 0 0",
                    fontSize: "24px",
                    lineHeight: 1.08,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                  }}
                >
                  $1 first month
                </h3>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "rgba(6,22,50,0.62)",
                    fontSize: "13px",
                    lineHeight: 1.45,
                  }}
                >
                  Then $19.90/month. Use code DREAM1 at checkout.
                </p>
              </div>
            )}
          </article>
        </div>

        <p
          style={{
            margin: "22px 0 0",
            color: "rgba(255,255,255,0.66)",
            fontSize: "13px",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          Active Guru Kids Pro students can activate included access from the
          Student Access page.
        </p>
      </div>
    </div>
  );
}

function NovaAssistant({
  showDialogue,
  typedText,
  onOpen,
  onClose,
  screenMode,
}: {
  showDialogue: boolean;
  typedText: string;
  onOpen: () => void;
  onClose: () => void;
  screenMode: ScreenMode;
}) {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  return (
    <>
      <img
        src="/nova/nova-character.png"
        alt="Nova"
        style={{
          position: "fixed",
          right: isDesktop ? "12px" : isMobile ? "-44px" : "8px",
          bottom: "0",
          zIndex: 32,
          height: isDesktop ? "378px" : isMobile ? "215px" : "285px",
          width: "auto",
          pointerEvents: "none",
          filter: "drop-shadow(0 28px 38px rgba(0,0,0,0.55))",
        }}
      />

      {showDialogue && (
        <div
          style={{
            position: "fixed",
            right: isDesktop ? "260px" : "auto",
            left: isDesktop ? "auto" : "50%",
            bottom: isDesktop ? "155px" : isMobile ? "118px" : "132px",
            zIndex: 45,
            width: isDesktop ? "430px" : "min(430px, calc(100vw - 32px))",
            minHeight: isMobile ? "150px" : "170px",
            borderRadius: "22px",
            border: "1px solid rgba(116,200,255,0.38)",
            background:
              "linear-gradient(145deg, rgba(2,14,28,0.92), rgba(2,8,19,0.94))",
            boxShadow:
              "0 0 34px rgba(83,215,255,0.18), 0 24px 65px rgba(0,0,0,0.48)",
            backdropFilter: "blur(20px)",
            padding: isMobile ? "22px 22px" : "26px 28px",
            transform: isDesktop ? "none" : "translateX(-50%)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "18px",
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.62)",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ×
          </button>

          <p
            style={{
              margin: 0,
              color: "#53d7ff",
              fontSize: "12px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Nova Guide
          </p>

          <p
            style={{
              margin: "17px 0 0",
              color: "rgba(255,255,255,0.86)",
              fontSize: isMobile ? "15px" : "17px",
              lineHeight: 1.65,
              fontWeight: 300,
            }}
          >
            {typedText}
            <span
              style={{
                display: "inline-block",
                marginLeft: "3px",
                color: "#53d7ff",
                opacity: typedText.length < novaDialogue.length ? 1 : 0,
              }}
            >
              |
            </span>
          </p>

          {isDesktop && (
            <div
              style={{
                position: "absolute",
                right: "-12px",
                bottom: "32px",
                width: "24px",
                height: "24px",
                transform: "rotate(45deg)",
                background: "rgba(2,8,19,0.94)",
                borderTop: "1px solid rgba(116,200,255,0.28)",
                borderRight: "1px solid rgba(116,200,255,0.28)",
              }}
            />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        style={{
          position: "fixed",
          right: isDesktop ? "250px" : isMobile ? "104px" : "210px",
          bottom: isDesktop ? "38px" : "18px",
          zIndex: 42,
          width: isDesktop
            ? "330px"
            : isMobile
            ? "calc(100vw - 130px)"
            : "330px",
          maxWidth: isMobile ? "320px" : "330px",
          minHeight: isMobile ? "76px" : "88px",
          borderRadius: "18px",
          border: "1px solid rgba(116,200,255,0.36)",
          background:
            "linear-gradient(145deg, rgba(2,14,28,0.82), rgba(2,8,19,0.86))",
          backdropFilter: "blur(18px)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.38), 0 0 24px rgba(83,215,255,0.14)",
          display: "grid",
          gridTemplateColumns: isMobile ? "50px 1fr" : "64px 1fr",
          alignItems: "center",
          padding: isMobile ? "10px 12px" : "12px 18px",
          gap: isMobile ? "10px" : "14px",
          cursor: "pointer",
          color: "white",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: isMobile ? "46px" : "56px",
            height: isMobile ? "46px" : "50px",
            borderRadius: "16px",
            border: "1px solid rgba(83,215,255,0.45)",
            background:
              "radial-gradient(circle, rgba(83,215,255,0.2), rgba(2,8,19,0.9))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? "20px" : "24px",
            boxShadow: "0 0 20px rgba(83,215,255,0.2)",
          }}
        >
          ✦
        </div>

        <div>
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? "14px" : "16px",
              fontWeight: 500,
            }}
          >
            Hi, I’m Nova!
          </p>

          <p
            style={{
              margin: "6px 0 0",
              fontSize: isMobile ? "12px" : "13px",
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.68)",
            }}
          >
            Click me to learn about{" "}
            <span style={{ color: "#53d7ff" }}>Nova’s World.</span>
          </p>
        </div>
      </button>
    </>
  );
}