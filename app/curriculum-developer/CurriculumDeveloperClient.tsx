"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurriculumDeveloperAccess } from "@/hooks/useCurriculumDeveloperAccess";
import DashboardView from "./components/DashboardView";
import QuizBuilderView from "./components/QuizBuilderView";
import ReviewQueueView from "./components/ReviewQueueView";
import type { CoreQuiz, CoreSkill, CoreTopic } from "./types";

type Section = "dashboard" | "builder" | "review";

export default function CurriculumDeveloperClient() {
  const router = useRouter();
  const { status, role, error: accessError } = useCurriculumDeveloperAccess();
  const [section, setSection] = useState<Section>("dashboard");
  const [topics, setTopics] = useState<CoreTopic[]>([]);
  const [skills, setSkills] = useState<CoreSkill[]>([]);
  const [quizzes, setQuizzes] = useState<CoreQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    if (status !== "allowed") return;

    setLoading(true);
    setLoadError(null);

    const [topicResult, skillResult, quizResult] = await Promise.all([
      supabase
        .from("core_topics")
        .select(
          "id, subject, primary_level, slug, title, short_title, description, quiz_target, sort_order, is_assessment_topic, is_active",
        )
        .order("subject", { ascending: true })
        .order("primary_level", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("core_skills")
        .select(
          "id, topic_id, code, title, description, quiz_target, sort_order, is_active",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("core_quizzes")
        .select(
          "id, topic_id, skill_id, code, title, description, quiz_type, difficulty, question_count, estimated_minutes, passing_percentage, quiz_order, reward_tokens, reward_gems, feedback_mode, randomise_questions, randomise_options, is_published, status, created_by, updated_by, submitted_by, submitted_at, reviewed_by, reviewed_at, review_notes, version, created_at, updated_at",
        )
        .order("updated_at", { ascending: false }),
    ]);

    const firstError = topicResult.error || skillResult.error || quizResult.error;
    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    setTopics((topicResult.data || []) as CoreTopic[]);
    setSkills((skillResult.data || []) as CoreSkill[]);
    setQuizzes((quizResult.data || []) as CoreQuiz[]);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  function openQuiz(quizId: string) {
    setSelectedQuizId(quizId);
    setSection("builder");
  }

  if (status === "checking") {
    return <PageMessage text="Checking curriculum developer access..." />;
  }

  if (status === "locked" || !role) {
    return (
      <main style={pageShell}>
        <div style={lockedCard}>
          <p style={brandEyebrow}>CURRICULUM DEVELOPER</p>
          <h1 style={{ margin: "7px 0 0" }}>Access Restricted</h1>
          <p style={mutedText}>
            This page is available only to accounts assigned the admin or
            curriculum_lead role.
          </p>
          {accessError && <p style={errorText}>{accessError}</p>}
          <button
            type="button"
            onClick={() => router.push("/learning-missions")}
            style={primaryButton}
          >
            Return to Learning Missions
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageShell}>
      <header style={header}>
        <button
          type="button"
          onClick={() => router.push("/learning-missions")}
          style={backButton}
        >
          ← Learning Missions
        </button>
        <div style={headerTitle}>
          <p style={brandEyebrow}>DREAMSCAPE ONE</p>
          <p style={headerSubtitle}>Curriculum Developer</p>
        </div>
        <div style={rolePill}>{role.replaceAll("_", " ")}</div>
      </header>

      <div style={appGrid}>
        <aside style={sidebar}>
          <p style={sidebarEyebrow}>CONTENT WORKSPACE</p>
          <NavButton
            active={section === "dashboard"}
            label="Dashboard"
            icon="▦"
            onClick={() => setSection("dashboard")}
          />
          <NavButton
            active={section === "builder"}
            label="Quiz Builder"
            icon="✎"
            onClick={() => setSection("builder")}
          />
          <NavButton
            active={section === "review"}
            label="Review Queue"
            icon="✓"
            badge={quizzes.filter((quiz) => quiz.status === "in_review").length}
            onClick={() => setSection("review")}
          />

          <div style={sidebarNote}>
            Curriculum leads create and submit content. Admins approve and publish it.
          </div>
        </aside>

        <section style={workspace}>
          {loading ? (
            <PageMessage text="Loading curriculum content..." embedded />
          ) : loadError ? (
            <div style={errorBanner}>{loadError}</div>
          ) : section === "dashboard" ? (
            <DashboardView
              topics={topics}
              quizzes={quizzes}
              onCreateQuiz={() => {
                setSelectedQuizId(null);
                setSection("builder");
              }}
              onOpenQuiz={openQuiz}
            />
          ) : section === "builder" ? (
            <QuizBuilderView
              role={role}
              topics={topics}
              skills={skills}
              quizzes={quizzes}
              selectedQuizId={selectedQuizId}
              onSelectQuiz={setSelectedQuizId}
              onDataChanged={loadContent}
            />
          ) : (
            <ReviewQueueView
              role={role}
              quizzes={quizzes}
              topics={topics}
              onOpenQuiz={openQuiz}
              onDataChanged={loadContent}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function NavButton({
  active,
  label,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...navButton,
        background: active ? "rgba(83,215,255,0.15)" : navButton.background,
        borderColor: active
          ? "rgba(126,232,255,0.52)"
          : "rgba(126,232,255,0.12)",
      }}
    >
      <span style={navIcon}>{icon}</span>
      <span>{label}</span>
      {Boolean(badge) && <span style={navBadge}>{badge}</span>}
    </button>
  );
}

function PageMessage({
  text,
  embedded = false,
}: {
  text: string;
  embedded?: boolean;
}) {
  const content = <div style={messageCard}>{text}</div>;
  if (embedded) return content;
  return <main style={pageShell}>{content}</main>;
}

const pageShell: CSSProperties = {
  minHeight: "100dvh",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  backgroundImage: `
    linear-gradient(180deg, rgba(2,8,19,0.38), rgba(2,8,19,0.82)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};
const header: CSSProperties = {
  minHeight: "68px",
  padding: "10px 18px",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: "10px",
  borderBottom: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(2,10,28,0.52)",
  backdropFilter: "blur(12px)",
};
const backButton: CSSProperties = {
  justifySelf: "start",
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "0 13px",
  cursor: "pointer",
  fontWeight: 800,
};
const headerTitle: CSSProperties = { textAlign: "center" };
const brandEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "10px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};
const headerSubtitle: CSSProperties = { margin: "3px 0 0", fontWeight: 900 };
const rolePill: CSSProperties = {
  justifySelf: "end",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.32)",
  background: "rgba(255,215,106,0.09)",
  color: "#ffe6a8",
  padding: "8px 12px",
  fontSize: "10px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const appGrid: CSSProperties = {
  width: "min(1700px,100%)",
  margin: "0 auto",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "220px minmax(0,1fr)",
  gap: "14px",
};
const sidebar: CSSProperties = {
  position: "sticky",
  top: "82px",
  alignSelf: "start",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(4,18,43,0.77)",
  padding: "13px",
  display: "grid",
  gap: "8px",
  backdropFilter: "blur(10px)",
};
const sidebarEyebrow: CSSProperties = {
  margin: "3px 5px 7px",
  color: "rgba(255,255,255,0.46)",
  fontSize: "8px",
  letterSpacing: "0.13em",
  fontWeight: 900,
};
const navButton: CSSProperties = {
  minHeight: "46px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(255,255,255,0.035)",
  color: "white",
  padding: "0 11px",
  display: "grid",
  gridTemplateColumns: "27px 1fr auto",
  alignItems: "center",
  gap: "7px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 800,
};
const navIcon: CSSProperties = { color: "#7ee8ff", fontSize: "17px" };
const navBadge: CSSProperties = {
  minWidth: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "rgba(255,215,106,0.18)",
  color: "#ffe6a8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "9px",
  fontWeight: 900,
};
const sidebarNote: CSSProperties = {
  marginTop: "8px",
  borderRadius: "12px",
  background: "rgba(126,232,255,0.055)",
  color: "rgba(255,255,255,0.54)",
  padding: "10px",
  fontSize: "9px",
  lineHeight: 1.45,
};
const workspace: CSSProperties = {
  minWidth: 0,
  minHeight: "calc(100dvh - 98px)",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "linear-gradient(145deg,rgba(5,18,42,0.77),rgba(8,26,58,0.9))",
  padding: "20px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 22px 58px rgba(0,0,0,0.28)",
};
const lockedCard: CSSProperties = {
  width: "min(620px,calc(100% - 30px))",
  margin: "18vh auto 0",
  borderRadius: "22px",
  border: "1px solid rgba(255,215,106,0.35)",
  background: "rgba(7,25,55,0.92)",
  padding: "28px",
  textAlign: "center",
};
const mutedText: CSSProperties = { color: "rgba(255,255,255,0.65)", lineHeight: 1.5 };
const errorText: CSSProperties = { color: "#fecaca", fontSize: "11px" };
const primaryButton: CSSProperties = {
  marginTop: "16px",
  minHeight: "43px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  color: "white",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};
const messageCard: CSSProperties = {
  width: "min(620px,calc(100% - 30px))",
  margin: "18vh auto 0",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(7,25,55,0.92)",
  padding: "24px",
  textAlign: "center",
};
const errorBanner: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "12px",
};
