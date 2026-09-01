"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";
import QuestionMediaRenderer from "@/components/core-media/QuestionMediaRenderer";
import GroupedWordBankCloze from "./GroupedWordBankCloze";
import GroupedComprehension from "./GroupedComprehension";
import InlineCoreQuestionEditor from "./InlineCoreQuestionEditor";
import MathWorkingWorkspace from "./MathWorkingWorkspace";
import FractionText from "@/components/core-missions/FractionText";

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

type QuizOption = {
  id: string;
  text: string;
  image_url: string | null;
  image_alt: string | null;
  show_text_with_image: boolean;
};

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
    // Newer payloads may expose these directly. Keep them optional so this
    // player remains compatible with the current RPC payload.
    topic_id?: string;
    topic_slug?: string;
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

type CoreQuizCheckpoint = {
  version: 1;
  attempt_id: string;
  quiz_id: string;
  question_index: number;
  stage: "intro" | "playing";
  answers: AnswerMap;
  feedback_by_question: FeedbackMap;
  time_by_question: TimeMap;
  current_question_elapsed_seconds: number;
  quiz_elapsed_seconds: number;
  saved_at: number;
};

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

function getCheckpointKey(
  subject: CoreSubject,
  level: number,
  quizId: string,
  attemptId: string,
) {
  return `dreamscape-core-quiz:v1:${subject}:p${level}:${quizId}:${attemptId}`;
}

function readCheckpoint(
  subject: CoreSubject,
  level: number,
  quizId: string,
  attemptId: string,
): CoreQuizCheckpoint | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(
      getCheckpointKey(subject, level, quizId, attemptId),
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CoreQuizCheckpoint>;

    if (
      parsed.version !== 1 ||
      parsed.attempt_id !== attemptId ||
      parsed.quiz_id !== quizId ||
      (parsed.stage !== "intro" && parsed.stage !== "playing") ||
      !parsed.answers ||
      !parsed.feedback_by_question ||
      !parsed.time_by_question
    ) {
      return null;
    }

    return parsed as CoreQuizCheckpoint;
  } catch (checkpointError) {
    console.warn("Could not restore Core quiz checkpoint:", checkpointError);
    return null;
  }
}

function removeCheckpoint(
  subject: CoreSubject,
  level: number,
  quizId: string,
  attemptId: string,
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(
      getCheckpointKey(subject, level, quizId, attemptId),
    );
  } catch (checkpointError) {
    console.warn("Could not clear Core quiz checkpoint:", checkpointError);
  }
}

function getMathWorkspaceAttemptPrefix(quizId: string, attemptId: string) {
  return `dreamscape-math-workspace:v1:${quizId}:${attemptId}:`;
}

function getMathWorkspaceQuestionKey(
  quizId: string,
  attemptId: string,
  questionId: string,
) {
  return `${getMathWorkspaceAttemptPrefix(quizId, attemptId)}question:${questionId}`;
}

function getMathWorkspaceOpenKey(quizId: string, attemptId: string) {
  return `${getMathWorkspaceAttemptPrefix(quizId, attemptId)}open`;
}

function readMathWorkspaceOpen(quizId: string, attemptId: string) {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(
      getMathWorkspaceOpenKey(quizId, attemptId),
    ) === "1";
  } catch {
    return false;
  }
}

function writeMathWorkspaceOpen(
  quizId: string,
  attemptId: string,
  open: boolean,
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getMathWorkspaceOpenKey(quizId, attemptId),
      open ? "1" : "0",
    );
  } catch (workspaceError) {
    console.warn("Could not save Math workspace preference:", workspaceError);
  }
}

function clearMathWorkspaceAttempt(quizId: string, attemptId: string) {
  if (typeof window === "undefined") return;

  try {
    const prefix = getMathWorkspaceAttemptPrefix(quizId, attemptId);
    const keys: string[] = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }

    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch (workspaceError) {
    console.warn("Could not clear Math workspace:", workspaceError);
  }
}

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

function asOptions(content: JsonObject): QuizOption[] {
  const options = Array.isArray(content.options) ? content.options : [];

  return options
    .map((option: any, index: number) => ({
      id: String(option?.id ?? option?.key ?? index + 1),
      text: String(option?.text ?? ""),
      image_url: option?.image_url ? String(option.image_url) : null,
      image_alt: option?.image_alt ? String(option.image_alt) : null,
      show_text_with_image: option?.show_text_with_image === true,
    }))
    .filter(
      (option: QuizOption) =>
        option.text.trim().length > 0 || Boolean(option.image_url),
    );
}

function getBlankIds(content: JsonObject) {
  const explicit = Array.isArray(content.blank_ids)
    ? content.blank_ids.map(String)
    : [];
  if (explicit.length > 0) return explicit;

  const text = String(content.text_with_blanks ?? content.text ?? "");
  const matches = Array.from(text.matchAll(/\{\{([^}]+)\}\}/g));
  return matches.map((match) => String(match[1]));
}

function responseIsComplete(question: QuizQuestion, response?: JsonObject) {
  if (!response) return false;

  switch (question.question_type) {
    case "multiple_choice":
    case "true_false":
    case "listening_comprehension":
      return Boolean(response.option_id);
    case "multiple_select":
      return Array.isArray(response.option_ids) && response.option_ids.length > 0;
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
      return left.length > 0 && left.every((item: any) => matches[String(item.id)]);
    }
    case "word_bank":
    case "dropdown_cloze": {
      if (question.content.layout === "drag_drop_grouped") {
        const blankId = String(
          question.content.blank_id ?? question.question_order,
        );
        return Boolean(response.values?.[blankId]);
      }

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

function friendlyCorrectResponse(value: JsonObject | string | null) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  if (typeof value.display === "string") return value.display;
  if (typeof value.display_answer === "string") return value.display_answer;
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.correct_option_ids)) {
    return value.correct_option_ids.join(", ");
  }
  if (Array.isArray(value.accepted_answers)) {
    return value.accepted_answers.join(" / ");
  }
  if (Array.isArray(value.order)) return value.order.join(" → ");

  if (
    value.values &&
    typeof value.values === "object" &&
    !Array.isArray(value.values)
  ) {
    return Object.entries(value.values)
      .sort(([left], [right]) => {
        const leftNumber = Number(left);
        const rightNumber = Number(right);

        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
          return leftNumber - rightNumber;
        }

        return left.localeCompare(right);
      })
      .map(([, answer]) => String(answer))
      .join(" / ");
  }

  return JSON.stringify(value);
}

function isCoreTopicLockError(value: unknown) {
  const message = String(value ?? "").trim().toLowerCase();

  return (
    message.includes("topic is currently locked") ||
    message.includes("admin access only")
  );
}

function normaliseCurriculumRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
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

