"use client";

import type {
  BusinessModelBlock,
  BusinessModelControl,
  FinancialBlockResponse,
} from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

type ModelValues = {
  price: number;
  units: number;
  variableCostPerUnit: number;
  fixedCosts: number;
};

function fmt(value: number, decimals = 0) {
  return value.toLocaleString("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function controlDefault(control: BusinessModelControl) {
  return Number(control.defaultValue || 0);
}

function Control({
  control,
  value,
  onChange,
}: {
  control: BusinessModelControl;
  value: number;
  onChange: (value: number) => void;
}) {
  const editable = control.editable !== false && control.max > control.min;
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", padding: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,.46)", fontSize: 9, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{control.label}</span>
        <strong style={{ color: "white", fontSize: 16 }}>{control.prefix ?? ""}{fmt(value, control.step < 1 ? 2 : 0)}{control.unit ? ` ${control.unit}` : ""}</strong>
      </div>
      {editable ? (
        <input
          aria-label={control.label}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ width: "100%", marginTop: 10, accentColor: "#7de7ff" }}
        />
      ) : (
        <div style={{ marginTop: 9, height: 4, borderRadius: 999, background: "rgba(126,232,255,.12)" }} />
      )}
    </div>
  );
}

export default function BusinessModelLearningBlock({
  block,
  response,
  onChange,
}: {
  block: BusinessModelBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const defaults: ModelValues = {
    price: controlDefault(block.price),
    units: controlDefault(block.units),
    variableCostPerUnit: controlDefault(block.variableCostPerUnit),
    fixedCosts: controlDefault(block.fixedCosts),
  };

  const values = {
    ...defaults,
    ...((response?.value && typeof response.value === "object" ? response.value : {}) as Partial<ModelValues>),
  };

  const revenue = values.price * values.units;
  const variableCosts = values.variableCostPerUnit * values.units;
  const totalCosts = variableCosts + values.fixedCosts;
  const profit = revenue - totalCosts;
  const profitPerUnit = values.units > 0 ? profit / values.units : 0;
  const averageCostPerUnit = values.units > 0 ? totalCosts / values.units : 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  function commit(next: ModelValues) {
    const nextRevenue = next.price * next.units;
    const nextVariableCosts = next.variableCostPerUnit * next.units;
    const nextTotalCosts = nextVariableCosts + next.fixedCosts;
    const nextProfit = nextRevenue - nextTotalCosts;
    const nextAverage = next.units > 0 ? nextTotalCosts / next.units : 0;
    const nextMargin = nextRevenue > 0 ? (nextProfit / nextRevenue) * 100 : 0;
    onChange({
      blockId: block.id,
      blockType: block.type,
      value: {
        ...next,
        revenue: nextRevenue,
        variableCosts: nextVariableCosts,
        totalCosts: nextTotalCosts,
        profit: nextProfit,
        averageCostPerUnit: nextAverage,
        margin: nextMargin,
      },
      answeredAt: new Date().toISOString(),
    });
  }

  function update(key: keyof ModelValues, value: number) {
    const next = { ...values, [key]: value };
    const nextRevenue = next.price * next.units;
    const nextVariableCosts = next.variableCostPerUnit * next.units;
    const nextTotalCosts = nextVariableCosts + next.fixedCosts;
    const nextProfit = nextRevenue - nextTotalCosts;
    const nextAverage = next.units > 0 ? nextTotalCosts / next.units : 0;
    const nextMargin = nextRevenue > 0 ? (nextProfit / nextRevenue) * 100 : 0;
    onChange({
      blockId: block.id,
      blockType: block.type,
      value: {
        ...next,
        revenue: nextRevenue,
        variableCosts: nextVariableCosts,
        totalCosts: nextTotalCosts,
        profit: nextProfit,
        averageCostPerUnit: nextAverage,
        margin: nextMargin,
      },
      answeredAt: new Date().toISOString(),
    });
  }

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>{block.prompt}</p>
      {block.contextNote ? <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(126,232,255,.05)", border: "1px solid rgba(126,232,255,.10)", padding: "11px 12px", color: "rgba(210,246,255,.72)", fontSize: 11, lineHeight: 1.55 }}>{block.contextNote}</div> : null}

      <div style={{ marginTop: 15, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9 }}>
        <Control control={block.price} value={values.price} onChange={(value) => update("price", value)} />
        <Control control={block.units} value={values.units} onChange={(value) => update("units", value)} />
        <Control control={block.variableCostPerUnit} value={values.variableCostPerUnit} onChange={(value) => update("variableCostPerUnit", value)} />
        <Control control={block.fixedCosts} value={values.fixedCosts} onChange={(value) => update("fixedCosts", value)} />
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 8 }}>
        {[
          ["Revenue", revenue, "#8ee8ff"],
          ["Total costs", totalCosts, "#ffd18a"],
          ["Profit", profit, profit >= 0 ? "#9af3c3" : "#ffabab"],
          ["Avg cost / unit", averageCostPerUnit, "#d7d2ff"],
        ].map(([label, value, color]) => (
          <div key={String(label)} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", padding: 12 }}>
            <div style={{ color: "rgba(255,255,255,.40)", fontSize: 8, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ marginTop: 5, color: String(color), fontSize: 19, fontWeight: 900 }}>{fmt(Number(value), 2)} DT</div>
          </div>
        ))}
      </div>

      {block.showMargin !== false ? (
        <div style={{ marginTop: 9, color: "rgba(255,255,255,.50)", fontSize: 11 }}>
          Profit per unit: <strong style={{ color: "white" }}>{fmt(profitPerUnit, 2)} DT</strong> · Profit margin: <strong style={{ color: "white" }}>{fmt(margin, 1)}%</strong>
        </div>
      ) : null}

      {!response ? (
        <button type="button" onClick={() => commit(values)} style={{ marginTop: 13, minHeight: 40, padding: "0 14px", borderRadius: 11, border: "1px solid rgba(126,232,255,.28)", background: "rgba(83,215,255,.09)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 9, fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase" }}>
          Record this model
        </button>
      ) : null}

      {block.takeaway ? <div style={{ marginTop: 13, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "11px 12px", color: "rgba(255,235,199,.72)", fontSize: 11, lineHeight: 1.55 }}><strong style={{ color: "#ffd18a" }}>Watch for: </strong>{block.takeaway}</div> : null}
    </LearningBlockShell>
  );
}
