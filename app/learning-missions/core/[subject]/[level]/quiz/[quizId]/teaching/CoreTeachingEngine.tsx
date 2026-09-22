"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
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
  question,
  response,
  feedback,
}: {
  subject: CoreSubject;
  quizId?: string;
  attemptId?: string;
  question: QuizQuestion;
  response?: JsonObject;
  feedback?: ImmediateFeedback;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [teachMeOpen, setTeachMeOpen] = useState(false);
  const [teachingViewed, setTeachingViewed] = useState(false);

  useEffect(() => {
    setHintOpen(false);
    setLessonOpen(false);
    setTeachMeOpen(false);
    setTeachingViewed(false);
  }, [question.id]);

  const teaching = useMemo(
    () => readTeachingConfig(question.content),
    [question.content],
  );

  const hint = normaliseTeachingText(teaching?.hint);
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
      metadata: { teaching_version: Number(teaching?.version || 1) },
    });
  }, [attemptId, feedback, misconception, question.id, quizId, subject, teaching?.version]);

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
        teaching_version: Number(teaching?.version || 1),
        ...(extra.metadata || {}),
      },
    });
  }

  function toggleHint() {
    const next = !hintOpen;
    setHintOpen(next);
    if (next) record("hint_opened");
  }

  // Before the learner checks an answer, expose only authored hints. Hints are
  // intentionally authored rather than generated from explanations so they do
  // not accidentally reveal the answer.
  if (!feedback) {
    if (!hint) return null;

    return (
      <CoreTeachingHint
        subject={subject}
        questionText={question.prompt}
        hint={hint}
        open={hintOpen}
        onToggle={toggleHint}
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

      {lessonOpen && detailLesson &&
        renderLesson(
          detailLesson,
          subject === "math" ? "Method" : "Why this works",
        )}

      {teachMeOpen && teachMeLesson &&
        renderLesson(teachMeLesson, "Teach Me")}

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
