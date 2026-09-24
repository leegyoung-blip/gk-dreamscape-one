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

type ClubTab = "home" | "challenges" | "rankings" | "about";

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

export default function CreatorClubPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = decodeURIComponent(String(params?.slug || ""));

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [quizzes, setQuizzes] = useState<QuizCatalogRow[]>([]);
  const [clubLeaderboard, setClubLeaderboard] = useState<ClubLeaderboardRow[]>([]);
  const [challengeLeaderboard, setChallengeLeaderboard] =
    useState<ChallengeLeaderboardRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState<ClubTab>("home");

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

    const clubResponse = await supabase.rpc("get_creator_club_by_slug", {
      p_slug: slug,
    });

    if (clubResponse.error) {
      setErrorMessage(
        clubResponse.error.message || "This Creator Club could not be loaded.",
      );
      setClub(null);
      setIsLoading(false);
      return;
    }

    const raw = Array.isArray(clubResponse.data)
      ? clubResponse.data[0]
      : clubResponse.data;

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
    };

    setClub(nextClub);

    const [quizResponse, leaderboardResponse, historyResponse] = await Promise.all([
      supabase.rpc("get_creator_club_quiz_catalog", { p_club_slug: slug }),
      supabase.rpc("get_creator_club_leaderboard", {
        p_club_id: nextClub.club_id,
        p_limit: 10,
      }),
      userResponse.data.user
        ? supabase.rpc("get_my_creator_quiz_history", {
            p_club_id: nextClub.club_id,
          })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (quizResponse.error) {
      setQuizzes([]);
      setErrorMessage(
        quizResponse.error.message || "Could not load creator challenges.",
      );
    } else {
      setQuizzes(
        ((quizResponse.data || []) as QuizCatalogRow[]).map((quiz) => ({
          ...quiz,
          total_completed_attempts: Number(quiz.total_completed_attempts || 0),
          user_attempt_count: Number(quiz.user_attempt_count || 0),
          user_best_percent: Number(quiz.user_best_percent || 0),
          user_best_points: Number(quiz.user_best_points || 0),
          is_current_challenge: Boolean(quiz.is_current_challenge),
        })),
      );
    }

    setClubLeaderboard(
      leaderboardResponse.error
        ? []
        : ((leaderboardResponse.data || []) as ClubLeaderboardRow[]).map((row) => ({
            ...row,
            rank: Number(row.rank || 0),
            quizzes_completed: Number(row.quizzes_completed || 0),
            total_points: Number(row.total_points || 0),
            average_percent: Number(row.average_percent || 0),
          })),
    );

    setHistory(
      historyResponse.error
        ? []
        : ((historyResponse.data || []) as HistoryRow[]).map((row) => ({
            ...row,
            attempt_number: Number(row.attempt_number || 0),
            correct_count: Number(row.correct_count || 0),
            score_percent: Number(row.score_percent || 0),
            total_points: Number(row.total_points || 0),
            question_timer_seconds: Number(row.question_timer_seconds || 10),
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

      const { data, error } = await supabase.rpc(
        "get_creator_challenge_leaderboard",
        {
          p_challenge_id: currentChallenge.challenge_id,
          p_limit: 10,
        },
      );

      setChallengeLeaderboard(
        error
          ? []
          : ((data || []) as ChallengeLeaderboardRow[]).map((row) => ({
              ...row,
              rank: Number(row.rank || 0),
              score_percent: Number(row.score_percent || 0),
              total_points: Number(row.total_points || 0),
              total_response_time_ms: Number(row.total_response_time_ms || 0),
            })),
      );
    }

    void loadChallengeLeaderboard();
  }, [currentChallenge?.challenge_id]);

  async function joinClub() {
    if (!club) return;

    if (!isAuthenticated) {
      const next = `/milo-world/quiz-hall/clubs/${encodeURIComponent(
        club.club_slug,
      )}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("join_creator_club", {
      p_club_id: club.club_id,
    });

    if (error) {
      setErrorMessage(error.message || "The club could not be joined.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setMessage(
      row?.result_code === "already_member"
        ? "You are already a member."
        : `You joined ${club.club_name}.`,
    );
    await loadClub();
    setIsSaving(false);
  }

  async function leaveClub() {
    if (!club) return;
    if (!window.confirm(`Leave ${club.club_name}?`)) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("leave_creator_club", {
      p_club_id: club.club_id,
    });

    if (error) {
      setErrorMessage(error.message || "The club could not be left.");
    } else {
      setMessage(`You left ${club.club_name}.`);
    }

    await loadClub();
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/56">
        Opening Creator Club...
      </main>
    );
  }

  if (hallAccess && !hallAccess.canAccess) {
    return <CreatorClubsLockedScreen />;
  }

  if (!club) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.045] p-7 text-center">
          <h1 className="text-3xl font-black">Club unavailable</h1>
          <p className="mt-3 text-sm text-white/48">
            This Creator Club is not currently public.
          </p>
          <Link
            href="/milo-world/quiz-hall/communities"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline"
          >
            Browse Creator Clubs
          </Link>
          {errorMessage && (
            <p className="mt-4 text-[10px] leading-5 text-red-100/70">
              {errorMessage}
            </p>
          )}
        </section>
      </main>
    );
  }

  const canPlay = Boolean(hallAccess?.isAdmin || club.is_member);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <img
        src={club.cover_image_url || "/milo-world/quiz-hall/quiz-hall-bg.png"}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.20]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(251,191,36,0.10),transparent_28%),linear-gradient(180deg,rgba(2,7,17,0.80),rgba(2,7,17,0.97)_44%,#020711)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/68 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/milo-world/quiz-hall/communities"
                className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-white/12 bg-white/[0.035] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/60 no-underline"
              >
                ← Creator Clubs
              </Link>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.15em] text-amber-100/58">
                  {club.topic || "Creator Club"}
                </p>
                <strong className="block truncate text-sm text-white/76">
                  {club.club_name}
                </strong>
              </div>
            </div>

            {hallAccess?.isAdmin && !hallAccess.publicAccessEnabled && (
              <span className="rounded-full border border-violet-200/18 bg-violet-400/[0.08] px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-violet-100">
                Admin Preview
              </span>
            )}
          </div>
        </header>

        <section className="club-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 sm:pt-5">
          <div className="mx-auto w-full max-w-[1380px]">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
              <article className="relative overflow-hidden rounded-[30px] border border-white/11 bg-[#061222]/82 p-6 shadow-[0_26px_80px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-amber-200/18 bg-amber-300/[0.08] text-2xl font-black text-amber-100">
                    {club.logo_image_url ? (
                      <img src={club.logo_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      club.club_name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/64">
                      {club.topic || "Creator Club"} · by {club.creator_display_name}
                    </p>
                    <h1 className="mt-2 font-serif text-[clamp(38px,5vw,64px)] font-normal leading-[0.94]">
                      {club.club_name}
                    </h1>
                    {club.tagline && (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/56">
                        {club.tagline}
                      </p>
                    )}
                  </div>
                </div>
              </article>

              <aside className="rounded-[30px] border border-emerald-200/13 bg-[linear-gradient(180deg,rgba(18,76,62,0.18),rgba(4,18,34,0.90))] p-5 backdrop-blur-xl">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100/62">
                  Community
                </p>
                <strong className="mt-2 block text-4xl text-emerald-100">
                  {club.member_count.toLocaleString()}
                </strong>
                <span className="text-[10px] text-white/38">
                  member{club.member_count === 1 ? "" : "s"}
                </span>

                {message && (
                  <p className="mt-3 rounded-xl border border-emerald-200/14 bg-emerald-400/[0.07] px-3 py-2 text-[10px] text-emerald-100">
                    {message}
                  </p>
                )}
                {errorMessage && (
                  <p className="mt-3 rounded-xl border border-red-200/14 bg-red-400/[0.07] px-3 py-2 text-[10px] text-red-100">
                    {errorMessage}
                  </p>
                )}

                {hallAccess?.isAdmin ? (
                  <div className="mt-4 rounded-xl border border-violet-200/14 bg-violet-400/[0.07] px-3 py-3 text-center text-[9px] font-black uppercase tracking-[0.09em] text-violet-100">
                    Admin Preview Access
                  </div>
                ) : club.is_member ? (
                  <>
                    <div className="mt-4 rounded-xl border border-emerald-200/14 bg-emerald-400/[0.07] px-3 py-3 text-center text-[9px] font-black uppercase tracking-[0.09em] text-emerald-100">
                      You’re a member
                    </div>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void leaveClub()}
                      className="mt-2 min-h-10 w-full rounded-full border border-white/10 bg-white/[0.035] text-[8px] font-black uppercase tracking-[0.09em] text-white/42 disabled:opacity-40"
                    >
                      Leave Club
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void joinClub()}
                    className="mt-4 min-h-11 w-full rounded-full border border-emerald-200/22 bg-emerald-400/10 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-40"
                  >
                    {isAuthenticated ? "Join Club — Free" : "Log In to Join"}
                  </button>
                )}
              </aside>
            </section>

            <nav className="mt-4 flex gap-2 overflow-x-auto rounded-[22px] border border-white/8 bg-white/[0.025] p-2 backdrop-blur-xl">
              <ClubTabButton active={tab === "home"} onClick={() => setTab("home")}>Home</ClubTabButton>
              <ClubTabButton active={tab === "challenges"} onClick={() => setTab("challenges")}>Challenges</ClubTabButton>
              <ClubTabButton active={tab === "rankings"} onClick={() => setTab("rankings")}>Rankings</ClubTabButton>
              <ClubTabButton active={tab === "about"} onClick={() => setTab("about")}>About</ClubTabButton>
            </nav>

            <div className="mt-4">
              {tab === "home" && (
                <HomeTab
                  club={club}
                  quizzes={quizzes}
                  currentChallenge={currentChallenge}
                  challengeLeaderboard={challengeLeaderboard}
                  clubLeaderboard={clubLeaderboard}
                  canPlay={canPlay}
                  onJoin={() => void joinClub()}
                />
              )}

              {tab === "challenges" && (
                <ChallengesTab
                  club={club}
                  quizzes={quizzes}
                  canPlay={canPlay}
                  onJoin={() => void joinClub()}
                />
              )}

              {tab === "rankings" && (
                <RankingsTab
                  currentChallenge={currentChallenge}
                  challengeLeaderboard={challengeLeaderboard}
                  clubLeaderboard={clubLeaderboard}
                  history={history}
                />
              )}

              {tab === "about" && <AboutTab club={club} />}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .club-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.24) rgba(255, 255, 255, 0.035);
        }
        .club-scroll::-webkit-scrollbar { width: 7px; }
        .club-scroll::-webkit-scrollbar-thumb {
          background: rgba(126, 232, 255, 0.24);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function HomeTab({
  club,
  quizzes,
  currentChallenge,
  challengeLeaderboard,
  clubLeaderboard,
  canPlay,
  onJoin,
}: {
  club: ClubDetail;
  quizzes: QuizCatalogRow[];
  currentChallenge: QuizCatalogRow | null;
  challengeLeaderboard: ChallengeLeaderboardRow[];
  clubLeaderboard: ClubLeaderboardRow[];
  canPlay: boolean;
  onJoin: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
      <div className="space-y-4">
        {currentChallenge ? (
          <section className="rounded-[28px] border border-amber-200/18 bg-[linear-gradient(135deg,rgba(104,60,12,0.22),rgba(30,17,4,0.48))] p-5 backdrop-blur-xl sm:p-6">
            <p className="text-[8px] font-black uppercase tracking-[0.17em] text-amber-100/70">
              Current Club Challenge
            </p>
            <h2 className="mt-2 text-3xl font-black">{currentChallenge.title}</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-white/46">
              Best attempt wins.
              {currentChallenge.challenge_ends_at
                ? ` Ends ${formatEnd(currentChallenge.challenge_ends_at)}.`
                : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>Best {currentChallenge.user_best_percent}%</Badge>
              <Badge>{currentChallenge.user_best_points} pts</Badge>
              <Badge>{currentChallenge.total_completed_attempts.toLocaleString()} completions</Badge>
            </div>
            {canPlay ? (
              <Link
                href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                  club.club_slug,
                )}/quiz/${encodeURIComponent(currentChallenge.quiz_slug)}`}
                className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-amber-200/24 bg-amber-300/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline"
              >
                Play Challenge →
              </Link>
            ) : (
              <button
                type="button"
                onClick={onJoin}
                className="mt-5 min-h-[44px] rounded-full border border-amber-200/20 bg-amber-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100"
              >
                Join Club to Compete
              </button>
            )}
          </section>
        ) : (
          <section className="rounded-[28px] border border-white/9 bg-white/[0.03] p-6 text-center">
            <h2 className="text-2xl font-black">No featured challenge right now.</h2>
            <p className="mt-2 text-xs text-white/38">Browse the club’s challenges below.</p>
          </section>
        )}

        <section className="rounded-[28px] border border-cyan-200/12 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/58">Challenges</p>
              <h2 className="mt-1 text-2xl font-black">Play inside the club</h2>
            </div>
            <strong className="text-3xl text-cyan-100">{quizzes.length}</strong>
          </div>
          {quizzes.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-white/8 bg-black/14 p-5 text-center text-xs text-white/38">
              This creator is still preparing the club’s first challenge.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {quizzes.slice(0, 4).map((quiz) => (
                <QuizCard
                  key={quiz.quiz_id}
                  clubSlug={club.club_slug}
                  quiz={quiz}
                  canPlay={canPlay}
                  onJoin={onJoin}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <SnapshotCard club={club} quizzes={quizzes} />
        {currentChallenge && (
          <LeaderboardPanel
            title="Challenge Leaders"
            rows={challengeLeaderboard.map((row) => ({
              rank: row.rank,
              name: row.display_name,
              primary: `${row.total_points} pts`,
              secondary: `${row.score_percent}%`,
            }))}
            emptyText="No challenge scores yet."
          />
        )}
        <LeaderboardPanel
          title="Club Leaders"
          rows={clubLeaderboard.slice(0, 5).map((row) => ({
            rank: row.rank,
            name: row.display_name,
            primary: `${row.total_points.toLocaleString()} pts`,
            secondary: `${row.quizzes_completed} challenges · ${row.average_percent}%`,
          }))}
          emptyText="Complete a club challenge to start the leaderboard."
        />
      </div>
    </div>
  );
}

function ChallengesTab({
  club,
  quizzes,
  canPlay,
  onJoin,
}: {
  club: ClubDetail;
  quizzes: QuizCatalogRow[];
  canPlay: boolean;
  onJoin: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-cyan-200/12 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/58">Club Challenges</p>
          <h2 className="mt-1 text-3xl font-black">Everything you can play</h2>
        </div>
        <strong className="text-3xl text-cyan-100">{quizzes.length}</strong>
      </div>

      {quizzes.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-white/8 bg-black/14 p-8 text-center">
          <h3 className="text-xl font-black">No challenges published yet.</h3>
          <p className="mt-2 text-xs text-white/38">Check back when the creator publishes the first one.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.quiz_id}
              clubSlug={club.club_slug}
              quiz={quiz}
              canPlay={canPlay}
              onJoin={onJoin}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RankingsTab({
  currentChallenge,
  challengeLeaderboard,
  clubLeaderboard,
  history,
}: {
  currentChallenge: QuizCatalogRow | null;
  challengeLeaderboard: ChallengeLeaderboardRow[];
  clubLeaderboard: ClubLeaderboardRow[];
  history: HistoryRow[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {currentChallenge && (
        <LeaderboardPanel
          title={`${currentChallenge.title} · Challenge Leaders`}
          rows={challengeLeaderboard.map((row) => ({
            rank: row.rank,
            name: row.display_name,
            primary: `${row.total_points} pts`,
            secondary: `${row.score_percent}%`,
          }))}
          emptyText="No challenge scores yet."
        />
      )}

      <LeaderboardPanel
        title="Club Leaderboard"
        rows={clubLeaderboard.map((row) => ({
          rank: row.rank,
          name: row.display_name,
          primary: `${row.total_points.toLocaleString()} pts`,
          secondary: `${row.quizzes_completed} challenges · ${row.average_percent}%`,
        }))}
        emptyText="Complete a club challenge to start the leaderboard."
      />

      {history.length > 0 && (
        <section className="rounded-[28px] border border-violet-200/12 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6 xl:col-span-2">
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/60">Your Recent Attempts</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {history.slice(0, 9).map((attempt) => (
              <div key={attempt.attempt_id} className="rounded-2xl border border-white/8 bg-black/14 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block truncate text-[10px]">{attempt.quiz_title}</strong>
                    <small className="mt-1 block text-[8px] text-white/30">
                      {formatShortDate(attempt.completed_at)} · attempt {attempt.attempt_number}
                    </small>
                  </span>
                  <span className="shrink-0 text-right">
                    <strong className="block text-sm text-violet-100">{attempt.score_percent}%</strong>
                    <small className="text-[8px] text-white/30">{attempt.total_points} pts</small>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AboutTab({ club }: { club: ClubDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[28px] border border-white/9 bg-white/[0.035] p-6 backdrop-blur-xl sm:p-7">
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/34">About the Club</p>
        <h2 className="mt-2 text-3xl font-black">{club.club_name}</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/50">
          {club.description || club.tagline || "This creator has not added a full club description yet."}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InfoBox label="Topic" value={club.topic || "Creator Club"} />
          <InfoBox label="Members" value={club.member_count.toLocaleString()} />
          <InfoBox label="Started" value={formatShortDate(club.created_at)} />
        </div>
      </section>

      <aside className="rounded-[28px] border border-amber-200/13 bg-[linear-gradient(180deg,rgba(85,47,8,0.16),rgba(4,15,30,0.9))] p-5 backdrop-blur-xl">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/58">Creator</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/16 bg-amber-300/[0.07] text-xl font-black text-amber-100">
            {club.creator_profile_image_url ? (
              <img src={club.creator_profile_image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              club.creator_display_name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-lg">{club.creator_display_name}</strong>
            <span className="mt-1 block text-[9px] text-white/30">Club creator</span>
          </div>
        </div>
        {club.creator_bio && (
          <p className="mt-4 whitespace-pre-line text-xs leading-6 text-white/42">{club.creator_bio}</p>
        )}
      </aside>
    </div>
  );
}

function QuizCard({
  clubSlug,
  quiz,
  canPlay,
  onJoin,
}: {
  clubSlug: string;
  quiz: QuizCatalogRow;
  canPlay: boolean;
  onJoin: () => void;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[22px] border p-4 ${
        quiz.is_current_challenge
          ? "border-amber-200/20 bg-amber-300/[0.045]"
          : "border-white/9 bg-black/14"
      }`}
    >
      {quiz.cover_image_url && (
        <img src={quiz.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />
      )}
      <div className="relative z-10 flex min-h-[170px] flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/56">
              10 questions{quiz.is_current_challenge ? " · Challenge" : ""}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-black leading-6">{quiz.title}</h3>
          </div>
          {quiz.user_best_percent > 0 && (
            <span className="shrink-0 rounded-full border border-emerald-200/14 bg-emerald-400/[0.07] px-2 py-1 text-[8px] font-black text-emerald-100">
              {quiz.user_best_percent}%
            </span>
          )}
        </div>

        {quiz.description && (
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/40">{quiz.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/7 pt-3">
          <span className="text-[8px] text-white/34">
            {quiz.total_completed_attempts.toLocaleString()} completed
          </span>
          {canPlay ? (
            <Link
              href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                clubSlug,
              )}/quiz/${encodeURIComponent(quiz.quiz_slug)}`}
              className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 no-underline"
            >
              Play →
            </Link>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/38"
            >
              Join to Play
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SnapshotCard({ club, quizzes }: { club: ClubDetail; quizzes: QuizCatalogRow[] }) {
  return (
    <section className="rounded-[24px] border border-white/9 bg-black/18 p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/36">Club Snapshot</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoBox label="Members" value={club.member_count.toLocaleString()} />
        <InfoBox label="Challenges" value={String(quizzes.length)} />
      </div>
    </section>
  );
}

function LeaderboardPanel({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: { rank: number; name: string; primary: string; secondary: string }[];
  emptyText: string;
}) {
  return (
    <section className="rounded-[24px] border border-white/9 bg-black/18 p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/36">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-[10px] leading-5 text-white/34">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.slice(0, 10).map((row) => (
            <div
              key={`${row.rank}-${row.name}`}
              className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2"
            >
              <strong className={`text-sm ${row.rank <= 3 ? "text-amber-100" : "text-white/34"}`}>
                {row.rank}
              </strong>
              <span className="min-w-0">
                <strong className="block truncate text-[10px]">{row.name}</strong>
                <small className="mt-0.5 block truncate text-[8px] text-white/28">{row.secondary}</small>
              </span>
              <strong className="text-[10px] text-cyan-100">{row.primary}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ClubTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-amber-200/22 bg-amber-300/[0.08] text-amber-100"
          : "border-transparent bg-transparent text-white/36 hover:text-white/68"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/46">
      {children}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/14 px-3 py-3">
      <strong className="block text-sm text-white">{value}</strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.08em] text-white/26">
        {label}
      </span>
    </div>
  );
}
