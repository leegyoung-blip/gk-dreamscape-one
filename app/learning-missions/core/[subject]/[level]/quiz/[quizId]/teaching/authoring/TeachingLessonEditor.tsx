"use client";

import styles from "./TeachingAuthoring.module.css";
import type { TeachingAuthoringSubject, TeachingDraft } from "./TeachingAuthoringTypes";
import { isRecord } from "./TeachingAuthoringUtils";
import EnglishTeachingAuthoring from "./english/EnglishTeachingAuthoring";
import MathTeachingAuthoring from "./math/MathTeachingAuthoring";

export default function TeachingLessonEditor({
  subject,
  title,
  description,
  value,
  disabled,
  prompt,
  onChange,
  allowRemove = false,
}: {
  subject: TeachingAuthoringSubject;
  title: string;
  description: string;
  value: unknown;
  disabled: boolean;
  prompt: string;
  onChange: (value: TeachingDraft) => void;
  allowRemove?: boolean;
}) {
  const lesson = isRecord(value) ? value : {};

  return (
    <div className={styles.lessonEditor}>
      <div className={styles.lessonEditorHeader}>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
        {allowRemove && Object.keys(lesson).length > 0 && (
          <button type="button" className={styles.removeButton} disabled={disabled} onClick={() => onChange({})}>
            Clear
          </button>
        )}
      </div>

      {subject === "english" ? (
        <EnglishTeachingAuthoring value={lesson} disabled={disabled} prompt={prompt} onChange={onChange} />
      ) : (
        <MathTeachingAuthoring value={lesson} disabled={disabled} prompt={prompt} onChange={onChange} />
      )}
    </div>
  );
}
