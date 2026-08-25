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
    useState<KnowledgeArenaTopic | null>(null);
  const [questions, setQuestions] = useState<KnowledgeArenaQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] =
    useState<KnowledgeArenaAnswer | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [soloTimerSeconds, setSoloTimerSeconds] = useState<TimerSeconds>(10);
  const [lobbyTimerSecondsChoice, setLobbyTimerSecondsChoice] =
    useState<TimerSeconds>(10);
  const [timeLeft, setTimeLeft] = useState<number>(10);
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
    if (answerLocked || !currentQuestion) return;

    if (timeLeft <= 0) {
      void lockAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [stage, timeLeft, answerLocked, currentQuestion]);

  useEffect(() => {
    if (stage !== "solo-quiz" && stage !== "multiplayer-quiz") return;
    if (!answerLocked) return;

    if (nextCountdown <= 0) {
      void nextQuestion();
      return;
    }

    const timer = window.setTimeout(() => {
      setNextCountdown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [stage, answerLocked, nextCountdown]);

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
      setStage(
        challengeMode === "quick_play" || challengeMode === "expert_challenge"
          ? "topic"
          : "solo-mode"
      );
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
      setStage(
        challengeMode === "quick_play" || challengeMode === "expert_challenge"
          ? "topic"
          : "solo-mode"
      );
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

    if (challengeMode === "quick_play" || challengeMode === "expert_challenge") {
      setStage("topic");
      return;
    }

    void startSoloChallenge(challengeMode);
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
    setLobbyTimerSecondsChoice(foundLobby.timer_seconds ?? 10);
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
      setLobbyTimerSecondsChoice(nextLobby.timer_seconds ?? 10);
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

    const { data, error } = await supabase.rpc(
      "save_knowledge_arena_attempt_v2",
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
        "The result was completed, but its detailed answer record could not be saved."
      );
      return null;
    }

    const saved = (data ?? {}) as SavedArenaAttempt;
    const savedScore = Number(saved.score ?? 0);
    const savedCorrectCount = Number(saved.correct_count ?? 0);
    const savedReward = Number(saved.tokens_earned ?? 0);

    setScore(savedScore);
    setCorrectCount(savedCorrectCount);
    setTokensEarned(savedReward);
    setRewardSaved(true);
    setLastTopicResults(Array.isArray(saved.topic_results) ? saved.topic_results : []);

    if (saved.profile) {
      setKnowledgeProfile(saved.profile);
      setProfileAfterAttempt(saved.profile);
    }

    if (mode === "solo" && savedReward > 0) {
      setTokenBalance((current) => current + savedReward);
      window.dispatchEvent(new Event("dream-tokens-updated"));
    }

    setAttemptSaveMessage(
      mode === "solo"
        ? "Your attempt was saved and Nova Analytics has refreshed your Knowledge Arena profile."
        : "Your multiplayer attempt and individual answers were saved to the Teaching Dashboard."
    );

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

  function resetAll() {
    setStage("mode");
    setSelectedTopic(null);
    setQuestions([]);
    setLobby(null);
    setPlayers([]);
    setMyPlayer(null);
    setJoinCode("");
    setMultiplayerMessage("");
    setLoadError(null);
    setSelectedChallengeMode("quick_play");
    setActiveChallengePlan(null);
    setProfileAtChallengeStart(null);
    setProfileAfterAttempt(null);
    setLastTopicResults([]);
    resetQuestionState(soloTimerSeconds);
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

  return (
    <main style={pageStyle(isMobile)}>
      <div style={shellStyle}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link href="/learning-missions" style={navButtonStyle}>
            ← Back to Learning Missions
          </Link>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href={userEmail ? "/profile" : "/login"} style={navButtonStyle}>
              {userEmail ? "My Account" : "Log In"}
            </Link>

            <span style={navButtonStyle}>✦ Tokens {tokenBalance}</span>
          </div>
        </header>

        <section style={heroStyle(isMobile)}>
          <div style={{ maxWidth: "780px" }}>
            <p style={eyebrowStyle}>Learning Missions</p>
            <h1 style={heroTitleStyle(isMobile)}>Knowledge Arena</h1>
            <p style={heroCopyStyle(isMobile)}>
              Pick a knowledge world, choose your pace, and take on a 10-question
              challenge solo or with friends.
            </p>
          </div>
        </section>

        {stage === "mode" && (
          <section style={sectionBlockStyle}>
            <SectionHeading
              title="Choose how you want to play"
              subtitle="Start a solo challenge or enter a multiplayer lobby."
            />

            <div style={modeGridStyle(isMobile)}>
              <button
                type="button"
                onClick={() => setStage("solo-mode")}
                style={modeCardStyle("#53d7ff")}
              >
                <div style={modeIconStyle}>🎮</div>
                <div>
                  <h2 style={modeTitleStyle}>Single Player</h2>
                  <p style={modeCopyStyle}>
                    Play a fast 10-question challenge on your own, with a 10s or
                    20s timer.
                  </p>
                </div>
                <div style={primaryActionStyle}>Start Solo Challenge ›</div>
              </button>

              <button
                type="button"
                onClick={() => setStage("multiplayer-menu")}
                style={modeCardStyle("#b9a9ff")}
              >
                <div style={modeIconStyle}>👥</div>
                <div>
                  <h2 style={modeTitleStyle}>Multiplayer</h2>
                  <p style={modeCopyStyle}>
                    Create or join a lobby. The host chooses the topic and timer.
                  </p>
                </div>
                <div style={primaryActionStyle}>Enter Multiplayer ›</div>
              </button>
            </div>
          </section>
        )}

        {stage === "solo-mode" && (
          <section style={sectionBlockStyle}>
            <TopBar label="Single Player" onBack={() => setStage("mode")} />
            <TimerSelector
              title="Question Timer"
              value={soloTimerSeconds}
              onChange={setSoloTimerSeconds}
            />

            <ChallengeModePicker
              profile={knowledgeProfile}
              isSignedIn={Boolean(userId)}
              isMobile={isMobile}
              onChoose={chooseSoloChallengeMode}
            />

            {profileError && <p style={errorStyle}>{profileError}</p>}

            <KnowledgeProfilePanel
              profile={knowledgeProfile}
              loading={profileLoading}
              error={profileError}
              onStartFocus={() => chooseSoloChallengeMode("focus_mission")}
            />
          </section>
        )}

        {stage === "topic" && (
          <section style={sectionBlockStyle}>
            <TopBar
              label={challengeModeMeta[selectedChallengeMode].title}
              onBack={() => setStage("solo-mode")}
            />
            <TimerSelector
              title="Question Timer"
              value={soloTimerSeconds}
              onChange={setSoloTimerSeconds}
            />
            <TopicPicker
              isMobile={isMobile}
              isCompact={isCompact}
              title={
                selectedChallengeMode === "expert_challenge"
                  ? "Choose a knowledge world for your Expert Challenge."
                  : "Choose a knowledge world to begin Quick Play."
              }
              buttonText={
                selectedChallengeMode === "expert_challenge"
                  ? "Start Expert Challenge"
                  : "Start Quiz"
              }
              onPick={(topic) =>
                void startSoloChallenge(selectedChallengeMode, topic)
              }
              loadError={loadError}
              profile={knowledgeProfile}
            />
          </section>
        )}

        {stage === "multiplayer-menu" && (
          <section style={sectionBlockStyle}>
            <TopBar label="Multiplayer" onBack={() => setStage("mode")} />

            <div style={modeGridStyle(isMobile)}>
              <button
                type="button"
                onClick={() => setStage("create-lobby")}
                style={modeCardStyle("#53d7ff")}
              >
                <div style={modeIconStyle}>🛰️</div>
                <div>
                  <h2 style={modeTitleStyle}>Create Lobby</h2>
                  <p style={modeCopyStyle}>
                    Choose a topic and timer, then share your lobby code.
                  </p>
                </div>
                <div style={primaryActionStyle}>Create Lobby ›</div>
              </button>

              <button
                type="button"
                onClick={() => setStage("join-lobby")}
                style={modeCardStyle("#ffd76a")}
              >
                <div style={modeIconStyle}>🔑</div>
                <div>
                  <h2 style={modeTitleStyle}>Join Lobby</h2>
                  <p style={modeCopyStyle}>
                    Enter a lobby code from the host and get ready to compete.
                  </p>
                </div>
                <div style={primaryActionStyle}>Join Lobby ›</div>
              </button>
            </div>
          </section>
        )}

        {stage === "create-lobby" && (
          <section style={sectionBlockStyle}>
            <TopBar label="Create Lobby" onBack={() => setStage("multiplayer-menu")} />
            <div style={stackStyle}>
              <NameInput
                displayName={displayName}
                setDisplayName={setDisplayName}
              />
              <TimerSelector
                title="Lobby Timer"
                value={lobbyTimerSecondsChoice}
                onChange={setLobbyTimerSecondsChoice}
              />
            </div>
            <TopicPicker
              isMobile={isMobile}
              isCompact={isCompact}
              title="Choose a topic world for the lobby."
              buttonText={isCreatingLobby ? "Creating..." : "Create Lobby"}
              onPick={(topic) => createLobby(topic)}
              loadError={loadError || multiplayerMessage}
              disabled={isCreatingLobby}
            />
          </section>
        )}

        {stage === "join-lobby" && (
          <section style={sectionBlockStyle}>
            <TopBar label="Join Lobby" onBack={() => setStage("multiplayer-menu")} />
            <div style={joinCardStyle}>
              <div style={stackStyle}>
                <NameInput
                  displayName={displayName}
                  setDisplayName={setDisplayName}
                />

                <label style={fieldLabelStyle}>
                  <span style={fieldCaptionStyle}>Lobby Code</span>
                  <input
                    value={joinCode}
                    onChange={(event) =>
                      setJoinCode(
                        event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      )
                    }
                    placeholder="ABC123"
                    maxLength={6}
                    style={{
                      ...inputStyle,
                      textAlign: "center",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontSize: "22px",
                      fontWeight: 900,
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={joinLobby}
                  disabled={isJoiningLobby}
                  style={{ ...mainButtonStyle, width: "100%" }}
                >
                  {isJoiningLobby ? "Joining..." : "Join Lobby"}
                </button>
              </div>

              {multiplayerMessage && <p style={errorStyle}>{multiplayerMessage}</p>}
            </div>
          </section>
        )}

        {stage === "waiting-lobby" && lobby && (
          <section style={sectionBlockStyle}>
            <TopBar label="Lobby Waiting Room" onBack={resetAll} backLabel="Leave lobby" />
            <div style={waitingShellStyle}>
              <p style={eyebrowStyle}>Lobby Code</p>
              <h2 style={lobbyCodeStyle(isMobile)}>{lobby.code}</h2>
              <div style={waitingMetaRowStyle}>
                <StatusPill
                  label="Topic"
                  value={topics.find((topic) => topic.id === lobby.topic)?.title ?? "—"}
                />
                <StatusPill label="Timer" value={`${lobby.timer_seconds}s`} />
                <StatusPill label="Players" value={String(players.length)} />
              </div>

              <div style={waitingPlayersGridStyle}>
                {players.map((player) => (
                  <div key={player.id} style={playerTileStyle}>
                    <strong>{player.display_name}</strong>
                    <span style={{ color: player.is_host ? "#ffd76a" : "rgba(255,255,255,0.72)" }}>
                      {player.is_host ? "Host" : "Player"}
                    </span>
                  </div>
                ))}
              </div>

              {isHost ? (
                <button
                  type="button"
                  onClick={startMultiplayerGame}
                  style={{ ...mainButtonStyle, marginTop: "10px" }}
                >
                  Start Game
                </button>
              ) : (
                <p style={helperTextStyle}>Waiting for the host to start the game.</p>
              )}
            </div>
          </section>
        )}

        {stage === "loading" && (
          <section style={sectionBlockStyle}>
            <MessageCard message={loadingMessage} />
          </section>
        )}

        {(stage === "solo-quiz" || stage === "multiplayer-quiz") &&
          currentQuestion &&
          (currentQuestionTopicInfo || selectedTopicInfo) && (
            <section style={sectionBlockStyle}>
              <QuizView
                isMobile={isMobile}
                isCompact={isCompact}
                isSolo={stage === "solo-quiz"}
                topicTitle={(currentQuestionTopicInfo || selectedTopicInfo)?.title || "Knowledge Arena"}
                topicAccent={(currentQuestionTopicInfo || selectedTopicInfo)?.accent || "#7ee8ff"}
                challengeLabel={
                  stage === "solo-quiz"
                    ? challengeModeMeta[selectedChallengeMode].title
                    : "Multiplayer"
                }
                question={currentQuestion}
                questionIndex={questionIndex}
                score={score}
                timeLeft={timeLeft}
                timerSeconds={activeTimerSeconds}
                nextCountdown={nextCountdown}
                answerLocked={answerLocked}
                selectedAnswer={selectedAnswer}
                feedback={feedback}
                getAnswerStyle={getAnswerStyle}
                onChoose={(answer) => lockAnswer(answer)}
                onNext={() => void nextQuestion()}
                onBack={
                  stage === "solo-quiz"
                    ? () =>
                        setStage(
                          selectedChallengeMode === "quick_play" ||
                            selectedChallengeMode === "expert_challenge"
                            ? "topic"
                            : "solo-mode"
                        )
                    : resetAll
                }
              />
            </section>
          )}

        {stage === "solo-results" && (
          <section style={sectionBlockStyle}>
            <ResultsPanel
              title="Challenge Complete"
              challengeMode={selectedChallengeMode}
              score={score}
              correctCount={correctCount}
              tokensEarned={tokensEarned}
              tokenBalance={tokenBalance}
              rewardSaved={rewardSaved}
              saveMessage={attemptSaveMessage}
              beforeProfile={profileAtChallengeStart}
              afterProfile={profileAfterAttempt}
              topicResults={lastTopicResults}
              onStartFocus={() => chooseSoloChallengeMode("focus_mission")}
              onPrimary={() => setStage("solo-mode")}
              primaryLabel="Choose Next Challenge"
              onSecondary={resetAll}
              secondaryLabel="Exit Knowledge Arena"
            />
          </section>
        )}

        {stage === "multiplayer-results" && (
          <section style={sectionBlockStyle}>
            <div style={resultsShellStyle}>
              <p style={eyebrowStyle}>Multiplayer Complete</p>
              <h2 style={resultsTitleStyle}>Leaderboard</h2>

              {attemptSaveMessage && (
                <p style={messageBannerStyle}>{attemptSaveMessage}</p>
              )}

              <div style={leaderboardListStyle}>
                {leaderboard.map((player, index) => (
                  <div key={player.id} style={leaderboardRowStyle}>
                    <strong>
                      #{index + 1} {player.display_name}
                    </strong>
                    <span>
                      {player.score} pts · {player.correct_count}/10
                    </span>
                  </div>
                ))}
              </div>

              {isHost && lobby?.status !== "finished" && (
                <button
                  type="button"
                  onClick={endLobby}
                  style={{ ...mainButtonStyle, marginTop: "24px" }}
                >
                  End Lobby for Everyone
                </button>
              )}

              <button
                type="button"
                onClick={resetAll}
                style={{ ...backButtonStyle, marginTop: "16px" }}
              >
                Back to Mode Select
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <p style={sectionCopyStyle}>{subtitle}</p>
    </div>
  );
}

function TopBar({
  label,
  onBack,
  backLabel = "Back",
}: {
  label: string;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div style={topBarStyle}>
      <button type="button" onClick={onBack} style={backButtonStyle}>
        ← {backLabel}
      </button>
      <p style={{ ...eyebrowStyle, margin: 0 }}>{label}</p>
    </div>
  );
}

function TimerSelector({
  title,
  value,
  onChange,
}: {
  title: string;
  value: TimerSeconds;
  onChange: (value: TimerSeconds) => void;
}) {
  return (
    <div style={timerSelectorShellStyle}>
      <span style={timerLabelStyle}>{title}</span>
      <div style={timerToggleStyle}>
        {[10, 20].map((timer) => {
          const active = value === timer;
          return (
            <button
              key={timer}
              type="button"
              onClick={() => onChange(timer as TimerSeconds)}
              style={timerOptionStyle(active)}
            >
              {timer}s
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopicPicker({
  isMobile,
  isCompact,
  title,
  onPick,
  buttonText,
  loadError,
  disabled = false,
  profile = null,
}: {
  isMobile: boolean;
  isCompact: boolean;
  title: string;
  onPick: (topic: KnowledgeArenaTopic) => void;
  buttonText: string;
  loadError?: string | null;
  disabled?: boolean;
  profile?: KnowledgeArenaProfile | null;
}) {
  return (
    <div>
      <p style={pickerDescriptionStyle}>{title}</p>
      {loadError && <p style={errorStyle}>{loadError}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isCompact
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(4, minmax(0, 1fr))",
          gap: "20px",
        }}
      >
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(topic.id)}
            style={topicCardStyle(topic.coverImage, topic.accent)}
          >
            <div style={topicOverlayStyle} />
            <div style={topicContentStyle}>
              <div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={topicPillStyle(topic.accent)}>Knowledge World</span>
                  <TopicMasteryChip profile={profile} topic={topic.id} />
                </div>
                <h3 style={topicTitleStyle}>{topic.title}</h3>
                <p style={topicSubtitleStyle}>{topic.subtitle}</p>
              </div>
              <div style={topicActionStyle}>{buttonText} ›</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChallengeModePicker({
  profile,
  isSignedIn,
  isMobile,
  onChoose,
}: {
  profile: KnowledgeArenaProfile | null;
  isSignedIn: boolean;
  isMobile: boolean;
  onChoose: (mode: ChallengeMode) => void;
}) {
  const recommendation = profile?.recommended_topic_title;

  return (
    <div>
      <SectionHeading
        title="Choose your challenge"
        subtitle="Quick Play stays classic. Nova modes use the same mastery already calculated by Nova Analytics."
      />
      <div style={challengeGridStyle(isMobile)}>
        {(Object.keys(challengeModeMeta) as ChallengeMode[]).map((mode) => {
          const meta = challengeModeMeta[mode];
          const personalised = mode === "focus_mission" || mode === "nova_challenge";
          const disabled = personalised && !isSignedIn;
          let detail = "";

          if (mode === "focus_mission") {
            detail = recommendation
              ? `Current focus: ${recommendation}`
              : "Build your first knowledge focus.";
          } else if (mode === "nova_challenge") {
            detail = profile?.profile_ready
              ? "Uses your current four-world mastery profile."
              : "Builds an initial profile across all four worlds.";
          } else if (mode === "quick_play") {
            detail = "Choose any one of the four worlds.";
          } else {
            detail = "Choose a world, then face higher-difficulty questions.";
          }

          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(mode)}
              style={challengeCardStyle(meta.accent, disabled)}
            >
              <div style={challengeCardTopStyle}>
                <span style={challengeIconStyle(meta.accent)}>{meta.icon}</span>
                <span style={challengeEyebrowStyle}>{meta.eyebrow}</span>
              </div>
              <h3 style={challengeTitleStyle}>{meta.title}</h3>
              <p style={challengeDescriptionStyle}>{meta.description}</p>
              <div style={challengeDetailStyle}>{disabled ? "Log in to personalise" : detail}</div>
              <div style={challengeActionStyle(meta.accent)}>
                {disabled ? "Login required" : mode === "quick_play" || mode === "expert_challenge" ? "Choose World ›" : "Start Challenge ›"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KnowledgeProfilePanel({
  profile,
  loading,
  error,
  onStartFocus,
}: {
  profile: KnowledgeArenaProfile | null;
  loading: boolean;
  error: string | null;
  onStartFocus: () => void;
}) {
  if (loading) {
    return <MessageCard message="Loading your Knowledge Arena profile from Nova Analytics..." />;
  }

  if (!profile) {
    return (
      <div style={profilePanelStyle}>
        <div>
          <p style={{ ...eyebrowStyle, color: "#c9a8ff" }}>Your Knowledge Profile</p>
          <h3 style={profileTitleStyle}>Nova mastery appears after you log in</h3>
          <p style={profileCopyStyle}>
            Quick Play and Expert Challenge can still be explored, but personalised Focus Missions and Nova Challenges use your saved Nova Analytics profile.
          </p>
          {error && <p style={{ ...profileCopyStyle, color: "#ffe6a8" }}>{error}</p>}
        </div>
        <Link href="/login" style={mainButtonStyle}>
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div style={profilePanelStyle}>
      <div style={profileHeaderStyle}>
        <div>
          <p style={{ ...eyebrowStyle, color: "#c9a8ff" }}>Your Knowledge Profile</p>
          <h3 style={profileTitleStyle}>
            {profile.profile_ready ? "Nova knows your current knowledge pattern" : "Build your first knowledge profile"}
          </h3>
          <p style={profileCopyStyle}>
            This is a direct view of Nova Analytics mastery. Knowledge Arena does not calculate a second mastery score.
          </p>
        </div>
        <div style={overallMasteryCardStyle}>
          <span>Overall mastery</span>
          <strong>{profile.overall_mastery === null ? "—" : formatMastery(profile.overall_mastery)}</strong>
          <small>{profile.total_questions_attempted} questions of evidence</small>
        </div>
      </div>

      <div style={profileTopicGridStyle}>
        {topics.map((topic) => {
          const row = getProfileTopic(profile, topic.id);
          return (
            <div key={topic.id} style={profileTopicCardStyle(topic.accent)}>
              <span>{topic.title}</span>
              <strong>{row?.mastery_score === null || row?.mastery_score === undefined ? "—" : formatMastery(row.mastery_score)}</strong>
              <small>
                {row?.has_evidence
                  ? `${row.questions_attempted ?? 0} questions · ${formatStatus(row.status)}`
                  : "No evidence yet"}
              </small>
            </div>
          );
        })}
      </div>

      <div style={recommendationCalloutStyle}>
        <div>
          <span style={fieldCaptionStyle}>Nova recommends</span>
          <strong style={{ display: "block", marginTop: "6px", fontSize: "19px" }}>
            {profile.recommended_topic_title
              ? `Focus next: ${profile.recommended_topic_title}`
              : "Keep building your profile"}
          </strong>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
            {profile.recommendation_reason}
          </p>
        </div>
        <button type="button" onClick={onStartFocus} style={nextButtonStyle}>
          Start Focus Mission →
        </button>
      </div>

      <Link href={NOVA_ANALYTICS_HREF} style={fullAnalyticsLinkStyle}>
        View Full Nova Analytics →
      </Link>
    </div>
  );
}

function TopicMasteryChip({
  profile,
  topic,
}: {
  profile: KnowledgeArenaProfile | null;
  topic: KnowledgeArenaTopic;
}) {
  if (!profile) return null;
  const row = getProfileTopic(profile, topic);
  return (
    <span style={topicMasteryChipStyle}>
      {row?.mastery_score === null || row?.mastery_score === undefined
        ? "No mastery yet"
        : `Mastery ${formatMastery(row.mastery_score)}`}
    </span>
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

function formatStatus(status?: string | null) {
  if (!status || status === "not_enough_data") return "Building";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function NameInput({
  displayName,
  setDisplayName,
}: {
  displayName: string;
  setDisplayName: (value: string) => void;
}) {
  return (
    <label style={fieldLabelStyle}>
      <span style={fieldCaptionStyle}>Player Name</span>
      <input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Enter your player name"
        style={inputStyle}
      />
    </label>
  );
}

function QuizView({
  isMobile,
  isCompact,
  isSolo,
  topicTitle,
  topicAccent,
  challengeLabel,
  question,
  questionIndex,
  score,
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
  isMobile: boolean;
  isCompact: boolean;
  isSolo: boolean;
  topicTitle: string;
  topicAccent: string;
  challengeLabel: string;
  question: KnowledgeArenaQuestion;
  questionIndex: number;
  score: number;
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

  return (
    <div>
      <div style={quizTopBarStyle}>
        <button type="button" onClick={onBack} style={backButtonStyle}>
          ← Back
        </button>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <StatusPill label="Mode" value={challengeLabel} />
          <StatusPill label="Topic" value={topicTitle} />
          <StatusPill label="Score" value={String(score)} />
          <StatusPill label="Question" value={`${questionIndex + 1}/10`} />
          <StatusPill label="Timer" value={`${timerSeconds}s`} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.15fr) 380px",
          gap: "22px",
        }}
      >
        <div style={quizMainCardStyle}>
          <div style={quizHeaderRowStyle}>
            <div>
              <p style={{ ...eyebrowStyle, color: topicAccent }}>{topicTitle}</p>
              <h2 style={{ margin: "10px 0 0", fontSize: isMobile ? "26px" : "32px" }}>
                Question {questionIndex + 1}
              </h2>
            </div>

            <div style={timerCircleStyle(timeLeft <= Math.max(3, timerSeconds / 3))}>
              <strong style={{ fontSize: "30px" }}>{timeLeft}</strong>
              <span style={{ fontSize: "11px" }}>seconds</span>
            </div>
          </div>

          {question.question_image && (
            <div style={questionImageShellStyle}>
              <img
                src={question.question_image}
                alt={`Question ${questionIndex + 1}`}
                style={questionImageStyle}
                draggable={false}
              />
            </div>
          )}

          <p style={questionTextStyle(isMobile)}>{question.question_text}</p>
          <p style={difficultyStyle}>Difficulty: {question.difficulty}</p>

          {feedback && (
            <div
              style={feedbackCardStyle(
                selectedAnswer === question.correct_answer && selectedAnswer !== null
              )}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color:
                    selectedAnswer === question.correct_answer && selectedAnswer !== null
                      ? "#86efac"
                      : selectedAnswer === null
                      ? "#ffd76a"
                      : "#fca5a5",
                }}
              >
                {selectedAnswer === question.correct_answer && selectedAnswer !== null
                  ? "Correct!"
                  : selectedAnswer === null
                  ? "Time's up!"
                  : "Not quite."}
              </strong>

              {feedback}

              <div style={feedbackFooterStyle}>
                <span style={{ color: "#7ee8ff", fontWeight: 700 }}>
                  Next question in {nextCountdown}...
                </span>

                {isSolo && answerLocked && (
                  <button type="button" onClick={onNext} style={nextButtonStyle}>
                    Next Question →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={quizSideCardStyle}>
          <h3 style={{ margin: 0, fontSize: "22px" }}>Choose your answer</h3>
          <p style={quizInstructionStyle}>Tap one answer. Feedback appears immediately.</p>

          <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
            {options.map(([label, text]) => (
              <button
                key={label}
                type="button"
                disabled={answerLocked}
                onClick={() => onChoose(label)}
                style={{
                  ...answerButtonBaseStyle,
                  ...getAnswerStyle(label),
                }}
              >
                <strong style={answerLetterStyle}>{label}</strong>
                <span>{text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({
  title,
  challengeMode,
  score,
  correctCount,
  tokensEarned,
  tokenBalance,
  rewardSaved,
  saveMessage,
  beforeProfile,
  afterProfile,
  topicResults,
  onStartFocus,
  onPrimary,
  primaryLabel,
  onSecondary,
  secondaryLabel,
}: {
  title: string;
  challengeMode: ChallengeMode;
  score: number;
  correctCount: number;
  tokensEarned: number;
  tokenBalance: number;
  rewardSaved: boolean;
  saveMessage: string;
  beforeProfile: KnowledgeArenaProfile | null;
  afterProfile: KnowledgeArenaProfile | null;
  topicResults: TopicResult[];
  onStartFocus: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  onSecondary: () => void;
  secondaryLabel: string;
}) {
  return (
    <div style={resultsPanelStyle}>
      <p style={eyebrowStyle}>{challengeModeMeta[challengeMode].title}</p>
      <h2 style={{ margin: "12px 0 28px", fontSize: "38px" }}>{title}</h2>

      <div style={resultsStatsGridStyle}>
        <ResultStat label="Correct" value={`${correctCount}/10`} />
        <ResultStat label="Score" value={String(score)} />
        <ResultStat label="Tokens" value={`+${tokensEarned}`} />
        <ResultStat label="Balance" value={String(tokenBalance)} />
      </div>

      <p style={resultsMessageStyle}>
        {saveMessage ||
          (rewardSaved
            ? "Your attempt and Dreamscape Token reward have been saved."
            : "Log in to save your attempt and receive Dreamscape Tokens.")}
      </p>

      {(afterProfile || topicResults.length > 0) && (
        <KnowledgeImpactPanel
          beforeProfile={beforeProfile}
          afterProfile={afterProfile}
          topicResults={topicResults}
          onStartFocus={onStartFocus}
        />
      )}

      <div style={resultsButtonRowStyle}>
        <button type="button" onClick={onPrimary} style={backButtonStyle}>
          {primaryLabel}
        </button>

        <button type="button" onClick={onSecondary} style={mainButtonStyle}>
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

function KnowledgeImpactPanel({
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
    : afterProfile?.topics.filter((topic) => topic.has_evidence).map((topic) => topic.topic) || [];

  return (
    <div style={impactPanelStyle}>
      <div style={impactHeadingStyle}>
        <div>
          <p style={{ ...eyebrowStyle, color: "#c9a8ff" }}>Knowledge impact</p>
          <h3 style={{ margin: "8px 0 0", fontSize: "24px" }}>
            Nova refreshed your profile
          </h3>
        </div>
        {afterProfile?.overall_mastery !== null && afterProfile?.overall_mastery !== undefined && (
          <div style={overallMasteryBadgeStyle}>
            <span>Overall mastery</span>
            <strong>{formatMastery(afterProfile.overall_mastery)}</strong>
          </div>
        )}
      </div>

      <div style={impactRowsStyle}>
        {affectedTopics.map((topicId) => {
          const result = topicResults.find((item) => item.topic === topicId);
          const before = getProfileTopic(beforeProfile, topicId);
          const after = getProfileTopic(afterProfile, topicId);
          const beforeValue = before?.mastery_score ?? null;
          const afterValue = after?.mastery_score ?? null;
          const delta =
            beforeValue !== null && afterValue !== null
              ? Number((afterValue - beforeValue).toFixed(1))
              : null;

          return (
            <div key={topicId} style={impactRowStyle}>
              <div>
                <strong>{topicTitle(topicId)}</strong>
                <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.62)" }}>
                  {result
                    ? `${result.correct_count}/${result.total_questions} correct in this challenge`
                    : "New evidence added to Nova Analytics"}
                </small>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ color: "#7ee8ff" }}>
                  {afterValue === null ? "Building" : formatMastery(afterValue)}
                </strong>
                {delta !== null && delta !== 0 && (
                  <small
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: delta > 0 ? "#86efac" : "#fca5a5",
                    }}
                  >
                    {delta > 0 ? "+" : ""}{delta.toFixed(1)} mastery
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {afterProfile?.recommended_topic_title && (
        <div style={recommendationCalloutStyle}>
          <div>
            <span style={fieldCaptionStyle}>Nova recommends</span>
            <strong style={{ display: "block", marginTop: "6px", fontSize: "18px" }}>
              Focus next: {afterProfile.recommended_topic_title}
            </strong>
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              {afterProfile.recommendation_reason}
            </p>
          </div>
          <button type="button" onClick={onStartFocus} style={nextButtonStyle}>
            Start Focus Mission →
          </button>
        </div>
      )}

      <Link href={NOVA_ANALYTICS_HREF} style={fullAnalyticsLinkStyle}>
        View Full Nova Analytics →
      </Link>
    </div>
  );
}

function MessageCard({ message }: { message: string }) {
  return <div style={messageCardStyle}>{message}</div>;
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={statusPillStyle}>
      {label}: <strong style={{ color: "#7ee8ff" }}>{value}</strong>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={resultStatStyle}>
      <p style={resultStatLabelStyle}>{label}</p>
      <p style={resultStatValueStyle}>{value}</p>
    </div>
  );
}

const pageStyle = (isMobile: boolean): CSSProperties => ({
  minHeight: "100dvh",
  width: "100%",
  backgroundImage: `
    linear-gradient(180deg, rgba(2, 8, 19, 0.7), rgba(2, 8, 19, 0.92)),
    radial-gradient(circle at 50% 0%, rgba(126,232,255,0.14), transparent 34%),
    url("/activities/learning-missions/knowledge-arena/knowledge-arena-bg.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: isMobile ? "scroll" : "fixed",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  padding: isMobile ? "18px 18px 34px" : "26px 28px 42px",
  overflowX: "hidden",
});

const shellStyle: CSSProperties = {
  maxWidth: "1380px",
  margin: "0 auto",
};

const heroStyle = (isMobile: boolean): CSSProperties => ({
  marginTop: isMobile ? "32px" : "38px",
  padding: isMobile ? "8px 0 0" : "16px 0 6px",
});

const heroTitleStyle = (isMobile: boolean): CSSProperties => ({
  margin: "14px 0 0",
  fontSize: isMobile ? "50px" : "78px",
  lineHeight: 0.94,
  fontWeight: 400,
  letterSpacing: "0.02em",
});

const heroCopyStyle = (isMobile: boolean): CSSProperties => ({
  maxWidth: "720px",
  margin: "18px 0 0",
  color: "rgba(255,255,255,0.72)",
  fontSize: isMobile ? "16px" : "19px",
  lineHeight: 1.6,
});

const sectionBlockStyle: CSSProperties = {
  marginTop: "28px",
  display: "grid",
  gap: "22px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "32px",
};

const sectionCopyStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.72)",
  fontSize: "16px",
  lineHeight: 1.55,
};

const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const stackStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
};

const modeGridStyle = (isMobile: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  gap: "22px",
});

const modeCardStyle = (accent: string): CSSProperties => ({
  minHeight: "250px",
  borderRadius: "28px",
  border: `1px solid ${accent}55`,
  background:
    "linear-gradient(180deg, rgba(12,30,66,0.86), rgba(6,18,44,0.96))",
  boxShadow: `0 0 24px ${accent}18, inset 0 0 0 1px rgba(255,255,255,0.03)`,
  padding: "28px",
  display: "grid",
  gridTemplateRows: "auto auto 1fr auto",
  gap: "14px",
  color: "white",
  textAlign: "left",
  cursor: "pointer",
});

const modeIconStyle: CSSProperties = {
  width: "60px",
  height: "60px",
  borderRadius: "18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  background: "rgba(255,255,255,0.08)",
};

const modeTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  fontWeight: 700,
};

const modeCopyStyle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "16px",
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.76)",
};

const primaryActionStyle: CSSProperties = {
  marginTop: "auto",
  height: "52px",
  borderRadius: "16px",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 800,
};

const timerSelectorShellStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  padding: "16px 18px",
};

const timerLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.8)",
  fontSize: "15px",
  fontWeight: 700,
};

const timerToggleStyle: CSSProperties = {
  display: "inline-flex",
  gap: "8px",
  padding: "6px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(126,232,255,0.18)",
};

const timerOptionStyle = (active: boolean): CSSProperties => ({
  minWidth: "84px",
  height: "42px",
  padding: "0 18px",
  borderRadius: "999px",
  border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid transparent",
  background: active
    ? "linear-gradient(135deg,#35c5ff,#4c6dff)"
    : "transparent",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
});

const pickerDescriptionStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.74)",
  fontSize: "16px",
  lineHeight: 1.55,
};

const topicCardStyle = (imagePath: string, accent: string): CSSProperties => ({
  position: "relative",
  minHeight: "420px",
  borderRadius: "30px",
  overflow: "hidden",
  border: `1px solid ${accent}55`,
  backgroundImage: `url("${imagePath}")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  boxShadow: `0 0 28px ${accent}14, 0 24px 60px rgba(0,0,0,0.28)`,
  cursor: "pointer",
  color: "white",
  textAlign: "left",
});

const topicOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(6,14,30,0.16) 0%, rgba(8,16,36,0.12) 22%, rgba(6,18,42,0.5) 56%, rgba(3,10,24,0.96) 100%)",
};

const topicContentStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  height: "100%",
  padding: "22px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "16px",
};

const topicPillStyle = (accent: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "30px",
  padding: "0 12px",
  borderRadius: "999px",
  border: `1px solid ${accent}66`,
  background: "rgba(7, 18, 42, 0.45)",
  color: "white",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

const topicTitleStyle: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "30px",
  lineHeight: 1.05,
};

const topicSubtitleStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "rgba(255,255,255,0.84)",
  fontSize: "15px",
  lineHeight: 1.5,
  maxWidth: "280px",
};

const topicActionStyle: CSSProperties = {
  minHeight: "48px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  backdropFilter: "blur(10px)",
};

const joinCardStyle: CSSProperties = {
  maxWidth: "620px",
  borderRadius: "28px",
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  padding: "24px",
};

const waitingShellStyle: CSSProperties = {
  maxWidth: "820px",
  margin: "0 auto",
  textAlign: "center",
  display: "grid",
  gap: "18px",
};

const lobbyCodeStyle = (isMobile: boolean): CSSProperties => ({
  margin: 0,
  fontSize: isMobile ? "42px" : "62px",
  letterSpacing: "0.16em",
});

const waitingMetaRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "10px",
};

const waitingPlayersGridStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const playerTileStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.08)",
  padding: "14px 16px",
};

const helperTextStyle: CSSProperties = {
  margin: 0,
  color: "#ffd76a",
};

const quizTopBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const quizMainCardStyle: CSSProperties = {
  borderRadius: "28px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "linear-gradient(180deg, rgba(14,35,72,0.86), rgba(7,18,42,0.95))",
  padding: "26px",
};

const quizSideCardStyle: CSSProperties = {
  borderRadius: "28px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.06)",
  padding: "24px",
  height: "fit-content",
};

const quizHeaderRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
};

const timerCircleStyle = (isUrgent: boolean): CSSProperties => ({
  width: "88px",
  height: "88px",
  borderRadius: "999px",
  border: `1px solid ${isUrgent ? "rgba(248,113,113,0.65)" : "rgba(126,232,255,0.5)"}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  color: isUrgent ? "#ffb3b3" : "#7ee8ff",
  flexShrink: 0,
});

const questionImageShellStyle: CSSProperties = {
  marginTop: "22px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.95)",
  minHeight: "220px",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const questionImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const questionTextStyle = (isMobile: boolean): CSSProperties => ({
  margin: "24px 0 0",
  fontSize: isMobile ? "21px" : "29px",
  lineHeight: 1.35,
});

const difficultyStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "rgba(255,255,255,0.6)",
  fontSize: "14px",
};

const feedbackCardStyle = (isCorrect: boolean): CSSProperties => ({
  marginTop: "22px",
  borderRadius: "18px",
  border: isCorrect
    ? "1px solid rgba(74,222,128,0.55)"
    : "1px solid rgba(248,113,113,0.45)",
  background: isCorrect ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)",
  padding: "18px 20px",
  lineHeight: 1.55,
});

const feedbackFooterStyle: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const nextButtonStyle: CSSProperties = {
  minHeight: "44px",
  padding: "0 16px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.35)",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const quizInstructionStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.7)",
  lineHeight: 1.55,
};

const resultsShellStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: "760px",
  textAlign: "center",
};

const resultsTitleStyle: CSSProperties = {
  margin: "12px 0 28px",
  fontSize: "42px",
};

const messageBannerStyle: CSSProperties = {
  margin: "0 0 22px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(126,232,255,0.08)",
  padding: "14px 16px",
  color: "rgba(255,255,255,0.82)",
  lineHeight: 1.5,
};

const leaderboardListStyle: CSSProperties = {
  marginTop: "24px",
  display: "grid",
  gap: "12px",
};

const leaderboardRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.08)",
  padding: "14px 16px",
};

const resultsPanelStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: "760px",
  borderRadius: "28px",
  border: "1px solid rgba(126,232,255,0.4)",
  background:
    "linear-gradient(180deg, rgba(17,82,136,0.86), rgba(7,27,68,0.98))",
  padding: "36px",
  textAlign: "center",
};

const resultsStatsGridStyle: CSSProperties = {
  marginTop: "28px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "12px",
};

const resultsMessageStyle: CSSProperties = {
  margin: "26px 0 0",
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.5,
};

const resultsButtonRowStyle: CSSProperties = {
  marginTop: "28px",
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const messageCardStyle: CSSProperties = {
  margin: "22px auto",
  maxWidth: "560px",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.08)",
  padding: "30px",
  textAlign: "center",
  color: "rgba(255,255,255,0.82)",
};

const statusPillStyle: CSSProperties = {
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.07)",
  padding: "9px 14px",
  fontSize: "13px",
  color: "rgba(255,255,255,0.72)",
};

const resultStatStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(255,255,255,0.08)",
  padding: "16px 10px",
};

const resultStatLabelStyle: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const resultStatValueStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "24px",
  fontWeight: 700,
};

const challengeGridStyle = (isMobile: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  gap: "18px",
});

const challengeCardStyle = (accent: string, disabled: boolean): CSSProperties => ({
  minHeight: "260px",
  borderRadius: "26px",
  border: `1px solid ${accent}55`,
  background: "linear-gradient(180deg, rgba(13,31,67,0.9), rgba(6,17,39,0.97))",
  boxShadow: `0 0 24px ${accent}14`,
  padding: "24px",
  color: "white",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
});

const challengeCardTopStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const challengeIconStyle = (accent: string): CSSProperties => ({
  width: "48px",
  height: "48px",
  borderRadius: "15px",
  border: `1px solid ${accent}55`,
  background: `${accent}18`,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "23px",
});

const challengeEyebrowStyle: CSSProperties = {
  color: "rgba(255,255,255,0.54)",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const challengeTitleStyle: CSSProperties = {
  margin: "18px 0 0",
  fontSize: "28px",
  lineHeight: 1.1,
};

const challengeDescriptionStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "rgba(255,255,255,0.74)",
  fontSize: "15px",
  lineHeight: 1.55,
};

const challengeDetailStyle: CSSProperties = {
  margin: "16px 0 0",
  color: "#bfefff",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 700,
};

const challengeActionStyle = (accent: string): CSSProperties => ({
  marginTop: "auto",
  minHeight: "46px",
  borderRadius: "14px",
  border: `1px solid ${accent}55`,
  background: `${accent}18`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
});

const profilePanelStyle: CSSProperties = {
  borderRadius: "28px",
  border: "1px solid rgba(201,168,255,0.28)",
  background: "linear-gradient(145deg, rgba(27,27,69,0.82), rgba(7,18,42,0.95))",
  padding: "26px",
  display: "grid",
  gap: "22px",
};

const profileHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap",
};

const profileTitleStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "28px",
};

const profileCopyStyle: CSSProperties = {
  maxWidth: "720px",
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.68)",
  lineHeight: 1.55,
};

const overallMasteryCardStyle: CSSProperties = {
  minWidth: "180px",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.06)",
  padding: "18px",
  display: "grid",
  gap: "5px",
  textAlign: "right",
};

const profileTopicGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
};

const profileTopicCardStyle = (accent: string): CSSProperties => ({
  borderRadius: "18px",
  border: `1px solid ${accent}44`,
  background: "rgba(255,255,255,0.055)",
  padding: "16px",
  display: "grid",
  gap: "7px",
});

const recommendationCalloutStyle: CSSProperties = {
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(126,232,255,0.07)",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const fullAnalyticsLinkStyle: CSSProperties = {
  minHeight: "46px",
  borderRadius: "14px",
  border: "1px solid rgba(201,168,255,0.3)",
  background: "rgba(201,168,255,0.08)",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const topicMasteryChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "30px",
  padding: "0 12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(7,18,42,0.48)",
  color: "#c8f3ff",
  fontSize: "12px",
  fontWeight: 800,
};

const impactPanelStyle: CSSProperties = {
  marginTop: "24px",
  borderRadius: "22px",
  border: "1px solid rgba(201,168,255,0.28)",
  background: "rgba(8,18,45,0.6)",
  padding: "20px",
  textAlign: "left",
  display: "grid",
  gap: "16px",
};

const impactHeadingStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
};

const overallMasteryBadgeStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(126,232,255,0.07)",
  padding: "12px 14px",
  display: "grid",
  gap: "3px",
  textAlign: "right",
};

const impactRowsStyle: CSSProperties = {
  display: "grid",
  gap: "9px",
};

const impactRowStyle: CSSProperties = {
  borderRadius: "15px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.045)",
  padding: "13px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const navButtonStyle: CSSProperties = {
  minHeight: "42px",
  padding: "0 18px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 700,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "13px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const backButtonStyle: CSSProperties = {
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  borderRadius: "999px",
  padding: "10px 16px",
  cursor: "pointer",
};

const mainButtonStyle: CSSProperties = {
  minHeight: "56px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  color: "white",
  padding: "0 22px",
  fontWeight: 800,
  cursor: "pointer",
  letterSpacing: "0.04em",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "56px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 18px",
  fontSize: "16px",
  outline: "none",
  boxSizing: "border-box",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const fieldCaptionStyle: CSSProperties = {
  color: "rgba(255,255,255,0.52)",
  fontSize: "12px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  fontWeight: 900,
};

const errorStyle: CSSProperties = {
  margin: "18px 0 0",
  borderRadius: "16px",
  border: "1px solid rgba(255,215,106,0.45)",
  background: "rgba(255,215,106,0.1)",
  padding: "14px 16px",
  color: "#ffe6a8",
  fontSize: "14px",
};

const answerButtonBaseStyle: CSSProperties = {
  borderRadius: "16px",
  minHeight: "62px",
  padding: "12px 14px",
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: "12px",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 180ms ease, border 180ms ease",
};

const answerLetterStyle: CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
};
