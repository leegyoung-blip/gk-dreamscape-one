"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import AssetDeploymentView from "./AssetDeploymentView";
import type {
  CoreSubject,
  CurriculumInventoryPayload,
  CurriculumInventoryTopic,
  CurriculumOperation,
  CurriculumOperationPreview,
  CurriculumRole,
} from "../types";

type OperationsTab = "inventory" | "import" | "assets" | "history";
type SubjectFilter = "all" | CoreSubject;
type LevelFilter = "all" | "1" | "2" | "3" | "4" | "5" | "6";

const emptySummary: CurriculumInventoryPayload["summary"] = {
  topic_count: 0,
  active_topic_count: 0,
  inactive_topic_count: 0,
  quiz_count: 0,
  published_quiz_count: 0,
  archived_quiz_count: 0,
  question_count: 0,
  asset_count: 0,
  attempt_count: 0,
};

export default function CurriculumOperationsView({
  role,
}: {
  role: CurriculumRole;
}) {
  const [tab, setTab] = useState<OperationsTab>("inventory");
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [inventory, setInventory] = useState<CurriculumInventoryPayload | null>(null);
  const [operations, setOperations] = useState<CurriculumOperation[]>([]);
  const [preview, setPreview] = useState<CurriculumOperationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: inventoryError } = await supabase.rpc(
      "curriculum_get_operations_inventory",
      {
        p_subject: subject === "all" ? null : subject,
        p_primary_level: level === "all" ? null : Number(level),
        p_include_inactive: true,
      },
    );

    if (inventoryError) {
      setInventory(null);
      setError(
        `${inventoryError.message}. Run the Curriculum Operations Phase 1 SQL migration first.`,
      );
    } else {
      setInventory(data as unknown as CurriculumInventoryPayload);
    }
    setLoading(false);
  }, [level, subject]);

  const loadHistory = useCallback(async () => {
    const { data, error: historyError } = await supabase
      .from("curriculum_operations")
      .select(
        "id,operation_type,scope_type,subject,primary_level,target_ids,status,preview_data,result_data,requested_by,created_at,completed_at,error_message",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (historyError) {
      setError(
        `${historyError.message}. Run the Curriculum Operations Phase 1 SQL migration first.`,
      );
      setOperations([]);
    } else {
      setOperations((data || []) as unknown as CurriculumOperation[]);
    }
  }, []);

  useEffect(() => {
    if (tab === "inventory") void loadInventory();
    if (tab === "history") void loadHistory();
  }, [loadHistory, loadInventory, tab]);

  const visibleTopics = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return inventory?.topics || [];
    return (inventory?.topics || []).filter((topic) =>
      [topic.title, topic.short_title, topic.slug, `p${topic.primary_level}`]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [inventory?.topics, search]);

  async function previewTopic(topic: CurriculumInventoryTopic) {
    setPreviewingId(topic.id);
    setPreview(null);
    setError(null);

    const { data, error: previewError } = await supabase.rpc(
      "curriculum_preview_operation_scope",
      {
        p_subject: topic.subject,
        p_scope_type: "topic",
        p_target_ids: [topic.id],
      },
    );

    if (previewError) setError(previewError.message);
    else setPreview(data as unknown as CurriculumOperationPreview);
    setPreviewingId(null);
  }

  return (
    <div style={shell}>
      <div>
        <p style={eyebrow}>CURRICULUM OPERATIONS</p>
        <h1 style={title}>Manage, import and deploy curriculum</h1>
        <p className="curriculum-page-description" style={description}>
          Review curriculum impact before making bulk changes. Phase 1 is
          read-only: previews do not alter any topics, quizzes or student data.
        </p>
      </div>

      <div style={tabBar}>
        <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
          Quiz Management
        </TabButton>
        <TabButton active={tab === "import"} onClick={() => setTab("import")}>
          Quiz Import
        </TabButton>
        {role === "admin" && (
          <TabButton active={tab === "assets"} onClick={() => setTab("assets")}>
            Asset Deployment
          </TabButton>
        )}
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          Deployment History
        </TabButton>
      </div>

      {error && <div style={errorBanner}>{error}</div>}

      {tab === "inventory" ? (
        <InventoryPanel
          inventory={inventory}
          visibleTopics={visibleTopics}
          loading={loading}
          subject={subject}
          level={level}
          search={search}
          preview={preview}
          previewingId={previewingId}
          onSubjectChange={setSubject}
          onLevelChange={setLevel}
          onSearchChange={setSearch}
          onRefresh={loadInventory}
          onPreview={previewTopic}
          onClosePreview={() => setPreview(null)}
        />
      ) : tab === "import" ? (
        <ComingSoonPanel
          title="Quiz Import activates in Phase 3"
          text="This area will validate CSV files, show additions and updates, and apply approved imports without creating duplicates. Missing CSV rows will never trigger automatic deletion."
        />
      ) : tab === "assets" && role === "admin" ? (
        <AssetDeploymentView />
      ) : (
        <HistoryPanel operations={operations} onRefresh={loadHistory} />
      )}

      <style jsx global>{`
        @media (max-width: 1180px) {
          .curriculum-operations-topic-row {
            grid-template-columns: 1fr !important;
          }

          .curriculum-operations-metrics {
            grid-template-columns: repeat(3, minmax(70px, 1fr)) !important;
          }
        }

        @media (max-width: 620px) {
          .curriculum-operations-metrics {
            grid-template-columns: repeat(2, minmax(70px, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}

function InventoryPanel({
  inventory,
  visibleTopics,
  loading,
  subject,
  level,
  search,
  preview,
  previewingId,
  onSubjectChange,
  onLevelChange,
  onSearchChange,
  onRefresh,
  onPreview,
  onClosePreview,
}: {
  inventory: CurriculumInventoryPayload | null;
  visibleTopics: CurriculumInventoryTopic[];
  loading: boolean;
  subject: SubjectFilter;
  level: LevelFilter;
  search: string;
  preview: CurriculumOperationPreview | null;
  previewingId: string | null;
  onSubjectChange: (value: SubjectFilter) => void;
  onLevelChange: (value: LevelFilter) => void;
  onSearchChange: (value: string) => void;
  onRefresh: () => Promise<void>;
  onPreview: (topic: CurriculumInventoryTopic) => Promise<void>;
  onClosePreview: () => void;
}) {
  const summary = inventory?.summary || emptySummary;

  return (
    <div style={panelStack}>
      <div style={phaseBanner}>
        <strong>Safe mode:</strong> topic and quiz actions are disabled until
        Phase 2. Use Preview impact to inspect dependencies now.
      </div>

      <div style={filters}>
        <label style={fieldLabel}>
          Subject
          <select
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value as SubjectFilter)}
            style={field}
          >
            <option value="all">All subjects</option>
            <option value="english">English</option>
            <option value="math">Mathematics</option>
          </select>
        </label>
        <label style={fieldLabel}>
          Level
          <select
            value={level}
            onChange={(event) => onLevelChange(event.target.value as LevelFilter)}
            style={field}
          >
            <option value="all">All levels</option>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={String(value)}>Primary {value}</option>
            ))}
          </select>
        </label>
        <label style={{ ...fieldLabel, flex: "1 1 260px" }}>
          Search topics
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="e.g. oral, listening or fractions"
            style={field}
          />
        </label>
        <button type="button" onClick={() => void onRefresh()} style={secondaryButton}>
          Refresh
        </button>
      </div>

      <div style={summaryGrid}>
        <SummaryCard label="Topics" value={summary.topic_count} detail={`${summary.inactive_topic_count} inactive`} />
        <SummaryCard label="Quizzes" value={summary.quiz_count} detail={`${summary.published_quiz_count} published`} />
        <SummaryCard label="Questions" value={summary.question_count} detail={`${summary.asset_count} assets`} />
        <SummaryCard label="Student attempts" value={summary.attempt_count} detail="Preserved during archive" />
      </div>

      {preview && <PreviewPanel preview={preview} onClose={onClosePreview} />}

      <div style={listHeader}>
        <div>
          <h2 style={sectionTitle}>Topic inventory</h2>
          <p style={smallText}>{visibleTopics.length} topic(s) shown</p>
        </div>
      </div>

      {loading ? (
        <div style={emptyCard}>Loading curriculum inventory...</div>
      ) : visibleTopics.length === 0 ? (
        <div style={emptyCard}>No topics match these filters.</div>
      ) : (
        <div style={topicList}>
          {visibleTopics.map((topic) => (
            <TopicRow
              key={`${topic.subject}:${topic.id}`}
              topic={topic}
              previewing={previewingId === topic.id}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicRow({
  topic,
  previewing,
  onPreview,
}: {
  topic: CurriculumInventoryTopic;
  previewing: boolean;
  onPreview: (topic: CurriculumInventoryTopic) => Promise<void>;
}) {
  return (
    <article className="curriculum-operations-topic-row" style={topicCard}>
      <div style={topicIdentity}>
        <div style={topicTags}>
          <span style={subjectTag}>{topic.subject}</span>
          <span style={levelTag}>P{topic.primary_level}</span>
          <span style={topic.is_active ? activeTag : inactiveTag}>
            {topic.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <h3 style={topicTitle}>{topic.title}</h3>
        <p style={slugText}>{topic.slug}</p>
      </div>

      <div className="curriculum-operations-metrics" style={metrics}>
        <Metric label="Skills" value={topic.skill_count} />
        <Metric label="Quizzes" value={topic.quiz_count} />
        <Metric label="Published" value={topic.published_quiz_count} />
        <Metric label="Questions" value={topic.question_count} />
        <Metric label="Assets" value={topic.asset_count} />
        <Metric label="Attempts" value={topic.attempt_count} warning={topic.attempt_count > 0} />
      </div>

      <button
        type="button"
        onClick={() => void onPreview(topic)}
        disabled={previewing}
        style={secondaryButton}
      >
        {previewing ? "Checking..." : "Preview impact"}
      </button>
    </article>
  );
}

function PreviewPanel({
  preview,
  onClose,
}: {
  preview: CurriculumOperationPreview;
  onClose: () => void;
}) {
  const s = preview.summary;
  return (
    <section style={previewCard}>
      <div style={previewHeader}>
        <div>
          <p style={eyebrow}>ARCHIVE IMPACT PREVIEW</p>
          <h2 style={{ ...sectionTitle, marginTop: "6px" }}>
            {preview.topics.map((topic) => `P${topic.primary_level} ${topic.title}`).join(", ")}
          </h2>
        </div>
        <button type="button" onClick={onClose} style={closeButton}>Close</button>
      </div>
      <div style={previewGrid}>
        <Metric label="Topics" value={s.topic_count} />
        <Metric label="Skills" value={s.skill_count} />
        <Metric label="Quizzes" value={s.quiz_count} />
        <Metric label="Questions" value={s.question_count} />
        <Metric label="Assets" value={s.asset_count} />
        <Metric label="Attempts" value={s.attempt_count} warning={s.attempt_count > 0} />
        <Metric label="Answers" value={s.answer_count} warning={s.answer_count > 0} />
        <Metric label="Reward claims" value={s.reward_claim_count} warning={s.reward_claim_count > 0} />
      </div>
      {preview.warnings.map((warning) => (
        <div key={warning} style={warningBanner}>{warning}</div>
      ))}
      <p style={safeText}>
        Recommended action: <strong>Archive</strong>. Existing student history
        and curriculum records will be preserved and restorable.
      </p>
    </section>
  );
}

function HistoryPanel({
  operations,
  onRefresh,
}: {
  operations: CurriculumOperation[];
  onRefresh: () => Promise<void>;
}) {
  return (
    <div style={panelStack}>
      <div style={listHeader}>
        <div>
          <h2 style={sectionTitle}>Deployment History</h2>
          <p style={smallText}>Bulk curriculum changes will appear here.</p>
        </div>
        <button type="button" onClick={() => void onRefresh()} style={secondaryButton}>
          Refresh
        </button>
      </div>
      {operations.length === 0 ? (
        <div style={emptyCard}>
          No Curriculum Operations have been applied yet. This is expected in Phase 1.
        </div>
      ) : (
        <div style={topicList}>
          {operations.map((operation) => (
            <article key={operation.id} style={historyCard}>
              <div>
                <strong style={{ textTransform: "capitalize" }}>
                  {operation.operation_type.replaceAll("_", " ")}
                </strong>
                <p style={smallText}>
                  {operation.subject.toUpperCase()}
                  {operation.primary_level ? ` P${operation.primary_level}` : ""}
                  {` · ${operation.scope_type}`}
                </p>
              </div>
              <span style={activeTag}>{operation.status}</span>
              <time style={smallText}>{new Date(operation.created_at).toLocaleString()}</time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ComingSoonPanel({ title, text }: { title: string; text: string }) {
  return (
    <div style={emptyCard}>
      <h2 style={sectionTitle}>{title}</h2>
      <p style={description}>{text}</p>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButton,
        borderColor: active ? "rgba(126,232,255,0.7)" : tabButton.borderColor,
        background: active ? "rgba(83,215,255,0.14)" : tabButton.background,
        color: active ? "#ffffff" : "rgba(255,255,255,0.66)",
      }}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value.toLocaleString()}</strong>
      <span style={smallText}>{detail}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div style={metric}>
      <span style={metricLabel}>{label}</span>
      <strong style={{ color: warning ? "#ffd76a" : "white" }}>
        {value.toLocaleString()}
      </strong>
    </div>
  );
}

const shell: CSSProperties = { display: "grid", gap: "22px" };
const eyebrow: CSSProperties = { margin: 0, color: "#7ee8ff", fontSize: "12px", fontWeight: 900, letterSpacing: "0.16em" };
const title: CSSProperties = { margin: "7px 0 0", fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.06 };
const description: CSSProperties = { margin: "12px 0 0", color: "rgba(255,255,255,0.64)", lineHeight: 1.65, maxWidth: "880px" };
const tabBar: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "9px" };
const tabButton: CSSProperties = { minHeight: "44px", borderRadius: "12px", border: "1px solid rgba(126,232,255,0.16)", background: "rgba(255,255,255,0.035)", padding: "0 15px", cursor: "pointer", fontWeight: 850 };
const panelStack: CSSProperties = { display: "grid", gap: "18px" };
const phaseBanner: CSSProperties = { borderRadius: "13px", border: "1px solid rgba(126,232,255,0.28)", background: "rgba(45,212,191,0.08)", color: "#d8fffa", padding: "14px 16px", lineHeight: 1.55 };
const filters: CSSProperties = { display: "flex", alignItems: "end", flexWrap: "wrap", gap: "12px", borderRadius: "16px", border: "1px solid rgba(126,232,255,0.14)", background: "rgba(255,255,255,0.025)", padding: "16px" };
const fieldLabel: CSSProperties = { display: "grid", gap: "7px", color: "rgba(255,255,255,0.68)", fontSize: "12px", fontWeight: 850, flex: "0 1 180px" };
const field: CSSProperties = { width: "100%", minHeight: "44px", boxSizing: "border-box", borderRadius: "11px", border: "1px solid rgba(126,232,255,0.2)", background: "#0d1a31", color: "white", padding: "0 12px", outline: "none" };
const secondaryButton: CSSProperties = { minHeight: "44px", borderRadius: "11px", border: "1px solid rgba(126,232,255,0.3)", background: "rgba(83,215,255,0.09)", color: "white", padding: "0 14px", cursor: "pointer", fontWeight: 850 };
const summaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "12px" };
const summaryCard: CSSProperties = { minHeight: "120px", borderRadius: "16px", border: "1px solid rgba(126,232,255,0.16)", background: "rgba(13,29,57,0.78)", padding: "17px", display: "grid", alignContent: "center", gap: "5px" };
const summaryLabel: CSSProperties = { color: "#7ee8ff", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" };
const summaryValue: CSSProperties = { fontSize: "30px", lineHeight: 1.15 };
const listHeader: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" };
const sectionTitle: CSSProperties = { margin: 0, fontSize: "22px" };
const smallText: CSSProperties = { margin: "4px 0 0", color: "rgba(255,255,255,0.54)", fontSize: "13px", lineHeight: 1.45 };
const topicList: CSSProperties = { display: "grid", gap: "10px" };
const topicCard: CSSProperties = { borderRadius: "16px", border: "1px solid rgba(126,232,255,0.14)", background: "rgba(13,29,57,0.68)", padding: "16px", display: "grid", gridTemplateColumns: "minmax(210px,1.2fr) minmax(360px,2fr) auto", alignItems: "center", gap: "16px" };
const topicIdentity: CSSProperties = { minWidth: 0 };
const topicTags: CSSProperties = { display: "flex", gap: "6px", flexWrap: "wrap" };
const subjectTag: CSSProperties = { borderRadius: "999px", background: "rgba(126,232,255,0.13)", color: "#aef2ff", padding: "4px 8px", fontSize: "11px", fontWeight: 900, textTransform: "uppercase" };
const levelTag: CSSProperties = { ...subjectTag, background: "rgba(167,139,250,0.13)", color: "#d8caff" };
const activeTag: CSSProperties = { ...subjectTag, background: "rgba(52,211,153,0.13)", color: "#9fffd4" };
const inactiveTag: CSSProperties = { ...subjectTag, background: "rgba(248,113,113,0.13)", color: "#fecaca" };
const topicTitle: CSSProperties = { margin: "8px 0 0", fontSize: "17px" };
const slugText: CSSProperties = { ...smallText, overflow: "hidden", textOverflow: "ellipsis" };
const metrics: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6,minmax(58px,1fr))", gap: "7px" };
const metric: CSSProperties = { borderRadius: "10px", background: "rgba(255,255,255,0.035)", padding: "9px", display: "grid", gap: "3px", textAlign: "center" };
const metricLabel: CSSProperties = { color: "rgba(255,255,255,0.48)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" };
const previewCard: CSSProperties = { borderRadius: "18px", border: "1px solid rgba(255,215,106,0.35)", background: "rgba(255,215,106,0.055)", padding: "18px", display: "grid", gap: "14px" };
const previewHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "start", gap: "14px" };
const previewGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: "8px" };
const closeButton: CSSProperties = { ...secondaryButton, minHeight: "38px" };
const warningBanner: CSSProperties = { borderRadius: "11px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.09)", color: "#ffe6a8", padding: "12px", lineHeight: 1.5 };
const safeText: CSSProperties = { margin: 0, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 };
const emptyCard: CSSProperties = { borderRadius: "17px", border: "1px dashed rgba(126,232,255,0.2)", background: "rgba(255,255,255,0.025)", color: "rgba(255,255,255,0.66)", padding: "28px", lineHeight: 1.6 };
const historyCard: CSSProperties = { ...topicCard, gridTemplateColumns: "1fr auto auto" };
const errorBanner: CSSProperties = { borderRadius: "12px", border: "1px solid rgba(248,113,113,0.42)", background: "rgba(239,68,68,0.13)", color: "#fecaca", padding: "14px" };
