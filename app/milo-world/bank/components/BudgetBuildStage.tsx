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
import BudgetInfoButton from "./BudgetInfoButton";

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
    <div style={{ width: "100%", height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <p style={eyebrowStyle}>Stage 3 · Plan your money</p>
            <BudgetInfoButton title="Build your first plan">Move money between categories until the plan reflects what you want to protect. You can leave some money flexible. There is no single correct allocation.</BudgetInfoButton>
          </div>
          <h3
            style={{
              margin: "4px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "26px" : "32px",
              fontWeight: 500,
            }}
          >
            Give every dollar a job.
          </h3>
        </div>
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
          <SummaryPill label="Money to plan" value={`$${pool.toLocaleString()}`} />
          <SummaryPill label="Bills to cover" value={`$${commitments.toLocaleString()}`} />
          <SummaryPill label="Still flexible" value={`$${allocation.unallocated.toLocaleString()}`} gold />
        </div>
      </div>

      <div
        style={{
          marginTop: "5px",
          display: "grid",
          gridTemplateColumns:
            isMobile ? "1fr" : screenMode === "compact" ? "1fr" : "minmax(0,1.18fr) minmax(320px,.82fr)",
          gap: "10px",
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <section
          style={{
            minWidth: 0,
            borderRadius: "20px",
            border: "1px solid rgba(126,232,255,.13)",
            background: "rgba(4,12,30,.78)",
            padding: isMobile ? "12px" : "11px",
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(250px,.9fr) minmax(280px,1.1fr)",
              gap: "10px",
              alignItems: "stretch",
              height: "100%",
              minHeight: 0,
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
                  padding: "9px 10px",
                }}
              >
                <p style={{ margin: 0, color: "rgba(255,255,255,.34)", fontSize: "14px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  You are adjusting
                </p>
                <div style={{ marginTop: "7px", display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: "9px", alignItems: "center" }}>
                  <BudgetAssetIcon
                    src={budgetAllocationAsset(selected)}
                    alt={`${formatBudgetAllocationLabel(selected)} visual`}
                    size={42}
                    muted={selected === "unallocated"}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "18px" }}>{formatBudgetAllocationLabel(selected)}</strong>
                      <strong style={{ color: "#ffd18a", fontSize: "20px" }}>{`$${allocation[selected].toLocaleString()}`}</strong>
                    </div>
                    <div style={{ marginTop: "7px" }}>
                      <BudgetInfoButton title={formatBudgetAllocationLabel(selected)}>
                        {selected === "investing"
                          ? "Growth money can later be directed into variable-return or fixed-return products."
                          : selected === "savings"
                            ? "Protected money prioritised for stability and future flexibility."
                            : selected === "goals"
                              ? "Money reserved for a defined future target."
                              : selected === "emergency"
                                ? "A buffer for costs you cannot predict in advance."
                                : selected === "lifestyle"
                                  ? "Optional spending that competes with other priorities."
                                  : selected === "essentials"
                                    ? "Known needs and commitments that keep the month functioning."
                                    : "Money kept immediately flexible until you decide where it should go."}
                      </BudgetInfoButton>
                    </div>
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
                      style={{ width: "100%", marginTop: "5px", accentColor: "#7ee8ff" }}
                    />
                    <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 102px", gap: "8px", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "rgba(255,255,255,.58)", fontSize: "16px", fontWeight: 800 }}>Set amount</span>
                        <BudgetInfoButton title="Set an amount">Use the slider for quick changes or type an exact dollar amount. Any money you have not assigned stays in Still flexible.</BudgetInfoButton>
                      </div>
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
                  <div style={{ marginTop: "10px" }}>
                    <BudgetInfoButton title="Still flexible">This money has not been committed yet. It stays available for surprises or can be moved into another category at any time.</BudgetInfoButton>
                  </div>
                )}
                {selected === "investing" && <InvestmentReference />}
              </div>

              <div style={{ marginTop: "6px", display: "grid", gap: "4px" }}>
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
                        gridTemplateColumns: isMobile ? "1fr" : "108px minmax(0,1fr) 82px",
                        gap: "7px",
                        alignItems: "center",
                        borderRadius: "12px",
                        border: selected === key ? "1px solid rgba(126,232,255,.18)" : "1px solid rgba(255,255,255,.045)",
                        background: selected === key ? "rgba(83,215,255,.035)" : "rgba(255,255,255,.012)",
                        padding: "5px 7px",
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
                          fontSize: "15px",
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
                            size={21}
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
                      <span style={{ color: "#ffd18a", textAlign: "right", fontSize: "15px", fontWeight: 900 }}>
                        {`$${allocation[key].toLocaleString()}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div style={{ minWidth: 0, height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "minmax(0,.78fr) auto minmax(0,1fr)", gap: "7px", overflow: "hidden" }}>
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
              padding: "9px 10px",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><p style={eyebrowStyle}>Plan health</p><BudgetInfoButton title="Plan health">These indicators show what your current allocation protects. They are not a score; different plans can make sense for different goals.</BudgetInfoButton></div>
                <strong style={{ display: "block", marginTop: "4px", fontSize: "19px" }}>
                  What your plan looks like
                </strong>
              </div>
              
            </div>

            <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "5px" }}>
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
              padding: "7px 9px 5px",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><p style={{ ...eyebrowStyle, color: "#c3b5ff" }}>Trade-offs</p><BudgetInfoButton title="Trade-offs" accent="#c3b5ff">The radar chart shows how strongly your plan supports liquidity, resilience, goals, flexibility and long-term growth. A larger shape is not always better if it ignores your priorities.</BudgetInfoButton></div>
                <strong style={{ display: "block", marginTop: "4px", fontSize: "18px" }}>
                  See the balance at a glance
                </strong>
              </div>
            </div>
            <BudgetFinancialRadar values={analysis.radar} />
          </section>
        </div>
      </div>

      <div
        style={{
          marginTop: "6px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "10px",
        }}
      >
        <BudgetInfoButton title="Before you continue">You can lock a risky plan. The simulator will not correct it for you. The next stage lets you test whether timing and unexpected costs expose a weakness.</BudgetInfoButton>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onContinue()}
          style={{ ...primaryButtonStyle, opacity: saving ? .45 : 1 }}
        >
          Test this plan →
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
          <strong style={{ display: "block", fontSize: "15px" }}>Exchange</strong>
          <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "7px" }}><span style={referenceTextStyle}>Variable return</span><BudgetInfoButton title="Exchange investing">Returns can rise or fall, so the outcome is uncertain and the value can change over time.</BudgetInfoButton></div>
        </div>
      </div>
      <div style={referenceCardStyle}>
        <BudgetAssetIcon
          src={BUDGET_SIMULATOR_ASSETS.bondFixedReturn}
          alt="Bank Bond"
          size={36}
        />
        <div>
          <strong style={{ display: "block", fontSize: "15px" }}>Bank Bonds</strong>
          <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "7px" }}><span style={referenceTextStyle}>Fixed return</span><BudgetInfoButton title="Bank Bonds">The return is fixed for the term, but the money is locked until the Bond matures.</BudgetInfoButton></div>
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
      <span style={{ display: "block", color: "rgba(255,255,255,.30)", fontSize: "15px", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".07em" }}>
        {label}
      </span>
      <strong style={{ display: "block", marginTop: "2px", color: gold ? "#ffd18a" : "rgba(255,255,255,.78)", fontSize: "16px" }}>
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
    <div style={{ borderRadius: "13px", border: `1px solid ${tone.border}`, background: tone.bg, padding: "7px 8px" }}>
      <span style={{ display: "block", color: "rgba(255,255,255,.34)", fontSize: "15px", fontWeight: 850, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </span>
      <div style={{ marginTop: "4px", display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
        <strong style={{ color: tone.text, fontSize: "15px", textTransform: "capitalize" }}>{level}</strong>
        <span style={{ color: "rgba(255,255,255,.25)", fontSize: "14px" }}>{Math.round(value)}</span>
      </div>
      <div style={{ marginTop: "4px", height: "3px", borderRadius: "999px", background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: tone.text, borderRadius: "999px" }} />
      </div>
      <div style={{ marginTop: "5px" }}>
        <BudgetInfoButton title={label} accent={tone.text}>{detail}</BudgetInfoButton>
      </div>
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
  fontSize: "15px",
  lineHeight: 1.35,
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "14px",
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
  fontSize: "17px",
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
  fontSize: "15px",
  fontWeight: 950,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};
