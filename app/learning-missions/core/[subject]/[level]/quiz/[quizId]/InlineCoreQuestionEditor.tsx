"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import QuestionMediaEditor from "@/app/curriculum-developer/components/QuestionMediaEditor";
import {
  questionMediaDraftFromQuestion,
  safeCleanupCoreMediaFile,
  syncQuestionMedia,
  uploadCoreManagedImage,
  type OptionImageDraft,
  type QuestionMediaDraft,
} from "@/app/curriculum-developer/media";
import type { SupportedQuestionType } from "@/app/curriculum-developer/types";

type CoreSubject = "english" | "math";
type JsonObject = Record<string, any>;

type EditorStimulus = {
  id: string;
  stimulus_type: string;
  title: string | null;
  body: JsonObject;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
  transcript: string | null;
} | null;

type EditorAsset = {
  id: string;
  question_id: string;
  asset_type: "image" | "svg" | "audio" | "video";
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  metadata: JsonObject;
  sort_order: number;
};

type EditorQuestion = {
  id: string;
  code: string;
  question_order: number;
  question_type: string;
  instruction: string | null;
  prompt: string;
  content: JsonObject;
  answer_data: JsonObject;
  explanation: JsonObject;
  skill: string | null;
  difficulty: number;
  marks: number;
  status: string;
  stimulus: EditorStimulus;
  assets: EditorAsset[];
};

type EditorPayload = {
  quiz: {
    id: string;
    code: string;
    title: string;
    status: string;
    is_published: boolean;
    student_visibility: "locked" | "shown";
    topic_id: string;
    topic_title: string;
    primary_level: number;
    topic_review_status: "locked" | "reviewing" | "satisfied";
  };
  questions: EditorQuestion[];
};

type SavePatch = {
  instruction?: string | null;
  prompt?: string;
  content?: JsonObject;
  answerData?: JsonObject;
  explanation?: JsonObject;
  skill?: string | null;
  difficulty?: number;
  marks?: number;
};

type BatchEntry = {
  question: EditorQuestion;
  patch: SavePatch;
};

type SavedQuestionRef = {
  sourceQuestionId: string;
  savedQuestionId: string;
  code: string;
};

type SharedGroupImageKind = "cloze_illustration" | "comprehension_image";

type SharedGroupImageDraft = {
  existingUrl: string | null;
  existingBucket: string | null;
  existingPath: string | null;
  file: File | null;
  altText: string;
  caption: string;
  removed: boolean;
  dirty: boolean;
};

function sharedGroupImageDraftFromContent(
  content: JsonObject | null | undefined,
  kind: SharedGroupImageKind,
): SharedGroupImageDraft {
  const source = content || {};
  const prefix =
    kind === "cloze_illustration" ? "illustration" : "comprehension_image";

  return {
    existingUrl: source[`${prefix}_url`]
      ? String(source[`${prefix}_url`])
      : null,
    existingBucket: source[`${prefix}_bucket`]
      ? String(source[`${prefix}_bucket`])
      : null,
    existingPath: source[`${prefix}_path`]
      ? String(source[`${prefix}_path`])
      : null,
    file: null,
    altText: String(source[`${prefix}_alt`] ?? ""),
    caption: String(source[`${prefix}_caption`] ?? ""),
    removed: false,
    dirty: false,
  };
}

async function syncSharedGroupImage({
  subject,
  quizId,
  kind,
  primaryLevel,
  questionCode,
  draft,
}: {
  subject: CoreSubject;
  quizId: string;
  kind: SharedGroupImageKind;
  primaryLevel: number;
  questionCode: string;
  draft: SharedGroupImageDraft;
}) {
  if (!draft.dirty) return;

  let uploaded: { bucket: string; path: string; url: string } | null = null;

  try {
    if (draft.file && !draft.removed) {
      uploaded = await uploadCoreManagedImage({
        subject,
        primaryLevel,
        questionCode,
        group:
          kind === "cloze_illustration"
            ? "grouped-cloze-illustration"
            : "comprehension-shared-image",
        file: draft.file,
      });
    }

    const bucket = uploaded?.bucket || draft.existingBucket || null;
    const path = uploaded?.path || draft.existingPath || null;
    const url = uploaded?.url || draft.existingUrl || null;

    if (!draft.removed && !url) {
      throw new Error("Choose an image before saving this shared media block.");
    }

    const { data, error } = await supabase.rpc(
      "curriculum_set_core_group_image",
      {
        p_subject: subject,
        p_quiz_id: quizId,
        p_kind: kind,
        p_bucket: draft.removed ? null : bucket,
        p_path: draft.removed ? null : path,
        p_url: draft.removed ? null : url,
        p_alt: draft.removed ? null : draft.altText.trim() || null,
        p_caption: draft.removed ? null : draft.caption.trim() || null,
        p_removed: draft.removed,
      },
    );

    if (error) throw error;

    const oldFiles = Array.isArray(data?.old_files) ? data.old_files : [];
    for (const oldFile of oldFiles) {
      const oldBucket = oldFile?.bucket ? String(oldFile.bucket) : null;
      const oldPath = oldFile?.path ? String(oldFile.path) : null;

      if (
        oldBucket &&
        oldPath &&
        !(oldBucket === bucket && oldPath === path)
      ) {
        await safeCleanupCoreMediaFile(oldBucket, oldPath);
      }
    }
  } catch (error) {
    // If the Storage upload succeeded but the atomic group update failed, the
    // new object has no DB reference and can be removed safely.
    if (uploaded) {
      await safeCleanupCoreMediaFile(uploaded.bucket, uploaded.path);
    }
    throw error;
  }
}

