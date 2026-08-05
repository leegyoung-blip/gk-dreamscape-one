"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurriculumDeveloperAccess } from "@/hooks/useCurriculumDeveloperAccess";
import { useNovaFeatureFlags } from "@/hooks/useNovaFeatureFlags";
import {
  downloadCsv,
  MAPPING_TEMPLATE,
  parseCsv,
  SKILL_TEMPLATE,
} from "./csv-utils";
import type { CsvRow } from "./csv-utils";

type Subject = "english" | "math" | "science";
type Tab = "dashboard" | "assignments" | "import" | "qa" | "export";

type Target = {
  id: string;
  subject: Subject;
  primary_level: number;
  topic_ref: string;
  topic_title: string;
  target_approved_coverage: number;
  rollout_status: string;
  due_date: string | null;
  published_questions: number;
  approved_mapped_questions: number;
  pending_mapped_questions: number;
  unmapped_questions: number;
  approved_coverage_percentage: number;
  required_qa_sample_count: number;
  qa_pending_count: number;
  qa_passed_count: number;
  qa_returned_count: number;
  release_ready: boolean;
};

type Person = {
  user_id: string;
  role: string;
  email: string | null;
  label: string;
};

type Assignment = {
  id: string;
  rollout_target_id: string;
  subject: Subject;
  primary_level: number;
  topic_title: string;
  assignment_type: string;
  assignee_user_id: string;
  assignee_label: string;
  assignment_status: string;
  target_count: number | null;
  completed_count: number;
  instructions: string | null;
  due_date: string | null;
  review_notes: string | null;
};

type Batch = {
  id: string;
  import_type: "skill_catalogue" | "question_mapping";
  file_name: string | null;
  requested_status: "draft" | "reviewed" | "approved";
  batch_status: string;
  row_count: number;
  valid_count: number;
  error_count: number;
  imported_count: number;
  created_at: string;
  message: string | null;
};

type ImportRow = {
  id: string;
  row_number: number;
  validation_status: string;
  error_messages: string[];
};

type ImportResult = {
  batch: Batch;
  rows: ImportRow[];
};

type QaRow = {
  id: string;
  rollout_target_id: string;
  subject: Subject;
  primary_level: number;
  topic_title: string;
  question_source: string;
  question_id: string;
  question_preview: string | null;
  mapping_version: number;
  mapping_status: string | null;
  primary_skill_code: string | null;
  primary_skill_name: string | null;
  qa_status: "pending" | "passed" | "returned";
  review_notes: string | null;
};

const SUBJECTS: Array<{ value: Subject; label: string }> = [
  { value: "english", label: "English" },
  { value: "math", label: "Mathematics" },
  { value: "science", label: "Science" },
];

