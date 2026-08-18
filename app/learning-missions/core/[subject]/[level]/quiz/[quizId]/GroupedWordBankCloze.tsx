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
  const instruction = first?.instruction ||
    "Fill in each blank with the most suitable word. Use each word only once.";
  const passage = String(first?.content?.cloze_passage ?? first?.prompt ?? "");
  const illustrationUrl = first?.content?.illustration_url
    ? String(first.content.illustration_url)
    : null;

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
    next[targetQuestion.id] = {
      values: {
        [blankId]: word,
      },
    };

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
      if (!marker) {
        return <span key={`text-${index}`}>{piece}</span>;
      }

      const blankId = marker[1];
      const placed = placedByBlank.get(blankId) || "";
      const canUseSelected = Boolean(selectedWord);

      return (
        <span key={`blank-${blankId}-${index}`} style={blankWrap}>
          <button
            type="button"
            aria-label={
              placed
                ? `Blank ${blankId}: ${placed}. Click to return this word.`
                : `Blank ${blankId}. ${canUseSelected ? "Click to place selected word." : "Choose a helping word first."}`
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

        <div style={balanceRow}>
          <span style={balancePill}>DT {tokenBalance}</span>
          <span style={balancePill}>DG {gemBalance}</span>
        </div>
      </header>

      <section style={outerWrap(isMobile)}>
        <div style={topCard}>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrow}>ENGLISH · PRIMARY {level}</p>
            <h1 style={titleStyle}>{title}</h1>
            <p style={metaStyle}>{topicTitle}</p>
          </div>

          <div style={progressPill}>
            {answeredCount}/{ordered.length} blanks filled
          </div>
        </div>

        <div style={instructionCard}>
          <strong>Instructions</strong>
          <span>{instruction}</span>
          <small>
            Drag a word into a blank, or click a word and then click the blank.
            Click a filled blank to return its word.
          </small>
        </div>

        {error && <div style={errorCard}>{error}</div>}

        <div style={workspace(isMobile)}>
          <article style={passageCard}>
            <div style={passageText}>{renderPassage()}</div>

            {illustrationUrl && (
              <img
                src={illustrationUrl}
                alt="Cloze passage illustration"
                style={illustration}
              />
            )}
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
              A word can only occupy one blank. Moving it automatically clears
              its previous position.
            </p>
          </aside>
        </div>

        <div style={actionBar(isMobile)}>
          <div style={completionText}>
            {complete
              ? "All blanks are filled. You can submit your answers."
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
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 18% 0%, rgba(147,74,255,0.18), transparent 34%), linear-gradient(180deg,#050a19 0%,#071124 100%)",
  color: "#f8fbff",
  padding: "18px clamp(14px, 3vw, 38px) 36px",
};

const header = (isMobile: boolean): CSSProperties => ({
  maxWidth: "1500px",
  margin: "0 auto 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: isMobile ? "wrap" : "nowrap",
});

const backButton: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  borderRadius: "14px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const balanceRow: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const balancePill: CSSProperties = {
  border: "1px solid rgba(127,225,255,0.28)",
  background: "rgba(10,25,47,0.88)",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 900,
  fontSize: "13px",
};

const outerWrap = (isMobile: boolean): CSSProperties => ({
  maxWidth: "1500px",
  margin: "0 auto",
  display: "grid",
  gap: isMobile ? "12px" : "16px",
});

const topCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
  border: "1px solid rgba(162,196,255,0.14)",
  borderRadius: "22px",
  padding: "18px 20px",
  background: "rgba(7,16,34,0.76)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
  color: "#9eefff",
};

const titleStyle: CSSProperties = {
  margin: "5px 0 2px",
  fontSize: "clamp(22px, 3vw, 34px)",
  lineHeight: 1.12,
};

const metaStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.62)",
};

const progressPill: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(99,232,178,0.1)",
  border: "1px solid rgba(99,232,178,0.3)",
  color: "#bfffe3",
  fontWeight: 900,
};

