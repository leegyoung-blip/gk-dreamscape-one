"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import {
  buildBudgetForecast,
  commitmentDetailsForDay,
  runBudgetStressTest,
  stressTestDefinitions,
} from "../lib/budget-simulator-forecast";
import type {
  BudgetAllocation,
  BudgetFinancialProfile,
  BudgetStressTestKey,
} from "../lib/budget-simulator-types";
import BudgetForecastChart from "./BudgetForecastChart";

export default function BudgetForecastStage({
  profile,
  allocation,
  screenMode,
  selectedDay,
  stressTestsRun,
  saving,
  onSelectedDayChange,
  onStressTestsChange,
  onAdjustPlan,
  onConfirm,
}: {
  profile: BudgetFinancialProfile;
  allocation: BudgetAllocation;
  screenMode: BankScreenMode;
  selectedDay: number;
  stressTestsRun: BudgetStressTestKey[];
  saving: boolean;
  onSelectedDayChange: (day: number) => void;
  onStressTestsChange: (keys: BudgetStressTestKey[]) => void;
  onAdjustPlan: () => Promise<void>;
  onConfirm: () => Promise<void>;
}) {
  const isMobile = screenMode === "mobile";
  const forecast = useMemo(
    () => buildBudgetForecast(profile, allocation),
    [profile, allocation],
  );
  const day = Math.max(1, Math.min(30, Math.round(selectedDay || 1)));
  const point = forecast.points[day - 1];
  const commitments = commitmentDetailsForDay(profile, day);
  const [activeStress, setActiveStress] = useState<BudgetStressTestKey | null>(
    stressTestsRun.at(-1) ?? null,
  );

  const activeStressResult = activeStress
    ? runBudgetStressTest({ profile, allocation, key: activeStress })
    : null;

  function runStressTest(key: BudgetStressTestKey) {
    setActiveStress(key);
    if (!stressTestsRun.includes(key)) {
      onStressTestsChange([...stressTestsRun, key]);
    }
  }

  const canConfirm = stressTestsRun.length > 0;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "end",
          gap: "10px",
        }}
      >
        <div>
          <p style={eyebrowStyle}>Stage 4 · Forecast</p>
          <h3
            style={{
              margin: "4px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "26px" : "32px",
              fontWeight: 500,
            }}
          >
            Test the plan before the month begins.
          </h3>
          <p style={introStyle}>
            The forecast uses your confirmed budget and known commitments. Unknown events are deliberately not included.
          </p>
        </div>

        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
          <SummaryPill
            label="Lowest available"
            value={`${forecast.minimumAvailable.toLocaleString()} DT`}
            warning={forecast.minimumAvailable < 0}
          />
          <SummaryPill label="Protected" value={`${forecast.protectedTotal.toLocaleString()} DT`} />
          <SummaryPill label="Known payments" value={`${forecast.totalKnownPayments.toLocaleString()} DT`} />
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "grid",
          gridTemplateColumns:
            isMobile || screenMode === "compact"
              ? "1fr"
              : "minmax(0,1.35fr) minmax(300px,.65fr)",
          gap: "12px",
          alignItems: "start",
        }}
      >
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            <div>
              <p style={sectionLabel}>30-day cash-flow view</p>
              <strong style={{ display: "block", marginTop: "3px", fontSize: isMobile ? "15px" : "17px" }}>
                Available versus protected DT
              </strong>
            </div>
            <span style={neutralBadgeStyle}>
              Day {day}
            </span>
          </div>

          <div style={{ marginTop: "12px" }}>
            <BudgetForecastChart forecast={forecast} selectedDay={day} />
          </div>

          <label style={{ display: "block", marginTop: "8px" }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: "8px", color: "rgba(255,255,255,.42)", fontSize: "8px", fontWeight: 850 }}>
              <span>Scrub through the month</span>
              <span>Day {day} / 30</span>
            </span>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={day}
              onChange={(event) => onSelectedDayChange(Number(event.target.value))}
              style={{ width: "100%", marginTop: "7px", accentColor: "#7ee8ff" }}
            />
          </label>
        </section>

        <aside style={panelStyle}>
          <p style={sectionLabel}>Day {day}</p>
          <div style={{ marginTop: "8px", display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr" }}>
            <Metric label="Available" value={`${point.available.toLocaleString()} DT`} tone={point.available < 0 ? "danger" : "cyan"} />
            <Metric label="Protected" value={`${point.protected.toLocaleString()} DT`} tone="violet" />
          </div>

          <div
            style={{
              marginTop: "10px",
              borderRadius: "15px",
              border: "1px solid rgba(255,209,138,.12)",
              background: "rgba(255,209,138,.035)",
              padding: "11px",
            }}
          >
            <p style={{ ...sectionLabel, color: "#ffd18a" }}>Known payment today</p>
            {commitments.length === 0 ? (
              <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.38)", fontSize: "8px", lineHeight: 1.5 }}>
                No known commitment is due on this day.
              </p>
            ) : (
              <div style={{ marginTop: "6px", display: "grid", gap: "6px" }}>
                {commitments.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "start" }}>
                    <span style={{ color: "rgba(255,255,255,.62)", fontSize: "8px", lineHeight: 1.4 }}>
                      {item.title}
                    </span>
                    <strong style={{ color: "#ffd18a", fontSize: "8px", whiteSpace: "nowrap" }}>
                      -{item.amount.toLocaleString()} DT
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: "10px" }}>
            <p style={sectionLabel}>What the forecast is saying</p>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.52)", fontSize: "8px", lineHeight: 1.6 }}>
              {forecast.firstShortfallDay
                ? `Your available DT first falls below zero on Day ${forecast.firstShortfallDay}. The plan relies on changing an allocation before then.`
                : `All known commitments fit inside the liquid part of your plan. Your tightest projected point still leaves ${Math.max(0, forecast.minimumAvailable).toLocaleString()} DT available.`}
            </p>
          </div>
        </aside>
      </div>

      <section style={{ ...panelStyle, marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <p style={sectionLabel}>Stress test</p>
            <strong style={{ display: "block", marginTop: "3px", fontSize: isMobile ? "15px" : "17px" }}>
              What if the month does not go to plan?
            </strong>
            <p style={{ ...introStyle, marginTop: "4px" }}>
              These are hypothetical tests. They do not reveal the actual events waiting in the Live Month.
            </p>
          </div>
          <span style={neutralBadgeStyle}>
            {stressTestsRun.length} / {stressTestDefinitions().length} tested
          </span>
        </div>

        <div
          style={{
            marginTop: "11px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
            gap: "8px",
          }}
        >
          {stressTestDefinitions().map((test) => {
            const tested = stressTestsRun.includes(test.key);
            const active = activeStress === test.key;
            return (
              <button
                key={test.key}
                type="button"
                onClick={() => runStressTest(test.key)}
                style={{
                  minHeight: "92px",
                  borderRadius: "16px",
                  border: active
                    ? "1px solid rgba(126,232,255,.38)"
                    : tested
                      ? "1px solid rgba(99,255,183,.18)"
                      : "1px solid rgba(255,255,255,.08)",
                  background: active
                    ? "rgba(83,215,255,.08)"
                    : tested
                      ? "rgba(99,255,183,.035)"
                      : "rgba(255,255,255,.022)",
                  padding: "11px",
                  textAlign: "left",
                  color: "white",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ display: "flex", justifyContent: "space-between", gap: "7px", alignItems: "start" }}>
                  <strong style={{ fontSize: "9px" }}>{test.label}</strong>
                  {tested && <span style={{ color: "#a9ffd4", fontSize: "8px", fontWeight: 950 }}>✓</span>}
                </span>
                <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,.38)", fontSize: "7px", lineHeight: 1.5 }}>
                  {test.description}
                </span>
              </button>
            );
          })}
        </div>

        {activeStressResult && (
          <div
            style={{
              marginTop: "10px",
              borderRadius: "17px",
              border: activeStressResult.commitmentsCoveredWithoutRebalance
                ? "1px solid rgba(99,255,183,.16)"
                : "1px solid rgba(255,164,134,.18)",
              background: activeStressResult.commitmentsCoveredWithoutRebalance
                ? "rgba(99,255,183,.035)"
                : "rgba(255,124,90,.04)",
              padding: isMobile ? "12px" : "13px 14px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.25fr) repeat(3,minmax(110px,.25fr))",
              gap: "9px",
              alignItems: "center",
            }}
          >
            <div>
              <p style={{ ...sectionLabel, color: activeStressResult.commitmentsCoveredWithoutRebalance ? "#a9ffd4" : "#ffc0a9" }}>
                {activeStressResult.shortLabel}
              </p>
              <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.56)", fontSize: "8px", lineHeight: 1.6 }}>
                {activeStressResult.interpretation}
              </p>
            </div>
            <Metric
              label="Tightest point"
              value={`${activeStressResult.minimumAvailable.toLocaleString()} DT`}
              tone={activeStressResult.minimumAvailable < 0 ? "danger" : "cyan"}
            />
            <Metric
              label="Liquidity gap"
              value={`${activeStressResult.liquidityGap.toLocaleString()} DT`}
              tone={activeStressResult.liquidityGap > 0 ? "danger" : "green"}
            />
            <Metric
              label="Month end"
              value={`${activeStressResult.finalAvailable.toLocaleString()} DT`}
              tone={activeStressResult.finalAvailable < 0 ? "danger" : "violet"}
            />
          </div>
        )}
      </section>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "8px",
          borderRadius: "17px",
          border: "1px solid rgba(255,255,255,.07)",
          background: "rgba(255,255,255,.018)",
          padding: "10px",
        }}
      >
        <p style={{ margin: 0, color: "rgba(255,255,255,.40)", fontSize: "8px", lineHeight: 1.5 }}>
          {canConfirm
            ? "You have tested the plan. Confirm it to begin the Live Month, or return to Stage 3 and rebalance first."
            : "Run at least one stress test before confirming the budget."}
        </p>
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onAdjustPlan()}
            style={secondaryButtonStyle}
          >
            Adjust plan
          </button>
          <button
            type="button"
            disabled={saving || !canConfirm}
            onClick={() => void onConfirm()}
            style={{
              ...primaryButtonStyle,
              opacity: saving || !canConfirm ? 0.45 : 1,
              cursor: saving || !canConfirm ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Confirm budget →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: "12px",
        border: warning ? "1px solid rgba(255,130,130,.18)" : "1px solid rgba(255,255,255,.07)",
        background: warning ? "rgba(255,80,80,.045)" : "rgba(255,255,255,.025)",
        padding: "7px 9px",
        minWidth: "105px",
      }}
    >
      <span style={{ display: "block", color: "rgba(255,255,255,.31)", fontSize: "6px", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>
        {label}
      </span>
      <strong style={{ display: "block", marginTop: "3px", color: warning ? "#ffc1c1" : "rgba(255,255,255,.76)", fontSize: "10px" }}>
        {value}
      </strong>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "violet" | "green" | "danger";
}) {
  const colour =
    tone === "danger"
      ? "#ffc1c1"
      : tone === "green"
        ? "#a9ffd4"
        : tone === "violet"
          ? "#d9b7ff"
          : "#8ee8ff";
  return (
    <div style={{ borderRadius: "13px", border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.12)", padding: "9px" }}>
      <span style={{ display: "block", color: "rgba(255,255,255,.30)", fontSize: "6px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong style={{ display: "block", marginTop: "4px", color: colour, fontSize: "12px" }}>
        {value}
      </strong>
    </div>
  );
}

const panelStyle = {
  minWidth: 0,
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,.12)",
  background: "rgba(4,12,30,.76)",
  padding: "14px",
};

const eyebrowStyle = {
  color: "#8ee8ff",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

const sectionLabel = {
  margin: 0,
  color: "rgba(255,255,255,.34)",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: ".10em",
  textTransform: "uppercase" as const,
};

const introStyle = {
  margin: "6px 0 0",
  maxWidth: "680px",
  color: "rgba(255,255,255,.40)",
  fontSize: "8px",
  lineHeight: 1.55,
};

const neutralBadgeStyle = {
  minHeight: "24px",
  padding: "0 8px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,.08)",
  background: "rgba(255,255,255,.03)",
  color: "rgba(255,255,255,.45)",
  display: "inline-flex",
  alignItems: "center",
  fontSize: "7px",
  fontWeight: 900,
  letterSpacing: ".07em",
  textTransform: "uppercase" as const,
};

const secondaryButtonStyle = {
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,.11)",
  background: "rgba(255,255,255,.035)",
  color: "rgba(255,255,255,.64)",
  fontFamily: "inherit",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const primaryButtonStyle = {
  minHeight: "36px",
  padding: "0 14px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,.28)",
  background: "rgba(83,215,255,.12)",
  color: "#baf4ff",
  fontFamily: "inherit",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};
