"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import styles from "../CoreTeachingEngine.module.css";
import { readPlaceValue, sourceText } from "./MathTeachingUtils";

export default function PlaceValueLesson({
  question: _question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const table = readPlaceValue(lesson);
  if (!table) return <CoreTeachingLesson lesson={lesson} label={label} />;

  const method = sourceText(lesson, "method");
  const conclusion = sourceText(lesson, "result") || sourceText(lesson, "answer");
  const highlighted = new Set(table.highlight_columns || []);

  return (
    <div className={`${styles.lessonPanel} ${styles.mathLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      {method && <p className={styles.lessonText}><FractionText text={method} /></p>}

      <div className={styles.mathTableScroller}>
        <table className={styles.placeValueTable}>
          <thead>
            <tr>
              <th aria-hidden="true" />
              {table.columns?.map((column) => (
                <th
                  key={column}
                  className={highlighted.has(column) ? styles.mathTableActive : undefined}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows?.map((row, rowIndex) => (
              <tr key={`${row.label || "row"}-${rowIndex}`}>
                <th>{row.label || ""}</th>
                {table.columns?.map((column, columnIndex) => (
                  <td
                    key={`${column}-${columnIndex}`}
                    className={
                      row.emphasis || highlighted.has(column)
                        ? styles.mathTableActive
                        : undefined
                    }
                  >
                    <FractionText text={row.values?.[columnIndex] || ""} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lesson.steps.length > 0 && (
        <div className={styles.mathStepList}>
          {lesson.steps.map((step, index) => (
            <div key={`${index}-${step.text}`} className={styles.mathStepCard}>
              <span className={styles.mathStepNumber}>{index + 1}</span>
              <div>
                {step.title && <strong>{step.title}</strong>}
                <p><FractionText text={step.text} /></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {conclusion && (
        <div className={styles.mathAnswerCard}>
          <span className={styles.lessonMiniLabel}>Answer</span>
          <strong><FractionText text={conclusion} /></strong>
        </div>
      )}
    </div>
  );
}
