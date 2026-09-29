"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import {
  advanceLiveMonthToDay,
  budgetLiveLiquidTotal,
  budgetLiveProtectedTotal,
  clearLiveOutcome,
  liveChoiceFundingGap,
  liveMonthProgress,
  nextBudgetLiveEvent,
  pendingCommitmentTotal,
  resolveBudgetLiveEvent,
} from "../lib/budget-simulator-live-month";
import type {
  BudgetAllocation,
  BudgetFinancialProfile,
  BudgetLiveEventChoice,
  BudgetLiveMonthState,
} from "../lib/budget-simulator-types";
import { budgetLiveEventAsset } from "../lib/budget-simulator-assets";
import BudgetAssetIcon from "./BudgetAssetIcon";
import BudgetLiveMonthTimeline from "./BudgetLiveMonthTimeline";
import BudgetLiveRebalancePanel from "./BudgetLiveRebalancePanel";
import BudgetInfoButton from "./BudgetInfoButton";

export default function BudgetLiveMonthStage({
  profile,
  firstPlan,
  liveState,
  currentDay,
  scenarioSeed,
  screenMode,
  saving,
  onStateChange,
  onCheckpoint,
  onComplete,
}: {
  profile: BudgetFinancialProfile;
  firstPlan: BudgetAllocation;
  liveState: BudgetLiveMonthState;
  currentDay: number;
  scenarioSeed: number;
  screenMode: BankScreenMode;
  saving: boolean;
  onStateChange: (next: BudgetLiveMonthState) => void;
  onCheckpoint: (next: BudgetLiveMonthState, day: number) => Promise<boolean>;
  onComplete: (next: BudgetLiveMonthState) => Promise<void>;
}) {
  const isMobile = screenMode === "mobile";
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [showRebalance, setShowRebalance] = useState(false);
  const [message, setMessage] = useState("");

  const progress = liveMonthProgress(liveState);
  const activeEvent = nextBudgetLiveEvent(liveState);
  const liquid = budgetLiveLiquidTotal(liveState.allocation);
  const protectedTotal = budgetLiveProtectedTotal(liveState.allocation);
  const selectedChoice = activeEvent?.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const choiceGap = selectedChoice ? liveChoiceFundingGap(liveState.allocation, selectedChoice) : 0;

  const commitmentsBeforeNext = useMemo(() => {
    const throughDay = activeEvent ? activeEvent.day : 24;
    return profile.commitments
      .filter(
        (commitment) =>
          commitment.dueDay <= throughDay &&
          !liveState.paidCommitments.some((paid) => paid.commitmentId === commitment.id),
      )
      .sort((a, b) => a.dueDay - b.dueDay);
  }, [activeEvent, liveState.paidCommitments, profile.commitments]);

  const upcomingCommitmentTotal = commitmentsBeforeNext.reduce((sum, item) => sum + item.amount, 0);
  const upcomingGap = Math.max(0, upcomingCommitmentTotal - liquid);

  async function advanceToNextDecision() {
    if (!activeEvent) return;
    setMessage("");
    const result = advanceLiveMonthToDay({
      profile,
      state: liveState,
      day: activeEvent.day,
    });

    if (!result.ok) {
      setMessage(
        `You need another ${result.shortfall.toLocaleString()} DT in available DT before the commitments due by Day ${activeEvent.day} can be paid. Rebalance first.`,
      );
      setShowRebalance(true);
      return;
    }

    onStateChange(result.state);
    await onCheckpoint(result.state, activeEvent.day);
  }

  async function confirmChoice(choice: BudgetLiveEventChoice) {
    if (!activeEvent) return;
    setMessage("");

    const result = resolveBudgetLiveEvent({
      state: liveState,
      event: activeEvent,
      choice,
      scenarioSeed,
    });

    if (!result.ok) {
      setMessage(
        `This choice needs another ${result.fundingGap.toLocaleString()} DT in available DT. Rebalance before confirming it.`,
      );
      setShowRebalance(true);
      return;
    }

    setSelectedChoiceId(null);
    setShowRebalance(false);
    onStateChange(result.state);
    await onCheckpoint(result.state, currentDay);
  }

  async function continueAfterOutcome() {
    const next = clearLiveOutcome(liveState);
    onStateChange(next);
    await onCheckpoint(next, currentDay);
  }

  async function finishLiveMonth() {
    setMessage("");
    const result = advanceLiveMonthToDay({
      profile,
      state: liveState,
      day: 24,
    });

    if (!result.ok) {
      setMessage(
        `You need another ${result.shortfall.toLocaleString()} DT in available DT to cover known bills through Day 24. Rebalance before entering the final week.`,
      );
      setShowRebalance(true);
      return;
    }

    onStateChange(result.state);
    // Advance to Final Week in one checkpoint. Saving Day 24 and then immediately
    // saving Day 25 with the same optimistic-lock version can create a false
    // concurrent-session conflict. onComplete persists the settled state.
    await onComplete(result.state);
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}><p style={eyebrowStyle}>Stage 5 · Run the month</p><BudgetInfoButton title="Live Month">Time now moves forward. Known payments happen automatically, while surprises and opportunities can force you to change the plan.</BudgetInfoButton></div>
          <h3 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "25px" : "31px", fontWeight: 500 }}>
            Day {currentDay} · Make the plan work
          </h3>

        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(82px,1fr))", gap: "6px" }}>
          <TopMetric label="Available" value={`${liquid.toLocaleString()} DT`} accent="#8ee8ff" />
          <TopMetric label="Set aside" value={`${protectedTotal.toLocaleString()} DT`} accent="#c3b5ff" />
          <TopMetric label="Decisions" value={`${progress.completed}/${progress.total}`} accent="#80efb8" />
        </div>
      </div>

      <div style={{ marginTop: "11px" }}>
        <BudgetLiveMonthTimeline
          currentDay={currentDay}
          events={liveState.events}
          resolvedEventIds={liveState.resolvedEventIds}
          paidCommitments={liveState.paidCommitments}
        />
      </div>

      <div
        style={{
          marginTop: "10px",
          height: "5px",
          borderRadius: "999px",
          background: "rgba(255,255,255,.055)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${progress.percent}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg,#64d8ff,#80efb8)" }} />
      </div>

      {message && (
        <p role="alert" style={{ margin: "10px 0 0", borderRadius: "12px", border: "1px solid rgba(255,184,112,.20)", background: "rgba(101,52,10,.14)", padding: "9px 11px", color: "#ffd3a0", fontSize: "15px", lineHeight: 1.5 }}>
          {message}
        </p>
      )}

      {liveState.lastOutcome ? (
        <OutcomePanel
          outcome={liveState.lastOutcome}
          currentDay={currentDay}
          activeEvent={activeEvent}
          onContinue={() => void continueAfterOutcome()}
          onRebalance={() => setShowRebalance((value) => !value)}
          saving={saving}
        />
      ) : activeEvent && currentDay < activeEvent.day ? (
        <AdvancePanel
          currentDay={currentDay}
          eventDay={activeEvent.day}
          eventTitle={activeEvent.title}
          commitments={commitmentsBeforeNext}
          liquid={liquid}
          shortfall={upcomingGap}
          saving={saving}
          onAdvance={() => void advanceToNextDecision()}
          onRebalance={() => setShowRebalance(true)}
        />
      ) : activeEvent ? (
        <EventDecisionPanel
          event={activeEvent}
          selectedChoice={selectedChoice}
          fundingGap={choiceGap}
          saving={saving}
          onSelect={(choice) => {
            setSelectedChoiceId(choice.id);
            setMessage("");
            if (liveChoiceFundingGap(liveState.allocation, choice) > 0) setShowRebalance(true);
          }}
          onConfirm={(choice) => void confirmChoice(choice)}
          onRebalance={() => setShowRebalance((value) => !value)}
        />
      ) : (
        <FinishPanel
          currentDay={currentDay}
          commitments={commitmentsBeforeNext}
          liquid={liquid}
          shortfall={upcomingGap}
          saving={saving}
          onFinish={() => void finishLiveMonth()}
          onRebalance={() => setShowRebalance(true)}
        />
      )}

      {showRebalance && (
        <div style={{ marginTop: "10px" }}>
          <BudgetLiveRebalancePanel
            state={liveState}
            currentDay={currentDay}
            fundingGap={Math.max(choiceGap, upcomingGap)}
            onChange={(next) => {
              onStateChange(next);
              setMessage("");
            }}
          />
        </div>
      )}

      <AllocationComparison firstPlan={firstPlan} current={liveState.allocation} isMobile={isMobile} />
    </div>
  );
}

