"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";
import QuestionMediaRenderer from "@/components/core-media/QuestionMediaRenderer";

type CoreSubject = "english" | "math";
type ScreenMode = "desktop" | "tablet" | "mobile";
type QuizStage =
  | "loading"
  | "intro"
  | "playing"
  | "submitting"
  | "results"
  | "error";

type QuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_text"
  | "long_text"
  | "sentence_reordering"
  | "matching"
  | "word_bank"
  | "dropdown_cloze"
  | "open_cloze"
  | "editing"
  | "picture_description"
  | "listening_comprehension"
  | "oral_recording";

type JsonObject = Record<string, any>;

type QuestionAsset = {
  id: string;
  asset_type: "image" | "svg" | "audio" | "video";
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  metadata: JsonObject;
};

type QuizStimulus = {
  id: string;
  stimulus_type:
    | "passage"
    | "visual_text"
    | "image"
    | "audio"
    | "video"
    | "diagram"
    | "table"
    | "graph";
  title: string | null;
  body: JsonObject;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
};

type QuizQuestion = {
  id: string;
  question_order: number;
  question_type: QuestionType;
  instruction: string | null;
  prompt: string;
  content: JsonObject;
  skill: string | null;
  difficulty: number;
  marks: number;
  requires_manual_marking: boolean;
  stimulus: QuizStimulus | null;
  assets: QuestionAsset[];
};

type QuizPayload = {
  attempt_id: string;
  resumed: boolean;
  quiz: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    quiz_type: "quick" | "standard" | "challenge" | "assessment";
    difficulty: number;
    question_count: number;
    estimated_minutes: number;
    passing_percentage: number;
    feedback_mode: "immediate" | "end_of_quiz" | "none";
    reward_tokens: number;
    reward_gems: number;
    subject: CoreSubject;
    primary_level: number;
    topic_title: string;
  };
  questions: QuizQuestion[];
  saved_answers: Array<{
    question_id: string;
    response_data: JsonObject;
    is_correct: boolean | null;
    marks_awarded: number | null;
    maximum_marks: number | null;
    locked: boolean;
    pending_manual_review: boolean;
    explanation: string | null;
    correct_response: JsonObject | string | null;
  }>;
};

type ImmediateFeedback = {
  saved: boolean;
  locked: boolean;
  pending_manual_review: boolean;
  is_correct: boolean | null;
  marks_awarded: number | null;
  maximum_marks: number;
  explanation: string | null;
  correct_response: JsonObject | string | null;
};

type QuestionResult = {
  question_id: string;
  question_order: number;
  prompt: string;
  response_data: JsonObject;
  is_correct: boolean | null;
  marks_awarded: number | null;
  maximum_marks: number;
  pending_manual_review: boolean;
  explanation: string | null;
  correct_response: JsonObject | string | null;
};

type SubmitResult = {
  attempt_id: string;
  status: "submitted" | "marked";
  pending_manual_review: boolean;
  score: number;
  maximum_score: number;
  percentage: number;
  correct_count: number;
  total_questions: number;
  tokens_earned: number;
  gems_earned: number;
  first_completion: boolean;
  token_balance: number;
  gem_balance: number;
  rover_progress_count: number;
  question_results: QuestionResult[];
};

type AnswerMap = Record<string, JsonObject>;
type FeedbackMap = Record<string, ImmediateFeedback>;
type TimeMap = Record<string, number>;

const SUBJECT_LABELS: Record<CoreSubject, string> = {
  english: "English",
  math: "Mathematics",
};

const CORE_RPCS: Record<
  CoreSubject,
  {
    getPayload: "get_english_quiz_payload" | "get_math_quiz_payload";
    saveAnswer: "save_english_quiz_answer" | "save_math_quiz_answer";
    submitAttempt: "submit_english_quiz_attempt" | "submit_math_quiz_attempt";
  }
> = {
  english: {
    getPayload: "get_english_quiz_payload",
    saveAnswer: "save_english_quiz_answer",
    submitAttempt: "submit_english_quiz_attempt",
  },
  math: {
    getPayload: "get_math_quiz_payload",
    saveAnswer: "save_math_quiz_answer",
    submitAttempt: "submit_math_quiz_attempt",
  },
};

function useResponsiveMode() {
  const [mode, setMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 720) setMode("mobile");
      else if (width <= 1180 || height > width) setMode("tablet");
      else setMode("desktop");
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
}

function asOptions(content: JsonObject) {
  const options = Array.isArray(content.options) ? content.options : [];
  return options
    .map((option: any, index: number) => ({
      id: String(option?.id ?? index + 1),
      text: String(option?.text ?? ""),
      image_url: option?.image_url ? String(option.image_url) : null,
    }))
    .filter((option: { id: string; text: string }) => option.text.length > 0);
}

function responseIsComplete(question: QuizQuestion, response?: JsonObject) {
  if (!response) return false;

  switch (question.question_type) {
    case "multiple_choice":
    case "true_false":
    case "listening_comprehension":
      return Boolean(response.option_id);
    case "multiple_select":
      return (
        Array.isArray(response.option_ids) && response.option_ids.length > 0
      );
    case "short_text":
    case "open_cloze":
    case "editing":
    case "long_text":
    case "picture_description":
      return String(response.text ?? "").trim().length > 0;
    case "sentence_reordering":
      return (
        Array.isArray(response.token_ids) &&
        response.token_ids.length ===
          (Array.isArray(question.content.tokens)
            ? question.content.tokens.length
            : 0)
      );
    case "matching": {
      const left = Array.isArray(question.content.left)
        ? question.content.left
        : [];
      const matches = response.matches ?? {};
      return (
        left.length > 0 && left.every((item: any) => matches[String(item.id)])
      );
    }
    case "word_bank":
    case "dropdown_cloze": {
      const blankIds = getBlankIds(question.content);
      const values = response.values ?? {};
      return blankIds.length > 0 && blankIds.every((id) => values[id]);
    }
    case "oral_recording":
      return Boolean(response.storage_path);
    default:
      return false;
  }
}

function getBlankIds(content: JsonObject) {
  const text = String(content.text_with_blanks ?? content.text ?? "");
  const matches = Array.from(text.matchAll(/\{\{([^}]+)\}\}/g));
  return matches.map((match) => String(match[1]));
}

function friendlyCorrectResponse(value: JsonObject | string | null) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  if (typeof value.display === "string") return value.display;
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.correct_option_ids)) {
    return value.correct_option_ids.join(", ");
  }
  if (Array.isArray(value.accepted_answers)) {
    return value.accepted_answers.join(" / ");
  }
  if (Array.isArray(value.order)) return value.order.join(" → ");

  return JSON.stringify(value);
}

function formatCoreQuestionType(type: QuestionType) {
  const labels: Record<QuestionType, string> = {
    multiple_choice: "Multiple Choice",
    multiple_select: "Multiple Select",
    true_false: "True or False",
    short_text: "Short Answer",
    long_text: "Extended Response",
    sentence_reordering: "Put in Order",
    matching: "Matching",
    word_bank: "Word Bank",
    dropdown_cloze: "Dropdown Cloze",
    open_cloze: "Open Cloze",
    editing: "Editing",
    picture_description: "Picture Description",
    listening_comprehension: "Listening Comprehension",
    oral_recording: "Oral Response",
  };

  return labels[type];
}

