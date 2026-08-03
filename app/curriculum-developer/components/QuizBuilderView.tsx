"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import QuestionForm, { type QuestionPayload } from "./QuestionForm";
import QuizPreviewModal from "./QuizPreviewModal";
import { syncQuestionMedia } from "../media";
import type {
  CoreQuiz,
  CoreSkill,
  CoreSubject,
  CoreTopic,
  CurriculumRole,
  FeedbackMode,
  LinkedQuestion,
  QuizFormState,
  QuizType,
} from "../types";

const EMPTY_FORM: QuizFormState = {
  topicId: "",
  skillId: "",
  title: "",
  description: "",
  quizType: "standard",
  difficulty: 1,
  questionCount: 8,
  estimatedMinutes: 8,
  passingPercentage: 70,
  rewardTokens: 8,
  rewardGems: 1,
  feedbackMode: "immediate",
  randomiseQuestions: false,
  randomiseOptions: false,
};

const CONTENT_TABLES: Record<
  CoreSubject,
  {
    quizQuestions: string;
    questions: string;
    stimuli: string;
    questionAssets: string;
  }
> = {
  english: {
    quizQuestions: "english_quiz_questions",
    questions: "english_questions",
    stimuli: "english_stimuli",
    questionAssets: "english_question_assets",
  },
  math: {
    quizQuestions: "math_quiz_questions",
    questions: "math_questions",
    stimuli: "math_stimuli",
    questionAssets: "math_question_assets",
  },
};

const CURRICULUM_RPCS: Record<
  CoreSubject,
  {
    createQuizDraft: string;
    updateQuizDraft: string;
    saveQuestion: string;
    deleteQuestion: string;
    reorderQuestions: string;
    submitQuiz: string;
  }
> = {
  english: {
    createQuizDraft: "curriculum_create_english_quiz_draft",
    updateQuizDraft: "curriculum_update_english_quiz_draft",
    saveQuestion: "curriculum_save_english_question",
    deleteQuestion: "curriculum_delete_english_question",
    reorderQuestions: "curriculum_reorder_english_quiz_questions",
    submitQuiz: "curriculum_submit_english_quiz",
  },
  math: {
    createQuizDraft: "curriculum_create_math_quiz_draft",
    updateQuizDraft: "curriculum_update_math_quiz_draft",
    saveQuestion: "curriculum_save_math_question",
    deleteQuestion: "curriculum_delete_math_question",
    reorderQuestions: "curriculum_reorder_math_quiz_questions",
    submitQuiz: "curriculum_submit_math_quiz",
  },
};


function countQuestionMedia(question: LinkedQuestion) {
  const optionImageCount = Array.isArray(question.content?.options)
    ? question.content.options.filter(
        (option: any) => option?.image_url || option?.image_path,
      ).length
    : 0;

  return (
    (question.stimulus ? 1 : 0) +
    (question.assets?.length || 0) +
    optionImageCount
  );
}