export default function InlineCoreQuestionEditor({
  subject,
  quizId,
  questionId,
  onClose,
  onSaved,
}: {
  subject: CoreSubject;
  quizId: string;
  questionId: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [payload, setPayload] = useState<EditorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase.rpc(
        "curriculum_get_core_inline_editor_payload",
        {
          p_subject: subject,
          p_quiz_id: quizId,
        },
      );

      if (cancelled) return;

      if (loadError || !data) {
        setError(
          loadError?.message ||
            "The inline curriculum editor could not load this quiz.",
        );
        setLoading(false);
        return;
      }

      setPayload(data as EditorPayload);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [quizId, subject]);

  const orderedQuestions = useMemo(
    () =>
      [...(payload?.questions || [])].sort(
        (a, b) => a.question_order - b.question_order,
      ),
    [payload],
  );

  const activeQuestion =
    orderedQuestions.find((question) => question.id === questionId) ||
    orderedQuestions[0] ||
    null;

  const isGroupedCloze =
    subject === "english" &&
    orderedQuestions.length > 0 &&
    orderedQuestions.every(
      (question) =>
        question.question_type === "word_bank" &&
        question.content?.layout === "drag_drop_grouped" &&
        String(question.content?.cloze_passage ?? "").trim().length > 0,
    );

  async function saveQuestions(entries: BatchEntry[]) {
    if (entries.length === 0) return new Map<string, SavedQuestionRef>();

    const updates = entries.map(({ question, patch }) => {
      const nextInstruction =
        patch.instruction === undefined
          ? question.instruction
          : patch.instruction;
      const nextPrompt = patch.prompt ?? question.prompt;
      const nextContent = patch.content ?? question.content ?? {};
      const nextAnswerData = patch.answerData ?? question.answer_data ?? {};
      const nextExplanation = patch.explanation ?? question.explanation ?? {};
      const nextSkill = patch.skill === undefined ? question.skill : patch.skill;
      const nextDifficulty =
        patch.difficulty ?? Number(question.difficulty || 1);
      const nextMarks = patch.marks ?? Number(question.marks || 1);

      return {
        question_id: question.id,
        question_type: question.question_type,
        instruction: nextInstruction || null,
        prompt: nextPrompt,
        content: nextContent,
        answer_data: nextAnswerData,
        explanation: nextExplanation,
        skill: nextSkill || null,
        difficulty: nextDifficulty,
        marks: nextMarks,
      };
    });

    const { data, error: saveError } = await supabase.rpc(
      "curriculum_save_core_inline_question_batch",
      {
        p_subject: subject,
        p_quiz_id: quizId,
        p_updates: updates,
      },
    );

    if (saveError) throw saveError;

    const detailed = Array.isArray(data?.saved_questions)
      ? data.saved_questions
      : [];
    const legacyIds = Array.isArray(data?.saved_question_ids)
      ? data.saved_question_ids.map(String)
      : [];

    const map = new Map<string, SavedQuestionRef>();

    entries.forEach((entry, index) => {
      const row = detailed[index] || {};
      const savedQuestionId = String(
        row.saved_question_id ?? legacyIds[index] ?? entry.question.id,
      );
      const code = String(row.code ?? entry.question.code);

      map.set(entry.question.id, {
        sourceQuestionId: entry.question.id,
        savedQuestionId,
        code,
      });
    });

    return map;
  }

  async function handleSaved() {
    setSaving(false);
    await onSaved();
  }

  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={modal}>
        <header style={modalHeader}>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrow}>INLINE CURRICULUM EDITOR</p>
            <h2 style={modalTitle}>
              {payload?.quiz.title || "Edit quiz question"}
            </h2>
            {payload && (
              <p style={modalMeta}>
                {payload.quiz.code} · {payload.quiz.topic_title} · P
                {payload.quiz.primary_level}
              </p>
            )}
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

        {payload?.quiz.student_visibility === "locked" && (
          <div style={lockedNotice}>
            RED quiz — students remain blocked while you review and edit it.
          </div>
        )}

        {loading ? (
          <div style={stateCard}>Loading the current live question data…</div>
        ) : error ? (
          <div style={errorCard}>{error}</div>
        ) : !payload || !activeQuestion ? (
          <div style={errorCard}>No editable question was found.</div>
        ) : isGroupedCloze ? (
          <GroupedClozeEditor
            subject={subject}
            quizId={quizId}
            primaryLevel={payload.quiz.primary_level}
            questions={orderedQuestions}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            saveQuestions={saveQuestions}
            onSaved={handleSaved}
          />
        ) : (
          <SingleQuestionEditor
            subject={subject}
            quizId={quizId}
            primaryLevel={payload.quiz.primary_level}
            question={activeQuestion}
            allQuestions={orderedQuestions}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            saveQuestions={saveQuestions}
            onSaved={handleSaved}
          />
        )}

        {error && !loading && payload && activeQuestion && (
          <div style={{ ...errorCard, marginTop: 14 }}>{error}</div>
        )}
      </div>
    </div>
  );
}

