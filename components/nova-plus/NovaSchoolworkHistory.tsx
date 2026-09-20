"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./NovaSchoolworkHistory.module.css";

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
  assignment_title: string | null;
  detected_subject: "english" | "math" | null;
  detected_primary_level: number | null;
  page_count: number | null;
  teacher_marked: boolean | null;
  document_quality: string | null;
  analysis_confidence: number | null;
  status: UploadStatus;
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
  detail_items: DetailItem[];
};

type Props = {
  open: boolean;
  learnerId: string;
  learnerLabel: string;
  onClose: () => void;
  onContinueReview: (uploadId: string) => void;
  onChanged?: () => void | Promise<void>;
};

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

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
      return "Awaiting Review";
    case "approved":
      return "Added to Profile";
    case "archived":
      return "Archived";
    case "failed":
      return "Analysis Failed";
    case "needs_input":
      return "Needs Subject / Level";
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

export default function NovaSchoolworkHistory({
  open,
  learnerId,
  learnerLabel,
  onClose,
  onContinueReview,
  onChanged,
}: Props) {
  const [uploads, setUploads] = useState<HistoryUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [error, setError] = useState("");

  const request = useCallback(
    async (
      input: string,
      init?: RequestInit,
    ) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(input, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.error || "Schoolwork request failed.",
        );
      }

      return body;
    },
    [],
  );

  const loadHistory = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        student_id: learnerId,
        include_archived: includeArchived ? "1" : "0",
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
  }, [includeArchived, learnerId, open, request]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function openDetail(upload: HistoryUpload) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        student_id: learnerId,
        upload_id: upload.id,
      });

      const body = await request(
        `/api/nova-plus/schoolwork/history?${params.toString()}`,
      );

      setDetail(body as DetailPayload);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : String(detailError),
      );
    } finally {
      setLoading(false);
    }
  }

  async function manage(
    upload: HistoryUpload,
    action: "archive" | "restore" | "delete",
  ) {
    if (action === "delete") {
      const approvedWarning =
        upload.status === "approved" || upload.stats.included > 0
          ? "\n\nThis upload has learner-profile evidence. Deleting it will remove that evidence and recalculate mastery."
          : "";

      if (
        !window.confirm(
          `Delete "${upload.assignment_title || upload.original_filename}" permanently?${approvedWarning}`,
        )
      ) {
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      await request("/api/nova-plus/schoolwork/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          upload_id: upload.id,
        }),
      });

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

  function continueReview(uploadId: string) {
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
        aria-label="Schoolwork history"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              NOVA+ · SCHOOLWORK
            </span>
            <h2>
              {detail ? "Schoolwork details" : "Work History"}
            </h2>
            <p>
              {detail
                ? "See what was analysed, approved and added to the learner profile."
                : `${learnerLabel}'s uploaded worksheets, marked work and analysis history.`}
            </p>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={detail ? () => setDetail(null) : onClose}
            aria-label={detail ? "Back to history" : "Close history"}
          >
            {detail ? "←" : "×"}
          </button>
        </header>

        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          {!detail && (
            <>
              <div className={styles.toolbar}>
                <label>
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(event) =>
                      setIncludeArchived(event.target.checked)
                    }
                  />
                  <span>Show archived</span>
                </label>

                <button
                  type="button"
                  onClick={() => void loadHistory()}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>

              {loading && uploads.length === 0 ? (
                <div className={styles.state}>
                  Loading schoolwork history…
                </div>
              ) : uploads.length === 0 ? (
                <div className={styles.state}>
                  <strong>No uploaded work yet.</strong>
                  <p>
                    Schoolwork will appear here after it is uploaded through
                    NOVA+.
                  </p>
                </div>
              ) : (
                <div className={styles.list}>
                  {uploads.map((upload) => (
                    <article
                      key={upload.id}
                      className={styles.card}
                    >
                      <div className={styles.cardTop}>
                        <div>
                          <span
                            className={`${styles.status} ${
                              styles[
                                `status_${upload.status}` as keyof typeof styles
                              ] || ""
                            }`}
                          >
                            {statusLabel(upload.status)}
                          </span>

                          <h3>
                            {upload.assignment_title ||
                              upload.original_filename}
                          </h3>

                          <p>
                            {subjectLabel(upload.detected_subject)}
                            {upload.detected_primary_level
                              ? ` · P${upload.detected_primary_level}`
                              : ""}
                            {" · "}
                            {dateLabel(
                              upload.reviewed_at || upload.created_at,
                            )}
                          </p>
                        </div>

                        <div className={styles.counts}>
                          <span>
                            <b>{upload.stats.items}</b>
                            items
                          </span>
                          <span>
                            <b>{upload.stats.included}</b>
                            added
                          </span>
                        </div>
                      </div>

                      <div className={styles.fileLine}>
                        <span>{upload.original_filename}</span>
                        <small>
                          {upload.teacher_marked
                            ? "Teacher-marked"
                            : "Unmarked / mixed"}
                        </small>
                      </div>

                      <div className={styles.actions}>
                        {upload.status === "review_ready" && (
                          <button
                            type="button"
                            className={styles.primary}
                            onClick={() => continueReview(upload.id)}
                          >
                            Continue Review
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => void openDetail(upload)}
                        >
                          View Details
                        </button>

                        {upload.status === "archived" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void manage(upload, "restore")
                            }
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void manage(upload, "archive")
                            }
                          >
                            Archive
                          </button>
                        )}

                        <button
                          type="button"
                          className={styles.delete}
                          onClick={() => void manage(upload, "delete")}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {detail && (
            <div className={styles.detail}>
              <section className={styles.detailHero}>
                <div>
                  <span className={styles.eyebrow}>
                    {statusLabel(detail.upload.status)}
                  </span>
                  <h3>
                    {detail.upload.assignment_title ||
                      detail.upload.original_filename}
                  </h3>
                  <p>
                    {subjectLabel(detail.upload.detected_subject)}
                    {detail.upload.detected_primary_level
                      ? ` · Primary ${detail.upload.detected_primary_level}`
                      : ""}
                    {" · "}
                    {dateLabel(
                      detail.upload.reviewed_at ||
                        detail.upload.created_at,
                    )}
                  </p>
                </div>

                {detail.upload.status === "review_ready" && (
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => continueReview(detail.upload.id)}
                  >
                    Continue Review
                  </button>
                )}
              </section>

              {detail.analysis?.overall_summary && (
                <section className={styles.summary}>
                  <small>NOVA SUMMARY</small>
                  <p>{detail.analysis.overall_summary}</p>
                </section>
              )}

              <div className={styles.detailItems}>
                {detail.detail_items.map((item) => (
                  <article key={item.id}>
                    <div>
                      <small>
                        {item.question_number
                          ? `QUESTION ${item.question_number}`
                          : `ITEM ${item.item_index}`}
                      </small>
                      <strong>{item.prompt || "Question text unclear"}</strong>
                    </div>

                    <div className={styles.detailMeta}>
                      <span>
                        {correctnessLabel(item.final_correctness)}
                      </span>
                      <span>
                        {item.primary_skill?.skill_name ||
                          "No canonical concept"}
                      </span>
                      <span>
                        {item.included_in_profile
                          ? `Profile evidence · ${Number(
                              item.proposed_evidence_weight || 0,
                            ).toFixed(2)}`
                          : "Not added"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
