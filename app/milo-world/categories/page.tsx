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
};

type CategoriesStage =
  | "mode"
  | "category"
  | "playing"
  | "answered"
  | "finished"
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

const fallbackCategoryNames = ["Geography", "Science", "History"];

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

function normaliseRole(role: string | null) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function canRoleEarnTokens(role: string | null) {
  const cleanRole = normaliseRole(role);

  return [
    "admin",
    "student",
    "gkp-student",
    "gkp-students",
    "student-access",
    "club",
    "milo-club",
    "milos-club",
    "milo-club-member",
    "pro",
  ].includes(cleanRole);
}

function getTokenReward(score: number) {
  if (score >= 9) return 10;
  if (score >= 7) return 7;
  if (score >= 5) return 5;
  return 0;
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
        canEarnTokens: canRoleEarnTokens(role),
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
      );

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
      goToNextCategoryQuestion();
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
    setCategoryMessage("");
    setRewardMessage("");
    setMultiplayerMessage("");

    if (mode === "multiplayer") {
      setCategoriesStage("multiplayer-menu");
      return;
    }

    setCategoriesStage("category");
  }

  async function startSinglePlayerCategoryQuiz() {
    setIsLoadingCategoryQuiz(true);
    setCategoryMessage("");
    setRewardMessage("");
    setRewardChecked(false);
    setAlreadyRewardedThisWeek(false);
    setEarnedTokens(0);

    const { data, error } = await supabase.rpc("get_milo_category_quiz", {
      p_category: selectedCategory,
      p_limit: 10,
    });

    if (error) {
      setCategoryMessage(`Could not load quiz: ${error.message}`);
      setIsLoadingCategoryQuiz(false);
      return;
    }

    const questions = (data || []) as CategoryQuizQuestion[];

    if (questions.length < 10) {
      setCategoryMessage(
        `This category needs at least 10 active questions. It currently has ${questions.length}.`
      );
      setIsLoadingCategoryQuiz(false);
      return;
    }

    setCategoryQuestions(questions);
    setCategoryQuestionIndex(0);
    setSelectedCategoryAnswer(null);
    setCategoryScore(0);
    setCategoryPoints(0);
    setLastQuestionPoints(0);
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
  }

  function submitCategoryAnswer(answer: "A" | "B" | "C" | "D" | null) {
    if (!currentCategoryQuestion) return;
    if (categoriesStage !== "playing") return;

    const finalAnswer = answer || selectedCategoryAnswer;
    const isCorrect = finalAnswer === currentCategoryQuestion.correct_option;
    const pointsEarned = isCorrect ? Math.max(10, questionCountdown * 10) : 0;

    if (isCorrect) {
      setCategoryScore((score) => score + 1);
      setCategoryPoints((points) => points + pointsEarned);
    }

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

  function goToNextCategoryQuestion() {
    const nextIndex = categoryQuestionIndex + 1;

    if (nextIndex >= categoryQuestions.length) {
      setCategoriesStage("finished");
      checkAndAwardWeeklyTokens(categoryScore, categoryPoints);
      return;
    }

    setCategoryQuestionIndex(nextIndex);
    setSelectedCategoryAnswer(null);
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
        "Log in with a Student Access or Milo’s Club account to earn Dreamscape Tokens."
      );
      return;
    }

    if (!userAccess.canEarnTokens) {
      setRewardMessage(
        "Dreamscape Token rewards are available for Student Access and Milo’s Club members."
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
        "id,category,question,option_a,option_b,option_c,option_d,correct_option,explanation"
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

  async function goToNextMultiplayerQuestion() {
    const nextIndex = multiplayerQuestionIndex + 1;

    if (nextIndex >= multiplayerQuestions.length) {
      setCategoriesStage("multiplayer-finished");

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
      return "border-cyan-300/70 bg-cyan-300/16 text-white";
    }

    return "border-cyan-200/14 bg-white/[0.045] text-white/82 hover:border-cyan-200/34 hover:bg-white/[0.075]";
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
      return "border-cyan-300/70 bg-cyan-300/16 text-white";
    }

    return "border-cyan-200/14 bg-white/[0.045] text-white/82 hover:border-cyan-200/34 hover:bg-white/[0.075]";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/milo-world"
          className="inline-flex h-11 items-center rounded-full border border-cyan-200/25 bg-white/6 px-5 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45"
        >
          ← Back to Milo’s World
        </Link>

        <section className="mt-14 text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
            Activity Lab
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            Categories
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/62">
            10 random questions. Correct answers earn more points when answered
            faster.
          </p>

          <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-cyan-200/14 bg-white/[0.045] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Mode
              </p>
              <p className="mt-1 text-lg font-bold">
                {categoryMode === "multiplayer" ? "Multiplayer" : "Single"}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200/14 bg-white/[0.045] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Points
              </p>
              <p className="mt-1 text-2xl font-bold">
                {categoryMode === "multiplayer"
                  ? multiplayerPoints
                  : categoryPoints}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200/14 bg-orange-300/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Timer
              </p>
              <p className="mt-1 text-sm font-bold text-orange-100">
                10 seconds/question
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-3xl rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-8">
          {categoriesStage === "mode" && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                Choose Mode
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseCategoriesMode("single")}
                  className="min-h-[180px] rounded-3xl border border-cyan-200/18 bg-[#061632]/75 p-6 text-left transition hover:scale-[1.02] hover:border-cyan-200/40"
                >
                  <span className="text-2xl font-bold">Single Player</span>
                  <span className="mt-3 block text-sm leading-6 text-white/58">
                    Start a 10-question timed quiz. Faster correct answers earn
                    more points.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => chooseCategoriesMode("multiplayer")}
                  className="min-h-[180px] rounded-3xl border border-orange-200/18 bg-orange-300/10 p-6 text-left transition hover:scale-[1.02] hover:border-orange-200/40"
                >
                  <span className="text-2xl font-bold">Multiplayer</span>
                  <span className="mt-3 block text-sm leading-6 text-white/58">
                    Create or join a lobby and play the same 10 questions
                    against others.
                  </span>
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-yellow-200/18 bg-yellow-300/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd18a]">
                  Reward Rules
                </p>

                <div className="mt-3 grid gap-2 text-sm leading-6 text-white/66">
                  <p>• Correct answer points: remaining seconds × 10.</p>
                  <p>• Single-player DT rewards are once per week per category.</p>
                  <p>• Multiplayer uses the same question base and points system.</p>
                </div>
              </div>
            </>
          )}

          {categoriesStage === "category" && (
            <>
              <button
                type="button"
                onClick={() => setCategoriesStage("mode")}
                className="text-sm font-bold text-[#7ee8ff]"
              >
                ← Back to mode select
              </button>

              <div className="mt-7">
                <div className="grid gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                        Choose Topic
                      </p>

                      <p className="mt-2 text-sm leading-6 text-white/52">
                        Pick the quiz category for this multiplayer lobby.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {availableCategories.map((category, index) => {
                        const isSelected = selectedCategory === category;

                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setSelectedCategory(category)}
                            disabled={isLoadingCategories}
                            className={`min-h-[128px] rounded-3xl border p-5 text-left transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-50 ${
                              isSelected
                                ? "border-orange-200/55 bg-orange-300/18 shadow-[0_0_32px_rgba(251,146,60,0.16)]"
                                : "border-cyan-200/18 bg-[#061632]/75 hover:border-cyan-200/40 hover:bg-white/[0.065]"
                            }`}
                          >
                            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">
                              Category {index + 1}
                            </span>

                            <span className="mt-3 block text-2xl font-bold text-white">
                              {category}
                            </span>

                            <span className="mt-3 block text-sm leading-6 text-white/56">
                              10 timed questions for all players in the lobby.
                            </span>

                            {isSelected && (
                              <span className="mt-4 inline-flex rounded-full border border-orange-200/25 bg-orange-300/14 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-orange-100">
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                <button
                  type="button"
                  onClick={startSinglePlayerCategoryQuiz}
                  disabled={isLoadingCategoryQuiz || isLoadingCategories}
                  className="mt-5 h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                >
                  {isLoadingCategoryQuiz
                    ? "Loading Quiz..."
                    : "Start 10-Question Quiz"}
                </button>
              </div>
            </>
          )}

          {categoriesStage === "multiplayer-menu" && (
            <>
              <button
                type="button"
                onClick={resetCategoriesQuiz}
                className="text-sm font-bold text-[#7ee8ff]"
              >
                ← Back to mode select
              </button>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                Multiplayer Lobby
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCategoriesStage("multiplayer-create")}
                  className="min-h-[180px] rounded-3xl border border-cyan-200/18 bg-[#061632]/75 p-6 text-left transition hover:scale-[1.02] hover:border-cyan-200/40"
                >
                  <span className="text-2xl font-bold">Create Lobby</span>
                  <span className="mt-3 block text-sm leading-6 text-white/58">
                    Choose a category and generate a lobby code for friends.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoriesStage("multiplayer-join")}
                  className="min-h-[180px] rounded-3xl border border-orange-200/18 bg-orange-300/10 p-6 text-left transition hover:scale-[1.02] hover:border-orange-200/40"
                >
                  <span className="text-2xl font-bold">Join Lobby</span>
                  <span className="mt-3 block text-sm leading-6 text-white/58">
                    Enter a lobby code and play the same question set.
                  </span>
                </button>
              </div>
            </>
          )}

          {categoriesStage === "multiplayer-create" && (
            <>
              <button
                type="button"
                onClick={() => setCategoriesStage("multiplayer-menu")}
                className="text-sm font-bold text-[#7ee8ff]"
              >
                ← Back to multiplayer
              </button>

              <div className="mt-7 grid gap-5">
                <label className="grid gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                    Display Name
                  </span>

                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Player name"
                    className="h-12 rounded-2xl border border-cyan-200/18 bg-[#061632] px-4 text-white outline-none placeholder:text-white/30"
                  />
                </label>

                <label className="grid gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                    Choose Topic
                  </span>

                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="h-12 rounded-2xl border border-cyan-200/18 bg-[#061632] px-4 text-white outline-none"
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
                  className="h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                >
                  {isCreatingLobby ? "Creating Lobby..." : "Create Lobby"}
                </button>
              </div>
            </>
          )}

          {categoriesStage === "multiplayer-join" && (
            <>
              <button
                type="button"
                onClick={() => setCategoriesStage("multiplayer-menu")}
                className="text-sm font-bold text-[#7ee8ff]"
              >
                ← Back to multiplayer
              </button>

              <div className="mt-7 grid gap-5">
                <label className="grid gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                    Display Name
                  </span>

                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Player name"
                    className="h-12 rounded-2xl border border-cyan-200/18 bg-[#061632] px-4 text-white outline-none placeholder:text-white/30"
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
                    className="h-12 rounded-2xl border border-cyan-200/18 bg-[#061632] px-4 text-center text-2xl font-black uppercase tracking-[0.2em] text-white outline-none placeholder:text-white/30"
                  />
                </label>

                <button
                  type="button"
                  onClick={joinMultiplayerLobby}
                  disabled={isJoiningLobby}
                  className="h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                >
                  {isJoiningLobby ? "Joining Lobby..." : "Join Lobby"}
                </button>
              </div>
            </>
          )}

          {categoriesStage === "multiplayer-waiting" && multiplayerLobby && (
            <>
              <button
                type="button"
                onClick={resetCategoriesQuiz}
                className="text-sm font-bold text-[#7ee8ff]"
              >
                ← Leave lobby
              </button>

              <div className="mt-7 rounded-3xl border border-cyan-200/18 bg-[#061632]/75 p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                  Lobby Code
                </p>

                <h2 className="mt-4 text-5xl font-black tracking-[0.16em]">
                  {multiplayerLobby.code}
                </h2>

                <p className="mt-4 text-sm text-white/58">
                  Category: {multiplayerLobby.category}
                </p>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                  Players
                </p>

                <div className="mt-4 grid gap-3">
                  {multiplayerPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-2xl border border-cyan-200/14 bg-white/[0.045] px-4 py-3"
                    >
                      <span className="font-bold">{player.display_name}</span>
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7ee8ff]">
                        {player.is_host ? "Host" : "Player"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {isMultiplayerHost ? (
                <button
                  type="button"
                  onClick={startMultiplayerGame}
                  className="mt-6 h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01]"
                >
                  Start Game
                </button>
              ) : (
                <p className="mt-6 rounded-3xl border border-orange-200/18 bg-orange-300/10 p-5 text-sm font-bold text-orange-100">
                  Waiting for the host to start the game.
                </p>
              )}
            </>
          )}

          {(categoriesStage === "playing" || categoriesStage === "answered") &&
            currentCategoryQuestion && (
              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#7ee8ff]">
                    {selectedCategory}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/72">
                    Question {categoryQuestionIndex + 1} / 10
                  </span>

                  <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-4 py-2 text-xs font-bold text-orange-100">
                    {categoriesStage === "answered"
                      ? `Next in ${nextQuestionCountdown}s`
                      : `${questionCountdown}s`}
                  </span>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-cyan-200/14 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Current Score
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {categoryScore}/10
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-200/14 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Total Points
                    </p>
                    <p className="mt-1 text-xl font-bold">{categoryPoints}</p>
                  </div>

                  <div className="rounded-2xl border border-yellow-200/14 bg-yellow-300/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Last Question
                    </p>
                    <p className="mt-1 text-xl font-bold text-[#ffd18a]">
                      +{lastQuestionPoints}
                    </p>
                  </div>
                </div>

                <h2 className="text-2xl font-bold leading-snug text-white sm:text-3xl">
                  {currentCategoryQuestion.question}
                </h2>

                <div className="mt-7 grid gap-3">
                  {[
                    ["A", currentCategoryQuestion.option_a],
                    ["B", currentCategoryQuestion.option_b],
                    ["C", currentCategoryQuestion.option_c],
                    ["D", currentCategoryQuestion.option_d],
                  ].map(([letter, answer]) => (
                    <button
                      key={letter}
                      type="button"
                      disabled={categoriesStage === "answered"}
                      onClick={() =>
                        submitCategoryAnswer(letter as "A" | "B" | "C" | "D")
                      }
                      className={`min-h-[58px] rounded-2xl border px-5 py-4 text-left text-sm font-bold transition ${getCategoryOptionClass(
                        letter as "A" | "B" | "C" | "D"
                      )}`}
                    >
                      {letter}. {answer}
                    </button>
                  ))}
                </div>

                {categoryMessage && (
                  <p className="mt-5 text-sm font-bold leading-6 text-[#7ee8ff]">
                    {categoryMessage}
                    {categoriesStage === "answered" &&
                      currentCategoryQuestion.explanation && (
                        <>
                          <br />
                          <span className="font-normal text-white/56">
                            {currentCategoryQuestion.explanation}
                          </span>
                        </>
                      )}
                  </p>
                )}
              </div>
            )}

          {(categoriesStage === "multiplayer-playing" ||
            categoriesStage === "multiplayer-answered") &&
            currentMultiplayerQuestion && (
              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#7ee8ff]">
                    {multiplayerLobby?.category}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/72">
                    Question {multiplayerQuestionIndex + 1} / 10
                  </span>

                  <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-4 py-2 text-xs font-bold text-orange-100">
                    {categoriesStage === "multiplayer-answered"
                      ? `Next in ${multiplayerNextCountdown}s`
                      : `${multiplayerCountdown}s`}
                  </span>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-cyan-200/14 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Your Score
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {multiplayerScore}/10
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-200/14 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Your Points
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {multiplayerPoints}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-yellow-200/14 bg-yellow-300/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                      Last Question
                    </p>
                    <p className="mt-1 text-xl font-bold text-[#ffd18a]">
                      +{multiplayerLastQuestionPoints}
                    </p>
                  </div>
                </div>

                <h2 className="text-2xl font-bold leading-snug text-white sm:text-3xl">
                  {currentMultiplayerQuestion.question}
                </h2>

                <div className="mt-7 grid gap-3">
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
                      className={`min-h-[58px] rounded-2xl border px-5 py-4 text-left text-sm font-bold transition ${getMultiplayerOptionClass(
                        letter as "A" | "B" | "C" | "D"
                      )}`}
                    >
                      {letter}. {answer}
                    </button>
                  ))}
                </div>

                {multiplayerMessage && (
                  <p className="mt-5 text-sm font-bold leading-6 text-[#7ee8ff]">
                    {multiplayerMessage}
                    {categoriesStage === "multiplayer-answered" &&
                      currentMultiplayerQuestion.explanation && (
                        <>
                          <br />
                          <span className="font-normal text-white/56">
                            {currentMultiplayerQuestion.explanation}
                          </span>
                        </>
                      )}
                  </p>
                )}
              </div>
            )}

          {categoriesStage === "finished" && (
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                Quiz Complete
              </p>

              <h2 className="mt-4 text-5xl font-extrabold">
                {categoryScore} / 10
              </h2>

              <p className="mt-3 text-3xl font-extrabold text-[#ffd18a]">
                {categoryPoints} points
              </p>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/58">
                {categoryScore >= 8
                  ? "Excellent. That was a strong mastery score."
                  : categoryScore >= 6
                  ? "Good pass. Try another category to improve your score."
                  : "Keep practising. These questions are designed to be tougher."}
              </p>

              <div className="mt-7 rounded-3xl border border-yellow-200/18 bg-yellow-300/10 p-5 text-left">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd18a]">
                  Dreamscape Token Reward
                </p>

                <p className="mt-3 text-sm leading-6 text-white/68">
                  {rewardMessage || "Checking weekly reward eligibility..."}
                </p>

                {earnedTokens > 0 && (
                  <p className="mt-4 text-3xl font-extrabold text-[#ffd18a]">
                    +{earnedTokens} DT
                  </p>
                )}

                {alreadyRewardedThisWeek && (
                  <p className="mt-4 text-sm font-bold text-orange-100">
                    Weekly reward already claimed.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={resetCategoriesQuiz}
                className="mt-7 h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01]"
              >
                Back to Mode Select
              </button>
            </div>
          )}

          {categoriesStage === "multiplayer-finished" && (
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                Multiplayer Complete
              </p>

              <h2 className="mt-4 text-5xl font-extrabold">
                {multiplayerScore} / 10
              </h2>

              <p className="mt-3 text-3xl font-extrabold text-[#ffd18a]">
                {multiplayerPoints} points
              </p>

              <div className="mt-7 rounded-3xl border border-cyan-200/18 bg-white/[0.045] p-5 text-left">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7ee8ff]">
                  Leaderboard
                </p>

                <div className="mt-4 grid gap-3">
                  {sortedMultiplayerPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-2xl border border-cyan-200/14 bg-[#061632]/75 px-4 py-3"
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

              {isMultiplayerHost && multiplayerLobby?.status !== "finished" && (
                <button
                  type="button"
                  onClick={finishLobbyForEveryone}
                  className="mt-5 h-13 w-full rounded-full border border-orange-200/18 bg-orange-300/10 px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-orange-100 transition hover:scale-[1.01]"
                >
                  End Lobby for Everyone
                </button>
              )}

              <button
                type="button"
                onClick={resetCategoriesQuiz}
                className="mt-5 h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01]"
              >
                Back to Mode Select
              </button>
            </div>
          )}

          {categoryMessage && categoriesStage === "mode" && (
            <p className="mt-5 text-sm font-bold leading-6 text-[#7ee8ff]">
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
              <p className="mt-5 text-sm font-bold leading-6 text-[#7ee8ff]">
                {multiplayerMessage}
              </p>
            )}
        </section>
      </div>
    </main>
  );
}