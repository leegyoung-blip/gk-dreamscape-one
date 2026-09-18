"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./NovaSchoolworkUploader.module.css";

type NovaSchoolworkUploaderProps = {
  open: boolean;
  learnerId: string;
  learnerLabel: string;
  onClose: () => void;
};

type SubjectHint = "" | "english" | "math";
type LevelHint = "" | "1" | "2" | "3" | "4" | "5" | "6";
type UploadStage = "select" | "uploading" | "analysing" | "review" | "error";

type AnalysisItem = {
  item_index: number;
  page_number: number;
  question_number: string;
  prompt: string;
  student_answer: string;
  expected_answer: string;
  teacher_mark: "correct" | "incorrect" | "partial" | "unmarked" | "unclear";
  teacher_feedback: string;
  final_correctness: "correct" | "incorrect" | "partial" | "uncertain";
  correctness_source: "teacher_mark" | "model" | "combined" | "unknown";
  extraction_confidence: number;
  correctness_confidence: number;
  mapping_confidence: number;
  reasoning_note: string;
  needs_review: boolean;
  evidence_recommendation: "include" | "review" | "exclude";
  proposed_evidence_weight: number;
  primary_skill: {
    skill_id: string;
    skill_code: string;
    skill_name: string;
    domain: string;
    topic: string;
  } | null;
  supporting_skills: Array<{
    skill_id: string;
    skill_code: string;
    skill_name: string;
    domain: string;
    topic: string;
  }>;
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
  skills: Record<
    string,
    {
      skill_id: string;
      skill_code: string;
      skill_name: string;
      domain: string;
      topic: string;
    }
  >;
  items: AnalysisItem[];
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

function confidenceLabel(value: number) {
  const percent = Math.round(Math.max(0, Math.min(1, Number(value || 0))) * 100);

  if (percent >= 90) return `High · ${percent}%`;
  if (percent >= 75) return `Good · ${percent}%`;
  return `Review · ${percent}%`;
}

function correctnessLabel(value: AnalysisItem["final_correctness"]) {
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

export default function NovaSchoolworkUploader({
  open,
  learnerId,
  learnerLabel,
  onClose,
}: NovaSchoolworkUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [subjectHint, setSubjectHint] = useState<SubjectHint>("");
  const [levelHint, setLevelHint] = useState<LevelHint>("");
  const [stage, setStage] = useState<UploadStage>("select");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const reviewCount = useMemo(
    () => result?.items.filter((item) => item.needs_review).length ?? 0,
    [result],
  );

  const mappedCount = useMemo(
    () => result?.items.filter((item) => item.primary_skill).length ?? 0,
    [result],
  );

  if (!open) return null;

  function reset() {
    setFile(null);
    setSubjectHint("");
    setLevelHint("");
    setStage("select");
    setError("");
    setResult(null);
    setDragActive(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (stage === "uploading" || stage === "analysing") return;
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

  function chooseFile(nextFile: File | null) {
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
    setStage("select");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function analyse() {
    if (!file) return;

    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }

    setError("");
    setResult(null);
    setStage("uploading");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user || !session.access_token) {
      setStage("error");
      setError("Please sign in again before uploading schoolwork.");
      return;
    }

    const uploadId = crypto.randomUUID();
    const filename = sanitiseFilename(file.name);
    const storagePath = `${learnerId}/${uploadId}/${filename}`;

    const { error: storageError } = await supabase.storage
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
        subject_hint: subjectHint || null,
        primary_level_hint: levelHint ? Number(levelHint) : null,
        status: "uploaded",
      });

    if (uploadRowError) {
      await supabase.storage
        .from("nova-schoolwork")
        .remove([storagePath])
        .catch(() => undefined);

      setStage("error");
      setError(uploadRowError.message);
      return;
    }

    setStage("analysing");

    const response = await fetch("/api/nova-plus/schoolwork/analyse", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        upload_id: uploadId,
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStage("error");
      setError(
        body?.message ||
          body?.error ||
          "Nova could not analyse this schoolwork.",
      );
      return;
    }

    setResult(body as AnalysisResult);
    setStage("review");
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
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>NOVA+ · ADD WORK</span>
            <h2>
              {stage === "review"
                ? "Review the schoolwork analysis"
                : "Analyse schoolwork"}
            </h2>
            <p>
              {stage === "review"
                ? `Nova has analysed ${learnerLabel}'s work. Nothing has been added to mastery yet.`
                : `Upload ${learnerLabel}'s worksheet, homework or marked paper for concept-level analysis.`}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={close}
            disabled={stage === "uploading" || stage === "analysing"}
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
                  dragActive ? styles.dropZoneActive : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
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

                <div className={styles.uploadMark}>＋</div>

                {file ? (
                  <div className={styles.fileSelected}>
                    <strong>{file.name}</strong>
                    <span>
                      {fileSizeLabel(file.size)} ·{" "}
                      {file.type === "application/pdf"
                        ? "PDF"
                        : "Image"}
                    </span>
                    <small>Click or drop another file to replace it.</small>
                  </div>
                ) : (
                  <div>
                    <strong>Drop schoolwork here</strong>
                    <span>or click to choose a file</span>
                    <small>PDF, PNG or JPG · maximum 20 MB</small>
                  </div>
                )}
              </div>

              <div className={styles.hints}>
                <label>
                  <span>Subject</span>
                  <select
                    value={subjectHint}
                    onChange={(event) =>
                      setSubjectHint(event.target.value as SubjectHint)
                    }
                  >
                    <option value="">Auto-detect</option>
                    <option value="english">English</option>
                    <option value="math">Mathematics</option>
                  </select>
                  <small>
                    Choose this only if the subject is already known.
                  </small>
                </label>

                <label>
                  <span>Primary level</span>
                  <select
                    value={levelHint}
                    onChange={(event) =>
                      setLevelHint(event.target.value as LevelHint)
                    }
                  >
                    <option value="">Auto-detect</option>
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <option key={level} value={String(level)}>
                        Primary {level}
                      </option>
                    ))}
                  </select>
                  <small>
                    A level hint improves concept matching when the worksheet is ambiguous.
                  </small>
                </label>
              </div>

              <div className={styles.privacyNote}>
                <div className={styles.lockMark}>◇</div>
                <div>
                  <strong>Private learner evidence</strong>
                  <p>
                    Files are stored in a private Supabase bucket. Analysis uses
                    temporary signed access and does not automatically change the
                    learner&apos;s mastery profile.
                  </p>
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}
            </>
          )}

          {(stage === "uploading" || stage === "analysing") && (
            <div className={styles.processing}>
              <span className={styles.spinner} />

              <div className={styles.processingCopy}>
                <span className={styles.eyebrow}>
                  {stage === "uploading"
                    ? "SECURE UPLOAD"
                    : "LIVE AI ANALYSIS"}
                </span>
                <h3>
                  {stage === "uploading"
                    ? "Uploading the schoolwork…"
                    : "Nova is reading the work question by question…"}
                </h3>
                <p>
                  {stage === "uploading"
                    ? "The file is being stored privately under the selected learner."
                    : "A smaller multimodal model extracts the work first. A stronger reasoning model then checks correctness and maps each question to the canonical curriculum."}
                </p>
              </div>

              <div className={styles.processingSteps}>
                <span className={styles.completeStep}>1. File secured</span>
                <span
                  className={
                    stage === "analysing"
                      ? styles.activeStep
                      : styles.pendingStep
                  }
                >
                  2. Questions extracted
                </span>
                <span className={styles.pendingStep}>
                  3. Concepts mapped
                </span>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className={styles.errorState}>
              <div className={styles.errorMark}>!</div>
              <h3>Analysis could not be completed</h3>
              <p>{error}</p>
              <button type="button" onClick={reset}>
                Try another upload
              </button>
            </div>
          )}

          {stage === "review" && result && (
            <>
              <section className={styles.analysisSummary}>
                <div>
                  <small>ASSIGNMENT</small>
                  <h3>
                    {result.upload.assignment_title || "Uploaded schoolwork"}
                  </h3>
                  <p>{result.analysis.overall_summary}</p>
                </div>

                <div className={styles.analysisBadges}>
                  <span>
                    {subjectLabel(result.upload.subject)} · P
                    {result.upload.primary_level}
                  </span>
                  <span>{result.upload.page_count} page(s)</span>
                  <span>
                    {result.upload.teacher_marked
                      ? "Teacher-marked"
                      : "Unmarked / mixed"}
                  </span>
                </div>
              </section>

              <section className={styles.resultMetrics}>
                <article>
                  <small>Questions detected</small>
                  <strong>{result.items.length}</strong>
                </article>
                <article>
                  <small>Mapped to concepts</small>
                  <strong>{mappedCount}</strong>
                </article>
                <article>
                  <small>Needs review</small>
                  <strong>{reviewCount}</strong>
                </article>
                <article>
                  <small>Analysis confidence</small>
                  <strong>
                    {Math.round(
                      Number(result.upload.analysis_confidence || 0) * 100,
                    )}
                    %
                  </strong>
                </article>
              </section>

              <section className={styles.reviewSection}>
                <div className={styles.reviewHeading}>
                  <div>
                    <span className={styles.eyebrow}>QUESTION ANALYSIS</span>
                    <h3>What Nova detected</h3>
                  </div>
                  <p>
                    Phase 3 will add the confirmation controls before any of this
                    becomes learner evidence.
                  </p>
                </div>

                <div className={styles.itemList}>
                  {result.items.map((item) => (
                    <article
                      key={item.item_index}
                      className={`${styles.itemCard} ${
                        item.needs_review ? styles.itemReview : ""
                      }`}
                    >
                      <div className={styles.itemTop}>
                        <div>
                          <small>
                            {item.question_number
                              ? `QUESTION ${item.question_number}`
                              : `ITEM ${item.item_index}`}
                            {item.page_number > 0
                              ? ` · PAGE ${item.page_number}`
                              : ""}
                          </small>
                          <strong>{item.prompt || "Question text unclear"}</strong>
                        </div>

                        <span
                          className={`${styles.correctness} ${
                            styles[
                              `correctness_${item.final_correctness}` as
                                | "correctness_correct"
                                | "correctness_incorrect"
                                | "correctness_partial"
                                | "correctness_uncertain"
                            ]
                          }`}
                        >
                          {correctnessLabel(item.final_correctness)}
                        </span>
                      </div>

                      <div className={styles.answerGrid}>
                        <div>
                          <small>Student answer</small>
                          <p>{item.student_answer || "No answer detected"}</p>
                        </div>
                        <div>
                          <small>Expected answer</small>
                          <p>{item.expected_answer || "Not stated / open-ended"}</p>
                        </div>
                      </div>

                      <div className={styles.mappingRow}>
                        <div>
                          <small>Canonical concept</small>
                          <strong>
                            {item.primary_skill?.skill_name ||
                              "No reliable concept mapping"}
                          </strong>
                          {item.primary_skill && (
                            <span>
                              {item.primary_skill.topic} ·{" "}
                              {item.primary_skill.skill_code}
                            </span>
                          )}
                        </div>

                        <div className={styles.mappingMeta}>
                          <span>
                            Mapping{" "}
                            {confidenceLabel(item.mapping_confidence)}
                          </span>
                          <span>
                            Reading{" "}
                            {confidenceLabel(item.extraction_confidence)}
                          </span>
                          {item.needs_review && <b>Review needed</b>}
                        </div>
                      </div>

                      {item.teacher_feedback && (
                        <div className={styles.teacherFeedback}>
                          <small>Teacher feedback</small>
                          <p>{item.teacher_feedback}</p>
                        </div>
                      )}

                      {item.reasoning_note && (
                        <details className={styles.reasoning}>
                          <summary>Why Nova mapped it this way</summary>
                          <p>{item.reasoning_note}</p>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <div className={styles.phaseNotice}>
                <div>
                  <strong>Analysis is ready for review.</strong>
                  <p>
                    This Phase 1+2 build deliberately stops here. In Phase 3,
                    the parent/teacher will approve, edit or exclude each item
                    before it can affect Strengths &amp; Gaps, Mastery Map,
                    Nova Recommends, Progress or Parent Report.
                  </p>
                </div>

                <button type="button" onClick={close}>
                  Done for now
                </button>
              </div>
            </>
          )}
        </div>

        {stage === "select" && (
          <footer className={styles.footer}>
            <button type="button" className={styles.secondary} onClick={close}>
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
