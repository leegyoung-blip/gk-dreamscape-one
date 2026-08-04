"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurriculumDeveloperAccess } from "@/hooks/useCurriculumDeveloperAccess";
import DashboardView from "./components/DashboardView";
import QuizBuilderView from "./components/QuizBuilderView";
import ReviewQueueView from "./components/ReviewQueueView";
import EditHistoryView from "./components/EditHistoryView";
import type {
  CoreQuiz,
  CoreSkill,
  CoreSubject,
  CoreTopic,
  CurriculumAuditEntry,
} from "./types";

type Section = "dashboard" | "builder" | "review" | "history";

const CONTENT_SOURCES: Array<{
  subject: CoreSubject;
  topics: string;
  skills: string;
  quizzes: string;
}> = [
  {
    subject: "english",
    topics: "english_topics",
    skills: "english_skills",
    quizzes: "english_quizzes",
  },
  {
    subject: "math",
    topics: "math_topics",
    skills: "math_skills",
    quizzes: "math_quizzes",
  },
];

export default function CurriculumDeveloperClient() {
  const router = useRouter();
  const { status, role, error: accessError } = useCurriculumDeveloperAccess();
  const [section, setSection] = useState<Section>("dashboard");
  const [topics, setTopics] = useState<CoreTopic[]>([]);
  const [skills, setSkills] = useState<CoreSkill[]>([]);
  const [quizzes, setQuizzes] = useState<CoreQuiz[]>([]);
  const [auditEntries, setAuditEntries] = useState<CurriculumAuditEntry[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    if (status !== "allowed") return;

    setLoading(true);
    setLoadError(null);
    setHistoryError(null);

    const sourceResults = await Promise.all(
      CONTENT_SOURCES.map(async (source) => {
        const [topicResult, skillResult, quizResult] = await Promise.all([
          supabase
            .from(source.topics)
            .select(
              "id, subject, primary_level, slug, title, short_title, description, quiz_target, sort_order, is_assessment_topic, is_active",
            )
            .order("primary_level", { ascending: true })
            .order("sort_order", { ascending: true }),
          supabase
            .from(source.skills)
            .select(
              "id, topic_id, code, title, description, quiz_target, sort_order, is_active",
            )
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from(source.quizzes)
            .select(
              "id, topic_id, skill_id, code, title, description, quiz_type, difficulty, question_count, estimated_minutes, passing_percentage, quiz_order, reward_tokens, reward_gems, feedback_mode, randomise_questions, randomise_options, is_published, status, created_by, updated_by, submitted_by, submitted_at, reviewed_by, reviewed_at, review_notes, version, created_at, updated_at",
            )
            .order("updated_at", { ascending: false }),
        ]);

        return { source, topicResult, skillResult, quizResult };
      }),
    );

    const firstError = sourceResults
      .flatMap(({ topicResult, skillResult, quizResult }) => [
        topicResult.error,
        skillResult.error,
        quizResult.error,
      ])
      .find(Boolean);

    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    const loadedTopics = sourceResults.flatMap(({ source, topicResult }) =>
      (topicResult.data || []).map((topic) => ({
        ...topic,
        subject: source.subject,
      })),
    ) as CoreTopic[];

    const loadedSkills = sourceResults.flatMap(({ source, skillResult }) =>
      (skillResult.data || []).map((skill) => ({
        ...skill,
        subject: source.subject,
      })),
    ) as CoreSkill[];

    const loadedQuizzes = sourceResults.flatMap(({ source, quizResult }) =>
      (quizResult.data || []).map((quiz) => ({
        ...quiz,
        subject: source.subject,
      })),
    ) as CoreQuiz[];

    loadedTopics.sort(
      (a, b) =>
        a.subject.localeCompare(b.subject) ||
        a.primary_level - b.primary_level ||
        a.sort_order - b.sort_order,
    );
    loadedSkills.sort(
      (a, b) =>
        a.subject.localeCompare(b.subject) || a.sort_order - b.sort_order,
    );
    loadedQuizzes.sort((a, b) =>
      a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
    );

    setTopics(loadedTopics);
    setSkills(loadedSkills);
    setQuizzes(loadedQuizzes);

    const { data: auditData, error: auditError } = await supabase
      .from("core_content_audit_log")
      .select(
        "id, user_id, entity_type, entity_id, quiz_id, subject, action, before_data, after_data, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1500);

    if (auditError) {
      setAuditEntries([]);
      setHistoryError(
        `${auditError.message}. Run the Quiz Builder V3 SQL migration before using Edit History.`,
      );
    } else {
      setAuditEntries((auditData || []) as CurriculumAuditEntry[]);
    }

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
          <NavButton
            active={section === "history"}
            label="Edit History"
            icon="↺"
            onClick={() => setSection("history")}
          />

          <div style={sidebarNote}>
            Admins and curriculum leads can create, edit and publish English and
            Mathematics quizzes. Published edits go live immediately.
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
          ) : section === "review" ? (
            <ReviewQueueView
              role={role}
              quizzes={quizzes}
              topics={topics}
              onOpenQuiz={openQuiz}
              onDataChanged={loadContent}
            />
          ) : (
            <EditHistoryView
              entries={auditEntries}
              quizzes={quizzes}
              topics={topics}
              error={historyError}
              onOpenQuiz={openQuiz}
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
  boxSizing: "border-box",
  margin: "0 auto",
  padding: "14px",
  display: "flex",
  flexWrap: "wrap",
  gap: "14px",
};
const sidebar: CSSProperties = {
  flex: "1 1 210px",
  width: "min(100%,240px)",
  maxWidth: "240px",
  position: "sticky",
  top: "82px",
  alignSelf: "start",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(4,18,43,0.77)",
  padding: "13px",
  display: "grid",
  gap: "8px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  backdropFilter: "blur(14px)",
};
const sidebarEyebrow: CSSProperties = {
  margin: "3px 4px 7px",
  color: "rgba(255,255,255,0.48)",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.16em",
};
const navButton: CSSProperties = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(255,255,255,0.035)",
  color: "white",
  display: "grid",
  gridTemplateColumns: "28px 1fr auto",
  alignItems: "center",
  gap: "7px",
  padding: "0 11px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 800,
};
const navIcon: CSSProperties = {
  color: "#7ee8ff",
  fontSize: "17px",
  textAlign: "center",
};
const navBadge: CSSProperties = {
  minWidth: "20px",
  height: "20px",
  borderRadius: "999px",
  background: "rgba(255,215,106,0.18)",
  color: "#ffe6a8",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 5px",
  fontSize: "9px",
};
const sidebarNote: CSSProperties = {
  marginTop: "8px",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(126,232,255,0.045)",
  color: "rgba(255,255,255,0.58)",
  padding: "11px",
  fontSize: "10px",
  lineHeight: 1.55,
};
const workspace: CSSProperties = {
  flex: "10 1 760px",
  minWidth: "min(100%,620px)",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(2,12,31,0.72)",
  padding: "clamp(16px,2.5vw,28px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
  backdropFilter: "blur(18px)",
};
const messageCard: CSSProperties = {
  width: "min(560px,calc(100% - 32px))",
  margin: "100px auto",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(4,20,48,0.78)",
  padding: "28px",
  textAlign: "center",
};
const lockedCard: CSSProperties = {
  ...messageCard,
  textAlign: "left",
};
const mutedText: CSSProperties = {
  color: "rgba(255,255,255,0.62)",
  lineHeight: 1.6,
};
const errorText: CSSProperties = { color: "#fecaca" };
const primaryButton: CSSProperties = {
  minHeight: "42px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.38)",
  background: "linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.28))",
  color: "white",
  padding: "0 15px",
  cursor: "pointer",
  fontWeight: 900,
};
const errorBanner: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "12px",
};
