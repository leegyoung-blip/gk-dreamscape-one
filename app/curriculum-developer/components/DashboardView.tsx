"use client";

import type { CSSProperties } from "react";
import type { CoreQuiz, CoreTopic } from "../types";

export default function DashboardView({
  topics,
  quizzes,
  onCreateQuiz,
  onOpenQuiz,
}: {
  topics: CoreTopic[];
  quizzes: CoreQuiz[];
  onCreateQuiz: () => void;
  onOpenQuiz: (quizId: string) => void;
}) {
  const published = quizzes.filter((quiz) => quiz.status === "published").length;
  const drafts = quizzes.filter((quiz) =>
    ["draft", "changes_requested"].includes(quiz.status),
  ).length;
  const awaitingReview = quizzes.filter((quiz) => quiz.status === "in_review").length;
  const approved = quizzes.filter((quiz) => quiz.status === "approved").length;

  const recent = [...quizzes]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 6);

  return (
    <div>
      <div style={headingRow}>
        <div>
          <p style={eyebrow}>CURRICULUM OVERVIEW</p>
          <h1 style={title}>Content Dashboard</h1>
          <p style={description}>
            Track quiz production, review progress and published curriculum content.
          </p>
        </div>
        <button type="button" onClick={onCreateQuiz} style={primaryButton}>
          + Create New Quiz
        </button>
      </div>

      <div style={statsGrid}>
        <StatCard label="Published" value={published} accent="#86efac" />
        <StatCard label="Drafts" value={drafts} accent="#7ee8ff" />
        <StatCard label="Awaiting Review" value={awaitingReview} accent="#ffd76a" />
        <StatCard label="Approved" value={approved} accent="#c6a6ff" />
      </div>

      <div style={twoColumnGrid}>
        <section style={panel}>
          <div style={panelHeading}>
            <div>
              <p style={smallEyebrow}>CURRICULUM TARGETS</p>
              <h2 style={panelTitle}>Topic Progress</h2>
            </div>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Level</th>
                  <th style={th}>Topic</th>
                  <th style={th}>Target</th>
                  <th style={th}>Published</th>
                  <th style={th}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => {
                  const topicQuizzes = quizzes.filter(
                    (quiz) => quiz.topic_id === topic.id,
                  );
                  const topicPublished = topicQuizzes.filter(
                    (quiz) => quiz.status === "published",
                  ).length;
                  return (
                    <tr key={topic.id}>
                      <td style={td}>
                        {topic.subject === "english" ? "English" : "Math"} P
                        {topic.primary_level}
                      </td>
                      <td style={td}>{topic.short_title}</td>
                      <td style={td}>{topic.quiz_target}</td>
                      <td style={td}>{topicPublished}</td>
                      <td style={td}>
                        {Math.max(0, topic.quiz_target - topicPublished)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section style={panel}>
          <div style={panelHeading}>
            <div>
              <p style={smallEyebrow}>RECENT ACTIVITY</p>
              <h2 style={panelTitle}>Recently Updated</h2>
            </div>
          </div>

          <div style={recentList}>
            {recent.length === 0 ? (
              <p style={mutedText}>No quizzes have been created yet.</p>
            ) : (
              recent.map((quiz) => (
                <button
                  type="button"
                  key={quiz.id}
                  onClick={() => onOpenQuiz(quiz.id)}
                  style={recentItem}
                >
                  <div>
                    <strong>{quiz.title}</strong>
                    <p style={recentMeta}>
                      {quiz.code} · {quiz.question_count} questions
                    </p>
                  </div>
                  <StatusBadge status={quiz.status} />
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div style={{ ...statCard, borderColor: `${accent}66` }}>
      <p style={{ ...statLabel, color: accent }}>{label}</p>
      <p style={statValue}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Draft",
    in_review: "In Review",
    changes_requested: "Changes Requested",
    approved: "Approved",
    published: "Published",
    archived: "Archived",
  };
  return <span style={statusBadge}>{labels[status] || status}</span>;
}

const headingRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};
const title: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "clamp(30px,4vw,48px)",
};
const description: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.66)",
};
const primaryButton: CSSProperties = {
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  color: "white",
  padding: "0 18px",
  fontWeight: 900,
  cursor: "pointer",
};
const statsGrid: CSSProperties = {
  marginTop: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "12px",
};
const statCard: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.055)",
  padding: "17px",
};
const statLabel: CSSProperties = {
  margin: 0,
  fontSize: "10px",
  letterSpacing: "0.12em",
  fontWeight: 900,
  textTransform: "uppercase",
};
const statValue: CSSProperties = {
  margin: "7px 0 0",
  fontSize: "32px",
  fontWeight: 900,
};
const twoColumnGrid: CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(430px,100%),1fr))",
  gap: "14px",
};
const panel: CSSProperties = {
  minWidth: 0,
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.23)",
  background: "rgba(4,20,48,0.62)",
  padding: "17px",
};
const panelHeading: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const smallEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.14em",
  fontWeight: 900,
};
const panelTitle: CSSProperties = { margin: "4px 0 0", fontSize: "22px" };
const tableWrap: CSSProperties = { marginTop: "12px", overflowX: "auto" };
const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
};
const th: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  color: "#9cecff",
  borderBottom: "1px solid rgba(126,232,255,0.2)",
};
const td: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const recentList: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gap: "8px",
};
const recentItem: CSSProperties = {
  width: "100%",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  padding: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  textAlign: "left",
  cursor: "pointer",
};
const recentMeta: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.52)",
  fontSize: "10px",
};
const statusBadge: CSSProperties = {
  flexShrink: 0,
  borderRadius: "999px",
  background: "rgba(126,232,255,0.13)",
  color: "#bcefff",
  padding: "6px 9px",
  fontSize: "9px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const mutedText: CSSProperties = { color: "rgba(255,255,255,0.58)" };
