"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import SciencePageShell from "@/components/science-missions/SciencePageShell";
import {
  SCIENCE_MISSION_META,
  SCIENCE_STATUS_META,
  canEditScience,
  csvToArray,
  makeOptionKey,
} from "@/lib/science/helpers";
import { supabase } from "@/lib/supabase";
import type {
  ScienceEditorQuestion,
  ScienceQuestionOption,
  ScienceQuestionType,
  ScienceQuizEditorPayload,
  ScienceQuizStatus,
} from "@/lib/science/types";

type PageProps = {
  params: Promise<{ quizId: string }>;
};

type QuestionDraft = {
  id: string | null;
  prompt: string;
  instruction: string;
  questionType: ScienceQuestionType;
  questionImage: string;
  marks: number;
  difficulty: number;
  questionOrder: number;
  options: ScienceQuestionOption[];
  correctOptionKey: string;
  explanation: string;
  processSkills: string;
  contentTags: string;
};

const EMPTY_QUESTION: QuestionDraft = {
  id: null,
  prompt: "",
  instruction: "Choose the best answer.",
  questionType: "mcq",
  questionImage: "",
  marks: 1,
  difficulty: 1,
  questionOrder: 1,
  options: [
    { key: "A", text: "", asset_path: "" },
    { key: "B", text: "", asset_path: "" },
    { key: "C", text: "", asset_path: "" },
    { key: "D", text: "", asset_path: "" },
  ],
  correctOptionKey: "A",
  explanation: "",
  processSkills: "observing",
  contentTags: "p1",
};

const SUPPORTED_TYPES: Array<{ value: ScienceQuestionType; label: string }> = [
  { value: "mcq", label: "Multiple choice" },
  { value: "true_false", label: "True or false" },
  { value: "image_choice", label: "Image choice" },
  { value: "sorting", label: "Put in order" },
];