function SingleQuestionEditor({
  subject,
  quizId,
  primaryLevel,
  question,
  allQuestions,
  saving,
  setSaving,
  setError,
  saveQuestions,
  onSaved,
}: {
  subject: CoreSubject;
  quizId: string;
  primaryLevel: number;
  question: EditorQuestion;
  allQuestions: EditorQuestion[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  saveQuestions: (entries: BatchEntry[]) => Promise<Map<string, SavedQuestionRef>>;
  onSaved: () => Promise<void>;
}) {
  const [instruction, setInstruction] = useState(question.instruction || "");
  const [prompt, setPrompt] = useState(question.prompt || "");
  const [explanation, setExplanation] = useState(
    String(question.explanation?.student ?? ""),
  );
  const [skill, setSkill] = useState(question.skill || "");
  const [difficulty, setDifficulty] = useState(Number(question.difficulty || 1));
  const [marks, setMarks] = useState(Number(question.marks || 1));
  const [mediaDraft, setMediaDraft] = useState<QuestionMediaDraft>(() =>
    questionMediaDraftFromQuestion(question as any),
  );

  const originalOptions = Array.isArray(question.content?.options)
    ? question.content.options
    : [];

  const [optionTexts, setOptionTexts] = useState<string[]>(
    originalOptions.map((option: any) => String(option?.text ?? "")),
  );

  const originalCorrectIds = Array.isArray(
    question.answer_data?.correct_option_ids,
  )
    ? question.answer_data.correct_option_ids.map(String)
    : [];
  const originalCorrectId = String(originalCorrectIds[0] ?? "");
  const [correctOptionId, setCorrectOptionId] = useState(originalCorrectId);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(
    originalCorrectIds,
  );
  const allowsMultipleCorrect = question.question_type === "multiple_select";

  const [acceptedAnswers, setAcceptedAnswers] = useState(
    Array.isArray(question.answer_data?.accepted_answers)
      ? question.answer_data.accepted_answers.map(String).join("\n")
      : "",
  );

  const originalTokens = Array.isArray(question.content?.tokens)
    ? question.content.tokens
    : [];
  const originalOrder = Array.isArray(question.answer_data?.order)
    ? question.answer_data.order.map(String)
    : [];
  const tokenMap = new Map(
    originalTokens.map((token: any, index: number) => [
      String(token?.id ?? `t${index + 1}`),
      String(token?.text ?? token ?? ""),
    ]),
  );
  const [reorderLines, setReorderLines] = useState(
    originalOrder.map((id: string) => tokenMap.get(id) || "").join("\n"),
  );

  const originalValues =
    question.answer_data?.values &&
    typeof question.answer_data.values === "object" &&
    !Array.isArray(question.answer_data.values)
      ? (question.answer_data.values as Record<string, string>)
      : null;
  const [valueAnswers, setValueAnswers] = useState<Record<string, string>>(
    originalValues ? { ...originalValues } : {},
  );

  const answerKind = String(question.answer_data?.kind ?? "");
  const [numericValue, setNumericValue] = useState(
    String(question.answer_data?.value ?? ""),
  );
  const [numericTolerance, setNumericTolerance] = useState(
    String(question.answer_data?.tolerance ?? 0),
  );
  const [acceptedUnits, setAcceptedUnits] = useState(
    Array.isArray(question.answer_data?.units)
      ? question.answer_data.units.map(String).join("\n")
      : "",
  );
  const [fractionNumerator, setFractionNumerator] = useState(
    String(question.answer_data?.numerator ?? ""),
  );
  const [fractionDenominator, setFractionDenominator] = useState(
    String(question.answer_data?.denominator ?? ""),
  );
  const [moneyAmount, setMoneyAmount] = useState(
    question.answer_data?.amount_cents === undefined
      ? ""
      : (Number(question.answer_data.amount_cents) / 100).toFixed(2),
  );
  const [moneyToleranceCents, setMoneyToleranceCents] = useState(
    String(question.answer_data?.tolerance_cents ?? 0),
  );

  const isSplitComprehension =
    question.content?.layout === "split_comprehension";
  const originalPassage = String(question.content?.comprehension_passage ?? "");
  const originalPassageTitle = String(question.content?.passage_title ?? "");
  const [passage, setPassage] = useState(originalPassage);
  const [passageTitle, setPassageTitle] = useState(originalPassageTitle);
  const comprehensionFirstQuestion =
    allQuestions.find((item) => item.content?.layout === "split_comprehension") ||
    question;
  const [sharedComprehensionImage, setSharedComprehensionImage] =
    useState<SharedGroupImageDraft>(() =>
      sharedGroupImageDraftFromContent(
        comprehensionFirstQuestion.content,
        "comprehension_image",
      ),
    );

  const hasOptions = originalOptions.length > 0;
  const hasAcceptedAnswers = Array.isArray(question.answer_data?.accepted_answers);
  const hasOrdering = originalTokens.length > 0 && originalOrder.length > 0;
  const hasValues = Boolean(originalValues);
  const hasKnownNumericAnswer = [
    "numeric",
    "numeric_unit",
    "fraction",
    "money",
  ].includes(answerKind);

  async function handleSave() {
    setError(null);

    if (!prompt.trim()) {
      setError("Question prompt cannot be empty.");
      return;
    }

    if (!explanation.trim()) {
      setError("Enter the student explanation before saving.");
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

    let nextContent: JsonObject = { ...(question.content || {}) };
    let nextAnswerData: JsonObject = { ...(question.answer_data || {}) };

    if (hasOptions) {
      const optionMissingContent = optionTexts.some((text, index) => {
        if (text.trim()) return false;
        const optionId = String(
          originalOptions[index]?.id ?? String.fromCharCode(97 + index),
        );
        const media = mediaDraft.optionImages[optionId];
        return !(
          media?.file ||
          (!media?.removed && (media?.existingUrl || media?.existingPath)) ||
          originalOptions[index]?.image_url ||
          originalOptions[index]?.image_path
        );
      });

      if (optionMissingContent) {
        setError("Every answer option needs text, an image, or both.");
        return;
      }

      const nextOptions = originalOptions.map((option: any, index: number) => ({
        ...option,
        id: String(option?.id ?? String.fromCharCode(97 + index)),
        text: optionTexts[index].trim(),
      }));

      const optionIds = nextOptions.map((option: any) => String(option.id));
      const selectedCorrectIds = allowsMultipleCorrect
        ? correctOptionIds.filter((id) => optionIds.includes(id))
        : correctOptionId && optionIds.includes(correctOptionId)
          ? [correctOptionId]
          : [];

      if (selectedCorrectIds.length === 0) {
        setError(
          allowsMultipleCorrect
            ? "Choose at least one correct answer option."
            : "Choose the correct answer option.",
        );
        return;
      }

      nextContent = {
        ...nextContent,
        options: nextOptions,
      };

      const correctTexts = nextOptions
        .filter((option: any) =>
          selectedCorrectIds.includes(String(option.id)),
        )
        .map((option: any) => String(option.text ?? ""));

      nextAnswerData = {
        ...nextAnswerData,
        correct_option_ids: selectedCorrectIds,
        display_answer: correctTexts.join(", "),
      };
    }

    if (hasAcceptedAnswers) {
      const answers = acceptedAnswers
        .split("\n")
        .map((answer) => answer.trim())
        .filter(Boolean);

      if (answers.length === 0) {
        setError("Enter at least one accepted answer.");
        return;
      }

      nextAnswerData = {
        ...nextAnswerData,
        accepted_answers: answers,
        display_answer: answers[0],
      };
    }

    if (hasOrdering) {
      const lines = reorderLines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setError("Enter at least two ordered items.");
        return;
      }

      const tokens = lines.map((text, index) => ({
        id: `t${index + 1}`,
        text,
      }));

      nextContent = {
        ...nextContent,
        tokens,
      };

      nextAnswerData = {
        ...nextAnswerData,
        order: tokens.map((token) => token.id),
        display_answer: lines.join(" → "),
      };
    }

    if (hasValues) {
      const cleanValues = Object.fromEntries(
        Object.entries(valueAnswers).map(([key, value]) => [key, String(value).trim()]),
      );

      if (Object.values(cleanValues).some((value) => !value)) {
        setError("Every blank answer must be filled.");
        return;
      }

      nextAnswerData = {
        ...nextAnswerData,
        values: cleanValues,
        display_answer: Object.values(cleanValues).join(" / "),
      };
    }

    if (answerKind === "numeric" || answerKind === "numeric_unit") {
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
      if (answerKind === "numeric_unit" && units.length === 0) {
        setError("Enter at least one accepted unit.");
        return;
      }

      nextAnswerData = {
        ...nextAnswerData,
        kind: answerKind,
        value,
        tolerance,
        units,
        unit_required:
          answerKind === "numeric_unit"
            ? question.answer_data?.unit_required !== false
            : false,
        display_answer:
          answerKind === "numeric_unit" ? `${value} ${units[0]}` : String(value),
      };
    }

    if (answerKind === "fraction") {
      const numerator = Number(fractionNumerator);
      const denominator = Number(fractionDenominator);
      if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
        setError("Enter a valid fraction answer.");
        return;
      }

      nextAnswerData = {
        ...nextAnswerData,
        kind: "fraction",
        numerator,
        denominator,
        display_answer: `${numerator}/${denominator}`,
      };
    }

    if (answerKind === "money") {
      const amount = Number(moneyAmount);
      const toleranceCents = Number(moneyToleranceCents || 0);
      if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(toleranceCents) || toleranceCents < 0) {
        setError("Enter a valid money answer and tolerance.");
        return;
      }

      const amountCents = Math.round(amount * 100);
      nextAnswerData = {
        ...nextAnswerData,
        kind: "money",
        amount_cents: amountCents,
        tolerance_cents: toleranceCents,
        display_answer: `$${(amountCents / 100).toFixed(2)}`,
      };
    }

    if (isSplitComprehension) {
      if (!passage.trim()) {
        setError("The comprehension passage cannot be empty.");
        return;
      }

      nextContent = {
        ...nextContent,
        comprehension_passage: passage,
        passage_title: passageTitle,
      };
    }

    setSaving(true);

    try {
      const batch: BatchEntry[] = [];

      // If the shared comprehension passage changed, keep every question in
      // the quiz synchronised in the SAME database transaction.
      if (
        isSplitComprehension &&
        (passage !== originalPassage || passageTitle !== originalPassageTitle)
      ) {
        for (const item of allQuestions) {
          if (item.id === question.id) continue;
          if (item.content?.layout !== "split_comprehension") continue;

          batch.push({
            question: item,
            patch: {
              content: {
                ...(item.content || {}),
                comprehension_passage: passage,
                passage_title: passageTitle,
              },
            },
          });
        }
      }

      batch.push({
        question,
        patch: {
          instruction: instruction.trim() || null,
          prompt: prompt.trim(),
          content: nextContent,
          answerData: nextAnswerData,
          explanation: {
            ...(question.explanation || {}),
            student: explanation.trim(),
          },
          skill: skill.trim() || null,
          difficulty,
          marks,
        },
      });

      const savedQuestions = await saveQuestions(batch);
      const savedQuestion = savedQuestions.get(question.id);

      // Phase 4 enables reference-safe cleanup. The DB content/stimulus/asset
      // update happens before an old Storage object is considered for removal.
      await syncQuestionMedia({
        questionId: savedQuestion?.savedQuestionId || question.id,
        questionCode: savedQuestion?.code || question.code,
        subject,
        primaryLevel,
        content: nextContent,
        media: mediaDraft,
        cleanupReplacedFiles: true,
      });

      if (isSplitComprehension && sharedComprehensionImage.dirty) {
        await syncSharedGroupImage({
          subject,
          quizId,
          kind: "comprehension_image",
          primaryLevel,
          questionCode: comprehensionFirstQuestion.code,
          draft: sharedComprehensionImage,
        });
      }

      await onSaved();
    } catch (saveError: any) {
      setSaving(false);
      setError(saveError?.message || "Could not save the live question.");
    }
  }

  return (
    <div style={editorBody}>
      <EditorSection
        title={`Question ${question.question_order}`}
        subtitle={`${question.code} · ${question.question_type.replaceAll("_", " ")}`}
      >
        {isSplitComprehension && (
          <>
            <label style={fieldLabel}>
              Shared passage title
              <input
                value={passageTitle}
                disabled={saving}
                onChange={(event) => setPassageTitle(event.target.value)}
                style={input}
              />
            </label>

            <label style={fieldLabel}>
              Shared comprehension passage
              <textarea
                value={passage}
                disabled={saving}
                onChange={(event) => setPassage(event.target.value)}
                rows={10}
                style={textarea}
              />
              <small style={helperText}>
                Changing this passage updates every question in this comprehension quiz.
              </small>
            </label>
          </>
        )}

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
          Question
          <textarea
            value={prompt}
            disabled={saving}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            style={textarea}
          />
        </label>

        {hasOptions && (
          <div style={optionGrid}>
            {originalOptions.map((option: any, index: number) => {
              const optionId = String(
                option?.id ?? String.fromCharCode(97 + index),
              );
              return (
                <label key={optionId} style={optionRow}>
                  <span style={optionLetter}>{optionId.toUpperCase()}</span>
                  <input
                    value={optionTexts[index] ?? ""}
                    disabled={saving}
                    onChange={(event) =>
                      setOptionTexts((current) =>
                        current.map((text, itemIndex) =>
                          itemIndex === index ? event.target.value : text,
                        ),
                      )
                    }
                    style={{ ...input, flex: 1 }}
                  />
                  <input
                    type={allowsMultipleCorrect ? "checkbox" : "radio"}
                    name={`inline-correct-${question.id}`}
                    checked={
                      allowsMultipleCorrect
                        ? correctOptionIds.includes(optionId)
                        : correctOptionId === optionId
                    }
                    disabled={saving}
                    onChange={() => {
                      if (allowsMultipleCorrect) {
                        setCorrectOptionIds((current) =>
                          current.includes(optionId)
                            ? current.filter((id) => id !== optionId)
                            : [...current, optionId],
                        );
                      } else {
                        setCorrectOptionId(optionId);
                      }
                    }}
                    aria-label={`${
                      allowsMultipleCorrect ? "Toggle" : "Set"
                    } ${optionId.toUpperCase()} as a correct answer`}
                  />
                </label>
              );
            })}
            <small style={helperText}>
              {allowsMultipleCorrect
                ? "Tick every correct answer. Existing option-image data is preserved."
                : "Select the radio button beside the correct answer. Existing option-image data is preserved."}
            </small>
          </div>
        )}

        {hasAcceptedAnswers && (
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

        {hasOrdering && (
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

        {hasValues && (
          <div style={subPanel}>
            <p style={smallTitle}>Correct blank values</p>
            {Object.entries(valueAnswers).map(([key, value]) => (
              <label key={key} style={fieldLabel}>
                Blank {key}
                <input
                  value={value}
                  disabled={saving}
                  onChange={(event) =>
                    setValueAnswers((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  style={input}
                />
              </label>
            ))}
          </div>
        )}

        {(answerKind === "numeric" || answerKind === "numeric_unit") && (
          <div style={twoColumnGrid}>
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
            {answerKind === "numeric_unit" && (
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

        {answerKind === "fraction" && (
          <div style={twoColumnGrid}>
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

        {answerKind === "money" && (
          <div style={twoColumnGrid}>
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

        {!hasOptions &&
          !hasAcceptedAnswers &&
          !hasOrdering &&
          !hasValues &&
          !hasKnownNumericAnswer && (
            <div style={preserveNotice}>
              This question uses a specialised answer structure. Its existing answer data is preserved while you edit the wording, explanation, skill, difficulty or marks here.
            </div>
          )}

        {!isSplitComprehension && (
          <QuestionMediaEditor
            value={mediaDraft}
            questionType={question.question_type as SupportedQuestionType}
            optionLabels={optionTexts}
            disabled={saving}
            onChange={setMediaDraft}
          />
        )}

        {isSplitComprehension && (
          <>
            <SharedGroupImageEditor
              title="Shared passage image"
              description="Optional image shown with the reading passage. Replacing it updates the whole comprehension quiz."
              value={sharedComprehensionImage}
              disabled={saving}
              onChange={setSharedComprehensionImage}
            />

            <ComprehensionOptionImageEditor
              options={originalOptions}
              optionTexts={optionTexts}
              value={mediaDraft}
              disabled={saving}
              onChange={setMediaDraft}
            />
          </>
        )}

        <div style={twoColumnGrid}>
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
          Student explanation
          <textarea
            value={explanation}
            disabled={saving}
            onChange={(event) => setExplanation(event.target.value)}
            rows={4}
            style={textarea}
          />
        </label>
      </EditorSection>

      <div style={actionRow}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          style={{ ...saveButton, opacity: saving ? 0.55 : 1 }}
        >
          {saving ? "Saving live changes…" : "Save Question Changes"}
        </button>
      </div>
    </div>
  );
}

function GroupedClozeEditor({
  subject,
  quizId,
  primaryLevel,
  questions,
  saving,
  setSaving,
  setError,
  saveQuestions,
  onSaved,
}: {
  subject: CoreSubject;
  quizId: string;
  primaryLevel: number;
  questions: EditorQuestion[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  saveQuestions: (entries: BatchEntry[]) => Promise<Map<string, SavedQuestionRef>>;
  onSaved: () => Promise<void>;
}) {
  const first = questions[0];
  const [instruction, setInstruction] = useState(first?.instruction || "");
  const [passage, setPassage] = useState(
    String(first?.content?.cloze_passage ?? first?.prompt ?? ""),
  );
  const [wordBankText, setWordBankText] = useState(
    Array.isArray(first?.content?.word_bank)
      ? first.content.word_bank.map(String).join("\n")
      : "",
  );
  const [sharedClozeImage, setSharedClozeImage] =
    useState<SharedGroupImageDraft>(() =>
      sharedGroupImageDraftFromContent(first?.content, "cloze_illustration"),
    );

  const [rows, setRows] = useState(() =>
    questions.map((question) => {
      const blankId = String(
        question.content?.blank_id ?? question.question_order,
      );
      return {
        questionId: question.id,
        blankId,
        answer: String(question.answer_data?.values?.[blankId] ?? ""),
        explanation: String(question.explanation?.student ?? ""),
        skill: question.skill || "",
      };
    }),
  );

  async function handleSave() {
    setError(null);

    const words = wordBankText
      .split("\n")
      .map((word) => word.trim())
      .filter(Boolean);

    if (!passage.trim()) {
      setError("The Cloze passage cannot be empty.");
      return;
    }

    if (words.length === 0) {
      setError("Enter the helping words, one per line.");
      return;
    }

    const normalisedWords = new Set(words.map((word) => word.toLowerCase()));
    if (normalisedWords.size !== words.length) {
      setError("The helping-word list contains duplicate words.");
      return;
    }

    for (const row of rows) {
      if (!passage.includes(`{{${row.blankId}}}`)) {
        setError(`The passage is missing blank {{${row.blankId}}}.`);
        return;
      }
      if (!row.answer.trim()) {
        setError(`Enter the correct answer for blank ${row.blankId}.`);
        return;
      }
      if (!normalisedWords.has(row.answer.trim().toLowerCase())) {
        setError(
          `The answer for blank ${row.blankId} must also appear in the helping-word list.`,
        );
        return;
      }
      if (!row.explanation.trim()) {
        setError(`Enter the explanation for blank ${row.blankId}.`);
        return;
      }
    }

    setSaving(true);

    try {
      const batch: BatchEntry[] = [];

      for (const question of questions) {
        const row = rows.find((item) => item.questionId === question.id);
        if (!row) continue;

        batch.push({
          question,
          patch: {
            instruction: instruction.trim() || null,
            prompt: passage.trim(),
            content: {
              ...(question.content || {}),
              text_with_blanks: `{{${row.blankId}}}`,
              blank_id: row.blankId,
              cloze_passage: passage.trim(),
              word_bank: words,
              layout: "drag_drop_grouped",
              use_each_once: true,
            },
            answerData: {
              ...(question.answer_data || {}),
              values: {
                [row.blankId]: row.answer.trim(),
              },
              display_answer: row.answer.trim(),
            },
            explanation: {
              ...(question.explanation || {}),
              student: row.explanation.trim(),
            },
            skill: row.skill.trim() || null,
          },
        });
      }

      await saveQuestions(batch);

      if (sharedClozeImage.dirty) {
        await syncSharedGroupImage({
          subject,
          quizId,
          kind: "cloze_illustration",
          primaryLevel,
          questionCode: first.code,
          draft: sharedClozeImage,
        });
      }

      await onSaved();
    } catch (saveError: any) {
      setSaving(false);
      setError(saveError?.message || "Could not save the grouped Cloze quiz.");
    }
  }

  return (
    <div style={editorBody}>
      <EditorSection
        title="Edit Grouped Cloze"
        subtitle="The passage and helping-word list are shared by all blanks."
      >
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
            Keep the existing markers such as {"{{1}}"}, {"{{2}}"} and so on.
          </small>
        </label>

        <label style={fieldLabel}>
          Helping words — one per line
          <textarea
            value={wordBankText}
            disabled={saving}
            onChange={(event) => setWordBankText(event.target.value)}
            rows={10}
            style={textarea}
          />
        </label>

        <SharedGroupImageEditor
          title="Cloze illustration"
          description="Optional shared PNG/image shown beneath the Cloze passage."
          value={sharedClozeImage}
          disabled={saving}
          onChange={setSharedClozeImage}
        />
      </EditorSection>

      <EditorSection
        title="Blank answers"
        subtitle="Edit the correct answer, explanation and skill for each blank."
      >
        <div style={clozeRows}>
          {rows.map((row, index) => (
            <div key={row.questionId} style={clozeRow}>
              <div style={blankBadge}>Blank {row.blankId}</div>

              <label style={fieldLabel}>
                Correct answer
                <input
                  value={row.answer}
                  disabled={saving}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, answer: event.target.value }
                          : item,
                      ),
                    )
                  }
                  style={input}
                />
              </label>

              <label style={fieldLabel}>
                Explanation
                <textarea
                  value={row.explanation}
                  disabled={saving}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, explanation: event.target.value }
                          : item,
                      ),
                    )
                  }
                  rows={2}
                  style={textarea}
                />
              </label>

              <label style={fieldLabel}>
                Skill
                <input
                  value={row.skill}
                  disabled={saving}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, skill: event.target.value }
                          : item,
                      ),
                    )
                  }
                  style={input}
                />
              </label>
            </div>
          ))}
        </div>
      </EditorSection>

      <div style={actionRow}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          style={{ ...saveButton, opacity: saving ? 0.55 : 1 }}
        >
          {saving ? "Saving all Cloze changes…" : "Save Cloze Changes"}
        </button>
      </div>
    </div>
  );
}

function SharedGroupImageEditor({
  title,
  description,
  value,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  value: SharedGroupImageDraft;
  disabled: boolean;
  onChange: (value: SharedGroupImageDraft) => void;
}) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value.file) {
      setLocalUrl(null);
      return;
    }

    const url = URL.createObjectURL(value.file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  const previewUrl = value.removed ? null : localUrl || value.existingUrl;

  function patch(next: Partial<SharedGroupImageDraft>) {
    onChange({ ...value, ...next, dirty: true });
  }

  return (
    <div style={specialMediaPanel}>
      <div>
        <p style={specialMediaEyebrow}>SHARED IMAGE</p>
        <h4 style={specialMediaTitle}>{title}</h4>
        <p style={specialMediaDescription}>{description}</p>
      </div>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={value.altText || title}
          style={specialMediaPreview}
        />
      ) : (
        <div style={specialMediaEmpty}>No shared image</div>
      )}

      <div style={twoColumnGrid}>
        <label style={fieldLabel}>
          {previewUrl ? "Replace image" : "Add image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (!file) return;
              patch({ file, removed: false });
            }}
            style={input}
          />
        </label>

        <label style={fieldLabel}>
          Alternative text
          <input
            value={value.altText}
            disabled={disabled}
            onChange={(event) => patch({ altText: event.target.value, removed: false })}
            style={input}
          />
        </label>

        <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
          Caption
          <input
            value={value.caption}
            disabled={disabled}
            onChange={(event) => patch({ caption: event.target.value, removed: false })}
            style={input}
          />
        </label>
      </div>

      {previewUrl && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => patch({ file: null, removed: true })}
          style={specialRemoveButton}
        >
          Remove Image
        </button>
      )}
    </div>
  );
}

