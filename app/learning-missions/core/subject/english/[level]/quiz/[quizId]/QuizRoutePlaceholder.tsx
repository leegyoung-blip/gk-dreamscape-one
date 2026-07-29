"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";

type QuizHeader = {
  id: string;
  title: string;
  description: string | null;
  quiz_type: string;
  question_count: number;
  estimated_minutes: number;
};

export default function QuizRoutePlaceholder({
  subject,
  level,
  quizId,
}: {
  subject: "english" | "math";
  level: number;
  quizId: string;
}) {
  const router = useRouter();
  const { status } = useCoreMissionAccess();
  const [quiz, setQuiz] = useState<QuizHeader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "allowed") return;

    async function loadQuiz() {
      const { data, error: loadError } = await supabase
        .from("core_quizzes")
        .select("id, title, description, quiz_type, question_count, estimated_minutes")
        .eq("id", quizId)
        .eq("is_published", true)
        .maybeSingle();

      if (loadError || !data) {
        setError("This quiz could not be found or has not been published.");
        return;
      }

      setQuiz(data as QuizHeader);
    }

    void loadQuiz();
  }, [quizId, status]);

  return (
    <main style={pageShell}>
      <div style={card}>
        <button
          type="button"
          onClick={() => router.push(`/learning-missions/core/${subject}/p${level}`)}
          style={backButton}
        >
          ← Quiz List
        </button>

        {status === "checking" && <p>Checking Core Missions access...</p>}
        {status === "locked" && <p>Core Missions is locked for this account.</p>}
        {status === "allowed" && error && <p>{error}</p>}

        {status === "allowed" && quiz && (
          <>
            <p style={eyebrow}>QUIZ PLAYER ROUTE READY</p>
            <h1 style={title}>{quiz.title}</h1>
            <p style={description}>{quiz.description}</p>
            <div style={metaRow}>
              <span>{quiz.question_count} questions</span>
              <span>•</span>
              <span>{quiz.estimated_minutes} minutes</span>
            </div>
            <div style={notice}>
              Keep the quiz player on this separate route. The next implementation should load a student-safe question payload through a secure Supabase RPC, so correct answers are never exposed in the browser before submission.
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const pageShell: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  backgroundImage: `
    linear-gradient(180deg, rgba(2,8,19,0.48), rgba(2,8,19,0.76)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const card: CSSProperties = {
  width: "min(760px,100%)",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.35)",
  background: "linear-gradient(145deg, rgba(5,18,42,0.82), rgba(8,26,58,0.94))",
  padding: "24px",
  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
};

const backButton: CSSProperties = {
  minHeight: "36px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 13px",
  cursor: "pointer",
};

const eyebrow: CSSProperties = {
  margin: "22px 0 0",
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const title: CSSProperties = {
  margin: "7px 0 0",
  fontSize: "clamp(32px,6vw,54px)",
};

const description: CSSProperties = {
  margin: "10px 0 0",
  color: "rgba(255,255,255,0.68)",
  lineHeight: 1.5,
};

const metaRow: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  gap: "8px",
  color: "#ffe6a8",
  fontWeight: 800,
};

const notice: CSSProperties = {
  marginTop: "22px",
  borderRadius: "14px",
  border: "1px solid rgba(255,215,106,0.35)",
  background: "rgba(255,215,106,0.08)",
  padding: "14px",
  color: "rgba(255,255,255,0.76)",
  lineHeight: 1.55,
};
