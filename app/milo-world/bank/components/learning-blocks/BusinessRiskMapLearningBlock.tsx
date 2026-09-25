"use client";

import { useMemo, useState } from "react";
import type {
  BusinessRiskMapBlock,
  FinancialBlockResponse,
} from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

function fmt(value: number) {
  return value.toLocaleString("en-SG", { maximumFractionDigits: 0 });
}

export default function BusinessRiskMapLearningBlock({
  block,
  response,
  onChange,
}: {
  block: BusinessRiskMapBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const stored = response?.value && typeof response.value === "object"
    ? response.value as Record<string, number>
    : {};
  const initial = new Set(
    block.mitigations.filter((item) => Number(stored[`mitigation:${item.id}`] ?? 0) === 1).map((item) => item.id),
  );
  const [selected, setSelected] = useState<Set<string>>(initial);

  const summary = useMemo(() => {
    const chosen = block.mitigations.filter((item) => selected.has(item.id));
    const totalSpend = chosen.reduce((sum, item) => sum + item.cost, 0);
    const residual = Object.fromEntries(
      block.risks.map((risk) => {
        const reduction = chosen.reduce((sum, item) => sum + Number(item.reductions[risk.id] ?? 0), 0);
        return [risk.id, Math.max(0, risk.exposure - reduction)];
      }),
    ) as Record<string, number>;
    const totalExposure = Object.values(residual).reduce((sum, value) => sum + value, 0);
    const eventResidual = block.eventRiskId ? Number(residual[block.eventRiskId] ?? 0) : 0;
    return { chosen, totalSpend, residual, totalExposure, eventResidual };
  }, [block.eventRiskId, block.mitigations, block.risks, selected]);

  function save(nextSelected: Set<string>) {
    const chosen = block.mitigations.filter((item) => nextSelected.has(item.id));
    const totalSpend = chosen.reduce((sum, item) => sum + item.cost, 0);
    const residual = Object.fromEntries(
      block.risks.map((risk) => {
        const reduction = chosen.reduce((sum, item) => sum + Number(item.reductions[risk.id] ?? 0), 0);
        return [risk.id, Math.max(0, risk.exposure - reduction)];
      }),
    ) as Record<string, number>;
    const value: Record<string, number> = {
      totalSpend,
      remainingBudget: block.budget - totalSpend,
      totalExposure: Object.values(residual).reduce((sum, item) => sum + item, 0),
      eventResidual: block.eventRiskId ? Number(residual[block.eventRiskId] ?? 0) : 0,
    };
    for (const item of block.mitigations) value[`mitigation:${item.id}`] = nextSelected.has(item.id) ? 1 : 0;
    for (const risk of block.risks) value[`risk:${risk.id}`] = residual[risk.id] ?? risk.exposure;
    onChange({
      blockId: block.id,
      blockType: block.type,
      value,
      answeredAt: new Date().toISOString(),
    });
  }

  function toggle(id: string) {
    const mitigation = block.mitigations.find((item) => item.id === id);
    if (!mitigation) return;
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      const currentSpend = block.mitigations
        .filter((item) => next.has(item.id))
        .reduce((sum, item) => sum + item.cost, 0);
      if (currentSpend + mitigation.cost > block.budget) return;
      next.add(id);
    }
    setSelected(next);
    save(next);
  }

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>{block.prompt}</p>
      {block.contextNote ? <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(126,232,255,.05)", border: "1px solid rgba(126,232,255,.10)", padding: "11px 12px", color: "rgba(210,246,255,.72)", fontSize: 11, lineHeight: 1.55 }}>{block.contextNote}</div> : null}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>Risk budget</div>
          <div style={{ marginTop: 4, fontSize: 21, fontWeight: 900 }}>{fmt(block.budget)} DT</div>
        </div>
        <div style={{ color: summary.totalSpend <= block.budget ? "#9af3c3" : "#ffabab", fontSize: 12, fontWeight: 900 }}>
          {fmt(summary.totalSpend)} used · {fmt(block.budget - summary.totalSpend)} remaining
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>
        {block.risks.map((risk) => {
          const residual = summary.residual[risk.id] ?? risk.exposure;
          const width = Math.max(0, Math.min(100, (residual / 5) * 100));
          return (
            <div key={risk.id} style={{ borderRadius: 14, border: block.eventRiskId === risk.id ? "1px solid rgba(255,209,138,.22)" : "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 900 }}>{risk.label}</div>
                <div style={{ color: "#ffd18a", fontSize: 9, fontWeight: 900 }}>{risk.category}</div>
              </div>
              {risk.description ? <div style={{ marginTop: 5, color: "rgba(255,255,255,.43)", fontSize: 9, lineHeight: 1.45 }}>{risk.description}</div> : null}
              <div style={{ marginTop: 9, height: 6, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                <div style={{ width: `${width}%`, height: "100%", background: residual >= 4 ? "#ff9f9f" : residual >= 2 ? "#ffd18a" : "#9af3c3", borderRadius: 999 }} />
              </div>
              <div style={{ marginTop: 5, color: "rgba(255,255,255,.40)", fontSize: 8 }}>Residual exposure: {residual.toFixed(0)} / 5</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900, letterSpacing: ".09em", textTransform: "uppercase" }}>Choose risk controls</div>
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {block.mitigations.map((item) => {
            const active = selected.has(item.id);
            const currentSpend = summary.totalSpend;
            const disabled = !active && currentSpend + item.cost > block.budget;
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(item.id)}
                style={{ textAlign: "left", borderRadius: 13, border: active ? "1px solid rgba(126,232,255,.36)" : "1px solid rgba(255,255,255,.08)", background: active ? "rgba(83,215,255,.08)" : "rgba(255,255,255,.025)", padding: 11, color: "white", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1, fontFamily: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 900 }}>{active ? "✓ " : ""}{item.label}</span>
                  <span style={{ color: "#ffd18a", fontSize: 10, fontWeight: 900 }}>{fmt(item.cost)} DT</span>
                </div>
                {item.description ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.45)", fontSize: 9, lineHeight: 1.45 }}>{item.description}</div> : null}
              </button>
            );
          })}
        </div>
      </div>

      {selected.size > 0 ? (
        <div style={{ marginTop: 13, borderRadius: 14, border: "1px solid rgba(113,236,176,.13)", background: "rgba(69,207,142,.045)", padding: 12 }}>
          <div style={{ color: "#9af3c3", fontSize: 9, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>Current protection profile</div>
          <div style={{ marginTop: 5, color: "rgba(255,255,255,.62)", fontSize: 10, lineHeight: 1.55 }}>
            Total residual exposure: <strong>{summary.totalExposure}</strong>
            {block.eventRiskId ? ` · Event-risk exposure: ${summary.eventResidual}` : ""}
          </div>
        </div>
      ) : null}

      {block.takeaway ? <div style={{ marginTop: 13, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "11px 12px", color: "rgba(255,235,199,.72)", fontSize: 11, lineHeight: 1.55 }}><strong style={{ color: "#ffd18a" }}>Watch for: </strong>{block.takeaway}</div> : null}
    </LearningBlockShell>
  );
}
