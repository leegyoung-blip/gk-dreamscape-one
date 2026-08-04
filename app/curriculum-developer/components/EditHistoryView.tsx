"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  CoreQuiz,
  CoreSubject,
  CoreTopic,
  CurriculumAuditEntry,
  JsonObject,
} from "../types";

const SUBJECT_LABELS: Record<CoreSubject, string> = {
  english: "English",
  math: "Mathematics",
};

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  submitted: "Submitted for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
  deleted: "Deleted",
  reordered: "Questions reordered",
};

const IGNORED_DIFF_KEYS = new Set([
  "updated_at",
  "updated_by",
  "reviewed_at",
  "reviewed_by",
  "submitted_at",
  "submitted_by",
  "published_at",
  "version",
]);

function compactValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    return value.length > 90 ? `${value.slice(0, 87)}...` : value;
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  return "Updated content";
}

function changedFields(before: JsonObject | null, after: JsonObject | null) {
  if (!before || !after) return [];
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys
    .filter((key) => !IGNORED_DIFF_KEYS.has(key))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      key,
      before: compactValue(before[key]),
      after: compactValue(after[key]),
    }));
}

function entityCode(entry: CurriculumAuditEntry) {
  return String(
    entry.after_data?.code ||
      entry.before_data?.code ||
      entry.after_data?.title ||
      entry.before_data?.title ||
      entry.entity_id,
  );
}

