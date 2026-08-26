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

export default function CreatorClubPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = decodeURIComponent(String(params?.slug || ""));

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    void loadClub();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [slug]);

  async function loadClub() {
    if (!slug) return;

    setIsLoading(true);

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);

    if (!accessResult.access.canAccess) {
      setClub(null);
      setIsLoading(false);
      return;
    }

    const [userResponse, clubResponse] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("get_creator_club_by_slug", {
        p_slug: slug,
      }),
    ]);

    setIsAuthenticated(Boolean(userResponse.data.user));

    if (clubResponse.error) {
      setClub(null);
      setErrorMessage(
        clubResponse.error.message || "This Creator Club could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const row = Array.isArray(clubResponse.data)
      ? clubResponse.data[0]
      : clubResponse.data;

    if (!row) {
      setClub(null);
      setIsLoading(false);
      return;
    }

    setClub({
      ...(row as ClubDetail),
      featured: Boolean(row.featured),
      member_count: Number(row.member_count || 0),
      is_member: Boolean(row.is_member),
      creator_social_links:
        row.creator_social_links &&
        typeof row.creator_social_links === "object"
          ? row.creator_social_links
          : {},
    });
    setIsLoading(false);
  }

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
        ? "You are already a member of this club."
        : `You joined ${club.club_name}.`,
    );

    await loadClub();
    setIsSaving(false);
  }

  async function leaveClub() {
    if (!club) return;

    const confirmed = window.confirm(
      `Leave ${club.club_name}? You can join again later unless your membership is restricted.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("leave_creator_club", {
      p_club_id: club.club_id,
    });

    if (error) {
      setErrorMessage(error.message || "The club could not be left.");
      setIsSaving(false);
      return;
    }

    setMessage(`You left ${club.club_name}.`);
    await loadClub();
    setIsSaving(false);
  }

  const socialEntries = useMemo(
    () =>
      club
        ? Object.entries(club.creator_social_links || {}).filter(
            ([, value]) => Boolean(String(value || "").trim()),
          )
        : [],
    [club],
  );

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/60">
        Loading Creator Club...
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
          <p className="mt-3 text-sm leading-6 text-white/48">
            This Creator Club is not currently public.
          </p>
          {errorMessage && (
            <p className="mt-4 text-xs text-red-200">{errorMessage}</p>
          )}
          <Link
            href="/milo-world/quiz-hall/communities"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline"
          >
            Browse Creator Clubs
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <img
        src={
          club.cover_image_url ||
          "/milo-world/quiz-hall/quiz-hall-bg.png"
        }
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,17,0.58)_0%,rgba(2,7,17,0.88)_42%,rgba(2,7,17,0.99)_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 p-3 sm:p-5">
          <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-3">
            <Link
              href="/milo-world/quiz-hall/communities"
              className="inline-flex min-h-[40px] items-center rounded-full border border-white/14 bg-[#041122]/74 px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white no-underline backdrop-blur-xl"
            >
              ← Creator Clubs
            </Link>

            <Link
              href="/milo-world/categories"
              className="hidden min-h-[40px] items-center rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline sm:inline-flex"
            >
              Categories Hub
            </Link>
          </div>
        </header>

        <section className="dream-club-detail-scroll mx-auto min-h-0 w-full max-w-[1160px] flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
            <article className="rounded-[30px] border border-white/12 bg-[#061222]/82 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-amber-200/20 bg-amber-300/[0.08] text-3xl font-black text-amber-100">
                  {club.logo_image_url ? (
                    <img
                      src={club.logo_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    club.club_name.charAt(0).toUpperCase()
                  )}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-200/18 bg-amber-300/[0.07] px-3 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-amber-100">
                      {club.topic || "Creator Club"}
                    </span>
                    {club.featured && (
                      <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-cyan-100">
                        Featured
                      </span>
                    )}
                  </div>

                  <h1 className="mt-3 font-serif text-[clamp(38px,5vw,64px)] font-normal leading-[0.94]">
                    {club.club_name}
                  </h1>

                  {club.tagline && (
                    <p className="mt-4 max-w-2xl text-base leading-7 text-white/66">
                      {club.tagline}
                    </p>
                  )}
                </div>
              </div>

              {club.description && (
                <div className="mt-7 border-t border-white/9 pt-6">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/32">
                    About this club
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/58">
                    {club.description}
                  </p>
                </div>
              )}

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <section className="rounded-[22px] border border-violet-200/12 bg-violet-400/[0.045] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/64">
                    Club quizzes
                  </p>
                  <h2 className="mt-2 text-xl font-black">No quizzes published yet</h2>
                  <p className="mt-3 text-xs leading-5 text-white/45">
                    Creator quizzes will appear here once the club owner begins
                    publishing challenges.
                  </p>
                </section>

                <section className="rounded-[22px] border border-cyan-200/12 bg-cyan-300/[0.045] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/64">
                    Competition
                  </p>
                  <h2 className="mt-2 text-xl font-black">Leaderboard awaits</h2>
                  <p className="mt-3 text-xs leading-5 text-white/45">
                    Club rankings will populate from competitive quiz results
                    as quizzes go live.
                  </p>
                </section>
              </div>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-4">
              <section className="rounded-[26px] border border-emerald-200/14 bg-[linear-gradient(180deg,rgba(18,76,62,0.20),rgba(4,18,34,0.90))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/68">
                  Community
                </p>
                <strong className="mt-2 block text-4xl text-emerald-100">
                  {club.member_count.toLocaleString()}
                </strong>
                <span className="text-xs text-white/42">
                  active member{club.member_count === 1 ? "" : "s"}
                </span>

                {message && (
                  <p className="mt-4 rounded-2xl border border-emerald-200/14 bg-emerald-400/[0.07] px-4 py-3 text-xs leading-5 text-emerald-100">
                    {message}
                  </p>
                )}

                {errorMessage && (
                  <p className="mt-4 rounded-2xl border border-red-200/14 bg-red-400/[0.07] px-4 py-3 text-xs leading-5 text-red-100">
                    {errorMessage}
                  </p>
                )}

                {club.is_member ? (
                  <>
                    <div className="mt-5 rounded-2xl border border-emerald-200/16 bg-emerald-400/[0.08] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
                      You’re a member
                    </div>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void leaveClub()}
                      className="mt-3 min-h-11 w-full rounded-full border border-white/12 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/55 transition hover:text-white disabled:opacity-40"
                    >
                      Leave Club
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void joinClub()}
                    className="mt-5 min-h-12 w-full rounded-full border border-emerald-200/24 bg-emerald-400/12 px-5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-400/18 disabled:opacity-40"
                  >
                    {isSaving
                      ? "Joining..."
                      : isAuthenticated
                        ? "Join Club — Free"
                        : "Log In to Join"}
                  </button>
                )}

                <p className="mt-3 text-center text-[9px] leading-4 text-white/28">
                  Creator Clubs are part of Milo’s World and membership is
                  available to users aged 13+.
                </p>
              </section>

              <section className="rounded-[26px] border border-amber-200/14 bg-white/[0.045] p-5 backdrop-blur-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-100/64">
                  Club creator
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/16 bg-amber-300/[0.07] text-lg font-black text-amber-100">
                    {club.creator_profile_image_url ? (
                      <img
                        src={club.creator_profile_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      club.creator_display_name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-white">
                      {club.creator_display_name}
                    </strong>
                    <span className="mt-1 block text-[9px] text-white/32">
                      @{club.creator_slug}
                    </span>
                  </div>
                </div>

                {club.creator_bio && (
                  <p className="mt-4 text-xs leading-5 text-white/45">
                    {club.creator_bio}
                  </p>
                )}

                {socialEntries.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {socialEntries.map(([platform, value]) => (
                      <span
                        key={platform}
                        title={String(value)}
                        className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/46"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </section>
      </div>

      <style jsx>{`
        .dream-club-detail-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.28)
            rgba(255, 255, 255, 0.04);
        }

        .dream-club-detail-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .dream-club-detail-scroll::-webkit-scrollbar-thumb {
          background: rgba(126, 232, 255, 0.28);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}
