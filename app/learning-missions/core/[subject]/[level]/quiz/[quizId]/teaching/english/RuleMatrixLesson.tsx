"use client";

import FractionText from "@/components/core-missions/FractionText";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";
import CoreTeachingLesson from "../CoreTeachingLesson";
import styles from "../CoreTeachingEngine.module.css";
import EnglishSentenceEvidence from "./EnglishSentenceEvidence";
import {
  readTeachingMatrix,
  sourceEvidence,
  sourceText,
} from "./EnglishTeachingUtils";

export default function RuleMatrixLesson({
  question,
  lesson,
  label,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
  label: string;
}) {
  const matrix = readTeachingMatrix(lesson);
  if (!matrix) return <CoreTeachingLesson lesson={lesson} label={label} />;

  const evidence = sourceEvidence(lesson);
  const sentence = sourceText(lesson, "sentence") || question.prompt;
  const conclusion = sourceText(lesson, "conclusion");
  const rule = sourceText(lesson, "rule");

  return (
    <div className={`${styles.lessonPanel} ${styles.englishLesson}`}>
      <p className={styles.panelEyebrow}>{label}</p>
      {lesson.title && <h3 className={styles.lessonTitle}>{lesson.title}</h3>}

      <EnglishSentenceEvidence sentence={sentence} evidence={evidence} compact />

      {rule && (
        <p className={styles.lessonText}><FractionText text={rule} /></p>
      )}

      <div className={styles.matrixScroller}>
        <table className={styles.ruleMatrix}>
          <thead>
            <tr>
              <th aria-hidden="true" />
              {matrix.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.key}>
                <th>{row.label}</th>
                {matrix.columns.map((column) => {
                  const cell = matrix.cells[row.key]?.[column.key];
                  const highlighted =
                    cell?.emphasis === true ||
                    (matrix.highlight?.row === row.key &&
                      matrix.highlight?.column === column.key);

                  return (
                    <td
                      key={`${row.key}-${column.key}`}
                      className={highlighted ? styles.matrixCellActive : undefined}
                    >
                      {cell ? <FractionText text={cell.text} /> : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conclusion && (
        <div className={styles.conclusionCard}>
          <span className={styles.lessonMiniLabel}>For this question</span>
          <strong><FractionText text={conclusion} /></strong>
        </div>
      )}
    </div>
  );
}