export default function CoreQuizPlayer({
  subject,
  level,
  quizId,
}: {
  subject: CoreSubject;
  level: number;
  quizId: string;
}) {
  const router = useRouter();
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const rpcNames = CORE_RPCS[subject];

  const { status, userId, tokenBalance, dreamGemBalance, refreshBalances } =
    useCoreMissionAccess();

  const [stage, setStage] = useState<QuizStage>("loading");
  const [payload, setPayload] = useState<QuizPayload | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<FeedbackMap>({});
  const [timeByQuestion, setTimeByQuestion] = useState<TimeMap>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  const questionOpenedAtRef = useRef<number>(Date.now());
  const quizStartedAtRef = useRef<number>(Date.now());

  const loadQuiz = useCallback(async () => {
    if (status !== "allowed") return;

    setStage("loading");
    setError(null);

    const { data, error: loadError } = await supabase.rpc(rpcNames.getPayload, {
      p_quiz_id: quizId,
    });

    if (loadError || !data) {
      console.warn("Could not load Core quiz payload:", loadError);
      setError(
        loadError?.message ||
          "This quiz could not be loaded. Check that it is published and has the correct number of questions.",
      );
      setStage("error");
      return;
    }

    const nextPayload = data as QuizPayload;

    if (
      nextPayload.quiz.subject !== subject ||
      Number(nextPayload.quiz.primary_level) !== level
    ) {
      setError("This quiz does not belong to the selected subject and level.");
      setStage("error");
      return;
    }

    if (nextPayload.questions.length !== nextPayload.quiz.question_count) {
      setError("This quiz is incomplete and cannot be started yet.");
      setStage("error");
      return;
    }

    const restoredAnswers: AnswerMap = {};
    const restoredFeedback: FeedbackMap = {};
    for (const saved of nextPayload.saved_answers ?? []) {
      restoredAnswers[saved.question_id] = saved.response_data ?? {};
      if (saved.locked) {
        restoredFeedback[saved.question_id] = {
          saved: true,
          locked: true,
          pending_manual_review: saved.pending_manual_review,
          is_correct: saved.is_correct,
          marks_awarded: saved.marks_awarded,
          maximum_marks: Number(saved.maximum_marks ?? 0),
          explanation: saved.explanation,
          correct_response: saved.correct_response,
        };
      }
    }

    setPayload(nextPayload);
    setAnswers(restoredAnswers);
    setFeedbackByQuestion(restoredFeedback);
    setTimeByQuestion({});
    setQuestionIndex(0);
    setResult(null);
    quizStartedAtRef.current = Date.now();
    questionOpenedAtRef.current = Date.now();
    setStage("intro");
  }, [level, quizId, status, subject, rpcNames.getPayload]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  const currentQuestion = payload?.questions[questionIndex] ?? null;
  const currentResponse = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const currentFeedback = currentQuestion
    ? feedbackByQuestion[currentQuestion.id]
    : undefined;

  const answeredCount = useMemo(() => {
    if (!payload) return 0;
    return payload.questions.filter((question) =>
      responseIsComplete(question, answers[question.id]),
    ).length;
  }, [answers, payload]);

  const missingQuestions = useMemo(() => {
    if (!payload) return [];
    return payload.questions.filter(
      (question) => !responseIsComplete(question, answers[question.id]),
    );
  }, [answers, payload]);

  function recordCurrentQuestionTime() {
    if (!currentQuestion) return;
    const seconds = Math.max(
      1,
      Math.round((Date.now() - questionOpenedAtRef.current) / 1000),
    );
    setTimeByQuestion((current) => ({
      ...current,
      [currentQuestion.id]: (current[currentQuestion.id] ?? 0) + seconds,
    }));
    questionOpenedAtRef.current = Date.now();
  }

  function updateResponse(next: JsonObject) {
    if (!currentQuestion || currentFeedback?.locked) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: next }));
  }

  async function saveCurrentAnswer() {
    if (!payload || !currentQuestion || !currentResponse) return false;

    const seconds = Math.max(
      1,
      Math.round((Date.now() - questionOpenedAtRef.current) / 1000),
    );
    const cumulativeSeconds =
      (timeByQuestion[currentQuestion.id] ?? 0) + seconds;

    setActionBusy(true);
    setError(null);

    const { data, error: saveError } = await supabase.rpc(rpcNames.saveAnswer, {
      p_attempt_id: payload.attempt_id,
      p_question_id: currentQuestion.id,
      p_response_data: currentResponse,
      p_time_spent_seconds: cumulativeSeconds,
    });

    setActionBusy(false);

    if (saveError || !data) {
      console.warn("Could not save Core quiz answer:", saveError);
      setError(saveError?.message || "This answer could not be saved.");
      return false;
    }

    const saved = data as ImmediateFeedback;
    setTimeByQuestion((current) => ({
      ...current,
      [currentQuestion.id]: cumulativeSeconds,
    }));
    questionOpenedAtRef.current = Date.now();

    if (saved.locked || payload.quiz.feedback_mode === "immediate") {
      setFeedbackByQuestion((current) => ({
        ...current,
        [currentQuestion.id]: saved,
      }));
    }

    return true;
  }

  async function moveToQuestion(nextIndex: number) {
    if (!payload || !currentQuestion) return;
    if (nextIndex < 0 || nextIndex >= payload.questions.length) return;

    recordCurrentQuestionTime();
    setQuestionIndex(nextIndex);
    questionOpenedAtRef.current = Date.now();
    setError(null);
  }

  async function handlePrimaryQuestionAction() {
    if (!payload || !currentQuestion) return;

    if (!responseIsComplete(currentQuestion, currentResponse)) {
      setError("Complete this question before continuing.");
      return;
    }

    if (
      payload.quiz.feedback_mode === "immediate" &&
      !currentFeedback?.locked
    ) {
      await saveCurrentAnswer();
      return;
    }

    if (questionIndex >= payload.questions.length - 1) {
      await submitQuiz();
      return;
    }

    if (payload.quiz.feedback_mode !== "immediate") {
      const saved = await saveCurrentAnswer();
      if (!saved) return;
    }

    await moveToQuestion(questionIndex + 1);
  }

  async function submitQuiz() {
    if (!payload || actionBusy) return;

    if (missingQuestions.length > 0) {
      setQuestionIndex(
        payload.questions.findIndex(
          (question) => question.id === missingQuestions[0].id,
        ),
      );
      questionOpenedAtRef.current = Date.now();
      setError(
        `Answer all questions before submitting. ${missingQuestions.length} question${
          missingQuestions.length === 1 ? " is" : "s are"
        } still incomplete.`,
      );
      return;
    }

    const currentQuestionSeconds = currentQuestion
      ? Math.max(
          1,
          Math.round((Date.now() - questionOpenedAtRef.current) / 1000),
        )
      : 0;
    const finalTimeMap: TimeMap = currentQuestion
      ? {
          ...timeByQuestion,
          [currentQuestion.id]:
            (timeByQuestion[currentQuestion.id] ?? 0) + currentQuestionSeconds,
        }
      : timeByQuestion;

    setTimeByQuestion(finalTimeMap);
    setActionBusy(true);
    setStage("submitting");
    setError(null);

    const finalDuration = Math.max(
      1,
      Math.round((Date.now() - quizStartedAtRef.current) / 1000),
    );

    const responseArray = payload.questions.map((question) => ({
      question_id: question.id,
      response_data: answers[question.id],
      time_spent_seconds: finalTimeMap[question.id] ?? null,
    }));

    const { data, error: submitError } = await supabase.rpc(
      rpcNames.submitAttempt,
      {
        p_attempt_id: payload.attempt_id,
        p_answers: responseArray,
        p_duration_seconds: finalDuration,
      },
    );

    setActionBusy(false);

    if (submitError || !data) {
      console.warn("Could not submit Core quiz:", submitError);
      setError(submitError?.message || "The quiz could not be submitted.");
      setStage("playing");
      return;
    }

    const nextResult = data as SubmitResult;
    setResult(nextResult);
    setStage("results");

    await refreshBalances();
    window.dispatchEvent(new Event("dream-tokens-updated"));
    window.dispatchEvent(new Event("dream-gems-updated"));
    window.dispatchEvent(new Event("core-missions-progress-updated"));
  }

  function returnToQuizList() {
    router.push(`/learning-missions/core/${subject}/p${level}`);
  }

  if (status === "checking" || stage === "loading") {
    return (
      <main style={pageShell}>
        <CenteredCard message="Preparing Core Mission..." />
      </main>
    );
  }

  if (status === "locked") {
    return (
      <main style={pageShell}>
        <div style={lockedCard}>
          <h1 style={{ margin: 0 }}>Core Missions Locked</h1>
          <p style={mutedText}>Log in with an account that has Core access.</p>
          <div style={buttonRow(isMobile)}>
            <a
              href="/login"
              style={{ ...primaryButton, textDecoration: "none" }}
            >
              Log In
            </a>
            <button
              type="button"
              onClick={() => router.push("/learning-missions")}
              style={ghostButton}
            >
              Exit
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "error" || !payload) {
    return (
      <main style={pageShell}>
        <div style={lockedCard}>
          <button type="button" onClick={returnToQuizList} style={backButton}>
            ← Quiz List
          </button>
          <h1 style={{ margin: "22px 0 0" }}>Quiz unavailable</h1>
          <p style={mutedText}>{error || "This quiz could not be loaded."}</p>
          <button
            type="button"
            onClick={() => void loadQuiz()}
            style={primaryButton}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (stage === "intro") {
    return (
      <main style={pageShell}>
        <header style={topHeader(isMobile)}>
          <button type="button" onClick={returnToQuizList} style={backButton}>
            ← Quiz List
          </button>
          {!isMobile && (
            <div style={{ textAlign: "center" }}>
              <p style={headerEyebrow}>CORE MISSIONS</p>
              <p style={headerSubtitle}>
                {SUBJECT_LABELS[subject]} · Primary {level}
              </p>
            </div>
          )}
          <BalanceDisplay
            compact={isMobile}
            tokenBalance={tokenBalance}
            gemBalance={dreamGemBalance}
          />
        </header>

        <section style={introWrap}>
          <div style={introCard}>
            <p style={eyebrow}>{payload.quiz.topic_title}</p>
            <h1 style={introTitle}>{payload.quiz.title}</h1>
            <p style={introDescription}>{payload.quiz.description}</p>

            <div style={introStats(isMobile)}>
              <IntroStat
                label="Questions"
                value={String(payload.quiz.question_count)}
              />
              <IntroStat
                label="Time"
                value={`${payload.quiz.estimated_minutes} min`}
              />
              <IntroStat
                label="Difficulty"
                value={`${payload.quiz.difficulty}/5`}
              />
              <IntroStat
                label="Feedback"
                value={
                  payload.quiz.feedback_mode === "immediate"
                    ? "After each answer"
                    : payload.quiz.feedback_mode === "end_of_quiz"
                      ? "At the end"
                      : "Score only"
                }
              />
            </div>

            {payload.resumed && (
              <div style={noticeBox}>
                Your unfinished attempt was restored. Previously saved responses
                are still here.
              </div>
            )}

            <p style={termsText}>
              All rewards are subject to terms and conditions.
            </p>

            <div style={buttonRow(isMobile)}>
              <button
                type="button"
                onClick={returnToQuizList}
                style={ghostButton}
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={() => {
                  quizStartedAtRef.current = Date.now();
                  questionOpenedAtRef.current = Date.now();
                  setStage("playing");
                }}
                style={primaryButton}
              >
                {payload.resumed ? "Resume Quiz" : "Start Quiz"}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (stage === "submitting") {
    return (
      <main style={pageShell}>
        <CenteredCard message="Marking and saving your mission..." />
      </main>
    );
  }

  if (stage === "results" && result) {
    return (
      <ResultsScreen
        isMobile={isMobile}
        payload={payload}
        result={result}
        expandedResultId={expandedResultId}
        setExpandedResultId={setExpandedResultId}
        onQuizList={returnToQuizList}
        onReplay={() => window.location.reload()}
        onRover={() => router.push("/learning-missions/core/rover")}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <main style={pageShell}>
        <CenteredCard message="No question was found." />
      </main>
    );
  }

  const isImmediateLocked = Boolean(currentFeedback?.locked);
  const primaryActionLabel =
    payload.quiz.feedback_mode === "immediate" && !isImmediateLocked
      ? "Check Answer"
      : questionIndex >= payload.questions.length - 1
        ? "Submit Quiz"
        : "Next Question";

  return (
    <main style={scienceQuizPage}>
      <header style={scienceQuizHeader(isMobile)}>
        <button type="button" onClick={returnToQuizList} style={backButton}>
          ← Quiz List
        </button>

        <BalanceDisplay
          compact
          tokenBalance={tokenBalance}
          gemBalance={dreamGemBalance}
        />
      </header>

      <section style={scienceQuizWrap(isMobile)}>
        <div style={scienceQuizPanel(isMobile)}>
          <div style={scienceProgressHeader(isMobile)}>
            <div style={{ minWidth: 0 }}>
              <p style={scienceQuestionEyebrow}>
                Question {questionIndex + 1} of {payload.questions.length}
              </p>
              <p style={scienceQuestionMeta}>
                {payload.quiz.title} · {answeredCount}/
                {payload.questions.length} answered
              </p>
            </div>

            <div style={scienceQuestionNav(isMobile)}>
              {payload.questions.map((question, index) => {
                const complete = responseIsComplete(
                  question,
                  answers[question.id],
                );
                const checked = Boolean(
                  feedbackByQuestion[question.id]?.locked,
                );

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => void moveToQuestion(index)}
                    aria-label={`Open question ${index + 1}`}
                    style={scienceQuestionButton(
                      index === questionIndex,
                      complete,
                      checked,
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={scienceProgressTrack}>
            <div
              style={{
                ...scienceProgressFill,
                width: `${((questionIndex + 1) / payload.questions.length) * 100}%`,
              }}
            />
          </div>

          <article style={scienceQuestionCard(isMobile)}>
            <div style={scienceQuestionBadgeRow}>
              <span style={scienceQuestionTypeBadge}>
                {formatCoreQuestionType(currentQuestion.question_type)}
              </span>
              <span style={scienceSkillBadge}>
                {currentQuestion.skill || payload.quiz.topic_title}
              </span>
            </div>

            <h1 style={scienceQuestionPrompt(isMobile)}>
              {currentQuestion.prompt}
            </h1>

            {currentQuestion.instruction && (
              <p style={scienceInstructionText}>
                {currentQuestion.instruction}
              </p>
            )}

            <QuestionMediaRenderer
              stimulus={currentQuestion.stimulus}
              assets={currentQuestion.assets}
            />

            <div style={scienceResponseWrap}>
              <QuestionResponse
                question={currentQuestion}
                response={currentResponse ?? {}}
                disabled={isImmediateLocked || actionBusy}
                attemptId={payload.attempt_id}
                userId={userId}
                onChange={updateResponse}
              />
            </div>

            {currentFeedback && (
              <ImmediateFeedbackCard feedback={currentFeedback} />
            )}

            {error && <div style={errorBanner}>{error}</div>}
          </article>

          <div style={scienceActionRow(isMobile)}>
            <button
              type="button"
              disabled={questionIndex <= 0 || actionBusy}
              onClick={() => void moveToQuestion(questionIndex - 1)}
              style={{
                ...sciencePreviousButton,
                width: isMobile ? "100%" : "auto",
                opacity: questionIndex <= 0 || actionBusy ? 0.35 : 1,
              }}
            >
              ← Previous
            </button>

            <button
              type="button"
              disabled={
                actionBusy ||
                !responseIsComplete(currentQuestion, currentResponse)
              }
              onClick={() => void handlePrimaryQuestionAction()}
              style={{
                ...scienceNextButton,
                width: isMobile ? "100%" : "auto",
                opacity:
                  actionBusy ||
                  !responseIsComplete(currentQuestion, currentResponse)
                    ? 0.35
                    : 1,
              }}
            >
              {actionBusy
                ? "Saving..."
                : `${primaryActionLabel}${
                    primaryActionLabel === "Next Question" ? " →" : ""
                  }`}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function QuestionResponse({
  question,
  response,
  disabled,
  attemptId,
  userId,
  onChange,
}: {
  question: QuizQuestion;
  response: JsonObject;
  disabled: boolean;
  attemptId: string;
  userId: string | null;
  onChange: (response: JsonObject) => void;
}) {
  const options = asOptions(question.content);

  switch (question.question_type) {
    case "multiple_choice":
    case "listening_comprehension":
      return (
        <OptionGrid optionCount={options.length}>
          {options.map((option, index) => (
            <OptionButton
              key={option.id}
              option={option}
              label={String.fromCharCode(65 + index)}
              selected={response.option_id === option.id}
              disabled={disabled}
              onClick={() => onChange({ option_id: option.id })}
            />
          ))}
        </OptionGrid>
      );

    case "true_false": {
      const trueFalseOptions =
        options.length > 0
          ? options
          : [
              { id: "true", text: "True", image_url: null },
              { id: "false", text: "False", image_url: null },
            ];
      return (
        <OptionGrid optionCount={trueFalseOptions.length}>
          {trueFalseOptions.map((option) => (
            <OptionButton
              key={option.id}
              option={option}
              label={option.id === "true" ? "T" : "F"}
              selected={response.option_id === option.id}
              disabled={disabled}
              onClick={() => onChange({ option_id: option.id })}
            />
          ))}
        </OptionGrid>
      );
    }

    case "multiple_select":
      return (
        <div>
          <p style={helperText}>Choose every correct answer.</p>
          <OptionGrid optionCount={options.length}>
            {options.map((option, index) => {
              const selectedIds = Array.isArray(response.option_ids)
                ? response.option_ids.map(String)
                : [];
              const selected = selectedIds.includes(option.id);
              return (
                <OptionButton
                  key={option.id}
                  option={option}
                  label={String.fromCharCode(65 + index)}
                  selected={selected}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      option_ids: selected
                        ? selectedIds.filter((id: string) => id !== option.id)
                        : [...selectedIds, option.id],
                    })
                  }
                />
              );
            })}
          </OptionGrid>
        </div>
      );

    case "short_text":
    case "open_cloze":
      return (
        <input
          type="text"
          value={String(response.text ?? "")}
          disabled={disabled}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Type your answer"
          style={textInput}
        />
      );

    case "editing":
    case "long_text":
    case "picture_description":
      return (
        <textarea
          value={String(response.text ?? "")}
          disabled={disabled}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder={
            question.question_type === "editing"
              ? "Type the corrected sentence or passage"
              : "Type your response"
          }
          rows={question.question_type === "long_text" ? 9 : 6}
          style={textArea}
        />
      );

    case "sentence_reordering":
      return (
        <SentenceReordering
          content={question.content}
          response={response}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "matching":
      return (
        <MatchingQuestion
          content={question.content}
          response={response}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "word_bank":
    case "dropdown_cloze":
      return (
        <ClozeQuestion
          content={question.content}
          response={response}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "oral_recording":
      return (
        <OralRecorder
          attemptId={attemptId}
          questionId={question.id}
          userId={userId}
          response={response}
          disabled={disabled}
          onChange={onChange}
        />
      );

    default:
      return (
        <div style={errorBanner}>This question type is not supported yet.</div>
      );
  }
}

function OptionGrid({
  children,
  optionCount,
}: {
  children: ReactNode;
  optionCount: number;
}) {
  return <div style={optionGrid(optionCount)}>{children}</div>;
}

function OptionButton({
  option,
  label,
  selected,
  disabled,
  onClick,
}: {
  option: { id: string; text: string; image_url: string | null };
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={optionButton(selected, disabled)}
    >
      <span style={optionLabel}>{label}</span>
      <span style={{ minWidth: 0 }}>
        {option.image_url && (
          <img
            src={option.image_url}
            alt=""
            style={{
              display: "block",
              width: "100%",
              maxWidth: "220px",
              maxHeight: "150px",
              objectFit: "contain",
              margin: "0 auto 8px",
            }}
          />
        )}
        <span style={optionText}>{option.text}</span>
      </span>
    </button>
  );
}

function SentenceReordering({
  content,
  response,
  disabled,
  onChange,
}: {
  content: JsonObject;
  response: JsonObject;
  disabled: boolean;
  onChange: (response: JsonObject) => void;
}) {
  const tokens = Array.isArray(content.tokens)
    ? content.tokens.map((token: any, index: number) => ({
        id: String(token?.id ?? index + 1),
        text: String(token?.text ?? token ?? ""),
      }))
    : [];
  const selectedIds = Array.isArray(response.token_ids)
    ? response.token_ids.map(String)
    : [];
  const selectedTokens = selectedIds
    .map((id: string) => tokens.find((token: any) => token.id === id))
    .filter(Boolean);
  const remaining = tokens.filter(
    (token: any) => !selectedIds.includes(token.id),
  );

  return (
    <div>
      <div style={reorderAnswerBox}>
        {selectedTokens.length === 0 ? (
          <span style={{ opacity: 0.45 }}>
            Tap the words in the correct order.
          </span>
        ) : (
          selectedTokens.map((token: any, index: number) => (
            <button
              key={`${token.id}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  token_ids: selectedIds.filter(
                    (_: string, itemIndex: number) => itemIndex !== index,
                  ),
                })
              }
              style={wordChip(true)}
            >
              {token.text}
            </button>
          ))
        )}
      </div>
      <div style={wordBankWrap}>
        {remaining.map((token: any) => (
          <button
            key={token.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ token_ids: [...selectedIds, token.id] })}
            style={wordChip(false)}
          >
            {token.text}
          </button>
        ))}
      </div>
      {selectedIds.length > 0 && !disabled && (
        <button
          type="button"
          onClick={() => onChange({ token_ids: [] })}
          style={smallTextButton}
        >
          Clear sentence
        </button>
      )}
    </div>
  );
}

function MatchingQuestion({
  content,
  response,
  disabled,
  onChange,
}: {
  content: JsonObject;
  response: JsonObject;
  disabled: boolean;
  onChange: (response: JsonObject) => void;
}) {
  const left = Array.isArray(content.left) ? content.left : [];
  const right = Array.isArray(content.right) ? content.right : [];
  const matches = response.matches ?? {};

  return (
    <div style={matchingWrap}>
      {left.map((item: any, index: number) => {
        const leftId = String(item?.id ?? index + 1);
        return (
          <div key={leftId} style={matchingRow}>
            <div style={matchingPrompt}>{String(item?.text ?? "")}</div>
            <span style={{ opacity: 0.5 }}>→</span>
            <select
              disabled={disabled}
              value={String(matches[leftId] ?? "")}
              onChange={(event) =>
                onChange({
                  matches: { ...matches, [leftId]: event.target.value },
                })
              }
              style={selectInput}
            >
              <option value="">Choose</option>
              {right.map((choice: any, choiceIndex: number) => (
                <option
                  key={String(choice?.id ?? choiceIndex + 1)}
                  value={String(choice?.id ?? choiceIndex + 1)}
                >
                  {String(choice?.text ?? "")}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function ClozeQuestion({
  content,
  response,
  disabled,
  onChange,
}: {
  content: JsonObject;
  response: JsonObject;
  disabled: boolean;
  onChange: (response: JsonObject) => void;
}) {
  const text = String(content.text_with_blanks ?? content.text ?? "");
  const values = response.values ?? {};
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  const globalBank = Array.isArray(content.word_bank) ? content.word_bank : [];
  const optionsByBlank = content.options_by_blank ?? {};

  return (
    <div>
      <div style={clozeText}>
        {parts.map((part, index) => {
          const match = /^\{\{([^}]+)\}\}$/.exec(part);
          if (!match) return <span key={index}>{part}</span>;

          const blankId = match[1];
          const blankOptions = Array.isArray(optionsByBlank[blankId])
            ? optionsByBlank[blankId]
            : globalBank;

          return (
            <select
              key={`${blankId}-${index}`}
              disabled={disabled}
              value={String(values[blankId] ?? "")}
              onChange={(event) =>
                onChange({
                  values: { ...values, [blankId]: event.target.value },
                })
              }
              style={inlineSelect}
            >
              <option value="">Choose</option>
              {blankOptions.map((option: any, optionIndex: number) => {
                const optionValue = String(
                  option?.id ?? option?.text ?? option,
                );
                const optionText = String(option?.text ?? option);
                return (
                  <option
                    key={`${optionValue}-${optionIndex}`}
                    value={optionValue}
                  >
                    {optionText}
                  </option>
                );
              })}
            </select>
          );
        })}
      </div>
    </div>
  );
}

function OralRecorder({
  attemptId,
  questionId,
  userId,
  response,
  disabled,
  onChange,
}: {
  attemptId: string;
  questionId: string;
  userId: string | null;
  response: JsonObject;
  disabled: boolean;
  onChange: (response: JsonObject) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    if (!userId || disabled) return;
    setRecordingError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => void uploadRecording(recorder.mimeType);
      recorder.start();
      setElapsed(0);
      elapsedRef.current = 0;
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch (err) {
      console.warn("Microphone could not start:", err);
      setRecordingError("Microphone access is required for this question.");
    }
  }

  function stopRecording() {
    if (!recording) return;
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  async function uploadRecording(mimeType: string) {
    if (!userId || chunksRef.current.length === 0) return;
    setUploading(true);
    setRecordingError(null);

    const resolvedMimeType = mimeType || "audio/webm";
    const extension = resolvedMimeType.includes("ogg") ? "ogg" : "webm";
    const blob = new Blob(chunksRef.current, { type: resolvedMimeType });
    const storagePath = `${userId}/${attemptId}/${questionId}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("core-response-assets")
      .upload(storagePath, blob, {
        contentType: resolvedMimeType,
        upsert: false,
      });

    setUploading(false);

    if (error) {
      console.warn("Oral response upload failed:", error);
      setRecordingError(
        "The recording could not be uploaded. Please try again.",
      );
      return;
    }

    onChange({
      storage_bucket: "core-response-assets",
      storage_path: storagePath,
      mime_type: resolvedMimeType,
      duration_seconds: elapsedRef.current,
    });
  }

  return (
    <div style={recorderCard}>
      {response.storage_path ? (
        <>
          <p style={{ margin: 0, color: "#b8ffdb", fontWeight: 900 }}>
            Recording saved
          </p>
          <p style={{ ...mutedText, marginBottom: 0 }}>
            Duration: {Number(response.duration_seconds ?? 0)} seconds
          </p>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange({})}
              style={smallTextButton}
            >
              Record again
            </button>
          )}
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontWeight: 800 }}>
            {recording
              ? `Recording… ${elapsed}s`
              : uploading
                ? "Uploading recording…"
                : "Record your spoken answer"}
          </p>
          <button
            type="button"
            disabled={disabled || uploading || !userId}
            onClick={recording ? stopRecording : () => void startRecording()}
            style={{ ...primaryButton, marginTop: "12px" }}
          >
            {recording ? "Stop Recording" : "Start Recording"}
          </button>
        </>
      )}
      {recordingError && <div style={errorBanner}>{recordingError}</div>}
    </div>
  );
}

function ImmediateFeedbackCard({ feedback }: { feedback: ImmediateFeedback }) {
  if (feedback.pending_manual_review) {
    return (
      <div style={noticeBox}>
        This response has been saved and will be reviewed by a teacher.
      </div>
    );
  }

  return (
    <div style={feedbackCard(feedback.is_correct === true)}>
      <p style={{ margin: 0, fontWeight: 900 }}>
        {feedback.is_correct ? "Correct!" : "Not quite."}
      </p>
      {feedback.explanation && (
        <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
          {feedback.explanation}
        </p>
      )}
      {!feedback.is_correct && feedback.correct_response && (
        <p style={{ margin: "6px 0 0", opacity: 0.82 }}>
          Correct answer: {friendlyCorrectResponse(feedback.correct_response)}
        </p>
      )}
    </div>
  );
}

function ResultsScreen({
  isMobile,
  payload,
  result,
  expandedResultId,
  setExpandedResultId,
  onQuizList,
  onReplay,
  onRover,
}: {
  isMobile: boolean;
  payload: QuizPayload;
  result: SubmitResult;
  expandedResultId: string | null;
  setExpandedResultId: (id: string | null) => void;
  onQuizList: () => void;
  onReplay: () => void;
  onRover: () => void;
}) {
  return (
    <main style={resultsPage}>
      <header style={topHeader(isMobile)}>
        <button type="button" onClick={onQuizList} style={backButton}>
          ← Quiz List
        </button>
        {!isMobile && (
          <div style={{ textAlign: "center" }}>
            <p style={headerEyebrow}>CORE MISSION RESULT</p>
            <p style={headerSubtitle}>{payload.quiz.title}</p>
          </div>
        )}
        <div />
      </header>

      <section style={resultsContainer}>
        <div style={resultsHero}>
          <p style={eyebrow}>
            {result.pending_manual_review
              ? "SUBMITTED FOR REVIEW"
              : "CORE MISSION COMPLETE"}
          </p>
          <h1 style={resultsTitle}>{payload.quiz.title}</h1>

          {result.pending_manual_review ? (
            <p style={resultsMessage}>
              Your response was saved. A teacher must review one or more answers
              before the final score and rewards are confirmed.
            </p>
          ) : (
            <p style={resultsMessage}>
              {result.first_completion
                ? `First completion saved. You earned ${result.tokens_earned} DT and ${result.gems_earned} DG.`
                : "Replay saved. Replays do not award additional DT, DG or rover progress."}
            </p>
          )}

          <div style={resultStats(isMobile)}>
            <ResultStat
              label="Correct"
              value={`${result.correct_count}/${result.total_questions}`}
            />
            <ResultStat
              label="Score"
              value={`${Math.round(result.percentage)}%`}
            />
            <ResultStat label="DT Earned" value={`+${result.tokens_earned}`} />
            <ResultStat label="DG Earned" value={`+${result.gems_earned}`} />
            <ResultStat
              label="DT Balance"
              value={String(result.token_balance)}
            />
            <ResultStat label="DG Balance" value={String(result.gem_balance)} />
          </div>

          <p style={termsText}>
            All rewards are subject to terms and conditions.
          </p>

          <div style={buttonRow(isMobile)}>
            <button type="button" onClick={onQuizList} style={ghostButton}>
              Choose Another Quiz
            </button>
            <button type="button" onClick={onReplay} style={ghostButton}>
              Replay
            </button>
            <button type="button" onClick={onRover} style={primaryButton}>
              View My Rover
            </button>
          </div>
        </div>

        {payload.quiz.feedback_mode !== "none" &&
          result.question_results.length > 0 && (
            <div style={reviewCard}>
              <h2 style={{ margin: 0 }}>Question Review</h2>
              <p style={{ ...mutedText, marginTop: "6px" }}>
                Open a question to review your response and explanation.
              </p>

              <div style={reviewList}>
                {result.question_results.map((item) => {
                  const expanded = expandedResultId === item.question_id;
                  return (
                    <div key={item.question_id} style={reviewItem}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedResultId(
                            expanded ? null : item.question_id,
                          )
                        }
                        style={reviewItemButton}
                      >
                        <span
                          style={reviewStatus(
                            item.is_correct,
                            item.pending_manual_review,
                          )}
                        >
                          {item.pending_manual_review
                            ? "…"
                            : item.is_correct
                              ? "✓"
                              : "×"}
                        </span>
                        <span style={{ flex: 1, textAlign: "left" }}>
                          <strong>Question {item.question_order}</strong>
                          <span style={reviewPrompt}>{item.prompt}</span>
                        </span>
                        <span>{expanded ? "−" : "+"}</span>
                      </button>

                      {expanded && (
                        <div style={reviewDetails}>
                          <p style={reviewLine}>
                            <strong>Your response:</strong>{" "}
                            {friendlyCorrectResponse(item.response_data)}
                          </p>
                          {!item.pending_manual_review &&
                            item.correct_response && (
                              <p style={reviewLine}>
                                <strong>Correct response:</strong>{" "}
                                {friendlyCorrectResponse(item.correct_response)}
                              </p>
                            )}
                          {item.explanation && (
                            <p style={reviewLine}>
                              <strong>Explanation:</strong> {item.explanation}
                            </p>
                          )}
                          <p style={reviewLine}>
                            <strong>Marks:</strong>{" "}
                            {item.marks_awarded == null
                              ? "Pending"
                              : item.marks_awarded}
                            /{item.maximum_marks}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </section>
    </main>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={resultStatCard}>
      <p style={resultStatLabel}>{label}</p>
      <p style={resultStatValue}>{value}</p>
    </div>
  );
}

function IntroStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={introStatCard}>
      <p style={resultStatLabel}>{label}</p>
      <p style={{ ...resultStatValue, fontSize: "20px" }}>{value}</p>
    </div>
  );
}

function BalanceDisplay({
  compact,
  tokenBalance,
  gemBalance,
}: {
  compact: boolean;
  tokenBalance: number;
  gemBalance: number;
}) {
  return (
    <div style={balanceRow}>
      <div style={{ ...balancePill, ...(compact ? compactBalancePill : {}) }}>
        <span style={{ color: "#ffd76a" }}>✦</span>
        {tokenBalance} DT
      </div>
      <div style={{ ...gemPill, ...(compact ? compactBalancePill : {}) }}>
        <span style={{ color: "#e7b7ff" }}>◆</span>
        {gemBalance} DG
      </div>
    </div>
  );
}

function CenteredCard({ message }: { message: string }) {
  return <div style={centeredCard}>{message}</div>;
}

const pageShell: CSSProperties = {
  minHeight: "100dvh",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  backgroundImage: `
    linear-gradient(180deg, rgba(2,8,19,0.42), rgba(2,8,19,0.78)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const pageShellFixed: CSSProperties = {
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  backgroundImage: `
    linear-gradient(180deg, rgba(2,8,19,0.42), rgba(2,8,19,0.78)),
    url("/activities/learning-missions/core/skyforge-hangar-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  flexDirection: "column",
};

const scienceQuizPage: CSSProperties = {
  minHeight: "100dvh",
  overflowX: "hidden",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  backgroundColor: "#030d1d",
  backgroundImage: `
    radial-gradient(circle at 52% -12%, rgba(64,224,208,0.17), transparent 36%),
    radial-gradient(circle at 88% 18%, rgba(53,125,255,0.11), transparent 30%),
    linear-gradient(rgba(126,232,255,0.038) 1px, transparent 1px),
    linear-gradient(90deg, rgba(126,232,255,0.038) 1px, transparent 1px),
    linear-gradient(180deg, #07162c 0%, #020915 100%)
  `,
  backgroundSize: "auto, auto, 48px 48px, 48px 48px, auto",
  backgroundPosition: "center top, center top, center, center, center",
};

function scienceQuizHeader(isMobile: boolean): CSSProperties {
  return {
    width: "min(1366px,100%)",
    margin: "0 auto",
    padding: isMobile ? "16px 14px 0" : "26px 20px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  };
}

function scienceQuizWrap(isMobile: boolean): CSSProperties {
  return {
    width: "min(1056px,100%)",
    margin: "0 auto",
    padding: isMobile ? "18px 12px 32px" : "28px 16px 48px",
  };
}

function scienceQuizPanel(isMobile: boolean): CSSProperties {
  return {
    borderRadius: isMobile ? "24px" : "36px",
    border: "1px solid rgba(255,255,255,0.11)",
    background:
      "linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.035))",
    padding: isMobile ? "16px" : "32px",
    boxShadow: "0 30px 80px rgba(0,0,0,0.36)",
    backdropFilter: "blur(18px)",
  };
}

function scienceProgressHeader(isMobile: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: "space-between",
    gap: isMobile ? "14px" : "20px",
  };
}

const scienceQuestionEyebrow: CSSProperties = {
  margin: 0,
  color: "#9cf5ff",
  fontSize: "10px",
  letterSpacing: "0.17em",
  fontWeight: 900,
  textTransform: "uppercase",
};

const scienceQuestionMeta: CSSProperties = {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.43)",
  fontSize: "12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function scienceQuestionNav(isMobile: boolean): CSSProperties {
  return {
    display: "flex",
    flexWrap: isMobile ? "nowrap" : "wrap",
    justifyContent: isMobile ? "flex-start" : "flex-end",
    gap: "8px",
    maxWidth: isMobile ? "100%" : "56%",
    overflowX: isMobile ? "auto" : "visible",
    paddingBottom: isMobile ? "3px" : 0,
  };
}

function scienceQuestionButton(
  active: boolean,
  complete: boolean,
  checked: boolean,
): CSSProperties {
  return {
    width: "36px",
    height: "36px",
    flex: "0 0 36px",
    borderRadius: "999px",
    border: active
      ? "1px solid rgba(156,245,255,0.7)"
      : checked || complete
        ? "1px solid rgba(96,240,208,0.32)"
        : "1px solid rgba(255,255,255,0.11)",
    background: active
      ? "#9cf5ff"
      : checked || complete
        ? "rgba(96,240,208,0.12)"
        : "rgba(255,255,255,0.045)",
    color: active
      ? "#071223"
      : checked || complete
        ? "#b8ffeb"
        : "rgba(255,255,255,0.48)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 900,
  };
}

const scienceProgressTrack: CSSProperties = {
  height: "8px",
  marginTop: "20px",
  overflow: "hidden",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.065)",
};

const scienceProgressFill: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg,#53d7ff,#60f0d0)",
  transition: "width 180ms ease",
};

function scienceQuestionCard(isMobile: boolean): CSSProperties {
  return {
    minHeight: isMobile ? "360px" : "375px",
    marginTop: isMobile ? "18px" : "24px",
    borderRadius: isMobile ? "22px" : "30px",
    border: "1px solid rgba(126,232,255,0.13)",
    background: "linear-gradient(145deg,rgba(3,14,34,0.94),rgba(3,17,38,0.86))",
    padding: isMobile ? "20px" : "32px",
    overflow: "hidden",
  };
}

const scienceQuestionBadgeRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const scienceQuestionTypeBadge: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.11)",
  background: "rgba(255,255,255,0.04)",
  padding: "7px 13px",
  color: "rgba(255,255,255,0.52)",
  fontSize: "10px",
  letterSpacing: "0.12em",
  fontWeight: 900,
  textTransform: "uppercase",
};

const scienceSkillBadge: CSSProperties = {
  color: "rgba(190,241,255,0.58)",
  fontSize: "10px",
  letterSpacing: "0.12em",
  fontWeight: 900,
  textTransform: "uppercase",
};

function scienceQuestionPrompt(isMobile: boolean): CSSProperties {
  return {
    margin: isMobile ? "24px 0 0" : "28px 0 0",
    color: "#ffffff",
    fontSize: isMobile ? "26px" : "clamp(30px,3.1vw,40px)",
    lineHeight: 1.16,
    letterSpacing: "-0.025em",
    fontWeight: 900,
  };
}

const scienceInstructionText: CSSProperties = {
  margin: "13px 0 0",
  color: "rgba(255,255,255,0.53)",
  fontSize: "14px",
  lineHeight: 1.6,
};

const scienceResponseWrap: CSSProperties = {
  marginTop: "28px",
};

function scienceActionRow(isMobile: boolean): CSSProperties {
  return {
    marginTop: "20px",
    display: "flex",
    flexDirection: isMobile ? "column-reverse" : "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: "12px",
  };
}

const sciencePreviousButton: CSSProperties = {
  minHeight: "50px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.045)",
  color: "white",
  padding: "0 24px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 900,
};

const scienceNextButton: CSSProperties = {
  minHeight: "50px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.28)",
  background: "#ffffff",
  color: "#071223",
  padding: "0 28px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 900,
};

const resultsPage: CSSProperties = {
  ...pageShellFixed,
  position: "relative",
  minHeight: "100dvh",
  overflow: "auto",
};

function topHeader(isMobile: boolean): CSSProperties {
  return {
    minHeight: isMobile ? "58px" : "68px",
    padding: isMobile ? "8px 10px" : "10px 18px",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr auto" : "1fr auto 1fr",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    position: "absolute",
    inset: "0 0 auto 0",
    zIndex: 5,
  };
}

const headerEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "10px",
  letterSpacing: "0.2em",
  fontWeight: 900,
};

const headerSubtitle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: "13px",
  color: "rgba(255,255,255,0.68)",
};

const backButton: CSSProperties = {
  justifySelf: "start",
  minHeight: "36px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(255,255,255,0.065)",
  color: "white",
  padding: "0 13px",
  cursor: "pointer",
  fontWeight: 800,
};

const balanceRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
};

const balancePill: CSSProperties = {
  minHeight: "36px",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.28)",
  background: "rgba(255,215,106,0.09)",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const gemPill: CSSProperties = {
  ...balancePill,
  border: "1px solid rgba(231,183,255,0.3)",
  background: "rgba(168,85,247,0.12)",
};

const compactBalancePill: CSSProperties = {
  minHeight: "32px",
  padding: "0 8px",
  fontSize: "10px",
};

const introWrap: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "82px 18px 24px",
};

const introCard: CSSProperties = {
  width: "min(900px,100%)",
  borderRadius: "26px",
  border: "1px solid rgba(126,232,255,0.38)",
  background: "linear-gradient(145deg, rgba(5,18,42,0.83), rgba(8,26,58,0.95))",
  padding: "clamp(22px,4vw,42px)",
  textAlign: "center",
  boxShadow: "0 26px 70px rgba(0,0,0,0.38)",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
  textTransform: "uppercase",
};

const introTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(34px,6vw,62px)",
  lineHeight: 1.04,
};

const introDescription: CSSProperties = {
  margin: "12px auto 0",
  maxWidth: "680px",
  color: "rgba(255,255,255,0.7)",
  fontSize: "clamp(14px,2vw,18px)",
  lineHeight: 1.55,
};

function introStats(isMobile: boolean): CSSProperties {
  return {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : "repeat(4,minmax(0,1fr))",
    gap: "8px",
  };
}

const introStatCard: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.06)",
  padding: "13px 9px",
};

const noticeBox: CSSProperties = {
  marginTop: "14px",
  borderRadius: "13px",
  border: "1px solid rgba(255,215,106,0.34)",
  background: "rgba(255,215,106,0.09)",
  padding: "12px",
  color: "#fff1bd",
  lineHeight: 1.5,
};

const termsText: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "11px",
  color: "rgba(255,255,255,0.48)",
};

function buttonRow(isMobile: boolean): CSSProperties {
  return {
    marginTop: "20px",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "center",
    gap: "9px",
  };
}

const primaryButton: CSSProperties = {
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.28)",
  background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
  color: "white",
  padding: "0 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontWeight: 900,
};

const ghostButton: CSSProperties = {
  ...primaryButton,
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.065)",
};

const centeredCard: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(5,18,42,0.82)",
  padding: "24px",
  color: "rgba(255,255,255,0.8)",
  fontWeight: 800,
};

