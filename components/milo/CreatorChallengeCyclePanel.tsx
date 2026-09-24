"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CreatorClub = {
  club_id: string;
  club_name: string;
  club_slug: string;
  topic: string | null;
  status: string;
};

type CreatorQuiz = {
  quiz_id: string;
  club_id: string;
  club_name: string;
  title: string;
  slug: string;
  status: string;
  question_count: number;
};

type ChallengeCycle = {
  club_id: string;
  quiz_id: string;
  starts_at: string;
  ends_at: string;
  difficulty: number;
  attempt_mode: string;
  lifecycle_status: "scheduled" | "live" | "ended";
};

function localInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusClass(status: ChallengeCycle["lifecycle_status"] | null) {
  if (status === "live") {
    return "border-emerald-200/20 bg-emerald-400/[0.08] text-emerald-100";
  }
  if (status === "scheduled") {
    return "border-cyan-200/20 bg-cyan-400/[0.08] text-cyan-100";
  }
  return "border-white/10 bg-white/[0.04] text-white/42";
}

export default function CreatorChallengeCyclePanel() {
  const [clubs, setClubs] = useState<CreatorClub[]>([]);
  const [quizzes, setQuizzes] = useState<CreatorQuiz[]>([]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [cycle, setCycle] = useState<ChallengeCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const publishedForClub = useMemo(
    () =>
      quizzes.filter(
        (quiz) =>
          quiz.club_id === selectedClubId &&
          String(quiz.status).toLowerCase() === "published",
      ),
    [quizzes, selectedClubId],
  );

  const selectedQuiz =
    publishedForClub.find((quiz) => quiz.quiz_id === selectedQuizId) || null;

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    if (!selectedClubId) {
      setCycle(null);
      return;
    }

    void loadCycle(selectedClubId);
  }, [selectedClubId]);

  async function loadBase() {
    setIsLoading(true);
    setErrorMessage("");

    const [clubsResponse, quizzesResponse] = await Promise.all([
      supabase.rpc("creator_get_my_clubs"),
      supabase.rpc("creator_get_my_quizzes"),
    ]);

    if (clubsResponse.error) {
      setErrorMessage(clubsResponse.error.message || "Could not load clubs.");
      setIsLoading(false);
      return;
    }

    if (quizzesResponse.error) {
      setErrorMessage(
        quizzesResponse.error.message || "Could not load creator challenges.",
      );
      setIsLoading(false);
      return;
    }

    const nextClubs = ((clubsResponse.data || []) as CreatorClub[]).map(
      (club) => ({
        ...club,
        club_id: String(club.club_id),
      }),
    );

    const nextQuizzes = ((quizzesResponse.data || []) as CreatorQuiz[]).map(
      (quiz) => ({
        ...quiz,
        quiz_id: String(quiz.quiz_id),
        club_id: String(quiz.club_id),
        question_count: Number(quiz.question_count || 0),
      }),
    );

    setClubs(nextClubs);
    setQuizzes(nextQuizzes);

    const firstClub =
      nextClubs.find((club) => String(club.status).toLowerCase() !== "archived") ||
      nextClubs[0] ||
      null;

    if (firstClub) {
      setSelectedClubId(firstClub.club_id);
    }

    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartsAt(localInputValue(now));
    setEndsAt(localInputValue(defaultEnd));

    setIsLoading(false);
  }

  async function loadCycle(clubId: string) {
    const { data, error } = await supabase.rpc(
      "get_creator_phase3_challenge_cycle",
      { p_club_id: clubId },
    );

    if (error) {
      setCycle(null);
      setErrorMessage(error.message || "Could not load current challenge.");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      setCycle(null);
      setSelectedQuizId("");
      return;
    }

    const nextCycle: ChallengeCycle = {
      ...(row as ChallengeCycle),
      club_id: String(row.club_id),
      quiz_id: String(row.quiz_id),
      difficulty: Number(row.difficulty || 2),
    };

    setCycle(nextCycle);
    setSelectedQuizId(nextCycle.quiz_id);
    setDifficulty(nextCycle.difficulty);
    setStartsAt(localInputValue(new Date(nextCycle.starts_at)));
    setEndsAt(localInputValue(new Date(nextCycle.ends_at)));
  }

  async function saveCycle() {
    if (!selectedClubId) {
      setErrorMessage("Choose a Creator Club.");
      return;
    }

    if (!selectedQuizId) {
      setErrorMessage("Choose a published challenge.");
      return;
    }

    if (!startsAt || !endsAt) {
      setErrorMessage("Choose both a start and end time.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_phase3_set_challenge_cycle",
      {
        p_club_id: selectedClubId,
        p_quiz_id: selectedQuizId,
        p_starts_at: new Date(startsAt).toISOString(),
        p_ends_at: new Date(endsAt).toISOString(),
        p_difficulty: difficulty,
        p_attempt_mode: "best_score",
      },
    );

    if (error) {
      setErrorMessage(error.message || "Could not update the club challenge.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setCycle({
        ...(row as ChallengeCycle),
        difficulty: Number(row.difficulty || difficulty),
      });
    }

    setMessage(
      "Club challenge cycle updated. The public Club Home now follows this schedule.",
    );
    window.dispatchEvent(new Event("creator-phase3-cycle-updated"));
    setIsSaving(false);
  }

  async function clearCycle() {
    if (!selectedClubId || !cycle) return;

    if (
      !window.confirm(
        "Remove the scheduled/current challenge from this club? The quiz stays published.",
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_phase3_clear_challenge_cycle",
      { p_club_id: selectedClubId },
    );

    if (error) {
      setErrorMessage(error.message || "Could not clear the club challenge.");
      setIsSaving(false);
      return;
    }

    setCycle(null);
    setSelectedQuizId("");
    setMessage("Current challenge cleared. Published challenges are unchanged.");
    window.dispatchEvent(new Event("creator-phase3-cycle-updated"));
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <section className="shrink-0 rounded-[24px] border border-amber-200/12 bg-amber-300/[0.04] p-4 text-xs text-white/46">
        Loading club challenge cycle...
      </section>
    );
  }

  if (clubs.length === 0) {
    return (
      <section className="shrink-0 rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/58">
          Phase 3 · Challenge Cycle
        </p>
        <h2 className="mt-2 text-xl font-black">Create your club first.</h2>
      </section>
    );
  }

  return (
    <section className="shrink-0 rounded-[26px] border border-amber-200/13 bg-[linear-gradient(135deg,rgba(92,52,10,0.17),rgba(4,16,35,0.88))] p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-100/62">
            Phase 3 · Club Challenge
          </p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            Choose what the club is competing in now.
          </h2>
          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/42">
            Only published challenges can be featured. One challenge cycle can
            be scheduled per club, with best attempt counting on the
            leaderboard.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] ${statusClass(
            cycle?.lifecycle_status || null,
          )}`}
        >
          {cycle
            ? cycle.lifecycle_status === "live"
              ? "Live Now"
              : cycle.lifecycle_status === "scheduled"
                ? "Scheduled"
                : "Cycle Ended"
            : "No Current Cycle"}
        </span>
      </div>

      {(message || errorMessage) && (
        <div className="mt-3">
          {message && (
            <p className="rounded-xl border border-emerald-200/14 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-100">
              {message}
            </p>
          )}
          {errorMessage && (
            <p className="rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Field label="Club">
          <select
            value={selectedClubId}
            onChange={(event) => {
              setSelectedClubId(event.target.value);
              setSelectedQuizId("");
            }}
            className={inputClass}
          >
            {clubs.map((club) => (
              <option key={club.club_id} value={club.club_id}>
                {club.club_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Published challenge" span={2}>
          <select
            value={selectedQuizId}
            onChange={(event) => setSelectedQuizId(event.target.value)}
            className={inputClass}
          >
            <option value="">Choose challenge...</option>
            {publishedForClub.map((quiz) => (
              <option key={quiz.quiz_id} value={quiz.quiz_id}>
                {quiz.title} · {quiz.question_count}/10
              </option>
            ))}
          </select>
        </Field>

        <Field label="Difficulty">
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(Number(event.target.value))}
            className={inputClass}
          >
            <option value={1}>1 · Easy</option>
            <option value={2}>2 · Standard</option>
            <option value={3}>3 · Tricky</option>
            <option value={4}>4 · Hard</option>
            <option value={5}>5 · Expert</option>
          </select>
        </Field>

        <Field label="Starts">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Ends">
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {publishedForClub.length === 0 && (
        <p className="mt-3 rounded-xl border border-cyan-200/12 bg-cyan-300/[0.035] px-3 py-2 text-[10px] leading-5 text-cyan-100/68">
          This club has no published challenges yet. Finish a 10-question
          challenge and pass Dreamscape review first.
        </p>
      )}

      {selectedQuiz && (
        <p className="mt-3 text-[9px] text-white/34">
          Selected: <strong className="text-white/62">{selectedQuiz.title}</strong>{" "}
          · Best attempt wins.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving || !selectedQuizId}
          onClick={() => void saveCycle()}
          className="min-h-10 rounded-full border border-amber-200/22 bg-amber-300/[0.09] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-amber-100 disabled:opacity-35"
        >
          {isSaving ? "Saving..." : cycle ? "Update Cycle" : "Set Club Challenge"}
        </button>

        {cycle && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void clearCycle()}
            className="min-h-10 rounded-full border border-white/10 bg-white/[0.035] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-white/44 disabled:opacity-35"
          >
            Clear Current Challenge
          </button>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  span = 1,
  children,
}: {
  label: string;
  span?: number;
  children: React.ReactNode;
}) {
  const spanClass = span === 2 ? "xl:col-span-2" : "";
  return (
    <label className={spanClass}>
      <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.11em] text-white/30">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#06152d] px-3 text-[10px] text-white outline-none focus:border-amber-200/28";
