"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorQuestionRenderer, {
  type CreatorEngineAnswerValue,
  type CreatorEngineQuestion,
} from "@/components/milo/creator-engine/CreatorQuestionRenderer";
import {
  normalizeCreatorClubUpgradeAppearance,
  roomUpgradeBackdropStyle,
  type CreatorClubUpgradeAppearance,
} from "@/components/milo/creator-engine/CreatorClubUpgradeStyle";

type RoomMember = {
  user_id: string;
  display_name: string;
  is_host: boolean;
  score_points: number;
  correct_count: number;
  partial_count: number;
  total_response_time_ms: number;
  last_round_xp: number;
  joined_at: string;
  is_me: boolean;
};

type RoomState = {
  room_id: string;
  room_code: string;
  club_id: string;
  club_slug: string;
  club_name: string;
  source_mode: "club_mix" | "quiz";
  source_quiz_slug: string | null;
  access_mode: "club" | "code";
  status: "waiting" | "playing" | "results" | "ended";
  question_count: number;
  timer_seconds: number;
  max_players: number;
  current_question_index: number;
  question_started_at: string | null;
  round_no: number;
  is_host: boolean;
  my_answered: boolean;
  answered_count: number;
  active_player_count: number;
  question: CreatorEngineQuestion | null;
  members: RoomMember[];
};

function normalizeState(raw: Record<string, unknown>): RoomState {
  const rawQuestion =
    raw.question && typeof raw.question === "object"
      ? (raw.question as CreatorEngineQuestion)
      : null;

  return {
    room_id: String(raw.room_id || ""),
    room_code: String(raw.room_code || ""),
    club_id: String(raw.club_id || ""),
    club_slug: String(raw.club_slug || ""),
    club_name: String(raw.club_name || "Creator Club"),
    source_mode: String(raw.source_mode || "club_mix") as RoomState["source_mode"],
    source_quiz_slug: raw.source_quiz_slug
      ? String(raw.source_quiz_slug)
      : null,
    access_mode: String(raw.access_mode || "code") as RoomState["access_mode"],
    status: String(raw.status || "waiting") as RoomState["status"],
    question_count: Number(raw.question_count || 10),
    timer_seconds: Number(raw.timer_seconds || 0),
    max_players: Number(raw.max_players || 12),
    current_question_index: Number(raw.current_question_index || 0),
    question_started_at: raw.question_started_at
      ? String(raw.question_started_at)
      : null,
    round_no: Number(raw.round_no || 0),
    is_host: Boolean(raw.is_host),
    my_answered: Boolean(raw.my_answered),
    answered_count: Number(raw.answered_count || 0),
    active_player_count: Number(raw.active_player_count || 0),
    question: rawQuestion
      ? {
          ...rawQuestion,
          id: String(rawQuestion.id),
          question_order: Number(rawQuestion.question_order || 0),
          difficulty: Number(rawQuestion.difficulty || 2),
          config: rawQuestion.config || {},
          options: (rawQuestion.options || []).map((option) => ({
            ...option,
            option_key: String(option.option_key),
            label: String(option.label || ""),
            image_url: option.image_url ? String(option.image_url) : null,
            sort_order: Number(option.sort_order || 0),
          })),
        }
      : null,
    members: ((raw.members || []) as unknown[]).map((item) => {
      const member = item as Record<string, unknown>;
      return {
        user_id: String(member.user_id || ""),
        display_name: String(member.display_name || "Player"),
        is_host: Boolean(member.is_host),
        score_points: Number(member.score_points || 0),
        correct_count: Number(member.correct_count || 0),
        partial_count: Number(member.partial_count || 0),
        total_response_time_ms: Number(member.total_response_time_ms || 0),
        last_round_xp: Number(member.last_round_xp || 0),
        joined_at: String(member.joined_at || ""),
        is_me: Boolean(member.is_me),
      };
    }),
  };
}