const lockedCard: CSSProperties = {
  width: "min(620px,100%)",
  borderRadius: "22px",
  border: "1px solid rgba(255,215,106,0.4)",
  background:
    "linear-gradient(180deg, rgba(90,62,16,0.56), rgba(30,20,8,0.84))",
  padding: "28px",
  textAlign: "center",
};

const mutedText: CSSProperties = {
  color: "rgba(255,255,255,0.66)",
  lineHeight: 1.5,
};

function optionGrid(optionCount: number): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns:
      optionCount === 1
        ? "1fr"
        : "repeat(auto-fit,minmax(min(100%,320px),1fr))",
    gap: "12px",
    alignItems: "stretch",
  };
}

function optionButton(selected: boolean, disabled: boolean): CSSProperties {
  return {
    minHeight: "72px",
    borderRadius: "14px",
    border: selected
      ? "1px solid rgba(156,245,255,0.88)"
      : "1px solid rgba(255,255,255,0.13)",
    background: selected
      ? "linear-gradient(135deg,rgba(83,215,255,0.22),rgba(96,240,208,0.14))"
      : "rgba(255,255,255,0.045)",
    color: "white",
    padding: "12px 16px",
    width: "100%",
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "34px minmax(0,1fr)",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled && !selected ? 0.65 : 1,
  };
}

