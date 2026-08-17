"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import AssetDeploymentView from "./AssetDeploymentView";
import QuizImportView from "./QuizImportView";
import ScienceBuilderView from "./ScienceBuilderView";
import type {
  CurriculumSubject,
  CurriculumInventoryPayload,
  CurriculumInventoryTopic,
  CurriculumOperation,
  CurriculumOperationPreview,
  CurriculumRole,
} from "../types";

type OperationsTab = "inventory" | "science" | "import" | "assets" | "history";
type SubjectFilter = "all" | CurriculumSubject;
type LevelFilter = "all" | "1" | "2" | "3" | "4" | "5" | "6";
type ScopeType = "topic" | "quiz";
type OperationRow = CurriculumOperation & {
  restores_operation_id: string | null;
};

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

function mergeInventories(
  core: CurriculumInventoryPayload,
  science: CurriculumInventoryPayload,
  primaryLevel: number | null,
): CurriculumInventoryPayload {
  return {
    generated_at: new Date().toISOString(),
    filters: {
      subject: null,
      primary_level: primaryLevel,
      include_inactive: true,
    },
    summary: {
      topic_count: core.summary.topic_count + science.summary.topic_count,
      active_topic_count:
        core.summary.active_topic_count + science.summary.active_topic_count,
      inactive_topic_count:
        core.summary.inactive_topic_count +
        science.summary.inactive_topic_count,
      quiz_count: core.summary.quiz_count + science.summary.quiz_count,
      published_quiz_count:
        core.summary.published_quiz_count +
        science.summary.published_quiz_count,
      archived_quiz_count:
        core.summary.archived_quiz_count + science.summary.archived_quiz_count,
      question_count:
        core.summary.question_count + science.summary.question_count,
      asset_count: core.summary.asset_count + science.summary.asset_count,
      attempt_count: core.summary.attempt_count + science.summary.attempt_count,
    },
    topics: [...core.topics, ...science.topics].sort(
      (left, right) =>
        left.subject.localeCompare(right.subject) ||
        left.primary_level - right.primary_level ||
        left.sort_order - right.sort_order ||
        left.title.localeCompare(right.title),
    ),
  };
}

