"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type { CoreSubject, CurriculumRole, JsonObject } from "../types";

const REQUIRED_HEADERS = [
  "image_flag",
  "image_reference",
  "primary_level",
  "topic_slug",
  "topic_title",
  "quiz_id",
  "quiz_code",
  "quiz_title",
  "quiz_type",
  "quiz_order",
  "quiz_question_count",
  "question_id",
  "question_code",
  "question_order",
  "question_type",
  "difficulty",
  "marks",
  "instruction",
  "prompt",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
  "correct_answer",
  "explanation",
  "skill",
  "skill_tags",
] as const;

type ImportStatus =
  | "uploading"
  | "validating"
  | "ready"
  | "blocked"
  | "applying"
  | "completed"
  | "failed"
  | "cancelled";

type ImportSummary = {
  row_count?: number;
  valid_row_count?: number;
  warning_row_count?: number;
  error_row_count?: number;
  new_quiz_count?: number;
  updated_quiz_count?: number;
  new_question_count?: number;
  updated_question_count?: number;
  applied_quiz_count?: number;
  applied_question_count?: number;
};

type ImportBatch = {
  id: string;
  subject: CoreSubject;
  primary_level: number;
  file_name: string;
  source_hash: string;
  allow_published_updates: boolean;
  status: ImportStatus;
  row_count: number;
  valid_row_count: number;
  warning_row_count: number;
  error_row_count: number;
  summary: ImportSummary;
  operation_id: string | null;
  created_at: string;
  validated_at: string | null;
  completed_at: string | null;
  error_message: string | null;
};

type ImportMessage = {
  level: "error" | "warning";
  code: string;
  message: string;
};

type ImportRow = {
  id: string;
  row_number: number;
  raw_data: JsonObject;
  topic_slug: string | null;
  quiz_code: string | null;
  quiz_action: "create" | "update" | null;
  question_code: string | null;
  question_action: "create" | "update" | null;
  validation_status: "pending" | "valid" | "warning" | "error";
  messages: ImportMessage[];
};

type ParsedCsv = {
  rows: JsonObject[];
  imageRowCount: number;
};