const optionLabel: CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,10,25,0.34)",
  color: "#c9f8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const optionText: CSSProperties = {
  fontSize: "clamp(14px,1.8vw,18px)",
  lineHeight: 1.35,
  fontWeight: 700,
};

const helperText: CSSProperties = {
  margin: "0 0 8px",
  color: "rgba(255,255,255,0.58)",
  fontSize: "12px",
};

const textInput: CSSProperties = {
  width: "100%",
  minHeight: "52px",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 14px",
  fontSize: "18px",
  outline: "none",
};

const textArea: CSSProperties = {
  ...textInput,
  minHeight: "150px",
  padding: "13px 14px",
  resize: "vertical",
  lineHeight: 1.5,
};

const reorderAnswerBox: CSSProperties = {
  minHeight: "72px",
  borderRadius: "14px",
  border: "1px dashed rgba(126,232,255,0.42)",
  background: "rgba(255,255,255,0.045)",
  padding: "10px",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "7px",
};

const wordBankWrap: CSSProperties = {
  marginTop: "10px",
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
};

function wordChip(selected: boolean): CSSProperties {
  return {
    minHeight: "38px",
    borderRadius: "10px",
    border: selected
      ? "1px solid rgba(96,240,208,0.55)"
      : "1px solid rgba(126,232,255,0.28)",
    background: selected ? "rgba(96,240,208,0.16)" : "rgba(255,255,255,0.07)",
    color: "white",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 800,
  };
}

