"use client";

import { useEffect, useState } from "react";
import type { BankScreenMode, BankTab } from "../lib/bank-types";

const GUIDE_STORAGE_KEY = "milo-bank-guide-seen-v1";

const STEPS: Array<{
  eyebrow: string;
  title: string;
  body: string;
  tab?: BankTab;
}> = [
  {
    eyebrow: "Welcome",
    title: "This is Milo’s Bank.",
    body: "Your Bank brings your Dream Tokens into one place. You can see what is available, set DT aside, learn how Bonds work and build money skills.",
  },
  {
    eyebrow: "Wallet",
    title: "Know what you can use now.",
    body: "Wallet shows the DT currently available to spend, what moved this month and your recent Bank statement.",
    tab: "wallet",
  },
  {
    eyebrow: "Savings Goals",
    title: "Set DT aside for a purpose.",
    body: "Savings Goals reserve DT so they cannot be spent elsewhere until you move them back to your Wallet.",
    tab: "savings",
  },
  {
    eyebrow: "Bank Bonds",
    title: "Learn about time and fixed returns.",
    body: "Eligible earned DT can be locked into fictional Dreamscape Bonds. When a Bond matures, its principal unlocks and its fixed game return can be collected.",
    tab: "bonds",
  },
  {
    eyebrow: "Money Lab",
    title: "Learn the ideas behind the systems.",
    body: "Money Lab has short interactive lessons on saving, interest, Bonds, risk, returns, needs and wants. Each lesson gives its DT reward once.",
    tab: "learn",
  },
  {
    eyebrow: "You’re ready",
    title: "Earn. Save. Learn. Grow.",
    body: "Use the four Bank sections in any order. Your milestones track progress automatically, and you can reopen this guide whenever you want.",
  },
];

export function hasSeenBankGuide() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(GUIDE_STORAGE_KEY) === "1";
}

export default function BankGuide({
  open,
  onClose,
  onChangeTab,
  screenMode,
}: {
  open: boolean;
  onClose: () => void;
  onChangeTab: (tab: BankTab) => void;
  screenMode: BankScreenMode;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const isMobile = screenMode === "mobile";
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step.tab) return;
    onChangeTab(step.tab);
  }, [onChangeTab, open, step.tab]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function finish() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUIDE_STORAGE_KEY, "1");
    }
    onClose();
  }

  if (!open) return null;

  const isLast = stepIndex === STEPS.length - 1;

  return (
    <aside
      aria-live="polite"
      aria-label="Milo’s Bank guide"
      style={{
        position: "fixed",
        zIndex: 110,
        right: isMobile ? "10px" : "22px",
        left: isMobile ? "10px" : "auto",
        bottom: isMobile ? "10px" : "22px",
        width: isMobile ? "auto" : "min(390px, calc(100vw - 44px))",
        borderRadius: isMobile ? "22px" : "24px",
        border: "1px solid rgba(126,232,255,0.24)",
        background:
          "radial-gradient(circle at 10% 0%, rgba(83,215,255,0.13), transparent 35%), linear-gradient(145deg, rgba(8,29,52,0.98), rgba(5,9,24,0.99))",
        boxShadow: "0 28px 86px rgba(0,0,0,0.56)",
        padding: isMobile ? "16px" : "18px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
        <div
          aria-hidden="true"
          style={{
            width: "42px",
            height: "42px",
            flexShrink: 0,
            borderRadius: "14px",
            border: "1px solid rgba(126,232,255,0.24)",
            background: "linear-gradient(135deg, rgba(83,215,255,0.16), rgba(111,85,225,0.16))",
            color: "#bdf6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "20px",
            fontWeight: 700,
          }}
        >
          M
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#8ee8ff",
              fontSize: "8px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Milo’s Guide · {stepIndex + 1}/{STEPS.length}
          </div>
          <strong style={{ display: "block", marginTop: "3px", fontSize: "13px" }}>
            {step.eyebrow}
          </strong>
        </div>
        <button type="button" onClick={finish} aria-label="Close guide" style={closeStyle}>
          ×
        </button>
      </div>

      <h3
        style={{
          margin: "15px 0 0",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: isMobile ? "27px" : "30px",
          lineHeight: 1.05,
          fontWeight: 500,
          letterSpacing: "-0.025em",
        }}
      >
        {step.title}
      </h3>
      <p
        style={{
          margin: "10px 0 0",
          color: "rgba(255,255,255,0.56)",
          fontSize: "12px",
          lineHeight: 1.58,
        }}
      >
        {step.body}
      </p>

      <div
        aria-hidden="true"
        style={{
          marginTop: "15px",
          display: "grid",
          gridTemplateColumns: `repeat(${STEPS.length}, minmax(0,1fr))`,
          gap: "5px",
        }}
      >
        {STEPS.map((_, index) => (
          <span
            key={index}
            style={{
              height: "4px",
              borderRadius: "999px",
              background:
                index <= stepIndex ? "#8ee8ff" : "rgba(255,255,255,0.09)",
            }}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: stepIndex === 0 ? "1fr" : "0.8fr 1.2fr",
          gap: "8px",
        }}
      >
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            style={secondaryStyle}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (isLast) finish();
            else setStepIndex((current) => Math.min(STEPS.length - 1, current + 1));
          }}
          style={primaryStyle}
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </aside>
  );
}

const closeStyle = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "rgba(255,255,255,0.70)",
  cursor: "pointer",
  fontSize: "20px",
  lineHeight: 1,
} as const;

const secondaryStyle = {
  minHeight: "42px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.72)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
} as const;

const primaryStyle = {
  minHeight: "42px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.36)",
  background: "linear-gradient(135deg, rgba(83,215,255,0.18), rgba(92,80,210,0.16))",
  color: "white",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
} as const;