export default function QuizImportView({ role }: { role: CurriculumRole }) {
  const [subject, setSubject] = useState<CoreSubject>("math");
  const [level, setLevel] = useState(1);
  const [allowPublishedUpdates, setAllowPublishedUpdates] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [recentBatches, setRecentBatches] = useState<ImportBatch[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRecentBatches = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("curriculum_import_batches")
      .select(
        "id,subject,primary_level,file_name,source_hash,allow_published_updates,status,row_count,valid_row_count,warning_row_count,error_row_count,summary,operation_id,created_at,validated_at,completed_at,error_message",
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (loadError) {
      setError(
        `${loadError.message}. Run the Curriculum Operations Phase 3 SQL migration first.`,
      );
      setRecentBatches([]);
    } else {
      setRecentBatches((data || []) as unknown as ImportBatch[]);
    }
  }, []);

  const loadBatch = useCallback(async (batchId: string) => {
    const { data, error: batchError } = await supabase
      .from("curriculum_import_batches")
      .select(
        "id,subject,primary_level,file_name,source_hash,allow_published_updates,status,row_count,valid_row_count,warning_row_count,error_row_count,summary,operation_id,created_at,validated_at,completed_at,error_message",
      )
      .eq("id", batchId)
      .single();

    if (batchError) {
      setError(batchError.message);
      return;
    }

    const loaded = data as unknown as ImportBatch;
    setBatch(loaded);
    setSubject(loaded.subject);
    setLevel(loaded.primary_level);
    setAllowPublishedUpdates(loaded.allow_published_updates);
    setConfirmation("");

    let rowQuery = supabase
      .from("curriculum_import_rows")
      .select(
        "id,row_number,raw_data,topic_slug,quiz_code,quiz_action,question_code,question_action,validation_status,messages",
      )
      .eq("batch_id", batchId)
      .order("row_number", { ascending: true })
      .limit(200);

    if (loaded.error_row_count > 0 || loaded.warning_row_count > 0) {
      rowQuery = rowQuery.in("validation_status", ["error", "warning"]);
    }

    const { data: rows, error: rowsError } = await rowQuery;
    if (rowsError) setError(rowsError.message);
    else setPreviewRows((rows || []) as unknown as ImportRow[]);
  }, []);

  useEffect(() => {
    void loadRecentBatches();
  }, [loadRecentBatches]);

  const requiredConfirmation = batch ? `IMPORT ${batch.row_count} ROWS` : "";
  const summary = batch?.summary || {};
  const canApply =
    role === "admin" &&
    batch?.status === "ready" &&
    batch.error_row_count === 0;

  const displayedMessageCount = useMemo(
    () => previewRows.reduce((total, row) => total + row.messages.length, 0),
    [previewRows],
  );

  function resetImporter() {
    setSelectedFile(null);
    setBatch(null);
    setPreviewRows([]);
    setConfirmation("");
    setProgress(0);
    setError(null);
    setNotice(null);
  }

  async function uploadAndValidate() {
    if (!selectedFile) {
      setError("Choose one CSV file first.");
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Quiz Import accepts CSV files only.");
      return;
    }

    setBusy(true);
    setProgress(1);
    setError(null);
    setNotice(null);
    setBatch(null);
    setPreviewRows([]);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const hash = await sha256(buffer);
      const text = new TextDecoder("utf-8").decode(buffer);
      const parsed = parseQuizCsv(text);

      if (parsed.rows.length === 0) throw new Error("The CSV has no data rows.");
      if (parsed.rows.length > 5000) {
        throw new Error("One import batch can contain at most 5,000 rows.");
      }

      setProgress(5);
      const { data: created, error: createError } = await supabase.rpc(
        "curriculum_create_import_batch",
        {
          p_subject: subject,
          p_primary_level: level,
          p_file_name: selectedFile.name,
          p_source_hash: hash,
          p_allow_published_updates: allowPublishedUpdates,
        },
      );
      if (createError) throw createError;

      const batchId = String(
        (created as unknown as { batch_id: string }).batch_id,
      );
      const chunkSize = 100;

      for (let start = 0; start < parsed.rows.length; start += chunkSize) {
        const chunk = parsed.rows.slice(start, start + chunkSize);
        const { error: uploadError } = await supabase.rpc(
          "curriculum_upload_import_rows",
          { p_batch_id: batchId, p_rows: chunk },
        );
        if (uploadError) throw uploadError;
        setProgress(
          5 + Math.round((Math.min(start + chunkSize, parsed.rows.length) / parsed.rows.length) * 75),
        );
      }

      setProgress(85);
      const { error: validationError } = await supabase.rpc(
        "curriculum_validate_import_batch",
        { p_batch_id: batchId },
      );
      if (validationError) throw validationError;

      setProgress(100);
      await loadBatch(batchId);
      await loadRecentBatches();
      setNotice(
        `CSV uploaded and validated. ${parsed.rows.length.toLocaleString()} rows were staged. ${parsed.imageRowCount.toLocaleString()} image-related rows kept their existing asset mappings and did not upload inline image bytes.`,
      );
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setBusy(false);
    }
  }

  async function revalidate() {
    if (!batch) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: validationError } = await supabase.rpc(
      "curriculum_validate_import_batch",
      { p_batch_id: batch.id },
    );
    if (validationError) setError(validationError.message);
    else {
      await loadBatch(batch.id);
      await loadRecentBatches();
      setNotice("Validation completed again using the current database state.");
    }
    setBusy(false);
  }

  async function applyBatch() {
    if (!batch || role !== "admin") return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const { data, error: applyError } = await supabase.rpc(
      "curriculum_apply_import_batch",
      {
        p_batch_id: batch.id,
        p_confirmation: confirmation,
      },
    );

    if (applyError) {
      setError(applyError.message);
    } else {
      const result = data as unknown as {
        applied_quiz_count: number;
        applied_question_count: number;
        operation_id: string;
      };
      setNotice(
        `Import completed: ${result.applied_quiz_count.toLocaleString()} quizzes and ${result.applied_question_count.toLocaleString()} questions processed. Operation ${result.operation_id.slice(0, 8).toUpperCase()} is recorded in Deployment History.`,
      );
      setConfirmation("");
      await loadBatch(batch.id);
      await loadRecentBatches();
    }
    setBusy(false);
  }

  return (
    <div style={stack}>
      <div style={safeBanner}>
        <strong>Preview-first import:</strong> CSV rows are staged and checked
        before any curriculum record changes. Missing rows never delete or unlink
        existing questions. Image bytes stay in Asset Deployment.
      </div>

      {error && <div style={errorBanner}>{error}</div>}
      {notice && <div style={successBanner}>{notice}</div>}

      <section style={card}>
        <div style={sectionHeader}>
          <div>
            <p style={eyebrow}>NEW CSV IMPORT</p>
            <h2 style={heading}>Upload the standard 28-column quiz CSV</h2>
          </div>
          {batch && (
            <button type="button" onClick={resetImporter} style={secondaryButton}>
              Start another import
            </button>
          )}
        </div>

        <div style={formGrid}>
          <label style={label}>
            Subject
            <select
              value={subject}
              disabled={busy || Boolean(batch)}
              onChange={(event) => setSubject(event.target.value as CoreSubject)}
              style={input}
            >
              <option value="math">Mathematics</option>
              <option value="english">English</option>
            </select>
          </label>
          <label style={label}>
            Level
            <select
              value={level}
              disabled={busy || Boolean(batch)}
              onChange={(event) => setLevel(Number(event.target.value))}
              style={input}
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>Primary {value}</option>
              ))}
            </select>
          </label>
          <label style={{ ...label, gridColumn: "span 2" }}>
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy || Boolean(batch)}
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              style={fileInput}
            />
          </label>
        </div>

        <label style={publishedToggle}>
          <input
            type="checkbox"
            checked={allowPublishedUpdates}
            disabled={busy || Boolean(batch)}
            onChange={(event) => setAllowPublishedUpdates(event.target.checked)}
            style={checkbox}
          />
          <span>
            <strong>Allow updates to already-published quizzes</strong>
            <small style={smallBlock}>
              Leave this off for new quiz imports. Turn it on only when the CSV
              intentionally corrects live quiz content; validation will mark every
              affected row with a warning.
            </small>
          </span>
        </label>

        {!batch && (
          <button
            type="button"
            onClick={() => void uploadAndValidate()}
            disabled={!selectedFile || busy}
            style={primaryButton}
          >
            {busy ? `Uploading and validating… ${progress}%` : "Upload and validate CSV"}
          </button>
        )}

        {busy && (
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${progress}%` }} />
          </div>
        )}
      </section>

      {batch && (
        <section style={card}>
          <div style={sectionHeader}>
            <div>
              <p style={eyebrow}>VALIDATION PREVIEW</p>
              <h2 style={heading}>{batch.file_name}</h2>
              <p style={muted}>
                {batch.subject.toUpperCase()} P{batch.primary_level} · Batch {batch.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <StatusBadge status={batch.status} />
          </div>

          <div style={summaryGrid}>
            <SummaryCard label="CSV rows" value={batch.row_count} />
            <SummaryCard label="New quizzes" value={summary.new_quiz_count || 0} />
            <SummaryCard label="Quiz updates" value={summary.updated_quiz_count || 0} />
            <SummaryCard label="New questions" value={summary.new_question_count || 0} />
            <SummaryCard label="Question updates" value={summary.updated_question_count || 0} />
            <SummaryCard label="Warning rows" value={batch.warning_row_count} warning={batch.warning_row_count > 0} />
            <SummaryCard label="Error rows" value={batch.error_row_count} danger={batch.error_row_count > 0} />
          </div>

          {batch.status === "blocked" && (
            <div style={errorBanner}>
              This batch cannot be applied. Correct the CSV errors, then start a
              new import. Nothing has been written to the quiz tables.
            </div>
          )}
          {batch.status === "ready" && (
            <div style={successBanner}>
              Validation passed. Review all warnings before applying this batch.
            </div>
          )}
          {batch.status === "completed" && (
            <div style={successBanner}>
              Import completed. Missing CSV rows were not deleted and existing
              image mappings were preserved.
            </div>
          )}

          <div style={sectionHeader}>
            <div>
              <h3 style={subheading}>Row messages</h3>
              <p style={muted}>
                Showing up to 200 rows · {displayedMessageCount} displayed message(s)
              </p>
            </div>
            {batch.status !== "completed" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void revalidate()}
                style={secondaryButton}
              >
                Validate again
              </button>
            )}
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Row</th>
                  <th style={th}>Quiz</th>
                  <th style={th}>Question</th>
                  <th style={th}>Action</th>
                  <th style={th}>Status and messages</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.row_number}</td>
                    <td style={td}>{row.quiz_code || "—"}</td>
                    <td style={td}>
                      <strong>{row.question_code || "—"}</strong>
                      <span style={promptText}>{String(row.raw_data.prompt || "")}</span>
                    </td>
                    <td style={td}>
                      <span style={actionTag}>
                        {row.quiz_action || "—"} quiz
                      </span>
                      <span style={actionTag}>
                        {row.question_action || "—"} question
                      </span>
                    </td>
                    <td style={td}>
                      <span style={statusStyle(row.validation_status)}>
                        {row.validation_status}
                      </span>
                      {row.messages.map((message, index) => (
                        <div
                          key={`${message.code}:${index}`}
                          style={message.level === "error" ? errorMessageStyle : warningMessageStyle}
                        >
                          {message.message}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
                {previewRows.length === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>No preview rows to display.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {canApply && (
            <div style={confirmationCard}>
              <label style={{ ...label, flex: "1 1 300px" }}>
                Type <strong style={{ color: "white" }}>{requiredConfirmation}</strong> to apply
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  style={input}
                />
              </label>
              <button
                type="button"
                disabled={busy || confirmation !== requiredConfirmation}
                onClick={() => void applyBatch()}
                style={dangerButton}
              >
                {busy ? "Applying transaction…" : "Apply validated import"}
              </button>
            </div>
          )}

          {role !== "admin" && batch.status === "ready" && (
            <div style={infoBanner}>
              Validation is complete. An admin must apply this import.
            </div>
          )}
        </section>
      )}

      <section style={card}>
        <div style={sectionHeader}>
          <div>
            <p style={eyebrow}>RECENT IMPORT BATCHES</p>
            <h2 style={heading}>Import history</h2>
          </div>
          <button type="button" onClick={() => void loadRecentBatches()} style={secondaryButton}>
            Refresh
          </button>
        </div>

        <div style={historyList}>
          {recentBatches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void loadBatch(item.id)}
              style={historyRow}
            >
              <span>
                <strong>{item.file_name}</strong>
                <small style={smallBlock}>
                  {item.subject.toUpperCase()} P{item.primary_level} · {item.row_count.toLocaleString()} rows · {new Date(item.created_at).toLocaleString()}
                </small>
              </span>
              <StatusBadge status={item.status} />
            </button>
          ))}
          {recentBatches.length === 0 && (
            <div style={emptyCard}>No CSV import batches yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function parseQuizCsv(text: string): ParsedCsv {
  const matrix = parseCsvMatrix(text.replace(/^\uFEFF/, ""));
  if (matrix.length === 0) throw new Error("The CSV is empty.");

  const headers = matrix[0].map((value) => value.trim());
  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );
  if (duplicateHeaders.length > 0) {
    throw new Error(`Duplicate CSV header: ${duplicateHeaders[0]}`);
  }

  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`Missing required CSV column(s): ${missing.join(", ")}`);
  }

  const rows: JsonObject[] = [];
  let imageRowCount = 0;
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const values = matrix[rowIndex];
    if (values.every((value) => value.trim() === "")) continue;

    const row: JsonObject = { row_number: rowIndex + 1 };
    headers.forEach((header, columnIndex) => {
      if (header === "image_reference") return;
      row[header] = values[columnIndex] ?? "";
    });
    if (["HAS_IMAGE", "LIKELY_NEEDS_IMAGE"].includes(String(row.image_flag))) {
      imageRowCount += 1;
    }
    rows.push(row);
  }
  return { rows, imageRowCount };
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && value && "message" in value) {
    return String((value as { message: unknown }).message);
  }
  return "The import could not be completed.";
}

function SummaryCard({
  label,
  value,
  warning = false,
  danger = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={{ ...summaryValue, color: danger ? "#fecaca" : warning ? "#fde68a" : "white" }}>
        {value.toLocaleString()}
      </strong>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportStatus }) {
  return <span style={statusStyle(status)}>{status}</span>;
}

function statusStyle(status: string): CSSProperties {
  const isGood = status === "ready" || status === "completed" || status === "valid";
  const isBad = status === "blocked" || status === "failed" || status === "error";
  const isWarning = status === "warning";
  return {
    ...badge,
    color: isBad ? "#fecaca" : isWarning ? "#fde68a" : isGood ? "#a7f3d0" : "#bfefff",
    background: isBad
      ? "rgba(239,68,68,0.13)"
      : isWarning
        ? "rgba(245,158,11,0.13)"
        : isGood
          ? "rgba(16,185,129,0.13)"
          : "rgba(83,215,255,0.1)",
  };
}

const stack: CSSProperties = { display: "grid", gap: "18px" };
const card: CSSProperties = { display: "grid", gap: "17px", borderRadius: "18px", border: "1px solid rgba(126,232,255,0.16)", background: "rgba(13,29,57,0.72)", padding: "18px" };
const sectionHeader: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" };
const eyebrow: CSSProperties = { margin: 0, color: "#7ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em" };
const heading: CSSProperties = { margin: "5px 0 0", fontSize: "22px" };
const subheading: CSSProperties = { margin: 0, fontSize: "17px" };
const muted: CSSProperties = { margin: "5px 0 0", color: "rgba(255,255,255,0.55)", fontSize: "13px", lineHeight: 1.5 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" };
const label: CSSProperties = { display: "grid", gap: "7px", color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 850 };
const input: CSSProperties = { width: "100%", minHeight: "44px", boxSizing: "border-box", borderRadius: "11px", border: "1px solid rgba(126,232,255,0.22)", background: "#0d1a31", color: "white", padding: "0 12px", outline: "none" };
const fileInput: CSSProperties = { ...input, padding: "10px 12px" };
const checkbox: CSSProperties = { width: "18px", height: "18px", accentColor: "#53d7ff", cursor: "pointer", flex: "0 0 auto", marginTop: "2px" };
const publishedToggle: CSSProperties = { display: "flex", gap: "10px", alignItems: "start", borderRadius: "13px", border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.06)", color: "#fff3c4", padding: "13px", cursor: "pointer" };
const smallBlock: CSSProperties = { display: "block", marginTop: "4px", color: "rgba(255,255,255,0.52)", fontSize: "12px", lineHeight: 1.45 };
const secondaryButton: CSSProperties = { minHeight: "42px", borderRadius: "11px", border: "1px solid rgba(126,232,255,0.3)", background: "rgba(83,215,255,0.09)", color: "white", padding: "0 14px", cursor: "pointer", fontWeight: 850 };
const primaryButton: CSSProperties = { ...secondaryButton, borderColor: "rgba(52,211,153,0.45)", background: "rgba(52,211,153,0.16)" };
const dangerButton: CSSProperties = { ...secondaryButton, borderColor: "rgba(248,113,113,0.5)", background: "rgba(239,68,68,0.17)", alignSelf: "end" };
const progressTrack: CSSProperties = { height: "9px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" };
const progressFill: CSSProperties = { height: "100%", borderRadius: "999px", background: "linear-gradient(90deg,#53d7ff,#34d399)", transition: "width 180ms ease" };
const summaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: "9px" };
const summaryCard: CSSProperties = { borderRadius: "12px", background: "rgba(255,255,255,0.035)", padding: "12px", display: "grid", gap: "4px" };
const summaryLabel: CSSProperties = { color: "rgba(255,255,255,0.48)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" };
const summaryValue: CSSProperties = { fontSize: "24px" };
const safeBanner: CSSProperties = { borderRadius: "13px", border: "1px solid rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.08)", color: "#d8fff0", padding: "14px", lineHeight: 1.55 };
const infoBanner: CSSProperties = { borderRadius: "12px", border: "1px solid rgba(126,232,255,0.25)", background: "rgba(83,215,255,0.08)", color: "#cef7ff", padding: "13px" };
const errorBanner: CSSProperties = { borderRadius: "12px", border: "1px solid rgba(248,113,113,0.42)", background: "rgba(239,68,68,0.13)", color: "#fecaca", padding: "14px", lineHeight: 1.5 };
const successBanner: CSSProperties = { borderRadius: "12px", border: "1px solid rgba(52,211,153,0.38)", background: "rgba(52,211,153,0.11)", color: "#b8f8dc", padding: "14px", lineHeight: 1.5 };
const tableWrap: CSSProperties = { overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(126,232,255,0.12)" };
const table: CSSProperties = { width: "100%", minWidth: "920px", borderCollapse: "collapse", fontSize: "12px" };
const th: CSSProperties = { padding: "10px", textAlign: "left", color: "#9befff", background: "rgba(83,215,255,0.07)", borderBottom: "1px solid rgba(126,232,255,0.14)" };
const td: CSSProperties = { padding: "10px", verticalAlign: "top", color: "rgba(255,255,255,0.72)", borderBottom: "1px solid rgba(255,255,255,0.055)" };
const promptText: CSSProperties = { display: "block", marginTop: "4px", maxWidth: "300px", color: "rgba(255,255,255,0.48)", lineHeight: 1.4 };
const badge: CSSProperties = { display: "inline-flex", width: "fit-content", borderRadius: "999px", padding: "4px 8px", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" };
const actionTag: CSSProperties = { ...badge, display: "flex", marginBottom: "5px", background: "rgba(167,139,250,0.12)", color: "#ddd2ff" };
const errorMessageStyle: CSSProperties = { marginTop: "6px", color: "#fecaca", lineHeight: 1.4 };
const warningMessageStyle: CSSProperties = { marginTop: "6px", color: "#fde68a", lineHeight: 1.4 };
const confirmationCard: CSSProperties = { display: "flex", alignItems: "end", flexWrap: "wrap", gap: "12px", borderRadius: "14px", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(239,68,68,0.07)", padding: "14px" };
const historyList: CSSProperties = { display: "grid", gap: "8px" };
const historyRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", width: "100%", borderRadius: "12px", border: "1px solid rgba(126,232,255,0.12)", background: "rgba(255,255,255,0.025)", color: "white", padding: "12px", textAlign: "left", cursor: "pointer" };
const emptyCard: CSSProperties = { borderRadius: "13px", border: "1px dashed rgba(126,232,255,0.2)", color: "rgba(255,255,255,0.55)", padding: "20px" };
