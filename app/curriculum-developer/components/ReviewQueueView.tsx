"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type { CoreQuiz, CoreTopic, CurriculumRole } from "../types";

export default function ReviewQueueView({
  role,
  quizzes,
  topics,
  onOpenQuiz,
  onDataChanged,
}: {
  role: CurriculumRole;
  quizzes: CoreQuiz[];
  topics: CoreTopic[];
  onOpenQuiz: (quizId: string) => void;
  onDataChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queue = quizzes.filter((quiz) =>
    ["in_review", "approved", "changes_requested"].includes(quiz.status),
  );
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));

  async function runAction(
    quizId: string,
    functionName:
      | "curriculum_request_changes"
      | "curriculum_approve_quiz"
      | "curriculum_publish_quiz",
  ) {
    setBusyId(quizId);
    setError(null);
    setMessage(null);

    let args: Record<string, any> = { p_quiz_id: quizId };
    if (functionName === "curriculum_request_changes") {
      const notes = window.prompt("Enter the changes required:");
      if (!notes?.trim()) {
        setBusyId(null);
        return;
      }
      args = { ...args, p_notes: notes.trim() };
    }
    if (functionName === "curriculum_approve_quiz") {
      args = { ...args, p_notes: null };
    }

    const { error: actionError } = await supabase.rpc(functionName, args);
    if (actionError) setError(actionError.message);
    else {
      await onDataChanged();
      setMessage(
        functionName === "curriculum_request_changes"
          ? "Quiz returned for changes."
          : functionName === "curriculum_approve_quiz"
            ? "Quiz approved."
            : "Quiz published.",
      );
    }
    setBusyId(null);
  }

  return (
    <div>
      <div>
        <p style={eyebrow}>QUALITY CONTROL</p>
        <h1 style={title}>Review Queue</h1>
        <p style={description}>
          Curriculum leads can inspect returned work. Admins can request changes,
          approve and publish completed quizzes.
        </p>
      </div>

      {role !== "admin" && (
        <div style={notice}>
          Your account can view the workflow, but only an admin can approve or publish.
        </div>
      )}

      <div style={queueList}>
        {queue.length === 0 ? (
          <div style={emptyState}>There are no quizzes in the review queue.</div>
        ) : (
          queue.map((quiz) => {
            const topic = topicMap.get(quiz.topic_id);
            return (
              <article key={quiz.id} style={card}>
                <div style={{ minWidth: 0 }}>
                  <p style={code}>{quiz.code}</p>
                  <h2 style={quizTitle}>{quiz.title}</h2>
                  <p style={meta}>
                    {topic
                      ? `${topic.subject === "english" ? "English" : "Math"} P${topic.primary_level} · ${topic.title}`
                      : "Topic unavailable"}
                    {` · ${quiz.question_count} questions`}
                  </p>
                  {quiz.review_notes && (
                    <div style={reviewNotes}>
                      <strong>Review notes:</strong> {quiz.review_notes}
                    </div>
                  )}
                </div>

                <div style={actionArea}>
                  <span style={statusPill}>{quiz.status.replaceAll("_", " ")}</span>
                  <button
                    type="button"
                    onClick={() => onOpenQuiz(quiz.id)}
                    style={ghostButton}
                  >
                    Open Quiz
                  </button>

                  {role === "admin" && quiz.status === "in_review" && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === quiz.id}
                        onClick={() =>
                          void runAction(quiz.id, "curriculum_request_changes")
                        }
                        style={changesButton}
                      >
                        Request Changes
                      </button>
                      <button
                        type="button"
                        disabled={busyId === quiz.id}
                        onClick={() =>
                          void runAction(quiz.id, "curriculum_approve_quiz")
                        }
                        style={approveButton}
                      >
                        Approve
                      </button>
                    </>
                  )}

                  {role === "admin" && quiz.status === "approved" && (
                    <button
                      type="button"
                      disabled={busyId === quiz.id}
                      onClick={() =>
                        void runAction(quiz.id, "curriculum_publish_quiz")
                      }
                      style={publishButton}
                    >
                      Publish Quiz
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {message && <div style={successBanner}>{message}</div>}
      {error && <div style={errorBanner}>{error}</div>}
    </div>
  );
}

const eyebrow: CSSProperties = { margin: 0, color: "#7ee8ff", fontSize: "11px", letterSpacing: "0.18em", fontWeight: 900 };
const title: CSSProperties = { margin: "6px 0 0", fontSize: "clamp(30px,4vw,48px)" };
const description: CSSProperties = { margin: "8px 0 0", color: "rgba(255,255,255,0.66)" };
const notice: CSSProperties = { marginTop: "16px", borderRadius: "12px", border: "1px solid rgba(255,215,106,0.3)", background: "rgba(255,215,106,0.07)", color: "#ffe6a8", padding: "11px" };
const queueList: CSSProperties = { marginTop: "18px", display: "grid", gap: "10px" };
const card: CSSProperties = { borderRadius: "18px", border: "1px solid rgba(126,232,255,0.22)", background: "rgba(4,20,48,0.62)", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" };
const code: CSSProperties = { margin: 0, color: "#7ee8ff", fontSize: "9px", letterSpacing: "0.12em", fontWeight: 900 };
const quizTitle: CSSProperties = { margin: "5px 0 0", fontSize: "22px" };
const meta: CSSProperties = { margin: "7px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "11px" };
const reviewNotes: CSSProperties = { marginTop: "9px", borderRadius: "10px", background: "rgba(255,215,106,0.07)", color: "#ffe6a8", padding: "9px", fontSize: "11px" };
const actionArea: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: "7px" };
const statusPill: CSSProperties = { borderRadius: "999px", background: "rgba(126,232,255,0.13)", color: "#bcefff", padding: "7px 10px", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" };
const ghostButton: CSSProperties = { minHeight: "36px", borderRadius: "10px", border: "1px solid rgba(126,232,255,0.24)", background: "rgba(255,255,255,0.05)", color: "white", padding: "0 11px", cursor: "pointer" };
const changesButton: CSSProperties = { ...ghostButton, border: "1px solid rgba(248,113,113,0.35)", color: "#fecaca" };
const approveButton: CSSProperties = { ...ghostButton, border: "1px solid rgba(198,166,255,0.4)", background: "rgba(168,85,247,0.14)", color: "#eadcff" };
const publishButton: CSSProperties = { ...ghostButton, border: "1px solid rgba(74,222,128,0.4)", background: "rgba(34,197,94,0.15)", color: "#bbf7d0", fontWeight: 900 };
const emptyState: CSSProperties = { borderRadius: "17px", border: "1px dashed rgba(126,232,255,0.25)", padding: "30px", color: "rgba(255,255,255,0.56)", textAlign: "center" };
const successBanner: CSSProperties = { marginTop: "12px", borderRadius: "11px", border: "1px solid rgba(74,222,128,0.4)", background: "rgba(34,197,94,0.12)", color: "#bbf7d0", padding: "10px" };
const errorBanner: CSSProperties = { marginTop: "12px", borderRadius: "11px", border: "1px solid rgba(248,113,113,0.42)", background: "rgba(239,68,68,0.13)", color: "#fecaca", padding: "10px" };
