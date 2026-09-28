"use client";

import type { BankScreenMode } from "../lib/bank-types";
import {
  randomBudgetCoachPrompt,
  totalKnownCommitments,
} from "../lib/budget-simulator-financial-model";
import type {
  BudgetFinancialProfile,
  BudgetSimulationRun,
} from "../lib/budget-simulator-types";

export default function BudgetBriefingStage({
  run,
  profile,
  screenMode,
  saving,
  onContinue,
}: {
  run: BudgetSimulationRun;
  profile: BudgetFinancialProfile;
  screenMode: BankScreenMode;
  saving: boolean;
  onContinue: () => Promise<void>;
}) {
  const isMobile = screenMode === "mobile";
  const commitments = totalKnownCommitments(profile);
  const miloPrompt = randomBudgetCoachPrompt(profile, run.scenarioSeed);

  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.3fr) minmax(220px,.7fr)",
        gap: isMobile ? "12px" : "16px",
        alignItems: "stretch",
      }}
    >
      <section
        style={{
          minWidth: 0,
          borderRadius: "22px",
          border: "1px solid rgba(126,232,255,0.14)",
          background:
            "linear-gradient(145deg,rgba(4,19,43,.90),rgba(7,14,32,.82))",
          padding: isMobile ? "16px" : "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Stage 1 · Briefing</p>
            <h3
              style={{
                margin: "5px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "27px" : "34px",
                fontWeight: 500,
                lineHeight: 1.05,
              }}
            >
              Your month
            </h3>
          </div>
          <span
            style={{
              alignSelf: "flex-start",
              borderRadius: "999px",
              border: "1px solid rgba(255,209,138,.18)",
              background: "rgba(255,209,138,.06)",
              color: "#ffd18a",
              padding: "7px 10px",
              fontSize: "7px",
              fontWeight: 900,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Plan before you commit
          </span>
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))",
            gap: "8px",
          }}
        >
          <Metric label="Monthly income" value={`${profile.monthlyIncome.toLocaleString()} DT`} />
          <Metric label="Available now" value={`${profile.availableNow.toLocaleString()} DT`} />
          <Metric label="Known commitments" value={`${commitments.toLocaleString()} DT`} />
          <Metric label="Active goals" value={String(profile.goals.length)} />
        </div>

        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
            gap: "8px",
          }}
        >
          <MiniFact label="Current savings" value={`${profile.currentSavings.toLocaleString()} DT`} />
          <MiniFact
            label="Next income"
            value={profile.nextIncomeWindow ?? `Day ${profile.nextIncomeDay}`}
          />
          <MiniFact label="Run seed" value={`#${run.scenarioSeed}`} />
        </div>

        <div
          style={{
            marginTop: "15px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "12px",
          }}
        >
          <p
            style={{
              margin: 0,
              maxWidth: "620px",
              color: "rgba(255,255,255,.44)",
              fontSize: "10px",
              lineHeight: 1.6,
            }}
          >
            The numbers above are only the headline. The next screen gives you the underlying commitments, goals and signals. Decide what deserves your attention before you build the budget.
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onContinue()}
            style={primaryButtonStyle}
          >
            Open Financial Desk →
          </button>
        </div>
      </section>

      <aside
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "22px",
          border: "1px solid rgba(184,168,255,.15)",
          background:
            "radial-gradient(circle at 50% 28%,rgba(184,168,255,.16),transparent 40%),linear-gradient(180deg,rgba(22,19,53,.78),rgba(5,11,25,.90))",
          minHeight: isMobile ? "190px" : "250px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <img
          src="/milo-world/milo-character.png"
          alt="Milo"
          style={{
            position: "absolute",
            right: isMobile ? "8px" : "2px",
            top: isMobile ? "4px" : "8px",
            width: isMobile ? "118px" : "150px",
            height: isMobile ? "140px" : "180px",
            objectFit: "contain",
            objectPosition: "center bottom",
            filter: "drop-shadow(0 16px 24px rgba(0,0,0,.35))",
            opacity: .96,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: isMobile ? "62%" : "100%",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(2,8,20,.66)",
            padding: "12px",
            backdropFilter: "blur(10px)",
          }}
        >
          <p style={{ ...eyebrowStyle, color: "#c7bbff" }}>Milo's briefing</p>
          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,.76)",
              fontSize: "10px",
              lineHeight: 1.55,
            }}
          >
            “You know some of what is coming. You won't know everything.”
          </p>
          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,.40)",
              fontSize: "8px",
              lineHeight: 1.5,
            }}
          >
            {miloPrompt}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,.07)",
        background: "rgba(255,255,255,.025)",
        padding: "12px",
      }}
    >
      <span style={metricLabelStyle}>{label}</span>
      <strong
        style={{
          display: "block",
          marginTop: "5px",
          color: "#ffd18a",
          fontSize: "17px",
          lineHeight: 1.1,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "13px",
        border: "1px solid rgba(255,255,255,.055)",
        background: "rgba(0,0,0,.12)",
        padding: "9px 10px",
      }}
    >
      <span style={metricLabelStyle}>{label}</span>
      <strong
        style={{
          display: "block",
          marginTop: "3px",
          color: "rgba(255,255,255,.78)",
          fontSize: "10px",
          lineHeight: 1.35,
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
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: ".13em",
  textTransform: "uppercase" as const,
};

const metricLabelStyle = {
  display: "block",
  color: "rgba(255,255,255,.34)",
  fontSize: "7px",
  fontWeight: 850,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  minHeight: "40px",
  padding: "0 15px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,.32)",
  background: "linear-gradient(180deg,rgba(83,215,255,.18),rgba(83,215,255,.09))",
  color: "#dffaff",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "8px",
  fontWeight: 950,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};
