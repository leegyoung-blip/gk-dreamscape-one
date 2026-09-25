"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  CoreSubject,
  ImmediateFeedback,
  JsonObject,
  QuizQuestion,
} from "../CoreQuizTypes";
import { friendlyCorrectResponse } from "../CoreQuizUtils";
import CoreTeachingHint from "./CoreTeachingHint";
import CoreTeachingLesson from "./CoreTeachingLesson";
import CoreTeachingQuickCheck from "./CoreTeachingQuickCheck";
import CoreTeachingSummary from "./CoreTeachingSummary";
import EnglishTeachingRenderer from "./english/EnglishTeachingRenderer";
import MathTeachingRenderer from "./math/MathTeachingRenderer";
import { recordTeachingEvent } from "./TeachingEvents";
import { buildTeachingEvidenceMetadata } from "./TeachingEvidenceMetadata";
import {
  normaliseTeachingHints,
  normaliseTeachingLesson,
  normaliseTeachingQuickCheck,
  normaliseTeachingText,
  readTeachingConfig,
  resolveAuthoredMisconception,
  sameTeachingText,
} from "./TeachingUtils";
import type { NormalisedTeachingLesson } from "./TeachingTypes";
import styles from "./CoreTeachingEngine.module.css";

export default function CoreTeachingEngine({
  subject,
  quizId,
  attemptId,
  primaryLevel,
  topicId,
  topicTitle,
  question,
  response,
  feedback,
}: {
  subject: CoreSubject;
  quizId?: string;
  attemptId?: string;
  primaryLevel?: number;
  topicId?: string;
  topicTitle?: string;
  question: QuizQuestion;
  response?: JsonObject;
  feedback?: ImmediateFeedback;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [teachMeOpen, setTeachMeOpen] = useState(false);
  const [teachingViewed, setTeachingViewed] = useState(false);

  useEffect(() => {
    setHintOpen(false);
    setRevealedHintCount(0);
    setLessonOpen(false);
    setTeachMeOpen(false);
    setTeachingViewed(false);
  }, [question.id]);

  const teaching = useMemo(
    () => readTeachingConfig(question.content),
    [question.content],
  );

  const evidenceMetadata = useMemo(
    () =>
      buildTeachingEvidenceMetadata({
        question,
        primaryLevel,
        topicId,
        topicTitle,
        teachingVersion: Number(teaching?.version || 1),
      }),
    [primaryLevel, question, teaching?.version, topicId, topicTitle],
  );

  const hints = useMemo(() => normaliseTeachingHints(teaching), [teaching]);
  const correctSummary = normaliseTeachingText(teaching?.correct);
  const incorrectSummary = normaliseTeachingText(teaching?.incorrect);
  const authoredLesson = normaliseTeachingLesson(teaching?.lesson);
  const teachMeLesson = normaliseTeachingLesson(teaching?.teach_me);
  const quickCheck = normaliseTeachingQuickCheck(teaching?.quick_check);

  const feedbackCorrect = feedback?.is_correct === true;
  const misconception =
    feedback && !feedback.pending_manual_review && !feedbackCorrect
      ? resolveAuthoredMisconception(question, response, teaching)
      : null;

  useEffect(() => {
    if (!misconception || !feedback || !quizId || !attemptId) return;

    recordTeachingEvent({
      subject,
      quizId,
      attemptId,
      questionId: question.id,
      eventType: "misconception_shown",
      eventKey: misconception.code || "authored",
      misconceptionCode: misconception.code,
      metadata: evidenceMetadata,
    });
  }, [
    attemptId,
    evidenceMetadata,
    feedback,
    misconception,
    question.id,
    quizId,
    subject,
  ]);

  function record(
    eventType:
      | "hint_opened"
      | "lesson_opened"
      | "teach_me_opened"
      | "quick_check_answered",
    extra: {
      eventKey?: string | null;
      lessonType?: string | null;
      quickCheckCorrect?: boolean | null;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    if (!quizId || !attemptId) return;

    recordTeachingEvent({
      subject,
      quizId,
      attemptId,
      questionId: question.id,
      eventType,
      eventKey: extra.eventKey,
      lessonType: extra.lessonType,
      quickCheckCorrect: extra.quickCheckCorrect,
      metadata: {
        ...evidenceMetadata,
        ...(extra.metadata || {}),
      },
    });
  }

  function toggleHint() {
    const nextOpen = !hintOpen;
    setHintOpen(nextOpen);

    if (!nextOpen) return;

    if (revealedHintCount === 0) {
      setRevealedHintCount(1);
      record("hint_opened", {
        eventKey: "hint_1",
        metadata: {
          hint_index: 1,
          hint_total: hints.length,
        },
      });
      return;
    }

    record("hint_opened", {
      eventKey: `hint_${revealedHintCount}`,
      metadata: {
        hint_index: revealedHintCount,
        hint_total: hints.length,
        reopened: true,
      },
    });
  }

  function revealNextHint() {
    if (hints.length === 0) return;

    const nextCount = Math.min(
      hints.length,
      Math.max(1, revealedHintCount) + 1,
    );

    if (nextCount === revealedHintCount) return;

    setRevealedHintCount(nextCount);
    setHintOpen(true);

    record("hint_opened", {
      eventKey: `hint_${nextCount}`,
      metadata: {
        hint_index: nextCount,
        hint_total: hints.length,
      },
    });
  }

  // Before the learner checks an answer, expose only authored hints.
  // Teaching V2 supports up to three progressive hints while keeping
  // the legacy single teaching.hint field backward-compatible.
  if (!feedback) {
    if (hints.length === 0) return null;

    return (
      <CoreTeachingHint
        subject={subject}
        questionText={question.prompt}
        hints={hints}
        revealedCount={revealedHintCount}
        open={hintOpen}
        onToggle={toggleHint}
        onRevealNext={revealNextHint}
      />
    );
  }

  if (feedback.pending_manual_review) {
    return (
      <section className={styles.engine} data-teaching-state="pending">
        <CoreTeachingSummary
          state="pending"
          title="Saved for teacher review"
          text="Your response has been recorded and will be reviewed."
        />
      </section>
    );
  }

  const correct = feedbackCorrect;
  const authoredSummary = correct
    ? correctSummary
    : misconception || incorrectSummary;
  const legacyExplanation = String(feedback.explanation ?? "").trim() || null;
  const summaryText = authoredSummary?.text || legacyExplanation;

  const legacyDetail =
    authoredSummary &&
    legacyExplanation &&
    !sameTeachingText(authoredSummary.text, legacyExplanation)
      ? normaliseTeachingLesson(legacyExplanation)
      : null;

  const detailLesson = misconception?.lesson || authoredLesson || legacyDetail;
  const correctAnswer =
    !correct && feedback.correct_response
      ? friendlyCorrectResponse(feedback.correct_response)
      : null;

  const detailLabel = subject === "math" ? "Show Working" : "Why?";

  function openDetail() {
    const next = !lessonOpen;
    setLessonOpen(next);
    setTeachMeOpen(false);

    if (next && detailLesson) {
      setTeachingViewed(true);
      record("lesson_opened", {
        lessonType: detailLesson.type,
        eventKey: detailLesson.type,
      });
    }
  }

  function openTeachMe() {
    const next = !teachMeOpen;
    setTeachMeOpen(next);
    setLessonOpen(false);

    if (next && teachMeLesson) {
      setTeachingViewed(true);
      record("teach_me_opened", {
        lessonType: teachMeLesson.type,
        eventKey: teachMeLesson.type,
      });
    }
  }

  function renderLesson(lesson: NormalisedTeachingLesson, label: string) {
    if (subject === "english") {
      return (
        <EnglishTeachingRenderer
          question={question}
          lesson={lesson}
          label={label}
        />
      );
    }

    if (subject === "math") {
      return (
        <MathTeachingRenderer
          question={question}
          lesson={lesson}
          label={label}
        />
      );
    }

    return <CoreTeachingLesson lesson={lesson} label={label} />;
  }

  const quickCheckReady =
    Boolean(quickCheck) &&
    (teachingViewed || (!detailLesson && !teachMeLesson));

  const teachingModalOpen =
    (lessonOpen && Boolean(detailLesson)) ||
    (teachMeOpen && Boolean(teachMeLesson));

  useEffect(() => {
    if (!teachingModalOpen || typeof document === "undefined") return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [teachingModalOpen]);

  const modalLesson = lessonOpen
    ? detailLesson
    : teachMeOpen
      ? teachMeLesson
      : null;

  const modalLabel = lessonOpen
    ? subject === "math"
      ? "Method"
      : "Why this works"
    : "Teach Me";

  function closeTeachingModal() {
    setLessonOpen(false);
    setTeachMeOpen(false);
  }

  return (
    <section
      className={styles.engine}
      data-teaching-state={correct ? "correct" : "wrong"}
      data-teaching-subject={subject}
      data-misconception-code={misconception?.code || undefined}
    >
      <CoreTeachingSummary
        state={correct ? "correct" : "wrong"}
        title={correct ? "Correct!" : "Not quite."}
        text={summaryText}
        correctAnswer={correctAnswer}
      />

      {(detailLesson || teachMeLesson) && (
        <div className={styles.actionRow}>
          {detailLesson && (
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={openDetail}
              aria-expanded={lessonOpen}
            >
              <span>{detailLabel}</span>
              <span aria-hidden="true">{lessonOpen ? "−" : "+"}</span>
            </button>
          )}

          {teachMeLesson && (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={openTeachMe}
              aria-expanded={teachMeOpen}
            >
              <span>Teach Me</span>
              <span aria-hidden="true">{teachMeOpen ? "−" : "+"}</span>
            </button>
          )}
        </div>
      )}

      {teachingModalOpen && modalLesson && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTeachingModal();
          }}
          style={teachingModalBackdrop}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={modalLabel}
            style={teachingModalPanel}
          >
            <div style={teachingModalHeader}>
              <div>
                <p style={teachingModalEyebrow}>Nova explains</p>
                <h2 style={teachingModalTitle}>{modalLabel}</h2>
              </div>

              <button
                type="button"
                onClick={closeTeachingModal}
                aria-label="Close teaching explanation"
                style={teachingModalClose}
              >
                ×
              </button>
            </div>

            <div style={teachingModalBody}>
              {renderLesson(modalLesson, modalLabel)}
            </div>
          </section>
        </div>
      )}

      {quickCheckReady && quickCheck && (
        <CoreTeachingQuickCheck
          subject={subject}
          quickCheck={quickCheck}
          questionId={question.id}
          onAnswered={({ correct: quickCheckCorrect }) =>
            record("quick_check_answered", {
              eventKey: quickCheck.type,
              quickCheckCorrect,
              metadata: { quick_check_type: quickCheck.type },
            })
          }
        />
      )}
    </section>
  );
}

const teachingModalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 140,
  background: "rgba(2, 8, 19, 0.72)",
  backdropFilter: "blur(6px)",
  display: "grid",
  placeItems: "center",
  padding: "clamp(10px, 2vw, 24px)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const teachingModalPanel: React.CSSProperties = {
  width: "min(1120px, 96vw)",
  height: "min(760px, calc(100dvh - 120px))",
  maxHeight: "calc(100dvh - 120px)",
  minHeight: 0,
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.24)",
  background:
    "linear-gradient(180deg, rgba(8,27,51,0.995), rgba(5,18,42,0.995))",
  boxShadow: "0 30px 90px rgba(0,0,0,0.52)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const teachingModalHeader: React.CSSProperties = {
  flex: "0 0 auto",
  minHeight: "70px",
  padding: "14px 16px 12px 18px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  background:
    "linear-gradient(90deg, rgba(83,215,255,0.08), rgba(168,85,247,0.06))",
};

const teachingModalEyebrow: React.CSSProperties = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "10px",
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const teachingModalTitle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "white",
  fontSize: "clamp(20px, 2.2vw, 28px)",
  lineHeight: 1.1,
  letterSpacing: "-0.025em",
};

const teachingModalClose: React.CSSProperties = {
  flex: "0 0 auto",
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.13)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontSize: "26px",
  lineHeight: 1,
  fontWeight: 500,
};

const teachingModalBody: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "14px",
  boxSizing: "border-box",
  scrollbarGutter: "stable",
};

