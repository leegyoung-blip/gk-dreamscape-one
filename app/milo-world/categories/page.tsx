"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CategoryQuizQuestion = {
  id: string;
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string | null;
  topic?: string | null;
  subtopic?: string | null;
  difficulty?: string | number | null;
  adaptive_difficulty?: number | null;
};

type SinglePlayerAnswerDraft = {
  questionId: string;
  questionOrder: number;
  selectedOption: "A" | "B" | "C" | "D" | null;
  responseSeconds: number;
};

type PercentileResult = {
  available: boolean;
  category: string;
  sample_size: number;
  beats_count: number;
  beats_percent: number | null;
  minimum_sample_size: number;
};

type ReviewAnswer = {
  question: CategoryQuizQuestion;
  draft: SinglePlayerAnswerDraft | null;
  selectedText: string;
  correctText: string;
  isCorrect: boolean;
  points: number;
};

type MasterySubtopic = {
  topic: string;
  subtopic: string;
  mastery_percent: number | null;
  lifetime_accuracy_percent: number | null;
  recent_accuracy_percent: number | null;
  recent_average_difficulty: number | null;
  evidence: number;
  confidence: "learning" | "low" | "medium" | "high";
  status: "strong" | "developing" | "needs_practice" | null;
};

type MasteryTopic = {
  topic: string;
  mastery_percent: number | null;
  evidence: number;
  tested_subtopics: number;
  total_subtopics: number;
};

type MasteryAttempt = {
  id: string;
  completed_at: string;
  accuracy_percent: number;
  points: number;
  score_correct: number;
  question_count: number;
  duration_seconds?: number;
};

type CategoryMastery = {
  category: string;
  mastery_percent: number | null;
  tested_topics: number;
  total_topics: number;
  tested_subtopics: number;
  total_subtopics: number;
  single_quizzes: number;
  multiplayer_quizzes: number;
  lifetime_accuracy_percent: number | null;
  all_mode_accuracy_percent: number | null;
  answers_recorded: number;
  best_points: number | null;
  recent_average_points: number | null;
  recent_three_accuracy: number | null;
  previous_three_accuracy: number | null;
  improvement_pp: number | null;
  trend: "learning" | "improving" | "steady" | "needs_attention";
  topics: MasteryTopic[];
  subtopics: MasterySubtopic[];
  attempt_series: MasteryAttempt[];
  attempt_history: MasteryAttempt[];
};

type SinglePlayStyle = "quick" | "challenge" | "beat_best";

type LearningTarget = {
  available: boolean;
  reason?: "building_profile" | "recent_target_cooldown" | "no_priority_weakness" | "target_not_found" | string;
  id?: string;
  category?: string;
  topic?: string;
  subtopic?: string;
  status?: "active" | "completed" | "superseded";
  baseline_mastery?: number;
  target_accuracy?: number;
  required_questions?: number;
  progress_questions?: number;
  progress_correct?: number;
  progress_accuracy?: number | null;
  total_target_answers?: number;
  reward_tokens?: number;
  reward_gems?: number;
  reward_claimed?: boolean;
  created_at?: string;
  completed_at?: string | null;
  just_completed?: boolean;
  suggested_topic?: string | null;
  suggested_subtopic?: string | null;
  suggested_evidence?: number;
};

type HistoricalAnswer = {
  id: string;
  question_order: number;
  topic: string | null;
  subtopic: string | null;
  adaptive_difficulty: number;
  selected_option: "A" | "B" | "C" | "D" | null;
  correct_option: "A" | "B" | "C" | "D";
  is_correct: boolean;
  points: number;
  response_seconds: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation: string | null;
};

type HistoricalAttemptDetail = {
  attempt: MasteryAttempt;
  answers: HistoricalAnswer[];
};

type CategoriesStage =
  | "mode"
  | "category"
  | "playing"
  | "answered"
  | "finished"
  | "results"
  | "mastery"
  | "mastery-attempt"
  | "multiplayer-menu"
  | "multiplayer-create"
  | "multiplayer-join"
  | "multiplayer-waiting"
  | "multiplayer-playing"
  | "multiplayer-answered"
  | "multiplayer-finished";

type UserAccess = {
  isLoggedIn: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
  canEarnTokens: boolean;
};

type MultiplayerLobby = {
  id: string;
  code: string;
  host_user_id: string;
  category: string;
  question_ids: string[];
  status: "waiting" | "playing" | "finished";
  created_at: string;
  started_at: string | null;
};

type MultiplayerPlayer = {
  id: string;
  lobby_id: string;
  user_id: string;
  display_name: string;
  is_host: boolean;
  score: number;
  points: number;
  answers: MultiplayerAnswer[];
  status: "waiting" | "playing" | "finished";
  joined_at: string;
};

type MultiplayerAnswer = {
  questionId: string;
  answer: "A" | "B" | "C" | "D" | null;
  correct: boolean;
  points: number;
};

const fallbackCategoryNames = ["History", "Geography", "Science"];

const CATEGORY_BACKGROUNDS: Record<string, string> = {
  History: "/milo-world/activities/categories/history-card.webp",
  Geography: "/milo-world/activities/categories/geography-card.webp",
  Science: "/milo-world/activities/categories/science-card.webp",
};

const CATEGORY_TAGLINES: Record<string, string> = {
  History: "Explore people, events and civilisations from the past.",
  Geography: "Explore countries, regions, landforms and our world.",
  Science: "Explore living things, matter, forces, Earth and space.",
};

function generateLobbyCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += characters[Math.floor(Math.random() * characters.length)];
  }

  return code;
}