const smallTextButton: CSSProperties = {
  marginTop: "10px",
  border: 0,
  background: "transparent",
  color: "#7ee8ff",
  cursor: "pointer",
  fontWeight: 800,
  padding: 0,
};

const matchingWrap: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const matchingRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) auto minmax(150px,0.8fr)",
  gap: "10px",
  alignItems: "center",
};

const matchingPrompt: CSSProperties = {
  minHeight: "46px",
  borderRadius: "11px",
  background: "rgba(255,255,255,0.065)",
  border: "1px solid rgba(126,232,255,0.2)",
  padding: "10px",
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
};

const selectInput: CSSProperties = {
  minHeight: "46px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "#102e56",
  color: "white",
  padding: "0 10px",
};

const clozeText: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "rgba(255,255,255,0.055)",
  padding: "16px",
  fontSize: "clamp(17px,2.2vw,23px)",
  lineHeight: 2,
};

const inlineSelect: CSSProperties = {
  minHeight: "38px",
  margin: "0 5px",
  borderRadius: "9px",
  border: "1px solid rgba(126,232,255,0.35)",
  background: "#102e56",
  color: "white",
  padding: "0 8px",
  fontSize: "0.82em",
};

const recorderCard: CSSProperties = {
  borderRadius: "14px",
  border: "1px solid rgba(198,166,255,0.38)",
  background: "rgba(168,85,247,0.1)",
  padding: "16px",
  textAlign: "center",
};

