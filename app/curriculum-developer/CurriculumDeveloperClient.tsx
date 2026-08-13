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
import AssetDeploymentView from "./components/AssetDeploymentView";
import type {
  CoreQuiz,
  CoreSkill,
  CoreSubject,
  CoreTopic,
  CurriculumAuditEntry,
} from "./types";

type Section = "dashboard" | "builder" | "review" | "history" | "deployment";

const QUIZ_PAGE_SIZE = 500;

const QUIZ_SELECT =
  "id, topic_id, skill_id, code, title, description, quiz_type, difficulty, question_count, estimated_minutes, passing_percentage, quiz_order, reward_tokens, reward_gems, feedback_mode, randomise_questions, randomise_options, is_published, status, created_by, updated_by, submitted_by, submitted_at, reviewed_by, reviewed_at, review_notes, version, created_at, updated_at";

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

async function loadAllQuizzes(table: string) {
  const rows: Record<string, any>[] = [];

  for (let from = 0; ; from += QUIZ_PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(QUIZ_SELECT)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + QUIZ_PAGE_SIZE - 1);

    if (error) {
      return { data: null, error };
    }

    const page = data || [];
    rows.push(...page);

    if (page.length < QUIZ_PAGE_SIZE) break;
  }

  return { data: rows, error: null };
}

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
          loadAllQuizzes(source.quizzes),
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
      <main id="curriculum-developer-root" style={pageShell}>
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
    <main id="curriculum-developer-root" style={pageShell}>
      <header className="curriculum-header" style={header}>
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

      <div className="curriculum-layout" style={appGrid}>
        <aside className="curriculum-sidebar" style={sidebar}>
          <p className="curriculum-sidebar-eyebrow" style={sidebarEyebrow}>CONTENT WORKSPACE</p>
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
            active={false}
            label="Learning Skills"
            icon="◎"
            onClick={() =>
              router.push("/curriculum-developer/learning-skills")
            }
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

          {role === "admin" && (
            <NavButton
              active={section === "deployment"}
              label="Asset Deployment"
              icon="⇧"
              onClick={() => setSection("deployment")}
            />
          )}

          <div className="curriculum-sidebar-note" style={sidebarNote}>
            Admins and curriculum leads can create, edit and publish English and
            Mathematics quizzes. Published edits go live immediately.
          </div>
        </aside>

        <section className="curriculum-workspace" style={workspace}>
          {section === "deployment" ? (
            <AssetDeploymentView />
          ) : loading ? (
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

      <style jsx global>{`
        #curriculum-developer-root {
          background: #071226;
        }

        #curriculum-developer-root button,
        #curriculum-developer-root input,
        #curriculum-developer-root select,
        #curriculum-developer-root textarea {
          font-family: inherit;
          font-size: 15px !important;
        }

        #curriculum-developer-root label,
        #curriculum-developer-root summary,
        #curriculum-developer-root th,
        #curriculum-developer-root td {
          font-size: 14px !important;
        }

        #curriculum-developer-root small {
          font-size: 13px !important;
        }

        #curriculum-developer-root .curriculum-workspace p {
          font-size: 14px !important;
        }

        #curriculum-developer-root .curriculum-workspace .curriculum-page-description {
          font-size: 17px !important;
          line-height: 1.6 !important;
        }

        @media (max-width: 980px) {
          .curriculum-layout {
            display: block !important;
          }

          .curriculum-sidebar {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            border-right: 0 !important;
            border-bottom: 1px solid rgba(126,232,255,0.18) !important;
          }

          .curriculum-sidebar-eyebrow,
          .curriculum-sidebar-note {
            grid-column: 1 / -1;
          }

          .curriculum-workspace {
            border-left: 0 !important;
            padding: 24px 18px 40px !important;
          }
        }

        @media (max-width: 640px) {
          .curriculum-header {
            grid-template-columns: 1fr auto !important;
          }

          .curriculum-header > div:nth-child(2) {
            display: none;
          }

          .curriculum-sidebar {
            grid-template-columns: 1fr !important;
          }

          .curriculum-sidebar-eyebrow,
          .curriculum-sidebar-note {
            grid-column: auto;
          }
        }
      `}</style>
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
      className="curriculum-nav-button"
      style={{
        ...navButton,
        background: active ? "rgba(83,215,255,0.15)" : navButton.background,
        borderColor: active
          ? "rgba(126,232,255,0.52)"
          : "rgba(126,232,255,0.12)",
      }}
    >
      <span className="curriculum-nav-icon" style={navIcon}>{icon}</span>
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
  return <main id="curriculum-developer-root" style={pageShell}>{content}</main>;
}

const pageShell: CSSProperties = {
  minHeight: "100dvh",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  background: "#071226",
  fontSize: "16px",
};
const header: CSSProperties = {
  minHeight: "72px",
  padding: "10px 18px",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: "12px",
  position: "sticky",
  top: 0,
  zIndex: 50,
  borderBottom: "1px solid rgba(126,232,255,0.2)",
  background: "#0a1730",
};
const backButton: CSSProperties = {
  justifySelf: "start",
  minHeight: "46px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 16px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 800,
};
const headerTitle: CSSProperties = { textAlign: "center" };
const brandEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "12px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};
const headerSubtitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "18px",
  fontWeight: 900,
};
const rolePill: CSSProperties = {
  justifySelf: "end",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.32)",
  background: "rgba(255,215,106,0.09)",
  color: "#ffe6a8",
  padding: "9px 14px",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const appGrid: CSSProperties = {
  width: "100%",
  minHeight: "calc(100dvh - 72px)",
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "270px minmax(0,1fr)",
  gap: 0,
  alignItems: "stretch",
};
const sidebar: CSSProperties = {
  width: "100%",
  maxWidth: "none",
  minHeight: "calc(100dvh - 72px)",
  position: "sticky",
  top: "72px",
  alignSelf: "start",
  boxSizing: "border-box",
  borderRadius: 0,
  border: 0,
  borderRight: "1px solid rgba(126,232,255,0.18)",
  background: "#0a1730",
  padding: "22px 18px",
  display: "grid",
  alignContent: "start",
  gap: "10px",
  overflowY: "auto",
};
const sidebarEyebrow: CSSProperties = {
  margin: "3px 4px 7px",
  color: "rgba(255,255,255,0.48)",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.16em",
};
const navButton: CSSProperties = {
  width: "100%",
  minHeight: "52px",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(255,255,255,0.035)",
  color: "white",
  display: "grid",
  gridTemplateColumns: "28px 1fr auto",
  alignItems: "center",
  gap: "7px",
  padding: "0 14px",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 800,
};
const navIcon: CSSProperties = {
  color: "#7ee8ff",
  fontSize: "19px",
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
  fontSize: "11px",
};
const sidebarNote: CSSProperties = {
  marginTop: "8px",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(126,232,255,0.045)",
  color: "rgba(255,255,255,0.58)",
  padding: "13px",
  fontSize: "13px",
  lineHeight: 1.65,
};
const workspace: CSSProperties = {
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 0,
  border: 0,
  background: "#071226",
  padding: "30px clamp(24px,3vw,52px) 48px",
};
const messageCard: CSSProperties = {
  width: "min(560px,calc(100% - 32px))",
  margin: "100px auto",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(4,20,48,0.78)",
  padding: "32px",
  textAlign: "center",
  fontSize: "16px",
};
const lockedCard: CSSProperties = {
  ...messageCard,
  textAlign: "left",
};
const mutedText: CSSProperties = {
  color: "rgba(255,255,255,0.62)",
  lineHeight: 1.65,
  fontSize: "15px",
};
const errorText: CSSProperties = { color: "#fecaca" };
const primaryButton: CSSProperties = {
  minHeight: "46px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.38)",
  background: "linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.28))",
  color: "white",
  padding: "0 17px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 900,
};
const errorBanner: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "14px",
  fontSize: "14px",
};