export default function CurriculumOperationsView({
  role,
  initialTab = "inventory",
  initialScienceQuizId = null,
  onTabChange,
  onScienceQuizChange,
}: {
  role: CurriculumRole;
  initialTab?: OperationsTab;
  initialScienceQuizId?: string | null;
  onTabChange?: (tab: OperationsTab) => void;
  onScienceQuizChange?: (quizId: string | null) => void;
}) {
  const [tab, setTab] = useState<OperationsTab>(
    initialTab === "assets" && role !== "admin" ? "inventory" : initialTab,
  );
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [inventory, setInventory] = useState<CurriculumInventoryPayload | null>(
    null,
  );
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [preview, setPreview] = useState<CurriculumOperationPreview | null>(
    null,
  );
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const primaryLevel = level === "all" ? null : Number(level);
    const parameters = {
      p_primary_level: primaryLevel,
      p_include_inactive: true,
    };

    if (subject === "all") {
      const [coreResult, scienceResult] = await Promise.all([
        supabase.rpc("curriculum_get_operations_inventory", {
          ...parameters,
          p_subject: null,
        }),
        supabase.rpc("curriculum_get_science_operations_inventory", parameters),
      ]);

      if (coreResult.error || scienceResult.error) {
        setInventory(null);
        setError(
          `${coreResult.error?.message || scienceResult.error?.message}. Run the Phase 1–4B SQL files in order.`,
        );
      } else {
        setInventory(
          mergeInventories(
            coreResult.data as unknown as CurriculumInventoryPayload,
            scienceResult.data as unknown as CurriculumInventoryPayload,
            primaryLevel,
          ),
        );
      }
    } else if (subject === "science") {
      const { data, error: inventoryError } = await supabase.rpc(
        "curriculum_get_science_operations_inventory",
        parameters,
      );

      if (inventoryError) {
        setInventory(null);
        setError(`${inventoryError.message}. Run the Phase 4B SQL file.`);
      } else {
        setInventory(data as unknown as CurriculumInventoryPayload);
      }
    } else {
      const { data, error: inventoryError } = await supabase.rpc(
        "curriculum_get_operations_inventory",
        {
          ...parameters,
          p_subject: subject,
        },
      );

      if (inventoryError) {
        setInventory(null);
        setError(
          `${inventoryError.message}. Run the Phase 1 and Phase 2 SQL files in order.`,
        );
      } else {
        setInventory(data as unknown as CurriculumInventoryPayload);
      }
    }
    setLoading(false);
  }, [level, subject]);

  const loadHistory = useCallback(async () => {
    const { data, error: historyError } = await supabase
      .from("curriculum_operations")
      .select(
        "id,operation_type,scope_type,subject,primary_level,target_ids,status,preview_data,result_data,requested_by,created_at,completed_at,error_message,restores_operation_id",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (historyError) {
      setError(
        `${historyError.message}. Run the Phase 1 and Phase 2 SQL files in order.`,
      );
      setOperations([]);
    } else {
      setOperations((data || []) as unknown as OperationRow[]);
    }
  }, []);

  useEffect(() => {
    if (tab === "inventory") void loadInventory();
    if (tab === "history") void loadHistory();
  }, [loadHistory, loadInventory, tab]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("section", "operations");
    url.searchParams.set("operationsTab", tab);
    if (tab !== "science") {
      url.searchParams.delete("quizId");
      onScienceQuizChange?.(null);
    }
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    onTabChange?.(tab);
  }, [onScienceQuizChange, onTabChange, tab]);

  useEffect(() => {
    setSelectedTopicIds([]);
    setSelectedQuizIds([]);
    setPreview(null);
    setConfirmation("");
  }, [subject, level]);

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

  function clearPreview() {
    setPreview(null);
    setSelectedQuizIds([]);
    setConfirmation("");
  }

  async function requestPreview(
    previewSubject: CurriculumSubject,
    scopeType: ScopeType,
    targetIds: string[],
  ) {
    if (targetIds.length === 0) return;
    setPreviewingId(targetIds.length === 1 ? targetIds[0] : "selection");
    setPreview(null);
    setSelectedQuizIds([]);
    setConfirmation("");
    setError(null);
    setNotice(null);

    const previewFunction =
      previewSubject === "science"
        ? "curriculum_preview_science_operation_scope"
        : "curriculum_preview_operation_scope";
    const { data, error: previewError } = await supabase.rpc(previewFunction, {
      p_subject: previewSubject,
      p_scope_type: scopeType,
      p_target_ids: targetIds,
    });

    if (previewError) setError(previewError.message);
    else setPreview(data as unknown as CurriculumOperationPreview);
    setPreviewingId(null);
  }

  async function archivePreview() {
    if (!preview || (role !== "admin" && role !== "curriculum_lead")) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    const archiveFunction =
      preview.subject === "science"
        ? "curriculum_archive_science_scope"
        : "curriculum_archive_scope";
    const { data, error: archiveError } = await supabase.rpc(archiveFunction, {
      p_subject: preview.subject,
      p_scope_type: preview.scope_type,
      p_target_ids:
        preview.scope_type === "topic" ? preview.topic_ids : preview.quiz_ids,
      p_confirmation: confirmation,
    });

    if (archiveError) {
      setError(archiveError.message);
    } else {
      const result = data as unknown as {
        operation_id: string;
        applied_item_count: number;
      };
      setNotice(
        `Archive completed. ${result.applied_item_count.toLocaleString()} record(s) changed. Operation ${result.operation_id.slice(0, 8).toUpperCase()} can be restored from Deployment History.`,
      );
      setSelectedTopicIds([]);
      clearPreview();
      await loadInventory();
      await loadHistory();
    }
    setBusy(false);
  }

  function toggleTopic(topicId: string) {
    setSelectedTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId],
    );
    clearPreview();
  }

  function toggleQuiz(quizId: string) {
    setSelectedQuizIds((current) =>
      current.includes(quizId)
        ? current.filter((id) => id !== quizId)
        : [...current, quizId],
    );
  }

  async function restoreOperation(operationId: string, typedPhrase: string) {
    if (role !== "admin" && role !== "curriculum_lead") return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const sourceOperation = operations.find(
      (operation) => operation.id === operationId,
    );
    const restoreFunction =
      sourceOperation?.subject === "science"
        ? "curriculum_restore_science_archive_operation"
        : "curriculum_restore_archive_operation";
    const { data, error: restoreError } = await supabase.rpc(restoreFunction, {
      p_archive_operation_id: operationId,
      p_confirmation: typedPhrase,
    });

    if (restoreError) {
      setError(restoreError.message);
    } else {
      const result = data as unknown as { restored_item_count: number };
      setNotice(
        `Restore completed. ${result.restored_item_count.toLocaleString()} record(s) restored.`,
      );
      await loadHistory();
      await loadInventory();
    }
    setBusy(false);
  }

  return (
    <div style={shell}>
      <div>
        <p style={eyebrow}>CURRICULUM OPERATIONS</p>
        <h1 style={title}>Manage, import and deploy curriculum</h1>
        <p className="curriculum-page-description" style={description}>
          Preview dependencies, safely archive quizzes or complete topics, and
          restore archived curriculum without deleting student history.
        </p>
      </div>

      <div style={tabBar}>
        <TabButton
          active={tab === "inventory"}
          onClick={() => setTab("inventory")}
        >
          Quiz Management
        </TabButton>
        <TabButton active={tab === "science"} onClick={() => setTab("science")}>
          Science Builder
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
      {notice && <div style={successBanner}>{notice}</div>}

      {tab === "inventory" ? (
        <InventoryPanel
          role={role}
          inventory={inventory}
          visibleTopics={visibleTopics}
          loading={loading}
          busy={busy}
          subject={subject}
          level={level}
          search={search}
          preview={preview}
          previewingId={previewingId}
          selectedTopicIds={selectedTopicIds}
          selectedQuizIds={selectedQuizIds}
          confirmation={confirmation}
          onSubjectChange={setSubject}
          onLevelChange={setLevel}
          onSearchChange={setSearch}
          onRefresh={loadInventory}
          onPreview={requestPreview}
          onToggleTopic={toggleTopic}
          onToggleQuiz={toggleQuiz}
          onSelectVisible={() =>
            setSelectedTopicIds(visibleTopics.map((topic) => topic.id))
          }
          onClearSelection={() => setSelectedTopicIds([])}
          onConfirmationChange={setConfirmation}
          onArchive={archivePreview}
          onClosePreview={clearPreview}
        />
      ) : tab === "science" ? (
        <ScienceBuilderView
          role={role}
          initialQuizId={initialScienceQuizId}
          onQuizChange={onScienceQuizChange}
        />
      ) : tab === "import" ? (
        <QuizImportView role={role} />
      ) : tab === "assets" && role === "admin" ? (
        <AssetDeploymentView />
      ) : (
        <HistoryPanel
          role={role}
          operations={operations}
          busy={busy}
          onRefresh={loadHistory}
          onRestore={restoreOperation}
        />
      )}

      <style jsx global>{`
        @media (max-width: 1180px) {
          .curriculum-operations-topic-row {
            grid-template-columns: auto 1fr !important;
          }
          .curriculum-operations-topic-row > .curriculum-operations-metrics {
            grid-column: 1 / -1;
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
  role,
  inventory,
  visibleTopics,
  loading,
  busy,
  subject,
  level,
  search,
  preview,
  previewingId,
  selectedTopicIds,
  selectedQuizIds,
  confirmation,
  onSubjectChange,
  onLevelChange,
  onSearchChange,
  onRefresh,
  onPreview,
  onToggleTopic,
  onToggleQuiz,
  onSelectVisible,
  onClearSelection,
  onConfirmationChange,
  onArchive,
  onClosePreview,
}: {
  role: CurriculumRole;
  inventory: CurriculumInventoryPayload | null;
  visibleTopics: CurriculumInventoryTopic[];
  loading: boolean;
  busy: boolean;
  subject: SubjectFilter;
  level: LevelFilter;
  search: string;
  preview: CurriculumOperationPreview | null;
  previewingId: string | null;
  selectedTopicIds: string[];
  selectedQuizIds: string[];
  confirmation: string;
  onSubjectChange: (value: SubjectFilter) => void;
  onLevelChange: (value: LevelFilter) => void;
  onSearchChange: (value: string) => void;
  onRefresh: () => Promise<void>;
  onPreview: (
    subject: CurriculumSubject,
    scopeType: ScopeType,
    targetIds: string[],
  ) => Promise<void>;
  onToggleTopic: (id: string) => void;
  onToggleQuiz: (id: string) => void;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onConfirmationChange: (value: string) => void;
  onArchive: () => Promise<void>;
  onClosePreview: () => void;
}) {
  const summary = inventory?.summary || emptySummary;
  const canSelect = (role === "admin" || role === "curriculum_lead") && subject !== "all";

  return (
    <div style={panelStack}>
      <div style={phaseBanner}>
        <strong>Safe archive for English, Mathematics and Science:</strong>{" "}
        records and student history are retained. Admin actions require a
        preview and an exact confirmation phrase. Curriculum leads have
        read-only preview access.
      </div>

      <div style={filters}>
        <label style={fieldLabel}>
          Subject
          <select
            value={subject}
            onChange={(event) =>
              onSubjectChange(event.target.value as SubjectFilter)
            }
            style={field}
          >
            <option value="all">All subjects</option>
            <option value="english">English</option>
            <option value="math">Mathematics</option>
            <option value="science">Science</option>
          </select>
        </label>
        <label style={fieldLabel}>
          Level
          <select
            value={level}
            onChange={(event) =>
              onLevelChange(event.target.value as LevelFilter)
            }
            style={field}
          >
            <option value="all">All levels</option>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={String(value)}>
                Primary {value}
              </option>
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
        <button
          type="button"
          onClick={() => void onRefresh()}
          style={secondaryButton}
        >
          Refresh
        </button>
      </div>

      <div style={summaryGrid}>
        <SummaryCard
          label="Topics"
          value={summary.topic_count}
          detail={`${summary.inactive_topic_count} inactive`}
        />
        <SummaryCard
          label="Quizzes"
          value={summary.quiz_count}
          detail={`${summary.published_quiz_count} published`}
        />
        <SummaryCard
          label="Questions"
          value={summary.question_count}
          detail={`${summary.asset_count} assets`}
        />
        <SummaryCard
          label="Student attempts"
          value={summary.attempt_count}
          detail="Always preserved"
        />
      </div>

      {preview && (
        <PreviewPanel
          role={role}
          preview={preview}
          busy={busy}
          selectedQuizIds={selectedQuizIds}
          confirmation={confirmation}
          onToggleQuiz={onToggleQuiz}
          onPreviewQuizzes={() =>
            onPreview(preview.subject, "quiz", selectedQuizIds)
          }
          onConfirmationChange={onConfirmationChange}
          onArchive={onArchive}
          onClose={onClosePreview}
        />
      )}

      <div style={listHeader}>
        <div>
          <h2 style={sectionTitle}>Topic inventory</h2>
          <p style={smallText}>{visibleTopics.length} topic(s) shown</p>
        </div>
        {canSelect && (
          <div style={buttonRow}>
            <button
              type="button"
              onClick={onSelectVisible}
              style={secondaryButton}
            >
              Select all shown
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              style={secondaryButton}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selectedTopicIds.length === 0 || busy}
              onClick={() =>
                void onPreview(
                  subject as CurriculumSubject,
                  "topic",
                  selectedTopicIds,
                )
              }
              style={primaryButton}
            >
              Preview {selectedTopicIds.length || "selected"} topic(s)
            </button>
          </div>
        )}
      </div>

      {role === "admin" && subject === "all" && (
        <div style={hintBanner}>
          Choose English, Mathematics or Science to enable multi-topic
          selection. One archive operation cannot mix subjects.
        </div>
      )}

      {loading ? (
        <div style={emptyCard}>Loading curriculum inventory...</div>
      ) : visibleTopics.length === 0 ? (
        <div style={emptyCard}>No topics match these filters.</div>
      ) : (
        <div style={topicList}>
          {visibleTopics.map((topic) => (
            <TopicRow
              key={`${topic.subject}:${topic.id}`}
              role={role}
              topic={topic}
              selectable={canSelect}
              selected={selectedTopicIds.includes(topic.id)}
              previewing={previewingId === topic.id}
              onToggle={onToggleTopic}
              onPreview={() => onPreview(topic.subject, "topic", [topic.id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicRow({
  role,
  topic,
  selectable,
  selected,
  previewing,
  onToggle,
  onPreview,
}: {
  role: CurriculumRole;
  topic: CurriculumInventoryTopic;
  selectable: boolean;
  selected: boolean;
  previewing: boolean;
  onToggle: (id: string) => void;
  onPreview: () => Promise<void>;
}) {
  return (
    <article className="curriculum-operations-topic-row" style={topicCard}>
      {(role === "admin" || role === "curriculum_lead") && (
        <input
          type="checkbox"
          aria-label={`Select ${topic.title}`}
          checked={selected}
          disabled={!selectable}
          onChange={() => onToggle(topic.id)}
          style={checkbox}
        />
      )}
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
        <Metric
          label="Attempts"
          value={topic.attempt_count}
          warning={topic.attempt_count > 0}
        />
      </div>

      <button
        type="button"
        onClick={() => void onPreview()}
        disabled={previewing}
        style={secondaryButton}
      >
        {previewing ? "Checking..." : "Preview impact"}
      </button>
    </article>
  );
}

function PreviewPanel({
  role,
  preview,
  busy,
  selectedQuizIds,
  confirmation,
  onToggleQuiz,
  onPreviewQuizzes,
  onConfirmationChange,
  onArchive,
  onClose,
}: {
  role: CurriculumRole;
  preview: CurriculumOperationPreview;
  busy: boolean;
  selectedQuizIds: string[];
  confirmation: string;
  onToggleQuiz: (id: string) => void;
  onPreviewQuizzes: () => Promise<void>;
  onConfirmationChange: (value: string) => void;
  onArchive: () => Promise<void>;
  onClose: () => void;
}) {
  const s = preview.summary;
  const targetCount =
    preview.scope_type === "topic"
      ? preview.topic_ids.length
      : preview.quiz_ids.length;
  const requiredPhrase = archiveConfirmationPhrase(
    preview.scope_type,
    targetCount,
  );

  return (
    <section style={previewCard}>
      <div style={previewHeader}>
        <div>
          <p style={eyebrow}>ARCHIVE IMPACT PREVIEW</p>
          <h2 style={{ ...sectionTitle, marginTop: "6px" }}>
            {preview.scope_type === "topic"
              ? preview.topics
                  .map((topic) => `P${topic.primary_level} ${topic.title}`)
                  .join(", ")
              : `${preview.quizzes.length} selected quiz(es)`}
          </h2>
        </div>
        <button type="button" onClick={onClose} style={closeButton}>
          Close
        </button>
      </div>

      <div style={previewGrid}>
        <Metric label="Topics" value={s.topic_count} />
        <Metric label="Skills" value={s.skill_count} />
        <Metric label="Quizzes" value={s.quiz_count} />
        <Metric label="Questions" value={s.question_count} />
        <Metric label="Assets" value={s.asset_count} />
        <Metric
          label="Attempts"
          value={s.attempt_count}
          warning={s.attempt_count > 0}
        />
        <Metric
          label="Answers"
          value={s.answer_count}
          warning={s.answer_count > 0}
        />
        <Metric
          label="Rewards"
          value={s.reward_claim_count}
          warning={s.reward_claim_count > 0}
        />
      </div>

      {preview.warnings.map((warning) => (
        <div key={warning} style={warningBanner}>
          {warning}
        </div>
      ))}

      {preview.scope_type === "topic" && preview.quizzes.length > 0 && (
        <div style={quizSelectionCard}>
          <div style={listHeader}>
            <div>
              <strong>Archive only certain quizzes instead?</strong>
              <p style={smallText}>
                Select quizzes below, then generate a new quiz-only preview.
              </p>
            </div>
            <button
              type="button"
              disabled={selectedQuizIds.length === 0 || busy}
              onClick={() => void onPreviewQuizzes()}
              style={secondaryButton}
            >
              Preview {selectedQuizIds.length || "selected"} quiz(es)
            </button>
          </div>
          <div style={quizList}>
            {preview.quizzes.map((quiz) => (
              <label key={quiz.id} style={quizRow}>
                <input
                  type="checkbox"
                  checked={selectedQuizIds.includes(quiz.id)}
                  onChange={() => onToggleQuiz(quiz.id)}
                  style={checkbox}
                />
                <span style={{ flex: 1 }}>
                  <strong>{quiz.title}</strong>
                  <span style={quizMeta}>
                    {quiz.code} · {quiz.question_count} question(s) ·{" "}
                    {quiz.attempt_count} attempt(s)
                  </span>
                </span>
                <span style={quiz.is_published ? activeTag : inactiveTag}>
                  {quiz.status}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <p style={safeText}>
        <strong>No hard deletion:</strong> topics, skills, quizzes, questions,
        assets, attempts, answers and rewards remain stored. This operation can
        be restored from Deployment History.
      </p>

      {role === "admin" ? (
        <div style={confirmationCard}>
          <label style={{ ...fieldLabel, flex: 1 }}>
            Type <strong style={{ color: "white" }}>{requiredPhrase}</strong> to
            confirm
            <input
              value={confirmation}
              onChange={(event) => onConfirmationChange(event.target.value)}
              autoComplete="off"
              style={field}
            />
          </label>
          <button
            type="button"
            disabled={confirmation !== requiredPhrase || busy}
            onClick={() => void onArchive()}
            style={dangerButton}
          >
            {busy
              ? "Archiving..."
              : `Archive ${targetCount} ${preview.scope_type}(s)`}
          </button>
        </div>
      ) : (
        <div style={hintBanner}>
          Preview only. An admin must apply archive and restore operations.
        </div>
      )}
    </section>
  );
}

function HistoryPanel({
  role,
  operations,
  busy,
  onRefresh,
  onRestore,
}: {
  role: CurriculumRole;
  operations: OperationRow[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  onRestore: (operationId: string, phrase: string) => Promise<void>;
}) {
  const restoredArchiveIds = useMemo(
    () =>
      new Set(
        operations
          .filter(
            (operation) =>
              operation.operation_type === "restore" &&
              operation.status === "completed" &&
              operation.restores_operation_id,
          )
          .map((operation) => operation.restores_operation_id as string),
      ),
    [operations],
  );

  return (
    <div style={panelStack}>
      <div style={listHeader}>
        <div>
          <h2 style={sectionTitle}>Deployment History</h2>
          <p style={smallText}>
            Archive and restore operations are recorded with before/after
            snapshots.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          style={secondaryButton}
        >
          Refresh
        </button>
      </div>

      {operations.length === 0 ? (
        <div style={emptyCard}>
          No Curriculum Operations have been applied yet.
        </div>
      ) : (
        <div style={topicList}>
          {operations.map((operation) => {
            const alreadyRestored = restoredArchiveIds.has(operation.id);
            const canRestore =
              (role === "admin" || role === "curriculum_lead") &&
              operation.operation_type === "archive" &&
              operation.status === "completed" &&
              !alreadyRestored;
            return (
              <HistoryRow
                key={operation.id}
                operation={operation}
                alreadyRestored={alreadyRestored}
                canRestore={canRestore}
                busy={busy}
                onRestore={onRestore}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  operation,
  alreadyRestored,
  canRestore,
  busy,
  onRestore,
}: {
  operation: OperationRow;
  alreadyRestored: boolean;
  canRestore: boolean;
  busy: boolean;
  onRestore: (operationId: string, phrase: string) => Promise<void>;
}) {
  const [showRestore, setShowRestore] = useState(false);
  const [restorePhrase, setRestorePhrase] = useState("");
  const requiredPhrase = `RESTORE ${operation.id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const resultCount = Number(
    operation.result_data?.applied_item_count ??
      operation.result_data?.restored_item_count ??
      0,
  );

  return (
    <article style={historyCard}>
      <div style={historyTopRow}>
        <div>
          <div style={topicTags}>
            <span style={subjectTag}>{operation.subject}</span>
            <span style={levelTag}>{operation.scope_type}</span>
            <span
              style={operation.status === "completed" ? activeTag : inactiveTag}
            >
              {operation.status}
            </span>
            {alreadyRestored && <span style={restoredTag}>Restored</span>}
          </div>
          <h3 style={topicTitle}>
            {operation.operation_type.replaceAll("_", " ")}
          </h3>
          <p style={smallText}>
            {operation.target_ids.length} target(s) · {resultCount} changed
            record(s) · {operation.id.slice(0, 8).toUpperCase()}
          </p>
          <time style={smallText}>
            {new Date(operation.created_at).toLocaleString()}
          </time>
        </div>
        {canRestore && (
          <button
            type="button"
            onClick={() => setShowRestore((current) => !current)}
            style={secondaryButton}
          >
            {showRestore ? "Cancel restore" : "Restore"}
          </button>
        )}
      </div>

      {operation.error_message && (
        <div style={errorBanner}>{operation.error_message}</div>
      )}

      {showRestore && canRestore && (
        <div style={restoreCard}>
          <p style={safeText}>
            This restores the exact topic, skill and quiz states captured before
            this archive. Type <strong>{requiredPhrase}</strong>.
          </p>
          <div style={buttonRow}>
            <input
              value={restorePhrase}
              onChange={(event) => setRestorePhrase(event.target.value)}
              autoComplete="off"
              style={{ ...field, flex: "1 1 260px" }}
            />
            <button
              type="button"
              disabled={restorePhrase !== requiredPhrase || busy}
              onClick={() => void onRestore(operation.id, restorePhrase)}
              style={primaryButton}
            >
              {busy ? "Restoring..." : "Restore archived curriculum"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function archiveConfirmationPhrase(scopeType: ScopeType, count: number) {
  const noun = scopeType === "topic" ? "TOPIC" : "QUIZ";
  return count === 1 ? `ARCHIVE ${noun}` : `ARCHIVE ${count} ${noun}S`;
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

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
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
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.16em",
};
const title: CSSProperties = {
  margin: "7px 0 0",
  fontSize: "clamp(30px,4vw,48px)",
  lineHeight: 1.06,
};
const description: CSSProperties = {
  margin: "12px 0 0",
  color: "rgba(255,255,255,0.64)",
  lineHeight: 1.65,
  maxWidth: "880px",
};
const tabBar: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "9px" };
const tabButton: CSSProperties = {
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(255,255,255,0.035)",
  padding: "0 15px",
  cursor: "pointer",
  fontWeight: 850,
};
const panelStack: CSSProperties = { display: "grid", gap: "18px" };
const phaseBanner: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(45,212,191,0.08)",
  color: "#d8fffa",
  padding: "14px 16px",
  lineHeight: 1.55,
};
const hintBanner: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(83,215,255,0.07)",
  color: "#c9f7ff",
  padding: "12px 14px",
  lineHeight: 1.5,
};
const filters: CSSProperties = {
  display: "flex",
  alignItems: "end",
  flexWrap: "wrap",
  gap: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(255,255,255,0.025)",
  padding: "16px",
};
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: "7px",
  color: "rgba(255,255,255,0.68)",
  fontSize: "12px",
  fontWeight: 850,
  flex: "0 1 180px",
};
const field: CSSProperties = {
  width: "100%",
  minHeight: "44px",
  boxSizing: "border-box",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "#0d1a31",
  color: "white",
  padding: "0 12px",
  outline: "none",
};
const buttonRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
};
const secondaryButton: CSSProperties = {
  minHeight: "44px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(83,215,255,0.09)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 850,
};
const primaryButton: CSSProperties = {
  ...secondaryButton,
  borderColor: "rgba(52,211,153,0.45)",
  background: "rgba(52,211,153,0.16)",
};
const dangerButton: CSSProperties = {
  ...secondaryButton,
  borderColor: "rgba(248,113,113,0.55)",
  background: "rgba(239,68,68,0.18)",
  color: "#fff0f0",
  alignSelf: "end",
};
const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: "12px",
};
const summaryCard: CSSProperties = {
  minHeight: "120px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(13,29,57,0.78)",
  padding: "17px",
  display: "grid",
  alignContent: "center",
  gap: "5px",
};
const summaryLabel: CSSProperties = {
  color: "#7ee8ff",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};
const summaryValue: CSSProperties = { fontSize: "30px", lineHeight: 1.15 };
const listHeader: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};
const sectionTitle: CSSProperties = { margin: 0, fontSize: "22px" };
const smallText: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.54)",
  fontSize: "13px",
  lineHeight: 1.45,
};
const topicList: CSSProperties = { display: "grid", gap: "10px" };
const topicCard: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(13,29,57,0.68)",
  padding: "16px",
  display: "grid",
  gridTemplateColumns: "auto minmax(210px,1.2fr) minmax(360px,2fr) auto",
  alignItems: "center",
  gap: "16px",
};
const topicIdentity: CSSProperties = { minWidth: 0 };
const topicTags: CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};
const subjectTag: CSSProperties = {
  borderRadius: "999px",
  background: "rgba(126,232,255,0.13)",
  color: "#aef2ff",
  padding: "4px 8px",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const levelTag: CSSProperties = {
  ...subjectTag,
  background: "rgba(167,139,250,0.13)",
  color: "#d8caff",
};
const activeTag: CSSProperties = {
  ...subjectTag,
  background: "rgba(52,211,153,0.13)",
  color: "#9fffd4",
};
const inactiveTag: CSSProperties = {
  ...subjectTag,
  background: "rgba(248,113,113,0.13)",
  color: "#fecaca",
};
const restoredTag: CSSProperties = {
  ...subjectTag,
  background: "rgba(250,204,21,0.12)",
  color: "#fde68a",
};
const topicTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "17px",
  textTransform: "capitalize",
};
const slugText: CSSProperties = {
  ...smallText,
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const metrics: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6,minmax(58px,1fr))",
  gap: "7px",
};
const metric: CSSProperties = {
  borderRadius: "10px",
  background: "rgba(255,255,255,0.035)",
  padding: "9px",
  display: "grid",
  gap: "3px",
  textAlign: "center",
};
const metricLabel: CSSProperties = {
  color: "rgba(255,255,255,0.48)",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const previewCard: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(255,215,106,0.35)",
  background: "rgba(255,215,106,0.055)",
  padding: "18px",
  display: "grid",
  gap: "14px",
};
const previewHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "14px",
};
const previewGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
  gap: "8px",
};
const closeButton: CSSProperties = { ...secondaryButton, minHeight: "38px" };
const warningBanner: CSSProperties = {
  borderRadius: "11px",
  border: "1px solid rgba(251,191,36,0.3)",
  background: "rgba(251,191,36,0.09)",
  color: "#ffe6a8",
  padding: "12px",
  lineHeight: 1.5,
};
const safeText: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.75)",
  lineHeight: 1.55,
};
const confirmationCard: CSSProperties = {
  display: "flex",
  alignItems: "end",
  flexWrap: "wrap",
  gap: "12px",
  borderRadius: "14px",
  border: "1px solid rgba(248,113,113,0.3)",
  background: "rgba(239,68,68,0.07)",
  padding: "14px",
};
const quizSelectionCard: CSSProperties = {
  display: "grid",
  gap: "12px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.15)",
  background: "rgba(5,15,33,0.45)",
  padding: "14px",
};
const quizList: CSSProperties = {
  display: "grid",
  gap: "6px",
  maxHeight: "330px",
  overflowY: "auto",
};
const quizRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.035)",
  padding: "10px",
  cursor: "pointer",
};
const quizMeta: CSSProperties = {
  display: "block",
  marginTop: "3px",
  color: "rgba(255,255,255,0.5)",
  fontSize: "12px",
};
const checkbox: CSSProperties = {
  width: "18px",
  height: "18px",
  accentColor: "#53d7ff",
  cursor: "pointer",
};
const emptyCard: CSSProperties = {
  borderRadius: "17px",
  border: "1px dashed rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.025)",
  color: "rgba(255,255,255,0.66)",
  padding: "28px",
  lineHeight: 1.6,
};
const historyCard: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(13,29,57,0.68)",
  padding: "16px",
  display: "grid",
  gap: "13px",
};
const historyTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};
const restoreCard: CSSProperties = {
  display: "grid",
  gap: "10px",
  borderRadius: "12px",
  border: "1px solid rgba(52,211,153,0.25)",
  background: "rgba(52,211,153,0.06)",
  padding: "13px",
};
const errorBanner: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "14px",
};
const successBanner: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(52,211,153,0.38)",
  background: "rgba(52,211,153,0.11)",
  color: "#b8f8dc",
  padding: "14px",
};
