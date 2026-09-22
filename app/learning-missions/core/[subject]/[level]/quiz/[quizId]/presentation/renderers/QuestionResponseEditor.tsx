"use client";

import type { CSSProperties } from "react";
import FractionText from "@/components/core-missions/FractionText";
import type {
  JsonObject,
  QuizQuestion,
  ScreenMode,
} from "../../CoreQuizTypes";
import {
  asOptions,
  getBlankIds,
  getQuestionVisualMediaCount,
} from "../../CoreQuizUtils";

export default function QuestionResponseEditor({
  question,
  response,
  locked,
  screenMode,
  workspaceOpen,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  screenMode: ScreenMode;
  workspaceOpen: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const options = asOptions(question.content);
  const hasImageOptions = options.some((option) => Boolean(option.image_url));
  const twoColumnOptionLayout =
    screenMode !== "mobile" &&
    (options.length === 4 || (hasImageOptions && options.length >= 3));
  const hasMainQuestionImage = getQuestionVisualMediaCount(question) > 0;

  switch (question.question_type) {
    case "multiple_choice":
    case "true_false":
    case "listening_comprehension": {
      const selected = String(response?.option_id ?? "");
      return (
        <div style={optionGrid(twoColumnOptionLayout, hasMainQuestionImage)}>
          {options.map((option, index) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={locked}
                onClick={() => onChange({ option_id: option.id })}
                style={optionButton(active, locked, hasImageOptions)}
              >
                <span style={optionLetter}>{String.fromCharCode(65 + index)}</span>
                <span style={optionContent}>
                  {option.image_url && (
                    <img
                      src={option.image_url}
                      alt={option.image_alt || option.text || `Option ${index + 1}`}
                      style={optionImage(screenMode, workspaceOpen)}
                    />
                  )}
                  {(!option.image_url || option.show_text_with_image) &&
                    option.text && (
                      <span>
                        <FractionText text={option.text} />
                      </span>
                    )}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case "multiple_select": {
      const selected = new Set(
        Array.isArray(response?.option_ids)
          ? response?.option_ids.map(String)
          : [],
      );

      return (
        <div style={optionGrid(twoColumnOptionLayout, hasMainQuestionImage)}>
          {options.map((option, index) => {
            const active = selected.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  const next = new Set(selected);
                  if (active) next.delete(option.id);
                  else next.add(option.id);
                  onChange({ option_ids: Array.from(next) });
                }}
                style={optionButton(active, locked, hasImageOptions)}
              >
                <span style={optionLetter}>{String.fromCharCode(65 + index)}</span>
                <span style={optionContent}>
                  {option.image_url && (
                    <img
                      src={option.image_url}
                      alt={option.image_alt || option.text || `Option ${index + 1}`}
                      style={optionImage(screenMode, workspaceOpen)}
                    />
                  )}
                  {(!option.image_url || option.show_text_with_image) &&
                    option.text && (
                      <span>
                        <FractionText text={option.text} />
                      </span>
                    )}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case "short_text":
    case "open_cloze":
    case "editing":
    case "picture_description":
      return (
        <input
          value={String(response?.text ?? "")}
          disabled={locked}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Type your answer"
          style={textInput}
        />
      );

    case "long_text":
      return (
        <textarea
          value={String(response?.text ?? "")}
          disabled={locked}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Type your response"
          rows={screenMode === "mobile" ? 4 : 5}
          style={textArea}
        />
      );

    case "sentence_reordering":
      return (
        <SentenceReorderingEditor
          question={question}
          response={response}
          locked={locked}
          onChange={onChange}
        />
      );

    case "matching":
      return (
        <MatchingEditor
          question={question}
          response={response}
          locked={locked}
          onChange={onChange}
        />
      );

    case "word_bank":
    case "dropdown_cloze":
      return (
        <BlankEditor
          question={question}
          response={response}
          locked={locked}
          onChange={onChange}
        />
      );

    case "oral_recording":
      return (
        <div style={noticeBox}>
          This mission expects an uploaded oral recording. The existing recording
          uploader can continue to provide <code>storage_path</code> in the
          response object.
        </div>
      );

    default:
      return null;
  }
}

function SentenceReorderingEditor({
  question,
  response,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const tokens = Array.isArray(question.content.tokens)
    ? question.content.tokens.map((token: any, index: number) => ({
        id: String(token?.id ?? index + 1),
        text: String(token?.text ?? token ?? ""),
      }))
    : [];

  const selectedIds = Array.isArray(response?.token_ids)
    ? response.token_ids.map(String)
    : [];

  const selectedTokens = selectedIds
    .map((id) => tokens.find((token: any) => token.id === id))
    .filter(Boolean) as Array<{ id: string; text: string }>;
  const remainingTokens = tokens.filter(
    (token: any) => !selectedIds.includes(token.id),
  );

  return (
    <div style={editorStack}>
      <div style={reorderAnswerBox}>
        {selectedTokens.length === 0 ? (
          <span style={placeholderText}>Tap the words in the correct order.</span>
        ) : (
          selectedTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              disabled={locked}
              onClick={() =>
                onChange({
                  token_ids: selectedIds.filter((id) => id !== token.id),
                })
              }
              style={chipButton(true, locked)}
            >
              <FractionText text={token.text} />
            </button>
          ))
        )}
      </div>

      <div style={chipWrap}>
        {remainingTokens.map((token: any) => (
          <button
            key={token.id}
            type="button"
            disabled={locked}
            onClick={() =>
              onChange({ token_ids: [...selectedIds, token.id] })
            }
            style={chipButton(false, locked)}
          >
            <FractionText text={token.text} />
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchingEditor({
  question,
  response,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const left = Array.isArray(question.content.left) ? question.content.left : [];
  const right = Array.isArray(question.content.right)
    ? question.content.right
    : [];
  const matches = (response?.matches ?? {}) as Record<string, string>;

  return (
    <div style={editorStack}>
      {left.map((item: any, index: number) => {
        const id = String(item?.id ?? index + 1);
        return (
          <label key={id} style={matchingRow}>
            <span style={matchingLabel}>
              <FractionText text={String(item?.text ?? item)} />
            </span>
            <select
              value={String(matches[id] ?? "")}
              disabled={locked}
              onChange={(event) =>
                onChange({
                  matches: {
                    ...matches,
                    [id]: event.target.value,
                  },
                })
              }
              style={selectInput}
            >
              <option value="">Choose a match</option>
              {right.map((option: any, rightIndex: number) => (
                <option
                  key={String(option?.id ?? rightIndex + 1)}
                  value={String(option?.id ?? rightIndex + 1)}
                >
                  {String(option?.text ?? option)}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function BlankEditor({
  question,
  response,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const blankIds = getBlankIds(question.content);
  const values = (response?.values ?? {}) as Record<string, string>;
  const bank = Array.isArray(question.content.word_bank)
    ? question.content.word_bank.map(String)
    : Array.isArray(question.content.options)
      ? question.content.options.map((option: any) =>
          String(option?.text ?? option?.value ?? option),
        )
      : [];

  return (
    <div style={editorStack}>
      {blankIds.map((blankId, index) => (
        <label key={blankId} style={matchingRow}>
          <span style={matchingLabel}>Blank {index + 1}</span>
          {bank.length > 0 ? (
            <select
              value={String(values[blankId] ?? "")}
              disabled={locked}
              onChange={(event) =>
                onChange({
                  values: { ...values, [blankId]: event.target.value },
                })
              }
              style={selectInput}
            >
              <option value="">Choose a word</option>
              {bank.map((word: string) => (
                <option key={word} value={word}>
                  {word}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={String(values[blankId] ?? "")}
              disabled={locked}
              onChange={(event) =>
                onChange({
                  values: { ...values, [blankId]: event.target.value },
                })
              }
              style={textInput}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function optionGrid(
  twoColumnLayout: boolean,
  hasMainQuestionImage = false,
): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: twoColumnLayout
      ? "repeat(2, minmax(0, 1fr))"
      : "1fr",
    gap: twoColumnLayout ? "8px 10px" : "7px",
    marginTop: hasMainQuestionImage ? "22px" : "8px",
  };
}

function optionButton(
  active: boolean,
  locked: boolean,
  withImage = false,
): CSSProperties {
  return {
    width: "100%",
    minHeight: withImage ? "0" : "44px",
    display: "flex",
    alignItems: "center",
    gap: withImage ? "7px" : "10px",
    padding: withImage ? "7px 8px" : "8px 10px",
    borderRadius: "13px",
    border: active
      ? "1px solid rgba(126,232,255,0.58)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "rgba(83,215,255,0.13)"
      : "rgba(255,255,255,0.04)",
    color: "white",
    textAlign: "left",
    cursor: locked ? "default" : "pointer",
    opacity: locked && !active ? 0.72 : 1,
  };
}

const optionLetter: CSSProperties = {
  flex: "0 0 auto",
  width: "28px",
  height: "28px",
  display: "grid",
  placeItems: "center",
  borderRadius: "9px",
  background: "rgba(126,232,255,0.10)",
  color: "#bff6ff",
  fontWeight: 950,
};

const optionContent: CSSProperties = {
  minWidth: 0,
  flex: 1,
  display: "grid",
  gap: "5px",
  fontSize: "13px",
  lineHeight: 1.35,
};

function optionImage(
  screenMode: ScreenMode,
  workspaceOpen = false,
): CSSProperties {
  const normalHeight =
    screenMode === "mobile" ? 84 : screenMode === "tablet" ? 104 : 116;
  const workspaceHeight = screenMode === "tablet" ? 78 : 92;
  const height = workspaceOpen ? workspaceHeight : normalHeight;

  return {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    height,
    maxHeight: height,
    objectFit: "contain",
    objectPosition: "center",
    borderRadius: "9px",
    background: "rgba(255,255,255,0.96)",
  };
}

const textInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "44px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(0,0,0,0.20)",
  color: "white",
  padding: "0 14px",
  outline: "none",
  fontSize: "15px",
};

const textArea: CSSProperties = {
  ...textInput,
  minHeight: "104px",
  maxHeight: "116px",
  padding: "14px",
  resize: "vertical",
  fontFamily: "inherit",
};

const selectInput: CSSProperties = {
  ...textInput,
  minWidth: "200px",
  cursor: "pointer",
};

const editorStack: CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "8px",
};

const matchingRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(120px,1fr) minmax(180px,1fr)",
  gap: "10px",
  alignItems: "center",
};

const matchingLabel: CSSProperties = {
  color: "rgba(255,255,255,0.74)",
  fontSize: "13px",
  fontWeight: 800,
};

const reorderAnswerBox: CSSProperties = {
  minHeight: "54px",
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
  borderRadius: "16px",
  border: "1px dashed rgba(126,232,255,0.25)",
  background: "rgba(0,0,0,0.12)",
  padding: "8px",
};

const chipWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

function chipButton(selected: boolean, locked: boolean): CSSProperties {
  return {
    minHeight: "34px",
    borderRadius: "12px",
    border: selected
      ? "1px solid rgba(126,232,255,0.42)"
      : "1px solid rgba(255,255,255,0.12)",
    background: selected
      ? "rgba(83,215,255,0.12)"
      : "rgba(255,255,255,0.05)",
    color: "white",
    padding: "0 12px",
    cursor: locked ? "default" : "pointer",
    fontWeight: 800,
  };
}

const placeholderText: CSSProperties = {
  color: "rgba(255,255,255,0.35)",
  fontSize: "13px",
};

const noticeBox: CSSProperties = {
  marginTop: "10px",
  borderRadius: "12px",
  border: "1px solid rgba(52,211,153,0.23)",
  background: "rgba(52,211,153,0.08)",
  color: "#c9f8e8",
  padding: "13px 14px",
  fontSize: "13px",
  lineHeight: 1.5,
};
