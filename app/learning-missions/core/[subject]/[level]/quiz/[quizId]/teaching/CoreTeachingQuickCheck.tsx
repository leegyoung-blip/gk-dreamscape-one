"use client";

import { useEffect, useMemo, useState } from "react";
import FractionText from "@/components/core-missions/FractionText";
import type { CoreSubject } from "../CoreQuizTypes";
import type { NormalisedTeachingQuickCheck } from "./TeachingTypes";
import {
  evaluateTeachingQuickCheck,
  type TeachingQuickCheckResponse,
} from "./TeachingUtils";
import styles from "./CoreTeachingEngine.module.css";

export default function CoreTeachingQuickCheck({
  subject,
  quickCheck,
  questionId,
  onAnswered,
}: {
  subject: CoreSubject;
  quickCheck: NormalisedTeachingQuickCheck;
  questionId: string;
  onAnswered?: (result: { correct: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [optionId, setOptionId] = useState("");
  const [text, setText] = useState("");
  const [numericValue, setNumericValue] = useState("");
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");

  useEffect(() => {
    setOpen(false);
    setChecked(false);
    setCorrect(null);
    setOptionId("");
    setText("");
    setNumericValue("");
    setNumerator("");
    setDenominator("");
  }, [questionId]);

  const response = useMemo<TeachingQuickCheckResponse>(() => {
    if (quickCheck.type === "multiple_choice") return { optionId };
    if (quickCheck.type === "short_text") return { text };
    if (quickCheck.type === "numeric") return { value: numericValue };
    return { numerator, denominator };
  }, [denominator, numerator, numericValue, optionId, quickCheck.type, text]);

  const complete = useMemo(() => {
    if (quickCheck.type === "multiple_choice") return Boolean(optionId);
    if (quickCheck.type === "short_text") return text.trim().length > 0;
    if (quickCheck.type === "numeric") {
      return numericValue.trim().length > 0 && Number.isFinite(Number(numericValue));
    }
    return (
      numerator.trim().length > 0 &&
      denominator.trim().length > 0 &&
      Number.isInteger(Number(numerator)) &&
      Number.isInteger(Number(denominator)) &&
      Number(denominator) !== 0
    );
  }, [denominator, numerator, numericValue, optionId, quickCheck.type, text]);

  function checkAnswer() {
    if (!complete || checked) return;
    const nextCorrect = evaluateTeachingQuickCheck(quickCheck, response);
    setCorrect(nextCorrect);
    setChecked(true);
    onAnswered?.({ correct: nextCorrect });
  }

  const label = quickCheck.title || "Try One";

  if (!open) {
    return (
      <div className={styles.quickCheckLauncher}>
        <button
          type="button"
          className={styles.quickCheckLaunchButton}
          onClick={() => setOpen(true)}
        >
          <span className={styles.quickCheckSpark} aria-hidden="true">✦</span>
          <span>{label}</span>
          <span aria-hidden="true">→</span>
        </button>
        <span className={styles.quickCheckCaption}>Unscored practice</span>
      </div>
    );
  }

  return (
    <section className={styles.quickCheckPanel} data-quick-check-state={checked ? (correct ? "correct" : "wrong") : "open"}>
      <div className={styles.quickCheckHeader}>
        <div>
          <p className={styles.quickCheckEyebrow}>QUICK CHECK · UNSCORED</p>
          <h4>{label}</h4>
        </div>
        {!checked && (
          <button type="button" className={styles.quickCheckClose} onClick={() => setOpen(false)} aria-label="Close Quick Check">
            ✕
          </button>
        )}
      </div>

      {quickCheck.instruction && (
        <p className={styles.quickCheckInstruction}>
          <FractionText text={quickCheck.instruction} />
        </p>
      )}

      <p className={styles.quickCheckPrompt}>
        <FractionText text={quickCheck.prompt} />
      </p>

      {quickCheck.type === "multiple_choice" && (
        <div className={styles.quickCheckOptions} role="radiogroup" aria-label="Quick Check answers">
          {quickCheck.options.map((option, index) => {
            const selected = optionId === option.id;
            const answerCorrect = checked && option.id === quickCheck.correctOptionId;
            const answerWrong = checked && selected && !answerCorrect;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={checked}
                onClick={() => setOptionId(option.id)}
                className={[
                  styles.quickCheckOption,
                  selected ? styles.quickCheckOptionSelected : "",
                  answerCorrect ? styles.quickCheckOptionCorrect : "",
                  answerWrong ? styles.quickCheckOptionWrong : "",
                ].filter(Boolean).join(" ")}
              >
                <span className={styles.quickCheckOptionLetter}>{String.fromCharCode(65 + index)}</span>
                <span><FractionText text={option.text} /></span>
              </button>
            );
          })}
        </div>
      )}

      {quickCheck.type === "short_text" && (
        <input
          className={styles.quickCheckInput}
          value={text}
          disabled={checked}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type your answer"
          onKeyDown={(event) => {
            if (event.key === "Enter") checkAnswer();
          }}
        />
      )}

      {quickCheck.type === "numeric" && (
        <input
          className={styles.quickCheckInput}
          value={numericValue}
          disabled={checked}
          inputMode="decimal"
          onChange={(event) => setNumericValue(event.target.value)}
          placeholder="Enter your answer"
          onKeyDown={(event) => {
            if (event.key === "Enter") checkAnswer();
          }}
        />
      )}

      {quickCheck.type === "fraction" && (
        <div className={styles.quickCheckFractionInput}>
          <input
            value={numerator}
            disabled={checked}
            inputMode="numeric"
            aria-label="Numerator"
            onChange={(event) => setNumerator(event.target.value)}
            placeholder="0"
          />
          <span aria-hidden="true" />
          <input
            value={denominator}
            disabled={checked}
            inputMode="numeric"
            aria-label="Denominator"
            onChange={(event) => setDenominator(event.target.value)}
            placeholder="1"
          />
        </div>
      )}

      {!checked ? (
        <div className={styles.quickCheckActions}>
          <button
            type="button"
            className={styles.quickCheckSubmit}
            disabled={!complete}
            onClick={checkAnswer}
          >
            Check Answer
          </button>
        </div>
      ) : (
        <div className={`${styles.quickCheckResult} ${correct ? styles.quickCheckResultCorrect : styles.quickCheckResultWrong}`}>
          <strong>{correct ? "You’ve got it." : "Let’s look once more."}</strong>
          <p>
            {correct
              ? subject === "math"
                ? "You applied the method correctly to a new example."
                : "You applied the idea correctly to a new example."
              : quickCheck.explanation ||
                (subject === "math"
                  ? "Review the method above, then compare it with this example."
                  : "Review the rule and clues above, then compare them with this example.")}
          </p>
        </div>
      )}
    </section>
  );
}
