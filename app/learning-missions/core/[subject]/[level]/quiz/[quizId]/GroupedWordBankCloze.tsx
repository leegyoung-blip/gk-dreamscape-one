"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";

type JsonObject = Record<string, any>;

type GroupedClozeQuestion = {
  id: string;
  question_order: number;
  question_type: string;
  instruction: string | null;
  prompt: string;
  content: JsonObject;
};

type AnswerMap = Record<string, JsonObject>;

type Props = {
  title: string;
  topicTitle: string;
  level: number;
  questions: GroupedClozeQuestion[];
  answers: AnswerMap;
  tokenBalance: number;
  gemBalance: number;
  isMobile: boolean;
  busy: boolean;
  error: string | null;
  onAnswersChange: (answers: AnswerMap) => void;
  onSubmit: () => void;
  onExit: () => void;
};

function normalise(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function GroupedWordBankCloze({
  title,
  topicTitle,
  level,
  questions,
  answers,
  tokenBalance,
  gemBalance,
  isMobile,
  busy,
  error,
  onAnswersChange,
  onSubmit,
  onExit,
}: Props) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...questions].sort((a, b) => a.question_order - b.question_order),
    [questions],
  );

  const first = ordered[0];
  const instruction =
    first?.instruction ||
    "Fill in each blank with the most suitable word. Use each word only once.";
  const passage = String(first?.content?.cloze_passage ?? first?.prompt ?? "");
  const illustrationUrl = first?.content?.illustration_url
    ? String(first.content.illustration_url)
    : null;
  const illustrationAlt = String(
    first?.content?.illustration_alt ?? "Cloze passage illustration",
  );
  const illustrationCaption = String(
    first?.content?.illustration_caption ?? "",
  );

  const words = useMemo(() => {
    const raw = Array.isArray(first?.content?.word_bank)
      ? first.content.word_bank
      : [];
    return raw.map(String).map((word) => word.trim()).filter(Boolean);
  }, [first]);

  const questionByBlank = useMemo(() => {
    const map = new Map<string, GroupedClozeQuestion>();
    for (const question of ordered) {
      const blankId = String(
        question.content?.blank_id ?? question.question_order,
      );
      map.set(blankId, question);
    }
    return map;
  }, [ordered]);

  const placedByBlank = useMemo(() => {
    const map = new Map<string, string>();
    for (const question of ordered) {
      const blankId = String(
        question.content?.blank_id ?? question.question_order,
      );
      const value = answers[question.id]?.values?.[blankId];
      if (typeof value === "string" && value.trim()) {
        map.set(blankId, value.trim());
      }
    }
    return map;
  }, [answers, ordered]);

  const usedWords = useMemo(
    () => new Set([...placedByBlank.values()].map(normalise)),
    [placedByBlank],
  );

  const answeredCount = placedByBlank.size;
  const complete = answeredCount === ordered.length && ordered.length > 0;

  function clearWordEverywhere(next: AnswerMap, word: string) {
    const needle = normalise(word);
    for (const question of ordered) {
      const blankId = String(
        question.content?.blank_id ?? question.question_order,
      );
      const current = next[question.id]?.values?.[blankId];
      if (typeof current === "string" && normalise(current) === needle) {
        next[question.id] = { values: {} };
      }
    }
  }

  function placeWord(blankId: string, word: string) {
    const targetQuestion = questionByBlank.get(blankId);
    if (!targetQuestion || busy) return;

    const next: AnswerMap = { ...answers };
    clearWordEverywhere(next, word);
    next[targetQuestion.id] = { values: { [blankId]: word } };
    onAnswersChange(next);
    setSelectedWord(null);
  }

  function returnWord(word: string) {
    if (busy) return;
    const next: AnswerMap = { ...answers };
    clearWordEverywhere(next, word);
    onAnswersChange(next);
    if (selectedWord && normalise(selectedWord) === normalise(word)) {
      setSelectedWord(null);
    }
  }

  function handleWordDragStart(event: DragEvent, word: string) {
    event.dataTransfer.setData("text/plain", word);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleBlankDrop(event: DragEvent, blankId: string) {
    event.preventDefault();
    const word = event.dataTransfer.getData("text/plain");
    if (word) placeWord(blankId, word);
  }

  function renderPassage(): ReactNode[] {
    const pieces = passage.split(/(\{\{\d+\}\})/g);

    return pieces.map((piece, index) => {
      const marker = /^\{\{(\d+)\}\}$/.exec(piece);
      if (!marker) return <span key={`text-${index}`}>{piece}</span>;

      const blankId = marker[1];
      const placed = placedByBlank.get(blankId) || "";

      return (
        <span key={`blank-${blankId}-${index}`} style={blankWrap}>
          <button
            type="button"
            aria-label={
              placed
                ? `Blank ${blankId}: ${placed}. Click to return this word.`
                : `Blank ${blankId}. ${selectedWord ? "Click to place selected word." : "Choose a helping word first."}`
            }
            draggable={Boolean(placed) && !busy}
            onDragStart={(event) => {
              if (placed) handleWordDragStart(event, placed);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleBlankDrop(event, blankId)}
            onClick={() => {
              if (busy) return;
              if (selectedWord) placeWord(blankId, selectedWord);
              else if (placed) returnWord(placed);
            }}
            style={blankButton(Boolean(placed), Boolean(selectedWord))}
          >
            {placed || "Drop word here"}
          </button>
          <span style={blankNumber}>({blankId})</span>
        </span>
      );
    });
  }

  return (
    <main style={pageShell}>
      <header style={header(isMobile)}>
        <button type="button" onClick={onExit} style={backButton}>
          ← Quiz List
        </button>

        <div style={headerTitleWrap}>
          <p style={eyebrow}>ENGLISH · PRIMARY {level}</p>
          <p style={headerTitle}>{topicTitle}</p>
        </div>

        <div style={balanceRow}>
          <span style={balancePill}>DT {tokenBalance}</span>
          <span style={balancePill}>DG {gemBalance}</span>
        </div>
      </header>

      <section style={outerWrap(isMobile)}>
        <div style={topCard}>
          <div style={{ minWidth: 0 }}>
            <h1 style={titleStyle}>{title}</h1>
            <p style={instructionText}>{instruction}</p>
          </div>
          <div style={progressPill}>
            {answeredCount}/{ordered.length} filled
          </div>
        </div>

        {error && <div style={errorCard}>{error}</div>}

        <div style={workspace(isMobile)}>
          <article style={passageCard(isMobile)}>
            <div style={passageScroller}>
              <div style={passageText}>{renderPassage()}</div>

              {illustrationUrl && (
                <figure style={illustrationFigure}>
                  <img
                    src={illustrationUrl}
                    alt={illustrationAlt}
                    style={illustration}
                  />
                  {illustrationCaption && (
                    <figcaption style={illustrationCaptionStyle}>
                      {illustrationCaption}
                    </figcaption>
                  )}
                </figure>
              )}
            </div>
          </article>

          <aside
            style={bankCard(isMobile)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const word = event.dataTransfer.getData("text/plain");
              if (word) returnWord(word);
            }}
          >
            <div style={bankHeadingRow}>
              <div>
                <p style={eyebrow}>HELPING WORDS</p>
                <h2 style={bankTitle}>Word Bank</h2>
              </div>
              {selectedWord && (
                <button
                  type="button"
                  onClick={() => setSelectedWord(null)}
                  style={clearSelection}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={wordGrid(isMobile)}>
              {words.map((word) => {
                const used = usedWords.has(normalise(word));
                const selected =
                  selectedWord != null &&
                  normalise(selectedWord) === normalise(word);

                return (
                  <button
                    key={word}
                    type="button"
                    draggable={!busy}
                    onDragStart={(event) => handleWordDragStart(event, word)}
                    onClick={() => {
                      if (busy) return;
                      if (used) returnWord(word);
                      else setSelectedWord(selected ? null : word);
                    }}
                    style={wordButton(selected, used)}
                  >
                    <span>{word}</span>
                    {used && <small style={placedLabel}>Placed</small>}
                  </button>
                );
              })}
            </div>

            <p style={bankHint}>
              Drag a word to a blank, or select a word and tap the blank.
            </p>
          </aside>
        </div>

        <div style={actionBar(isMobile)}>
          <div style={completionText}>
            {complete
              ? "All blanks are filled."
              : `${ordered.length - answeredCount} blank${ordered.length - answeredCount === 1 ? "" : "s"} remaining.`}
          </div>
          <button
            type="button"
            disabled={!complete || busy}
            onClick={onSubmit}
            style={submitButton(!complete || busy)}
          >
            {busy ? "Submitting..." : "Submit Answers"}
          </button>
        </div>
      </section>
    </main>
  );
}

const pageShell: CSSProperties = {
  height: "100dvh",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 18% 0%, rgba(147,74,255,0.18), transparent 34%), linear-gradient(180deg,#050a19 0%,#071124 100%)",
  color: "#f8fbff",
  padding: "12px clamp(10px, 2vw, 24px)",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
};

const header = (isMobile: boolean): CSSProperties => ({
  flex: "0 0 auto",
  maxWidth: "1500px",
  width: "100%",
  margin: "0 auto 10px",
  display: "grid",
  gridTemplateColumns: isMobile ? "auto 1fr" : "auto 1fr auto",
  alignItems: "center",
  gap: "10px",
});

const headerTitleWrap: CSSProperties = {
  minWidth: 0,
  textAlign: "center",
};

const headerTitle: CSSProperties = {
  margin: "3px 0 0",
  color: "rgba(255,255,255,0.56)",
  fontSize: "11px",
  fontWeight: 800,
};

const backButton: CSSProperties = {
  minHeight: "38px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  borderRadius: "999px",
  padding: "0 13px",
  fontWeight: 800,
  cursor: "pointer",
};

const balanceRow: CSSProperties = { display: "flex", gap: "6px" };
const balancePill: CSSProperties = {
  border: "1px solid rgba(127,225,255,0.28)",
  background: "rgba(10,25,47,0.88)",
  borderRadius: "999px",
  padding: "7px 9px",
  fontWeight: 900,
  fontSize: "11px",
};

const outerWrap = (isMobile: boolean): CSSProperties => ({
  flex: 1,
  minHeight: 0,
  maxWidth: "1500px",
  width: "100%",
  margin: "0 auto",
  display: "grid",
  gridTemplateRows: "auto auto minmax(0,1fr) auto",
  gap: isMobile ? "8px" : "10px",
});

const topCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  border: "1px solid rgba(162,196,255,0.14)",
  borderRadius: "16px",
  padding: "10px 14px",
  background: "rgba(7,16,34,0.76)",
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: "9px",
  letterSpacing: "0.16em",
  fontWeight: 900,
  color: "#9eefff",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(18px, 2.1vw, 27px)",
  lineHeight: 1.1,
};

const instructionText: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.58)",
  fontSize: "11px",
  lineHeight: 1.35,
};

