"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { supabase } from "@/lib/supabase";

type LobbyStatus = "lobby" | "submitting" | "voting" | "results" | "finished";
type ScreenMode = "desktop" | "tablet" | "mobile";
type RoundCount = 5 | 10 | 20;

const BLUFF_SUBMIT_SECONDS = 25;
const BLUFF_VOTE_SECONDS = 15;
const PLAYER_HEARTBEAT_MS = 15_000;
const PLAYER_STALE_MS = 60_000;
const SESSION_STORAGE_KEY = "milo-whos-bluffing-session-v1";

type Lobby = {
  id: string;
  room_code: string;
  host_player_id: string | null;
  status: LobbyStatus;
  current_round: number;
  max_rounds: number;
  current_question_id: string | null;
  submit_ends_at: string | null;
  vote_ends_at: string | null;
  scoring_applied: boolean;
};

type Player = {
  id: string;
  lobby_id: string;
  nickname: string;
  score: number;
  is_host: boolean;
  is_active: boolean;
  last_seen_at: string;
  left_at: string | null;
};

type BluffQuestion = {
  id: string;
  question: string;
  correct_answer?: string | null;
  explanation?: string | null;
};

type BluffAnswer = {
  id: string;
  lobby_id: string;
  question_id: string;
  round_number: number;
  player_id: string;
  answer_text: string;
};

type BluffVote = {
  id: string;
  lobby_id: string;
  question_id: string;
  round_number: number;
  voter_player_id: string;
  selected_kind: "fake" | "correct";
  selected_answer_id: string | null;
};

type VoteOption = {
  id: string;
  kind: "fake" | "correct";
  text: string;
  answerId?: string;
  ownerPlayerId?: string;
};

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1080) {
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

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
}

