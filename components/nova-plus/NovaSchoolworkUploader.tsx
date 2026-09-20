"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import styles from "./NovaSchoolworkUploader.module.css";

type NovaSchoolworkUploaderProps = {
  open: boolean;
  learnerId: string;
  learnerLabel: string;
  onClose: () => void;
  onCommitted?: () => void | Promise<void>;
  resumeUploadId?: string | null;
  onResumeHandled?: () => void;
  onViewExistingUpload?: (uploadId: string) => void;
};

type SubjectHint = "" | "english" | "math";
type LevelHint = "" | "1" | "2" | "3" | "4" | "5" | "6";

type UploadStage =
  | "select"
  | "uploading"
  | "analysing"
  | "review"
  | "committing"
  | "complete"
  | "error";

type Correctness = "correct" | "incorrect" | "partial" | "uncertain";
type ReviewDecisionValue = "include" | "exclude" | "review";

type CanonicalSkill = {
  skill_id: string;
  skill_code: string;
  skill_name: string;
  domain: string;
  topic: string;
};

type AnalysisItem = {
  item_index: number;
  page_number: number;
  question_number: string;
  prompt: string;
  student_answer: string;
  expected_answer: string;
  teacher_mark: "correct" | "incorrect" | "partial" | "unmarked" | "unclear";
  teacher_feedback: string;
  final_correctness: Correctness;
  correctness_source: "teacher_mark" | "model" | "combined" | "unknown";
  extraction_confidence: number;
  correctness_confidence: number;
  mapping_confidence: number;
  reasoning_note: string;
  needs_review: boolean;
  evidence_recommendation: "include" | "review" | "exclude";
  proposed_evidence_weight: number;
  primary_skill: CanonicalSkill | null;
  supporting_skills: CanonicalSkill[];
};

type AnalysisResult = {
  status: "review_ready";
  upload: {
    id: string;
    student_user_id: string;
    assignment_title: string;
    subject: "english" | "math";
    primary_level: number;
    page_count: number;
    teacher_marked: boolean;
    document_quality: "high" | "medium" | "low";
    analysis_confidence: number;
  };
  analysis: {
    overall_summary: string;
    strength_skill_codes: string[];
    support_skill_codes: string[];
    extraction_model: string;
    reasoning_model: string;
  };
  skills: Record<string, CanonicalSkill>;
  items: AnalysisItem[];
};

type ReviewState = {
  decision: ReviewDecisionValue;
  skill_code: string;
  correctness: Correctness;
  original_skill_code: string;
  original_correctness: Correctness;
};

type CommitResult = {
  status: "approved";
  upload_id: string;
  student_user_id: string;
  items_total: number;
  items_included: number;
  items_excluded: number;
  correct_items: number;
  incorrect_items: number;
  partial_items: number;
  profile_events_written: number;
  mastery_refreshed: boolean;
  reviewed_at: string;
};

type ImpactResult = {
  questions_added: number;
  questions_excluded: number;
  concepts_updated: number;
  strengths_reinforced: number;
  concepts_needing_more_evidence: number;
  priority_changed: boolean;
};

type DuplicateUpload = {
  id: string;
  assignment_title: string | null;
  original_filename: string;
  status: string;
  created_at: string;
};

const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

function sanitiseFilename(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "schoolwork";
}

function fileSizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function sha256File(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    buffer,
  );

  return [...new Uint8Array(digest)]
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