function roleKey(value: string | null | undefined) {
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

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function subjectLabel(value: string) {
  return SUBJECTS.find((item) => item.value === value)?.label || value;
}

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function CurriculumRolloutClient() {
  const router = useRouter();
  const { status, role, error: accessError } =
    useCurriculumDeveloperAccess();

  const currentRole = roleKey(role);
  const isAdmin = currentRole === "admin";
  const isEditor = ["admin", "curriculum_lead"].includes(currentRole);
  const {
    isEnabled: featureEnabled,
    loading: featureFlagsLoading,
  } = useNovaFeatureFlags(role);
  const rolloutWorkspaceEnabled =
    featureEnabled(
      "curriculum_rollout_workspace_enabled",
      true,
    );

  const [tab, setTab] = useState<Tab>("dashboard");
  const [subject, setSubject] = useState<"all" | Subject>("all");
  const [level, setLevel] = useState<"all" | number>("all");
  const [targets, setTargets] = useState<Target[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [qaRows, setQaRows] = useState<QaRow[]>([]);
  const [summary, setSummary] = useState({
    targets: 0,
    average_coverage: 0,
    release_ready: 0,
    unmapped_questions: 0,
    returned_qa: 0,
  });

  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [assignmentType, setAssignmentType] =
    useState("question_mapping");
  const [assigneeId, setAssigneeId] = useState("");
  const [targetCount, setTargetCount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");

  const [importType, setImportType] =
    useState<"skill_catalogue" | "question_mapping">("skill_catalogue");
  const [requestedStatus, setRequestedStatus] =
    useState<"draft" | "reviewed" | "approved">("reviewed");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] =
    useState<ImportResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (status !== "allowed" || !isEditor) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const subjectValue = subject === "all" ? null : subject;
    const levelValue = level === "all" ? null : level;

    const calls = [
      supabase.rpc("curriculum_get_rollout_dashboard", {
        p_subject: subjectValue,
        p_primary_level: levelValue,
        p_rollout_status: null,
      }),
      supabase.rpc("curriculum_get_assignments", {
        p_rollout_target_id: null,
        p_assignment_status: null,
      }),
      supabase.rpc("curriculum_get_import_batches", {
        p_limit: 30,
      }),
      supabase.rpc("curriculum_get_qa_queue", {
        p_rollout_target_id: null,
        p_qa_status: null,
      }),
    ];

    if (isAdmin) {
      calls.push(supabase.rpc("curriculum_get_rollout_people"));
    }

    const results = await Promise.all(calls);
    const firstError = results.find((result) => result.error)?.error;

    if (firstError) {
      setError(
        `${firstError.message}. Confirm that Phase 2B.7 Steps 45A, 45B and 45C were installed.`,
      );
      setLoading(false);
      return;
    }

    const dashboard =
      results[0].data && typeof results[0].data === "object"
        ? (results[0].data as Record<string, unknown>)
        : {};
    const summaryData =
      dashboard.summary && typeof dashboard.summary === "object"
        ? (dashboard.summary as Record<string, unknown>)
        : {};

    setTargets(
      asArray<Record<string, unknown>>(dashboard.targets).map(
        (row): Target => ({
          id: String(row.id),
          subject: String(row.subject) as Subject,
          primary_level: num(row.primary_level),
          topic_ref: String(row.topic_ref || ""),
          topic_title: String(row.topic_title || ""),
          target_approved_coverage: num(row.target_approved_coverage),
          rollout_status: String(row.rollout_status || "planning"),
          due_date: row.due_date ? String(row.due_date) : null,
          published_questions: num(row.published_questions),
          approved_mapped_questions: num(row.approved_mapped_questions),
          pending_mapped_questions: num(row.pending_mapped_questions),
          unmapped_questions: num(row.unmapped_questions),
          approved_coverage_percentage: num(
            row.approved_coverage_percentage,
          ),
          required_qa_sample_count: num(row.required_qa_sample_count),
          qa_pending_count: num(row.qa_pending_count),
          qa_passed_count: num(row.qa_passed_count),
          qa_returned_count: num(row.qa_returned_count),
          release_ready: Boolean(row.release_ready),
        }),
      ),
    );

    setSummary({
      targets: num(summaryData.targets),
      average_coverage: num(summaryData.average_coverage),
      release_ready: num(summaryData.release_ready),
      unmapped_questions: num(summaryData.unmapped_questions),
      returned_qa: num(summaryData.returned_qa),
    });

    setAssignments(
      asArray<Record<string, unknown>>(results[1].data).map(
        (row): Assignment => ({
          id: String(row.id),
          rollout_target_id: String(row.rollout_target_id),
          subject: String(row.subject) as Subject,
          primary_level: num(row.primary_level),
          topic_title: String(row.topic_title || ""),
          assignment_type: String(row.assignment_type || ""),
          assignee_user_id: String(row.assignee_user_id || ""),
          assignee_label: String(
            row.assignee_label || row.assignee_email || "",
          ),
          assignment_status: String(row.assignment_status || "assigned"),
          target_count:
            row.target_count === null || row.target_count === undefined
              ? null
              : num(row.target_count),
          completed_count: num(row.completed_count),
          instructions: row.instructions ? String(row.instructions) : null,
          due_date: row.due_date ? String(row.due_date) : null,
          review_notes: row.review_notes ? String(row.review_notes) : null,
        }),
      ),
    );

    setBatches(
      asArray<Record<string, unknown>>(results[2].data).map(
        (row): Batch => ({
          id: String(row.id),
          import_type: String(row.import_type) as Batch["import_type"],
          file_name: row.file_name ? String(row.file_name) : null,
          requested_status: String(
            row.requested_status || "reviewed",
          ) as Batch["requested_status"],
          batch_status: String(row.batch_status || ""),
          row_count: num(row.row_count),
          valid_count: num(row.valid_count),
          error_count: num(row.error_count),
          imported_count: num(row.imported_count),
          created_at: String(row.created_at || ""),
          message: row.message ? String(row.message) : null,
        }),
      ),
    );

    setQaRows(
      asArray<Record<string, unknown>>(results[3].data).map(
        (row): QaRow => ({
          id: String(row.id),
          rollout_target_id: String(row.rollout_target_id),
          subject: String(row.subject) as Subject,
          primary_level: num(row.primary_level),
          topic_title: String(row.topic_title || ""),
          question_source: String(row.question_source || ""),
          question_id: String(row.question_id || ""),
          question_preview: row.question_preview
            ? String(row.question_preview)
            : null,
          mapping_version: num(row.mapping_version),
          mapping_status: row.mapping_status
            ? String(row.mapping_status)
            : null,
          primary_skill_code: row.primary_skill_code
            ? String(row.primary_skill_code)
            : null,
          primary_skill_name: row.primary_skill_name
            ? String(row.primary_skill_name)
            : null,
          qa_status: String(row.qa_status || "pending") as QaRow["qa_status"],
          review_notes: row.review_notes ? String(row.review_notes) : null,
        }),
      ),
    );

    if (isAdmin) {
      setPeople(
        asArray<Record<string, unknown>>(results[4].data).map(
          (row): Person => ({
            user_id: String(row.user_id),
            role: String(row.role || ""),
            email: row.email ? String(row.email) : null,
            label: String(row.label || row.email || ""),
          }),
        ),
      );
    }

    setLoading(false);
  }, [isAdmin, isEditor, level, status, subject]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) || null,
    [selectedTargetId, targets],
  );

  async function runAction(
    action: () => Promise<{ error: { message: string } | null }>,
    successMessage: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await action();
    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return false;
    }

    setMessage(successMessage);
    await load();
    return true;
  }

  async function assignWork() {
    if (!selectedTargetId || !assigneeId) {
      setError("Choose a rollout target and assignee.");
      return;
    }

    const ok = await runAction(
      async () =>
        supabase.rpc("curriculum_assign_rollout_work", {
          p_rollout_target_id: selectedTargetId,
          p_assignment_type: assignmentType,
          p_assignee_user_id: assigneeId,
          p_target_count:
            targetCount.trim() === "" ? null : Number(targetCount),
          p_instructions: instructions.trim() || null,
          p_due_date: dueDate || null,
        }),
      "Curriculum work assigned.",
    );

    if (ok) {
      setTargetCount("");
      setInstructions("");
      setDueDate("");
    }
  }

  async function updateAssignment(
    assignment: Assignment,
    nextStatus: string,
  ) {
    const completed =
      nextStatus === "submitted"
        ? window.prompt(
            "Completed row or question count:",
            String(
              assignment.completed_count ||
                assignment.target_count ||
                0,
            ),
          )
        : null;
    const notes =
      isAdmin && ["approved", "returned", "cancelled"].includes(nextStatus)
        ? window.prompt("Review notes:", assignment.review_notes || "")
        : null;

    await runAction(
      async () =>
        supabase.rpc("curriculum_update_assignment_status", {
          p_assignment_id: assignment.id,
          p_assignment_status: nextStatus,
          p_completed_count:
            completed === null || completed.trim() === ""
              ? null
              : Number(completed),
          p_review_notes: notes,
        }),
      `Assignment changed to ${label(nextStatus)}.`,
    );
  }

  async function readCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const rows = parseCsv(await file.text());
    setFileName(file.name);
    setCsvRows(rows);
    setImportResult(null);
    setError(rows.length ? "" : "No CSV data rows were found.");
  }

  async function validateImport() {
    if (!csvRows.length) {
      setError("Choose a CSV file first.");
      return;
    }

    setBusy(true);
    setError("");
    const { data, error: validationError } = await supabase.rpc(
      "curriculum_validate_import_batch",
      {
        p_import_type: importType,
        p_file_name: fileName || null,
        p_requested_status: requestedStatus,
        p_rows: csvRows,
      },
    );
    setBusy(false);

    if (validationError) {
      setError(validationError.message);
      return;
    }

    setImportResult(data as ImportResult);
    setMessage("CSV validation completed.");
    await load();
  }

  async function applyImport() {
    if (!importResult?.batch.id) return;

    setBusy(true);
    setError("");
    const { data, error: importError } = await supabase.rpc(
      "curriculum_apply_import_batch",
      { p_batch_id: importResult.batch.id },
    );
    setBusy(false);

    if (importError) {
      setError(importError.message);
      return;
    }

    setImportResult(data as ImportResult);
    setMessage("Valid rows were imported.");
    await load();
  }

  async function createQa(target: Target) {
    setBusy(true);
    setError("");
    const { data, error: qaError } = await supabase.rpc(
      "curriculum_create_qa_sample",
      {
        p_rollout_target_id: target.id,
        p_sample_percentage: null,
        p_minimum_rows: null,
      },
    );
    setBusy(false);

    if (qaError) {
      setError(qaError.message);
      return;
    }

    const result =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};
    setMessage(`${num(result.new_rows_created)} QA row(s) created.`);
    setTab("qa");
    await load();
  }

  async function reviewQa(
    row: QaRow,
    nextStatus: "passed" | "returned",
  ) {
    const notes = window.prompt(
      nextStatus === "passed"
        ? "Optional QA note:"
        : "Explain what must be corrected:",
      row.review_notes || "",
    );
    if (notes === null) return;

    const issues =
      nextStatus === "returned"
        ? window.prompt(
            "Issue codes separated by commas:",
            "wrong_primary_skill",
          )
        : "";

    await runAction(
      async () =>
        supabase.rpc("curriculum_review_mapping_qa", {
          p_qa_review_id: row.id,
          p_qa_status: nextStatus,
          p_review_notes: notes || null,
          p_issue_codes: String(issues || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      nextStatus === "passed"
        ? "QA passed and mapping approved."
        : "Mapping returned to Draft.",
    );
  }

  async function exportRows(
    type: "skills" | "mappings" | "rollout" | "qa",
  ) {
    setBusy(true);
    setError("");
    const { data, error: exportError } = await supabase.rpc(
      "curriculum_get_export_data",
      {
        p_export_type: type,
        p_subject: subject === "all" ? null : subject,
        p_primary_level: level === "all" ? null : level,
        p_rollout_target_id: null,
      },
    );
    setBusy(false);

    if (exportError) {
      setError(exportError.message);
      return;
    }

    downloadCsv(
      `dreamscape-${type}-${new Date().toISOString().slice(0, 10)}.csv`,
      asArray<Record<string, unknown>>(data),
    );
  }

  if (status === "checking") {
    return <main className="cr-shell cr-center">Checking access…</main>;
  }

  if (
    status === "locked" ||
    !isEditor ||
    (!isAdmin &&
      !featureFlagsLoading &&
      !rolloutWorkspaceEnabled)
  ) {
    return (
      <main className="cr-shell cr-center">
        <section className="cr-panel cr-locked">
          <p className="cr-eyebrow">CURRICULUM ROLLOUT</p>
          <h1>Access Restricted</h1>
          <p>
            {!isAdmin && !rolloutWorkspaceEnabled
              ? "Curriculum Lead access to the Rollout workspace is currently disabled by the production release controls."
              : "This workspace requires an Admin or Curriculum Lead role."}
          </p>
          {accessError && <div className="cr-error">{accessError}</div>}
          <button
            type="button"
            onClick={() => router.push("/curriculum-developer")}
          >
            Return
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="cr-shell">
      <header className="cr-header">
        <button
          type="button"
          onClick={() =>
            router.push("/curriculum-developer/learning-skills")
          }
        >
          ← Learning Skills
        </button>
        <div>
          <p>NOVA LEARNING PROFILE</p>
          <strong>Curriculum Rollout & QA</strong>
        </div>
        <span>{isAdmin ? "Admin" : "Curriculum Lead"}</span>
      </header>

      <section className="cr-workspace">
        <div className="cr-title-row">
          <div>
            <p className="cr-eyebrow">PHASE 2B.7</p>
            <h1>Scale the Skill Mapping System</h1>
            <p className="cr-description">
              Assign curriculum work, import skill and mapping batches,
              review QA samples and track release readiness across all
              Primary levels.
            </p>
          </div>
          <div className="cr-title-actions">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/curriculum-developer/learning-skills/question-mapping",
                )
              }
            >
              Question Mapping
            </button>
            <button
              type="button"
              onClick={() =>
                router.push("/curriculum-developer/learning-skills")
              }
            >
              Skill Catalogue
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/curriculum-developer/learning-skills/operations",
                  )
                }
              >
                Production Operations
              </button>
            )}
          </div>
        </div>

        <nav className="cr-tabs">
          {(
            [
              ["dashboard", "Rollout Dashboard"],
              ["assignments", "Assignments"],
              ["import", "Bulk Import"],
              ["qa", "QA Review"],
              ["export", "Export"],
            ] as Array<[Tab, string]>
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              className={tab === value ? "active" : ""}
              onClick={() => setTab(value)}
            >
              {text}
            </button>
          ))}
        </nav>

        <div className="cr-filters">
          <label>
            Subject
            <select
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value as "all" | Subject)
              }
            >
              <option value="all">All subjects</option>
              {SUBJECTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Primary level
            <select
              value={level}
              onChange={(event) =>
                setLevel(
                  event.target.value === "all"
                    ? "all"
                    : Number(event.target.value),
                )
              }
            >
              <option value="all">All levels</option>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  Primary {value}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void load()}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error && <div className="cr-error">{error}</div>}
        {message && <div className="cr-success">{message}</div>}

        {loading ? (
          <div className="cr-empty">Loading rollout workspace…</div>
        ) : tab === "dashboard" ? (
          <>
            <div className="cr-stats">
              <Stat label="Rollout targets" value={summary.targets} />
              <Stat
                label="Average coverage"
                value={`${Math.round(summary.average_coverage)}%`}
              />
              <Stat label="Release ready" value={summary.release_ready} />
              <Stat
                label="Unmapped questions"
                value={summary.unmapped_questions}
              />
              <Stat label="QA returned" value={summary.returned_qa} />
            </div>

            <div className="cr-list">
              {targets.map((target) => (
                <article key={target.id} className="cr-target">
                  <div>
                    <div className="cr-pills">
                      <Pill
                        value={
                          target.release_ready
                            ? "release_ready"
                            : target.rollout_status
                        }
                      />
                      <Pill
                        value={`${subjectLabel(target.subject)} · P${target.primary_level}`}
                      />
                    </div>
                    <h3>{target.topic_title}</h3>
                    <div className="cr-progress">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            target.approved_coverage_percentage,
                          )}%`,
                        }}
                      />
                    </div>
                    <p>
                      {Math.round(target.approved_coverage_percentage)}%
                      approved · target{" "}
                      {Math.round(target.target_approved_coverage)}%
                    </p>
                  </div>

                  <div className="cr-metrics">
                    <Metric
                      label="Published"
                      value={target.published_questions}
                    />
                    <Metric
                      label="Approved"
                      value={target.approved_mapped_questions}
                    />
                    <Metric
                      label="Pending"
                      value={target.pending_mapped_questions}
                    />
                    <Metric
                      label="Unmapped"
                      value={target.unmapped_questions}
                    />
                    <Metric
                      label="QA passed"
                      value={`${target.qa_passed_count}/${target.required_qa_sample_count}`}
                    />
                    <Metric label="Due" value={dateLabel(target.due_date)} />
                  </div>

                  <div className="cr-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTargetId(target.id);
                        setTab("assignments");
                      }}
                    >
                      View work
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="approve"
                        onClick={() => void createQa(target)}
                      >
                        Create QA sample
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {!targets.length && (
                <div className="cr-empty">
                  No rollout targets match the filters. Run Step 46.
                </div>
              )}
            </div>
          </>
        ) : tab === "assignments" ? (
          <div className="cr-two-column">
            {isAdmin && (
              <section className="cr-panel">
                <p className="cr-eyebrow">ADMIN ASSIGNMENT</p>
                <h2>Assign curriculum work</h2>
                <div className="cr-form-grid">
                  <label>
                    Rollout target
                    <select
                      value={selectedTargetId}
                      onChange={(event) =>
                        setSelectedTargetId(event.target.value)
                      }
                    >
                      <option value="">Choose target</option>
                      {targets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {subjectLabel(target.subject)} P
                          {target.primary_level} · {target.topic_title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assignment type
                    <select
                      value={assignmentType}
                      onChange={(event) =>
                        setAssignmentType(event.target.value)
                      }
                    >
                      <option value="skill_definition">
                        Skill definition
                      </option>
                      <option value="question_mapping">
                        Question mapping
                      </option>
                      <option value="qa_preparation">
                        QA preparation
                      </option>
                      <option value="correction">Correction</option>
                    </select>
                  </label>
                  <label>
                    Assignee
                    <select
                      value={assigneeId}
                      onChange={(event) =>
                        setAssigneeId(event.target.value)
                      }
                    >
                      <option value="">Choose person</option>
                      {people.map((person) => (
                        <option key={person.user_id} value={person.user_id}>
                          {person.label} · {label(person.role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Target count
                    <input
                      type="number"
                      min={0}
                      value={targetCount}
                      onChange={(event) => setTargetCount(event.target.value)}
                    />
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </label>
                  <label className="full">
                    Instructions
                    <textarea
                      rows={3}
                      value={instructions}
                      onChange={(event) =>
                        setInstructions(event.target.value)
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => void assignWork()}
                >
                  Assign work
                </button>
              </section>
            )}

            <section className="cr-panel">
              <p className="cr-eyebrow">WORK QUEUE</p>
              <h2>{isAdmin ? "All assignments" : "My assignments"}</h2>
              <div className="cr-list">
                {assignments.map((assignment) => (
                  <article key={assignment.id} className="cr-assignment">
                    <div className="cr-pills">
                      <Pill value={assignment.assignment_status} />
                      <Pill
                        value={`${subjectLabel(assignment.subject)} · P${assignment.primary_level}`}
                      />
                    </div>
                    <h3>{assignment.topic_title}</h3>
                    <p>
                      {label(assignment.assignment_type)} ·{" "}
                      {assignment.assignee_label}
                    </p>
                    {assignment.instructions && (
                      <p>{assignment.instructions}</p>
                    )}
                    <div className="cr-metrics">
                      <Metric
                        label="Progress"
                        value={
                          assignment.target_count === null
                            ? assignment.completed_count
                            : `${assignment.completed_count}/${assignment.target_count}`
                        }
                      />
                      <Metric
                        label="Due"
                        value={dateLabel(assignment.due_date)}
                      />
                    </div>
                    <div className="cr-actions horizontal">
                      {assignment.assignment_status === "assigned" && (
                        <button
                          type="button"
                          onClick={() =>
                            void updateAssignment(
                              assignment,
                              "in_progress",
                            )
                          }
                        >
                          Start
                        </button>
                      )}
                      {["assigned", "in_progress", "returned"].includes(
                        assignment.assignment_status,
                      ) && (
                        <button
                          type="button"
                          className="primary"
                          onClick={() =>
                            void updateAssignment(
                              assignment,
                              "submitted",
                            )
                          }
                        >
                          Submit
                        </button>
                      )}
                      {isAdmin &&
                        assignment.assignment_status === "submitted" && (
                          <>
                            <button
                              type="button"
                              className="approve"
                              onClick={() =>
                                void updateAssignment(
                                  assignment,
                                  "approved",
                                )
                              }
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="return"
                              onClick={() =>
                                void updateAssignment(
                                  assignment,
                                  "returned",
                                )
                              }
                            >
                              Return
                            </button>
                          </>
                        )}
                    </div>
                  </article>
                ))}
                {!assignments.length && (
                  <div className="cr-empty">No assignments available.</div>
                )}
              </div>
            </section>
          </div>
        ) : tab === "import" ? (
          <div className="cr-two-column">
            <section className="cr-panel">
              <p className="cr-eyebrow">CSV WORKFLOW</p>
              <h2>Validate and import a batch</h2>
              <p>
                Every row is validated and stored before valid rows are
                applied.
              </p>
              <div className="cr-form-grid">
                <label>
                  Import type
                  <select
                    value={importType}
                    onChange={(event) => {
                      setImportType(
                        event.target.value as typeof importType,
                      );
                      setCsvRows([]);
                      setFileName("");
                      setImportResult(null);
                    }}
                  >
                    <option value="skill_catalogue">
                      Skill catalogue
                    </option>
                    <option value="question_mapping">
                      Question mappings
                    </option>
                  </select>
                </label>
                <label>
                  Requested status
                  <select
                    value={requestedStatus}
                    onChange={(event) =>
                      setRequestedStatus(
                        event.target.value as typeof requestedStatus,
                      )
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="reviewed">Reviewed</option>
                    {isAdmin && (
                      <option value="approved">Approved</option>
                    )}
                  </select>
                </label>
                <label className="full cr-file">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => void readCsv(event)}
                  />
                  <span>{fileName || "Choose a completed CSV template"}</span>
                </label>
              </div>
              <div className="cr-actions horizontal">
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      "dreamscape-skill-import-template.csv",
                      SKILL_TEMPLATE,
                    )
                  }
                >
                  Skill template
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      "dreamscape-mapping-import-template.csv",
                      MAPPING_TEMPLATE,
                    )
                  }
                >
                  Mapping template
                </button>
              </div>
              <p>{csvRows.length} row(s) loaded.</p>
              <button
                type="button"
                className="primary"
                disabled={!csvRows.length || busy}
                onClick={() => void validateImport()}
              >
                Validate batch
              </button>
            </section>

            <section className="cr-panel">
              <p className="cr-eyebrow">VALIDATION RESULT</p>
              <h2>Import status</h2>
              {!importResult ? (
                <div className="cr-empty">
                  Validate a CSV to see row-level results.
                </div>
              ) : (
                <>
                  <div className="cr-metrics">
                    <Metric
                      label="Rows"
                      value={importResult.batch.row_count}
                    />
                    <Metric
                      label="Valid"
                      value={importResult.batch.valid_count}
                    />
                    <Metric
                      label="Errors"
                      value={importResult.batch.error_count}
                    />
                    <Metric
                      label="Imported"
                      value={importResult.batch.imported_count}
                    />
                  </div>
                  <div className="cr-validation-list">
                    {importResult.rows.slice(0, 100).map((row) => (
                      <article key={row.id}>
                        <strong>Row {row.row_number}</strong>
                        <span>{label(row.validation_status)}</span>
                        {row.error_messages.length > 0 && (
                          <p>{row.error_messages.join(" · ")}</p>
                        )}
                      </article>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="approve"
                    disabled={!importResult.batch.valid_count || busy}
                    onClick={() => void applyImport()}
                  >
                    Apply valid rows
                  </button>
                </>
              )}
            </section>

            <section className="cr-panel full-panel">
              <p className="cr-eyebrow">RECENT BATCHES</p>
              <div className="cr-batches">
                {batches.map((batch) => (
                  <article key={batch.id}>
                    <div>
                      <strong>{batch.file_name || "Unnamed CSV"}</strong>
                      <span>
                        {label(batch.import_type)} ·{" "}
                        {dateLabel(batch.created_at)}
                      </span>
                    </div>
                    <Pill value={batch.batch_status} />
                    <small>
                      {batch.imported_count}/{batch.row_count} imported ·{" "}
                      {batch.error_count} errors
                    </small>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : tab === "qa" ? (
          <section className="cr-panel">
            <p className="cr-eyebrow">CURRICULUM QA</p>
            <h2>Mapping review samples</h2>
            <p>
              Passing a sample approves the mapping. Returning it moves
              the version back to Draft.
            </p>
            <div className="cr-list">
              {qaRows.map((row) => (
                <article key={row.id} className="cr-qa">
                  <div>
                    <div className="cr-pills">
                      <Pill value={row.qa_status} />
                      <Pill
                        value={`${subjectLabel(row.subject)} · P${row.primary_level}`}
                      />
                    </div>
                    <small>{row.topic_title}</small>
                    <h3>
                      {row.question_preview || `Question ${row.question_id}`}
                    </h3>
                    <p>
                      Primary:{" "}
                      <strong>
                        {row.primary_skill_code || "—"} ·{" "}
                        {row.primary_skill_name || "Unmapped"}
                      </strong>
                    </p>
                  </div>
                  <div className="cr-metrics">
                    <Metric
                      label="Version"
                      value={row.mapping_version}
                    />
                    <Metric
                      label="Mapping status"
                      value={label(row.mapping_status || "unknown")}
                    />
                  </div>
                  {isAdmin && row.qa_status === "pending" && (
                    <div className="cr-actions">
                      <button
                        type="button"
                        className="approve"
                        onClick={() => void reviewQa(row, "passed")}
                      >
                        Pass & Approve
                      </button>
                      <button
                        type="button"
                        className="return"
                        onClick={() => void reviewQa(row, "returned")}
                      >
                        Return
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {!qaRows.length && (
                <div className="cr-empty">No QA samples created.</div>
              )}
            </div>
          </section>
        ) : (
          <section className="cr-panel">
            <p className="cr-eyebrow">CSV EXPORT</p>
            <h2>Export curriculum records</h2>
            <p>Exports follow the filters at the top of this page.</p>
            <div className="cr-export-grid">
              {(
                [
                  ["skills", "Skill catalogue"],
                  ["mappings", "Question mappings"],
                  ["rollout", "Rollout progress"],
                  ["qa", "QA history"],
                ] as const
              ).map(([value, title]) => (
                <article key={value}>
                  <h3>{title}</h3>
                  <button
                    type="button"
                    onClick={() => void exportRows(value)}
                  >
                    Download CSV
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      <style jsx global>{`
        .cr-shell,
        .cr-shell * {
          box-sizing: border-box;
        }

        .cr-shell {
          min-height: 100dvh;
          color: white;
          font-family: Arial, Helvetica, sans-serif;
          background:
            radial-gradient(
              circle at 85% -10%,
              rgba(83, 215, 255, 0.1),
              transparent 30%
            ),
            #071226;
        }

        .cr-shell button,
        .cr-shell input,
        .cr-shell select,
        .cr-shell textarea {
          font: inherit;
        }

        .cr-shell button {
          min-height: 40px;
          padding: 0 13px;
          border-radius: 11px;
          border: 1px solid rgba(126, 232, 255, 0.22);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .cr-shell button.primary {
          border-color: rgba(126, 232, 255, 0.4);
          background: linear-gradient(
            135deg,
            rgba(34, 211, 238, 0.25),
            rgba(59, 130, 246, 0.23)
          );
        }

        .cr-shell button.approve {
          border-color: rgba(52, 211, 153, 0.34);
          background: rgba(16, 185, 129, 0.12);
          color: #a7f3d0;
        }

        .cr-shell button.return {
          border-color: rgba(248, 113, 113, 0.3);
          background: rgba(239, 68, 68, 0.09);
          color: #fecaca;
        }

        .cr-shell button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cr-center {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .cr-header {
          min-height: 72px;
          padding: 10px 18px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(126, 232, 255, 0.2);
          background: rgba(10, 23, 48, 0.97);
        }

        .cr-header > div {
          text-align: center;
        }

        .cr-header p {
          margin: 0;
          color: #7ee8ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .cr-header strong {
          display: block;
          margin-top: 4px;
          font-size: 18px;
        }

        .cr-header > span {
          justify-self: end;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 215, 106, 0.3);
          color: #ffe6a8;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .cr-workspace {
          width: min(1540px, 100%);
          margin: 0 auto;
          padding: 34px clamp(16px, 3vw, 44px) 70px;
        }

        .cr-title-row {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
        }

        .cr-title-row h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .cr-description {
          max-width: 850px;
          color: rgba(235, 247, 255, 0.62);
          font-size: 15px;
          line-height: 1.6;
        }

        .cr-title-actions,
        .cr-actions.horizontal {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .cr-eyebrow {
          margin: 0;
          color: #8dfcff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .cr-tabs {
          margin-top: 24px;
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .cr-tabs button.active {
          border-color: rgba(126, 232, 255, 0.42);
          background: rgba(83, 215, 255, 0.12);
        }

        .cr-filters {
          margin-top: 16px;
          padding: 14px;
          display: grid;
          grid-template-columns: 220px 180px auto;
          gap: 11px;
          align-items: end;
          border-radius: 17px;
          border: 1px solid rgba(126, 232, 255, 0.12);
          background: rgba(10, 23, 48, 0.7);
        }

        .cr-shell label {
          display: grid;
          gap: 7px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 800;
        }

        .cr-shell input,
        .cr-shell select,
        .cr-shell textarea {
          width: 100%;
          min-height: 42px;
          padding: 9px 11px;
          border-radius: 10px;
          border: 1px solid rgba(126, 232, 255, 0.18);
          background: rgba(2, 8, 19, 0.75);
          color: white;
        }

        .cr-error,
        .cr-success {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
        }

        .cr-error {
          border: 1px solid rgba(248, 113, 113, 0.34);
          background: rgba(239, 68, 68, 0.1);
          color: #fecaca;
        }

        .cr-success {
          border: 1px solid rgba(52, 211, 153, 0.3);
          background: rgba(16, 185, 129, 0.1);
          color: #a7f3d0;
        }

        .cr-stats {
          margin-top: 17px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .cr-stat,
        .cr-panel,
        .cr-target,
        .cr-assignment,
        .cr-qa {
          border: 1px solid rgba(126, 232, 255, 0.11);
          background: rgba(10, 23, 48, 0.75);
          border-radius: 17px;
        }

        .cr-stat {
          padding: 16px;
        }

        .cr-stat span,
        .cr-metric span {
          color: rgba(235, 247, 255, 0.42);
          font-size: 9px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .cr-stat strong {
          display: block;
          margin-top: 8px;
          font-size: 28px;
        }

        .cr-list {
          margin-top: 15px;
          display: grid;
          gap: 10px;
        }

        .cr-target {
          padding: 17px;
          display: grid;
          grid-template-columns: minmax(260px, 1.3fr) minmax(400px, 2fr) auto;
          gap: 16px;
          align-items: center;
        }

        .cr-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .cr-pill {
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.2);
          background: rgba(83, 215, 255, 0.08);
          color: #b9f5ff;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .cr-target h3,
        .cr-assignment h3,
        .cr-qa h3 {
          margin: 9px 0 0;
        }

        .cr-target p,
        .cr-assignment p,
        .cr-qa p,
        .cr-panel > p {
          color: rgba(235, 247, 255, 0.53);
          font-size: 12px;
          line-height: 1.5;
        }

        .cr-progress {
          height: 7px;
          margin-top: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
        }

        .cr-progress span {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #53d7ff, #6cf3c7);
        }

        .cr-metrics {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 7px;
        }

        .cr-metric {
          padding: 9px 10px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
        }

        .cr-metric strong {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .cr-actions {
          display: grid;
          gap: 8px;
        }

        .cr-two-column {
          margin-top: 17px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .cr-panel {
          padding: 19px;
        }

        .cr-panel h2 {
          margin: 7px 0 0;
          font-size: 25px;
        }

        .cr-form-grid {
          margin: 17px 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .cr-form-grid .full,
        .full-panel {
          grid-column: 1 / -1;
        }

        .cr-assignment,
        .cr-qa {
          padding: 14px;
        }

        .cr-assignment .cr-metrics {
          margin-top: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .cr-file {
          min-height: 80px;
          padding: 14px;
          display: flex !important;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(126, 232, 255, 0.28);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
        }

        .cr-file input {
          display: none;
        }

        .cr-validation-list {
          max-height: 340px;
          margin: 13px 0;
          overflow-y: auto;
          display: grid;
          gap: 6px;
        }

        .cr-validation-list article {
          padding: 10px;
          display: grid;
          grid-template-columns: 70px 100px 1fr;
          gap: 8px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
          font-size: 11px;
        }

        .cr-batches {
          display: grid;
          gap: 7px;
        }

        .cr-batches article {
          padding: 11px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: center;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.025);
        }

        .cr-batches article > div {
          display: grid;
          gap: 4px;
        }

        .cr-batches span,
        .cr-batches small {
          color: rgba(235, 247, 255, 0.45);
          font-size: 10px;
        }

        .cr-qa {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 250px auto;
          gap: 14px;
        }

        .cr-qa .cr-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .cr-export-grid {
          margin-top: 17px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .cr-export-grid article {
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.025);
        }

        .cr-empty {
          margin-top: 16px;
          padding: 28px;
          border: 1px dashed rgba(126, 232, 255, 0.16);
          border-radius: 14px;
          color: rgba(235, 247, 255, 0.5);
          text-align: center;
        }

        .cr-locked {
          width: min(640px, 100%);
        }

        @media (max-width: 1100px) {
          .cr-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .cr-target {
            grid-template-columns: 1fr;
          }

          .cr-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .cr-header {
            grid-template-columns: 1fr auto;
          }

          .cr-header > div {
            display: none;
          }

          .cr-title-row,
          .cr-two-column {
            display: grid;
            grid-template-columns: 1fr;
          }

          .cr-tabs {
            overflow-x: auto;
            justify-content: flex-start;
          }

          .cr-filters,
          .cr-form-grid,
          .cr-stats,
          .cr-export-grid {
            grid-template-columns: 1fr;
          }

          .cr-form-grid .full,
          .full-panel {
            grid-column: auto;
          }

          .cr-qa {
            grid-template-columns: 1fr;
          }

          .cr-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}

function Stat({
  label: statLabel,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="cr-stat">
      <span>{statLabel}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Metric({
  label: metricLabel,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="cr-metric">
      <span>{metricLabel}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Pill({ value }: { value: string }) {
  return <span className="cr-pill">{label(value)}</span>;
}
