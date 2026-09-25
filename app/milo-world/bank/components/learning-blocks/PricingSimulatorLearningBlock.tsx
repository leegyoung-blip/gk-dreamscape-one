"use client";

import type {
  FinancialBlockResponse,
  PricingDemandPoint,
  PricingSimulatorBlock,
} from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

function fmt(value: number, decimals = 0) {
  return value.toLocaleString("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function demandAt(price: number, points: PricingDemandPoint[]) {
  const ordered = [...points].sort((a, b) => a.price - b.price);
  if (!ordered.length) return 0;
  if (price <= ordered[0].price) return ordered[0].demand;
  if (price >= ordered[ordered.length - 1].price) return ordered[ordered.length - 1].demand;

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const left = ordered[index];
    const right = ordered[index + 1];
    if (price >= left.price && price <= right.price) {
      const distance = right.price - left.price;
      if (distance <= 0) return left.demand;
      const ratio = (price - left.price) / distance;
      return left.demand + (right.demand - left.demand) * ratio;
    }
  }
  return ordered[ordered.length - 1].demand;
}

export default function PricingSimulatorLearningBlock({
  block,
  response,
  onChange,
}: {
  block: PricingSimulatorBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const stored = response?.value && typeof response.value === "object" ? response.value as Record<string, number> : {};
  const price = Number(stored.price ?? block.price.defaultValue);
  const demand = Math.max(0, demandAt(price, block.demandPoints));
  const unitsSold = Math.min(block.capacity, Math.round(demand));
  const revenue = price * unitsSold;
  const variableCosts = block.unitCost * unitsSold;
  const totalCosts = block.fixedCosts + variableCosts;
  const profit = revenue - totalCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  function save(nextPrice: number) {
    const nextDemand = Math.max(0, demandAt(nextPrice, block.demandPoints));
    const nextUnits = Math.min(block.capacity, Math.round(nextDemand));
    const nextRevenue = nextPrice * nextUnits;
    const nextVariableCosts = block.unitCost * nextUnits;
    const nextTotalCosts = block.fixedCosts + nextVariableCosts;
    const nextProfit = nextRevenue - nextTotalCosts;
    const nextMargin = nextRevenue > 0 ? (nextProfit / nextRevenue) * 100 : 0;
    onChange({
      blockId: block.id,
      blockType: block.type,
      value: {
        price: nextPrice,
        demand: nextDemand,
        unitsSold: nextUnits,
        revenue: nextRevenue,
        totalCosts: nextTotalCosts,
        profit: nextProfit,
        margin: nextMargin,
      },
      answeredAt: new Date().toISOString(),
    });
  }

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>{block.prompt}</p>
      {block.contextNote ? <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(126,232,255,.05)", border: "1px solid rgba(126,232,255,.10)", padding: "11px 12px", color: "rgba(210,246,255,.72)", fontSize: 11, lineHeight: 1.55 }}>{block.contextNote}</div> : null}

      <div style={{ marginTop: 15, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,.42)", fontSize: 8, fontWeight: 900, letterSpacing: ".10em", textTransform: "uppercase" }}>{block.price.label}</div>
            <div style={{ marginTop: 4, fontSize: 24, fontWeight: 900 }}>{block.price.prefix ?? ""}{fmt(price)}{block.price.unit ? ` ${block.price.unit}` : ""}</div>
          </div>
          {typeof block.competitorPrice === "number" ? <div style={{ textAlign: "right" }}><div style={{ color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>Competitor</div><div style={{ marginTop: 4, color: "#ffd18a", fontWeight: 900 }}>{fmt(block.competitorPrice)} DT</div></div> : null}
        </div>
        <input
          aria-label={block.price.label}
          type="range"
          min={block.price.min}
          max={block.price.max}
          step={block.price.step}
          value={price}
          onChange={(event) => save(Number(event.target.value))}
          style={{ width: "100%", marginTop: 12, accentColor: "#ffd18a" }}
        />
      </div>

      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 8 }}>
        {[
          ["Expected demand", `${fmt(demand)} units`, "#d7d2ff"],
          ["Units sold", `${fmt(unitsSold)} units`, "#8ee8ff"],
          ["Revenue", `${fmt(revenue)} DT`, "#8ee8ff"],
          ["Total costs", `${fmt(totalCosts)} DT`, "#ffd18a"],
          ["Profit", `${fmt(profit)} DT`, profit >= 0 ? "#9af3c3" : "#ffabab"],
          ["Margin", `${fmt(margin, 1)}%`, "#9af3c3"],
        ].map(([label, value, color]) => (
          <div key={String(label)} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 11 }}>
            <div style={{ color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ marginTop: 5, color: String(color), fontSize: 16, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 9, color: "rgba(255,255,255,.43)", fontSize: 10, lineHeight: 1.5 }}>Model assumptions: unit cost {fmt(block.unitCost)} DT · fixed costs {fmt(block.fixedCosts)} DT · capacity {fmt(block.capacity)} units.</div>

      {!response ? (
        <button type="button" onClick={() => save(price)} style={{ marginTop: 13, minHeight: 40, padding: "0 14px", borderRadius: 11, border: "1px solid rgba(255,209,138,.28)", background: "rgba(255,190,90,.08)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 9, fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase" }}>
          Record this price
        </button>
      ) : null}

      {block.takeaway ? <div style={{ marginTop: 13, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "11px 12px", color: "rgba(255,235,199,.72)", fontSize: 11, lineHeight: 1.55 }}><strong style={{ color: "#ffd18a" }}>Watch for: </strong>{block.takeaway}</div> : null}
    </LearningBlockShell>
  );
}
