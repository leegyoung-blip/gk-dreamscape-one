"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";

type ScreenMode = "desktop" | "tablet" | "mobile";
type CoreSubject = "english" | "math";
type PrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;
type SelectorScreen = "subject" | "level";

const SUBJECTS = [
  {
    id: "english" as const,
    title: "English",
    subtitle: "Grammar, vocabulary, comprehension, writing, listening and oral skills.",
    icon: "✎",
    accent: "#ff9df0",
  },
  {
    id: "math" as const,
    title: "Mathematics",
    subtitle: "Number skills, measurement, geometry, data and problem-solving.",
    icon: "∑",
    accent: "#53d7ff",
  },
];

const LEVELS: Array<{
  id: PrimaryLevel;
  title: string;
  subtitle: string;
  accent: string;
}> = [
  { id: 1, title: "Primary 1", subtitle: "Build strong foundations.", accent: "#7ee8ff" },
  { id: 2, title: "Primary 2", subtitle: "Strengthen essential skills.", accent: "#72e6d2" },
  { id: 3, title: "Primary 3", subtitle: "Develop accuracy and confidence.", accent: "#60f0a8" },
  { id: 4, title: "Primary 4", subtitle: "Apply skills across more complex tasks.", accent: "#b6e86b" },
  { id: 5, title: "Primary 5", subtitle: "Prepare for upper-primary mastery.", accent: "#ffd76a" },
  { id: 6, title: "Primary 6", subtitle: "Consolidate and prepare for PSLE.", accent: "#ffb36b" },
];

function useResponsiveMode() {
  const [mode, setMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 720) setMode("mobile");
      else if (width <= 1180 || height > width) setMode("tablet");
      else setMode("desktop");
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
}