const progressPill: CSSProperties = {
  padding: "7px 10px",
  borderRadius: "999px",
  background: "rgba(99,232,178,0.1)",
  border: "1px solid rgba(99,232,178,0.3)",
  color: "#bfffe3",
  fontWeight: 900,
  fontSize: "11px",
  whiteSpace: "nowrap",
};

const errorCard: CSSProperties = {
  borderRadius: "12px",
  padding: "8px 11px",
  background: "rgba(255,88,109,0.1)",
  border: "1px solid rgba(255,88,109,0.3)",
  color: "#ffd6dc",
  fontSize: "11px",
};

const workspace = (isMobile: boolean): CSSProperties => ({
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: isMobile
    ? "minmax(0,1fr) minmax(145px,0.48fr)"
    : "minmax(0,1fr) minmax(230px,300px)",
  gap: isMobile ? "8px" : "10px",
  alignItems: "stretch",
});

const passageCard = (isMobile: boolean): CSSProperties => ({
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  borderRadius: isMobile ? "16px" : "20px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(250,252,255,0.97)",
  color: "#172033",
  padding: isMobile ? "12px" : "18px",
});

const passageScroller: CSSProperties = {
  height: "100%",
  minHeight: 0,
  overflowY: "auto",
  paddingRight: "5px",
};

