"use client";

import { useEffect, useMemo, useState } from "react";
import { FINANCIAL_ADVISORS } from "../lib/financial-advisors";
import { isResponseComplete } from "../lib/financial-learning-engine";
import type {
  FinancialAdvisorId,
  FinancialBlockResponse,
  FinancialLessonDefinition,
  FinancialLessonResponseMap,
} from "../lib/financial-learning-engine-types";
import type { MoneyLabCompletionResult } from "../lib/money-lab-types";
import FinancialAdvisorAvatar from "./FinancialAdvisorAvatar";
import FinancialAdvisorNote from "./FinancialAdvisorNote";
import FinancialBlockRenderer from "./FinancialBlockRenderer";

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof (error as {message?:unknown}).message === "string") {
    return (error as {message:string}).message;
  }
  return "Could not complete this lesson.";
}

export default function FinancialLessonPlayer({
  lesson,
  open,
  advisorId,
  alreadyCompleted,
  loading,
  onClose,
  onComplete,
}: {
  lesson: FinancialLessonDefinition | null;
  open: boolean;
  advisorId: FinancialAdvisorId;
  alreadyCompleted: boolean;
  loading: boolean;
  onClose: () => void;
  onComplete: (lesson: FinancialLessonDefinition, responses: FinancialLessonResponseMap) => Promise<MoneyLabCompletionResult>;
}) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [responses, setResponses] = useState<FinancialLessonResponseMap>({});
  const [completion, setCompletion] = useState<MoneyLabCompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBlockIndex(0);
    setResponses({});
    setCompletion(null);
    setError(null);
  }, [open, lesson?.id]);

  const block = lesson?.blocks[blockIndex] ?? null;
  const response = block ? responses[block.id] : undefined;
  const canContinue = block ? isResponseComplete(block, response) : false;
  const progress = useMemo(() => {
    if (!lesson?.blocks.length) return 0;
    return Math.round(((blockIndex + 1) / lesson.blocks.length) * 100);
  }, [lesson, blockIndex]);

  if (!open || !lesson || !block) return null;
  const currentLesson = lesson;
  const currentBlock = block;
  const advisor = FINANCIAL_ADVISORS[advisorId];

  const recordResponse = (next: FinancialBlockResponse) => {
    setResponses((current) => ({ ...current, [next.blockId]: next }));
  };

  async function next() {
    if (!canContinue || loading) return;
    setError(null);

    if (blockIndex < currentLesson.blocks.length - 1) {
      setBlockIndex((value) => value + 1);
      return;
    }

    if (alreadyCompleted) {
      onClose();
      return;
    }

    try {
      setCompletion(await onComplete(currentLesson, responses));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentLesson.title}
      onMouseDown={(event: any) => {
        if (event.currentTarget === event.target && !loading) onClose();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,5,14,0.84)", backdropFilter: "blur(15px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div style={{ width: "min(760px, 100%)", maxHeight: "min(820px, calc(100dvh - 28px))", overflowY: "auto", borderRadius: "28px", border: "1px solid rgba(126,232,255,0.22)", background: "radial-gradient(circle at 90% 0%, rgba(118,91,218,.08), transparent 30%), linear-gradient(145deg, rgba(7,27,50,.995), rgba(5,8,23,.995))", boxShadow: "0 38px 120px rgba(0,0,0,.68)", padding: "23px", color: "white" }}>
        {completion ? (
          <div style={{ textAlign: "center", padding: "27px 8px 18px" }}>
            <FinancialAdvisorAvatar advisorId={advisorId} size={76} />
            <p style={{ margin: "16px 0 0", color: advisor.accent, fontSize: "9px", fontWeight: 900, letterSpacing: ".17em", textTransform: "uppercase" }}>{advisor.name} · Lesson complete</p>
            <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "42px", lineHeight: 1, fontWeight: 500 }}>{currentLesson.shortTitle} complete.</h2>
            <p style={{ margin: "14px auto 0", maxWidth: "520px", color: "rgba(255,255,255,.58)", fontSize: "13px", lineHeight: 1.65 }}>
              {completion.newlyCompleted ? `${completion.rewardAmount} DT has been added to your Wallet. ${advisor.name} will stay as your advisor for future Milo Finance lessons.` : "You already completed this lesson earlier, so no additional DT was awarded."}
            </p>
            {completion.newlyCompleted && <div style={{ margin: "20px auto 0", width: "fit-content", borderRadius: "16px", border: "1px solid rgba(255,209,138,.30)", background: "rgba(255,190,90,.08)", padding: "12px 18px", color: "#ffd18a", fontSize: "20px", fontWeight: 900 }}>+{completion.rewardAmount} DT</div>}
            <button type="button" onClick={onClose} style={{ marginTop: "23px", minHeight: "46px", padding: "0 22px", borderRadius: "13px", border: "1px solid rgba(126,232,255,.36)", background: "rgba(83,215,255,.12)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>Back to Financial Foundations</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "15px", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: "11px", alignItems: "center" }}>
                <FinancialAdvisorAvatar advisorId={advisorId} size={48} />
                <div>
                  <div style={{ color: advisor.accent, fontSize: "8px", fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase" }}>{advisor.name} · Your advisor</div>
                  <div style={{ marginTop: "3px", color: "rgba(255,255,255,.44)", fontSize: "9px" }}>Lesson {currentLesson.order} · Step {blockIndex + 1} of {currentLesson.blocks.length}</div>
                </div>
              </div>
              <button type="button" onClick={onClose} disabled={loading} aria-label="Close lesson" style={{ width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "white", cursor: loading ? "wait" : "pointer", fontSize: "19px" }}>×</button>
            </div>

            <div style={{ marginTop: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-end" }}>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "30px", lineHeight: 1, fontWeight: 500 }}>{currentLesson.title}</h2>
                <span style={{ color: "rgba(255,255,255,.35)", fontSize: "9px", fontWeight: 800 }}>{progress}%</span>
              </div>
              <div style={{ marginTop: "11px", height: "5px", borderRadius: "999px", background: "rgba(255,255,255,.07)", overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", borderRadius: "999px", background: `linear-gradient(90deg, ${advisor.accent}, #8cf0ca)`, transition: "width 220ms ease" }}/></div>
            </div>

            <FinancialBlockRenderer block={currentBlock} response={response} advisorId={advisorId} onChange={recordResponse} />
            <FinancialAdvisorNote advisorId={advisorId} message={currentBlock.advisorMessage} />

            {error && <div role="alert" style={{ marginTop: "14px", borderRadius: "13px", border: "1px solid rgba(255,121,121,.24)", background: "rgba(244,91,91,.08)", padding: "12px 13px", color: "#ffc0c0", fontSize: "12px" }}>{error}</div>}

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
              <button type="button" disabled={blockIndex === 0 || loading} onClick={() => { setBlockIndex((value) => Math.max(0, value - 1)); setError(null); }} style={{ minHeight: "44px", padding: "0 15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", color: "rgba(255,255,255,.60)", cursor: blockIndex === 0 || loading ? "not-allowed" : "pointer", opacity: blockIndex === 0 ? .35 : 1, fontFamily: "inherit", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>Back</button>
              <button type="button" disabled={loading || !canContinue} onClick={next} style={{ minHeight: "46px", padding: "0 19px", borderRadius: "13px", border: `1px solid ${advisor.accent}55`, background: `linear-gradient(135deg, ${advisor.glow}, rgba(94,78,210,.14))`, color: "white", cursor: loading || !canContinue ? "not-allowed" : "pointer", opacity: !canContinue ? .45 : 1, fontFamily: "inherit", fontSize: "9px", fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase" }}>
                {loading ? "Saving…" : blockIndex === currentLesson.blocks.length - 1 ? (alreadyCompleted ? "Finish Review" : `Complete · +${currentLesson.rewardDt} DT`) : "Continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
