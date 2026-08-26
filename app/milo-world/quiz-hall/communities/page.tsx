"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

type ClubDirectoryRow = {
  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  featured: boolean;
  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;
  creator_profile_image_url: string | null;
  member_count: number;
  is_member: boolean;
  joined_at: string | null;
};

type FilterMode = "all" | "featured" | "joined";

type MyCreatorAccess = {
  creator_partner_id: string;
  display_name: string;
  slug: string;
  status: string;
};

export default function CreatorClubsPage() {
  const [clubs, setClubs] = useState<ClubDirectoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [myCreatorAccess, setMyCreatorAccess] = useState<MyCreatorAccess | null>(null);
  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    void loadPage();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  async function loadPage() {
    setIsLoading(true);
    setMessage("");

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);

    if (!accessResult.access.canAccess) {
      setClubs([]);
      setMyCreatorAccess(null);
      setIsLoading(false);
      return;
    }

    const userResponse = await supabase.auth.getUser();
    const currentUser = userResponse.data.user;
    setIsAuthenticated(Boolean(currentUser));

    const [clubsResponse, creatorResponse] = await Promise.all([
      supabase.rpc("get_creator_club_directory"),
      currentUser
        ? supabase.rpc("get_my_creator_partner")
        : Promise.resolve({ data: null, error: null }),
    ]);

    const creatorRow = Array.isArray(creatorResponse.data)
      ? creatorResponse.data[0]
      : creatorResponse.data;

    setMyCreatorAccess(
      creatorRow && creatorRow.status === "active"
        ? (creatorRow as MyCreatorAccess)
        : null,
    );

    if (clubsResponse.error) {
      setClubs([]);
      setMessage(
        clubsResponse.error.message || "Creator Clubs could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    setClubs(
      ((clubsResponse.data || []) as ClubDirectoryRow[]).map((club) => ({
        ...club,
        featured: Boolean(club.featured),
        member_count: Number(club.member_count || 0),
        is_member: Boolean(club.is_member),
      })),
    );
    setIsLoading(false);
  }

  const filteredClubs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return clubs.filter((club) => {
      if (filterMode === "featured" && !club.featured) return false;
      if (filterMode === "joined" && !club.is_member) return false;

      if (!term) return true;

      return [
        club.club_name,
        club.topic,
        club.tagline,
        club.description,
        club.creator_display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [clubs, filterMode, search]);

  if (!isLoading && hallAccess && !hallAccess.canAccess) {
    return <CreatorClubsLockedScreen />;
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <img
        src="/milo-world/quiz-hall/quiz-hall-bg.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-left opacity-25"
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,7,17,0.98)_0%,rgba(2,7,17,0.94)_55%,rgba(2,7,17,0.84)_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 px-4 pb-3 pt-3 sm:px-6 sm:pt-5">
          <div className="mx-auto flex max-w-[1280px] items-start justify-between gap-3">
            <div>
              <Link
                href="/milo-world/quiz-hall"
                className="inline-flex min-h-[40px] items-center rounded-full border border-cyan-200/22 bg-[#041122]/80 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-white no-underline backdrop-blur-xl"
              >
                ← Quiz Hall
              </Link>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#ffd18a]">
                Milo’s Quiz Hall
              </p>
              <h1 className="mt-1 font-serif text-[clamp(38px,5vw,68px)] font-normal leading-[0.94]">
                Creator Clubs
              </h1>
              <p className="mt-3 max-w-2xl text-xs leading-5 text-white/52 sm:text-sm sm:leading-6">
                Join free communities built around the topics you enjoy.
                Creator quizzes, competitions and premium packs will live
                inside these clubs as they are published.
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {myCreatorAccess && (
                <Link
                  href="/milo-world/quiz-hall/creator-studio"
                  className="inline-flex min-h-[42px] items-center rounded-full border border-amber-200/22 bg-amber-300/[0.08] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline"
                >
                  Creator Studio
                </Link>
              )}

              <Link
                href="/milo-world/categories"
                className="inline-flex min-h-[42px] items-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline"
              >
                Categories Hub →
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-[1280px] shrink-0 flex-col gap-3 px-4 pb-3 sm:flex-row sm:items-center sm:px-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clubs, creators or topics..."
            className="h-11 min-w-0 flex-1 rounded-full border border-white/12 bg-white/[0.05] px-5 text-xs text-white outline-none placeholder:text-white/30 focus:border-cyan-200/34"
          />

          <div className="flex gap-2 overflow-x-auto">
            <FilterButton
              active={filterMode === "all"}
              onClick={() => setFilterMode("all")}
            >
              All Clubs
            </FilterButton>
            <FilterButton
              active={filterMode === "featured"}
              onClick={() => setFilterMode("featured")}
            >
              Featured
            </FilterButton>
            {isAuthenticated && (
              <FilterButton
                active={filterMode === "joined"}
                onClick={() => setFilterMode("joined")}
              >
                My Clubs
              </FilterButton>
            )}
          </div>
        </section>

        {myCreatorAccess && (
          <div className="mx-auto mb-3 w-full max-w-[1280px] shrink-0 px-4 sm:hidden">
            <Link
              href="/milo-world/quiz-hall/creator-studio"
              className="flex min-h-[42px] w-full items-center justify-center rounded-full border border-amber-200/22 bg-amber-300/[0.08] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline"
            >
              Open Creator Studio
            </Link>
          </div>
        )}

        {message && (
          <p className="mx-auto mb-3 w-[calc(100%-32px)] max-w-[1248px] shrink-0 rounded-2xl border border-red-200/16 bg-red-400/[0.07] px-4 py-3 text-xs text-red-100 sm:w-[calc(100%-48px)]">
            {message}
          </p>
        )}

        <section className="dream-club-scroll mx-auto min-h-0 w-full max-w-[1280px] flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-[270px] animate-pulse rounded-[26px] border border-white/8 bg-white/[0.035]"
                />
              ))}
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center backdrop-blur-xl">
              <div className="max-w-lg">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/18 bg-amber-300/[0.07] text-2xl text-amber-100">
                  ◎
                </div>
                <h2 className="mt-5 text-2xl font-black">
                  {clubs.length === 0
                    ? "The first Creator Clubs are being prepared."
                    : "No clubs match this view."}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/48">
                  {clubs.length === 0
                    ? "As creator partners open their communities, they will appear here automatically."
                    : "Try another search or filter."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredClubs.map((club) => (
                <Link
                  key={club.club_id}
                  href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                    club.club_slug,
                  )}`}
                  className="group relative min-h-[270px] overflow-hidden rounded-[26px] border border-white/11 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-5 text-white no-underline shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200/28"
                >
                  {club.cover_image_url && (
                    <>
                      <img
                        src={club.cover_image_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-20 transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,24,0.38),rgba(3,10,24,0.94))]" />
                    </>
                  )}

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/18 bg-amber-300/[0.08] text-lg font-black text-amber-100">
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
                          <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-amber-100/70">
                            {club.topic || "Creator Club"}
                          </p>
                          <h2 className="mt-1 line-clamp-2 text-xl font-black leading-6">
                            {club.club_name}
                          </h2>
                        </div>
                      </div>

                      {club.featured && (
                        <span className="rounded-full border border-amber-200/18 bg-amber-300/[0.08] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-amber-100">
                          Featured
                        </span>
                      )}
                    </div>

                    <p className="mt-4 line-clamp-2 text-xs leading-5 text-white/52">
                      {club.tagline ||
                        club.description ||
                        "A creator-led quiz community inside Milo’s Quiz Hall."}
                    </p>

                    <div className="mt-auto pt-6">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-[10px] font-black">
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
                        <span className="min-w-0 truncate text-[10px] font-bold text-white/58">
                          by {club.creator_display_name}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                        <span className="text-[10px] font-bold text-white/40">
                          {club.member_count.toLocaleString()} member
                          {club.member_count === 1 ? "" : "s"}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] ${
                            club.is_member
                              ? "border-emerald-200/20 bg-emerald-400/10 text-emerald-100"
                              : "border-cyan-200/18 bg-cyan-300/[0.07] text-cyan-100"
                          }`}
                        >
                          {club.is_member ? "Joined" : "View Club →"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .dream-club-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.28)
            rgba(255, 255, 255, 0.04);
        }

        .dream-club-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .dream-club-scroll::-webkit-scrollbar-thumb {
          background: rgba(126, 232, 255, 0.28);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function FilterButton({
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
      className={`h-11 shrink-0 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-cyan-200/28 bg-cyan-300/10 text-cyan-100"
          : "border-white/10 bg-white/[0.035] text-white/42 hover:text-white/72"
      }`}
    >
      {children}
    </button>
  );
}
