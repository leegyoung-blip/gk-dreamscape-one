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
  difficulty?: number | null;
};

type SinglePlayerAnswerDraft = {
  questionId: string;
  questionOrder: number;
  selectedOption: "A" | "B" | "C" | "D" | null;
  responseSeconds: number;
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
    setSinglePlayerAnswers([]);
    setSinglePlayerStartedAt(new Date().toISOString());
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

  async function saveSinglePlayerAnalytics() {
    if (!userAccess.userId || singlePlayerAnswers.length === 0) return;

    const durationSeconds = singlePlayerAnswers.reduce(
      (sum, answer) => sum + answer.responseSeconds,
      0,
    );

    const { error } = await supabase.rpc(
      "record_milo_category_quiz_attempt",
      {
        p_category: selectedCategory,
        p_mode: "single",
        p_lobby_id: null,
        p_started_at: singlePlayerStartedAt,
        p_duration_seconds: durationSeconds,
        p_answers: singlePlayerAnswers.map((answer) => ({
          question_id: answer.questionId,
          question_order: answer.questionOrder,
          selected_option: answer.selectedOption,
          response_seconds: answer.responseSeconds,
        })),
      },
    );

    if (error) {
      console.warn("Could not save Categories analytics:", error.message);
      return;
    }

  }

  function goToNextCategoryQuestion() {
    const nextIndex = categoryQuestionIndex + 1;

    if (nextIndex >= categoryQuestions.length) {
      setCategoriesStage("finished");
      void saveSinglePlayerAnalytics();
      checkAndAwardWeeklyTokens(categoryScore, categoryPoints);
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

  const isQuizStage = [
    "playing",
    "answered",
    "multiplayer-playing",
    "multiplayer-answered",
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

                  <div className="stage-header mt-7 shrink-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                      Choose Topic
                    </p>
                    <p className="stage-subtitle mt-2 text-sm leading-6 text-white/52">
                      Pick a category for your 10-question timed quiz.
                    </p>
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

                  <button
                    type="button"
                    onClick={startSinglePlayerCategoryQuiz}
                    disabled={isLoadingCategoryQuiz || isLoadingCategories}
                    className="primary-action mt-5 w-full shrink-0 rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                  >
                    {isLoadingCategoryQuiz
                      ? "Loading Quiz..."
                      : "Start 10-Question Quiz"}
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
                  <p className="stage-kicker text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                    Quiz Complete
                  </p>

                  <h2 className="finished-score mt-4 text-5xl font-extrabold">
                    {categoryScore} / 10
                  </h2>

                  <p className="finished-points mt-3 text-3xl font-extrabold text-[#ffd18a]">
                    {categoryPoints} points
                  </p>

                  <p className="finished-copy mx-auto mt-4 max-w-xl text-sm leading-6 text-white/58">
                    {categoryScore >= 8
                      ? "Excellent. That was a strong mastery score."
                      : categoryScore >= 6
                      ? "Good pass. Try another category to improve your score."
                      : "Keep practising. These questions are designed to be tougher."}
                  </p>

                  <div className="reward-card mt-7 min-h-0 flex-1 rounded-[24px] border border-yellow-200/18 bg-yellow-300/10 p-5 text-left">
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
                      <p className="mt-4 text-sm font-bold text-[#ffd18a]">
                        Weekly reward already claimed.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={resetCategoriesQuiz}
                    className="primary-action mt-5 w-full shrink-0 rounded-[14px] bg-gradient-to-r from-[#c47a25] to-[#e5b75e] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(196,122,37,0.24)] transition hover:scale-[1.01]"
                  >
                    Back to Mode Select
                  </button>
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
          min-height: 100dvh;
          overflow-x: hidden;
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

        @media (max-width: 1024px), (hover: none) and (pointer: coarse) {
          .categories-page {
            display: flex;
            height: 100dvh;
            min-height: 100dvh;
            flex-direction: column;
            overflow: hidden;
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
            max-width: 34%;
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
