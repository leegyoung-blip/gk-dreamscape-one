"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  JsonObject,
  LinkedQuestion,
  SupportedQuestionType,
} from "../types";

export type QuestionPayload = {
  questionId: string | null;
  questionType: SupportedQuestionType;
  instruction: string;
  prompt: string;
  content: JsonObject;
  answerData: JsonObject;
  explanation: JsonObject;
  skill: string;
  difficulty: number;
  marks: number;
};

const QUESTION_TYPE_LABELS: Record<SupportedQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True or False",
  short_text: "Short Answer",
  sentence_reordering: "Sentence Reordering",
};

export default function QuestionForm({
  question,
  disabled,
  onSave,
  onCancel,
}: {
  question: LinkedQuestion | null;
  disabled: boolean;
  onSave: (payload: QuestionPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [questionType, setQuestionType] =
    useState<SupportedQuestionType>("multiple_choice");
  const [instruction, setInstruction] = useState("Choose the correct answer.");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState("a");
  const [trueFalseAnswer, setTrueFalseAnswer] = useState("true");
  const [acceptedAnswers, setAcceptedAnswers] = useState("");
  const [reorderParts, setReorderParts] = useState("");
  const [explanation, setExplanation] = useState("");
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [marks, setMarks] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!question) {
      setQuestionType("multiple_choice");
      setInstruction("Choose the correct answer.");
      setPrompt("");
      setOptions(["", "", "", ""]);
      setCorrectOption("a");
      setTrueFalseAnswer("true");
      setAcceptedAnswers("");
      setReorderParts("");
      setExplanation("");
      setSkill("");
      setDifficulty(1);
      setMarks(1);
      setError(null);
      return;
    }

    setQuestionType(question.question_type);
    setInstruction(question.instruction || "");
    setPrompt(question.prompt);
    setExplanation(String(question.explanation?.student || ""));
    setSkill(question.skill || "");
    setDifficulty(Number(question.difficulty || 1));
    setMarks(Number(question.marks || 1));

    if (question.question_type === "multiple_choice") {
      const currentOptions = Array.isArray(question.content?.options)
        ? question.content.options.map((option: any) => String(option.text || ""))
        : [];
      setOptions([...currentOptions, "", "", "", ""].slice(0, 4));
      setCorrectOption(
        String(question.answer_data?.correct_option_ids?.[0] || "a"),
      );
    }

    if (question.question_type === "true_false") {
      setTrueFalseAnswer(
        String(question.answer_data?.correct_option_ids?.[0] || "true"),
      );
    }

    if (question.question_type === "short_text") {
      setAcceptedAnswers(
        Array.isArray(question.answer_data?.accepted_answers)
          ? question.answer_data.accepted_answers.join("\n")
          : "",
      );
    }

    if (question.question_type === "sentence_reordering") {
      const tokens = Array.isArray(question.content?.tokens)
        ? question.content.tokens
        : [];
      const tokenMap = new Map(
        tokens.map((token: any) => [String(token.id), String(token.text || "")]),
      );
      const order = Array.isArray(question.answer_data?.order)
        ? question.answer_data.order.map(String)
        : [];
      setReorderParts(order.map((id: string) => tokenMap.get(id) || "").join("\n"));
    }
  }, [question]);

  const title = useMemo(
    () => (question ? `Edit ${question.code}` : "Add Question"),
    [question],
  );

  async function handleSave() {
    setError(null);

    if (!prompt.trim()) {
      setError("Enter the question prompt.");
      return;
    }
    if (!explanation.trim()) {
      setError("Enter a student explanation.");
      return;
    }

    let content: JsonObject = {};
    let answerData: JsonObject = {};

    if (questionType === "multiple_choice") {
      const cleanOptions = options.map((option) => option.trim());
      if (cleanOptions.some((option) => !option)) {
        setError("Enter all four answer options.");
        return;
      }
      content = {
        options: cleanOptions.map((text, index) => ({
          id: String.fromCharCode(97 + index),
          text,
        })),
      };
      answerData = {
        correct_option_ids: [correctOption],
        display_answer:
          cleanOptions[Math.max(0, correctOption.charCodeAt(0) - 97)],
      };
    }

    if (questionType === "true_false") {
      content = {
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
      };
      answerData = {
        correct_option_ids: [trueFalseAnswer],
        display_answer: trueFalseAnswer === "true" ? "True" : "False",
      };
    }

    if (questionType === "short_text") {
      const answers = acceptedAnswers
        .split("\n")
        .map((answer) => answer.trim())
        .filter(Boolean);
      if (answers.length === 0) {
        setError("Enter at least one accepted answer.");
        return;
      }
      content = { placeholder: "Type your answer" };
      answerData = {
        accepted_answers: answers,
        case_sensitive: false,
        display_answer: answers[0],
      };
    }

    if (questionType === "sentence_reordering") {
      const parts = reorderParts
        .split("\n")
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length < 2) {
        setError("Enter at least two sentence parts, one per line.");
        return;
      }
      const tokens = parts.map((text, index) => ({
        id: `t${index + 1}`,
        text,
      }));
      content = { tokens };
      answerData = {
        order: tokens.map((token) => token.id),
        display_answer: parts.join(" "),
      };
    }

    setSaving(true);
    try {
      await onSave({
        questionId: question?.id || null,
        questionType,
        instruction,
        prompt,
        content,
        answerData,
        explanation: { student: explanation },
        skill,
        difficulty,
        marks,
      });
    } catch (saveError: any) {
      setError(saveError?.message || "Could not save this question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={panel}>
      <div style={headingRow}>
        <div>
          <p style={eyebrow}>QUESTION EDITOR</p>
          <h3 style={titleStyle}>{title}</h3>
        </div>
        {question && (
          <button type="button" onClick={onCancel} style={ghostButton}>
            Cancel Edit
          </button>
        )}
      </div>

      <div style={formGrid}>
        <label style={fieldLabel}>
          Question type
          <select
            value={questionType}
            disabled={disabled || Boolean(question)}
            onChange={(event) =>
              setQuestionType(event.target.value as SupportedQuestionType)
            }
            style={input}
          >
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldLabel}>
          Difficulty
          <select
            value={difficulty}
            disabled={disabled}
            onChange={(event) => setDifficulty(Number(event.target.value))}
            style={input}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldLabel}>
          Marks
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={marks}
            disabled={disabled}
            onChange={(event) => setMarks(Number(event.target.value))}
            style={input}
          />
        </label>
      </div>

      <label style={fieldLabel}>
        Instruction
        <input
          value={instruction}
          disabled={disabled}
          onChange={(event) => setInstruction(event.target.value)}
          style={input}
        />
      </label>

      <label style={fieldLabel}>
        Question prompt
        <textarea
          value={prompt}
          disabled={disabled}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          style={textArea}
        />
      </label>

      {questionType === "multiple_choice" && (
        <div style={optionGrid}>
          {options.map((option, index) => {
            const optionId = String.fromCharCode(97 + index);
            return (
              <label key={optionId} style={optionField}>
                <span style={optionLetter}>{optionId.toUpperCase()}</span>
                <input
                  value={option}
                  disabled={disabled}
                  onChange={(event) =>
                    setOptions((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                  style={{ ...input, flex: 1 }}
                />
                <input
                  type="radio"
                  name="correct-option"
                  value={optionId}
                  checked={correctOption === optionId}
                  disabled={disabled}
                  onChange={() => setCorrectOption(optionId)}
                  aria-label={`Set option ${optionId.toUpperCase()} as correct`}
                />
              </label>
            );
          })}
          <p style={helperText}>Select the radio button beside the correct answer.</p>
        </div>
      )}

      {questionType === "true_false" && (
        <label style={fieldLabel}>
          Correct answer
          <select
            value={trueFalseAnswer}
            disabled={disabled}
            onChange={(event) => setTrueFalseAnswer(event.target.value)}
            style={input}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </label>
      )}

      {questionType === "short_text" && (
        <label style={fieldLabel}>
          Accepted answers — one per line
          <textarea
            value={acceptedAnswers}
            disabled={disabled}
            onChange={(event) => setAcceptedAnswers(event.target.value)}
            rows={4}
            style={textArea}
          />
        </label>
      )}

      {questionType === "sentence_reordering" && (
        <label style={fieldLabel}>
          Correct sentence parts — one word or phrase per line
          <textarea
            value={reorderParts}
            disabled={disabled}
            onChange={(event) => setReorderParts(event.target.value)}
            rows={6}
            style={textArea}
          />
        </label>
      )}

      <div style={formGrid}>
        <label style={fieldLabel}>
          Skill label
          <input
            value={skill}
            disabled={disabled}
            onChange={(event) => setSkill(event.target.value)}
            placeholder="e.g. Common nouns"
            style={input}
          />
        </label>
      </div>

      <label style={fieldLabel}>
        Student explanation
        <textarea
          value={explanation}
          disabled={disabled}
          onChange={(event) => setExplanation(event.target.value)}
          rows={3}
          style={textArea}
        />
      </label>

      {error && <div style={errorBanner}>{error}</div>}

      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => void handleSave()}
        style={{ ...primaryButton, opacity: disabled || saving ? 0.45 : 1 }}
      >
        {saving ? "Saving Question..." : question ? "Update Question" : "Add Question"}
      </button>
    </section>
  );
}

const panel: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.23)",
  background: "rgba(4,20,48,0.62)",
  padding: "16px",
};
const headingRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.14em",
  fontWeight: 900,
};
const titleStyle: CSSProperties = { margin: "4px 0 0", fontSize: "20px" };
const formGrid: CSSProperties = {
  marginTop: "13px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: "10px",
};
const fieldLabel: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gap: "6px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "11px",
  fontWeight: 800,
};
const input: CSSProperties = {
  minHeight: "40px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.23)",
  background: "rgba(255,255,255,0.065)",
  color: "white",
  padding: "8px 10px",
};
const textArea: CSSProperties = { ...input, resize: "vertical" };
const optionGrid: CSSProperties = { marginTop: "12px", display: "grid", gap: "8px" };
const optionField: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
const optionLetter: CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  background: "rgba(126,232,255,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};
const helperText: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.48)",
  fontSize: "10px",
};
const primaryButton: CSSProperties = {
  marginTop: "14px",
  minHeight: "42px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  color: "white",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};
const ghostButton: CSSProperties = {
  minHeight: "36px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "0 12px",
  cursor: "pointer",
};
const errorBanner: CSSProperties = {
  marginTop: "12px",
  borderRadius: "10px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "10px",
  fontSize: "11px",
};