function dateLabel(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

function confidenceLabel(value: number) {
  const percent = Math.round(
    Math.max(0, Math.min(1, Number(value || 0))) * 100,
  );

  if (percent >= 90) return `High · ${percent}%`;
  if (percent >= 75) return `Good · ${percent}%`;
  return `Review · ${percent}%`;
}

function correctnessLabel(value: Correctness) {
  switch (value) {
    case "correct":
      return "Correct";
    case "incorrect":
      return "Incorrect";
    case "partial":
      return "Partly correct";
    default:
      return "Uncertain";
  }
}

function subjectLabel(subject: "english" | "math") {
  return subject === "math" ? "Mathematics" : "English";
}

function defaultReviewState(
  result: AnalysisResult,
): Record<number, ReviewState> {
  return Object.fromEntries(
    result.items.map((item) => {
      const originalSkill = item.primary_skill?.skill_code || "";

      let decision: ReviewDecisionValue = "review";

      if (item.evidence_recommendation === "exclude") {
        decision = "exclude";
      } else if (
        item.evidence_recommendation === "include" &&
        !item.needs_review &&
        originalSkill &&
        item.final_correctness !== "uncertain"
      ) {
        decision = "include";
      }

      return [
        item.item_index,
        {
          decision,
          skill_code: originalSkill,
          correctness: item.final_correctness,
          original_skill_code: originalSkill,
          original_correctness: item.final_correctness,
        },
      ];
    }),
  );
}

function evidenceStrength(
  item: AnalysisItem,
  state: ReviewState,
) {
  if (
    state.decision !== "include" ||
    !state.skill_code ||
    state.correctness === "uncertain"
  ) {
    return "Not included";
  }

  if (
    ["correct", "incorrect", "partial"].includes(item.teacher_mark) &&
    ["teacher_mark", "combined"].includes(item.correctness_source)
  ) {
    return state.correctness === "partial"
      ? "Teacher evidence · 0.60"
      : "Teacher evidence · 0.80";
  }

  const correctnessEdited =
    state.correctness !== state.original_correctness;

  if (correctnessEdited) {
    return state.correctness === "partial"
      ? "Reviewed evidence · 0.30"
      : "Reviewed evidence · 0.50";
  }

  if (
    item.correctness_confidence >= 0.9 &&
    (state.skill_code !== state.original_skill_code ||
      item.mapping_confidence >= 0.85)
  ) {
    return state.correctness === "partial"
      ? "AI-checked · 0.35"
      : "AI-checked · 0.50";
  }

  return "Conservative evidence · ≤0.35";
}

export default function NovaSchoolworkUploader({
  open,
  learnerId,
  learnerLabel,
  onClose,
  onCommitted,
  resumeUploadId = null,
  onResumeHandled,
  onViewExistingUpload,
}: NovaSchoolworkUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [subjectHint, setSubjectHint] =
    useState<SubjectHint>("");
  const [levelHint, setLevelHint] =
    useState<LevelHint>("");

  const [stage, setStage] =
    useState<UploadStage>("select");

  const [error, setError] = useState("");
  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [reviewState, setReviewState] = useState<
    Record<number, ReviewState>
  >({});

  const [commitResult, setCommitResult] =
    useState<CommitResult | null>(null);

  const [impactResult, setImpactResult] =
    useState<ImpactResult | null>(null);

  const [fileHash, setFileHash] = useState("");
  const [duplicateUpload, setDuplicateUpload] =
    useState<DuplicateUpload | null>(null);
  const [uploadDuplicateAnyway, setUploadDuplicateAnyway] =
    useState(false);

  const [dragActive, setDragActive] = useState(false);

  const skills = useMemo(
    () =>
      result
        ? Object.values(result.skills).sort((a, b) => {
            if (a.topic !== b.topic) {
              return a.topic.localeCompare(b.topic);
            }
            return a.skill_name.localeCompare(b.skill_name);
          })
        : [],
    [result],
  );

  const unresolvedCount = useMemo(() => {
    if (!result) return 0;

    return result.items.filter((item) => {
      const state = reviewState[item.item_index];

      if (!state || state.decision === "review") {
        return true;
      }

      if (state.decision === "exclude") {
        return false;
      }

      return (
        !state.skill_code ||
        state.correctness === "uncertain"
      );
    }).length;
  }, [result, reviewState]);

  const includedCount = useMemo(
    () =>
      Object.values(reviewState).filter(
        (state) => state.decision === "include",
      ).length,
    [reviewState],
  );

  const excludedCount = useMemo(
    () =>
      Object.values(reviewState).filter(
        (state) => state.decision === "exclude",
      ).length,
    [reviewState],
  );


  useEffect(() => {
    let cancelled = false;

    if (!open || !resumeUploadId) return;

    // Preserve the narrowed non-null value for the nested async callback.
    // TypeScript does not keep the resumeUploadId narrowing across closures.
    const uploadIdToResume = resumeUploadId;

    async function resume() {
      setStage("analysing");
      setError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Please sign in again.");
        }

        const params = new URLSearchParams({
          student_id: learnerId,
          upload_id: uploadIdToResume,
        });

        const response = await fetch(
          `/api/nova-plus/schoolwork/history?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            body?.error ||
              "The previous schoolwork analysis could not be reopened.",
          );
        }

        if (cancelled) return;

        const analysis = body.analysis_result as AnalysisResult;

        setFile(null);
        setResult(analysis);
        setReviewState(defaultReviewState(analysis));
        setCommitResult(null);
        setStage("review");
      } catch (resumeError) {
        if (cancelled) return;

        setStage("error");
        setError(
          resumeError instanceof Error
            ? resumeError.message
            : String(resumeError),
        );
      } finally {
        if (!cancelled) {
          onResumeHandled?.();
        }
      }
    }

    void resume();

    return () => {
      cancelled = true;
    };
  }, [
    learnerId,
    onResumeHandled,
    open,
    resumeUploadId,
  ]);

  if (!open) return null;

  function reset() {
    setFile(null);
    setSubjectHint("");
    setLevelHint("");
    setStage("select");
    setError("");
    setResult(null);
    setReviewState({});
    setCommitResult(null);
    setImpactResult(null);
    setFileHash("");
    setDuplicateUpload(null);
    setUploadDuplicateAnyway(false);
    setDragActive(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function close() {
    if (
      stage === "uploading" ||
      stage === "analysing" ||
      stage === "committing"
    ) {
      return;
    }

    reset();
    onClose();
  }

  function validateFile(nextFile: File) {
    if (!ALLOWED_TYPES.has(nextFile.type)) {
      return "Upload a PDF, PNG or JPG/JPEG file.";
    }

    if (nextFile.size <= 0) {
      return "This file appears to be empty.";
    }

    if (nextFile.size > MAX_BYTES) {
      return "The maximum file size is 20 MB.";
    }

    return "";
  }

  async function chooseFile(
    nextFile: File | null,
  ) {
    if (!nextFile) return;

    const validation = validateFile(nextFile);

    if (validation) {
      setFile(null);
      setError(validation);
      return;
    }

    setError("");
    setFile(nextFile);
    setResult(null);
    setReviewState({});
    setCommitResult(null);
    setImpactResult(null);
    setDuplicateUpload(null);
    setUploadDuplicateAnyway(false);
    setStage("select");

    try {
      const hash = await sha256File(nextFile);
      setFileHash(hash);

      const { data, error } = await supabase
        .from("nova_schoolwork_uploads")
        .select(
          "id,assignment_title,original_filename,status,created_at",
        )
        .eq("student_user_id", learnerId)
        .eq("file_sha256", hash)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data?.[0]) {
        setDuplicateUpload(
          data[0] as DuplicateUpload,
        );
      }
    } catch {
      // Duplicate detection must not block upload.
    }
  }

  function onFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    void chooseFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  function updateReview(
    itemIndex: number,
    patch: Partial<ReviewState>,
  ) {
    setReviewState((current) => ({
      ...current,
      [itemIndex]: {
        ...current[itemIndex],
        ...patch,
      },
    }));
  }

  async function analyse() {
    if (!file) return;

    if (
      duplicateUpload &&
      !uploadDuplicateAnyway
    ) {
      setError(
        "This file appears to have been uploaded before. View the existing analysis or choose Upload anyway.",
      );
      return;
    }

    const validation = validateFile(file);

    if (validation) {
      setError(validation);
      return;
    }

    setError("");
    setResult(null);
    setReviewState({});
    setCommitResult(null);
    setStage("uploading");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.user ||
      !session.access_token
    ) {
      setStage("error");
      setError(
        "Please sign in again before uploading schoolwork.",
      );
      return;
    }

    const uploadId = crypto.randomUUID();
    const filename = sanitiseFilename(file.name);

    const storagePath =
      `${learnerId}/${uploadId}/${filename}`;

    const { error: storageError } =
      await supabase.storage
        .from("nova-schoolwork")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

    if (storageError) {
      setStage("error");
      setError(storageError.message);
      return;
    }

    const { error: uploadRowError } = await supabase
      .from("nova_schoolwork_uploads")
      .insert({
        id: uploadId,
        student_user_id: learnerId,
        uploaded_by_user_id: session.user.id,
        storage_bucket: "nova-schoolwork",
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        file_sha256: fileHash || null,
        subject_hint: subjectHint || null,
        primary_level_hint:
          levelHint ? Number(levelHint) : null,
        status: "uploaded",
      });

    if (uploadRowError) {
      try {
        await supabase.storage
          .from("nova-schoolwork")
          .remove([storagePath]);
      } catch {
        // Preserve the original upload-row error.
      }

      setStage("error");
      setError(uploadRowError.message);
      return;
    }

    setStage("analysing");

    const response = await fetch(
      "/api/nova-plus/schoolwork/analyse",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upload_id: uploadId,
        }),
      },
    );

    const body =
      await response.json().catch(() => null);

    if (!response.ok) {
      setStage("error");
      setError(
        body?.message ||
          body?.error ||
          "Nova could not analyse this schoolwork.",
      );
      return;
    }

    const analysis = body as AnalysisResult;

    setResult(analysis);
    setReviewState(defaultReviewState(analysis));
    setStage("review");
  }

  async function commitReview() {
    if (!result || unresolvedCount > 0) return;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      setError("Please sign in again.");
      return;
    }

    const decisions = result.items.map((item) => {
      const state = reviewState[item.item_index];

      return {
        item_index: item.item_index,
        decision: state.decision,
        skill_code: state.skill_code,
        correctness: state.correctness,
        mapping_edited:
          state.skill_code !==
          state.original_skill_code,
        correctness_edited:
          state.correctness !==
          state.original_correctness,
      };
    });

    setError("");
    setStage("committing");

    const response = await fetch(
      "/api/nova-plus/schoolwork/commit",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upload_id: result.upload.id,
          decisions,
        }),
      },
    );

    const body =
      await response.json().catch(() => null);

    if (!response.ok) {
      setStage("review");
      setError(
        body?.error ||
          "The reviewed schoolwork could not be added to the learner profile.",
      );
      return;
    }

    setCommitResult(
      (body?.result ?? null) as CommitResult | null,
    );
    setImpactResult(
      (body?.impact ?? null) as ImpactResult | null,
    );

    setStage("complete");

    try {
      await onCommitted?.();
    } catch {
      // The evidence commit succeeded even if the UI refresh fails.
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={close}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Add schoolwork to NOVA+"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              NOVA+ · ADD WORK
            </span>

            <h2>
              {stage === "review"
                ? "Review before adding to the learner profile"
                : stage === "complete"
                  ? "Schoolwork added to NOVA+"
                  : "Analyse schoolwork"}
            </h2>

            <p>
              {stage === "review"
                ? `Confirm what Nova detected in ${learnerLabel}'s work. Only included items will become mastery evidence.`
                : stage === "complete"
                  ? `The approved evidence has been added to ${learnerLabel}'s existing NOVA+ learner profile.`
                  : `Upload ${learnerLabel}'s worksheet, homework or marked paper for concept-level analysis.`}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={close}
            disabled={
              stage === "uploading" ||
              stage === "analysing" ||
              stage === "committing"
            }
            aria-label="Close schoolwork uploader"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {stage === "select" && (
            <>
              <div
                className={`${styles.dropZone} ${
                  dragActive
                    ? styles.dropZoneActive
                    : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() =>
                  setDragActive(false)
                }
                onDrop={onDrop}
                onClick={() =>
                  inputRef.current?.click()
                }
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    inputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={inputRef}
                  className={styles.hiddenInput}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={onFileChange}
                />

                <div className={styles.uploadMark}>
                  ＋
                </div>

                {file ? (
                  <div className={styles.fileSelected}>
                    <strong>{file.name}</strong>
                    <span>
                      {fileSizeLabel(file.size)} ·{" "}
                      {file.type === "application/pdf"
                        ? "PDF"
                        : "Image"}
                    </span>
                    <small>
                      Click or drop another file to
                      replace it.
                    </small>
                  </div>
                ) : (
                  <div>
                    <strong>
                      Drop schoolwork here
                    </strong>
                    <span>
                      or click to choose a file
                    </span>
                    <small>
                      PDF, PNG or JPG · maximum 20 MB · up to 20 pages
                    </small>
                  </div>
                )}
              </div>

              <div className={styles.hints}>
                <label>
                  <span>Subject</span>
                  <select
                    value={subjectHint}
                    onChange={(event) =>
                      setSubjectHint(
                        event.target
                          .value as SubjectHint,
                      )
                    }
                  >
                    <option value="">
                      Auto-detect
                    </option>
                    <option value="english">
                      English
                    </option>
                    <option value="math">
                      Mathematics
                    </option>
                  </select>
                  <small>
                    Choose this only if the subject is
                    already known.
                  </small>
                </label>

                <label>
                  <span>Primary level</span>
                  <select
                    value={levelHint}
                    onChange={(event) =>
                      setLevelHint(
                        event.target
                          .value as LevelHint,
                      )
                    }
                  >
                    <option value="">
                      Auto-detect
                    </option>
                    {[1, 2, 3, 4, 5, 6].map(
                      (level) => (
                        <option
                          key={level}
                          value={String(level)}
                        >
                          Primary {level}
                        </option>
                      ),
                    )}
                  </select>
                  <small>
                    A level hint improves concept
                    matching when the worksheet is
                    ambiguous.
                  </small>
                </label>
              </div>

              {duplicateUpload && (
                <div className={styles.duplicateWarning}>
                  <div>
                    <strong>Possible duplicate upload</strong>
                    <p>
                      This same file was uploaded on{" "}
                      {dateLabel(
                        duplicateUpload.created_at,
                      )}{" "}
                      as “
                      {duplicateUpload.assignment_title ||
                        duplicateUpload.original_filename}
                      ”.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        onViewExistingUpload?.(
                          duplicateUpload.id,
                        )
                      }
                    >
                      View existing analysis
                    </button>

                    <button
                      type="button"
                      className={
                        uploadDuplicateAnyway
                          ? styles.duplicateConfirmed
                          : ""
                      }
                      onClick={() => {
                        setUploadDuplicateAnyway(true);
                        setError("");
                      }}
                    >
                      {uploadDuplicateAnyway
                        ? "Upload anyway selected"
                        : "Upload anyway"}
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.privacyNote}>
                <div className={styles.lockMark}>
                  ◇
                </div>
                <div>
                  <strong>
                    Private learner evidence
                  </strong>
                  <p>
                    Analysis does not affect mastery
                    until the review step is confirmed.
                  </p>
                </div>
              </div>

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}
            </>
          )}

          {(stage === "uploading" ||
            stage === "analysing" ||
            stage === "committing") && (
            <div className={styles.processing}>
              <span className={styles.spinner} />

              <div
                className={styles.processingCopy}
              >
                <span className={styles.eyebrow}>
                  {stage === "uploading"
                    ? "SECURE UPLOAD"
                    : stage === "analysing"
                      ? "LIVE AI ANALYSIS"
                      : "UPDATING LEARNER PROFILE"}
                </span>

                <h3>
                  {stage === "uploading"
                    ? "Uploading the schoolwork…"
                    : stage === "analysing"
                      ? "Nova is reading the work question by question…"
                      : "Adding the approved evidence…"}
                </h3>

                <p>
                  {stage === "committing"
                    ? "Only the concepts and correctness decisions you approved are being written into the existing NOVA+ learner model."
                    : "The file is analysed in two stages before anything can become learner evidence."}
                </p>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className={styles.errorState}>
              <div className={styles.errorMark}>
                !
              </div>
              <h3>
                Analysis could not be completed
              </h3>
              <p>{error}</p>
              <button
                type="button"
                onClick={reset}
              >
                Try another upload
              </button>
            </div>
          )}

          {stage === "review" && result && (
            <>
              <section
                className={styles.analysisSummary}
              >
                <div>
                  <small>ASSIGNMENT</small>
                  <h3>
                    {result.upload
                      .assignment_title ||
                      "Uploaded schoolwork"}
                  </h3>
                  <p>
                    {
                      result.analysis
                        .overall_summary
                    }
                  </p>
                </div>

                <div
                  className={styles.analysisBadges}
                >
                  <span>
                    {subjectLabel(
                      result.upload.subject,
                    )}{" "}
                    · P
                    {
                      result.upload
                        .primary_level
                    }
                  </span>
                  <span>
                    {result.items.length} items
                  </span>
                  <span>
                    {unresolvedCount > 0
                      ? `${unresolvedCount} decisions left`
                      : "Ready to add"}
                  </span>
                </div>
              </section>

              <section
                className={styles.phase3Summary}
              >
                <article>
                  <small>INCLUDE</small>
                  <strong>
                    {includedCount}
                  </strong>
                </article>
                <article>
                  <small>EXCLUDE</small>
                  <strong>
                    {excludedCount}
                  </strong>
                </article>
                <article>
                  <small>NEEDS DECISION</small>
                  <strong>
                    {unresolvedCount}
                  </strong>
                </article>
              </section>

              <section
                className={styles.reviewSection}
              >
                <div
                  className={styles.reviewHeading}
                >
                  <div>
                    <span
                      className={styles.eyebrow}
                    >
                      REVIEW EVIDENCE
                    </span>
                    <h3>
                      Confirm each question
                    </h3>
                  </div>

                  <p>
                    You can correct the concept,
                    confirm the answer judgement, or
                    exclude an item completely.
                  </p>
                </div>

                <div
                  className={styles.itemList}
                >
                  {result.items.map((item) => {
                    const state =
                      reviewState[
                        item.item_index
                      ];

                    if (!state) return null;

                    const itemUnresolved =
                      state.decision ===
                        "review" ||
                      (state.decision ===
                        "include" &&
                        (!state.skill_code ||
                          state.correctness ===
                            "uncertain"));

                    return (
                      <article
                        key={item.item_index}
                        className={`${styles.itemCard} ${
                          itemUnresolved
                            ? styles.itemReview
                            : ""
                        }`}
                      >
                        <div
                          className={
                            styles.itemTop
                          }
                        >
                          <div>
                            <small>
                              {item.question_number
                                ? `QUESTION ${item.question_number}`
                                : `ITEM ${item.item_index}`}
                              {item.page_number >
                              0
                                ? ` · PAGE ${item.page_number}`
                                : ""}
                            </small>
                            <strong>
                              {item.prompt ||
                                "Question text unclear"}
                            </strong>
                          </div>

                          <span
                            className={`${styles.correctness} ${
                              styles[
                                `correctness_${state.correctness}` as
                                  | "correctness_correct"
                                  | "correctness_incorrect"
                                  | "correctness_partial"
                                  | "correctness_uncertain"
                              ]
                            }`}
                          >
                            {correctnessLabel(
                              state.correctness,
                            )}
                          </span>
                        </div>

                        <div
                          className={
                            styles.answerGrid
                          }
                        >
                          <div>
                            <small>
                              Student answer
                            </small>
                            <p>
                              {item.student_answer ||
                                "No answer detected"}
                            </p>
                          </div>

                          <div>
                            <small>
                              Expected answer
                            </small>
                            <p>
                              {item.expected_answer ||
                                "Not stated / open-ended"}
                            </p>
                          </div>
                        </div>

                        <div
                          className={
                            styles.reviewControls
                          }
                        >
                          <div
                            className={
                              styles.decisionControl
                            }
                          >
                            <small>
                              Use in learner profile?
                            </small>

                            <div>
                              <button
                                type="button"
                                className={
                                  state.decision ===
                                  "include"
                                    ? styles.decisionIncludeActive
                                    : ""
                                }
                                onClick={() =>
                                  updateReview(
                                    item.item_index,
                                    {
                                      decision:
                                        "include",
                                    },
                                  )
                                }
                              >
                                Include
                              </button>

                              <button
                                type="button"
                                className={
                                  state.decision ===
                                  "exclude"
                                    ? styles.decisionExcludeActive
                                    : ""
                                }
                                onClick={() =>
                                  updateReview(
                                    item.item_index,
                                    {
                                      decision:
                                        "exclude",
                                    },
                                  )
                                }
                              >
                                Exclude
                              </button>
                            </div>
                          </div>

                          <label>
                            <span>
                              Correctness
                            </span>
                            <select
                              value={
                                state.correctness
                              }
                              disabled={
                                state.decision ===
                                "exclude"
                              }
                              onChange={(event) =>
                                updateReview(
                                  item.item_index,
                                  {
                                    correctness:
                                      event.target
                                        .value as Correctness,
                                    decision:
                                      state.decision ===
                                      "review"
                                        ? "include"
                                        : state.decision,
                                  },
                                )
                              }
                            >
                              <option value="correct">
                                Correct
                              </option>
                              <option value="incorrect">
                                Incorrect
                              </option>
                              <option value="partial">
                                Partly correct
                              </option>
                              <option value="uncertain">
                                Uncertain
                              </option>
                            </select>
                          </label>

                          <label
                            className={
                              styles.conceptSelect
                            }
                          >
                            <span>
                              Canonical concept
                            </span>
                            <select
                              value={
                                state.skill_code
                              }
                              disabled={
                                state.decision ===
                                "exclude"
                              }
                              onChange={(event) =>
                                updateReview(
                                  item.item_index,
                                  {
                                    skill_code:
                                      event.target
                                        .value,
                                    decision:
                                      state.decision ===
                                      "review"
                                        ? "include"
                                        : state.decision,
                                  },
                                )
                              }
                            >
                              <option value="">
                                Choose concept…
                              </option>

                              {skills.map(
                                (skill) => (
                                  <option
                                    key={
                                      skill.skill_code
                                    }
                                    value={
                                      skill.skill_code
                                    }
                                  >
                                    {skill.topic} —{" "}
                                    {
                                      skill.skill_name
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </div>

                        <div
                          className={
                            styles.phase3EvidenceRow
                          }
                        >
                          <div>
                            <small>
                              Evidence strength
                            </small>
                            <strong>
                              {evidenceStrength(
                                item,
                                state,
                              )}
                            </strong>
                          </div>

                          <div>
                            <small>
                              Original mapping
                            </small>
                            <strong>
                              {item.primary_skill
                                ?.skill_name ||
                                "No reliable mapping"}
                            </strong>
                          </div>

                          <div>
                            <small>
                              AI mapping confidence
                            </small>
                            <strong>
                              {confidenceLabel(
                                item.mapping_confidence,
                              )}
                            </strong>
                          </div>
                        </div>

                        {item.teacher_feedback && (
                          <div
                            className={
                              styles.teacherFeedback
                            }
                          >
                            <small>
                              Teacher feedback
                            </small>
                            <p>
                              {
                                item.teacher_feedback
                              }
                            </p>
                          </div>
                        )}

                        {itemUnresolved && (
                          <div
                            className={
                              styles.itemDecisionWarning
                            }
                          >
                            Choose Include or Exclude.
                            Included items also need a
                            confirmed correctness result
                            and canonical concept.
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <div
                className={
                  styles.phase3CommitBar
                }
              >
                <div>
                  <strong>
                    {unresolvedCount > 0
                      ? `${unresolvedCount} item${
                          unresolvedCount === 1
                            ? ""
                            : "s"
                        } still need a decision`
                      : "Ready to update the learner profile"}
                  </strong>

                  <p>
                    Only the selected primary concept
                    from each included item becomes
                    evidence. Supporting AI mappings
                    remain stored but do not double
                    count mastery.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    unresolvedCount > 0
                  }
                  onClick={() =>
                    void commitReview()
                  }
                >
                  Add to Learning Profile
                  <span>→</span>
                </button>
              </div>
            </>
          )}

          {stage === "complete" &&
            commitResult && (
              <div
                className={
                  styles.completeState
                }
              >
                <div
                  className={
                    styles.completeMark
                  }
                >
                  ✓
                </div>

                <span
                  className={styles.eyebrow}
                >
                  LEARNING PROFILE UPDATED
                </span>

                <h3>
                  Schoolwork evidence has been
                  added
                </h3>

                <p>
                  NOVA+ recalculated the learner&apos;s
                  concept mastery using only the
                  questions you approved.
                </p>

                <div
                  className={
                    styles.completeMetrics
                  }
                >
                  <article>
                    <small>
                      Added
                    </small>
                    <strong>
                      {
                        commitResult.items_included
                      }
                    </strong>
                  </article>
                  <article>
                    <small>
                      Excluded
                    </small>
                    <strong>
                      {
                        commitResult.items_excluded
                      }
                    </strong>
                  </article>
                  <article>
                    <small>
                      Profile events
                    </small>
                    <strong>
                      {
                        commitResult.profile_events_written
                      }
                    </strong>
                  </article>
                </div>

                {impactResult && (
                  <div className={styles.impactGrid}>
                    <article>
                      <small>Concepts updated</small>
                      <strong>
                        {impactResult.concepts_updated}
                      </strong>
                    </article>

                    <article>
                      <small>Strengths reinforced</small>
                      <strong>
                        {impactResult.strengths_reinforced}
                      </strong>
                    </article>

                    <article>
                      <small>Need more evidence</small>
                      <strong>
                        {impactResult.concepts_needing_more_evidence}
                      </strong>
                    </article>

                    <article>
                      <small>Top priority</small>
                      <strong>
                        {impactResult.priority_changed
                          ? "Updated"
                          : "Unchanged"}
                      </strong>
                    </article>
                  </div>
                )}

                <button
                  type="button"
                  className={
                    styles.completeButton
                  }
                  onClick={close}
                >
                  View Updated NOVA+
                  <span>→</span>
                </button>
              </div>
            )}
        </div>

        {stage === "select" && (
          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.secondary}
              onClick={close}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.primary}
              disabled={!file}
              onClick={() => void analyse()}
            >
              Upload &amp; Analyse
              <span>→</span>
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