const instructionCard: CSSProperties = {
  display: "grid",
  gap: "5px",
  borderRadius: "18px",
  padding: "14px 16px",
  background: "rgba(86,127,255,0.08)",
  border: "1px solid rgba(116,158,255,0.2)",
  lineHeight: 1.5,
};

const errorCard: CSSProperties = {
  borderRadius: "16px",
  padding: "12px 14px",
  background: "rgba(255,88,109,0.1)",
  border: "1px solid rgba(255,88,109,0.3)",
  color: "#ffd6dc",
};

const workspace = (isMobile: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(260px, 330px)",
  gap: "16px",
  alignItems: "start",
});

const passageCard: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(250,252,255,0.97)",
  color: "#172033",
  padding: "clamp(18px, 3vw, 34px)",
  minHeight: "420px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
};

const passageText: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: "clamp(16px, 1.35vw, 20px)",
  lineHeight: 2.1,
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const blankWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: "5px",
  margin: "0 3px",
  whiteSpace: "nowrap",
};

const blankButton = (filled: boolean, selected: boolean): CSSProperties => ({
  minWidth: filled ? "118px" : "132px",
  minHeight: "34px",
  padding: "3px 10px 4px",
  borderRadius: "8px",
  border: selected
    ? "2px solid #7b55ff"
    : filled
      ? "2px solid #19a873"
      : "2px dashed #8390a8",
  background: filled ? "#e7fff5" : selected ? "#f1ecff" : "#f6f8fb",
  color: filled ? "#096c4a" : "#677185",
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: "0.9em",
  cursor: "pointer",
  verticalAlign: "baseline",
});

const blankNumber: CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  fontSize: "12px",
  color: "#687386",
  fontWeight: 800,
};

const illustration: CSSProperties = {
  display: "block",
  maxWidth: "390px",
  width: "100%",
  maxHeight: "260px",
  objectFit: "contain",
  margin: "26px auto 0",
};

const bankCard = (isMobile: boolean): CSSProperties => ({
  position: isMobile ? "static" : "sticky",
  top: "16px",
  borderRadius: "24px",
  border: "1px solid rgba(127,232,255,0.2)",
  background: "linear-gradient(180deg,rgba(10,25,48,0.96),rgba(7,15,31,0.98))",
  padding: "18px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
});

const bankHeadingRow: CSSProperties = {
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "14px",
};

const bankTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "22px",
};

const clearSelection: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  borderRadius: "10px",
  padding: "7px 9px",
  fontWeight: 800,
  cursor: "pointer",
};

const wordGrid = (isMobile: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "1fr",
  gap: "9px",
});

const wordButton = (selected: boolean, used: boolean): CSSProperties => ({
  width: "100%",
  minHeight: "45px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  borderRadius: "13px",
  border: selected
    ? "1px solid rgba(185,147,255,0.9)"
    : used
      ? "1px solid rgba(103,231,184,0.28)"
      : "1px solid rgba(255,255,255,0.14)",
  background: selected
    ? "rgba(145,89,255,0.22)"
    : used
      ? "rgba(53,171,125,0.09)"
      : "rgba(255,255,255,0.055)",
  color: used ? "rgba(228,255,244,0.72)" : "#fff",
  padding: "10px 12px",
  fontWeight: 850,
  fontSize: "15px",
  cursor: "grab",
  opacity: used ? 0.72 : 1,
  textAlign: "left",
});

const placedLabel: CSSProperties = {
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7ff0bd",
};

const bankHint: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "12px",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.52)",
};

const actionBar = (isMobile: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  alignItems: isMobile ? "stretch" : "center",
  justifyContent: "space-between",
  gap: "12px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(7,16,34,0.8)",
  padding: "14px 16px",
});

const completionText: CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontWeight: 700,
};

const submitButton = (disabled: boolean): CSSProperties => ({
  minWidth: "190px",
  border: 0,
  borderRadius: "14px",
  padding: "13px 18px",
  background: "linear-gradient(135deg,#7a5cff,#55d5ff)",
  color: "#fff",
  fontWeight: 950,
  fontSize: "15px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.42 : 1,
  boxShadow: disabled ? "none" : "0 14px 30px rgba(78,126,255,0.26)",
});
