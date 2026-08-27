"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

type ClubDetail = {
  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  featured: boolean;
  creator_slug: string;
  creator_display_name: string;
  creator_profile_image_url: string | null;
  creator_bio: string | null;
  creator_social_links: Record<string, string>;
  member_count: number;
  is_member: boolean;
  joined_at: string | null;
  created_at: string;
};

type QuizCatalogRow = {
  quiz_id: string;
  quiz_slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  total_completed_attempts: number;
  user_attempt_count: number;
  user_best_percent: number;
  user_best_points: number;
  challenge_id: string | null;
  challenge_ends_at: string | null;
  is_current_challenge: boolean;
};

type PackCatalogRow = {
  pack_id: string;
  pack_slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  currency: string;
  price_cents: number;
  item_count: number;
  creator_display_name: string;
  published_at: string | null;
  is_owned: boolean;
  entitlement_source: string | null;
  entitlement_granted_at: string | null;
};

type ClubLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  quizzes_completed: number;
  total_points: number;
  average_percent: number;
  last_completed_at: string | null;
};

type ChallengeLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  score_percent: number;
  total_points: number;
  total_response_time_ms: number;
  completed_at: string | null;
};

type HistoryRow = {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  attempt_number: number;
  correct_count: number;
  score_percent: number;
  total_points: number;
  question_timer_seconds: number;
  completed_at: string | null;
};