export default function ScienceQuizQuestionEditorPage({ params }: PageProps) {
  const { quizId } = use(params);
  const [role, setRole] = useState<string | null>(null);
  const [payload, setPayload] = useState<ScienceQuizEditorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY_QUESTION);

  useEffect(() => {
    void loadEditor();
  }, [quizId]);

  async function loadEditor() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Log in with an Admin or Curriculum Lead account.");
      setLoading(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const loadedRole = profileResult.data?.role ?? null;
    setRole(loadedRole);

    if (!canEditScience(loadedRole)) {
      setMessage("Only Administrators and Curriculum Leads can edit Science questions.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("science_get_quiz_editor", {
      p_quiz_id: quizId,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const loadedPayload = data as ScienceQuizEditorPayload;
    if (loadedPayload?.error || !loadedPayload?.quiz) {
      setMessage("Quiz not found or access denied.");
      setLoading(false);
      return;
    }

    setPayload(loadedPayload);
    setLoading(false);
  }

  const questions = payload?.questions ?? [];
  const quiz = payload?.quiz ?? null;

  const totalMarks = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.default_marks || 0), 0),
    [questions],
  );

  function startNewQuestion() {
    setDraft({
      ...EMPTY_QUESTION,
      questionOrder: questions.length + 1,
    });
    setEditorOpen(true);
    setMessage("");
  }

  function editQuestion(question: ScienceEditorQuestion) {
    const correctOptionKeys = Array.isArray(question.answer_data?.correct_option_keys)
      ? (question.answer_data.correct_option_keys as string[])
      : [];

    setDraft({
      id: question.id,
      prompt: question.prompt,
      instruction: question.instruction || "",
      questionType: question.question_type,
      questionImage: question.question_image || "",
      marks: Number(question.default_marks || 1),
      difficulty: Number(question.difficulty || 1),
      questionOrder: Number(question.question_order || 1),
      options:
        question.options.length > 0
          ? question.options.map((option) => ({
              key: option.key,
              text: option.text || "",
              asset_path: option.asset_path || "",
            }))
          : EMPTY_QUESTION.options,
      correctOptionKey: correctOptionKeys[0] || question.options[0]?.key || "A",
      explanation: question.explanation || "",
      processSkills: question.process_skills.join(", "),
      contentTags: question.content_tags.join(", "),
    });
    setEditorOpen(true);
    setMessage("");
  }

  function changeQuestionType(nextType: ScienceQuestionType) {
    setDraft((current) => {
      if (nextType === "true_false") {
        return {
          ...current,
          questionType: nextType,
          instruction: current.instruction || "Choose true or false.",
          options: [
            { key: "A", text: "True", asset_path: "" },
            { key: "B", text: "False", asset_path: "" },
          ],
          correctOptionKey: "A",
        };
      }

      if (nextType === "sorting") {
        return {
          ...current,
          questionType: nextType,
          instruction: "Put the items in the correct order.",
          correctOptionKey: "",
        };
      }

      return {
        ...current,
        questionType: nextType,
        options:
          current.options.length >= 2
            ? current.options
            : EMPTY_QUESTION.options,
        correctOptionKey: current.correctOptionKey || "A",
      };
    });
  }

  function updateOption(index: number, field: "text" | "asset_path", value: string) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option,
      ),
    }));
  }

  function addOption() {
    setDraft((current) => ({
      ...current,
      options: [
        ...current.options,
        {
          key: makeOptionKey(current.options.length),
          text: "",
          asset_path: "",
        },
      ],
    }));
  }

  function removeOption(index: number) {
    setDraft((current) => {
      if (current.options.length <= 2) return current;
      const nextOptions = current.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({
          ...option,
          key: makeOptionKey(optionIndex),
        }));

      return {
        ...current,
        options: nextOptions,
        correctOptionKey: nextOptions.some((option) => option.key === current.correctOptionKey)
          ? current.correctOptionKey
          : nextOptions[0]?.key || "A",
      };
    });
  }

  async function saveQuestion() {
    setSaving(true);
    setMessage("");

    const cleanOptions = draft.options.map((option, index) => ({
      key: makeOptionKey(index),
      text: option.text.trim(),
      asset_path: option.asset_path.trim(),
    }));

    const answerData =
      draft.questionType === "sorting"
        ? { correct_order: cleanOptions.map((option) => option.key) }
        : { correct_option_keys: [draft.correctOptionKey] };

    const { error } = await supabase.rpc("science_save_question", {
      p_question_id: draft.id,
      p_quiz_id: quizId,
      p_prompt: draft.prompt,
      p_instruction: draft.instruction,
      p_question_type: draft.questionType,
      p_question_image: draft.questionImage,
      p_marks: draft.marks,
      p_difficulty: draft.difficulty,
      p_question_order: draft.questionOrder,
      p_options: cleanOptions,
      p_answer_data: answerData,
      p_explanation: draft.explanation,
      p_process_skills: csvToArray(draft.processSkills),
      p_content_tags: csvToArray(draft.contentTags),
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditorOpen(false);
    await loadEditor();
    setMessage(draft.id ? "Question updated." : "Question added.");
  }

  async function deleteQuestion(question: ScienceEditorQuestion) {
    const confirmed = window.confirm(
      `Delete Question ${question.question_order}? This cannot be undone.`,
    );
    if (!confirmed) return;

    const { error } = await supabase.rpc("science_delete_question", {
      p_quiz_id: quizId,
      p_question_id: question.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadEditor();
    setMessage("Question deleted.");
  }

  async function changeQuizStatus(status: ScienceQuizStatus) {
    if (!quiz) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("science_save_quiz", {
      p_quiz_id: quiz.id,
      p_topic_id: quiz.topic_id,
      p_title: quiz.title,
      p_description: quiz.description || "",
      p_mission_type: quiz.mission_type,
      p_sequence_no: quiz.sequence_no,
      p_difficulty: quiz.difficulty,
      p_question_target: quiz.question_target,
      p_estimated_minutes: quiz.estimated_minutes,
      p_status: status,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadEditor();
    setMessage(`Quiz status changed to ${SCIENCE_STATUS_META[status].label}.`);
  }

  const accessAllowed = canEditScience(role);

  return (
    <SciencePageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/learning-missions/science/manage"
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-200/25 bg-white/[0.055] px-4 text-sm font-extrabold text-white no-underline"
        >
          ← Curriculum Manager
        </Link>
        {accessAllowed && quiz && (
          <div className="flex flex-wrap gap-2">
            <select
              value={quiz.status}
              onChange={(event) => void changeQuizStatus(event.target.value as ScienceQuizStatus)}
              disabled={saving}
              className="min-h-11 rounded-full border border-violet-200/25 bg-[#17112f] px-4 text-xs font-black uppercase tracking-[0.1em] text-violet-100 outline-none"
            >
              {(Object.keys(SCIENCE_STATUS_META) as ScienceQuizStatus[]).map((status) => (
                <option key={status} value={status}>
                  {SCIENCE_STATUS_META[status].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={startNewQuestion}
              className="min-h-11 rounded-full border border-emerald-200/25 bg-emerald-300/15 px-5 text-xs font-black uppercase tracking-[0.12em] text-emerald-100"
            >
              + Add Question
            </button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
          Loading quiz editor…
        </div>
      ) : !accessAllowed || !quiz ? (
        <div className="mt-7 rounded-3xl border border-rose-200/25 bg-rose-300/10 p-6 text-rose-100">
          {message || "Quiz editor unavailable."}
        </div>
      ) : (
        <>
          <section className="mt-7 rounded-[2.2rem] border border-violet-200/18 bg-[linear-gradient(145deg,rgba(34,18,65,0.76),rgba(4,14,32,0.9))] p-6 shadow-[0_28px_84px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    {SCIENCE_MISSION_META[quiz.mission_type].icon} {SCIENCE_MISSION_META[quiz.mission_type].label}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${SCIENCE_STATUS_META[quiz.status].className}`}>
                    {SCIENCE_STATUS_META[quiz.status].label}
                  </span>
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                  {quiz.school_level} · {quiz.topic_title}
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                  {quiz.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/55">
                  {quiz.description || "No quiz description yet."}
                </p>
              </div>

              <div className="grid min-w-[250px] grid-cols-3 gap-3 lg:grid-cols-1">
                <Metric label="Questions" value={questions.length} />
                <Metric label="Target" value={quiz.question_target} />
                <Metric label="Marks" value={totalMarks} />
              </div>
            </div>
          </section>

          {message && (
            <div className="mt-6 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-5 py-4 text-sm text-cyan-100">
              {message}
            </div>
          )}

          <section className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Question Bank
                </p>
                <h2 className="mt-2 text-3xl font-black">Questions in this quiz</h2>
              </div>
              <p className="m-0 max-w-xl text-sm leading-6 text-white/45">
                Phase 1 supports MCQ, True/False, Image Choice and Sorting. More complex Science question formats will be added after the P1 workflow is tested.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {questions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.03] p-8 text-center">
                  <p className="m-0 text-white/48">No questions have been added.</p>
                  <button
                    type="button"
                    onClick={startNewQuestion}
                    className="mt-5 min-h-11 rounded-full border border-emerald-200/25 bg-emerald-300/12 px-5 text-sm font-extrabold text-emerald-100"
                  >
                    Add Question 1
                  </button>
                </div>
              ) : (
                questions.map((question) => {
                  const correctKeys = Array.isArray(question.answer_data?.correct_option_keys)
                    ? (question.answer_data.correct_option_keys as string[])
                    : [];
                  const correctOrder = Array.isArray(question.answer_data?.correct_order)
                    ? (question.answer_data.correct_order as string[])
                    : [];

                  return (
                    <article
                      key={question.id}
                      className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(145deg,rgba(8,30,55,0.78),rgba(3,13,30,0.9))] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                              Question {question.question_order}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/48">
                              {question.question_type.replaceAll("_", " ")}
                            </span>
                            <span className="text-xs text-white/38">
                              {question.default_marks} mark{Number(question.default_marks) === 1 ? "" : "s"}
                            </span>
                          </div>

                          <h3 className="mt-4 text-lg font-black leading-7">
                            {question.prompt}
                          </h3>
                          {question.question_image && (
                            <img
                              src={question.question_image}
                              alt="Question illustration"
                              className="mt-4 max-h-64 max-w-full rounded-2xl border border-white/10 bg-white object-contain"
                            />
                          )}

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option) => {
                              const isCorrect =
                                correctKeys.includes(option.key) ||
                                (question.question_type === "sorting" && correctOrder.includes(option.key));

                              return (
                                <div
                                  key={option.key}
                                  className={`rounded-xl border p-3 text-sm ${
                                    isCorrect && question.question_type !== "sorting"
                                      ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                                      : "border-white/10 bg-white/[0.035] text-white/62"
                                  }`}
                                >
                                  <strong>{option.key}.</strong> {option.text || "Image option"}
                                  {option.asset_path && (
                                    <img
                                      src={option.asset_path}
                                      alt={`Option ${option.key}`}
                                      className="mt-2 h-24 w-full rounded-lg bg-white object-contain"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {question.question_type === "sorting" && correctOrder.length > 0 && (
                            <p className="mt-3 text-xs text-emerald-100/75">
                              Correct order: {correctOrder.join(" → ")}
                            </p>
                          )}

                          {question.explanation && (
                            <div className="mt-4 rounded-xl border border-violet-200/16 bg-violet-300/[0.07] p-3 text-sm leading-6 text-white/58">
                              <strong className="text-violet-100">Explanation:</strong>{" "}
                              {question.explanation}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => editQuestion(question)}
                            className="min-h-10 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm font-bold text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteQuestion(question)}
                            className="min-h-10 rounded-xl border border-rose-200/20 bg-rose-300/10 px-4 text-sm font-bold text-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/78 p-4 backdrop-blur-md">
          <section className="mx-auto my-4 w-full max-w-5xl rounded-[2rem] border border-violet-200/24 bg-[#071326] p-5 shadow-[0_36px_100px_rgba(0,0,0,0.62)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                  Question editor
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {draft.id ? `Edit Question ${draft.questionOrder}` : `Add Question ${draft.questionOrder}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-xl text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Question type">
                <select
                  value={draft.questionType}
                  onChange={(event) => changeQuestionType(event.target.value as ScienceQuestionType)}
                  className={inputClass}
                >
                  {SUPPORTED_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>

              <NumberField label="Question order" value={draft.questionOrder} min={1} max={100} onChange={(value) => setDraft((current) => ({ ...current, questionOrder: value }))} />

              <Field label="Question prompt" wide>
                <textarea
                  value={draft.prompt}
                  onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
                  className={`${inputClass} min-h-28 resize-y py-3`}
                  placeholder="What should the child observe or decide?"
                />
              </Field>

              <Field label="Instruction" wide>
                <input
                  value={draft.instruction}
                  onChange={(event) => setDraft((current) => ({ ...current, instruction: event.target.value }))}
                  className={inputClass}
                  placeholder="Choose the best answer."
                />
              </Field>

              <Field label="Question image URL" wide>
                <input
                  value={draft.questionImage}
                  onChange={(event) => setDraft((current) => ({ ...current, questionImage: event.target.value }))}
                  className={inputClass}
                  placeholder="/science/p1/example.png"
                />
              </Field>

              <NumberField label="Marks" value={draft.marks} min={0.25} max={10} step={0.25} onChange={(value) => setDraft((current) => ({ ...current, marks: value }))} />
              <NumberField label="Difficulty" value={draft.difficulty} min={1} max={5} onChange={(value) => setDraft((current) => ({ ...current, difficulty: value }))} />

              <Field label="Process skills">
                <input
                  value={draft.processSkills}
                  onChange={(event) => setDraft((current) => ({ ...current, processSkills: event.target.value }))}
                  className={inputClass}
                  placeholder="observing, comparing"
                />
              </Field>

              <Field label="Content tags">
                <input
                  value={draft.contentTags}
                  onChange={(event) => setDraft((current) => ({ ...current, contentTags: event.target.value }))}
                  className={inputClass}
                  placeholder="p1, living-things"
                />
              </Field>
            </div>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-lg font-black">
                    {draft.questionType === "sorting" ? "Items in correct order" : "Answer options"}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-white/42">
                    {draft.questionType === "sorting"
                      ? "Enter the items in their correct order. The student version will shuffle them."
                      : "Select the correct answer. Add image URLs for visual options."}
                  </p>
                </div>
                {draft.questionType !== "true_false" && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="min-h-10 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-4 text-xs font-black uppercase tracking-[0.1em] text-cyan-100"
                  >
                    + Add option
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3">
                {draft.options.map((option, index) => (
                  <div
                    key={`${option.key}-${index}`}
                    className="grid gap-3 rounded-xl border border-white/10 bg-black/15 p-3 md:grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
                  >
                    <label className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/[0.05]">
                      {draft.questionType === "sorting" ? (
                        <strong>{index + 1}</strong>
                      ) : (
                        <input
                          type="radio"
                          name="correct-option"
                          checked={draft.correctOptionKey === option.key}
                          onChange={() => setDraft((current) => ({ ...current, correctOptionKey: option.key }))}
                          className="h-4 w-4 accent-emerald-400"
                        />
                      )}
                    </label>

                    <input
                      value={option.text}
                      onChange={(event) => updateOption(index, "text", event.target.value)}
                      className={inputClass}
                      placeholder={`Option ${option.key} text`}
                    />
                    <input
                      value={option.asset_path}
                      onChange={(event) => updateOption(index, "asset_path", event.target.value)}
                      className={inputClass}
                      placeholder="Optional image URL"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={draft.questionType === "true_false" || draft.options.length <= 2}
                      className="min-h-10 rounded-xl border border-rose-200/16 bg-rose-300/[0.07] px-3 text-sm font-bold text-rose-100 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <Field label="Answer explanation" wide>
              <textarea
                value={draft.explanation}
                onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))}
                className={`${inputClass} mt-2 min-h-28 resize-y py-3`}
                placeholder="Explain why the answer is correct in child-friendly language."
              />
            </Field>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.04] px-5 font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveQuestion()}
                disabled={saving || !draft.prompt.trim() || draft.options.length < 2}
                className="min-h-12 rounded-2xl border border-emerald-200/28 bg-emerald-300/16 px-6 font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "Saving…" : draft.id ? "Save question" : "Add question"}
              </button>
            </div>
          </section>
        </div>
      )}
    </SciencePageShell>
  );
}

const inputClass =
  "min-h-12 w-full rounded-2xl border border-white/12 bg-[#091a33] px-4 text-sm font-semibold text-white outline-none focus:border-cyan-200/35";

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">{value}</strong>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.13em] text-white/42">
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <label className={`grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/45 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      />
    </Field>
  );
}
