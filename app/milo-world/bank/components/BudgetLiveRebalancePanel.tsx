"use client";

import { useMemo, useState } from "react";
import {
  budgetLiveLiquidTotal,
  budgetLiveProtectedTotal,
  rebalanceLiveMonth,
} from "../lib/budget-simulator-live-month";
import type {
  BudgetAllocationKey,
  BudgetLiveMonthState,
} from "../lib/budget-simulator-types";

const KEYS: BudgetAllocationKey[] = [
  "essentials",
  "savings",
  "emergency",
  "investing",
  "goals",
  "lifestyle",
  "unallocated",
];

const LABELS: Record<BudgetAllocationKey, string> = {
  essentials: "Essentials",
  savings: "Savings",
  emergency: "Emergency",
  investing: "Investing",
  goals: "Goals",
  lifestyle: "Lifestyle",
  unallocated: "Available",
};

export default function BudgetLiveRebalancePanel({
  state,
  currentDay,
  fundingGap = 0,
  onChange,
}: {
  state: BudgetLiveMonthState;
  currentDay: number;
  fundingGap?: number;
  onChange: (next: BudgetLiveMonthState) => void;
}) {
  const [from, setFrom] = useState<BudgetAllocationKey>("savings");
  const [to, setTo] = useState<BudgetAllocationKey>("unallocated");
  const [amount, setAmount] = useState(100);

  const maxAmount = state.allocation[from];
  const safeAmount = Math.min(Math.max(0, Math.round(amount / 10) * 10), maxAmount);
  const canTransfer = from !== to && safeAmount > 0;
  const liquid = budgetLiveLiquidTotal(state.allocation);
  const protectedTotal = budgetLiveProtectedTotal(state.allocation);

  const suggestion = useMemo(() => {
    if (fundingGap <= 0) return null;
    return Math.min(
      Math.max(10, Math.ceil(fundingGap / 10) * 10),
      state.allocation[from],
    );
  }, [fundingGap, from, state.allocation]);

  function transfer() {
    if (!canTransfer) return;
    onChange(
      rebalanceLiveMonth(state, {
        from,
        to,
        amount: safeAmount,
        day: currentDay,
      }),
    );
  }

  return (
    <div
      style={{
        borderRadius: "17px",
        border: fundingGap > 0
          ? "1px solid rgba(255,184,112,.24)"
          : "1px solid rgba(126,232,255,.12)",
        background: fundingGap > 0
          ? "rgba(80,42,13,.18)"
          : "rgba(4,16,35,.58)",
        padding: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <div>
          <p style={eyebrowStyle}>Rebalance plan</p>
          <strong style={{ display: "block", marginTop: "3px", fontSize: "12px" }}>
            Move DT between priorities
          </strong>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <Metric label="Liquid" value={`${liquid.toLocaleString()} DT`} />
          <Metric label="Protected" value={`${protectedTotal.toLocaleString()} DT`} />
        </div>
      </div>

      {fundingGap > 0 && (
        <p style={{ margin: "9px 0 0", color: "#ffd3a0", fontSize: "8px", lineHeight: 1.5 }}>
          You need another <strong>{fundingGap.toLocaleString()} DT</strong> in liquid funds before this step can be funded. Move DT from a protected priority into Available or another liquid category.
        </p>
      )}

      <div
        style={{
          marginTop: "10px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(94px,1fr))",
          gap: "6px",
        }}
      >
        {KEYS.map((key) => (
          <div key={key} style={{ borderRadius: "11px", border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.018)", padding: "7px" }}>
            <span style={{ display: "block", color: "rgba(255,255,255,.32)", fontSize: "6px", fontWeight: 850, textTransform: "uppercase" }}>
              {LABELS[key]}
            </span>
            <strong style={{ display: "block", marginTop: "2px", color: key === "unallocated" ? "#8ee8ff" : "white", fontSize: "10px" }}>
              {state.allocation[key].toLocaleString()} DT
            </strong>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "10px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))",
          gap: "7px",
          alignItems: "end",
        }}
      >
        <label style={labelStyle}>
          From
          <select value={from} onChange={(event) => setFrom(event.target.value as BudgetAllocationKey)} style={inputStyle}>
            {KEYS.map((key) => (
              <option key={key} value={key}>{LABELS[key]} · {state.allocation[key].toLocaleString()} DT</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          To
          <select value={to} onChange={(event) => setTo(event.target.value as BudgetAllocationKey)} style={inputStyle}>
            {KEYS.map((key) => (
              <option key={key} value={key}>{LABELS[key]}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Amount
          <input
            type="number"
            min={0}
            max={maxAmount}
            step={10}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            style={inputStyle}
          />
        </label>

        <button type="button" disabled={!canTransfer} onClick={transfer} style={{ ...buttonStyle, opacity: canTransfer ? 1 : 0.45 }}>
          Move {safeAmount.toLocaleString()} DT
        </button>
      </div>

      {suggestion && suggestion > 0 && (
        <button type="button" onClick={() => setAmount(suggestion)} style={linkButtonStyle}>
          Use suggested amount: {suggestion.toLocaleString()} DT
        </button>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ borderRadius: "999px", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: "6px 8px", fontSize: "7px", color: "rgba(255,255,255,.46)" }}>
      {label}: <strong style={{ color: "rgba(255,255,255,.78)" }}>{value}</strong>
    </span>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

const labelStyle = {
  display: "grid",
  gap: "4px",
  color: "rgba(255,255,255,.38)",
  fontSize: "6px",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: ".08em",
};

const inputStyle = {
  width: "100%",
  minHeight: "36px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,.12)",
  background: "#07142c",
  color: "white",
  padding: "0 9px",
  fontFamily: "inherit",
  fontSize: "8px",
  outline: "none",
};

const buttonStyle = {
  minHeight: "36px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,.22)",
  background: "rgba(83,215,255,.10)",
  color: "#b8f4ff",
  padding: "0 10px",
  fontFamily: "inherit",
  fontSize: "7px",
  fontWeight: 950,
  cursor: "pointer",
  textTransform: "uppercase" as const,
};

const linkButtonStyle = {
  marginTop: "7px",
  border: 0,
  background: "transparent",
  color: "#ffd3a0",
  fontFamily: "inherit",
  fontSize: "7px",
  fontWeight: 850,
  cursor: "pointer",
  padding: 0,
};