function EventDecisionPanel({
  event,
  selectedChoice,
  fundingGap,
  saving,
  onSelect,
  onConfirm,
  onRebalance,
}: {
  event: ReturnType<typeof nextBudgetLiveEvent> extends infer T ? Exclude<T, null> : never;
  selectedChoice: BudgetLiveEventChoice | null;
  fundingGap: number;
  saving: boolean;
  onSelect: (choice: BudgetLiveEventChoice) => void;
  onConfirm: (choice: BudgetLiveEventChoice) => void;
  onRebalance: () => void;
}) {
  return (
    <section style={mainPanelStyle}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "12px", alignItems: "start" }}>
        <div style={{ maxWidth: "760px" }}>
          <p style={{ ...eyebrowStyle, color: categoryColour(event.category) }}>Day {event.day} · {formatCategory(event.category)}</p>
          <h4 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "30px", fontWeight: 500 }}>
            {event.title}
          </h4>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.58)", fontSize: "16px", fontWeight: 700 }}>
            {event.subtitle}
          </p>
          <div style={{ marginTop: "8px" }}>
            <BudgetInfoButton title={event.title}>{event.briefing}</BudgetInfoButton>
          </div>
          {event.linkedFrom && (
            <span style={{ display: "inline-flex", marginTop: "8px", height: "fit-content", borderRadius: "999px", border: "1px solid rgba(255,209,138,.16)", background: "rgba(255,209,138,.06)", padding: "6px 8px", color: "#ffd18a", fontSize: "15px", fontWeight: 900 }}>
              Linked consequence
            </span>
          )}
        </div>
        <BudgetAssetIcon
          src={budgetLiveEventAsset(event)}
          alt={`${event.title} event`}
          size={86}
        />
      </div>

      <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: "7px" }}>
        {event.analysis.map((item) => (
          <div key={item.label} style={{ borderRadius: "13px", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.022)", padding: "9px" }}>
            <span style={{ display: "block", color: "rgba(255,255,255,.31)", fontSize: "15px", fontWeight: 900, textTransform: "uppercase" }}>{item.label}</span>
            <strong style={{ display: "block", marginTop: "3px", color: "white", fontSize: "19px" }}>{item.value}</strong>
            <div style={{ marginTop: "7px" }}><BudgetInfoButton title={item.label}>{item.detail}</BudgetInfoButton></div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "12px", display: "grid", gap: "7px" }}>
        {event.choices.map((choice) => {
          const selected = selectedChoice?.id === choice.id;
          return (
            <div
              key={choice.id}
              style={{
                width: "100%",
                borderRadius: "14px",
                border: selected ? "1px solid rgba(126,232,255,.34)" : "1px solid rgba(255,255,255,.075)",
                background: selected ? "rgba(83,215,255,.08)" : "rgba(255,255,255,.018)",
                padding: "11px 12px",
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) auto",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(choice)}
                aria-pressed={selected}
                style={{
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  color: "white",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "20px" }}>{choice.label}</strong>
                  <span style={{ color: choice.allocationMove ? "#c3b5ff" : choice.cashImpact > 0 ? "#80efb8" : choice.cashImpact < 0 ? "#ffd18a" : "rgba(255,255,255,.38)", fontSize: "18px", fontWeight: 900 }}>
                    {choice.allocationMove
                      ? `Move ${choice.allocationMove.amount.toLocaleString()} DT`
                      : `${choice.cashImpact > 0 ? "+" : ""}${choice.cashImpact.toLocaleString()} DT`}
                  </span>
                </div>
              </button>
              <BudgetInfoButton title={choice.label}>{choice.description}{choice.riskNote ? ` ${choice.riskNote}` : ""}</BudgetInfoButton>
            </div>
          );
        })}
      </div>

      {selectedChoice && (
        <div style={{ marginTop: "10px", borderRadius: "14px", border: fundingGap > 0 ? "1px solid rgba(255,184,112,.22)" : "1px solid rgba(126,232,255,.11)", background: fundingGap > 0 ? "rgba(83,41,10,.13)" : "rgba(83,215,255,.035)", padding: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <strong style={{ color: fundingGap > 0 ? "#ffd3a0" : "#a9ffd4", fontSize: "18px" }}>
              {fundingGap > 0 ? `${fundingGap.toLocaleString()} DT more needed` : "Ready to confirm"}
            </strong>
            <BudgetInfoButton title={selectedChoice.label} accent={fundingGap > 0 ? "#ffd3a0" : "#a9ffd4"}>
              {fundingGap > 0
                ? `This choice is short of ${fundingGap.toLocaleString()} DT in available DT. Move money out of a protected priority before confirming.`
                : `${selectedChoice.effectSummary}${selectedChoice.riskNote ? ` ${selectedChoice.riskNote}` : ""}`}
            </BudgetInfoButton>
          </div>
          <div style={{ marginTop: "8px", display: "flex", gap: "7px", flexWrap: "wrap" }}>
            {fundingGap > 0 && <button type="button" onClick={onRebalance} style={secondaryButtonStyle}>Rebalance</button>}
            <button type="button" onClick={() => onConfirm(selectedChoice)} disabled={saving || fundingGap > 0} style={{ ...primaryButtonStyle, opacity: saving || fundingGap > 0 ? 0.45 : 1 }}>
              {saving ? "Saving..." : "Confirm decision"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AdvancePanel({
  currentDay,
  eventDay,
  eventTitle,
  commitments,
  liquid,
  shortfall,
  saving,
  onAdvance,
  onRebalance,
}: {
  currentDay: number;
  eventDay: number;
  eventTitle: string;
  commitments: BudgetFinancialProfile["commitments"];
  liquid: number;
  shortfall: number;
  saving: boolean;
  onAdvance: () => void;
  onRebalance: () => void;
}) {
  return (
    <section style={mainPanelStyle}>
      <p style={eyebrowStyle}>Advance the month</p>
      <h4 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "29px", fontWeight: 500 }}>
        Day {currentDay} → Day {eventDay}
      </h4>
      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "9px" }}>
        <strong style={{ color: "rgba(255,255,255,.78)", fontSize: "18px" }}>Next: {eventTitle}</strong>
        <BudgetInfoButton title="Advance the month">Known bills due before the next decision will be paid automatically from available DT.</BudgetInfoButton>
      </div>

      <div style={{ marginTop: "11px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: "7px" }}>
        <TopMetric label="Available now" value={`${liquid.toLocaleString()} DT`} accent="#8ee8ff" />
        <TopMetric label="Commitments due" value={`${commitments.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} DT`} accent="#ffd18a" />
        <TopMetric label="After commitments" value={`${Math.max(0, liquid - commitments.reduce((sum, item) => sum + item.amount, 0)).toLocaleString()} DT`} accent={shortfall > 0 ? "#ffaaaa" : "#80efb8"} />
      </div>

      {commitments.length > 0 && (
        <div style={{ marginTop: "9px", display: "grid", gap: "5px" }}>
          {commitments.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", borderRadius: "10px", background: "rgba(255,255,255,.018)", padding: "7px 9px", fontSize: "14px" }}>
              <span style={{ color: "rgba(255,255,255,.45)" }}>Day {item.dueDay} · {item.title}</span>
              <strong style={{ color: "#ffd18a" }}>{item.amount.toLocaleString()} DT</strong>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "10px", display: "flex", gap: "7px", flexWrap: "wrap" }}>
        {shortfall > 0 && <button type="button" onClick={onRebalance} style={secondaryButtonStyle}>Rebalance</button>}
        <button type="button" disabled={saving || shortfall > 0} onClick={onAdvance} style={{ ...primaryButtonStyle, opacity: saving || shortfall > 0 ? 0.45 : 1 }}>
          {saving ? "Saving..." : `Advance to Day ${eventDay}`}
        </button>
      </div>
    </section>
  );
}

function OutcomePanel({
  outcome,
  currentDay,
  activeEvent,
  saving,
  onContinue,
  onRebalance,
}: {
  outcome: BudgetLiveMonthState["lastOutcome"] extends infer T ? Exclude<T, null | undefined> : never;
  currentDay: number;
  activeEvent: ReturnType<typeof nextBudgetLiveEvent>;
  saving: boolean;
  onContinue: () => void;
  onRebalance: () => void;
}) {
  const colour = outcome.tone === "positive" ? "#80efb8" : outcome.tone === "warning" ? "#ffd18a" : "#8ee8ff";
  return (
    <section style={mainPanelStyle}>
      <p style={{ ...eyebrowStyle, color: colour }}>Decision recorded</p>
      <h4 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "29px", fontWeight: 500 }}>{outcome.title}</h4>
      <div style={{ marginTop: "8px" }}><BudgetInfoButton title={outcome.title} accent={colour}>{outcome.detail}</BudgetInfoButton></div>
      <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.28)", fontSize: "14px" }}>
        {activeEvent ? `Next decision: Day ${activeEvent.day} · ${activeEvent.title}` : "Live Month complete · Final Week next"}
      </p>
      <div style={{ marginTop: "10px", display: "flex", gap: "7px", flexWrap: "wrap" }}>
        <button type="button" onClick={onRebalance} style={secondaryButtonStyle}>Rebalance before continuing</button>
        <button type="button" disabled={saving} onClick={onContinue} style={{ ...primaryButtonStyle, opacity: saving ? 0.45 : 1 }}>
          Continue month
        </button>
      </div>
      <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,.22)", fontSize: "15px" }}>Current day: {currentDay}</span>
    </section>
  );
}

function FinishPanel({
  currentDay,
  commitments,
  liquid,
  shortfall,
  saving,
  onFinish,
  onRebalance,
}: {
  currentDay: number;
  commitments: BudgetFinancialProfile["commitments"];
  liquid: number;
  shortfall: number;
  saving: boolean;
  onFinish: () => void;
  onRebalance: () => void;
}) {
  const total = commitments.reduce((sum, item) => sum + item.amount, 0);
  return (
    <section style={mainPanelStyle}>
      <p style={{ ...eyebrowStyle, color: "#80efb8" }}>Live month decisions complete</p>
      <h4 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "29px", fontWeight: 500 }}>Ready for the Final Week</h4>
      <div style={{ marginTop: "8px" }}><BudgetInfoButton title="Final Week">Before Day 25 begins, any remaining known bills through Day 24 are settled. The Final Week then gives you one deliberately difficult trade-off using the position you built.</BudgetInfoButton></div>
      <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: "7px" }}>
        <TopMetric label="Current day" value={`Day ${currentDay}`} accent="#8ee8ff" />
        <TopMetric label="Available DT" value={`${liquid.toLocaleString()} DT`} accent="#8ee8ff" />
        <TopMetric label="Still due by Day 24" value={`${total.toLocaleString()} DT`} accent="#ffd18a" />
      </div>
      <div style={{ marginTop: "10px", display: "flex", gap: "7px", flexWrap: "wrap" }}>
        {shortfall > 0 && <button type="button" onClick={onRebalance} style={secondaryButtonStyle}>Rebalance</button>}
        <button type="button" disabled={saving || shortfall > 0} onClick={onFinish} style={{ ...primaryButtonStyle, opacity: saving || shortfall > 0 ? 0.45 : 1 }}>
          {saving ? "Saving..." : "Start Final Week →"}
        </button>
      </div>
    </section>
  );
}

