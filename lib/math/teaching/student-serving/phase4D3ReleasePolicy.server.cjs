"use strict";

/**
 * Phase 4C-4D-3 — narrow, fail-closed policy for answer-revealing student
 * teaching. This does NOT authenticate a user or query the database. A future
 * server route must derive EVERY fact from an authenticated, authorized,
 * server-side source, never client JSON, checkpoint, or caller-provided props.
 *
 * This module is deliberately not connected to live student routes yet.
 */
const RELEASE_POLICY_VERSION = "4C-4D-3.RELEASE.1";
const issuedPermits = new WeakSet();
const BLOCK = Object.freeze({
  NOT_VERIFIED: "NOT_VERIFIED",
  WRONG_SUBJECT: "WRONG_SUBJECT",
  IDENTITY_NOT_VERIFIED: "IDENTITY_NOT_VERIFIED",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  NOT_PUBLISHED: "NOT_PUBLISHED",
  MANUAL_REVIEW_PENDING: "MANUAL_REVIEW_PENDING",
  FEEDBACK_DISABLED: "FEEDBACK_DISABLED",
  INVALID_FEEDBACK_MODE: "INVALID_FEEDBACK_MODE",
  RESPONSE_NOT_LOCKED: "RESPONSE_NOT_LOCKED",
  SUBMISSION_NOT_CONFIRMED: "SUBMISSION_NOT_CONFIRMED",
  FEEDBACK_NOT_RELEASED: "FEEDBACK_NOT_RELEASED",
});

function blocked(reason) {
  return Object.freeze({ allowed: false, reason, policyVersion: RELEASE_POLICY_VERSION });
}
function allowed() {
  const permit = Object.freeze({ allowed: true, reason: null, policyVersion: RELEASE_POLICY_VERSION });
  issuedPermits.add(permit);
  return permit;
}

/**
 * @param {unknown} facts - verified DB/auth facts assembled by a trusted server.
 *   authenticated, attemptOwnedByUser, learningAccessAllowed, questionInAttempt,
 *   quizMatchesAttempt, subject, published, manualReviewPending,
 *   feedbackMode, attemptStatus, answerLocked, feedbackReleaseConfirmed.
 * @returns {{allowed:boolean, reason:string|null, policyVersion:string}}
 */
function decideStudentTeachingRelease(facts) {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    return blocked(BLOCK.NOT_VERIFIED);
  }
  // A value supplied by a browser is never adequate proof. The route must
  // collect and validate these booleans against trusted server-side records.
  if (facts.authenticated !== true || facts.attemptOwnedByUser !== true ||
      facts.learningAccessAllowed !== true) {
    return blocked(BLOCK.NOT_AUTHORIZED);
  }
  if (facts.subject !== "math") return blocked(BLOCK.WRONG_SUBJECT);
  if (facts.questionInAttempt !== true || facts.quizMatchesAttempt !== true) {
    return blocked(BLOCK.IDENTITY_NOT_VERIFIED);
  }
  if (facts.published !== true) return blocked(BLOCK.NOT_PUBLISHED);
  if (facts.manualReviewPending !== false) return blocked(BLOCK.MANUAL_REVIEW_PENDING);
  if (facts.feedbackMode === "none") return blocked(BLOCK.FEEDBACK_DISABLED);
  if (facts.feedbackMode !== "immediate" && facts.feedbackMode !== "end_of_quiz") {
    return blocked(BLOCK.INVALID_FEEDBACK_MODE);
  }
  if (facts.feedbackMode === "immediate") {
    // A completed attempt also requires authenticated question-level feedback
    // release; a mere client 'locked' or 'results' state is not enough.
    const attemptFinished = facts.attemptStatus === "submitted" || facts.attemptStatus === "marked";
    if (!attemptFinished && facts.answerLocked !== true) {
      return blocked(BLOCK.RESPONSE_NOT_LOCKED);
    }
    if (facts.feedbackReleaseConfirmed !== true) return blocked(BLOCK.FEEDBACK_NOT_RELEASED);
    return allowed();
  }
  if (facts.attemptStatus !== "submitted" && facts.attemptStatus !== "marked") {
    return blocked(BLOCK.SUBMISSION_NOT_CONFIRMED);
  }
  if (facts.feedbackReleaseConfirmed !== true) return blocked(BLOCK.FEEDBACK_NOT_RELEASED);
  return allowed();
}

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const SAFE_CONFIDENCE = new Set(["low", "medium", "high"]);

/**
 * Only public, bounded method metadata; never returns answer keys, raw
 * question contracts, scoring evidence, reviewer signatures, or lesson steps.
 * This is a METHOD SUMMARY, not a teaching explanation generator.
 *
 * @param {unknown} permit - from decideStudentTeachingRelease, server side.
 * @param {unknown} selection - validated server-side 4C result.
 */
function publicMethodSummary(permit, selection) {
  if (!permit || typeof permit !== "object" || !issuedPermits.has(permit)) {
    return Object.freeze({ status: "unavailable" });
  }
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return Object.freeze({ status: "unavailable" });
  }
  if (selection.status === "ambiguous") return Object.freeze({ status: "ambiguous" });
  if (selection.status !== "selected") return Object.freeze({ status: "unavailable" });
  // Exact 4C-4 adapter shape; never accept browser-supplied aliases.
  if (!selection.selection || selection.selection.status !== "selected" ||
      !Array.isArray(selection.primaryFamilies) || selection.primaryFamilies.length !== 1) {
    return Object.freeze({ status: "unavailable" });
  }
  const methodId = selection.selection.primaryMethodId;
  const familyId = selection.primaryFamilies[0];
  if (typeof methodId !== "string" || !ID.test(methodId) ||
      typeof familyId !== "string" || !ID.test(familyId)) {
    return Object.freeze({ status: "unavailable" });
  }
  const result = { status: "selected", methodId, familyId };
  if (SAFE_CONFIDENCE.has(selection.selection.confidence)) result.confidence = selection.selection.confidence;
  return Object.freeze(result);
}

module.exports = Object.freeze({
  RELEASE_POLICY_VERSION, BLOCK, decideStudentTeachingRelease, publicMethodSummary,
});