export default function QuizBuilderView({
  role,
  topics,
  skills,
  quizzes,
  selectedQuizId,
  onSelectQuiz,
  onDataChanged,
}: {
  role: CurriculumRole;
  topics: CoreTopic[];
  skills: CoreSkill[];
  quizzes: CoreQuiz[];
  selectedQuizId: string | null;
  onSelectQuiz: (quizId: string | null) => void;
  onDataChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState<QuizFormState>(EMPTY_FORM);
  const [questions, setQuestions] = useState<LinkedQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<LinkedQuestion | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) || null,
    [quizzes, selectedQuizId],
  );

  const editable =
    !selectedQuiz ||
    ["draft", "changes_requested"].includes(selectedQuiz.status) ||
    (role === "admin" && ["in_review", "approved"].includes(selectedQuiz.status));

  const relevantSkills = skills.filter((skill) => skill.topic_id === form.topicId);
  const selectedTopic =
    topics.find((topic) => topic.id === form.topicId) || null;
  const selectedSubject: CoreSubject =
    selectedQuiz?.subject || selectedTopic?.subject || "english";
  const contentTables = CONTENT_TABLES[selectedSubject];
  const curriculumRpcs = CURRICULUM_RPCS[selectedSubject];

  useEffect(() => {
    if (!selectedQuiz) {
      setForm((current) => ({
        ...EMPTY_FORM,
        topicId: current.topicId || topics[0]?.id || "",
      }));
      setQuestions([]);
      setEditingQuestion(null);
      return;
    }

    setForm({
      topicId: selectedQuiz.topic_id,
      skillId: selectedQuiz.skill_id || "",
      title: selectedQuiz.title,
      description: selectedQuiz.description || "",
      quizType: selectedQuiz.quiz_type,
      difficulty: selectedQuiz.difficulty,
      questionCount: selectedQuiz.question_count,
      estimatedMinutes: selectedQuiz.estimated_minutes,
      passingPercentage: Number(selectedQuiz.passing_percentage),
      rewardTokens: selectedQuiz.reward_tokens,
      rewardGems: selectedQuiz.reward_gems,
      feedbackMode: selectedQuiz.feedback_mode,
      randomiseQuestions: selectedQuiz.randomise_questions,
      randomiseOptions: selectedQuiz.randomise_options,
    });
    setEditingQuestion(null);
    void loadQuestions(selectedQuiz.id);
  }, [selectedQuiz, topics]);

  async function loadQuestions(quizId: string): Promise<LinkedQuestion[]> {
    setLoadingQuestions(true);
    setError(null);

    const { data: links, error: linkError } = await supabase
      .from(contentTables.quizQuestions)
      .select("question_id, question_order, marks_override")
      .eq("quiz_id", quizId)
      .order("question_order", { ascending: true });

    if (linkError) {
      setError(linkError.message);
      setQuestions([]);
      setLoadingQuestions(false);
      return [];
    }

    const ids = (links || []).map((link: any) => String(link.question_id));
    if (ids.length === 0) {
      setQuestions([]);
      setLoadingQuestions(false);
      return [];
    }

    const { data: questionRows, error: questionError } = await supabase
      .from(contentTables.questions)
      .select(
        "id, subject, primary_level, topic_id, skill_id, stimulus_id, code, question_type, instruction, prompt, content, answer_data, explanation, skill, difficulty, marks, requires_manual_marking, status, created_by, updated_by, created_at, updated_at",
      )
      .in("id", ids);

    if (questionError) {
      setError(questionError.message);
      setQuestions([]);
      setLoadingQuestions(false);
      return [];
    }

    const stimulusIds = Array.from(
      new Set(
        (questionRows || [])
          .map((question: any) =>
            question.stimulus_id ? String(question.stimulus_id) : null,
          )
          .filter(Boolean) as string[],
      ),
    );

    let stimulusRows: any[] = [];
    if (stimulusIds.length > 0) {
      const { data, error: stimulusError } = await supabase
        .from(contentTables.stimuli)
        .select(
          "id, subject, primary_level, stimulus_type, title, body, storage_bucket, storage_path, alt_text, transcript, is_active, created_at, updated_at",
        )
        .in("id", stimulusIds);

      if (stimulusError) {
        setError(stimulusError.message);
        setQuestions([]);
        setLoadingQuestions(false);
        return [];
      }
      stimulusRows = data || [];
    }

    const { data: assetRows, error: assetError } = await supabase
      .from(contentTables.questionAssets)
      .select(
        "id, question_id, asset_type, storage_bucket, storage_path, alt_text, caption, width, height, metadata, sort_order, created_at",
      )
      .in("question_id", ids)
      .order("sort_order", { ascending: true });

    if (assetError) {
      setError(assetError.message);
      setQuestions([]);
      setLoadingQuestions(false);
      return [];
    }

    const stimulusMap = new Map<string, any>(
      stimulusRows.map((stimulus: any) => [String(stimulus.id), stimulus]),
    );
    const assetMap = new Map<string, any[]>();
    for (const asset of assetRows || []) {
      const questionId = String(asset.question_id);
      assetMap.set(questionId, [...(assetMap.get(questionId) || []), asset]);
    }

    const questionMap = new Map<string, any>(
      (questionRows || []).map((question: any) => [String(question.id), question]),
    );
    const combined = (links || [])
      .map((link: any) => {
        const question = questionMap.get(String(link.question_id));
        if (!question) return null;
        return {
          ...question,
          question_order: Number(link.question_order),
          marks_override:
            link.marks_override === null ? null : Number(link.marks_override),
          stimulus: question.stimulus_id
            ? stimulusMap.get(String(question.stimulus_id)) || null
            : null,
          assets: assetMap.get(String(question.id)) || [],
        } as LinkedQuestion;
      })
      .filter(Boolean) as LinkedQuestion[];

    setQuestions(combined);
    setLoadingQuestions(false);
    return combined;
  }

  function updateForm<K extends keyof QuizFormState>(
    key: K,
    value: QuizFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveQuiz() {
    setError(null);
    setMessage(null);

    if (!form.topicId) {
      setError("Choose a subject, level and topic.");
      return;
    }
    if (!form.title.trim()) {
      setError("Enter a quiz title.");
      return;
    }
    if (
      (form.quizType === "assessment" && form.questionCount !== 20) ||
      (form.quizType !== "assessment" &&
        (form.questionCount < 5 || form.questionCount > 12))
    ) {
      setError("Regular quizzes need 5–12 questions. Assessments need exactly 20.");
      return;
    }

    setSavingQuiz(true);
    try {
      if (!selectedQuiz) {
        const { data, error: createError } = await supabase.rpc(
          curriculumRpcs.createQuizDraft,
          {
            p_topic_id: form.topicId,
            p_skill_id: form.skillId || null,
            p_title: form.title.trim(),
            p_description: form.description.trim() || null,
            p_quiz_type: form.quizType,
            p_difficulty: form.difficulty,
            p_question_count: form.questionCount,
            p_estimated_minutes: form.estimatedMinutes,
            p_passing_percentage: form.passingPercentage,
            p_reward_tokens: form.rewardTokens,
            p_reward_gems: form.rewardGems,
            p_feedback_mode: form.feedbackMode,
            p_randomise_questions: form.randomiseQuestions,
            p_randomise_options: form.randomiseOptions,
          },
        );
        if (createError) throw createError;
        await onDataChanged();
        onSelectQuiz(String(data));
        setMessage("Draft quiz created. Add its questions below.");
      } else {
        const { error: updateError } = await supabase.rpc(
          curriculumRpcs.updateQuizDraft,
          {
            p_quiz_id: selectedQuiz.id,
            p_skill_id: form.skillId || null,
            p_title: form.title.trim(),
            p_description: form.description.trim() || null,
            p_quiz_type: form.quizType,
            p_difficulty: form.difficulty,
            p_question_count: form.questionCount,
            p_estimated_minutes: form.estimatedMinutes,
            p_passing_percentage: form.passingPercentage,
            p_reward_tokens: form.rewardTokens,
            p_reward_gems: form.rewardGems,
            p_feedback_mode: form.feedbackMode,
            p_randomise_questions: form.randomiseQuestions,
            p_randomise_options: form.randomiseOptions,
          },
        );
        if (updateError) throw updateError;
        await onDataChanged();
        setMessage("Quiz settings saved.");
      }
    } catch (saveError: any) {
      setError(saveError?.message || "Could not save the quiz.");
    } finally {
      setSavingQuiz(false);
    }
  }

  async function saveQuestion(payload: QuestionPayload) {
    if (!selectedQuiz) throw new Error("Save the quiz before adding questions.");

    const { data: savedQuestionId, error: saveError } = await supabase.rpc(
      curriculumRpcs.saveQuestion,
      {
        p_quiz_id: selectedQuiz.id,
        p_question_id: payload.questionId,
        p_question_type: payload.questionType,
        p_instruction: payload.instruction || null,
        p_prompt: payload.prompt,
        p_content: payload.content,
        p_answer_data: payload.answerData,
        p_explanation: payload.explanation,
        p_skill: payload.skill || null,
        p_difficulty: payload.difficulty,
        p_marks: payload.marks,
      },
    );

    if (saveError) throw saveError;
    if (!savedQuestionId) {
      throw new Error("The question was saved, but its ID was not returned.");
    }

    const questionId = String(savedQuestionId);
    const { data: savedQuestion, error: questionLookupError } = await supabase
      .from(contentTables.questions)
      .select("code, subject, primary_level")
      .eq("id", questionId)
      .single();

    if (questionLookupError || !savedQuestion) {
      throw questionLookupError || new Error("Could not reload the saved question.");
    }

    try {
      await syncQuestionMedia({
        questionId,
        questionCode: String(savedQuestion.code),
        subject: savedQuestion.subject as "english" | "math",
        primaryLevel: Number(savedQuestion.primary_level),
        content: payload.content,
        media: payload.media,
      });
    } catch (mediaError: any) {
      const refreshedQuestions = await loadQuestions(selectedQuiz.id);
      await onDataChanged();
      setEditingQuestion(
        refreshedQuestions.find((question) => question.id === questionId) || null,
      );
      setMessage(
        "The question was saved, but its media needs attention. The saved question has been reopened.",
      );
      throw new Error(
        `Question saved, but media could not be completed: ${
          mediaError?.message || "Unknown media error"
        }`,
      );
    }

    await loadQuestions(selectedQuiz.id);
    await onDataChanged();
    setEditingQuestion(null);
    setMessage(
      payload.questionId
        ? "Question and media updated."
        : "Question and media added.",
    );
  }

  async function deleteQuestion(question: LinkedQuestion) {
    if (!selectedQuiz) return;
    if (!window.confirm(`Remove ${question.code} from this quiz?`)) return;

    setBusyAction(true);
    setError(null);
    const { error: deleteError } = await supabase.rpc(
      curriculumRpcs.deleteQuestion,
      {
        p_quiz_id: selectedQuiz.id,
        p_question_id: question.id,
      },
    );
    if (deleteError) setError(deleteError.message);
    else {
      await loadQuestions(selectedQuiz.id);
      await onDataChanged();
      setMessage("Question removed.");
    }
    setBusyAction(false);
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!selectedQuiz) return;
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setBusyAction(true);
    const { error: reorderError } = await supabase.rpc(
      curriculumRpcs.reorderQuestions,
      {
        p_quiz_id: selectedQuiz.id,
        p_question_ids: reordered.map((question) => question.id),
      },
    );
    if (reorderError) setError(reorderError.message);
    else await loadQuestions(selectedQuiz.id);
    setBusyAction(false);
  }

  async function submitForReview() {
    if (!selectedQuiz) return;
    setBusyAction(true);
    setError(null);
    setMessage(null);
    const { error: submitError } = await supabase.rpc(
      curriculumRpcs.submitQuiz,
      { p_quiz_id: selectedQuiz.id },
    );
    if (submitError) setError(submitError.message);
    else {
      await onDataChanged();
      setMessage("Quiz submitted for admin review.");
    }
    setBusyAction(false);
  }

  const groupedQuizzes = [...quizzes].sort((a, b) =>
    a.updated_at < b.updated_at ? 1 : -1,
  );

  return (
    <div>
      <div style={headingRow}>
        <div>
          <p style={eyebrow}>QUIZ PRODUCTION</p>
          <h1 style={pageTitle}>Quiz Builder</h1>
          <p style={pageDescription}>
            Create a draft, add questions, preview it and submit it for review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelectQuiz(null)}
          style={primaryButton}
        >
          + New Quiz
        </button>
      </div>

      <div style={builderGrid}>
        <aside style={quizListPanel}>
          <p style={listHeading}>QUIZZES</p>
          <div style={quizList}>
            {groupedQuizzes.map((quiz) => (
              <button
                type="button"
                key={quiz.id}
                onClick={() => onSelectQuiz(quiz.id)}
                style={{
                  ...quizListItem,
                  borderColor:
                    selectedQuizId === quiz.id
                      ? "rgba(126,232,255,0.7)"
                      : "rgba(126,232,255,0.17)",
                }}
              >
                <strong>{quiz.title}</strong>
                <span style={quizListMeta}>
                  {quiz.subject === "english" ? "English" : "Math"} · {quiz.code}
                </span>
                <span style={statusText}>{quiz.status.replaceAll("_", " ")}</span>
              </button>
            ))}
          </div>
        </aside>

        <div style={editorColumn}>
          <section style={panel}>
            <div style={sectionHeadingRow}>
              <div>
                <p style={smallEyebrow}>QUIZ SETTINGS</p>
                <h2 style={sectionTitle}>
                  {selectedQuiz ? selectedQuiz.code : "Create a New Quiz"}
                </h2>
              </div>
              {selectedQuiz && <StatusPill status={selectedQuiz.status} />}
            </div>

            <div style={formGrid}>
              <label style={fieldLabel}>
                Subject and level
                <select
                  value={form.topicId}
                  disabled={Boolean(selectedQuiz) || !editable}
                  onChange={(event) => {
                    updateForm("topicId", event.target.value);
                    updateForm("skillId", "");
                  }}
                  style={selectInput}
                >
                  <option value="" style={selectOption}>
                    Choose a topic
                  </option>
                  {topics.map((topic) => (
                    <option
                      key={topic.id}
                      value={topic.id}
                      style={selectOption}
                    >
                      {topic.subject === "english" ? "English" : "Math"} P
                      {topic.primary_level} · {topic.title}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Skill or subtopic
                <select
                  value={form.skillId}
                  disabled={!editable}
                  onChange={(event) => updateForm("skillId", event.target.value)}
                  style={selectInput}
                >
                  <option value="" style={selectOption}>
                    No specific skill
                  </option>
                  {relevantSkills.map((skill) => (
                    <option
                      key={skill.id}
                      value={skill.id}
                      style={selectOption}
                    >
                      {skill.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={fieldLabel}>
              Quiz title
              <input
                value={form.title}
                disabled={!editable}
                onChange={(event) => updateForm("title", event.target.value)}
                style={input}
              />
            </label>

            <label style={fieldLabel}>
              Description
              <textarea
                value={form.description}
                disabled={!editable}
                onChange={(event) => updateForm("description", event.target.value)}
                rows={3}
                style={textArea}
              />
            </label>

            <div style={formGrid}>
              <SelectField
                label="Quiz type"
                value={form.quizType}
                disabled={!editable}
                onChange={(value) => {
                  const type = value as QuizType;
                  updateForm("quizType", type);
                  if (type === "assessment") updateForm("questionCount", 20);
                }}
                options={[
                  ["quick", "Quick Practice"],
                  ["standard", "Standard Mission"],
                  ["challenge", "Challenge Mission"],
                  ["assessment", "Assessment Paper"],
                ]}
              />
              <NumberField
                label="Difficulty"
                value={form.difficulty}
                min={1}
                max={5}
                disabled={!editable}
                onChange={(value) => updateForm("difficulty", value)}
              />
              <NumberField
                label="Question count"
                value={form.questionCount}
                min={form.quizType === "assessment" ? 20 : 5}
                max={form.quizType === "assessment" ? 20 : 12}
                disabled={!editable || form.quizType === "assessment"}
                onChange={(value) => updateForm("questionCount", value)}
              />
              <NumberField
                label="Estimated minutes"
                value={form.estimatedMinutes}
                min={1}
                max={60}
                disabled={!editable}
                onChange={(value) => updateForm("estimatedMinutes", value)}
              />
              <NumberField
                label="Passing percentage"
                value={form.passingPercentage}
                min={0}
                max={100}
                disabled={!editable}
                onChange={(value) => updateForm("passingPercentage", value)}
              />
              <NumberField
                label="DT reward"
                value={form.rewardTokens}
                min={0}
                max={1000}
                disabled={!editable}
                onChange={(value) => updateForm("rewardTokens", value)}
              />
              <NumberField
                label="DG reward"
                value={form.rewardGems}
                min={0}
                max={100}
                disabled={!editable}
                onChange={(value) => updateForm("rewardGems", value)}
              />
              <SelectField
                label="Feedback mode"
                value={form.feedbackMode}
                disabled={!editable}
                onChange={(value) =>
                  updateForm("feedbackMode", value as FeedbackMode)
                }
                options={[
                  ["immediate", "Immediate"],
                  ["end_of_quiz", "End of Quiz"],
                  ["none", "No Feedback"],
                ]}
              />
            </div>

            <div style={checkRow}>
              <label style={checkLabel}>
                <input
                  type="checkbox"
                  checked={form.randomiseQuestions}
                  disabled={!editable}
                  onChange={(event) =>
                    updateForm("randomiseQuestions", event.target.checked)
                  }
                />
                Randomise question order
              </label>
              <label style={checkLabel}>
                <input
                  type="checkbox"
                  checked={form.randomiseOptions}
                  disabled={!editable}
                  onChange={(event) =>
                    updateForm("randomiseOptions", event.target.checked)
                  }
                />
                Randomise answer options
              </label>
            </div>

            <button
              type="button"
              disabled={!editable || savingQuiz}
              onClick={() => void saveQuiz()}
              style={{ ...primaryButton, opacity: !editable || savingQuiz ? 0.45 : 1 }}
            >
              {savingQuiz
                ? "Saving..."
                : selectedQuiz
                  ? "Save Quiz Settings"
                  : "Create Draft Quiz"}
            </button>
          </section>

          {selectedQuiz && (
            <>
              <section style={panel}>
                <div style={sectionHeadingRow}>
                  <div>
                    <p style={smallEyebrow}>QUESTION ORDER</p>
                    <h2 style={sectionTitle}>
                      {questions.length}/{selectedQuiz.question_count} Questions
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    style={ghostButton}
                  >
                    Preview as Student
                  </button>
                </div>

                {loadingQuestions ? (
                  <p style={mutedText}>Loading questions...</p>
                ) : questions.length === 0 ? (
                  <div style={emptyState}>No questions have been added yet.</div>
                ) : (
                  <div style={questionList}>
                    {questions.map((question, index) => (
                      <div key={question.id} style={questionItem}>
                        <div style={questionNumber}>{index + 1}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong>{question.prompt}</strong>
                          <p style={questionMeta}>
                            {question.code} · {question.question_type.replaceAll("_", " ")} · {question.marks} mark(s)
                            {countQuestionMedia(question) > 0
                              ? ` · ${countQuestionMedia(question)} media item${
                                  countQuestionMedia(question) === 1 ? "" : "s"
                                }`
                              : ""}
                          </p>
                        </div>
                        <div style={questionActions}>
                          <button
                            type="button"
                            disabled={!editable || index === 0 || busyAction}
                            onClick={() => void moveQuestion(index, -1)}
                            style={iconButton}
                            aria-label="Move question up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={!editable || index === questions.length - 1 || busyAction}
                            onClick={() => void moveQuestion(index, 1)}
                            style={iconButton}
                            aria-label="Move question down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => setEditingQuestion(question)}
                            style={iconButton}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!editable || busyAction}
                            onClick={() => void deleteQuestion(question)}
                            style={{ ...iconButton, color: "#fecaca" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <QuestionForm
                subject={selectedSubject}
                question={editingQuestion}
                disabled={!editable || questions.length >= selectedQuiz.question_count && !editingQuestion}
                onSave={saveQuestion}
                onCancel={() => setEditingQuestion(null)}
              />

              <section style={submissionPanel}>
                <div>
                  <p style={smallEyebrow}>REVIEW WORKFLOW</p>
                  <h2 style={sectionTitle}>Submit Completed Quiz</h2>
                  <p style={mutedText}>
                    The quiz must contain exactly {selectedQuiz.question_count} complete questions before submission.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    busyAction ||
                    !["draft", "changes_requested"].includes(selectedQuiz.status) ||
                    questions.length !== selectedQuiz.question_count
                  }
                  onClick={() => void submitForReview()}
                  style={{
                    ...reviewButton,
                    opacity:
                      busyAction ||
                      !["draft", "changes_requested"].includes(selectedQuiz.status) ||
                      questions.length !== selectedQuiz.question_count
                        ? 0.45
                        : 1,
                  }}
                >
                  Submit for Review
                </button>
              </section>
            </>
          )}

          {message && <div style={successBanner}>{message}</div>}
          {error && <div style={errorBanner}>{error}</div>}
        </div>
      </div>

      {showPreview && selectedQuiz && (
        <QuizPreviewModal
          quiz={selectedQuiz}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label style={fieldLabel}>
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        style={selectInput}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
            style={selectOption}
          >
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label style={fieldLabel}>
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={input}
      />
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span style={statusPill}>{status.replaceAll("_", " ")}</span>;
}

const headingRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};
const pageTitle: CSSProperties = { margin: "6px 0 0", fontSize: "clamp(30px,4vw,48px)" };
const pageDescription: CSSProperties = { margin: "8px 0 0", color: "rgba(255,255,255,0.66)" };
const primaryButton: CSSProperties = {
  minHeight: "43px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  color: "white",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};
const builderGrid: CSSProperties = {
  marginTop: "18px",
  display: "grid",
  gridTemplateColumns: "minmax(210px,280px) minmax(0,1fr)",
  gap: "14px",
  alignItems: "start",
};
const quizListPanel: CSSProperties = {
  position: "sticky",
  top: "82px",
  maxHeight: "calc(100dvh - 110px)",
  overflowY: "auto",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(4,20,48,0.68)",
  padding: "12px",
};
const listHeading: CSSProperties = {
  margin: "2px 4px 10px",
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.15em",
  fontWeight: 900,
};
const quizList: CSSProperties = { display: "grid", gap: "7px" };
const quizListItem: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.17)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  padding: "10px",
  display: "grid",
  gap: "4px",
  textAlign: "left",
  cursor: "pointer",
};
const quizListMeta: CSSProperties = { color: "rgba(255,255,255,0.48)", fontSize: "9px" };
const statusText: CSSProperties = { color: "#ffe29a", fontSize: "9px", textTransform: "uppercase" };
const editorColumn: CSSProperties = { minWidth: 0, display: "grid", gap: "12px" };
const panel: CSSProperties = {
  borderRadius: "19px",
  border: "1px solid rgba(126,232,255,0.23)",
  background: "rgba(4,20,48,0.62)",
  padding: "16px",
};
const sectionHeadingRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};
const smallEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.14em",
  fontWeight: 900,
};
const sectionTitle: CSSProperties = { margin: "4px 0 0", fontSize: "21px" };
const statusPill: CSSProperties = {
  borderRadius: "999px",
  background: "rgba(126,232,255,0.13)",
  color: "#bcefff",
  padding: "7px 10px",
  fontSize: "9px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const formGrid: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))",
  gap: "9px",
};
const fieldLabel: CSSProperties = {
  marginTop: "11px",
  display: "grid",
  gap: "6px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "10px",
  fontWeight: 800,
};
const input: CSSProperties = {
  minHeight: "40px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.065)",
  color: "white",
  padding: "8px 10px",
};

const selectInput: CSSProperties = {
  ...input,
  backgroundColor: "#102442",
  color: "#ffffff",
  colorScheme: "dark",
  cursor: "pointer",
};

const selectOption: CSSProperties = {
  backgroundColor: "#102442",
  color: "#ffffff",
};

const textArea: CSSProperties = { ...input, resize: "vertical" };
const checkRow: CSSProperties = { marginTop: "13px", display: "flex", flexWrap: "wrap", gap: "14px" };
const checkLabel: CSSProperties = { display: "flex", alignItems: "center", gap: "7px", fontSize: "11px" };
const ghostButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "0 12px",
  cursor: "pointer",
};
const questionList: CSSProperties = { marginTop: "12px", display: "grid", gap: "8px" };
const questionItem: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(255,255,255,0.045)",
  padding: "11px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};
const questionNumber: CSSProperties = {
  width: "30px",
  height: "30px",
  flexShrink: 0,
  borderRadius: "999px",
  background: "rgba(126,232,255,0.13)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};
const questionMeta: CSSProperties = { margin: "4px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "9px" };
const questionActions: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "flex-end" };
const iconButton: CSSProperties = {
  minHeight: "32px",
  borderRadius: "8px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 8px",
  cursor: "pointer",
  fontSize: "10px",
};
const emptyState: CSSProperties = {
  marginTop: "12px",
  borderRadius: "13px",
  border: "1px dashed rgba(126,232,255,0.25)",
  padding: "24px",
  textAlign: "center",
  color: "rgba(255,255,255,0.54)",
};
const submissionPanel: CSSProperties = {
  borderRadius: "19px",
  border: "1px solid rgba(255,215,106,0.3)",
  background: "rgba(255,215,106,0.07)",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
};
const reviewButton: CSSProperties = {
  minHeight: "43px",
  borderRadius: "11px",
  border: "1px solid rgba(255,230,168,0.4)",
  background: "linear-gradient(135deg,#ffd76a,#ffae55)",
  color: "#251400",
  padding: "0 16px",
  fontWeight: 900,
  cursor: "pointer",
};
const mutedText: CSSProperties = { color: "rgba(255,255,255,0.56)", fontSize: "11px", lineHeight: 1.45 };
const successBanner: CSSProperties = {
  borderRadius: "11px",
  border: "1px solid rgba(74,222,128,0.4)",
  background: "rgba(34,197,94,0.12)",
  color: "#bbf7d0",
  padding: "10px",
};
const errorBanner: CSSProperties = {
  borderRadius: "11px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "10px",
};