function AllocationComparison({ firstPlan, current, isMobile }: { firstPlan: BudgetAllocation; current: BudgetAllocation; isMobile: boolean }) {
  const rows: Array<{ key: keyof BudgetAllocation; label: string }> = [
    { key: "essentials", label: "Essentials" },
    { key: "savings", label: "Savings" },
    { key: "emergency", label: "Emergency" },
    { key: "investing", label: "Investing" },
    { key: "goals", label: "Goals" },
    { key: "lifestyle", label: "Lifestyle" },
    { key: "unallocated", label: "Available" },
  ];
  return (
    <section style={{ marginTop: "10px", borderRadius: "16px", border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.016)", padding: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline", flexWrap: "wrap" }}>
        <p style={eyebrowStyle}>Plan movement</p>
        <span style={{ color: "rgba(255,255,255,.25)", fontSize: "15px" }}>Day 1 plan vs current allocation</span>
      </div>
      <div style={{ marginTop: "7px", display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(7,minmax(0,1fr))", gap: "5px" }}>
        {rows.map((row) => {
          const delta = current[row.key] - firstPlan[row.key];
          return (
            <div key={row.key} style={{ borderRadius: "10px", background: "rgba(255,255,255,.018)", padding: "7px" }}>
              <span style={{ display: "block", color: "rgba(255,255,255,.28)", fontSize: "15px", fontWeight: 850 }}>{row.label}</span>
              <strong style={{ display: "block", marginTop: "2px", fontSize: "16px" }}>{current[row.key].toLocaleString()} DT</strong>
              <span style={{ display: "block", marginTop: "2px", color: delta > 0 ? "#80efb8" : delta < 0 ? "#ffd18a" : "rgba(255,255,255,.23)", fontSize: "15px" }}>
                {delta > 0 ? "+" : ""}{delta.toLocaleString()} from Day 1
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.02)", padding: "8px" }}>
      <span style={{ display: "block", color: "rgba(255,255,255,.3)", fontSize: "15px", fontWeight: 900, textTransform: "uppercase" }}>{label}</span>
      <strong style={{ display: "block", marginTop: "2px", color: accent, fontSize: "18px" }}>{value}</strong>
    </div>
  );
}

function categoryColour(category: string) {
  if (category === "income") return "#80efb8";
  if (category === "expense") return "#ffd18a";
  if (category === "consequence") return "#ffb8d9";
  if (category === "market") return "#c3b5ff";
  if (category === "opportunity") return "#9ad7ff";
  if (category === "goal") return "#ffe7a6";
  return "#b7c9ff";
}

function formatCategory(category: string) {
  return category.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const mainPanelStyle = {
  marginTop: "11px",
  borderRadius: "19px",
  border: "1px solid rgba(126,232,255,.11)",
  background: "linear-gradient(145deg,rgba(4,18,41,.80),rgba(4,10,25,.72))",
  padding: "13px",
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  minHeight: "36px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,.25)",
  background: "rgba(83,215,255,.12)",
  color: "#b8f4ff",
  padding: "0 12px",
  fontFamily: "inherit",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  minHeight: "36px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,.09)",
  background: "rgba(255,255,255,.03)",
  color: "rgba(255,255,255,.62)",
  padding: "0 12px",
  fontFamily: "inherit",
  fontSize: "14px",
  fontWeight: 900,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};
