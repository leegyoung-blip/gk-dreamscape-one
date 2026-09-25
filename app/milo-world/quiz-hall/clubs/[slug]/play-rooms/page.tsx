"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AccessRow = {
  club_id: string;
  club_slug: string;
  club_name: string;
  member_count: number;
  unlock_threshold: number;
  size_eligible: boolean;
  member_hosting_enabled: boolean;
  is_member: boolean;
  is_owner: boolean;
  is_admin: boolean;
  can_host: boolean;
  can_enter_rooms: boolean;
  open_room_count: number;
};

type QuizRow = {
  quiz_id: string;
  quiz_slug: string;
  title: string;
};

type OpenRoom = {
  room_code: string;
  host_display_name: string;
  source_mode: "club_mix" | "quiz";
  source_quiz_slug: string | null;
  question_count: number;
  timer_seconds: number;
  player_count: number;
  max_players: number;
  created_at: string;
};

export default function CreatorClubPlayRoomsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const clubSlug = decodeURIComponent(String(params?.slug || ""));

  const [access, setAccess] = useState<AccessRow | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [rooms, setRooms] = useState<OpenRoom[]>([]);

  const [joinCode, setJoinCode] = useState("");
  const [sourceQuizSlug, setSourceQuizSlug] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<string[]>([
    "classic_choice",
    "choice_grid",
    "bar_estimate",
    "pie_estimate",
  ]);
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [accessMode, setAccessMode] = useState<"club" | "code">("code");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canUseTwenty = sourceQuizSlug === "";

  useEffect(() => {
    void load();
  }, [clubSlug]);

  useEffect(() => {
    if (sourceQuizSlug && questionCount === 20) {
      setQuestionCount(10);
    }
  }, [sourceQuizSlug, questionCount]);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const userResponse = await supabase.auth.getUser();
    if (!userResponse.data.user) {
      router.replace(
        `/login?next=${encodeURIComponent(
          `/milo-world/quiz-hall/clubs/${clubSlug}/play-rooms`,
        )}`,
      );
      return;
    }

    const [accessResponse, quizResponse, roomsResponse] =
      await Promise.all([
        supabase.rpc("get_creator_club_play_access_v2", {
          p_club_slug: clubSlug,
        }),
        supabase.rpc("get_creator_club_quiz_catalog", {
          p_club_slug: clubSlug,
        }),
        supabase.rpc("get_creator_club_open_rooms_v2", {
          p_club_slug: clubSlug,
        }),
      ]);

    if (accessResponse.error) {
      setAccess(null);
      setErrorMessage(
        accessResponse.error.message || "Club Play Rooms could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const row = Array.isArray(accessResponse.data)
      ? accessResponse.data[0]
      : accessResponse.data;

    const nextAccess = row
      ? {
          ...(row as AccessRow),
          member_count: Number(row.member_count || 0),
          unlock_threshold: Number(row.unlock_threshold || 100),
          size_eligible: Boolean(row.size_eligible),
          member_hosting_enabled: Boolean(row.member_hosting_enabled),
          is_member: Boolean(row.is_member),
          is_owner: Boolean(row.is_owner),
          is_admin: Boolean(row.is_admin),
          can_host: Boolean(row.can_host),
          can_enter_rooms: Boolean(row.can_enter_rooms),
          open_room_count: Number(row.open_room_count || 0),
        }
      : null;

    setAccess(nextAccess);

    setQuizzes(
      quizResponse.error
        ? []
        : ((quizResponse.data || []) as QuizRow[]).map((quiz) => ({
            quiz_id: String(quiz.quiz_id),
            quiz_slug: String(quiz.quiz_slug),
            title: String(quiz.title || "Creator Challenge"),
          })),
    );

    setRooms(
      roomsResponse.error
        ? []
        : ((roomsResponse.data || []) as OpenRoom[]).map((room) => ({
            ...room,
            room_code: String(room.room_code),
            host_display_name: String(room.host_display_name || "Host"),
            question_count: Number(room.question_count || 10),
            timer_seconds: Number(room.timer_seconds || 0),
            player_count: Number(room.player_count || 0),
            max_players: Number(room.max_players || 12),
          })),
    );

    setIsLoading(false);
  }

  async function createRoom() {
    setIsSaving(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_create_play_room_v2",
      {
        p_club_slug: clubSlug,
        p_source_quiz_slug: sourceQuizSlug || null,
        p_question_count: questionCount,
        p_question_types: questionTypes,
        p_timer_seconds: timerSeconds,
        p_max_players: maxPlayers,
        p_access_mode: accessMode,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Play Room could not be created.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const code = String(row?.room_code || "");

    if (!code) {
      setErrorMessage("Play Room was created but its code was not returned.");
      setIsSaving(false);
      return;
    }

    router.push(
      `/milo-world/quiz-hall/clubs/${encodeURIComponent(
        clubSlug,
      )}/play-rooms/${encodeURIComponent(code)}`,
    );
  }

  async function join(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_join_play_room_v2",
      { p_room_code: normalized },
    );

    if (error) {
      setErrorMessage(error.message || "Could not join this Play Room.");
      setIsSaving(false);
      return;
    }

    router.push(
      `/milo-world/quiz-hall/clubs/${encodeURIComponent(
        clubSlug,
      )}/play-rooms/${encodeURIComponent(normalized)}`,
    );
  }

  const progress = access
    ? Math.max(
        0,
        Math.min(
          100,
          (access.member_count / Math.max(1, access.unlock_threshold)) * 100,
        ),
      )
    : 0;

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/50">
        Loading Club Play Rooms...
      </main>
    );
  }

  if (!access) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.04] p-7 text-center">
          <h1 className="text-3xl font-black">Play Rooms unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-white/42">
            {errorMessage || "This club cannot open Play Rooms right now."}
          </p>
          <Link
            href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
              clubSlug,
            )}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 no-underline"
          >
            Back to Club
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#020711] px-4 py-5 text-white sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                clubSlug,
              )}`}
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.035] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-white/44 no-underline"
            >
              ← {access.club_name}
            </Link>
            <p className="mt-5 text-[8px] font-black uppercase tracking-[0.16em] text-fuchsia-100/58">
              Club Play Rooms
            </p>
            <h1 className="mt-2 font-serif text-[clamp(44px,6vw,76px)] font-normal leading-[0.92]">
              Play together.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/44">
              Members can host internal multiplayer games using the club’s
              published Creator Engine questions.
            </p>
          </div>

          <div className="rounded-[22px] border border-fuchsia-200/12 bg-fuchsia-300/[0.035] px-5 py-4">
            <strong className="block text-3xl text-fuchsia-100">
              {access.member_count.toLocaleString()}
            </strong>
            <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.08em] text-white/28">
              Club members
            </span>
          </div>
        </header>

        {errorMessage && (
          <p className="mt-5 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-4 py-3 text-[10px] text-red-100">
            {errorMessage}
          </p>
        )}

        {!access.size_eligible ? (
          <section className="mt-6 rounded-[28px] border border-amber-200/12 bg-amber-300/[0.035] p-6">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/58">
              Community Milestone
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Play Rooms unlock at 100 members.
            </h2>
            <p className="mt-3 text-sm text-white/40">
              {Math.max(
                0,
                access.unlock_threshold - access.member_count,
              ).toLocaleString()}{" "}
              more members to go.
            </p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-amber-200/70"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
        ) : !access.member_hosting_enabled ? (
          <section className="mt-6 rounded-[28px] border border-fuchsia-200/12 bg-fuchsia-300/[0.035] p-6">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-fuchsia-100/58">
              Milestone Reached
            </p>
            <h2 className="mt-2 text-3xl font-black">
              This club can use Play Rooms.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
              The creator has not enabled member-hosted rooms yet.
            </p>
          </section>
        ) : !access.can_enter_rooms ? (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black">
              Join the club first.
            </h2>
            <p className="mt-2 text-sm text-white/38">
              Play Rooms are internal club games.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <article className="rounded-[28px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(10,61,82,0.14),rgba(4,14,30,0.9))] p-5 sm:p-6">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/58">
                  Join a Room
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Enter a room code
                </h2>

                <div className="mt-4 flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(event) =>
                      setJoinCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 6),
                      )
                    }
                    placeholder="ABC123"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07152d] px-4 text-center text-lg font-black uppercase tracking-[0.18em] text-white outline-none placeholder:text-white/18 focus:border-cyan-200/28"
                  />
                  <button
                    type="button"
                    disabled={isSaving || joinCode.length < 4}
                    onClick={() => void join(joinCode)}
                    className="min-h-12 rounded-xl border border-cyan-200/20 bg-cyan-300/[0.07] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-100 disabled:opacity-35"
                  >
                    Join
                  </button>
                </div>

                <div className="mt-6 border-t border-white/8 pt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">
                        Open to Club
                      </p>
                      <h3 className="mt-1 text-lg font-black">
                        Waiting rooms
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-[7px] font-black uppercase tracking-[0.07em] text-white/30"
                    >
                      Refresh
                    </button>
                  </div>

                  {rooms.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-white/7 bg-black/12 p-4 text-[10px] text-white/28">
                      No open club rooms are waiting right now.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-2">
                      {rooms.map((room) => (
                        <button
                          key={room.room_code}
                          type="button"
                          disabled={isSaving}
                          onClick={() => void join(room.room_code)}
                          className="rounded-[18px] border border-white/8 bg-black/14 p-4 text-left transition hover:border-cyan-200/18"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span>
                              <strong className="block text-sm">
                                Hosted by {room.host_display_name}
                              </strong>
                              <small className="mt-1 block text-[8px] text-white/28">
                                {room.source_mode === "club_mix"
                                  ? "Club Mix"
                                  : "Published challenge"}{" "}
                                · {room.question_count}Q ·{" "}
                                {room.timer_seconds
                                  ? `${room.timer_seconds}s`
                                  : "Untimed"}
                              </small>
                            </span>
                            <span className="shrink-0 rounded-full border border-emerald-200/12 bg-emerald-400/[0.04] px-3 py-1 text-[8px] font-black text-emerald-100">
                              {room.player_count}/{room.max_players}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>

              <aside className="rounded-[28px] border border-fuchsia-200/12 bg-[linear-gradient(145deg,rgba(89,27,91,0.14),rgba(4,14,30,0.9))] p-5 sm:p-6">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-fuchsia-100/58">
                  Host a Room
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Build the session
                </h2>

                {!access.can_host ? (
                  <p className="mt-4 text-[10px] leading-5 text-white/34">
                    Only eligible club members, the creator and admins can host.
                  </p>
                ) : (
                  <>
                    <label className="mt-4 block">
                      <span className={labelClass}>Question source</span>
                      <select
                        value={sourceQuizSlug}
                        onChange={(event) =>
                          setSourceQuizSlug(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Club Mix · all published challenges
                        </option>
                        {quizzes.map((quiz) => (
                          <option
                            key={quiz.quiz_id}
                            value={quiz.quiz_slug}
                          >
                            {quiz.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label>
                        <span className={labelClass}>Questions</span>
                        <select
                          value={questionCount}
                          onChange={(event) =>
                            setQuestionCount(Number(event.target.value))
                          }
                          className={inputClass}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option
                            value={20}
                            disabled={!canUseTwenty}
                          >
                            20 · Club Mix
                          </option>
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>Timer</span>
                        <select
                          value={timerSeconds}
                          onChange={(event) =>
                            setTimerSeconds(Number(event.target.value))
                          }
                          className={inputClass}
                        >
                          <option value={0}>Untimed</option>
                          <option value={10}>10 seconds</option>
                          <option value={20}>20 seconds</option>
                          <option value={30}>30 seconds</option>
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>Max players</span>
                        <select
                          value={maxPlayers}
                          onChange={(event) =>
                            setMaxPlayers(Number(event.target.value))
                          }
                          className={inputClass}
                        >
                          {[4, 8, 12, 16, 20].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>Room access</span>
                        <select
                          value={accessMode}
                          onChange={(event) =>
                            setAccessMode(
                              event.target.value as "club" | "code",
                            )
                          }
                          className={inputClass}
                        >
                          <option value="code">Private code</option>
                          <option value="club">Open to club</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-4">
                      <span className={labelClass}>Question-type mix</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["classic_choice", "Classic"],
                          ["choice_grid", "Grid"],
                          ["bar_estimate", "Bar"],
                          ["pie_estimate", "Pie"],
                        ].map(([key, label]) => {
                          const active = questionTypes.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                setQuestionTypes((current) =>
                                  current.includes(key)
                                    ? current.filter((item) => item !== key)
                                    : [...current, key],
                                )
                              }
                              className={`min-h-9 rounded-xl border px-3 text-[8px] font-black uppercase tracking-[0.07em] ${
                                active
                                  ? "border-cyan-200/18 bg-cyan-300/[0.055] text-cyan-100"
                                  : "border-white/8 bg-black/12 text-white/26"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {questionTypes.length === 0 && (
                        <p className="mt-2 text-[8px] text-red-100/70">
                          Choose at least one question type.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isSaving || questionTypes.length === 0}
                      onClick={() => void createRoom()}
                      className="mt-4 min-h-11 w-full rounded-full border border-fuchsia-200/20 bg-fuchsia-300/[0.07] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-fuchsia-100 disabled:opacity-35"
                    >
                      {isSaving ? "Creating..." : "Create Play Room"}
                    </button>

                    <p className="mt-3 text-[8px] leading-4 text-white/24">
                      Play Room scores never increase creator REP or Creator
                      Reward DT. They are internal community play.
                    </p>
                  </>
                )}
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const labelClass =
  "mb-1.5 block text-[7px] font-black uppercase tracking-[0.09em] text-white/28";

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-[#07152d] px-3 text-[10px] text-white outline-none focus:border-fuchsia-200/26";
