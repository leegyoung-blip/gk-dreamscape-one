"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorQuestionRenderer, {
  type CreatorEngineAnswerValue,
  type CreatorEngineQuestion,
  type CreatorEngineOption,
  questionTypeLabel,
} from "@/components/milo/creator-engine/CreatorQuestionRenderer";

type ModuleRow = {
  module_key: string;
  display_name: string;
  description: string;
  price_dt: number;
  sort_order: number;
  unlocked: boolean;
  unlocked_at: string | null;
  wallet_dt: number;
};

type StoredOption = CreatorEngineOption & {
  is_correct: boolean;
};

type StoredQuestion = Omit<CreatorEngineQuestion, "options"> & {
  answer_config: Record<string, unknown>;
  migrated_from_legacy: boolean;
  options: StoredOption[];
};

type EditableOption = {
  option_key: string;
  label: string;
  image_url: string;
  is_correct: boolean;
};

type QuestionForm = {
  questionType:
    | "classic_choice"
    | "choice_grid"
    | "bar_estimate"
    | "pie_estimate";
  prompt: string;
  selectionMode: "single" | "multi";
  options: EditableOption[];

  min: number;
  max: number;
  step: number;
  unit: string;
  target: number;
  fullTolerance: number;
  acceptableTolerance: number;

  explanation: string;
  topic: string;
  difficulty: number;
};

const DEFAULT_PREVIEW: CreatorEngineAnswerValue = {
  selectedKeys: [],
  numericValue: 50,
};

function optionKey(index: number) {
  if (index < 26) return String.fromCharCode(65 + index);
  return `O${index + 1}`;
}

function defaultOptions(count = 4): EditableOption[] {
  return Array.from({ length: count }, (_, index) => ({
    option_key: optionKey(index),
    label: "",
    image_url: "",
    is_correct: index === 0,
  }));
}

function blankForm(): QuestionForm {
  return {
    questionType: "classic_choice",
    prompt: "",
    selectionMode: "single",
    options: defaultOptions(4),

    min: 0,
    max: 100,
    step: 1,
    unit: "",
    target: 50,
    fullTolerance: 3,
    acceptableTolerance: 7,

    explanation: "",
    topic: "",
    difficulty: 2,
  };
}

function fromStored(question: StoredQuestion): QuestionForm {
  return {
    questionType: question.question_type,
    prompt: question.prompt || "",
    selectionMode:
      String(question.config?.selection_mode || "single") === "multi"
        ? "multi"
        : "single",
    options:
      question.options.length > 0
        ? question.options.map((option) => ({
            option_key: option.option_key,
            label: option.label || "",
            image_url: option.image_url || "",
            is_correct: Boolean(option.is_correct),
          }))
        : defaultOptions(4),

    min: Number(question.config?.min ?? 0),
    max: Number(question.config?.max ?? 100),
    step: Number(question.config?.step ?? 1),
    unit: String(question.config?.unit || ""),
    target: Number(question.answer_config?.target ?? 50),
    fullTolerance: Number(question.answer_config?.full_tolerance ?? 3),
    acceptableTolerance: Number(
      question.answer_config?.acceptable_tolerance ?? 7,
    ),

    explanation: question.explanation || "",
    topic: question.topic || "",
    difficulty: Number(question.difficulty || 2),
  };
}

