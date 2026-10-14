"use strict";

/**
 * Phase 4C-4D-4 — Node/server-only composition of trusted 4A -> 4C -> B4 -> 4D3.
 * This module DOES NOT publish an HTTP handler or access Supabase by itself.
 * Its `resolveTrustedContext` callback MUST authenticate the current request and
 * fetch current, server-verified authorization + quiz records, never client state.
 * No browser-supplied method, contract, evidence, scoring, mode, or results accepted.
 * B4 intentionally forced disabled. No learner-facing teaching steps are returned.
 */
const { selectWithB4Approval } = require('../strategy-selection/approval/b4ApprovalGateway.server.cjs');
const { decideStudentTeachingRelease, publicMethodSummary } = require('./phase4D3ReleasePolicy.server.cjs');
const VERSION = '4C-4D-4.METHOD-SERVICE.1';
const INVALID = Object.freeze({ status: 'unavailable' });
const REQUEST_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const id = v => typeof v === 'string' && REQUEST_ID.test(v);
const sameId = (v, expected) => id(v) && v === expected;

function queryFromRequest(request) {
  if (!isRecord(request)) return null;
  // No other fields are ever forwarded to the trusted resolver.
  const { quizId, attemptId, questionId } = request;
  return id(quizId) && id(attemptId) && id(questionId)
    ? Object.freeze({quizId, attemptId, questionId}) : null;
}
function factsFromTrustedContext(ctx, query) {
  if (!isRecord(ctx) || !isRecord(ctx.principal) || !isRecord(ctx.attempt) ||
      !isRecord(ctx.quiz) || !isRecord(ctx.question) || !isRecord(ctx.grading)) return null;
  const {principal, attempt, quiz, question, grading} = ctx;
  if (!id(principal.userId) || principal.authenticated !== true ||
      principal.learningAccessAllowed !== true || !sameId(attempt.ownerUserId, principal.userId) ||
      !sameId(attempt.id,query.attemptId) || !sameId(attempt.quizId,query.quizId) ||
      !sameId(quiz.id,query.quizId) || !sameId(question.id,query.questionId) ||
      !sameId(question.quizId,query.quizId) ||
      !sameId(grading.attemptId,query.attemptId) ||
      !sameId(grading.questionId,query.questionId)) return null;
  return {
    authenticated: true, attemptOwnedByUser: true, learningAccessAllowed: true,
    questionInAttempt: true, quizMatchesAttempt: true,
    subject: quiz.subject, published: quiz.published,
    manualReviewPending: grading.manualReviewPending,
    feedbackMode: quiz.feedbackMode, attemptStatus: attempt.status,
    answerLocked: grading.answerLocked,
    feedbackReleaseConfirmed: grading.feedbackReleaseConfirmed,
  };
}

/**
 * @param {object} config Server-side ONLY. Not an HTTP request object.
 * @param {(ids:{quizId:string,attemptId:string,questionId:string})=>Promise<object>} config.resolveTrustedContext
 * @param {(contractBuildResult:object)=>object|null} config.makeConsumerEnvelopes
 * @param {(input:object)=>object} config.selectFromPhase4A4B
 */
function createPhase4D4MethodService(config) {
  if (!isRecord(config) || typeof config.resolveTrustedContext !== 'function' ||
      typeof config.makeConsumerEnvelopes !== 'function' ||
      typeof config.selectFromPhase4A4B !== 'function') {
    throw new Error('4D4_SERVER_DEPENDENCIES_REQUIRED');
  }
  return Object.freeze({
    version: VERSION,
    /** Return only public metadata. Exceptions, auth errors and ambiguity do not reveal details. */
    async getPublicMethod(request) {
      const query = queryFromRequest(request);
      if (!query) return INVALID;
      try {
        const ctx = await config.resolveTrustedContext(query);
        const facts = factsFromTrustedContext(ctx,query);
        if (!facts) return INVALID;
        const permit = decideStudentTeachingRelease(facts);
        if (!permit.allowed) return INVALID;
        const build = ctx.contractBuildResult;
        if (!isRecord(build) || build.status !== 'ready' || build.questionId !== query.questionId) return INVALID;
        // Check source contract's quiz binding when provided by the 4A canonical layer.
        const boundQuiz = build.contract?.identity?.quizId;
        if (boundQuiz != null && boundQuiz !== query.quizId) return INVALID;
        const source = config.makeConsumerEnvelopes(build);
        if (!isRecord(source) || !isRecord(source.methodLibraryEnvelope) ||
            !isRecord(source.strategyEnvelope) ||
            source.methodLibraryEnvelope.questionId !== query.questionId ||
            source.strategyEnvelope.questionId !== query.questionId) return INVALID;
        // Reconstruct only the two allowlisted fields. Discard any unchecked evidence.
        const cleanSource = {
          methodLibraryEnvelope:source.methodLibraryEnvelope,
          strategyEnvelope:source.strategyEnvelope,
        };
        const gateway = selectWithB4Approval({
          source: cleanSource,
          selectFromPhase4A4B: config.selectFromPhase4A4B,
          config: {mode:'disabled'},
          approvalPackage: null,
        });
        if(gateway.status !== 'baseline' || gateway.trace?.mode !== 'disabled') return INVALID;
        return publicMethodSummary(permit, gateway.result);
      } catch {
        return INVALID;
      }
    },
  });
}
module.exports = Object.freeze({VERSION,createPhase4D4MethodService});
