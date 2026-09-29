"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import {
  budgetLiveLiquidTotal,
  budgetLiveProtectedTotal,
} from "../lib/budget-simulator-live-month";
import {
  buildBudgetFinalWeekChallenge,
  completeBudgetFinalWeek,
  finalWeekFundingGap,
} from "../lib/budget-simulator-results";
import { BUDGET_SIMULATOR_ASSETS } from "../lib/budget-simulator-assets";
import type {
  BudgetAllocation,
  BudgetDecisionFactorKey,
  BudgetDifficulty,
  BudgetFinalWeekChoiceId,
  BudgetFinalWeekResult,
  BudgetFinancialProfile,
  BudgetLiveMonthState,
  BudgetScenarioKey,
} from "../lib/budget-simulator-types";
import BudgetAssetIcon from "./BudgetAssetIcon";
import BudgetDecisionFactors from "./BudgetDecisionFactors";
import BudgetLiveRebalancePanel from "./BudgetLiveRebalancePanel";
import BudgetInfoButton from "./BudgetInfoButton";

export default function BudgetFinalWeekStage({
  profile,
  liveMonth,
  openingAllocation,
  allocation,
  selectedChoiceId,
  selectedFactors,
  confidence,
  scenarioSeed,
  scenarioKey,
  difficulty,
  screenMode,
  saving,
  onAllocationChange,
  onChoiceChange,
  onFactorsChange,
  onConfidenceChange,
  onComplete,
}: {
  profile: BudgetFinancialProfile;
  liveMonth: BudgetLiveMonthState;
  openingAllocation: BudgetAllocation;
  allocation: BudgetAllocation;
  selectedChoiceId: BudgetFinalWeekChoiceId | null;
  selectedFactors: BudgetDecisionFactorKey[];
  confidence: number;
  scenarioSeed: number;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  screenMode: BankScreenMode;
  saving: boolean;
  onAllocationChange: (next: BudgetAllocation) => void;
  onChoiceChange: (next: BudgetFinalWeekChoiceId) => void;
  onFactorsChange: (next: BudgetDecisionFactorKey[]) => void;
  onConfidenceChange: (next: number) => void;
  onComplete: (result: BudgetFinalWeekResult) => Promise<void>;
}) {
  const isMobile = screenMode === "mobile";
  const [showRebalance, setShowRebalance] = useState(false);
  const [message, setMessage] = useState("");

  const challenge = useMemo(
    () =>
      buildBudgetFinalWeekChallenge({
        profile,
        liveMonth,
        openingAllocation,
        scenarioSeed,
        scenarioKey,
        difficulty,
      }),
    [profile, liveMonth, openingAllocation, scenarioSeed, scenarioKey, difficulty],
  );

  const selectedChoice =
    challenge.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const liquid = budgetLiveLiquidTotal(allocation);
  const protectedTotal = budgetLiveProtectedTotal(allocation);
  const finalCommitments = challenge.finalCommitments.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const fundingGap = selectedChoice
    ? finalWeekFundingGap({ allocation, choice: selectedChoice, challenge })
    : 0;

  async function confirm() {
    if (!selectedChoice) {
      setMessage("Choose one final-week approach first.");
      return;
    }
    if (selectedFactors.length !== 2) {
      setMessage("Choose exactly two decision factors before confirming.");
      return;
    }
    if (fundingGap > 0) {
      setMessage(
        `Move another ${fundingGap.toLocaleString()} DT into available DT before this choice can cover both the opportunity and the remaining known bills.`,
      );
      setShowRebalance(true);
      return;
    }

    const completed = completeBudgetFinalWeek({
      liveMonth,
      allocation,
      challenge,
      choice: selectedChoice,
      factors: selectedFactors,
      confidence,
      profile,
    });
    if (!completed.ok) {
      setMessage(
        `The final week is still short of ${completed.shortfall.toLocaleString()} DT. Rebalance and try again.`,
      );
      setShowRebalance(true);
      return;
    }

    setMessage("");
    await onComplete(completed.result);
  }

  const rebalanceState: BudgetLiveMonthState = {
    ...liveMonth,
    allocation,
    lastOutcome: null,
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
          gap: "10px",
          alignItems: "end",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}><p style={eyebrowStyle}>Stage 6 · Final Week</p><BudgetInfoButton title="Final Week">This is the hardest trade-off of the month. You cannot maximise cash, safety, goals and opportunity at the same time, so choose what matters most now.</BudgetInfoButton></div>
          <h3
            style={{
              margin: "4px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "25px" : "31px",
              fontWeight: 500,
            }}
          >
            The hardest trade-off of the month
          </h3>

        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(88px,1fr))", gap: "6px" }}>
          <Metric label="Available" value={`${liquid.toLocaleString()} DT`} accent="#8ee8ff" />
          <Metric label="Set aside" value={`${protectedTotal.toLocaleString()} DT`} accent="#c3b5ff" />
          <Metric label="Still due" value={`${finalCommitments.toLocaleString()} DT`} accent="#ffd18a" />
        </div>
      </div>

      <section style={{ ...panelStyle, marginTop: "11px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto", gap: "12px", alignItems: "start" }}>
          <div style={{ maxWidth: "780px" }}>
            <p style={{ ...eyebrowStyle, color: "#ffd18a" }}>Day {challenge.day} · Capital decision</p>
            <h4 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "30px", fontWeight: 500 }}>
              {challenge.title}
            </h4>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.58)", fontSize: "16px", fontWeight: 700 }}>
              {challenge.subtitle}
            </p>
            <div style={{ marginTop: "8px" }}><BudgetInfoButton title={challenge.title}>{challenge.briefing}</BudgetInfoButton></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "74px minmax(0,1fr)" : "82px 165px", gap: "8px", alignItems: "center" }}>
            <BudgetAssetIcon
              src={BUDGET_SIMULATOR_ASSETS.businessEquipment}
              alt="Business Builder opportunity"
              size={isMobile ? 72 : 80}
            />
            <div style={{ borderRadius: "15px", border: "1px solid rgba(255,209,138,.15)", background: "rgba(255,209,138,.055)", padding: "10px 12px", minWidth: 0 }}>
              <span style={miniLabel}>Suggested capital</span>
              <strong style={{ display: "block", marginTop: "3px", color: "#ffd18a", fontSize: "24px" }}>
                {challenge.opportunityAmount.toLocaleString()} DT
              </strong>
              <div style={{ marginTop: "7px" }}><BudgetInfoButton title="Possible benefit" accent="#ffd18a">This is a simulated possible return range of +{challenge.potentialBenefitLow}% to +{challenge.potentialBenefitHigh}% over the next few months. It is not guaranteed.</BudgetInfoButton></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "11px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "7px" }}>
          <InfoCard label="Liquid before decision" value={`${liquid.toLocaleString()} DT`} detail="Accessible across Available, Lifestyle and Essentials." />
          <InfoCard label="Emergency reserve" value={`${allocation.emergency.toLocaleString()} DT`} detail="Protected unless you deliberately release it." />
          <InfoCard label="Goals" value={`${allocation.goals.toLocaleString()} DT`} detail="Progress already protected for future priorities." />
          <InfoCard label="Bills left" value={`${finalCommitments.toLocaleString()} DT`} detail={challenge.finalCommitments.length > 0 ? challenge.finalCommitments.map((item) => `Day ${item.dueDay} ${item.title}`).join(" · ") : "No known fixed payments remain."} />
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: "10px" }}>
        <p style={eyebrowStyle}>Choose an approach</p>
        <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: "8px" }}>
          {challenge.choices.map((choice) => {
            const active = choice.id === selectedChoiceId;
            const gap = finalWeekFundingGap({ allocation, choice, challenge });
            return (
              <div
                key={choice.id}
                style={{
                  minHeight: "116px",
                  borderRadius: "15px",
                  border: active ? "1px solid rgba(126,232,255,.34)" : "1px solid rgba(255,255,255,.07)",
                  background: active ? "rgba(83,215,255,.075)" : "rgba(255,255,255,.018)",
                  padding: "12px",
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) auto",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChoiceChange(choice.id);
                    setMessage("");
                    if (gap > 0) setShowRebalance(true);
                  }}
                  aria-pressed={active}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    color: "white",
                    textAlign: "left",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "21px" }}>{choice.label}</strong>
                  <span style={{ display: "block", marginTop: "8px", color: gap > 0 ? "#ffd3a0" : "#b9f7d7", fontSize: "16px", fontWeight: 850 }}>
                    {gap > 0 ? `Needs ${gap.toLocaleString()} DT rebalanced` : "Fundable"}
                  </span>
                </button>
                <BudgetInfoButton title={choice.label}>{choice.description} {choice.riskNote}</BudgetInfoButton>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ marginTop: "10px" }}>
        <BudgetDecisionFactors selected={selectedFactors} onChange={onFactorsChange} />
      </div>

      <section style={{ ...panelStyle, marginTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <p style={eyebrowStyle}>Decision confidence</p>
            <strong style={{ display: "block", marginTop: "3px", fontSize: "18px" }}>{confidence}% confident</strong>
            <div style={{ marginTop: "6px" }}><BudgetInfoButton title="Decision confidence" accent="#c8bcff">Confidence records how certain you feel about the decision. It does not change the financial outcome.</BudgetInfoButton></div>
          </div>
          <div
            aria-label={`${confidence}% confidence`}
            style={{
              width: "74px",
              height: "74px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: `conic-gradient(#9f8cff ${confidence * 3.6}deg, rgba(255,255,255,.055) 0deg)`,
            }}
          >
            <div style={{ width: "58px", height: "58px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#071128", fontSize: "18px", fontWeight: 900 }}>
              {confidence}%
            </div>
          </div>
        </div>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={confidence}
          onChange={(event: { target: { value: string } }) => onConfidenceChange(Number(event.target.value))}
          style={{ width: "100%", marginTop: "10px", accentColor: "#9f8cff" }}
        />
      </section>

      {selectedChoice && fundingGap > 0 && (
        <div style={{ marginTop: "10px" }}>
          <BudgetLiveRebalancePanel
            state={rebalanceState}
            currentDay={challenge.day}
            fundingGap={fundingGap}
            onChange={(next) => {
              onAllocationChange(next.allocation);
              setMessage("");
            }}
          />
        </div>
      )}

      {showRebalance && selectedChoice && fundingGap === 0 && (
        <div style={{ marginTop: "10px" }}>
          <BudgetLiveRebalancePanel
            state={rebalanceState}
            currentDay={challenge.day}
            onChange={(next) => {
              onAllocationChange(next.allocation);
              setMessage("");
            }}
          />
        </div>
      )}

      {message && (
        <p role="alert" style={{ margin: "10px 0 0", borderRadius: "12px", border: "1px solid rgba(255,184,112,.20)", background: "rgba(101,52,10,.14)", padding: "9px 11px", color: "#ffd3a0", fontSize: "15px", lineHeight: 1.5 }}>
          {message}
        </p>
      )}

      <div style={{ marginTop: "11px", display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setShowRebalance((value) => !value)} style={secondaryButtonStyle}>
          {showRebalance ? "Hide rebalance" : "Rebalance first"}
        </button>
        <button
          type="button"
          disabled={saving || !selectedChoice || selectedFactors.length !== 2 || fundingGap > 0}
          onClick={() => void confirm()}
          style={{ ...primaryButtonStyle, opacity: saving || !selectedChoice || selectedFactors.length !== 2 || fundingGap > 0 ? 0.42 : 1 }}
        >
          {saving ? "Saving..." : "Make final decision"}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.018)", padding: "8px" }}>
      <span style={{ display: "block", color: "rgba(255,255,255,.28)", fontSize: "15px", fontWeight: 900, textTransform: "uppercase" }}>{label}</span>
      <strong style={{ display: "block", marginTop: "3px", color: accent, fontSize: "18px" }}>{value}</strong>
    </div>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ borderRadius: "13px", border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.018)", padding: "11px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={miniLabel}>{label}</span>
        <BudgetInfoButton title={label}>{detail}</BudgetInfoButton>
      </div>
      <strong style={{ display: "block", marginTop: "5px", fontSize: "21px" }}>{value}</strong>
    </div>
  );
}

const panelStyle = {
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,.07)",
  background: "rgba(255,255,255,.018)",
  padding: "12px",
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

const miniLabel = {
  color: "rgba(255,255,255,.3)",
  fontSize: "15px",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: ".06em",
};

const secondaryButtonStyle = {
  minHeight: "36px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.035)",
  color: "rgba(255,255,255,.62)",
  padding: "0 11px",
  fontFamily: "inherit",
  fontSize: "14px",
  fontWeight: 900,
  cursor: "pointer",
};

const primaryButtonStyle = {
  minHeight: "38px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,.24)",
  background: "linear-gradient(135deg,rgba(83,215,255,.18),rgba(184,168,255,.16))",
  color: "white",
  padding: "0 14px",
  fontFamily: "inherit",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: ".07em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};
