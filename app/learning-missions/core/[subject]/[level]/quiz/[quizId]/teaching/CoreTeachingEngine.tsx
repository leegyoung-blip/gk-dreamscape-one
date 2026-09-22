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
import CoreTeachingSummary from "./CoreTeachingSummary";
import EnglishTeachingRenderer from "./english/EnglishTeachingRenderer";
import MathTeachingRenderer from "./math/MathTeachingRenderer";
import {
  normaliseTeachingLesson,
  normaliseTeachingText,
  readTeachingConfig,
  resolveAuthoredMisconception,
  sameTeachingText,
} from "./TeachingUtils";
import type { NormalisedTeachingLesson } from "./TeachingTypes";
import styles from "./CoreTeachingEngine.module.css";

export default function CoreTeachingEngine({
  subject,
  question,
  response,
  feedback,
}: {
  subject: CoreSubject;
  question: QuizQuestion;
  response?: JsonObject;
  feedback?: ImmediateFeedback;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [teachMeOpen, setTeachMeOpen] = useState(false);

  useEffect(() => {
    setHintOpen(false);
    setLessonOpen(false);
    setTeachMeOpen(false);
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

  // Before the learner checks an answer, expose only authored hints. Phase 2
  // can additionally highlight explicitly authored English clue words, but it
  // still never derives a hint from the answer/explanation.
  if (!feedback) {
    if (!hint) return null;

    return (
      <CoreTeachingHint
        subject={subject}
        questionText={question.prompt}
        hint={hint}
        open={hintOpen}
        onToggle={() => setHintOpen((current) => !current)}
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

  const correct = feedback.is_correct === true;

  // Phase 3 activates authored answer-specific misconceptions for both English
  // and Math choice questions. There is deliberately no inference from an
  // arbitrary wrong answer: a diagnosis appears only when the chosen option id
  // has an explicit entry in teaching.misconceptions. Free-text Math responses
  // do not produce a misconception unless a later deterministic rule is added.
  const misconception = !correct
    ? resolveAuthoredMisconception(question, response, teaching)
    : null;

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
    setLessonOpen((current) => !current);
    setTeachMeOpen(false);
  }

  function openTeachMe() {
    setTeachMeOpen((current) => !current);
    setLessonOpen(false);
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
    </section>
  );
}