export default function CreatorEngineV2Builder({
  quizId,
  quizTitle,
  quizStatus,
  canEdit,
  onQuizChanged,
}: {
  quizId: string;
  quizTitle: string;
  quizStatus: string;
  canEdit: boolean;
  onQuizChanged?: () => void;
}) {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [questions, setQuestions] = useState<StoredQuestion[]>([]);
  const [selectedOrder, setSelectedOrder] = useState(1);
  const [form, setForm] = useState<QuestionForm>(blankForm());
  const [previewValue, setPreviewValue] =
    useState<CreatorEngineAnswerValue>(DEFAULT_PREVIEW);

  const [storeOpen, setStoreOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedQuestion = useMemo(
    () =>
      questions.find(
        (question) => Number(question.question_order) === selectedOrder,
      ) || null,
    [questions, selectedOrder],
  );

  const moduleMap = useMemo(
    () =>
      new Map(
        modules.map((module) => [module.module_key, module] as const),
      ),
    [modules],
  );

  const walletDt = modules[0]?.wallet_dt ?? 0;
  const expandedUnlocked = Boolean(moduleMap.get("grid_expanded")?.unlocked);
  const multiUnlocked = Boolean(
    moduleMap.get("grid_multi_select")?.unlocked,
  );
  const barUnlocked = Boolean(moduleMap.get("bar_estimate")?.unlocked);
  const pieUnlocked = Boolean(moduleMap.get("pie_estimate")?.unlocked);
  const maxGridOptions = expandedUnlocked ? 20 : 6;

  useEffect(() => {
    void load();
  }, [quizId]);

  useEffect(() => {
    setForm(selectedQuestion ? fromStored(selectedQuestion) : blankForm());
    setPreviewValue(DEFAULT_PREVIEW);
  }, [selectedOrder, selectedQuestion?.id]);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const [moduleResponse, questionResponse] = await Promise.all([
      supabase.rpc("creator_engine_get_modules_v2"),
      supabase.rpc("creator_engine_get_quiz_questions_v2", {
        p_quiz_id: quizId,
      }),
    ]);

    if (moduleResponse.error) {
      setErrorMessage(
        moduleResponse.error.message || "Creator Engine modules could not load.",
      );
      setModules([]);
    } else {
      setModules(
        ((moduleResponse.data || []) as ModuleRow[]).map((row) => ({
          ...row,
          price_dt: Number(row.price_dt || 0),
          sort_order: Number(row.sort_order || 0),
          unlocked: Boolean(row.unlocked),
          wallet_dt: Number(row.wallet_dt || 0),
        })),
      );
    }

    if (questionResponse.error) {
      setErrorMessage(
        questionResponse.error.message ||
          "Creator Engine questions could not load.",
      );
      setQuestions([]);
    } else {
      const next = ((questionResponse.data || []) as StoredQuestion[]).map(
        (question) => ({
          ...question,
          id: String(question.id),
          question_order: Number(question.question_order || 0),
          difficulty: Number(question.difficulty || 2),
          config: question.config || {},
          answer_config: question.answer_config || {},
          migrated_from_legacy: Boolean(question.migrated_from_legacy),
          options: ((question.options || []) as StoredQuestion["options"]).map(
            (option) => ({
              ...option,
              sort_order: Number(option.sort_order || 0),
              is_correct: Boolean(option.is_correct),
            }),
          ),
        }),
      );

      setQuestions(next);
    }

    setIsLoading(false);
  }

  function chooseType(type: QuestionForm["questionType"]) {
    if (!canEdit) return;

    if (type === "bar_estimate" && !barUnlocked) {
      setStoreOpen(true);
      setErrorMessage("Unlock Bar Estimate to use this question type.");
      return;
    }

    if (type === "pie_estimate" && !pieUnlocked) {
      setStoreOpen(true);
      setErrorMessage("Unlock Pie Estimate to use this question type.");
      return;
    }

    setErrorMessage("");
    setPreviewValue(DEFAULT_PREVIEW);
    setForm((current) => {
      const next = { ...current, questionType: type };

      if (type === "classic_choice") {
        next.selectionMode = "single";
        next.options = current.options.slice(0, 4);
        while (next.options.length < 2) {
          next.options.push({
            option_key: optionKey(next.options.length),
            label: "",
            image_url: "",
            is_correct: false,
          });
        }

        if (!next.options.some((option) => option.is_correct)) {
          next.options[0].is_correct = true;
        }

        next.options = next.options.map((option, index) => ({
          ...option,
          option_key: optionKey(index),
          is_correct: index === next.options.findIndex((item) => item.is_correct),
        }));
      }

      if (type === "choice_grid") {
        next.options = current.options.slice(0, maxGridOptions);
        while (next.options.length < 2) {
          next.options.push({
            option_key: optionKey(next.options.length),
            label: "",
            image_url: "",
            is_correct: false,
          });
        }
      }

      return next;
    });
  }

  function updateOption(
    index: number,
    patch: Partial<EditableOption>,
  ) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  function setCorrect(index: number) {
    setForm((current) => {
      if (current.selectionMode === "multi") {
        return {
          ...current,
          options: current.options.map((option, optionIndex) =>
            optionIndex === index
              ? { ...option, is_correct: !option.is_correct }
              : option,
          ),
        };
      }

      return {
        ...current,
        options: current.options.map((option, optionIndex) => ({
          ...option,
          is_correct: optionIndex === index,
        })),
      };
    });
  }

  function addOption() {
    const max =
      form.questionType === "classic_choice" ? 4 : maxGridOptions;

    if (form.options.length >= max) {
      if (form.questionType === "choice_grid" && !expandedUnlocked) {
        setStoreOpen(true);
        setErrorMessage(
          "Unlock Expanded Grid to build questions with up to 20 options.",
        );
      }
      return;
    }

    setForm((current) => ({
      ...current,
      options: [
        ...current.options,
        {
          option_key: optionKey(current.options.length),
          label: "",
          image_url: "",
          is_correct: false,
        },
      ],
    }));
  }

  function removeOption(index: number) {
    if (form.options.length <= 2) return;

    setForm((current) => {
      const next = current.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({
          ...option,
          option_key: optionKey(optionIndex),
        }));

      if (!next.some((option) => option.is_correct)) {
        next[0].is_correct = true;
      }

      if (current.selectionMode === "single") {
        const firstCorrect = next.findIndex((option) => option.is_correct);
        return {
          ...current,
          options: next.map((option, optionIndex) => ({
            ...option,
            is_correct: optionIndex === firstCorrect,
          })),
        };
      }

      return { ...current, options: next };
    });
  }

  function setSelectionMode(mode: "single" | "multi") {
    if (mode === "multi" && !multiUnlocked) {
      setStoreOpen(true);
      setErrorMessage(
        "Unlock Multi-Select Grid before allowing multiple correct answers.",
      );
      return;
    }

    setForm((current) => {
      if (mode === "single") {
        const firstCorrect = Math.max(
          0,
          current.options.findIndex((option) => option.is_correct),
        );

        return {
          ...current,
          selectionMode: "single",
          options: current.options.map((option, index) => ({
            ...option,
            is_correct: index === firstCorrect,
          })),
        };
      }

      return { ...current, selectionMode: "multi" };
    });
  }

  async function saveQuestion() {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const isChoice =
      form.questionType === "classic_choice" ||
      form.questionType === "choice_grid";

    const { error } = await supabase.rpc(
      "creator_engine_upsert_question_v2",
      {
        p_quiz_id: quizId,
        p_question_order: selectedOrder,
        p_question_type: form.questionType,
        p_prompt: form.prompt.trim(),
        p_config: isChoice
          ? {
              selection_mode:
                form.questionType === "classic_choice"
                  ? "single"
                  : form.selectionMode,
              layout:
                form.questionType === "classic_choice" ? "buttons" : "grid",
            }
          : form.questionType === "bar_estimate"
            ? {
                min: Number(form.min),
                max: Number(form.max),
                step: Number(form.step),
                unit: form.unit.trim(),
              }
            : {
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
              },
        p_answer_config: isChoice
          ? {}
          : {
              target: Number(form.target),
              full_tolerance: Number(form.fullTolerance),
              acceptable_tolerance: Number(form.acceptableTolerance),
            },
        p_explanation: form.explanation.trim() || null,
        p_topic: form.topic.trim() || null,
        p_difficulty: Number(form.difficulty),
        p_options: isChoice
          ? form.options.map((option, index) => ({
              option_key: optionKey(index),
              label: option.label.trim(),
              image_url: option.image_url.trim() || null,
              is_correct: Boolean(option.is_correct),
            }))
          : [],
      },
    );

    if (error) {
      setErrorMessage(error.message || "Question could not be saved.");
      setIsSaving(false);
      return;
    }

    setMessage(`Question ${selectedOrder} saved in Creator Engine V2.`);
    await load();
    onQuizChanged?.();
    setIsSaving(false);
  }

  async function deleteQuestion() {
    if (!selectedQuestion) {
      setForm(blankForm());
      return;
    }

    if (
      !window.confirm(
        `Remove question ${selectedOrder} from "${quizTitle}"?`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_engine_delete_question_v2",
      {
        p_quiz_id: quizId,
        p_question_order: selectedOrder,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Question could not be removed.");
      setIsSaving(false);
      return;
    }

    setMessage(`Question ${selectedOrder} removed.`);
    await load();
    onQuizChanged?.();
    setIsSaving(false);
  }

  async function unlock(module: ModuleRow) {
    if (module.unlocked || module.price_dt <= 0) return;

    if (
      !window.confirm(
        `Unlock ${module.display_name} permanently for ${module.price_dt.toLocaleString()} DT?`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_engine_unlock_module_v2",
      { p_module_key: module.module_key },
    );

    if (error) {
      setErrorMessage(error.message || "Engine module could not be unlocked.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setMessage(
      `${module.display_name} unlocked permanently for ${Number(
        row?.amount_spent_dt || module.price_dt,
      ).toLocaleString()} DT.`,
    );
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await load();
    setIsSaving(false);
  }

  async function submitForReview() {
    if (
      !window.confirm(
        `Submit "${quizTitle}" for Dreamscape review? All 10 Engine V2 questions will be locked while it is under review.`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_engine_submit_quiz_v2",
      { p_quiz_id: quizId },
    );

    if (error) {
      setErrorMessage(error.message || "Challenge could not be submitted.");
      setIsSaving(false);
      return;
    }

    setMessage("Challenge submitted for Dreamscape review.");
    await load();
    onQuizChanged?.();
    setIsSaving(false);
  }

  const previewQuestion: CreatorEngineQuestion = {
    id: selectedQuestion?.id || `preview-${selectedOrder}`,
    question_order: selectedOrder,
    question_type: form.questionType,
    prompt: form.prompt,
    config:
      form.questionType === "classic_choice" ||
      form.questionType === "choice_grid"
        ? {
            selection_mode:
              form.questionType === "classic_choice"
                ? "single"
                : form.selectionMode,
          }
        : form.questionType === "bar_estimate"
          ? {
              min: form.min,
              max: form.max,
              step: form.step,
              unit: form.unit,
            }
          : { min: 0, max: 100, step: 1, unit: "%" },
    topic: form.topic,
    difficulty: form.difficulty,
    options:
      form.questionType === "classic_choice" ||
      form.questionType === "choice_grid"
        ? form.options.map((option, index) => ({
            option_key: optionKey(index),
            label: option.label,
            image_url: option.image_url || null,
            sort_order: index + 1,
          }))
        : [],
  };

  if (isLoading) {
    return (
      <section className="mt-5 rounded-[24px] border border-cyan-200/12 bg-cyan-300/[0.035] p-5 text-xs text-white/42">
        Opening Creator Engine V2...
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-[26px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(14,64,84,0.13),rgba(3,13,29,0.90))] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/58">
            Creator Quiz Engine V2
          </p>
          <h3 className="mt-1 text-2xl font-black">
            Mix interaction types inside one challenge.
          </h3>
          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/38">
            Existing A–D creator quizzes migrate automatically into Classic
            Choice. New questions can use grids or estimation engines when the
            creator has unlocked them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-200/14 bg-emerald-400/[0.055] px-3 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-100">
            {questions.length}/10 saved
          </span>
          <button
            type="button"
            onClick={() => setStoreOpen((value) => !value)}
            className="min-h-9 rounded-full border border-amber-200/18 bg-amber-300/[0.06] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100"
          >
            Engine Store · {walletDt.toLocaleString()} DT
          </button>
        </div>
      </div>

      {(message || errorMessage) && (
        <div className="mt-4">
          {message && (
            <p className="rounded-xl border border-emerald-200/14 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-100">
              {message}
            </p>
          )}
          {errorMessage && (
            <p className="rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {storeOpen && (
        <div className="mt-4 rounded-[22px] border border-amber-200/12 bg-amber-300/[0.025] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/58">
                Permanent Creator Unlocks
              </p>
              <h4 className="mt-1 text-lg font-black">
                Reinvest DT into better creation tools
              </h4>
            </div>
            <strong className="text-lg text-amber-100">
              {walletDt.toLocaleString()} DT
            </strong>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <article
                key={module.module_key}
                className={`rounded-[18px] border p-4 ${
                  module.unlocked
                    ? "border-emerald-200/12 bg-emerald-400/[0.035]"
                    : "border-white/8 bg-black/14"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <strong className="block text-sm text-white">
                      {module.display_name}
                    </strong>
                    <p className="mt-2 text-[9px] leading-4 text-white/32">
                      {module.description}
                    </p>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.07em] ${
                      module.unlocked
                        ? "border-emerald-200/14 bg-emerald-400/[0.055] text-emerald-100"
                        : "border-amber-200/14 bg-amber-300/[0.055] text-amber-100"
                    }`}
                  >
                    {module.unlocked
                      ? "Unlocked"
                      : `${module.price_dt.toLocaleString()} DT`}
                  </span>
                </div>

                {!module.unlocked && module.price_dt > 0 && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void unlock(module)}
                    className="mt-4 min-h-9 w-full rounded-full border border-amber-200/18 bg-amber-300/[0.06] text-[8px] font-black uppercase tracking-[0.08em] text-amber-100 disabled:opacity-35"
                  >
                    Unlock Permanently
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((order) => {
          const saved = questions.some(
            (question) => Number(question.question_order) === order,
          );

          return (
            <button
              key={order}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className={`h-10 w-10 shrink-0 rounded-xl border text-[10px] font-black transition ${
                selectedOrder === order
                  ? "border-cyan-200/34 bg-cyan-300/[0.09] text-cyan-100"
                  : saved
                    ? "border-emerald-200/18 bg-emerald-400/[0.055] text-emerald-100"
                    : "border-white/8 bg-white/[0.025] text-white/30"
              }`}
            >
              {order}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <div className="rounded-[22px] border border-white/9 bg-black/14 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-cyan-100/54">
                Question {selectedOrder}
              </p>
              <h4 className="mt-1 text-lg font-black">
                {selectedQuestion ? "Edit interaction" : "Build interaction"}
              </h4>
            </div>

            {selectedQuestion?.migrated_from_legacy && (
              <span className="w-fit rounded-full border border-violet-200/14 bg-violet-300/[0.05] px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-violet-100">
                Migrated from legacy MCQ
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <TypeButton
              label="Classic Choice"
              active={form.questionType === "classic_choice"}
              locked={false}
              onClick={() => chooseType("classic_choice")}
            />
            <TypeButton
              label="Choice Grid"
              active={form.questionType === "choice_grid"}
              locked={false}
              onClick={() => chooseType("choice_grid")}
            />
            <TypeButton
              label="Bar Estimate"
              active={form.questionType === "bar_estimate"}
              locked={!barUnlocked}
              onClick={() => chooseType("bar_estimate")}
            />
            <TypeButton
              label="Pie Estimate"
              active={form.questionType === "pie_estimate"}
              locked={!pieUnlocked}
              onClick={() => chooseType("pie_estimate")}
            />
          </div>

          <label className="mt-4 block">
            <span className={fieldLabel}>Question prompt</span>
            <textarea
              value={form.prompt}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
              rows={3}
              maxLength={1200}
              placeholder="Write the challenge question..."
              className={textareaClass}
            />
          </label>

          {(form.questionType === "classic_choice" ||
            form.questionType === "choice_grid") && (
            <>
              {form.questionType === "choice_grid" && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setSelectionMode("single")}
                    className={modeButton(form.selectionMode === "single")}
                  >
                    Single Answer
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setSelectionMode("multi")}
                    className={modeButton(form.selectionMode === "multi")}
                  >
                    Multi-Select {!multiUnlocked ? "· Locked" : ""}
                  </button>

                  <span className="ml-auto text-[8px] text-white/26">
                    {form.options.length}/{maxGridOptions} options
                  </span>
                </div>
              )}

              <div className="mt-4 grid gap-2">
                {form.options.map((option, index) => (
                  <div
                    key={`${option.option_key}-${index}`}
                    className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 md:grid-cols-[42px_minmax(0,1fr)_minmax(0,0.8fr)_auto]"
                  >
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setCorrect(index)}
                      className={`h-10 rounded-xl border text-[9px] font-black ${
                        option.is_correct
                          ? "border-emerald-200/22 bg-emerald-400/[0.07] text-emerald-100"
                          : "border-white/9 bg-black/14 text-white/28"
                      }`}
                      title="Mark as correct"
                    >
                      {option.option_key}
                    </button>

                    <input
                      value={option.label}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateOption(index, { label: event.target.value })
                      }
                      placeholder="Option text"
                      className={inputClass}
                    />

                    <input
                      value={option.image_url}
                      disabled={!canEdit || !expandedUnlocked}
                      onChange={(event) =>
                        updateOption(index, {
                          image_url: event.target.value,
                        })
                      }
                      placeholder={
                        expandedUnlocked
                          ? "Image URL · optional"
                          : "Images unlock with Expanded Grid"
                      }
                      className={inputClass}
                    />

                    <button
                      type="button"
                      disabled={!canEdit || form.options.length <= 2}
                      onClick={() => removeOption(index)}
                      className="h-10 rounded-xl border border-white/8 bg-black/14 px-3 text-[8px] font-black uppercase tracking-[0.07em] text-white/30 disabled:opacity-25"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 min-h-9 rounded-full border border-cyan-200/14 bg-cyan-300/[0.045] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100"
                >
                  + Add Option
                </button>
              )}
            </>
          )}

          {form.questionType === "bar_estimate" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <NumberField
                label="Minimum"
                value={form.min}
                disabled={!canEdit}
                onChange={(value) =>
                  setForm((current) => ({ ...current, min: value }))
                }
              />
              <NumberField
                label="Maximum"
                value={form.max}
                disabled={!canEdit}
                onChange={(value) =>
                  setForm((current) => ({ ...current, max: value }))
                }
              />
              <NumberField
                label="Step"
                value={form.step}
                disabled={!canEdit}
                onChange={(value) =>
                  setForm((current) => ({ ...current, step: value }))
                }
              />
              <label>
                <span className={fieldLabel}>Unit</span>
                <input
                  value={form.unit}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit: event.target.value,
                    }))
                  }
                  placeholder="km, $, kg..."
                  className={inputClass}
                />
              </label>
              <NumberField
                label="Correct target"
                value={form.target}
                disabled={!canEdit}
                onChange={(value) =>
                  setForm((current) => ({ ...current, target: value }))
                }
              />
            </div>
          )}

          {(form.questionType === "bar_estimate" ||
            form.questionType === "pie_estimate") && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Full-credit tolerance · ±"
                value={form.fullTolerance}
                disabled={!canEdit}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    fullTolerance: value,
                  }))
                }
              />
              <NumberField
                label="Partial-credit tolerance · ±"
                value={form.acceptableTolerance}
                disabled={!canEdit}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    acceptableTolerance: value,
                  }))
                }
              />

              {form.questionType === "pie_estimate" && (
                <NumberField
                  label="Correct percentage"
                  value={form.target}
                  disabled={!canEdit}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      target: Math.max(0, Math.min(100, value)),
                    }))
                  }
                />
              )}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className={fieldLabel}>Topic · optional</span>
              <input
                value={form.topic}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    topic: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Space, football, animals..."
              />
            </label>

            <label>
              <span className={fieldLabel}>Difficulty</span>
              <select
                value={form.difficulty}
                disabled={!canEdit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    difficulty: Number(event.target.value),
                  }))
                }
                className={inputClass}
              >
                <option value={1}>1 · Easy</option>
                <option value={2}>2</option>
                <option value={3}>3 · Medium</option>
                <option value={4}>4</option>
                <option value={5}>5 · Hard</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className={fieldLabel}>Explanation</span>
            <textarea
              value={form.explanation}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  explanation: event.target.value,
                }))
              }
              rows={2}
              maxLength={1200}
              placeholder="Explain the answer after completion."
              className={textareaClass}
            />
          </label>

          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void saveQuestion()}
                className={primaryButton}
              >
                {isSaving ? "Saving..." : `Save Question ${selectedOrder}`}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void deleteQuestion()}
                className={secondaryButton}
              >
                {selectedQuestion ? "Delete Question" : "Reset"}
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[8px] font-black uppercase tracking-[0.13em] text-white/28">
            Live learner preview · {questionTypeLabel(form.questionType)}
          </p>
          <CreatorQuestionRenderer
            question={previewQuestion}
            value={previewValue}
            onChange={setPreviewValue}
            disabled={false}
            compact
          />

          {(form.questionType === "bar_estimate" ||
            form.questionType === "pie_estimate") && (
            <div className="mt-3 rounded-xl border border-white/8 bg-black/14 px-3 py-3 text-[9px] leading-4 text-white/34">
              Creator answer target:{" "}
              <strong className="text-white/66">{form.target}</strong> · full
              credit ±{form.fullTolerance} · partial credit ±
              {form.acceptableTolerance}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-violet-200/12 bg-violet-300/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/56">
            Dreamscape Review
          </p>
          <p className="mt-1 text-[10px] leading-5 text-white/36">
            Creator challenges currently require exactly 10 saved Engine V2
            questions before submission. Mixed question types are allowed.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            disabled={isSaving || questions.length !== 10}
            onClick={() => void submitForReview()}
            className="min-h-10 shrink-0 rounded-full border border-violet-200/20 bg-violet-300/[0.07] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-violet-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Submit 10-Question Challenge
          </button>
        )}

        {!canEdit && (
          <span className="rounded-full border border-white/9 bg-white/[0.03] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-white/34">
            {quizStatus}
          </span>
        )}
      </div>
    </section>
  );
}

