"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import QuestionMediaEditor from "@/app/curriculum-developer/components/QuestionMediaEditor";
import {
  emptyQuestionMediaDraft,
  syncQuestionMedia,
  type QuestionMediaDraft,
} from "@/app/curriculum-developer/media";
import type { SupportedQuestionType } from "@/app/curriculum-developer/types";
import FractionText, {
  hasRenderableFraction,
} from "@/components/core-missions/FractionText";

type CoreSubject = "english" | "math";
type JsonObject = Record<string, any>;
type AddMode = "standard" | "split_comprehension" | "grouped_cloze";

type AppendResult = {
  ok: boolean;
  question_id: string;
  question_code: string;
  question_order: number;
  question_count: number;
  primary_level: number;
  previous_visibility: string;
  student_visibility: string;
  verification_reset: boolean;
};

type StandardQuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_text"
  | "sentence_reordering"
  | "numeric"
  | "numeric_unit"
  | "fraction"
  | "money";

const GENERAL_TYPES: Array<[StandardQuestionType, string]> = [
  ["multiple_choice", "Multiple Choice"],
  ["multiple_select", "Multiple Select"],
  ["true_false", "True or False"],
  ["short_text", "Short Answer"],
  ["sentence_reordering", "Arrange in Order"],
];

const MATH_TYPES: Array<[StandardQuestionType, string]> = [
  ["numeric", "Numeric Answer"],
  ["numeric_unit", "Measurement + Unit"],
  ["fraction", "Fraction Answer"],
  ["money", "Money (SGD)"],
];

export default function AddCoreQuestionEditor({
  subject,
  quizId,
  quizTitle,
  mode,
  templateContent,
  templateInstruction,
  existingBlankIds,
  onClose,
  onAdded,
}: {
  subject: CoreSubject;
  quizId: string;
  quizTitle: string;
  mode: AddMode;
  templateContent?: JsonObject;
  templateInstruction?: string | null;
  existingBlankIds?: string[];
  onClose: () => void;
  onAdded: (questionId: string, warning?: string) => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Add question">
      <div style={modal}>
        <header style={header}>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrow}>INLINE CURRICULUM EDITOR</p>
            <h2 style={title}>+ Add Question</h2>
            <p style={meta}>{quizTitle}</p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            style={closeButton}
          >
            ✕ Close
          </button>
        </header>

        <div style={verificationNotice}>
          Adding a question changes a Gold / human-verified quiz back to Blue so
          it can be reviewed again. If another learner currently has this quiz
          open, Dreamscape will block the structural change rather than alter
          that learner&apos;s active attempt.
        </div>

        {error ? <div style={errorCard}>{error}</div> : null}

        {mode === "grouped_cloze" ? (
          <GroupedClozeAddForm
            subject={subject}
            quizId={quizId}
            templateContent={templateContent || {}}
            templateInstruction={templateInstruction || ""}
            existingBlankIds={existingBlankIds || []}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            onAdded={onAdded}
          />
        ) : (
          <StandardAddForm
            subject={subject}
            quizId={quizId}
            mode={mode}
            templateContent={templateContent || {}}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            onAdded={onAdded}
          />
        )}
      </div>
    </div>
  );
}

