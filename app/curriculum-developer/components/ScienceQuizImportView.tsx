"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type { CurriculumRole, JsonObject } from "../types";

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

type ImportBatch = {
  id: string;
  primary_level: number;
  file_name: string;
  source_hash: string;
  allow_published_updates: boolean;
  status: ImportStatus;
  row_count: number;
  valid_row_count: number;
  warning_row_count: number;
  error_row_count: number;
  summary: Record<string, number>;
  operation_id: string | null;
  created_at: string;
  error_message: string | null;
};

type ImportMessage = {
  level: "warning" | "error";
  code: string;
  message: string;
};
type ImportRow = {
  id: string;
  row_number: number;
  topic_slug: string | null;
  quiz_code: string | null;
  quiz_action: "create" | "update" | null;
  question_code: string | null;
  question_action: "create" | "update" | null;
  validation_status: "pending" | "valid" | "warning" | "error";
  messages: ImportMessage[];
};

export default function ScienceQuizImportView({
  role,
}: {
  role: CurriculumRole;
}) {
  const [level, setLevel] = useState(1);
  const [allowPublishedUpdates, setAllowPublishedUpdates] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [recent, setRecent] = useState<ImportBatch[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("science_curriculum_import_batches")
      .select(
        "id,primary_level,file_name,source_hash,allow_published_updates,status,row_count,valid_row_count,warning_row_count,error_row_count,summary,operation_id,created_at,error_message",
      )
      .order("created_at", { ascending: false })
      .limit(20);
    if (loadError)
      setError(`${loadError.message}. Run the Science universal 28-column import SQL migration first.`);
    else setRecent((data || []) as unknown as ImportBatch[]);
  }, []);

  const loadBatch = useCallback(async (batchId: string) => {
    const { data, error: batchError } = await supabase
      .from("science_curriculum_import_batches")
      .select(
        "id,primary_level,file_name,source_hash,allow_published_updates,status,row_count,valid_row_count,warning_row_count,error_row_count,summary,operation_id,created_at,error_message",
      )
      .eq("id", batchId)
      .single();
    if (batchError) {
      setError(batchError.message);
      return;
    }
    const loaded = data as unknown as ImportBatch;
    setBatch(loaded);
    setLevel(loaded.primary_level);
    setAllowPublishedUpdates(loaded.allow_published_updates);
    setConfirmation("");
    let query = supabase
      .from("science_curriculum_import_rows")
      .select(
        "id,row_number,topic_slug,quiz_code,quiz_action,question_code,question_action,validation_status,messages",
      )
      .eq("batch_id", batchId)
      .order("row_number")
      .limit(200);
    if (loaded.error_row_count || loaded.warning_row_count) {
      query = query.in("validation_status", ["error", "warning"]);
    }
    const { data: rowData, error: rowError } = await query;
    if (rowError) setError(rowError.message);
    else setRows((rowData || []) as unknown as ImportRow[]);
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const requiredConfirmation = batch
    ? `IMPORT ${batch.row_count} ROWS`
    : "";
  const messageCount = useMemo(
    () => rows.reduce((sum, row) => sum + row.messages.length, 0),
    [rows],
  );

  async function uploadAndValidate() {
    if (!selectedFile) {
      setError("Choose one Science CSV file first.");
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    setProgress(1);
    setRows([]);
    setBatch(null);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const parsed = parseScienceCsv(new TextDecoder("utf-8").decode(buffer));
      if (!parsed.length) throw new Error("The CSV has no data rows.");
      if (parsed.length > 5000)
        throw new Error("One batch can contain at most 5,000 rows.");
      const fileLevels = [
        ...new Set(
          parsed.map((row) => Number(row.primary_level)),
        ),
      ];
      if (fileLevels.length !== 1 || fileLevels[0] !== level) {
        throw new Error(
          `The selected P${level} level does not match the CSV rows.`,
        );
      }
      const hash = await sha256(buffer);
      const { data: created, error: createError } = await supabase.rpc(
        "science_curriculum_create_import_batch",
        {
          p_primary_level: level,
          p_file_name: selectedFile.name,
          p_source_hash: hash,
          p_allow_published_updates: allowPublishedUpdates,
        },
      );
      if (createError) throw createError;
      const batchId = String((created as { batch_id: string }).batch_id);
      for (let start = 0; start < parsed.length; start += 100) {
        const chunk = parsed.slice(start, start + 100);
        const { error: uploadError } = await supabase.rpc(
          "science_curriculum_upload_import_rows",
          { p_batch_id: batchId, p_rows: chunk },
        );
        if (uploadError) throw uploadError;
        setProgress(
          5 +
            Math.round(
              (Math.min(start + 100, parsed.length) / parsed.length) * 75,
            ),
        );
      }
      setProgress(88);
      const { error: validationError } = await supabase.rpc(
        "science_curriculum_validate_import_batch",
        { p_batch_id: batchId },
      );
      if (validationError) throw validationError;
      setProgress(100);
      await loadBatch(batchId);
      await loadRecent();
      setNotice(
        `${parsed.length.toLocaleString()} Science rows staged and validated. No live quiz was changed.`,
      );
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setBusy(false);
    }
  }

  async function revalidate() {
    if (!batch) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: rpcError } = await supabase.rpc(
      "science_curriculum_validate_import_batch",
      { p_batch_id: batch.id },
    );
    if (rpcError) setError(rpcError.message);
    else {
      await loadBatch(batch.id);
      await loadRecent();
      setNotice("Validation rerun against the current database.");
    }
    setBusy(false);
  }

  async function applyBatch() {
    if (!batch || (role !== "admin" && role !== "curriculum_lead")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: rpcError } = await supabase.rpc(
      "science_curriculum_apply_import_batch",
      { p_batch_id: batch.id, p_confirmation: confirmation },
    );
    if (rpcError) setError(rpcError.message);
    else {
      const result = data as {
        applied_quiz_count: number;
        applied_question_count: number;
      };
      setNotice(
        `Import complete: ${result.applied_quiz_count} quizzes and ${result.applied_question_count} questions processed.`,
      );
      await loadBatch(batch.id);
      await loadRecent();
    }
    setBusy(false);
  }

  return (
    <div style={stack}>
      <section style={card}>
        <div>
          <p style={eyebrow}>SCIENCE CSV IMPORT</p>
          <h2 style={heading}>Validate before changing live curriculum</h2>
          <p style={muted}>
            Accepts only the universal 28-column Dreamscape quiz CSV used by
            English and Mathematics. Header names and column order must match
            exactly. Missing CSV rows never delete quizzes or questions.
          </p>
          <a
            href="/curriculum/templates/dreamscape-science-quiz-import-28-column-template.csv"
            download="dreamscape-science-quiz-import-28-column-template.csv"
            style={templateLink}
          >
            Download Science 28-column template
          </a>
        </div>
        <div style={grid}>
          <label style={label}>
            Science level
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              disabled={busy}
              style={input}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  Primary {n}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={busy}
              style={fileInput}
            />
          </label>
        </div>
        <label style={warningBox}>
          <input
            type="checkbox"
            checked={allowPublishedUpdates}
            onChange={(e) => setAllowPublishedUpdates(e.target.checked)}
            disabled={busy}
          />
          <span>
            <strong>Allow updates to published quizzes</strong>
            <small style={small}>
              Leave off for a dry safety gate. Turn on only after checking the
              validation preview.
            </small>
          </span>
        </label>
        <div style={row}>
          <button
            type="button"
            onClick={() => void uploadAndValidate()}
            disabled={busy || !selectedFile}
            style={primary}
          >
            {busy ? `Working… ${progress}%` : "Upload and validate"}
          </button>
          <span style={muted}>{selectedFile?.name || "No file selected"}</span>
        </div>
        {busy && (
          <div style={track}>
            <div style={{ ...fill, width: `${progress}%` }} />
          </div>
        )}
        {error && <div style={errorBox}>{error}</div>}
        {notice && <div style={successBox}>{notice}</div>}
      </section>

      {batch && (
        <section style={card}>
          <div style={row}>
            <div>
              <p style={eyebrow}>VALIDATION RESULT</p>
              <h2 style={heading}>{batch.file_name}</h2>
            </div>
            <Badge status={batch.status} />
          </div>
          <div style={summaryGrid}>
            <Metric label="Rows" value={batch.row_count} />
            <Metric label="Valid" value={batch.valid_row_count} />
            <Metric label="Warnings" value={batch.warning_row_count} />
            <Metric label="Errors" value={batch.error_row_count} />
            <Metric
              label="New quizzes"
              value={batch.summary?.new_quiz_count || 0}
            />
            <Metric
              label="Updated quizzes"
              value={batch.summary?.updated_quiz_count || 0}
            />
            <Metric
              label="New questions"
              value={batch.summary?.new_question_count || 0}
            />
            <Metric
              label="Updated questions"
              value={batch.summary?.updated_question_count || 0}
            />
          </div>
          <div style={row}>
            <span style={muted}>
              {messageCount} warning/error message(s) shown below.
            </span>
            <button
              type="button"
              onClick={() => void revalidate()}
              disabled={busy}
              style={secondary}
            >
              Revalidate
            </button>
          </div>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Row</th>
                  <th style={th}>Topic / quiz</th>
                  <th style={th}>Question</th>
                  <th style={th}>Action</th>
                  <th style={th}>Messages</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td style={td}>{item.row_number}</td>
                    <td style={td}>
                      {item.topic_slug}
                      <br />
                      <small>{item.quiz_code}</small>
                    </td>
                    <td style={td}>{item.question_code || "new"}</td>
                    <td style={td}>
                      <Badge status={item.validation_status} />
                      <br />
                      <small>
                        {item.quiz_action}/{item.question_action}
                      </small>
                    </td>
                    <td style={td}>
                      {item.messages.map((message, index) => (
                        <div
                          key={index}
                          style={
                            message.level === "error"
                              ? inlineError
                              : inlineWarning
                          }
                        >
                          {message.message}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {batch.status === "ready" && (role === "admin" || role === "curriculum_lead") && (
            <div style={confirmBox}>
              <label style={{ ...label, flex: 1 }}>
                Type <strong>{requiredConfirmation}</strong>
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  style={input}
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                onClick={() => void applyBatch()}
                disabled={busy || confirmation !== requiredConfirmation}
                style={danger}
              >
                Apply Science import
              </button>
            </div>
          )}
          {batch.status === "ready" && role !== "admin" && role !== "curriculum_lead" && (
            <div style={warningBox}>
              Validation passed. An admin or curriculum lead must apply this batch.
            </div>
          )}
        </section>
      )}

      <section style={card}>
        <div style={row}>
          <div>
            <p style={eyebrow}>RECENT SCIENCE IMPORTS</p>
            <h2 style={heading}>Batch history</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadRecent()}
            style={secondary}
          >
            Refresh
          </button>
        </div>
        <div style={history}>
          {recent.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void loadBatch(item.id)}
              style={historyRow}
            >
              <span>
                <strong>{item.file_name}</strong>
                <small style={small}>
                  P{item.primary_level} · {item.row_count} rows ·{" "}
                  {new Date(item.created_at).toLocaleString()}
                </small>
              </span>
              <Badge status={item.status} />
            </button>
          ))}
          {!recent.length && (
            <div style={muted}>No Science import batches yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function parseScienceCsv(text: string): JsonObject[] {
  const matrix = parseCsvMatrix(text.replace(/^\\uFEFF/, ""));

  if (!matrix.length) {
    throw new Error("The CSV is empty.");
  }

  const headers = matrix[0].map((value) => value.trim());

  if (headers.length !== REQUIRED_HEADERS.length) {
    throw new Error(
      `Science uses exactly 28 columns. This file has ${headers.length}.`,
    );
  }

  for (let index = 0; index < REQUIRED_HEADERS.length; index += 1) {
    const expected = REQUIRED_HEADERS[index];
    const actual = headers[index] || "";

    if (actual !== expected) {
      throw new Error(
        `Science uses the same exact 28-column order as English and Mathematics. Column ${index + 1} must be "${expected}", but this file has "${actual || "(blank)"}".`,
      );
    }
  }

  const duplicates = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );

  if (duplicates.length) {
    throw new Error(`Duplicate CSV header: ${duplicates[0]}`);
  }

  const rows: JsonObject[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    const values = matrix[index];

    if (values.every((value) => !value.trim())) {
      continue;
    }

    if (values.length !== REQUIRED_HEADERS.length) {
      throw new Error(
        `Row ${index + 1} has ${values.length} columns. Every non-empty Science CSV row must contain exactly 28 columns.`,
      );
    }

    const row: JsonObject = {
      row_number: index + 1,
    };

    REQUIRED_HEADERS.forEach((header, column) => {
      row[header] = values[column] ?? "";
    });

    rows.push(row);
  }

  return rows;
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index],
      next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"' && !field) quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  if (field || row.length) {
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
  if (value && typeof value === "object" && "message" in value)
    return String((value as { message: unknown }).message);
  return "The import failed.";
}
function Badge({ status }: { status: string }) {
  const good = ["ready", "completed", "valid"].includes(status);
  const bad = ["blocked", "failed", "error"].includes(status);
  return (
    <span
      style={{
        ...badge,
        color: bad ? "#fecaca" : good ? "#a7f3d0" : "#bfefff",
      }}
    >
      {status}
    </span>
  );
}
function Metric({ label: text, value }: { label: string; value: number }) {
  return (
    <div style={metric}>
      <small>{text}</small>
      <strong>{Number(value || 0).toLocaleString()}</strong>
    </div>
  );
}

const stack: CSSProperties = { display: "grid", gap: 18 };
const card: CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
  border: "1px solid rgba(126,232,255,.16)",
  borderRadius: 18,
  background: "rgba(13,29,57,.72)",
};
const templateLink: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  minHeight: 40,
  alignItems: "center",
  marginTop: 12,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid rgba(126,232,255,.3)",
  background: "rgba(83,215,255,.09)",
  color: "#bfefff",
  fontSize: 12,
  fontWeight: 850,
  textDecoration: "none",
};
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 12,
};
const row: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};
const label: CSSProperties = {
  display: "grid",
  gap: 7,
  fontSize: 12,
  fontWeight: 800,
  color: "rgba(255,255,255,.72)",
};
const input: CSSProperties = {
  minHeight: 44,
  borderRadius: 11,
  border: "1px solid rgba(126,232,255,.22)",
  background: "#0d1a31",
  color: "white",
  padding: "0 12px",
};
const fileInput: CSSProperties = { ...input, padding: 10 };
const primary: CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 11,
  background: "#53d7ff",
  color: "#071326",
  padding: "0 17px",
  fontWeight: 900,
};
const secondary: CSSProperties = {
  minHeight: 40,
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 10,
  background: "rgba(255,255,255,.06)",
  color: "white",
  padding: "0 14px",
  fontWeight: 800,
};
const danger: CSSProperties = {
  ...primary,
  background: "#fb7185",
  color: "#24070d",
};
const warningBox: CSSProperties = {
  display: "flex",
  gap: 10,
  padding: 13,
  border: "1px solid rgba(251,191,36,.25)",
  borderRadius: 12,
  background: "rgba(251,191,36,.07)",
  color: "#fff3c4",
};
const errorBox: CSSProperties = {
  padding: 13,
  borderRadius: 12,
  background: "rgba(239,68,68,.13)",
  color: "#fecaca",
};
const successBox: CSSProperties = {
  padding: 13,
  borderRadius: 12,
  background: "rgba(16,185,129,.13)",
  color: "#a7f3d0",
};
const confirmBox: CSSProperties = {
  ...warningBox,
  alignItems: "end",
  flexWrap: "wrap",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};