function getQuestionVisualMediaCount(question: QuizQuestion) {
  const stimulusType = question.stimulus?.stimulus_type;
  const stimulusIsVisual =
    stimulusType === "image" ||
    stimulusType === "diagram" ||
    stimulusType === "graph";

  const attachmentCount = (question.assets || []).filter(
    (asset) => asset.asset_type === "image" || asset.asset_type === "svg",
  ).length;

  return (stimulusIsVisual ? 1 : 0) + attachmentCount;
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
  const quizIdentity = `${subject}:p${level}:${quizId}`;

  const {
    status,
    userId,
    tokenBalance,
    dreamGemBalance,
    refreshBalances,
  } = useCoreMissionAccess();

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
  const [topicAccessLocked, setTopicAccessLocked] = useState(false);
  const [curriculumRole, setCurriculumRole] = useState<
    "admin" | "curriculum_lead" | null
  >(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [mathWorkspaceOpen, setMathWorkspaceOpen] = useState(false);

  const questionOpenedAtRef = useRef<number>(Date.now());
  const quizStartedAtRef = useRef<number>(Date.now());
  const quizElapsedBeforeRef = useRef(0);
  const loadedQuizIdentityRef = useRef<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const topicHrefRef = useRef<string | null>(null);

  const loadQuiz = useCallback(
    async (options: { force?: boolean } = {}) => {
      const { force = false } = options;

      // Critical anti-reset guard: access/auth revalidation may rerun the
      // effect below, but it cannot reload the same quiz identity.
      if (!force && loadedQuizIdentityRef.current === quizIdentity) {
        return;
      }

      loadedQuizIdentityRef.current = quizIdentity;
      const requestId = ++loadRequestIdRef.current;

      setStage("loading");
      setError(null);
      setTopicAccessLocked(false);
      setActionBusy(false);
      setExpandedResultId(null);

      const { data, error: loadError } = await supabase.rpc(
        rpcNames.getPayload,
        { p_quiz_id: quizId },
      );

      if (requestId !== loadRequestIdRef.current) return;

      if (loadError || !data) {
        loadedQuizIdentityRef.current = null;
        console.warn("Could not load Core quiz payload:", loadError);

        if (isCoreTopicLockError(loadError?.message)) {
          setTopicAccessLocked(true);
          setError(null);
          setStage("error");
          return;
        }

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
        loadedQuizIdentityRef.current = null;
        setError("This quiz does not belong to the selected subject and level.");
        setStage("error");
        return;
      }

      if (nextPayload.questions.length !== nextPayload.quiz.question_count) {
        loadedQuizIdentityRef.current = null;
        setError("This quiz is incomplete and cannot be started yet.");
        setStage("error");
        return;
      }

      const serverAnswers: AnswerMap = {};
      const serverFeedback: FeedbackMap = {};

      for (const saved of nextPayload.saved_answers ?? []) {
        serverAnswers[saved.question_id] = saved.response_data ?? {};

        if (saved.locked) {
          serverFeedback[saved.question_id] = {
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

      const checkpoint = readCheckpoint(
        subject,
        level,
        quizId,
        nextPayload.attempt_id,
      );

      const restoredAnswers: AnswerMap = checkpoint
        ? { ...serverAnswers, ...checkpoint.answers }
        : serverAnswers;

      // Server-locked feedback is authoritative.
      const restoredFeedback: FeedbackMap = checkpoint
        ? { ...checkpoint.feedback_by_question, ...serverFeedback }
        : serverFeedback;

      const restoredTime: TimeMap = checkpoint
        ? { ...checkpoint.time_by_question }
        : {};

      let restoredQuestionIndex = 0;

      if (checkpoint) {
        restoredQuestionIndex = Math.min(
          Math.max(0, Number(checkpoint.question_index) || 0),
          Math.max(0, nextPayload.questions.length - 1),
        );

        const checkpointQuestion = nextPayload.questions[restoredQuestionIndex];

        if (
          checkpointQuestion &&
          Number(checkpoint.current_question_elapsed_seconds) > 0
        ) {
          restoredTime[checkpointQuestion.id] =
            (restoredTime[checkpointQuestion.id] ?? 0) +
            Math.max(
              0,
              Number(checkpoint.current_question_elapsed_seconds) || 0,
            );
        }

        quizElapsedBeforeRef.current = Math.max(
          0,
          Number(checkpoint.quiz_elapsed_seconds) || 0,
        );
      } else {
        const firstIncompleteIndex = nextPayload.questions.findIndex(
          (question) =>
            !responseIsComplete(question, serverAnswers[question.id]),
        );

        if (nextPayload.resumed) {
          restoredQuestionIndex =
            firstIncompleteIndex >= 0
              ? firstIncompleteIndex
              : Math.max(0, nextPayload.questions.length - 1);
        }

        quizElapsedBeforeRef.current = 0;
      }

      setPayload(nextPayload);
      setAnswers(restoredAnswers);
      setFeedbackByQuestion(restoredFeedback);
      setTimeByQuestion(restoredTime);
      setQuestionIndex(restoredQuestionIndex);
      setResult(null);

      quizStartedAtRef.current = Date.now();
      questionOpenedAtRef.current = Date.now();

      // If the browser checkpoint says the learner was already playing,
      // return straight to the exact question rather than the intro screen.
      setStage(checkpoint?.stage === "playing" ? "playing" : "intro");
    },
    [level, quizId, quizIdentity, rpcNames.getPayload, subject],
  );

  useEffect(() => {
    if (status !== "allowed") return;
    void loadQuiz();
  }, [status, loadQuiz]);

  useEffect(() => {
    if (status !== "allowed" || !userId) {
      setCurriculumRole(null);
      return;
    }

    let cancelled = false;

    async function loadCurriculumRole() {
      const { data, error: roleError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (roleError) {
        console.warn(
          "Could not determine inline curriculum editor role:",
          roleError.message,
        );
        setCurriculumRole(null);
        return;
      }

      const role = normaliseCurriculumRole(data?.role);
      setCurriculumRole(
        role === "admin" || role === "curriculum_lead" ? role : null,
      );
    }

    void loadCurriculumRole();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  const canInlineEdit = curriculumRole !== null;
  const mathWorkspaceAvailable = subject === "math" && !isMobile;

  useEffect(() => {
    if (subject !== "math" || !payload) {
      setMathWorkspaceOpen(false);
      return;
    }

    if (!mathWorkspaceAvailable) {
      setMathWorkspaceOpen(false);
      return;
    }

    setMathWorkspaceOpen(readMathWorkspaceOpen(quizId, payload.attempt_id));
  }, [mathWorkspaceAvailable, payload, quizId, subject]);

  function setWorkspaceOpen(nextOpen: boolean) {
    if (!payload || !mathWorkspaceAvailable) {
      setMathWorkspaceOpen(false);
      return;
    }

    setMathWorkspaceOpen(nextOpen);
    writeMathWorkspaceOpen(quizId, payload.attempt_id, nextOpen);
  }

  useEffect(() => {
    const shouldLockViewport =
      stage === "intro" || stage === "playing" || stage === "submitting";

    if (!shouldLockViewport || typeof document === "undefined") return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [stage]);

  useEffect(() => {
    return () => {
      loadRequestIdRef.current += 1;
    };
  }, []);

  const currentQuestion = payload?.questions[questionIndex] ?? null;
  const currentResponse = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const currentFeedback = currentQuestion
    ? feedbackByQuestion[currentQuestion.id]
    : undefined;

  const persistCheckpoint = useCallback(() => {
    if (!payload) return;
    if (payload.quiz.id !== quizId) return;
    if (stage !== "intro" && stage !== "playing") return;
    if (typeof window === "undefined") return;

    const checkpointQuestion = payload.questions[questionIndex] ?? null;

    const currentQuestionElapsedSeconds =
      stage === "playing" && checkpointQuestion
        ? Math.max(
            0,
            Math.round((Date.now() - questionOpenedAtRef.current) / 1000),
          )
        : 0;

    const currentQuizElapsedSeconds =
      stage === "playing"
        ? quizElapsedBeforeRef.current +
          Math.max(
            0,
            Math.round((Date.now() - quizStartedAtRef.current) / 1000),
          )
        : quizElapsedBeforeRef.current;

    const checkpoint: CoreQuizCheckpoint = {
      version: 1,
      attempt_id: payload.attempt_id,
      quiz_id: quizId,
      question_index: questionIndex,
      stage,
      answers,
      feedback_by_question: feedbackByQuestion,
      time_by_question: timeByQuestion,
      current_question_elapsed_seconds: currentQuestionElapsedSeconds,
      quiz_elapsed_seconds: currentQuizElapsedSeconds,
      saved_at: Date.now(),
    };

    try {
      window.sessionStorage.setItem(
        getCheckpointKey(subject, level, quizId, payload.attempt_id),
        JSON.stringify(checkpoint),
      );
    } catch (checkpointError) {
      console.warn("Could not save Core quiz checkpoint:", checkpointError);
    }
  }, [
    answers,
    feedbackByQuestion,
    level,
    payload,
    questionIndex,
    quizId,
    stage,
    subject,
    timeByQuestion,
  ]);

  useEffect(() => {
    persistCheckpoint();
  }, [persistCheckpoint]);

  useEffect(() => {
    function handlePageHide() {
      persistCheckpoint();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        persistCheckpoint();
      }
    }

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      persistCheckpoint();
    };
  }, [persistCheckpoint]);

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

  const isGroupedWordBankQuiz = useMemo(() => {
    if (subject !== "english" || !payload || payload.questions.length === 0) {
      return false;
    }

    const firstPassage = String(
      payload.questions[0]?.content?.cloze_passage ?? "",
    );

    if (!firstPassage.trim()) return false;

    return payload.questions.every((question) => {
      const content = question.content ?? {};
      return (
        question.question_type === "word_bank" &&
        content.layout === "drag_drop_grouped" &&
        String(content.cloze_passage ?? "") === firstPassage &&
        String(content.blank_id ?? "").trim().length > 0 &&
        Array.isArray(content.word_bank)
      );
    });
  }, [payload, subject]);

  const isSplitComprehensionQuiz = useMemo(() => {
    if (subject !== "english" || !payload || payload.questions.length === 0) {
      return false;
    }

    const firstPassage = String(
      payload.questions[0]?.content?.comprehension_passage ?? "",
    ).trim();

    if (!firstPassage) return false;

    return payload.questions.every((question) => {
      const content = question.content ?? {};
      return (
        question.question_type === "multiple_choice" &&
        content.layout === "split_comprehension" &&
        String(content.comprehension_passage ?? "").trim() === firstPassage &&
        Array.isArray(content.options) &&
        content.options.length >= 2
      );
    });
  }, [payload, subject]);

  function recordCurrentQuestionTime() {
    if (!currentQuestion || isGroupedWordBankQuiz) return;

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
    setError(null);
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

      if (isCoreTopicLockError(saveError?.message)) {
        setTopicAccessLocked(true);
        setError(null);
        setStage("error");
        return false;
      }

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
      const firstMissingIndex = payload.questions.findIndex(
        (question) => question.id === missingQuestions[0].id,
      );

      if (!isGroupedWordBankQuiz && firstMissingIndex >= 0) {
        setQuestionIndex(firstMissingIndex);
        questionOpenedAtRef.current = Date.now();
      }

      setError(
        `Answer all questions before submitting. ${missingQuestions.length} question${
          missingQuestions.length === 1 ? " is" : "s are"
        } still incomplete.`,
      );
      return;
    }

    const currentQuestionSeconds =
      !isGroupedWordBankQuiz && currentQuestion
        ? Math.max(
            1,
            Math.round((Date.now() - questionOpenedAtRef.current) / 1000),
          )
        : 0;

    const finalTimeMap: TimeMap =
      !isGroupedWordBankQuiz && currentQuestion
        ? {
            ...timeByQuestion,
            [currentQuestion.id]:
              (timeByQuestion[currentQuestion.id] ?? 0) +
              currentQuestionSeconds,
          }
        : timeByQuestion;

    setTimeByQuestion(finalTimeMap);
    setActionBusy(true);
    setStage("submitting");
    setError(null);

    const finalDuration = Math.max(
      1,
      quizElapsedBeforeRef.current +
        Math.round((Date.now() - quizStartedAtRef.current) / 1000),
    );

    const groupedAverageSeconds = isGroupedWordBankQuiz
      ? Math.max(1, Math.round(finalDuration / payload.questions.length))
      : null;

    const responseArray = payload.questions.map((question) => ({
      question_id: question.id,
      response_data: answers[question.id],
      time_spent_seconds: isGroupedWordBankQuiz
        ? groupedAverageSeconds
        : finalTimeMap[question.id] ?? null,
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

      if (isCoreTopicLockError(submitError?.message)) {
        setTopicAccessLocked(true);
        setError(null);
        setStage("error");
        return;
      }

      setError(submitError?.message || "The quiz could not be submitted.");
      setStage("playing");
      return;
    }

    const nextResult = data as SubmitResult;
    removeCheckpoint(subject, level, quizId, payload.attempt_id);
    if (subject === "math") {
      clearMathWorkspaceAttempt(quizId, payload.attempt_id);
      setMathWorkspaceOpen(false);
    }

    setResult(nextResult);
    setStage("results");

    await refreshBalances();
    window.dispatchEvent(new Event("dream-tokens-updated"));
    window.dispatchEvent(new Event("dream-gems-updated"));
    window.dispatchEvent(new Event(`${subject}-missions-progress-updated`));
    window.dispatchEvent(new Event("core-missions-progress-updated"));
  }

  async function resolveCurrentTopicHref() {
    const levelHref = `/learning-missions/core/${subject}/p${level}`;

    if (topicHrefRef.current) return topicHrefRef.current;

    const directSlug = String(payload?.quiz.topic_slug ?? "").trim();
    if (directSlug) {
      const href = `${levelHref}/${directSlug}`;
      topicHrefRef.current = href;
      return href;
    }

    const topicTable = subject === "english" ? "english_topics" : "math_topics";
    const quizTable = subject === "english" ? "english_quizzes" : "math_quizzes";

    // First resolve by the topic metadata already present in the loaded quiz
    // payload. This still works if a staff member has changed quiz visibility
    // while the learner is inside the attempt.
    const topicTitle = String(payload?.quiz.topic_title ?? "").trim();

    if (topicTitle) {
      const { data, error: topicLookupError } = await supabase
        .from(topicTable)
        .select("slug")
        .eq("subject", subject)
        .eq("primary_level", level)
        .eq("title", topicTitle)
        .eq("is_active", true)
        .limit(1);

      if (topicLookupError) {
        console.warn(
          "Could not resolve Core topic route from quiz metadata:",
          topicLookupError.message,
        );
      } else {
        const slug = String(data?.[0]?.slug ?? "").trim();
        if (slug) {
          const href = `${levelHref}/${slug}`;
          topicHrefRef.current = href;
          return href;
        }
      }
    }

    // Fallback: resolve the quiz's topic id first, then its slug. This covers
    // renamed topics and older payloads that do not include topic_slug.
    const payloadTopicId = String(payload?.quiz.topic_id ?? "").trim();
    let topicId = payloadTopicId;

    if (!topicId) {
      const { data: quizRow, error: quizLookupError } = await supabase
        .from(quizTable)
        .select("topic_id")
        .eq("id", quizId)
        .maybeSingle();

      if (quizLookupError) {
        console.warn(
          "Could not resolve Core quiz topic id:",
          quizLookupError.message,
        );
      } else {
        topicId = String(quizRow?.topic_id ?? "").trim();
      }
    }

    if (topicId) {
      const { data: topicRow, error: topicIdLookupError } = await supabase
        .from(topicTable)
        .select("slug")
        .eq("id", topicId)
        .maybeSingle();

      if (topicIdLookupError) {
        console.warn(
          "Could not resolve Core topic slug:",
          topicIdLookupError.message,
        );
      } else {
        const slug = String(topicRow?.slug ?? "").trim();
        if (slug) {
          const href = `${levelHref}/${slug}`;
          topicHrefRef.current = href;
          return href;
        }
      }
    }

    return levelHref;
  }

  async function returnToQuizList() {
    if (payload && (stage === "intro" || stage === "playing")) {
      persistCheckpoint();
    }

    const href = await resolveCurrentTopicHref();
    router.push(href);
  }

  async function replayQuiz() {
    if (payload) {
      removeCheckpoint(subject, level, quizId, payload.attempt_id);
      if (subject === "math") {
        clearMathWorkspaceAttempt(quizId, payload.attempt_id);
      }
    }

    setMathWorkspaceOpen(false);
    quizElapsedBeforeRef.current = 0;
    loadedQuizIdentityRef.current = null;
    setResult(null);
    setExpandedResultId(null);
    await loadQuiz({ force: true });
  }

  async function handleInlineEditorSaved() {
    setEditingQuestionId(null);
    loadedQuizIdentityRef.current = null;
    await loadQuiz({ force: true });
  }

  function renderInlineEditor() {
    if (!canInlineEdit || !editingQuestionId) return null;

    return (
      <InlineCoreQuestionEditor
        subject={subject}
        quizId={quizId}
        questionId={editingQuestionId}
        onClose={() => setEditingQuestionId(null)}
        onSaved={handleInlineEditorSaved}
      />
    );
  }

  if ((status === "checking" && !payload) || stage === "loading") {
    return (
      <main style={pageShell}>
        <CenteredCard message="Preparing Core Mission..." />
      </main>
    );
  }

  if (
    status === "locked" ||
    status === "signed_out" ||
    status === "profile_required"
  ) {
    const accessTitle =
      status === "signed_out"
        ? "Log in to continue"
        : status === "profile_required"
          ? "Learner Profile Required"
          : "Core Missions Locked";

    const accessMessage =
      status === "signed_out"
        ? "Log in with the learner account linked to Core Missions."
        : status === "profile_required"
          ? "Complete the learner profile before continuing with Core Missions."
          : "This account does not currently have Core Missions access.";

    return (
      <main style={pageShell}>
        <div style={lockedCard}>
          <h1 style={{ margin: 0 }}>{accessTitle}</h1>
          <p style={mutedText}>{accessMessage}</p>
          <div style={buttonRow(isMobile)}>
            {status === "signed_out" && (
              <a
                href="/login"
                style={{ ...primaryButton, textDecoration: "none" }}
              >
                Log In
              </a>
            )}
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

  if (topicAccessLocked) {
    return (
      <main style={pageShell}>
        <div
          style={{
            ...lockedCard,
            border: "1px solid rgba(248,113,113,0.52)",
            background:
              "linear-gradient(145deg, rgba(60,10,18,0.92), rgba(5,18,42,0.96))",
            boxShadow: "0 26px 70px rgba(239,68,68,0.14)",
          }}
        >
          <button type="button" onClick={returnToQuizList} style={backButton}>
            ← Quiz List
          </button>

          <div
            style={{
              marginTop: "22px",
              width: "58px",
              height: "58px",
              display: "grid",
              placeItems: "center",
              borderRadius: "18px",
              border: "1px solid rgba(248,113,113,0.42)",
              background: "rgba(239,68,68,0.10)",
              fontSize: "28px",
            }}
          >
            🔒
          </div>

          <p
            style={{
              margin: "18px 0 0",
              color: "#fca5a5",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Topic Locked
          </p>

          <h1 style={{ margin: "8px 0 0" }}>Admin access only</h1>

          <p style={mutedText}>
            This topic is currently locked while its curriculum is being
            reviewed. Only administrators can open or continue its quizzes.
          </p>

          <button
            type="button"
            onClick={returnToQuizList}
            style={primaryButton}
          >
            Back to Topics
          </button>
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
            onClick={() => void loadQuiz({ force: true })}
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
      <main style={sciencePlayingPage}>
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

        <section style={sciencePlayingWrap(isMobile)}>
          <div style={sciencePlayingPanel(isMobile)}>
            <article style={scienceIntroCard(isMobile)}>
              <div style={scienceQuestionBadgeRow}>
                <span style={scienceQuestionTypeBadge}>
                  {SUBJECT_LABELS[subject]} · Primary {level}
                </span>
                <span style={scienceSkillBadge}>{payload.quiz.topic_title}</span>
              </div>

              <h1 style={scienceIntroTitle(isMobile)}>{payload.quiz.title}</h1>
              <p style={scienceIntroDescription}>
                {payload.quiz.description ||
                  `Complete this ${SUBJECT_LABELS[subject]} Core Mission.`}
              </p>

              <div style={scienceIntroStats(isMobile)}>
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
                  Your unfinished attempt was restored. Previously saved
                  responses are still here.
                </div>
              )}

              <p style={termsText}>
                All rewards are subject to terms and conditions.
              </p>
            </article>

            <div style={scienceActionRow(isMobile)}>
              <button
                type="button"
                onClick={returnToQuizList}
                style={{
                  ...sciencePreviousButton,
                  width: isMobile ? "auto" : "auto",
                flex: isMobile ? 1 : undefined,
                }}
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
                style={{
                  ...scienceNextButton,
                  width: isMobile ? "auto" : "auto",
                flex: isMobile ? 1 : undefined,
                }}
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
        onReplay={() => void replayQuiz()}
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

  if (isGroupedWordBankQuiz) {
    return (
      <>
        <GroupedWordBankCloze
          title={payload.quiz.title}
          topicTitle={payload.quiz.topic_title}
          level={level}
          questions={payload.questions}
          answers={answers}
          tokenBalance={tokenBalance}
          gemBalance={dreamGemBalance}
          isMobile={isMobile}
          busy={actionBusy}
          error={error}
          onAnswersChange={(nextAnswers) => {
            setAnswers(nextAnswers);
            setError(null);
          }}
          onSubmit={() => void submitQuiz()}
          onExit={returnToQuizList}
        />

        {canInlineEdit && (
          <button
            type="button"
            onClick={() =>
              setEditingQuestionId(payload.questions[0]?.id ?? null)
            }
            style={floatingStaffEditButton(isMobile)}
          >
            ✎ Edit Cloze
          </button>
        )}

        {renderInlineEditor()}
      </>
    );
  }

  if (isSplitComprehensionQuiz) {
    return (
      <>
        <GroupedComprehension
          title={payload.quiz.title}
          topicTitle={payload.quiz.topic_title}
          level={level}
          questions={payload.questions}
          questionIndex={questionIndex}
          answers={answers}
          feedbackByQuestion={feedbackByQuestion}
          tokenBalance={tokenBalance}
          gemBalance={dreamGemBalance}
          isMobile={isMobile}
          busy={actionBusy}
          error={error}
          onAnswerChange={(questionId, response) => {
            const feedback = feedbackByQuestion[questionId];
            if (feedback?.locked) return;

            setAnswers((current) => ({
              ...current,
              [questionId]: response,
            }));
            setError(null);
          }}
          onQuestionChange={(index) => {
            if (actionBusy) return;
            void moveToQuestion(index);
          }}
          onPrimaryAction={() => void handlePrimaryQuestionAction()}
          onExit={returnToQuizList}
        />

        {canInlineEdit && (
          <button
            type="button"
            onClick={() => setEditingQuestionId(currentQuestion.id)}
            style={floatingStaffEditButton(isMobile)}
          >
            ✎ Edit Question
          </button>
        )}

        {renderInlineEditor()}
      </>
    );
  }

  const isImmediateLocked = Boolean(currentFeedback?.locked);
  const primaryActionLabel =
    payload.quiz.feedback_mode === "immediate" && !isImmediateLocked
      ? "Check Answer"
      : questionIndex >= payload.questions.length - 1
        ? "Submit Quiz"
        : "Next Question";

  const visualMediaCount = getQuestionVisualMediaCount(currentQuestion);

  return (
    <>
      <main style={sciencePlayingPage}>
        <header style={scienceQuizHeader(isMobile)}>
          <button type="button" onClick={returnToQuizList} style={backButton}>
            ← Quiz List
          </button>

          <div style={quizHeaderActions(isMobile)}>
            {mathWorkspaceAvailable && (
              <button
                type="button"
                onClick={() => setWorkspaceOpen(!mathWorkspaceOpen)}
                style={workspaceToggleButton(mathWorkspaceOpen)}
              >
                {mathWorkspaceOpen ? "← Close Workspace" : "✎ Workspace"}
              </button>
            )}

            {canInlineEdit && (
              <button
                type="button"
                onClick={() => setEditingQuestionId(currentQuestion.id)}
                style={staffEditButton}
              >
                ✎ Edit Question
              </button>
            )}

            <BalanceDisplay
              compact
              tokenBalance={tokenBalance}
              gemBalance={dreamGemBalance}
            />
          </div>
        </header>

      <section style={sciencePlayingWrap(isMobile)}>
        <div style={sciencePlayingPanel(isMobile)}>
          <div style={mathWorkspaceLayout(mathWorkspaceOpen, screenMode)}>
            <div style={mathWorkspacePane(mathWorkspaceOpen)}>
              {mathWorkspaceOpen && mathWorkspaceAvailable && (
                <MathWorkingWorkspace
                  key={currentQuestion.id}
                  storageKey={getMathWorkspaceQuestionKey(
                    quizId,
                    payload.attempt_id,
                    currentQuestion.id,
                  )}
                  questionLabel={`Question ${questionIndex + 1}`}
                  onClose={() => setWorkspaceOpen(false)}
                />
              )}
            </div>

            <div
              className={[
                mathWorkspaceOpen ? "core-quiz-workspace-open" : "",
                currentFeedback ? "core-quiz-feedback-visible" : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined}
              style={questionExperience}
            >
          <div style={scienceProgressHeader(isMobile)}>
            <div style={{ minWidth: 0 }}>
              <p style={scienceQuestionEyebrow}>
                Question {questionIndex + 1} of {payload.questions.length}
              </p>
              <p style={scienceQuestionMeta}>
                {isMobile
                  ? `${answeredCount}/${payload.questions.length} answered`
                  : `${payload.quiz.title} · ${answeredCount}/${payload.questions.length} answered`}
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

          <article
            style={scienceQuestionCard(
              isMobile,
              mathWorkspaceOpen,
              Boolean(currentFeedback),
            )}
          >
            <div style={scienceQuestionBadgeRow}>
              <span style={scienceQuestionTypeBadge}>
                {formatCoreQuestionType(currentQuestion.question_type)}
              </span>
              <span style={scienceSkillBadge}>
                {currentQuestion.skill || payload.quiz.topic_title}
              </span>
            </div>

            {currentQuestion.instruction && (
              <p style={scienceInstruction}>
                <FractionText text={currentQuestion.instruction} />
              </p>
            )}

            <h1 style={scienceQuestionPrompt(isMobile, mathWorkspaceOpen)}>
              <FractionText text={currentQuestion.prompt} />
            </h1>

            <div
              className={[
                "core-quiz-media-compact",
                visualMediaCount > 0 ? "core-quiz-media-has-image" : "",
                visualMediaCount > 1 ? "core-quiz-media-multiple-images" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <QuestionMediaRenderer
                stimulus={currentQuestion.stimulus}
                assets={currentQuestion.assets}
              />
            </div>

            <QuestionResponseEditor
              question={currentQuestion}
              response={currentResponse}
              locked={isImmediateLocked || actionBusy}
              screenMode={screenMode}
              workspaceOpen={mathWorkspaceOpen}
              onChange={updateResponse}
            />

            {error && <div style={errorBox}>{error}</div>}
          </article>

          <ImmediateFeedbackCard feedback={currentFeedback} />

          <div style={scienceActionRow(isMobile)}>
            <button
              type="button"
              disabled={actionBusy || questionIndex === 0}
              onClick={() => void moveToQuestion(questionIndex - 1)}
              style={{
                ...sciencePreviousButton,
                opacity: actionBusy || questionIndex === 0 ? 0.35 : 1,
                width: isMobile ? "auto" : "auto",
                flex: isMobile ? 1 : undefined,
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
                opacity:
                  actionBusy ||
                  !responseIsComplete(currentQuestion, currentResponse)
                    ? 0.35
                    : 1,
                width: isMobile ? "auto" : "auto",
                flex: isMobile ? 1 : undefined,
              }}
            >
              {actionBusy ? "Saving..." : primaryActionLabel}
              {!actionBusy && primaryActionLabel === "Next Question" ? " →" : ""}
            </button>
          </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      <CoreQuizResponsiveStyles />
      {renderInlineEditor()}
    </>
  );
}

function CoreQuizResponsiveStyles() {
  return (
    <style jsx global>{`
      .core-quiz-media-compact > div {
        gap: 7px !important;
        margin: 7px 0 10px !important;
      }

      .core-quiz-media-compact section,
      .core-quiz-media-compact figure {
        padding: 7px !important;
        border-radius: 12px !important;
      }

      .core-quiz-media-compact h2 {
        margin: 0 0 6px !important;
        font-size: 14px !important;
      }

      /*
       * Main Core-question imagery is intentionally given a taller frame.
       * Most curriculum diagrams are square-ish rather than panoramic. Use a
       * deliberately tall contain frame so the artwork occupies the large
       * unused vertical area in the quiz card. Answer choices are pushed well
       * below the media instead of crowding immediately underneath it.
       */
      .core-quiz-media-has-image img {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        height: clamp(285px, 39dvh, 365px) !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 auto !important;
        object-fit: contain !important;
        object-position: center !important;
      }

      /* Multiple separate images share the vertical budget. */
      .core-quiz-media-multiple-images img {
        height: clamp(180px, 25dvh, 235px) !important;
      }

      .core-quiz-media-compact video {
        max-height: 190px !important;
      }

      .core-quiz-media-compact audio {
        min-height: 32px !important;
      }

      .core-quiz-media-compact figcaption {
        margin-top: 5px !important;
        font-size: 11px !important;
        line-height: 1.3 !important;
      }

      .core-quiz-media-compact table {
        font-size: 12px !important;
      }

      .core-quiz-media-compact th,
      .core-quiz-media-compact td {
        padding: 6px !important;
      }

      .core-quiz-workspace-open .core-quiz-media-compact > div {
        margin: 5px 0 9px !important;
      }

      .core-quiz-workspace-open .core-quiz-media-compact section,
      .core-quiz-workspace-open .core-quiz-media-compact figure {
        padding: 5px !important;
      }

      /* The Math workspace narrows the question column, but there is still a large
         vertical budget. Keep the main image tall and let the choices sit lower. */
      .core-quiz-workspace-open .core-quiz-media-has-image img {
        height: clamp(275px, 36dvh, 330px) !important;
      }

      .core-quiz-workspace-open .core-quiz-media-multiple-images img {
        height: clamp(165px, 23dvh, 210px) !important;
      }

      .core-quiz-workspace-open .core-quiz-media-compact video {
        max-height: 150px !important;
      }

      /*
       * Once immediate feedback is visible, give that bar guaranteed room by
       * trimming only the media height. The image remains large, while the
       * newly compact 2x2 options and feedback can all stay on-screen.
       */
      @media (min-width: 721px) {
        .core-quiz-feedback-visible .core-quiz-media-has-image img {
          height: clamp(245px, 32dvh, 305px) !important;
        }

        .core-quiz-feedback-visible.core-quiz-workspace-open
          .core-quiz-media-has-image img {
          height: clamp(220px, 29dvh, 275px) !important;
        }

        .core-quiz-feedback-visible .core-quiz-media-multiple-images img {
          height: clamp(145px, 20dvh, 185px) !important;
        }
      }

      /* Never let the compact thumbnail rule shrink the Expand lightbox. */
      .core-quiz-media-compact [role="dialog"] img,
      .core-quiz-workspace-open .core-quiz-media-compact [role="dialog"] img {
        width: auto !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: 84dvh !important;
        object-fit: contain !important;
      }

      .core-quiz-media-compact [role="dialog"] figure {
        padding: 0 !important;
      }

      @media (max-width: 1180px) {
        .core-quiz-media-has-image img {
          height: clamp(240px, 34dvh, 305px) !important;
        }

        .core-quiz-media-multiple-images img {
          height: clamp(155px, 22dvh, 200px) !important;
        }

        .core-quiz-workspace-open .core-quiz-media-has-image img {
          height: clamp(225px, 31dvh, 280px) !important;
        }

        .core-quiz-workspace-open .core-quiz-media-multiple-images img {
          height: clamp(145px, 20dvh, 185px) !important;
        }

        .core-quiz-workspace-open .core-quiz-media-compact video {
          max-height: 125px !important;
        }
      }

      @media (max-width: 720px) {
        .core-quiz-media-has-image img {
          height: clamp(165px, 26dvh, 220px) !important;
        }

        .core-quiz-media-multiple-images img {
          height: clamp(120px, 19dvh, 155px) !important;
        }

        .core-quiz-media-compact video {
          max-height: 135px !important;
        }
      }

      @media (max-height: 720px) {
        .core-quiz-media-has-image img {
          height: clamp(180px, 31dvh, 230px) !important;
        }

        .core-quiz-media-multiple-images img {
          height: clamp(125px, 20dvh, 155px) !important;
        }

        .core-quiz-workspace-open .core-quiz-media-has-image img {
          height: clamp(170px, 28dvh, 215px) !important;
        }

        .core-quiz-media-compact video {
          max-height: 140px !important;
        }
      }

      @media (max-width: 720px) and (max-height: 720px) {
        .core-quiz-media-has-image img {
          height: clamp(145px, 25dvh, 180px) !important;
        }

        .core-quiz-media-multiple-images img {
          height: clamp(105px, 17dvh, 130px) !important;
        }

        .core-quiz-media-compact video {
          max-height: 115px !important;
        }
      }

      @media (min-width: 721px) and (max-height: 720px) {
        .core-quiz-feedback-visible .core-quiz-media-has-image img {
          height: clamp(155px, 25dvh, 195px) !important;
        }

        .core-quiz-feedback-visible.core-quiz-workspace-open
          .core-quiz-media-has-image img {
          height: clamp(145px, 23dvh, 180px) !important;
        }
      }
    `}</style>
  );
}

function QuestionResponseEditor({
  question,
  response,
  locked,
  screenMode,
  workspaceOpen,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  screenMode: ScreenMode;
  workspaceOpen: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const options = asOptions(question.content);
  const hasImageOptions = options.some((option) => Boolean(option.image_url));
  // Four-choice Core questions use a compact 2 × 2 grid on desktop/tablet.
  // This frees enough vertical room for the larger media area plus immediate
  // Correct/Wrong feedback without sacrificing the fixed no-page-scroll shell.
  const twoColumnOptionLayout =
    screenMode !== "mobile" &&
    (options.length === 4 || (hasImageOptions && options.length >= 3));
  const hasMainQuestionImage = getQuestionVisualMediaCount(question) > 0;

  switch (question.question_type) {
    case "multiple_choice":
    case "true_false":
    case "listening_comprehension": {
      const selected = String(response?.option_id ?? "");
      return (
        <div style={optionGrid(twoColumnOptionLayout, hasMainQuestionImage)}>
          {options.map((option, index) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={locked}
                onClick={() => onChange({ option_id: option.id })}
                style={optionButton(active, locked, hasImageOptions)}
              >
                <span style={optionLetter}>{String.fromCharCode(65 + index)}</span>
                <span style={optionContent}>
                  {option.image_url && (
                    <img
                      src={option.image_url}
                      alt={option.image_alt || option.text || `Option ${index + 1}`}
                      style={optionImage(screenMode, workspaceOpen)}
                    />
                  )}
                  {(!option.image_url || option.show_text_with_image) &&
                    option.text && (
                      <span><FractionText text={option.text} /></span>
                    )}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case "multiple_select": {
      const selected = new Set(
        Array.isArray(response?.option_ids)
          ? response?.option_ids.map(String)
          : [],
      );

      return (
        <div style={optionGrid(twoColumnOptionLayout, hasMainQuestionImage)}>
          {options.map((option, index) => {
            const active = selected.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  const next = new Set(selected);
                  if (active) next.delete(option.id);
                  else next.add(option.id);
                  onChange({ option_ids: Array.from(next) });
                }}
                style={optionButton(active, locked, hasImageOptions)}
              >
                <span style={optionLetter}>{String.fromCharCode(65 + index)}</span>
                <span style={optionContent}>
                  {option.image_url && (
                    <img
                      src={option.image_url}
                      alt={option.image_alt || option.text || `Option ${index + 1}`}
                      style={optionImage(screenMode, workspaceOpen)}
                    />
                  )}
                  {(!option.image_url || option.show_text_with_image) &&
                    option.text && (
                      <span><FractionText text={option.text} /></span>
                    )}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case "short_text":
    case "open_cloze":
    case "editing":
    case "picture_description":
      return (
        <input
          value={String(response?.text ?? "")}
          disabled={locked}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Type your answer"
          style={textInput}
        />
      );

    case "long_text":
      return (
        <textarea
          value={String(response?.text ?? "")}
          disabled={locked}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Type your response"
          rows={screenMode === "mobile" ? 4 : 5}
          style={textArea}
        />
      );

    case "sentence_reordering":
      return (
        <SentenceReorderingEditor
          question={question}
          response={response}
          locked={locked}
          onChange={onChange}
        />
      );

    case "matching":
      return (
        <MatchingEditor
          question={question}
          response={response}
          locked={locked}
          onChange={onChange}
        />
      );

    case "word_bank":
    case "dropdown_cloze":
      return (
        <BlankEditor
          question={question}
          response={response}
          locked={locked}
          onChange={onChange}
        />
      );

    case "oral_recording":
      return (
        <div style={noticeBox}>
          This mission expects an uploaded oral recording. The existing recording
          uploader can continue to provide <code>storage_path</code> in the
          response object.
        </div>
      );

    default:
      return null;
  }
}

function SentenceReorderingEditor({
  question,
  response,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const tokens = Array.isArray(question.content.tokens)
    ? question.content.tokens.map((token: any, index: number) => ({
        id: String(token?.id ?? index + 1),
        text: String(token?.text ?? token ?? ""),
      }))
    : [];

  const selectedIds = Array.isArray(response?.token_ids)
    ? response!.token_ids.map(String)
    : [];

  const selectedTokens = selectedIds
    .map((id) => tokens.find((token: any) => token.id === id))
    .filter(Boolean) as Array<{ id: string; text: string }>;
  const remainingTokens = tokens.filter(
    (token: any) => !selectedIds.includes(token.id),
  );

  return (
    <div style={editorStack}>
      <div style={reorderAnswerBox}>
        {selectedTokens.length === 0 ? (
          <span style={placeholderText}>Tap the words in the correct order.</span>
        ) : (
          selectedTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              disabled={locked}
              onClick={() =>
                onChange({
                  token_ids: selectedIds.filter((id) => id !== token.id),
                })
              }
              style={chipButton(true, locked)}
            >
              <FractionText text={token.text} />
            </button>
          ))
        )}
      </div>

      <div style={chipWrap}>
        {remainingTokens.map((token: any) => (
          <button
            key={token.id}
            type="button"
            disabled={locked}
            onClick={() =>
              onChange({ token_ids: [...selectedIds, token.id] })
            }
            style={chipButton(false, locked)}
          >
            <FractionText text={token.text} />
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchingEditor({
  question,
  response,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const left = Array.isArray(question.content.left) ? question.content.left : [];
  const right = Array.isArray(question.content.right)
    ? question.content.right
    : [];
  const matches = (response?.matches ?? {}) as Record<string, string>;

  return (
    <div style={editorStack}>
      {left.map((item: any, index: number) => {
        const id = String(item?.id ?? index + 1);
        return (
          <label key={id} style={matchingRow}>
            <span style={matchingLabel}>
              <FractionText text={String(item?.text ?? item)} />
            </span>
            <select
              value={String(matches[id] ?? "")}
              disabled={locked}
              onChange={(event) =>
                onChange({
                  matches: {
                    ...matches,
                    [id]: event.target.value,
                  },
                })
              }
              style={selectInput}
            >
              <option value="">Choose a match</option>
              {right.map((option: any, rightIndex: number) => (
                <option
                  key={String(option?.id ?? rightIndex + 1)}
                  value={String(option?.id ?? rightIndex + 1)}
                >
                  {String(option?.text ?? option)}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function BlankEditor({
  question,
  response,
  locked,
  onChange,
}: {
  question: QuizQuestion;
  response?: JsonObject;
  locked: boolean;
  onChange: (next: JsonObject) => void;
}) {
  const blankIds = getBlankIds(question.content);
  const values = (response?.values ?? {}) as Record<string, string>;
  const bank = Array.isArray(question.content.word_bank)
    ? question.content.word_bank.map(String)
    : Array.isArray(question.content.options)
      ? question.content.options.map((option: any) =>
          String(option?.text ?? option?.value ?? option),
        )
      : [];

  return (
    <div style={editorStack}>
      {blankIds.map((blankId, index) => (
        <label key={blankId} style={matchingRow}>
          <span style={matchingLabel}>Blank {index + 1}</span>
          {bank.length > 0 ? (
            <select
              value={String(values[blankId] ?? "")}
              disabled={locked}
              onChange={(event) =>
                onChange({
                  values: { ...values, [blankId]: event.target.value },
                })
              }
              style={selectInput}
            >
              <option value="">Choose a word</option>
              {bank.map((word: string) => (
                <option key={word} value={word}>
                  {word}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={String(values[blankId] ?? "")}
              disabled={locked}
              onChange={(event) =>
                onChange({
                  values: { ...values, [blankId]: event.target.value },
                })
              }
              style={textInput}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function ImmediateFeedbackCard({
  feedback,
}: {
  feedback?: ImmediateFeedback;
}) {
  if (!feedback) return null;

  if (feedback.pending_manual_review) {
    return (
      <div style={feedbackCard(null)}>
        <p style={{ margin: 0, fontWeight: 900 }}>Saved for teacher review.</p>
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
          <FractionText text={feedback.explanation} />
        </p>
      )}
      {!feedback.is_correct && feedback.correct_response && (
        <p style={{ margin: "6px 0 0", opacity: 0.82 }}>
          Correct answer: <FractionText text={friendlyCorrectResponse(feedback.correct_response)} />
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
    <main style={scienceQuizPage}>
      <header style={scienceQuizHeader(isMobile)}>
        <button type="button" onClick={onQuizList} style={backButton}>
          ← Quiz List
        </button>
        <BalanceDisplay
          compact
          tokenBalance={result.token_balance}
          gemBalance={result.gem_balance}
        />
      </header>

      <section style={scienceResultsWrap(isMobile)}>
        <div style={scienceQuizPanel(isMobile)}>
          <article style={scienceResultHero(isMobile)}>
            <div style={scienceQuestionBadgeRow}>
              <span style={scienceQuestionTypeBadge}>
                {result.pending_manual_review
                  ? "Submitted for Review"
                  : "Core Mission Complete"}
              </span>
              <span style={scienceSkillBadge}>{payload.quiz.topic_title}</span>
            </div>

            <h1 style={scienceResultTitle(isMobile)}>{payload.quiz.title}</h1>

            <div style={scienceScoreRow(isMobile)}>
              <div style={scienceScoreBlock}>
                <p style={scienceScoreLabel}>Mission score</p>
                <p style={scienceScoreValue(isMobile)}>
                  {Math.round(result.percentage)}%
                </p>
              </div>

              <p style={scienceResultMessage}>
                {result.pending_manual_review
                  ? "Your response was saved. A teacher must review one or more answers before the final score and rewards are confirmed."
                  : result.first_completion
                    ? `First completion saved. You earned ${result.tokens_earned} DT and ${result.gems_earned} DG.`
                    : "Replay saved. Replays do not award additional DT, DG or rover progress."}
              </p>
            </div>

            <div style={resultStats(isMobile)}>
              <ResultStat
                label="Correct"
                value={`${result.correct_count}/${result.total_questions}`}
              />
              <ResultStat
                label="DT Earned"
                value={`+${result.tokens_earned}`}
              />
              <ResultStat label="DG Earned" value={`+${result.gems_earned}`} />
              <ResultStat
                label="DT Balance"
                value={String(result.token_balance)}
              />
            </div>

            <div style={scienceActionRow(isMobile)}>
              <button type="button" onClick={onQuizList} style={sciencePreviousButton}>
                Back to Quiz List
              </button>
              <button type="button" onClick={onReplay} style={ghostButton}>
                Replay Mission
              </button>
              <button type="button" onClick={onRover} style={scienceNextButton}>
                My Rover →
              </button>
            </div>
          </article>

          {payload.quiz.feedback_mode !== "none" &&
            result.question_results.length > 0 && (
              <div style={scienceReviewPanel(isMobile)}>
                <p style={scienceQuestionEyebrow}>Answer review</p>
                <h2 style={scienceReviewTitle}>Review every question</h2>
                <p style={{ ...mutedText, margin: "8px 0 0" }}>
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
                            <span style={reviewPrompt}><FractionText text={item.prompt} /></span>
                          </span>
                          <span>{expanded ? "−" : "+"}</span>
                        </button>

                        {expanded && (
                          <div style={reviewDetails}>
                            <p style={reviewLine}>
                              <strong>Your response:</strong>{" "}
                              <FractionText text={friendlyCorrectResponse(item.response_data)} />
                            </p>
                            {!item.pending_manual_review &&
                              item.correct_response && (
                                <p style={reviewLine}>
                                  <strong>Correct response:</strong>{" "}
                                  <FractionText text={friendlyCorrectResponse(item.correct_response)} />
                                </p>
                              )}
                            {item.explanation && (
                              <p style={reviewLine}>
                                <strong>Explanation:</strong> <FractionText text={item.explanation} />
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
        </div>
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

const scienceQuizPage: CSSProperties = {
  minHeight: "100dvh",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  background:
    "radial-gradient(circle at 18% 10%, rgba(40,190,255,0.10), transparent 34%), #061326",
  padding: "18px",
  boxSizing: "border-box",
};

const sciencePlayingPage: CSSProperties = {
  height: "100dvh",
  minHeight: 0,
  overflow: "hidden",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  background:
    "radial-gradient(circle at 18% 10%, rgba(40,190,255,0.10), transparent 34%), #061326",
  padding: "clamp(8px, 1.4vh, 14px)",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
};

function quizHeaderActions(isMobile: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: isMobile ? "8px" : "10px",
    flexWrap: "wrap",
  };
}

function workspaceToggleButton(open: boolean): CSSProperties {
  return {
    minHeight: "38px",
    borderRadius: "999px",
    border: open
      ? "1px solid rgba(125,211,252,0.58)"
      : "1px solid rgba(125,211,252,0.30)",
    background: open ? "rgba(14,165,233,0.18)" : "rgba(14,165,233,0.08)",
    color: open ? "#d9f7ff" : "#bcefff",
    padding: "0 13px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 900,
    whiteSpace: "nowrap",
    boxShadow: open ? "0 8px 22px rgba(14,165,233,0.12)" : "none",
  };
}

function mathWorkspaceLayout(
  open: boolean,
  screenMode: ScreenMode,
): CSSProperties {
  const openColumns =
    screenMode === "tablet"
      ? "minmax(280px, 40%) minmax(0, 1fr)"
      : "minmax(340px, 42%) minmax(0, 1fr)";

  return {
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: open ? openColumns : "0 minmax(0, 1fr)",
    gap: open ? "8px" : 0,
    overflow: "hidden",
    transition: "grid-template-columns 220ms ease, gap 220ms ease",
  };
}

function mathWorkspacePane(open: boolean): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    opacity: open ? 1 : 0,
    transform: open ? "translateX(0)" : "translateX(-18px)",
    transition: "opacity 180ms ease, transform 220ms ease",
  };
}

const questionExperience: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const staffEditButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(83,215,255,0.12)",
  color: "#c5f7ff",
  padding: "0 13px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap",
  boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
};

function floatingStaffEditButton(isMobile: boolean): CSSProperties {
  return {
    ...staffEditButton,
    position: "fixed",
    top: isMobile ? "70px" : "68px",
    right: "18px",
    zIndex: 80,
    minHeight: "40px",
    background: "rgba(9,28,51,0.96)",
    backdropFilter: "blur(10px)",
  };
}

function scienceQuizHeader(isMobile: boolean): CSSProperties {
  return {
    width: "100%",
    maxWidth: "1540px",
    margin: `0 auto ${isMobile ? "7px" : "9px"}`,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: isMobile ? "6px" : "9px",
    flexWrap: isMobile ? "wrap" : "nowrap",
    flex: "0 0 auto",
  };
}

function scienceQuizWrap(isMobile: boolean): CSSProperties {
  return {
    maxWidth: "1540px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px",
  };
}

function sciencePlayingWrap(isMobile: boolean): CSSProperties {
  return {
    width: "100%",
    maxWidth: "1540px",
    margin: "0 auto",
    flex: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: isMobile ? "6px" : "8px",
  };
}

function scienceResultsWrap(isMobile: boolean): CSSProperties {
  return {
    ...scienceQuizWrap(isMobile),
    maxWidth: "1240px",
  };
}

function scienceQuizPanel(isMobile: boolean): CSSProperties {
  return {
    borderRadius: isMobile ? "22px" : "30px",
    border: "1px solid rgba(126,232,255,0.15)",
    background: "rgba(6,19,38,0.90)",
    boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
    padding: isMobile ? "16px" : "24px",
  };
}

function sciencePlayingPanel(isMobile: boolean): CSSProperties {
  return {
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    borderRadius: isMobile ? "17px" : "22px",
    border: "1px solid rgba(126,232,255,0.15)",
    background: "rgba(6,19,38,0.90)",
    boxShadow: "0 20px 54px rgba(0,0,0,0.24)",
    padding: isMobile ? "10px" : "14px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  };
}

function scienceIntroCard(isMobile: boolean): CSSProperties {
  return {
    borderRadius: isMobile ? "16px" : "20px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    padding: isMobile ? "14px" : "20px",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  };
}

const scienceQuestionBadgeRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
};

const scienceQuestionTypeBadge: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.26)",
  background: "rgba(83,215,255,0.10)",
  color: "#b9f4ff",
  padding: "5px 8px",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

const scienceSkillBadge: CSSProperties = {
  ...scienceQuestionTypeBadge,
  border: "1px solid rgba(216,180,254,0.25)",
  background: "rgba(168,85,247,0.09)",
  color: "#ead6ff",
};

function scienceIntroTitle(isMobile: boolean): CSSProperties {
  return {
    margin: "12px 0 0",
    fontSize: isMobile ? "28px" : "42px",
    lineHeight: 1.03,
    letterSpacing: "-0.04em",
  };
}

const scienceIntroDescription: CSSProperties = {
  margin: "8px 0 0",
  maxWidth: "800px",
  color: "rgba(255,255,255,0.60)",
  fontSize: "15px",
  lineHeight: 1.7,
};

function scienceIntroStats(isMobile: boolean): CSSProperties {
  return {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
    gap: "10px",
  };
}

const introStatCard: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.16)",
  padding: "10px",
};

const noticeBox: CSSProperties = {
  marginTop: "10px",
  borderRadius: "12px",
  border: "1px solid rgba(52,211,153,0.23)",
  background: "rgba(52,211,153,0.08)",
  color: "#c9f8e8",
  padding: "13px 14px",
  fontSize: "13px",
  lineHeight: 1.5,
};

const termsText: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(255,255,255,0.35)",
  fontSize: "11px",
};

function scienceProgressHeader(isMobile: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "center",
    gap: isMobile ? "5px" : "8px",
    flex: "0 0 auto",
  };
}

const scienceQuestionEyebrow: CSSProperties = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const scienceQuestionMeta: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.48)",
  fontSize: "12px",
};

function scienceQuestionNav(isMobile: boolean): CSSProperties {
  return {
    display: "flex",
    gap: isMobile ? "3px" : "4px",
    flexWrap: "wrap",
    justifyContent: isMobile ? "flex-start" : "flex-end",
    alignContent: "flex-start",
    maxHeight: isMobile ? "58px" : "60px",
    overflow: "hidden",
  };
}

function scienceQuestionButton(
  active: boolean,
  complete: boolean,
  checked: boolean,
): CSSProperties {
  return {
    width: "28px",
    height: "28px",
    borderRadius: "9px",
    border: active
      ? "1px solid rgba(126,232,255,0.70)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "rgba(83,215,255,0.18)"
      : checked
        ? "rgba(52,211,153,0.12)"
        : complete
          ? "rgba(255,255,255,0.09)"
          : "rgba(255,255,255,0.035)",
    color: active ? "#c5f7ff" : "white",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "11px",
    padding: 0,
  };
}

const scienceProgressTrack: CSSProperties = {
  marginTop: "7px",
  height: "4px",
  borderRadius: "999px",
  overflow: "hidden",
  background: "rgba(255,255,255,0.07)",
};

const scienceProgressFill: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg,#74ddc4,#77e6f5)",
  transition: "width 180ms ease",
};

function scienceQuestionCard(
  isMobile: boolean,
  workspaceOpen = false,
  feedbackVisible = false,
): CSSProperties {
  return {
    marginTop: isMobile ? "7px" : workspaceOpen ? "6px" : "9px",
    borderRadius: isMobile ? "15px" : "19px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    padding: isMobile ? "10px" : workspaceOpen ? "10px" : "14px",
    flex: 1,
    minHeight: 0,
    overflowX: "hidden",
    // The 2x2 answer layout keeps normal questions fully visible. This is a
    // final safety valve for unusually long prompts/media so content is never
    // clipped behind the fixed-height quiz shell.
    overflowY: "auto",
    boxSizing: "border-box",
    paddingBottom: feedbackVisible ? (isMobile ? "8px" : "10px") : undefined,
  };
}

const scienceInstruction: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(255,255,255,0.45)",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.35,
};

function scienceQuestionPrompt(
  isMobile: boolean,
  workspaceOpen = false,
): CSSProperties {
  return {
    margin: isMobile
      ? "7px 0 8px"
      : workspaceOpen
        ? "6px 0 7px"
        : "8px 0 10px",
    fontSize: isMobile
      ? "clamp(18px, 5vw, 21px)"
      : workspaceOpen
        ? "clamp(18px, 1.8vw, 23px)"
        : "clamp(21px, 2.3vw, 27px)",
    lineHeight: workspaceOpen ? 1.16 : 1.2,
    letterSpacing: "-0.02em",
  };
}

function optionGrid(
  twoColumnLayout: boolean,
  hasMainQuestionImage = false,
): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: twoColumnLayout
      ? "repeat(2, minmax(0, 1fr))"
      : "1fr",
    gap: twoColumnLayout ? "8px 10px" : "7px",
    marginTop: hasMainQuestionImage ? "22px" : "8px",
  };
}

function optionButton(
  active: boolean,
  locked: boolean,
  withImage = false,
): CSSProperties {
  return {
    width: "100%",
    minHeight: withImage ? "0" : "44px",
    display: "flex",
    alignItems: "center",
    gap: withImage ? "7px" : "10px",
    padding: withImage ? "7px 8px" : "8px 10px",
    borderRadius: "13px",
    border: active
      ? "1px solid rgba(126,232,255,0.58)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "rgba(83,215,255,0.13)"
      : "rgba(255,255,255,0.04)",
    color: "white",
    textAlign: "left",
    cursor: locked ? "default" : "pointer",
    opacity: locked && !active ? 0.72 : 1,
  };
}

const optionLetter: CSSProperties = {
  flex: "0 0 auto",
  width: "28px",
  height: "28px",
  display: "grid",
  placeItems: "center",
  borderRadius: "9px",
  background: "rgba(126,232,255,0.10)",
  color: "#bff6ff",
  fontWeight: 950,
};

const optionContent: CSSProperties = {
  minWidth: 0,
  flex: 1,
  display: "grid",
  gap: "5px",
  fontSize: "13px",
  lineHeight: 1.35,
};

function optionImage(
  screenMode: ScreenMode,
  workspaceOpen = false,
): CSSProperties {
  const normalHeight =
    screenMode === "mobile" ? 84 : screenMode === "tablet" ? 104 : 116;
  const workspaceHeight = screenMode === "tablet" ? 78 : 92;
  const height = workspaceOpen ? workspaceHeight : normalHeight;

  return {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    height,
    maxHeight: height,
    objectFit: "contain",
    objectPosition: "center",
    borderRadius: "9px",
    background: "rgba(255,255,255,0.96)",
  };
}

const textInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "44px",
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(0,0,0,0.20)",
  color: "white",
  padding: "0 14px",
  outline: "none",
  fontSize: "15px",
};

const textArea: CSSProperties = {
  ...textInput,
  minHeight: "104px",
  maxHeight: "116px",
  padding: "14px",
  resize: "vertical",
  fontFamily: "inherit",
};

const selectInput: CSSProperties = {
  ...textInput,
  minWidth: "200px",
  cursor: "pointer",
};

const editorStack: CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "8px",
};

const matchingRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(120px,1fr) minmax(180px,1fr)",
  gap: "10px",
  alignItems: "center",
};

const matchingLabel: CSSProperties = {
  color: "rgba(255,255,255,0.74)",
  fontSize: "13px",
  fontWeight: 800,
};

const reorderAnswerBox: CSSProperties = {
  minHeight: "54px",
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
  borderRadius: "16px",
  border: "1px dashed rgba(126,232,255,0.25)",
  background: "rgba(0,0,0,0.12)",
  padding: "8px",
};

const chipWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

function chipButton(selected: boolean, locked: boolean): CSSProperties {
  return {
    minHeight: "34px",
    borderRadius: "12px",
    border: selected
      ? "1px solid rgba(126,232,255,0.42)"
      : "1px solid rgba(255,255,255,0.12)",
    background: selected
      ? "rgba(83,215,255,0.12)"
      : "rgba(255,255,255,0.05)",
    color: "white",
    padding: "0 12px",
    cursor: locked ? "default" : "pointer",
    fontWeight: 800,
  };
}

const placeholderText: CSSProperties = {
  color: "rgba(255,255,255,0.35)",
  fontSize: "13px",
};

function feedbackCard(correct: boolean | null): CSSProperties {
  return {
    marginTop: "8px",
    flex: "0 0 auto",
    maxHeight: "118px",
    overflowY: "auto",
    boxSizing: "border-box",
    borderRadius: "12px",
    border:
      correct === true
        ? "1px solid rgba(52,211,153,0.28)"
        : correct === false
          ? "1px solid rgba(248,113,113,0.28)"
          : "1px solid rgba(251,191,36,0.25)",
    background:
      correct === true
        ? "rgba(52,211,153,0.08)"
        : correct === false
          ? "rgba(239,68,68,0.08)"
          : "rgba(251,191,36,0.08)",
    color:
      correct === true ? "#c8fae8" : correct === false ? "#fecaca" : "#fde7a6",
    padding: "13px",
    fontSize: "13px",
  };
}

const errorBox: CSSProperties = {
  marginTop: "8px",
  borderRadius: "11px",
  border: "1px solid rgba(248,113,113,0.30)",
  background: "rgba(239,68,68,0.10)",
  color: "#fecaca",
  padding: "13px",
  fontSize: "12px",
  lineHeight: 1.5,
};

function scienceActionRow(isMobile: boolean): CSSProperties {
  return {
    marginTop: isMobile ? "7px" : "9px",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: isMobile ? "6px" : "8px",
    flex: "0 0 auto",
  };
}

const sciencePreviousButton: CSSProperties = {
  minHeight: "42px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 18px",
  cursor: "pointer",
  fontWeight: 900,
};

const scienceNextButton: CSSProperties = {
  ...sciencePreviousButton,
  border: "1px solid rgba(126,232,255,0.40)",
  background: "linear-gradient(135deg,#77e6f5,#74ddc4)",
  color: "#061326",
};

const primaryButton: CSSProperties = {
  ...scienceNextButton,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const ghostButton: CSSProperties = {
  ...sciencePreviousButton,
};

const backButton: CSSProperties = {
  minHeight: "40px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 850,
};

function buttonRow(isMobile: boolean): CSSProperties {
  return {
    marginTop: "18px",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: "10px",
  };
}

const mutedText: CSSProperties = {
  color: "rgba(255,255,255,0.58)",
  lineHeight: 1.6,
};

const lockedCard: CSSProperties = {
  width: "min(560px, 100%)",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(5,18,42,0.92)",
  boxShadow: "0 26px 70px rgba(0,0,0,0.35)",
  padding: "28px",
};

const centeredCard: CSSProperties = {
  width: "min(480px,100%)",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(5,18,42,0.88)",
  color: "rgba(255,255,255,0.72)",
  padding: "28px",
  textAlign: "center",
  fontWeight: 850,
};

const balanceRow: CSSProperties = {
  display: "flex",
  gap: "7px",
  justifyContent: "flex-end",
};

const balancePill: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.25)",
  background: "rgba(255,215,106,0.08)",
  padding: "9px 11px",
  fontSize: "11px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const gemPill: CSSProperties = {
  ...balancePill,
  border: "1px solid rgba(210,160,255,0.28)",
  background: "rgba(168,85,247,0.10)",
};

const compactBalancePill: CSSProperties = {
  padding: "8px 10px",
};

function scienceResultHero(isMobile: boolean): CSSProperties {
  return {
    borderRadius: isMobile ? "18px" : "24px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    padding: isMobile ? "20px" : "28px",
  };
}

function scienceResultTitle(isMobile: boolean): CSSProperties {
  return {
    margin: "18px 0 0",
    fontSize: isMobile ? "30px" : "42px",
    letterSpacing: "-0.035em",
  };
}

function scienceScoreRow(isMobile: boolean): CSSProperties {
  return {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "220px minmax(0,1fr)",
    gap: "18px",
    alignItems: "center",
  };
}

const scienceScoreBlock: CSSProperties = {
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(83,215,255,0.07)",
  padding: "18px",
};

const scienceScoreLabel: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.45)",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

function scienceScoreValue(isMobile: boolean): CSSProperties {
  return {
    margin: "7px 0 0",
    color: "#9af4ff",
    fontSize: isMobile ? "44px" : "60px",
    fontWeight: 950,
    lineHeight: 1,
  };
}

const scienceResultMessage: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.64)",
  lineHeight: 1.7,
};

function resultStats(isMobile: boolean): CSSProperties {
  return {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2,minmax(0,1fr))"
      : "repeat(4,minmax(0,1fr))",
    gap: "10px",
  };
}

const resultStatCard: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.14)",
  padding: "14px",
};

const resultStatLabel: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.38)",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
};

const resultStatValue: CSSProperties = {
  margin: "7px 0 0",
  color: "white",
  fontSize: "24px",
  fontWeight: 950,
};

function scienceReviewPanel(isMobile: boolean): CSSProperties {
  return {
    marginTop: "18px",
    borderRadius: isMobile ? "18px" : "24px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.025)",
    padding: isMobile ? "18px" : "24px",
  };
}

const scienceReviewTitle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "24px",
};

const reviewList: CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gap: "9px",
};

const reviewItem: CSSProperties = {
  borderRadius: "15px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.12)",
  overflow: "hidden",
};

const reviewItemButton: CSSProperties = {
  width: "100%",
  border: 0,
  background: "transparent",
  color: "white",
  padding: "13px",
  display: "flex",
  alignItems: "center",
  gap: "11px",
  cursor: "pointer",
};

function reviewStatus(
  correct: boolean | null,
  pending: boolean,
): CSSProperties {
  return {
    flex: "0 0 auto",
    width: "30px",
    height: "30px",
    display: "grid",
    placeItems: "center",
    borderRadius: "10px",
    background: pending
      ? "rgba(251,191,36,0.13)"
      : correct
        ? "rgba(52,211,153,0.13)"
        : "rgba(248,113,113,0.13)",
    color: pending ? "#fde68a" : correct ? "#a7f3d0" : "#fecaca",
    fontWeight: 950,
  };
}

const reviewPrompt: CSSProperties = {
  display: "block",
  marginTop: "4px",
  color: "rgba(255,255,255,0.46)",
  fontSize: "12px",
  lineHeight: 1.45,
};

const reviewDetails: CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.08)",
  padding: "12px 14px 14px",
  background: "rgba(255,255,255,0.025)",
};

const reviewLine: CSSProperties = {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.62)",
  fontSize: "12px",
  lineHeight: 1.55,
};