const passageText: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: "clamp(14px, 1.2vw, 18px)",
  lineHeight: 1.85,
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const blankWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: "4px",
  margin: "0 2px",
  whiteSpace: "nowrap",
};

const blankButton = (filled: boolean, selected: boolean): CSSProperties => ({
  minWidth: filled ? "92px" : "108px",
  minHeight: "30px",
  padding: "2px 7px 3px",
  borderRadius: "7px",
  border: selected
    ? "2px solid #7b55ff"
    : filled
      ? "2px solid #19a873"
      : "2px dashed #8390a8",
  background: filled ? "#e7fff5" : selected ? "#f1ecff" : "#f6f8fb",
  color: filled ? "#096c4a" : "#677185",
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: "0.82em",
  cursor: "pointer",
});

const blankNumber: CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  fontSize: "10px",
  color: "#687386",
  fontWeight: 800,
};

const illustrationFigure: CSSProperties = { margin: "16px auto 0", textAlign: "center" };
const illustration: CSSProperties = {
  display: "block",
  maxWidth: "320px",
  width: "100%",
  maxHeight: "180px",
  objectFit: "contain",
  margin: "0 auto",
};
const illustrationCaptionStyle: CSSProperties = {
  marginTop: "5px",
  color: "#657086",
  fontSize: "10px",
};

