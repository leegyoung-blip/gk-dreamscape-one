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
    description: "Courses in money, banking, markets, decisions and enterprise.",
    meta: "Structured courses",
    icon: "▦",
    accent: "#8ee8ff",
  },
  {
    id: "practise",
    eyebrow: "Decision Studio",
    title: "Practise",
    description: "Apply ideas through simulations, cases and financial decisions.",
    meta: "Simulations & cases",
    icon: "◇",
    accent: "#b8a8ff",
  },
  {
    id: "money",
    eyebrow: "Personal Finance",
    title: "My Money",
    description: "Your DT wallet, savings goals, Bank Bonds and statements.",
    meta: "Wallet · Savings · Bonds",
    icon: "◆",
    accent: "#9fffd2",
  },
  {
    id: "progress",
    eyebrow: "Financial Development",
    title: "My Progress",
    description: "See course progress, skill evidence, history and milestones.",
    meta: "Skills & evidence",
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
  const isDesktop = screenMode === "desktop";

  return (
    <div
      style={{
        marginTop: isMobile ? "12px" : "14px",
        display: "grid",
        gap: isDesktop ? "10px" : "12px",
      }}
    >
      <section
        style={{
          borderRadius: isMobile ? "20px" : "24px",
          border: "1px solid rgba(126,232,255,0.16)",
          background:
            "radial-gradient(circle at 8% 0%, rgba(83,215,255,0.10), transparent 30%), radial-gradient(circle at 96% 8%, rgba(157,111,255,0.09), transparent 28%), linear-gradient(145deg, rgba(5,21,40,0.86), rgba(5,10,27,0.92))",
          boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
          padding: isDesktop ? "15px 18px" : isMobile ? "18px" : "20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1.15fr 0.85fr" : "1fr",
            gap: isDesktop ? "20px" : "14px",
            alignItems: "center",
          }}
        >
          <div>
            <p style={eyebrowStyle}>At a glance</p>
            <h2
              style={{
                margin: "6px 0 0",
                maxWidth: "900px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isDesktop ? "30px" : isMobile ? "29px" : "36px",
                lineHeight: 1.03,
                fontWeight: 500,
                letterSpacing: "-0.03em",
              }}
            >
              Your money, learning and progress in one place.
            </h2>
            {!isDesktop && (
              <p
                style={{
                  margin: "10px 0 0",
                  maxWidth: "760px",
                  color: "rgba(255,255,255,0.50)",
                  fontSize: "11px",
                  lineHeight: 1.55,
                }}
              >
                Move between structured learning, practice, your own DT tools and evidence of the skills you are building.
              </p>
            )}
            <div
              style={{
                marginTop: isDesktop ? "10px" : "13px",
                display: "flex",
                gap: "7px",
                flexWrap: "wrap",
              }}
            >
              <MiniStatus
                label="Foundations"
                value={`${foundationCompleted}/${foundationTotal || 0} complete`}
              />
              <MiniStatus
                label="Milestones"
                value={`${unlockedCount}/${totalMilestones || 0} unlocked`}
              />
              <MiniStatus label="Journey" value={`${milestoneProgress}%`} />
            </div>
          </div>

          <div
            style={{
              borderRadius: "17px",
              border: "1px solid rgba(126,232,255,0.12)",
              background: "rgba(3,12,29,0.50)",
              padding: isDesktop ? "12px 13px" : "15px",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
              }}
            >
              Financial snapshot
            </div>
            <strong
              style={{
                display: "block",
                marginTop: "4px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isDesktop ? "28px" : "32px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
              }}
            >
              {loading ? "—" : formatDt(account.total)}
            </strong>
            <div
              style={{
                marginTop: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: "6px",
              }}
            >
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
          gridTemplateColumns: isDesktop
            ? "repeat(4, minmax(0, 1fr))"
            : isMobile
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
          gap: isDesktop ? "9px" : "11px",
        }}
      >
        {AREAS.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => onOpenSection(area.id)}
            style={{
              minHeight: isDesktop ? "142px" : isMobile ? "154px" : "170px",
              padding: isDesktop ? "15px" : "18px",
              borderRadius: isDesktop ? "18px" : "21px",
              border: "1px solid rgba(255,255,255,0.085)",
              background: "linear-gradient(145deg, rgba(7,25,47,0.80), rgba(5,10,27,0.90))",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              boxShadow: "0 16px 46px rgba(0,0,0,0.16)",
              display: "flex",
              flexDirection: "column",
              transition: "transform 170ms ease, border-color 170ms ease, background 170ms ease",
              minWidth: 0,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = "translateY(-2px)";
              event.currentTarget.style.borderColor = `${area.accent}55`;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "translateY(0)";
              event.currentTarget.style.borderColor = "rgba(255,255,255,0.085)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: area.accent,
                    fontSize: "8px",
                    fontWeight: 900,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                  }}
                >
                  {area.eyebrow}
                </div>
                <h3
                  style={{
                    margin: "5px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: isDesktop ? "25px" : "29px",
                    lineHeight: 1,
                    fontWeight: 500,
                  }}
                >
                  {area.title}
                </h3>
              </div>
              <span
                aria-hidden="true"
                style={{
                  width: isDesktop ? "34px" : "38px",
                  height: isDesktop ? "34px" : "38px",
                  borderRadius: "12px",
                  border: `1px solid ${area.accent}42`,
                  background: `${area.accent}10`,
                  color: area.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                {area.icon}
              </span>
            </div>

            <p
              style={{
                margin: isDesktop ? "9px 0 0" : "12px 0 0",
                color: "rgba(255,255,255,0.52)",
                fontSize: isDesktop ? "10px" : "11px",
                lineHeight: 1.45,
              }}
            >
              {area.description}
            </p>

            <div
              style={{
                marginTop: "auto",
                paddingTop: isDesktop ? "9px" : "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.34)",
                  fontSize: "8px",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {area.id === "learn"
                  ? `${foundationCompleted}/${foundationTotal} foundations`
                  : area.id === "progress"
                    ? `${unlockedCount}/${totalMilestones} milestones`
                    : area.meta}
              </span>
              <span style={{ color: area.accent, fontSize: "15px" }}>→</span>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

function MiniStatus({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        padding: "5px 8px",
        color: "rgba(255,255,255,0.48)",
        fontSize: "8px",
        fontWeight: 800,
        letterSpacing: "0.035em",
        whiteSpace: "nowrap",
      }}
    >
      <strong style={{ color: "rgba(255,255,255,0.72)", marginRight: "4px" }}>{label}</strong>
      {value}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.024)",
        padding: "8px",
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.32)",
          fontSize: "7px",
          fontWeight: 900,
          letterSpacing: "0.075em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <strong
        style={{
          display: "block",
          marginTop: "3px",
          color: "rgba(255,255,255,0.82)",
          fontSize: "9px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: "0.17em",
  textTransform: "uppercase",
} as const;