function StandardAddForm({
  subject,
  quizId,
  mode,
  templateContent,
  saving,
  setSaving,
  setError,
  onAdded,
}: {
  subject: CoreSubject;
  quizId: string;
  mode: "standard" | "split_comprehension";
  templateContent: JsonObject;
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  onAdded: (questionId: string, warning?: string) => Promise<void> | void;
}) {
  const [questionType, setQuestionType] = useState<StandardQuestionType>(
    "multiple_choice",
  );
  const [instruction, setInstruction] = useState("Choose the correct answer.");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOptionId, setCorrectOptionId] = useState("a");
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(["a"]);
  const [acceptedAnswers, setAcceptedAnswers] = useState("");
  const [reorderLines, setReorderLines] = useState("");
  const [numericValue, setNumericValue] = useState("");
  const [numericTolerance, setNumericTolerance] = useState("0");
  const [acceptedUnits, setAcceptedUnits] = useState("");
  const [fractionNumerator, setFractionNumerator] = useState("");
  const [fractionDenominator, setFractionDenominator] = useState("");
  const [moneyAmount, setMoneyAmount] = useState("");
  const [moneyToleranceCents, setMoneyToleranceCents] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [marks, setMarks] = useState(1);
  const [mediaDraft, setMediaDraft] = useState<QuestionMediaDraft>(() =>
    emptyQuestionMediaDraft(),
  );

  const effectiveType: StandardQuestionType =
    mode === "split_comprehension" ? "multiple_choice" : questionType;

  const effectiveOptions = useMemo(() => {
    if (effectiveType === "true_false") return ["True", "False"];
    return options;
  }, [effectiveType, options]);

  async function save() {
    setError(null);

    if (!prompt.trim()) {
      setError("Question prompt cannot be empty.");
      return;
    }
    if (!explanation.trim()) {
      setError("Enter the student explanation before adding the question.");
      return;
    }
    if (difficulty < 1 || difficulty > 5) {
      setError("Difficulty must be from 1 to 5.");
      return;
    }
    if (!Number.isFinite(marks) || marks <= 0) {
      setError("Marks must be greater than zero.");
      return;
    }

    let content: JsonObject = {};
    let answerData: JsonObject = {};

    if (
      effectiveType === "multiple_choice" ||
      effectiveType === "multiple_select" ||
      effectiveType === "true_false"
    ) {
      const optionRows = effectiveOptions.map((text, index) => {
        const id = String.fromCharCode(97 + index);
        return { id, text: text.trim() };
      });

      const missing = optionRows.some((option) => !option.text);

      if (missing) {
        setError(
          "Enter text for every new answer option. You can still attach option images, and then hide the text later if you want an image-only learner view.",
        );
        return;
      }

      let selectedIds: string[];
      if (effectiveType === "multiple_select") {
        const validIds = new Set(optionRows.map((option) => option.id));
        selectedIds = correctOptionIds.filter((id) => validIds.has(id));
        if (selectedIds.length === 0) {
          setError("Choose at least one correct answer.");
          return;
        }
      } else {
        selectedIds = [correctOptionId];
      }

      content = { options: optionRows };
      const displayAnswer = optionRows
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => option.text)
        .filter(Boolean)
        .join(", ");

      answerData = {
        correct_option_ids: selectedIds,
        display_answer: displayAnswer || selectedIds.join(", ").toUpperCase(),
      };
    } else if (effectiveType === "short_text") {
      const answers = acceptedAnswers
        .split("\n")
        .map((answer) => answer.trim())
        .filter(Boolean);
      if (answers.length === 0) {
        setError("Enter at least one accepted answer.");
        return;
      }
      answerData = {
        accepted_answers: answers,
        display_answer: answers[0],
      };
    } else if (effectiveType === "sentence_reordering") {
      const lines = reorderLines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        setError("Enter at least two items in the correct order.");
        return;
      }
      const tokens = lines.map((text, index) => ({
        id: `t${index + 1}`,
        text,
      }));
      content = { tokens };
      answerData = {
        order: tokens.map((token) => token.id),
        display_answer: lines.join(" → "),
      };
    } else if (effectiveType === "numeric" || effectiveType === "numeric_unit") {
      const value = Number(numericValue);
      const tolerance = Number(numericTolerance || 0);
      const units = acceptedUnits
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      if (!Number.isFinite(value) || !Number.isFinite(tolerance) || tolerance < 0) {
        setError("Enter a valid numeric answer and tolerance.");
        return;
      }
      if (effectiveType === "numeric_unit" && units.length === 0) {
        setError("Enter at least one accepted unit.");
        return;
      }

      answerData = {
        kind: effectiveType,
        value,
        tolerance,
        units,
        unit_required: effectiveType === "numeric_unit",
        display_answer:
          effectiveType === "numeric_unit" ? `${value} ${units[0]}` : String(value),
      };
    } else if (effectiveType === "fraction") {
      const numerator = Number(fractionNumerator);
      const denominator = Number(fractionDenominator);
      if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
        setError("Enter a valid fraction with a non-zero denominator.");
        return;
      }
      answerData = {
        kind: "fraction",
        numerator,
        denominator,
        allow_equivalent: true,
        display_answer: `${numerator}/${denominator}`,
      };
    } else if (effectiveType === "money") {
      const amount = Number(moneyAmount);
      const toleranceCents = Number(moneyToleranceCents || 0);
      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        !Number.isInteger(toleranceCents) ||
        toleranceCents < 0
      ) {
        setError("Enter a valid SGD amount and whole-number tolerance in cents.");
        return;
      }
      const amountCents = Math.round(amount * 100);
      answerData = {
        kind: "money",
        amount_cents: amountCents,
        tolerance_cents: toleranceCents,
        display_answer: `$${(amountCents / 100).toFixed(2)}`,
      };
    }

    if (mode === "split_comprehension") {
      const passage = String(templateContent.comprehension_passage ?? "").trim();
      if (!passage) {
        setError("The shared comprehension passage could not be resolved.");
        return;
      }

      content = {
        ...content,
        layout: "split_comprehension",
        comprehension_passage: passage,
        passage_title: String(templateContent.passage_title ?? ""),
      };

      for (const [key, value] of Object.entries(templateContent)) {
        if (key.startsWith("comprehension_image_")) {
          content[key] = value;
        }
      }
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc(
        "curriculum_append_core_question",
        {
          p_subject: subject,
          p_quiz_id: quizId,
          p_question_type: effectiveType,
          p_instruction: instruction.trim() || null,
          p_prompt: prompt.trim(),
          p_content: content,
          p_answer_data: answerData,
          p_explanation: { student: explanation.trim() },
          p_skill: skill.trim() || null,
          p_difficulty: difficulty,
          p_marks: marks,
          p_group_sync: null,
        },
      );

      if (error || !data) throw error || new Error("Could not add question.");
      const saved = data as AppendResult;

      let warning: string | undefined;
      try {
        await syncQuestionMedia({
          questionId: saved.question_id,
          questionCode: saved.question_code,
          subject,
          primaryLevel: Number(saved.primary_level),
          content,
          media: mediaDraft,
          cleanupReplacedFiles: true,
        });
      } catch (mediaError: any) {
        warning = `The question was added, but its media needs attention: ${
          mediaError?.message || "media could not be saved"
        }`;
      }

      await onAdded(saved.question_id, warning);
    } catch (saveError: any) {
      setSaving(false);
      setError(saveError?.message || "Could not add the question.");
    }
  }

  return (
    <div style={body}>
      {mode === "split_comprehension" ? (
        <div style={specialNotice}>
          This is a split Comprehension quiz. The new question automatically
          inherits the current shared passage and is added as Multiple Choice.
        </div>
      ) : null}

      <section style={sectionCard}>
        <div style={topGrid}>
          <label style={fieldLabel}>
            Question type
            <select
              value={effectiveType}
              disabled={saving || mode === "split_comprehension"}
              onChange={(event) => {
                const next = event.target.value as StandardQuestionType;
                setQuestionType(next);
                if (next === "true_false") {
                  setCorrectOptionId("a");
                }
              }}
              style={input}
            >
              {(mode === "split_comprehension"
                ? [["multiple_choice", "Multiple Choice"] as [StandardQuestionType, string]]
                : subject === "math"
                  ? [...GENERAL_TYPES, ...MATH_TYPES]
                  : GENERAL_TYPES
              ).map(([value, label]) => (
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
              disabled={saving}
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
              min="0.5"
              step="0.5"
              value={marks}
              disabled={saving}
              onChange={(event) => setMarks(Number(event.target.value))}
              style={input}
            />
          </label>
        </div>

        <label style={fieldLabel}>
          Instruction
          <input
            value={instruction}
            disabled={saving}
            onChange={(event) => setInstruction(event.target.value)}
            style={input}
          />
          <FractionPreview text={instruction} />
        </label>

        <label style={fieldLabel}>
          Question
          <textarea
            value={prompt}
            disabled={saving}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            style={textarea}
          />
          <FractionPreview text={prompt} />
        </label>

        {(effectiveType === "multiple_choice" ||
          effectiveType === "multiple_select" ||
          effectiveType === "true_false") && (
          <div style={optionGrid}>
            {effectiveOptions.map((option, index) => {
              const optionId = String.fromCharCode(97 + index);
              const checked =
                effectiveType === "multiple_select"
                  ? correctOptionIds.includes(optionId)
                  : correctOptionId === optionId;

              return (
                <div key={optionId} style={optionRow}>
                  <span style={optionLetter}>{optionId.toUpperCase()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      value={option}
                      disabled={saving || effectiveType === "true_false"}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        )
                      }
                      style={input}
                    />
                    <FractionPreview text={option} compact />
                  </div>
                  <input
                    type={
                      effectiveType === "multiple_select" ? "checkbox" : "radio"
                    }
                    name="new-question-correct"
                    checked={checked}
                    disabled={saving}
                    onChange={() => {
                      if (effectiveType === "multiple_select") {
                        setCorrectOptionIds((current) =>
                          current.includes(optionId)
                            ? current.filter((id) => id !== optionId)
                            : [...current, optionId],
                        );
                      } else {
                        setCorrectOptionId(optionId);
                      }
                    }}
                    aria-label={`Mark ${optionId.toUpperCase()} correct`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {effectiveType === "short_text" && (
          <label style={fieldLabel}>
            Accepted answers — one per line
            <textarea
              value={acceptedAnswers}
              disabled={saving}
              onChange={(event) => setAcceptedAnswers(event.target.value)}
              rows={5}
              style={textarea}
            />
          </label>
        )}

        {effectiveType === "sentence_reordering" && (
          <label style={fieldLabel}>
            Correct order — one item per line
            <textarea
              value={reorderLines}
              disabled={saving}
              onChange={(event) => setReorderLines(event.target.value)}
              rows={6}
              style={textarea}
            />
          </label>
        )}

        {(effectiveType === "numeric" || effectiveType === "numeric_unit") && (
          <div style={topGrid}>
            <label style={fieldLabel}>
              Correct numeric value
              <input
                type="number"
                step="any"
                value={numericValue}
                disabled={saving}
                onChange={(event) => setNumericValue(event.target.value)}
                style={input}
              />
            </label>
            <label style={fieldLabel}>
              Tolerance
              <input
                type="number"
                min="0"
                step="any"
                value={numericTolerance}
                disabled={saving}
                onChange={(event) => setNumericTolerance(event.target.value)}
                style={input}
              />
            </label>
            {effectiveType === "numeric_unit" && (
              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Accepted units — one per line
                <textarea
                  value={acceptedUnits}
                  disabled={saving}
                  onChange={(event) => setAcceptedUnits(event.target.value)}
                  rows={3}
                  style={textarea}
                />
              </label>
            )}
          </div>
        )}

        {effectiveType === "fraction" && (
          <div style={topGrid}>
            <label style={fieldLabel}>
              Numerator
              <input
                type="number"
                step="1"
                value={fractionNumerator}
                disabled={saving}
                onChange={(event) => setFractionNumerator(event.target.value)}
                style={input}
              />
            </label>
            <label style={fieldLabel}>
              Denominator
              <input
                type="number"
                step="1"
                value={fractionDenominator}
                disabled={saving}
                onChange={(event) => setFractionDenominator(event.target.value)}
                style={input}
              />
            </label>
          </div>
        )}

        {effectiveType === "money" && (
          <div style={topGrid}>
            <label style={fieldLabel}>
              Correct SGD amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={moneyAmount}
                disabled={saving}
                onChange={(event) => setMoneyAmount(event.target.value)}
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
                disabled={saving}
                onChange={(event) => setMoneyToleranceCents(event.target.value)}
                style={input}
              />
            </label>
          </div>
        )}

        <QuestionMediaEditor
          value={mediaDraft}
          questionType={effectiveType as SupportedQuestionType}
          optionLabels={effectiveOptions}
          disabled={saving}
          onChange={setMediaDraft}
        />

        <div style={topGrid}>
          <label style={fieldLabel}>
            Skill label
            <input
              value={skill}
              disabled={saving}
              onChange={(event) => setSkill(event.target.value)}
              style={input}
            />
          </label>
        </div>

        <label style={fieldLabel}>
          Student explanation
          <textarea
            value={explanation}
            disabled={saving}
            onChange={(event) => setExplanation(event.target.value)}
            rows={4}
            style={textarea}
          />
          <FractionPreview text={explanation} />
        </label>
      </section>

      <div style={actionRow}>
        <button type="button" disabled={saving} onClick={() => void save()} style={saveButton}>
          {saving ? "Adding question…" : "+ Add Question"}
        </button>
      </div>
    </div>
  );
}

function GroupedClozeAddForm({
  subject,
  quizId,
  templateContent,
  templateInstruction,
  existingBlankIds,
  saving,
  setSaving,
  setError,
  onAdded,
}: {
  subject: CoreSubject;
  quizId: string;
  templateContent: JsonObject;
  templateInstruction: string;
  existingBlankIds: string[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  onAdded: (questionId: string, warning?: string) => Promise<void> | void;
}) {
  const nextBlankId = useMemo(() => {
    const numbers = existingBlankIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return String(numbers.length ? Math.max(...numbers) + 1 : existingBlankIds.length + 1);
  }, [existingBlankIds]);

  const [instruction, setInstruction] = useState(templateInstruction);
  const [passage, setPassage] = useState(
    String(templateContent.cloze_passage ?? ""),
  );
  const [wordBankText, setWordBankText] = useState(
    Array.isArray(templateContent.word_bank)
      ? templateContent.word_bank.map(String).join("\n")
      : "",
  );
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [marks, setMarks] = useState(1);

  async function save() {
    setError(null);
    const words = wordBankText
      .split("\n")
      .map((word) => word.trim())
      .filter(Boolean);

    if (!passage.trim()) {
      setError("The Cloze passage cannot be empty.");
      return;
    }
    if (!passage.includes(`{{${nextBlankId}}}`)) {
      setError(`Place the new marker {{${nextBlankId}}} in the passage before saving.`);
      return;
    }
    if (words.length === 0) {
      setError("Enter the helping words, one per line.");
      return;
    }
    if (!answer.trim()) {
      setError(`Enter the correct answer for blank ${nextBlankId}.`);
      return;
    }
    if (!words.some((word) => word.toLowerCase() === answer.trim().toLowerCase())) {
      setError("The new correct answer must also appear in the helping-word list.");
      return;
    }
    if (!explanation.trim()) {
      setError("Enter the student explanation.");
      return;
    }

    const content: JsonObject = {
      ...templateContent,
      text_with_blanks: `{{${nextBlankId}}}`,
      blank_id: nextBlankId,
      cloze_passage: passage.trim(),
      word_bank: words,
      layout: "drag_drop_grouped",
      use_each_once: true,
    };

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc(
        "curriculum_append_core_question",
        {
          p_subject: subject,
          p_quiz_id: quizId,
          p_question_type: "word_bank",
          p_instruction: instruction.trim() || null,
          p_prompt: passage.trim(),
          p_content: content,
          p_answer_data: {
            values: { [nextBlankId]: answer.trim() },
            display_answer: answer.trim(),
          },
          p_explanation: { student: explanation.trim() },
          p_skill: skill.trim() || null,
          p_difficulty: difficulty,
          p_marks: marks,
          p_group_sync: {
            kind: "grouped_cloze",
            cloze_passage: passage.trim(),
            word_bank: words,
          },
        },
      );
      if (error || !data) throw error || new Error("Could not add Cloze blank.");
      await onAdded((data as AppendResult).question_id);
    } catch (saveError: any) {
      setSaving(false);
      setError(saveError?.message || "Could not add the Cloze blank.");
    }
  }

  return (
    <div style={body}>
      <div style={specialNotice}>
        This grouped Cloze quiz needs another blank rather than an unrelated
        question. Dreamscape has reserved <strong>{`{{${nextBlankId}}}`}</strong>.
        Insert that marker exactly where the new blank should appear.
      </div>

      <section style={sectionCard}>
        <label style={fieldLabel}>
          Instruction
          <input
            value={instruction}
            disabled={saving}
            onChange={(event) => setInstruction(event.target.value)}
            style={input}
          />
        </label>

        <label style={fieldLabel}>
          Cloze passage
          <textarea
            value={passage}
            disabled={saving}
            onChange={(event) => setPassage(event.target.value)}
            rows={12}
            style={textarea}
          />
          <small style={helperText}>
            Add the new marker {`{{${nextBlankId}}}`} without removing the existing markers.
          </small>
        </label>

        <label style={fieldLabel}>
          Helping words — one per line
          <textarea
            value={wordBankText}
            disabled={saving}
            onChange={(event) => setWordBankText(event.target.value)}
            rows={8}
            style={textarea}
          />
        </label>

        <div style={topGrid}>
          <label style={fieldLabel}>
            Correct answer for blank {nextBlankId}
            <input
              value={answer}
              disabled={saving}
              onChange={(event) => setAnswer(event.target.value)}
              style={input}
            />
          </label>
          <label style={fieldLabel}>
            Skill label
            <input
              value={skill}
              disabled={saving}
              onChange={(event) => setSkill(event.target.value)}
              style={input}
            />
          </label>
          <label style={fieldLabel}>
            Difficulty
            <select
              value={difficulty}
              disabled={saving}
              onChange={(event) => setDifficulty(Number(event.target.value))}
              style={input}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label style={fieldLabel}>
            Marks
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={marks}
              disabled={saving}
              onChange={(event) => setMarks(Number(event.target.value))}
              style={input}
            />
          </label>
        </div>

        <label style={fieldLabel}>
          Student explanation
          <textarea
            value={explanation}
            disabled={saving}
            onChange={(event) => setExplanation(event.target.value)}
            rows={4}
            style={textarea}
          />
        </label>
      </section>

      <div style={actionRow}>
        <button type="button" disabled={saving} onClick={() => void save()} style={saveButton}>
          {saving ? "Adding blank…" : `+ Add Blank ${nextBlankId}`}
        </button>
      </div>
    </div>
  );
}

function FractionPreview({ text, compact = false }: { text: string; compact?: boolean }) {
  if (!hasRenderableFraction(text)) return null;
  return (
    <div style={compact ? fractionPreviewCompact : fractionPreview}>
      <span style={previewLabel}>Learner view</span>
      <span style={{ minWidth: 0 }}><FractionText text={text} /></span>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 11000,
  display: "grid",
  placeItems: "center",
  padding: 18,
  background: "rgba(2,7,18,0.84)",
  backdropFilter: "blur(10px)",
};
const modal: CSSProperties = {
  width: "min(1180px,100%)",
  maxHeight: "calc(100dvh - 36px)",
  overflowY: "auto",
  borderRadius: 24,
  border: "1px solid rgba(126,232,255,0.26)",
  background: "#08172f",
  color: "white",
  boxShadow: "0 32px 100px rgba(0,0,0,0.55)",
  padding: 20,
  fontFamily: "Arial, Helvetica, sans-serif",
};
const header: CSSProperties = {
  position: "sticky",
  top: -20,
  zIndex: 4,
  margin: "-20px -20px 14px",
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  borderBottom: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(8,23,47,0.97)",
};
const eyebrow: CSSProperties = { margin: 0, color: "#86edff", fontSize: 10, fontWeight: 950, letterSpacing: ".16em" };
const title: CSSProperties = { margin: "5px 0 0", fontSize: "clamp(22px,3vw,31px)" };
const meta: CSSProperties = { margin: "5px 0 0", color: "rgba(255,255,255,.48)", fontSize: 12 };
const closeButton: CSSProperties = { minHeight: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "white", padding: "0 14px", fontWeight: 900, cursor: "pointer" };
const verificationNotice: CSSProperties = { marginBottom: 12, borderRadius: 13, border: "1px solid rgba(251,191,36,.28)", background: "rgba(251,191,36,.08)", color: "#fde7a6", padding: 12, fontSize: 12, lineHeight: 1.5 };
const errorCard: CSSProperties = { marginBottom: 12, borderRadius: 13, border: "1px solid rgba(248,113,113,.34)", background: "rgba(239,68,68,.10)", color: "#fecaca", padding: 12, fontSize: 12, lineHeight: 1.5 };
const body: CSSProperties = { display: "grid", gap: 12 };
const specialNotice: CSSProperties = { borderRadius: 13, border: "1px solid rgba(167,139,250,.28)", background: "rgba(139,92,246,.08)", color: "#ede9fe", padding: 12, fontSize: 12, lineHeight: 1.5 };
const sectionCard: CSSProperties = { borderRadius: 17, border: "1px solid rgba(126,232,255,.15)", background: "rgba(255,255,255,.03)", padding: 16, display: "grid", gap: 12 };
const topGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 };
const fieldLabel: CSSProperties = { display: "grid", gap: 6, color: "rgba(255,255,255,.72)", fontSize: 12, fontWeight: 850 };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 43, borderRadius: 10, border: "1px solid rgba(126,232,255,.22)", background: "rgba(2,12,29,.72)", color: "white", padding: "9px 11px", outline: "none", fontSize: 14 };
const textarea: CSSProperties = { ...input, minHeight: 88, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 };
const helperText: CSSProperties = { color: "rgba(255,255,255,.42)", fontSize: 11, lineHeight: 1.45 };
const optionGrid: CSSProperties = { display: "grid", gap: 8 };
const optionRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const optionLetter: CSSProperties = { flex: "0 0 auto", width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(126,232,255,.11)", color: "#bff6ff", fontSize: 12, fontWeight: 950 };
const fractionPreview: CSSProperties = { marginTop: 2, borderRadius: 10, border: "1px solid rgba(126,232,255,.16)", background: "rgba(126,232,255,.055)", padding: "8px 10px", display: "flex", alignItems: "center", gap: 9, minWidth: 0 };
const fractionPreviewCompact: CSSProperties = { ...fractionPreview, marginTop: 5, padding: "6px 8px" };
const previewLabel: CSSProperties = { flex: "0 0 auto", color: "#8ee8ff", fontSize: 9, fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase" };
const actionRow: CSSProperties = { position: "sticky", bottom: -20, margin: "0 -20px -20px", padding: "14px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(126,232,255,.14)", background: "rgba(8,23,47,.97)" };
const saveButton: CSSProperties = { minHeight: 46, borderRadius: 12, border: "1px solid rgba(126,232,255,.42)", background: "linear-gradient(135deg,#77e6f5,#74ddc4)", color: "#061326", padding: "0 18px", fontSize: 14, fontWeight: 950, cursor: "pointer" };
