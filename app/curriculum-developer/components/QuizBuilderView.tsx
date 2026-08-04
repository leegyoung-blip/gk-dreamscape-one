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
    publishQuiz: string;
  }
> = {
  english: {
    createQuizDraft: "curriculum_create_english_quiz_draft",
    updateQuizDraft: "curriculum_update_english_quiz_draft",
    saveQuestion: "curriculum_save_english_question",
    deleteQuestion: "curriculum_delete_english_question",
    reorderQuestions: "curriculum_reorder_english_quiz_questions",
    submitQuiz: "curriculum_submit_english_quiz",
    publishQuiz: "curriculum_publish_english_quiz",
  },
  math: {
    createQuizDraft: "curriculum_create_math_quiz_draft",
    updateQuizDraft: "curriculum_update_math_quiz_draft",
    saveQuestion: "curriculum_save_math_question",
    deleteQuestion: "curriculum_delete_math_question",
    reorderQuestions: "curriculum_reorder_math_quiz_questions",
    submitQuiz: "curriculum_submit_math_quiz",
    publishQuiz: "curriculum_publish_math_quiz",
  },
};

const SUBJECT_LABELS: Record<CoreSubject, string> = {
  english: "English",
  math: "Mathematics",
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
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<"all" | CoreSubject>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) || null,
    [quizzes, selectedQuizId],
  );

  const editable = !selectedQuiz || selectedQuiz.status !== "archived";
  const published = selectedQuiz?.status === "published";
  const relevantSkills = skills.filter((skill) => skill.topic_id === form.topicId);
  const selectedTopic = topics.find((topic) => topic.id === form.topicId) || null;
  const selectedSubject: CoreSubject =
    selectedQuiz?.subject || selectedTopic?.subject || "english";
  const contentTables = CONTENT_TABLES[selectedSubject];
  const curriculumRpcs = CURRICULUM_RPCS[selectedSubject];

  const topicMap = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic])),
    [topics],
  );
  const skillMap = useMemo(
    () => new Map(skills.map((skill) => [skill.id, skill])),
    [skills],
  );

  useEffect(() => {
    if (!selectedQuiz) {
      setForm((current) => ({
        ...EMPTY_FORM,
        topicId: current.topicId || topics[0]?.id || "",
      }));
      setQuestions([]);
      setEditingQuestion(null);
      setMessage(null);
      setError(null);
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
    setMessage(null);
    setError(null);
    void loadQuestions(selectedQuiz.id);
    // loadQuestions intentionally uses the selected quiz's subject-specific tables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setMessage(
          selectedQuiz.status === "published"
            ? "Published quiz settings saved. The changes are now live."
            : "Quiz settings saved.",
        );
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
      selectedQuiz.status === "published"
        ? "Published question updated. The change is now live."
        : payload.questionId
          ? "Question and media updated."
          : "Question and media added.",
    );
  }

  async function deleteQuestion(question: LinkedQuestion) {
    if (!selectedQuiz) return;
    if (!window.confirm(`Remove ${question.code} from this quiz?`)) return;

    setBusyAction(true);
    setError(null);
    setMessage(null);
    try {
      const { error: deleteError } = await supabase.rpc(
        curriculumRpcs.deleteQuestion,
        {
          p_quiz_id: selectedQuiz.id,
          p_question_id: question.id,
        },
      );
      if (deleteError) throw deleteError;
      await loadQuestions(selectedQuiz.id);
      await onDataChanged();
      setEditingQuestion(null);
      setMessage("Question removed.");
    } catch (deleteError: any) {
      setError(deleteError?.message || "Could not remove the question.");
    } finally {
      setBusyAction(false);
    }
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!selectedQuiz) return;
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setBusyAction(true);
    setError(null);
    setMessage(null);
    try {
      const { error: reorderError } = await supabase.rpc(
        curriculumRpcs.reorderQuestions,
        {
          p_quiz_id: selectedQuiz.id,
          p_question_ids: reordered.map((question) => question.id),
        },
      );
      if (reorderError) throw reorderError;
      await loadQuestions(selectedQuiz.id);
      await onDataChanged();
      setMessage(
        selectedQuiz.status === "published"
          ? "Question order updated. The new order is live."
          : "Question order updated.",
      );
    } catch (reorderError: any) {
      setError(reorderError?.message || "Could not reorder the questions.");
    } finally {
      setBusyAction(false);
    }
  }

  async function submitForReview() {
    if (!selectedQuiz) return;
    setBusyAction(true);
    setError(null);
    setMessage(null);
    try {
      const { error: submitError } = await supabase.rpc(
        curriculumRpcs.submitQuiz,
        { p_quiz_id: selectedQuiz.id },
      );
      if (submitError) throw submitError;
      await onDataChanged();
      setMessage("Quiz submitted for admin review.");
    } catch (submitError: any) {
      setError(submitError?.message || "Could not submit the quiz.");
    } finally {
      setBusyAction(false);
    }
  }

  async function publishQuiz() {
    if (!selectedQuiz) return;
    const confirmed = window.confirm(
      `Publish ${selectedQuiz.code}? Students will be able to use the latest saved version immediately.`,
    );
    if (!confirmed) return;

    setBusyAction(true);
    setError(null);
    setMessage(null);
    try {
      const { error: publishError } = await supabase.rpc(
        curriculumRpcs.publishQuiz,
        { p_quiz_id: selectedQuiz.id },
      );
      if (publishError) throw publishError;
      await onDataChanged();
      await loadQuestions(selectedQuiz.id);
      setMessage("Quiz published successfully.");
    } catch (publishError: any) {
      setError(publishError?.message || "Could not publish the quiz.");
    } finally {
      setBusyAction(false);
    }
  }

  const filteredQuizzes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...quizzes]
      .filter((quiz) => {
        if (subjectFilter !== "all" && quiz.subject !== subjectFilter) return false;
        if (statusFilter !== "all" && quiz.status !== statusFilter) return false;

        if (!query) return true;

        const topic = topicMap.get(quiz.topic_id);
        const skill = quiz.skill_id ? skillMap.get(quiz.skill_id) : undefined;
        const haystack = [
          quiz.code,
          quiz.title,
          quiz.description,
          quiz.status,
          quiz.quiz_type,
          quiz.subject,
          SUBJECT_LABELS[quiz.subject],
          topic?.title,
          topic?.short_title,
          topic?.slug,
          topic ? `p${topic.primary_level}` : null,
          skill?.code,
          skill?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) =>
        a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
      );
  }, [
    quizzes,
    search,
    skillMap,
    statusFilter,
    subjectFilter,
    topicMap,
  ]);

  const hasExactQuestionCount =
    Boolean(selectedQuiz) && questions.length === selectedQuiz?.question_count;
  const canSubmit =
    Boolean(selectedQuiz) &&
    ["draft", "changes_requested"].includes(selectedQuiz?.status || "") &&
    hasExactQuestionCount;
  const canPublish =
    Boolean(selectedQuiz) &&
    selectedQuiz?.status !== "published" &&
    selectedQuiz?.status !== "archived" &&
    hasExactQuestionCount;

  return (
    <div>
      <div style={headingRow}>
        <div>
          <p style={eyebrow}>QUIZ PRODUCTION</p>
          <h1 style={pageTitle}>Quiz Builder</h1>
          <p className="curriculum-page-description" style={pageDescription}>
            Search, create, edit, preview and publish English and Mathematics quizzes.
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

      <div className="quiz-builder-layout" style={builderGrid}>
        <aside className="quiz-browser-panel" style={quizListPanel}>
          <div style={listHeadingRow}>
            <p style={listHeading}>QUIZZES</p>
            <span style={resultCount}>{filteredQuizzes.length}</span>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exact title or quiz code"
            aria-label="Search quizzes"
            style={searchInput}
          />

          <div style={filterRow}>
            <select
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(event.target.value as "all" | CoreSubject)
              }
              aria-label="Filter by subject"
              style={compactSelect}
            >
              <option value="all">All subjects</option>
              <option value="english">English</option>
              <option value="math">Mathematics</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
              style={compactSelect}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="changes_requested">Changes requested</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="quiz-browser-list" style={quizList}>
            {filteredQuizzes.length === 0 ? (
              <div style={smallEmptyState}>No quizzes match this search.</div>
            ) : (
              filteredQuizzes.map((quiz) => {
                const topic = topicMap.get(quiz.topic_id);
                return (
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
                      background:
                        selectedQuizId === quiz.id
                          ? "rgba(126,232,255,0.11)"
                          : quizListItem.background,
                    }}
                  >
                    <strong style={quizListTitle}>{quiz.title}</strong>
                    <span style={quizListMeta}>
                      {SUBJECT_LABELS[quiz.subject]}
                      {topic ? ` P${topic.primary_level}` : ""} · {quiz.code}
                    </span>
                    <span style={statusText}>
                      {quiz.status.replaceAll("_", " ")}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="quiz-editor-column" style={editorColumn}>
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

            {published && (
              <div style={liveWarning}>
                This quiz is published. Saved wording, answer, media, settings and
                question-order changes go live immediately. Quiz type, question count,
                adding questions and deleting questions remain locked to protect the
                live quiz structure.
              </div>
            )}

            {selectedQuiz?.status === "archived" && (
              <div style={archivedWarning}>
                Archived quizzes are read-only.
              </div>
            )}

            <div className="quiz-settings-grid" style={formGrid}>
              <label style={fieldLabel}>
                Subject, level and topic
                <select
                  value={form.topicId}
                  disabled={Boolean(selectedQuiz) || !editable}
                  onChange={(event) => {
                    updateForm("topicId", event.target.value);
                    updateForm("skillId", "");
                  }}
                  style={selectInput}
                >
                  <option value="">Choose a topic</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {SUBJECT_LABELS[topic.subject]} P{topic.primary_level} · {topic.title}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Skill or subtopic
                <select
                  value={form.skillId}
                  disabled={!editable || !form.topicId}
                  onChange={(event) => updateForm("skillId", event.target.value)}
                  style={selectInput}
                >
                  <option value="">No specific skill</option>
                  {relevantSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.code} · {skill.title}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Quiz title
                <input
                  value={form.title}
                  disabled={!editable}
                  onChange={(event) => updateForm("title", event.target.value)}
                  style={input}
                />
              </label>

              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Description
                <textarea
                  value={form.description}
                  disabled={!editable}
                  onChange={(event) => updateForm("description", event.target.value)}
                  rows={3}
                  style={textarea}
                />
              </label>

              <SelectField
                label="Quiz type"
                value={form.quizType}
                options={[
                  ["quick", "Quick Practice"],
                  ["standard", "Standard Quiz"],
                  ["challenge", "Challenge"],
                  ["assessment", "Assessment"],
                ]}
                disabled={!editable || published}
                onChange={(value) => updateForm("quizType", value as QuizType)}
              />

              <NumberField
                label="Question count"
                value={form.questionCount}
                min={5}
                max={20}
                disabled={!editable || published}
                onChange={(value) => updateForm("questionCount", value)}
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
                label="Estimated minutes"
                value={form.estimatedMinutes}
                min={1}
                max={180}
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
                label="Reward tokens"
                value={form.rewardTokens}
                min={0}
                max={10000}
                disabled={!editable}
                onChange={(value) => updateForm("rewardTokens", value)}
              />

              <NumberField
                label="Reward gems"
                value={form.rewardGems}
                min={0}
                max={1000}
                disabled={!editable}
                onChange={(value) => updateForm("rewardGems", value)}
              />

              <SelectField
                label="Feedback mode"
                value={form.feedbackMode}
                options={[
                  ["immediate", "Immediate feedback"],
                  ["end_of_quiz", "End of quiz"],
                  ["none", "No feedback"],
                ]}
                disabled={!editable}
                onChange={(value) =>
                  updateForm("feedbackMode", value as FeedbackMode)
                }
              />
            </div>

            <div style={toggleRow}>
              <ToggleField
                label="Randomise questions"
                checked={form.randomiseQuestions}
                disabled={!editable}
                onChange={(checked) => updateForm("randomiseQuestions", checked)}
              />
              <ToggleField
                label="Randomise answer options"
                checked={form.randomiseOptions}
                disabled={!editable}
                onChange={(checked) => updateForm("randomiseOptions", checked)}
              />
            </div>

            <div style={settingsActions}>
              <button
                type="button"
                disabled={savingQuiz || !editable}
                onClick={() => void saveQuiz()}
                style={{
                  ...primaryButton,
                  opacity: savingQuiz || !editable ? 0.45 : 1,
                }}
              >
                {savingQuiz
                  ? "Saving..."
                  : selectedQuiz
                    ? published
                      ? "Save Live Changes"
                      : "Save Quiz Settings"
                    : "Create Draft Quiz"}
              </button>

              {selectedQuiz && (
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  style={ghostButton}
                >
                  Preview Quiz
                </button>
              )}
            </div>
          </section>

          {selectedQuiz && (
            <>
              <section style={panel}>
                <div style={sectionHeadingRow}>
                  <div>
                    <p style={smallEyebrow}>QUESTION SET</p>
                    <h2 style={sectionTitle}>
                      {questions.length} of {selectedQuiz.question_count} questions
                    </h2>
                  </div>
                  {published && <span style={livePill}>LIVE</span>}
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
                          <strong style={questionPrompt}>{question.prompt}</strong>
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
                            disabled={
                              !editable ||
                              index === questions.length - 1 ||
                              busyAction
                            }
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
                            disabled={!editable || published || busyAction}
                            onClick={() => void deleteQuestion(question)}
                            title={
                              published
                                ? "Unpublish or replace the live structure before deleting a question."
                                : undefined
                            }
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
                disabled={
                  !editable ||
                  (published && !editingQuestion) ||
                  (questions.length >= selectedQuiz.question_count && !editingQuestion)
                }
                onSave={saveQuestion}
                onCancel={() => setEditingQuestion(null)}
              />

              <section style={submissionPanel}>
                <div style={{ minWidth: 0 }}>
                  <p style={smallEyebrow}>PUBLISHING</p>
                  <h2 style={sectionTitle}>
                    {published ? "Published Quiz" : "Complete and Release Quiz"}
                  </h2>
                  <p style={mutedText}>
                    {published
                      ? "This quiz is live. Continue editing existing content carefully; every saved change is recorded in Edit History."
                      : `The quiz must contain exactly ${selectedQuiz.question_count} complete questions. You may submit it for admin review or publish it directly.`}
                  </p>
                  <p style={roleNote}>
                    Current role: {role.replaceAll("_", " ")}
                  </p>
                </div>

                <div style={submissionActions}>
                  {!published && (
                    <button
                      type="button"
                      disabled={busyAction || !canSubmit}
                      onClick={() => void submitForReview()}
                      style={{
                        ...reviewButton,
                        opacity: busyAction || !canSubmit ? 0.45 : 1,
                      }}
                    >
                      Submit for Review
                    </button>
                  )}

                  {!published && (
                    <button
                      type="button"
                      disabled={busyAction || !canPublish}
                      onClick={() => void publishQuiz()}
                      style={{
                        ...publishButton,
                        opacity: busyAction || !canPublish ? 0.45 : 1,
                      }}
                    >
                      Publish Quiz
                    </button>
                  )}
                </div>
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

      <style jsx global>{`
        @media (max-width: 1180px) {
          .quiz-builder-layout {
            grid-template-columns: 1fr !important;
          }

          .quiz-browser-panel {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
          }

          .quiz-browser-list {
            max-height: 360px !important;
          }
        }

        @media (max-width: 720px) {
          .quiz-settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
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
          <option key={optionValue} value={optionValue}>
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

function ToggleField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={toggleLabel}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
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
  fontSize: "13px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};
const pageTitle: CSSProperties = {
  margin: "7px 0 0",
  fontSize: "clamp(38px,4vw,56px)",
  lineHeight: 1.08,
};
const pageDescription: CSSProperties = {
  margin: "10px 0 0",
  color: "rgba(255,255,255,0.7)",
  fontSize: "17px",
  lineHeight: 1.6,
};
const builderGrid: CSSProperties = {
  marginTop: "26px",
  display: "grid",
  gridTemplateColumns: "360px minmax(0,1fr)",
  gap: "20px",
  alignItems: "flex-start",
};
const quizListPanel: CSSProperties = {
  width: "100%",
  maxWidth: "none",
  boxSizing: "border-box",
  position: "sticky",
  top: "96px",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "#0b1a36",
  padding: "16px",
};
const listHeadingRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};
const listHeading: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.52)",
  fontSize: "12px",
  letterSpacing: "0.14em",
  fontWeight: 900,
};
const resultCount: CSSProperties = {
  borderRadius: "999px",
  background: "rgba(126,232,255,0.1)",
  color: "#bcefff",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: 900,
};
const searchInput: CSSProperties = {
  width: "100%",
  minHeight: "48px",
  boxSizing: "border-box",
  marginTop: "10px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.26)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "0 13px",
  outline: "none",
  fontSize: "15px",
};
const filterRow: CSSProperties = {
  marginTop: "8px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "7px",
};
const compactSelect: CSSProperties = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "9px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(3,15,38,0.96)",
  color: "white",
  padding: "0 10px",
  fontSize: "14px",
};
const quizList: CSSProperties = {
  marginTop: "9px",
  maxHeight: "calc(100dvh - 320px)",
  overflowY: "auto",
  display: "grid",
  gap: "7px",
  paddingRight: "2px",
};
const quizListItem: CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.17)",
  background: "rgba(255,255,255,0.035)",
  color: "white",
  padding: "13px",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: "4px",
};
const quizListTitle: CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};
const quizListMeta: CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "12px",
  lineHeight: 1.4,
};
const statusText: CSSProperties = {
  color: "#bcefff",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const smallEmptyState: CSSProperties = {
  borderRadius: "11px",
  border: "1px dashed rgba(126,232,255,0.22)",
  color: "rgba(255,255,255,0.5)",
  padding: "18px 10px",
  textAlign: "center",
  fontSize: "13px",
};
const editorColumn: CSSProperties = {
  minWidth: 0,
  width: "100%",
  display: "grid",
  gap: "12px",
};
const panel: CSSProperties = {
  borderRadius: "19px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "#0b1a36",
  padding: "clamp(20px,2vw,28px)",
};
const sectionHeadingRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};
const smallEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "12px",
  letterSpacing: "0.15em",
  fontWeight: 900,
};
const sectionTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(26px,2.5vw,34px)",
};
const statusPill: CSSProperties = {
  borderRadius: "999px",
  background: "rgba(126,232,255,0.13)",
  color: "#bcefff",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const livePill: CSSProperties = {
  ...statusPill,
  background: "rgba(74,222,128,0.13)",
  color: "#bbf7d0",
};
const liveWarning: CSSProperties = {
  marginTop: "13px",
  borderRadius: "11px",
  border: "1px solid rgba(74,222,128,0.32)",
  background: "rgba(34,197,94,0.09)",
  color: "#d1fae5",
  padding: "14px",
  fontSize: "14px",
  lineHeight: 1.6,
};
const archivedWarning: CSSProperties = {
  marginTop: "13px",
  borderRadius: "11px",
  border: "1px solid rgba(248,113,113,0.32)",
  background: "rgba(239,68,68,0.09)",
  color: "#fecaca",
  padding: "14px",
  fontSize: "14px",
};
const formGrid: CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,250px),1fr))",
  gap: "15px",
};
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "rgba(255,255,255,0.66)",
  fontSize: "14px",
  fontWeight: 800,
};
const input: CSSProperties = {
  width: "100%",
  minHeight: "48px",
  boxSizing: "border-box",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 13px",
  outline: "none",
  fontSize: "15px",
};
const selectInput: CSSProperties = {
  ...input,
  background: "rgba(3,15,38,0.96)",
};
const textarea: CSSProperties = {
  ...input,
  minHeight: "100px",
  padding: "13px",
  resize: "vertical",
  fontFamily: "inherit",
};
const toggleRow: CSSProperties = {
  marginTop: "13px",
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
};
const toggleLabel: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  color: "rgba(255,255,255,0.68)",
  fontSize: "14px",
  fontWeight: 800,
};
const settingsActions: CSSProperties = {
  marginTop: "15px",
  display: "flex",
  gap: "9px",
  flexWrap: "wrap",
};
const primaryButton: CSSProperties = {
  minHeight: "48px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.38)",
  background: "linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.28))",
  color: "white",
  padding: "0 17px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 900,
};
const ghostButton: CSSProperties = {
  minHeight: "48px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 16px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 800,
};
const mutedText: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.58)",
  lineHeight: 1.55,
  fontSize: "14px",
};
const emptyState: CSSProperties = {
  marginTop: "13px",
  borderRadius: "15px",
  border: "1px dashed rgba(126,232,255,0.24)",
  padding: "28px",
  color: "rgba(255,255,255,0.58)",
  fontSize: "14px",
  textAlign: "center",
};
const questionList: CSSProperties = {
  marginTop: "13px",
  display: "grid",
  gap: "8px",
};
const questionItem: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(255,255,255,0.035)",
  padding: "10px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};
const questionNumber: CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "9px",
  background: "rgba(126,232,255,0.11)",
  color: "#bcefff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: 900,
};
const questionPrompt: CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
};
const questionMeta: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.48)",
  fontSize: "12px",
};
const questionActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  flexWrap: "wrap",
};
const iconButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "8px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  padding: "0 11px",
  cursor: "pointer",
  fontSize: "13px",
};
const submissionPanel: CSSProperties = {
  borderRadius: "19px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "#0b1a36",
  padding: "clamp(20px,2vw,28px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
};
const submissionActions: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};
const reviewButton: CSSProperties = {
  ...ghostButton,
  border: "1px solid rgba(198,166,255,0.38)",
  background: "rgba(168,85,247,0.12)",
  color: "#eadcff",
};
const publishButton: CSSProperties = {
  ...ghostButton,
  border: "1px solid rgba(74,222,128,0.4)",
  background: "rgba(34,197,94,0.15)",
  color: "#bbf7d0",
  fontWeight: 900,
};
const roleNote: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(255,255,255,0.42)",
  fontSize: "11px",
  textTransform: "uppercase",
  fontWeight: 900,
};
const successBanner: CSSProperties = {
  borderRadius: "11px",
  border: "1px solid rgba(74,222,128,0.4)",
  background: "rgba(34,197,94,0.12)",
  color: "#bbf7d0",
  padding: "13px",
  fontSize: "14px",
};
const errorBanner: CSSProperties = {
  borderRadius: "11px",
  border: "1px solid rgba(248,113,113,0.42)",
  background: "rgba(239,68,68,0.13)",
  color: "#fecaca",
  padding: "13px",
  fontSize: "14px",
};