const heading: CSSProperties = { margin: "5px 0 0", fontSize: 22 };
const muted: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,.55)",
  fontSize: 13,
  lineHeight: 1.5,
};
const small: CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "rgba(255,255,255,.5)",
  fontSize: 12,
};
const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
  gap: 10,
};
const metric: CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,.045)",
};
const badge: CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "4px 9px",
  background: "rgba(83,215,255,.1)",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
};
const track: CSSProperties = {
  height: 8,
  borderRadius: 99,
  background: "rgba(255,255,255,.08)",
  overflow: "hidden",
};
const fill: CSSProperties = {
  height: "100%",
  background: "#53d7ff",
  transition: "width .2s",
};
const tableWrap: CSSProperties = { overflowX: "auto" };
const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};
const th: CSSProperties = {
  padding: 9,
  textAlign: "left",
  color: "#7ee8ff",
  borderBottom: "1px solid rgba(255,255,255,.1)",
};
const td: CSSProperties = {
  padding: 9,
  verticalAlign: "top",
  borderBottom: "1px solid rgba(255,255,255,.07)",
};
const inlineError: CSSProperties = { color: "#fecaca", marginBottom: 3 };
const inlineWarning: CSSProperties = { color: "#fde68a", marginBottom: 3 };
const history: CSSProperties = { display: "grid", gap: 8 };
const historyRow: CSSProperties = {
  ...row,
  width: "100%",
  textAlign: "left",
  padding: 12,
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,.1)",
  background: "rgba(255,255,255,.035)",
  color: "white",
};
