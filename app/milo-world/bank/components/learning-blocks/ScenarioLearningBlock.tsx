import type { ScenarioBlock } from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

const toneColor = {
  neutral: "#bceffc",
  positive: "#9af3c3",
  warning: "#ffd18a",
} as const;

export default function ScenarioLearningBlock({ block }: { block: ScenarioBlock }) {
  return (
    <LearningBlockShell eyebrow={block.eyebrow ?? "Scenario"} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: "14px", lineHeight: 1.7 }}>{block.body}</p>
      {block.facts?.length ? (
        <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "9px" }}>
          {block.facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} style={{ borderRadius: "15px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "12px" }}>
              <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "8px", fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" }}>{fact.label}</div>
              <div style={{ marginTop: "5px", color: toneColor[fact.tone ?? "neutral"], fontSize: "17px", fontWeight: 900 }}>{fact.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      {block.questionToConsider && (
        <div style={{ marginTop: "17px", color: "rgba(255,255,255,0.56)", fontSize: "12px", lineHeight: 1.6 }}>
          <strong style={{ color: "white" }}>Consider: </strong>{block.questionToConsider}
        </div>
      )}
    </LearningBlockShell>
  );
}