function formatEnd(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function money(cents: number | null | undefined) {
  return `S$${(Number(cents || 0) / 100).toFixed(2)}`;
}

export default function CreatorClubPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = decodeURIComponent(String(params?.slug || ""));

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [quizzes, setQuizzes] = useState<QuizCatalogRow[]>([]);
  const [packs, setPacks] = useState<PackCatalogRow[]>([]);
  const [clubLeaderboard, setClubLeaderboard] = useState<ClubLeaderboardRow[]>([]);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState<ChallengeLeaderboardRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [hallAccess, setHallAccess] = useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentChallenge = useMemo(
    () => quizzes.find((quiz) => quiz.is_current_challenge) || null,
    [quizzes],
  );

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    void loadClub();
    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, [slug]);

  async function loadClub() {
    if (!slug) return;
    setIsLoading(true);
    setErrorMessage("");

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);
    if (!accessResult.access.canAccess) {
      setClub(null);
      setIsLoading(false);
      return;
    }

    const userResponse = await supabase.auth.getUser();
    setIsAuthenticated(Boolean(userResponse.data.user));

    const clubResponse = await supabase.rpc("get_creator_club_by_slug", { p_slug: slug });
    if (clubResponse.error) {
      setErrorMessage(clubResponse.error.message || "This Creator Club could not be loaded.");
      setClub(null);
      setIsLoading(false);
      return;
    }

    const raw = Array.isArray(clubResponse.data) ? clubResponse.data[0] : clubResponse.data;
    if (!raw) {
      setClub(null);
      setIsLoading(false);
      return;
    }

    const nextClub: ClubDetail = {
      ...(raw as ClubDetail),
      featured: Boolean(raw.featured),
      member_count: Number(raw.member_count || 0),
      is_member: Boolean(raw.is_member),
      creator_social_links:
        raw.creator_social_links && typeof raw.creator_social_links === "object"
          ? raw.creator_social_links
          : {},
    };
    setClub(nextClub);

    const [quizResponse, packResponse, leaderboardResponse, historyResponse] = await Promise.all([
      supabase.rpc("get_creator_club_quiz_catalog", { p_club_slug: slug }),
      supabase.rpc("get_creator_club_pack_catalog", { p_club_slug: slug }),
      supabase.rpc("get_creator_club_leaderboard", { p_club_id: nextClub.club_id, p_limit: 10 }),
      userResponse.data.user
        ? supabase.rpc("get_my_creator_quiz_history", { p_club_id: nextClub.club_id })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (!quizResponse.error) {
      setQuizzes(((quizResponse.data || []) as QuizCatalogRow[]).map((q) => ({
        ...q,
        total_completed_attempts: Number(q.total_completed_attempts || 0),
        user_attempt_count: Number(q.user_attempt_count || 0),
        user_best_percent: Number(q.user_best_percent || 0),
        user_best_points: Number(q.user_best_points || 0),
        is_current_challenge: Boolean(q.is_current_challenge),
      })));
    } else {
      setQuizzes([]);
      setErrorMessage(quizResponse.error.message || "Could not load creator quizzes.");
    }

    if (!packResponse.error) {
      setPacks(
        ((packResponse.data || []) as PackCatalogRow[]).map((pack) => ({
          ...pack,
          price_cents: Number(pack.price_cents || 0),
          item_count: Number(pack.item_count || 0),
          is_owned: Boolean(pack.is_owned),
        })),
      );
    } else {
      setPacks([]);
      setErrorMessage(
        packResponse.error.message || "Could not load premium quiz packs.",
      );
    }

    setClubLeaderboard(
      leaderboardResponse.error
        ? []
        : ((leaderboardResponse.data || []) as ClubLeaderboardRow[]).map((r) => ({
            ...r,
            rank: Number(r.rank || 0),
            quizzes_completed: Number(r.quizzes_completed || 0),
            total_points: Number(r.total_points || 0),
            average_percent: Number(r.average_percent || 0),
          })),
    );

    setHistory(
      historyResponse.error
        ? []
        : ((historyResponse.data || []) as HistoryRow[]).map((r) => ({
            ...r,
            attempt_number: Number(r.attempt_number || 0),
            correct_count: Number(r.correct_count || 0),
            score_percent: Number(r.score_percent || 0),
            total_points: Number(r.total_points || 0),
            question_timer_seconds: Number(r.question_timer_seconds || 10),
          })),
    );

    setIsLoading(false);
  }

  useEffect(() => {
    async function loadChallengeLeaderboard() {
      if (!currentChallenge?.challenge_id) {
        setChallengeLeaderboard([]);
        return;
      }
      const { data, error } = await supabase.rpc("get_creator_challenge_leaderboard", {
        p_challenge_id: currentChallenge.challenge_id,
        p_limit: 10,
      });
      setChallengeLeaderboard(
        error
          ? []
          : ((data || []) as ChallengeLeaderboardRow[]).map((r) => ({
              ...r,
              rank: Number(r.rank || 0),
              score_percent: Number(r.score_percent || 0),
              total_points: Number(r.total_points || 0),
              total_response_time_ms: Number(r.total_response_time_ms || 0),
            })),
      );
    }
    void loadChallengeLeaderboard();
  }, [currentChallenge?.challenge_id]);

  async function joinClub() {
    if (!club) return;
    if (!isAuthenticated) {
      const next = `/milo-world/quiz-hall/clubs/${encodeURIComponent(club.club_slug)}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");
    const { data, error } = await supabase.rpc("join_creator_club", { p_club_id: club.club_id });
    if (error) {
      setErrorMessage(error.message || "The club could not be joined.");
      setIsSaving(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setMessage(row?.result_code === "already_member" ? "You are already a member." : `You joined ${club.club_name}.`);
    await loadClub();
    setIsSaving(false);
  }

  async function leaveClub() {
    if (!club) return;
    if (!window.confirm(`Leave ${club.club_name}?`)) return;
    setIsSaving(true);
    const { error } = await supabase.rpc("leave_creator_club", { p_club_id: club.club_id });
    if (error) setErrorMessage(error.message || "The club could not be left.");
    else setMessage(`You left ${club.club_name}.`);
    await loadClub();
    setIsSaving(false);
  }

  if (isLoading) {
    return <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/60">Loading Creator Club...</main>;
  }

  if (hallAccess && !hallAccess.canAccess) return <CreatorClubsLockedScreen />;

  if (!club) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.045] p-7 text-center">
          <h1 className="text-3xl font-black">Club unavailable</h1>
          <p className="mt-3 text-sm text-white/48">This Creator Club is not currently public.</p>
          <Link href="/milo-world/quiz-hall/communities" className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline">Browse Creator Clubs</Link>
        </section>
      </main>
    );
  }

  const canPlay = Boolean(hallAccess?.isAdmin || club.is_member);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <img src={club.cover_image_url || "/milo-world/quiz-hall/quiz-hall-bg.png"} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-24" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,17,0.72),rgba(2,7,17,0.96)_44%,rgba(2,7,17,1))]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 p-3 sm:p-5">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3">
            <Link href="/milo-world/quiz-hall/communities" className="inline-flex min-h-[40px] items-center rounded-full border border-white/14 bg-[#041122]/74 px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white no-underline">← Creator Clubs</Link>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <Link
                  href="/milo-world/quiz-hall/library"
                  className="inline-flex min-h-[38px] items-center rounded-full border border-violet-200/16 bg-violet-300/[0.06] px-3 text-[8px] font-black uppercase tracking-[0.09em] text-violet-100 no-underline"
                >
                  My Premium Packs
                </Link>
              )}

              {hallAccess?.isAdmin && !hallAccess.publicAccessEnabled && (
                <span className="rounded-full border border-violet-200/18 bg-violet-400/[0.08] px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-violet-100">
                  Admin Preview · Results Excluded
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="dream-scroll mx-auto min-h-0 w-full max-w-[1320px] flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[28px] border border-white/11 bg-[#061222]/78 p-5 backdrop-blur-xl sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-amber-200/18 bg-amber-300/[0.08] text-2xl font-black text-amber-100">
                  {club.logo_image_url ? <img src={club.logo_image_url} alt="" className="h-full w-full object-cover" /> : club.club_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/64">{club.topic || "Creator Club"} · by {club.creator_display_name}</p>
                  <h1 className="mt-2 font-serif text-[clamp(34px,5vw,58px)] font-normal leading-[0.94]">{club.club_name}</h1>
                  {club.tagline && <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">{club.tagline}</p>}
                </div>
              </div>
              {club.description && <p className="mt-5 border-t border-white/8 pt-5 text-xs leading-6 text-white/46">{club.description}</p>}
            </article>

            <aside className="rounded-[28px] border border-emerald-200/13 bg-[linear-gradient(180deg,rgba(18,76,62,0.18),rgba(4,18,34,0.88))] p-5 backdrop-blur-xl">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100/62">Community</p>
              <strong className="mt-2 block text-4xl text-emerald-100">{club.member_count.toLocaleString()}</strong>
              <span className="text-[10px] text-white/38">active member{club.member_count === 1 ? "" : "s"}</span>
              {message && <p className="mt-3 rounded-xl border border-emerald-200/14 bg-emerald-400/[0.07] px-3 py-2 text-[10px] text-emerald-100">{message}</p>}
              {errorMessage && <p className="mt-3 rounded-xl border border-red-200/14 bg-red-400/[0.07] px-3 py-2 text-[10px] text-red-100">{errorMessage}</p>}
              {hallAccess?.isAdmin ? (
                <div className="mt-4 rounded-xl border border-violet-200/14 bg-violet-400/[0.07] px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.09em] text-violet-100">Admin Preview Access</div>
              ) : club.is_member ? (
                <>
                  <div className="mt-4 rounded-xl border border-emerald-200/14 bg-emerald-400/[0.07] px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.09em] text-emerald-100">You’re a member</div>
                  <button type="button" disabled={isSaving} onClick={() => void leaveClub()} className="mt-2 min-h-10 w-full rounded-full border border-white/10 bg-white/[0.035] text-[8px] font-black uppercase tracking-[0.09em] text-white/42 disabled:opacity-40">Leave Club</button>
                </>
              ) : (
                <button type="button" disabled={isSaving} onClick={() => void joinClub()} className="mt-4 min-h-11 w-full rounded-full border border-emerald-200/22 bg-emerald-400/10 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-40">{isAuthenticated ? "Join Club — Free" : "Log In to Join"}</button>
              )}
            </aside>
          </div>

          {currentChallenge && (
            <section className="mt-4 rounded-[28px] border border-amber-200/18 bg-[linear-gradient(135deg,rgba(104,60,12,0.22),rgba(30,17,4,0.52))] p-5 backdrop-blur-xl sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-amber-100/70">Current 7-Day Challenge</p>
                  <h2 className="mt-2 text-3xl font-black">{currentChallenge.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-white/48">Best attempt wins.{currentChallenge.challenge_ends_at ? ` Ends ${formatEnd(currentChallenge.challenge_ends_at)}.` : ""}</p>
                  <div className="mt-4 flex gap-2">
                    <Badge>Best {currentChallenge.user_best_percent}%</Badge>
                    <Badge>{currentChallenge.user_best_points} pts</Badge>
                  </div>
                  {canPlay ? (
                    <Link href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(club.club_slug)}/quiz/${encodeURIComponent(currentChallenge.quiz_slug)}`} className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-amber-200/24 bg-amber-300/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline">Play Challenge →</Link>
                  ) : (
                    <button type="button" onClick={() => void joinClub()} className="mt-5 min-h-[44px] rounded-full border border-amber-200/20 bg-amber-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100">Join Club to Compete</button>
                  )}
                </div>
                <LeaderboardList title="Challenge Leaders" rows={challengeLeaderboard.map((r) => ({ rank:r.rank,name:r.display_name,primary:`${r.total_points} pts`,secondary:`${r.score_percent}%` }))} emptyText="No challenge scores yet." />
              </div>
            </section>
          )}

          <section className="mt-4 rounded-[28px] border border-violet-200/13 bg-[linear-gradient(135deg,rgba(67,38,104,0.17),rgba(4,17,39,0.82))] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/62">
                  Premium Quiz Packs
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  One-time unlocks
                </h2>
                <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/40">
                  Premium packs bundle creator quizzes into permanent account
                  access. Payments are not live yet; Dreamscape Admin can test
                  ownership during Phase 5.
                </p>
              </div>
              <strong className="text-3xl text-violet-100">{packs.length}</strong>
            </div>

            {packs.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/16 p-5 text-center">
                <h3 className="text-lg font-black">No premium packs yet</h3>
                <p className="mt-2 text-xs text-white/38">
                  Free creator quizzes remain available below.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {packs.map((pack) => (
                  <Link
                    key={pack.pack_id}
                    href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                      club.club_slug,
                    )}/packs/${encodeURIComponent(pack.pack_slug)}`}
                    className="group relative min-h-[190px] overflow-hidden rounded-[22px] border border-violet-200/12 bg-black/16 p-4 text-white no-underline transition hover:-translate-y-0.5 hover:border-violet-200/24"
                  >
                    {pack.cover_image_url && (
                      <>
                        <img
                          src={pack.cover_image_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-14"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,18,0.28),rgba(5,7,18,0.92))]" />
                      </>
                    )}

                    <div className="relative z-10 flex h-full flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/60">
                            {pack.item_count} quiz
                            {pack.item_count === 1 ? "" : "zes"}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-lg font-black leading-6">
                            {pack.title}
                          </h3>
                        </span>

                        {pack.is_owned && (
                          <span className="shrink-0 rounded-full border border-emerald-200/15 bg-emerald-400/[0.07] px-2 py-1 text-[7px] font-black uppercase tracking-[0.07em] text-emerald-100">
                            Owned
                          </span>
                        )}
                      </div>

                      {pack.description && (
                        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/38">
                          {pack.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/7 pt-4">
                        <span>
                          <strong className="block text-xl text-violet-100">
                            {money(pack.price_cents)}
                          </strong>
                          <small className="text-[8px] text-white/28">
                            one-time
                          </small>
                        </span>

                        <span className="rounded-full border border-violet-200/16 bg-violet-300/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-violet-100">
                          {pack.is_owned ? "Open Pack →" : "View Pack →"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
            <article className="rounded-[28px] border border-cyan-200/12 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div><p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/62">Free Creator Quizzes</p><h2 className="mt-2 text-2xl font-black">Play inside the club</h2></div>
                <strong className="text-3xl text-cyan-100">{quizzes.length}</strong>
              </div>
              {quizzes.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/16 p-5 text-center"><h3 className="text-lg font-black">No free quizzes currently available</h3><p className="mt-2 text-xs text-white/40">This club may have premium packs above, or the creator may still be preparing its next free challenge.</p></div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {quizzes.map((quiz) => (
                    <article key={quiz.quiz_id} className={`relative overflow-hidden rounded-[22px] border p-4 ${quiz.is_current_challenge ? "border-amber-200/20 bg-amber-300/[0.045]" : "border-white/9 bg-black/14"}`}>
                      {quiz.cover_image_url && <img src={quiz.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />}
                      <div className="relative z-10">
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/56">10 questions{quiz.is_current_challenge ? " · Challenge" : ""}</p><h3 className="mt-1 line-clamp-2 text-lg font-black leading-6">{quiz.title}</h3></div>
                          {quiz.user_best_percent > 0 && <span className="shrink-0 rounded-full border border-emerald-200/14 bg-emerald-400/[0.07] px-2 py-1 text-[8px] font-black text-emerald-100">{quiz.user_best_percent}%</span>}
                        </div>
                        {quiz.description && <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/40">{quiz.description}</p>}
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/7 pt-3">
                          <span className="text-[8px] text-white/34">{quiz.total_completed_attempts.toLocaleString()} completed</span>
                          {canPlay ? (
                            <Link href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(club.club_slug)}/quiz/${encodeURIComponent(quiz.quiz_slug)}`} className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 no-underline">Play →</Link>
                          ) : (
                            <button type="button" onClick={() => void joinClub()} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/38">Join to Play</button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <LeaderboardList title="Club Leaderboard" rows={clubLeaderboard.map((r) => ({ rank:r.rank,name:r.display_name,primary:`${r.total_points.toLocaleString()} pts`,secondary:`${r.quizzes_completed} quizzes · ${r.average_percent}%` }))} emptyText="Complete a club quiz to start the leaderboard." />
          </section>

          {history.length > 0 && (
            <section className="mt-4 rounded-[28px] border border-violet-200/12 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/60">Your Recent Attempts</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {history.slice(0,6).map((a) => (
                  <div key={a.attempt_id} className="rounded-xl border border-white/8 bg-black/14 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0"><strong className="block truncate text-[10px]">{a.quiz_title}</strong><small className="mt-1 block text-[8px] text-white/30">{formatShortDate(a.completed_at)} · {a.question_timer_seconds}s</small></span>
                      <span className="shrink-0 text-right"><strong className="block text-sm text-violet-100">{a.score_percent}%</strong><small className="text-[8px] text-white/30">{a.total_points} pts</small></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>

      <style jsx>{`.dream-scroll{scrollbar-width:thin;scrollbar-color:rgba(126,232,255,.28) rgba(255,255,255,.04)}.dream-scroll::-webkit-scrollbar{width:7px}.dream-scroll::-webkit-scrollbar-thumb{background:rgba(126,232,255,.28);border-radius:999px}`}</style>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/46">{children}</span>;
}

function LeaderboardList({ title, rows, emptyText }: { title:string; rows:{rank:number;name:string;primary:string;secondary:string}[]; emptyText:string }) {
  return (
    <section className="rounded-[24px] border border-white/9 bg-black/18 p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/36">{title}</p>
      {rows.length === 0 ? <p className="mt-4 text-[10px] leading-5 text-white/34">{emptyText}</p> : (
        <div className="mt-3 space-y-2">
          {rows.slice(0,10).map((row) => (
            <div key={`${row.rank}-${row.name}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2">
              <strong className={`text-sm ${row.rank <= 3 ? "text-amber-100" : "text-white/34"}`}>{row.rank}</strong>
              <span className="min-w-0"><strong className="block truncate text-[10px]">{row.name}</strong><small className="mt-0.5 block truncate text-[8px] text-white/28">{row.secondary}</small></span>
              <strong className="text-[10px] text-cyan-100">{row.primary}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