export default function CoreMissionsPage() {
  const router = useRouter();
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";
  const { status, tokenBalance, dreamGemBalance } = useCoreMissionAccess();

  const [screen, setScreen] = useState<SelectorScreen>("subject");
  const [selectedSubject, setSelectedSubject] = useState<CoreSubject | null>(null);

  function chooseSubject(subject: CoreSubject) {
    setSelectedSubject(subject);
    setScreen("level");
  }

  function chooseLevel(level: PrimaryLevel) {
    if (!selectedSubject) return;
    router.push(`/learning-missions/core/${selectedSubject}/p${level}`);
  }

  const subjectInfo = SUBJECTS.find((subject) => subject.id === selectedSubject);

  return (
    <main style={pageShell}>
      <header style={headerStyle(isMobile)}>
        <button
          type="button"
          onClick={() => router.push("/learning-missions")}
          style={pillButton}
        >
          ← Missions
        </button>

        {!isMobile && (
          <div style={{ textAlign: "center" }}>
            <p style={headerEyebrow}>CORE MISSIONS</p>
            <p style={headerSubtitle}>English & Mathematics</p>
          </div>
        )}

        <div style={headerActions}>
          <div style={{ ...tokenPill, ...(isMobile ? compactPill : {}) }}>
            <span style={{ color: "#ffd76a" }}>✦</span>
            {tokenBalance} DT
          </div>
          <div style={{ ...gemPill, ...(isMobile ? compactPill : {}) }}>
            <span style={{ color: "#e7b7ff" }}>◆</span>
            {dreamGemBalance} DG
          </div>
          <button
            type="button"
            onClick={() => router.push("/learning-missions/core/rover")}
            style={{ ...roverButton, ...(isMobile ? mobileRoverButton : {}) }}
          >
            {isMobile ? "Rover ›" : "My Rover ›"}
          </button>
        </div>
      </header>

      <section style={contentSection(isMobile, isCompact)}>
        <div style={glassPanel(isMobile, isCompact)}>
          {status === "checking" && <CenteredMessage text="Checking Core Missions access..." />}

          {status === "locked" && (
            <div style={centeredFill}>
              <div style={lockedCard}>
                <h2 style={{ margin: 0, fontSize: isMobile ? "26px" : "34px" }}>
                  Core Missions Locked
                </h2>
                <p style={lockedText}>Sign in with an account that has Core Missions access.</p>
                <div style={lockedActions}>
                  <a href="/login" style={{ ...primaryAction, textDecoration: "none" }}>
                    Log In
                  </a>
                  <button
                    type="button"
                    onClick={() => router.push("/learning-missions")}
                    style={ghostAction}
                  >
                    Exit
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === "allowed" && screen === "subject" && (
            <ScreenHeader
              isMobile={isMobile}
              eyebrow="CHOOSE SUBJECT"
              title="Start a Core Mission"
              description="Choose a subject, then select Primary 1 to Primary 6."
            >
              <div style={subjectGrid(isMobile)}>
                {SUBJECTS.map((subject) => (
                  <ChoiceCard
                    key={subject.id}
                    accent={subject.accent}
                    label={subject.icon}
                    title={subject.title}
                    subtitle={subject.subtitle}
                    onClick={() => chooseSubject(subject.id)}
                  />
                ))}
              </div>
            </ScreenHeader>
          )}

          {status === "allowed" && screen === "level" && subjectInfo && (
            <ScreenHeader
              isMobile={isMobile}
              eyebrow={`${subjectInfo.title.toUpperCase()} · CHOOSE LEVEL`}
              title={`${subjectInfo.title} Missions`}
              description="Each level opens its own curriculum page, topics and quiz bank."
              backLabel="← Subjects"
              onBack={() => {
                setSelectedSubject(null);
                setScreen("subject");
              }}
            >
              <div style={levelGrid(isMobile, isCompact)}>
                {LEVELS.map((level) => (
                  <ChoiceCard
                    key={level.id}
                    accent={level.accent}
                    label={`P${level.id}`}
                    title={level.title}
                    subtitle={level.subtitle}
                    onClick={() => chooseLevel(level.id)}
                  />
                ))}
              </div>
            </ScreenHeader>
          )}
        </div>
      </section>
    </main>
  );
}

function ScreenHeader({
  isMobile,
  eyebrow,
  title,
  description,
  backLabel,
  onBack,
  children,
}: {
  isMobile: boolean;
  eyebrow: string;
  title: string;
  description: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div style={screenFrame}>
      <div style={screenTopRow}>
        {backLabel && onBack ? (
          <button type="button" onClick={onBack} style={backButton}>
            {backLabel}
          </button>
        ) : (
          <span />
        )}
      </div>

      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <p style={sectionEyebrow}>{eyebrow}</p>
        <h1 style={sectionTitle(isMobile)}>{title}</h1>
        <p style={sectionDescription(isMobile)}>{description}</p>
      </div>

      <div style={screenBody(isMobile)}>{children}</div>
    </div>
  );
}

function ChoiceCard({
  accent,
  label,
  title,
  subtitle,
  onClick,
}: {
  accent: string;
  label: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={choiceCard(accent)}>
      <div style={{ color: accent, fontSize: "clamp(24px,4vh,44px)", fontWeight: 900 }}>
        {label}
      </div>
      <h2 style={choiceTitle}>{title}</h2>
      <p style={choiceSubtitle}>{subtitle}</p>
      <div style={choiceAction}>Open ›</div>
    </button>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div style={centeredFill}>
      <div style={messageCard}>{text}</div>
    </div>
  );
}

const pageShell: CSSProperties = {
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  backgroundImage: `
    linear-gradient(180deg, rgba(2,8,19,0.28), rgba(2,8,19,0.62)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
};

function headerStyle(isMobile: boolean): CSSProperties {
  return {
    height: isMobile ? "58px" : "68px",
    padding: isMobile ? "8px 10px" : "10px 18px",
    display: "grid",
    gridTemplateColumns: isMobile ? "auto minmax(0,1fr)" : "1fr auto 1fr",
    alignItems: "center",
    gap: "10px",
    textShadow: "0 2px 12px rgba(0,0,0,0.72)",
  };
}

const headerEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.2em",
  fontWeight: 900,
};

const headerSubtitle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "13px",
  opacity: 0.72,
};

const headerActions: CSSProperties = {
  justifySelf: "end",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

function contentSection(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    height: `calc(100dvh - ${isMobile ? 58 : 68}px)`,
    padding: isMobile ? "8px" : isCompact ? "12px" : "20px 28px 28px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function glassPanel(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    width: isMobile || isCompact ? "100%" : "min(1420px, calc(100vw - 72px))",
    height: isMobile || isCompact ? "100%" : "min(760px, calc(100dvh - 118px))",
    overflow: "hidden",
    borderRadius: isMobile ? "18px" : "26px",
    border: "1px solid rgba(126,232,255,0.32)",
    background: "linear-gradient(145deg, rgba(5,18,42,0.56), rgba(8,26,58,0.72))",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 0 34px rgba(83,215,255,0.12), 0 22px 58px rgba(0,0,0,0.28)",
    padding: isMobile ? "12px" : isCompact ? "18px" : "22px 24px 24px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  };
}

const screenFrame: CSSProperties = {
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

const screenTopRow: CSSProperties = {
  minHeight: "38px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const sectionEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "12px",
  letterSpacing: "0.2em",
  fontWeight: 900,
};

function sectionTitle(isMobile: boolean): CSSProperties {
  return {
    margin: "5px 0 0",
    fontSize: isMobile ? "24px" : "clamp(38px,3vw,52px)",
    lineHeight: 1.05,
  };
}

function sectionDescription(isMobile: boolean): CSSProperties {
  return {
    margin: "7px auto 0",
    maxWidth: "760px",
    fontSize: isMobile ? "12px" : "16px",
    color: "rgba(255,255,255,0.62)",
  };
}

function screenBody(isMobile: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    marginTop: isMobile ? "10px" : "16px",
  };
}

function subjectGrid(isMobile: boolean): CSSProperties {
  return {
    width: "100%",
    height: isMobile ? "100%" : "min(470px,100%)",
    maxWidth: isMobile ? "none" : "1160px",
    minHeight: 0,
    margin: "auto",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
    gridTemplateRows: isMobile ? "repeat(2,minmax(0,1fr))" : "1fr",
    gap: isMobile ? "12px" : "18px",
  };
}

function levelGrid(isMobile: boolean, isCompact: boolean): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : isCompact
        ? "repeat(3,minmax(0,1fr))"
        : "repeat(3,minmax(0,1fr))",
    gridTemplateRows: isMobile
      ? "repeat(3,minmax(0,1fr))"
      : "repeat(2,minmax(0,1fr))",
    gap: isMobile ? "8px" : "14px",
  };
}

function choiceCard(accent: string): CSSProperties {
  return {
    minHeight: 0,
    height: "100%",
    borderRadius: "20px",
    border: `1px solid ${accent}77`,
    background: "linear-gradient(180deg, rgba(20,58,100,0.66), rgba(8,25,56,0.78))",
    color: "white",
    padding: "clamp(10px,2vh,22px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: `0 0 24px ${accent}18`,
    overflow: "hidden",
  };
}

const choiceTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(18px,2.6vh,30px)",
};

const choiceSubtitle: CSSProperties = {
  margin: "7px auto 0",
  maxWidth: "420px",
  color: "rgba(255,255,255,0.68)",
  lineHeight: 1.4,
  fontSize: "clamp(10px,1.55vh,15px)",
};

const choiceAction: CSSProperties = {
  marginTop: "clamp(8px,1.7vh,18px)",
  minHeight: "36px",
  minWidth: "120px",
  borderRadius: "11px",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 800,
};

const pillButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const roverButton: CSSProperties = {
  ...pillButton,
  border: "1px solid rgba(255,215,106,0.45)",
  background: "linear-gradient(135deg, rgba(255,215,106,0.2), rgba(83,215,255,0.17))",
  color: "#fff3c4",
};

const mobileRoverButton: CSSProperties = {
  minHeight: "34px",
  padding: "0 8px",
  fontSize: "10px",
};

const tokenPill: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.24)",
  background: "rgba(255,215,106,0.08)",
  padding: "0 13px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const gemPill: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(231,183,255,0.3)",
  background: "rgba(168,85,247,0.11)",
  padding: "0 13px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#f4e8ff",
  fontSize: "13px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const compactPill: CSSProperties = {
  minHeight: "34px",
  padding: "0 7px",
  gap: "4px",
  fontSize: "10px",
};

const backButton: CSSProperties = {
  minHeight: "34px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "0 12px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

const centeredFill: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const messageCard: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(255,255,255,0.06)",
  padding: "24px",
  color: "rgba(255,255,255,0.78)",
};

const lockedCard: CSSProperties = {
  width: "min(620px,100%)",
  borderRadius: "22px",
  border: "1px solid rgba(255,215,106,0.4)",
  background: "linear-gradient(180deg, rgba(90,62,16,0.55), rgba(30,20,8,0.8))",
  padding: "28px",
  textAlign: "center",
};

const lockedText: CSSProperties = {
  margin: "12px 0 0",
  lineHeight: 1.55,
  opacity: 0.72,
};

const lockedActions: CSSProperties = {
  marginTop: "20px",
  display: "flex",
  justifyContent: "center",
  gap: "10px",
};

const primaryAction: CSSProperties = {
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontWeight: 800,
};

const ghostAction: CSSProperties = {
  ...primaryAction,
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.06)",
};