function feedbackCard(correct: boolean): CSSProperties {
  return {
    marginTop: "14px",
    borderRadius: "14px",
    border: correct
      ? "1px solid rgba(74,222,128,0.5)"
      : "1px solid rgba(248,113,113,0.5)",
    background: correct ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)",
    padding: "13px",
  };
}

const errorBanner: CSSProperties = {
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,215,106,0.42)",
  background: "rgba(255,215,106,0.1)",
  color: "#fff0b3",
  padding: "10px 12px",
  fontSize: "12px",
  lineHeight: 1.45,
};

const resultsContainer: CSSProperties = {
  width: "min(1050px,calc(100% - 24px))",
  margin: "0 auto",
  padding: "88px 0 28px",
};

const resultsHero: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.4)",
  background: "linear-gradient(145deg, rgba(5,18,42,0.86), rgba(8,26,58,0.97))",
  padding: "clamp(20px,4vw,38px)",
  textAlign: "center",
};

const resultsTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(32px,5vw,54px)",
};

const resultsMessage: CSSProperties = {
  margin: "11px auto 0",
  maxWidth: "720px",
  color: "rgba(255,255,255,0.7)",
  lineHeight: 1.55,
};

function resultStats(isMobile: boolean): CSSProperties {
  return {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : "repeat(3,minmax(0,1fr))",
    gap: "8px",
  };
}

