"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurriculumDeveloperAccess } from "@/hooks/useCurriculumDeveloperAccess";
import { useNovaFeatureFlags } from "@/hooks/useNovaFeatureFlags";
import QuestionSkillMappingPanel from "./QuestionSkillMappingPanel";

type MappingReviewStatus = string;
type MappingState = string;
type MappingSubject = string;
type MappingTopic = Record<string, any>;
type MappingSkill = Record<string, any>;
type MappingQuestion = Record<string, any>;

type QueueSummary = {
  all: number;
  unmapped: number;
  draft: number;
  reviewed: number;
  approved: number;
  retired: number;
};

type QueuePayload = {
  items: MappingQuestion[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  summary: QueueSummary;
};

type BulkForm = {
  primarySkillId: string;
  secondary1SkillId: string;
  secondary1Weight: number;
  secondary2SkillId: string;
  secondary2Weight: number;
  reviewStatus: MappingReviewStatus;
  reason: string;
};

const EMPTY_BULK: BulkForm = {
  primarySkillId: "",
  secondary1SkillId: "",
  secondary1Weight: 0.5,
  secondary2SkillId: "",
  secondary2Weight: 0.25,
  reviewStatus: "draft",
  reason: "",
};

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function subjectLabel(subject: MappingSubject) {
  switch (subject) {
    case "math":
      return "Mathematics";
    case "science":
      return "Science";
    default:
      return "English";
  }
}

function questionSource(subject: MappingSubject) {
  return `${subject}_questions` as MappingQuestion["question_source"];
}

function statusLabel(value: MappingState) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function QuestionMappingClient() {
  const router = useRouter();
  const {
    status,
    role,
    error: accessError,
  } = useCurriculumDeveloperAccess();

  const normalisedRole = normaliseRole(role);
  const isAdmin = normalisedRole === "admin";
  const isEditor = ["admin", "curriculum_lead"].includes(
    normalisedRole,
  );
  const {
    isEnabled: featureEnabled,
    loading: featureFlagsLoading,
  } = useNovaFeatureFlags(role);
  const curriculumLeadMappingEnabled =
    featureEnabled(
      "curriculum_lead_mapping_enabled",
      true,
    );

  const [subject, setSubject] =
    useState<MappingSubject>("english");
  const [primaryLevel, setPrimaryLevel] = useState(3);
  const [topicRef, setTopicRef] = useState("all");
  const [mappingState, setMappingState] =
    useState<MappingState>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [queue, setQueue] = useState<QueuePayload>({
    items: [],
    total: 0,
    page: 1,
    page_size: 25,
    pages: 0,
    summary: {
      all: 0,
      unmapped: 0,
      draft: 0,
      reviewed: 0,
      approved: 0,
      retired: 0,
    },
  });
  const [topics, setTopics] = useState<MappingTopic[]>([]);
  const [skills, setSkills] = useState<MappingSkill[]>([]);

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] =
    useState<MappingQuestion | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<BulkForm>(EMPTY_BULK);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (status !== "allowed" || !isEditor) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [
      queueResult,
      topicsResult,
      skillsResult,
    ] = await Promise.all([
      supabase.rpc("curriculum_get_question_mapping_queue", {
        p_subject: subject,
        p_primary_level: primaryLevel,
        p_topic_ref: topicRef === "all" ? null : topicRef,
        p_mapping_state: mappingState,
        p_search: search.trim() || null,
        p_page: page,
        p_page_size: 25,
      }),
      supabase.rpc("curriculum_get_question_mapping_topics", {
        p_subject: subject,
        p_primary_level: primaryLevel,
      }),
      supabase.rpc("curriculum_get_learning_skill_catalogue", {
        p_subject: subject,
        p_primary_level: primaryLevel,
        p_topic: null,
        p_include_inactive: true,
      }),
    ]);

    const firstError =
      queueResult.error ||
      topicsResult.error ||
      skillsResult.error;

    if (firstError) {
      setError(
        `${firstError.message}. Confirm that Phase 2B.3 SQL was installed and this account is an admin.`,
      );
      setQueue((current) => ({
        ...current,
        items: [],
        total: 0,
      }));
      setLoading(false);
      return;
    }

    const queueData =
      queueResult.data &&
      typeof queueResult.data === "object"
        ? (queueResult.data as Record<string, unknown>)
        : {};

    const summaryData =
      queueData.summary &&
      typeof queueData.summary === "object"
        ? (queueData.summary as Record<string, unknown>)
        : {};

    const parsedQueue: QueuePayload = {
      items: asArray<Record<string, unknown>>(
        queueData.items,
      ).map(
        (row): MappingQuestion => ({
          question_source: String(
            row.question_source,
          ) as MappingQuestion["question_source"],
          question_id: String(row.question_id),
          subject: String(row.subject) as MappingSubject,
          primary_level: Number(row.primary_level || 0),
          topic_ref: String(row.topic_ref || ""),
          topic_title: String(row.topic_title || ""),
          question_preview: String(
            row.question_preview || "",
          ),
          question_status: String(
            row.question_status || "",
          ),
          question_version: row.question_version
            ? String(row.question_version)
            : null,
          mapping_version:
            row.mapping_version === null ||
            row.mapping_version === undefined
              ? null
              : Number(row.mapping_version),
          mapping_state: String(
            row.mapping_state || "unmapped",
          ) as MappingState,
          primary_skill_code: row.primary_skill_code
            ? String(row.primary_skill_code)
            : null,
          primary_skill_name: row.primary_skill_name
            ? String(row.primary_skill_name)
            : null,
          mappings: asArray(row.mappings),
          mapped_at: row.mapped_at
            ? String(row.mapped_at)
            : null,
          reviewed_at: row.reviewed_at
            ? String(row.reviewed_at)
            : null,
        }),
      ),
      total: Number(queueData.total || 0),
      page: Number(queueData.page || 1),
      page_size: Number(queueData.page_size || 25),
      pages: Number(queueData.pages || 0),
      summary: {
        all: Number(summaryData.all || 0),
        unmapped: Number(summaryData.unmapped || 0),
        draft: Number(summaryData.draft || 0),
        reviewed: Number(summaryData.reviewed || 0),
        approved: Number(summaryData.approved || 0),
        retired: Number(summaryData.retired || 0),
      },
    };

    const parsedTopics = asArray<Record<string, unknown>>(
      topicsResult.data,
    ).map(
      (row): MappingTopic => ({
        subject: String(row.subject) as MappingSubject,
        primary_level: Number(row.primary_level || 0),
        topic_ref: String(row.topic_ref || ""),
        topic_title: String(row.topic_title || ""),
        question_count: Number(row.question_count || 0),
      }),
    );

    const parsedSkills = asArray<Record<string, unknown>>(
      skillsResult.data,
    ).map(
      (row): MappingSkill => ({
        id: String(row.id),
        subject: String(row.subject) as MappingSubject,
        primary_level: Number(row.primary_level || 0),
        domain: String(row.domain || ""),
        topic: String(row.topic || ""),
        skill_name: String(row.skill_name || ""),
        skill_code: String(row.skill_code || ""),
        description: row.description
          ? String(row.description)
          : null,
        public_explanation: row.public_explanation
          ? String(row.public_explanation)
          : null,
        internal_mapping_guidance:
          row.internal_mapping_guidance
            ? String(row.internal_mapping_guidance)
            : null,
        parent_skill_id: row.parent_skill_id
          ? String(row.parent_skill_id)
          : null,
        is_topic_level: Boolean(row.is_topic_level),
        is_active: Boolean(row.is_active),
        review_status: String(
          row.review_status || "draft",
        ) as MappingReviewStatus,
        taxonomy_version: Number(row.taxonomy_version || 1),
        mapped_question_count: Number(
          row.mapped_question_count || 0,
        ),
        evidence_count: Number(row.evidence_count || 0),
      }),
    );

    setQueue(parsedQueue);
    setTopics(parsedTopics);
    setSkills(parsedSkills);
    setSelectedIds(new Set());
    setLoading(false);
  }, [
    isEditor,
    mappingState,
    page,
    primaryLevel,
    search,
    status,
    subject,
    topicRef,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, search ? 280 : 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkspace, search]);

  const eligibleSkills = useMemo(
    () =>
      skills
        .filter(
          (skill) =>
            skill.subject === subject &&
            skill.primary_level === primaryLevel &&
            skill.is_active &&
            skill.review_status !== "retired" &&
            !skill.is_topic_level,
        )
        .sort(
          (first, second) =>
            first.domain.localeCompare(second.domain) ||
            first.topic.localeCompare(second.topic) ||
            first.skill_name.localeCompare(second.skill_name),
        ),
    [primaryLevel, skills, subject],
  );

  const allPageSelected =
    queue.items.length > 0 &&
    queue.items.every((item) =>
      selectedIds.has(item.question_id),
    );

  function resetPageAndSelection() {
    setPage(1);
    setSelectedIds(new Set());
  }

  function toggleSelection(questionId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function toggleCurrentPage() {
    if (allPageSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(
      new Set(queue.items.map((item) => item.question_id)),
    );
  }

  function openBulkMapping() {
    if (selectedIds.size === 0) {
      setError("Select at least one question.");
      return;
    }

    setBulk(EMPTY_BULK);
    setBulkOpen(true);
    setError(null);
    setMessage(null);
  }

  async function applyBulkMapping() {
    setError(null);
    setMessage(null);

    if (!bulk.primarySkillId) {
      setError("Choose one primary skill for the batch.");
      return;
    }

    const ids = [
      bulk.primarySkillId,
      bulk.secondary1SkillId,
      bulk.secondary2SkillId,
    ].filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      setError("The same skill cannot be selected twice.");
      return;
    }

    const selectedSkills = eligibleSkills.filter((skill) =>
      ids.includes(skill.id),
    );

    if (
      bulk.reviewStatus === "approved" &&
      selectedSkills.some(
        (skill) => skill.review_status !== "approved",
      )
    ) {
      setError(
        "Only approved learning skills may be used in approved mappings.",
      );
      return;
    }

    const mappings = [
      {
        skill_id: bulk.primarySkillId,
        weight: 1,
        is_primary: true,
      },
      ...(bulk.secondary1SkillId
        ? [
            {
              skill_id: bulk.secondary1SkillId,
              weight: bulk.secondary1Weight,
              is_primary: false,
            },
          ]
        : []),
      ...(bulk.secondary2SkillId
        ? [
            {
              skill_id: bulk.secondary2SkillId,
              weight: bulk.secondary2Weight,
              is_primary: false,
            },
          ]
        : []),
    ];

    setBusy(true);

    const { data, error: bulkError } = await supabase.rpc(
      "curriculum_bulk_save_question_skill_mapping",
      {
        p_question_source: questionSource(subject),
        p_question_ids: Array.from(selectedIds),
        p_mappings: mappings,
        p_review_status: bulk.reviewStatus,
        p_mapping_reason: bulk.reason.trim() || null,
      },
    );

    setBusy(false);

    if (bulkError) {
      setError(bulkError.message);
      return;
    }

    const payload =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};

    const succeeded = Number(payload.succeeded || 0);
    const failed = Number(payload.failed || 0);

    setBulkOpen(false);
    setMessage(
      failed > 0
        ? `${succeeded} questions mapped; ${failed} failed. Review the returned errors before retrying.`
        : `${succeeded} questions mapped successfully.`,
    );

    await loadWorkspace();
  }

  async function bulkStatus(nextStatus: MappingReviewStatus) {
    if (selectedIds.size === 0) {
      setError("Select at least one mapped question.");
      return;
    }

    if (
      !window.confirm(
        `${statusLabel(nextStatus)} the latest mapping for ${selectedIds.size} selected question(s)?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const { data, error: statusError } = await supabase.rpc(
      "curriculum_bulk_set_question_mapping_status",
      {
        p_question_source: questionSource(subject),
        p_question_ids: Array.from(selectedIds),
        p_review_status: nextStatus,
      },
    );

    setBusy(false);

    if (statusError) {
      setError(statusError.message);
      return;
    }

    const payload =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};

    setMessage(
      `${Number(payload.succeeded || 0)} mapping(s) changed to ${statusLabel(
        nextStatus,
      )}.`,
    );
    await loadWorkspace();
  }

  if (status === "checking") {
    return <PageMessage text="Checking Question Mapping access..." />;
  }

  if (status === "locked" || !role) {
    return (
      <LockedPage
        title="Access Restricted"
        message="This workspace requires Curriculum Developer access."
        error={accessError}
        onBack={() => router.push("/curriculum-developer")}
      />
    );
  }

  if (
    !isEditor ||
    (!isAdmin &&
      !featureFlagsLoading &&
      !curriculumLeadMappingEnabled)
  ) {
    return (
      <LockedPage
        title="Access Restricted"
        message={
          !isAdmin &&
          !curriculumLeadMappingEnabled
            ? "Curriculum Lead access to Question Mapping is currently disabled by the production release controls."
            : "Question-level skill mapping requires an Admin or Curriculum Lead role."
        }
        onBack={() =>
          router.push("/curriculum-developer/learning-skills")
        }
      />
    );
  }

  return (
    <main id="question-mapping-root" style={pageShell}>
      <header className="qm-header" style={header}>
        <button
          type="button"
          onClick={() =>
            router.push("/curriculum-developer/learning-skills")
          }
          style={backButton}
        >
          ← Learning Skills
        </button>

        <div style={headerTitle}>
          <p style={brandEyebrow}>NOVA LEARNING PROFILE</p>
          <p style={headerSubtitle}>Question Mapping</p>
        </div>

        <div style={adminPill}>
          {isAdmin ? "Admin" : "Curriculum Lead"}
        </div>
      </header>

      <section style={workspace}>
        <div className="qm-heading-row" style={headingRow}>
          <div>
            <p style={eyebrow}>PHASE 2B.3</p>
            <h1 style={pageTitle}>Map Questions to Skills</h1>
            <p style={pageDescription}>
              Connect each question to one primary skill and up to
              two supporting skills. Approved mappings become
              eligible for learner evidence in the next phase.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/curriculum-developer/learning-skills")
            }
            style={secondaryButton}
          >
            Open Skill Catalogue
          </button>
        </div>

        <section className="qm-filter-grid" style={filterPanel}>
          <label style={fieldLabel}>
            Subject
            <select
              value={subject}
              onChange={(event) => {
                setSubject(
                  event.target.value as MappingSubject,
                );
                setTopicRef("all");
                resetPageAndSelection();
              }}
              style={input}
            >
              <option value="english">English</option>
              <option value="math">Mathematics</option>
              <option value="science">Science</option>
            </select>
          </label>

          <label style={fieldLabel}>
            Primary level
            <select
              value={primaryLevel}
              onChange={(event) => {
                setPrimaryLevel(Number(event.target.value));
                setTopicRef("all");
                resetPageAndSelection();
              }}
              style={input}
            >
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <option key={level} value={level}>
                  Primary {level}
                </option>
              ))}
            </select>
          </label>

          <label style={fieldLabel}>
            Topic
            <select
              value={topicRef}
              onChange={(event) => {
                setTopicRef(event.target.value);
                resetPageAndSelection();
              }}
              style={input}
            >
              <option value="all">All topics</option>
              {topics.map((topic) => (
                <option
                  key={`${topic.topic_ref}:${topic.topic_title}`}
                  value={topic.topic_ref}
                >
                  {topic.topic_title} ({topic.question_count})
                </option>
              ))}
            </select>
          </label>

          <label style={fieldLabel}>
            Mapping status
            <select
              value={mappingState}
              onChange={(event) => {
                setMappingState(
                  event.target.value as MappingState,
                );
                resetPageAndSelection();
              }}
              style={input}
            >
              <option value="all">All questions</option>
              <option value="unmapped">Unmapped</option>
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="retired">Retired</option>
            </select>
          </label>

          <label style={fieldLabel}>
            Search
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Question, topic or skill code"
              style={input}
            />
          </label>

          <button
            type="button"
            onClick={() => void loadWorkspace()}
            disabled={loading}
            style={{
              ...secondaryButton,
              alignSelf: "end",
              opacity: loading ? 0.55 : 1,
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        <div className="qm-summary-grid" style={summaryGrid}>
          {(
            [
              ["All", "all"],
              ["Unmapped", "unmapped"],
              ["Draft", "draft"],
              ["Reviewed", "reviewed"],
              ["Approved", "approved"],
            ] as Array<[string, keyof QueueSummary]>
          ).map(([label, key]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMappingState(key as MappingState);
                resetPageAndSelection();
              }}
              style={{
                ...summaryCard,
                ...(mappingState === key
                  ? activeSummaryCard
                  : {}),
              }}
            >
              <span>{label}</span>
              <strong>{queue.summary[key]}</strong>
            </button>
          ))}
        </div>

        {error && <div style={errorBanner}>{error}</div>}
        {message && <div style={successBanner}>{message}</div>}

        <section style={toolbar}>
          <label style={selectAllLabel}>
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleCurrentPage}
            />
            Select current page
          </label>

          <span style={selectionText}>
            {selectedIds.size} selected
          </span>

          <div style={toolbarActions}>
            <button
              type="button"
              onClick={openBulkMapping}
              disabled={selectedIds.size === 0 || busy}
              style={secondaryButton}
            >
              Apply Same Mapping
            </button>
            <button
              type="button"
              onClick={() => void bulkStatus("reviewed")}
              disabled={selectedIds.size === 0 || busy}
              style={secondaryButton}
            >
              Mark Reviewed
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => void bulkStatus("approved")}
                disabled={selectedIds.size === 0 || busy}
                style={approveButton}
              >
                Approve Selected
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <PageMessage
            text="Loading question mapping queue..."
            embedded
          />
        ) : queue.items.length === 0 ? (
          <div style={emptyState}>
            No questions match the current filters.
          </div>
        ) : (
          <div style={questionList}>
            {queue.items.map((question) => (
              <article
                key={question.question_id}
                className="qm-question-card"
                style={questionCard}
              >
                <label style={questionCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(
                      question.question_id,
                    )}
                    onChange={() =>
                      toggleSelection(question.question_id)
                    }
                  />
                </label>

                <div style={questionMain}>
                  <div style={questionTopLine}>
                    <StatusBadge
                      state={question.mapping_state}
                    />
                    <span style={subjectBadge}>
                      {subjectLabel(question.subject)} · P
                      {question.primary_level}
                    </span>
                    <span style={questionStatus}>
                      {question.question_status}
                    </span>
                  </div>

                  <p style={topicText}>
                    {question.topic_title}
                  </p>
                  <h3 style={questionPrompt}>
                    {question.question_preview}
                  </h3>
                  <p style={questionIdText}>
                    {question.question_id}
                  </p>

                  {question.primary_skill_code ? (
                    <div style={mappedSkill}>
                      <span>Primary skill</span>
                      <strong>
                        {question.primary_skill_code} ·{" "}
                        {question.primary_skill_name}
                      </strong>
                    </div>
                  ) : (
                    <div style={unmappedNotice}>
                      No question-level skill has been mapped.
                    </div>
                  )}
                </div>

                <div style={questionActions}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingQuestion(question)
                    }
                    style={primaryButton}
                  >
                    {question.mapping_state === "unmapped"
                      ? "Map Question"
                      : "Review Mapping"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div style={pagination}>
          <button
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page <= 1 || loading}
            style={secondaryButton}
          >
            Previous
          </button>

          <span style={pageText}>
            Page {queue.page} of {Math.max(1, queue.pages)} ·{" "}
            {queue.total} question
            {queue.total === 1 ? "" : "s"}
          </span>

          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={
              page >= queue.pages || queue.pages === 0 || loading
            }
            style={secondaryButton}
          >
            Next
          </button>
        </div>
      </section>

      {editingQuestion && (
        <div
          role="presentation"
          style={modalBackdrop}
          onMouseDown={() => setEditingQuestion(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Question skill mapping"
            style={modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEditingQuestion(null)}
              style={closeButton}
              aria-label="Close mapping editor"
            >
              ×
            </button>

            <QuestionSkillMappingPanel
              questionSource={editingQuestion.question_source}
              questionId={editingQuestion.question_id}
              subject={editingQuestion.subject}
              primaryLevel={editingQuestion.primary_level}
              questionVersion={
                editingQuestion.question_version
              }
              questionPreview={
                editingQuestion.question_preview
              }
              topicTitle={editingQuestion.topic_title}
              canApprove={isAdmin}
              onSaved={async () => {
                await loadWorkspace();
              }}
            />
          </section>
        </div>
      )}

      {bulkOpen && (
        <div
          role="presentation"
          style={modalBackdrop}
          onMouseDown={() => {
            if (!busy) setBulkOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Bulk question mapping"
            style={bulkModal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={bulkHeader}>
              <div>
                <p style={eyebrow}>BULK MAPPING</p>
                <h2 style={bulkTitle}>
                  Map {selectedIds.size} selected questions
                </h2>
                <p style={bulkDescription}>
                  Use this only when every selected question tests
                  the same primary and supporting skills.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                style={closeButton}
              >
                ×
              </button>
            </div>

            <div className="qm-bulk-grid" style={bulkGrid}>
              <label style={fieldLabel}>
                Primary skill
                <select
                  value={bulk.primarySkillId}
                  onChange={(event) =>
                    setBulk((current) => ({
                      ...current,
                      primarySkillId: event.target.value,
                    }))
                  }
                  style={input}
                >
                  <option value="">Choose primary skill</option>
                  {eligibleSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.skill_code} · {skill.skill_name}
                      {skill.review_status !== "approved"
                        ? ` · ${statusLabel(
                            skill.review_status,
                          )}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Mapping status
                <select
                  value={bulk.reviewStatus}
                  onChange={(event) =>
                    setBulk((current) => ({
                      ...current,
                      reviewStatus:
                        event.target
                          .value as MappingReviewStatus,
                    }))
                  }
                  style={input}
                >
                  <option value="draft">Draft</option>
                  <option value="reviewed">Reviewed</option>
                  {isAdmin && (
                    <option value="approved">Approved</option>
                  )}
                </select>
              </label>

              <label style={fieldLabel}>
                Secondary skill 1
                <select
                  value={bulk.secondary1SkillId}
                  onChange={(event) =>
                    setBulk((current) => ({
                      ...current,
                      secondary1SkillId: event.target.value,
                    }))
                  }
                  style={input}
                >
                  <option value="">None</option>
                  {eligibleSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.skill_code} · {skill.skill_name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Secondary 1 weight
                <select
                  value={bulk.secondary1Weight}
                  disabled={!bulk.secondary1SkillId}
                  onChange={(event) =>
                    setBulk((current) => ({
                      ...current,
                      secondary1Weight: Number(
                        event.target.value,
                      ),
                    }))
                  }
                  style={input}
                >
                  <option value={0.5}>0.50</option>
                  <option value={0.25}>0.25</option>
                </select>
              </label>

              <label style={fieldLabel}>
                Secondary skill 2
                <select
                  value={bulk.secondary2SkillId}
                  onChange={(event) =>
                    setBulk((current) => ({
                      ...current,
                      secondary2SkillId: event.target.value,
                    }))
                  }
                  style={input}
                >
                  <option value="">None</option>
                  {eligibleSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.skill_code} · {skill.skill_name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Secondary 2 weight
                <select
                  value={bulk.secondary2Weight}
                  disabled={!bulk.secondary2SkillId}
                  onChange={(event) =>
                    setBulk((current) => ({
                      ...current,
                      secondary2Weight: Number(
                        event.target.value,
                      ),
                    }))
                  }
                  style={input}
                >
                  <option value={0.5}>0.50</option>
                  <option value={0.25}>0.25</option>
                </select>
              </label>

              <label
                className="qm-full-field"
                style={fieldLabel}
              >
                Mapping reason
                <textarea
                  value={bulk.reason}
                  onChange={(event) =>
                    setBulk((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Explain why the selected questions share this mapping."
                  style={textarea}
                />
              </label>
            </div>

            <div style={bulkFooter}>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                disabled={busy}
                style={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void applyBulkMapping()}
                disabled={busy}
                style={primaryButton}
              >
                {busy ? "Applying..." : "Apply Mapping"}
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        #question-mapping-root,
        #question-mapping-root * {
          box-sizing: border-box;
        }

        #question-mapping-root button,
        #question-mapping-root input,
        #question-mapping-root select,
        #question-mapping-root textarea {
          font-family: inherit;
        }

        @media (max-width: 1040px) {
          .qm-filter-grid {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            ) !important;
          }

          .qm-summary-grid {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            ) !important;
          }

          .qm-question-card {
            grid-template-columns:
              34px minmax(0, 1fr) !important;
          }

          .qm-question-card > div:last-child {
            grid-column: 2;
          }
        }

        @media (max-width: 760px) {
          .qm-header {
            grid-template-columns: 1fr auto !important;
          }

          .qm-header > div:nth-child(2) {
            display: none;
          }

          .qm-heading-row {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .qm-filter-grid,
          .qm-summary-grid,
          .qm-bulk-grid {
            grid-template-columns: 1fr !important;
          }

          .qm-full-field {
            grid-column: auto !important;
          }

          .qm-question-card {
            grid-template-columns:
              28px minmax(0, 1fr) !important;
            padding: 14px !important;
          }
        }
      `}</style>
    </main>
  );
}

function StatusBadge({ state }: { state: MappingState }) {
  const styles: Record<MappingState, CSSProperties> = {
    all: {},
    unmapped: {
      color: "#cbd5e1",
      borderColor: "rgba(148,163,184,0.28)",
      background: "rgba(100,116,139,0.09)",
    },
    draft: {
      color: "#bfdbfe",
      borderColor: "rgba(96,165,250,0.3)",
      background: "rgba(59,130,246,0.09)",
    },
    reviewed: {
      color: "#fde68a",
      borderColor: "rgba(250,204,21,0.3)",
      background: "rgba(234,179,8,0.09)",
    },
    approved: {
      color: "#a7f3d0",
      borderColor: "rgba(52,211,153,0.3)",
      background: "rgba(16,185,129,0.09)",
    },
    retired: {
      color: "#fecaca",
      borderColor: "rgba(248,113,113,0.28)",
      background: "rgba(239,68,68,0.08)",
    },
  };

  return (
    <span style={{ ...statusBadge, ...styles[state] }}>
      {statusLabel(state)}
    </span>
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

function LockedPage({
  title,
  message,
  error,
  onBack,
}: {
  title: string;
  message: string;
  error?: string | null;
  onBack: () => void;
}) {
  return (
    <main style={pageShell}>
      <section style={lockedCard}>
        <p style={brandEyebrow}>QUESTION MAPPING</p>
        <h1>{title}</h1>
        <p style={pageDescription}>{message}</p>
        {error && <div style={errorBanner}>{error}</div>}
        <button
          type="button"
          onClick={onBack}
          style={primaryButton}
        >
          Return
        </button>
      </section>
    </main>
  );
}

const pageShell: CSSProperties = {
  minHeight: "100dvh",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  background:
    "radial-gradient(circle at 85% -10%,rgba(83,215,255,0.1),transparent 30%),#071226",
};

const header: CSSProperties = {
  minHeight: 72,
  padding: "10px 18px",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 12,
  position: "sticky",
  top: 0,
  zIndex: 60,
  borderBottom: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(10,23,48,0.97)",
  backdropFilter: "blur(18px)",
};

const backButton: CSSProperties = {
  justifySelf: "start",
  minHeight: 46,
  borderRadius: 999,
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 17px",
  cursor: "pointer",
  fontWeight: 800,
};

const headerTitle: CSSProperties = {
  textAlign: "center",
};

const brandEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: 11,
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const headerSubtitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 18,
  fontWeight: 900,
};

const adminPill: CSSProperties = {
  justifySelf: "end",
  padding: "9px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,215,106,0.32)",
  background: "rgba(255,215,106,0.09)",
  color: "#ffe6a8",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const workspace: CSSProperties = {
  width: "min(1540px,100%)",
  margin: "0 auto",
  padding: "34px clamp(16px,3vw,44px) 70px",
};

const headingRow: CSSProperties = {
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 24,
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#8dfcff",
  fontSize: 11,
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const pageTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(34px,4vw,54px)",
  lineHeight: 1,
  letterSpacing: "-0.045em",
};

const pageDescription: CSSProperties = {
  maxWidth: 850,
  margin: "12px 0 0",
  color: "rgba(235,247,255,0.62)",
  fontSize: 16,
  lineHeight: 1.6,
};

const filterPanel: CSSProperties = {
  marginTop: 25,
  padding: 16,
  display: "grid",
  gridTemplateColumns:
    "repeat(5,minmax(130px,1fr)) auto",
  gap: 11,
  borderRadius: 18,
  border: "1px solid rgba(126,232,255,0.13)",
  background: "rgba(10,23,48,0.72)",
};

const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 7,
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 800,
};

const input: CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 11,
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(2,8,19,0.74)",
  color: "white",
  padding: "9px 11px",
  outline: "none",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: 84,
  resize: "vertical",
};

const summaryGrid: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(5,minmax(0,1fr))",
  gap: 9,
};

const summaryCard: CSSProperties = {
  minHeight: 78,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: 14,
  border: "1px solid rgba(126,232,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "rgba(255,255,255,0.62)",
  cursor: "pointer",
};

const activeSummaryCard: CSSProperties = {
  borderColor: "rgba(126,232,255,0.42)",
  background: "rgba(83,215,255,0.11)",
  color: "white",
};

const toolbar: CSSProperties = {
  marginTop: 16,
  minHeight: 58,
  padding: "9px 12px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  borderRadius: 15,
  border: "1px solid rgba(126,232,255,0.1)",
  background: "rgba(10,23,48,0.65)",
};

const selectAllLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 800,
};

const selectionText: CSSProperties = {
  color: "rgba(255,255,255,0.48)",
  fontSize: 12,
};

const toolbarActions: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const secondaryButton: CSSProperties = {
  minHeight: 42,
  borderRadius: 11,
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 800,
};

const primaryButton: CSSProperties = {
  ...secondaryButton,
  borderColor: "rgba(126,232,255,0.4)",
  background:
    "linear-gradient(135deg,rgba(34,211,238,0.25),rgba(59,130,246,0.23))",
};

const approveButton: CSSProperties = {
  ...secondaryButton,
  borderColor: "rgba(52,211,153,0.3)",
  background: "rgba(16,185,129,0.1)",
  color: "#a7f3d0",
};

const questionList: CSSProperties = {
  marginTop: 14,
  display: "grid",
  gap: 11,
};

const questionCard: CSSProperties = {
  padding: 18,
  display: "grid",
  gridTemplateColumns: "34px minmax(0,1fr) 180px",
  gap: 16,
  alignItems: "start",
  borderRadius: 18,
  border: "1px solid rgba(126,232,255,0.1)",
  background:
    "linear-gradient(145deg,rgba(16,35,65,0.82),rgba(8,20,43,0.84))",
};

const questionCheckbox: CSSProperties = {
  paddingTop: 6,
};

const questionMain: CSSProperties = {
  minWidth: 0,
};

const questionTopLine: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 7,
};

const statusBadge: CSSProperties = {
  padding: "6px 9px",
  borderRadius: 999,
  border: "1px solid",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const subjectBadge: CSSProperties = {
  ...statusBadge,
  borderColor: "rgba(126,232,255,0.22)",
  background: "rgba(83,215,255,0.07)",
  color: "#b9f5ff",
};

const questionStatus: CSSProperties = {
  color: "rgba(235,247,255,0.4)",
  fontSize: 10,
  textTransform: "uppercase",
};

const topicText: CSSProperties = {
  margin: "11px 0 0",
  color: "#8dfcff",
  fontSize: 11,
  fontWeight: 900,
};

const questionPrompt: CSSProperties = {
  margin: "7px 0 0",
  fontSize: 17,
  lineHeight: 1.5,
};

const questionIdText: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(235,247,255,0.34)",
  fontSize: 10,
  overflowWrap: "anywhere",
};

const mappedSkill: CSSProperties = {
  marginTop: 12,
  padding: "10px 11px",
  display: "grid",
  gap: 4,
  borderRadius: 11,
  border: "1px solid rgba(52,211,153,0.14)",
  background: "rgba(16,185,129,0.055)",
  fontSize: 12,
};

const unmappedNotice: CSSProperties = {
  marginTop: 12,
  padding: "10px 11px",
  borderRadius: 11,
  border: "1px solid rgba(148,163,184,0.14)",
  background: "rgba(100,116,139,0.055)",
  color: "rgba(255,255,255,0.52)",
  fontSize: 12,
};

const questionActions: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const pagination: CSSProperties = {
  marginTop: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 13,
};

const pageText: CSSProperties = {
  color: "rgba(255,255,255,0.52)",
  fontSize: 12,
};

const errorBanner: CSSProperties = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(248,113,113,0.34)",
  background: "rgba(239,68,68,0.1)",
  color: "#fecaca",
  fontSize: 13,
};

const successBanner: CSSProperties = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(52,211,153,0.3)",
  background: "rgba(16,185,129,0.1)",
  color: "#a7f3d0",
  fontSize: 13,
};

const emptyState: CSSProperties = {
  marginTop: 18,
  padding: 35,
  borderRadius: 17,
  border: "1px dashed rgba(126,232,255,0.18)",
  color: "rgba(255,255,255,0.5)",
  textAlign: "center",
};

const messageCard: CSSProperties = {
  width: "min(720px,calc(100% - 32px))",
  margin: "70px auto",
  padding: 24,
  borderRadius: 20,
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(10,23,48,0.8)",
  color: "rgba(255,255,255,0.7)",
  textAlign: "center",
};

const lockedCard: CSSProperties = {
  width: "min(640px,calc(100% - 32px))",
  margin: "80px auto",
  padding: 28,
  borderRadius: 22,
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(10,23,48,0.84)",
};

const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  padding: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,3,12,0.78)",
  backdropFilter: "blur(10px)",
};

const modal: CSSProperties = {
  position: "relative",
  width: "min(1050px,calc(100vw - 24px))",
  maxHeight: "calc(100dvh - 24px)",
  overflowY: "auto",
};

const closeButton: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 5,
  width: 39,
  height: 39,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(2,8,19,0.8)",
  color: "white",
  cursor: "pointer",
  fontSize: 20,
};

const bulkModal: CSSProperties = {
  width: "min(900px,calc(100vw - 24px))",
  maxHeight: "calc(100dvh - 24px)",
  overflowY: "auto",
  padding: 22,
  borderRadius: 22,
  border: "1px solid rgba(126,232,255,0.22)",
  background:
    "linear-gradient(145deg,#0b1d3a,#061126 75%)",
  color: "white",
};

const bulkHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
};

const bulkTitle: CSSProperties = {
  margin: "7px 0 0",
  fontSize: 27,
};

const bulkDescription: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(235,247,255,0.52)",
  fontSize: 13,
  lineHeight: 1.5,
};

const bulkGrid: CSSProperties = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: 13,
};

const bulkFooter: CSSProperties = {
  marginTop: 20,
  paddingTop: 17,
  display: "flex",
  justifyContent: "flex-end",
  gap: 9,
  borderTop: "1px solid rgba(126,232,255,0.1)",
};
