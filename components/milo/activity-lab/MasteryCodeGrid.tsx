"use client";

import type { MasteryAttempt } from "./mastery-code-shared";

export default function MasteryCodeGrid({
  attempts,
  currentLetters,
  wordLength,
  maxAttempts,
  cellSize,
  mobile,
  wide,
  dense,
  hintedPositions = [],
}: {
  attempts: MasteryAttempt[];
  currentLetters: string[];
  wordLength: number;
  maxAttempts: number;
  cellSize: number;
  mobile: boolean;
  wide: boolean;
  dense: boolean;
  hintedPositions?: number[];
}) {
  const mobileGap = 4;

  return (
    <div
      aria-label="Mastery Code guess grid"
      style={{
        display: "grid",
        gridTemplateRows: `repeat(${maxAttempts}, ${cellSize}px)`,
        gap: mobile ? `${mobileGap}px` : wide ? "9px" : "7px",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: maxAttempts }).map((_, rowIndex) => {
        const attempt = attempts[rowIndex];
        const isCurrentRow = rowIndex === attempts.length;

        return (
          <div
            key={rowIndex}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${wordLength}, ${cellSize}px)`,
              gap: mobile ? `${mobileGap}px` : wide ? "9px" : "7px",
            }}
          >
            {Array.from({ length: wordLength }).map((_, letterIndex) => {
              const attemptedLetter = attempt?.guess[letterIndex] || "";
              const currentLetter = isCurrentRow
                ? currentLetters[letterIndex] || ""
                : "";
              const letter = attemptedLetter || currentLetter;
              const feedback = attempt?.feedback[letterIndex];
              const hinted = isCurrentRow && hintedPositions.includes(letterIndex);

              const background =
                feedback === "correct"
                  ? "#3f9860"
                  : feedback === "present"
                    ? "#b68c2d"
                    : feedback === "absent"
                      ? "#394353"
                      : hinted
                        ? "rgba(63,152,96,0.3)"
                        : letter
                          ? "rgba(126,232,255,0.11)"
                          : "rgba(255,255,255,0.035)";

              const border =
                feedback === "correct"
                  ? "1px solid rgba(106,255,155,0.54)"
                  : feedback === "present"
                    ? "1px solid rgba(255,214,95,0.5)"
                    : feedback === "absent"
                      ? "1px solid rgba(255,255,255,0.08)"
                      : hinted
                        ? "1px solid rgba(106,255,155,0.72)"
                        : letter
                          ? "1px solid rgba(126,232,255,0.58)"
                          : "1px solid rgba(126,232,255,0.13)";

              return (
                <span
                  key={letterIndex}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    borderRadius: mobile ? "8px" : wide ? "14px" : "11px",
                    border,
                    background,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: mobile
                      ? dense
                        ? "18px"
                        : "21px"
                      : dense
                        ? "19px"
                        : wide
                          ? "28px"
                          : "23px",
                    fontWeight: 900,
                    boxShadow: feedback
                      ? "inset 0 -3px 0 rgba(0,0,0,0.14)"
                      : hinted
                        ? "0 0 18px rgba(106,255,155,0.18)"
                        : "none",
                  }}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
