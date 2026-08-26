"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";
type TimerSeconds = 10 | 20;
type ChallengeMode =
  | "quick_play"
  | "focus_mission"
  | "nova_challenge"
  | "expert_challenge";

type KnowledgeArenaTopic =
  | "world_explorer"
  | "time_traveller"
  | "science_sparks"
  | "mystery_logic";

type KnowledgeArenaAnswer = "A" | "B" | "C" | "D";

type PageStage =
  | "mode"
  | "solo-mode"
  | "topic"
  | "loading"
  | "solo-quiz"
  | "solo-results"
  | "multiplayer-menu"
  | "create-lobby"
  | "join-lobby"
  | "waiting-lobby"
  | "multiplayer-quiz"
  | "multiplayer-results";

type KnowledgeArenaQuestion = {
  id: string;
  topic: KnowledgeArenaTopic;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: KnowledgeArenaAnswer;
  explanation: string;
  difficulty: string;
};

type Lobby = {
  id: string;
  code: string;
  host_user_id: string;
  topic: KnowledgeArenaTopic;
  question_ids: string[];
  timer_seconds: TimerSeconds;
  status: "waiting" | "playing" | "finished";
  created_at: string;
  started_at: string | null;
};

type LobbyAnswer = {
  questionId: string;
  answer: KnowledgeArenaAnswer | null;
  correct: boolean;
  points: number;
  secondsUsed: number;
};

type RecordedArenaAnswer = {
  question_id: string;
  answer: KnowledgeArenaAnswer | null;
  seconds_used: number;
  correct: boolean;
  points: number;
};

type KnowledgeArenaProfileTopic = {
  topic: KnowledgeArenaTopic;
  title: string;
  skill_id?: string | null;
  has_evidence: boolean;
  mastery_score: number | null;
  confidence_score?: number | null;
  recent_accuracy?: number | null;
  lifetime_accuracy?: number | null;
  questions_attempted?: number;
  correct_answers?: number;
  wrong_answers?: number;
  repeated_error_count?: number;
  trend?: string | null;
  status?: string | null;
  last_attempted_at?: string | null;
};

type KnowledgeArenaProfile = {
  available: boolean;
  reason?: string | null;
  source?: string;
  mastery_refresh_pending?: boolean;
  profile_ready: boolean;
  overall_mastery: number | null;
  evidence_topics: number;
  total_questions_attempted: number;
  recommended_topic: KnowledgeArenaTopic | null;
  recommended_topic_title: string | null;
  recommendation_reason: string;
  strongest_topic?: KnowledgeArenaTopic | null;
  strongest_topic_title?: string | null;
  topics: KnowledgeArenaProfileTopic[];
};

type ChallengeAllocation = {
  topic: KnowledgeArenaTopic;
  title: string;
  count: number;
  weakness_rank?: number;
  effective_mastery?: number;
  has_evidence?: boolean;
};

type ChallengePlan = {
  challenge_mode: ChallengeMode;
  requested_topic: KnowledgeArenaTopic | null;
  resolved_topic: KnowledgeArenaTopic | null;
  resolved_topic_title: string | null;
  attempt_topic: KnowledgeArenaTopic | "mixed";
  mixed: boolean;
  selection_reason: string;
  allocations: ChallengeAllocation[];
};

type TopicResult = {
  topic: KnowledgeArenaTopic;
  score: number;
  correct_count: number;
  total_questions: number;
  accuracy: number | null;
};

type SavedArenaAttempt = {
  attempt_id?: string;
  score?: number;
  correct_count?: number;
  total_questions?: number;
  tokens_earned?: number;
  challenge_mode?: ChallengeMode;
  timer_seconds?: number;
  topic_results?: TopicResult[];
  profile?: KnowledgeArenaProfile;
};

type KnowledgeArenaAttemptReceipt = {
  attempt_saved: boolean;
  attempt_id: string;
  topic: string | null;
  mode: string | null;
  score: number;
  correct_count: number;
  total_questions: number;
  tokens_earned: number;
  answer_rows: number;
  analytics_event_rows: number;
  created_at: string | null;
};

type LobbyPlayer = {
  id: string;
  lobby_id: string;
  user_id: string;
  display_name: string;
  is_host: boolean;
  score: number;
  correct_count: number;
  answers: LobbyAnswer[];
  status: "waiting" | "playing" | "finished";
  joined_at: string;
};

const topics: {
  id: KnowledgeArenaTopic;
  title: string;
  subtitle: string;
  accent: string;
  coverImage: string;
}[] = [
  {
    id: "world_explorer",
    title: "World Explorer",
    subtitle: "Geography, countries, landmarks, cultures, and nature.",
    accent: "#53d7ff",
    coverImage:
      "/activities/learning-missions/knowledge-arena/categories/world-explorer.png",
  },
  {
    id: "time_traveller",
    title: "Time Traveller",
    subtitle: "History, inventions, ancient worlds, and famous moments.",
    accent: "#ffd76a",
    coverImage:
      "/activities/learning-missions/knowledge-arena/categories/time-traveller.png",
  },
  {
    id: "science_sparks",
    title: "Science Sparks",
    subtitle: "Space, animals, nature, the body, and simple science.",
    accent: "#60f0d0",
    coverImage:
      "/activities/learning-missions/knowledge-arena/categories/science-sparks.png",
  },
  {
    id: "mystery_logic",
    title: "Mystery Logic",
    subtitle: "Riddles, clues, deduction, patterns, and smart guesses.",
    accent: "#c99cff",
    coverImage:
      "/activities/learning-missions/knowledge-arena/categories/mystery-logic.png",
  },
];

const NOVA_ANALYTICS_HREF = "/learning-missions/progress-rewards";

const challengeModeMeta: Record<
  ChallengeMode,
  { title: string; eyebrow: string; description: string; icon: string; accent: string }
> = {
  quick_play: {
    title: "Quick Play",
    eyebrow: "Classic challenge",
    description: "Choose one knowledge world and play 10 questions at your own pace.",
    icon: "⚡",
    accent: "#53d7ff",
  },
  focus_mission: {
    title: "Focus Mission",
    eyebrow: "Nova recommends",
    description: "Train the Knowledge Arena world that currently needs the most attention.",
    icon: "◎",
    accent: "#60f0d0",
  },
  nova_challenge: {
    title: "Nova Challenge",
    eyebrow: "Adaptive mix",
    description: "A personalised 10-question mix weighted towards your lower-mastered worlds.",
    icon: "✦",
    accent: "#c99cff",
  },
  expert_challenge: {
    title: "Expert Challenge",
    eyebrow: "Higher difficulty",
    description: "Choose a world and take on the toughest available Knowledge Arena questions.",
    icon: "◆",
    accent: "#ffd76a",
  },
};


const NOVA_GUIDE_STEPS = [
  {
    eyebrow: "Start here",
    title: "Choose how to play",
    description:
      "Play a solo Knowledge Arena challenge or enter a shared multiplayer lobby.",
    detail:
      "Single Player contains Nova's personalised challenge modes. Multiplayer uses a shared world and timer.",
    stage: "mode" as PageStage,
    target: "play-mode",
  },
  {
    eyebrow: "Knowledge worlds",
    title: "Choose a world",
    description:
      "World Explorer, Time Traveller, Science Sparks and Mystery Logic each keep their own Nova mastery profile.",
    detail:
      "Quick Play and Expert Challenge use the world you select. Focus Mission can automatically use Nova's recommended world.",
    stage: "solo-mode" as PageStage,
    target: "worlds",
  },
  {
    eyebrow: "Choose your pace",
    title: "Question timer",
    description:
      "Choose 10 or 20 seconds per question. Both timers use the same 100-point maximum.",
    detail:
      "20 seconds is the default. A faster timer changes the pace, not the maximum score.",
    stage: "solo-mode" as PageStage,
    target: "timer",
  },
  {
    eyebrow: "Classic challenge",
    title: "Quick Play",
    description:
      "Play 10 questions from one selected knowledge world without adaptive targeting.",
    detail:
      "Use Quick Play when you want a straightforward category challenge.",
    stage: "solo-mode" as PageStage,
    target: "quick-play",
  },
  {
    eyebrow: "Personalised learning",
    title: "Focus Mission",
    description:
      "Nova uses the mastery already stored in Nova Analytics and targets the knowledge world that needs the most attention.",
    detail:
      "This does not create a second mastery system. Knowledge Arena reads the same profile Nova Analytics already maintains.",
    stage: "solo-mode" as PageStage,
    target: "focus-mission",
  },
  {
    eyebrow: "Adaptive mix",
    title: "Nova Challenge",
    description:
      "Nova builds a personalised 10-question mix across all four worlds, weighted toward lower-mastered areas.",
    detail:
      "The challenge uses the existing Nova profile and feeds new evidence back into that same profile.",
    stage: "solo-mode" as PageStage,
    target: "nova-challenge",
  },
  {
    eyebrow: "Stretch yourself",
    title: "Expert Challenge",
    description:
      "Choose a knowledge world and take on the toughest eligible questions available there.",
    detail:
      "Expert Challenge is difficulty-led. Your selected world still controls the question pool.",
    stage: "solo-mode" as PageStage,
    target: "expert-challenge",
  },
  {
    eyebrow: "Your learning profile",
    title: "Knowledge Profile",
    description:
      "See your overall knowledge mastery, four world scores and Nova's current recommendation.",
    detail:
      "For deeper evidence, trends and cross-subject analytics, open the full Nova Analytics dashboard.",
    stage: "solo-mode" as PageStage,
    target: "knowledge-profile",
  },
  {
    eyebrow: "Play together",
    title: "Multiplayer",
    description:
      "Create or join a lobby and answer the same 10 questions together.",
    detail:
      "Multiplayer correctness still contributes to personal mastery evidence while remaining separate from solo improvement benchmarking.",
    stage: "mode" as PageStage,
    target: "multiplayer-mode",
  },
] as const;

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180 || isPortrait) {
        setScreenMode("tablet");
      } else {
        setScreenMode("desktop");
      }
    }

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenMode;
}

function generateLobbyCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }

  return code;
}

function calculatePoints(
  isCorrect: boolean,
  secondsRemaining: number,
  timerSeconds: TimerSeconds
) {
  if (!isCorrect) return 0;

  const speedRatio = Math.max(0, Math.min(1, secondsRemaining / timerSeconds));
  return 40 + Math.round(speedRatio * 60);
}

function calculateTokenReward(finalScore: number, finalCorrectCount: number) {
  let reward = 1;

  if (finalCorrectCount >= 6) reward += 1;
  if (finalScore >= 700) reward += 1;
  if (finalScore >= 900) reward += 1;

  return reward;
}

