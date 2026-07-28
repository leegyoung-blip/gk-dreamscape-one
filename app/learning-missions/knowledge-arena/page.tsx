"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

type KnowledgeArenaTopic =
  | "world_explorer"
  | "time_traveller"
  | "science_sparks"
  | "mystery_logic";

type KnowledgeArenaAnswer = "A" | "B" | "C" | "D";

type PageStage =
  | "mode"
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

type SavedArenaAttempt = {
  attempt_id?: string;
  score?: number;
  correct_count?: number;
  total_questions?: number;
  tokens_earned?: number;
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
  icon: string;
  accent: string;
}[] = [
  {
    id: "world_explorer",
    title: "World Explorer",
    subtitle: "Geography, countries, landmarks, cultures, and nature.",
    icon: "🌍",
    accent: "#53d7ff",
  },
  {
    id: "time_traveller",
    title: "Time Traveller",
    subtitle: "History, inventions, ancient worlds, and famous moments.",
    icon: "⏳",
    accent: "#ffd76a",
  },
  {
    id: "science_sparks",
    title: "Science Sparks",
    subtitle: "Space, animals, nature, the body, and simple science.",
    icon: "⚡",
    accent: "#60f0d0",
  },
  {
    id: "mystery_logic",
    title: "Mystery Logic",
    subtitle: "Riddles, clues, deduction, patterns, and smart guesses.",
    icon: "◇",
    accent: "#ff9df0",
  },
];

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

