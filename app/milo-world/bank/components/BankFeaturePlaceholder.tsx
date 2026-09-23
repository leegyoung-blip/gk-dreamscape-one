"use client";

import type { BankScreenMode } from "../lib/bank-types";

const CONTENT = {
  savings: {
    eyebrow: "Savings Goals",
    title: "Save towards something that matters.",
    text: "Create up to three goals, move DT into them, and watch your progress grow. Savings transfers arrive in Phase 2.",
    icon: "◎",
    chips: ["Up to 3 goals", "Progress tracking", "Deposit & withdraw"],
  },
  bonds: {
    eyebrow: "Bank Bonds",
    title: "Put earned DT to work over time.",
    text: "Choose a fixed-term Dreamscape Bank Bond and see exactly what it can return at maturity. Bond products arrive in Phase 3.",
    icon: "◆",
    chips: ["Fixed terms", "Clear maturity value", "Earned DT only"],
  },
  learn: {
    eyebrow: "Money Lab",
    title: "Learn how money works by doing.",
    text: "Short interactive lessons will explain saving, interest, bonds, needs versus wants, and risk versus return. Money Lab arrives in Phase 4.",
    icon: "▦",
    chips: ["1–2 minute lessons", "Interactive examples", "One-time DT rewards"],
  },
} as const;

export default function BankFeaturePlaceholder({
  feature,
  screenMode,
}: {
  feature: keyof typeof CONTENT;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const content = CONTENT[feature];

  return (
    <section
      style={{
        marginTop: "18px",
        minHeight: isMobile ? "360px" : "420px",
        borderRadius: isMobile ? "24px" : "28px",
        border: "1px solid rgba(126,232,255,0.14)",
        background:
          "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.09), transparent 36%), linear-gradient(145deg, rgba(7,25,47,0.82), rgba(6,9,26,0.9))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "24px" : "38px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "700px" }}>
        <div
          aria-hidden="true"
          style={{
            width: "68px",
            height: "68px",
            margin: "0 auto",
            borderRadius: "22px",
            border: "1px solid rgba(126,232,255,0.28)",
            background: "rgba(83,215,255,0.08)",
            color: "#8ee8ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            boxShadow: "0 0 34px rgba(83,215,255,0.1)",
          }}
        >
          {content.icon}
        </div>

        <p style={{ margin: "20px 0 0", color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {content.eyebrow}
        </p>
        <h2
          style={{
            margin: "10px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "34px" : "44px",
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: "-0.035em",
          }}
        >
          {content.title}
        </h2>
        <p style={{ margin: "15px auto 0", maxWidth: "590px", color: "rgba(255,255,255,0.58)", fontSize: "14px", lineHeight: 1.65 }}>
          {content.text}
        </p>

        <div style={{ marginTop: "22px", display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
          {content.chips.map((chip) => (
            <span
              key={chip}
              style={{
                minHeight: "32px",
                padding: "0 11px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.09)",
                background: "rgba(255,255,255,0.035)",
                color: "rgba(255,255,255,0.55)",
                display: "inline-flex",
                alignItems: "center",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        <div style={{ marginTop: "24px", color: "rgba(255,255,255,0.34)", fontSize: "11px", fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Coming in the next build phase
        </div>
      </div>
    </section>
  );
}