function getSecondsLeft(endTime: string | null | undefined) {
  if (!endTime) return 0;
  return Math.max(0, Math.ceil((new Date(endTime).getTime() - Date.now()) / 1000));
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getPlayerName(players: Player[], playerId: string | undefined) {
  if (!playerId) return "Unknown";
  return players.find((player) => player.id === playerId)?.nickname || "Unknown";
}

export default function WhosBluffingPage() {
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedMaxRounds, setSelectedMaxRounds] = useState<RoundCount>(5);

  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<BluffQuestion | null>(null);
  const [answers, setAnswers] = useState<BluffAnswer[]>([]);
  const [votes, setVotes] = useState<BluffVote[]>([]);

  const [fakeAnswer, setFakeAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const transitionLockRef = useRef(false);
  const playersRef = useRef<Player[]>([]);
  const restoredSessionRef = useRef(false);

  const isHost = Boolean(lobby && playerId && lobby.host_player_id === playerId);
  const myAnswer = answers.find((answer) => answer.player_id === playerId);
  const myVote = votes.find((vote) => vote.voter_player_id === playerId);
  const submitSecondsLeft = getSecondsLeft(lobby?.submit_ends_at);
  const voteSecondsLeft = getSecondsLeft(lobby?.vote_ends_at);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname)
      ),
    [players]
  );

  const voteOptions = useMemo<VoteOption[]>(() => {
    const seed = `${lobby?.id || "seed"}-${lobby?.current_round || 0}`;

    const options: VoteOption[] = answers.map((answer) => ({
      id: `fake-${answer.id}`,
      kind: "fake",
      text: answer.answer_text,
      answerId: answer.id,
      ownerPlayerId: answer.player_id,
    }));

    if (currentQuestion?.correct_answer) {
      options.push({
        id: "correct-answer",
        kind: "correct",
        text: currentQuestion.correct_answer,
      });
    }

    return options.sort(
      (a, b) => stableHash(`${seed}-${a.id}`) - stableHash(`${seed}-${b.id}`)
    );
  }, [answers, currentQuestion?.correct_answer, lobby?.current_round, lobby?.id]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    if (restoredSessionRef.current) return;
    restoredSessionRef.current = true;

    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) as {
        lobbyId?: string;
        playerId?: string;
        nickname?: string;
      };

      if (!saved.lobbyId || !saved.playerId) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      setLobbyId(saved.lobbyId);
      setPlayerId(saved.playerId);

      if (saved.nickname) {
        setNickname(saved.nickname);
      }
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lobbyId || !playerId) return;

    let cancelled = false;

    async function heartbeat() {
      const { error } = await supabase.rpc("milo_bluff_touch_player", {
        p_lobby_id: lobbyId,
        p_player_id: playerId,
      });

      if (!cancelled && error) {
        console.warn("Could not refresh bluff player presence:", error.message);
      }
    }

    void heartbeat();

    const interval = window.setInterval(() => {
      void heartbeat();
    }, PLAYER_HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [lobbyId, playerId]);

  useEffect(() => {
    if (!lobbyId) return;

    void loadGameState(lobbyId);

    const channel = supabase
      .channel(`milo-bluff-${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milo_bluff_lobbies",
          filter: `id=eq.${lobbyId}`,
        },
        () => void loadGameState(lobbyId)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milo_bluff_players",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        (payload) => {
          if (payload.eventType !== "UPDATE") {
            void loadGameState(lobbyId);
            return;
          }

          const next = payload.new as Partial<Player>;
          const current = playersRef.current.find(
            (player) => player.id === next.id
          );

          const isHeartbeatOnly =
            current &&
            current.nickname === next.nickname &&
            current.score === next.score &&
            current.is_host === next.is_host &&
            current.is_active === next.is_active &&
            current.left_at === next.left_at;

          if (!isHeartbeatOnly) {
            void loadGameState(lobbyId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milo_bluff_answers",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => void loadGameState(lobbyId)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milo_bluff_votes",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => void loadGameState(lobbyId)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  useEffect(() => {
    if (!lobby) return;

    if (lobby.status === "submitting" && submitSecondsLeft <= 0) {
      void moveToVoting();
    }

    if (lobby.status === "voting" && voteSecondsLeft <= 0) {
      void finishVotingAndScore();
    }
  }, [lobby?.status, submitSecondsLeft, voteSecondsLeft, nowTick]);

  useEffect(() => {
    if (!lobby) return;
    if (lobby.status !== "submitting") return;
    if (players.length < 2) return;

    if (answers.length >= players.length) {
      void moveToVoting();
    }
  }, [
    lobby?.status,
    lobby?.id,
    lobby?.current_round,
    answers.length,
    players.length,
  ]);

  useEffect(() => {
    if (!lobby) return;
    if (lobby.status !== "voting") return;
    if (players.length < 2) return;

    if (votes.length >= players.length) {
      void finishVotingAndScore();
    }
  }, [lobby?.status, lobby?.id, lobby?.current_round, votes.length, players.length]);

  async function loadGameState(nextLobbyId: string) {
    const { data: lobbyData, error: lobbyError } = await supabase
      .from("milo_bluff_lobbies")
      .select("*")
      .eq("id", nextLobbyId)
      .single();

    if (lobbyError || !lobbyData) {
      setMessage("Could not load lobby.");
      return;
    }

    const nextLobby = lobbyData as Lobby;
    setLobby(nextLobby);

    const staleCutoffIso = new Date(Date.now() - PLAYER_STALE_MS).toISOString();

    const { data: playerData } = await supabase
      .from("milo_bluff_players")
      .select("*")
      .eq("lobby_id", nextLobbyId)
      .eq("is_active", true)
      .gte("last_seen_at", staleCutoffIso)
      .order("joined_at", { ascending: true });

    const nextPlayers = (playerData || []) as Player[];
    setPlayers(nextPlayers);

    if (
      playerId &&
      !nextPlayers.some((player) => player.id === playerId) &&
      nextLobby.status !== "finished"
    ) {
      setMessage(
        "Reconnecting your player session. If this message remains, leave and rejoin the lobby."
      );
    }

    if (nextLobby.current_round > 0) {
      const { data: answerData } = await supabase
        .from("milo_bluff_answers")
        .select("*")
        .eq("lobby_id", nextLobbyId)
        .eq("round_number", nextLobby.current_round)
        .order("created_at", { ascending: true });

      setAnswers((answerData || []) as BluffAnswer[]);

      const { data: voteData } = await supabase
        .from("milo_bluff_votes")
        .select("*")
        .eq("lobby_id", nextLobbyId)
        .eq("round_number", nextLobby.current_round);

      setVotes((voteData || []) as BluffVote[]);
    } else {
      setAnswers([]);
      setVotes([]);
    }

    if (nextLobby.current_question_id) {
      const questionSelect =
        nextLobby.status === "submitting"
          ? "id,question"
          : "id,question,correct_answer,explanation";

      const { data: questionData } = await supabase
        .from("milo_bluff_questions")
        .select(questionSelect)
        .eq("id", nextLobby.current_question_id)
        .single();

      setCurrentQuestion((questionData || null) as BluffQuestion | null);
    } else {
      setCurrentQuestion(null);
    }
  }

  async function createLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = nickname.trim().slice(0, 18);

    if (!cleanName) {
      setMessage("Enter a player name first.");
      return;
    }

    setBusy(true);
    setMessage("");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const roomCode = generateRoomCode();

      const { data: lobbyData, error: lobbyError } = await supabase
        .from("milo_bluff_lobbies")
        .insert({
          room_code: roomCode,
          status: "lobby",
          current_round: 0,
          max_rounds: selectedMaxRounds,
        })
        .select("*")
        .single();

      if (lobbyError || !lobbyData) {
        continue;
      }

      const { data: playerData, error: playerError } = await supabase
        .from("milo_bluff_players")
        .insert({
          lobby_id: lobbyData.id,
          nickname: cleanName,
          is_host: true,
          score: 0,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (playerError || !playerData) {
        setMessage("Lobby was created, but host player could not be added.");
        setBusy(false);
        return;
      }

      await supabase
        .from("milo_bluff_lobbies")
        .update({
          host_player_id: playerData.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lobbyData.id);

      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          lobbyId: lobbyData.id,
          playerId: playerData.id,
          nickname: cleanName,
        })
      );

      setLobbyId(lobbyData.id);
      setPlayerId(playerData.id);
      setBusy(false);
      return;
    }

    setMessage("Could not create lobby. Try again.");
    setBusy(false);
  }

  async function joinLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = nickname.trim().slice(0, 18);
    const cleanCode = joinCode.trim().toUpperCase();

    if (!cleanName) {
      setMessage("Enter a player name first.");
      return;
    }

    if (!cleanCode) {
      setMessage("Enter a lobby code.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { data: lobbyData, error: lobbyError } = await supabase
      .from("milo_bluff_lobbies")
      .select("*")
      .eq("room_code", cleanCode)
      .single();

    if (lobbyError || !lobbyData) {
      setMessage("Lobby not found.");
      setBusy(false);
      return;
    }

    if (lobbyData.status !== "lobby") {
      setMessage("This game has already started. Create a new lobby instead.");
      setBusy(false);
      return;
    }

    const staleCutoffIso = new Date(Date.now() - PLAYER_STALE_MS).toISOString();

    const { count } = await supabase
      .from("milo_bluff_players")
      .select("id", { count: "exact", head: true })
      .eq("lobby_id", lobbyData.id)
      .eq("is_active", true)
      .gte("last_seen_at", staleCutoffIso);

    if ((count || 0) >= 10) {
      setMessage("This lobby is full.");
      setBusy(false);
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("milo_bluff_players")
      .insert({
        lobby_id: lobbyData.id,
        nickname: cleanName,
          is_host: false,
          score: 0,
          is_active: true,
          last_seen_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (playerError || !playerData) {
      setMessage("Could not join lobby.");
      setBusy(false);
      return;
    }

    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        lobbyId: lobbyData.id,
        playerId: playerData.id,
        nickname: cleanName,
      })
    );

    setLobbyId(lobbyData.id);
    setPlayerId(playerData.id);
    setBusy(false);
  }

  async function startNextRound() {
    if (!lobby || !isHost) return;

    if (players.length < 2) {
      setMessage("You need at least 2 players to start.");
      return;
    }

    setBusy(true);
    setMessage("");

    const nextRound = lobby.current_round + 1;

    if (nextRound > lobby.max_rounds) {
      await supabase
        .from("milo_bluff_lobbies")
        .update({
          status: "finished",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lobby.id);

      setBusy(false);
      return;
    }

    const { data: usedRounds } = await supabase
      .from("milo_bluff_rounds")
      .select("question_id")
      .eq("lobby_id", lobby.id);

    const usedQuestionIds = new Set((usedRounds || []).map((round) => round.question_id));

    const { data: questions, error: questionError } = await supabase
      .from("milo_bluff_questions")
      .select("id,question")
      .eq("is_active", true);

    if (questionError || !questions || questions.length === 0) {
      setMessage("No bluff questions found in Supabase.");
      setBusy(false);
      return;
    }

    const unusedQuestions = questions.filter((question) => !usedQuestionIds.has(question.id));
    const questionPool = unusedQuestions.length > 0 ? unusedQuestions : questions;
    const selectedQuestion = questionPool[Math.floor(Math.random() * questionPool.length)];

    const { error: roundError } = await supabase.from("milo_bluff_rounds").insert({
      lobby_id: lobby.id,
      round_number: nextRound,
      question_id: selectedQuestion.id,
    });

    if (roundError) {
      setMessage(`Could not start round: ${roundError.message}`);
      setBusy(false);
      return;
    }

    await supabase
      .from("milo_bluff_lobbies")
      .update({
        status: "submitting",
        current_round: nextRound,
        current_question_id: selectedQuestion.id,
        submit_ends_at: new Date(Date.now() + BLUFF_SUBMIT_SECONDS * 1000).toISOString(),
        vote_ends_at: null,
        scoring_applied: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobby.id);

    setFakeAnswer("");
    setBusy(false);
  }

  async function submitFakeAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!lobby || !currentQuestion || !playerId) return;

    const cleanAnswer = fakeAnswer.trim().slice(0, 80);

    if (!cleanAnswer) {
      setMessage("Enter a fake answer first.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.rpc("submit_milo_bluff_answer", {
      p_lobby_id: lobby.id,
      p_player_id: playerId,
      p_answer_text: cleanAnswer,
    });

    setBusy(false);

    if (error) {
      const safeMessage =
        error.message.includes("real answer")
          ? "That matches the real answer. Invent a different bluff."
          : error.message.includes("already in the room")
          ? "That bluff is already in the room. Try something different."
          : `Could not submit answer: ${error.message}`;

      setMessage(safeMessage);
      return;
    }

    setFakeAnswer("");
    setMessage("Answer submitted. Wait for voting.");
  }

  async function moveToVoting() {
    if (!lobby || transitionLockRef.current) return;
    if (lobby.status !== "submitting") return;

    transitionLockRef.current = true;

    await supabase
      .from("milo_bluff_lobbies")
      .update({
        status: "voting",
        vote_ends_at: new Date(Date.now() + BLUFF_VOTE_SECONDS * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobby.id)
      .eq("status", "submitting");

    window.setTimeout(() => {
      transitionLockRef.current = false;
    }, 900);
  }

  async function submitVote(option: VoteOption) {
    if (!lobby || !currentQuestion || !playerId) return;

    if (option.kind === "fake" && option.ownerPlayerId === playerId) {
      setMessage("You cannot vote for your own fake answer.");
      return;
    }

    const { error } = await supabase.from("milo_bluff_votes").upsert(
      {
        lobby_id: lobby.id,
        question_id: currentQuestion.id,
        round_number: lobby.current_round,
        voter_player_id: playerId,
        selected_kind: option.kind,
        selected_answer_id: option.kind === "fake" ? option.answerId : null,
      },
      {
        onConflict: "lobby_id,round_number,voter_player_id",
      }
    );

    if (error) {
      setMessage(`Could not submit vote: ${error.message}`);
      return;
    }

    setMessage("Vote locked in.");
  }

  async function finishVotingAndScore() {
    if (!lobby || !currentQuestion) return;
    if (lobby.status !== "voting") return;

    const { data: lockedLobby } = await supabase
      .from("milo_bluff_lobbies")
      .update({
        status: "results",
        scoring_applied: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobby.id)
      .eq("status", "voting")
      .eq("scoring_applied", false)
      .select("*")
      .maybeSingle();

    if (!lockedLobby) return;

    const { data: latestAnswers } = await supabase
      .from("milo_bluff_answers")
      .select("*")
      .eq("lobby_id", lobby.id)
      .eq("round_number", lobby.current_round);

    const { data: latestVotes } = await supabase
      .from("milo_bluff_votes")
      .select("*")
      .eq("lobby_id", lobby.id)
      .eq("round_number", lobby.current_round);

    const answerOwner: Record<string, string> = {};

    (latestAnswers || []).forEach((answer) => {
      answerOwner[answer.id] = answer.player_id;
    });

    const scoreDelta: Record<string, number> = {};

    (latestVotes || []).forEach((vote) => {
      if (vote.selected_kind === "correct") {
        scoreDelta[vote.voter_player_id] = (scoreDelta[vote.voter_player_id] || 0) + 200;
      }

      if (vote.selected_kind === "fake" && vote.selected_answer_id) {
        const ownerId = answerOwner[vote.selected_answer_id];

        if (ownerId) {
          scoreDelta[ownerId] = (scoreDelta[ownerId] || 0) + 100;
        }
      }
    });

    await Promise.all(
      Object.entries(scoreDelta).map(([nextPlayerId, points]) =>
        supabase.rpc("add_milo_bluff_score", {
          p_player_id: nextPlayerId,
          p_points: points,
        })
      )
    );

    await loadGameState(lobby.id);
  }

  function clearLobbyState() {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setLobbyId(null);
    setPlayerId(null);
    setLobby(null);
    setPlayers([]);
    setCurrentQuestion(null);
    setAnswers([]);
    setVotes([]);
    setFakeAnswer("");
    setMessage("");
  }

  async function leaveCurrentLobby() {
    const leavingLobbyId = lobbyId;
    const leavingPlayerId = playerId;

    setBusy(true);

    if (leavingLobbyId && leavingPlayerId) {
      const { error } = await supabase.rpc("milo_bluff_leave_lobby", {
        p_lobby_id: leavingLobbyId,
        p_player_id: leavingPlayerId,
      });

      if (error) {
        console.warn("Could not mark bluff player as left:", error.message);
      }
    }

    setBusy(false);
    clearLobbyState();
  }

  async function handleBackToActivityLab(
    event: ReactMouseEvent<HTMLAnchorElement>
  ) {
    if (!lobbyId || !playerId) return;

    event.preventDefault();
    await leaveCurrentLobby();
    window.location.assign("/milo-world/activity-lab");
  }

  const pageStyle: CSSProperties = {
  position: "relative",
  minHeight: "100dvh",
  overflowX: "hidden",
  backgroundImage: `
    linear-gradient(
      180deg,
      rgba(2, 8, 23, 0.76),
      rgba(2, 8, 23, 0.9)
    ),
    url('/milo-world/activities/whos-bluffing-bg.png')
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: isMobile ? "scroll" : "fixed",
  color: "white",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

  const panelStyle: CSSProperties = {
    width: isMobile ? "calc(100% - 20px)" : "min(1080px, calc(100% - 32px))",
    margin: "0 auto",
    borderRadius: isMobile ? "22px" : "30px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(3, 10, 23, 0.72)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: "0 34px 100px rgba(0,0,0,0.45)",
    overflow: "hidden",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    height: "52px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.92)",
    color: "#07111f",
    padding: "0 16px",
    fontSize: "16px",
    fontWeight: 800,
    outline: "none",
    boxSizing: "border-box",
  };

  const primaryButtonStyle: CSSProperties = {
    height: "52px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(90deg, #c47a25, #e5b75e)",
    color: "white",
    fontWeight: 900,
    cursor: busy ? "wait" : "pointer",
    boxShadow: "0 14px 32px rgba(196,122,37,0.24)",
  };

  const darkButtonStyle: CSSProperties = {
    height: "52px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(5,13,28,0.86)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  };

  return (
    <main style={pageStyle}>
      <header
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "12px",
          padding: isMobile ? "12px 10px" : "20px",
        }}
      >
        <Link
          href="/milo-world/activity-lab"
          onClick={(event) => void handleBackToActivityLab(event)}
          style={{
            ...darkButtonStyle,
            height: "42px",
            padding: "0 18px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ← Back to Activity Lab
        </Link>

        {lobby && (
          <button
            type="button"
            onClick={() => void leaveCurrentLobby()}
            style={{
              ...darkButtonStyle,
              height: "42px",
              padding: "0 18px",
            }}
          >
            Leave
          </button>
        )}
      </header>

      <section style={{ padding: isMobile ? "10px 0 34px" : "22px 0 56px" }}>
        <div style={panelStyle}>
          <div
            style={{
              padding: isMobile ? "24px 20px" : "34px",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(145deg, rgba(255,176,83,0.16), rgba(83,215,255,0.08))",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "12px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Milo’s Multiplayer Lab
            </p>

            <h1
              style={{
                margin: "14px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "46px" : "clamp(44px, 7vw, 78px)",
                lineHeight: 0.95,
                fontWeight: 500,
              }}
            >
              Who’s Bluffing?
            </h1>

            <p
              style={{
                margin: "18px 0 0",
                maxWidth: "740px",
                color: "rgba(255,255,255,0.76)",
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: 1.6,
              }}
            >
              Create fake answers, spot the real one, and fool the room. Designed
              for 2 to 10 players.
            </p>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {[
                `Write a bluff · ${BLUFF_SUBMIT_SECONDS}s`,
                `Vote · ${BLUFF_VOTE_SECONDS}s`,
                "Find the truth · +200",
                "Fool a player · +100",
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    minHeight: "32px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,209,138,0.2)",
                    background: "rgba(255,209,138,0.08)",
                    color: "rgba(255,255,255,0.76)",
                    padding: "7px 11px",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: isMobile ? "11px" : "12px",
                    fontWeight: 800,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {!lobby && (
            <div
              style={{
                padding: isMobile ? "20px" : "34px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(280px, 1fr))",
                gap: isMobile ? "16px" : "24px",
              }}
            >
              <form
                onSubmit={createLobby}
                style={{
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  padding: isMobile ? "20px" : "24px",
                  display: "grid",
                  gap: "14px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: isMobile ? "25px" : "28px" }}>
                  Create Lobby
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.62)",
                    lineHeight: 1.5,
                    fontSize: isMobile ? "14px" : "15px",
                  }}
                >
                  Start a new room and share the lobby code with your players.
                </p>

                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Your player name"
                  maxLength={18}
                  style={inputStyle}
                />

                <label style={{ display: "grid", gap: "8px" }}>
                  <span
                    style={{
                      color: "#ffd18a",
                      fontSize: "12px",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    Game Length
                  </span>

                  <select
                    value={selectedMaxRounds}
                    onChange={(event) =>
                      setSelectedMaxRounds(Number(event.target.value) as RoundCount)
                    }
                    style={inputStyle}
                  >
                    <option value={5}>5 rounds</option>
                    <option value={10}>10 rounds</option>
                    <option value={20}>20 rounds</option>
                  </select>
                </label>

                <button type="submit" disabled={busy} style={primaryButtonStyle}>
                  Create Lobby
                </button>
              </form>

              <form
                onSubmit={joinLobby}
                style={{
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  padding: isMobile ? "20px" : "24px",
                  display: "grid",
                  gap: "14px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: isMobile ? "25px" : "28px" }}>
                  Join Lobby
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.62)",
                    lineHeight: 1.5,
                    fontSize: isMobile ? "14px" : "15px",
                  }}
                >
                  Enter the lobby code from the host.
                </p>

                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Your player name"
                  maxLength={18}
                  style={inputStyle}
                />

                <input
                  value={joinCode}
                  onChange={(event) =>
                    setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  placeholder="Lobby code"
                  maxLength={6}
                  style={{
                    ...inputStyle,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                />

                <button type="submit" disabled={busy} style={darkButtonStyle}>
                  Join Lobby
                </button>
              </form>
            </div>
          )}

          {lobby && (
            <div
              style={{
                padding: isMobile ? "20px" : "34px",
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(220px, 300px) 1fr",
                gap: isMobile ? "16px" : "24px",
              }}
            >
              <aside
                style={{
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  padding: isMobile ? "18px" : "20px",
                  alignSelf: "start",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#ffd18a",
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Lobby Code
                </p>

                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(lobby.room_code)}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    minHeight: "64px",
                    borderRadius: "18px",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(5,13,28,0.82)",
                    color: "white",
                    fontSize: isMobile ? "26px" : "30px",
                    fontWeight: 950,
                    letterSpacing: "0.12em",
                    cursor: "pointer",
                  }}
                >
                  {lobby.room_code}
                </button>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "rgba(255,255,255,0.48)",
                    fontSize: "12px",
                    lineHeight: 1.4,
                  }}
                >
                  Click code to copy. Game length: {lobby.max_rounds} rounds.
                </p>

                <div style={{ marginTop: "22px" }}>
                  <p
                    style={{
                      margin: "0 0 10px",
                      color: "#ffd18a",
                      fontSize: "12px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    Players {players.length}/10
                  </p>

                  <div style={{ display: "grid", gap: "8px" }}>
                    {sortedPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          alignItems: "center",
                          borderRadius: "14px",
                          background:
                            player.id === playerId
                              ? "rgba(255,209,138,0.14)"
                              : "rgba(255,255,255,0.07)",
                          padding: "10px 12px",
                        }}
                      >
                        <span style={{ fontWeight: 850, overflowWrap: "anywhere" }}>
                          {index + 1}. {player.nickname}
                          {player.id === lobby.host_player_id ? " ★" : ""}
                        </span>
                        <span style={{ color: "#ffd18a", fontWeight: 900 }}>
                          {player.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              <section
                style={{
                  minHeight: isMobile ? "auto" : "420px",
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  padding: isMobile ? "20px" : "24px",
                }}
              >
                {lobby.status === "lobby" && (
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#ffd18a",
                        fontSize: "12px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontWeight: 900,
                      }}
                    >
                      Waiting Room
                    </p>

                    <h2 style={{ margin: "12px 0 0", fontSize: isMobile ? "28px" : "34px" }}>
                      Waiting for players.
                    </h2>

                    <p
                      style={{
                        margin: "12px 0 0",
                        color: "rgba(255,255,255,0.62)",
                        lineHeight: 1.6,
                      }}
                    >
                      Share the lobby code. The host can start once there are at
                      least 2 players. When everyone submits a bluff or vote, the
                      game moves on immediately instead of making the room wait for
                      the timer. If the host disconnects, host control transfers
                      automatically to an active player.
                    </p>

                    {isHost ? (
                      <button
                        type="button"
                        onClick={startNextRound}
                        disabled={busy || players.length < 2}
                        style={{
                          ...primaryButtonStyle,
                          marginTop: "22px",
                          width: "100%",
                          opacity: players.length < 2 ? 0.48 : 1,
                          cursor: players.length < 2 ? "not-allowed" : "pointer",
                        }}
                      >
                        Start Game
                      </button>
                    ) : (
                      <p
                        style={{
                          margin: "22px 0 0",
                          color: "rgba(255,255,255,0.62)",
                        }}
                      >
                        Waiting for the host to start.
                      </p>
                    )}
                  </div>
                )}

                {lobby.status === "submitting" && currentQuestion && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: "#ffd18a", fontWeight: 900 }}>
                        Round {lobby.current_round}/{lobby.max_rounds}
                      </span>
                      <span style={{ color: "#ffd18a", fontWeight: 900 }}>
                        {submitSecondsLeft}s
                      </span>
                    </div>

                    <h2
                      style={{
                        margin: "18px 0 0",
                        fontSize: isMobile ? "25px" : "32px",
                        lineHeight: 1.2,
                      }}
                    >
                      {currentQuestion.question}
                    </h2>

                    <p
                      style={{
                        margin: "12px 0 0",
                        color: "rgba(255,255,255,0.62)",
                        lineHeight: 1.6,
                      }}
                    >
                      Type a fake answer that sounds believable. Other players
                      will try to spot the real one.
                    </p>

                    {myAnswer ? (
                      <div
                        style={{
                          marginTop: "22px",
                          borderRadius: "18px",
                          background: "rgba(255,209,138,0.12)",
                          border: "1px solid rgba(255,209,138,0.24)",
                          padding: "18px",
                        }}
                      >
                        <strong>Your fake answer:</strong>
                        <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.76)" }}>
                          {myAnswer.answer_text}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={submitFakeAnswer} style={{ marginTop: "22px" }}>
                        <input
                          value={fakeAnswer}
                          onChange={(event) => setFakeAnswer(event.target.value)}
                          placeholder="Enter fake answer"
                          maxLength={80}
                          style={inputStyle}
                        />

                        <button
                          type="submit"
                          disabled={busy}
                          style={{
                            ...primaryButtonStyle,
                            marginTop: "14px",
                            width: "100%",
                            opacity: busy ? 0.62 : 1,
                          }}
                        >
                          {busy ? "Checking Bluff..." : "Submit Fake Answer"}
                        </button>
                      </form>
                    )}

                    <p
                      style={{
                        margin: "18px 0 0",
                        color: "rgba(255,255,255,0.54)",
                      }}
                    >
                      {answers.length}/{players.length} players submitted
                    </p>
                  </div>
                )}

                {lobby.status === "voting" && currentQuestion && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: "#ffd18a", fontWeight: 900 }}>
                        Choose the real answer
                      </span>
                      <span style={{ color: "#ffd18a", fontWeight: 900 }}>
                        {voteSecondsLeft}s
                      </span>
                    </div>

                    <h2
                      style={{
                        margin: "18px 0 0",
                        fontSize: isMobile ? "24px" : "30px",
                        lineHeight: 1.2,
                      }}
                    >
                      {currentQuestion.question}
                    </h2>

                    <div style={{ marginTop: "22px", display: "grid", gap: "12px" }}>
                      {voteOptions.map((option) => {
                        const isOwnFake =
                          option.kind === "fake" && option.ownerPlayerId === playerId;

                        const selected =
                          myVote?.selected_kind === option.kind &&
                          (option.kind === "correct" ||
                            myVote?.selected_answer_id === option.answerId);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={Boolean(myVote) || isOwnFake}
                            onClick={() => submitVote(option)}
                            style={{
                              minHeight: "58px",
                              borderRadius: "16px",
                              border: selected
                                ? "1px solid rgba(255,209,138,0.74)"
                                : "1px solid rgba(255,255,255,0.14)",
                              background: selected
                                ? "rgba(255,209,138,0.18)"
                                : isOwnFake
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(255,255,255,0.1)",
                              color: isOwnFake ? "rgba(255,255,255,0.34)" : "white",
                              padding: "14px 16px",
                              textAlign: "left",
                              fontSize: isMobile ? "15px" : "16px",
                              fontWeight: 850,
                              cursor: Boolean(myVote) || isOwnFake ? "not-allowed" : "pointer",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {option.text}
                            {isOwnFake && (
                              <span style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>
                                Your fake answer
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <p
                      style={{
                        margin: "18px 0 0",
                        color: "rgba(255,255,255,0.54)",
                      }}
                    >
                      {votes.length}/{players.length} players voted
                    </p>
                  </div>
                )}

                {lobby.status === "results" && currentQuestion && (
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#ffd18a",
                        fontSize: "12px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontWeight: 900,
                      }}
                    >
                      Round Results
                    </p>

                    <h2 style={{ margin: "12px 0 0", fontSize: isMobile ? "26px" : "32px" }}>
                      Correct answer: {currentQuestion.correct_answer}
                    </h2>

                    {currentQuestion.explanation && (
                      <p
                        style={{
                          margin: "12px 0 0",
                          color: "rgba(255,255,255,0.66)",
                          lineHeight: 1.6,
                        }}
                      >
                        {currentQuestion.explanation}
                      </p>
                    )}

                    <div style={{ marginTop: "22px", display: "grid", gap: "12px" }}>
                      {voteOptions.map((option) => {
                        const voteCount = votes.filter((vote) =>
                          option.kind === "correct"
                            ? vote.selected_kind === "correct"
                            : vote.selected_answer_id === option.answerId
                        ).length;

                        return (
                          <div
                            key={option.id}
                            style={{
                              borderRadius: "18px",
                              border:
                                option.kind === "correct"
                                  ? "1px solid rgba(34,197,94,0.46)"
                                  : "1px solid rgba(255,255,255,0.14)",
                              background:
                                option.kind === "correct"
                                  ? "rgba(34,197,94,0.12)"
                                  : "rgba(255,255,255,0.08)",
                              padding: "16px",
                              overflowWrap: "anywhere",
                            }}
                          >
                            <strong>{option.text}</strong>
                            <p
                              style={{
                                margin: "6px 0 0",
                                color: "rgba(255,255,255,0.62)",
                              }}
                            >
                              {option.kind === "correct"
                                ? "Real answer"
                                : `Submitted by ${getPlayerName(players, option.ownerPlayerId)}`}{" "}
                              · {voteCount} vote{voteCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {isHost ? (
                      <button
                        type="button"
                        onClick={startNextRound}
                        style={{
                          ...primaryButtonStyle,
                          marginTop: "22px",
                          width: "100%",
                        }}
                      >
                        {lobby.current_round >= lobby.max_rounds
                          ? "Finish Game"
                          : "Start Next Round"}
                      </button>
                    ) : (
                      <p style={{ margin: "22px 0 0", color: "rgba(255,255,255,0.62)" }}>
                        Waiting for host.
                      </p>
                    )}
                  </div>
                )}

                {lobby.status === "finished" && (
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#ffd18a",
                        fontSize: "12px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontWeight: 900,
                      }}
                    >
                      Final Results
                    </p>

                    <h2 style={{ margin: "12px 0 0", fontSize: isMobile ? "30px" : "38px" }}>
                      Winner: {sortedPlayers[0]?.nickname || "No winner"}
                    </h2>

                    <div style={{ marginTop: "22px", display: "grid", gap: "10px" }}>
                      {sortedPlayers.map((player, index) => (
                        <div
                          key={player.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            borderRadius: "16px",
                            background:
                              index === 0
                                ? "rgba(255,209,138,0.18)"
                                : "rgba(255,255,255,0.08)",
                            border:
                              index === 0
                                ? "1px solid rgba(255,209,138,0.32)"
                                : "1px solid rgba(255,255,255,0.12)",
                            padding: "14px 16px",
                          }}
                        >
                          <strong style={{ overflowWrap: "anywhere" }}>
                            {index + 1}. {player.nickname}
                          </strong>
                          <strong style={{ color: "#ffd18a" }}>{player.score}</strong>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => void leaveCurrentLobby()}
                      style={{
                        ...darkButtonStyle,
                        marginTop: "22px",
                        width: "100%",
                      }}
                    >
                      Back to Create / Join
                    </button>
                  </div>
                )}

                {message && (
                  <p
                    style={{
                      margin: "18px 0 0",
                      color: "#ffd18a",
                      fontWeight: 800,
                      lineHeight: 1.5,
                    }}
                  >
                    {message}
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}