function ComprehensionOptionImageEditor({
  options,
  optionTexts,
  value,
  disabled,
  onChange,
}: {
  options: JsonObject[];
  optionTexts: string[];
  value: QuestionMediaDraft;
  disabled: boolean;
  onChange: (value: QuestionMediaDraft) => void;
}) {
  function defaultDraft(optionId: string, option: JsonObject): OptionImageDraft {
    return {
      optionId,
      existingUrl: option.image_url ? String(option.image_url) : null,
      existingBucket: option.image_bucket ? String(option.image_bucket) : null,
      existingPath: option.image_path ? String(option.image_path) : null,
      file: null,
      altText: String(option.image_alt ?? option.text ?? ""),
      showTextWithImage: option.show_text_with_image === true,
      removed: false,
    };
  }

  function updateOption(
    optionId: string,
    option: JsonObject,
    patch: Partial<OptionImageDraft>,
  ) {
    const current = value.optionImages[optionId] || defaultDraft(optionId, option);
    onChange({
      ...value,
      optionImages: {
        ...value.optionImages,
        [optionId]: { ...current, ...patch },
      },
    });
  }

  return (
    <div style={specialMediaPanel}>
      <div>
        <p style={specialMediaEyebrow}>ANSWER-OPTION IMAGES</p>
        <h4 style={specialMediaTitle}>Comprehension answer images</h4>
        <p style={specialMediaDescription}>
          Optional image for each answer choice on this question.
        </p>
      </div>

      <div style={specialOptionGrid}>
        {options.map((rawOption, index) => {
          const option = rawOption || {};
          const optionId = String(option.id ?? String.fromCharCode(97 + index));
          const draft = value.optionImages[optionId] || defaultDraft(optionId, option);

          return (
            <SpecialOptionImageCard
              key={optionId}
              label={optionTexts[index] || `Option ${optionId.toUpperCase()}`}
              optionId={optionId}
              draft={draft}
              disabled={disabled}
              onChange={(patch) => updateOption(optionId, option, patch)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SpecialOptionImageCard({
  label,
  optionId,
  draft,
  disabled,
  onChange,
}: {
  label: string;
  optionId: string;
  draft: OptionImageDraft;
  disabled: boolean;
  onChange: (patch: Partial<OptionImageDraft>) => void;
}) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.file) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.file]);

  const previewUrl = draft.removed ? null : localUrl || draft.existingUrl;

  return (
    <article style={specialOptionCard}>
      <div style={optionRow}>
        <span style={optionLetter}>{optionId.toUpperCase()}</span>
        <strong style={{ minWidth: 0, fontSize: 12 }}>{label}</strong>
      </div>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={draft.altText || label}
          style={specialOptionPreview}
        />
      ) : (
        <div style={specialOptionEmpty}>No image</div>
      )}

      <label style={fieldLabel}>
        {previewUrl ? "Replace image" : "Add image"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            if (!file) return;
            onChange({ file, removed: false });
          }}
          style={input}
        />
      </label>

      <label style={fieldLabel}>
        Alternative text
        <input
          value={draft.altText}
          disabled={disabled}
          onChange={(event) => onChange({ altText: event.target.value, removed: false })}
          style={input}
        />
      </label>

      <label style={inlineCheckLabel}>
        <input
          type="checkbox"
          checked={draft.showTextWithImage}
          disabled={disabled}
          onChange={(event) =>
            onChange({ showTextWithImage: event.target.checked, removed: false })
          }
        />
        Show answer text with image
      </label>

      {previewUrl && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ file: null, removed: true })}
          style={specialRemoveButton}
        >
          Remove Option Image
        </button>
      )}
    </article>
  );
}

function EditorSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section style={sectionCard}>
      <h3 style={sectionTitle}>{title}</h3>
      <p style={sectionSubtitle}>{subtitle}</p>
      <div style={sectionFields}>{children}</div>
    </section>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  display: "grid",
  placeItems: "center",
  padding: "18px",
  background: "rgba(2,7,18,0.82)",
  backdropFilter: "blur(10px)",
};

const modal: CSSProperties = {
  width: "min(1180px, 100%)",
  maxHeight: "calc(100dvh - 36px)",
  overflowY: "auto",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.26)",
  background: "#08172f",
  color: "white",
  boxShadow: "0 32px 100px rgba(0,0,0,0.55)",
  padding: "20px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const modalHeader: CSSProperties = {
  position: "sticky",
  top: -20,
  zIndex: 2,
  margin: "-20px -20px 16px",
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  borderBottom: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(8,23,47,0.97)",
  backdropFilter: "blur(12px)",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#86edff",
  fontSize: "10px",
  fontWeight: 950,
  letterSpacing: "0.16em",
};

const modalTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(22px,3vw,32px)",
  lineHeight: 1.1,
};

const modalMeta: CSSProperties = {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.48)",
  fontSize: "12px",
};

const closeButton: CSSProperties = {
  flex: "0 0 auto",
  minHeight: "42px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const lockedNotice: CSSProperties = {
  marginBottom: "14px",
  borderRadius: "13px",
  border: "1px solid rgba(248,113,113,0.32)",
  background: "rgba(239,68,68,0.09)",
  color: "#fecaca",
  padding: "11px 13px",
  fontSize: "12px",
  fontWeight: 850,
};