export default function EditHistoryView({
  entries,
  quizzes,
  topics,
  error,
  onOpenQuiz,
}: {
  entries: CurriculumAuditEntry[];
  quizzes: CoreQuiz[];
  topics: CoreTopic[];
  error: string | null;
  onOpenQuiz: (quizId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<"all" | CoreSubject>("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const quizMap = useMemo(
    () => new Map(quizzes.map((quiz) => [quiz.id, quiz])),
    [quizzes],
  );
  const topicMap = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic])),
    [topics],
  );

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const resolvedQuizId =
        entry.quiz_id || (entry.entity_type === "quiz" ? entry.entity_id : null);
      const quiz = resolvedQuizId ? quizMap.get(resolvedQuizId) : undefined;
      const topic = quiz ? topicMap.get(quiz.topic_id) : undefined;
      const subject = entry.subject || quiz?.subject || null;

      if (subjectFilter !== "all" && subject !== subjectFilter) return false;
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      if (entityFilter !== "all" && entry.entity_type !== entityFilter) return false;

      if (!query) return true;

      const haystack = [
        entry.action,
        entry.entity_type,
        entry.user_id,
        entry.notes,
        entityCode(entry),
        quiz?.code,
        quiz?.title,
        quiz?.status,
        topic?.title,
        topic?.short_title,
        subject,
        topic ? `p${topic.primary_level}` : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [
    actionFilter,
    entityFilter,
    entries,
    quizMap,
    search,
    subjectFilter,
    topicMap,
  ]);

  return (
    <div>
      <div style={headingRow}>
        <div>
          <p style={eyebrow}>AUDIT TRAIL</p>
          <h1 style={title}>Edit History</h1>
          <p style={description}>
            Review quiz settings, question edits, publishing actions and workflow
            changes across English and Mathematics.
          </p>
        </div>
        <div style={countPill}>{filteredEntries.length} records</div>
      </div>

      {error && <div style={errorBanner}>{error}</div>}

      <div style={filterGrid}>
        <label style={fieldLabel}>
          Search history
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Quiz title, code, question or action"
            style={input}
          />
        </label>

        <label style={fieldLabel}>
          Subject
          <select
            value={subjectFilter}
            onChange={(event) =>
              setSubjectFilter(event.target.value as "all" | CoreSubject)
            }
            style={input}
          >
            <option value="all">All subjects</option>
            <option value="english">English</option>
            <option value="math">Mathematics</option>
          </select>
        </label>

        <label style={fieldLabel}>
          Action
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            style={input}
          >
            <option value="all">All actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldLabel}>
          Item type
          <select
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            style={input}
          >
            <option value="all">All items</option>
            <option value="quiz">Quizzes</option>
            <option value="question">Questions</option>
            <option value="stimulus">Stimuli</option>
            <option value="asset">Media assets</option>
          </select>
        </label>
      </div>

      <div style={historyList}>
        {filteredEntries.length === 0 ? (
          <div style={emptyState}>
            No edit-history records match the current filters.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const resolvedQuizId =
              entry.quiz_id ||
              (entry.entity_type === "quiz" ? entry.entity_id : null);
            const quiz = resolvedQuizId ? quizMap.get(resolvedQuizId) : undefined;
            const topic = quiz ? topicMap.get(quiz.topic_id) : undefined;
            const subject = entry.subject || quiz?.subject || null;
            const diffs = changedFields(entry.before_data, entry.after_data);

            return (
              <article key={entry.id} style={historyCard}>
                <div style={cardTopRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={pillRow}>
                      <span style={actionPill}>
                        {ACTION_LABELS[entry.action] ||
                          entry.action.replaceAll("_", " ")}
                      </span>
                      <span style={entityPill}>{entry.entity_type}</span>
                      {subject && (
                        <span style={subjectPill}>
                          {SUBJECT_LABELS[subject]}
                        </span>
                      )}
                    </div>

                    <h2 style={recordTitle}>
                      {quiz?.title || entityCode(entry)}
                    </h2>
                    <p style={recordMeta}>
                      {quiz?.code || entityCode(entry)}
                      {topic
                        ? ` · ${SUBJECT_LABELS[topic.subject]} P${topic.primary_level} · ${topic.title}`
                        : ""}
                    </p>
                  </div>

                  <div style={rightMeta}>
                    <time dateTime={entry.created_at}>
                      {new Date(entry.created_at).toLocaleString("en-SG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                    <span>Editor {entry.user_id.slice(0, 8)}</span>
                  </div>
                </div>

                {entry.notes && <div style={notesBox}>{entry.notes}</div>}

                {diffs.length > 0 && (
                  <div style={diffList}>
                    {diffs.slice(0, 6).map((diff) => (
                      <div key={diff.key} style={diffRow}>
                        <strong style={diffKey}>
                          {diff.key.replaceAll("_", " ")}
                        </strong>
                        <span style={beforeValue}>{diff.before}</span>
                        <span style={arrow}>→</span>
                        <span style={afterValue}>{diff.after}</span>
                      </div>
                    ))}
                    {diffs.length > 6 && (
                      <span style={moreText}>
                        +{diffs.length - 6} more changed fields
                      </span>
                    )}
                  </div>
                )}

                <div style={cardActions}>
                  {quiz && (
                    <button
                      type="button"
                      onClick={() => onOpenQuiz(quiz.id)}
                      style={openButton}
                    >
                      Open Quiz
                    </button>
                  )}

                  {(entry.before_data || entry.after_data) && (
                    <details style={detailsBox}>
                      <summary style={summary}>View saved record</summary>
                      <div style={jsonGrid}>
                        {entry.before_data && (
                          <div>
                            <p style={jsonHeading}>Before</p>
                            <pre style={pre}>
                              {JSON.stringify(entry.before_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {entry.after_data && (
                          <div>
                            <p style={jsonHeading}>After</p>
                            <pre style={pre}>
                              {JSON.stringify(entry.after_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

const headingRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "14px",
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
  maxWidth: "760px",
  color: "rgba(255,255,255,0.66)",
  lineHeight: 1.55,
};
const countPill: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.26)",
  background: "rgba(126,232,255,0.08)",
  color: "#bcefff",
  padding: "9px 12px",
  fontSize: "10px",
  fontWeight: 900,
};
const filterGrid: CSSProperties = {
  marginTop: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))",
  gap: "10px",
};
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "rgba(255,255,255,0.67)",
  fontSize: "10px",
  fontWeight: 800,
};
const input: CSSProperties = {
  width: "100%",
  minHeight: "42px",
  boxSizing: "border-box",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "0 11px",
  outline: "none",
};
const historyList: CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gap: "11px",
};
const historyCard: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(4,20,48,0.58)",
  padding: "15px",
};
const cardTopRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
};
const pillRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};
const actionPill: CSSProperties = {
  borderRadius: "999px",
  background: "rgba(74,222,128,0.12)",
  color: "#bbf7d0",
  padding: "5px 8px",
  fontSize: "8px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const entityPill: CSSProperties = {
  ...actionPill,
  background: "rgba(126,232,255,0.1)",
  color: "#bcefff",
};
const subjectPill: CSSProperties = {
  ...actionPill,
  background: "rgba(198,166,255,0.11)",
  color: "#eadcff",
};
const recordTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "20px",
  overflowWrap: "anywhere",
};
const recordMeta: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.54)",
  fontSize: "10px",
};
const rightMeta: CSSProperties = {
  display: "grid",
  gap: "4px",
  color: "rgba(255,255,255,0.48)",
  fontSize: "9px",
  textAlign: "right",
};
const notesBox: CSSProperties = {
  marginTop: "11px",
  borderRadius: "10px",
  background: "rgba(255,215,106,0.08)",
  color: "#ffe6a8",
  padding: "9px",
  fontSize: "10px",
};
const diffList: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gap: "6px",
};
const diffRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(100px,0.7fr) minmax(0,1fr) auto minmax(0,1fr)",
  alignItems: "center",
  gap: "8px",
  borderRadius: "9px",
  background: "rgba(255,255,255,0.035)",
  padding: "8px 9px",
  fontSize: "9px",
};
const diffKey: CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  textTransform: "capitalize",
};
const beforeValue: CSSProperties = {
  color: "#fecaca",
  overflowWrap: "anywhere",
};
const arrow: CSSProperties = { color: "rgba(255,255,255,0.35)" };
const afterValue: CSSProperties = {
  color: "#bbf7d0",
  overflowWrap: "anywhere",
};
const moreText: CSSProperties = {
  color: "rgba(255,255,255,0.48)",
  fontSize: "9px",
};
const cardActions: CSSProperties = {
  marginTop: "12px",
  display: "flex",
  alignItems: "flex-start",
  gap: "9px",
  flexWrap: "wrap",
};
const openButton: CSSProperties = {
  minHeight: "36px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(126,232,255,0.09)",
  color: "white",
  padding: "0 11px",
  cursor: "pointer",
  fontWeight: 800,
};
const detailsBox: CSSProperties = {
  minWidth: "min(720px,100%)",
  flex: 1,
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(0,0,0,0.12)",
  padding: "9px 10px",
};
const summary: CSSProperties = {
  cursor: "pointer",
  color: "#bcefff",
  fontSize: "10px",
  fontWeight: 800,
};
const jsonGrid: CSSProperties = {
  marginTop: "10px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: "10px",
};
const jsonHeading: CSSProperties = {
  margin: "0 0 5px",
  color: "rgba(255,255,255,0.56)",
  fontSize: "9px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const pre: CSSProperties = {
  margin: 0,
  maxHeight: "340px",
  overflow: "auto",
  borderRadius: "8px",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(255,255,255,0.72)",
  padding: "9px",
  fontSize: "8px",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};
const emptyState: CSSProperties = {
  borderRadius: "17px",
  border: "1px dashed rgba(126,232,255,0.25)",
  padding: "30px",
  color: "rgba(255,255,255,0.56)",
  textAlign: "center",
};
const errorBanner: CSSProperties = {
  marginTop: "14px",
  borderRadius: "11px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "10px",
};
