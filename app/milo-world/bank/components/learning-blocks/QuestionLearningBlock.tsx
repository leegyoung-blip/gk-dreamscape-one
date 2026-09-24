"use client";

import type { FinancialBlockResponse, QuestionBlock } from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

export default function QuestionLearningBlock({
  block,
  response,
  onChange,
}: {
  block: QuestionBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const selected = typeof response?.value === "string" ? response.value : null;
  const answered = Boolean(selected);

  return (
    <LearningBlockShell eyebrow={block.eyebrow ?? "Check your understanding"} title={block.title}>
      <h4 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "29px", lineHeight: 1.15, fontWeight: 500 }}>{block.prompt}</h4>
      <div style={{ marginTop: "18px", display: "grid", gap: "9px" }}>
        {block.options.map((option, index) => {
          const isSelected = selected === option.id;
          const isCorrect = answered && option.id === block.correctOptionId;
          const wrongSelected = answered && isSelected && !isCorrect;
          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              onClick={() => onChange({ blockId: block.id, blockType: block.type, value: option.id, isCorrect: option.id === block.correctOptionId, answeredAt: new Date().toISOString() })}
              style={{ minHeight: "52px", textAlign: "left", padding: "11px 14px", borderRadius: "14px", border: isCorrect ? "1px solid rgba(113,236,176,0.46)" : wrongSelected ? "1px solid rgba(255,121,121,0.42)" : "1px solid rgba(255,255,255,0.09)", background: isCorrect ? "rgba(69,207,142,0.10)" : wrongSelected ? "rgba(244,91,91,0.09)" : "rgba(255,255,255,0.035)", color: "white", cursor: answered ? "default" : "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 700 }}
            >
              <span style={{ display: "inline-flex", width: "25px", color: isCorrect ? "#9af3c3" : wrongSelected ? "#ffabab" : "#8ee8ff", fontWeight: 900 }}>{String.fromCharCode(65 + index)}.</span>{option.label}
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{ marginTop: "15px", borderRadius: "15px", border: response?.isCorrect ? "1px solid rgba(113,236,176,0.20)" : "1px solid rgba(255,209,138,0.20)", background: response?.isCorrect ? "rgba(69,207,142,0.07)" : "rgba(255,190,90,0.06)", padding: "13px 14px", color: "rgba(255,255,255,0.72)", fontSize: "12px", lineHeight: 1.6 }}>
          <strong style={{ color: response?.isCorrect ? "#9af3c3" : "#ffd18a" }}>{response?.isCorrect ? "Correct. " : "Not quite. "}</strong>
          {response?.isCorrect ? block.explanation : (block.incorrectExplanation ?? block.explanation)}
        </div>
      )}
    </LearningBlockShell>
  );
}