function initialAnswer(question: CreatorEngineQuestion): CreatorEngineAnswerValue {
  if (question.question_type === "bar_estimate") {
    const min = Number(question.config?.min ?? 0);
    const max = Number(question.config?.max ?? 100);
    return {
      selectedKeys: [],
      numericValue: min + (max - min) / 2,
    };
  }

  if (question.question_type === "pie_estimate") {
    return { selectedKeys: [], numericValue: 50 };
  }

  return { selectedKeys: [], numericValue: null };
}

function canSubmit(
  question: CreatorEngineQuestion,
  value: CreatorEngineAnswerValue,
) {
  if (
    question.question_type === "classic_choice" ||
    question.question_type === "choice_grid"
  ) {
    return value.selectedKeys.length > 0;
  }

  return value.numericValue !== null && Number.isFinite(value.numericValue);
}

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function CreatorClubPlayRoomPage() {
  const params = useParams<{ slug: string; code: string }>();
  const router = useRouter();

  const clubSlug = decodeURIComponent(String(params?.slug || ""));
  const roomCode = decodeURIComponent(String(params?.code || "")).toUpperCase();

  const [state, setState] = useState<RoomState | null>(null);
  const [appearance, setAppearance] = useState<CreatorClubUpgradeAppearance>(
    normalizeCreatorClubUpgradeAppearance(null),
  );
  const [answer, setAnswer] = useState<CreatorEngineAnswerValue>({
    selectedKeys: [],
    numericValue: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  const questionStartedAtRef = useRef(Date.now());
  const pollingRef = useRef(false);

  const currentQuestion = state?.question || null;
  const myMember = state?.members.find((member) => member.is_me) || null;

  const remainingSeconds = useMemo(() => {
    if (
      !state ||
      state.status !== "playing" ||
      !state.timer_seconds ||
      !state.question_started_at
    ) {
      return null;
    }

    const started = new Date(state.question_started_at).getTime();
    const elapsed = Math.max(0, nowTick - started);
    return Math.max(
      0,
      Math.ceil((state.timer_seconds * 1000 - elapsed) / 1000),
    );
  }, [nowTick, state]);

  useEffect(() => {
    void initialise();
  }, [roomCode]);

  useEffect(() => {
    if (!state || state.status === "ended") return;

    const interval = window.setInterval(() => {
      void poll();
    }, 1200);

    return () => window.clearInterval(interval);
  }, [state?.status, roomCode]);

  useEffect(() => {
    if (!state || state.status !== "playing" || !state.timer_seconds) return;

    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [state?.status, state?.timer_seconds, state?.question_started_at]);

  useEffect(() => {
    if (!currentQuestion) return;
    setAnswer(initialAnswer(currentQuestion));
    questionStartedAtRef.current = Date.now();
  }, [currentQuestion?.id, state?.round_no]);

  async function initialise() {
    setIsLoading(true);
    setErrorMessage("");

    const userResponse = await supabase.auth.getUser();
    if (!userResponse.data.user) {
      router.replace(
        `/login?next=${encodeURIComponent(
          `/milo-world/quiz-hall/clubs/${clubSlug}/play-rooms/${roomCode}`,
        )}`,
      );
      return;
    }

    const appearanceResponse = await supabase.rpc(
      "get_creator_club_upgrade_public_v1",
      { p_club_slug: clubSlug },
    );

    setAppearance(
      appearanceResponse.error
        ? normalizeCreatorClubUpgradeAppearance(null)
        : normalizeCreatorClubUpgradeAppearance(appearanceResponse.data),
    );

    const joinResponse = await supabase.rpc(
      "creator_join_play_room_v2",
      { p_room_code: roomCode },
    );

    if (joinResponse.error) {
      // If the room has already started, an existing member can still load
      // state even though the join RPC correctly refuses late joins.
      const stateResponse = await supabase.rpc(
        "get_creator_play_room_state_v2",
        { p_room_code: roomCode },
      );

      if (stateResponse.error) {
        setErrorMessage(
          joinResponse.error.message ||
            stateResponse.error.message ||
            "Play Room could not be opened.",
        );
        setIsLoading(false);
        return;
      }

      setState(
        normalizeState(
          stateResponse.data as Record<string, unknown>,
        ),
      );
      setIsLoading(false);
      return;
    }

    await poll(true);
    setIsLoading(false);
  }

  async function poll(skipGuard = false) {
    if (pollingRef.current && !skipGuard) return;
    pollingRef.current = true;

    try {
      await supabase.rpc("creator_tick_play_room_v2", {
        p_room_code: roomCode,
      });

      const { data, error } = await supabase.rpc(
        "get_creator_play_room_state_v2",
        { p_room_code: roomCode },
      );

      if (error || !data) {
        if (error) {
          setErrorMessage(error.message || "Play Room state could not load.");
        }
        return;
      }

      setState(normalizeState(data as Record<string, unknown>));
      setNowTick(Date.now());
    } finally {
      pollingRef.current = false;
    }
  }

  async function startOrRematch() {
    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_start_play_room_v2",
      { p_room_code: roomCode },
    );

    if (error) {
      setErrorMessage(error.message || "Play Room could not start.");
      setIsSaving(false);
      return;
    }

    await poll(true);
    setIsSaving(false);
  }

  async function submitAnswer() {
    if (!state || !currentQuestion) return;

    setIsSaving(true);
    setErrorMessage("");

    const responseTime = Math.max(
      0,
      Date.now() - questionStartedAtRef.current,
    );

    const { error } = await supabase.rpc(
      "creator_submit_play_room_answer_v2",
      {
        p_room_code: roomCode,
        p_selected_keys: answer.selectedKeys,
        p_numeric_value: answer.numericValue,
        p_response_time_ms: responseTime,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Answer could not be locked.");
      setIsSaving(false);
      return;
    }

    await poll(true);
    setIsSaving(false);
  }

  async function endRoom() {
    if (!window.confirm("End this Club Play Room?")) return;

    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_end_play_room_v2",
      { p_room_code: roomCode },
    );

    if (error) {
      setErrorMessage(error.message || "Room could not be ended.");
      setIsSaving(false);
      return;
    }

    await poll(true);
    setIsSaving(false);
  }

  async function removeMember(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this room?`)) return;

    const { error } = await supabase.rpc(
      "creator_remove_play_room_member_v2",
      {
        p_room_code: roomCode,
        p_user_id: userId,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Player could not be removed.");
      return;
    }

    await poll(true);
  }

  async function leaveRoom() {
    const { error } = await supabase.rpc(
      "creator_leave_play_room_v2",
      { p_room_code: roomCode },
    );

    if (error) {
      setErrorMessage(error.message || "Could not leave the room.");
      return;
    }

    router.push(
      `/milo-world/quiz-hall/clubs/${encodeURIComponent(
        clubSlug,
      )}/play-rooms`,
    );
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // The code remains visible if clipboard permission is unavailable.
    }
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/50">
        Joining Club Play Room...
      </main>
    );
  }

  if (!state) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.04] p-7 text-center">
          <h1 className="text-3xl font-black">Room unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-white/42">
            {errorMessage || "This Club Play Room could not be opened."}
          </p>
          <Link
            href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
              clubSlug,
            )}/play-rooms`}
            className="mt-6 inline-flex min-h-11 items-center rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 no-underline"
          >
            Back to Play Rooms
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-[#020711] text-white"
      style={roomUpgradeBackdropStyle(appearance.room_theme_key)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.10),transparent_32%),linear-gradient(180deg,#041124_0%,#020711_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/74 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                  clubSlug,
                )}/play-rooms`}
                className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-white/42 no-underline"
              >
                ← Rooms
              </Link>

              <div className="min-w-0">
                <p className="truncate text-[7px] font-black uppercase tracking-[0.12em] text-fuchsia-100/52">
                  {state.club_name}
                </p>
                <strong className="block truncate text-sm">
                  Club Play Room
                </strong>
                {appearance.room_theme_name && (
                  <span className="mt-0.5 block truncate text-[7px] font-black uppercase tracking-[0.07em] text-fuchsia-100/48">
                    {appearance.room_theme_name}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void copyCode()}
              className="rounded-full border border-fuchsia-200/16 bg-fuchsia-300/[0.05] px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-fuchsia-100"
            >
              {state.room_code}
            </button>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-[1280px]">
            {errorMessage && (
              <p className="mb-4 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-4 py-3 text-[10px] text-red-100">
                {errorMessage}
              </p>
            )}

            {state.status === "waiting" && (
              <WaitingRoom
                state={state}
                isSaving={isSaving}
                onStart={() => void startOrRematch()}
                onEnd={() => void endRoom()}
                onLeave={() => void leaveRoom()}
                onRemove={(userId, name) =>
                  void removeMember(userId, name)
                }
              />
            )}

            {state.status === "playing" && currentQuestion && (
              <PlayingRoom
                state={state}
                question={currentQuestion}
                answer={answer}
                remainingSeconds={remainingSeconds}
                isSaving={isSaving}
                onAnswer={setAnswer}
                onSubmit={() => void submitAnswer()}
                onEnd={() => void endRoom()}
                onLeave={() => void leaveRoom()}
                onRemove={(userId, name) =>
                  void removeMember(userId, name)
                }
              />
            )}

            {state.status === "results" && (
              <ResultsRoom
                state={state}
                isSaving={isSaving}
                onRematch={() => void startOrRematch()}
                onEnd={() => void endRoom()}
                onLeave={() => void leaveRoom()}
              />
            )}

            {state.status === "ended" && (
              <section className="mx-auto max-w-2xl rounded-[30px] border border-white/10 bg-white/[0.04] p-7 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
                  Room Ended
                </p>
                <h1 className="mt-2 text-4xl font-black">
                  Thanks for playing.
                </h1>
                <p className="mt-3 text-sm text-white/38">
                  Room activity stays internal to the club and does not affect
                  Creator Reputation or creator DT rewards.
                </p>
                <Link
                  href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                    clubSlug,
                  )}/play-rooms`}
                  className="mt-6 inline-flex min-h-11 items-center rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 no-underline"
                >
                  Back to Play Rooms
                </Link>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function WaitingRoom({
  state,
  isSaving,
  onStart,
  onEnd,
  onLeave,
  onRemove,
}: {
  state: RoomState;
  isSaving: boolean;
  onStart: () => void;
  onEnd: () => void;
  onLeave: () => void;
  onRemove: (userId: string, name: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[30px] border border-fuchsia-200/12 bg-[linear-gradient(145deg,rgba(89,27,91,0.14),rgba(4,14,30,0.92))] p-6">
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-fuchsia-100/58">
          Waiting Room
        </p>
        <h1 className="mt-2 font-serif text-[clamp(42px,6vw,72px)] font-normal leading-[0.94]">
          Bring the club together.
        </h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <RoomMetric
            label="Players"
            value={`${state.members.length}/${state.max_players}`}
          />
          <RoomMetric
            label="Questions"
            value={state.question_count}
          />
          <RoomMetric
            label="Timer"
            value={
              state.timer_seconds ? `${state.timer_seconds}s` : "None"
            }
          />
          <RoomMetric
            label="Source"
            value={state.source_mode === "club_mix" ? "Club Mix" : "Challenge"}
          />
        </div>

        <p className="mt-5 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.025] px-4 py-3 text-[9px] leading-5 text-cyan-100/48">
          Everyone answers the same Engine V2 question. The room waits for all
          active players, or advances when the timer expires.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {state.is_host ? (
            <>
              <button
                type="button"
                disabled={isSaving || state.members.length < 2}
                onClick={onStart}
                className="min-h-11 rounded-full border border-fuchsia-200/22 bg-fuchsia-300/[0.08] px-6 text-[9px] font-black uppercase tracking-[0.09em] text-fuchsia-100 disabled:opacity-35"
              >
                {state.members.length < 2 ? "Need 2 Players" : "Start Game"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={onEnd}
                className="min-h-11 rounded-full border border-white/9 bg-white/[0.03] px-5 text-[8px] font-black uppercase tracking-[0.08em] text-white/34"
              >
                End Room
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLeave}
              className="min-h-11 rounded-full border border-white/9 bg-white/[0.03] px-5 text-[8px] font-black uppercase tracking-[0.08em] text-white/34"
            >
              Leave Room
            </button>
          )}
        </div>
      </section>

      <Roster
        members={state.members}
        isHost={state.is_host}
        waiting
        onRemove={onRemove}
      />
    </div>
  );
}

function PlayingRoom({
  state,
  question,
  answer,
  remainingSeconds,
  isSaving,
  onAnswer,
  onSubmit,
  onEnd,
  onLeave,
  onRemove,
}: {
  state: RoomState;
  question: CreatorEngineQuestion;
  answer: CreatorEngineAnswerValue;
  remainingSeconds: number | null;
  isSaving: boolean;
  onAnswer: (value: CreatorEngineAnswerValue) => void;
  onSubmit: () => void;
  onEnd: () => void;
  onLeave: () => void;
  onRemove: (userId: string, name: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.025] px-4 py-3">
          <span>
            <small className="block text-[7px] font-black uppercase tracking-[0.1em] text-white/28">
              Round {state.round_no}
            </small>
            <strong className="mt-1 block text-sm">
              Question {state.current_question_index + 1}/
              {state.question_count}
            </strong>
          </span>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cyan-200/12 bg-cyan-300/[0.04] px-3 py-1.5 text-[8px] font-black text-cyan-100">
              {state.answered_count}/{state.active_player_count} answered
            </span>

            {remainingSeconds !== null && (
              <span
                className={`rounded-full border px-3 py-1.5 text-[9px] font-black ${
                  remainingSeconds <= 5
                    ? "border-red-200/18 bg-red-400/[0.06] text-red-100"
                    : "border-amber-200/14 bg-amber-300/[0.045] text-amber-100"
                }`}
              >
                {remainingSeconds}s
              </span>
            )}
          </div>
        </div>

        <CreatorQuestionRenderer
          question={question}
          value={answer}
          onChange={onAnswer}
          disabled={state.my_answered || isSaving}
        />

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.025] p-3">
          <span className="text-[9px] text-white/28">
            {state.my_answered
              ? "Answer locked. Waiting for the rest of the room..."
              : String(question.config?.selection_mode || "single") ===
                    "multi" &&
                  question.question_type === "choice_grid"
                ? "Select every answer you want, then lock it."
                : "Make your choice, then lock it."}
          </span>

          {!state.my_answered && (
            <button
              type="button"
              disabled={isSaving || !canSubmit(question, answer)}
              onClick={onSubmit}
              className="min-h-10 shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-100 disabled:opacity-35"
            >
              {isSaving ? "Locking..." : "Lock Answer"}
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {state.is_host ? (
            <button
              type="button"
              onClick={onEnd}
              className="rounded-full border border-white/8 bg-white/[0.025] px-4 py-2 text-[7px] font-black uppercase tracking-[0.08em] text-white/26"
            >
              End Room
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeave}
              className="rounded-full border border-white/8 bg-white/[0.025] px-4 py-2 text-[7px] font-black uppercase tracking-[0.08em] text-white/26"
            >
              Leave Room
            </button>
          )}
        </div>
      </section>

      <Roster
        members={state.members}
        isHost={state.is_host}
        waiting={false}
        onRemove={onRemove}
      />
    </div>
  );
}

function ResultsRoom({
  state,
  isSaving,
  onRematch,
  onEnd,
  onLeave,
}: {
  state: RoomState;
  isSaving: boolean;
  onRematch: () => void;
  onEnd: () => void;
  onLeave: () => void;
}) {
  const winner = state.members[0] || null;
  const myMember = state.members.find((member) => member.is_me) || null;

  return (
    <div className="mx-auto max-w-[980px]">
      <section className="rounded-[32px] border border-fuchsia-200/13 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.12),transparent_35%),linear-gradient(145deg,rgba(28,10,46,0.94),rgba(2,7,17,0.98))] p-6 text-center sm:p-8">
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-fuchsia-100/58">
          Round {state.round_no} Complete
        </p>
        <h1 className="mt-3 font-serif text-5xl font-normal">
          {winner ? `${winner.display_name} leads!` : "Game complete"}
        </h1>

        {myMember && (
          <p className="mt-4 text-sm text-white/42">
            You scored{" "}
            <strong className="text-white">
              {myMember.score_points.toLocaleString()} points
            </strong>
            {myMember.last_round_xp > 0
              ? ` and earned +${myMember.last_round_xp} Club XP.`
              : "."}
          </p>
        )}

        <div className="mx-auto mt-6 max-w-2xl space-y-2 text-left">
          {state.members.map((member, index) => (
            <div
              key={member.user_id}
              className={`grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] border px-4 py-3 ${
                member.is_me
                  ? "border-cyan-200/18 bg-cyan-300/[0.055]"
                  : "border-white/8 bg-black/14"
              }`}
            >
              <strong
                className={`text-lg ${
                  index < 3 ? "text-amber-100" : "text-white/30"
                }`}
              >
                {index + 1}
              </strong>
              <span className="min-w-0">
                <strong className="block truncate text-[11px]">
                  {member.display_name}
                  {member.is_me ? " · You" : ""}
                </strong>
                <small className="mt-1 block text-[8px] text-white/26">
                  {member.correct_count} full · {member.partial_count} partial
                  · {formatTime(member.total_response_time_ms)}
                </small>
              </span>
              <span className="text-right">
                <strong className="block text-sm text-fuchsia-100">
                  {member.score_points}
                </strong>
                {member.last_round_xp > 0 && (
                  <small className="text-[7px] text-emerald-100/52">
                    +{member.last_round_xp} XP
                  </small>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {state.is_host ? (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={onRematch}
                className="min-h-11 rounded-full border border-fuchsia-200/22 bg-fuchsia-300/[0.08] px-6 text-[9px] font-black uppercase tracking-[0.09em] text-fuchsia-100 disabled:opacity-35"
              >
                Rematch
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={onEnd}
                className="min-h-11 rounded-full border border-white/9 bg-white/[0.03] px-5 text-[8px] font-black uppercase tracking-[0.08em] text-white/34"
              >
                End Room
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLeave}
              className="min-h-11 rounded-full border border-white/9 bg-white/[0.03] px-5 text-[8px] font-black uppercase tracking-[0.08em] text-white/34"
            >
              Leave Room
            </button>
          )}
        </div>

        <p className="mt-5 text-[8px] leading-4 text-white/22">
          Club Play Room XP is capped at 60 XP per day. Room activity does not
          increase creator REP or Creator Reward DT.
        </p>
      </section>
    </div>
  );
}

function Roster({
  members,
  isHost,
  waiting,
  onRemove,
}: {
  members: RoomMember[];
  isHost: boolean;
  waiting: boolean;
  onRemove: (userId: string, name: string) => void;
}) {
  return (
    <aside className="rounded-[26px] border border-white/9 bg-white/[0.03] p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">
            Players
          </p>
          <h3 className="mt-1 text-lg font-black">
            {members.length} in room
          </h3>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {members.map((member, index) => (
          <div
            key={member.user_id}
            className={`rounded-[16px] border px-3 py-3 ${
              member.is_me
                ? "border-cyan-200/16 bg-cyan-300/[0.045]"
                : "border-white/7 bg-black/12"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <strong className="block truncate text-[10px]">
                  {waiting ? "" : `${index + 1}. `}
                  {member.display_name}
                  {member.is_host ? " · Host" : ""}
                  {member.is_me ? " · You" : ""}
                </strong>
                {!waiting && (
                  <small className="mt-1 block text-[8px] text-white/26">
                    {member.score_points} pts
                  </small>
                )}
              </span>

              {isHost && !member.is_host && (
                <button
                  type="button"
                  onClick={() =>
                    onRemove(member.user_id, member.display_name)
                  }
                  className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.06em] text-white/26"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function RoomMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-black/14 px-4 py-4">
      <strong className="block text-xl text-fuchsia-100">
        {value}
      </strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.08em] text-white/24">
        {label}
      </span>
    </div>
  );
}