const stateCard: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(255,255,255,0.035)",
  padding: "30px",
  color: "rgba(255,255,255,0.62)",
  textAlign: "center",
  fontWeight: 800,
};

const errorCard: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid rgba(248,113,113,0.34)",
  background: "rgba(239,68,68,0.10)",
  color: "#fecaca",
  padding: "13px",
  fontSize: "13px",
  lineHeight: 1.5,
};

const editorBody: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const sectionCard: CSSProperties = {
  borderRadius: "17px",
  border: "1px solid rgba(126,232,255,0.15)",
  background: "rgba(255,255,255,0.03)",
  padding: "16px",
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
};

const sectionSubtitle: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.48)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const sectionFields: CSSProperties = {
  marginTop: "14px",
  display: "grid",
  gap: "12px",
};

const fieldLabel: CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "12px",
  fontWeight: 850,
};

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "43px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(2,12,29,0.72)",
  color: "white",
  padding: "9px 11px",
  outline: "none",
  fontSize: "14px",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: "88px",
  resize: "vertical",
  fontFamily: "inherit",
  lineHeight: 1.5,
};

const helperText: CSSProperties = {
  color: "rgba(255,255,255,0.42)",
  fontSize: "11px",
  lineHeight: 1.45,
};

const optionGrid: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const optionRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const optionLetter: CSSProperties = {
  flex: "0 0 auto",
  width: "32px",
  height: "32px",
  borderRadius: "10px",
  display: "grid",
  placeItems: "center",
  background: "rgba(126,232,255,0.11)",
  color: "#bff6ff",
  fontSize: "12px",
  fontWeight: 950,
};

