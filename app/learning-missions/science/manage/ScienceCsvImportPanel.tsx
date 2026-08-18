"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  format?: string;
};

type ImportBatch = {
  id: string;
  subject: "science";
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
  topic_slug: string | null;
  quiz_code: string | null;
  quiz_action: "create" | "update" | null;
  question_code: string | null;
  question_action: "create" | "update" | null;
  validation_status: "pending" | "valid" | "warning" | "error";
  messages: ImportMessage[];
};

type ParsedRow = Record<string, string | number>;

type ParsedCsv = {
  rows: ParsedRow[];
  imageRowCount: number;
};

type Props = {
  primaryLevel?: number;
  role?: string | null;
  onImported?: () => void | Promise<void>;
};

const BATCH_SELECT =
  "id,subject,primary_level,file_name,source_hash,allow_published_updates,status,row_count,valid_row_count,warning_row_count,error_row_count,summary,operation_id,created_at,validated_at,completed_at,error_message";

const ROW_SELECT =
  "id,row_number,topic_slug,quiz_code,quiz_action,question_code,question_action,validation_status,messages";

export default function ScienceCsvImportPanel({
  primaryLevel: lockedPrimaryLevel,
  role: suppliedRole,
  onImported,
}: Props = {}) {
  const [selectedLevel, setSelectedLevel] = useState(
    normaliseLevel(lockedPrimaryLevel ?? 1),
  );
  const [resolvedRole, setResolvedRole] = useState<string | null>(
    suppliedRole ?? null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [allowPublishedUpdates, setAllowPublishedUpdates] = useState(false);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [recentBatches, setRecentBatches] = useState<ImportBatch[]>([]);
  const [confirmation, setConfirmation] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const primaryLevel = normaliseLevel(
    lockedPrimaryLevel ?? selectedLevel,
  );

  useEffect(() => {
    if (lockedPrimaryLevel) {
      setSelectedLevel(normaliseLevel(lockedPrimaryLevel));
    }
  }, [lockedPrimaryLevel]);

  useEffect(() => {
    if (suppliedRole !== undefined) {
      setResolvedRole(suppliedRole);
      return;
    }

    let cancelled = false;

    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setResolvedRole(
          typeof data?.role === "string" ? data.role : null,
        );
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [suppliedRole]);

  const canOperate =
    resolvedRole === "admin" ||
    resolvedRole === "curriculum_lead";

  const requiredConfirmation = batch
    ? `IMPORT ${batch.row_count} ROWS`
    : "";

  const canApply =
    canOperate &&
    batch?.status === "ready" &&
    batch.error_row_count === 0;

  const loadRecentBatches = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("science_curriculum_import_batches")
      .select(BATCH_SELECT)
      .eq("primary_level", primaryLevel)
      .order("created_at", { ascending: false })
      .limit(12);

    if (loadError) {
      setError(
        `${loadError.message}. Run the Science universal 28-column import SQL migration first.`,
      );
      setRecentBatches([]);
      return;
    }

    setRecentBatches(
      (data || []) as unknown as ImportBatch[],
    );
  }, [primaryLevel]);

  const loadBatch = useCallback(async (batchId: string) => {
    const { data, error: batchError } = await supabase
      .from("science_curriculum_import_batches")
      .select(BATCH_SELECT)
      .eq("id", batchId)
      .single();

    if (batchError) {
      setError(batchError.message);
      return;
    }

    const loaded = data as unknown as ImportBatch;

    setBatch(loaded);
    setAllowPublishedUpdates(
      loaded.allow_published_updates,
    );
    setConfirmation("");

    let query = supabase
      .from("science_curriculum_import_rows")
      .select(ROW_SELECT)
      .eq("batch_id", batchId)
      .order("row_number", { ascending: true })
      .limit(200);

    if (
      loaded.error_row_count > 0 ||
      loaded.warning_row_count > 0
    ) {
      query = query.in(
        "validation_status",
        ["error", "warning"],
      );
    }

    const { data: rows, error: rowsError } =
      await query;

    if (rowsError) {
      setError(rowsError.message);
    } else {
      setPreviewRows(
        (rows || []) as unknown as ImportRow[],
      );
    }
  }, []);

  useEffect(() => {
    void loadRecentBatches();
  }, [loadRecentBatches]);

  const messageCount = useMemo(
    () =>
      previewRows.reduce(
        (sum, row) =>
          sum +
          (Array.isArray(row.messages)
            ? row.messages.length
            : 0),
        0,
      ),
    [previewRows],
  );

  function reset() {
    setSelectedFile(null);
    setBatch(null);
    setPreviewRows([]);
    setConfirmation("");
    setProgress(0);
    setError(null);
    setNotice(null);
  }

  function changeLevel(level: number) {
    if (lockedPrimaryLevel) return;

    setSelectedLevel(normaliseLevel(level));
    reset();
  }

  async function uploadAndValidate() {
    if (!selectedFile) {
      setError("Choose one CSV file first.");
      return;
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setError(
        "Science Builder accepts CSV files only.",
      );
      return;
    }

    setBusy(true);
    setProgress(1);
    setError(null);
    setNotice(null);
    setBatch(null);
    setPreviewRows([]);

    try {
      const buffer =
        await selectedFile.arrayBuffer();

      const hash = await sha256(buffer);

      const text =
        new TextDecoder("utf-8").decode(
          buffer,
        );

      const parsed =
        parseExact28ColumnCsv(text);

      if (parsed.rows.length === 0) {
        throw new Error(
          "The CSV has no data rows.",
        );
      }

      if (parsed.rows.length > 5000) {
        throw new Error(
          "One Science import batch can contain at most 5,000 rows.",
        );
      }

      const wrongLevel =
        parsed.rows.find(
          (row) =>
            Number(row.primary_level) !==
            primaryLevel,
        );

      if (wrongLevel) {
        throw new Error(
          `Row ${wrongLevel.row_number} is Primary ${String(
            wrongLevel.primary_level,
          )}. Select Primary ${String(
            wrongLevel.primary_level,
          )} or use a P${primaryLevel} CSV.`,
        );
      }

      setProgress(5);

      const {
        data: created,
        error: createError,
      } = await supabase.rpc(
        "science_curriculum_create_import_batch",
        {
          p_primary_level: primaryLevel,
          p_file_name: selectedFile.name,
          p_source_hash: hash,
          p_allow_published_updates:
            allowPublishedUpdates,
        },
      );

      if (createError) {
        throw createError;
      }

      const batchId = String(
        (
          created as unknown as {
            batch_id: string;
          }
        ).batch_id,
      );

      const chunkSize = 100;

      for (
        let start = 0;
        start < parsed.rows.length;
        start += chunkSize
      ) {
        const chunk =
          parsed.rows.slice(
            start,
            start + chunkSize,
          );

        const { error: uploadError } =
          await supabase.rpc(
            "science_curriculum_upload_import_rows",
            {
              p_batch_id: batchId,
              p_rows: chunk,
            },
          );

        if (uploadError) {
          throw uploadError;
        }

        setProgress(
          5 +
            Math.round(
              (Math.min(
                start + chunkSize,
                parsed.rows.length,
              ) /
                parsed.rows.length) *
                75,
            ),
        );
      }

      setProgress(85);

      const { error: validationError } =
        await supabase.rpc(
          "science_curriculum_validate_import_batch",
          {
            p_batch_id: batchId,
          },
        );

      if (validationError) {
        throw validationError;
      }

      setProgress(100);

      await loadBatch(batchId);
      await loadRecentBatches();

      setNotice(
        `28-column Science CSV uploaded and validated. ${parsed.rows.length.toLocaleString()} rows were staged. ${parsed.imageRowCount.toLocaleString()} image-related row(s) were detected. Actual image files and mappings remain in Asset Deployment.`,
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

    const { error: validationError } =
      await supabase.rpc(
        "science_curriculum_validate_import_batch",
        {
          p_batch_id: batch.id,
        },
      );

    if (validationError) {
      setError(validationError.message);
    } else {
      await loadBatch(batch.id);
      await loadRecentBatches();

      setNotice(
        "Science validation completed again using the current database state.",
      );
    }

    setBusy(false);
  }

  async function applyBatch() {
    if (!batch || !canApply) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    const { data, error: applyError } =
      await supabase.rpc(
        "science_curriculum_apply_import_batch",
        {
          p_batch_id: batch.id,
          p_confirmation: confirmation,
        },
      );

    if (applyError) {
      setError(applyError.message);
    } else {
      const result =
        data as unknown as {
          applied_quiz_count: number;
          applied_question_count: number;
          operation_id: string;
        };

      setNotice(
        `Science import completed: ${result.applied_quiz_count.toLocaleString()} quizzes and ${result.applied_question_count.toLocaleString()} questions processed.`,
      );

      setConfirmation("");

      await loadBatch(batch.id);
      await loadRecentBatches();
      await onImported?.();
    }

    setBusy(false);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.8rem] border border-cyan-200/18 bg-cyan-300/[0.055] p-5 sm:p-6">
        <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
          SCIENCE CSV IMPORT
        </p>

        <h2 className="mt-2 text-2xl font-black">
          Same 28-column format as English
          and Mathematics
        </h2>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/58">
          Science accepts only the universal
          28-column Dreamscape quiz CSV.
          The header names and column order
          must match exactly. Missing,
          additional or reordered columns
          are rejected before anything is
          staged.
        </p>

        <a
          href="/curriculum/templates/dreamscape-science-quiz-import-28-column-template.csv"
          download="dreamscape-science-quiz-import-28-column-template.csv"
          className="mt-5 inline-flex min-h-11 items-center rounded-full border border-cyan-200/24 bg-cyan-300/12 px-5 text-sm font-extrabold text-cyan-100 no-underline"
        >
          Download Science 28-column
          template
        </a>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200/25 bg-rose-300/10 px-5 py-4 text-sm leading-6 text-rose-100">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-200/25 bg-emerald-300/10 px-5 py-4 text-sm leading-6 text-emerald-100">
          {notice}
        </div>
      )}

      <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
              Validate before changing live
              curriculum
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Upload and validate
            </h2>
          </div>

          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="min-h-10 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-white/70 disabled:opacity-40"
          >
            Reset
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/45">
            Science level

            <select
              value={primaryLevel}
              disabled={
                busy ||
                Boolean(batch) ||
                Boolean(lockedPrimaryLevel)
              }
              onChange={(event) =>
                changeLevel(
                  Number(event.target.value),
                )
              }
              className="min-h-12 rounded-2xl border border-white/12 bg-[#07162c] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none disabled:opacity-70"
            >
              {[1, 2, 3, 4, 5, 6].map(
                (level) => (
                  <option
                    key={level}
                    value={level}
                  >
                    Primary {level}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/45">
            CSV file

            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(event) => {
                setSelectedFile(
                  event.target.files?.[0] ||
                    null,
                );
                setBatch(null);
                setPreviewRows([]);
                setError(null);
                setNotice(null);
                setProgress(0);
              }}
              className="min-h-12 rounded-2xl border border-white/12 bg-[#07162c] px-4 py-3 text-sm font-bold normal-case tracking-normal text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300/15 file:px-3 file:py-2 file:text-xs file:font-black file:text-cyan-100"
            />
          </label>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/18 bg-amber-300/[0.06] px-4 py-4 text-sm text-white/70">
          <input
            type="checkbox"
            checked={allowPublishedUpdates}
            disabled={busy || Boolean(batch)}
            onChange={(event) =>
              setAllowPublishedUpdates(
                event.target.checked,
              )
            }
            className="mt-1 h-4 w-4"
          />

          <span>
            <strong className="block text-amber-100">
              Allow updates to published
              quizzes
            </strong>

            <span className="mt-1 block text-xs leading-5 text-white/45">
              Leave this off for the dry
              safety gate. Turn it on only
              after checking the validation
              preview.
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              void uploadAndValidate()
            }
            disabled={
              busy || !selectedFile
            }
            className="min-h-12 rounded-full border border-cyan-200/25 bg-cyan-300/80 px-6 text-sm font-black text-[#041427] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Working…"
              : "Upload and validate"}
          </button>

          {busy && (
            <span className="text-sm font-bold text-white/55">
              {progress}%
            </span>
          )}

          {selectedFile && !busy && (
            <span className="text-sm text-white/45">
              {selectedFile.name}
            </span>
          )}
        </div>
      </section>

      {batch && (
        <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                Validation result
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {batch.file_name}
              </h2>

              <p className="mt-2 text-sm text-white/45">
                Status:{" "}
                <strong className="text-white/75">
                  {batch.status}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void revalidate()
              }
              disabled={busy}
              className="min-h-10 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-white/70 disabled:opacity-40"
            >
              Revalidate
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="Rows"
              value={batch.row_count}
            />
            <Metric
              label="Valid"
              value={batch.valid_row_count}
            />
            <Metric
              label="Warnings"
              value={
                batch.warning_row_count
              }
            />
            <Metric
              label="Errors"
              value={batch.error_row_count}
            />
          </div>

          {messageCount > 0 && (
            <div className="mt-5 grid gap-2">
              {previewRows.flatMap(
                (row) =>
                  (
                    Array.isArray(
                      row.messages,
                    )
                      ? row.messages
                      : []
                  ).map(
                    (
                      message,
                      index,
                    ) => (
                      <div
                        key={`${row.id}-${index}`}
                        className={`rounded-xl border px-4 py-3 text-sm ${
                          message.level ===
                          "error"
                            ? "border-rose-200/20 bg-rose-300/[0.07] text-rose-100"
                            : "border-amber-200/20 bg-amber-300/[0.07] text-amber-100"
                        }`}
                      >
                        <strong>
                          Row{" "}
                          {row.row_number} ·{" "}
                          {message.code}
                        </strong>

                        <span className="ml-2">
                          {message.message}
                        </span>
                      </div>
                    ),
                  ),
              )}
            </div>
          )}

          {canApply && (
            <div className="mt-6 rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.055] p-4">
              <p className="text-sm leading-6 text-white/65">
                Type{" "}
                <strong className="text-emerald-100">
                  {requiredConfirmation}
                </strong>{" "}
                to apply this validated
                batch.
              </p>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(
                      event.target.value,
                    )
                  }
                  placeholder={
                    requiredConfirmation
                  }
                  disabled={busy}
                  className="min-h-12 flex-1 rounded-2xl border border-white/12 bg-[#07162c] px-4 text-sm font-bold text-white outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    void applyBatch()
                  }
                  disabled={
                    busy ||
                    confirmation
                      .trim()
                      .toUpperCase() !==
                      requiredConfirmation
                  }
                  className="min-h-12 rounded-full border border-emerald-200/25 bg-emerald-300/15 px-6 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply validated import
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-white/40">
              Recent Science imports
            </p>

            <h2 className="mt-2 text-xl font-black">
              P{primaryLevel} history
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadRecentBatches()
            }
            className="min-h-10 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-white/70"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {recentBatches.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  void loadBatch(item.id)
                }
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-left text-white"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-sm">
                    {item.file_name}
                  </strong>

                  <small className="mt-1 block text-xs text-white/40">
                    {item.row_count} rows ·{" "}
                    {new Date(
                      item.created_at,
                    ).toLocaleString()}
                  </small>
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/55">
                  {item.status}
                </span>
              </button>
            ),
          )}

          {recentBatches.length ===
            0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/40">
              No P{primaryLevel} Science
              CSV imports yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function parseExact28ColumnCsv(
  text: string,
): ParsedCsv {
  const matrix = parseCsvMatrix(
    text.replace(/^\uFEFF/, ""),
  );

  if (matrix.length === 0) {
    throw new Error(
      "The CSV is empty.",
    );
  }

  const headers = matrix[0].map(
    (value) => value.trim(),
  );

  if (
    headers.length !==
    REQUIRED_HEADERS.length
  ) {
    throw new Error(
      `Science uses exactly 28 columns. This file has ${headers.length}.`,
    );
  }

  for (
    let index = 0;
    index < REQUIRED_HEADERS.length;
    index += 1
  ) {
    const expected =
      REQUIRED_HEADERS[index];

    const actual =
      headers[index] || "";

    if (actual !== expected) {
      throw new Error(
        `Science uses the same exact 28-column order as English and Mathematics. Column ${index + 1} must be "${expected}", but this file has "${actual || "(blank)"}".`,
      );
    }
  }

  const duplicateHeaders =
    headers.filter(
      (header, index) =>
        headers.indexOf(header) !==
        index,
    );

  if (
    duplicateHeaders.length > 0
  ) {
    throw new Error(
      `Duplicate CSV header: ${duplicateHeaders[0]}`,
    );
  }

  const rows: ParsedRow[] = [];
  let imageRowCount = 0;

  for (
    let rowIndex = 1;
    rowIndex < matrix.length;
    rowIndex += 1
  ) {
    const values =
      matrix[rowIndex];

    if (
      values.every(
        (value) =>
          value.trim() === "",
      )
    ) {
      continue;
    }

    if (
      values.length !==
      REQUIRED_HEADERS.length
    ) {
      throw new Error(
        `Row ${rowIndex + 1} has ${values.length} columns. Every non-empty Science CSV row must contain exactly 28 columns.`,
      );
    }

    const row: ParsedRow = {
      row_number:
        rowIndex + 1,
    };

    REQUIRED_HEADERS.forEach(
      (header, columnIndex) => {
        row[header] =
          values[columnIndex] ??
          "";
      },
    );

    if (
      [
        "HAS_IMAGE",
        "LIKELY_NEEDS_IMAGE",
      ].includes(
        String(row.image_flag)
          .trim()
          .toUpperCase(),
      )
    ) {
      imageRowCount += 1;
    }

    rows.push(row);
  }

  return {
    rows,
    imageRowCount,
  };
}

function parseCsvMatrix(
  text: string,
): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (
        char === '"' &&
        next === '"'
      ) {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }

      continue;
    }

    if (
      char === '"' &&
      field.length === 0
    ) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(
        field.replace(/\r$/, ""),
      );
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new Error(
      "The CSV contains an unclosed quoted field.",
    );
  }

  if (
    field.length > 0 ||
    row.length > 0
  ) {
    row.push(
      field.replace(/\r$/, ""),
    );
    rows.push(row);
  }

  return rows;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">
        {value.toLocaleString()}
      </strong>

      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function normaliseLevel(
  value: number,
) {
  const number = Math.trunc(
    Number(value),
  );

  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 6
  ) {
    return 1;
  }

  return number;
}

async function sha256(
  buffer: ArrayBuffer,
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      buffer,
    );

  return Array.from(
    new Uint8Array(digest),
  )
    .map((value) =>
      value
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

function errorMessage(
  value: unknown,
) {
  if (value instanceof Error) {
    return value.message;
  }

  if (
    typeof value === "object" &&
    value &&
    "message" in value
  ) {
    return String(
      (
        value as {
          message: unknown;
        }
      ).message,
    );
  }

  return "The Science import could not be completed.";
}
