"use client";

import type { BankAccountSnapshot, BankScreenMode, BankSection } from "../lib/bank-types";

function formatDt(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

const AREAS: Array<{
  id: BankSection;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  icon: string;
  accent: string;
}> = [
  {
    id: "learn",
    eyebrow: "Financial Learning",
    title: "Learn",
    description: "Understand money, banking, markets and business through structured financial lessons.",
    meta: "6 foundation lessons available",
    icon: "▦",
    accent: "#8ee8ff",
  },
  {
    id: "practise",
    eyebrow: "Decision Studio",
    title: "Practise",
    description: "Apply ideas through budgets, simulations, cases and financial decisions.",
    meta: "Simulation suite in development",
    icon: "◇",
    accent: "#b8a8ff",
  },
  {
    id: "money",
    eyebrow: "Personal Finance",
    title: "My Money",
    description: "Manage your Dream Tokens, savings goals, Bank Bonds and transaction statement.",
    meta: "Wallet · Savings · Bonds · Statement",
    icon: "◆",
    accent: "#9fffd2",
  },
  {
    id: "progress",
    eyebrow: "Financial Development",
    title: "My Progress",
    description: "Follow your learning journey, milestones and the financial skills you are building.",
    meta: "Milestones available now",
    icon: "◎",
    accent: "#ffd18a",
  },
];

export default function BankHomeDashboard({
  account,
  loading,
  screenMode,
  unlockedCount,
  totalMilestones,
  milestoneProgress,
  foundationCompleted,
  foundationTotal,
  onOpenSection,
}: {
  account: BankAccountSnapshot;
  loading: boolean;
  screenMode: BankScreenMode;
  unlockedCount: number;
  totalMilestones: number;
  milestoneProgress: number;
  foundationCompleted: number;
  foundationTotal: number;
  onOpenSection: (section: BankSection) => void;
}) {
  const isMobile = screenMode === "mobile";
  const compact = screenMode !== "desktop";

  return (
    <div style={{ marginTop: isMobile ? "18px" : "22px", display: "grid", gap: "14px" }}>
      <section
        style={{
          borderRadius: isMobile ? "24px" : "30px",
          border: "1px solid rgba(126,232,255,0.17)",
          background:
            "radial-gradient(circle at 8% 0%, rgba(83,215,255,0.11), transparent 29%), radial-gradient(circle at 95% 8%, rgba(157,111,255,0.11), transparent 29%), linear-gradient(145deg, rgba(5,21,40,0.89), rgba(5,10,27,0.94))",
          boxShadow: "0 30px 90px rgba(0,0,0,0.26)",
          padding: isMobile ? "20px" : "26px 28px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "1.25fr 0.75fr",
            gap: compact ? "18px" : "28px",
            alignItems: "center",
          }}
        >
          <div>
            <p style={eyebrowStyle}>Your financial journey</p>
            <h2
              style={{
                margin: "8px 0 0",
                maxWidth: "720px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "34px" : "46px",
                lineHeight: 1.02,
                fontWeight: 500,
                letterSpacing: "-0.035em",
              }}
            >
              Learn how money works. Put it into practice. See how your decisions improve.
            </h2>
            <p style={{ margin: "14px 0 0", maxWidth: "690px", color: "rgba(255,255,255,0.52)", fontSize: "12px", lineHeight: 1.65 }}>
              Milo’s Bank is your financial learning centre in Milo’s World. Move between learning, practice, your own DT tools and progress whenever you need them.
            </p>
          </div>

          <div
            style={{
              borderRadius: "20px",
              border: "1px solid rgba(126,232,255,0.13)",
              background: "rgba(3,12,29,0.49)",
              padding: "17px",
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase" }}>
              Financial snapshot
            </div>
            <strong style={{ display: "block", marginTop: "7px", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "38px", fontWeight: 500, letterSpacing: "-0.035em" }}>
              {loading ? "—" : formatDt(account.total)}
            </strong>
            <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "7px" }}>
              <Metric label="Available" value={loading ? "—" : formatDt(account.available)} />
              <Metric label="Savings" value={loading ? "—" : formatDt(account.savings)} />
              <Metric label="Bonds" value={loading ? "—" : formatDt(account.bonds)} />
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        {AREAS.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => onOpenSection(area.id)}
            style={{
              minHeight: isMobile ? "176px" : "190px",
              padding: isMobile ? "19px" : "22px",
              borderRadius: "22px",
              border: "1px solid rgba(255,255,255,0.09)",
              background:
                "linear-gradient(145deg, rgba(7,25,47,0.82), rgba(5,10,27,0.91))",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              boxShadow: "0 20px 56px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              transition: "transform 170ms ease, border-color 170ms ease, background 170ms ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = "translateY(-2px)";
              event.currentTarget.style.borderColor = `${area.accent}55`;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "translateY(0)";
              event.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div>
                <div style={{ color: area.accent, fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  {area.eyebrow}
                </div>
                <h3 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "34px", lineHeight: 1, fontWeight: 500 }}>
                  {area.title}
                </h3>
              </div>
              <span aria-hidden="true" style={{ width: "42px", height: "42px", borderRadius: "14px", border: `1px solid ${area.accent}42`, background: `${area.accent}10`, color: area.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                {area.icon}
              </span>
            </div>

            <p style={{ margin: "15px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "12px", lineHeight: 1.58, maxWidth: "520px" }}>
              {area.description}
            </p>

            <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ color: "rgba(255,255,255,0.36)", fontSize: "9px", fontWeight: 800, letterSpacing: "0.055em", textTransform: "uppercase" }}>
                {area.id === "learn"
                  ? `${foundationCompleted}/${foundationTotal} foundation lessons completed`
                  : area.id === "progress"
                    ? `${unlockedCount}/${totalMilestones} milestones · ${milestoneProgress}%`
                    : area.meta}
              </span>
              <span style={{ color: area.accent, fontSize: "16px" }}>→</span>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, borderRadius: "12px", border: "1px solid rgba(255,255,255,0.055)", background: "rgba(255,255,255,0.025)", padding: "10px" }}>
      <div style={{ color: "rgba(255,255,255,0.34)", fontSize: "7px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <strong style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.82)", fontSize: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</strong>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.17em",
  textTransform: "uppercase",
} as const;
