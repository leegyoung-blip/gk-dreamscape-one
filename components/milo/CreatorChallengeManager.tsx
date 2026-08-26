"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ChallengeOption = {
  quiz_id: string;
  quiz_title: string;
  club_id: string;
  club_name: string;
  quiz_status: string;
  current_challenge_id: string | null;
  challenge_starts_at: string | null;
  challenge_ends_at: string | null;
};

function formatEnd(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CreatorChallengeManager() {
  const [options, setOptions] = useState<ChallengeOption[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentChallenges = useMemo(
    () =>
      options.filter(
        (option) =>
          option.current_challenge_id &&
          option.challenge_ends_at &&
          new Date(option.challenge_ends_at).getTime() > Date.now(),
      ),
    [options],
  );

  useEffect(() => {
    void loadOptions();
  }, []);

  async function loadOptions() {
    setIsLoading(true);

    const { data, error } = await supabase.rpc(
      "creator_get_my_challenge_options",
    );

    if (error) {
      setOptions([]);
      setErrorMessage(
        error.message || "Could not load creator challenge options.",
      );
      setIsLoading(false);
      return;
    }

    const next = (data || []) as ChallengeOption[];
    setOptions(next);

    setSelectedQuizId((current) =>
      current && next.some((item) => item.quiz_id === current)
        ? current
        : next[0]?.quiz_id || "",
    );

    setIsLoading(false);
  }

  async function startChallenge() {
    if (!selectedQuizId) return;

    const selected = options.find(
      (option) => option.quiz_id === selectedQuizId,
    );
    if (!selected) return;

    const confirmed = window.confirm(
      `Make "${selected.quiz_title}" the 7-day challenge for ${selected.club_name}? Any current challenge in that club will end.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_set_club_challenge", {
      p_quiz_id: selectedQuizId,
      p_duration_days: 7,
    });

    if (error) {
      setErrorMessage(error.message || "Could not start club challenge.");
      setIsSaving(false);
      return;
    }

    setMessage(`"${selected.quiz_title}" is now the 7-day club challenge.`);
    await loadOptions();
    setIsSaving(false);
  }

  async function endChallenge(challenge: ChallengeOption) {
    if (!challenge.current_challenge_id) return;

    const confirmed = window.confirm(
      `End the current challenge "${challenge.quiz_title}" now?`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_end_club_challenge", {
      p_challenge_id: challenge.current_challenge_id,
    });

    if (error) {
      setErrorMessage(error.message || "Could not end club challenge.");
      setIsSaving(false);
      return;
    }

    setMessage(`"${challenge.quiz_title}" challenge ended.`);
    await loadOptions();
    setIsSaving(false);
  }

  return (
    <section className="shrink-0 rounded-[24px] border border-cyan-200/13 bg-[linear-gradient(135deg,rgba(8,64,78,0.17),rgba(6,16,40,0.70))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/62">
            Phase 4 · Club Competition
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            7-Day Creator Challenge
          </h2>
          <p className="mt-1 text-[10px] leading-4 text-white/40">
            Choose a published quiz. Each member’s best challenge attempt counts
            toward the challenge leaderboard.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:max-w-[620px]">
          <select
            value={selectedQuizId}
            onChange={(event) => setSelectedQuizId(event.target.value)}
            disabled={isLoading || isSaving || options.length === 0}
            className="h-10 min-w-0 flex-1 rounded-full border border-cyan-200/14 bg-[#061632]/88 px-4 text-[10px] text-white outline-none disabled:opacity-40"
          >
            {options.length === 0 ? (
              <option value="">No published quizzes yet</option>
            ) : (
              options.map((option) => (
                <option key={option.quiz_id} value={option.quiz_id}>
                  {option.club_name} · {option.quiz_title}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            disabled={
              isLoading || isSaving || !selectedQuizId || options.length === 0
            }
            onClick={() => void startChallenge()}
            className="min-h-10 shrink-0 rounded-full border border-cyan-200/22 bg-cyan-400/10 px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-36"
          >
            {isSaving ? "Saving..." : "Set 7-Day Challenge"}
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded-xl border border-emerald-200/14 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
          {errorMessage}
        </p>
      )}

      {currentChallenges.length > 0 && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {currentChallenges.map((challenge) => (
            <div
              key={challenge.current_challenge_id!}
              className="flex items-center justify-between gap-3 rounded-xl border border-cyan-200/10 bg-black/18 px-3 py-2"
            >
              <span className="min-w-0">
                <strong className="block truncate text-[10px] text-white">
                  {challenge.quiz_title}
                </strong>
                <small className="mt-1 block truncate text-[8px] text-white/34">
                  {challenge.club_name} · ends {formatEnd(challenge.challenge_ends_at)}
                </small>
              </span>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => void endChallenge(challenge)}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/46 disabled:opacity-35"
              >
                End
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