function TypeButton({
  label,
  active,
  locked,
  onClick,
}: {
  label: string;
  active: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-3 text-[8px] font-black uppercase tracking-[0.08em] transition ${
        active
          ? "border-cyan-200/28 bg-cyan-300/[0.08] text-cyan-100"
          : locked
            ? "border-amber-200/10 bg-amber-300/[0.025] text-amber-100/44"
            : "border-white/9 bg-white/[0.025] text-white/38"
      }`}
    >
      {locked ? "🔒 " : ""}
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className={fieldLabel}>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className={inputClass}
      />
    </label>
  );
}

function modeButton(active: boolean) {
  return `min-h-9 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.08em] ${
    active
      ? "border-violet-200/22 bg-violet-300/[0.07] text-violet-100"
      : "border-white/9 bg-white/[0.025] text-white/34"
  }`;
}

const fieldLabel =
  "mb-1.5 block text-[7px] font-black uppercase tracking-[0.10em] text-white/28";

const inputClass =
  "h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#06152d] px-3 text-[10px] text-white outline-none placeholder:text-white/22 focus:border-cyan-200/28 disabled:opacity-45";

const textareaClass =
  "w-full resize-none rounded-xl border border-white/10 bg-[#06152d] px-3 py-3 text-[10px] leading-5 text-white outline-none placeholder:text-white/22 focus:border-cyan-200/28 disabled:opacity-45";

const primaryButton =
  "min-h-10 rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-100 disabled:opacity-35";

const secondaryButton =
  "min-h-10 rounded-full border border-white/9 bg-white/[0.03] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-white/38 disabled:opacity-35";
