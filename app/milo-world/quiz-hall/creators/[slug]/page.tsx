"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;
  creator_profile_image_url: string | null;
  member_count: number;
};

type Reputation = {
  reputation_score: number;
  level_name: string;
  member_count: number;
  unique_players: number;
  repeat_players: number;
  total_plays: number;
  published_challenges: number;
  active_weeks: number;
  audience_score: number;
  participation_score: number;
  return_score: number;
  consistency_score: number;
  calculated_at: string;
};

const LEVELS = [
  { name: "New Creator", min: 0 },
  { name: "Builder", min: 150 },
  { name: "Rising Creator", min: 350 },
  { name: "Established Creator", min: 600 },
  { name: "Leading Creator", min: 850 },
] as const;

export default function PublicCreatorProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(String(params?.slug || ""));

  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [clubs, setClubs] = useState<ClubDirectoryRow[]>([]);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    void load();

    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, [slug]);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);

    if (!accessResult.access.canAccess) {
      setIsLoading(false);
      return;
    }

    const [directoryResponse, reputationResponse, moderationResponse] =
      await Promise.all([
        supabase.rpc("get_creator_club_directory"),
        supabase.rpc("get_creator_reputation_by_slug_v1", {
          p_creator_slug: slug,
        }),
        supabase.rpc("get_creator_public_moderation_v1", {
          p_creator_slug: slug,
        }),
      ]);

    if (directoryResponse.error) {
      setErrorMessage(
        directoryResponse.error.message || "Creator profile could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const moderationRow = Array.isArray(moderationResponse.data)
      ? moderationResponse.data[0]
      : moderationResponse.data;

    if (
      !moderationResponse.error &&
      moderationRow &&
      !Boolean(moderationRow.direct_access_allowed) &&
      !accessResult.access.isAdmin
    ) {
      setClubs([]);
      setReputation(null);
      setErrorMessage("This creator is currently paused.");
      setIsLoading(false);
      return;
    }

    const nextClubs = ((directoryResponse.data || []) as ClubDirectoryRow[])
      .filter(
        (club) =>
          String(club.creator_slug || "").toLowerCase() === slug.toLowerCase(),
      )
      .map((club) => ({
        ...club,
        member_count: Number(club.member_count || 0),
      }));

    setClubs(nextClubs);

    if (!reputationResponse.error) {
      const row = Array.isArray(reputationResponse.data)
        ? reputationResponse.data[0]
        : reputationResponse.data;
      if (row) {
        setReputation({
          reputation_score: Number(row.reputation_score || 0),
          level_name: String(row.level_name || "New Creator"),
          member_count: Number(row.member_count || 0),
          unique_players: Number(row.unique_players || 0),
          repeat_players: Number(row.repeat_players || 0),
          total_plays: Number(row.total_plays || 0),
          published_challenges: Number(row.published_challenges || 0),
          active_weeks: Number(row.active_weeks || 0),
          audience_score: Number(row.audience_score || 0),
          participation_score: Number(row.participation_score || 0),
          return_score: Number(row.return_score || 0),
          consistency_score: Number(row.consistency_score || 0),
          calculated_at: String(row.calculated_at || ""),
        });
      }
    }

    setIsLoading(false);
  }

  const creator = clubs[0] || null;
  const score = reputation?.reputation_score || 0;
  const levelName = reputation?.level_name || "New Creator";
  const nextLevel = LEVELS.find((level) => level.min > score) || null;
  const currentMinimum = useMemo(() => {
    let minimum = 0;
    for (const level of LEVELS) {
      if (score >= level.min) minimum = level.min;
    }
    return minimum;
  }, [score]);
  const progress = nextLevel
    ? Math.max(
        0,
        Math.min(100, ((score - currentMinimum) / (nextLevel.min - currentMinimum)) * 100),
      )
    : 100;

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/52">
        Opening creator profile...
      </main>
    );
  }

  if (hallAccess && !hallAccess.canAccess) {
    return <CreatorClubsLockedScreen />;
  }

  if (!creator) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Creator unavailable</h1>
          <p className="mt-3 text-sm text-white/42">
            {errorMessage ||
              "This creator does not currently have a public Creator Club."}
          </p>
          <Link
            href="/milo-world/quiz-hall/communities"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 no-underline"
          >
            Browse Creator Clubs
          </Link>
        </section>
      </main>
    );
  }

  const ringPercent = Math.max(0, Math.min(100, score / 10));

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.13),transparent_31%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.09),transparent_32%),linear-gradient(180deg,#041124_0%,#020711_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/68 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
            <Link
              href="/milo-world/quiz-hall/communities"
              className="inline-flex min-h-[40px] items-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.09em] text-white/58 no-underline"
            >
              ← Creator Clubs
            </Link>
            <span className="rounded-full border border-violet-200/16 bg-violet-300/[0.06] px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-violet-100">
              Creator Profile
            </span>
          </div>
        </header>

        <section className="creator-profile-scroll mx-auto min-h-0 w-full max-w-[1280px] flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-6">
          {errorMessage && (
            <p className="mb-4 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-4 py-3 text-xs text-red-100">
              {errorMessage}
            </p>
          )}

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <article className="rounded-[30px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-violet-200/16 bg-violet-300/[0.07] text-4xl font-black text-violet-100">
                  {creator.creator_profile_image_url ? (
                    <img
                      src={creator.creator_profile_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    creator.creator_display_name.charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-100/58">
                    {levelName}
                  </p>
                  <h1 className="mt-2 font-serif text-[clamp(42px,6vw,72px)] font-normal leading-[0.94]">
                    {creator.creator_display_name}
                  </h1>
                  <p className="mt-3 text-xs font-bold text-white/34">
                    @{creator.creator_slug}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-4">
                <Metric label="Reputation" value={`${score} REP`} />
                <Metric
                  label="Members"
                  value={(reputation?.member_count || creator.member_count).toLocaleString()}
                />
                <Metric
                  label="Unique Players"
                  value={(reputation?.unique_players || 0).toLocaleString()}
                />
                <Metric
                  label="Challenge Plays"
                  value={(reputation?.total_plays || 0).toLocaleString()}
                />
              </div>
            </article>

            <aside className="rounded-[30px] border border-violet-200/13 bg-[linear-gradient(145deg,rgba(47,30,83,0.40),rgba(4,14,30,0.91))] p-6 text-center backdrop-blur-xl">
              <div
                className="mx-auto grid h-40 w-40 place-items-center rounded-full p-[9px]"
                style={{
                  background: `conic-gradient(rgba(196,181,253,0.92) ${ringPercent}%, rgba(255,255,255,0.07) ${ringPercent}% 100%)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full border border-white/8 bg-[#061126]">
                  <div>
                    <strong className="block text-4xl font-black text-violet-100">
                      {score}
                    </strong>
                    <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.11em] text-white/28">
                      Reputation
                    </span>
                  </div>
                </div>
              </div>
              <h2 className="mt-4 text-2xl font-black text-violet-100">
                {levelName}
              </h2>
              {nextLevel ? (
                <>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full rounded-full bg-violet-200/80"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[8px] text-white/28">
                    {score} / {nextLevel.min} REP to {nextLevel.name}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-[9px] text-amber-100/60">
                  Highest current Creator Level
                </p>
              )}
            </aside>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <article className="rounded-[28px] border border-white/9 bg-white/[0.03] p-5 sm:p-6">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/54">
                Creator Clubs
              </p>
              <h2 className="mt-1 text-2xl font-black">What they are building</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {clubs.map((club) => (
                  <Link
                    key={club.club_id}
                    href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                      club.club_slug,
                    )}`}
                    className="relative min-h-[210px] overflow-hidden rounded-[24px] border border-white/9 bg-black/14 p-5 text-white no-underline transition hover:border-cyan-200/22"
                  >
                    {club.cover_image_url && (
                      <img
                        src={club.cover_image_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-13"
                      />
                    )}
                    <div className="relative z-10 flex h-full flex-col">
                      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/56">
                        {club.topic || "Creator Club"}
                      </p>
                      <h3 className="mt-2 text-2xl font-black">{club.club_name}</h3>
                      <p className="mt-2 line-clamp-3 text-[10px] leading-5 text-white/40">
                        {club.tagline || club.description || "Creator-led challenges and community."}
                      </p>
                      <div className="mt-auto flex items-center justify-between border-t border-white/7 pt-3 text-[9px] text-white/30">
                        <span>{club.member_count.toLocaleString()} members</span>
                        <strong className="text-cyan-100/68">Open Club →</strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </article>

            <aside className="rounded-[28px] border border-violet-200/12 bg-white/[0.03] p-5 sm:p-6">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/54">
                Reputation Breakdown
              </p>
              <h2 className="mt-1 text-2xl font-black">How value is growing</h2>

              <div className="mt-4 space-y-3">
                <Pillar label="Audience" score={reputation?.audience_score || 0} max={250} />
                <Pillar label="Participation" score={reputation?.participation_score || 0} max={300} />
                <Pillar label="Return Value" score={reputation?.return_score || 0} max={250} />
                <Pillar label="Consistency" score={reputation?.consistency_score || 0} max={200} />
              </div>

              <p className="mt-5 text-[9px] leading-5 text-white/28">
                Creator Reputation reflects genuine audience, different players,
                returning players and consistent published work. It is not an
                academic mastery score.
              </p>
            </aside>
          </section>
        </section>
      </div>

      <style jsx>{`
        .creator-profile-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(196, 181, 253, 0.24)
            rgba(255, 255, 255, 0.035);
        }
        .creator-profile-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .creator-profile-scroll::-webkit-scrollbar-thumb {
          background: rgba(196, 181, 253, 0.24);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
      <strong className="block text-lg text-white/82">{value}</strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.1em] text-white/26">
        {label}
      </span>
    </div>
  );
}

function Pillar({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const percent = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[9px]">
        <span className="font-bold text-white/48">{label}</span>
        <strong className="text-violet-100">
          {score}/{max}
        </strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-violet-200/75"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
