"use client";

import { useMemo, useState } from "react";
import type {
  BusinessStrategySimulatorBlock,
  FinancialAdvisorId,
  FinancialAdvisorMessage,
  FinancialBlockResponse,
} from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

function advisorText(message: FinancialAdvisorMessage | undefined, advisorId: FinancialAdvisorId) {
  if (!message) return null;
  if (typeof message === "string") return message;
  return message[advisorId] ?? message.milo ?? message.nova ?? null;
}

function metricValue(
  block: BusinessStrategySimulatorBlock,
  selections: Record<string, number>,
) {
  const values = Object.fromEntries(
    block.metrics.map((metric) => [metric.id, metric.initialValue]),
  ) as Record<string, number>;

  for (const stage of block.stages) {
    const index = selections[`stage:${stage.id}`];
    if (!Number.isFinite(index) || !stage.options[index]) continue;
    for (const [key, delta] of Object.entries(stage.options[index].effects)) {
      values[key] = Number(values[key] ?? 0) + Number(delta ?? 0);
    }
  }
  return values;
}

function formatMetric(value: number, format: "dt" | "number" | "units" | "percent" = "number", decimals = 0) {
  const shown = value.toLocaleString("en-SG", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  if (format === "dt") return `${shown} DT`;
  if (format === "percent") return `${shown}%`;
  if (format === "units") return `${shown} units`;
  return shown;
}

function accentColour(accent: string | undefined) {
  if (accent === "gold") return "#ffd18a";
  if (accent === "green") return "#9af3c3";
  if (accent === "purple") return "#c3b5ff";
  if (accent === "red") return "#ffabab";
  return "#8ee8ff";
}

export default function BusinessStrategySimulatorLearningBlock({
  block,
  response,
  advisorId,
  onChange,
}: {
  block: BusinessStrategySimulatorBlock;
  response?: FinancialBlockResponse;
  advisorId: FinancialAdvisorId;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const stored = response?.value && typeof response.value === "object"
    ? response.value as Record<string, number>
    : {};

  const initialStage = Math.min(
    block.stages.length - 1,
    Math.max(0, Number(stored.completedStages ?? 0)),
  );
  const [stageIndex, setStageIndex] = useState(initialStage);
  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const stage of block.stages) {
      const value = Number(stored[`stage:${stage.id}`]);
      if (Number.isFinite(value)) next[`stage:${stage.id}`] = value;
    }
    return next;
  });

  const stage = block.stages[stageIndex];
  const selectedIndex = Number(selections[`stage:${stage.id}`]);
  const selected = Number.isFinite(selectedIndex) ? stage.options[selectedIndex] : undefined;
  const metrics = useMemo(() => metricValue(block, selections), [block, selections]);
  const completedStages = Object.keys(selections).filter((key) => key.startsWith("stage:")).length;
  const complete = completedStages >= block.stages.length;

  function emit(nextSelections: Record<string, number>) {
    const nextMetrics = metricValue(block, nextSelections);
    const nextCompleted = Object.keys(nextSelections).filter((key) => key.startsWith("stage:")).length;
    const value: Record<string, number> = {
      completedStages: nextCompleted,
      ...nextSelections,
    };
    for (const [key, metric] of Object.entries(nextMetrics)) value[`metric:${key}`] = metric;
    onChange({
      blockId: block.id,
      blockType: block.type,
      value,
      answeredAt: new Date().toISOString(),
    });
  }

  function choose(index: number) {
    const next: Record<string, number> = {};
    for (let i = 0; i <= stageIndex; i += 1) {
      const key = `stage:${block.stages[i].id}`;
      if (i === stageIndex) next[key] = index;
      else if (Number.isFinite(selections[key])) next[key] = selections[key];
    }
    setSelections(next);
    emit(next);
  }

  function nextStage() {
    if (!selected) return;
    setStageIndex((current) => Math.min(block.stages.length - 1, current + 1));
  }

  function previousStage() {
    setStageIndex((current) => Math.max(0, current - 1));
  }

  const prompt = advisorText(stage.advisorPrompt, advisorId);
  const feedback = advisorText(selected?.advisorFeedback, advisorId);

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>
        {block.prompt}
      </p>

      {block.contextNote ? (
        <div style={{ marginTop: 12, borderRadius: 13, border: "1px solid rgba(126,232,255,.12)", background: "rgba(83,215,255,.04)", padding: "10px 12px", color: "rgba(255,255,255,.48)", fontSize: 10, lineHeight: 1.55 }}>
          {block.contextNote}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 8 }}>
        {block.metrics.map((metric) => (
          <div key={metric.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(3,12,28,.44)", padding: 11 }}>
            <div style={{ color: "rgba(255,255,255,.36)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>{metric.label}</div>
            <div style={{ marginTop: 5, color: accentColour(metric.accent), fontSize: 18, fontWeight: 900 }}>
              {formatMetric(Number(metrics[metric.id] ?? 0), metric.format, metric.decimals ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", padding: 15 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#8ee8ff", fontSize: 8, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase" }}>
              {stage.eyebrow ?? `Stage ${stageIndex + 1}`} · {stageIndex + 1} of {block.stages.length}
            </div>
            <h4 style={{ margin: "6px 0 0", fontFamily: 'Georgia,"Times New Roman",serif', fontSize: 25, fontWeight: 500 }}>{stage.title}</h4>
          </div>
          <div style={{ color: "rgba(255,255,255,.38)", fontSize: 9 }}>{completedStages} / {block.stages.length} decisions recorded</div>
        </div>

        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,.62)", fontSize: 12, lineHeight: 1.65 }}>{stage.scenario}</p>

        {stage.facts?.length ? (
          <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 7 }}>
            {stage.facts.map((fact) => (
              <div key={`${stage.id}-${fact.label}`} style={{ borderRadius: 11, background: "rgba(255,255,255,.03)", padding: "9px 10px" }}>
                <div style={{ color: "rgba(255,255,255,.35)", fontSize: 8, fontWeight: 900, textTransform: "uppercase" }}>{fact.label}</div>
                <div style={{ marginTop: 3, color: fact.tone === "warning" ? "#ffd18a" : fact.tone === "positive" ? "#9af3c3" : "white", fontSize: 11, fontWeight: 800 }}>{fact.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {prompt ? (
          <div style={{ marginTop: 12, borderLeft: "2px solid rgba(126,232,255,.30)", paddingLeft: 11, color: "rgba(220,247,255,.66)", fontSize: 10, lineHeight: 1.55 }}>
            <strong style={{ color: advisorId === "nova" ? "#8ee8ff" : "#ffd18a" }}>{advisorId === "nova" ? "Nova" : "Milo"}: </strong>{prompt}
          </div>
        ) : null}

        <div style={{ marginTop: 13, display: "grid", gap: 8 }}>
          {stage.options.map((option, index) => {
            const active = selectedIndex === index;
            return (
              <button key={option.id} type="button" onClick={() => choose(index)} style={{ textAlign: "left", borderRadius: 14, border: active ? "1px solid rgba(126,232,255,.42)" : "1px solid rgba(255,255,255,.09)", background: active ? "rgba(83,215,255,.08)" : "rgba(255,255,255,.025)", color: "white", padding: "12px 13px", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ fontSize: 12, fontWeight: 900 }}>{option.label}</div>
                {option.description ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.48)", fontSize: 10, lineHeight: 1.45 }}>{option.description}</div> : null}
                {active && (option.strengths?.length || option.tradeoffs?.length) ? (
                  <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 7 }}>
                    {option.strengths?.length ? <div><div style={{ color: "#9af3c3", fontSize: 8, fontWeight: 900, textTransform: "uppercase" }}>Strength</div><div style={{ marginTop: 3, color: "rgba(255,255,255,.58)", fontSize: 9, lineHeight: 1.45 }}>{option.strengths.join(" · ")}</div></div> : null}
                    {option.tradeoffs?.length ? <div><div style={{ color: "#ffd18a", fontSize: 8, fontWeight: 900, textTransform: "uppercase" }}>Trade-off</div><div style={{ marginTop: 3, color: "rgba(255,255,255,.58)", fontSize: 9, lineHeight: 1.45 }}>{option.tradeoffs.join(" · ")}</div></div> : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {feedback ? (
          <div style={{ marginTop: 11, borderRadius: 12, background: "rgba(255,190,90,.045)", border: "1px solid rgba(255,209,138,.12)", padding: "10px 11px", color: "rgba(255,255,255,.56)", fontSize: 10, lineHeight: 1.55 }}>
            <strong style={{ color: advisorId === "nova" ? "#8ee8ff" : "#ffd18a" }}>{advisorId === "nova" ? "Nova" : "Milo"}: </strong>{feedback}
          </div>
        ) : null}

        <div style={{ marginTop: 13, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button type="button" onClick={previousStage} disabled={stageIndex === 0} style={{ minHeight: 38, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.03)", color: "rgba(255,255,255,.55)", opacity: stageIndex === 0 ? .35 : 1, cursor: stageIndex === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 9, fontWeight: 900 }}>Previous stage</button>
          {stageIndex < block.stages.length - 1 ? (
            <button type="button" onClick={nextStage} disabled={!selected} style={{ minHeight: 38, padding: "0 13px", borderRadius: 10, border: "1px solid rgba(126,232,255,.24)", background: "rgba(83,215,255,.08)", color: "#d7f8ff", opacity: selected ? 1 : .45, cursor: selected ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 9, fontWeight: 900 }}>Next stage →</button>
          ) : (
            <div style={{ minHeight: 38, display: "flex", alignItems: "center", color: complete ? "#9af3c3" : "rgba(255,255,255,.38)", fontSize: 9, fontWeight: 900 }}>{complete ? "Strategy recorded ✓" : "Choose your final decision"}</div>
          )}
        </div>
      </div>

      {block.takeaway && complete ? (
        <div style={{ marginTop: 13, borderRadius: 14, border: "1px solid rgba(113,236,176,.15)", background: "rgba(69,207,142,.05)", padding: "11px 12px", color: "rgba(255,255,255,.58)", fontSize: 10, lineHeight: 1.6 }}>
          <strong style={{ color: "#9af3c3" }}>Strategy takeaway: </strong>{block.takeaway}
        </div>
      ) : null}
    </LearningBlockShell>
  );
}
