"use client";

import { useMemo } from "react";
import type {
  FinancialBlockResponse,
  GrowthSimulatorBlock,
  GrowthSimulatorControl,
} from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

type Values = {
  principal: number;
  rate: number;
  periods: number;
  contribution: number;
};

function valueFor(control: GrowthSimulatorControl | undefined, fallback = 0) {
  return control ? control.defaultValue : fallback;
}

function fmt(value: number) {
  return value.toLocaleString("en-SG", { maximumFractionDigits: 2 });
}

function calculateSimple(values: Values) {
  const interest = values.principal * (values.rate / 100) * values.periods;
  const contributions = values.contribution * values.periods;
  return values.principal + interest + contributions;
}

function calculateCompound(values: Values) {
  let total = values.principal;
  const rate = values.rate / 100;
  for (let period = 0; period < values.periods; period += 1) {
    total *= 1 + rate;
    total += values.contribution;
  }
  return total;
}

function Control({
  control,
  value,
  onChange,
}: {
  control: GrowthSimulatorControl;
  value: number;
  onChange: (value: number) => void;
}) {
  const editable = control.editable !== false && control.max > control.min;
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", padding: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,.46)", fontSize: 9, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{control.label}</span>
        <strong style={{ color: "white", fontSize: 16 }}>{control.prefix ?? ""}{fmt(value)}{control.unit ? ` ${control.unit}` : ""}</strong>
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

export default function GrowthSimulatorLearningBlock({
  block,
  response,
  onChange,
}: {
  block: GrowthSimulatorBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const initial: Values = {
    principal: valueFor(block.principal),
    rate: valueFor(block.rate),
    periods: valueFor(block.periods, 1),
    contribution: valueFor(block.contribution),
  };

  const values = {
    ...initial,
    ...((response?.value && typeof response.value === "object" ? response.value : {}) as Partial<Values>),
  };

  const simple = useMemo(() => calculateSimple(values), [values.principal, values.rate, values.periods, values.contribution]);
  const compound = useMemo(() => calculateCompound(values), [values.principal, values.rate, values.periods, values.contribution]);
  const showSimple = block.showSimple !== false;
  const showCompound = block.showCompound !== false;

  function update(key: keyof Values, value: number) {
    const next = { ...values, [key]: value };
    onChange({
      blockId: block.id,
      blockType: block.type,
      value: next,
      answeredAt: new Date().toISOString(),
    });
  }

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>{block.prompt}</p>
      {block.contextNote ? <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(126,232,255,.05)", border: "1px solid rgba(126,232,255,.10)", padding: "11px 12px", color: "rgba(210,246,255,.72)", fontSize: 11, lineHeight: 1.55 }}>{block.contextNote}</div> : null}

      <div style={{ marginTop: 15, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9 }}>
        <Control control={block.principal} value={values.principal} onChange={(value) => update("principal", value)} />
        <Control control={block.rate} value={values.rate} onChange={(value) => update("rate", value)} />
        <Control control={block.periods} value={values.periods} onChange={(value) => update("periods", value)} />
        {block.contribution ? <Control control={block.contribution} value={values.contribution} onChange={(value) => update("contribution", value)} /> : null}
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: showSimple && showCompound ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 9 }}>
        {showSimple ? (
          <div style={{ borderRadius: 15, border: "1px solid rgba(126,232,255,.13)", background: "rgba(83,215,255,.055)", padding: 14 }}>
            <div style={{ color: "#8ee8ff", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".10em" }}>Simple growth</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>{fmt(simple)} DT</div>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,.42)", fontSize: 10 }}>Final amount after {values.periods} {block.periodLabel ?? "periods"}</div>
          </div>
        ) : null}
        {showCompound ? (
          <div style={{ borderRadius: 15, border: "1px solid rgba(113,236,176,.13)", background: "rgba(69,207,142,.055)", padding: 14 }}>
            <div style={{ color: "#9af3c3", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".10em" }}>Compound growth</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>{fmt(compound)} DT</div>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,.42)", fontSize: 10 }}>Growth is added before the next period begins</div>
          </div>
        ) : null}
      </div>

      {showSimple && showCompound ? (
        <div style={{ marginTop: 9, color: "rgba(255,255,255,.48)", fontSize: 11 }}>
          Difference after {values.periods} {block.periodLabel ?? "periods"}: <strong style={{ color: "#ffd18a" }}>{fmt(Math.max(0, compound - simple))} DT</strong>
        </div>
      ) : null}

      {block.takeaway ? <div style={{ marginTop: 13, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "11px 12px", color: "rgba(255,235,199,.72)", fontSize: 11, lineHeight: 1.55 }}><strong style={{ color: "#ffd18a" }}>Watch for: </strong>{block.takeaway}</div> : null}
    </LearningBlockShell>
  );
}