const resultStatCard: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.06)",
  padding: "12px 8px",
};

const resultStatLabel: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  letterSpacing: "0.12em",
  fontWeight: 900,
  textTransform: "uppercase",
};

const resultStatValue: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "clamp(19px,2.7vw,28px)",
  fontWeight: 900,
};

const reviewCard: CSSProperties = {
  marginTop: "14px",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.3)",
  background: "rgba(5,18,42,0.92)",
  padding: "clamp(16px,3vw,26px)",
};

const reviewList: CSSProperties = {
  marginTop: "14px",
  display: "grid",
  gap: "8px",
};

const reviewItem: CSSProperties = {
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  overflow: "hidden",
};

const reviewItemButton: CSSProperties = {
  width: "100%",
  minHeight: "58px",
  border: 0,
  background: "transparent",
  color: "white",
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  cursor: "pointer",
};

function reviewStatus(
  correct: boolean | null,
  pending: boolean,
): CSSProperties {
  return {
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: pending
      ? "rgba(255,215,106,0.2)"
      : correct
        ? "rgba(34,197,94,0.28)"
        : "rgba(239,68,68,0.28)",
    color: pending ? "#ffe6a8" : correct ? "#b8ffdb" : "#fecaca",
    fontWeight: 900,
    flexShrink: 0,
  };
}

const reviewPrompt: CSSProperties = {
  display: "block",
  marginTop: "3px",
  color: "rgba(255,255,255,0.58)",
  fontSize: "12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const reviewDetails: CSSProperties = {
  borderTop: "1px solid rgba(126,232,255,0.16)",
  padding: "12px 14px",
  background: "rgba(0,0,0,0.12)",
};

const reviewLine: CSSProperties = {
  margin: "6px 0",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};
