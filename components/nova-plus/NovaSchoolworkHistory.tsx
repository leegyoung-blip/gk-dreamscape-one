"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./NovaSchoolworkHistory.module.css";

type HubFilter = "all" | "review" | "added" | "archived";

type UploadStatus =
  | "uploaded"
  | "analysing"
  | "needs_input"
  | "review_ready"
  | "failed"
  | "approved"
  | "archived";

type HistoryUpload = {
  id: string;
  student_user_id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  file_sha256?: string | null;
  analysis_revision?: number;
  assignment_title: string | null;
  detected_subject: "english" | "math" | null;
  detected_primary_level: number | null;
  page_count: number | null;
  teacher_marked: boolean | null;
  document_quality: string | null;
  analysis_confidence: number | null;
  status: UploadStatus;
  error_message?: string | null;
  analysis_started_at: string | null;
  analysis_completed_at: string | null;
  reviewed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  stats: {
    items: number;
    included: number;
    needs_review: number;
  };
};

type RunRow = {
  id: string;
  run_number: number;
  trigger_source: string;
  status: string;
  extraction_model: string | null;
  reasoning_model: string | null;
  total_cost_usd: number | null;
  automatic_retry_count: number;
  page_count: number | null;
  question_count: number | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

type DetailItem = {
  id: string;
  item_index: number;
  question_number: string | null;
  prompt: string;
  student_answer: string;
  final_correctness:
    | "correct"
    | "incorrect"
    | "partial"
    | "uncertain";
  included_in_profile: boolean;
  proposed_evidence_weight: number;
  primary_skill: {
    id: string;
    skill_code: string;
    skill_name: string;
    topic: string;
  } | null;
};

type DetailPayload = {
  upload: HistoryUpload;
  analysis: {
    overall_summary?: string | null;
  } | null;
  analysis_runs: RunRow[];
  preview_url: string | null;
  detail_items: DetailItem[];
};

type Props = {
  open: boolean;
  learnerId: string;
  learnerLabel: string;
  initialUploadId?: string | null;
  onInitialUploadHandled?: () => void;
  onClose: () => void;
  onContinueReview: (uploadId: string) => void;
  onChanged?: () => void | Promise<void>;
};

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function subjectLabel(subject: string | null) {
  if (subject === "math") return "Mathematics";
  if (subject === "english") return "English";
  return "Unresolved";
}

function statusLabel(status: UploadStatus) {
  switch (status) {
    case "review_ready":
      return "To Review";
    case "approved":
      return "Added to Profile";
    case "archived":
      return "Archived";
    case "failed":
      return "Analysis Interrupted";
    case "needs_input":
      return "Needs Attention";
    case "analysing":
      return "Analysing";
    default:
      return "Uploaded";
  }
}

function correctnessLabel(
  value: DetailItem["final_correctness"],
) {
  if (value === "correct") return "Correct";
  if (value === "incorrect") return "Incorrect";
  if (value === "partial") return "Partial";
  return "Uncertain";
}

function filterMatches(
  filter: HubFilter,
  upload: HistoryUpload,
) {
  if (filter === "all") {
    return upload.status !== "archived";
  }

  if (filter === "review") {
    return ["review_ready", "needs_input", "failed"].includes(
      upload.status,
    );
  }

  if (filter === "added") {
    return upload.status === "approved";
  }

  return upload.status === "archived";
}

export default function NovaSchoolworkHistory({
  open,
  learnerId,
  learnerLabel,
  initialUploadId = null,
  onInitialUploadHandled,
  onClose,
  onContinueReview,
  onChanged,
}: Props) {
  const [uploads, setUploads] =
    useState<HistoryUpload[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [filter, setFilter] =
    useState<HubFilter>("all");

  const [detail, setDetail] =
    useState<DetailPayload | null>(null);

  const [error, setError] =
    useState("");

  const [subjectHint, setSubjectHint] =
    useState<"" | "english" | "math">("");

  const [levelHint, setLevelHint] =
    useState("");

  const request = useCallback(
    async (
      input: string,
      init?: RequestInit,
    ) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Please sign in again.",
        );
      }

      const response = await fetch(input, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization:
            `Bearer ${session.access_token}`,
        },
      });

      const body =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.message ||
            body?.error ||
            "Schoolwork request failed.",
        );
      }

      return body;
    },
    [],
  );

  const loadHistory =
    useCallback(async () => {
      if (!open) return;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          student_id: learnerId,
          include_archived: "1",
        });

        const body = await request(
          `/api/nova-plus/schoolwork/history?${params.toString()}`,
        );

        setUploads(body.uploads ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : String(loadError),
        );
      } finally {
        setLoading(false);
      }
    }, [learnerId, open, request]);

  const openDetail =
    useCallback(
      async (uploadId: string) => {
        setLoading(true);
        setError("");

        try {
          const params =
            new URLSearchParams({
              student_id: learnerId,
              upload_id: uploadId,
            });

          const body = await request(
            `/api/nova-plus/schoolwork/history?${params.toString()}`,
          );

          const next =
            body as DetailPayload;

          setDetail(next);

          setSubjectHint(
            next.upload.detected_subject ===
              "english" ||
              next.upload.detected_subject ===
                "math"
              ? next.upload.detected_subject
              : "",
          );

          setLevelHint(
            next.upload.detected_primary_level
              ? String(
                  next.upload
                    .detected_primary_level,
                )
              : "",
          );
        } catch (detailError) {
          setError(
            detailError instanceof Error
              ? detailError.message
              : String(detailError),
          );
        } finally {
          setLoading(false);
        }
      },
      [learnerId, request],
    );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !initialUploadId) {
      return;
    }

    const uploadIdToOpen =
      initialUploadId;

    void openDetail(uploadIdToOpen).finally(
      () => {
        onInitialUploadHandled?.();
      },
    );
  }, [
    initialUploadId,
    onInitialUploadHandled,
    open,
    openDetail,
  ]);

  const counts = useMemo(
    () => ({
      all: uploads.filter(
        (item) =>
          item.status !== "archived",
      ).length,

      review: uploads.filter((item) =>
        [
          "review_ready",
          "needs_input",
          "failed",
        ].includes(item.status),
      ).length,

      added: uploads.filter(
        (item) =>
          item.status === "approved",
      ).length,

      archived: uploads.filter(
        (item) =>
          item.status === "archived",
      ).length,
    }),
    [uploads],
  );

  const visibleUploads = useMemo(
    () =>
      uploads.filter((upload) =>
        filterMatches(filter, upload),
      ),
    [filter, uploads],
  );

  if (!open) return null;

  async function manage(
    upload: HistoryUpload,
    action:
      | "archive"
      | "restore"
      | "delete",
  ) {
    if (action === "delete") {
      const approvedWarning =
        upload.status === "approved" ||
        upload.stats.included > 0
          ? "\n\nThis upload has learner-profile evidence. Deleting it will remove that evidence and recalculate mastery."
          : "";

      const confirmed =
        window.confirm(
          `Delete "${
            upload.assignment_title ||
            upload.original_filename
          }" permanently?${approvedWarning}`,
        );

      if (!confirmed) return;
    }

    setLoading(true);
    setError("");

    try {
      await request(
        "/api/nova-plus/schoolwork/history",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action,
            upload_id: upload.id,
          }),
        },
      );

      setDetail(null);
      await loadHistory();
      await onChanged?.();
    } catch (manageError) {
      setError(
        manageError instanceof Error
          ? manageError.message
          : String(manageError),
      );
    } finally {
      setLoading(false);
    }
  }

  async function retryAnalysis(
    upload: HistoryUpload,
    needsInput = false,
  ) {
    setLoading(true);
    setError("");

    try {
      await request(
        "/api/nova-plus/schoolwork/analyse",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            upload_id: upload.id,
            subject_hint:
              needsInput
                ? subjectHint
                : undefined,
            primary_level_hint:
              needsInput && levelHint
                ? Number(levelHint)
                : undefined,
            trigger_source:
              needsInput
                ? "needs_input_retry"
                : "manual_retry",
          }),
        },
      );

      await loadHistory();
      await openDetail(upload.id);
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : String(retryError),
      );
    } finally {
      setLoading(false);
    }
  }

  function continueReview(
    uploadId: string,
  ) {
    setDetail(null);
    onClose();
    onContinueReview(uploadId);
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="NOVA+ Schoolwork Hub"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className={styles.header}>
          <div>
            <span
              className={styles.eyebrow}
            >
              NOVA+ · SCHOOLWORK
            </span>

            <h2>
              {detail
                ? "Schoolwork Analysis"
                : "Schoolwork Hub"}
            </h2>

            <p>
              {detail
                ? "Review the source document, analysis history and learner-profile impact."
                : `${learnerLabel}'s uploaded work, pending reviews and approved evidence.`}
            </p>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={
              detail
                ? () => setDetail(null)
                : onClose
            }
            aria-label={
              detail
                ? "Back to Schoolwork Hub"
                : "Close Schoolwork Hub"
            }
          >
            {detail ? "←" : "×"}
          </button>
        </header>

        <div className={styles.body}>
          {error && (
            <div
              className={styles.error}
            >
              {error}
            </div>
          )}

          {!detail && (
            <>
              <div
                className={
                  styles.hubSummary
                }
              >
                {(
                  [
                    [
                      "all",
                      "All",
                      counts.all,
                    ],
                    [
                      "review",
                      "To Review",
                      counts.review,
                    ],
                    [
                      "added",
                      "Added to Profile",
                      counts.added,
                    ],
                    [
                      "archived",
                      "Archived",
                      counts.archived,
                    ],
                  ] as const
                ).map(
                  ([
                    key,
                    label,
                    count,
                  ]) => (
                    <button
                      type="button"
                      key={key}
                      className={
                        filter === key
                          ? styles.activeHubFilter
                          : ""
                      }
                      onClick={() =>
                        setFilter(key)
                      }
                    >
                      <small>
                        {label}
                      </small>
                      <strong>
                        {count}
                      </strong>
                    </button>
                  ),
                )}
              </div>

              <div
                className={
                  styles.toolbar
                }
              >
                <span>
                  {filter === "review"
                    ? "Work that needs a decision or a successful analysis."
                    : filter === "added"
                      ? "Reviewed work currently contributing to the learner profile."
                      : filter ===
                          "archived"
                        ? "Hidden from the normal work list but retained until deleted."
                        : "All active uploaded schoolwork."}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    void loadHistory()
                  }
                  disabled={loading}
                >
                  {loading
                    ? "Loading…"
                    : "Refresh"}
                </button>
              </div>

              {loading &&
              visibleUploads.length ===
                0 ? (
                <div
                  className={styles.state}
                >
                  Loading schoolwork…
                </div>
              ) : visibleUploads.length ===
                0 ? (
                <div
                  className={styles.state}
                >
                  <strong>
                    No work in this
                    section.
                  </strong>
                </div>
              ) : (
                <div
                  className={styles.list}
                >
                  {visibleUploads.map(
                    (upload) => (
                      <article
                        key={upload.id}
                        className={
                          styles.card
                        }
                      >
                        <div
                          className={
                            styles.cardTop
                          }
                        >
                          <div>
                            <span
                              className={`${styles.status} ${
                                styles[
                                  `status_${upload.status}` as keyof typeof styles
                                ] || ""
                              }`}
                            >
                              {statusLabel(
                                upload.status,
                              )}
                            </span>

                            <h3>
                              {upload.assignment_title ||
                                upload.original_filename}
                            </h3>

                            <p>
                              {subjectLabel(
                                upload.detected_subject,
                              )}
                              {upload.detected_primary_level
                                ? ` · P${upload.detected_primary_level}`
                                : ""}
                              {" · "}
                              {dateLabel(
                                upload.reviewed_at ||
                                  upload.created_at,
                              )}
                            </p>
                          </div>

                          <div
                            className={
                              styles.counts
                            }
                          >
                            <span>
                              <b>
                                {
                                  upload
                                    .stats
                                    .items
                                }
                              </b>
                              analysed
                            </span>

                            <span>
                              <b>
                                {
                                  upload
                                    .stats
                                    .included
                                }
                              </b>
                              profile
                            </span>

                            <span>
                              <b>
                                {upload.analysis_revision ||
                                  0}
                              </b>
                              analysis v.
                            </span>
                          </div>
                        </div>

                        <div
                          className={
                            styles.fileLine
                          }
                        >
                          <span>
                            {
                              upload.original_filename
                            }
                          </span>

                          <small>
                            {upload.page_count
                              ? `${
                                  upload.page_count
                                } page${
                                  upload.page_count ===
                                  1
                                    ? ""
                                    : "s"
                                }`
                              : "Pages unknown"}
                            {" · "}
                            {upload.teacher_marked
                              ? "Teacher-marked"
                              : "Unmarked / mixed"}
                          </small>
                        </div>

                        {upload.error_message && (
                          <div
                            className={
                              styles.inlineIssue
                            }
                          >
                            {
                              upload.error_message
                            }
                          </div>
                        )}

                        <div
                          className={
                            styles.actions
                          }
                        >
                          {upload.status ===
                            "review_ready" && (
                            <button
                              type="button"
                              className={
                                styles.primary
                              }
                              onClick={() =>
                                continueReview(
                                  upload.id,
                                )
                              }
                            >
                              Continue Review
                            </button>
                          )}

                          {upload.status ===
                            "approved" && (
                            <button
                              type="button"
                              className={
                                styles.primary
                              }
                              onClick={() =>
                                continueReview(
                                  upload.id,
                                )
                              }
                            >
                              Edit Analysis
                            </button>
                          )}

                          {upload.status ===
                            "failed" && (
                            <button
                              type="button"
                              className={
                                styles.primary
                              }
                              disabled={
                                loading
                              }
                              onClick={() =>
                                void retryAnalysis(
                                  upload,
                                )
                              }
                            >
                              Retry Analysis
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              void openDetail(
                                upload.id,
                              )
                            }
                          >
                            View Analysis
                          </button>

                          {upload.status ===
                          "archived" ? (
                            <button
                              type="button"
                              onClick={() =>
                                void manage(
                                  upload,
                                  "restore",
                                )
                              }
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void manage(
                                  upload,
                                  "archive",
                                )
                              }
                            >
                              Archive
                            </button>
                          )}

                          <button
                            type="button"
                            className={
                              styles.delete
                            }
                            onClick={() =>
                              void manage(
                                upload,
                                "delete",
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </>
          )}

          {detail && (
            <div
              className={styles.detail}
            >
              <section
                className={
                  styles.detailHero
                }
              >
                <div>
                  <span
                    className={
                      styles.eyebrow
                    }
                  >
                    {statusLabel(
                      detail.upload.status,
                    )}
                  </span>

                  <h3>
                    {detail.upload
                      .assignment_title ||
                      detail.upload
                        .original_filename}
                  </h3>

                  <p>
                    {subjectLabel(
                      detail.upload
                        .detected_subject,
                    )}
                    {detail.upload
                      .detected_primary_level
                      ? ` · Primary ${detail.upload.detected_primary_level}`
                      : ""}
                    {" · "}
                    {dateLabel(
                      detail.upload
                        .reviewed_at ||
                        detail.upload
                          .created_at,
                    )}
                  </p>
                </div>

                <div
                  className={
                    styles.detailActions
                  }
                >
                  {[
                    "review_ready",
                    "approved",
                  ].includes(
                    detail.upload.status,
                  ) && (
                    <button
                      type="button"
                      className={
                        styles.primary
                      }
                      onClick={() =>
                        continueReview(
                          detail.upload.id,
                        )
                      }
                    >
                      {detail.upload
                        .status ===
                      "approved"
                        ? "Edit Analysis"
                        : "Continue Review"}
                    </button>
                  )}
                </div>
              </section>

              {detail.upload.status ===
                "needs_input" && (
                <section
                  className={
                    styles.needsInput
                  }
                >
                  <div>
                    <span
                      className={
                        styles.eyebrow
                      }
                    >
                      ONE DETAIL NEEDED
                    </span>
                    <h3>
                      Choose the curriculum
                      scope
                    </h3>
                    <p>
                      The file is safe.
                      Choose the subject and
                      Primary level, then Nova
                      will continue from the
                      stored upload.
                    </p>
                  </div>

                  <label>
                    <span>Subject</span>
                    <select
                      value={subjectHint}
                      onChange={(event) =>
                        setSubjectHint(
                          event.target
                            .value as
                            | ""
                            | "english"
                            | "math",
                        )
                      }
                    >
                      <option value="">
                        Choose subject
                      </option>
                      <option value="english">
                        English
                      </option>
                      <option value="math">
                        Mathematics
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>
                      Primary level
                    </span>
                    <select
                      value={levelHint}
                      onChange={(event) =>
                        setLevelHint(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Choose level
                      </option>
                      {[1, 2, 3, 4, 5, 6].map(
                        (level) => (
                          <option
                            key={level}
                            value={String(
                              level,
                            )}
                          >
                            Primary {level}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <button
                    type="button"
                    className={
                      styles.primary
                    }
                    disabled={
                      !subjectHint ||
                      !levelHint ||
                      loading
                    }
                    onClick={() =>
                      void retryAnalysis(
                        detail.upload,
                        true,
                      )
                    }
                  >
                    Continue Analysis
                  </button>
                </section>
              )}

              {detail.upload.status ===
                "failed" && (
                <section
                  className={
                    styles.failedRecovery
                  }
                >
                  <div>
                    <span
                      className={
                        styles.eyebrow
                      }
                    >
                      ANALYSIS INTERRUPTED
                    </span>
                    <h3>
                      Your file is still safe
                    </h3>
                    <p>
                      Retry uses the existing
                      private file; there is
                      no need to upload it
                      again.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.primary
                    }
                    disabled={loading}
                    onClick={() =>
                      void retryAnalysis(
                        detail.upload,
                      )
                    }
                  >
                    Retry Analysis
                  </button>
                </section>
              )}

              <div
                className={
                  styles.splitView
                }
              >
                <section
                  className={
                    styles.previewPane
                  }
                >
                  <div
                    className={
                      styles.paneHeading
                    }
                  >
                    <span>
                      ORIGINAL WORK
                    </span>
                    <small>
                      {
                        detail.upload
                          .original_filename
                      }
                    </small>
                  </div>

                  {detail.preview_url ? (
                    detail.upload
                      .mime_type ===
                    "application/pdf" ? (
                      <iframe
                        title="Original uploaded schoolwork"
                        src={
                          detail.preview_url
                        }
                      />
                    ) : (
                      <img
                        src={
                          detail.preview_url
                        }
                        alt="Original uploaded schoolwork"
                      />
                    )
                  ) : (
                    <div
                      className={
                        styles.previewUnavailable
                      }
                    >
                      Preview unavailable.
                      The private source file
                      is still retained.
                    </div>
                  )}
                </section>

                <section
                  className={
                    styles.analysisPane
                  }
                >
                  <div
                    className={
                      styles.paneHeading
                    }
                  >
                    <span>
                      NOVA ANALYSIS
                    </span>
                    <small>
                      {
                        detail.detail_items
                          .length
                      }{" "}
                      detected item
                      {detail.detail_items
                        .length === 1
                        ? ""
                        : "s"}
                    </small>
                  </div>

                  {detail.analysis
                    ?.overall_summary && (
                    <div
                      className={
                        styles.summary
                      }
                    >
                      <p>
                        {
                          detail.analysis
                            .overall_summary
                        }
                      </p>
                    </div>
                  )}

                  <div
                    className={
                      styles.detailItems
                    }
                  >
                    {detail.detail_items.map(
                      (item) => (
                        <article
                          key={item.id}
                        >
                          <div>
                            <small>
                              {item.question_number
                                ? `QUESTION ${item.question_number}`
                                : `ITEM ${item.item_index}`}
                            </small>
                            <strong>
                              {item.prompt ||
                                "Question text unclear"}
                            </strong>
                          </div>

                          <div
                            className={
                              styles.detailMeta
                            }
                          >
                            <span>
                              {correctnessLabel(
                                item.final_correctness,
                              )}
                            </span>
                            <span>
                              {item.primary_skill
                                ?.skill_name ||
                                "No canonical concept"}
                            </span>
                            <span>
                              {item.included_in_profile
                                ? `Profile · ${Number(
                                    item.proposed_evidence_weight ||
                                      0,
                                  ).toFixed(
                                    2,
                                  )}`
                                : "Not added"}
                            </span>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </section>
              </div>

              <section
                className={
                  styles.analysisHistory
                }
              >
                <div
                  className={
                    styles.paneHeading
                  }
                >
                  <span>
                    ANALYSIS HISTORY
                  </span>
                  <small>
                    Previous analysis attempts
                    are retained for reliability
                    and audit history.
                  </small>
                </div>

                <div
                  className={
                    styles.runList
                  }
                >
                  {(
                    detail.analysis_runs || []
                  ).map((run) => (
                    <article key={run.id}>
                      <div>
                        <strong>
                          Analysis v
                          {run.run_number}
                        </strong>
                        <small>
                          {run.trigger_source.replaceAll(
                            "_",
                            " ",
                          )}
                          {" · "}
                          {dateLabel(
                            run.completed_at ||
                              run.started_at,
                          )}
                        </small>
                      </div>

                      <span>
                        {run.status}
                      </span>

                      <span>
                        {run.duration_ms
                          ? `${(
                              run.duration_ms /
                              1000
                            ).toFixed(1)} s`
                          : "—"}
                      </span>

                      <span>
                        {run.question_count
                          ? `${run.question_count} items`
                          : "Items —"}
                      </span>

                      <span>
                        {run.automatic_retry_count > 0
                          ? "Recovered automatically"
                          : "Standard run"}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
