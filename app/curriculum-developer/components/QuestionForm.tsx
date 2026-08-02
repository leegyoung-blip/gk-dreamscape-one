"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import MathVisual, {
  normaliseMathVisual,
  type MathVisualData,
} from "@/components/core-math/MathVisual";
import QuestionMediaEditor from "./QuestionMediaEditor";
import {
  emptyQuestionMediaDraft,
  questionMediaDraftFromQuestion,
  type QuestionMediaDraft,
} from "../media";
import type {
  CoreSubject,
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
  media: QuestionMediaDraft;
};

type MultiPartKind = "numeric" | "numeric_unit" | "fraction" | "money";

type MultiPartDraft = {
  id: string;
  label: string;
  prompt: string;
  kind: MultiPartKind;
  answer: string;
  denominator: string;
  unit: string;
  tolerance: string;
};

const COMMON_QUESTION_TYPE_LABELS: Array<[SupportedQuestionType, string]> = [
  ["multiple_choice", "Multiple Choice"],
  ["true_false", "True or False"],
  ["short_text", "Short Answer"],
  ["sentence_reordering", "Arrange in Order"],
];

const MATH_QUESTION_TYPE_LABELS: Array<[SupportedQuestionType, string]> = [
  ["numeric", "Numeric Answer"],
  ["numeric_unit", "Measurement / Answer with Unit"],
  ["fraction", "Fraction Answer"],
  ["money", "Money Answer"],
  ["math_multi_part", "Multi-part Math Problem"],
];

function emptyPart(index: number): MultiPartDraft {
  return {
    id: String.fromCharCode(97 + index),
    label: `Part ${String.fromCharCode(97 + index)}`,
    prompt: "",
    kind: "numeric",
    answer: "",
    denominator: "",
    unit: "",
    tolerance: "0",
  };
}

function parsePairLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, rawValue] = line.split("|");
      return {
        label: String(label || "").trim(),
        value: Number(String(rawValue || "0").trim()),
      };
    })
    .filter((item) => item.label && Number.isFinite(item.value));
}

function formatPairLines(items: unknown) {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => {
      const row = item as Record<string, unknown>;
      return `${String(row.label || "")}|${Number(row.value || 0)}`;
    })
    .join("\n");
}

function parseTableRows(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((cell) => cell.trim()));
}

