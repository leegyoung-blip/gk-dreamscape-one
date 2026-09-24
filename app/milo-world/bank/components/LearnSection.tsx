"use client";

import { useEffect, useMemo, useState } from "react";
import { FINANCIAL_ADVISORS } from "../lib/financial-advisors";
import {
  applyBlockEffects,
  createLessonRuntime,
  deriveVariablesForPath,
  isResponseComplete,
  resolveNextBlockId,
} from "../lib/financial-learning-engine";
import type {
  FinancialAdvisorId,
  FinancialBlockResponse,
  FinancialLessonDefinition,
  FinancialLessonResponseMap,
} from "../lib/financial-learning-engine-types";
import type { MiloFinanceLessonCompletion } from "../lib/financial-learning-content-types";
import FinancialAdvisorAvatar from "./FinancialAdvisorAvatar";
import FinancialAdvisorNote from "./FinancialAdvisorNote";
import FinancialBlockRenderer from "./FinancialBlockRenderer";
import FinancialStatePanel from "./FinancialStatePanel";

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Could not continue this lesson.";
}

export default function FinancialLessonPlayer({
  lesson,
  open,
  advisorId,
  loading,
  onClose,
  onCheckpoint,
  onComplete,
}: {
  lesson: FinancialLessonDefinition | null;
  open: boolean;
  advisorId: FinancialAdvisorId;
  loading: boolean;
  onClose: () => void;
  onCheckpoint?: (
    lesson: FinancialLessonDefinition,
    responses: FinancialLessonResponseMap,
    lastBlockKey: string,
  ) => Promise<void>;
  onComplete: (
    lesson: FinancialLessonDefinition,
    responses: FinancialLessonResponseMap,
  ) => Promise<MiloFinanceLessonCompletion>;
}) {
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [responses, setResponses] = useState<FinancialLessonResponseMap>({});
  const [completion, setCompletion] = useState<MiloFinanceLessonCompletion | null>(null);
  const [checkpointing, setCheckpointing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lesson) return;
    try {
      const runtime = createLessonRuntime(lesson);
      setCurrentBlockId(runtime.currentBlockId);
      setPath(runtime.path);
      setResponses({});
      setCompletion(null);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [open, lesson?.id]);

  const block = useMemo(
    () => lesson?.blocks.find((item) => item.id === currentBlockId) ?? null,
    [lesson, currentBlockId],
  );
  const response = block ? responses[block.id] : undefined;
  const canContinue = block ? isResponseComplete(block, response) : false;
  const advisor = FINANCIAL_ADVISORS[advisorId];

  const currentVariables = useMemo(() => {
    if (!lesson) return {};
    return deriveVariablesForPath(lesson, path, responses, false);
  }, [lesson, path, responses]);

  const progress = useMemo(() => {
    if (!lesson || !block) return 0;
    const index = lesson.blocks.findIndex((item) => item.id === block.id);
    if (index < 0) return 0;
    return Math.max(1, Math.round(((index + 1) / lesson.blocks.length) * 100));
  }, [lesson, block]);

  if (!open || !lesson || !block) return null;
  const currentLesson = lesson;
  const currentBlock = block;

  const recordResponse = (next: FinancialBlockResponse) => {
    setResponses((current) => ({ ...current, [next.blockId]: next }));
  };

  async function next() {
    if (!canContinue || loading || checkpointing) return;
    setError(null);

    try {
      // Ignore responses from abandoned branches after a learner uses Back and
      // chooses a different route. Only the currently active path can affect
      // routing or be submitted as lesson evidence.
      const activeResponses = Object.fromEntries(
        Object.entries(responses).filter(([blockId]) => path.includes(blockId)),
      ) as FinancialLessonResponseMap;
      if (onCheckpoint) {
        setCheckpointing(true);
        try {
          await onCheckpoint(currentLesson, activeResponses, currentBlock.id);
        } finally {
          setCheckpointing(false);
        }
      }

      const variablesAfterCurrent = applyBlockEffects(
        currentBlock,
        activeResponses[currentBlock.id],
        currentVariables,
      );
      const nextId = resolveNextBlockId(
        currentLesson,
        currentBlock,
        activeResponses[currentBlock.id],
        activeResponses,
        variablesAfterCurrent,
      );

      if (nextId) {
        // Keep authored loops bounded. Branching lessons may revisit a block, but
        // a malformed content definition should never trap a learner forever.
        if (path.length >= 100) {
          throw new Error("This lesson route is too long. Please report this lesson to the Dreamscape team.");
        }
        setPath((current) => [...current, nextId]);
        setCurrentBlockId(nextId);
        return;
      }

      // Completed learners can replay the interactive version. The server
      // returns newlyCompleted=false, awards no DT, and refreshes their evidence.
      setCompletion(await onComplete(currentLesson, activeResponses));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  function back() {
    if (path.length <= 1 || loading || checkpointing) return;
    const nextPath = path.slice(0, -1);
    setPath(nextPath);
    setCurrentBlockId(nextPath[nextPath.length - 1] ?? null);
    setError(null);
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
            <button type="button" onClick={onClose} style={{ marginTop: "23px", minHeight: "46px", padding: "0 22px", borderRadius: "13px", border: "1px solid rgba(126,232,255,.36)", background: "rgba(83,215,255,.12)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>Back to course</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "15px", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: "11px", alignItems: "center" }}>
                <FinancialAdvisorAvatar advisorId={advisorId} size={48} />
                <div>
                  <div style={{ color: advisor.accent, fontSize: "8px", fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase" }}>{advisor.name} · Your advisor</div>
                  <div style={{ marginTop: "3px", color: "rgba(255,255,255,.44)", fontSize: "9px" }}>Lesson {currentLesson.order} · Step {path.length}</div>
                </div>
              </div>
              <button type="button" onClick={onClose} disabled={loading || checkpointing} aria-label="Close lesson" style={{ width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "white", cursor: loading || checkpointing ? "wait" : "pointer", fontSize: "19px" }}>×</button>
            </div>

            <div style={{ marginTop: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-end" }}>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "30px", lineHeight: 1, fontWeight: 500 }}>{currentLesson.title}</h2>
                <span style={{ color: "rgba(255,255,255,.35)", fontSize: "9px", fontWeight: 800 }}>{progress}%</span>
              </div>
              <div style={{ marginTop: "11px", height: "5px", borderRadius: "999px", background: "rgba(255,255,255,.07)", overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", borderRadius: "999px", background: `linear-gradient(90deg, ${advisor.accent}, #8cf0ca)`, transition: "width 220ms ease" }}/></div>
            </div>

            {currentLesson.variables?.length ? (
              <FinancialStatePanel definitions={currentLesson.variables} values={currentVariables} />
            ) : null}

            <FinancialBlockRenderer block={currentBlock} response={response} advisorId={advisorId} onChange={recordResponse} />
            <FinancialAdvisorNote advisorId={advisorId} message={currentBlock.advisorMessage} />

            {error && <div role="alert" style={{ marginTop: "14px", borderRadius: "13px", border: "1px solid rgba(255,121,121,.24)", background: "rgba(244,91,91,.08)", padding: "12px 13px", color: "#ffc0c0", fontSize: "12px" }}>{error}</div>}

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
              <button type="button" disabled={path.length <= 1 || loading || checkpointing} onClick={back} style={{ minHeight: "44px", padding: "0 15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", color: "rgba(255,255,255,.60)", cursor: path.length <= 1 || loading || checkpointing ? "not-allowed" : "pointer", opacity: path.length <= 1 ? .35 : 1, fontFamily: "inherit", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>Back</button>
              <button type="button" disabled={loading || checkpointing || !canContinue} onClick={next} style={{ minHeight: "46px", padding: "0 19px", borderRadius: "13px", border: `1px solid ${advisor.accent}55`, background: `linear-gradient(135deg, ${advisor.glow}, rgba(94,78,210,.14))`, color: "white", cursor: loading || checkpointing || !canContinue ? "not-allowed" : "pointer", opacity: !canContinue ? .45 : 1, fontFamily: "inherit", fontSize: "9px", fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase" }}>
                {loading || checkpointing ? "Saving…" : "Continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