function calculatePoints(isCorrect: boolean, secondsRemaining: number) {
  if (!isCorrect) return 0;
  return Math.min(40 + secondsRemaining * 3, 100);
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
  const [timeLeft, setTimeLeft] = useState(20);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nextCountdown, setNextCountdown] = useState(5);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [rewardSaved, setRewardSaved] = useState(false);
  const [attemptSaveMessage, setAttemptSaveMessage] = useState("");

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
  const isHost = Boolean(lobby && userId && lobby.host_user_id === userId);

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
    if (stage !== "solo-quiz" && stage !== "multiplayer-quiz") return;
    if (answerLocked || !currentQuestion) return;

    if (timeLeft <= 0) {
      void lockAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
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

  async function loadQuestions(topic: KnowledgeArenaTopic) {
    setStage("loading");
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
      setStage("topic");
      return [];
    }

    return data as KnowledgeArenaQuestion[];
  }

  async function startSolo(topic: KnowledgeArenaTopic) {
    const loadedQuestions = await loadQuestions(topic);
    if (loadedQuestions.length < 10) return;

    setQuestions(loadedQuestions);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(20);
    setAnswerLocked(false);
    setFeedback(null);
    setNextCountdown(5);
    setTokensEarned(0);
    setRewardSaved(false);
    setAttemptSaveMessage("");
    recordedAnswersRef.current = [];
    attemptSaveStartedRef.current = false;
    setStage("solo-quiz");
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
      setLobby(lobbyData as Lobby);
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
    resetQuestionState();
    setStage("multiplayer-quiz");
    await loadLobbyState(lobby.id);
  }

  async function prepareMultiplayerGame(nextLobby: Lobby) {
    const loadedQuestions = await loadQuestionsByIds(nextLobby.question_ids);
    if (loadedQuestions.length < 10) return;

    setQuestions(loadedQuestions);
    setSelectedTopic(nextLobby.topic);
    resetQuestionState();
    setStage("multiplayer-quiz");
  }

  function resetQuestionState() {
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(20);
    setAnswerLocked(false);
    setFeedback(null);
    setNextCountdown(5);
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
    if (!userId || !selectedTopic) {
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

    const { data, error } = await supabase.rpc(
      "save_knowledge_arena_attempt",
      {
        p_topic: selectedTopic,
        p_mode: mode,
        p_answers: answerPayload,
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

    if (mode === "solo" && savedReward > 0) {
      setTokenBalance((current) => current + savedReward);
      window.dispatchEvent(new Event("dream-tokens-updated"));
    }

    setAttemptSaveMessage(
      mode === "solo"
        ? "Your attempt, individual answers, explanations, and Dreamscape Token reward were saved."
        : "Your multiplayer attempt and individual answers were saved to the Teaching Dashboard."
    );

    return saved;
  }

  async function lockAnswer(answer: KnowledgeArenaAnswer | null) {
    if (!currentQuestion || answerLocked) return;

    const isCorrect = answer === currentQuestion.correct_answer;
    const points = calculatePoints(isCorrect, timeLeft);
    const secondsUsed = 20 - timeLeft;
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
      const nextAnswers = [
        ...(Array.isArray(myPlayer.answers) ? myPlayer.answers : []),
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
    setTimeLeft(20);
    setNextCountdown(5);
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
    resetQuestionState();
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
      border: "1px solid rgba(126,232,255,0.32)",
      background:
        selectedAnswer === label
          ? "linear-gradient(135deg,#35c5ff,#4c6dff)"
          : "rgba(255,255,255,0.08)",
      color: answerLocked ? "rgba(255,255,255,0.55)" : "white",
    };
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(2, 8, 19, 0.72),
            rgba(2, 8, 19, 0.9)
          ),
          radial-gradient(circle at 50% 0%, rgba(126,232,255,0.18), transparent 36%),
          url("/activities/learning-missions/knowledge-arena/knowledge-arena-bg.png")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: isMobile ? "scroll" : "fixed",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: isMobile ? "18px" : "28px",
        overflowX: "hidden",
      }}
    >
      <header
        style={{
          maxWidth: "1220px",
          margin: "0 auto",
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

      <section
        style={{
          maxWidth: "1220px",
          margin: isMobile ? "44px auto 0" : "54px auto 0",
          textAlign: "center",
        }}
      >
        <p style={eyebrowStyle}>Learning Missions</p>

        <h1
          style={{
            margin: "12px 0 22px",
            fontSize: isMobile ? "46px" : "74px",
            lineHeight: 0.94,
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}
        >
          Knowledge Arena
        </h1>

        <p
          style={{
            maxWidth: "720px",
            margin: "18px auto 0",
            color: "rgba(255,255,255,0.68)",
            fontSize: "18px",
            lineHeight: 1.6,
          }}
        >
          Play solo or create a multiplayer lobby. Everyone gets the same 10
          questions.
        </p>
      </section>

      <section style={panelStyle(isMobile)}>
        {stage === "mode" && (
          <div style={twoColumnGrid(isMobile)}>
            <button
              type="button"
              onClick={() => setStage("topic")}
              style={bigCardStyle("#53d7ff")}
            >
              <div style={{ fontSize: "46px" }}>🎮</div>

              <h2 style={cardTitleStyle}>Single Player</h2>

              <p style={cardTextStyle}>
                Play a 10-question topic challenge on your own.
              </p>

              <div style={primaryButtonLook}>Start Solo Challenge ›</div>
            </button>

            <button
              type="button"
              onClick={() => setStage("multiplayer-menu")}
              style={bigCardStyle("#a9a9ff")}
            >
              <div style={{ fontSize: "46px" }}>👥</div>

              <h2 style={cardTitleStyle}>Multiplayer</h2>

              <p style={cardTextStyle}>
                Create or join a lobby and compete with friends.
              </p>

              <div style={primaryButtonLook}>Enter Multiplayer ›</div>
            </button>
          </div>
        )}

        {stage === "topic" && (
          <TopicPicker
            isMobile={isMobile}
            isCompact={isCompact}
            title="Choose 1 topic world to begin."
            onBack={() => setStage("mode")}
            onPick={(topic) => startSolo(topic)}
            loadError={loadError}
          />
        )}

        {stage === "multiplayer-menu" && (
          <div>
            <button
              type="button"
              onClick={() => setStage("mode")}
              style={backButtonStyle}
            >
              ← Back to mode
            </button>

            <div style={{ ...twoColumnGrid(isMobile), marginTop: "26px" }}>
              <button
                type="button"
                onClick={() => setStage("create-lobby")}
                style={bigCardStyle("#53d7ff")}
              >
                <h2 style={cardTitleStyle}>Create Lobby</h2>

                <p style={cardTextStyle}>
                  Choose a topic and share a code with other players.
                </p>

                <div style={primaryButtonLook}>Create Lobby ›</div>
              </button>

              <button
                type="button"
                onClick={() => setStage("join-lobby")}
                style={bigCardStyle("#ffd76a")}
              >
                <h2 style={cardTitleStyle}>Join Lobby</h2>

                <p style={cardTextStyle}>Enter a lobby code from the host.</p>

                <div style={primaryButtonLook}>Join Lobby ›</div>
              </button>
            </div>
          </div>
        )}

        {stage === "create-lobby" && (
          <div>
            <button
              type="button"
              onClick={() => setStage("multiplayer-menu")}
              style={backButtonStyle}
            >
              ← Back to multiplayer
            </button>

            <NameInput
              displayName={displayName}
              setDisplayName={setDisplayName}
            />

            <TopicPicker
              isMobile={isMobile}
              isCompact={isCompact}
              title="Choose topic for the lobby."
              onPick={(topic) => createLobby(topic)}
              buttonText={isCreatingLobby ? "Creating..." : "Create Lobby"}
              loadError={loadError || multiplayerMessage}
            />
          </div>
        )}

        {stage === "join-lobby" && (
          <div style={formCardStyle}>
            <button
              type="button"
              onClick={() => setStage("multiplayer-menu")}
              style={backButtonStyle}
            >
              ← Back to multiplayer
            </button>

            <div style={{ marginTop: "28px", display: "grid", gap: "22px" }}>
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
        )}

        {stage === "waiting-lobby" && lobby && (
          <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
            <button type="button" onClick={resetAll} style={backButtonStyle}>
              ← Leave lobby
            </button>

            <p style={{ ...eyebrowStyle, marginTop: "26px" }}>Lobby Code</p>

            <h2
              style={{
                margin: "12px 0",
                fontSize: isMobile ? "42px" : "58px",
                letterSpacing: "0.16em",
              }}
            >
              {lobby.code}
            </h2>

            <p style={{ color: "rgba(255,255,255,0.66)" }}>
              Topic: {topics.find((topic) => topic.id === lobby.topic)?.title}
            </p>

            <div style={{ marginTop: "26px", display: "grid", gap: "10px" }}>
              {players.map((player) => (
                <div key={player.id} style={playerRowStyle}>
                  <strong>{player.display_name}</strong>
                  <span>{player.is_host ? "Host" : "Player"}</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={startMultiplayerGame}
                style={{ ...mainButtonStyle, marginTop: "26px" }}
              >
                Start Game
              </button>
            ) : (
              <p style={{ marginTop: "26px", color: "#ffd76a" }}>
                Waiting for host to start.
              </p>
            )}
          </div>
        )}

        {stage === "loading" && (
          <MessageCard message="Loading Knowledge Arena questions..." />
        )}

        {(stage === "solo-quiz" || stage === "multiplayer-quiz") &&
          currentQuestion &&
          selectedTopicInfo && (
            <QuizView
              isMobile={isMobile}
              isCompact={isCompact}
              topicTitle={selectedTopicInfo.title}
              topicAccent={selectedTopicInfo.accent}
              question={currentQuestion}
              questionIndex={questionIndex}
              score={score}
              timeLeft={timeLeft}
              nextCountdown={nextCountdown}
              answerLocked={answerLocked}
              selectedAnswer={selectedAnswer}
              feedback={feedback}
              getAnswerStyle={getAnswerStyle}
              onChoose={(answer) => lockAnswer(answer)}
              onBack={stage === "solo-quiz" ? () => setStage("topic") : resetAll}
            />
          )}

        {stage === "solo-results" && (
          <ResultsPanel
            title="Challenge Complete"
            score={score}
            correctCount={correctCount}
            tokensEarned={tokensEarned}
            tokenBalance={tokenBalance}
            rewardSaved={rewardSaved}
            saveMessage={attemptSaveMessage}
            onPrimary={() => setStage("topic")}
            primaryLabel="Play Another Topic"
            onSecondary={resetAll}
            secondaryLabel="Exit Knowledge Arena"
          />
        )}

        {stage === "multiplayer-results" && (
          <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
            <p style={eyebrowStyle}>Multiplayer Complete</p>

            <h2 style={{ margin: "12px 0 28px", fontSize: "42px" }}>
              Leaderboard
            </h2>

            {attemptSaveMessage && (
              <p
                style={{
                  margin: "0 0 22px",
                  borderRadius: "16px",
                  border: "1px solid rgba(126,232,255,0.28)",
                  background: "rgba(126,232,255,0.08)",
                  padding: "14px 16px",
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.5,
                }}
              >
                {attemptSaveMessage}
              </p>
            )}

            <div style={{ marginTop: "24px", display: "grid", gap: "12px" }}>
              {leaderboard.map((player, index) => (
                <div key={player.id} style={playerRowStyle}>
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
        )}
      </section>
    </main>
  );
}

function TopicPicker({
  isMobile,
  isCompact,
  title,
  onBack,
  onPick,
  buttonText = "Start Quiz",
  loadError,
}: {
  isMobile: boolean;
  isCompact: boolean;
  title: string;
  onBack?: () => void;
  onPick: (topic: KnowledgeArenaTopic) => void;
  buttonText?: string;
  loadError?: string | null;
}) {
  return (
    <div>
      {onBack && (
        <button type="button" onClick={onBack} style={backButtonStyle}>
          ← Back
        </button>
      )}

      <p
        style={{
          margin: onBack ? "26px 0 24px" : "0 0 24px",
          color: "rgba(255,255,255,0.74)",
          fontSize: "16px",
          lineHeight: 1.55,
        }}
      >
        {title}
      </p>

      {loadError && <p style={errorStyle}>{loadError}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isCompact
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(4, minmax(0, 1fr))",
          gap: "22px",
        }}
      >
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onPick(topic.id)}
            style={bigCardStyle(topic.accent)}
          >
            <div style={{ fontSize: "38px" }}>{topic.icon}</div>

            <h2 style={{ ...cardTitleStyle, fontSize: "25px" }}>
              {topic.title}
            </h2>

            <p style={cardTextStyle}>{topic.subtitle}</p>

            <div style={primaryButtonLook}>{buttonText} ›</div>
          </button>
        ))}
      </div>
    </div>
  );
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
  topicTitle,
  topicAccent,
  question,
  questionIndex,
  score,
  timeLeft,
  nextCountdown,
  answerLocked,
  selectedAnswer,
  feedback,
  getAnswerStyle,
  onChoose,
  onBack,
}: {
  isMobile: boolean;
  isCompact: boolean;
  topicTitle: string;
  topicAccent: string;
  question: KnowledgeArenaQuestion;
  questionIndex: number;
  score: number;
  timeLeft: number;
  nextCountdown: number;
  answerLocked: boolean;
  selectedAnswer: KnowledgeArenaAnswer | null;
  feedback: string | null;
  getAnswerStyle: (answer: KnowledgeArenaAnswer) => CSSProperties;
  onChoose: (answer: KnowledgeArenaAnswer) => void;
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "22px",
        }}
      >
        <button type="button" onClick={onBack} style={backButtonStyle}>
          ← Back
        </button>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <StatusPill label="Topic" value={topicTitle} />
          <StatusPill label="Score" value={String(score)} />
          <StatusPill label="Question" value={`${questionIndex + 1}/10`} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1.1fr) 360px",
          gap: "28px",
        }}
      >
        <div style={quizPanelStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "start",
            }}
          >
            <div>
              <p style={{ ...eyebrowStyle, color: topicAccent }}>{topicTitle}</p>

              <h2
                style={{
                  margin: "8px 0 0",
                  fontSize: isMobile ? "25px" : "30px",
                }}
              >
                Question {questionIndex + 1}
              </h2>
            </div>

            <div
              style={{
                width: "86px",
                height: "86px",
                borderRadius: "999px",
                border: "1px solid rgba(126,232,255,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                color: timeLeft <= 5 ? "#ffb3b3" : "#7ee8ff",
                flexShrink: 0,
              }}
            >
              <strong style={{ fontSize: "28px" }}>{timeLeft}</strong>
              <span style={{ fontSize: "11px" }}>seconds</span>
            </div>
          </div>

          {question.question_image && (
            <div
              style={{
                marginTop: "24px",
                borderRadius: "20px",
                background: "rgba(255,255,255,0.95)",
                minHeight: "220px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={question.question_image}
                alt={`Question ${questionIndex + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
                draggable={false}
              />
            </div>
          )}

          <p
            style={{
              margin: "26px 0 0",
              fontSize: isMobile ? "21px" : "28px",
              lineHeight: 1.35,
            }}
          >
            {question.question_text}
          </p>

          <p
            style={{
              margin: "14px 0 0",
              color: "rgba(255,255,255,0.62)",
              fontSize: "14px",
            }}
          >
            Difficulty: {question.difficulty}
          </p>

          {feedback && (
            <div
              style={{
                marginTop: "24px",
                borderRadius: "18px",
                border:
                  selectedAnswer === question.correct_answer
                    ? "1px solid rgba(74,222,128,0.6)"
                    : "1px solid rgba(248,113,113,0.6)",
                background:
                  selectedAnswer === question.correct_answer
                    ? "rgba(34,197,94,0.14)"
                    : "rgba(239,68,68,0.14)",
                padding: "18px 20px",
                lineHeight: 1.5,
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color:
                    selectedAnswer === question.correct_answer
                      ? "#86efac"
                      : "#fca5a5",
                }}
              >
                {selectedAnswer === question.correct_answer
                  ? "Correct!"
                  : selectedAnswer === null
                  ? "Time's up!"
                  : "Not quite."}
              </strong>

              {feedback}

              {answerLocked && (
                <div
                  style={{
                    marginTop: "12px",
                    color: "#7ee8ff",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Next question in {nextCountdown}...
                </div>
              )}
            </div>
          )}
        </div>

        <div style={quizPanelStyle}>
          <h3 style={{ margin: 0, fontSize: "22px" }}>Choose your answer</h3>

          <div style={{ marginTop: "20px", display: "grid", gap: "12px" }}>
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
  score,
  correctCount,
  tokensEarned,
  tokenBalance,
  rewardSaved,
  saveMessage,
  onPrimary,
  primaryLabel,
  onSecondary,
  secondaryLabel,
}: {
  title: string;
  score: number;
  correctCount: number;
  tokensEarned: number;
  tokenBalance: number;
  rewardSaved: boolean;
  saveMessage: string;
  onPrimary: () => void;
  primaryLabel: string;
  onSecondary: () => void;
  secondaryLabel: string;
}) {
  return (
    <div
      style={{
        margin: "0 auto",
        maxWidth: "720px",
        borderRadius: "26px",
        border: "1px solid rgba(126,232,255,0.5)",
        background:
          "linear-gradient(180deg, rgba(17,82,136,0.86), rgba(7,27,68,0.98))",
        padding: "36px",
        textAlign: "center",
      }}
    >
      <p style={eyebrowStyle}>Challenge Complete</p>

      <h2 style={{ margin: "12px 0 28px", fontSize: "38px" }}>{title}</h2>

      <div
        style={{
          marginTop: "28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "12px",
        }}
      >
        <ResultStat label="Correct" value={`${correctCount}/10`} />
        <ResultStat label="Score" value={String(score)} />
        <ResultStat label="Tokens" value={`+${tokensEarned}`} />
        <ResultStat label="Balance" value={String(tokenBalance)} />
      </div>

      <p
        style={{
          margin: "26px 0 0",
          color: "rgba(255,255,255,0.78)",
          lineHeight: 1.5,
        }}
      >
        {saveMessage ||
          (rewardSaved
            ? "Your attempt and Dreamscape Token reward have been saved."
            : "Log in to save your attempt and receive Dreamscape Tokens.")}
      </p>

      <div
        style={{
          marginTop: "28px",
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
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

function MessageCard({ message }: { message: string }) {
  return (
    <div
      style={{
        margin: "22px auto",
        maxWidth: "560px",
        borderRadius: "24px",
        border: "1px solid rgba(126,232,255,0.36)",
        background: "rgba(255,255,255,0.08)",
        padding: "30px",
        textAlign: "center",
        color: "rgba(255,255,255,0.82)",
      }}
    >
      {message}
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "999px",
        border: "1px solid rgba(126,232,255,0.36)",
        background: "rgba(255,255,255,0.07)",
        padding: "9px 14px",
        fontSize: "13px",
        color: "rgba(255,255,255,0.72)",
      }}
    >
      {label}: <strong style={{ color: "#7ee8ff" }}>{value}</strong>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(126,232,255,0.28)",
        background: "rgba(255,255,255,0.08)",
        padding: "16px 10px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#7ee8ff",
          fontSize: "12px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "8px 0 0",
          fontSize: "24px",
          fontWeight: 700,
        }}
      >
        {value}
      </p>
    </div>
  );
}

const navButtonStyle: CSSProperties = {
  minHeight: "42px",
  padding: "0 18px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.25)",
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

const panelStyle = (isMobile: boolean): CSSProperties => ({
  maxWidth: "1220px",
  margin: isMobile ? "34px auto 0" : "40px auto 0",
  borderRadius: isMobile ? "22px" : "30px",
  border: "1px solid rgba(126,221,255,0.42)",
  background:
    "linear-gradient(145deg, rgba(8,28,60,0.82), rgba(6,18,44,0.94))",
  boxShadow:
    "0 0 45px rgba(85,215,255,0.18), 0 30px 90px rgba(0,0,0,0.35)",
  padding: isMobile ? "24px" : "38px",
  color: "white",
  backdropFilter: "blur(18px)",
});

const twoColumnGrid = (isMobile: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  gap: "24px",
});

const bigCardStyle = (accent: string): CSSProperties => ({
  minHeight: "330px",
  borderRadius: "24px",
  padding: "30px",
  border: `1px solid ${accent}88`,
  background:
    "linear-gradient(180deg, rgba(20,58,100,0.78), rgba(8,25,56,0.92))",
  boxShadow: `0 0 22px ${accent}22, inset 0 0 24px rgba(255,255,255,0.03)`,
  color: "white",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
});

const cardTitleStyle: CSSProperties = {
  margin: "24px 0 0",
  fontSize: "30px",
  fontWeight: 700,
};

const cardTextStyle: CSSProperties = {
  margin: "14px 0 28px",
  fontSize: "16px",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.76)",
};

const primaryButtonLook: CSSProperties = {
  marginTop: "auto",
  height: "52px",
  borderRadius: "14px",
  background: "linear-gradient(135deg,#35c5ff,#4c6dff)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 700,
};

const backButtonStyle: CSSProperties = {
  border: "1px solid rgba(126,232,255,0.36)",
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
  border: "1px solid rgba(126,232,255,0.36)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  padding: "0 18px",
  fontSize: "16px",
  outline: "none",
  boxSizing: "border-box",
};

const formCardStyle: CSSProperties = {
  maxWidth: "620px",
  margin: "0 auto",
  borderRadius: "26px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.055)",
  padding: "26px",
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

const playerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(255,255,255,0.08)",
  padding: "14px 16px",
};

const quizPanelStyle: CSSProperties = {
  borderRadius: "24px",
  border: "1px solid rgba(150,220,255,0.42)",
  background:
    "linear-gradient(180deg, rgba(20,58,100,0.74), rgba(8,25,56,0.9))",
  padding: "26px",
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