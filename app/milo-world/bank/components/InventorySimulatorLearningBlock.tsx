"use client";

import { useMemo, useState } from "react";
import type {
  FinancialBlockResponse,
  InventoryDemandScenario,
  InventorySimulatorBlock,
} from "../lib/financial-learning-engine-types";
import LearningBlockShell from "./learning-blocks/LearningBlockShell";

function fmt(value: number, decimals = 0) {
  return value.toLocaleString("en-SG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function scenarioFor(block: InventorySimulatorBlock, id?: string) {
  return block.demandScenarios.find((scenario) => scenario.id === id)
    ?? block.demandScenarios.find((scenario) => scenario.id === block.revealScenarioId)
    ?? block.demandScenarios[0];
}

export default function InventorySimulatorLearningBlock({
  block,
  response,
  onChange,
}: {
  block: InventorySimulatorBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const stored = response?.value && typeof response.value === "object"
    ? response.value as Record<string, number>
    : {};
  const [draftOrder, setDraftOrder] = useState(Number(stored.orderQuantity ?? block.orderQuantity.defaultValue));
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>(() => {
    const index = Number(stored.scenarioIndex);
    return Number.isFinite(index) && block.demandScenarios[index] ? block.demandScenarios[index].id : undefined;
  });

  const activeScenario = scenarioFor(block, activeScenarioId);
  const hasRun = Boolean(response) && Boolean(activeScenario);

  const result = useMemo(() => {
    if (!activeScenario) return null;
    const openingInventory = Number(block.openingInventory ?? 0);
    const availableUnits = openingInventory + draftOrder;
    const unitsSold = Math.min(availableUnits, activeScenario.demand);
    const endingInventory = Math.max(0, availableUnits - unitsSold);
    const lostSales = Math.max(0, activeScenario.demand - availableUnits);
    const purchaseCost = draftOrder * block.unitCost;
    const revenue = unitsSold * block.salePrice;
    const holdingCost = endingInventory * Number(block.holdingCostPerUnit ?? 0);
    const closingCash = block.openingCash - purchaseCost + revenue - holdingCost;
    const cashTiedInInventory = endingInventory * block.unitCost;
    return { availableUnits, unitsSold, endingInventory, lostSales, purchaseCost, revenue, holdingCost, closingCash, cashTiedInInventory };
  }, [activeScenario, block, draftOrder]);

  function save(orderQuantity: number, scenario: InventoryDemandScenario) {
    const scenarioIndex = Math.max(0, block.demandScenarios.findIndex((item) => item.id === scenario.id));
    const openingInventory = Number(block.openingInventory ?? 0);
    const availableUnits = openingInventory + orderQuantity;
    const unitsSold = Math.min(availableUnits, scenario.demand);
    const endingInventory = Math.max(0, availableUnits - unitsSold);
    const lostSales = Math.max(0, scenario.demand - availableUnits);
    const purchaseCost = orderQuantity * block.unitCost;
    const revenue = unitsSold * block.salePrice;
    const holdingCost = endingInventory * Number(block.holdingCostPerUnit ?? 0);
    const closingCash = block.openingCash - purchaseCost + revenue - holdingCost;
    const cashTiedInInventory = endingInventory * block.unitCost;
    onChange({
      blockId: block.id,
      blockType: block.type,
      value: {
        orderQuantity,
        scenarioIndex,
        demand: scenario.demand,
        availableUnits,
        unitsSold,
        endingInventory,
        lostSales,
        purchaseCost,
        revenue,
        holdingCost,
        closingCash,
        cashTiedInInventory,
      },
      answeredAt: new Date().toISOString(),
    });
  }

  function runScenario(scenario: InventoryDemandScenario) {
    setActiveScenarioId(scenario.id);
    save(draftOrder, scenario);
  }

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>{block.prompt}</p>
      {block.contextNote ? <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(126,232,255,.05)", border: "1px solid rgba(126,232,255,.10)", padding: "11px 12px", color: "rgba(210,246,255,.72)", fontSize: 11, lineHeight: 1.55 }}>{block.contextNote}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8 }}>
        {[
          ["Opening cash", `${fmt(block.openingCash)} DT`],
          ["Unit cost", `${fmt(block.unitCost)} DT`],
          ["Selling price", `${fmt(block.salePrice)} DT`],
          ["Opening stock", `${fmt(block.openingInventory ?? 0)} units`],
        ].map(([label, value]) => (
          <div key={label} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: 11 }}>
            <div style={{ color: "rgba(255,255,255,.37)", fontSize: 8, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ marginTop: 5, fontSize: 16, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 13, borderRadius: 15, border: "1px solid rgba(126,232,255,.10)", background: "rgba(3,12,28,.46)", padding: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,.42)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".09em" }}>{block.orderQuantity.label}</div>
            <div style={{ marginTop: 4, fontSize: 23, fontWeight: 900 }}>{fmt(draftOrder)} {block.orderQuantity.unit ?? "units"}</div>
          </div>
          <div style={{ color: "#ffd18a", fontSize: 12, fontWeight: 900 }}>Cash out: {fmt(draftOrder * block.unitCost)} DT</div>
        </div>
        <input
          type="range"
          aria-label={block.orderQuantity.label}
          min={block.orderQuantity.min}
          max={block.orderQuantity.max}
          step={block.orderQuantity.step}
          value={draftOrder}
          onChange={(event) => {
            const next = Number(event.target.value);
            setDraftOrder(next);
            if (hasRun && activeScenario) save(next, activeScenario);
          }}
          style={{ width: "100%", marginTop: 11, accentColor: "#8ee8ff" }}
        />
      </div>

      {!hasRun ? (
        <button
          type="button"
          onClick={() => runScenario(scenarioFor(block, block.revealScenarioId)!)}
          style={{ marginTop: 13, minHeight: 42, padding: "0 15px", borderRadius: 12, border: "1px solid rgba(126,232,255,.28)", background: "rgba(83,215,255,.09)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 9, fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase" }}
        >
          Reveal demand and run simulation
        </button>
      ) : null}

      {hasRun && activeScenario && result ? (
        <>
          <div style={{ marginTop: 13, borderRadius: 14, border: "1px solid rgba(255,209,138,.14)", background: "rgba(255,190,90,.045)", padding: 12 }}>
            <div style={{ color: "#ffd18a", fontSize: 9, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{activeScenario.label}</div>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,.68)", fontSize: 11, lineHeight: 1.55 }}>Demand: <strong>{fmt(activeScenario.demand)} units</strong>{activeScenario.description ? ` · ${activeScenario.description}` : ""}</div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              ["Units sold", `${fmt(result.unitsSold)}`, "#9af3c3"],
              ["Ending stock", `${fmt(result.endingInventory)}`, "#d7d2ff"],
              ["Lost sales", `${fmt(result.lostSales)}`, result.lostSales ? "#ffb8b8" : "#9af3c3"],
              ["Sales revenue", `${fmt(result.revenue)} DT`, "#8ee8ff"],
              ["Cash tied in stock", `${fmt(result.cashTiedInInventory)} DT`, result.cashTiedInInventory ? "#ffd18a" : "#9af3c3"],
              ["Closing cash", `${fmt(result.closingCash)} DT`, result.closingCash >= 0 ? "#9af3c3" : "#ffabab"],
            ].map(([label, value, color]) => (
              <div key={String(label)} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 10 }}>
                <div style={{ color: "rgba(255,255,255,.35)", fontSize: 8, fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase" }}>{label}</div>
                <div style={{ marginTop: 5, color: String(color), fontSize: 16, fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>

          {block.demandScenarios.length > 1 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: "rgba(255,255,255,.37)", fontSize: 8, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>Stress-test the same order</div>
              <div style={{ marginTop: 7, display: "flex", gap: 7, flexWrap: "wrap" }}>
                {block.demandScenarios.map((scenario) => (
                  <button key={scenario.id} type="button" onClick={() => runScenario(scenario)} style={{ minHeight: 34, padding: "0 11px", borderRadius: 10, border: scenario.id === activeScenario.id ? "1px solid rgba(126,232,255,.36)" : "1px solid rgba(255,255,255,.08)", background: scenario.id === activeScenario.id ? "rgba(83,215,255,.08)" : "rgba(255,255,255,.025)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 8, fontWeight: 900, textTransform: "uppercase" }}>{scenario.label}</button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {block.takeaway ? <div style={{ marginTop: 13, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "11px 12px", color: "rgba(255,235,199,.72)", fontSize: 11, lineHeight: 1.55 }}><strong style={{ color: "#ffd18a" }}>Watch for: </strong>{block.takeaway}</div> : null}
    </LearningBlockShell>
  );
}
