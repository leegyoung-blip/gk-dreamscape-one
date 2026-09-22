"use client";

import type { QuizQuestion } from "../../CoreQuizTypes";
import EnglishTeachingRenderer from "../english/EnglishTeachingRenderer";
import CoreTeachingQuickCheck from "../CoreTeachingQuickCheck";
import MathTeachingRenderer from "../math/MathTeachingRenderer";
import { normaliseTeachingLesson, normaliseTeachingQuickCheck, normaliseTeachingText } from "../TeachingUtils";
import styles from "./TeachingAuthoring.module.css";
import type { TeachingAuthoringSubject, TeachingDraft } from "./TeachingAuthoringTypes";
import { isRecord } from "./TeachingAuthoringUtils";

export default function TeachingPreview({
  subject,
  prompt,
  teaching,
}: {
  subject: TeachingAuthoringSubject;
  prompt: string;
  teaching: TeachingDraft;
}) {
  const question = {
    id: "teaching-preview",
    question_order: 1,
    question_type: "multiple_choice",
    instruction: null,
    prompt,
    content: {},
    skill: null,
    difficulty: 1,
    marks: 1,
    requires_manual_marking: false,
    stimulus: null,
    assets: [],
  } as QuizQuestion;

  const hint = normaliseTeachingText(teaching.hint);
  const correct = normaliseTeachingText(teaching.correct);
  const incorrect = normaliseTeachingText(teaching.incorrect);
  const lesson = normaliseTeachingLesson(teaching.lesson);
  const teachMe = normaliseTeachingLesson(teaching.teach_me);
  const quickCheck = normaliseTeachingQuickCheck(teaching.quick_check as any);
  const misconceptions = isRecord(teaching.misconceptions) ? teaching.misconceptions : {};

  function renderLesson(raw: ReturnType<typeof normaliseTeachingLesson>, label: string) {
    if (!raw) return null;
    return subject === "english" ? (
      <EnglishTeachingRenderer question={question} lesson={raw} label={label} />
    ) : (
      <MathTeachingRenderer question={question} lesson={raw} label={label} />
    );
  }

  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewHeader}>
        <strong>Learner teaching preview</strong>
        <span>Unsaved draft</span>
      </div>

      <div className={styles.previewSummaryGrid}>
        <div><span>Hint</span><p>{hint?.text || "—"}</p></div>
        <div><span>Correct</span><p>{correct?.text || "—"}</p></div>
        <div><span>Incorrect</span><p>{incorrect?.text || "—"}</p></div>
      </div>

      {Object.keys(misconceptions).length > 0 && (
        <div className={styles.previewMisconceptions}>
          <strong>Answer-specific feedback</strong>
          {Object.entries(misconceptions).map(([key, value]) => {
            const normalised = normaliseTeachingText(value as any);
            if (!normalised) return null;
            return <p key={key}><b>{key}:</b> {normalised.text}</p>;
          })}
        </div>
      )}

      {lesson && <div className={styles.previewLesson}>{renderLesson(lesson, subject === "math" ? "Show Working" : "Why this works")}</div>}
      {teachMe && <div className={styles.previewLesson}>{renderLesson(teachMe, "Teach Me")}</div>}
      {quickCheck && (
        <div className={styles.previewLesson}>
          <CoreTeachingQuickCheck
            subject={subject}
            quickCheck={quickCheck}
            questionId="teaching-preview"
          />
        </div>
      )}
    </div>
  );
}