const subPanel: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(0,0,0,0.12)",
  padding: "12px",
};

const smallTitle: CSSProperties = {
  margin: "0 0 9px",
  fontSize: "13px",
  fontWeight: 900,
  color: "#bff6ff",
};

const preserveNotice: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(251,191,36,0.22)",
  background: "rgba(251,191,36,0.07)",
  color: "#fde7a6",
  padding: "12px",
  fontSize: "12px",
  lineHeight: 1.5,
};

const specialMediaPanel: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(198,166,255,0.26)",
  background: "linear-gradient(145deg,rgba(55,29,92,0.22),rgba(6,22,48,0.58))",
  padding: "13px",
  display: "grid",
  gap: "11px",
};

const specialMediaEyebrow: CSSProperties = {
  margin: 0,
  color: "#e7b7ff",
  fontSize: "9px",
  fontWeight: 950,
  letterSpacing: "0.14em",
};

const specialMediaTitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "15px",
};

const specialMediaDescription: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.48)",
  fontSize: "11px",
  lineHeight: 1.45,
};

const specialMediaPreview: CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: "250px",
  objectFit: "contain",
  borderRadius: "12px",
  background: "white",
};

const specialMediaEmpty: CSSProperties = {
  minHeight: "100px",
  display: "grid",
  placeItems: "center",
  borderRadius: "12px",
  border: "1px dashed rgba(126,232,255,0.18)",
  background: "rgba(0,0,0,0.12)",
  color: "rgba(255,255,255,0.36)",
  fontSize: "11px",
};

const specialRemoveButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "10px",
  border: "1px solid rgba(248,113,113,0.30)",
  background: "rgba(239,68,68,0.08)",
  color: "#fecaca",
  padding: "0 12px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 900,
};

const specialOptionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "10px",
};

const specialOptionCard: CSSProperties = {
  minWidth: 0,
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(2,12,29,0.48)",
  padding: "10px",
  display: "grid",
  gap: "9px",
};

const specialOptionPreview: CSSProperties = {
  display: "block",
  width: "100%",
  height: "150px",
  objectFit: "contain",
  borderRadius: "10px",
  background: "white",
};

const specialOptionEmpty: CSSProperties = {
  height: "90px",
  display: "grid",
  placeItems: "center",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.32)",
  fontSize: "10px",
};

const inlineCheckLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  color: "rgba(255,255,255,0.62)",
  fontSize: "11px",
  fontWeight: 800,
};

const twoColumnGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "10px",
};

const actionRow: CSSProperties = {
  position: "sticky",
  bottom: -20,
  margin: "0 -20px -20px",
  padding: "14px 20px",
  display: "flex",
  justifyContent: "flex-end",
  borderTop: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(8,23,47,0.97)",
};

const saveButton: CSSProperties = {
  minHeight: "46px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.42)",
  background: "linear-gradient(135deg,#77e6f5,#74ddc4)",
  color: "#061326",
  padding: "0 18px",
  fontSize: "14px",
  fontWeight: 950,
  cursor: "pointer",
};

const clozeRows: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const clozeRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px minmax(150px,.7fr) minmax(220px,1.3fr) minmax(170px,1fr)",
  gap: "10px",
  alignItems: "start",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.11)",
  background: "rgba(0,0,0,0.10)",
  padding: "11px",
};

const blankBadge: CSSProperties = {
  minHeight: "42px",
  display: "grid",
  placeItems: "center",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.19)",
  background: "rgba(126,232,255,0.08)",
  color: "#bff6ff",
  fontSize: "12px",
  fontWeight: 950,
};
