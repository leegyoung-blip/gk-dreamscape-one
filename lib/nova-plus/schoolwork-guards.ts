/**
 * NOVA+ schoolwork server guards (Phase 2B-3B1).
 *
 * Pure helpers shared by the schoolwork API routes. No imports, no I/O, so
 * every rule here is directly unit-testable with synthetic data.
 *
 * Trust model: upload rows are inserted by the browser. RLS only checks the
 * uploader and learner, never storage_bucket / storage_path, so those columns
 * are untrusted until they match the canonical key the uploader writes:
 *   nova-schoolwork / <student_user_id>/<upload_id>/<sanitised basename>
 */

export const SCHOOLWORK_BUCKET = "nova-schoolwork";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Output charset of the uploader's sanitiseFilename(): [A-Za-z0-9_.-]
// (\w without the u flag is ASCII-only). No length cap beyond the storage
// key limit: long original filenames are legitimate.
const BASENAME_RE = /^[A-Za-z0-9_.-]+$/;
const MAX_OBJECT_KEY_LENGTH = 1024;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * True only when the stored object location is the canonical private key for
 * this exact upload and learner. Anything else fails closed: the caller must
 * not sign, download, send to a model, or delete the object.
 */
export function isCanonicalSchoolworkObject(params: {
  bucket: unknown;
  path: unknown;
  studentUserId: unknown;
  uploadId: unknown;
}) {
  const { bucket, path, studentUserId, uploadId } = params;

  if (bucket !== SCHOOLWORK_BUCKET) return false;
  if (typeof path !== "string" || path.length > MAX_OBJECT_KEY_LENGTH) {
    return false;
  }
  if (!isUuid(studentUserId) || !isUuid(uploadId)) return false;

  const segments = path.split("/");
  if (segments.length !== 3) return false;

  const [learnerSegment, uploadSegment, basename] = segments;

  // Exact (case-sensitive) match against the row's own identifiers.
  if (learnerSegment !== studentUserId) return false;
  if (uploadSegment !== uploadId) return false;

  if (!BASENAME_RE.test(basename)) return false;
  // "/" cannot occur inside a segment, so only a bare "." or ".." can act as
  // a path step; names such as "Report..final.pdf" are legitimate.
  if (basename === "." || basename === "..") return false;

  return true;
}

/**
 * Filename sent to the AI provider. The learner's original filename can
 * contain names, schools or other personal details, so it is never forwarded;
 * it stays only in the private upload row for the history display.
 */
export function neutralAiFilename(mimeType: unknown) {
  if (mimeType === "application/pdf") return "schoolwork.pdf";
  if (mimeType === "image/png") return "schoolwork.png";
  if (mimeType === "image/jpeg") return "schoolwork.jpg";
  return "schoolwork";
}

/** Upload statuses from which a new analysis may start. */
export const ANALYSABLE_STATUSES = [
  "uploaded",
  "needs_input",
  "review_ready",
  "failed",
] as const;

/** An `analysing` claim older than this is treated as abandoned. */
export const STALE_ANALYSIS_MS = 15 * 60 * 1000;

export type AnalysisStartDecision =
  | { ok: true; reclaimStale: boolean }
  | { ok: false; code: "UPLOAD_LOCKED" | "ANALYSIS_IN_PROGRESS" };

/**
 * Approved / archived uploads hold reviewed evidence and are never
 * re-analysed (re-analysis deletes and re-inserts items). A running analysis
 * blocks a second one until it is stale.
 */
export function analysisStartDecision(params: {
  status: unknown;
  analysisStartedAt: unknown;
  nowMs: number;
}): AnalysisStartDecision {
  const status = String(params.status || "");

  if ((ANALYSABLE_STATUSES as readonly string[]).includes(status)) {
    return { ok: true, reclaimStale: false };
  }

  if (status === "analysing") {
    const startedMs = new Date(String(params.analysisStartedAt || "")).getTime();

    if (
      Number.isFinite(startedMs) &&
      params.nowMs - startedMs > STALE_ANALYSIS_MS
    ) {
      return { ok: true, reclaimStale: true };
    }

    return { ok: false, code: "ANALYSIS_IN_PROGRESS" };
  }

  return { ok: false, code: "UPLOAD_LOCKED" };
}

export type HintConflict = {
  subject: { hint: string; detected: string } | null;
  level: { hint: number; detected: number } | null;
};

/**
 * A conflict exists only when the uploader gave a hint AND the extraction
 * confidently detected a different value. "uncertain" / out-of-range
 * detections are not contradictions (the hint fills the gap as before).
 */
export function detectHintConflict(params: {
  subjectHint: unknown;
  levelHint: unknown;
  detectedSubject: unknown;
  detectedLevel: unknown;
}): HintConflict | null {
  const subjectHint = String(params.subjectHint || "");
  const detectedSubject = String(params.detectedSubject || "");
  const levelHint = Number(params.levelHint);
  const detectedLevel = Number(params.detectedLevel);

  const validSubject = (value: string) =>
    value === "english" || value === "math";
  const validLevel = (value: number) =>
    Number.isInteger(value) && value >= 1 && value <= 6;

  const subject =
    validSubject(subjectHint) &&
    validSubject(detectedSubject) &&
    subjectHint !== detectedSubject
      ? { hint: subjectHint, detected: detectedSubject }
      : null;

  const level =
    validLevel(levelHint) &&
    validLevel(detectedLevel) &&
    levelHint !== detectedLevel
      ? { hint: levelHint, detected: detectedLevel }
      : null;

  return subject || level ? { subject, level } : null;
}