const bankCard = (isMobile: boolean): CSSProperties => ({
  minWidth: 0,
  minHeight: 0,
  overflowY: "auto",
  borderRadius: isMobile ? "16px" : "20px",
  border: "1px solid rgba(127,232,255,0.2)",
  background: "linear-gradient(180deg,rgba(10,25,48,0.96),rgba(7,15,31,0.98))",
  padding: isMobile ? "10px" : "14px",
});

const bankHeadingRow: CSSProperties = {
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "9px",
};
const bankTitle: CSSProperties = { margin: "3px 0 0", fontSize: "17px" };
const clearSelection: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  borderRadius: "8px",
  padding: "5px 7px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "10px",
};

const wordGrid = (isMobile: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "1fr",
  gap: "6px",
});

const wordButton = (selected: boolean, used: boolean): CSSProperties => ({
  width: "100%",
  minHeight: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
  borderRadius: "9px",
  border: selected
    ? "1px solid rgba(167,139,250,0.9)"
    : used
      ? "1px solid rgba(52,211,153,0.35)"
      : "1px solid rgba(126,232,255,0.16)",
  background: selected
    ? "rgba(139,92,246,0.18)"
    : used
      ? "rgba(52,211,153,0.08)"
      : "rgba(255,255,255,0.04)",
  color: used ? "rgba(255,255,255,0.48)" : "white",
  padding: "0 9px",
  cursor: "pointer",
  fontWeight: 850,
  fontSize: "11px",
});
const placedLabel: CSSProperties = { fontSize: "8px", color: "#9ff0cf" };
const bankHint: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(255,255,255,0.38)",
  fontSize: "9px",
  lineHeight: 1.35,
};

const actionBar = (isMobile: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(7,16,34,0.84)",
  padding: isMobile ? "7px 9px" : "9px 12px",
});
const completionText: CSSProperties = {
  color: "rgba(255,255,255,0.54)",
  fontSize: "10px",
  fontWeight: 800,
};
const submitButton = (disabled: boolean): CSSProperties => ({
  minHeight: "40px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.38)",
  background: disabled
    ? "rgba(255,255,255,0.05)"
    : "linear-gradient(135deg,#77e6f5,#74ddc4)",
  color: disabled ? "rgba(255,255,255,0.35)" : "#061326",
  padding: "0 14px",
  cursor: disabled ? "default" : "pointer",
  fontWeight: 950,
  fontSize: "11px",
});
