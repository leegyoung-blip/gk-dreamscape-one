"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  csvToArray,
  makeOptionKey,
  SCIENCE_MISSION_META,
  SCIENCE_STATUS_META,
} from "@/lib/science/helpers";
import type {
  ScienceEditorQuestion,
  ScienceLevelRow,
  ScienceMissionType,
  ScienceQuestionOption,
  ScienceQuestionType,
  ScienceQuizEditorPayload,
  ScienceQuizRow,
  ScienceQuizStatus,
  ScienceTopicRow,
} from "@/lib/science/types";
import type { CurriculumRole } from "../types";
import ScienceQuizImportView from "./ScienceQuizImportView";

type BuilderTab = "quizzes" | "import";
type QuizDraft = {
  id: string | null;
  topicId: string;
  title: string;
  description: string;
  missionType: ScienceMissionType;
  sequenceNo: number;
  difficulty: number;
  questionTarget: number;
  estimatedMinutes: number;
  status: ScienceQuizStatus;
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

const EMPTY_QUIZ: QuizDraft = {
  id: null,
  topicId: "",
  title: "",
  description: "",
  missionType: "learn",
  sequenceNo: 1,
  difficulty: 1,
  questionTarget: 10,
  estimatedMinutes: 10,
  status: "draft",
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
  options: ["A", "B", "C", "D"].map((key) => ({
    key,
    text: "",
    asset_path: "",
  })),
  correctOptionKey: "A",
  explanation: "",
  processSkills: "",
  contentTags: "",
};
const SUPPORTED_TYPES: Array<{ value: ScienceQuestionType; label: string }> = [
  { value: "mcq", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "image_choice", label: "Image choice" },
  { value: "sorting", label: "Sorting" },
];

export default function ScienceBuilderView({
  role,
  initialQuizId = null,
  onQuizChange,
}: {
  role: CurriculumRole;
  initialQuizId?: string | null;
  onQuizChange?: (quizId: string | null) => void;
}) {
  const [tab, setTab] = useState<BuilderTab>("quizzes");
  const [levels, setLevels] = useState<ScienceLevelRow[]>([]);
  const [topics, setTopics] = useState<ScienceTopicRow[]>([]);
  const [quizzes, setQuizzes] = useState<ScienceQuizRow[]>([]);
  const [level, setLevel] = useState(1);
  const [topicId, setTopicId] = useState("all");
  const [status, setStatus] = useState<ScienceQuizStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [payload, setPayload] = useState<ScienceQuizEditorPayload | null>(null);
  const [quizDraft, setQuizDraft] = useState<QuizDraft>(EMPTY_QUIZ);
  const [questionDraft, setQuestionDraft] =
    useState<QuestionDraft>(EMPTY_QUESTION);
  const [quizModal, setQuizModal] = useState(false);
  const [questionModal, setQuestionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inventoryRequest = useRef(0);
  const selectedQuizLevel = useRef<number | null>(null);

  const loadInventory = useCallback(async () => {
    const request = inventoryRequest.current + 1;
    inventoryRequest.current = request;
    setLoading(true);
    setError(null);
    const { data: levelRows, error: levelError } = await supabase
      .from("science_levels")
      .select("*")
      .order("sort_order");
    if (request !== inventoryRequest.current) return;
    if (levelError) {
      setError(levelError.message);
      setLoading(false);
      return;
    }
    const loadedLevels = (levelRows || []) as ScienceLevelRow[];
    setLevels(loadedLevels);
    const levelId = loadedLevels.find(
      (item) => item.level_number === level,
    )?.id;
    if (!levelId) {
      setTopics([]);
      setQuizzes([]);
      setLoading(false);
      return;
    }
    const { data: topicRows, error: topicError } = await supabase
      .from("science_topics")
      .select("*")
      .eq("level_id", levelId)
      .order("sort_order");
    if (request !== inventoryRequest.current) return;
    if (topicError) {
      setError(topicError.message);
      setLoading(false);
      return;
    }
    const loadedTopics = (topicRows || []) as ScienceTopicRow[];
    setTopics(loadedTopics);
    const ids = loadedTopics.map((item) => item.id);
    if (!ids.length) {
      setQuizzes([]);
      setLoading(false);
      return;
    }
    const { data: quizRows, error: quizError } = await supabase
      .from("science_quizzes")
      .select("*")
      .in("topic_id", ids)
      .order("sequence_no");
    if (request !== inventoryRequest.current) return;
    if (quizError) setError(quizError.message);
    else setQuizzes((quizRows || []) as ScienceQuizRow[]);
    setLoading(false);
  }, [level]);

  const loadEditor = useCallback(
    async (quizId: string) => {
      setBusy(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc(
        "science_get_quiz_editor",
        { p_quiz_id: quizId },
      );
      if (rpcError) setError(rpcError.message);
      else {
        const loaded = data as ScienceQuizEditorPayload;
        if (loaded.error || !loaded.quiz)
          setError("Quiz not found or access denied.");
        else {
          setPayload(loaded);
          setSelectedQuizId(quizId);
          onQuizChange?.(quizId);
          const levelMatch = /^p([1-6])$/i.exec(loaded.quiz.level_slug);
          if (levelMatch) {
            selectedQuizLevel.current = Number(levelMatch[1]);
            setLevel(selectedQuizLevel.current);
          }

          const url = new URL(window.location.href);
          url.searchParams.set("section", "operations");
          url.searchParams.set("operationsTab", "science");
          url.searchParams.set("quizId", quizId);
          window.history.replaceState(
            {},
            "",
            `${url.pathname}${url.search}${url.hash}`,
          );
        }
      }
      setBusy(false);
    },
    [onQuizChange],
  );

  useEffect(() => {
    setTopicId("all");
    setSelectedQuizId((current) =>
      selectedQuizLevel.current === level ? current : null,
    );
    setPayload((current) =>
      selectedQuizLevel.current === level ? current : null,
    );
    if (selectedQuizLevel.current !== level) selectedQuizLevel.current = null;
    void loadInventory();
  }, [level, loadInventory]);

  useEffect(() => {
    if (initialQuizId) void loadEditor(initialQuizId);
  }, [initialQuizId, loadEditor]);

  const visible = useMemo(
    () =>
      quizzes.filter((quiz) => {
        if (topicId !== "all" && quiz.topic_id !== topicId) return false;
        if (status !== "all" && quiz.status !== status) return false;
        const query = search.trim().toLowerCase();
        return (
          !query || `${quiz.title} ${quiz.slug}`.toLowerCase().includes(query)
        );
      }),
    [quizzes, search, status, topicId],
  );
  const questions = payload?.questions || [];

  function changeLevel(nextLevel: number) {
    const url = new URL(window.location.href);
    url.searchParams.delete("quizId");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    onQuizChange?.(null);
    setLevel(nextLevel);
  }

  function newQuiz() {
    const chosenTopic = topicId !== "all" ? topicId : topics[0]?.id || "";
    const next =
      Math.max(
        0,
        ...quizzes
          .filter((quiz) => quiz.topic_id === chosenTopic)
          .map((quiz) => quiz.sequence_no),
      ) + 1;
    setQuizDraft({ ...EMPTY_QUIZ, topicId: chosenTopic, sequenceNo: next });
    setQuizModal(true);
    setError(null);
    setNotice(null);
  }
  function editQuiz(quiz: ScienceQuizRow) {
    setQuizDraft({
      id: quiz.id,
      topicId: quiz.topic_id,
      title: quiz.title,
      description: quiz.description || "",
      missionType: quiz.mission_type,
      sequenceNo: quiz.sequence_no,
      difficulty: quiz.difficulty,
      questionTarget: quiz.question_target,
      estimatedMinutes: quiz.estimated_minutes,
      status: quiz.status,
    });
    setQuizModal(true);
    setError(null);
    setNotice(null);
  }
  async function saveQuiz() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("science_save_quiz", {
      p_quiz_id: quizDraft.id,
      p_topic_id: quizDraft.topicId,
      p_title: quizDraft.title,
      p_description: quizDraft.description,
      p_mission_type: quizDraft.missionType,
      p_sequence_no: quizDraft.sequenceNo,
      p_difficulty: quizDraft.difficulty,
      p_question_target: quizDraft.questionTarget,
      p_estimated_minutes: quizDraft.estimatedMinutes,
      p_status: quizDraft.status,
    });
    if (rpcError) setError(rpcError.message);
    else {
      const id = String(data);
      setQuizModal(false);
      await loadInventory();
      await loadEditor(id);
      setNotice(
        quizDraft.id
          ? "Science quiz updated."
          : "Science quiz created as a draft.",
      );
    }
    setBusy(false);
  }

  function newQuestion() {
    setQuestionDraft({
      ...EMPTY_QUESTION,
      questionOrder: questions.length + 1,
    });
    setQuestionModal(true);
  }
  function editQuestion(question: ScienceEditorQuestion) {
    const correct = Array.isArray(question.answer_data.correct_option_keys)
      ? (question.answer_data.correct_option_keys as string[])
      : [];
    setQuestionDraft({
      id: question.id,
      prompt: question.prompt,
      instruction: question.instruction || "",
      questionType: question.question_type,
      questionImage: question.question_image || "",
      marks: Number(question.default_marks),
      difficulty: Number(question.difficulty),
      questionOrder: Number(question.question_order),
      options: question.options.length
        ? question.options.map((option) => ({ ...option }))
        : EMPTY_QUESTION.options,
      correctOptionKey: correct[0] || question.options[0]?.key || "A",
      explanation: question.explanation || "",
      processSkills: question.process_skills.join(", "),
      contentTags: question.content_tags.join(", "),
    });
    setQuestionModal(true);
  }
  function changeType(type: ScienceQuestionType) {
    setQuestionDraft((current) =>
      type === "true_false"
        ? {
            ...current,
            questionType: type,
            options: [
              { key: "A", text: "True", asset_path: "" },
              { key: "B", text: "False", asset_path: "" },
            ],
            correctOptionKey: "A",
          }
        : {
            ...current,
            questionType: type,
            correctOptionKey:
              type === "sorting" ? "" : current.correctOptionKey || "A",
          },
    );
  }
  function updateOption(
    index: number,
    field: "text" | "asset_path",
    value: string,
  ) {
    setQuestionDraft((current) => ({
      ...current,
      options: current.options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option,
      ),
    }));
  }
  function addOption() {
    setQuestionDraft((current) => ({
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
    setQuestionDraft((current) => {
      if (current.options.length <= 2) return current;
      const next = current.options
        .filter((_, i) => i !== index)
        .map((option, i) => ({ ...option, key: makeOptionKey(i) }));
      return {
        ...current,
        options: next,
        correctOptionKey: next.some(
          (option) => option.key === current.correctOptionKey,
        )
          ? current.correctOptionKey
          : next[0]?.key || "A",
      };
    });
  }
  async function saveQuestion() {
    if (!selectedQuizId) return;
    setBusy(true);
    setError(null);
    const options = questionDraft.options.map((option, index) => ({
      key: makeOptionKey(index),
      text: option.text.trim(),
      asset_path: option.asset_path.trim(),
    }));
    const answer =
      questionDraft.questionType === "sorting"
        ? { correct_order: options.map((option) => option.key) }
        : { correct_option_keys: [questionDraft.correctOptionKey] };
    const { error: rpcError } = await supabase.rpc("science_save_question", {
      p_question_id: questionDraft.id,
      p_quiz_id: selectedQuizId,
      p_prompt: questionDraft.prompt,
      p_instruction: questionDraft.instruction,
      p_question_type: questionDraft.questionType,
      p_question_image: questionDraft.questionImage,
      p_marks: questionDraft.marks,
      p_difficulty: questionDraft.difficulty,
      p_question_order: questionDraft.questionOrder,
      p_options: options,
      p_answer_data: answer,
      p_explanation: questionDraft.explanation,
      p_process_skills: csvToArray(questionDraft.processSkills),
      p_content_tags: csvToArray(questionDraft.contentTags),
    });
    if (rpcError) setError(rpcError.message);
    else {
      setQuestionModal(false);
      await loadEditor(selectedQuizId);
      setNotice(questionDraft.id ? "Question updated." : "Question added.");
    }
    setBusy(false);
  }
  async function deleteQuestion(question: ScienceEditorQuestion) {
    if (
      !selectedQuizId ||
      !window.confirm(
        `Delete Question ${question.question_order}? This cannot be undone.`,
      )
    )
      return;
    const { error: rpcError } = await supabase.rpc("science_delete_question", {
      p_quiz_id: selectedQuizId,
      p_question_id: question.id,
    });
    if (rpcError) setError(rpcError.message);
    else {
      await loadEditor(selectedQuizId);
      setNotice("Question deleted.");
    }
  }

  return (
    <div style={stack}>
      <div style={subtabs}>
        <button
          style={tab === "quizzes" ? activeTab : tabButton}
          onClick={() => setTab("quizzes")}
        >
          Science quizzes
        </button>
        <button
          style={tab === "import" ? activeTab : tabButton}
          onClick={() => setTab("import")}
        >
          Science CSV import
        </button>
      </div>
      {tab === "import" ? (
        <ScienceQuizImportView role={role} />
      ) : (
        <>
          <section style={card}>
            <div style={row}>
              <div>
                <p style={eyebrow}>P1–P6 SCIENCE BUILDER</p>
                <h2 style={heading}>Quiz and question management</h2>
                <p style={muted}>
                  Uses the existing Science tables and student player. Nothing
                  is copied into the English/Math model.
                </p>
              </div>
              <button style={primary} onClick={newQuiz}>
                + Create Science quiz
              </button>
            </div>
            <div style={filters}>
              <Field label="Level">
                <select
                  style={input}
                  value={level}
                  onChange={(e) => changeLevel(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      Primary {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Topic">
                <select
                  style={input}
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                >
                  <option value="all">All topics</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  style={input}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ScienceQuizStatus | "all")
                  }
                >
                  <option value="all">All statuses</option>
                  {(
                    Object.keys(SCIENCE_STATUS_META) as ScienceQuizStatus[]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {SCIENCE_STATUS_META[value].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Search">
                <input
                  style={input}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Quiz title or slug"
                />
              </Field>
              <button style={secondary} onClick={() => void loadInventory()}>
                Refresh
              </button>
            </div>
            {error && <div style={errorBox}>{error}</div>}
            {notice && <div style={successBox}>{notice}</div>}
            <div style={summary}>
              {levels.length} levels · {topics.length} topics in P{level} ·{" "}
              {visible.length} quizzes shown
            </div>
          </section>
          <div style={layout}>
            <section style={card}>
              <div style={row}>
                <h2 style={heading}>Quizzes</h2>
                <span style={muted}>
                  {loading ? "Loading…" : `${visible.length} shown`}
                </span>
              </div>
              <div style={list}>
                {visible.map((quiz) => (
                  <article
                    key={quiz.id}
                    style={selectedQuizId === quiz.id ? selectedCard : quizCard}
                  >
                    <button
                      type="button"
                      style={quizOpen}
                      onClick={() => void loadEditor(quiz.id)}
                    >
                      <span>
                        <strong>
                          {quiz.sequence_no}. {quiz.title}
                        </strong>
                        <small style={small}>
                          {
                            topics.find((topic) => topic.id === quiz.topic_id)
                              ?.title
                          }{" "}
                          · {SCIENCE_MISSION_META[quiz.mission_type].shortLabel}
                        </small>
                      </span>
                      <span style={statusPill}>{quiz.status}</span>
                    </button>
                    <button style={editButton} onClick={() => editQuiz(quiz)}>
                      Edit details
                    </button>
                  </article>
                ))}
                {!loading && !visible.length && (
                  <div style={empty}>No quizzes match these filters.</div>
                )}
              </div>
            </section>
            <section style={card}>
              {!payload?.quiz ? (
                <div style={empty}>Choose a quiz to manage its questions.</div>
              ) : (
                <>
                  <div style={row}>
                    <div>
                      <p style={eyebrow}>
                        {payload.quiz.school_level} · {payload.quiz.topic_title}
                      </p>
                      <h2 style={heading}>{payload.quiz.title}</h2>
                      <p style={muted}>
                        {questions.length} / {payload.quiz.question_target}{" "}
                        questions
                      </p>
                    </div>
                    <button style={primary} onClick={newQuestion}>
                      + Add question
                    </button>
                  </div>
                  <div style={list}>
                    {questions.map((question) => (
                      <article key={question.id} style={questionCard}>
                        <div>
                          <small style={small}>
                            Question {question.question_order} ·{" "}
                            {question.question_type.replaceAll("_", " ")} ·{" "}
                            {question.default_marks} mark(s)
                          </small>
                          <strong style={{ display: "block", marginTop: 6 }}>
                            {question.prompt}
                          </strong>
                          <small style={small}>
                            {question.options
                              .map(
                                (option) =>
                                  `${option.key}. ${option.text || "[image]"}`,
                              )
                              .join(" · ")}
                          </small>
                        </div>
                        <div style={actions}>
                          <button
                            style={secondary}
                            onClick={() => editQuestion(question)}
                          >
                            Edit
                          </button>
                          <button
                            style={deleteButton}
                            onClick={() => void deleteQuestion(question)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
      {quizModal && (
        <Modal
          title={quizDraft.id ? "Edit Science quiz" : "Create Science quiz"}
          onClose={() => setQuizModal(false)}
        >
          <div style={modalGrid}>
            <Field label="Topic" wide>
              <select
                style={input}
                value={quizDraft.topicId}
                onChange={(e) =>
                  setQuizDraft({ ...quizDraft, topicId: e.target.value })
                }
              >
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" wide>
              <input
                style={input}
                value={quizDraft.title}
                onChange={(e) =>
                  setQuizDraft({ ...quizDraft, title: e.target.value })
                }
              />
            </Field>
            <Field label="Description" wide>
              <textarea
                style={{ ...input, minHeight: 80, paddingTop: 10 }}
                value={quizDraft.description}
                onChange={(e) =>
                  setQuizDraft({ ...quizDraft, description: e.target.value })
                }
              />
            </Field>
            <Field label="Mission type">
              <select
                style={input}
                value={quizDraft.missionType}
                onChange={(e) =>
                  setQuizDraft({
                    ...quizDraft,
                    missionType: e.target.value as ScienceMissionType,
                  })
                }
              >
                {Object.keys(SCIENCE_MISSION_META).map((value) => (
                  <option key={value} value={value}>
                    {SCIENCE_MISSION_META[value as ScienceMissionType].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                style={input}
                value={quizDraft.status}
                onChange={(e) =>
                  setQuizDraft({
                    ...quizDraft,
                    status: e.target.value as ScienceQuizStatus,
                  })
                }
              >
                {Object.keys(SCIENCE_STATUS_META).map((value) => (
                  <option key={value} value={value}>
                    {SCIENCE_STATUS_META[value as ScienceQuizStatus].label}
                  </option>
                ))}
              </select>
            </Field>
            <NumberField
              label="Sequence"
              value={quizDraft.sequenceNo}
              onChange={(value) =>
                setQuizDraft({ ...quizDraft, sequenceNo: value })
              }
            />
            <NumberField
              label="Difficulty"
              value={quizDraft.difficulty}
              max={5}
              onChange={(value) =>
                setQuizDraft({ ...quizDraft, difficulty: value })
              }
            />
            <NumberField
              label="Question target"
              value={quizDraft.questionTarget}
              max={30}
              onChange={(value) =>
                setQuizDraft({ ...quizDraft, questionTarget: value })
              }
            />
            <NumberField
              label="Minutes"
              value={quizDraft.estimatedMinutes}
              max={120}
              onChange={(value) =>
                setQuizDraft({ ...quizDraft, estimatedMinutes: value })
              }
            />
          </div>
          <div style={footer}>
            <button style={secondary} onClick={() => setQuizModal(false)}>
              Cancel
            </button>
            <button
              style={primary}
              disabled={busy}
              onClick={() => void saveQuiz()}
            >
              {busy ? "Saving…" : "Save quiz"}
            </button>
          </div>
        </Modal>
      )}
      {questionModal && (
        <Modal
          title={
            questionDraft.id
              ? `Edit Question ${questionDraft.questionOrder}`
              : `Add Question ${questionDraft.questionOrder}`
          }
          onClose={() => setQuestionModal(false)}
        >
          <div style={modalGrid}>
            <Field label="Question type">
              <select
                style={input}
                value={questionDraft.questionType}
                onChange={(e) =>
                  changeType(e.target.value as ScienceQuestionType)
                }
              >
                {SUPPORTED_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <NumberField
              label="Order"
              value={questionDraft.questionOrder}
              max={100}
              onChange={(value) =>
                setQuestionDraft({ ...questionDraft, questionOrder: value })
              }
            />
            <Field label="Prompt" wide>
              <textarea
                style={{ ...input, minHeight: 90, paddingTop: 10 }}
                value={questionDraft.prompt}
                onChange={(e) =>
                  setQuestionDraft({ ...questionDraft, prompt: e.target.value })
                }
              />
            </Field>
            <Field label="Instruction" wide>
              <input
                style={input}
                value={questionDraft.instruction}
                onChange={(e) =>
                  setQuestionDraft({
                    ...questionDraft,
                    instruction: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Question image URL" wide>
              <input
                style={input}
                value={questionDraft.questionImage}
                onChange={(e) =>
                  setQuestionDraft({
                    ...questionDraft,
                    questionImage: e.target.value,
                  })
                }
              />
            </Field>
            <NumberField
              label="Marks"
              value={questionDraft.marks}
              max={10}
              onChange={(value) =>
                setQuestionDraft({ ...questionDraft, marks: value })
              }
            />
            <NumberField
              label="Difficulty"
              value={questionDraft.difficulty}
              max={5}
              onChange={(value) =>
                setQuestionDraft({ ...questionDraft, difficulty: value })
              }
            />
            <Field label="Process skills">
              <input
                style={input}
                value={questionDraft.processSkills}
                onChange={(e) =>
                  setQuestionDraft({
                    ...questionDraft,
                    processSkills: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Content tags">
              <input
                style={input}
                value={questionDraft.contentTags}
                onChange={(e) =>
                  setQuestionDraft({
                    ...questionDraft,
                    contentTags: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Explanation" wide>
              <textarea
                style={{ ...input, minHeight: 70, paddingTop: 10 }}
                value={questionDraft.explanation}
                onChange={(e) =>
                  setQuestionDraft({
                    ...questionDraft,
                    explanation: e.target.value,
                  })
                }
              />
            </Field>
          </div>
          <div style={optionBox}>
            <div style={row}>
              <strong>
                {questionDraft.questionType === "sorting"
                  ? "Items in correct order"
                  : "Answer options"}
              </strong>
              {questionDraft.questionType !== "true_false" && (
                <button style={secondary} onClick={addOption}>
                  + Add option
                </button>
              )}
            </div>
            {questionDraft.options.map((option, index) => (
              <div key={`${option.key}-${index}`} style={optionRow}>
                {questionDraft.questionType === "sorting" ? (
                  <strong>{index + 1}</strong>
                ) : (
                  <input
                    type="radio"
                    checked={questionDraft.correctOptionKey === option.key}
                    onChange={() =>
                      setQuestionDraft({
                        ...questionDraft,
                        correctOptionKey: option.key,
                      })
                    }
                  />
                )}
                <input
                  style={input}
                  value={option.text}
                  onChange={(e) => updateOption(index, "text", e.target.value)}
                  placeholder={`Option ${option.key} text`}
                />
                <input
                  style={input}
                  value={option.asset_path}
                  onChange={(e) =>
                    updateOption(index, "asset_path", e.target.value)
                  }
                  placeholder="Optional asset URL/path"
                />
                <button
                  style={deleteButton}
                  onClick={() => removeOption(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div style={footer}>
            <button style={secondary} onClick={() => setQuestionModal(false)}>
              Cancel
            </button>
            <button
              style={primary}
              disabled={busy}
              onClick={() => void saveQuestion()}
            >
              {busy ? "Saving…" : "Save question"}
            </button>
          </div>
        </Modal>
      )}
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
  children: ReactNode;
}) {
  return (
    <label style={{ ...fieldLabel, gridColumn: wide ? "1 / -1" : undefined }}>
      {label}
      {children}
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  max = 999,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={1}
        max={max}
        style={input}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div style={overlay}>
      <section style={modal}>
        <div style={row}>
          <h2 style={heading}>{title}</h2>
          <button style={close} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

const stack: CSSProperties = { display: "grid", gap: 18 };
const subtabs: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const tabButton: CSSProperties = {
  padding: "10px 15px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.04)",
  color: "rgba(255,255,255,.65)",
  fontWeight: 850,
};
const activeTab: CSSProperties = {
  ...tabButton,
  background: "rgba(83,215,255,.14)",
  color: "#bfefff",
  borderColor: "rgba(83,215,255,.35)",
};
const card: CSSProperties = {
  display: "grid",
  gap: 15,
  padding: 18,
  border: "1px solid rgba(126,232,255,.16)",
  borderRadius: 18,
  background: "rgba(13,29,57,.72)",
};
const row: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};
const filters: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 10,
};
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 150,
  fontSize: 12,
  fontWeight: 800,
  color: "rgba(255,255,255,.7)",
};
const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid rgba(126,232,255,.2)",
  background: "#0d1a31",
  color: "white",
  padding: "0 11px",
};
const primary: CSSProperties = {
  minHeight: 42,
  border: 0,
  borderRadius: 10,
  background: "#53d7ff",
  color: "#071326",
  padding: "0 15px",
  fontWeight: 900,
};
const secondary: CSSProperties = {
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(255,255,255,.05)",
  color: "white",
  padding: "0 13px",
  fontWeight: 800,
};
const deleteButton: CSSProperties = {
  ...secondary,
  color: "#fecaca",
  borderColor: "rgba(251,113,133,.25)",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};
const heading: CSSProperties = { margin: "5px 0 0", fontSize: 22 };
const muted: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,.55)",
  fontSize: 13,
  lineHeight: 1.5,
};
const small: CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "rgba(255,255,255,.48)",
  fontSize: 11,
};
const summary: CSSProperties = { color: "#bfefff", fontSize: 12 };
const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
  gap: 16,
  alignItems: "start",
};
const list: CSSProperties = {
  display: "grid",
  gap: 8,
  maxHeight: 720,
  overflowY: "auto",
};
const quizCard: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center",
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.08)",
  background: "rgba(255,255,255,.03)",
};
const selectedCard: CSSProperties = {
  ...quizCard,
  borderColor: "rgba(83,215,255,.45)",
  background: "rgba(83,215,255,.08)",
};
const quizOpen: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  textAlign: "left",
  border: 0,
  background: "transparent",
  color: "white",
};
const editButton: CSSProperties = {
  ...secondary,
  minHeight: 34,
  padding: "0 10px",
  fontSize: 11,
};
const statusPill: CSSProperties = {
  borderRadius: 999,
  padding: "4px 7px",
  background: "rgba(255,255,255,.07)",
  fontSize: 9,
  textTransform: "uppercase",
};
const questionCard: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  padding: 13,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.08)",
  background: "rgba(255,255,255,.03)",
};
const actions: CSSProperties = { display: "flex", gap: 7, alignItems: "start" };
const empty: CSSProperties = {
  padding: 24,
  textAlign: "center",
  color: "rgba(255,255,255,.45)",
};
const errorBox: CSSProperties = {
  padding: 12,
  borderRadius: 11,
  background: "rgba(239,68,68,.13)",
  color: "#fecaca",
};
const successBox: CSSProperties = {
  padding: 12,
  borderRadius: 11,
  background: "rgba(16,185,129,.13)",
  color: "#a7f3d0",
};
const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  overflowY: "auto",
  padding: 16,
  background: "rgba(0,0,0,.78)",
  backdropFilter: "blur(8px)",
};
const modal: CSSProperties = {
  display: "grid",
  gap: 18,
  maxWidth: 900,
  margin: "20px auto",
  padding: 22,
  borderRadius: 20,
  border: "1px solid rgba(126,232,255,.22)",
  background: "#071326",
  color: "white",
};
const modalGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 12,
};
const footer: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};
const close: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.15)",
  background: "rgba(255,255,255,.05)",
  color: "white",
  fontSize: 22,
};
const optionBox: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 13,
  background: "rgba(255,255,255,.035)",
};
const optionRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px 1fr 1fr auto",
  gap: 8,
  alignItems: "center",
};