const SUBJECT_LABEL: Record<string, string> = {
  english: "English",
  math: "Mathematics",
};

export function hintConflictMessage(conflict: HintConflict) {
  const parts: string[] = [];

  if (conflict.subject) {
    parts.push(
      `you chose ${SUBJECT_LABEL[conflict.subject.hint]}, but the worksheet looks like ${SUBJECT_LABEL[conflict.subject.detected]}`,
    );
  }

  if (conflict.level) {
    parts.push(
      `you chose Primary ${conflict.level.hint}, but the worksheet looks like Primary ${conflict.level.detected}`,
    );
  }

  return (
    `Please confirm the curriculum scope: ${parts.join("; ")}. ` +
    "Choose the correct subject and Primary level, then continue analysis."
  );
}

export type CommitDecision = {
  item_index: number;
  decision: "include" | "exclude";
  skill_code: string;
  correctness: "correct" | "incorrect" | "partial" | "uncertain";
  mapping_edited: boolean;
  correctness_edited: boolean;
};

export type DecisionValidation =
  | { ok: true }
  | {
      ok: false;
      code:
        | "DECISIONS_DUPLICATE"
        | "DECISIONS_INCOMPLETE"
        | "DECISIONS_UNKNOWN_ITEM"
        | "DECISION_SKILL_REQUIRED"
        | "DECISION_CORRECTNESS_REQUIRED";
    };

/**
 * Server-side completeness check before the commit RPC: exactly one decision
 * per stored item, none for unknown items, and included items need a concept
 * and a definite correctness.
 */
export function validateCommitDecisions(
  decisions: CommitDecision[],
  storedItemIndexes: number[],
): DecisionValidation {
  const stored = new Set(storedItemIndexes.map(Number));
  const seen = new Set<number>();

  for (const decision of decisions) {
    if (seen.has(decision.item_index)) {
      return { ok: false, code: "DECISIONS_DUPLICATE" };
    }
    seen.add(decision.item_index);

    if (!stored.has(decision.item_index)) {
      return { ok: false, code: "DECISIONS_UNKNOWN_ITEM" };
    }

    if (decision.decision === "include") {
      if (!decision.skill_code.trim()) {
        return { ok: false, code: "DECISION_SKILL_REQUIRED" };
      }

      if (decision.correctness === "uncertain") {
        return { ok: false, code: "DECISION_CORRECTNESS_REQUIRED" };
      }
    }
  }

  if (seen.size !== stored.size) {
    return { ok: false, code: "DECISIONS_INCOMPLETE" };
  }

  return { ok: true };
}

const PUBLIC_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in again.",
  UPLOAD_NOT_FOUND: "Schoolwork upload not found.",
  STORAGE_OBJECT_INVALID:
    "This upload's file could not be verified. Please upload the schoolwork again.",
  UPLOAD_LOCKED:
    "This schoolwork has already been reviewed or archived, so it cannot be analysed again.",
  ANALYSIS_IN_PROGRESS:
    "This schoolwork is already being analysed. Please wait for it to finish.",
  ANALYSIS_SUPERSEDED:
    "This analysis was replaced by a newer one. Please reopen the upload.",
  ANALYSIS_NOT_COMMITTABLE:
    "This analysis did not complete, so it cannot be added. Archive it and upload the schoolwork again.",
  QUESTION_LIMIT_EXCEEDED:
    "This upload has more questions than Nova can review at once. Please split it into smaller uploads.",
  DECISIONS_DUPLICATE:
    "The review contains duplicate decisions. Please reopen the review and try again.",
  DECISIONS_INCOMPLETE:
    "Every question needs a decision before the review can be saved. Please reopen the review.",
  DECISIONS_UNKNOWN_ITEM:
    "The review no longer matches this analysis. Please reopen the review.",
  DECISION_SKILL_REQUIRED:
    "Every included question needs a concept before it can be added.",
  DECISION_CORRECTNESS_REQUIRED:
    "Every included question needs a correct, partial or incorrect result before it can be added.",
  DECISION_SKILL_INVALID:
    "One of the chosen concepts is not available for this subject and level.",
  COMMIT_REJECTED:
    "The reviewed schoolwork could not be added to the learner profile. Please reopen the review and try again.",
  COMMIT_FAILED:
    "The reviewed schoolwork could not be added to the learner profile. Please try again.",
  ANALYSIS_FAILED: "The worksheet analysis could not be completed. Please retry.",
  MANAGE_FAILED: "This schoolwork action could not be completed. Please try again.",
  REQUEST_FAILED: "The request could not be completed. Please try again.",
};

/** Fixed, user-safe copy. Never echoes database, storage or model text. */
export function publicSchoolworkError(code: string) {
  return PUBLIC_MESSAGES[code] ?? PUBLIC_MESSAGES.REQUEST_FAILED;
}

export type MasteryRefreshStatus = "refreshed" | "pending" | "not_needed";

export function masteryRefreshStatus(params: {
  affectedSkillCount: number;
  refreshed: boolean;
}): MasteryRefreshStatus {
  if (params.affectedSkillCount <= 0) return "not_needed";
  return params.refreshed ? "refreshed" : "pending";
}
