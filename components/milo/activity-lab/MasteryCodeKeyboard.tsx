"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  KEYBOARD_ROWS,
  getKeyboardLetterStates,
  type MasteryAttempt,
} from "./mastery-code-shared";

export default function MasteryCodeKeyboard({
  attempts,
  onLetter,
  onDelete,
  mobile,
  dense,
  wide,
  viewportHeight,
  disabled = false,
}: {
  attempts: MasteryAttempt[];
  onLetter: (letter: string) => void;
  onDelete: () => void;
  mobile: boolean;
  dense: boolean;
  wide: boolean;
  viewportHeight?: number;
  disabled?: boolean;
}) {
  const letterStates = useMemo(
    () => getKeyboardLetterStates(attempts),
    [attempts],
  );

  // Keep the enlarged keyboard on tall screens, but shrink it progressively
  // when viewport height is limited so all three rows remain visible.
  const resolvedViewportHeight = viewportHeight ?? 1200;
  const keyHeight = mobile
    ? dense
      ? 54
      : 66
    : resolvedViewportHeight < 760
      ? 46
      : resolvedViewportHeight < 820
        ? 50
        : resolvedViewportHeight < 900
          ? 54
          : resolvedViewportHeight < 960
            ? 58
            : dense
              ? 57
              : wide
                ? 78
                : 69;

  const keyboardGap = mobile
    ? 5
    : resolvedViewportHeight < 820
      ? 5
      : resolvedViewportHeight < 960
        ? 6
        : 8;

  function getKeyColours(letter: string): CSSProperties {
    const state = letterStates[letter];

    if (state === "correct") {
      return {
        background: "#3f9860",
        border: "1px solid rgba(106,255,155,0.54)",
        color: "white",
      };
    }

    if (state === "present") {
      return {
        background: "#b68c2d",
        border: "1px solid rgba(255,214,95,0.5)",
        color: "white",
      };
    }

    if (state === "absent") {
      return {
        background: "#394353",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.55)",
      };
    }

    return {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(126,232,255,0.14)",
      color: "rgba(255,255,255,0.9)",
    };
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: wide ? "820px" : "690px",
        margin: "0 auto",
        display: "grid",
        gap: `${keyboardGap}px`,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div
          key={row}
          style={{
            width: "100%",
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            gap: mobile ? "4px" : resolvedViewportHeight < 960 ? "5px" : wide ? "7px" : "5px",
          }}
        >
          {row.split("").map((letter) => (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onClick={() => onLetter(letter)}
              style={{
                minWidth: 0,
                height: `${keyHeight}px`,
                flex: "1 1 0",
                borderRadius: mobile ? "9px" : "10px",
                fontFamily: "inherit",
                fontSize: mobile ? "12px" : wide ? "16px" : "14px",
                fontWeight: 900,
                cursor: disabled ? "not-allowed" : "pointer",
                boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)",
                ...getKeyColours(letter),
              }}
            >
              {letter}
            </button>
          ))}

          {rowIndex === 2 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onDelete}
              style={{
                minWidth: 0,
                height: `${keyHeight}px`,
                flex: "1.55 1 0",
                borderRadius: mobile ? "9px" : "10px",
                border: "1px solid rgba(126,232,255,0.14)",
                background: "rgba(255,255,255,0.09)",
                color: "white",
                fontFamily: "inherit",
                fontSize: mobile ? "10px" : wide ? "12px" : "10px",
                fontWeight: 900,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              DEL
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
