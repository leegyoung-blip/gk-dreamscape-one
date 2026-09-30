"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import { buildBudgetWhatIfComparison } from "../lib/budget-simulator-results";
import type {
  BudgetAllocation,
  BudgetDifficulty,
  BudgetFinalWeekChoiceId,
  BudgetFinalWeekResult,
  BudgetFinancialProfile,
  BudgetLiveMonthState,
  BudgetScenarioKey,
} from "../lib/budget-simulator-types";
import BudgetInfoButton from "./BudgetInfoButton";

const CHOICES: Array<{ id: BudgetFinalWeekChoiceId; short: string }> = [
  { id: "protect_position", short: "Protect cash" },
  { id: "balanced_commitment", short: "Measured commitment" },
  { id: "full_commitment", short: "Full opportunity" },
];

export default function BudgetWhatIfPanel({
  profile,
  liveMonth,
  decisionAllocation,
  actualResult,
  scenarioSeed,
  scenarioKey,
  difficulty,
  screenMode,
}: {
  profile: BudgetFinancialProfile;
  liveMonth: BudgetLiveMonthState;
  decisionAllocation: BudgetAllocation;
  actualResult: BudgetFinalWeekResult;
  scenarioSeed: number;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const alternatives = CHOICES.filter((choice) => choice.id !== actualResult.choiceId);
  const [alternativeChoiceId, setAlternativeChoiceId] = useState<BudgetFinalWeekChoiceId>(
    alternatives[0]?.id ?? "protect_position",
  );

  const comparison = useMemo(
    () =>
      buildBudgetWhatIfComparison({
        profile,
        liveMonth,
        decisionAllocation,
        actualResult,
        alternativeChoiceId,
        scenarioSeed,
        scenarioKey,
        difficulty,
      }),
    [
      profile,
      liveMonth,
      decisionAllocation,
      actualResult,
      alternativeChoiceId,
      scenarioSeed,
      scenarioKey,
      difficulty,
    ],
  );

  const maxAvailable = Math.max(
    1,
    comparison.actualEndingAvailable,
    comparison.alternativeEndingAvailable ?? 0,
  );
  const maxProtected = Math.max(
    1,
    comparison.actualEndingProtected,
    comparison.alternativeEndingProtected ?? 0,
  );

  return (
    <section style={{ ...panelStyle, marginTop: 0, height: "100%", minHeight: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
          gap: "10px",
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><p style={eyebrowStyle}>What if?</p><BudgetInfoButton title="Same month, different choice" accent="#d6ceff">The scenario seed, commitments and your position before the Final Week stay fixed. Only the final decision changes, so you can compare the trade-off fairly.</BudgetInfoButton></div>
          <h4 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "23px", fontWeight: 500 }}>
            Compare another path
          </h4>

        </div>
        <span style={{ borderRadius: "999px", border: "1px solid rgba(184,168,255,.14)", background: "rgba(184,168,255,.05)", padding: "6px 8px", color: "#d6ceff", fontSize: "15px", fontWeight: 950, textTransform: "uppercase" }}>
          Same seed · {scenarioSeed}
        </span>
      </div>

      <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {alternatives.map((choice) => {
          const active = choice.id === alternativeChoiceId;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => setAlternativeChoiceId(choice.id)}
              aria-pressed={active}
              style={{
                minHeight: "30px",
                borderRadius: "999px",
                border: active ? "1px solid rgba(184,168,255,.34)" : "1px solid rgba(255,255,255,.08)",
                background: active ? "rgba(184,168,255,.09)" : "rgba(255,255,255,.02)",
                padding: "0 9px",
                color: active ? "#e0d9ff" : "rgba(255,255,255,.48)",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {choice.short}
            </button>
          );
        })}
      </div>

      <div className="budget-whatif-fork" style={{ marginTop: "6px" }}>
        <svg viewBox="0 0 760 120" role="img" aria-label="Actual and alternative Final Week decision paths" style={{ display: "block", width: "100%", height: isMobile ? "72px" : "78px" }}>
          <defs>
            <linearGradient id="actualPathGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#7ee8ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7ee8ff" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="altPathGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#b8a8ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#b8a8ff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <circle cx="76" cy="60" r="9" fill="#071128" stroke="rgba(255,255,255,.26)" strokeWidth="2" />
          <text x="76" y="88" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="15">Day 26</text>
          <path className="budget-path-reveal" d="M86 60 C205 60 230 28 350 28 H675" fill="none" stroke="url(#actualPathGradient)" strokeWidth="4" strokeLinecap="round" />
          <path className="budget-path-reveal budget-path-reveal-alt" d="M86 60 C205 60 230 92 350 92 H675" fill="none" stroke="url(#altPathGradient)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="685" cy="28" r="8" fill="#071128" stroke="#7ee8ff" strokeWidth="2" />
          <circle cx="685" cy="92" r="8" fill="#071128" stroke="#b8a8ff" strokeWidth="2" />
          <text x="360" y="19" fill="#9defff" fontSize="16" fontWeight="700">Actual</text>
          <text x="360" y="111" fill="#d6ceff" fontSize="16" fontWeight="700">Alternative</text>
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "8px" }}>
        <PathCard
          title="Actual path"
          choice={comparison.actualChoiceLabel}
          committed={comparison.actualCommitted}
          available={comparison.actualEndingAvailable}
          protectedAmount={comparison.actualEndingProtected}
          tone="actual"
        />
        <PathCard
          title="Alternative path"
          choice={comparison.alternativeChoiceLabel}
          committed={comparison.alternativeCommitted}
          available={comparison.alternativeEndingAvailable}
          protectedAmount={comparison.alternativeEndingProtected}
          tone="alternative"
          unavailableDetail={comparison.fundable ? undefined : `Needs $${comparison.fundingGap.toLocaleString()} more liquid funding before it can be compared fairly.`}
        />
      </div>

      {comparison.fundable && comparison.alternativeEndingAvailable !== null && comparison.alternativeEndingProtected !== null && (
        <div style={{ marginTop: "4px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "8px" }}>
          <ComparisonBar
            label="Available cash at month end"
            actual={comparison.actualEndingAvailable}
            alternative={comparison.alternativeEndingAvailable}
            max={maxAvailable}
          />
          <ComparisonBar
            label="Set-aside money at month end"
            actual={comparison.actualEndingProtected}
            alternative={comparison.alternativeEndingProtected}
            max={maxProtected}
          />
        </div>
      )}

      <div style={{ marginTop: "6px", borderRadius: "13px", border: "1px solid rgba(255,209,138,.10)", background: "rgba(255,209,138,.035)", padding: "7px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "9px" }}>
          <strong style={{ color: "#ffd18a", fontSize: "18px" }}>Milo's comparison</strong>
          <BudgetInfoButton title="Milo's comparison" accent="#ffd18a">{comparison.interpretation}</BudgetInfoButton>
        </div>
      </div>

      <style jsx>{`
        .budget-path-reveal {
          stroke-dasharray: 760;
          stroke-dashoffset: 760;
          animation: budgetPathReveal 700ms ease-out forwards;
        }
        .budget-path-reveal-alt {
          animation-delay: 90ms;
        }
        @keyframes budgetPathReveal {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .budget-path-reveal {
            animation: none;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </section>
  );
}

function PathCard({
  title,
  choice,
  committed,
  available,
  protectedAmount,
  tone,
  unavailableDetail,
}: {
  title: string;
  choice: string;
  committed: number;
  available: number | null;
  protectedAmount: number | null;
  tone: "actual" | "alternative";
  unavailableDetail?: string;
}) {
  const accent = tone === "actual" ? "#9defff" : "#d6ceff";
  return (
    <div style={{ borderRadius: "14px", border: `1px solid ${tone === "actual" ? "rgba(126,232,255,.13)" : "rgba(184,168,255,.13)"}`, background: tone === "actual" ? "rgba(126,232,255,.025)" : "rgba(184,168,255,.025)", padding: "8px" }}>
      <span style={{ color: accent, fontSize: "15px", fontWeight: 950, textTransform: "uppercase", letterSpacing: ".08em" }}>{title}</span>
      <strong style={{ display: "block", marginTop: "4px", fontSize: "16px", lineHeight: 1.4 }}>{choice}</strong>
      <div style={{ marginTop: "5px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "5px" }}>
        <TinyMetric label="Committed" value={`$${committed.toLocaleString()}`} />
        <TinyMetric label="Available" value={available === null ? "—" : `$${available.toLocaleString()}`} />
        <TinyMetric label="Set aside" value={protectedAmount === null ? "—" : `$${protectedAmount.toLocaleString()}`} />
      </div>
      {unavailableDetail && <div style={{ marginTop: "7px" }}><BudgetInfoButton title="Why this path cannot be funded" accent="#ffd3a0">{unavailableDetail}</BudgetInfoButton></div>}
    </div>
  );
}

function TinyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, borderRadius: "10px", background: "rgba(0,0,0,.15)", padding: "5px" }}>
      <span style={{ display: "block", color: "rgba(255,255,255,.27)", fontSize: "14px", fontWeight: 900, textTransform: "uppercase" }}>{label}</span>
      <strong style={{ display: "block", marginTop: "2px", color: "rgba(255,255,255,.7)", fontSize: "14px", overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}

function ComparisonBar({ label, actual, alternative, max }: { label: string; actual: number; alternative: number; max: number }) {
  return (
    <div style={{ borderRadius: "13px", border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.016)", padding: "7px" }}>
      <span style={{ display: "block", color: "rgba(255,255,255,.42)", fontSize: "14px", fontWeight: 850 }}>{label}</span>
      <BarRow label="Actual" value={actual} width={(actual / max) * 100} tone="actual" />
      <BarRow label="Alternative" value={alternative} width={(alternative / max) * 100} tone="alternative" />
    </div>
  );
}

function BarRow({ label, value, width, tone }: { label: string; value: number; width: number; tone: "actual" | "alternative" }) {
  return (
    <div style={{ marginTop: "4px", display: "grid", gridTemplateColumns: "62px minmax(0,1fr) 70px", gap: "6px", alignItems: "center" }}>
      <span style={{ color: "rgba(255,255,255,.31)", fontSize: "15px" }}>{label}</span>
      <div style={{ height: "7px", borderRadius: "999px", background: "rgba(255,255,255,.035)", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, width))}%`, height: "100%", borderRadius: "inherit", background: tone === "actual" ? "#72dff4" : "#a995ff" }} />
      </div>
      <strong style={{ textAlign: "right", color: tone === "actual" ? "#9defff" : "#d6ceff", fontSize: "15px" }}>{`$${value.toLocaleString()}`}</strong>
    </div>
  );
}

const panelStyle = {
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,.07)",
  background: "rgba(255,255,255,.018)",
  padding: "9px",
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};
