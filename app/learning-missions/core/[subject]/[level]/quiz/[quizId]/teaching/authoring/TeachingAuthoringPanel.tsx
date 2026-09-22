"use client";

import { useMemo, useState } from "react";
import TeachingCommonFields from "./TeachingCommonFields";
import MisconceptionEditor from "./MisconceptionEditor";
import TeachingLessonEditor from "./TeachingLessonEditor";
import TeachingPreview from "./TeachingPreview";
import QuickCheckEditor from "./QuickCheckEditor";
import styles from "./TeachingAuthoring.module.css";
import type {
  TeachingAuthoringOption,
  TeachingAuthoringSubject,
  TeachingDraft,
} from "./TeachingAuthoringTypes";
import {
  cloneTeaching,
  isRecord,
  teachingStatus,
} from "./TeachingAuthoringUtils";

const STATUS_LABELS = {
  empty: "No teaching",
  legacy: "Legacy",
  enhanced: "Enhanced",
  full: "Full Teaching",
} as const;

export default function TeachingAuthoringPanel({
  subject,
  prompt,
  options,
  correctOptionIds,
  legacyExplanation,
  value,
  disabled,
  defaultOpen = false,
  allowMisconceptions = true,
  onChange,
}: {
  subject: TeachingAuthoringSubject;
  prompt: string;
  options: TeachingAuthoringOption[];
  correctOptionIds: string[];
  legacyExplanation: string;
  value: TeachingDraft;
  disabled: boolean;
  defaultOpen?: boolean;
  allowMisconceptions?: boolean;
  onChange: (value: TeachingDraft) => void;
}) {
  const [open, setOpen] = useState(defaultOpen || Object.keys(value || {}).length > 0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const status = teachingStatus(value || {}, legacyExplanation);
  const mainLesson = isRecord(value.lesson) ? value.lesson : {};
  const teachMe = isRecord(value.teach_me) ? value.teach_me : {};

  const cleanOptions = useMemo(
    () => options.filter((option) => option.id.trim().length > 0),
    [options],
  );

  return (
    <section className={styles.panel}>
      <button type="button" className={styles.panelToggle} onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <div>
          <span className={styles.eyebrow}>TEACHING & EXPLANATION</span>
          <strong>Teaching authoring</strong>
          <small>Hints, answer-specific feedback, structured lessons, Teach Me and Quick Check.</small>
        </div>
        <div className={styles.panelToggleRight}>
          <span className={`${styles.statusPill} ${styles[`status_${status}`]}`}>{STATUS_LABELS[status]}</span>
          <span>{open ? "−" : "+"}</span>
        </div>
      </button>

      {open && (
        <div className={styles.panelBody}>
          <div className={styles.majorSection}>
            <div className={styles.majorHeading}>
              <span>1</span>
              <div><strong>Hint & immediate feedback</strong><p>Shared fields used by both English and Mathematics.</p></div>
            </div>
            <TeachingCommonFields value={value} legacyExplanation={legacyExplanation} disabled={disabled} onChange={onChange} />
          </div>

          {allowMisconceptions && cleanOptions.length > 1 && (
            <div className={styles.majorSection}>
              <div className={styles.majorHeading}>
                <span>2</span>
                <div><strong>Answer-specific misconceptions</strong><p>Optional. Use only when the distractor represents a verified error pattern.</p></div>
              </div>
              <MisconceptionEditor options={cleanOptions} correctOptionIds={correctOptionIds} value={value} disabled={disabled} onChange={onChange} />
            </div>
          )}

          <div className={styles.majorSection}>
            <div className={styles.majorHeading}>
              <span>3</span>
              <div><strong>Main teaching explanation</strong><p>{subject === "math" ? "Shown under Show Working." : "Shown under Why?."}</p></div>
            </div>
            <TeachingLessonEditor
              subject={subject}
              title={subject === "math" ? "Show Working" : "Why this works"}
              description="Author the concise explanation that follows the learner’s answer."
              value={mainLesson}
              disabled={disabled}
              prompt={prompt}
              onChange={(lesson) => onChange({ ...value, lesson })}
              allowRemove
            />
          </div>

          <div className={styles.majorSection}>
            <div className={styles.majorHeading}>
              <span>4</span>
              <div><strong>Teach Me</strong><p>Optional deeper micro-lesson for learners who still need help.</p></div>
            </div>
            {Object.keys(teachMe).length === 0 ? (
              <button
                type="button"
                className={styles.addTeachMeButton}
                disabled={disabled}
                onClick={() => onChange({ ...value, teach_me: { type: subject === "math" ? "worked_steps" : "rule_clue", title: "Teach Me" } })}
              >
                + Add Teach Me lesson
              </button>
            ) : (
              <TeachingLessonEditor
                subject={subject}
                title="Teach Me"
                description="Use the same verified content model, but go one level deeper."
                value={teachMe}
                disabled={disabled}
                prompt={prompt}
                onChange={(lesson) => onChange({ ...value, teach_me: lesson })}
                allowRemove
              />
            )}
          </div>

          <div className={styles.majorSection}>
            <div className={styles.majorHeading}>
              <span>5</span>
              <div><strong>Quick Check</strong><p>Optional unscored transfer question shown after the learner opens teaching.</p></div>
            </div>
            <QuickCheckEditor
              subject={subject}
              value={value}
              disabled={disabled}
              onChange={onChange}
            />
          </div>

          <div className={styles.panelFooter}>
            <button type="button" className={styles.previewButton} onClick={() => setPreviewOpen((current) => !current)}>
              {previewOpen ? "Hide Preview" : "Preview Teaching"}
            </button>
            <button
              type="button"
              className={styles.clearButton}
              disabled={disabled || Object.keys(value || {}).length === 0}
              onClick={() => {
                if (window.confirm("Clear all structured teaching content for this question? The existing Student explanation is not deleted.")) {
                  onChange({});
                }
              }}
            >
              Clear Teaching Content
            </button>
          </div>

          {previewOpen && <TeachingPreview subject={subject} prompt={prompt} teaching={cloneTeaching(value)} />}
        </div>
      )}
    </section>
  );
}
