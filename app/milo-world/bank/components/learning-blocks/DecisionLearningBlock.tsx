"use client";

import { resolveAdvisorMessage } from "../../lib/financial-advisors";
import type { DecisionBlock, FinancialAdvisorId, FinancialBlockResponse } from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

export default function DecisionLearningBlock({ block, response, advisorId, onChange }: { block: DecisionBlock; response?: FinancialBlockResponse; advisorId: FinancialAdvisorId; onChange: (r: FinancialBlockResponse) => void }) {
  const selectedId = typeof response?.value === "string" ? response.value : null;
  const choice = block.choices.find((item) => item.id === selectedId);
  return (
    <LearningBlockShell eyebrow={block.eyebrow ?? "Decision"} title={block.title}>
      {block.context && <p style={{ margin: "0 0 13px", color: "rgba(255,255,255,0.58)", fontSize: "12px", lineHeight: 1.6 }}>{block.context}</p>}
      <h4 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "28px", lineHeight: 1.15, fontWeight: 500 }}>{block.prompt}</h4>
      <div style={{ marginTop: "17px", display: "grid", gap: "9px" }}>
        {block.choices.map((item) => {
          const selected = item.id === selectedId;
          return <button key={item.id} type="button" onClick={() => onChange({ blockId: block.id, blockType: block.type, value: item.id, answeredAt: new Date().toISOString() })} style={{ textAlign: "left", borderRadius: "15px", border: selected ? "1px solid rgba(142,232,255,0.48)" : "1px solid rgba(255,255,255,0.08)", background: selected ? "rgba(83,215,255,0.09)" : "rgba(255,255,255,0.025)", color: "white", padding: "13px 14px", cursor: "pointer", fontFamily: "inherit" }}><strong style={{ fontSize: "13px" }}>{item.label}</strong>{item.summary && <span style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.47)", fontSize: "10px", lineHeight: 1.45 }}>{item.summary}</span>}</button>;
        })}
      </div>
      {choice && (
        <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "9px" }}>
          <div style={{ borderRadius: "14px", background: "rgba(69,207,142,0.06)", border: "1px solid rgba(113,236,176,0.16)", padding: "12px" }}><div style={{ color: "#9af3c3", fontSize: "8px", fontWeight: 900, textTransform: "uppercase" }}>Strengths</div><div style={{ marginTop: "7px", color: "rgba(255,255,255,0.60)", fontSize: "10px", lineHeight: 1.5 }}>{choice.strengths?.length ? choice.strengths.join(" · ") : "Depends on your goal and timing."}</div></div>
          <div style={{ borderRadius: "14px", background: "rgba(255,190,90,0.05)", border: "1px solid rgba(255,209,138,0.16)", padding: "12px" }}><div style={{ color: "#ffd18a", fontSize: "8px", fontWeight: 900, textTransform: "uppercase" }}>Trade-offs</div><div style={{ marginTop: "7px", color: "rgba(255,255,255,0.60)", fontSize: "10px", lineHeight: 1.5 }}>{choice.tradeoffs?.length ? choice.tradeoffs.join(" · ") : "Every financial choice uses resources that could serve another purpose."}</div></div>
          {choice.advisorFeedback && <div style={{ gridColumn: "1 / -1", color: "rgba(255,255,255,0.65)", fontSize: "11px", lineHeight: 1.55 }}>{resolveAdvisorMessage(choice.advisorFeedback, advisorId)}</div>}
        </div>
      )}
    </LearningBlockShell>
  );
}
