"use client";

import { useEffect, useMemo, useState } from "react";
import type { MoneyLabLesson, MoneyLabCompletionResult } from "../lib/money-lab-types";

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Could not complete this lesson.";
}

export default function MoneyLessonModal({
  lesson,
  open,
  alreadyCompleted,
  loading,
  onClose,
  onComplete,
}: {
  lesson: MoneyLabLesson | null;
  open: boolean;
  alreadyCompleted: boolean;
  loading: boolean;
  onClose: () => void;
  onComplete: (lessonKey: MoneyLabLesson["key"]) => Promise<MoneyLabCompletionResult>;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [completion, setCompletion] = useState<MoneyLabCompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setSelectedIndex(null);
    setAnswered(false);
    setCompletion(null);
    setError(null);
  }, [open, lesson?.key]);

  const step = lesson?.steps[stepIndex];
  const progress = useMemo(() => {
    if (!lesson) return 0;
    return Math.round(((stepIndex + 1) / lesson.steps.length) * 100);
  }, [lesson, stepIndex]);

  if (!open || !lesson || !step) return null;

  const currentLesson = lesson;
  const currentStep = step;

  async function next() {
    if (currentStep.type === "quiz" && !answered) return;
    setError(null);

    if (stepIndex < currentLesson.steps.length - 1) {
      setStepIndex((value) => value + 1);
      setSelectedIndex(null);
      setAnswered(false);
      return;
    }

    if (alreadyCompleted) {
      onClose();
      return;
    }

    try {
      setCompletion(await onComplete(currentLesson.key));
    } catch (caught) {
      setError(messageFrom(caught));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lesson.title}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !loading) onClose();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,5,14,0.82)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}
    >
      <div style={{ width: "min(680px, 100%)", maxHeight: "min(760px, calc(100dvh - 30px))", overflowY: "auto", borderRadius: "28px", border: "1px solid rgba(126,232,255,0.22)", background: "linear-gradient(145deg, rgba(7,27,50,0.995), rgba(5,8,23,0.995))", boxShadow: "0 38px 120px rgba(0,0,0,0.68)", padding: "24px", color: "white" }}>
        {completion ? (
          <div style={{ textAlign: "center", padding: "28px 8px 18px" }}>
            <div style={{ width: "72px", height: "72px", margin: "0 auto", borderRadius: "23px", border: "1px solid rgba(113,236,176,0.35)", background: "rgba(69,207,142,0.10)", color: "#9af3c3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>✓</div>
            <p style={{ margin: "18px 0 0", color: "#9af3c3", fontSize: "10px", fontWeight: 900, letterSpacing: "0.17em", textTransform: "uppercase" }}>Lesson complete</p>
            <h2 style={{ margin: "9px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "42px", lineHeight: 1, fontWeight: 500 }}>{lesson.shortTitle} unlocked.</h2>
            <p style={{ margin: "15px auto 0", maxWidth: "500px", color: "rgba(255,255,255,0.57)", fontSize: "13px", lineHeight: 1.65 }}>
              {completion.newlyCompleted
                ? `${completion.rewardAmount} DT has been added to your Wallet. Each Financial Foundations lesson rewards DT once only.`
                : "You already completed this lesson earlier, so no additional DT was awarded."}
            </p>
            {completion.newlyCompleted && (
              <div style={{ margin: "22px auto 0", width: "fit-content", borderRadius: "16px", border: "1px solid rgba(255,209,138,0.30)", background: "rgba(255,190,90,0.08)", padding: "13px 18px", color: "#ffd18a", fontSize: "20px", fontWeight: 900 }}>+{completion.rewardAmount} DT</div>
            )}
            <button type="button" onClick={onClose} style={{ marginTop: "24px", minHeight: "48px", padding: "0 24px", borderRadius: "14px", border: "1px solid rgba(126,232,255,0.36)", background: "rgba(83,215,255,0.12)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Back to Financial Foundations</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Lesson {lesson.order} · {stepIndex + 1} of {lesson.steps.length}</p>
                <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "34px", lineHeight: 1, fontWeight: 500, letterSpacing: "-0.03em" }}>{lesson.title}</h2>
              </div>
              <button type="button" onClick={onClose} disabled={loading} aria-label="Close" style={{ width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "white", cursor: loading ? "not-allowed" : "pointer", fontSize: "20px", flexShrink: 0 }}>×</button>
            </div>

            <div style={{ marginTop: "18px", height: "5px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #58d8ff, #8cf0ca)", transition: "width 220ms ease" }} />
            </div>

            {step.type === "info" ? (
              <div style={{ padding: "28px 2px 10px" }}>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.40)", fontSize: "10px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>{step.eyebrow}</p>
                <h3 style={{ margin: "9px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "36px", lineHeight: 1.08, fontWeight: 500 }}>{step.title}</h3>
                <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.68)", fontSize: "14px", lineHeight: 1.75 }}>{step.body}</p>
                {step.example && (
                  <div style={{ marginTop: "20px", borderRadius: "17px", border: "1px solid rgba(126,232,255,0.13)", background: "rgba(83,215,255,0.055)", padding: "15px 16px", color: "#bceffc", fontSize: "13px", lineHeight: 1.6 }}><strong style={{ color: "#8ee8ff" }}>Example: </strong>{step.example}</div>
                )}
              </div>
            ) : (
              <div style={{ padding: "26px 2px 8px" }}>
                <p style={{ margin: 0, color: "#ffd18a", fontSize: "10px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>Check your understanding</p>
                <h3 style={{ margin: "9px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "31px", lineHeight: 1.15, fontWeight: 500 }}>{step.question}</h3>
                <div style={{ marginTop: "20px", display: "grid", gap: "9px" }}>
                  {step.options.map((option, index) => {
                    const selected = selectedIndex === index;
                    const correct = answered && index === step.correctIndex;
                    const wrongSelected = answered && selected && index !== step.correctIndex;
                    return (
                      <button key={option} type="button" disabled={answered} onClick={() => { setSelectedIndex(index); setAnswered(true); }} style={{ minHeight: "52px", textAlign: "left", padding: "11px 14px", borderRadius: "14px", border: correct ? "1px solid rgba(113,236,176,0.46)" : wrongSelected ? "1px solid rgba(255,121,121,0.42)" : selected ? "1px solid rgba(126,232,255,0.40)" : "1px solid rgba(255,255,255,0.09)", background: correct ? "rgba(69,207,142,0.10)" : wrongSelected ? "rgba(244,91,91,0.09)" : selected ? "rgba(83,215,255,0.09)" : "rgba(255,255,255,0.035)", color: "white", cursor: answered ? "default" : "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 700 }}>
                        <span style={{ display: "inline-flex", width: "24px", color: correct ? "#9af3c3" : wrongSelected ? "#ffabab" : "#8ee8ff", fontWeight: 900 }}>{String.fromCharCode(65 + index)}.</span>{option}
                      </button>
                    );
                  })}
                </div>
                {answered && (
                  <div style={{ marginTop: "16px", borderRadius: "16px", border: selectedIndex === step.correctIndex ? "1px solid rgba(113,236,176,0.20)" : "1px solid rgba(255,209,138,0.20)", background: selectedIndex === step.correctIndex ? "rgba(69,207,142,0.07)" : "rgba(255,190,90,0.06)", padding: "14px 15px", color: "rgba(255,255,255,0.72)", fontSize: "12px", lineHeight: 1.6 }}>
                    <strong style={{ color: selectedIndex === step.correctIndex ? "#9af3c3" : "#ffd18a" }}>{selectedIndex === step.correctIndex ? "Correct. " : "Not quite. "}</strong>{step.explanation}
                  </div>
                )}
              </div>
            )}

            {error && <div style={{ marginTop: "14px", borderRadius: "13px", border: "1px solid rgba(255,121,121,0.24)", background: "rgba(244,91,91,0.08)", padding: "12px 13px", color: "#ffc0c0", fontSize: "12px" }}>{error}</div>}

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <button type="button" disabled={stepIndex === 0 || loading} onClick={() => { setStepIndex((value) => Math.max(0, value - 1)); setSelectedIndex(null); setAnswered(false); setError(null); }} style={{ minHeight: "44px", padding: "0 15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.035)", color: "rgba(255,255,255,0.60)", cursor: stepIndex === 0 || loading ? "not-allowed" : "pointer", opacity: stepIndex === 0 ? 0.35 : 1, fontFamily: "inherit", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>Back</button>
              <button type="button" disabled={loading || (step.type === "quiz" && !answered)} onClick={next} style={{ minHeight: "46px", padding: "0 19px", borderRadius: "13px", border: "1px solid rgba(126,232,255,0.34)", background: "linear-gradient(135deg, rgba(83,215,255,0.18), rgba(94,78,210,0.14))", color: "white", cursor: loading || (step.type === "quiz" && !answered) ? "not-allowed" : "pointer", opacity: step.type === "quiz" && !answered ? 0.5 : 1, fontFamily: "inherit", fontSize: "10px", fontWeight: 900, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {loading ? "Saving…" : stepIndex === lesson.steps.length - 1 ? (alreadyCompleted ? "Finish Review" : `Complete · +${lesson.rewardDt} DT`) : "Continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
