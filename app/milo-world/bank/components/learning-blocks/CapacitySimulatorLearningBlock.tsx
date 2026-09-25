"use client";

import { useMemo, useState } from "react";
import type {
  CapacitySimulatorBlock,
  FinancialBlockResponse,
} from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

function fmt(value: number) {
  return value.toLocaleString("en-SG", { maximumFractionDigits: 0 });
}

export default function CapacitySimulatorLearningBlock({
  block,
  response,
  onChange,
}: {
  block: CapacitySimulatorBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const stored = response?.value && typeof response.value === "object"
    ? response.value as Record<string, number>
    : {};
  const storedIndex = Number(stored.optionIndex);
  const [selectedIndex, setSelectedIndex] = useState(
    Number.isFinite(storedIndex) ? storedIndex : -1,
  );

  const selected = selectedIndex >= 0 ? block.options[selectedIndex] : undefined;

  const metrics = useMemo(() => {
    if (!selected) return null;
    const newCapacity = Math.max(0, block.currentCapacity + selected.capacityChange);
    const unmetDemand = Math.max(0, block.currentDemand - newCapacity);
    const spareCapacity = Math.max(0, newCapacity - block.currentDemand);
    const stressDemand = block.stressDemand ?? block.currentDemand;
    const stressUnmetDemand = Math.max(0, stressDemand - newCapacity);
    const totalFirstPeriodCost = selected.monthlyCost + Number(selected.oneOffCost ?? 0);
    return {
      newCapacity,
      unmetDemand,
      spareCapacity,
      stressDemand,
      stressUnmetDemand,
      totalFirstPeriodCost,
    };
  }, [block.currentCapacity, block.currentDemand, block.stressDemand, selected]);

  function choose(index: number) {
    const option = block.options[index];
    const newCapacity = Math.max(0, block.currentCapacity + option.capacityChange);
    const stressDemand = block.stressDemand ?? block.currentDemand;
    const value = {
      optionIndex: index,
      newCapacity,
      unmetDemand: Math.max(0, block.currentDemand - newCapacity),
      spareCapacity: Math.max(0, newCapacity - block.currentDemand),
      stressUnmetDemand: Math.max(0, stressDemand - newCapacity),
      monthlyCost: option.monthlyCost,
      oneOffCost: Number(option.oneOffCost ?? 0),
      totalFirstPeriodCost: option.monthlyCost + Number(option.oneOffCost ?? 0),
    };
    setSelectedIndex(index);
    onChange({
      blockId: block.id,
      blockType: block.type,
      value,
      answeredAt: new Date().toISOString(),
    });
  }

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>
        {block.prompt}
      </p>

      {block.contextNote ? (
        <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(126,232,255,.05)", border: "1px solid rgba(126,232,255,.10)", padding: "11px 12px", color: "rgba(210,246,255,.72)", fontSize: 11, lineHeight: 1.55 }}>
          {block.contextNote}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        {[
          ["Current capacity", `${fmt(block.currentCapacity)} orders`],
          ["Current demand", `${fmt(block.currentDemand)} orders`],
          ["Stress-test demand", `${fmt(block.stressDemand ?? block.currentDemand)} orders`],
        ].map(([label, value]) => (
          <div key={label} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: 11 }}>
            <div style={{ color: "rgba(255,255,255,.37)", fontSize: 8, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ marginTop: 5, fontSize: 16, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 9 }}>
        {block.options.map((option, index) => {
          const active = index === selectedIndex;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(index)}
              style={{
                textAlign: "left",
                borderRadius: 15,
                border: active ? "1px solid rgba(126,232,255,.40)" : "1px solid rgba(255,255,255,.08)",
                background: active ? "rgba(83,215,255,.08)" : "rgba(255,255,255,.025)",
                padding: 13,
                color: "white",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{option.label}</div>
                  {option.description ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.50)", fontSize: 10, lineHeight: 1.5 }}>{option.description}</div> : null}
                </div>
                <div style={{ color: "#ffd18a", fontSize: 10, fontWeight: 900 }}>
                  +{fmt(option.capacityChange)} capacity · {fmt(option.monthlyCost)} DT/month
                  {option.oneOffCost ? ` · ${fmt(option.oneOffCost)} DT once` : ""}
                </div>
              </div>
              {(option.qualityNote || option.flexibilityNote) ? (
                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", color: "rgba(255,255,255,.42)", fontSize: 9 }}>
                  {option.qualityNote ? <span>Quality: {option.qualityNote}</span> : null}
                  {option.flexibilityNote ? <span>Flexibility: {option.flexibilityNote}</span> : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {selected && metrics ? (
        <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          {[
            ["New capacity", `${fmt(metrics.newCapacity)}`, "#8ee8ff"],
            ["Unmet demand now", `${fmt(metrics.unmetDemand)}`, metrics.unmetDemand ? "#ffb8b8" : "#9af3c3"],
            ["Spare capacity", `${fmt(metrics.spareCapacity)}`, "#d7d2ff"],
            ["Stress shortfall", `${fmt(metrics.stressUnmetDemand)}`, metrics.stressUnmetDemand ? "#ffd18a" : "#9af3c3"],
            ["First-period cost", `${fmt(metrics.totalFirstPeriodCost)} DT`, "#ffd18a"],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 10 }}>
              <div style={{ color: "rgba(255,255,255,.35)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</div>
              <div style={{ marginTop: 5, color: String(color), fontSize: 16, fontWeight: 900 }}>{value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {block.takeaway ? (
        <div style={{ marginTop: 13, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "11px 12px", color: "rgba(255,235,199,.72)", fontSize: 11, lineHeight: 1.55 }}>
          <strong style={{ color: "#ffd18a" }}>Watch for: </strong>{block.takeaway}
        </div>
      ) : null}
    </LearningBlockShell>
  );
}