function getSingaporeWeekKey() {
  const now = new Date();

  const singaporeDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const singaporeDate = new Date(`${singaporeDateString}T00:00:00+08:00`);
  const day = singaporeDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  singaporeDate.setDate(singaporeDate.getDate() + diffToMonday);

  const year = singaporeDate.getFullYear();
  const month = String(singaporeDate.getMonth() + 1).padStart(2, "0");
  const date = String(singaporeDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getWeekStartIso() {
  const weekKey = getSingaporeWeekKey();
  return new Date(`${weekKey}T00:00:00+08:00`).toISOString();
}

function getTokenReward(score: number) {
  if (score >= 9) return 10;
  if (score >= 7) return 7;
  if (score >= 5) return 5;
  return 0;
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function sortQuestionsByIds(
  questions: CategoryQuizQuestion[],
  questionIds: string[]
) {
  const orderMap = new Map(questionIds.map((id, index) => [id, index]));

  return [...questions].sort((a, b) => {
    return (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999);
  });
}

function getOptionText(
  question: CategoryQuizQuestion,
  option: "A" | "B" | "C" | "D" | null,
) {
  if (!option) return "No answer";

  if (option === "A") return question.option_a;
  if (option === "B") return question.option_b;
  if (option === "C") return question.option_c;
  return question.option_d;
}

function getReviewPoints(
  question: CategoryQuizQuestion,
  draft: SinglePlayerAnswerDraft | null,
) {
  if (!draft || draft.selectedOption !== question.correct_option) return 0;
  return Math.max(10, (10 - Math.min(10, draft.responseSeconds)) * 10);
}

function buildMiloQuizSummary(
  questions: CategoryQuizQuestion[],
  answers: SinglePlayerAnswerDraft[],
) {
  const groups = new Map<
    string,
    { answered: number; correct: number; wrong: number }
  >();

  questions.forEach((question, index) => {
    const label = question.subtopic?.trim() || question.topic?.trim();
    if (!label) return;

    const draft = answers.find((item) => item.questionOrder === index + 1);
    if (!draft) return;

    const current = groups.get(label) || { answered: 0, correct: 0, wrong: 0 };
    current.answered += 1;

    if (draft.selectedOption === question.correct_option) {
      current.correct += 1;
    } else {
      current.wrong += 1;
    }

    groups.set(label, current);
  });

  const reliableGroups = [...groups.entries()]
    .filter(([, stats]) => stats.answered >= 2)
    .map(([label, stats]) => ({
      label,
      ...stats,
      accuracy: stats.correct / stats.answered,
    }));

  if (reliableGroups.length === 0) {
    return "Milo is still learning your patterns. As more questions are tagged by topic and you complete more quizzes, your results will show clearer strengths and areas to practise.";
  }

  const strongest = [...reliableGroups].sort(
    (a, b) => b.accuracy - a.accuracy || b.answered - a.answered,
  )[0];
  const weakest = [...reliableGroups].sort(
    (a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy,
  )[0];

  const parts: string[] = [];

  if (strongest && strongest.accuracy >= 0.7) {
    parts.push(`In this quiz, you were strongest on ${strongest.label}.`);
  }

  if (
    weakest &&
    weakest.wrong > 0 &&
    (!strongest || weakest.label !== strongest.label)
  ) {
    parts.push(`Most of your mistakes were in ${weakest.label}.`);
  }

  if (parts.length === 0) {
    return "Milo is building your learning profile. Keep playing so your strongest and weakest areas become clearer.";
  }

  return parts.join(" ");
}

function formatMasteryPercent(value: number | null) {
  return value === null || Number.isNaN(value) ? "—" : `${Math.round(value)}%`;
}

function formatMasteryDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-SG", {
      timeZone: "Asia/Singapore",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getMasteryStatusLabel(status: MasterySubtopic["status"]) {
  if (status === "strong") return "Strong";
  if (status === "developing") return "Developing";
  if (status === "needs_practice") return "Needs Practice";
  return "Learning";
}

function getMasteryStatusClass(status: MasterySubtopic["status"]) {
  if (status === "strong") return "border-green-300/20 bg-green-400/[0.08] text-green-100";
  if (status === "developing") return "border-yellow-200/20 bg-yellow-300/[0.08] text-yellow-100";
  if (status === "needs_practice") return "border-fuchsia-300/20 bg-fuchsia-400/[0.08] text-fuchsia-100";
  return "border-white/10 bg-white/[0.045] text-white/55";
}

function getConfidenceLabel(confidence: MasterySubtopic["confidence"], evidence: number) {
  if (confidence === "learning") return `Learning about you · ${evidence}/5`;
  if (confidence === "low") return "Low confidence";
  if (confidence === "medium") return "Medium confidence";
  return "High confidence";
}

function buildMasteryInsight(data: CategoryMastery | null) {
  if (!data || data.answers_recorded === 0) {
    return "Complete quizzes and Milo will begin building a personal learning map for this category.";
  }

  const tested = data.subtopics.filter(
    (item) => item.evidence >= 5 && item.mastery_percent !== null,
  );

  if (tested.length === 0) {
    const closest = [...data.subtopics]
      .filter((item) => item.evidence > 0)
      .sort((a, b) => b.evidence - a.evidence)[0];

    return closest
      ? `Milo is still learning your ${data.category} profile. ${closest.subtopic} currently has ${closest.evidence}/5 answers needed for a reliable mastery signal.`
      : `Milo is still learning your ${data.category} profile. Keep playing to unlock strengths and areas to practise.`;
  }

  const strongest = [...tested].sort(
    (a, b) => (b.mastery_percent ?? 0) - (a.mastery_percent ?? 0),
  )[0];
  const weakest = [...tested].sort(
    (a, b) => (a.mastery_percent ?? 100) - (b.mastery_percent ?? 100),
  )[0];

  const parts: string[] = [];
  if (strongest?.status === "strong") {
    parts.push(`${strongest.subtopic} is currently one of your strongest areas.`);
  }
  if (weakest && weakest.status === "needs_practice" && weakest.subtopic !== strongest?.subtopic) {
    parts.push(`${weakest.subtopic} is the clearest area to practise next.`);
  }
  if (data.trend === "improving" && data.improvement_pp !== null) {
    parts.push(`Your recent single-player accuracy is up ${Math.abs(data.improvement_pp).toFixed(1)} percentage points.`);
  } else if (data.trend === "needs_attention" && data.improvement_pp !== null) {
    parts.push(`Recent accuracy is ${Math.abs(data.improvement_pp).toFixed(1)} percentage points below your previous three quizzes, so Milo will keep watching the trend.`);
  }

  return parts.length > 0
    ? parts.join(" ")
    : "Your learning map is taking shape. Keep playing to strengthen the confidence behind each mastery score.";
}

function getPlayStyleLabel(style: SinglePlayStyle) {
  if (style === "challenge") return "Milo Challenge";
  if (style === "beat_best") return "Beat My Best";
  return "Quick Play";
}

function getTargetStatusCopy(target: LearningTarget | null) {
  if (!target) return "Milo is checking your learning profile.";

  if (target.available && target.status === "completed") {
    return `Target complete · ${target.subtopic || "Learning area"}`;
  }

  if (target.available) {
    const progress = Math.min(
      target.required_questions || 10,
      target.progress_questions || 0,
    );
    const required = target.required_questions || 10;
    const accuracy = target.progress_accuracy;
    return `${target.subtopic || "Personal target"} · ${progress}/${required}${
      accuracy !== null && accuracy !== undefined ? ` · ${Math.round(accuracy)}%` : ""
    }`;
  }

  if (target.reason === "building_profile") {
    return target.suggested_subtopic
      ? `Discovery: build evidence in ${target.suggested_subtopic}`
      : "Discovery Challenge · build your learning profile";
  }

  if (target.reason === "recent_target_cooldown") {
    return target.suggested_subtopic
      ? `Adaptive practice · ${target.suggested_subtopic}`
      : "Adaptive practice while Milo prepares your next rewarded target";
  }

  return target.suggested_subtopic
    ? `Recommended practice · ${target.suggested_subtopic}`
    : "Adaptive practice based on your learning profile";
}

function getHistoricalOptionText(
  answer: HistoricalAnswer,
  option: "A" | "B" | "C" | "D" | null,
) {
  if (!option) return "No answer";
  if (option === "A") return answer.option_a;
  if (option === "B") return answer.option_b;
  if (option === "C") return answer.option_c;
  return answer.option_d;
}

function MasteryProgressChart({
  attempts,
  metric,
}: {
  attempts: MasteryAttempt[];
  metric: "accuracy" | "points";
}) {
  if (attempts.length < 2) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.025] px-5 text-center text-sm leading-6 text-white/48">
        Complete at least two single-player quizzes to start your progress graph.
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const left = 44;
  const right = 20;
  const top = 18;
  const bottom = 34;
  const values = attempts.map((attempt) =>
    metric === "accuracy" ? Number(attempt.accuracy_percent || 0) : Number(attempt.points || 0),
  );
  const maxValue = metric === "accuracy"
    ? 100
    : Math.max(100, Math.ceil(Math.max(...values, 0) / 100) * 100);
  const minValue = 0;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xFor = (index: number) =>
    attempts.length === 1
      ? left + plotWidth / 2
      : left + (index / (attempts.length - 1)) * plotWidth;
  const yFor = (value: number) =>
    top + plotHeight - ((value - minValue) / Math.max(1, maxValue - minValue)) * plotHeight;
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-[18px] border border-white/10 bg-[#050d1c]/60 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${metric === "accuracy" ? "Accuracy" : "Points"} over recent quizzes`}
      >
        {ticks.map((tick) => {
          const value = minValue + (maxValue - minValue) * tick;
          const y = yFor(value);
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
              <text x={left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.42)" fontSize="11">
                {metric === "accuracy" ? `${Math.round(value)}%` : Math.round(value)}
              </text>
            </g>
          );
        })}
        <polyline
          points={points}
          fill="none"
          stroke="#ffd18a"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.map((value, index) => (
          <g key={attempts[index].id}>
            <circle cx={xFor(index)} cy={yFor(value)} r="5.5" fill="#ffd18a" stroke="#07101f" strokeWidth="3" />
            {(index === 0 || index === values.length - 1) && (
              <text
                x={xFor(index)}
                y={Math.max(13, yFor(value) - 12)}
                textAnchor={index === 0 ? "start" : "end"}
                fill="rgba(255,255,255,0.78)"
                fontSize="11"
                fontWeight="700"
              >
                {metric === "accuracy" ? `${Math.round(value)}%` : Math.round(value)}
              </text>
            )}
          </g>
        ))}
        <text x={left} y={height - 8} fill="rgba(255,255,255,0.36)" fontSize="10">Older</text>
        <text x={width - right} y={height - 8} textAnchor="end" fill="rgba(255,255,255,0.36)" fontSize="10">Latest</text>
      </svg>
    </div>
  );
}

export default function MiloCategoriesPage() {
  const [categoriesStage, setCategoriesStage] =
    useState<CategoriesStage>("mode");

  const [categoryMode, setCategoryMode] = useState<"single" | "multiplayer">(
    "single"
  );

  const [availableCategories, setAvailableCategories] =
    useState<string[]>(fallbackCategoryNames);

  const [selectedCategory, setSelectedCategory] = useState(
    fallbackCategoryNames[0]
  );

  const [categoryQuestions, setCategoryQuestions] = useState<
    CategoryQuizQuestion[]
  >([]);

  const [categoryQuestionIndex, setCategoryQuestionIndex] = useState(0);

  const [selectedCategoryAnswer, setSelectedCategoryAnswer] =
    useState<"A" | "B" | "C" | "D" | null>(null);

  const [categoryScore, setCategoryScore] = useState(0);
  const [categoryPoints, setCategoryPoints] = useState(0);
  const [lastQuestionPoints, setLastQuestionPoints] = useState(0);
  const [singlePlayerAnswers, setSinglePlayerAnswers] = useState<
    SinglePlayerAnswerDraft[]
  >([]);
  const [singlePlayerStartedAt, setSinglePlayerStartedAt] = useState<string | null>(null);
  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
  const [percentileResult, setPercentileResult] =
    useState<PercentileResult | null>(null);
  const [isSavingAnalytics, setIsSavingAnalytics] = useState(false);
  const [analyticsMessage, setAnalyticsMessage] = useState("");
  const [masteryData, setMasteryData] = useState<Record<string, CategoryMastery>>({});
  const [masteryCategory, setMasteryCategory] = useState("Geography");
  const [masteryView, setMasteryView] = useState<"overview" | "knowledge" | "history">("overview");
  const [masteryMetric, setMasteryMetric] = useState<"accuracy" | "points">("accuracy");
  const [isLoadingMastery, setIsLoadingMastery] = useState(false);
  const [masteryMessage, setMasteryMessage] = useState("");
  const [historicalAttemptDetail, setHistoricalAttemptDetail] = useState<HistoricalAttemptDetail | null>(null);
  const [isLoadingHistoricalAttempt, setIsLoadingHistoricalAttempt] = useState(false);
  const [singlePlayStyle, setSinglePlayStyle] = useState<SinglePlayStyle>("quick");
  const [activeQuizPlayStyle, setActiveQuizPlayStyle] = useState<SinglePlayStyle>("quick");
  const [learningTargets, setLearningTargets] = useState<Record<string, LearningTarget>>({});
  const [isLoadingTarget, setIsLoadingTarget] = useState(false);
  const [activeQuizTarget, setActiveQuizTarget] = useState<LearningTarget | null>(null);
  const [targetResultAfterQuiz, setTargetResultAfterQuiz] = useState<LearningTarget | null>(null);
  const [beatBestTargetPoints, setBeatBestTargetPoints] = useState<number | null>(null);
  const [guestHintUsed, setGuestHintUsed] = useState(false);
  const [hiddenCategoryOptions, setHiddenCategoryOptions] = useState<
    ("A" | "B" | "C" | "D")[]
  >([]);

  const [questionCountdown, setQuestionCountdown] = useState(10);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(3);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [isLoadingCategoryQuiz, setIsLoadingCategoryQuiz] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const [userAccess, setUserAccess] = useState<UserAccess>({
    isLoggedIn: false,
    userId: null,
    email: null,
    role: null,
    canEarnTokens: false,
  });

  const [rewardMessage, setRewardMessage] = useState("");
  const [rewardChecked, setRewardChecked] = useState(false);
  const [alreadyRewardedThisWeek, setAlreadyRewardedThisWeek] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);

  const [multiplayerLobby, setMultiplayerLobby] =
    useState<MultiplayerLobby | null>(null);
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<
    MultiplayerPlayer[]
  >([]);
  const [multiplayerPlayer, setMultiplayerPlayer] =
    useState<MultiplayerPlayer | null>(null);
  const [multiplayerQuestions, setMultiplayerQuestions] = useState<
    CategoryQuizQuestion[]
  >([]);
  const [multiplayerQuestionIndex, setMultiplayerQuestionIndex] = useState(0);
  const [multiplayerSelectedAnswer, setMultiplayerSelectedAnswer] =
    useState<"A" | "B" | "C" | "D" | null>(null);
  const [multiplayerScore, setMultiplayerScore] = useState(0);
  const [multiplayerPoints, setMultiplayerPoints] = useState(0);
  const [multiplayerLastQuestionPoints, setMultiplayerLastQuestionPoints] =
    useState(0);
  const [multiplayerCountdown, setMultiplayerCountdown] = useState(10);
  const [multiplayerNextCountdown, setMultiplayerNextCountdown] = useState(3);
  const [multiplayerMessage, setMultiplayerMessage] = useState("");
  const [joinLobbyCode, setJoinLobbyCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [multiplayerAnswerDrafts, setMultiplayerAnswerDrafts] = useState<SinglePlayerAnswerDraft[]>([]);
  const [savedMultiplayerAttemptId, setSavedMultiplayerAttemptId] = useState<string | null>(null);
  const [isSavingMultiplayerAnalytics, setIsSavingMultiplayerAnalytics] = useState(false);

  // Categories is a fixed-screen experience on every device.
  // Lock the document while this page is mounted so browser/body scrolling can
  // never compete with the intentionally scrollable inner result/mastery panes.
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyHeight = body.style.height;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehavior;
    const previousHtmlHeight = html.style.height;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.height = "100%";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    html.style.height = "100%";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.height = previousBodyHeight;
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscroll;
      html.style.height = previousHtmlHeight;
    };
  }, []);

  const currentCategoryQuestion = categoryQuestions[categoryQuestionIndex];
  const currentMultiplayerQuestion =
    multiplayerQuestions[multiplayerQuestionIndex];

  const isMultiplayerHost =
    multiplayerLobby &&
    userAccess.userId &&
    multiplayerLobby.host_user_id === userAccess.userId;

  const sortedMultiplayerPlayers = [...multiplayerPlayers].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.score - a.score;
  });

  useEffect(() => {
    async function loadUserAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserAccess({
          isLoggedIn: false,
          userId: null,
          email: null,
          role: null,
          canEarnTokens: false,
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("Could not load profile role:", profileError.message);
      }

      const role = profile?.role || null;
      const email = user.email || null;

      setDisplayName((current) => {
        if (current.trim()) return current;
        return email?.split("@")[0] || "Player";
      });

      setUserAccess({
        isLoggedIn: true,
        userId: user.id,
        email,
        role,
        canEarnTokens: true,
      });
    }

    loadUserAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAccess();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadCategories() {
      setIsLoadingCategories(true);

      const { data, error } = await supabase
        .from("milo_category_questions")
        .select("category")
        .eq("is_active", true);

      if (error) {
        console.warn("Could not load Milo quiz categories:", error.message);
        setCategoryMessage(
          "Could not load categories from Supabase. Check the milo_category_questions table."
        );
        setIsLoadingCategories(false);
        return;
      }

      const uniqueCategories = Array.from(
        new Set((data || []).map((item) => item.category).filter(Boolean))
      ).sort((a, b) => {
        const aIndex = fallbackCategoryNames.indexOf(a);
        const bIndex = fallbackCategoryNames.indexOf(b);
        const safeA = aIndex === -1 ? 999 : aIndex;
        const safeB = bIndex === -1 ? 999 : bIndex;
        return safeA - safeB || a.localeCompare(b);
      });

      if (uniqueCategories.length > 0) {
        setAvailableCategories(uniqueCategories);
        setSelectedCategory(uniqueCategories[0]);
      } else {
        setCategoryMessage(
          "No active categories found yet. Add active questions in Supabase."
        );
      }

      setIsLoadingCategories(false);
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (!userAccess.userId || isLoadingCategories) {
      if (!userAccess.userId) setMasteryData({});
      return;
    }

    void loadMasteryData();
  }, [userAccess.userId, isLoadingCategories, availableCategories]);

  useEffect(() => {
    if (!userAccess.userId || isLoadingCategories || !selectedCategory) {
      if (!userAccess.userId) setLearningTargets({});
      return;
    }

    void loadLearningTarget(selectedCategory);
  }, [userAccess.userId, isLoadingCategories, selectedCategory]);

  useEffect(() => {
  if (!multiplayerLobby?.id) return;

  const lobbyId = multiplayerLobby.id;

  async function refreshLobby() {
    await loadLobbyState(lobbyId);
  }

  const channel = supabase
    .channel(`milo-category-lobby-${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milo_category_lobbies",
          filter: `id=eq.${lobbyId}`,
        },
        () => {
          refreshLobby();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milo_category_lobby_players",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => {
          refreshLobby();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [multiplayerLobby?.id]);

  useEffect(() => {
    if (!multiplayerLobby) return;

    if (
      multiplayerLobby.status === "playing" &&
      categoriesStage === "multiplayer-waiting"
    ) {
      prepareMultiplayerGame(multiplayerLobby);
    }

    if (
      multiplayerLobby.status === "finished" &&
      categoriesStage !== "multiplayer-finished"
    ) {
      setCategoriesStage("multiplayer-finished");
    }
  }, [multiplayerLobby?.status, categoriesStage]);

  useEffect(() => {
    if (categoriesStage !== "playing") return;
    if (!currentCategoryQuestion) return;

    if (questionCountdown <= 0) {
      submitCategoryAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setQuestionCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [categoriesStage, questionCountdown, currentCategoryQuestion]);

  useEffect(() => {
    if (categoriesStage !== "answered") return;

    if (nextQuestionCountdown <= 0) {
      void goToNextCategoryQuestion();
      return;
    }

    const timer = window.setTimeout(() => {
      setNextQuestionCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [categoriesStage, nextQuestionCountdown]);

  useEffect(() => {
    if (categoriesStage !== "multiplayer-playing") return;
    if (!currentMultiplayerQuestion) return;

    if (multiplayerCountdown <= 0) {
      submitMultiplayerAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setMultiplayerCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    categoriesStage,
    multiplayerCountdown,
    currentMultiplayerQuestion,
  ]);

  useEffect(() => {
    if (categoriesStage !== "multiplayer-answered") return;

    if (multiplayerNextCountdown <= 0) {
      goToNextMultiplayerQuestion();
      return;
    }

    const timer = window.setTimeout(() => {
      setMultiplayerNextCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [categoriesStage, multiplayerNextCountdown]);

  function chooseCategoriesMode(mode: "single" | "multiplayer") {
    setCategoryMode(mode);
    setRewardMessage("");
    setMultiplayerMessage("");

    if (mode === "multiplayer" && !userAccess.isLoggedIn) {
      setCategoryMode("single");
      setCategoryMessage(
        "Single Player is open to guests. Log in to create or join a shared Categories lobby.",
      );
      return;
    }

    setCategoryMessage("");

    if (mode === "multiplayer") {
      setCategoriesStage("multiplayer-menu");
      return;
    }

    setCategoriesStage("category");
  }

  async function enrichQuestionsWithMetadata(
    questions: CategoryQuizQuestion[],
  ) {
    if (questions.length === 0) return questions;

    const { data, error } = await supabase
      .from("milo_category_questions")
      .select("id,topic,subtopic,difficulty,adaptive_difficulty")
      .in(
        "id",
        questions.map((question) => question.id),
      );

    if (error) {
      console.warn("Could not load Categories metadata:", error.message);
      return questions;
    }

    const metadata = new Map(
      (data || []).map((item) => [String(item.id), item]),
    );

    return questions.map((question) => {
      const item = metadata.get(String(question.id));
      return item
        ? {
            ...question,
            topic: item.topic ?? null,
            subtopic: item.subtopic ?? null,
            difficulty: item.difficulty ?? null,
            adaptive_difficulty: item.adaptive_difficulty ?? null,
          }
        : question;
    });
  }

  async function loadLearningTarget(category: string) {
    if (!userAccess.userId) {
      setLearningTargets((current) => {
        const next = { ...current };
        delete next[category];
        return next;
      });
      return null;
    }

    setIsLoadingTarget(true);

    const { data, error } = await supabase.rpc(
      "get_or_create_milo_category_target",
      { p_category: category },
    );

    if (error) {
      console.warn(`Could not load ${category} Milo Target:`, error.message);
      setIsLoadingTarget(false);
      return null;
    }

    const target =
      data && typeof data === "object"
        ? (data as LearningTarget)
        : ({ available: false } as LearningTarget);

    setLearningTargets((current) => ({ ...current, [category]: target }));
    setIsLoadingTarget(false);
    return target;
  }

  async function loadMasteryData(preferredCategory?: string) {
    if (!userAccess.userId) {
      setMasteryData({});
      return;
    }

    const categories = availableCategories.length > 0
      ? availableCategories
      : fallbackCategoryNames;

    setIsLoadingMastery(true);
    setMasteryMessage("");

    const results = await Promise.all(
      categories.map(async (category) => {
        const { data, error } = await supabase.rpc("get_milo_category_mastery", {
          p_category: category,
        });
        return { category, data, error };
      }),
    );

    const next: Record<string, CategoryMastery> = {};
    const errors: string[] = [];

    results.forEach(({ category, data, error }) => {
      if (error) {
        console.warn(`Could not load ${category} mastery:`, error.message);
        errors.push(category);
        return;
      }
      if (data && typeof data === "object") {
        next[category] = data as CategoryMastery;
      }
    });

    setMasteryData(next);
    if (preferredCategory && categories.includes(preferredCategory)) {
      setMasteryCategory(preferredCategory);
    }
    if (errors.length > 0) {
      setMasteryMessage(`Could not load mastery for: ${errors.join(", ")}.`);
    }
    setIsLoadingMastery(false);
  }

  function openMastery(category = selectedCategory) {
    if (!userAccess.isLoggedIn) {
      setCategoryMessage("Log in to build and view your personal mastery profile.");
      return;
    }
    setMasteryCategory(category);
    setMasteryView("overview");
    setHistoricalAttemptDetail(null);
    setCategoriesStage("mastery");
    void loadMasteryData(category);
  }

  async function openHistoricalAttempt(attempt: MasteryAttempt) {
    if (!userAccess.userId) return;

    setIsLoadingHistoricalAttempt(true);
    setMasteryMessage("");

    const { data: answersData, error: answersError } = await supabase
      .from("milo_category_quiz_answers")
      .select(
        "id,question_order,topic,subtopic,adaptive_difficulty,selected_option,correct_option,is_correct,points,response_seconds,question_text,option_a,option_b,option_c,option_d,explanation",
      )
      .eq("attempt_id", attempt.id)
      .order("question_order", { ascending: true });

    if (answersError) {
      console.warn("Could not load historical Categories attempt:", answersError.message);
      setMasteryMessage("That quiz review could not be loaded.");
      setIsLoadingHistoricalAttempt(false);
      return;
    }

    setHistoricalAttemptDetail({
      attempt,
      answers: (answersData || []) as HistoricalAnswer[],
    });
    setCategoriesStage("mastery-attempt");
    setIsLoadingHistoricalAttempt(false);
  }

  async function startSinglePlayerCategoryQuiz() {
    setIsLoadingCategoryQuiz(true);
    setCategoryMessage("");
    setRewardMessage("");
    setRewardChecked(false);
    setAlreadyRewardedThisWeek(false);
    setEarnedTokens(0);
    setTargetResultAfterQuiz(null);

    let resolvedStyle: SinglePlayStyle = singlePlayStyle;
    let targetForQuiz: LearningTarget | null = null;

    if (!userAccess.isLoggedIn && resolvedStyle !== "quick") {
      resolvedStyle = "quick";
      setSinglePlayStyle("quick");
      setCategoryMessage("Guests can use Quick Play. Log in to unlock Milo Challenge and Beat My Best.");
    }

    if (resolvedStyle === "beat_best") {
      const previousBest = masteryData[selectedCategory]?.best_points ?? null;
      if (!previousBest) {
        setCategoryMessage("Complete one logged-in Quick Play quiz before using Beat My Best.");
        setIsLoadingCategoryQuiz(false);
        return;
      }
      setBeatBestTargetPoints(previousBest);
    } else {
      setBeatBestTargetPoints(null);
    }

    let data: unknown = null;
    let loadError: { message: string } | null = null;

    if (resolvedStyle === "quick") {
      const result = await supabase.rpc("get_milo_category_quiz", {
        p_category: selectedCategory,
        p_limit: 10,
      });
      data = result.data;
      loadError = result.error;
    } else {
      if (resolvedStyle === "challenge") {
        const refreshedTarget = await loadLearningTarget(selectedCategory);
        targetForQuiz = refreshedTarget?.available && refreshedTarget.status === "active"
          ? refreshedTarget
          : null;
      }

      const result = await supabase.rpc("get_milo_category_adaptive_quiz", {
        p_category: selectedCategory,
        p_play_style: resolvedStyle,
        p_limit: 10,
        p_target_id:
          resolvedStyle === "challenge" && targetForQuiz?.id
            ? targetForQuiz.id
            : null,
      });
      data = result.data;
      loadError = result.error;
    }

    if (loadError) {
      setCategoryMessage(`Could not load quiz: ${loadError.message}`);
      setIsLoadingCategoryQuiz(false);
      return;
    }

    const rawQuestions = (data || []) as CategoryQuizQuestion[];
    const questions = await enrichQuestionsWithMetadata(rawQuestions);

    if (questions.length < 10) {
      setCategoryMessage(
        `This category needs at least 10 suitable active questions. It currently returned ${questions.length}.`,
      );
      setIsLoadingCategoryQuiz(false);
      return;
    }

    setActiveQuizPlayStyle(resolvedStyle);
    setActiveQuizTarget(targetForQuiz);
    setCategoryQuestions(questions);
    setCategoryQuestionIndex(0);
    setSelectedCategoryAnswer(null);
    setCategoryScore(0);
    setCategoryPoints(0);
    setLastQuestionPoints(0);
    setSinglePlayerAnswers([]);
    setSinglePlayerStartedAt(new Date().toISOString());
    setSavedAttemptId(null);
    setPercentileResult(null);
    setIsSavingAnalytics(false);
    setAnalyticsMessage("");
    setGuestHintUsed(false);
    setHiddenCategoryOptions([]);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoriesStage("playing");
    setIsLoadingCategoryQuiz(false);
  }

  function resetCategoriesQuiz() {
    setCategoriesStage("mode");
    setCategoryQuestions([]);
    setCategoryQuestionIndex(0);
    setSelectedCategoryAnswer(null);
    setCategoryScore(0);
    setCategoryPoints(0);
    setLastQuestionPoints(0);
    setSinglePlayerAnswers([]);
    setSinglePlayerStartedAt(null);
    setSavedAttemptId(null);
    setPercentileResult(null);
    setIsSavingAnalytics(false);
    setAnalyticsMessage("");
    setSinglePlayStyle("quick");
    setActiveQuizPlayStyle("quick");
    setActiveQuizTarget(null);
    setTargetResultAfterQuiz(null);
    setBeatBestTargetPoints(null);
    setGuestHintUsed(false);
    setHiddenCategoryOptions([]);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoryMessage("");
    setRewardMessage("");
    setRewardChecked(false);
    setAlreadyRewardedThisWeek(false);
    setEarnedTokens(0);

    resetMultiplayerState();
  }

  function resetMultiplayerState() {
    setMultiplayerLobby(null);
    setMultiplayerPlayers([]);
    setMultiplayerPlayer(null);
    setMultiplayerQuestions([]);
    setMultiplayerQuestionIndex(0);
    setMultiplayerSelectedAnswer(null);
    setMultiplayerScore(0);
    setMultiplayerPoints(0);
    setMultiplayerLastQuestionPoints(0);
    setMultiplayerCountdown(10);
    setMultiplayerNextCountdown(3);
    setMultiplayerMessage("");
    setJoinLobbyCode("");
    setMultiplayerAnswerDrafts([]);
    setSavedMultiplayerAttemptId(null);
    setIsSavingMultiplayerAnalytics(false);
  }

  function useGuestCategoryHint() {
    if (userAccess.isLoggedIn) return;
    if (guestHintUsed) return;
    if (categoriesStage !== "playing" || !currentCategoryQuestion) return;

    const allOptions = ["A", "B", "C", "D"] as const;
    const incorrectOptions = allOptions.filter(
      (option) => option !== currentCategoryQuestion.correct_option,
    );
    const offset = stableHash(currentCategoryQuestion.id) % incorrectOptions.length;
    const rotated = [
      ...incorrectOptions.slice(offset),
      ...incorrectOptions.slice(0, offset),
    ];

    setHiddenCategoryOptions(rotated.slice(0, 2));
    setGuestHintUsed(true);
    setCategoryMessage(
      "Milo removed two incorrect answers. That was your one free Guest Hint for this quiz.",
    );
  }

  function submitCategoryAnswer(answer: "A" | "B" | "C" | "D" | null) {
    if (!currentCategoryQuestion) return;
    if (categoriesStage !== "playing") return;

    const finalAnswer = answer || selectedCategoryAnswer;
    const isCorrect = finalAnswer === currentCategoryQuestion.correct_option;
    const pointsEarned = isCorrect ? Math.max(10, questionCountdown * 10) : 0;
    const responseSeconds = Math.max(0, Math.min(10, 10 - questionCountdown));

    if (isCorrect) {
      setCategoryScore((score) => score + 1);
      setCategoryPoints((points) => points + pointsEarned);
    }

    setSinglePlayerAnswers((current) => [
      ...current,
      {
        questionId: currentCategoryQuestion.id,
        questionOrder: categoryQuestionIndex + 1,
        selectedOption: finalAnswer,
        responseSeconds,
      },
    ]);

    setLastQuestionPoints(pointsEarned);
    setSelectedCategoryAnswer(finalAnswer);
    setCategoryMessage(
      finalAnswer
        ? isCorrect
          ? `Correct. +${pointsEarned} points.`
          : "Not quite. +0 points."
        : "Time is up. +0 points."
    );

    setNextQuestionCountdown(3);
    setCategoriesStage("answered");
  }

  async function saveSinglePlayerAnalytics(
    answersOverride?: SinglePlayerAnswerDraft[],
  ) {
    const answersToSave = answersOverride ?? singlePlayerAnswers;

    if (!userAccess.userId || answersToSave.length === 0) return null;

    // If this exact quiz has already been saved in the current page session,
    // do not create a second attempt. The Phase 4 QA SQL patch also makes the
    // server recorder idempotent by user/category/mode/started_at.
    if (savedAttemptId) return savedAttemptId;

    setIsSavingAnalytics(true);
    setAnalyticsMessage("");

    const durationSeconds = answersToSave.reduce(
      (sum, answer) => sum + answer.responseSeconds,
      0,
    );

    const { data, error } = await supabase.rpc(
      "record_milo_category_quiz_attempt",
      {
        p_category: selectedCategory,
        p_mode: "single",
        p_lobby_id: null,
        p_started_at: singlePlayerStartedAt,
        p_duration_seconds: durationSeconds,
        p_answers: answersToSave.map((answer) => ({
          question_id: answer.questionId,
          question_order: answer.questionOrder,
          selected_option: answer.selectedOption,
          response_seconds: answer.responseSeconds,
        })),
        p_play_style: activeQuizPlayStyle,
        p_target_id:
          activeQuizPlayStyle === "challenge" && activeQuizTarget?.id
            ? activeQuizTarget.id
            : null,
      },
    );

    if (error) {
      console.warn("Could not save Categories analytics:", error.message);
      setAnalyticsMessage(
        "Your quiz was completed, but the learning record could not be saved.",
      );
      setIsSavingAnalytics(false);
      return null;
    }

    const attemptId = typeof data === "string" ? data : data ? String(data) : "";

    if (!attemptId) {
      setAnalyticsMessage(
        "Your quiz was completed, but the saved attempt could not be identified.",
      );
      setIsSavingAnalytics(false);
      return null;
    }

    setSavedAttemptId(attemptId);

    const { data: percentileData, error: percentileError } = await supabase.rpc(
      "get_milo_category_attempt_percentile",
      { p_attempt_id: attemptId },
    );

    if (percentileError) {
      console.warn(
        "Could not calculate Categories percentile:",
        percentileError.message,
      );
      setAnalyticsMessage(
        "Your learning record was saved, but score comparison is temporarily unavailable.",
      );
    } else if (percentileData && typeof percentileData === "object") {
      setPercentileResult(percentileData as PercentileResult);
    }

    if (activeQuizPlayStyle === "challenge") {
      const refreshedTarget = await loadLearningTarget(selectedCategory);
      if (refreshedTarget) {
        setTargetResultAfterQuiz(refreshedTarget);
        if (refreshedTarget.just_completed) {
          window.dispatchEvent(new Event("dream-tokens-updated"));
          window.dispatchEvent(new Event("dream-gems-updated"));
        }
      }
    }

    await loadMasteryData(selectedCategory);
    setIsSavingAnalytics(false);
    return attemptId;
  }

  async function goToNextCategoryQuestion() {
    const nextIndex = categoryQuestionIndex + 1;

    if (nextIndex >= categoryQuestions.length) {
      // Move to the completion screen immediately, but await analytics before
      // allowing the user to leave/replay. This prevents mobile navigation or
      // a fast tap from interrupting the Challenge record/target update.
      setCategoriesStage("finished");
      await saveSinglePlayerAnalytics([...singlePlayerAnswers]);
      await checkAndAwardWeeklyTokens(categoryScore, categoryPoints);
      return;
    }

    setCategoryQuestionIndex(nextIndex);
    setSelectedCategoryAnswer(null);
    setHiddenCategoryOptions([]);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoryMessage("");
    setLastQuestionPoints(0);
    setCategoriesStage("playing");
  }

  async function checkAndAwardWeeklyTokens(
    finalScore: number,
    finalPoints: number
  ) {
    if (rewardChecked) return;

    setRewardChecked(true);

    const tokenReward = getTokenReward(finalScore);

    if (!userAccess.isLoggedIn || !userAccess.userId) {
      setRewardMessage(
        tokenReward > 0
          ? `Guest score complete. This result would qualify for ${tokenReward} DT. Log in before your next quiz to collect weekly rewards and save them to your account.`
          : "Guest score complete. You need at least 5 correct answers to qualify for a DT reward. Log in before a future run to collect eligible rewards.",
      );
      return;
    }

    if (tokenReward <= 0) {
      setRewardMessage(
        "You need at least 5 correct answers to earn Dreamscape Tokens this week."
      );
      return;
    }

    const weekKey = getSingaporeWeekKey();
    const weekStartIso = getWeekStartIso();
    const rewardTitle = `Milo Categories Weekly Reward · ${selectedCategory} · ${weekKey}`;

    const { data: existingReward, error: existingRewardError } = await supabase
      .from("dream_token_transactions")
      .select("id")
      .eq("user_id", userAccess.userId)
      .eq("token_kind", "virtual")
      .eq("title", rewardTitle)
      .gte("created_at", weekStartIso)
      .maybeSingle();

    if (existingRewardError) {
      console.warn(
        "Could not check weekly reward:",
        existingRewardError.message
      );
      setRewardMessage(
        "Could not check weekly token reward. Please try again later."
      );
      return;
    }

    if (existingReward) {
      setAlreadyRewardedThisWeek(true);
      setRewardMessage(
        "You already earned Dreamscape Tokens for this category this week. You can still replay for a better points score."
      );
      return;
    }

    const { error: insertError } = await supabase
      .from("dream_token_transactions")
      .insert({
        user_id: userAccess.userId,
        amount: tokenReward,
        token_kind: "virtual",
        type: "earn",
        title: rewardTitle,
      });

    if (insertError) {
      console.warn("Could not award weekly tokens:", insertError.message);
      setRewardMessage(
        "Could not award Dreamscape Tokens. Please check Supabase policies."
      );
      return;
    }

    window.dispatchEvent(new Event("dream-tokens-updated"));
    setEarnedTokens(tokenReward);
    setRewardMessage(
      `You earned ${tokenReward} Dreamscape Tokens for scoring ${finalScore}/10 with ${finalPoints} points. This reward can be earned once per week for this category.`
    );
  }

  async function loadLobbyState(lobbyId: string) {
    const { data: lobbyData, error: lobbyError } = await supabase
      .from("milo_category_lobbies")
      .select("*")
      .eq("id", lobbyId)
      .single();

    if (lobbyError) {
      console.warn("Could not load lobby:", lobbyError.message);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("milo_category_lobby_players")
      .select("*")
      .eq("lobby_id", lobbyId)
      .order("points", { ascending: false });

    if (playersError) {
      console.warn("Could not load lobby players:", playersError.message);
      return;
    }

    const lobby = lobbyData as MultiplayerLobby;
    const players = (playersData || []) as MultiplayerPlayer[];

    setMultiplayerLobby(lobby);
    setMultiplayerPlayers(players);

    if (userAccess.userId) {
      const currentPlayer = players.find(
        (player) => player.user_id === userAccess.userId
      );

      if (currentPlayer) {
        setMultiplayerPlayer(currentPlayer);
      }
    }
  }

  async function loadQuestionsByIds(questionIds: string[]) {
    const { data, error } = await supabase
      .from("milo_category_questions")
      .select(
        "id,category,question,option_a,option_b,option_c,option_d,correct_option,explanation,topic,subtopic,difficulty"
      )
      .in("id", questionIds)
      .eq("is_active", true);

    if (error) {
      setMultiplayerMessage(`Could not load questions: ${error.message}`);
      return [];
    }

    return sortQuestionsByIds(
      (data || []) as CategoryQuizQuestion[],
      questionIds
    );
  }

  async function createMultiplayerLobby() {
    setIsCreatingLobby(true);
    setMultiplayerMessage("");

    if (!userAccess.isLoggedIn || !userAccess.userId) {
      setMultiplayerMessage("Please log in before creating a multiplayer lobby.");
      setIsCreatingLobby(false);
      return;
    }

    const cleanName = displayName.trim();

    if (!cleanName) {
      setMultiplayerMessage("Please enter a display name.");
      setIsCreatingLobby(false);
      return;
    }

    const { data: questionsData, error: questionsError } = await supabase.rpc(
      "get_milo_category_quiz",
      {
        p_category: selectedCategory,
        p_limit: 10,
      }
    );

    if (questionsError) {
      setMultiplayerMessage(`Could not load quiz: ${questionsError.message}`);
      setIsCreatingLobby(false);
      return;
    }

    const questions = (questionsData || []) as CategoryQuizQuestion[];

    if (questions.length < 10) {
      setMultiplayerMessage(
        `This category needs at least 10 active questions. It currently has ${questions.length}.`
      );
      setIsCreatingLobby(false);
      return;
    }

    let createdLobby: MultiplayerLobby | null = null;
    let lastError = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const lobbyCode = generateLobbyCode();

      const { data: lobbyData, error: lobbyError } = await supabase
        .from("milo_category_lobbies")
        .insert({
          code: lobbyCode,
          host_user_id: userAccess.userId,
          category: selectedCategory,
          question_ids: questions.map((question) => question.id),
          status: "waiting",
        })
        .select("*")
        .single();

      if (!lobbyError && lobbyData) {
        createdLobby = lobbyData as MultiplayerLobby;
        break;
      }

      lastError = lobbyError?.message || "";
    }

    if (!createdLobby) {
      setMultiplayerMessage(
        lastError || "Could not create lobby. Please try again."
      );
      setIsCreatingLobby(false);
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("milo_category_lobby_players")
      .insert({
        lobby_id: createdLobby.id,
        user_id: userAccess.userId,
        display_name: cleanName,
        is_host: true,
        status: "waiting",
      })
      .select("*")
      .single();

    if (playerError) {
      setMultiplayerMessage(`Lobby created, but player failed: ${playerError.message}`);
      setIsCreatingLobby(false);
      return;
    }

    setMultiplayerLobby(createdLobby);
    setMultiplayerPlayer(playerData as MultiplayerPlayer);
    setMultiplayerPlayers([playerData as MultiplayerPlayer]);
    setMultiplayerQuestions(questions);
    setCategoriesStage("multiplayer-waiting");
    setIsCreatingLobby(false);
  }

  async function joinMultiplayerLobby() {
    setIsJoiningLobby(true);
    setMultiplayerMessage("");

    if (!userAccess.isLoggedIn || !userAccess.userId) {
      setMultiplayerMessage("Please log in before joining a multiplayer lobby.");
      setIsJoiningLobby(false);
      return;
    }

    const cleanCode = joinLobbyCode.trim().toUpperCase();
    const cleanName = displayName.trim();

    if (!cleanCode) {
      setMultiplayerMessage("Please enter a lobby code.");
      setIsJoiningLobby(false);
      return;
    }

    if (!cleanName) {
      setMultiplayerMessage("Please enter a display name.");
      setIsJoiningLobby(false);
      return;
    }

    const { data: lobbyData, error: lobbyError } = await supabase
      .from("milo_category_lobbies")
      .select("*")
      .eq("code", cleanCode)
      .maybeSingle();

    if (lobbyError || !lobbyData) {
      setMultiplayerMessage("Lobby not found. Check the code and try again.");
      setIsJoiningLobby(false);
      return;
    }

    const lobby = lobbyData as MultiplayerLobby;

    if (lobby.status !== "waiting") {
      setMultiplayerMessage(
        "This lobby has already started. Create or join another lobby."
      );
      setIsJoiningLobby(false);
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("milo_category_lobby_players")
      .upsert(
        {
          lobby_id: lobby.id,
          user_id: userAccess.userId,
          display_name: cleanName,
          is_host: lobby.host_user_id === userAccess.userId,
          status: "waiting",
        },
        {
          onConflict: "lobby_id,user_id",
        }
      )
      .select("*")
      .single();

    if (playerError) {
      setMultiplayerMessage(`Could not join lobby: ${playerError.message}`);
      setIsJoiningLobby(false);
      return;
    }

    setMultiplayerLobby(lobby);
    setMultiplayerPlayer(playerData as MultiplayerPlayer);
    await loadLobbyState(lobby.id);
    setCategoriesStage("multiplayer-waiting");
    setIsJoiningLobby(false);
  }

  async function startMultiplayerGame() {
    if (!multiplayerLobby) return;

    if (!isMultiplayerHost) {
      setMultiplayerMessage("Only the host can start the game.");
      return;
    }

    const questions = await loadQuestionsByIds(multiplayerLobby.question_ids);

    if (questions.length < 10) {
      setMultiplayerMessage(
        "This lobby does not have enough active questions to start."
      );
      return;
    }

    const { error: lobbyError } = await supabase
      .from("milo_category_lobbies")
      .update({
        status: "playing",
        started_at: new Date().toISOString(),
      })
      .eq("id", multiplayerLobby.id);

    if (lobbyError) {
      setMultiplayerMessage(`Could not start game: ${lobbyError.message}`);
      return;
    }

    await supabase
      .from("milo_category_lobby_players")
      .update({
        status: "playing",
      })
      .eq("lobby_id", multiplayerLobby.id);

    setMultiplayerQuestions(questions);
    setMultiplayerQuestionIndex(0);
    setMultiplayerSelectedAnswer(null);
    setMultiplayerScore(0);
    setMultiplayerPoints(0);
    setMultiplayerLastQuestionPoints(0);
    setMultiplayerCountdown(10);
    setMultiplayerNextCountdown(3);
    setMultiplayerMessage("");
    setMultiplayerAnswerDrafts([]);
    setSavedMultiplayerAttemptId(null);
    setIsSavingMultiplayerAnalytics(false);
    setCategoriesStage("multiplayer-playing");

    await loadLobbyState(multiplayerLobby.id);
  }

  async function prepareMultiplayerGame(lobby: MultiplayerLobby) {
    const questions = await loadQuestionsByIds(lobby.question_ids);

    if (questions.length < 10) {
      setMultiplayerMessage("Could not load multiplayer questions.");
      return;
    }

    setMultiplayerQuestions(questions);
    setMultiplayerQuestionIndex(0);
    setMultiplayerSelectedAnswer(null);
    setMultiplayerScore(0);
    setMultiplayerPoints(0);
    setMultiplayerLastQuestionPoints(0);
    setMultiplayerCountdown(10);
    setMultiplayerNextCountdown(3);
    setMultiplayerMessage("");
    setMultiplayerAnswerDrafts([]);
    setSavedMultiplayerAttemptId(null);
    setIsSavingMultiplayerAnalytics(false);
    setCategoriesStage("multiplayer-playing");
  }

  async function submitMultiplayerAnswer(
    answer: "A" | "B" | "C" | "D" | null
  ) {
    if (!currentMultiplayerQuestion) return;
    if (categoriesStage !== "multiplayer-playing") return;

    const finalAnswer = answer || multiplayerSelectedAnswer;
    const isCorrect =
      finalAnswer === currentMultiplayerQuestion.correct_option;
    const pointsEarned = isCorrect
      ? Math.max(10, multiplayerCountdown * 10)
      : 0;
    const responseSeconds = Math.max(0, Math.min(10, 10 - multiplayerCountdown));

    setMultiplayerAnswerDrafts((current) => [
      ...current,
      {
        questionId: currentMultiplayerQuestion.id,
        questionOrder: multiplayerQuestionIndex + 1,
        selectedOption: finalAnswer,
        responseSeconds,
      },
    ]);

    const nextScore = multiplayerScore + (isCorrect ? 1 : 0);
    const nextPoints = multiplayerPoints + pointsEarned;

    setMultiplayerScore(nextScore);
    setMultiplayerPoints(nextPoints);
    setMultiplayerLastQuestionPoints(pointsEarned);
    setMultiplayerSelectedAnswer(finalAnswer);
    setMultiplayerMessage(
      finalAnswer
        ? isCorrect
          ? `Correct. +${pointsEarned} points.`
          : "Not quite. +0 points."
        : "Time is up. +0 points."
    );

    if (multiplayerPlayer) {
      const existingAnswers = Array.isArray(multiplayerPlayer.answers)
        ? multiplayerPlayer.answers
        : [];

      const nextAnswers: MultiplayerAnswer[] = [
        ...existingAnswers,
        {
          questionId: currentMultiplayerQuestion.id,
          answer: finalAnswer,
          correct: isCorrect,
          points: pointsEarned,
        },
      ];

      const { error } = await supabase
        .from("milo_category_lobby_players")
        .update({
          score: nextScore,
          points: nextPoints,
          answers: nextAnswers,
        })
        .eq("id", multiplayerPlayer.id);

      if (error) {
        console.warn("Could not save multiplayer answer:", error.message);
      } else {
        setMultiplayerPlayer({
          ...multiplayerPlayer,
          score: nextScore,
          points: nextPoints,
          answers: nextAnswers,
        });

        if (multiplayerLobby) {
          await loadLobbyState(multiplayerLobby.id);
        }
      }
    }

    setMultiplayerNextCountdown(3);
    setCategoriesStage("multiplayer-answered");
  }

  async function saveMultiplayerAnalytics() {
    if (
      !userAccess.userId ||
      !multiplayerLobby ||
      savedMultiplayerAttemptId ||
      isSavingMultiplayerAnalytics ||
      multiplayerAnswerDrafts.length === 0
    ) {
      return null;
    }

    setIsSavingMultiplayerAnalytics(true);

    const durationSeconds = multiplayerAnswerDrafts.reduce(
      (sum, answer) => sum + answer.responseSeconds,
      0,
    );

    const { data, error } = await supabase.rpc("record_milo_category_quiz_attempt", {
      p_category: multiplayerLobby.category,
      p_mode: "multiplayer",
      p_lobby_id: multiplayerLobby.id,
      p_started_at: multiplayerLobby.started_at,
      p_duration_seconds: durationSeconds,
      p_answers: multiplayerAnswerDrafts.map((answer) => ({
        question_id: answer.questionId,
        question_order: answer.questionOrder,
        selected_option: answer.selectedOption,
        response_seconds: answer.responseSeconds,
      })),
    });

    if (error) {
      console.warn("Could not save multiplayer mastery evidence:", error.message);
      setMultiplayerMessage("Game complete. Your multiplayer mastery record could not be saved this time.");
      setIsSavingMultiplayerAnalytics(false);
      return null;
    }

    const attemptId = typeof data === "string" ? data : data ? String(data) : "";
    if (attemptId) setSavedMultiplayerAttemptId(attemptId);
    await loadMasteryData(multiplayerLobby.category);
    setIsSavingMultiplayerAnalytics(false);
    return attemptId || null;
  }

  async function goToNextMultiplayerQuestion() {
    const nextIndex = multiplayerQuestionIndex + 1;

    if (nextIndex >= multiplayerQuestions.length) {
      setCategoriesStage("multiplayer-finished");
      void saveMultiplayerAnalytics();

      if (multiplayerPlayer) {
        await supabase
          .from("milo_category_lobby_players")
          .update({
            status: "finished",
          })
          .eq("id", multiplayerPlayer.id);
      }

      if (multiplayerLobby) {
        await loadLobbyState(multiplayerLobby.id);
      }

      return;
    }

    setMultiplayerQuestionIndex(nextIndex);
    setMultiplayerSelectedAnswer(null);
    setMultiplayerCountdown(10);
    setMultiplayerNextCountdown(3);
    setMultiplayerLastQuestionPoints(0);
    setMultiplayerMessage("");
    setCategoriesStage("multiplayer-playing");
  }

  async function finishLobbyForEveryone() {
    if (!multiplayerLobby || !isMultiplayerHost) return;

    await supabase
      .from("milo_category_lobbies")
      .update({
        status: "finished",
      })
      .eq("id", multiplayerLobby.id);

    await loadLobbyState(multiplayerLobby.id);
  }

  function getCategoryOptionClass(optionLetter: "A" | "B" | "C" | "D") {
    const isSelected = selectedCategoryAnswer === optionLetter;
    const isCorrect = currentCategoryQuestion?.correct_option === optionLetter;
    const showResult = categoriesStage === "answered";

    if (showResult && isCorrect) {
      return "border-green-300/70 bg-green-400/18 text-green-100";
    }

    if (showResult && isSelected && !isCorrect) {
      return "border-red-300/70 bg-red-400/18 text-red-100";
    }

    if (!showResult && isSelected) {
      return "border-[#ffd18a]/70 bg-[#ffd18a]/16 text-white";
    }

    return "border-white/12 bg-white/[0.045] text-white/82 hover:border-[#ffd18a]/35 hover:bg-white/[0.075]";
  }

  function getMultiplayerOptionClass(optionLetter: "A" | "B" | "C" | "D") {
    const isSelected = multiplayerSelectedAnswer === optionLetter;
    const isCorrect =
      currentMultiplayerQuestion?.correct_option === optionLetter;
    const showResult = categoriesStage === "multiplayer-answered";

    if (showResult && isCorrect) {
      return "border-green-300/70 bg-green-400/18 text-green-100";
    }

    if (showResult && isSelected && !isCorrect) {
      return "border-red-300/70 bg-red-400/18 text-red-100";
    }

    if (!showResult && isSelected) {
      return "border-[#ffd18a]/70 bg-[#ffd18a]/16 text-white";
    }

    return "border-white/12 bg-white/[0.045] text-white/82 hover:border-[#ffd18a]/35 hover:bg-white/[0.075]";
  }

  const reviewAnswers: ReviewAnswer[] = categoryQuestions.map(
    (question, index) => {
      const draft =
        singlePlayerAnswers.find(
          (answer) => answer.questionOrder === index + 1,
        ) || null;
      const isCorrect = draft?.selectedOption === question.correct_option;

      return {
        question,
        draft,
        selectedText: getOptionText(question, draft?.selectedOption || null),
        correctText: getOptionText(question, question.correct_option),
        isCorrect,
        points: getReviewPoints(question, draft),
      };
    },
  );

  const miloQuizSummary = buildMiloQuizSummary(
    categoryQuestions,
    singlePlayerAnswers,
  );

  const currentMastery = masteryData[masteryCategory] || null;
  const masteryInsight = buildMasteryInsight(currentMastery);
  const selectedLearningTarget = learningTargets[selectedCategory] || null;
  const masteryLearningTarget = learningTargets[masteryCategory] || null;
  const selectedBestPoints = masteryData[selectedCategory]?.best_points ?? null;

  const isQuizStage = [
    "playing",
    "answered",
    "finished",
    "results",
    "mastery",
    "mastery-attempt",
    "multiplayer-playing",
    "multiplayer-answered",
    "multiplayer-finished",
  ].includes(categoriesStage);

  return (
    <main
      className={`categories-page relative text-white ${
        isQuizStage ? "categories-page--quiz" : ""
      }`}
      style={{
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(2, 8, 23, 0.76),
            rgba(2, 8, 23, 0.9)
          ),
          url('/milo-world/activities/categories-bg.png')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header className="categories-topbar relative z-10 flex shrink-0 items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-5">
        <Link
          href="/milo-world/activity-lab"
          className="categories-back-button inline-flex h-[42px] items-center justify-center rounded-[14px] border border-white/16 bg-[#050d1c]/90 px-[18px] text-sm font-black text-white no-underline shadow-[0_14px_32px_rgba(0,0,0,0.22)] transition hover:bg-white/10"
        >
          <span className="categories-back-full">← Back to Activity Lab</span>
          <span className="categories-back-short">← Activity Lab</span>
        </Link>
      </header>

      <section className="categories-viewport relative z-10 flex min-h-0 flex-1 px-0 pb-9 pt-2 sm:pb-14 sm:pt-5">
        <div className="categories-shell mx-auto flex w-[calc(100%_-_20px)] max-w-[1080px] flex-col overflow-hidden rounded-[22px] border border-white/16 bg-[#030a17]/72 shadow-[0_34px_100px_rgba(0,0,0,0.45)] backdrop-blur-[18px] sm:w-[calc(100%_-_32px)] sm:rounded-[30px]">
          <div className="categories-hero shrink-0 border-b border-white/12 bg-[linear-gradient(145deg,rgba(255,176,83,0.16),rgba(83,215,255,0.08))] px-5 py-6 sm:px-[34px] sm:py-[34px]">
            <div className="categories-hero-heading">
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-[#ffd18a]">
                Milo’s Quiz Lab
              </p>

              <h1 className="categories-title mt-[14px] font-serif text-[46px] font-medium leading-[0.95] text-white sm:text-[clamp(44px,7vw,78px)]">
                Categories
              </h1>
            </div>

            <p className="categories-hero-description mt-[18px] max-w-[740px] text-[15px] leading-[1.6] text-white/76 sm:text-[17px]">
              Pick a category, answer quickly, and climb the scoreboard. Play
              solo or challenge friends in a shared lobby.
            </p>

            <div className="categories-overview-stats mt-6 grid max-w-[760px] gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] border border-white/14 bg-white/[0.08] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Mode
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {categoryMode === "multiplayer" ? "Multiplayer" : "Single"}
                </p>
              </div>

              <div className="rounded-[16px] border border-white/14 bg-white/[0.08] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Points
                </p>
                <p className="mt-1 text-2xl font-black text-white">
                  {categoryMode === "multiplayer"
                    ? multiplayerPoints
                    : categoryPoints}
                </p>
              </div>

              <div className="rounded-[16px] border border-[#ffd18a]/24 bg-[#ffd18a]/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Timer
                </p>
                <p className="mt-1 text-sm font-black text-[#ffd18a]">
                  10 seconds/question
                </p>
              </div>
            </div>
          </div>

          <div className="categories-content min-h-0 flex-1 p-5 sm:p-[34px]">
            <section className="categories-stage-card h-full min-h-0 rounded-[24px] border border-white/14 bg-white/[0.08] p-5 sm:p-6">
              {categoriesStage === "mode" && (
                <div className="stage-fill flex h-full min-h-0 flex-col">
                  <p className="stage-kicker text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                    Choose Mode
                  </p>

                  <div className="mode-grid mt-6 grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => chooseCategoriesMode("single")}
                      className="mode-card min-h-[180px] rounded-[24px] border border-white/14 bg-[#050d1c]/85 p-6 text-left transition hover:scale-[1.02] hover:border-[#ffd18a]/45"
                    >
                      <span className="mode-title text-2xl font-bold">
                        Single Player
                      </span>
                      <span className="mode-description mt-3 block text-sm leading-6 text-white/58">
                        Start a 10-question timed quiz. Faster correct answers earn
                        more points.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => chooseCategoriesMode("multiplayer")}
                      className="mode-card min-h-[180px] rounded-[24px] border border-[#ffd18a]/24 bg-[#ffd18a]/10 p-6 text-left transition hover:scale-[1.02] hover:border-[#ffd18a]/45"
                    >
                      <span className="mode-title text-2xl font-bold">
                        Multiplayer
                      </span>
                      <span className="mode-description mt-3 block text-sm leading-6 text-white/58">
                        {userAccess.isLoggedIn
                          ? "Create or join a lobby and play the same 10 questions against others."
                          : "Shared lobbies use your player account. Log in to create or join multiplayer."}
                      </span>
                    </button>
                  </div>

                  <div className="reward-rules mt-6 rounded-[24px] border border-yellow-200/18 bg-yellow-300/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd18a]">
                      Reward Rules
                    </p>

                    <div className="reward-rules-grid mt-3 grid gap-2 text-sm leading-6 text-white/66">
                      <p>• Correct answer points: remaining seconds × 10.</p>
                      <p>• Single-player DT rewards are once per week per category.</p>
                      <p>• Guests get one free 50:50 hint but cannot collect DT.</p>
                      <p>• Multiplayer requires login and uses the same points system.</p>
                    </div>
                  </div>
                </div>
              )}

              {categoriesStage === "category" && (
                <div className="stage-fill flex h-full min-h-0 flex-col">
                  <button
                    type="button"
                    onClick={() => setCategoriesStage("mode")}
                    className="stage-back self-start text-sm font-bold text-[#ffd18a]"
                  >
                    ← Back to mode select
                  </button>

                  <div className="stage-header mt-7 flex shrink-0 items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                        Choose Topic
                      </p>
                      <p className="stage-subtitle mt-2 text-sm leading-6 text-white/52">
                        Pick a category for your 10-question timed quiz.
                      </p>
                    </div>
                    {userAccess.isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => openMastery(selectedCategory)}
                        className="shrink-0 rounded-full border border-[#9bf5ff]/24 bg-[#9bf5ff]/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#9bf5ff] transition hover:bg-[#9bf5ff]/[0.12]"
                      >
                        My Mastery
                      </button>
                    )}
                  </div>

                  <div className="category-grid mt-5 grid min-h-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {availableCategories.map((category, index) => {
                      const isSelected = selectedCategory === category;

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          disabled={isLoadingCategories}
                          className={`category-card group relative min-h-[128px] overflow-hidden rounded-[24px] border p-0 text-left transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-50 ${
                            isSelected
                              ? "border-[#ffd18a]/70 shadow-[0_0_34px_rgba(229,183,94,0.18)]"
                              : "border-white/14 hover:border-[#ffd18a]/45"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.035]"
                            style={{
                              backgroundImage: `url('${
                                CATEGORY_BACKGROUNDS[category] ||
                                "/milo-world/activities/categories-bg.png"
                              }')`,
                            }}
                          />
                          <span
                            aria-hidden="true"
                            className={`absolute inset-0 ${
                              isSelected
                                ? "bg-[linear-gradient(180deg,rgba(3,10,24,0.18),rgba(3,10,24,0.82))]"
                                : "bg-[linear-gradient(180deg,rgba(3,10,24,0.34),rgba(3,10,24,0.9))]"
                            }`}
                          />

                          <span className="relative z-10 flex h-full min-h-[128px] flex-col justify-end p-5">
                            <span className="category-index text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                              Category {index + 1}
                            </span>

                            <span className="category-name mt-2 block text-2xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.72)]">
                              {category}
                            </span>

                            <span className="category-description mt-2 block max-w-[31rem] text-sm leading-5 text-white/72">
                              {CATEGORY_TAGLINES[category] ||
                                "10 timed questions. Answer quickly to earn more points."}
                            </span>

                            {userAccess.isLoggedIn && (
                              <span className="mt-2 block text-[11px] font-black text-[#9bf5ff] drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                                {masteryData[category]?.mastery_percent !== null && masteryData[category]?.mastery_percent !== undefined
                                  ? `${Math.round(masteryData[category].mastery_percent as number)}% Mastery${masteryData[category].trend === "improving" ? " · ↑ Improving" : ""}`
                                  : masteryData[category]?.single_quizzes
                                    ? `Learning your profile · ${masteryData[category].single_quizzes} quiz${masteryData[category].single_quizzes === 1 ? "" : "zes"}`
                                    : "Start your first quiz"}
                              </span>
                            )}

                            {isSelected && (
                              <span className="selected-pill mt-3 inline-flex w-fit rounded-full border border-[#ffd18a]/45 bg-[#07101f]/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#ffd18a] backdrop-blur-sm">
                                Selected
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="adaptive-mode-grid mt-3 grid shrink-0 grid-cols-3 gap-2">
                    {([
                      { key: "quick" as const, title: "Quick Play", icon: "⚡" },
                      { key: "challenge" as const, title: "Milo Challenge", icon: "◎" },
                      { key: "beat_best" as const, title: "Beat My Best", icon: "↗" },
                    ]).map((mode) => {
                      const locked =
                        !userAccess.isLoggedIn && mode.key !== "quick"
                          ? true
                          : mode.key === "beat_best" && !selectedBestPoints;
                      const selected = singlePlayStyle === mode.key;

                      return (
                        <button
                          key={mode.key}
                          type="button"
                          disabled={locked}
                          onClick={() => setSinglePlayStyle(mode.key)}
                          className={`adaptive-mode-card rounded-[14px] border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                            selected
                              ? "border-[#ffd18a]/55 bg-[#ffd18a]/12 shadow-[0_0_22px_rgba(229,183,94,0.10)]"
                              : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="adaptive-mode-heading flex items-center gap-2">
                            <span className="text-base">{mode.icon}</span>
                            <span className="adaptive-mode-title text-[11px] font-black text-white">{mode.title}</span>
                          </span>
                          <span className="adaptive-mode-description mt-1 block text-[9px] leading-4 text-white/46">
                            {mode.key === "quick"
                              ? "Balanced category mix."
                              : mode.key === "challenge"
                                ? userAccess.isLoggedIn
                                  ? getTargetStatusCopy(selectedLearningTarget)
                                  : "Log in to personalize."
                                : selectedBestPoints
                                  ? `Current best: ${selectedBestPoints} pts`
                                  : userAccess.isLoggedIn
                                    ? "Unlock after your first quiz."
                                    : "Log in to unlock."}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={startSinglePlayerCategoryQuiz}
                    disabled={isLoadingCategoryQuiz || isLoadingCategories}
                    className="primary-action mt-3 w-full shrink-0 rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                  >
                    {isLoadingCategoryQuiz
                      ? "Building Your Quiz..."
                      : `Start ${getPlayStyleLabel(singlePlayStyle)}`}
                  </button>
                </div>
              )}

              {categoriesStage === "multiplayer-menu" && (
                <div className="stage-fill flex h-full min-h-0 flex-col">
                  <button
                    type="button"
                    onClick={resetCategoriesQuiz}
                    className="stage-back self-start text-sm font-bold text-[#ffd18a]"
                  >
                    ← Back to mode select
                  </button>

                  <p className="stage-kicker mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                    Multiplayer Lobby
                  </p>

                  <div className="mode-grid mt-6 grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCategoriesStage("multiplayer-create")}
                      className="mode-card min-h-[180px] rounded-[24px] border border-white/14 bg-[#050d1c]/85 p-6 text-left transition hover:scale-[1.02] hover:border-[#ffd18a]/45"
                    >
                      <span className="mode-title text-2xl font-bold">
                        Create Lobby
                      </span>
                      <span className="mode-description mt-3 block text-sm leading-6 text-white/58">
                        Choose a category and generate a lobby code for friends.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategoriesStage("multiplayer-join")}
                      className="mode-card min-h-[180px] rounded-[24px] border border-[#ffd18a]/24 bg-[#ffd18a]/10 p-6 text-left transition hover:scale-[1.02] hover:border-[#ffd18a]/45"
                    >
                      <span className="mode-title text-2xl font-bold">
                        Join Lobby
                      </span>
                      <span className="mode-description mt-3 block text-sm leading-6 text-white/58">
                        Enter a lobby code and play the same question set.
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {categoriesStage === "multiplayer-create" && (
                <div className="form-stage stage-fill flex h-full min-h-0 flex-col">
                  <button
                    type="button"
                    onClick={() => setCategoriesStage("multiplayer-menu")}
                    className="stage-back self-start text-sm font-bold text-[#ffd18a]"
                  >
                    ← Back to multiplayer
                  </button>

                  <div className="form-grid mt-7 grid min-h-0 flex-1 content-center gap-5">
                    <label className="grid gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                        Display Name
                      </span>

                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Player name"
                        className="form-control h-12 rounded-[14px] border border-white/14 bg-[#050d1c] px-4 text-white outline-none placeholder:text-white/30"
                      />
                    </label>

                    <label className="grid gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                        Choose Topic
                      </span>

                      <select
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                        className="form-control h-12 rounded-[14px] border border-white/14 bg-[#050d1c] px-4 text-white outline-none"
                      >
                        {availableCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={createMultiplayerLobby}
                      disabled={isCreatingLobby || isLoadingCategories}
                      className="primary-action w-full rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                    >
                      {isCreatingLobby ? "Creating Lobby..." : "Create Lobby"}
                    </button>
                  </div>
                </div>
              )}

              {categoriesStage === "multiplayer-join" && (
                <div className="form-stage stage-fill flex h-full min-h-0 flex-col">
                  <button
                    type="button"
                    onClick={() => setCategoriesStage("multiplayer-menu")}
                    className="stage-back self-start text-sm font-bold text-[#ffd18a]"
                  >
                    ← Back to multiplayer
                  </button>

                  <div className="form-grid mt-7 grid min-h-0 flex-1 content-center gap-5">
                    <label className="grid gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                        Display Name
                      </span>

                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Player name"
                        className="form-control h-12 rounded-[14px] border border-white/14 bg-[#050d1c] px-4 text-white outline-none placeholder:text-white/30"
                      />
                    </label>

                    <label className="grid gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                        Lobby Code
                      </span>

                      <input
                        value={joinLobbyCode}
                        onChange={(event) =>
                          setJoinLobbyCode(event.target.value.toUpperCase())
                        }
                        placeholder="ABC123"
                        maxLength={6}
                        className="form-control h-12 rounded-[14px] border border-white/14 bg-[#050d1c] px-4 text-center text-2xl font-black uppercase tracking-[0.2em] text-white outline-none placeholder:text-white/30"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={joinMultiplayerLobby}
                      disabled={isJoiningLobby}
                      className="primary-action w-full rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                    >
                      {isJoiningLobby ? "Joining Lobby..." : "Join Lobby"}
                    </button>
                  </div>
                </div>
              )}

              {categoriesStage === "multiplayer-waiting" && multiplayerLobby && (
                <div className="waiting-stage stage-fill flex h-full min-h-0 flex-col">
                  <button
                    type="button"
                    onClick={resetCategoriesQuiz}
                    className="stage-back self-start text-sm font-bold text-[#ffd18a]"
                  >
                    ← Leave lobby
                  </button>

                  <div className="waiting-grid mt-5 grid min-h-0 flex-1 gap-4">
                    <div className="lobby-code-card rounded-[24px] border border-white/14 bg-[#050d1c]/85 p-6 text-center">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                        Lobby Code
                      </p>

                      <h2 className="lobby-code mt-4 text-5xl font-black tracking-[0.16em]">
                        {multiplayerLobby.code}
                      </h2>

                      <p className="mt-4 text-sm text-white/58">
                        Category: {multiplayerLobby.category}
                      </p>
                    </div>

                    <div className="players-card min-h-0 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                        Players
                      </p>

                      <div className="players-list mt-4 grid min-h-0 gap-3 overflow-y-auto overscroll-contain">
                        {multiplayerPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between rounded-[14px] border border-white/12 bg-white/[0.045] px-4 py-3"
                          >
                            <span className="font-bold">{player.display_name}</span>
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#ffd18a]">
                              {player.is_host ? "Host" : "Player"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isMultiplayerHost ? (
                    <button
                      type="button"
                      onClick={startMultiplayerGame}
                      className="primary-action mt-5 w-full shrink-0 rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01]"
                    >
                      Start Game
                    </button>
                  ) : (
                    <p className="waiting-message mt-5 shrink-0 rounded-[24px] border border-[#ffd18a]/24 bg-[#ffd18a]/10 p-5 text-sm font-bold text-[#ffd18a]">
                      Waiting for the host to start the game.
                    </p>
                  )}
                </div>
              )}

              {(categoriesStage === "playing" || categoriesStage === "answered") &&
                currentCategoryQuestion && (
                  <div className="quiz-screen flex h-full min-h-0 flex-col">
                    <div className="quiz-statusbar flex shrink-0 items-center justify-between gap-2">
                      <span className="quiz-pill rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ffd18a]">
                        {selectedCategory}
                      </span>

                      <span className="quiz-pill quiz-style-pill rounded-full border border-[#9bf5ff]/16 bg-[#9bf5ff]/[0.055] px-4 py-2 text-xs font-bold text-[#9bf5ff]">
                        {getPlayStyleLabel(activeQuizPlayStyle)}
                      </span>

                      <span className="quiz-pill rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/72">
                        Question {categoryQuestionIndex + 1} / 10
                      </span>

                      <span className="quiz-pill rounded-full border border-[#ffd18a]/24 bg-[#ffd18a]/10 px-4 py-2 text-xs font-bold text-[#ffd18a]">
                        {categoriesStage === "answered"
                          ? `Next in ${nextQuestionCountdown}s`
                          : `${questionCountdown}s`}
                      </span>
                    </div>

                    <div className="quiz-score-strip mt-3 grid shrink-0 grid-cols-3 gap-3">
                      <div className="quiz-stat rounded-[14px] border border-white/12 bg-white/[0.045] p-4">
                        <p className="quiz-stat-label text-xs uppercase tracking-[0.18em] text-white/40">
                          Score
                        </p>
                        <p className="quiz-stat-value mt-1 text-xl font-bold">
                          {categoryScore}/10
                        </p>
                      </div>

                      <div className="quiz-stat rounded-[14px] border border-white/12 bg-white/[0.045] p-4">
                        <p className="quiz-stat-label text-xs uppercase tracking-[0.18em] text-white/40">
                          Points
                        </p>
                        <p className="quiz-stat-value mt-1 text-xl font-bold">
                          {categoryPoints}
                        </p>
                      </div>

                      <div className="quiz-stat rounded-[14px] border border-yellow-200/14 bg-yellow-300/10 p-4">
                        <p className="quiz-stat-label text-xs uppercase tracking-[0.18em] text-white/40">
                          Last
                        </p>
                        <p className="quiz-stat-value mt-1 text-xl font-bold text-[#ffd18a]">
                          +{lastQuestionPoints}
                        </p>
                      </div>
                    </div>

                    <div className="quiz-play-layout mt-4 grid min-h-0 flex-1 gap-4">
                      <div className="quiz-question-panel min-h-0 rounded-[20px] border border-white/12 bg-[#050d1c]/58 p-5">
                        <div className="quiz-question-scroll min-h-0">
                          <p className="quiz-question-label text-xs font-black uppercase tracking-[0.18em] text-[#ffd18a]">
                            Question
                          </p>
                          <h2 className="quiz-question mt-3 font-bold leading-snug text-white">
                            {currentCategoryQuestion.question}
                          </h2>

                          {!userAccess.isLoggedIn && (
                            <button
                              type="button"
                              onClick={useGuestCategoryHint}
                              disabled={guestHintUsed || categoriesStage === "answered"}
                              className="quiz-hint mt-5 min-h-[44px] w-full rounded-[14px] border border-[#ffd18a]/28 bg-[#ffd18a]/10 px-4 py-2.5 text-sm font-black text-[#ffd18a] transition hover:bg-[#ffd18a]/16 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {guestHintUsed
                                ? "Guest Hint Used"
                                : "Guest Hint · Remove 2 Answers"}
                            </button>
                          )}

                          {categoryMessage && (
                            <div className="quiz-feedback mt-4 text-sm font-bold leading-5 text-[#ffd18a]">
                              <p>{categoryMessage}</p>
                              {categoriesStage === "answered" &&
                                currentCategoryQuestion.explanation && (
                                  <p className="mt-2 font-normal text-white/56">
                                    {currentCategoryQuestion.explanation}
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="quiz-options-panel grid min-h-0 gap-3">
                        {[
                          ["A", currentCategoryQuestion.option_a],
                          ["B", currentCategoryQuestion.option_b],
                          ["C", currentCategoryQuestion.option_c],
                          ["D", currentCategoryQuestion.option_d],
                        ].map(([letter, answer]) => {
                          const typedLetter = letter as "A" | "B" | "C" | "D";
                          const isEliminated = hiddenCategoryOptions.includes(typedLetter);

                          return (
                            <button
                              key={letter}
                              type="button"
                              disabled={categoriesStage === "answered" || isEliminated}
                              onClick={() => submitCategoryAnswer(typedLetter)}
                              className={`quiz-option min-h-0 rounded-[14px] border px-5 py-3 text-left text-sm font-bold transition ${getCategoryOptionClass(
                                typedLetter
                              )} ${
                                isEliminated
                                  ? "cursor-not-allowed opacity-30 line-through"
                                  : ""
                              }`}
                            >
                              <span className="quiz-option-letter mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-black">
                                {letter}
                              </span>
                              <span className="quiz-option-text">{answer}</span>
                              {isEliminated && (
                                <span className="ml-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#ffd18a]">
                                  Eliminated
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              {(categoriesStage === "multiplayer-playing" ||
                categoriesStage === "multiplayer-answered") &&
                currentMultiplayerQuestion && (
                  <div className="quiz-screen flex h-full min-h-0 flex-col">
                    <div className="quiz-statusbar flex shrink-0 items-center justify-between gap-2">
                      <span className="quiz-pill rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ffd18a]">
                        {multiplayerLobby?.category}
                      </span>

                      <span className="quiz-pill rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/72">
                        Question {multiplayerQuestionIndex + 1} / 10
                      </span>

                      <span className="quiz-pill rounded-full border border-[#ffd18a]/24 bg-[#ffd18a]/10 px-4 py-2 text-xs font-bold text-[#ffd18a]">
                        {categoriesStage === "multiplayer-answered"
                          ? `Next in ${multiplayerNextCountdown}s`
                          : `${multiplayerCountdown}s`}
                      </span>
                    </div>

                    <div className="quiz-score-strip mt-3 grid shrink-0 grid-cols-3 gap-3">
                      <div className="quiz-stat rounded-[14px] border border-white/12 bg-white/[0.045] p-4">
                        <p className="quiz-stat-label text-xs uppercase tracking-[0.18em] text-white/40">
                          Score
                        </p>
                        <p className="quiz-stat-value mt-1 text-xl font-bold">
                          {multiplayerScore}/10
                        </p>
                      </div>

                      <div className="quiz-stat rounded-[14px] border border-white/12 bg-white/[0.045] p-4">
                        <p className="quiz-stat-label text-xs uppercase tracking-[0.18em] text-white/40">
                          Points
                        </p>
                        <p className="quiz-stat-value mt-1 text-xl font-bold">
                          {multiplayerPoints}
                        </p>
                      </div>

                      <div className="quiz-stat rounded-[14px] border border-yellow-200/14 bg-yellow-300/10 p-4">
                        <p className="quiz-stat-label text-xs uppercase tracking-[0.18em] text-white/40">
                          Last
                        </p>
                        <p className="quiz-stat-value mt-1 text-xl font-bold text-[#ffd18a]">
                          +{multiplayerLastQuestionPoints}
                        </p>
                      </div>
                    </div>

                    <div className="quiz-play-layout mt-4 grid min-h-0 flex-1 gap-4">
                      <div className="quiz-question-panel min-h-0 rounded-[20px] border border-white/12 bg-[#050d1c]/58 p-5">
                        <div className="quiz-question-scroll min-h-0">
                          <p className="quiz-question-label text-xs font-black uppercase tracking-[0.18em] text-[#ffd18a]">
                            Question
                          </p>
                          <h2 className="quiz-question mt-3 font-bold leading-snug text-white">
                            {currentMultiplayerQuestion.question}
                          </h2>

                          {multiplayerMessage && (
                            <div className="quiz-feedback mt-4 text-sm font-bold leading-5 text-[#ffd18a]">
                              <p>{multiplayerMessage}</p>
                              {categoriesStage === "multiplayer-answered" &&
                                currentMultiplayerQuestion.explanation && (
                                  <p className="mt-2 font-normal text-white/56">
                                    {currentMultiplayerQuestion.explanation}
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="quiz-options-panel grid min-h-0 gap-3">
                        {[
                          ["A", currentMultiplayerQuestion.option_a],
                          ["B", currentMultiplayerQuestion.option_b],
                          ["C", currentMultiplayerQuestion.option_c],
                          ["D", currentMultiplayerQuestion.option_d],
                        ].map(([letter, answer]) => (
                          <button
                            key={letter}
                            type="button"
                            disabled={categoriesStage === "multiplayer-answered"}
                            onClick={() =>
                              submitMultiplayerAnswer(
                                letter as "A" | "B" | "C" | "D"
                              )
                            }
                            className={`quiz-option min-h-0 rounded-[14px] border px-5 py-3 text-left text-sm font-bold transition ${getMultiplayerOptionClass(
                              letter as "A" | "B" | "C" | "D"
                            )}`}
                          >
                            <span className="quiz-option-letter mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-black">
                              {letter}
                            </span>
                            <span className="quiz-option-text">{answer}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {categoriesStage === "finished" && (
                <div className="finished-stage stage-fill flex h-full min-h-0 flex-col text-center">
                  <div className="finished-scroll min-h-0 flex-1 overflow-y-auto">
                    <p className="stage-kicker text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                      Quiz Complete
                    </p>

                    <div className="phase2-summary-grid mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[18px] border border-white/12 bg-white/[0.045] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                          Correct
                        </p>
                        <p className="mt-2 text-4xl font-black text-white">
                          {categoryScore}/10
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-[#ffd18a]/24 bg-[#ffd18a]/10 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                          Score
                        </p>
                        <p className="mt-2 text-4xl font-black text-[#ffd18a]">
                          {categoryPoints}
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/48">points</p>
                      </div>

                      <div className="rounded-[18px] border border-cyan-200/18 bg-cyan-300/[0.07] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
                          Score Comparison
                        </p>
                        {userAccess.isLoggedIn ? (
                          isSavingAnalytics ? (
                            <p className="mt-3 text-sm font-bold text-[#9bf5ff]">
                              Comparing your score…
                            </p>
                          ) : percentileResult?.available &&
                            percentileResult.beats_percent !== null ? (
                            <p className="mt-2 text-sm font-black leading-5 text-[#9bf5ff]">
                              Well done! You scored higher than {percentileResult.beats_percent}% of {selectedCategory} attempts.
                            </p>
                          ) : percentileResult ? (
                            <p className="mt-2 text-xs font-bold leading-5 text-white/58">
                              Score comparison unlocks after {percentileResult.minimum_sample_size} other {selectedCategory} attempts. {percentileResult.sample_size}/{percentileResult.minimum_sample_size} recorded.
                            </p>
                          ) : (
                            <p className="mt-2 text-xs font-bold leading-5 text-white/58">
                              {analyticsMessage || "Saving your learning result…"}
                            </p>
                          )
                        ) : (
                          <p className="mt-2 text-xs font-bold leading-5 text-white/58">
                            Log in before your next quiz to save progress and compare your score.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="milo-summary-card mt-3 rounded-[18px] border border-[#9bf5ff]/16 bg-[#9bf5ff]/[0.055] p-4 text-left">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9bf5ff]">
                        Milo Noticed
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white/72">
                        {miloQuizSummary}
                      </p>
                    </div>

                    {activeQuizPlayStyle === "challenge" && (activeQuizTarget || targetResultAfterQuiz) && (
                      <div className={`target-result-card mt-3 rounded-[18px] border p-4 text-left ${
                        targetResultAfterQuiz?.just_completed
                          ? "border-green-300/24 bg-green-400/[0.08]"
                          : "border-fuchsia-300/18 bg-fuchsia-400/[0.06]"
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-fuchsia-200">Milo Target</p>
                            <p className="mt-1 text-sm font-black text-white">
                              {(targetResultAfterQuiz || activeQuizTarget)?.subtopic || "Discovery Challenge"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-white/58">
                              {targetResultAfterQuiz?.just_completed
                                ? `Target complete at ${Math.round(targetResultAfterQuiz.progress_accuracy || 0)}% accuracy.`
                                : targetResultAfterQuiz?.available
                                  ? `${targetResultAfterQuiz.progress_questions || 0}/${targetResultAfterQuiz.required_questions || 10} target answers · ${targetResultAfterQuiz.progress_accuracy === null || targetResultAfterQuiz.progress_accuracy === undefined ? "building accuracy" : `${Math.round(targetResultAfterQuiz.progress_accuracy)}% accuracy`} · goal ${targetResultAfterQuiz.target_accuracy}%`
                                  : "Milo used this challenge to learn which area should become your next personalized target."}
                            </p>
                          </div>
                          {targetResultAfterQuiz?.just_completed && (
                            <div className="shrink-0 text-right">
                              <p className="text-lg font-black text-green-200">+{targetResultAfterQuiz.reward_tokens || 0} DT</p>
                              <p className="text-xs font-black text-fuchsia-200">+{targetResultAfterQuiz.reward_gems || 0} DG</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeQuizPlayStyle === "beat_best" && beatBestTargetPoints !== null && (
                      <div className="target-result-card mt-3 rounded-[18px] border border-cyan-200/18 bg-cyan-300/[0.06] p-4 text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9bf5ff]">Beat My Best</p>
                        <p className="mt-1 text-sm font-black text-white">
                          {categoryPoints > beatBestTargetPoints
                            ? `New personal best! ${categoryPoints} points`
                            : `${categoryPoints} points · personal best ${beatBestTargetPoints}`}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/52">
                          {categoryPoints > beatBestTargetPoints
                            ? `You improved your best by ${categoryPoints - beatBestTargetPoints} points.`
                            : `${Math.max(0, beatBestTargetPoints - categoryPoints)} points to beat your current record.`}
                        </p>
                      </div>
                    )}

                    <div className="reward-card mt-3 rounded-[18px] border border-yellow-200/18 bg-yellow-300/10 p-4 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffd18a]">
                            Dreamscape Token Reward
                          </p>
                          <p className="mt-2 text-xs leading-5 text-white/68">
                            {rewardMessage || "Checking weekly reward eligibility…"}
                          </p>
                        </div>
                        {earnedTokens > 0 && (
                          <p className="shrink-0 text-2xl font-extrabold text-[#ffd18a]">
                            +{earnedTokens} DT
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="finished-actions mt-3 grid shrink-0 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setCategoriesStage("results")}
                      disabled={isSavingAnalytics}
                      className="primary-action disabled:cursor-wait disabled:opacity-50 rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01]"
                    >
                      See Results
                    </button>

                    <button
                      type="button"
                      onClick={startSinglePlayerCategoryQuiz}
                      disabled={isLoadingCategoryQuiz || isSavingAnalytics}
                      className="secondary-action rounded-[14px] border border-white/14 bg-white/[0.055] px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-white/[0.09] disabled:opacity-50"
                    >
                      {isLoadingCategoryQuiz ? "Loading…" : "Play Again"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetCategoriesQuiz();
                        setCategoriesStage("category");
                      }}
                      disabled={isSavingAnalytics}
                      className="secondary-action disabled:cursor-wait disabled:opacity-50 rounded-[14px] border border-white/14 bg-white/[0.055] px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-white/[0.09]"
                    >
                      Choose Topic
                    </button>
                  </div>
                </div>
              )}

              {categoriesStage === "results" && (
                <div className="results-stage stage-fill flex h-full min-h-0 flex-col">
                  <div className="results-header shrink-0">
                    <button
                      type="button"
                      onClick={() => setCategoriesStage("finished")}
                      className="stage-back text-sm font-bold text-[#ffd18a]"
                    >
                      ← Back to summary
                    </button>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="stage-kicker text-xs font-bold uppercase tracking-[0.18em] text-[#ffd18a]">
                          {selectedCategory}
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                          Your 10 Answers
                        </h2>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-black text-[#ffd18a]">
                          {categoryPoints}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                          points
                        </p>
                      </div>
                    </div>

                    <div className="milo-summary-card mt-3 rounded-[16px] border border-[#9bf5ff]/16 bg-[#9bf5ff]/[0.055] px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9bf5ff]">
                        Milo Noticed
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/68">
                        {miloQuizSummary}
                      </p>
                    </div>
                  </div>

                  <div className="results-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid gap-3">
                      {reviewAnswers.map((item, index) => (
                        <article
                          key={item.question.id}
                          className={`result-card rounded-[18px] border p-4 ${
                            item.isCorrect
                              ? "border-green-300/18 bg-green-400/[0.055]"
                              : "border-red-300/20 bg-red-400/[0.055]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/38">
                                  Question {index + 1}
                                </span>
                                {(item.question.subtopic || item.question.topic) && (
                                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-bold text-white/48">
                                    {item.question.subtopic || item.question.topic}
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-2 text-sm font-black leading-5 text-white sm:text-base">
                                {item.question.question}
                              </h3>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className={`text-xs font-black ${item.isCorrect ? "text-green-200" : "text-red-200"}`}>
                                {item.isCorrect ? "Correct" : "Review"}
                              </p>
                              <p className="mt-1 text-xs font-black text-[#ffd18a]">
                                +{item.points}
                              </p>
                            </div>
                          </div>

                          <div className="result-answer-grid mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-[12px] border border-white/10 bg-black/15 p-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/36">
                                Your answer
                              </p>
                              <p className={`mt-1 text-xs font-bold leading-5 ${item.isCorrect ? "text-green-100" : "text-red-100"}`}>
                                {item.draft?.selectedOption
                                  ? `${item.draft.selectedOption}. ${item.selectedText}`
                                  : "No answer"}
                              </p>
                            </div>

                            <div className="rounded-[12px] border border-green-300/14 bg-green-400/[0.045] p-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/36">
                                Correct answer
                              </p>
                              <p className="mt-1 text-xs font-bold leading-5 text-green-100">
                                {item.question.correct_option}. {item.correctText}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 rounded-[12px] border border-white/8 bg-white/[0.025] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9bf5ff]">
                              Explanation
                            </p>
                            <p className="mt-1 text-xs leading-5 text-white/62">
                              {item.question.explanation ||
                                "No explanation has been added to this question yet."}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {categoriesStage === "mastery" && (
                <div className="stage-fill flex h-full min-h-0 flex-col">
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setCategoriesStage("category")}
                      className="stage-back text-sm font-bold text-[#ffd18a]"
                    >
                      ← Back to Categories
                    </button>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="stage-kicker text-xs font-bold uppercase tracking-[0.18em] text-[#9bf5ff]">
                          Personalized Learning
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                          My Mastery
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void loadMasteryData(masteryCategory);
                          void loadLearningTarget(masteryCategory);
                        }}
                        disabled={isLoadingMastery}
                        className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-white/62 disabled:opacity-40"
                      >
                        {isLoadingMastery ? "Updating…" : "Refresh"}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {availableCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setMasteryCategory(category);
                            setMasteryView("overview");
                            void loadLearningTarget(category);
                          }}
                          className={`rounded-[12px] border px-2 py-2 text-[10px] font-black uppercase tracking-[0.08em] transition ${
                            masteryCategory === category
                              ? "border-[#ffd18a]/45 bg-[#ffd18a]/12 text-[#ffd18a]"
                              : "border-white/10 bg-white/[0.035] text-white/55"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["overview", "knowledge", "history"] as const).map((view) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => setMasteryView(view)}
                          className={`rounded-[11px] px-2 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition ${
                            masteryView === view
                              ? "bg-white/[0.10] text-white"
                              : "text-white/38 hover:bg-white/[0.05]"
                          }`}
                        >
                          {view === "overview" ? "Overview" : view === "knowledge" ? "Knowledge Map" : "History"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mastery-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    {masteryMessage && (
                      <p className="mb-3 rounded-[14px] border border-yellow-200/16 bg-yellow-300/[0.08] p-3 text-xs font-bold leading-5 text-[#ffd18a]">
                        {masteryMessage}
                      </p>
                    )}

                    {isLoadingMastery && !currentMastery ? (
                      <div className="flex min-h-[240px] items-center justify-center text-sm font-bold text-white/48">
                        Building your mastery profile…
                      </div>
                    ) : !currentMastery ? (
                      <div className="flex min-h-[240px] items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.025] p-6 text-center text-sm leading-6 text-white/50">
                        No mastery data is available yet. Complete a logged-in quiz to start your profile.
                      </div>
                    ) : masteryView === "overview" ? (
                      <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-[16px] border border-[#ffd18a]/20 bg-[#ffd18a]/[0.08] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/40">Mastery</p>
                            <p className="mt-1 text-3xl font-black text-[#ffd18a]">{formatMasteryPercent(currentMastery.mastery_percent)}</p>
                            <p className="mt-1 text-[10px] text-white/38">{currentMastery.tested_subtopics}/{currentMastery.total_subtopics} areas tested</p>
                          </div>
                          <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/40">Accuracy</p>
                            <p className="mt-1 text-2xl font-black text-white">{formatMasteryPercent(currentMastery.lifetime_accuracy_percent)}</p>
                            <p className="mt-1 text-[10px] text-white/38">Single player</p>
                          </div>
                          <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/40">Best</p>
                            <p className="mt-1 text-2xl font-black text-white">{currentMastery.best_points ?? "—"}</p>
                            <p className="mt-1 text-[10px] text-white/38">points</p>
                          </div>
                          <div className="rounded-[16px] border border-[#9bf5ff]/16 bg-[#9bf5ff]/[0.055] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/40">Improvement</p>
                            <p className={`mt-1 text-2xl font-black ${currentMastery.trend === "improving" ? "text-green-200" : currentMastery.trend === "needs_attention" ? "text-fuchsia-200" : "text-[#9bf5ff]"}`}>
                              {currentMastery.improvement_pp === null
                                ? "Learning"
                                : `${currentMastery.improvement_pp >= 0 ? "+" : ""}${currentMastery.improvement_pp.toFixed(1)}pp`}
                            </p>
                            <p className="mt-1 text-[10px] text-white/38">Recent 3 vs previous 3</p>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-[#9bf5ff]/16 bg-[#9bf5ff]/[0.05] p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9bf5ff]">Milo Noticed</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">{masteryInsight}</p>
                        </div>

                        <div className="rounded-[18px] border border-fuchsia-300/16 bg-fuchsia-400/[0.05] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-fuchsia-200">Current Milo Target</p>
                              <p className="mt-1 text-sm font-black text-white">
                                {masteryLearningTarget?.available
                                  ? masteryLearningTarget.subtopic
                                  : "Adaptive discovery"}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-white/52">
                                {getTargetStatusCopy(masteryLearningTarget)}
                              </p>
                            </div>
                            {masteryLearningTarget?.available && (
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-black text-[#ffd18a]">Goal {masteryLearningTarget.target_accuracy}%</p>
                                <p className="mt-1 text-[9px] font-bold text-white/40">+{masteryLearningTarget.reward_tokens || 0} DT · +{masteryLearningTarget.reward_gems || 0} DG</p>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(masteryCategory);
                              setSinglePlayStyle("challenge");
                              setCategoriesStage("category");
                            }}
                            className="mt-3 w-full rounded-[12px] border border-fuchsia-200/18 bg-fuchsia-300/[0.08] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-fuchsia-100 transition hover:bg-fuchsia-300/[0.13]"
                          >
                            Start Milo Challenge
                          </button>
                        </div>

                        <div className="rounded-[18px] border border-white/10 bg-white/[0.025] p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/45">Progress Over Time</p>
                              <p className="mt-1 text-xs text-white/38">Single-player quizzes only</p>
                            </div>
                            <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
                              {(["accuracy", "points"] as const).map((metric) => (
                                <button
                                  key={metric}
                                  type="button"
                                  onClick={() => setMasteryMetric(metric)}
                                  className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] ${masteryMetric === metric ? "bg-[#ffd18a]/16 text-[#ffd18a]" : "text-white/38"}`}
                                >
                                  {metric}
                                </button>
                              ))}
                            </div>
                          </div>
                          <MasteryProgressChart attempts={currentMastery.attempt_series} metric={masteryMetric} />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {currentMastery.topics.map((topic) => (
                            <div key={topic.topic} className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-black text-white">{topic.topic}</p>
                                <p className="text-sm font-black text-[#ffd18a]">{formatMasteryPercent(topic.mastery_percent)}</p>
                              </div>
                              <p className="mt-1 text-[10px] text-white/38">{topic.tested_subtopics}/{topic.total_subtopics} areas tested</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : masteryView === "knowledge" ? (
                      <div className="grid gap-3">
                        {currentMastery.topics.map((topic) => {
                          const subtopics = currentMastery.subtopics.filter((item) => item.topic === topic.topic);
                          return (
                            <section key={topic.topic} className="rounded-[18px] border border-white/10 bg-white/[0.025] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-sm font-black text-white">{topic.topic}</h3>
                                  <p className="mt-1 text-[10px] text-white/38">{topic.tested_subtopics}/{topic.total_subtopics} areas with enough evidence</p>
                                </div>
                                <p className="text-xl font-black text-[#ffd18a]">{formatMasteryPercent(topic.mastery_percent)}</p>
                              </div>

                              <div className="mt-3 grid gap-2">
                                {subtopics.map((subtopic) => (
                                  <div key={`${subtopic.topic}-${subtopic.subtopic}`} className={`rounded-[14px] border p-3 ${getMasteryStatusClass(subtopic.status)}`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-xs font-black text-white">{subtopic.subtopic}</p>
                                        <p className="mt-1 text-[9px] font-bold text-white/42">{getConfidenceLabel(subtopic.confidence, subtopic.evidence)} · Difficulty {subtopic.recent_average_difficulty?.toFixed(1) ?? "—"}</p>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        <p className="text-base font-black">{formatMasteryPercent(subtopic.mastery_percent)}</p>
                                        <p className="text-[8px] font-black uppercase tracking-[0.08em] opacity-70">{getMasteryStatusLabel(subtopic.status)}</p>
                                      </div>
                                    </div>
                                    {subtopic.evidence > 0 && (
                                      <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] text-white/45">
                                        <span>Lifetime accuracy {formatMasteryPercent(subtopic.lifetime_accuracy_percent)}</span>
                                        <span className="text-right">Recent {formatMasteryPercent(subtopic.recent_accuracy_percent)}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {currentMastery.attempt_history.length === 0 ? (
                          <div className="rounded-[18px] border border-white/10 bg-white/[0.025] p-6 text-center text-sm text-white/48">
                            No saved single-player quiz history yet.
                          </div>
                        ) : (
                          currentMastery.attempt_history.map((attempt, index) => (
                            <button
                              key={attempt.id}
                              type="button"
                              onClick={() => void openHistoricalAttempt(attempt)}
                              disabled={isLoadingHistoricalAttempt}
                              className="flex items-center justify-between gap-3 rounded-[15px] border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-[#ffd18a]/30 hover:bg-white/[0.06] disabled:opacity-50"
                            >
                              <div>
                                <p className="text-xs font-black text-white">{formatMasteryDate(attempt.completed_at)}</p>
                                <p className="mt-1 text-[10px] text-white/40">Quiz {currentMastery.single_quizzes - index}</p>
                              </div>
                              <div className="flex items-center gap-5 text-right">
                                <div>
                                  <p className="text-sm font-black text-white">{attempt.score_correct}/{attempt.question_count}</p>
                                  <p className="text-[9px] text-white/36">{Math.round(attempt.accuracy_percent)}%</p>
                                </div>
                                <div>
                                  <p className="text-base font-black text-[#ffd18a]">{attempt.points}</p>
                                  <p className="text-[9px] text-white/36">points</p>
                                </div>
                                <span className="text-[#9bf5ff]">→</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {categoriesStage === "mastery-attempt" && historicalAttemptDetail && (
                <div className="stage-fill flex h-full min-h-0 flex-col">
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setCategoriesStage("mastery")}
                      className="stage-back text-sm font-bold text-[#ffd18a]"
                    >
                      ← Back to My Mastery
                    </button>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="stage-kicker text-xs font-bold uppercase tracking-[0.18em] text-[#9bf5ff]">{masteryCategory} History</p>
                        <h2 className="mt-1 text-2xl font-black text-white">Quiz Review</h2>
                        <p className="mt-1 text-xs text-white/40">{formatMasteryDate(historicalAttemptDetail.attempt.completed_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#ffd18a]">{historicalAttemptDetail.attempt.points}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/38">points</p>
                      </div>
                    </div>
                  </div>

                  <div className="mastery-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid gap-3">
                      {historicalAttemptDetail.answers.map((answer) => (
                        <article
                          key={answer.id}
                          className={`rounded-[18px] border p-4 ${answer.is_correct ? "border-green-300/18 bg-green-400/[0.055]" : "border-red-300/20 bg-red-400/[0.055]"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/38">Question {answer.question_order}</span>
                                {answer.subtopic && <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-bold text-white/48">{answer.subtopic}</span>}
                                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-bold text-white/38">Difficulty {answer.adaptive_difficulty}</span>
                              </div>
                              <h3 className="mt-2 text-sm font-black leading-5 text-white">{answer.question_text}</h3>
                            </div>
                            <p className={`shrink-0 text-xs font-black ${answer.is_correct ? "text-green-200" : "text-red-200"}`}>{answer.is_correct ? "Correct" : "Review"}</p>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-[12px] border border-white/10 bg-black/15 p-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/36">Your answer</p>
                              <p className={`mt-1 text-xs font-bold leading-5 ${answer.is_correct ? "text-green-100" : "text-red-100"}`}>
                                {answer.selected_option ? `${answer.selected_option}. ${getHistoricalOptionText(answer, answer.selected_option)}` : "No answer"}
                              </p>
                            </div>
                            <div className="rounded-[12px] border border-green-300/14 bg-green-400/[0.045] p-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/36">Correct answer</p>
                              <p className="mt-1 text-xs font-bold leading-5 text-green-100">{answer.correct_option}. {getHistoricalOptionText(answer, answer.correct_option)}</p>
                            </div>
                          </div>

                          <div className="mt-2 rounded-[12px] border border-white/8 bg-white/[0.025] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#9bf5ff]">Explanation</p>
                              <p className="text-[9px] font-black text-[#ffd18a]">+{answer.points} · {answer.response_seconds}s</p>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-white/62">{answer.explanation || "No explanation has been added to this question yet."}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {categoriesStage === "multiplayer-finished" && (
                <div className="finished-stage stage-fill flex h-full min-h-0 flex-col text-center">
                  <p className="stage-kicker text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                    Multiplayer Complete
                  </p>

                  <div className="finished-summary shrink-0">
                    <h2 className="finished-score mt-4 text-5xl font-extrabold">
                      {multiplayerScore} / 10
                    </h2>

                    <p className="finished-points mt-3 text-3xl font-extrabold text-[#ffd18a]">
                      {multiplayerPoints} points
                    </p>
                  </div>

                  <div className="leaderboard-card mt-5 min-h-0 flex-1 rounded-[24px] border border-white/14 bg-white/[0.045] p-5 text-left">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd18a]">
                      Leaderboard
                    </p>

                    <div className="leaderboard-list mt-4 grid min-h-0 gap-3 overflow-y-auto overscroll-contain">
                      {sortedMultiplayerPlayers.map((player, index) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between rounded-[14px] border border-white/12 bg-[#050d1c]/85 px-4 py-3"
                        >
                          <div>
                            <p className="font-bold">
                              #{index + 1} {player.display_name}
                            </p>
                            <p className="mt-1 text-xs text-white/46">
                              {player.score}/10 correct
                            </p>
                          </div>

                          <p className="text-xl font-black text-[#ffd18a]">
                            {player.points}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="finished-actions shrink-0">
                    {isMultiplayerHost && multiplayerLobby?.status !== "finished" && (
                      <button
                        type="button"
                        onClick={finishLobbyForEveryone}
                        className="secondary-action mt-4 w-full rounded-[14px] border border-[#ffd18a]/24 bg-[#ffd18a]/10 px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#ffd18a] transition hover:scale-[1.01]"
                      >
                        End Lobby for Everyone
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={resetCategoriesQuiz}
                      className="primary-action mt-4 w-full rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01]"
                    >
                      Back to Mode Select
                    </button>
                  </div>
                </div>
              )}

              {categoryMessage && categoriesStage === "mode" && (
                <p className="stage-message mt-5 text-sm font-bold leading-6 text-[#ffd18a]">
                  {categoryMessage}
                </p>
              )}

              {multiplayerMessage &&
                [
                  "multiplayer-menu",
                  "multiplayer-create",
                  "multiplayer-join",
                  "multiplayer-waiting",
                ].includes(categoriesStage) && (
                  <p className="stage-message mt-5 text-sm font-bold leading-6 text-[#ffd18a]">
                    {multiplayerMessage}
                  </p>
                )}
            </section>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .categories-page {
          position: fixed;
          inset: 0;
          display: flex;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          min-height: 0;
          flex-direction: column;
          overflow: hidden;
          overscroll-behavior: none;
        }

        .categories-topbar {
          min-height: 52px;
          flex: 0 0 auto;
          padding-top: max(6px, env(safe-area-inset-top));
          padding-right: max(14px, env(safe-area-inset-right));
          padding-bottom: 6px;
          padding-left: max(14px, env(safe-area-inset-left));
        }

        .categories-back-button {
          height: 38px;
        }

        .categories-viewport {
          min-height: 0;
          flex: 1 1 0;
          overflow: hidden;
          padding: 6px max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
        }

        .categories-shell {
          width: min(1080px, 100%);
          height: 100%;
          min-height: 0;
          flex: 1 1 auto;
        }

        .categories-hero {
          display: flex;
          min-height: 0;
          flex: 0 0 auto;
          align-items: center;
          gap: 18px;
          padding: 12px 20px;
        }

        .categories-hero-heading {
          display: flex;
          min-width: max-content;
          align-items: baseline;
          gap: 11px;
        }

        .categories-hero-heading > p {
          font-size: 9px;
          letter-spacing: 0.14em;
        }

        .categories-title {
          margin-top: 0;
          font-size: clamp(30px, 4vw, 48px);
          line-height: 1;
        }

        .categories-hero-description {
          margin-top: 0;
          max-width: 330px;
          flex: 1 1 280px;
          font-size: 12px;
          line-height: 1.4;
        }

        .categories-overview-stats {
          width: min(380px, 38vw);
          max-width: none;
          flex: 0 1 380px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-top: 0;
        }

        .categories-overview-stats > div {
          min-width: 0;
          border-radius: 12px;
          padding: 8px 10px;
        }

        .categories-overview-stats > div > p:first-child {
          font-size: 8px;
          letter-spacing: 0.11em;
        }

        .categories-overview-stats > div > p:last-child {
          margin-top: 2px;
          overflow: hidden;
          font-size: 12px;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .categories-page--quiz .categories-hero {
          display: none;
        }

        .categories-content {
          min-height: 0;
          flex: 1 1 0;
          overflow: hidden;
          padding: 12px;
        }

        .categories-page--quiz .categories-content {
          padding: 8px;
        }

        .categories-stage-card {
          height: 100%;
          min-height: 0;
          overflow: hidden;
          padding: 16px;
        }

        .stage-fill {
          min-height: 0;
          overflow: hidden;
        }

        .categories-back-short {
          display: none;
        }

        .quiz-question {
          font-size: clamp(1.45rem, 2.7vw, 2rem);
        }

        .quiz-options-panel {
          grid-template-rows: repeat(4, minmax(0, 1fr));
        }

        .quiz-option {
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .quiz-option-text {
          min-width: 0;
          line-height: 1.35;
        }

        /* Keep selection/setup stages inside the fixed viewport on laptops and desktops. */
        .mode-grid {
          min-height: 0;
          margin-top: 12px;
          gap: 10px;
        }

        .mode-card {
          min-height: 0;
          padding: clamp(14px, 2vh, 22px);
        }

        .reward-rules {
          margin-top: 10px;
          padding: 12px 14px;
        }

        .reward-rules-grid {
          margin-top: 6px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3px 16px;
          font-size: 11px;
          line-height: 1.35;
        }

        .stage-header {
          margin-top: 12px;
        }

        .category-grid {
          min-height: 0;
          margin-top: 10px;
          gap: 9px;
        }

        .category-card {
          min-height: 0 !important;
          height: 100%;
        }

        .category-card > span.relative {
          min-height: 0 !important;
          height: 100%;
          padding: clamp(12px, 1.8vh, 20px);
        }

        .adaptive-mode-grid {
          margin-top: 8px;
          gap: 7px;
        }

        .adaptive-mode-card {
          min-height: 48px;
          padding: 8px 10px;
        }

        .category-grid + .primary-action,
        .stage-fill > .primary-action {
          margin-top: 9px;
        }

        .primary-action,
        .secondary-action {
          min-height: 42px;
          padding-top: 10px;
          padding-bottom: 10px;
        }

        @media (max-width: 1180px) {
          .categories-hero-description {
            display: none;
          }

          .categories-overview-stats {
            margin-left: auto;
          }
        }

        @media (max-height: 760px) and (min-width: 1025px) {
          .categories-topbar {
            min-height: 46px;
            padding-top: max(4px, env(safe-area-inset-top));
            padding-bottom: 4px;
          }

          .categories-back-button {
            height: 34px;
          }

          .categories-hero {
            padding-top: 8px;
            padding-bottom: 8px;
          }

          .categories-title {
            font-size: 30px;
          }

          .categories-hero-description {
            display: none;
          }

          .categories-overview-stats > div {
            padding: 6px 8px;
          }

          .categories-content {
            padding: 8px;
          }

          .categories-stage-card {
            border-radius: 18px;
            padding: 12px;
          }

          .mode-title {
            font-size: 20px;
          }

          .mode-description {
            margin-top: 5px;
            font-size: 11px;
            line-height: 1.4;
          }

          .reward-rules {
            padding: 9px 11px;
          }

          .category-description {
            display: none;
          }

          .selected-pill {
            margin-top: 6px;
          }

          .adaptive-mode-description {
            display: none;
          }
        }

        @media (orientation: landscape) {
          .quiz-play-layout {
            grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
          }
        }

        @media (orientation: portrait) {
          .quiz-play-layout {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 0.72fr) minmax(0, 1.28fr);
          }
        }

        .finished-scroll,
        .results-scroll,
        .mastery-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 209, 138, 0.34) transparent;
          overscroll-behavior: contain;
        }

        .finished-scroll::-webkit-scrollbar,
        .results-scroll::-webkit-scrollbar,
        .mastery-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .finished-scroll::-webkit-scrollbar-thumb,
        .results-scroll::-webkit-scrollbar-thumb,
        .mastery-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255, 209, 138, 0.3);
        }

        @media (max-width: 1024px), (hover: none) and (pointer: coarse) {
          .categories-page {
            height: 100dvh;
          }

          .categories-topbar {
            min-height: 50px;
            padding-top: max(6px, env(safe-area-inset-top));
            padding-right: max(10px, env(safe-area-inset-right));
            padding-bottom: 6px;
            padding-left: max(10px, env(safe-area-inset-left));
          }

          .categories-back-button {
            height: 36px;
            border-radius: 12px;
            padding-inline: 12px;
            font-size: 12px;
          }

          .categories-back-full {
            display: none;
          }

          .categories-back-short {
            display: inline;
          }

          .categories-viewport {
            min-height: 0;
            flex: 1;
            padding: 4px max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
          }

          .categories-shell {
            width: 100%;
            height: 100%;
            min-height: 0;
            border-radius: 18px;
          }

          .categories-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 14px;
          }

          .categories-hero-heading {
            display: flex;
            align-items: baseline;
            gap: 10px;
          }

          .categories-hero-heading > p {
            font-size: 9px;
            letter-spacing: 0.13em;
          }

          .categories-title {
            margin-top: 0;
            font-size: 27px;
            line-height: 1;
          }

          .categories-hero-description,
          .categories-overview-stats {
            display: none;
          }

          .categories-page--quiz .categories-hero {
            display: none;
          }

          .categories-page--quiz .categories-topbar {
            min-height: 44px;
          }

          .categories-content {
            min-height: 0;
            flex: 1;
            padding: 10px;
          }

          .categories-page--quiz .categories-content {
            padding: 8px;
          }

          .categories-stage-card {
            height: 100%;
            min-height: 0;
            overflow: hidden;
            border-radius: 18px;
            padding: 12px;
          }

          .stage-kicker {
            font-size: 10px;
            letter-spacing: 0.14em;
          }

          .stage-back {
            font-size: 12px;
          }

          .stage-header {
            margin-top: 12px;
          }

          .stage-subtitle {
            margin-top: 2px;
            font-size: 12px;
            line-height: 1.35;
          }

          .mode-grid {
            margin-top: 12px;
            gap: 10px;
          }

          .mode-card {
            min-height: 0;
            border-radius: 16px;
            padding: 14px;
          }

          .mode-title {
            font-size: 18px;
          }

          .mode-description {
            margin-top: 5px;
            font-size: 12px;
            line-height: 1.4;
          }

          .reward-rules {
            margin-top: 10px;
            border-radius: 16px;
            padding: 10px 12px;
          }

          .reward-rules > p {
            font-size: 9px;
          }

          .reward-rules-grid {
            margin-top: 6px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 2px 12px;
            font-size: 10px;
            line-height: 1.3;
          }

          .category-grid {
            margin-top: 10px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .category-card {
            min-height: 0;
            border-radius: 16px;
            padding: 12px;
          }

          .category-index,
          .category-description,
          .selected-pill {
            display: none;
          }

          .category-name {
            margin-top: 0;
            font-size: 16px;
            line-height: 1.15;
          }

          .primary-action,
          .secondary-action {
            min-height: 42px;
            padding: 10px 14px;
            font-size: 11px;
          }

          .category-grid + .primary-action,
          .stage-fill > .primary-action {
            margin-top: 10px;
          }

          .adaptive-mode-grid {
            margin-top: 7px;
            gap: 5px;
          }

          .adaptive-mode-card {
            min-height: 52px;
            border-radius: 11px;
            padding: 6px 7px;
          }

          .adaptive-mode-heading {
            gap: 4px;
          }

          .adaptive-mode-heading > span:first-child {
            font-size: 12px;
          }

          .adaptive-mode-title {
            font-size: 8px;
            line-height: 1.1;
          }

          .adaptive-mode-description {
            margin-top: 3px;
            max-height: 22px;
            overflow: hidden;
            font-size: 7px;
            line-height: 1.45;
          }

          .target-result-card {
            margin-top: 7px;
            border-radius: 13px;
            padding: 9px 10px;
          }

          .form-grid {
            width: min(100%, 620px);
            margin: 12px auto 0;
            gap: 12px;
          }

          .form-grid label {
            gap: 5px;
          }

          .form-control {
            height: 42px;
          }

          .waiting-grid {
            margin-top: 10px;
            grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr);
            gap: 10px;
          }

          .lobby-code-card,
          .players-card {
            border-radius: 16px;
            padding: 12px;
          }

          .lobby-code {
            margin-top: 8px;
            font-size: 34px;
          }

          .lobby-code-card > p:last-child {
            margin-top: 8px;
            font-size: 11px;
          }

          .players-card {
            display: flex;
            min-height: 0;
            flex-direction: column;
          }

          .players-list,
          .leaderboard-list {
            min-height: 0;
            flex: 1;
            margin-top: 8px;
            gap: 6px;
          }

          .players-list > div,
          .leaderboard-list > div {
            padding: 8px 10px;
          }

          .waiting-message {
            margin-top: 10px;
            border-radius: 16px;
            padding: 10px 12px;
            font-size: 11px;
          }

          .quiz-statusbar {
            gap: 6px;
          }

          .quiz-pill {
            min-width: 0;
            padding: 6px 9px;
            font-size: 10px;
            white-space: nowrap;
          }

          .quiz-pill:first-child {
            max-width: 30%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .quiz-style-pill {
            max-width: 23%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .quiz-score-strip {
            margin-top: 7px;
            gap: 7px;
          }

          .quiz-stat {
            border-radius: 11px;
            padding: 7px 9px;
          }

          .quiz-stat-label {
            font-size: 8px;
            letter-spacing: 0.1em;
          }

          .quiz-stat-value {
            margin-top: 1px;
            font-size: 15px;
            line-height: 1.1;
          }

          .quiz-play-layout {
            margin-top: 8px;
            gap: 8px;
          }

          .quiz-question-panel {
            min-height: 0;
            overflow: hidden;
            border-radius: 14px;
            padding: 12px;
          }

          .quiz-question-scroll {
            height: 100%;
            overflow-y: auto;
            overscroll-behavior: contain;
            scrollbar-width: none;
          }

          .quiz-question-scroll::-webkit-scrollbar {
            display: none;
          }

          .quiz-question-label {
            font-size: 8px;
            letter-spacing: 0.12em;
          }

          .quiz-question {
            margin-top: 6px;
            font-size: clamp(16px, 4.3vw, 23px);
            line-height: 1.22;
          }

          .quiz-hint {
            min-height: 36px;
            margin-top: 9px;
            border-radius: 10px;
            padding: 7px 9px;
            font-size: 10px;
          }

          .quiz-feedback {
            margin-top: 8px;
            font-size: 10px;
            line-height: 1.35;
          }

          .quiz-feedback p + p {
            margin-top: 4px;
          }

          .quiz-options-panel {
            gap: 7px;
          }

          .quiz-option {
            min-height: 0;
            border-radius: 11px;
            padding: 8px 10px;
            font-size: 12px;
          }

          .quiz-option-letter {
            width: 24px;
            height: 24px;
            margin-right: 8px;
            font-size: 10px;
          }

          .finished-score {
            margin-top: 8px;
            font-size: 34px;
          }

          .finished-points {
            margin-top: 3px;
            font-size: 22px;
          }

          .finished-copy {
            margin-top: 7px;
            font-size: 11px;
            line-height: 1.4;
          }

          .reward-card,
          .leaderboard-card {
            margin-top: 10px;
            border-radius: 16px;
            padding: 12px;
            overflow: hidden;
          }

          .reward-card p {
            font-size: 11px;
            line-height: 1.4;
          }

          .leaderboard-card {
            display: flex;
            min-height: 0;
            flex-direction: column;
          }

          .finished-actions .primary-action,
          .finished-actions .secondary-action {
            margin-top: 8px;
          }

          .stage-message {
            margin-top: 8px;
            font-size: 10px;
            line-height: 1.35;
          }

          .phase2-summary-grid {
            margin-top: 8px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
          }

          .phase2-summary-grid > div {
            border-radius: 13px;
            padding: 9px;
          }

          .phase2-summary-grid p:nth-child(2) {
            font-size: 20px;
          }

          .milo-summary-card,
          .reward-card {
            margin-top: 7px;
            border-radius: 13px;
            padding: 9px 10px;
          }

          .finished-actions {
            margin-top: 7px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 5px;
          }

          .finished-actions button {
            min-height: 38px;
            padding: 7px 6px;
            font-size: 9px;
            letter-spacing: 0.05em;
          }

          .results-header h2 {
            font-size: 20px;
          }

          .results-scroll {
            margin-top: 7px;
          }

          .result-card {
            border-radius: 13px;
            padding: 10px;
          }

          .result-answer-grid {
            margin-top: 8px;
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .result-card h3 {
            margin-top: 5px;
            font-size: 12px;
            line-height: 1.35;
          }

          .result-card > div:last-child,
          .result-answer-grid > div {
            padding: 8px;
          }
        }

        @media (max-width: 1024px) and (orientation: portrait),
          (hover: none) and (pointer: coarse) and (orientation: portrait) {
          .mode-grid {
            grid-template-columns: 1fr;
            grid-template-rows: repeat(2, minmax(0, 1fr));
          }

          .category-grid {
            grid-template-columns: 1fr;
            grid-template-rows: repeat(3, minmax(0, 1fr));
          }

          .category-card {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .adaptive-mode-description {
            display: none;
          }

          .adaptive-mode-card {
            min-height: 42px;
            text-align: center;
          }

          .adaptive-mode-heading {
            justify-content: center;
          }

          .waiting-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto minmax(0, 1fr);
          }

          .quiz-play-layout {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 0.68fr) minmax(0, 1.32fr);
          }
        }

        @media (max-width: 1024px) and (orientation: landscape),
          (hover: none) and (pointer: coarse) and (orientation: landscape) {
          .categories-topbar {
            min-height: 42px;
            padding-top: max(4px, env(safe-area-inset-top));
            padding-bottom: 4px;
          }

          .categories-hero {
            padding-block: 7px;
          }

          .categories-title {
            font-size: 23px;
          }

          .mode-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .category-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .quiz-play-layout {
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
            grid-template-rows: 1fr;
          }

          .quiz-question {
            font-size: clamp(16px, 2.5vw, 23px);
          }

          .reward-rules {
            padding-block: 8px;
          }

          .finished-stage {
            max-width: 880px;
            margin-inline: auto;
          }
        }

        @media (max-height: 640px) and (orientation: landscape) {
          .categories-topbar {
            min-height: 38px;
          }

          .categories-back-button {
            height: 32px;
          }

          .categories-viewport {
            padding-top: 2px;
            padding-bottom: max(5px, env(safe-area-inset-bottom));
          }

          .categories-content,
          .categories-page--quiz .categories-content {
            padding: 6px;
          }

          .categories-stage-card {
            padding: 8px;
          }

          .quiz-statusbar {
            min-height: 27px;
          }

          .quiz-pill {
            padding: 4px 8px;
            font-size: 9px;
          }

          .quiz-score-strip {
            margin-top: 5px;
            gap: 5px;
          }

          .quiz-stat {
            padding: 5px 7px;
          }

          .quiz-stat-label {
            display: none;
          }

          .quiz-stat-value {
            font-size: 13px;
          }

          .quiz-play-layout {
            margin-top: 5px;
            gap: 6px;
          }

          .quiz-question-panel {
            padding: 9px;
          }

          .quiz-option {
            padding: 6px 9px;
            font-size: 11px;
          }

          .quiz-option-letter {
            width: 21px;
            height: 21px;
          }
        }
      `}</style>
    </main>
  );
}
