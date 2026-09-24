import type { ExplainBlock } from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

export default function ExplainLearningBlock({ block }: { block: ExplainBlock }) {
  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.70)", fontSize: "14px", lineHeight: 1.75 }}>{block.body}</p>
      {block.example && (
        <div style={{ marginTop: "18px", borderRadius: "16px", border: "1px solid rgba(126,232,255,0.13)", background: "rgba(83,215,255,0.055)", padding: "14px 15px", color: "#bceffc", fontSize: "12px", lineHeight: 1.6 }}>
          <strong style={{ color: "#8ee8ff" }}>Example: </strong>{block.example}
        </div>
      )}
      {block.keyIdea && (
        <div style={{ marginTop: "12px", borderLeft: "3px solid rgba(255,209,138,0.7)", padding: "8px 0 8px 12px", color: "#f5d7a4", fontSize: "12px", lineHeight: 1.6 }}>
          <strong>Key idea: </strong>{block.keyIdea}
        </div>
      )}
    </LearningBlockShell>
  );
}
