"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import {
  budgetAllocationKeys,
  budgetPool,
  buildBudgetAnalysis,
  formatBudgetAllocationLabel,
  getBudgetPlanningItems,
  setBudgetAllocationValue,
  totalKnownCommitments,
} from "../lib/budget-simulator-financial-model";
import type {
  BudgetAllocation,
  BudgetAllocationKey,
  BudgetFinancialProfile,
} from "../lib/budget-simulator-types";
import {
  BUDGET_SIMULATOR_ASSETS,
  budgetAllocationAsset,
} from "../lib/budget-simulator-assets";
import BudgetAllocationWheel from "./BudgetAllocationWheel";
import BudgetAssetIcon from "./BudgetAssetIcon";
import BudgetFinancialRadar from "./BudgetFinancialRadar";
import BudgetPlanningBoard from "./BudgetPlanningBoard";

export default function BudgetBuildStage({
  profile,
  screenMode,
  allocation,
  pinnedItems,
  saving,
  onAllocationChange,
  onPinnedChange,
  onContinue,
}: {
  profile: BudgetFinancialProfile;
  screenMode: BankScreenMode;
  allocation: BudgetAllocation;
  pinnedItems: string[];
  saving: boolean;
  onAllocationChange: (next: BudgetAllocation) => void;
  onPinnedChange: (next: string[]) => void;
  onContinue: () => Promise<void>;
}) {
  const isMobile = screenMode === "mobile";
  const [selected, setSelected] = useState<BudgetAllocationKey>("essentials");
  const analysis = useMemo(() => buildBudgetAnalysis(profile, allocation), [profile, allocation]);
  const planningItems = useMemo(() => getBudgetPlanningItems(profile), [profile]);
  const pool = budgetPool(profile);
  const commitments = totalKnownCommitments(profile);

  function setValue(key: Exclude<BudgetAllocationKey, "unallocated">, value: number) {
    onAllocationChange(setBudgetAllocationValue(allocation, key, value, profile));
  }

  const selectedEditable = selected !== "unallocated";
  const maxSelected = selectedEditable
    ? pool -
      budgetAllocationKeys()
        .filter((key) => key !== selected)
        .reduce((sum, key) => sum + allocation[key], 0)
    : allocation.unallocated;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: isMobile ? "stretch" : "end",
        }}
      >
        <div>
          <p style={eyebrowStyle}>Stage 3 · Build Budget</p>
          <h3
            style={{
              margin: "4px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "26px" : "32px",
              fontWeight: 500,
            }}
          >
            Decide where each DT should work.
          </h3>
        </div>
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
          <SummaryPill label="Planning pool" value={`${pool.toLocaleString()} DT`} />
          <SummaryPill label="Known commitments" value={`${commitments.toLocaleString()} DT`} />
          <SummaryPill label="Unallocated" value={`${allocation.unallocated.toLocaleString()} DT`} gold />
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "grid",
          gridTemplateColumns:
            isMobile ? "1fr" : screenMode === "compact" ? "1fr" : "minmax(0,1.2fr) minmax(330px,.8fr)",
          gap: "12px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            minWidth: 0,
            borderRadius: "20px",
            border: "1px solid rgba(126,232,255,.13)",
            background: "rgba(4,12,30,.78)",
            padding: isMobile ? "13px" : "16px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(250px,.9fr) minmax(280px,1.1fr)",
              gap: "14px",
              alignItems: "start",
            }}
          >
            <BudgetAllocationWheel
              profile={profile}
              allocation={allocation}
              selected={selected}
              onSelect={setSelected}
            />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,.07)",
                  background: "rgba(255,255,255,.02)",
                  padding: "12px",
                }}
              >
                <p style={{ margin: 0, color: "rgba(255,255,255,.34)", fontSize: "7px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  Selected allocation
                </p>
                <div style={{ marginTop: "7px", display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: "9px", alignItems: "center" }}>
                  <BudgetAssetIcon
                    src={budgetAllocationAsset(selected)}
                    alt={`${formatBudgetAllocationLabel(selected)} visual`}
                    size={50}
                    muted={selected === "unallocated"}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "15px" }}>{formatBudgetAllocationLabel(selected)}</strong>
                      <strong style={{ color: "#ffd18a", fontSize: "18px" }}>{allocation[selected].toLocaleString()} DT</strong>
                    </div>
                    <span style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,.31)", fontSize: "7px", lineHeight: 1.4 }}>
                      {selected === "investing"
                        ? "Growth money can later be directed into variable-return or fixed-return products."
                        : selected === "savings"
                          ? "Protected money prioritised for stability and future flexibility."
                          : selected === "goals"
                            ? "DT reserved for a defined future target."
                            : selected === "emergency"
                              ? "A buffer for costs you cannot predict in advance."
                              : selected === "lifestyle"
                                ? "Optional spending that competes with other priorities."
                                : selected === "essentials"
                                  ? "Known needs and commitments that keep the month functioning."
                                  : "DT kept immediately flexible until you decide where it should go."}
                    </span>
                  </div>
                </div>

                {selectedEditable ? (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, maxSelected)}
                      step={10}
                      value={allocation[selected]}
                      onChange={(event: { target: { value: string } }) => setValue(selected as Exclude<BudgetAllocationKey, "unallocated">, Number(event.target.value))}
                      style={{ width: "100%", marginTop: "12px", accentColor: "#7ee8ff" }}
                    />
                    <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 112px", gap: "8px", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,.34)", fontSize: "8px", lineHeight: 1.5 }}>
                        Drag the slider or enter an exact DT amount. Unallocated DT adjusts automatically.
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, maxSelected)}
                        step={10}
                        value={allocation[selected]}
                        onChange={(event: { target: { value: string } }) => setValue(selected as Exclude<BudgetAllocationKey, "unallocated">, Number(event.target.value))}
                        style={numberInputStyle}
                        aria-label={`${formatBudgetAllocationLabel(selected)} amount`}
                      />
                    </div>
                  </>
                ) : (
                  <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,.38)", fontSize: "8px", lineHeight: 1.5 }}>
                    Unallocated DT stays immediately flexible. Reduce or increase another category to change this amount.
                  </p>
                )}
                {selected === "investing" && <InvestmentReference />}
              </div>

              <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                {budgetAllocationKeys().map((key) => {
                  const max =
                    pool -
                    budgetAllocationKeys()
                      .filter((other) => other !== key)
                      .reduce((sum, other) => sum + allocation[other], 0);
                  return (
                    <label
                      key={key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "112px minmax(0,1fr) 88px",
                        gap: "7px",
                        alignItems: "center",
                        borderRadius: "12px",
                        border: selected === key ? "1px solid rgba(126,232,255,.18)" : "1px solid rgba(255,255,255,.045)",
                        background: selected === key ? "rgba(83,215,255,.035)" : "rgba(255,255,255,.012)",
                        padding: "7px 8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(key)}
                        style={{
                          border: 0,
                          padding: 0,
                          background: "transparent",
                          color: selected === key ? "#a9f1ff" : "rgba(255,255,255,.66)",
                          textAlign: "left",
                          fontFamily: "inherit",
                          fontSize: "8px",
                          fontWeight: 850,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          minWidth: 0,
                        }}
                      >
                        {budgetAllocationAsset(key) && (
                          <BudgetAssetIcon
                            src={budgetAllocationAsset(key)}
                            alt=""
                            size={24}
                            muted={selected !== key}
                          />
                        )}
                        <span>{formatBudgetAllocationLabel(key)}</span>
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, max)}
                        step={10}
                        value={allocation[key]}
                        onFocus={() => setSelected(key)}
                        onChange={(event: { target: { value: string } }) => setValue(key, Number(event.target.value))}
                        style={{ width: "100%", accentColor: "#7ee8ff" }}
                      />
                      <span style={{ color: "#ffd18a", textAlign: "right", fontSize: "8px", fontWeight: 900 }}>
                        {allocation[key].toLocaleString()} DT
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div style={{ minWidth: 0, display: "grid", gap: "10px" }}>
          <BudgetPlanningBoard
            screenMode={screenMode}
            items={planningItems}
            pinnedIds={pinnedItems}
            onRemove={(id) => onPinnedChange(pinnedItems.filter((item) => item !== id))}
          />

          <section
            style={{
              borderRadius: "19px",
              border: "1px solid rgba(255,255,255,.07)",
              background: "rgba(4,12,30,.76)",
              padding: "13px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
              <div>
                <p style={eyebrowStyle}>Live conditions</p>
                <strong style={{ display: "block", marginTop: "4px", fontSize: "13px" }}>
                  What this plan protects
                </strong>
              </div>
              <span style={{ color: "rgba(255,255,255,.28)", fontSize: "7px" }}>No score</span>
            </div>

            <div style={{ marginTop: "9px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "6px" }}>
              {analysis.conditions.map((condition) => (
                <ConditionCard key={condition.id} {...condition} />
              ))}
            </div>
          </section>

          <section
            style={{
              borderRadius: "19px",
              border: "1px solid rgba(184,168,255,.12)",
              background: "rgba(12,10,32,.68)",
              padding: "10px 12px 8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
              <div>
                <p style={{ ...eyebrowStyle, color: "#c3b5ff" }}>Financial shape</p>
                <strong style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>
                  Different plans create different trade-offs
                </strong>
              </div>
            </div>
            <BudgetFinancialRadar values={analysis.radar} />
          </section>
        </div>
      </div>

      <div
        style={{
          marginTop: "11px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "10px",
        }}
      >
        <p style={{ margin: 0, maxWidth: "700px", color: "rgba(255,255,255,.34)", fontSize: "8px", lineHeight: 1.5 }}>
          You can lock a risky plan. The simulator will not correct it for you. Forecasting in the next stage will show whether timing and shocks expose a weakness.
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onContinue()}
          style={{ ...primaryButtonStyle, opacity: saving ? .45 : 1 }}
        >
          Lock first budget →
        </button>
      </div>
    </div>
  );
}

function InvestmentReference() {
  return (
    <div
      style={{
        marginTop: "10px",
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
        gap: "6px",
      }}
    >
      <div style={referenceCardStyle}>
        <BudgetAssetIcon
          src={BUDGET_SIMULATOR_ASSETS.exchangeInvesting}
          alt="Exchange investing"
          size={36}
        />
        <div>
          <strong style={{ display: "block", fontSize: "8px" }}>Exchange</strong>
          <span style={referenceTextStyle}>Variable outcome · higher uncertainty</span>
        </div>
      </div>
      <div style={referenceCardStyle}>
        <BudgetAssetIcon
          src={BUDGET_SIMULATOR_ASSETS.bondFixedReturn}
          alt="Bank Bond"
          size={36}
        />
        <div>
          <strong style={{ display: "block", fontSize: "8px" }}>Bank Bonds</strong>
          <span style={referenceTextStyle}>Fixed return · DT locked for a term</span>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,.07)",
        background: "rgba(255,255,255,.02)",
        padding: "7px 9px",
      }}
    >
      <span style={{ display: "block", color: "rgba(255,255,255,.30)", fontSize: "6px", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".07em" }}>
        {label}
      </span>
      <strong style={{ display: "block", marginTop: "2px", color: gold ? "#ffd18a" : "rgba(255,255,255,.78)", fontSize: "9px" }}>
        {value}
      </strong>
    </div>
  );
}

function ConditionCard({
  label,
  level,
  detail,
  value,
}: {
  label: string;
  level: "strong" | "steady" | "limited" | "exposed";
  detail: string;
  value: number;
}) {
  const tone =
    level === "strong"
      ? { text: "#a9ffd4", border: "rgba(111,255,184,.18)", bg: "rgba(111,255,184,.045)" }
      : level === "steady"
        ? { text: "#a9f1ff", border: "rgba(126,232,255,.16)", bg: "rgba(83,215,255,.035)" }
        : level === "limited"
          ? { text: "#ffd18a", border: "rgba(255,209,138,.16)", bg: "rgba(255,209,138,.035)" }
          : { text: "#ffb8b8", border: "rgba(255,140,140,.16)", bg: "rgba(255,100,100,.035)" };

  return (
    <div style={{ borderRadius: "13px", border: `1px solid ${tone.border}`, background: tone.bg, padding: "9px" }} title={detail}>
      <span style={{ display: "block", color: "rgba(255,255,255,.34)", fontSize: "6px", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </span>
      <div style={{ marginTop: "4px", display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
        <strong style={{ color: tone.text, fontSize: "10px", textTransform: "capitalize" }}>{level}</strong>
        <span style={{ color: "rgba(255,255,255,.25)", fontSize: "7px" }}>{Math.round(value)}</span>
      </div>
      <div style={{ marginTop: "6px", height: "3px", borderRadius: "999px", background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: tone.text, borderRadius: "999px" }} />
      </div>
      <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.30)", fontSize: "6px", lineHeight: 1.45 }}>
        {detail}
      </p>
    </div>
  );
}

const referenceCardStyle = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "36px minmax(0,1fr)",
  gap: "7px",
  alignItems: "center",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,.055)",
  background: "rgba(255,255,255,.015)",
  padding: "6px",
};

const referenceTextStyle = {
  display: "block",
  marginTop: "2px",
  color: "rgba(255,255,255,.30)",
  fontSize: "6px",
  lineHeight: 1.35,
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: ".13em",
  textTransform: "uppercase" as const,
};

const numberInputStyle = {
  minHeight: "36px",
  width: "100%",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,.16)",
  background: "rgba(3,12,28,.88)",
  color: "#ffd18a",
  padding: "0 9px",
  outline: "none",
  fontFamily: "inherit",
  fontSize: "10px",
  fontWeight: 900,
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