function sortQuestionsByIds(
  questions: KnowledgeArenaQuestion[],
  questionIds: string[]
) {
  const orderMap = new Map(questionIds.map((id, index) => [id, index]));

  return [...questions].sort(
    (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
  );
}

export default function KnowledgeArenaPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = !isDesktop;

  const [stage, setStage] = useState<PageStage>("mode");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [tokenBalance, setTokenBalance] = useState(0);

  const [selectedTopic, setSelectedTopic] =
    useState<KnowledgeArenaTopic | null>("world_explorer");
  const [questions, setQuestions] = useState<KnowledgeArenaQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] =
    useState<KnowledgeArenaAnswer | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [soloTimerSeconds, setSoloTimerSeconds] = useState<TimerSeconds>(20);
  const [lobbyTimerSecondsChoice, setLobbyTimerSecondsChoice] =
    useState<TimerSeconds>(20);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nextCountdown, setNextCountdown] = useState(3);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [rewardSaved, setRewardSaved] = useState(false);
  const [attemptSaveMessage, setAttemptSaveMessage] = useState("");
  const [selectedChallengeMode, setSelectedChallengeMode] =
    useState<ChallengeMode>("quick_play");
  const [activeChallengePlan, setActiveChallengePlan] =
    useState<ChallengePlan | null>(null);
  const [knowledgeProfile, setKnowledgeProfile] =
    useState<KnowledgeArenaProfile | null>(null);
  const [profileAtChallengeStart, setProfileAtChallengeStart] =
    useState<KnowledgeArenaProfile | null>(null);
  const [profileAfterAttempt, setProfileAfterAttempt] =
    useState<KnowledgeArenaProfile | null>(null);
  const [lastTopicResults, setLastTopicResults] = useState<TopicResult[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading Knowledge Arena questions..."
  );

  const recordedAnswersRef = useRef<RecordedArenaAnswer[]>([]);
  const attemptSaveStartedRef = useRef(false);

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [myPlayer, setMyPlayer] = useState<LobbyPlayer | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [multiplayerMessage, setMultiplayerMessage] = useState("");

  const [novaGuideOpen, setNovaGuideOpen] = useState(false);
  const [novaGuideStep, setNovaGuideStep] = useState(0);
  const [novaGuideTargetRect, setNovaGuideTargetRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);
  const [novaGuideViewport, setNovaGuideViewport] = useState({
    width: 1440,
    height: 900,
  });
  const [novaGuidePanelSize, setNovaGuidePanelSize] = useState({
    width: 420,
    height: 390,
  });
  const novaGuidePanelRef = useRef<HTMLElement | null>(null);
  const novaGuideReturnState = useRef<{
    stage: PageStage;
    selectedTopic: KnowledgeArenaTopic | null;
    selectedChallengeMode: ChallengeMode;
  } | null>(null);


  const currentQuestion = questions[questionIndex];
  const selectedTopicInfo = topics.find((topic) => topic.id === selectedTopic);
  const currentQuestionTopicInfo = topics.find(
    (topic) => topic.id === currentQuestion?.topic
  );
  const isHost = Boolean(lobby && userId && lobby.host_user_id === userId);

  const activeTimerSeconds: TimerSeconds = useMemo(() => {
    if (stage === "solo-quiz" || stage === "solo-results") {
      return soloTimerSeconds;
    }

    if (
      stage === "create-lobby" ||
      stage === "waiting-lobby" ||
      stage === "multiplayer-quiz" ||
      stage === "multiplayer-results"
    ) {
      return lobby?.timer_seconds ?? lobbyTimerSecondsChoice;
    }

    return soloTimerSeconds;
  }, [stage, soloTimerSeconds, lobbyTimerSecondsChoice, lobby?.timer_seconds]);

  const leaderboard = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.correct_count - a.correct_count;
  });

  // Knowledge Arena is a fixed-screen experience on every device.
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

  useEffect(() => {
    try {
      const hasSeenGuide = window.localStorage.getItem(
        "nova-knowledge-arena-guide-seen-v1"
      );

      if (!hasSeenGuide) {
        const timer = window.setTimeout(() => {
          openNovaGuide();
        }, 500);

        return () => window.clearTimeout(timer);
      }
    } catch {
      // The guide remains available manually when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!novaGuideOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeNovaGuide();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [novaGuideOpen]);

  useEffect(() => {
    if (!novaGuideOpen) {
      setNovaGuideTargetRect(null);
      return;
    }

    const step = NOVA_GUIDE_STEPS[novaGuideStep] ?? NOVA_GUIDE_STEPS[0];
    setStage(step.stage);

    if (step.stage === "solo-mode" && !selectedTopic) {
      setSelectedTopic("world_explorer");
    }
  }, [novaGuideOpen, novaGuideStep]);

  useEffect(() => {
    if (!novaGuideOpen) return;

    let animationFrame = 0;
    let settleTimer = 0;
    let observer: ResizeObserver | null = null;

    const step = NOVA_GUIDE_STEPS[novaGuideStep] ?? NOVA_GUIDE_STEPS[0];

    function findTarget() {
      return document.querySelector<HTMLElement>(
        `[data-nova-guide-target="${step.target}"]`
      );
    }

    function measureGuide() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const target = findTarget();
        setNovaGuideViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });

        if (!target) {
          setNovaGuideTargetRect(null);
        } else {
          const rect = target.getBoundingClientRect();
          setNovaGuideTargetRect({
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          });
        }

        if (novaGuidePanelRef.current) {
          const panelRect = novaGuidePanelRef.current.getBoundingClientRect();
          setNovaGuidePanelSize({
            width: panelRect.width,
            height: panelRect.height,
          });
        }
      });
    }

    observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => measureGuide())
        : null;

    settleTimer = window.setTimeout(() => {
      const target = findTarget();
      if (target) observer?.observe(target);
      if (novaGuidePanelRef.current) {
        observer?.observe(novaGuidePanelRef.current);
      }
      measureGuide();
    }, 120);

    window.addEventListener("resize", measureGuide);
    window.addEventListener("scroll", measureGuide, true);

    return () => {
      window.clearTimeout(settleTimer);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", measureGuide);
      window.removeEventListener("scroll", measureGuide, true);
      observer?.disconnect();
    };
  }, [novaGuideOpen, novaGuideStep, stage, selectedTopic, selectedChallengeMode]);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setUserEmail(null);
        setTokenBalance(0);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const { data } = await supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual");

      const total =
        data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;

      setTokenBalance(total);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => loadUser());

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setKnowledgeProfile(null);
      setProfileError(null);
      return;
    }

    void loadKnowledgeProfile();
  }, [userId]);

  useEffect(() => {
    if (stage !== "solo-quiz" && stage !== "multiplayer-quiz") return;
    if (novaGuideOpen) return;
    if (answerLocked || !currentQuestion) return;

    if (timeLeft <= 0) {
      void lockAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [stage, timeLeft, answerLocked, currentQuestion, novaGuideOpen]);

  useEffect(() => {
    if (stage !== "solo-quiz" && stage !== "multiplayer-quiz") return;
    if (novaGuideOpen) return;
    if (!answerLocked) return;

    if (nextCountdown <= 0) {
      void nextQuestion();
      return;
    }

    const timer = window.setTimeout(() => {
      setNextCountdown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [stage, answerLocked, nextCountdown, novaGuideOpen]);

  useEffect(() => {
    if (!lobby?.id) return;

    const lobbyId = lobby.id;

    async function refresh() {
      await loadLobbyState(lobbyId);
    }

    const channel = supabase
      .channel(`knowledge-arena-lobby-${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "knowledge_arena_lobbies",
          filter: `id=eq.${lobbyId}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "knowledge_arena_lobby_players",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobby?.id]);

  useEffect(() => {
    if (!lobby) return;

    if (lobby.status === "playing" && stage === "waiting-lobby") {
      void prepareMultiplayerGame(lobby);
    }

    if (lobby.status === "finished" && stage !== "multiplayer-results") {
      setStage("multiplayer-results");
    }
  }, [lobby?.status, stage]);

  async function loadKnowledgeProfile() {
    if (!userId) {
      setKnowledgeProfile(null);
      return null;
    }

    setProfileLoading(true);
    setProfileError(null);

    const { data, error } = await supabase.rpc("get_knowledge_arena_profile");

    setProfileLoading(false);

    if (error) {
      console.error("Could not load Knowledge Arena profile:", error);
      setProfileError(
        "Nova Analytics is temporarily unavailable. You can still use Quick Play or Expert Challenge."
      );
      return null;
    }

    const nextProfile = (data ?? null) as KnowledgeArenaProfile | null;
    setKnowledgeProfile(nextProfile);
    return nextProfile;
  }

  async function loadQuestions(topic: KnowledgeArenaTopic) {
    setStage("loading");
    setLoadingMessage("Loading Knowledge Arena questions...");
    setLoadError(null);
    setSelectedTopic(topic);

    const { data, error } = await supabase.rpc(
      "get_knowledge_arena_questions",
      {
        selected_topic: topic,
        question_limit: 10,
      }
    );

    if (error || !data || data.length < 10) {
      setLoadError("This topic needs at least 10 active questions in Supabase.");
      setStage(stage === "create-lobby" ? "create-lobby" : "topic");
      return [];
    }

    return data as KnowledgeArenaQuestion[];
  }

  async function startSoloChallenge(
    challengeMode: ChallengeMode,
    topic: KnowledgeArenaTopic | null = null
  ) {
    if (
      (challengeMode === "focus_mission" || challengeMode === "nova_challenge") &&
      !userId
    ) {
      setProfileError("Log in to use Nova-personalised challenge modes.");
      return;
    }

    setSelectedChallengeMode(challengeMode);
    setStage("loading");
    setLoadingMessage(
      challengeMode === "nova_challenge"
        ? "Nova is building your personalised challenge..."
        : challengeMode === "focus_mission"
        ? "Nova is selecting your focus mission..."
        : challengeMode === "expert_challenge"
        ? "Loading expert questions..."
        : "Loading Knowledge Arena questions..."
    );
    setLoadError(null);
    setAttemptSaveMessage("");
    setProfileAfterAttempt(null);
    setLastTopicResults([]);

    const { data: planData, error: planError } = await supabase.rpc(
      "get_knowledge_arena_challenge_plan",
      {
        p_challenge_mode: challengeMode,
        p_topic: topic,
      }
    );

    if (planError || !planData) {
      console.error("Could not build Knowledge Arena challenge plan:", planError);
      setLoadError(
        planError?.message || "Nova could not build this challenge right now."
      );
      setStage("solo-mode");
      return;
    }

    const plan = planData as ChallengePlan;

    const { data: questionData, error: questionError } = await supabase.rpc(
      "get_knowledge_arena_challenge_questions",
      {
        p_challenge_mode: challengeMode,
        p_topic: topic,
        p_question_limit: 10,
      }
    );

    if (questionError || !questionData || questionData.length < 10) {
      console.error("Could not load adaptive Knowledge Arena questions:", questionError);
      setLoadError(
        questionError?.message ||
          "This challenge does not have enough eligible questions yet."
      );
      setStage("solo-mode");
      return;
    }

    setActiveChallengePlan(plan);
    setProfileAtChallengeStart(knowledgeProfile);
    setQuestions(questionData as KnowledgeArenaQuestion[]);
    setSelectedTopic(plan.resolved_topic ?? null);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(soloTimerSeconds);
    setAnswerLocked(false);
    setFeedback(null);
    setNextCountdown(3);
    setTokensEarned(0);
    setRewardSaved(false);
    recordedAnswersRef.current = [];
    attemptSaveStartedRef.current = false;
    setStage("solo-quiz");
  }

  function chooseSoloChallengeMode(challengeMode: ChallengeMode) {
    setSelectedChallengeMode(challengeMode);
    setLoadError(null);
    setProfileError(null);

    if (
      challengeMode === "focus_mission" &&
      knowledgeProfile?.recommended_topic
    ) {
      setSelectedTopic(knowledgeProfile.recommended_topic);
    }
  }

  function startConfiguredSoloChallenge() {
    setLoadError(null);

    if (
      (selectedChallengeMode === "focus_mission" ||
        selectedChallengeMode === "nova_challenge") &&
      !userId
    ) {
      setLoadError("Log in to use Nova's personalised challenge modes.");
      return;
    }

    if (
      selectedChallengeMode === "quick_play" ||
      selectedChallengeMode === "expert_challenge"
    ) {
      if (!selectedTopic) {
        setLoadError("Choose a knowledge world first.");
        return;
      }

      void startSoloChallenge(selectedChallengeMode, selectedTopic);
      return;
    }

    void startSoloChallenge(selectedChallengeMode);
  }

  function startFocusFromResults() {
    setSelectedChallengeMode("focus_mission");
    if (knowledgeProfile?.recommended_topic) {
      setSelectedTopic(knowledgeProfile.recommended_topic);
    }
    void startSoloChallenge("focus_mission");
  }

  async function loadQuestionsByIds(questionIds: string[]) {
    const { data, error } = await supabase
      .from("knowledge_arena_questions")
      .select(
        "id,topic,question_text,question_image,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty"
      )
      .in("id", questionIds);

    if (error || !data) {
      setMultiplayerMessage("Could not load lobby questions.");
      return [];
    }

    return sortQuestionsByIds(data as KnowledgeArenaQuestion[], questionIds);
  }

  async function createLobby(topic: KnowledgeArenaTopic) {
    setIsCreatingLobby(true);
    setMultiplayerMessage("");

    if (!userId) {
      setMultiplayerMessage("Please log in before creating a lobby.");
      setIsCreatingLobby(false);
      return;
    }

    if (!displayName.trim()) {
      setMultiplayerMessage("Please enter your player name first.");
      setIsCreatingLobby(false);
      return;
    }

    const loadedQuestions = await loadQuestions(topic);

    if (loadedQuestions.length < 10) {
      setIsCreatingLobby(false);
      return;
    }

    let createdLobby: Lobby | null = null;
    let lastError = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await supabase
        .from("knowledge_arena_lobbies")
        .insert({
          code: generateLobbyCode(),
          host_user_id: userId,
          topic,
          question_ids: loadedQuestions.map((question) => question.id),
          timer_seconds: lobbyTimerSecondsChoice,
          status: "waiting",
        })
        .select("*")
        .single();

      if (!error && data) {
        createdLobby = data as Lobby;
        break;
      }

      lastError = error?.message || "";
    }

    if (!createdLobby) {
      setMultiplayerMessage(lastError || "Could not create lobby.");
      setIsCreatingLobby(false);
      setStage("create-lobby");
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("knowledge_arena_lobby_players")
      .insert({
        lobby_id: createdLobby.id,
        user_id: userId,
        display_name: displayName.trim(),
        is_host: true,
        status: "waiting",
      })
      .select("*")
      .single();

    if (playerError || !playerData) {
      setMultiplayerMessage(
        playerError?.message || "Lobby created, but player failed."
      );
      setIsCreatingLobby(false);
      return;
    }

    setLobby(createdLobby);
    setMyPlayer(playerData as LobbyPlayer);
    setPlayers([playerData as LobbyPlayer]);
    setQuestions(loadedQuestions);
    setSelectedTopic(topic);
    setStage("waiting-lobby");
    setIsCreatingLobby(false);
  }

  async function joinLobby() {
    setIsJoiningLobby(true);
    setMultiplayerMessage("");

    if (!userId) {
      setMultiplayerMessage("Please log in before joining a lobby.");
      setIsJoiningLobby(false);
      return;
    }

    if (!displayName.trim()) {
      setMultiplayerMessage("Please enter your player name first.");
      setIsJoiningLobby(false);
      return;
    }

    const code = joinCode.trim().toUpperCase();

    if (!code) {
      setMultiplayerMessage("Please enter a lobby code.");
      setIsJoiningLobby(false);
      return;
    }

    const { data: lobbyData, error: lobbyError } = await supabase
      .from("knowledge_arena_lobbies")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (lobbyError || !lobbyData) {
      setMultiplayerMessage("Lobby not found. Check the code and try again.");
      setIsJoiningLobby(false);
      return;
    }

    const foundLobby = lobbyData as Lobby;

    if (foundLobby.status !== "waiting") {
      setMultiplayerMessage("This lobby has already started.");
      setIsJoiningLobby(false);
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("knowledge_arena_lobby_players")
      .upsert(
        {
          lobby_id: foundLobby.id,
          user_id: userId,
          display_name: displayName.trim(),
          is_host: foundLobby.host_user_id === userId,
          status: "waiting",
        },
        { onConflict: "lobby_id,user_id" }
      )
      .select("*")
      .single();

    if (playerError || !playerData) {
      setMultiplayerMessage(playerError?.message || "Could not join lobby.");
      setIsJoiningLobby(false);
      return;
    }

    setLobby(foundLobby);
    setLobbyTimerSecondsChoice(foundLobby.timer_seconds ?? 20);
    setMyPlayer(playerData as LobbyPlayer);
    setSelectedTopic(foundLobby.topic);
    await loadLobbyState(foundLobby.id);
    setStage("waiting-lobby");
    setIsJoiningLobby(false);
  }

  async function loadLobbyState(lobbyId: string) {
    const { data: lobbyData } = await supabase
      .from("knowledge_arena_lobbies")
      .select("*")
      .eq("id", lobbyId)
      .single();

    const { data: playerData } = await supabase
      .from("knowledge_arena_lobby_players")
      .select("*")
      .eq("lobby_id", lobbyId)
      .order("score", { ascending: false });

    if (lobbyData) {
      const nextLobby = lobbyData as Lobby;
      setLobby(nextLobby);
      setLobbyTimerSecondsChoice(nextLobby.timer_seconds ?? 20);
    }

    const nextPlayers = (playerData || []) as LobbyPlayer[];
    setPlayers(nextPlayers);

    if (userId) {
      const current = nextPlayers.find((player) => player.user_id === userId);
      if (current) {
        setMyPlayer(current);
      }
    }
  }

  async function startMultiplayerGame() {
    if (!lobby || !isHost) return;

    const loadedQuestions = await loadQuestionsByIds(lobby.question_ids);
    if (loadedQuestions.length < 10) return;

    await supabase
      .from("knowledge_arena_lobbies")
      .update({ status: "playing", started_at: new Date().toISOString() })
      .eq("id", lobby.id);

    await supabase
      .from("knowledge_arena_lobby_players")
      .update({ status: "playing" })
      .eq("lobby_id", lobby.id);

    setQuestions(loadedQuestions);
    resetQuestionState(lobby.timer_seconds);
    setStage("multiplayer-quiz");
    await loadLobbyState(lobby.id);
  }

  async function prepareMultiplayerGame(nextLobby: Lobby) {
    const loadedQuestions = await loadQuestionsByIds(nextLobby.question_ids);
    if (loadedQuestions.length < 10) return;

    setQuestions(loadedQuestions);
    setSelectedTopic(nextLobby.topic);
    resetQuestionState(nextLobby.timer_seconds);
    setStage("multiplayer-quiz");
  }

  function resetQuestionState(timerSeconds: TimerSeconds = activeTimerSeconds) {
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(timerSeconds);
    setAnswerLocked(false);
    setFeedback(null);
    setNextCountdown(3);
    setTokensEarned(0);
    setRewardSaved(false);
    setAttemptSaveMessage("");
    recordedAnswersRef.current = [];
    attemptSaveStartedRef.current = false;
  }

  function getRecordedAttemptSummary() {
    return recordedAnswersRef.current.reduce(
      (summary, answer) => ({
        score: summary.score + answer.points,
        correctCount: summary.correctCount + (answer.correct ? 1 : 0),
      }),
      { score: 0, correctCount: 0 }
    );
  }

  async function loadKnowledgeProfileAfterSave() {
    const { data, error } = await supabase.rpc("get_knowledge_arena_profile");

    if (error) {
      console.warn(
        "Knowledge Arena attempt saved, but the updated Knowledge Profile could not be loaded:",
        error
      );
      return null;
    }

    const nextProfile = (data ?? null) as KnowledgeArenaProfile | null;

    if (nextProfile) {
      setKnowledgeProfile(nextProfile);
      setProfileAfterAttempt(nextProfile);
    }

    return nextProfile;
  }

  async function saveKnowledgeArenaAttempt(
    mode: "solo" | "multiplayer"
  ): Promise<SavedArenaAttempt | null> {
    const challengeMode: ChallengeMode =
      mode === "multiplayer" ? "quick_play" : selectedChallengeMode;
    const attemptTopic =
      challengeMode === "nova_challenge" ? "mixed" : selectedTopic;

    if (!userId || !attemptTopic) {
      setAttemptSaveMessage(
        mode === "solo"
          ? "Log in to save this attempt and receive Dreamscape Tokens."
          : "This multiplayer attempt could not be linked to an account."
      );
      return null;
    }

    if (recordedAnswersRef.current.length !== questions.length) {
      setAttemptSaveMessage(
        "The quiz finished, but not all answer records were available to save."
      );
      return null;
    }

    const answerPayload = recordedAnswersRef.current.map((answer) => ({
      question_id: answer.question_id,
      answer: answer.answer,
      seconds_used: answer.seconds_used,
    }));

    const selectionContext =
      mode === "solo"
        ? {
            source: "knowledge_arena_phase2B",
            selected_topic: selectedTopic,
            challenge_plan: activeChallengePlan,
            profile_overall_mastery_before:
              profileAtChallengeStart?.overall_mastery ?? null,
          }
        : {
            source: "knowledge_arena_phase2B",
            selected_topic: selectedTopic,
            lobby_id: lobby?.id ?? null,
          };

    setAttemptSaveMessage("Saving your attempt and all 10 answer records…");

    const { data, error } = await supabase.rpc(
      "save_knowledge_arena_attempt_v3",
      {
        p_topic: attemptTopic,
        p_mode: mode,
        p_answers: answerPayload,
        p_timer_seconds: activeTimerSeconds,
        p_challenge_mode: challengeMode,
        p_selection_context: selectionContext,
      }
    );

    if (error) {
      console.error("Could not save Knowledge Arena attempt:", error);
      setAttemptSaveMessage(
        `The quiz was completed, but the server could not save it: ${error.message}`
      );
      setRewardSaved(false);
      return null;
    }

    const saved = (data ?? {}) as SavedArenaAttempt;
    const attemptId = String(saved.attempt_id ?? "");

    if (!attemptId) {
      console.error("Knowledge Arena save RPC returned no attempt ID:", data);
      setAttemptSaveMessage(
        "The server responded, but did not return a saved attempt ID. The result has not been marked as saved."
      );
      setRewardSaved(false);
      return null;
    }

    // Confirm the parent attempt and all answer snapshots actually exist before
    // telling the learner that the quiz was saved.
    const { data: receiptData, error: receiptError } = await supabase.rpc(
      "get_my_knowledge_arena_attempt_receipt",
      { p_attempt_id: attemptId }
    );

    if (receiptError) {
      console.error("Could not verify Knowledge Arena save receipt:", receiptError);
      setAttemptSaveMessage(
        "The server created an attempt ID, but the saved record could not be verified. Please do not rely on this result yet."
      );
      setRewardSaved(false);
      return saved;
    }

    const receipt = (receiptData ?? {}) as KnowledgeArenaAttemptReceipt;

    if (
      !receipt.attempt_saved ||
      Number(receipt.answer_rows ?? 0) !== questions.length
    ) {
      console.error("Knowledge Arena save receipt is incomplete:", receipt);
      setAttemptSaveMessage(
        `Save verification failed: ${Number(receipt.answer_rows ?? 0)}/${questions.length} answer records were found.`
      );
      setRewardSaved(false);
      return saved;
    }

    const savedScore = Number(receipt.score ?? saved.score ?? 0);
    const savedCorrectCount = Number(
      receipt.correct_count ?? saved.correct_count ?? 0
    );
    const savedReward = Number(
      receipt.tokens_earned ?? saved.tokens_earned ?? 0
    );

    setScore(savedScore);
    setCorrectCount(savedCorrectCount);
    setTokensEarned(savedReward);
    setRewardSaved(true);
    setLastTopicResults(
      Array.isArray(saved.topic_results) ? saved.topic_results : []
    );

    if (mode === "solo" && savedReward > 0) {
      setTokenBalance((current) => current + savedReward);
      window.dispatchEvent(new Event("dream-tokens-updated"));
    }

    setAttemptSaveMessage(
      `Saved. ${receipt.answer_rows}/10 answers are recorded. Updating your Knowledge Profile…`
    );

    // Nova's full mastery processor is queue-based. Do not run the expensive
    // mastery recalculation inside the browser request. The database queues it
    // after the canonical attempt is committed, while this lightweight RPC
    // immediately exposes the newly saved attempt as real evidence.
    const updatedProfile = await loadKnowledgeProfileAfterSave();

    if (updatedProfile?.mastery_refresh_pending) {
      setAttemptSaveMessage(
        "Saved. All 10 answers are recorded. Nova has queued your mastery recalculation."
      );
    } else if (updatedProfile) {
      setAttemptSaveMessage(
        "Saved. All 10 answers are recorded and your Knowledge Profile now includes this attempt."
      );
    } else {
      setAttemptSaveMessage(
        "Saved. All 10 answers are recorded. Your Knowledge Profile will update automatically."
      );
    }

    window.dispatchEvent(new Event("nova-analytics-updated"));

    return saved;
  }

  async function lockAnswer(answer: KnowledgeArenaAnswer | null) {
    if (!currentQuestion || answerLocked) return;

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = calculatePoints(isCorrect, timeLeft, activeTimerSeconds);
    const secondsUsed = activeTimerSeconds - timeLeft;
    const nextScore = score + points;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);

    setSelectedAnswer(answer);
    setScore(nextScore);
    setCorrectCount(nextCorrectCount);
    setFeedback(
      answer === null
        ? `Time's up. The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`
        : isCorrect
        ? `Correct! +${points} points. ${currentQuestion.explanation}`
        : `Not quite. The correct answer is ${currentQuestion.correct_answer}. ${currentQuestion.explanation}`
    );
    setAnswerLocked(true);

    const recordedAnswer: RecordedArenaAnswer = {
      question_id: currentQuestion.id,
      answer,
      seconds_used: secondsUsed,
      correct: isCorrect,
      points,
    };

    recordedAnswersRef.current = [
      ...recordedAnswersRef.current.filter(
        (savedAnswer) => savedAnswer.question_id !== currentQuestion.id
      ),
      recordedAnswer,
    ];

    if (stage === "multiplayer-quiz" && myPlayer) {
      const existingAnswers = Array.isArray(myPlayer.answers) ? myPlayer.answers : [];
      const nextAnswers = [
        ...existingAnswers.filter(
          (savedAnswer) => savedAnswer.questionId !== currentQuestion.id
        ),
        {
          questionId: currentQuestion.id,
          answer,
          correct: isCorrect,
          points,
          secondsUsed,
        },
      ];

      await supabase
        .from("knowledge_arena_lobby_players")
        .update({
          score: nextScore,
          correct_count: nextCorrectCount,
          answers: nextAnswers,
        })
        .eq("id", myPlayer.id);

      setMyPlayer({
        ...myPlayer,
        score: nextScore,
        correct_count: nextCorrectCount,
        answers: nextAnswers,
      });

      if (lobby) {
        await loadLobbyState(lobby.id);
      }
    }
  }

  async function nextQuestion() {
    if (questionIndex >= questions.length - 1) {
      if (stage === "solo-quiz") {
        await finishSoloQuiz();
      } else {
        await finishMultiplayerQuiz();
      }

      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setTimeLeft(activeTimerSeconds);
    setNextCountdown(3);
    setAnswerLocked(false);
    setFeedback(null);
  }

  async function finishSoloQuiz() {
    if (attemptSaveStartedRef.current) return;
    attemptSaveStartedRef.current = true;

    const localSummary = getRecordedAttemptSummary();
    const localReward = calculateTokenReward(
      localSummary.score,
      localSummary.correctCount
    );

    setScore(localSummary.score);
    setCorrectCount(localSummary.correctCount);
    setTokensEarned(localReward);
    setRewardSaved(false);
    setAttemptSaveMessage(
      userId
        ? "Saving your attempt and refreshing Nova Analytics…"
        : "Log in to save this attempt and receive Dreamscape Tokens."
    );
    setStage("solo-results");

    await saveKnowledgeArenaAttempt("solo");
  }

  async function finishMultiplayerQuiz() {
    if (attemptSaveStartedRef.current) return;
    attemptSaveStartedRef.current = true;

    const localSummary = getRecordedAttemptSummary();
    setScore(localSummary.score);
    setCorrectCount(localSummary.correctCount);
    setStage("multiplayer-results");

    await saveKnowledgeArenaAttempt("multiplayer");

    if (myPlayer) {
      await supabase
        .from("knowledge_arena_lobby_players")
        .update({ status: "finished" })
        .eq("id", myPlayer.id);
    }

    if (lobby) {
      await loadLobbyState(lobby.id);
    }
  }

  async function endLobby() {
    if (!lobby || !isHost) return;

    await supabase
      .from("knowledge_arena_lobbies")
      .update({ status: "finished" })
      .eq("id", lobby.id);

    await loadLobbyState(lobby.id);
  }

  function rememberNovaGuideSeen() {
    try {
      window.localStorage.setItem("nova-knowledge-arena-guide-seen-v1", "1");
    } catch {
      // Storage is optional.
    }
  }

  function openNovaGuide() {
    if (!novaGuideOpen) {
      novaGuideReturnState.current = {
        stage,
        selectedTopic,
        selectedChallengeMode,
      };
    }

    setNovaGuideStep(0);
    setNovaGuideOpen(true);
  }

  function closeNovaGuide() {
    rememberNovaGuideSeen();
    setNovaGuideOpen(false);
    setNovaGuideTargetRect(null);

    const returnState = novaGuideReturnState.current;
    if (returnState) {
      setStage(returnState.stage);
      setSelectedTopic(returnState.selectedTopic);
      setSelectedChallengeMode(returnState.selectedChallengeMode);
    }

    novaGuideReturnState.current = null;
  }

  function resetAll() {
    setStage("mode");
    setSelectedTopic("world_explorer");
    setQuestions([]);
    setLobby(null);
    setPlayers([]);
    setMyPlayer(null);
    setJoinCode("");
    setMultiplayerMessage("");
    setLoadError(null);
    setSelectedChallengeMode("quick_play");
    setSoloTimerSeconds(20);
    setLobbyTimerSecondsChoice(20);
    setActiveChallengePlan(null);
    setProfileAtChallengeStart(null);
    setProfileAfterAttempt(null);
    setLastTopicResults([]);
    resetQuestionState(20);
  }

  function getAnswerStyle(label: KnowledgeArenaAnswer): CSSProperties {
    const isCorrectChoice = currentQuestion?.correct_answer === label;
    const isWrongSelected =
      selectedAnswer === label && answerLocked && !isCorrectChoice;
    const isCorrectSelected =
      selectedAnswer === label && answerLocked && isCorrectChoice;

    if (isCorrectSelected) {
      return {
        border: "1px solid rgba(74,222,128,0.9)",
        background:
          "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))",
        color: "white",
      };
    }

    if (isWrongSelected) {
      return {
        border: "1px solid rgba(248,113,113,0.9)",
        background:
          "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))",
        color: "white",
      };
    }

    return {
      border: "1px solid rgba(126,232,255,0.28)",
      background:
        selectedAnswer === label
          ? "linear-gradient(135deg,#35c5ff,#4c6dff)"
          : "rgba(255,255,255,0.08)",
      color: answerLocked ? "rgba(255,255,255,0.6)" : "white",
    };
  }


  const hideHero = [
    "loading",
    "solo-quiz",
    "solo-results",
    "waiting-lobby",
    "multiplayer-quiz",
    "multiplayer-results",
  ].includes(stage);

  const multiplayerStage = [
    "multiplayer-menu",
    "create-lobby",
    "join-lobby",
    "waiting-lobby",
    "multiplayer-quiz",
    "multiplayer-results",
  ].includes(stage);

  const headerMode =
    stage === "mode" ? "Choose" : multiplayerStage ? "Multiplayer" : "Single";

  const headerTimer =
    stage === "solo-quiz" || stage === "solo-results"
      ? activeTimerSeconds
      : multiplayerStage
      ? lobby?.timer_seconds ?? lobbyTimerSecondsChoice
      : soloTimerSeconds;

  const focusTopic =
    knowledgeProfile?.recommended_topic ?? selectedTopic ?? "world_explorer";

  const displayedSelectedTopic =
    selectedChallengeMode === "focus_mission"
      ? focusTopic
      : selectedChallengeMode === "nova_challenge"
      ? null
      : selectedTopic;

  const personalisedMode =
    selectedChallengeMode === "focus_mission" ||
    selectedChallengeMode === "nova_challenge";

  const soloStartDisabled =
    (personalisedMode && !userId) ||
    ((selectedChallengeMode === "quick_play" ||
      selectedChallengeMode === "expert_challenge") &&
      !selectedTopic);

  const novaGuidePanelPosition = (() => {
    const margin = 12;
    const gap = 16;
    const viewportWidth = Math.max(320, novaGuideViewport.width);
    const viewportHeight = Math.max(320, novaGuideViewport.height);
    const panelWidth = Math.min(
      novaGuidePanelSize.width || 420,
      viewportWidth - margin * 2
    );
    const panelHeight = Math.min(
      novaGuidePanelSize.height || 390,
      viewportHeight - margin * 2
    );
    const target = novaGuideTargetRect;

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), Math.max(min, max));

    if (!target) {
      return {
        left: viewportWidth - panelWidth - margin,
        top: viewportHeight - panelHeight - margin,
        width: panelWidth,
        maxHeight: viewportHeight - margin * 2,
      };
    }

    const canFitRight =
      viewportWidth - target.right >= panelWidth + gap + margin;
    const canFitLeft = target.left >= panelWidth + gap + margin;
    const canFitBelow =
      viewportHeight - target.bottom >= panelHeight + gap + margin;
    const canFitAbove = target.top >= panelHeight + gap + margin;

    if (canFitRight) {
      return {
        left: target.right + gap,
        top: clamp(
          target.top + target.height / 2 - panelHeight / 2,
          margin,
          viewportHeight - panelHeight - margin
        ),
        width: panelWidth,
        maxHeight: viewportHeight - margin * 2,
      };
    }

    if (canFitLeft) {
      return {
        left: target.left - panelWidth - gap,
        top: clamp(
          target.top + target.height / 2 - panelHeight / 2,
          margin,
          viewportHeight - panelHeight - margin
        ),
        width: panelWidth,
        maxHeight: viewportHeight - margin * 2,
      };
    }

    if (canFitBelow) {
      return {
        left: clamp(
          target.left + target.width / 2 - panelWidth / 2,
          margin,
          viewportWidth - panelWidth - margin
        ),
        top: target.bottom + gap,
        width: panelWidth,
        maxHeight: Math.max(
          150,
          viewportHeight - target.bottom - gap - margin
        ),
      };
    }

    if (canFitAbove) {
      return {
        left: clamp(
          target.left + target.width / 2 - panelWidth / 2,
          margin,
          viewportWidth - panelWidth - margin
        ),
        top: Math.max(margin, target.top - panelHeight - gap),
        width: panelWidth,
        maxHeight: Math.max(150, target.top - gap - margin),
      };
    }

    const spaceAbove = Math.max(0, target.top - gap - margin);
    const spaceBelow = Math.max(
      0,
      viewportHeight - target.bottom - gap - margin
    );
    const useBelow = spaceBelow >= spaceAbove;
    const availableHeight = Math.max(150, useBelow ? spaceBelow : spaceAbove);

    return {
      left: clamp(
        target.left + target.width / 2 - panelWidth / 2,
        margin,
        viewportWidth - panelWidth - margin
      ),
      top: useBelow
        ? target.bottom + gap
        : Math.max(margin, target.top - gap - Math.min(panelHeight, availableHeight)),
      width: panelWidth,
      maxHeight: availableHeight,
    };
  })();

  return (
    <main
      className={`ka-page ${hideHero ? "ka-page--hero-hidden" : ""}`}
      style={{
        backgroundImage: `
          linear-gradient(180deg, rgba(2,8,19,0.72), rgba(2,8,19,0.91)),
          radial-gradient(circle at 48% 0%, rgba(83,215,255,0.14), transparent 36%),
          url("/activities/learning-missions/knowledge-arena/knowledge-arena-bg.png")
        `,
      }}
    >
      <header className="ka-topbar">
        <div className="ka-top-left">
          <Link href="/learning-missions" className="ka-nav-button ka-back-button">
            <span className="ka-back-full">← Back to Learning Missions</span>
            <span className="ka-back-short">← Missions</span>
          </Link>

          <button
            type="button"
            onClick={openNovaGuide}
            className="ka-guide-launcher"
            aria-label="Open Nova Guide"
          >
            <span className="ka-guide-mark">✦</span>
            <span className="ka-guide-copy">
              <strong>Nova Guide</strong>
              <small>How Knowledge Arena works</small>
            </span>
          </button>
        </div>

        <div className="ka-top-actions">
          <Link href={userEmail ? "/profile" : "/login"} className="ka-nav-button">
            {userEmail ? "My Account" : "Log In"}
          </Link>
          <span className="ka-nav-button">✦ Tokens {tokenBalance}</span>
        </div>
      </header>

      {!hideHero && (
        <section className="ka-hero">
          <div className="ka-hero-heading">
            <p>Learning Missions</p>
            <h1>Knowledge Arena</h1>
          </div>

          <p className="ka-hero-copy">
            Choose a knowledge world, set your pace, and take on a 10-question challenge.
          </p>

          <div className="ka-hero-stats">
            <div>
              <span>Mode</span>
              <strong>{headerMode}</strong>
            </div>
            <div>
              <span>Points</span>
              <strong>{score}</strong>
            </div>
            <div className="is-timer">
              <span>Timer</span>
              <strong>{headerTimer}s/question</strong>
            </div>
          </div>
        </section>
      )}

      <section className="ka-viewport">
        <div className="ka-stage-shell">
          {stage === "mode" && (
            <div className="ka-stage ka-mode-stage">
              <div className="ka-stage-heading">
                <div>
                  <p className="ka-kicker">Choose Mode</p>
                  <h2>How do you want to play?</h2>
                </div>
                <p>Solo challenges use Nova mastery. Multiplayer shares one world and timer.</p>
              </div>

              <div
                className="ka-mode-grid"
                data-nova-guide-target="play-mode"
              >
                <button
                  type="button"
                  className="ka-mode-card is-single"
                  onClick={() => setStage("solo-mode")}
                >
                  <span className="ka-mode-icon">⚡</span>
                  <span className="ka-mode-copy">
                    <small>Personal challenge</small>
                    <strong>Single Player</strong>
                    <span>
                      Choose a world, timer and challenge type on one screen.
                    </span>
                  </span>
                  <span className="ka-mode-action">Start Solo →</span>
                </button>

                <button
                  type="button"
                  className="ka-mode-card is-multi"
                  onClick={() => setStage("multiplayer-menu")}
                  data-nova-guide-target="multiplayer-mode"
                >
                  <span className="ka-mode-icon">◈</span>
                  <span className="ka-mode-copy">
                    <small>Shared arena</small>
                    <strong>Multiplayer</strong>
                    <span>
                      Create or join a lobby and answer the same 10 questions.
                    </span>
                  </span>
                  <span className="ka-mode-action">Enter Multiplayer →</span>
                </button>
              </div>

              <div className="ka-mode-footer">
                <span>20s default</span>
                <span>10 questions</span>
                <span>100-point maximum per correct answer</span>
              </div>
            </div>
          )}

          {(stage === "solo-mode" || stage === "topic") && (
            <div className="ka-stage ka-solo-setup">
              <div className="ka-stage-toolbar">
                <button
                  type="button"
                  className="ka-inline-back"
                  onClick={() => setStage("mode")}
                >
                  ← Back
                </button>
                <div>
                  <p className="ka-kicker">Single Player</p>
                  <strong>Build your challenge</strong>
                </div>
              </div>

              <KnowledgeProfileStrip
                profile={knowledgeProfile}
                loading={profileLoading}
                error={profileError}
              />

              <div className="ka-setup-section">
                <div className="ka-setup-label-row">
                  <div>
                    <span>Choose World</span>
                    <small>
                      {selectedChallengeMode === "nova_challenge"
                        ? "Nova Challenge mixes all four worlds."
                        : selectedChallengeMode === "focus_mission"
                        ? `Nova focus: ${topicTitle(focusTopic)}`
                        : "Select the world you want to play."}
                    </small>
                  </div>
                </div>

                <ArenaWorldGrid
                  profile={knowledgeProfile}
                  selectedTopic={displayedSelectedTopic}
                  mixed={selectedChallengeMode === "nova_challenge"}
                  focusTopic={
                    selectedChallengeMode === "focus_mission"
                      ? focusTopic
                      : null
                  }
                  onSelect={(topic) => {
                    if (
                      selectedChallengeMode !== "focus_mission" &&
                      selectedChallengeMode !== "nova_challenge"
                    ) {
                      setSelectedTopic(topic);
                    }
                  }}
                  locked={
                    selectedChallengeMode === "focus_mission" ||
                    selectedChallengeMode === "nova_challenge"
                  }
                />
              </div>

              <div className="ka-setup-lower">
                <div data-nova-guide-target="timer">
                  <ArenaTimerSelector
                    title="Question Timer"
                    value={soloTimerSeconds}
                    onChange={setSoloTimerSeconds}
                  />
                </div>

                <ArenaChallengeGrid
                  profile={knowledgeProfile}
                  isSignedIn={Boolean(userId)}
                  selectedMode={selectedChallengeMode}
                  onSelect={chooseSoloChallengeMode}
                />
              </div>

              {loadError && <p className="ka-error-banner">{loadError}</p>}

              <button
                type="button"
                className="ka-start-button"
                disabled={soloStartDisabled}
                onClick={startConfiguredSoloChallenge}
              >
                {selectedChallengeMode === "focus_mission" &&
                knowledgeProfile?.recommended_topic_title
                  ? `Start Focus Mission · ${knowledgeProfile.recommended_topic_title}`
                  : `Start ${challengeModeMeta[selectedChallengeMode].title}`}
              </button>
            </div>
          )}

          {stage === "multiplayer-menu" && (
            <div className="ka-stage ka-mode-stage">
              <div className="ka-stage-toolbar">
                <button
                  type="button"
                  className="ka-inline-back"
                  onClick={() => setStage("mode")}
                >
                  ← Back
                </button>
                <div>
                  <p className="ka-kicker">Multiplayer</p>
                  <strong>Create or join a shared arena</strong>
                </div>
              </div>

              <div className="ka-mode-grid">
                <button
                  type="button"
                  className="ka-mode-card is-single"
                  onClick={() => setStage("create-lobby")}
                >
                  <span className="ka-mode-icon">⌁</span>
                  <span className="ka-mode-copy">
                    <small>Host</small>
                    <strong>Create Lobby</strong>
                    <span>Choose a world and timer, then share the code.</span>
                  </span>
                  <span className="ka-mode-action">Create →</span>
                </button>

                <button
                  type="button"
                  className="ka-mode-card is-multi"
                  onClick={() => setStage("join-lobby")}
                >
                  <span className="ka-mode-icon">⌘</span>
                  <span className="ka-mode-copy">
                    <small>Player</small>
                    <strong>Join Lobby</strong>
                    <span>Enter the six-character code from your host.</span>
                  </span>
                  <span className="ka-mode-action">Join →</span>
                </button>
              </div>

              {!userId && (
                <p className="ka-error-banner">
                  Log in before creating or joining a multiplayer lobby.
                </p>
              )}
            </div>
          )}

          {stage === "create-lobby" && (
            <div className="ka-stage ka-create-stage">
              <div className="ka-stage-toolbar">
                <button
                  type="button"
                  className="ka-inline-back"
                  onClick={() => setStage("multiplayer-menu")}
                >
                  ← Back
                </button>
                <div>
                  <p className="ka-kicker">Create Lobby</p>
                  <strong>Host settings</strong>
                </div>
              </div>

              <div className="ka-create-controls">
                <label className="ka-field">
                  <span>Player Name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Enter your player name"
                  />
                </label>

                <ArenaTimerSelector
                  title="Lobby Timer"
                  value={lobbyTimerSecondsChoice}
                  onChange={setLobbyTimerSecondsChoice}
                />
              </div>

              <div className="ka-setup-section ka-create-worlds">
                <div className="ka-setup-label-row">
                  <div>
                    <span>Choose World</span>
                    <small>The host chooses one shared world for everyone.</small>
                  </div>
                </div>
                <ArenaWorldGrid
                  profile={knowledgeProfile}
                  selectedTopic={selectedTopic}
                  mixed={false}
                  focusTopic={null}
                  onSelect={setSelectedTopic}
                  locked={false}
                />
              </div>

              {(loadError || multiplayerMessage) && (
                <p className="ka-error-banner">
                  {loadError || multiplayerMessage}
                </p>
              )}

              <button
                type="button"
                className="ka-start-button"
                disabled={isCreatingLobby || !selectedTopic}
                onClick={() =>
                  selectedTopic && void createLobby(selectedTopic)
                }
              >
                {isCreatingLobby ? "Creating Lobby…" : "Create Lobby"}
              </button>
            </div>
          )}

          {stage === "join-lobby" && (
            <div className="ka-stage ka-form-stage">
              <div className="ka-stage-toolbar">
                <button
                  type="button"
                  className="ka-inline-back"
                  onClick={() => setStage("multiplayer-menu")}
                >
                  ← Back
                </button>
                <div>
                  <p className="ka-kicker">Join Lobby</p>
                  <strong>Enter your lobby details</strong>
                </div>
              </div>

              <div className="ka-form-card">
                <label className="ka-field">
                  <span>Player Name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Enter your player name"
                  />
                </label>

                <label className="ka-field">
                  <span>Lobby Code</span>
                  <input
                    className="ka-code-input"
                    value={joinCode}
                    onChange={(event) =>
                      setJoinCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                      )
                    }
                    placeholder="ABC123"
                    maxLength={6}
                  />
                </label>

                {multiplayerMessage && (
                  <p className="ka-error-banner">{multiplayerMessage}</p>
                )}

                <button
                  type="button"
                  className="ka-start-button"
                  disabled={isJoiningLobby}
                  onClick={() => void joinLobby()}
                >
                  {isJoiningLobby ? "Joining…" : "Join Lobby"}
                </button>
              </div>
            </div>
          )}

          {stage === "waiting-lobby" && lobby && (
            <div className="ka-stage ka-waiting-stage">
              <div className="ka-stage-toolbar">
                <button
                  type="button"
                  className="ka-inline-back"
                  onClick={resetAll}
                >
                  ← Leave lobby
                </button>
                <div>
                  <p className="ka-kicker">Waiting Room</p>
                  <strong>{topicTitle(lobby.topic)}</strong>
                </div>
              </div>

              <div className="ka-waiting-layout">
                <div className="ka-lobby-code-card">
                  <span>Lobby Code</span>
                  <strong>{lobby.code}</strong>
                  <small>{lobby.timer_seconds}s per question</small>
                </div>

                <div className="ka-player-panel">
                  <div className="ka-panel-heading">
                    <span>Players</span>
                    <strong>{players.length}</strong>
                  </div>
                  <div className="ka-player-scroll">
                    {players.map((player) => (
                      <div key={player.id} className="ka-player-row">
                        <strong>{player.display_name}</strong>
                        <span>{player.is_host ? "Host" : "Player"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {multiplayerMessage && (
                <p className="ka-error-banner">{multiplayerMessage}</p>
              )}

              {isHost ? (
                <button
                  type="button"
                  className="ka-start-button"
                  onClick={() => void startMultiplayerGame()}
                >
                  Start Game
                </button>
              ) : (
                <div className="ka-waiting-message">
                  Waiting for the host to start the game.
                </div>
              )}
            </div>
          )}

          {stage === "loading" && (
            <div className="ka-stage ka-loading-stage">
              <div className="ka-loader-orb">✦</div>
              <p className="ka-kicker">Nova is preparing your challenge</p>
              <h2>{loadingMessage}</h2>
            </div>
          )}

          {(stage === "solo-quiz" || stage === "multiplayer-quiz") &&
            currentQuestion && (
              <ArenaQuizView
                isSolo={stage === "solo-quiz"}
                topicTitle={
                  (currentQuestionTopicInfo || selectedTopicInfo)?.title ||
                  "Knowledge Arena"
                }
                challengeLabel={
                  stage === "solo-quiz"
                    ? challengeModeMeta[selectedChallengeMode].title
                    : "Multiplayer"
                }
                question={currentQuestion}
                questionIndex={questionIndex}
                score={score}
                correctCount={correctCount}
                timeLeft={timeLeft}
                timerSeconds={activeTimerSeconds}
                nextCountdown={nextCountdown}
                answerLocked={answerLocked}
                selectedAnswer={selectedAnswer}
                feedback={feedback}
                getAnswerStyle={getAnswerStyle}
                onChoose={(answer) => void lockAnswer(answer)}
                onNext={() => void nextQuestion()}
                onBack={
                  stage === "solo-quiz"
                    ? () => setStage("solo-mode")
                    : resetAll
                }
              />
            )}

          {stage === "solo-results" && (
            <ArenaResultsPanel
              challengeMode={selectedChallengeMode}
              score={score}
              correctCount={correctCount}
              tokensEarned={tokensEarned}
              tokenBalance={tokenBalance}
              rewardSaved={rewardSaved}
              saveMessage={attemptSaveMessage}
              isAuthenticated={Boolean(userId)}
              beforeProfile={profileAtChallengeStart}
              afterProfile={profileAfterAttempt}
              topicResults={lastTopicResults}
              questions={questions}
              answers={recordedAnswersRef.current}
              onStartFocus={startFocusFromResults}
              onNextChallenge={() => setStage("solo-mode")}
              onExit={resetAll}
            />
          )}

          {stage === "multiplayer-results" && (
            <div className="ka-stage ka-multi-results">
              <div className="ka-results-heading">
                <div>
                  <p className="ka-kicker">Multiplayer Complete</p>
                  <h2>Leaderboard</h2>
                </div>
                <div className="ka-result-score">
                  <span>Your score</span>
                  <strong>{score}</strong>
                </div>
              </div>

              {attemptSaveMessage && (
                <p className="ka-message-banner">{attemptSaveMessage}</p>
              )}

              <ArenaQuestionReviewPanel
                questions={questions}
                answers={recordedAnswersRef.current}
                compact
              />

              <div className="ka-leaderboard-scroll">
                {leaderboard.map((player, index) => (
                  <div key={player.id} className="ka-leaderboard-row">
                    <strong>
                      #{index + 1} {player.display_name}
                    </strong>
                    <span>
                      {player.score} pts · {player.correct_count}/10
                    </span>
                  </div>
                ))}
              </div>

              <div className="ka-results-actions">
                {isHost && lobby?.status !== "finished" && (
                  <button
                    type="button"
                    className="ka-secondary-button"
                    onClick={() => void endLobby()}
                  >
                    End Lobby
                  </button>
                )}
                <button
                  type="button"
                  className="ka-start-button"
                  onClick={resetAll}
                >
                  Back to Mode Select
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {novaGuideOpen && (
        <div className="ka-guide-layer" role="presentation">
          <button
            type="button"
            className="ka-guide-backdrop"
            aria-label="Close Nova Guide"
            onClick={closeNovaGuide}
          />

          {novaGuideTargetRect && (
            <div
              className="ka-guide-spotlight"
              aria-hidden="true"
              style={{
                top: Math.max(5, novaGuideTargetRect.top - 7),
                left: Math.max(5, novaGuideTargetRect.left - 7),
                width: Math.min(
                  novaGuideViewport.width -
                    Math.max(5, novaGuideTargetRect.left - 7) -
                    5,
                  novaGuideTargetRect.width + 14
                ),
                height: Math.min(
                  novaGuideViewport.height -
                    Math.max(5, novaGuideTargetRect.top - 7) -
                    5,
                  novaGuideTargetRect.height + 14
                ),
              }}
            />
          )}

          <aside
            ref={novaGuidePanelRef}
            className={`ka-guide-panel ${novaGuideStep <= 1 ? "is-no-scroll" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Nova Knowledge Arena guide"
            style={{
              left: novaGuidePanelPosition.left,
              top: novaGuidePanelPosition.top,
              width: novaGuidePanelPosition.width,
              maxHeight: novaGuidePanelPosition.maxHeight,
            }}
          >
            <div className="ka-guide-topline">
              <div className="ka-guide-identity">
                <span className="ka-guide-avatar">✦</span>
                <span>
                  <small>Nova Guide</small>
                  <strong>Knowledge Arena walkthrough</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={closeNovaGuide}
                className="ka-guide-close"
                aria-label="Close guide"
              >
                ×
              </button>
            </div>

            <div className="ka-guide-progress">
              {NOVA_GUIDE_STEPS.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setNovaGuideStep(index)}
                  className={
                    index === novaGuideStep
                      ? "is-active"
                      : index < novaGuideStep
                      ? "is-complete"
                      : ""
                  }
                  aria-label={`Guide step ${index + 1}: ${step.title}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="ka-guide-body">
              <p className="ka-guide-eyebrow">
                {NOVA_GUIDE_STEPS[novaGuideStep].eyebrow}
              </p>
              <h2>{NOVA_GUIDE_STEPS[novaGuideStep].title}</h2>
              <p className="ka-guide-description">
                {NOVA_GUIDE_STEPS[novaGuideStep].description}
              </p>
              <div className="ka-guide-tip">
                <span>◎</span>
                <p>{NOVA_GUIDE_STEPS[novaGuideStep].detail}</p>
              </div>
            </div>

            <div className="ka-guide-actions">
              <button
                type="button"
                className="ka-guide-secondary"
                disabled={novaGuideStep === 0}
                onClick={() =>
                  setNovaGuideStep((current) => Math.max(0, current - 1))
                }
              >
                Back
              </button>

              <span>
                {novaGuideStep + 1} / {NOVA_GUIDE_STEPS.length}
              </span>

              {novaGuideStep < NOVA_GUIDE_STEPS.length - 1 ? (
                <button
                  type="button"
                  className="ka-guide-primary"
                  onClick={() =>
                    setNovaGuideStep((current) =>
                      Math.min(NOVA_GUIDE_STEPS.length - 1, current + 1)
                    )
                  }
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="ka-guide-primary"
                  onClick={closeNovaGuide}
                >
                  Got it
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <style jsx global>{`
        html,
        body {
          overscroll-behavior: none;
        }

        .ka-page {
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
          background-size: cover;
          background-position: center;
          color: white;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .ka-topbar {
          position: relative;
          z-index: 20;
          display: flex;
          min-height: 48px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: max(6px, env(safe-area-inset-top))
            max(14px, env(safe-area-inset-right)) 6px
            max(14px, env(safe-area-inset-left));
        }

        .ka-top-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .ka-nav-button {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(126, 232, 255, 0.22);
          border-radius: 999px;
          background: rgba(5, 13, 28, 0.76);
          padding: 0 14px;
          color: white;
          font-size: 11px;
          font-weight: 850;
          text-decoration: none;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(16px);
        }

        .ka-back-short {
          display: none;
        }

        .ka-hero {
          display: flex;
          min-height: 72px;
          flex: 0 0 auto;
          align-items: center;
          gap: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.035);
          border-bottom: 1px solid rgba(126, 232, 255, 0.11);
          background: linear-gradient(
            90deg,
            rgba(53, 197, 255, 0.095),
            rgba(76, 109, 255, 0.045) 56%,
            transparent
          );
          padding: 9px max(18px, env(safe-area-inset-right)) 9px
            max(18px, env(safe-area-inset-left));
        }

        .ka-hero-heading {
          display: flex;
          min-width: max-content;
          align-items: baseline;
          gap: 12px;
        }

        .ka-hero-heading p,
        .ka-kicker {
          margin: 0;
          color: #7ee8ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .ka-hero-heading h1 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(31px, 3.8vw, 48px);
          font-weight: 400;
          line-height: 0.95;
        }

        .ka-hero-copy {
          max-width: 360px;
          flex: 1 1 320px;
          margin: 0;
          color: rgba(255, 255, 255, 0.65);
          font-size: 11px;
          line-height: 1.4;
        }

        .ka-hero-stats {
          display: grid;
          width: min(370px, 36vw);
          flex: 0 1 370px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin-left: auto;
        }

        .ka-hero-stats > div {
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.055);
          padding: 7px 9px;
        }

        .ka-hero-stats > div.is-timer {
          border-color: rgba(126, 232, 255, 0.2);
          background: rgba(126, 232, 255, 0.075);
        }

        .ka-hero-stats span {
          display: block;
          color: rgba(255, 255, 255, 0.38);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ka-hero-stats strong {
          display: block;
          margin-top: 2px;
          overflow: hidden;
          color: white;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ka-viewport {
          min-height: 0;
          flex: 1 1 0;
          overflow: hidden;
          padding: 7px max(12px, env(safe-area-inset-right))
            max(9px, env(safe-area-inset-bottom))
            max(12px, env(safe-area-inset-left));
        }

        .ka-stage-shell {
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }

        .ka-stage {
          display: flex;
          width: 100%;
          height: 100%;
          min-height: 0;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(126, 232, 255, 0.11);
          border-radius: 18px;
          background: rgba(6, 16, 37, 0.44);
          padding: 13px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(6px);
        }

        .ka-stage-heading,
        .ka-stage-toolbar,
        .ka-results-heading {
          display: flex;
          flex: 0 0 auto;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }

        .ka-stage-heading h2,
        .ka-results-heading h2 {
          margin: 4px 0 0;
          font-size: clamp(20px, 2.6vw, 29px);
          line-height: 1.05;
        }

        .ka-stage-heading > p {
          max-width: 470px;
          margin: 0;
          color: rgba(255, 255, 255, 0.48);
          font-size: 10px;
          line-height: 1.4;
          text-align: right;
        }

        .ka-stage-toolbar {
          align-items: center;
        }

        .ka-stage-toolbar > div {
          min-width: 0;
        }

        .ka-stage-toolbar > div > strong {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          font-size: 16px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ka-inline-back,
        .ka-secondary-button {
          min-height: 34px;
          flex: 0 0 auto;
          border: 1px solid rgba(126, 232, 255, 0.19);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.045);
          padding: 0 11px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
        }

        .ka-mode-grid {
          display: grid;
          min-height: 0;
          flex: 1 1 0;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        .ka-mode-card {
          position: relative;
          display: grid;
          min-height: 0;
          grid-template-columns: auto minmax(0, 1fr);
          grid-template-rows: 1fr auto;
          gap: 10px 13px;
          overflow: hidden;
          border: 1px solid rgba(126, 232, 255, 0.18);
          border-radius: 18px;
          background: linear-gradient(
            145deg,
            rgba(15, 42, 84, 0.78),
            rgba(4, 14, 35, 0.91)
          );
          padding: clamp(14px, 2.2vh, 22px);
          color: white;
          text-align: left;
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease;
        }

        .ka-mode-card.is-multi {
          border-color: rgba(201, 168, 255, 0.2);
          background: linear-gradient(
            145deg,
            rgba(45, 28, 85, 0.72),
            rgba(5, 13, 35, 0.92)
          );
        }

        .ka-mode-card:hover {
          transform: translateY(-2px);
          border-color: rgba(126, 232, 255, 0.42);
        }

        .ka-mode-icon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          align-self: start;
          border: 1px solid rgba(126, 232, 255, 0.24);
          border-radius: 13px;
          background: rgba(126, 232, 255, 0.08);
          color: #7ee8ff;
          font-size: 18px;
        }

        .ka-mode-card.is-multi .ka-mode-icon {
          border-color: rgba(201, 168, 255, 0.25);
          background: rgba(201, 168, 255, 0.09);
          color: #c9a8ff;
        }

        .ka-mode-copy {
          display: block;
          min-width: 0;
        }

        .ka-mode-copy small {
          display: block;
          color: #7ee8ff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .ka-mode-copy strong {
          display: block;
          margin-top: 5px;
          font-size: clamp(19px, 2.5vw, 28px);
          line-height: 1.05;
        }

        .ka-mode-copy > span {
          display: block;
          max-width: 38rem;
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 11px;
          line-height: 1.45;
        }

        .ka-mode-action {
          grid-column: 1 / -1;
          align-self: end;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 9px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-align: right;
          text-transform: uppercase;
        }

        .ka-mode-footer {
          display: flex;
          flex: 0 0 auto;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px 18px;
          margin-top: 9px;
          border: 1px solid rgba(126, 232, 255, 0.09);
          border-radius: 11px;
          background: rgba(126, 232, 255, 0.035);
          padding: 7px 10px;
          color: rgba(255, 255, 255, 0.43);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .ka-solo-setup,
        .ka-create-stage {
          gap: 7px;
        }

        .ka-profile-strip {
          display: grid;
          min-height: 50px;
          flex: 0 0 auto;
          grid-template-columns: auto repeat(4, minmax(0, 1fr)) minmax(160px, 1.35fr);
          align-items: stretch;
          gap: 5px;
          border: 1px solid rgba(201, 168, 255, 0.15);
          border-radius: 12px;
          background: rgba(201, 168, 255, 0.045);
          padding: 5px;
        }

        .ka-profile-overall,
        .ka-profile-world,
        .ka-profile-recommendation {
          display: grid;
          min-width: 0;
          align-content: center;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          padding: 5px 8px;
        }

        .ka-profile-overall {
          min-width: 92px;
          border: 1px solid rgba(126, 232, 255, 0.13);
        }

        .ka-profile-strip span,
        .ka-profile-strip small {
          overflow: hidden;
          color: rgba(255, 255, 255, 0.4);
          font-size: 7px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ka-profile-strip strong {
          overflow: hidden;
          margin-top: 2px;
          color: white;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ka-profile-overall strong {
          color: #7ee8ff;
          font-size: 18px;
        }

        .ka-profile-recommendation strong {
          color: #c9a8ff;
        }

        .ka-profile-recommendation a {
          margin-top: 2px;
          color: #7ee8ff;
          font-size: 7px;
          font-weight: 900;
          text-decoration: none;
        }

        .ka-setup-section {
          display: flex;
          min-height: 0;
          flex: 1 1 0;
          flex-direction: column;
          overflow: hidden;
        }

        .ka-setup-label-row {
          display: flex;
          flex: 0 0 auto;
          align-items: end;
          justify-content: space-between;
          gap: 10px;
        }

        .ka-setup-label-row span {
          display: block;
          color: white;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ka-setup-label-row small {
          display: block;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 8px;
        }

        .ka-world-grid {
          display: grid;
          min-height: 0;
          flex: 1 1 0;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
          margin-top: 5px;
        }

        .ka-world-card {
          position: relative;
          display: flex;
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(126, 232, 255, 0.12);
          border-radius: 13px;
          background-position: center;
          background-size: cover;
          padding: 0;
          color: white;
          text-align: left;
          cursor: pointer;
          isolation: isolate;
        }

        .ka-world-card::before {
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(
            180deg,
            rgba(3, 9, 24, 0.14),
            rgba(3, 9, 24, 0.9)
          );
          content: "";
        }

        .ka-world-card.is-selected {
          border: 2px solid rgba(126, 232, 255, 0.86);
          box-shadow: 0 0 24px rgba(83, 215, 255, 0.2);
        }

        .ka-world-card.is-focus {
          border: 2px solid rgba(96, 240, 208, 0.86);
          box-shadow: 0 0 24px rgba(96, 240, 208, 0.18);
        }

        .ka-world-card.is-mixed {
          border-color: rgba(201, 168, 255, 0.42);
          box-shadow: inset 0 0 28px rgba(201, 168, 255, 0.07);
        }

        .ka-world-card.is-locked {
          cursor: default;
        }

        .ka-world-content {
          display: flex;
          width: 100%;
          min-height: 0;
          flex-direction: column;
          justify-content: flex-end;
          padding: clamp(9px, 1.5vh, 14px);
        }

        .ka-world-content > small {
          color: rgba(255, 255, 255, 0.53);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ka-world-content > strong {
          margin-top: 3px;
          font-size: clamp(12px, 1.5vw, 17px);
          line-height: 1.05;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75);
        }

        .ka-world-content > span {
          margin-top: 3px;
          color: #bff3ff;
          font-size: 8px;
          font-weight: 850;
        }

        .ka-world-content > p {
          margin: 4px 0 0;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.55);
          font-size: 8px;
          line-height: 1.3;
        }

        .ka-setup-lower {
          display: grid;
          min-height: 0;
          flex: 0 0 auto;
          grid-template-columns: minmax(190px, 0.48fr) minmax(0, 1.52fr);
          gap: 7px;
        }

        .ka-timer-selector {
          display: flex;
          height: 100%;
          min-height: 54px;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid rgba(126, 232, 255, 0.11);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.035);
          padding: 6px 7px 6px 10px;
        }

        .ka-timer-selector > span {
          color: rgba(255, 255, 255, 0.52);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ka-timer-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(48px, 1fr));
          gap: 4px;
          border-radius: 9px;
          background: rgba(1, 8, 22, 0.48);
          padding: 3px;
        }

        .ka-timer-options button {
          min-height: 34px;
          border: 1px solid transparent;
          border-radius: 7px;
          background: transparent;
          color: rgba(255, 255, 255, 0.46);
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .ka-timer-options button.is-active {
          border-color: rgba(126, 232, 255, 0.62);
          background: rgba(126, 232, 255, 0.13);
          color: #7ee8ff;
          box-shadow: 0 0 13px rgba(83, 215, 255, 0.12);
        }

        .ka-challenge-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
        }

        .ka-challenge-card {
          min-width: 0;
          min-height: 54px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.035);
          padding: 6px 7px;
          color: white;
          text-align: left;
          cursor: pointer;
        }

        .ka-challenge-card.is-selected {
          border: 2px solid rgba(126, 232, 255, 0.62);
          background: rgba(126, 232, 255, 0.09);
          box-shadow: 0 0 18px rgba(83, 215, 255, 0.08);
        }

        .ka-challenge-card:disabled {
          cursor: not-allowed;
          opacity: 0.36;
        }

        .ka-challenge-card > span {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 5px;
        }

        .ka-challenge-card b {
          color: #7ee8ff;
          font-size: 11px;
        }

        .ka-challenge-card strong {
          overflow: hidden;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ka-challenge-card small {
          display: block;
          max-height: 24px;
          margin-top: 3px;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.38);
          font-size: 7px;
          line-height: 1.35;
        }

        .ka-start-button {
          min-height: 40px;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.36);
          border-radius: 11px;
          background: linear-gradient(90deg, #20b9f2, #4b70ff);
          padding: 8px 14px;
          color: white;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(32, 185, 242, 0.16);
        }

        .ka-start-button:disabled {
          cursor: not-allowed;
          opacity: 0.38;
          filter: saturate(0.6);
        }

        .ka-error-banner,
        .ka-message-banner {
          flex: 0 0 auto;
          margin: 0;
          border: 1px solid rgba(255, 215, 106, 0.25);
          border-radius: 10px;
          background: rgba(255, 215, 106, 0.075);
          padding: 6px 9px;
          color: #ffe8ad;
          font-size: 8px;
          font-weight: 750;
          line-height: 1.35;
        }

        .ka-create-controls {
          display: grid;
          flex: 0 0 auto;
          grid-template-columns: minmax(0, 1fr) minmax(210px, 0.55fr);
          gap: 7px;
        }

        .ka-field {
          display: grid;
          gap: 4px;
        }

        .ka-field > span {
          color: rgba(255, 255, 255, 0.48);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ka-field input {
          width: 100%;
          height: 40px;
          box-sizing: border-box;
          border: 1px solid rgba(126, 232, 255, 0.16);
          border-radius: 10px;
          outline: 0;
          background: rgba(3, 10, 25, 0.72);
          padding: 0 11px;
          color: white;
          font-size: 11px;
        }

        .ka-form-stage {
          align-items: center;
        }

        .ka-form-stage > .ka-stage-toolbar {
          width: 100%;
        }

        .ka-form-card {
          display: grid;
          width: min(100%, 560px);
          margin: auto;
          gap: 10px;
          border: 1px solid rgba(126, 232, 255, 0.12);
          border-radius: 16px;
          background: rgba(4, 13, 32, 0.68);
          padding: clamp(14px, 2.5vh, 22px);
        }

        .ka-code-input {
          text-align: center;
          font-size: 20px !important;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .ka-waiting-layout {
          display: grid;
          min-height: 0;
          flex: 1 1 0;
          grid-template-columns: minmax(210px, 0.72fr) minmax(0, 1.28fr);
          gap: 8px;
          margin-top: 8px;
        }

        .ka-lobby-code-card,
        .ka-player-panel {
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(126, 232, 255, 0.12);
          border-radius: 14px;
          background: rgba(4, 13, 32, 0.62);
          padding: 12px;
        }

        .ka-lobby-code-card {
          display: grid;
          place-items: center;
          align-content: center;
          text-align: center;
        }

        .ka-lobby-code-card span,
        .ka-lobby-code-card small {
          color: rgba(255, 255, 255, 0.42);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ka-lobby-code-card strong {
          margin: 8px 0;
          color: #7ee8ff;
          font-size: clamp(28px, 5vw, 54px);
          letter-spacing: 0.16em;
        }

        .ka-player-panel {
          display: flex;
          flex-direction: column;
        }

        .ka-panel-heading {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: space-between;
          color: rgba(255, 255, 255, 0.54);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ka-panel-heading strong {
          color: #7ee8ff;
        }

        .ka-player-scroll,
        .ka-leaderboard-scroll,
        .ka-results-scroll {
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.24) transparent;
        }

        .ka-player-scroll {
          display: grid;
          gap: 5px;
          margin-top: 7px;
        }

        .ka-player-row,
        .ka-leaderboard-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          padding: 7px 9px;
          font-size: 9px;
        }

        .ka-player-row span,
        .ka-leaderboard-row span {
          color: rgba(255, 255, 255, 0.5);
        }

        .ka-waiting-message {
          flex: 0 0 auto;
          border: 1px solid rgba(126, 232, 255, 0.12);
          border-radius: 10px;
          background: rgba(126, 232, 255, 0.06);
          padding: 9px;
          color: #bff3ff;
          font-size: 9px;
          font-weight: 800;
          text-align: center;
        }

        .ka-loading-stage {
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .ka-loader-orb {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          border: 1px solid rgba(126, 232, 255, 0.3);
          border-radius: 20px;
          background: rgba(126, 232, 255, 0.09);
          color: #7ee8ff;
          font-size: 24px;
          box-shadow: 0 0 32px rgba(83, 215, 255, 0.12);
        }

        .ka-loading-stage h2 {
          margin: 8px 0 0;
          font-size: 18px;
        }

        .ka-quiz-stage {
          gap: 6px;
        }

        .ka-quiz-status {
          display: flex;
          min-height: 29px;
          flex: 0 0 auto;
          align-items: center;
          gap: 5px;
        }

        .ka-quiz-status .ka-inline-back {
          margin-right: auto;
        }

        .ka-status-chip {
          min-width: 0;
          border: 1px solid rgba(126, 232, 255, 0.11);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.045);
          padding: 5px 8px;
          color: rgba(255, 255, 255, 0.53);
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
        }

        .ka-status-chip strong {
          color: #bff3ff;
        }

        .ka-quiz-stats {
          display: grid;
          min-height: 42px;
          flex: 0 0 auto;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
        }

        .ka-quiz-stat {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          padding: 5px 8px;
        }

        .ka-quiz-stat span {
          display: block;
          color: rgba(255, 255, 255, 0.34);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .ka-quiz-stat strong {
          display: block;
          margin-top: 1px;
          font-size: 13px;
        }

        .ka-quiz-layout {
          display: grid;
          min-height: 0;
          flex: 1 1 0;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 7px;
        }

        .ka-question-panel,
        .ka-options-panel {
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(126, 232, 255, 0.11);
          border-radius: 13px;
          background: rgba(4, 13, 32, 0.62);
        }

        .ka-question-panel {
          display: flex;
          flex-direction: column;
          padding: 11px;
        }

        .ka-question-topline {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .ka-question-topline > div:first-child span {
          display: block;
          color: #7ee8ff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ka-question-topline > div:first-child strong {
          display: block;
          margin-top: 2px;
          font-size: 12px;
        }

        .ka-countdown {
          display: grid;
          width: 45px;
          height: 45px;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid rgba(126, 232, 255, 0.3);
          border-radius: 999px;
          background: rgba(126, 232, 255, 0.07);
          color: #7ee8ff;
          font-size: 16px;
          font-weight: 950;
        }

        .ka-countdown.is-low {
          border-color: rgba(252, 165, 165, 0.4);
          background: rgba(248, 113, 113, 0.08);
          color: #fca5a5;
        }

        .ka-question-scroll {
          min-height: 0;
          flex: 1 1 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: none;
        }

        .ka-question-scroll::-webkit-scrollbar {
          display: none;
        }

        .ka-question-image {
          display: block;
          width: 100%;
          max-height: 34%;
          margin-top: 6px;
          object-fit: contain;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.94);
        }

        .ka-question-text {
          margin: 8px 0 0;
          font-size: clamp(15px, 2.1vw, 23px);
          font-weight: 800;
          line-height: 1.25;
        }

        .ka-difficulty {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.35);
          font-size: 7px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .ka-feedback {
          flex: 0 0 auto;
          margin-top: 7px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          border-radius: 9px;
          background: rgba(126, 232, 255, 0.05);
          padding: 7px 8px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 8px;
          line-height: 1.35;
        }

        .ka-feedback strong {
          display: block;
          margin-bottom: 2px;
          color: #bff3ff;
        }

        .ka-feedback-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
          margin-top: 5px;
        }

        .ka-feedback-footer span {
          color: #7ee8ff;
          font-size: 7px;
          font-weight: 900;
        }

        .ka-next-button {
          min-height: 29px;
          border: 1px solid rgba(126, 232, 255, 0.28);
          border-radius: 8px;
          background: rgba(126, 232, 255, 0.1);
          padding: 0 9px;
          color: #bff3ff;
          font-size: 7px;
          font-weight: 900;
          cursor: pointer;
        }

        .ka-options-panel {
          display: grid;
          grid-template-rows: repeat(4, minmax(0, 1fr));
          gap: 6px;
          border: 0;
          background: transparent;
        }

        .ka-answer-button {
          display: grid;
          min-height: 0;
          grid-template-columns: 28px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          overflow: hidden;
          border-radius: 11px !important;
          padding: 7px 9px !important;
          text-align: left;
          cursor: pointer;
        }

        .ka-answer-letter {
          display: grid;
          width: 27px;
          height: 27px;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          font-size: 9px;
          font-weight: 950;
        }

        .ka-answer-text {
          min-width: 0;
          max-height: 100%;
          overflow-y: auto;
          font-size: clamp(10px, 1.25vw, 13px);
          line-height: 1.25;
          scrollbar-width: none;
        }

        .ka-answer-text::-webkit-scrollbar {
          display: none;
        }

        .ka-results-stage,
        .ka-multi-results {
          gap: 7px;
        }

        .ka-results-heading {
          align-items: center;
        }

        .ka-result-score {
          display: grid;
          flex: 0 0 auto;
          text-align: right;
        }

        .ka-result-score span {
          color: rgba(255, 255, 255, 0.4);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ka-result-score strong {
          color: #7ee8ff;
          font-size: 23px;
        }

        .ka-result-stats {
          display: grid;
          flex: 0 0 auto;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
        }

        .ka-result-stat {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          padding: 6px 8px;
        }

        .ka-result-stat span {
          display: block;
          color: rgba(255, 255, 255, 0.36);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ka-result-stat strong {
          display: block;
          margin-top: 2px;
          font-size: 14px;
        }

        .ka-results-scroll {
          flex: 1 1 0;
          padding-right: 2px;
        }

        .ka-impact-panel {
          display: grid;
          gap: 7px;
          border: 1px solid rgba(201, 168, 255, 0.14);
          border-radius: 12px;
          background: rgba(201, 168, 255, 0.045);
          padding: 9px;
        }

        .ka-impact-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .ka-impact-heading strong {
          font-size: 12px;
        }

        .ka-impact-heading span {
          color: #c9a8ff;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .ka-impact-rows {
          display: grid;
          gap: 4px;
        }

        .ka-impact-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
          padding: 6px 8px;
          font-size: 8px;
        }

        .ka-impact-row small {
          display: block;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.38);
        }

        .ka-impact-row > div:last-child {
          text-align: right;
        }

        .ka-impact-row > div:last-child strong {
          color: #7ee8ff;
        }

        .ka-recommendation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid rgba(126, 232, 255, 0.12);
          border-radius: 9px;
          background: rgba(126, 232, 255, 0.05);
          padding: 7px 8px;
        }

        .ka-recommendation span {
          color: #7ee8ff;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .ka-recommendation strong {
          display: block;
          margin-top: 2px;
          font-size: 9px;
        }

        .ka-recommendation p {
          margin: 2px 0 0;
          color: rgba(255, 255, 255, 0.4);
          font-size: 7px;
          line-height: 1.3;
        }

        .ka-analytics-link {
          display: inline-flex;
          min-height: 29px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(201, 168, 255, 0.2);
          border-radius: 8px;
          background: rgba(201, 168, 255, 0.07);
          padding: 0 9px;
          color: #d9c7ff;
          font-size: 7px;
          font-weight: 900;
          text-decoration: none;
        }

        .ka-results-actions {
          display: grid;
          flex: 0 0 auto;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }

        .ka-results-actions .ka-start-button,
        .ka-results-actions .ka-secondary-button {
          min-height: 36px;
        }

        .ka-leaderboard-scroll {
          display: grid;
          flex: 1 1 0;
          gap: 5px;
        }

        .ka-guide-launcher {
          position: fixed;
          top: max(51px, calc(env(safe-area-inset-top) + 47px));
          right: max(14px, env(safe-area-inset-right));
          z-index: 70;
          display: flex;
          min-height: 43px;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(126, 232, 255, 0.28);
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            rgba(6, 24, 48, 0.96),
            rgba(25, 27, 70, 0.96)
          );
          padding: 5px 9px 5px 5px;
          color: white;
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.36),
            0 0 24px rgba(83, 215, 255, 0.08);
          cursor: pointer;
          backdrop-filter: blur(18px);
        }

        .ka-guide-mark,
        .ka-guide-avatar {
          display: grid;
          place-items: center;
          border: 1px solid rgba(126, 232, 255, 0.3);
          background: radial-gradient(
            circle at 35% 30%,
            rgba(126, 232, 255, 0.26),
            rgba(201, 168, 255, 0.08)
          );
          color: #7ee8ff;
        }

        .ka-guide-mark {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          font-size: 14px;
        }

        .ka-guide-copy {
          display: grid;
          gap: 1px;
          text-align: left;
        }

        .ka-guide-copy strong {
          font-size: 9px;
          font-weight: 950;
        }

        .ka-guide-copy small {
          color: rgba(255, 255, 255, 0.42);
          font-size: 7px;
          font-weight: 750;
        }

        .ka-guide-layer {
          position: fixed;
          inset: 0;
          z-index: 100;
          pointer-events: none;
        }

        .ka-guide-backdrop {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          pointer-events: auto;
        }

        .ka-guide-spotlight {
          position: fixed;
          z-index: 102;
          border: 2px solid rgba(126, 232, 255, 0.96);
          border-radius: 15px;
          background: transparent;
          box-shadow: 0 0 0 9999px rgba(0, 4, 14, 0.73),
            0 0 0 5px rgba(126, 232, 255, 0.12),
            0 0 36px rgba(83, 215, 255, 0.82),
            inset 0 0 22px rgba(126, 232, 255, 0.07);
          pointer-events: none;
          animation: kaGuidePulse 1.65s ease-in-out infinite alternate;
          transition: top 180ms ease, left 180ms ease, width 180ms ease,
            height 180ms ease;
        }

        .ka-guide-panel {
          position: absolute;
          z-index: 104;
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          overflow: hidden;
          border: 1px solid rgba(126, 232, 255, 0.22);
          border-radius: 19px;
          background: linear-gradient(
            155deg,
            rgba(5, 20, 42, 0.99),
            rgba(6, 10, 28, 0.99)
          );
          color: white;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.56),
            0 0 42px rgba(83, 215, 255, 0.08);
          pointer-events: auto;
          backdrop-filter: blur(24px);
        }

        .ka-guide-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          padding: 11px 12px 9px;
        }

        .ka-guide-identity {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
        }

        .ka-guide-avatar {
          width: 37px;
          height: 37px;
          flex: 0 0 auto;
          border-radius: 12px;
          font-size: 16px;
        }

        .ka-guide-identity > span:last-child {
          display: grid;
          min-width: 0;
          gap: 1px;
        }

        .ka-guide-identity small {
          color: #7ee8ff;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .ka-guide-identity strong {
          overflow: hidden;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ka-guide-close {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          cursor: pointer;
        }

        .ka-guide-progress {
          display: grid;
          grid-template-columns: repeat(9, minmax(0, 1fr));
          gap: 3px;
          padding: 8px 10px 0;
        }

        .ka-guide-progress button {
          height: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.3);
          font-size: 7px;
          font-weight: 900;
          cursor: pointer;
        }

        .ka-guide-progress button.is-complete {
          color: rgba(126, 232, 255, 0.68);
        }

        .ka-guide-progress button.is-active {
          border-color: rgba(126, 232, 255, 0.48);
          background: rgba(126, 232, 255, 0.11);
          color: #7ee8ff;
        }

        .ka-guide-body {
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 14px 15px 12px;
        }

        .ka-guide-eyebrow {
          margin: 0;
          color: #c9a8ff;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .ka-guide-body h2 {
          margin: 5px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 400;
          line-height: 1;
        }

        .ka-guide-description {
          margin: 9px 0 0;
          color: rgba(255, 255, 255, 0.66);
          font-size: 11px;
          line-height: 1.45;
        }

        .ka-guide-tip {
          display: grid;
          grid-template-columns: 25px minmax(0, 1fr);
          gap: 7px;
          margin-top: 10px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          border-radius: 11px;
          background: rgba(126, 232, 255, 0.045);
          padding: 8px;
        }

        .ka-guide-tip > span {
          display: grid;
          width: 25px;
          height: 25px;
          place-items: center;
          border-radius: 8px;
          background: rgba(126, 232, 255, 0.08);
          color: #7ee8ff;
        }

        .ka-guide-tip p {
          margin: 0;
          color: rgba(255, 255, 255, 0.5);
          font-size: 9px;
          line-height: 1.4;
        }

        .ka-guide-actions {
          display: grid;
          grid-template-columns: minmax(75px, 1fr) auto minmax(75px, 1fr);
          align-items: center;
          gap: 7px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          padding: 9px 10px 10px;
        }

        .ka-guide-actions > span {
          color: rgba(255, 255, 255, 0.3);
          font-size: 8px;
          font-weight: 900;
          text-align: center;
        }

        .ka-guide-primary,
        .ka-guide-secondary {
          min-height: 34px;
          border-radius: 9px;
          padding: 6px 9px;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .ka-guide-primary {
          border: 1px solid rgba(126, 232, 255, 0.38);
          background: linear-gradient(90deg, #20b9f2, #4b70ff);
          color: white;
        }

        .ka-guide-secondary {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.66);
        }

        .ka-guide-secondary:disabled {
          cursor: not-allowed;
          opacity: 0.25;
        }

        @keyframes kaGuidePulse {
          from {
            box-shadow: 0 0 0 9999px rgba(0, 4, 14, 0.73),
              0 0 0 4px rgba(126, 232, 255, 0.1),
              0 0 26px rgba(83, 215, 255, 0.54),
              inset 0 0 16px rgba(126, 232, 255, 0.04);
          }
          to {
            box-shadow: 0 0 0 9999px rgba(0, 4, 14, 0.73),
              0 0 0 7px rgba(126, 232, 255, 0.16),
              0 0 48px rgba(83, 215, 255, 0.94),
              inset 0 0 28px rgba(126, 232, 255, 0.09);
          }
        }

        @media (max-width: 1100px) {
          .ka-hero-copy {
            display: none;
          }

          .ka-hero-stats {
            width: min(360px, 44vw);
          }

          .ka-profile-strip {
            grid-template-columns: auto repeat(4, minmax(0, 1fr));
          }

          .ka-profile-recommendation {
            grid-column: 1 / -1;
            grid-template-columns: 1fr auto;
            align-items: center;
          }

          .ka-profile-recommendation a {
            margin-top: 0;
          }

          .ka-world-content > p {
            display: none;
          }
        }

        @media (max-width: 850px), (hover: none) and (pointer: coarse) {
          .ka-topbar {
            min-height: 44px;
            padding-right: max(8px, env(safe-area-inset-right));
            padding-left: max(8px, env(safe-area-inset-left));
          }

          .ka-nav-button {
            min-height: 33px;
            padding-inline: 10px;
            font-size: 9px;
          }

          .ka-back-full {
            display: none;
          }

          .ka-back-short {
            display: inline;
          }

          .ka-hero {
            min-height: 55px;
            gap: 8px;
            padding: 6px max(9px, env(safe-area-inset-right)) 6px
              max(9px, env(safe-area-inset-left));
          }

          .ka-hero-heading {
            gap: 7px;
          }

          .ka-hero-heading p {
            font-size: 7px;
          }

          .ka-hero-heading h1 {
            font-size: 25px;
          }

          .ka-hero-stats {
            display: none;
          }

          .ka-viewport {
            padding: 5px max(7px, env(safe-area-inset-right))
              max(6px, env(safe-area-inset-bottom))
              max(7px, env(safe-area-inset-left));
          }

          .ka-stage {
            border-radius: 14px;
            padding: 9px;
          }

          .ka-stage-heading > p {
            display: none;
          }

          .ka-mode-grid {
            gap: 7px;
            margin-top: 7px;
          }

          .ka-mode-card {
            border-radius: 14px;
            padding: 11px;
          }

          .ka-mode-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            font-size: 14px;
          }

          .ka-mode-copy strong {
            font-size: 18px;
          }

          .ka-mode-copy > span {
            font-size: 9px;
          }

          .ka-mode-footer {
            margin-top: 6px;
            padding: 5px 7px;
            font-size: 7px;
          }

          .ka-profile-strip {
            min-height: 43px;
            grid-template-columns: auto repeat(4, minmax(0, 1fr));
            gap: 3px;
            padding: 3px;
          }

          .ka-profile-recommendation {
            display: none;
          }

          .ka-profile-overall,
          .ka-profile-world {
            padding: 4px 5px;
          }

          .ka-profile-overall {
            min-width: 72px;
          }

          .ka-profile-strip strong {
            font-size: 9px;
          }

          .ka-profile-overall strong {
            font-size: 14px;
          }

          .ka-world-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(2, minmax(0, 1fr));
            gap: 5px;
          }

          .ka-world-card {
            border-radius: 11px;
          }

          .ka-world-content {
            padding: 7px 8px;
          }

          .ka-world-content > strong {
            font-size: 11px;
          }

          .ka-world-content > small,
          .ka-world-content > p {
            display: none;
          }

          .ka-world-content > span {
            font-size: 7px;
          }

          .ka-setup-lower {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .ka-timer-selector {
            min-height: 38px;
            padding: 4px 5px 4px 8px;
          }

          .ka-timer-options button {
            min-height: 28px;
          }

          .ka-challenge-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px;
          }

          .ka-challenge-card {
            min-height: 38px;
            border-radius: 9px;
            padding: 4px 6px;
          }

          .ka-challenge-card small {
            display: none;
          }

          .ka-start-button {
            min-height: 36px;
            padding: 6px 10px;
            font-size: 8px;
          }

          .ka-create-controls {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .ka-create-controls .ka-field input {
            height: 34px;
          }

          .ka-create-controls .ka-timer-selector {
            height: 36px;
          }

          .ka-waiting-layout {
            grid-template-columns: 0.78fr 1.22fr;
          }

          .ka-quiz-status {
            gap: 3px;
          }

          .ka-status-chip {
            max-width: 24%;
            overflow: hidden;
            padding: 4px 6px;
            font-size: 7px;
            text-overflow: ellipsis;
          }

          .ka-quiz-stats {
            min-height: 34px;
          }

          .ka-quiz-stat {
            padding: 4px 6px;
          }

          .ka-quiz-stat span {
            font-size: 6px;
          }

          .ka-quiz-stat strong {
            font-size: 11px;
          }

          .ka-quiz-layout {
            gap: 5px;
          }

          .ka-question-panel {
            padding: 8px;
          }

          .ka-countdown {
            width: 37px;
            height: 37px;
            font-size: 13px;
          }

          .ka-question-text {
            font-size: clamp(13px, 3.6vw, 19px);
          }

          .ka-answer-button {
            grid-template-columns: 24px minmax(0, 1fr);
            gap: 6px;
            border-radius: 9px !important;
            padding: 5px 7px !important;
          }

          .ka-answer-letter {
            width: 23px;
            height: 23px;
            font-size: 8px;
          }

          .ka-answer-text {
            font-size: 10px;
          }

          .ka-result-stats {
            gap: 3px;
          }

          .ka-result-stat {
            padding: 4px 5px;
          }

          .ka-impact-panel {
            gap: 5px;
            padding: 7px;
          }

          .ka-guide-launcher {
            top: max(44px, calc(env(safe-area-inset-top) + 40px));
            right: max(7px, env(safe-area-inset-right));
            min-height: 37px;
            border-radius: 11px;
            padding: 4px 6px 4px 4px;
          }

          .ka-guide-mark {
            width: 28px;
            height: 28px;
            border-radius: 9px;
          }

          .ka-guide-copy small {
            display: none;
          }
        }

        @media (max-width: 850px) and (orientation: portrait),
          (hover: none) and (pointer: coarse) and (orientation: portrait) {
          .ka-mode-grid {
            grid-template-columns: 1fr;
            grid-template-rows: repeat(2, minmax(0, 1fr));
          }

          .ka-waiting-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto minmax(0, 1fr);
          }

          .ka-lobby-code-card {
            min-height: 82px;
            padding: 7px;
          }

          .ka-lobby-code-card strong {
            margin: 3px 0;
            font-size: 25px;
          }

          .ka-quiz-layout {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 0.68fr) minmax(0, 1.32fr);
          }
        }

        @media (max-width: 850px) and (orientation: landscape),
          (hover: none) and (pointer: coarse) and (orientation: landscape) {
          .ka-hero {
            min-height: 45px;
          }

          .ka-hero-heading h1 {
            font-size: 22px;
          }

          .ka-mode-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ka-world-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            grid-template-rows: 1fr;
          }

          .ka-setup-lower {
            grid-template-columns: minmax(170px, 0.45fr) minmax(0, 1.55fr);
          }

          .ka-challenge-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .ka-quiz-layout {
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
            grid-template-rows: 1fr;
          }

          .ka-guide-panel {
            max-height: min(58dvh, 390px);
          }
        }

        @media (max-height: 610px) and (orientation: landscape) {
          .ka-topbar {
            min-height: 39px;
            padding-top: max(3px, env(safe-area-inset-top));
            padding-bottom: 3px;
          }

          .ka-nav-button {
            min-height: 30px;
          }

          .ka-hero {
            min-height: 40px;
            padding-top: 4px;
            padding-bottom: 4px;
          }

          .ka-hero-heading h1 {
            font-size: 20px;
          }

          .ka-viewport {
            padding-top: 3px;
          }

          .ka-stage {
            padding: 7px;
          }

          .ka-profile-strip {
            min-height: 36px;
          }

          .ka-world-content > span {
            display: none;
          }

          .ka-timer-selector {
            min-height: 34px;
          }

          .ka-challenge-card {
            min-height: 34px;
          }

          .ka-start-button {
            min-height: 33px;
          }

          .ka-quiz-stats {
            min-height: 29px;
          }

          .ka-status-chip {
            padding-block: 3px;
          }

          .ka-question-text {
            font-size: 14px;
          }

          .ka-feedback {
            padding: 5px 6px;
          }
        }

        /* ================================================================
           KNOWLEDGE ARENA VISUAL REFINEMENT v2
           - smaller mode-select buttons / spotlight
           - non-scroll guide slides 1–2
           - larger readable setup typography
           - larger challenge-mode controls
           - premium aurora start CTA
           ================================================================ */

        /* Mode select: stop the two choices from stretching across the full
           remaining viewport. This also gives Guide step 1 a compact target. */
        .ka-mode-stage .ka-mode-grid {
          width: min(1120px, 88vw);
          height: clamp(190px, 27vh, 240px);
          min-height: 190px;
          flex: 0 0 auto;
          align-self: center;
          gap: 14px;
          margin-top: 18px;
        }

        .ka-mode-stage .ka-mode-card {
          border-radius: 20px;
          padding: 20px 22px;
        }

        .ka-mode-stage .ka-mode-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          font-size: 20px;
        }

        .ka-mode-stage .ka-mode-copy small {
          font-size: 9px;
        }

        .ka-mode-stage .ka-mode-copy strong {
          margin-top: 6px;
          font-size: clamp(23px, 2.1vw, 31px);
        }

        .ka-mode-stage .ka-mode-copy > span {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.45;
        }

        .ka-mode-stage .ka-mode-action {
          padding-top: 11px;
          font-size: 11px;
        }

        .ka-mode-stage .ka-mode-footer {
          width: min(900px, 82vw);
          align-self: center;
          margin-top: 13px;
          padding: 9px 12px;
          font-size: 9px;
        }

        /* General setup readability. Keep the title restrained but make the
           working UI feel like a premium game interface rather than tiny labels. */
        .ka-hero-heading p,
        .ka-kicker {
          font-size: 10px;
        }

        .ka-hero-copy {
          max-width: 420px;
          font-size: 13px;
          line-height: 1.45;
        }

        .ka-hero-stats span {
          font-size: 8px;
        }

        .ka-hero-stats strong {
          font-size: 13px;
        }

        .ka-stage-toolbar > div > strong {
          font-size: 19px;
        }

        .ka-inline-back,
        .ka-secondary-button {
          min-height: 38px;
          padding-inline: 13px;
          font-size: 11px;
        }

        .ka-profile-strip {
          min-height: 64px;
          grid-template-columns: auto repeat(4, minmax(0, 1fr)) minmax(190px, 1.35fr);
          gap: 7px;
          border-radius: 14px;
          padding: 7px;
        }

        .ka-profile-overall,
        .ka-profile-world,
        .ka-profile-recommendation {
          border-radius: 11px;
          padding: 8px 10px;
        }

        .ka-profile-overall {
          min-width: 110px;
        }

        .ka-profile-strip span,
        .ka-profile-strip small {
          font-size: 9px;
        }

        .ka-profile-strip strong {
          margin-top: 3px;
          font-size: 14px;
        }

        .ka-profile-overall strong {
          font-size: 23px;
        }

        .ka-profile-recommendation a {
          margin-top: 4px;
          font-size: 9px;
        }

        .ka-setup-label-row span {
          font-size: 12px;
          letter-spacing: 0.11em;
        }

        .ka-setup-label-row small {
          margin-top: 3px;
          font-size: 10px;
        }

        .ka-world-grid {
          gap: 9px;
          margin-top: 7px;
        }

        .ka-world-card {
          border-radius: 16px;
        }

        .ka-world-content {
          padding: clamp(12px, 1.8vh, 18px);
        }

        .ka-world-content > small {
          font-size: 9px;
        }

        .ka-world-content > strong {
          margin-top: 5px;
          font-size: clamp(17px, 1.55vw, 23px);
        }

        .ka-world-content > span {
          margin-top: 5px;
          font-size: 10px;
        }

        .ka-world-content > p {
          margin-top: 6px;
          font-size: 10px;
          line-height: 1.4;
        }

        .ka-setup-lower {
          grid-template-columns: minmax(220px, 0.42fr) minmax(0, 1.58fr);
          gap: 10px;
        }

        .ka-timer-selector {
          min-height: 70px;
          border-radius: 15px;
          padding: 9px 10px 9px 14px;
        }

        .ka-timer-selector > span {
          font-size: 10px;
        }

        .ka-timer-options {
          gap: 5px;
          border-radius: 11px;
          padding: 4px;
        }

        .ka-timer-options button {
          min-width: 58px;
          min-height: 42px;
          border-radius: 9px;
          font-size: 11px;
        }

        .ka-challenge-grid {
          gap: 8px;
        }

        .ka-challenge-card {
          min-height: 70px;
          border-radius: 15px;
          padding: 10px 11px;
          transition: transform 150ms ease, border-color 150ms ease,
            background 150ms ease, box-shadow 150ms ease;
        }

        .ka-challenge-card:not(:disabled):hover {
          transform: translateY(-1px);
          border-color: rgba(126, 232, 255, 0.32);
          background: rgba(126, 232, 255, 0.055);
        }

        .ka-challenge-card > span {
          gap: 7px;
        }

        .ka-challenge-card b {
          font-size: 14px;
        }

        .ka-challenge-card strong {
          font-size: 12px;
        }

        .ka-challenge-card small {
          max-height: 30px;
          margin-top: 5px;
          font-size: 9px;
          line-height: 1.4;
        }

        /* Premium modern CTA: aurora/glass treatment instead of a flat blue bar. */
        .ka-start-button {
          position: relative;
          min-height: 50px;
          overflow: hidden;
          border: 1px solid rgba(206, 240, 255, 0.52);
          border-radius: 14px;
          background:
            linear-gradient(
              100deg,
              #16c9c3 0%,
              #327df4 38%,
              #7658f6 68%,
              #a84ce8 100%
            );
          padding: 10px 16px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.105em;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.28);
          box-shadow:
            0 12px 30px rgba(50, 125, 244, 0.23),
            0 0 26px rgba(118, 88, 246, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.28),
            inset 0 -1px 0 rgba(6, 15, 38, 0.2);
          transition: transform 160ms ease, filter 160ms ease,
            box-shadow 160ms ease;
        }

        .ka-start-button::before {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              115deg,
              transparent 12%,
              rgba(255, 255, 255, 0.16) 34%,
              transparent 54%
            );
          transform: translateX(-48%);
          content: "";
          pointer-events: none;
        }

        .ka-start-button:not(:disabled):hover {
          transform: translateY(-1px);
          filter: saturate(1.08) brightness(1.04);
          box-shadow:
            0 16px 36px rgba(50, 125, 244, 0.29),
            0 0 34px rgba(168, 76, 232, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.32);
        }

        /* Guide slides 1 and 2 are short informational slides. Let them size to
           content instead of creating an internal scroll pane. */
        .ka-guide-panel.is-no-scroll {
          grid-template-rows: auto auto auto auto;
          max-height: calc(100dvh - 24px) !important;
        }

        .ka-guide-panel.is-no-scroll .ka-guide-body {
          overflow: hidden;
          overscroll-behavior: none;
          padding-top: 12px;
          padding-bottom: 10px;
        }

        .ka-guide-panel.is-no-scroll .ka-guide-description {
          margin-top: 8px;
        }

        .ka-guide-panel.is-no-scroll .ka-guide-tip {
          margin-top: 9px;
        }

        /* Slightly more readable guide chrome while keeping it compact enough
           to sit outside the highlighted target. */
        .ka-guide-identity small {
          font-size: 8px;
        }

        .ka-guide-identity strong {
          font-size: 13px;
        }

        .ka-guide-eyebrow {
          font-size: 9px;
        }

        .ka-guide-description {
          font-size: 12px;
        }

        .ka-guide-tip p {
          font-size: 10px;
        }

        @media (max-width: 1100px) {
          .ka-mode-stage .ka-mode-grid {
            width: min(980px, 94vw);
            height: clamp(180px, 25vh, 220px);
          }

          .ka-profile-strip {
            grid-template-columns: auto repeat(4, minmax(0, 1fr)) minmax(170px, 1.2fr);
          }

          .ka-world-content > strong {
            font-size: clamp(15px, 1.8vw, 20px);
          }

          .ka-world-content > p {
            font-size: 9px;
          }

          .ka-challenge-card strong {
            font-size: 11px;
          }
        }

        @media (max-width: 850px), (hover: none) and (pointer: coarse) {
          .ka-mode-stage .ka-mode-grid {
            width: 100%;
            height: auto;
            min-height: 0;
            flex: 1 1 0;
            gap: 8px;
            margin-top: 9px;
          }

          .ka-mode-stage .ka-mode-card {
            padding: 12px 13px;
          }

          .ka-mode-stage .ka-mode-copy strong {
            font-size: 18px;
          }

          .ka-mode-stage .ka-mode-copy > span {
            font-size: 11px;
          }

          .ka-profile-strip {
            min-height: 48px;
            gap: 4px;
            padding: 4px;
          }

          .ka-profile-overall,
          .ka-profile-world,
          .ka-profile-recommendation {
            padding: 5px 6px;
          }

          .ka-profile-strip span,
          .ka-profile-strip small {
            font-size: 7px;
          }

          .ka-profile-strip strong {
            font-size: 10px;
          }

          .ka-profile-overall strong {
            font-size: 15px;
          }

          .ka-setup-label-row span {
            font-size: 10px;
          }

          .ka-setup-label-row small {
            font-size: 8px;
          }

          .ka-world-content > strong {
            font-size: 13px;
          }

          .ka-world-content > span {
            font-size: 8px;
          }

          .ka-setup-lower {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .ka-timer-selector {
            min-height: 42px;
            padding: 5px 6px 5px 9px;
          }

          .ka-timer-selector > span {
            font-size: 8px;
          }

          .ka-timer-options button {
            min-height: 31px;
            font-size: 9px;
          }

          .ka-challenge-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px;
          }

          .ka-challenge-card {
            min-height: 46px;
            padding: 7px 8px;
          }

          .ka-challenge-card strong {
            font-size: 9px;
          }

          .ka-challenge-card b {
            font-size: 11px;
          }

          .ka-challenge-card small {
            display: none;
          }

          .ka-start-button {
            min-height: 40px;
            padding: 7px 10px;
            font-size: 9px;
          }

          .ka-guide-panel.is-no-scroll .ka-guide-body {
            overflow: hidden;
          }
        }

        @media (max-height: 700px) and (min-width: 851px) {
          .ka-mode-stage .ka-mode-grid {
            height: clamp(165px, 25vh, 195px);
            min-height: 165px;
          }

          .ka-profile-strip {
            min-height: 54px;
          }

          .ka-world-content > p {
            display: none;
          }

          .ka-world-content > strong {
            font-size: 16px;
          }

          .ka-timer-selector,
          .ka-challenge-card {
            min-height: 58px;
          }

          .ka-start-button {
            min-height: 44px;
          }
        }


        /* ================================================================
           KNOWLEDGE ARENA VISUAL REFINEMENT v3
           1. Nova Guide moved beside Back to Learning Missions
           2. Mode cards made more transparent
           3. Typography enlarged throughout, especially quiz gameplay
           ================================================================ */

        /* ---------------------------------------------------------------
           TOPBAR + GUIDE PLACEMENT
           --------------------------------------------------------------- */
        .ka-top-left {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
        }

        .ka-guide-launcher {
          position: static;
          inset: auto;
          z-index: 21;
          min-height: 36px;
          flex: 0 0 auto;
          border-radius: 999px;
          background:
            linear-gradient(
              135deg,
              rgba(10, 34, 59, 0.86),
              rgba(28, 30, 73, 0.84)
            );
          padding: 3px 10px 3px 4px;
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .ka-guide-mark {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          font-size: 13px;
        }

        .ka-guide-copy strong {
          font-size: 11px;
        }

        .ka-guide-copy small {
          font-size: 8px;
        }

        /* ---------------------------------------------------------------
           MODE SELECT — SHOW MORE BACKGROUND PNG
           --------------------------------------------------------------- */
        .ka-mode-card {
          background:
            linear-gradient(
              145deg,
              rgba(15, 42, 84, 0.43),
              rgba(4, 14, 35, 0.62)
            );
          border-color: rgba(126, 232, 255, 0.24);
          backdrop-filter: blur(5px);
        }

        .ka-mode-card.is-multi {
          background:
            linear-gradient(
              145deg,
              rgba(54, 29, 93, 0.38),
              rgba(6, 13, 35, 0.62)
            );
          border-color: rgba(201, 168, 255, 0.25);
        }

        .ka-mode-card:hover {
          background:
            linear-gradient(
              145deg,
              rgba(17, 52, 101, 0.5),
              rgba(4, 14, 35, 0.68)
            );
        }

        .ka-mode-card.is-multi:hover {
          background:
            linear-gradient(
              145deg,
              rgba(64, 34, 110, 0.46),
              rgba(6, 13, 35, 0.67)
            );
        }

        .ka-mode-footer {
          background: rgba(5, 18, 39, 0.38);
          backdrop-filter: blur(5px);
        }

        /* ---------------------------------------------------------------
           GLOBAL READABILITY — DESKTOP / TABLET
           --------------------------------------------------------------- */
        .ka-nav-button {
          font-size: 13px;
        }

        .ka-hero-heading p,
        .ka-kicker {
          font-size: 12px;
        }

        .ka-hero-copy {
          max-width: 470px;
          font-size: 14px;
          line-height: 1.45;
        }

        .ka-hero-stats span {
          font-size: 10px;
        }

        .ka-hero-stats strong {
          font-size: 15px;
        }

        .ka-stage-heading h2 {
          font-size: clamp(27px, 2.45vw, 36px);
        }

        .ka-stage-heading > p {
          font-size: 13px;
          line-height: 1.45;
        }

        .ka-mode-copy small {
          font-size: 11px;
        }

        .ka-mode-copy strong {
          font-size: clamp(26px, 2.6vw, 34px);
        }

        .ka-mode-copy > span {
          font-size: 14px;
        }

        .ka-mode-action {
          font-size: 12px;
        }

        .ka-mode-footer {
          font-size: 10px;
        }

        .ka-stage-toolbar > div > strong {
          font-size: 22px;
        }

        .ka-inline-back,
        .ka-secondary-button {
          min-height: 40px;
          font-size: 13px;
        }

        .ka-profile-strip span,
        .ka-profile-strip small {
          font-size: 11px;
        }

        .ka-profile-strip strong {
          font-size: 16px;
        }

        .ka-profile-overall strong {
          font-size: 26px;
        }

        .ka-profile-recommendation a {
          font-size: 11px;
        }

        .ka-setup-label-row span {
          font-size: 14px;
        }

        .ka-setup-label-row small {
          font-size: 12px;
        }

        .ka-world-content > small {
          font-size: 11px;
        }

        .ka-world-content > strong {
          font-size: clamp(21px, 1.7vw, 27px);
        }

        .ka-world-content > span {
          font-size: 12px;
        }

        .ka-world-content > p {
          font-size: 12px;
          line-height: 1.4;
        }

        .ka-timer-selector > span {
          font-size: 12px;
        }

        .ka-timer-options button {
          font-size: 13px;
        }

        .ka-challenge-card b {
          font-size: 17px;
        }

        .ka-challenge-card strong {
          font-size: 15px;
        }

        .ka-challenge-card small {
          font-size: 11px;
          line-height: 1.35;
        }

        .ka-start-button {
          font-size: 14px;
        }

        /* ---------------------------------------------------------------
           QUIZ — LARGE, LEGIBLE GAMEPLAY TYPE
           --------------------------------------------------------------- */
        .ka-quiz-stage {
          gap: 8px;
        }

        .ka-status-chip {
          padding: 7px 11px;
          font-size: 11px;
        }

        .ka-quiz-stats {
          min-height: 55px;
          gap: 7px;
        }

        .ka-quiz-stat {
          padding: 8px 11px;
        }

        .ka-quiz-stat span {
          font-size: 10px;
        }

        .ka-quiz-stat strong {
          margin-top: 3px;
          font-size: 18px;
        }

        .ka-quiz-layout {
          gap: 9px;
        }

        .ka-question-panel {
          padding: 16px;
        }

        .ka-question-topline > div:first-child span {
          font-size: 11px;
        }

        .ka-question-topline > div:first-child strong {
          margin-top: 4px;
          font-size: 15px;
        }

        .ka-countdown {
          width: 52px;
          height: 52px;
          font-size: 20px;
        }

        .ka-question-text {
          margin-top: 13px;
          font-size: clamp(24px, 2.55vw, 36px);
          line-height: 1.2;
        }

        .ka-difficulty {
          margin-top: 8px;
          font-size: 10px;
          letter-spacing: 0.05em;
        }

        .ka-feedback {
          margin-top: 10px;
          padding: 10px 12px;
          font-size: 11px;
          line-height: 1.45;
        }

        .ka-feedback strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .ka-feedback-footer span {
          font-size: 10px;
        }

        .ka-next-button {
          min-height: 36px;
          padding: 0 13px;
          font-size: 10px;
        }

        .ka-options-panel {
          gap: 8px;
        }

        .ka-answer-button {
          grid-template-columns: 36px minmax(0, 1fr);
          gap: 12px;
          border-radius: 14px !important;
          padding: 11px 14px !important;
        }

        .ka-answer-letter {
          width: 34px;
          height: 34px;
          font-size: 12px;
        }

        .ka-answer-text {
          font-size: clamp(16px, 1.55vw, 21px);
          line-height: 1.3;
        }

        /* Results / waiting / lobby readability */
        .ka-result-score span,
        .ka-result-stat span,
        .ka-impact-label,
        .ka-lobby-card span,
        .ka-player-row span {
          font-size: 10px;
        }

        .ka-result-score strong {
          font-size: 30px;
        }

        .ka-result-stat strong,
        .ka-lobby-card strong,
        .ka-player-row strong {
          font-size: 15px;
        }

        .ka-impact-panel,
        .ka-result-review,
        .ka-lobby-card,
        .ka-player-row {
          font-size: 12px;
        }

        /* ---------------------------------------------------------------
           TABLET / MOBILE
           Keep everything larger than before while still preserving 100dvh.
           --------------------------------------------------------------- */
        @media (max-width: 850px), (hover: none) and (pointer: coarse) {
          .ka-top-left {
            gap: 5px;
          }

          .ka-nav-button {
            font-size: 11px;
          }

          .ka-guide-launcher {
            min-height: 33px;
            padding: 3px 7px 3px 3px;
          }

          .ka-guide-mark {
            width: 26px;
            height: 26px;
            font-size: 11px;
          }

          .ka-guide-copy strong {
            font-size: 10px;
          }

          .ka-guide-copy small {
            display: none;
          }

          .ka-hero-heading p {
            font-size: 9px;
          }

          .ka-hero-copy {
            font-size: 11px;
          }

          .ka-mode-stage .ka-mode-copy small {
            font-size: 9px;
          }

          .ka-mode-stage .ka-mode-copy strong {
            font-size: 21px;
          }

          .ka-mode-stage .ka-mode-copy > span {
            font-size: 12px;
          }

          .ka-mode-action {
            font-size: 10px;
          }

          .ka-profile-strip span,
          .ka-profile-strip small {
            font-size: 8px;
          }

          .ka-profile-strip strong {
            font-size: 11px;
          }

          .ka-profile-overall strong {
            font-size: 17px;
          }

          .ka-setup-label-row span {
            font-size: 11px;
          }

          .ka-setup-label-row small {
            font-size: 9px;
          }

          .ka-world-content > strong {
            font-size: 15px;
          }

          .ka-world-content > span {
            font-size: 9px;
          }

          .ka-timer-selector > span {
            font-size: 9px;
          }

          .ka-timer-options button {
            font-size: 10px;
          }

          .ka-challenge-card strong {
            font-size: 11px;
          }

          .ka-challenge-card b {
            font-size: 13px;
          }

          .ka-start-button {
            font-size: 10px;
          }

          .ka-status-chip {
            max-width: none;
            padding: 5px 7px;
            font-size: 8px;
          }

          .ka-quiz-stats {
            min-height: 40px;
          }

          .ka-quiz-stat {
            padding: 5px 7px;
          }

          .ka-quiz-stat span {
            font-size: 8px;
          }

          .ka-quiz-stat strong {
            font-size: 13px;
          }

          .ka-question-panel {
            padding: 10px;
          }

          .ka-question-topline > div:first-child span {
            font-size: 9px;
          }

          .ka-question-topline > div:first-child strong {
            font-size: 12px;
          }

          .ka-countdown {
            width: 41px;
            height: 41px;
            font-size: 16px;
          }

          .ka-question-text {
            font-size: clamp(18px, 4.6vw, 25px);
            line-height: 1.18;
          }

          .ka-difficulty {
            font-size: 8px;
          }

          .ka-feedback {
            padding: 7px 8px;
            font-size: 9px;
          }

          .ka-feedback strong {
            font-size: 10px;
          }

          .ka-feedback-footer span,
          .ka-next-button {
            font-size: 8px;
          }

          .ka-answer-button {
            grid-template-columns: 29px minmax(0, 1fr);
            gap: 8px;
            padding: 7px 9px !important;
          }

          .ka-answer-letter {
            width: 28px;
            height: 28px;
            font-size: 10px;
          }

          .ka-answer-text {
            font-size: clamp(13px, 3.4vw, 17px);
          }
        }

        @media (max-width: 560px) and (orientation: portrait) {
          .ka-guide-launcher {
            padding-right: 5px;
          }

          .ka-guide-copy {
            display: none;
          }

          .ka-question-text {
            font-size: clamp(17px, 5vw, 22px);
          }

          .ka-answer-text {
            font-size: 14px;
          }
        }

        @media (max-height: 700px) and (min-width: 851px) {
          .ka-status-chip {
            padding: 5px 8px;
            font-size: 9px;
          }

          .ka-quiz-stats {
            min-height: 45px;
          }

          .ka-quiz-stat span {
            font-size: 8px;
          }

          .ka-quiz-stat strong {
            font-size: 15px;
          }

          .ka-question-panel {
            padding: 12px;
          }

          .ka-question-text {
            font-size: clamp(21px, 2.25vw, 30px);
          }

          .ka-answer-text {
            font-size: clamp(14px, 1.35vw, 18px);
          }

          .ka-feedback {
            font-size: 10px;
          }
        }


        /* ================================================================
           KNOWLEDGE ARENA v5 — FULL RESULTS REVIEW + VERIFIED SAVE STATUS
           ================================================================ */

        .ka-full-review {
          display: grid;
          gap: 8px;
          margin-bottom: 8px;
          border: 1px solid rgba(126, 232, 255, 0.18);
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              rgba(20, 67, 96, 0.12),
              rgba(91, 59, 164, 0.09)
            );
          padding: 8px;
        }

        .ka-full-review.is-compact {
          flex: 0 0 auto;
          margin-bottom: 0;
        }

        .ka-full-review-toggle {
          display: flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid rgba(126, 232, 255, 0.18);
          border-radius: 11px;
          background: rgba(126, 232, 255, 0.055);
          padding: 8px 11px;
          color: white;
          text-align: left;
          cursor: pointer;
        }

        .ka-full-review-toggle > span {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .ka-full-review-toggle strong {
          font-size: 14px;
        }

        .ka-full-review-toggle small {
          color: rgba(255, 255, 255, 0.52);
          font-size: 10px;
          line-height: 1.35;
        }

        .ka-full-review-toggle b {
          display: grid;
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(126, 232, 255, 0.22);
          border-radius: 9px;
          background: rgba(126, 232, 255, 0.08);
          color: #9bf5ff;
          font-size: 18px;
        }

        .ka-full-review-list {
          display: grid;
          gap: 8px;
        }

        .ka-review-item {
          display: grid;
          gap: 9px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 12px;
          background: rgba(4, 15, 34, 0.66);
          padding: 11px;
        }

        .ka-review-item.is-correct {
          border-color: rgba(74, 222, 128, 0.19);
        }

        .ka-review-item.is-wrong {
          border-color: rgba(248, 113, 113, 0.2);
        }

        .ka-review-item-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .ka-review-item-header > div:first-child {
          min-width: 0;
        }

        .ka-review-item-header span,
        .ka-review-answer-grid span {
          display: block;
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ka-review-item-header strong {
          display: block;
          margin-top: 4px;
          font-size: 14px;
          line-height: 1.35;
        }

        .ka-review-status {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .ka-review-status.is-correct {
          border: 1px solid rgba(74, 222, 128, 0.25);
          background: rgba(34, 197, 94, 0.11);
          color: #a7f3d0;
        }

        .ka-review-status.is-wrong {
          border: 1px solid rgba(248, 113, 113, 0.25);
          background: rgba(239, 68, 68, 0.11);
          color: #fecaca;
        }

        .ka-review-answer-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(0, 1.35fr)
            minmax(70px, 0.45fr)
            minmax(70px, 0.45fr);
          gap: 6px;
        }

        .ka-review-answer-grid > div {
          min-width: 0;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          padding: 7px 8px;
        }

        .ka-review-answer-grid strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          line-height: 1.35;
        }

        .ka-review-explanation {
          margin: 0;
          border-radius: 9px;
          background: rgba(126, 232, 255, 0.045);
          padding: 8px 9px;
          color: rgba(255, 255, 255, 0.64);
          font-size: 10px;
          line-height: 1.45;
        }

        .ka-review-explanation strong {
          color: #9bf5ff;
        }

        @media (max-width: 850px), (hover: none) and (pointer: coarse) {
          .ka-full-review-toggle {
            min-height: 42px;
            padding: 6px 8px;
          }

          .ka-full-review-toggle strong {
            font-size: 11px;
          }

          .ka-full-review-toggle small {
            font-size: 8px;
          }

          .ka-review-item {
            padding: 8px;
          }

          .ka-review-item-header strong {
            font-size: 11px;
          }

          .ka-review-answer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ka-review-answer-grid strong {
            font-size: 9px;
          }

          .ka-review-explanation {
            font-size: 9px;
          }
        }


        /* ================================================================
           KNOWLEDGE ARENA v6 — RESULTS READABILITY + ASYNC MASTERY STATUS
           ================================================================ */

        .ka-results-stage .ka-kicker {
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .ka-results-stage .ka-results-heading h2 {
          font-size: clamp(32px, 3vw, 44px);
          line-height: 1.02;
        }

        .ka-results-stage .ka-result-score span {
          font-size: 11px;
        }

        .ka-results-stage .ka-result-score strong {
          font-size: clamp(34px, 3vw, 46px);
          line-height: 1;
        }

        .ka-results-stage .ka-result-stat {
          min-height: 58px;
          padding: 9px 11px;
        }

        .ka-results-stage .ka-result-stat span {
          font-size: 10px;
        }

        .ka-results-stage .ka-result-stat strong {
          margin-top: 4px;
          font-size: 18px;
        }

        .ka-results-stage .ka-message-banner {
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.45;
        }

        .ka-results-stage .ka-full-review-toggle {
          min-height: 62px;
          padding: 10px 13px;
        }

        .ka-results-stage .ka-full-review-toggle strong {
          font-size: 17px;
        }

        .ka-results-stage .ka-full-review-toggle small {
          font-size: 12px;
          line-height: 1.45;
        }

        .ka-results-stage .ka-full-review-toggle b {
          width: 34px;
          height: 34px;
          font-size: 20px;
        }

        .ka-results-stage .ka-review-item-header span,
        .ka-results-stage .ka-review-answer-grid span {
          font-size: 10px;
        }

        .ka-results-stage .ka-review-item-header strong {
          font-size: 16px;
          line-height: 1.42;
        }

        .ka-results-stage .ka-review-status {
          font-size: 10px;
          padding: 6px 9px;
        }

        .ka-results-stage .ka-review-answer-grid strong {
          font-size: 13px;
          line-height: 1.42;
        }

        .ka-results-stage .ka-review-explanation {
          font-size: 12px;
          line-height: 1.55;
        }

        .ka-results-stage .ka-impact-panel {
          padding: 12px;
        }

        .ka-results-stage .ka-impact-heading strong {
          font-size: 16px;
        }

        .ka-results-stage .ka-impact-heading span {
          font-size: 10px;
        }

        .ka-impact-note {
          margin: 0;
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          line-height: 1.5;
        }

        .ka-results-stage .ka-impact-row strong {
          font-size: 13px;
        }

        .ka-results-stage .ka-impact-row small {
          font-size: 11px;
          line-height: 1.35;
        }

        .ka-results-stage .ka-recommendation span {
          font-size: 10px;
        }

        .ka-results-stage .ka-recommendation strong {
          font-size: 14px;
        }

        .ka-results-stage .ka-recommendation p {
          font-size: 12px;
          line-height: 1.45;
        }

        .ka-results-stage .ka-analytics-link {
          min-height: 38px;
          font-size: 12px;
        }

        .ka-results-stage .ka-results-actions .ka-start-button,
        .ka-results-stage .ka-results-actions .ka-secondary-button {
          min-height: 48px;
          font-size: 14px;
          letter-spacing: 0.05em;
        }

        @media (max-width: 850px), (hover: none) and (pointer: coarse) {
          .ka-results-stage .ka-kicker {
            font-size: 10px;
          }

          .ka-results-stage .ka-results-heading h2 {
            font-size: clamp(24px, 7vw, 32px);
          }

          .ka-results-stage .ka-result-score strong {
            font-size: 30px;
          }

          .ka-results-stage .ka-result-stat {
            min-height: 48px;
            padding: 7px 8px;
          }

          .ka-results-stage .ka-result-stat span {
            font-size: 9px;
          }

          .ka-results-stage .ka-result-stat strong {
            font-size: 15px;
          }

          .ka-results-stage .ka-message-banner {
            padding: 8px 9px;
            font-size: 11px;
          }

          .ka-results-stage .ka-full-review-toggle {
            min-height: 52px;
            padding: 8px 9px;
          }

          .ka-results-stage .ka-full-review-toggle strong {
            font-size: 14px;
          }

          .ka-results-stage .ka-full-review-toggle small,
          .ka-impact-note,
          .ka-results-stage .ka-recommendation p {
            font-size: 10px;
          }

          .ka-results-stage .ka-review-item-header strong {
            font-size: 13px;
          }

          .ka-results-stage .ka-review-answer-grid strong,
          .ka-results-stage .ka-review-explanation,
          .ka-results-stage .ka-impact-row strong {
            font-size: 11px;
          }

          .ka-results-stage .ka-impact-heading strong {
            font-size: 13px;
          }

          .ka-results-stage .ka-results-actions .ka-start-button,
          .ka-results-stage .ka-results-actions .ka-secondary-button {
            min-height: 42px;
            font-size: 11px;
          }
        }

      `}</style>
    </main>
  );
}

function ArenaTimerSelector({
  title,
  value,
  onChange,
}: {
  title: string;
  value: TimerSeconds;
  onChange: (value: TimerSeconds) => void;
}) {
  return (
    <div className="ka-timer-selector">
      <span>{title}</span>
      <div className="ka-timer-options">
        {([10, 20] as const).map((seconds) => (
          <button
            key={seconds}
            type="button"
            className={value === seconds ? "is-active" : ""}
            onClick={() => onChange(seconds)}
          >
            {seconds} sec
          </button>
        ))}
      </div>
    </div>
  );
}

function ArenaWorldGrid({
  profile,
  selectedTopic,
  mixed,
  focusTopic,
  onSelect,
  locked,
}: {
  profile: KnowledgeArenaProfile | null;
  selectedTopic: KnowledgeArenaTopic | null;
  mixed: boolean;
  focusTopic: KnowledgeArenaTopic | null;
  onSelect: (topic: KnowledgeArenaTopic) => void;
  locked: boolean;
}) {
  return (
    <div className="ka-world-grid" data-nova-guide-target="worlds">
      {topics.map((topic) => {
        const mastery = getProfileTopic(profile, topic.id);
        const selected = selectedTopic === topic.id;
        const focus = focusTopic === topic.id;

        return (
          <button
            key={topic.id}
            type="button"
            className={`ka-world-card ${selected ? "is-selected" : ""} ${
              focus ? "is-focus" : ""
            } ${mixed ? "is-mixed" : ""} ${locked ? "is-locked" : ""}`}
            style={{ backgroundImage: `url("${topic.coverImage}")` }}
            onClick={() => onSelect(topic.id)}
            aria-pressed={selected || focus || mixed}
          >
            <span className="ka-world-content">
              <small>
                {focus ? "Nova Focus" : mixed ? "Adaptive Mix" : "Knowledge World"}
              </small>
              <strong>{topic.title}</strong>
              <span>
                {mastery?.mastery_score !== null &&
                mastery?.mastery_score !== undefined
                  ? `${formatMastery(mastery.mastery_score)} mastery`
                  : mastery?.has_evidence
                    ? mastery.lifetime_accuracy !== null &&
                      mastery.lifetime_accuracy !== undefined
                      ? `${formatMastery(mastery.lifetime_accuracy)} accuracy · mastery building`
                      : "Evidence recorded · mastery building"
                    : "Start your first challenge"}
              </span>
              <p>{topic.subtitle}</p>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ArenaChallengeGrid({
  profile,
  isSignedIn,
  selectedMode,
  onSelect,
}: {
  profile: KnowledgeArenaProfile | null;
  isSignedIn: boolean;
  selectedMode: ChallengeMode;
  onSelect: (mode: ChallengeMode) => void;
}) {
  return (
    <div className="ka-challenge-grid">
      {(Object.keys(challengeModeMeta) as ChallengeMode[]).map((mode) => {
        const meta = challengeModeMeta[mode];
        const personalised =
          mode === "focus_mission" || mode === "nova_challenge";
        const disabled = personalised && !isSignedIn;
        let detail = meta.description;

        if (mode === "focus_mission" && profile?.recommended_topic_title) {
          detail = `Focus: ${profile.recommended_topic_title}`;
        } else if (mode === "nova_challenge") {
          detail = profile?.profile_ready
            ? "Personalised four-world mix."
            : "Builds your first four-world profile.";
        }

        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(mode)}
            className={`ka-challenge-card ${
              selectedMode === mode ? "is-selected" : ""
            }`}
            data-nova-guide-target={mode.replace("_", "-")}
          >
            <span>
              <b>{meta.icon}</b>
              <strong>{meta.title}</strong>
            </span>
            <small>{disabled ? "Log in to personalise." : detail}</small>
          </button>
        );
      })}
    </div>
  );
}

function KnowledgeProfileStrip({
  profile,
  loading,
  error,
}: {
  profile: KnowledgeArenaProfile | null;
  loading: boolean;
  error: string | null;
}) {
  const hasAnyEvidence = Boolean(
    profile && profile.total_questions_attempted > 0
  );

  return (
    <div className="ka-profile-strip" data-nova-guide-target="knowledge-profile">
      <div className="ka-profile-overall">
        <span>Knowledge Profile</span>
        <strong>
          {loading
            ? "…"
            : profile?.overall_mastery !== null &&
                profile?.overall_mastery !== undefined
              ? formatMastery(profile.overall_mastery)
              : hasAnyEvidence
                ? "Building"
                : "—"}
        </strong>
        <small>
          {profile
            ? `${profile.total_questions_attempted} answers${
                profile.mastery_refresh_pending ? " · mastery queued" : ""
              }`
            : error || "Nova Analytics"}
        </small>
      </div>

      {topics.map((topic) => {
        const row = getProfileTopic(profile, topic.id);
        const hasMastery =
          row?.mastery_score !== null && row?.mastery_score !== undefined;
        const hasLiveAccuracy =
          row?.lifetime_accuracy !== null &&
          row?.lifetime_accuracy !== undefined;

        return (
          <div key={topic.id} className="ka-profile-world">
            <span>{topic.title}</span>
            <strong>
              {hasMastery
                ? formatMastery(row!.mastery_score!)
                : row?.has_evidence && hasLiveAccuracy
                  ? formatMastery(row!.lifetime_accuracy!)
                  : row?.has_evidence
                    ? "Recorded"
                    : "—"}
            </strong>
            <small>
              {hasMastery
                ? `${row?.questions_attempted ?? 0} answers · mastery`
                : row?.has_evidence
                  ? `${row.questions_attempted ?? 0} answers · accuracy · mastery building`
                  : "No evidence"}
            </small>
          </div>
        );
      })}

      <div className="ka-profile-recommendation">
        <span>Nova recommends</span>
        <strong>
          {profile?.recommended_topic_title
            ? `Focus: ${profile.recommended_topic_title}`
            : "Keep building your profile"}
        </strong>
        <Link href={NOVA_ANALYTICS_HREF}>View Full Nova Analytics →</Link>
      </div>
    </div>
  );
}

function ArenaQuizView({
  isSolo,
  topicTitle: currentTopicTitle,
  challengeLabel,
  question,
  questionIndex,
  score,
  correctCount,
  timeLeft,
  timerSeconds,
  nextCountdown,
  answerLocked,
  selectedAnswer,
  feedback,
  getAnswerStyle,
  onChoose,
  onNext,
  onBack,
}: {
  isSolo: boolean;
  topicTitle: string;
  challengeLabel: string;
  question: KnowledgeArenaQuestion;
  questionIndex: number;
  score: number;
  correctCount: number;
  timeLeft: number;
  timerSeconds: TimerSeconds;
  nextCountdown: number;
  answerLocked: boolean;
  selectedAnswer: KnowledgeArenaAnswer | null;
  feedback: string | null;
  getAnswerStyle: (answer: KnowledgeArenaAnswer) => CSSProperties;
  onChoose: (answer: KnowledgeArenaAnswer) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options: [KnowledgeArenaAnswer, string][] = [
    ["A", question.option_a],
    ["B", question.option_b],
    ["C", question.option_c],
    ["D", question.option_d],
  ];

  const correct =
    selectedAnswer !== null && selectedAnswer === question.correct_answer;

  return (
    <div className="ka-stage ka-quiz-stage">
      <div className="ka-quiz-status">
        <button type="button" className="ka-inline-back" onClick={onBack}>
          ← Back
        </button>
        <span className="ka-status-chip">
          Mode <strong>{challengeLabel}</strong>
        </span>
        <span className="ka-status-chip">
          World <strong>{currentTopicTitle}</strong>
        </span>
        <span className="ka-status-chip">
          Question <strong>{questionIndex + 1}/10</strong>
        </span>
        <span className="ka-status-chip">
          Timer <strong>{timerSeconds}s</strong>
        </span>
      </div>

      <div className="ka-quiz-stats">
        <div className="ka-quiz-stat">
          <span>Correct</span>
          <strong>{correctCount}/10</strong>
        </div>
        <div className="ka-quiz-stat">
          <span>Points</span>
          <strong>{score}</strong>
        </div>
        <div className="ka-quiz-stat">
          <span>Status</span>
          <strong>
            {answerLocked ? `Next in ${nextCountdown}s` : `${timeLeft}s left`}
          </strong>
        </div>
      </div>

      <div className="ka-quiz-layout">
        <div className="ka-question-panel">
          <div className="ka-question-topline">
            <div>
              <span>{currentTopicTitle}</span>
              <strong>Question {questionIndex + 1}</strong>
            </div>
            <div
              className={`ka-countdown ${
                timeLeft <= Math.max(3, Math.floor(timerSeconds / 3))
                  ? "is-low"
                  : ""
              }`}
            >
              {timeLeft}
            </div>
          </div>

          <div className="ka-question-scroll">
            {question.question_image && (
              <img
                src={question.question_image}
                alt={`Question ${questionIndex + 1}`}
                className="ka-question-image"
                draggable={false}
              />
            )}
            <p className="ka-question-text">{question.question_text}</p>
            <p className="ka-difficulty">Difficulty · {question.difficulty}</p>
          </div>

          {feedback && (
            <div className="ka-feedback">
              <strong>
                {correct
                  ? "Correct"
                  : selectedAnswer === null
                  ? "Time is up"
                  : "Review"}
              </strong>
              <span>{feedback}</span>

              <div className="ka-feedback-footer">
                <span>Next in {nextCountdown}s</span>
                {isSolo && answerLocked && (
                  <button
                    type="button"
                    className="ka-next-button"
                    onClick={onNext}
                  >
                    {questionIndex >= 9 ? "See Results →" : "Next Question →"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ka-options-panel">
          {options.map(([label, optionText]) => (
            <button
              key={label}
              type="button"
              disabled={answerLocked}
              onClick={() => onChoose(label)}
              className="ka-answer-button"
              style={getAnswerStyle(label)}
            >
              <strong className="ka-answer-letter">{label}</strong>
              <span className="ka-answer-text">{optionText}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArenaResultsPanel({
  challengeMode,
  score,
  correctCount,
  tokensEarned,
  tokenBalance,
  rewardSaved,
  saveMessage,
  isAuthenticated,
  beforeProfile,
  afterProfile,
  topicResults,
  questions,
  answers,
  onStartFocus,
  onNextChallenge,
  onExit,
}: {
  challengeMode: ChallengeMode;
  score: number;
  correctCount: number;
  tokensEarned: number;
  tokenBalance: number;
  rewardSaved: boolean;
  saveMessage: string;
  isAuthenticated: boolean;
  beforeProfile: KnowledgeArenaProfile | null;
  afterProfile: KnowledgeArenaProfile | null;
  topicResults: TopicResult[];
  questions: KnowledgeArenaQuestion[];
  answers: RecordedArenaAnswer[];
  onStartFocus: () => void;
  onNextChallenge: () => void;
  onExit: () => void;
}) {
  return (
    <div className="ka-stage ka-results-stage">
      <div className="ka-results-heading">
        <div>
          <p className="ka-kicker">{challengeModeMeta[challengeMode].title}</p>
          <h2>Challenge Complete</h2>
        </div>
        <div className="ka-result-score">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
      </div>

      <div className="ka-result-stats">
        <div className="ka-result-stat">
          <span>Correct</span>
          <strong>{correctCount}/10</strong>
        </div>
        <div className="ka-result-stat">
          <span>Points</span>
          <strong>{score}</strong>
        </div>
        <div className="ka-result-stat">
          <span>Tokens</span>
          <strong>+{tokensEarned}</strong>
        </div>
        <div className="ka-result-stat">
          <span>Balance</span>
          <strong>{tokenBalance}</strong>
        </div>
      </div>

      <div className="ka-results-scroll">
        <p className="ka-message-banner">
          {saveMessage ||
            (rewardSaved
              ? "Your attempt and Dreamscape Token reward have been saved."
              : isAuthenticated
                ? "Saving your attempt and refreshing Nova Analytics…"
                : "Log in to save your attempt and receive Dreamscape Tokens.")}
        </p>

        <ArenaQuestionReviewPanel
          questions={questions}
          answers={answers}
        />

        {(afterProfile || topicResults.length > 0) && (
          <ArenaKnowledgeImpact
            beforeProfile={beforeProfile}
            afterProfile={afterProfile}
            topicResults={topicResults}
            onStartFocus={onStartFocus}
          />
        )}
      </div>

      <div className="ka-results-actions">
        <button
          type="button"
          className="ka-secondary-button"
          onClick={onNextChallenge}
        >
          Choose Next Challenge
        </button>
        <button type="button" className="ka-start-button" onClick={onExit}>
          Exit Knowledge Arena
        </button>
      </div>
    </div>
  );
}


function answerOptionText(
  question: KnowledgeArenaQuestion,
  answer: KnowledgeArenaAnswer | null
) {
  if (!answer) return "No answer";

  switch (answer) {
    case "A":
      return question.option_a;
    case "B":
      return question.option_b;
    case "C":
      return question.option_c;
    case "D":
      return question.option_d;
  }
}

function ArenaQuestionReviewPanel({
  questions,
  answers,
  compact = false,
}: {
  questions: KnowledgeArenaQuestion[];
  answers: RecordedArenaAnswer[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const answerMap = new Map(
    answers.map((answer) => [answer.question_id, answer])
  );

  return (
    <section className={`ka-full-review ${compact ? "is-compact" : ""}`}>
      <button
        type="button"
        className="ka-full-review-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>
          <strong>{open ? "Hide Full Results" : "View Full Results"}</strong>
          <small>
            Review all {questions.length} questions, your answers, correct
            answers and explanations.
          </small>
        </span>
        <b>{open ? "−" : "+"}</b>
      </button>

      {open && (
        <div className="ka-full-review-list">
          {questions.map((question, index) => {
            const answer = answerMap.get(question.id);
            const selectedLabel = answer?.answer ?? null;
            const correctLabel = question.correct_answer;
            const isCorrect = Boolean(answer?.correct);

            return (
              <article
                key={question.id}
                className={`ka-review-item ${isCorrect ? "is-correct" : "is-wrong"}`}
              >
                <header className="ka-review-item-header">
                  <div>
                    <span>Question {index + 1}</span>
                    <strong>{question.question_text}</strong>
                  </div>
                  <div className={`ka-review-status ${isCorrect ? "is-correct" : "is-wrong"}`}>
                    {isCorrect ? "Correct" : selectedLabel ? "Incorrect" : "Timed out"}
                  </div>
                </header>

                <div className="ka-review-answer-grid">
                  <div>
                    <span>Your answer</span>
                    <strong>
                      {selectedLabel
                        ? `${selectedLabel}. ${answerOptionText(question, selectedLabel)}`
                        : "No answer"}
                    </strong>
                  </div>
                  <div>
                    <span>Correct answer</span>
                    <strong>
                      {correctLabel}. {answerOptionText(question, correctLabel)}
                    </strong>
                  </div>
                  <div>
                    <span>Points</span>
                    <strong>{answer?.points ?? 0}</strong>
                  </div>
                  <div>
                    <span>Time used</span>
                    <strong>{answer?.seconds_used ?? "—"}s</strong>
                  </div>
                </div>

                <p className="ka-review-explanation">
                  <strong>Explanation:</strong> {question.explanation}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ArenaKnowledgeImpact({
  beforeProfile,
  afterProfile,
  topicResults,
  onStartFocus,
}: {
  beforeProfile: KnowledgeArenaProfile | null;
  afterProfile: KnowledgeArenaProfile | null;
  topicResults: TopicResult[];
  onStartFocus: () => void;
}) {
  const affectedTopics = topicResults.length
    ? topicResults.map((result) => result.topic)
    : afterProfile?.topics
        .filter((topic) => topic.has_evidence)
        .map((topic) => topic.topic) || [];

  return (
    <div className="ka-impact-panel">
      <div className="ka-impact-heading">
        <strong>Nova recorded your Knowledge evidence</strong>
        <span>
          {afterProfile?.mastery_refresh_pending
            ? "Mastery queued"
            : afterProfile?.overall_mastery === null ||
                afterProfile?.overall_mastery === undefined
              ? "Mastery building"
              : `Current overall ${formatMastery(afterProfile.overall_mastery)}`}
        </span>
      </div>

      <p className="ka-impact-note">
        Your quiz evidence is available immediately. Nova recalculates full
        mastery through the Learning Profile queue so quiz saving is never
        blocked by analytics processing.
      </p>

      <div className="ka-impact-rows">
        {affectedTopics.map((topicId) => {
          const result = topicResults.find((item) => item.topic === topicId);
          const after = getProfileTopic(afterProfile, topicId);
          const afterValue = after?.mastery_score ?? null;
          const liveAccuracy =
            result?.accuracy ?? after?.lifetime_accuracy ?? null;

          return (
            <div key={topicId} className="ka-impact-row">
              <div>
                <strong>{topicTitle(topicId)}</strong>
                <small>
                  {result
                    ? `${result.correct_count}/${result.total_questions} correct`
                    : `${after?.questions_attempted ?? 0} recorded answers`}
                </small>
              </div>
              <div>
                <strong>
                  {afterValue !== null
                    ? `${formatMastery(afterValue)} mastery`
                    : liveAccuracy !== null
                      ? `${formatMastery(liveAccuracy)} accuracy`
                      : "Evidence saved"}
                </strong>
                {afterValue === null && (
                  <small>
                    {afterProfile?.mastery_refresh_pending
                      ? "Mastery recalculation queued"
                      : "Mastery building"}
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {afterProfile?.recommended_topic_title && (
        <div className="ka-recommendation">
          <div>
            <span>Nova recommends</span>
            <strong>Focus next: {afterProfile.recommended_topic_title}</strong>
            <p>{afterProfile.recommendation_reason}</p>
          </div>
          <button
            type="button"
            className="ka-next-button"
            onClick={onStartFocus}
          >
            Start Focus →
          </button>
        </div>
      )}

      <Link href={NOVA_ANALYTICS_HREF} className="ka-analytics-link">
        View Full Nova Analytics →
      </Link>
    </div>
  );
}

function getProfileTopic(
  profile: KnowledgeArenaProfile | null,
  topic: KnowledgeArenaTopic
) {
  return profile?.topics?.find((item) => item.topic === topic) ?? null;
}

function topicTitle(topic: KnowledgeArenaTopic) {
  return topics.find((item) => item.id === topic)?.title ?? topic;
}

function formatMastery(value: number) {
  return `${Math.round(Number(value))}%`;
}