export default function QuestionForm({
  subject,
  question,
  disabled,
  onSave,
  onCancel,
}: {
  subject: CoreSubject;
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

  const [numericAnswer, setNumericAnswer] = useState("");
  const [numericTolerance, setNumericTolerance] = useState("0");
  const [unit, setUnit] = useState("");
  const [acceptedUnits, setAcceptedUnits] = useState("");
  const [unitRequired, setUnitRequired] = useState(true);
  const [fractionNumerator, setFractionNumerator] = useState("");
  const [fractionDenominator, setFractionDenominator] = useState("");
  const [allowEquivalentFractions, setAllowEquivalentFractions] = useState(true);
  const [moneyAmount, setMoneyAmount] = useState("");
  const [moneyToleranceCents, setMoneyToleranceCents] = useState("0");
  const [multiParts, setMultiParts] = useState<MultiPartDraft[]>([
    emptyPart(0),
    emptyPart(1),
  ]);

  const [mathVisual, setMathVisual] = useState<MathVisualData>({ type: "none" });
  const [media, setMedia] = useState<QuestionMediaDraft>(
    emptyQuestionMediaDraft(),
  );
  const [explanation, setExplanation] = useState("");
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [marks, setMarks] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionTypeOptions = useMemo(() => {
    const list =
      subject === "math"
        ? [...COMMON_QUESTION_TYPE_LABELS, ...MATH_QUESTION_TYPE_LABELS]
        : COMMON_QUESTION_TYPE_LABELS;

    if (question && !list.some(([value]) => value === question.question_type)) {
      return [[question.question_type, question.question_type.replaceAll("_", " ")] as [SupportedQuestionType, string], ...list];
    }

    return list;
  }, [subject, question]);

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
      setNumericAnswer("");
      setNumericTolerance("0");
      setUnit("");
      setAcceptedUnits("");
      setUnitRequired(true);
      setFractionNumerator("");
      setFractionDenominator("");
      setAllowEquivalentFractions(true);
      setMoneyAmount("");
      setMoneyToleranceCents("0");
      setMultiParts([emptyPart(0), emptyPart(1)]);
      setMathVisual({ type: "none" });
      setMedia(emptyQuestionMediaDraft());
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
    setMathVisual(normaliseMathVisual(question.content?.math_visual));
    setMedia(questionMediaDraftFromQuestion(question));

    if (question.question_type === "multiple_choice") {
      const currentOptions = Array.isArray(question.content?.options)
        ? question.content.options.map((option: any) => String(option.text || ""))
        : [];
      setOptions([...currentOptions, "", "", "", ""].slice(0, 4));
      setCorrectOption(String(question.answer_data?.correct_option_ids?.[0] || "a"));
    }

    if (question.question_type === "true_false") {
      setTrueFalseAnswer(String(question.answer_data?.correct_option_ids?.[0] || "true"));
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

    if (question.question_type === "numeric" || question.question_type === "numeric_unit") {
      setNumericAnswer(String(question.answer_data?.value ?? question.answer_data?.accepted_values?.[0] ?? ""));
      setNumericTolerance(String(question.answer_data?.tolerance ?? 0));
      setUnit(String(question.answer_data?.units?.[0] ?? question.answer_data?.unit ?? ""));
      setAcceptedUnits(
        Array.isArray(question.answer_data?.units)
          ? question.answer_data.units.join("\n")
          : String(question.answer_data?.unit || ""),
      );
      setUnitRequired(question.answer_data?.unit_required !== false);
    }

    if (question.question_type === "fraction") {
      setFractionNumerator(String(question.answer_data?.numerator ?? ""));
      setFractionDenominator(String(question.answer_data?.denominator ?? ""));
      setAllowEquivalentFractions(question.answer_data?.allow_equivalent !== false);
    }

    if (question.question_type === "money") {
      setMoneyAmount(
        question.answer_data?.amount_cents === undefined
          ? ""
          : (Number(question.answer_data.amount_cents) / 100).toFixed(2),
      );
      setMoneyToleranceCents(String(question.answer_data?.tolerance_cents ?? 0));
    }

    if (question.question_type === "math_multi_part") {
      const contentParts = Array.isArray(question.content?.parts)
        ? question.content.parts
        : [];
      const answerParts = question.answer_data?.parts || {};
      setMultiParts(
        contentParts.map((part: any, index: number) => {
          const id = String(part.id || String.fromCharCode(97 + index));
          const answer = answerParts[id] || {};
          const kind = String(answer.kind || part.input_type || "numeric") as MultiPartKind;
          return {
            id,
            label: String(part.label || `Part ${id}`),
            prompt: String(part.prompt || ""),
            kind,
            answer:
              kind === "money"
                ? (Number(answer.amount_cents || 0) / 100).toFixed(2)
                : String(answer.value ?? answer.numerator ?? ""),
            denominator: String(answer.denominator ?? ""),
            unit: String(answer.units?.[0] ?? answer.unit ?? part.unit ?? ""),
            tolerance: String(answer.tolerance ?? answer.tolerance_cents ?? 0),
          };
        }),
      );
    }
  }, [question]);

  useEffect(() => {
    if (!question && subject === "english" && MATH_QUESTION_TYPE_LABELS.some(([value]) => value === questionType)) {
      setQuestionType("multiple_choice");
    }
  }, [subject, question, questionType]);

  const title = useMemo(
    () => (question ? `Edit ${question.code}` : "Add Question"),
    [question],
  );

  function withVisual(content: JsonObject) {
    if (subject !== "math" || mathVisual.type === "none") return content;
    return { ...content, math_visual: mathVisual };
  }

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
        display_answer: cleanOptions[Math.max(0, correctOption.charCodeAt(0) - 97)],
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
        setError("Enter at least two items, one per line.");
        return;
      }
      const tokens = parts.map((text, index) => ({
        id: `t${index + 1}`,
        text,
      }));
      content = { tokens };
      answerData = {
        order: tokens.map((token) => token.id),
        display_answer: parts.join(" → "),
      };
    }

    if (questionType === "numeric" || questionType === "numeric_unit") {
      const value = Number(numericAnswer);
      const tolerance = Number(numericTolerance || 0);
      if (!Number.isFinite(value) || !Number.isFinite(tolerance) || tolerance < 0) {
        setError("Enter a valid numeric answer and non-negative tolerance.");
        return;
      }

      const units = acceptedUnits
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (questionType === "numeric_unit" && units.length === 0 && unit.trim()) {
        units.push(unit.trim());
      }
      if (questionType === "numeric_unit" && units.length === 0) {
        setError("Enter at least one accepted unit.");
        return;
      }

      content = {
        response: {
          input_type: "number",
          unit_input: questionType === "numeric_unit",
          placeholder: "Enter your answer",
        },
      };
      answerData = {
        kind: questionType,
        value,
        tolerance,
        units,
        unit_required: questionType === "numeric_unit" ? unitRequired : false,
        display_answer:
          questionType === "numeric_unit"
            ? `${value} ${units[0]}`
            : String(value),
      };
    }

    if (questionType === "fraction") {
      const numerator = Number(fractionNumerator);
      const denominator = Number(fractionDenominator);
      if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
        setError("Enter a valid integer numerator and a non-zero denominator.");
        return;
      }
      content = { response: { input_type: "fraction" } };
      answerData = {
        kind: "fraction",
        numerator,
        denominator,
        allow_equivalent: allowEquivalentFractions,
        display_answer: `${numerator}/${denominator}`,
      };
    }

    if (questionType === "money") {
      const amount = Number(moneyAmount);
      const toleranceCents = Number(moneyToleranceCents || 0);
      if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(toleranceCents) || toleranceCents < 0) {
        setError("Enter a valid money amount and tolerance in cents.");
        return;
      }
      const amountCents = Math.round(amount * 100);
      content = { response: { input_type: "money", currency: "SGD" } };
      answerData = {
        kind: "money",
        amount_cents: amountCents,
        tolerance_cents: toleranceCents,
        currency: "SGD",
        display_answer: `$${(amountCents / 100).toFixed(2)}`,
      };
    }

    if (questionType === "math_multi_part") {
      if (multiParts.length < 2) {
        setError("A multi-part problem needs at least two parts.");
        return;
      }

      const answerParts: Record<string, JsonObject> = {};
      const contentParts: JsonObject[] = [];
      const displayParts: string[] = [];

      for (const part of multiParts) {
        if (!part.prompt.trim()) {
          setError(`Enter the prompt for ${part.label || part.id}.`);
          return;
        }

        const id = part.id;
        const tolerance = Number(part.tolerance || 0);
        if (!Number.isFinite(tolerance) || tolerance < 0) {
          setError(`Enter a valid tolerance for ${part.label || id}.`);
          return;
        }

        if (part.kind === "fraction") {
          const numerator = Number(part.answer);
          const denominator = Number(part.denominator);
          if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
            setError(`Enter a valid fraction answer for ${part.label || id}.`);
            return;
          }
          answerParts[id] = {
            kind: "fraction",
            numerator,
            denominator,
            allow_equivalent: true,
          };
          displayParts.push(`${part.label}: ${numerator}/${denominator}`);
        } else if (part.kind === "money") {
          const amount = Number(part.answer);
          if (!Number.isFinite(amount) || amount < 0) {
            setError(`Enter a valid money answer for ${part.label || id}.`);
            return;
          }
          const amountCents = Math.round(amount * 100);
          answerParts[id] = {
            kind: "money",
            amount_cents: amountCents,
            tolerance_cents: Math.round(tolerance),
          };
          displayParts.push(`${part.label}: $${(amountCents / 100).toFixed(2)}`);
        } else {
          const value = Number(part.answer);
          if (!Number.isFinite(value)) {
            setError(`Enter a valid numeric answer for ${part.label || id}.`);
            return;
          }
          const units = part.unit.trim() ? [part.unit.trim()] : [];
          if (part.kind === "numeric_unit" && units.length === 0) {
            setError(`Enter the unit for ${part.label || id}.`);
            return;
          }
          answerParts[id] = {
            kind: part.kind,
            value,
            tolerance,
            units,
            unit_required: part.kind === "numeric_unit",
          };
          displayParts.push(
            `${part.label}: ${value}${units.length > 0 ? ` ${units[0]}` : ""}`,
          );
        }

        contentParts.push({
          id,
          label: part.label.trim() || `Part ${id}`,
          prompt: part.prompt.trim(),
          input_type: part.kind,
          unit: part.unit.trim() || null,
        });
      }

      content = { parts: contentParts };
      answerData = {
        parts: answerParts,
        display_answer: displayParts.join("; "),
      };
    }

    content = withVisual(content);

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
        media,
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
            {questionTypeOptions.map(([value, label]) => (
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
          Correct items — one number, word or phrase per line
          <textarea
            value={reorderParts}
            disabled={disabled}
            onChange={(event) => setReorderParts(event.target.value)}
            rows={6}
            style={textArea}
          />
        </label>
      )}

      {(questionType === "numeric" || questionType === "numeric_unit") && (
        <div style={formGrid}>
          <label style={fieldLabel}>
            Correct numeric value
            <input
              type="number"
              step="any"
              value={numericAnswer}
              disabled={disabled}
              onChange={(event) => setNumericAnswer(event.target.value)}
              style={input}
            />
          </label>
          <label style={fieldLabel}>
            Accepted tolerance
            <input
              type="number"
              min="0"
              step="any"
              value={numericTolerance}
              disabled={disabled}
              onChange={(event) => setNumericTolerance(event.target.value)}
              style={input}
            />
          </label>
          {questionType === "numeric_unit" && (
            <>
              <label style={fieldLabel}>
                Main unit
                <input
                  value={unit}
                  disabled={disabled}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="e.g. cm"
                  style={input}
                />
              </label>
              <label style={fieldLabel}>
                Accepted units — one per line
                <textarea
                  value={acceptedUnits}
                  disabled={disabled}
                  onChange={(event) => setAcceptedUnits(event.target.value)}
                  rows={3}
                  placeholder={"cm\ncentimetres"}
                  style={textArea}
                />
              </label>
              <label style={checkLabel}>
                <input
                  type="checkbox"
                  checked={unitRequired}
                  disabled={disabled}
                  onChange={(event) => setUnitRequired(event.target.checked)}
                />
                Unit is required
              </label>
            </>
          )}
        </div>
      )}

      {questionType === "fraction" && (
        <div style={formGrid}>
          <label style={fieldLabel}>
            Correct numerator
            <input
              type="number"
              step="1"
              value={fractionNumerator}
              disabled={disabled}
              onChange={(event) => setFractionNumerator(event.target.value)}
              style={input}
            />
          </label>
          <label style={fieldLabel}>
            Correct denominator
            <input
              type="number"
              step="1"
              value={fractionDenominator}
              disabled={disabled}
              onChange={(event) => setFractionDenominator(event.target.value)}
              style={input}
            />
          </label>
          <label style={checkLabel}>
            <input
              type="checkbox"
              checked={allowEquivalentFractions}
              disabled={disabled}
              onChange={(event) => setAllowEquivalentFractions(event.target.checked)}
            />
            Accept equivalent fractions
          </label>
        </div>
      )}

      {questionType === "money" && (
        <div style={formGrid}>
          <label style={fieldLabel}>
            Correct SGD amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={moneyAmount}
              disabled={disabled}
              onChange={(event) => setMoneyAmount(event.target.value)}
              placeholder="4.50"
              style={input}
            />
          </label>
          <label style={fieldLabel}>
            Tolerance in cents
            <input
              type="number"
              min="0"
              step="1"
              value={moneyToleranceCents}
              disabled={disabled}
              onChange={(event) => setMoneyToleranceCents(event.target.value)}
              style={input}
            />
          </label>
        </div>
      )}

      {questionType === "math_multi_part" && (
        <div style={subPanel}>
          <div style={headingRow}>
            <div>
              <p style={eyebrow}>MULTI-PART ANSWERS</p>
              <h4 style={{ margin: "4px 0 0" }}>Add two to four related parts</h4>
            </div>
            <button
              type="button"
              disabled={disabled || multiParts.length >= 4}
              onClick={() => setMultiParts((current) => [...current, emptyPart(current.length)])}
              style={ghostButton}
            >
              + Add Part
            </button>
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
            {multiParts.map((part, index) => (
              <div key={part.id} style={partCard}>
                <div style={formGrid}>
                  <label style={fieldLabel}>
                    Label
                    <input
                      value={part.label}
                      disabled={disabled}
                      onChange={(event) =>
                        setMultiParts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value } : item,
                          ),
                        )
                      }
                      style={input}
                    />
                  </label>
                  <label style={fieldLabel}>
                    Answer type
                    <select
                      value={part.kind}
                      disabled={disabled}
                      onChange={(event) =>
                        setMultiParts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, kind: event.target.value as MultiPartKind }
                              : item,
                          ),
                        )
                      }
                      style={input}
                    >
                      <option value="numeric">Number</option>
                      <option value="numeric_unit">Number with unit</option>
                      <option value="fraction">Fraction</option>
                      <option value="money">Money</option>
                    </select>
                  </label>
                </div>

                <label style={fieldLabel}>
                  Part prompt
                  <input
                    value={part.prompt}
                    disabled={disabled}
                    onChange={(event) =>
                      setMultiParts((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, prompt: event.target.value } : item,
                        ),
                      )
                    }
                    style={input}
                  />
                </label>

                <div style={formGrid}>
                  <label style={fieldLabel}>
                    {part.kind === "money" ? "Amount" : part.kind === "fraction" ? "Numerator" : "Answer"}
                    <input
                      type="number"
                      step={part.kind === "money" ? "0.01" : "any"}
                      value={part.answer}
                      disabled={disabled}
                      onChange={(event) =>
                        setMultiParts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, answer: event.target.value } : item,
                          ),
                        )
                      }
                      style={input}
                    />
                  </label>
                  {part.kind === "fraction" && (
                    <label style={fieldLabel}>
                      Denominator
                      <input
                        type="number"
                        step="1"
                        value={part.denominator}
                        disabled={disabled}
                        onChange={(event) =>
                          setMultiParts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, denominator: event.target.value }
                                : item,
                            ),
                          )
                        }
                        style={input}
                      />
                    </label>
                  )}
                  {part.kind === "numeric_unit" && (
                    <label style={fieldLabel}>
                      Unit
                      <input
                        value={part.unit}
                        disabled={disabled}
                        onChange={(event) =>
                          setMultiParts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, unit: event.target.value } : item,
                            ),
                          )
                        }
                        style={input}
                      />
                    </label>
                  )}
                  {part.kind !== "fraction" && (
                    <label style={fieldLabel}>
                      {part.kind === "money" ? "Tolerance (cents)" : "Tolerance"}
                      <input
                        type="number"
                        min="0"
                        step={part.kind === "money" ? "1" : "any"}
                        value={part.tolerance}
                        disabled={disabled}
                        onChange={(event) =>
                          setMultiParts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, tolerance: event.target.value } : item,
                            ),
                          )
                        }
                        style={input}
                      />
                    </label>
                  )}
                </div>

                {multiParts.length > 2 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setMultiParts((current) =>
                        current
                          .filter((_, itemIndex) => itemIndex !== index)
                          .map((item, itemIndex) => ({
                            ...item,
                            id: String.fromCharCode(97 + itemIndex),
                          })),
                      )
                    }
                    style={{ ...ghostButton, color: "#fecaca", marginTop: "10px" }}
                  >
                    Remove Part
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <QuestionMediaEditor
        value={media}
        questionType={questionType}
        optionLabels={options}
        disabled={disabled}
        onChange={setMedia}
      />

      {subject === "math" && (
        <MathVisualEditor
          value={mathVisual}
          disabled={disabled}
          onChange={setMathVisual}
        />
      )}

      <div style={formGrid}>
        <label style={fieldLabel}>
          Skill label
          <input
            value={skill}
            disabled={disabled}
            onChange={(event) => setSkill(event.target.value)}
            placeholder={subject === "math" ? "e.g. Addition within 100" : "e.g. Common nouns"}
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

