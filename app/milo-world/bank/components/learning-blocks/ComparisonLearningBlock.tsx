import type { ComparisonBlock } from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

const accents = {
  cyan: "#8ee8ff",
  gold: "#ffd18a",
  green: "#9af3c3",
  purple: "#b8a8ff",
} as const;

export default function ComparisonLearningBlock({ block }: { block: ComparisonBlock }) {
  return (
    <LearningBlockShell eyebrow={block.eyebrow ?? "Compare"} title={block.title}>
      {block.intro && <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.62)", fontSize: "13px", lineHeight: 1.65 }}>{block.intro}</p>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(block.columns.length, 3)}, minmax(0, 1fr))`, gap: "9px" }}>
        {block.columns.map((column) => {
          const accent = accents[column.accent ?? "cyan"];
          return (
            <div key={column.id} style={{ minWidth: 0, borderRadius: "16px", border: `1px solid ${accent}2f`, background: `linear-gradient(145deg, ${accent}10, rgba(4,13,29,0.74))`, padding: "13px" }}>
              <div style={{ color: accent, fontSize: "14px", fontWeight: 900 }}>{column.title}</div>
              {column.subtitle && <div style={{ marginTop: "3px", color: "rgba(255,255,255,0.40)", fontSize: "9px" }}>{column.subtitle}</div>}
              <ul style={{ margin: "10px 0 0", paddingLeft: "17px", color: "rgba(255,255,255,0.60)", fontSize: "11px", lineHeight: 1.55 }}>
                {column.points.map((point) => <li key={point} style={{ marginTop: "4px" }}>{point}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      {block.takeaway && <div style={{ marginTop: "14px", color: "rgba(255,255,255,0.62)", fontSize: "12px", lineHeight: 1.6 }}><strong style={{ color: "#ffd18a" }}>Takeaway: </strong>{block.takeaway}</div>}
    </LearningBlockShell>
  );
}