function MathVisualEditor({
  value,
  disabled,
  onChange,
}: {
  value: MathVisualData;
  disabled: boolean;
  onChange: (value: MathVisualData) => void;
}) {
  function setField(key: string, nextValue: unknown) {
    onChange({ ...(value as JsonObject), [key]: nextValue } as MathVisualData);
  }

  return (
    <div style={subPanel}>
      <p style={eyebrow}>OPTIONAL MATH VISUAL</p>
      <div style={formGrid}>
        <label style={fieldLabel}>
          Visual type
          <select
            value={value.type}
            disabled={disabled}
            onChange={(event) => {
              const type = event.target.value;
              if (type === "number_line") onChange({ type, min: 0, max: 10, step: 1, highlight: null });
              else if (type === "rectangle") onChange({ type, length: 8, width: 5, unit: "cm", show_dimensions: true });
              else if (type === "fraction_bar") onChange({ type, numerator: 1, denominator: 2 });
              else if (type === "clock") onChange({ type, hour: 3, minute: 0 });
              else if (type === "bar_model") onChange({ type, segments: [{ label: "A", value: 3 }, { label: "B", value: 5 }] });
              else if (type === "table") onChange({ type, columns: ["Item", "Number"], rows: [["A", "3"], ["B", "5"]] });
              else if (type === "bar_graph") onChange({ type, items: [{ label: "A", value: 3 }, { label: "B", value: 5 }], y_label: "Number" });
              else onChange({ type: "none" });
            }}
            style={input}
          >
            <option value="none">No visual</option>
            <option value="number_line">Number line</option>
            <option value="rectangle">Rectangle</option>
            <option value="fraction_bar">Fraction bar</option>
            <option value="clock">Analogue clock</option>
            <option value="bar_model">Bar model</option>
            <option value="table">Table</option>
            <option value="bar_graph">Bar graph</option>
          </select>
        </label>
      </div>

      {value.type === "number_line" && (
        <div style={formGrid}>
          <NumberInput label="Minimum" value={value.min} disabled={disabled} onChange={(next) => setField("min", next)} />
          <NumberInput label="Maximum" value={value.max} disabled={disabled} onChange={(next) => setField("max", next)} />
          <NumberInput label="Step" value={value.step} disabled={disabled} onChange={(next) => setField("step", next)} />
          <label style={fieldLabel}>
            Highlight value (optional)
            <input
              type="number"
              step="any"
              value={value.highlight ?? ""}
              disabled={disabled}
              onChange={(event) => setField("highlight", event.target.value === "" ? null : Number(event.target.value))}
              style={input}
            />
          </label>
        </div>
      )}

      {value.type === "rectangle" && (
        <div style={formGrid}>
          <NumberInput label="Length" value={value.length} disabled={disabled} onChange={(next) => setField("length", next)} />
          <NumberInput label="Width" value={value.width} disabled={disabled} onChange={(next) => setField("width", next)} />
          <label style={fieldLabel}>
            Unit
            <input value={value.unit || ""} disabled={disabled} onChange={(event) => setField("unit", event.target.value)} style={input} />
          </label>
          <label style={checkLabel}>
            <input type="checkbox" checked={value.show_dimensions !== false} disabled={disabled} onChange={(event) => setField("show_dimensions", event.target.checked)} />
            Show dimensions
          </label>
        </div>
      )}

      {value.type === "fraction_bar" && (
        <div style={formGrid}>
          <NumberInput label="Shaded parts" value={value.numerator} disabled={disabled} onChange={(next) => setField("numerator", next)} integer />
          <NumberInput label="Total parts" value={value.denominator} disabled={disabled} onChange={(next) => setField("denominator", next)} integer />
        </div>
      )}

      {value.type === "clock" && (
        <div style={formGrid}>
          <NumberInput label="Hour" value={value.hour} disabled={disabled} onChange={(next) => setField("hour", next)} integer />
          <NumberInput label="Minute" value={value.minute} disabled={disabled} onChange={(next) => setField("minute", next)} integer />
        </div>
      )}

      {value.type === "bar_model" && (
        <label style={fieldLabel}>
          Segments — one per line as Label|Value
          <textarea
            value={formatPairLines(value.segments)}
            disabled={disabled}
            onChange={(event) => setField("segments", parsePairLines(event.target.value))}
            rows={4}
            style={textArea}
          />
        </label>
      )}

      {value.type === "table" && (
        <>
          <label style={fieldLabel}>
            Column headings — separate with |
            <input
              value={value.columns.join("|")}
              disabled={disabled}
              onChange={(event) => setField("columns", event.target.value.split("|").map((item) => item.trim()))}
              style={input}
            />
          </label>
          <label style={fieldLabel}>
            Rows — one row per line, separate cells with |
            <textarea
              value={value.rows.map((row) => row.join("|")).join("\n")}
              disabled={disabled}
              onChange={(event) => setField("rows", parseTableRows(event.target.value))}
              rows={5}
              style={textArea}
            />
          </label>
        </>
      )}

      {value.type === "bar_graph" && (
        <>
          <label style={fieldLabel}>
            Bars — one per line as Label|Value
            <textarea
              value={formatPairLines(value.items)}
              disabled={disabled}
              onChange={(event) => setField("items", parsePairLines(event.target.value))}
              rows={4}
              style={textArea}
            />
          </label>
          <label style={fieldLabel}>
            Vertical-axis label
            <input value={value.y_label || ""} disabled={disabled} onChange={(event) => setField("y_label", event.target.value)} style={input} />
          </label>
        </>
      )}

      {value.type !== "none" && <MathVisual visual={value} compact />}
    </div>
  );
}

function NumberInput({
  label,
  value,
  disabled,
  integer = false,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  integer?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label style={fieldLabel}>
      {label}
      <input
        type="number"
        step={integer ? 1 : "any"}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={input}
      />
    </label>
  );
}

const panel: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.23)",
  background: "rgba(4,20,48,0.62)",
  padding: "16px",
};
const subPanel: CSSProperties = {
  marginTop: "14px",
  borderRadius: "15px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(255,255,255,0.035)",
  padding: "13px",
};
const partCard: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(3,14,34,0.54)",
  padding: "12px",
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
const checkLabel: CSSProperties = {
  marginTop: "12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
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
};
