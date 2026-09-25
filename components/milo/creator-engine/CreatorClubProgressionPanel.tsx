"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorClubProgressionCard, {
  normalizeClubProgressionPayload,
  type ClubProgressionPayload,
} from "@/components/milo/creator-engine/CreatorClubProgressionCard";

export default function CreatorClubProgressionPanel() {
  const [clubs, setClubs] = useState<ClubProgressionPayload[]>([]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [levelUp, setLevelUp] = useState<ClubProgressionPayload | null>(null);

  const selectedClub = useMemo(
    () => clubs.find((club) => club.club_id === selectedClubId) || clubs[0] || null,
    [clubs, selectedClubId],
  );

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!clubs.length || typeof window === "undefined") return;

    for (const club of clubs) {
      const key = `dreamscape:creator-club-level:${club.club_id}`;
      const stored = Number(window.localStorage.getItem(key) || 0);

      if (stored > 0 && club.level_number > stored && !levelUp) {
        setLevelUp(club);
      }

      window.localStorage.setItem(key, String(club.level_number));
    }
  }, [clubs, levelUp]);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_my_creator_club_progression_v1",
    );

    if (error) {
      setClubs([]);
      setErrorMessage(
        error.message || "Club progression could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const rows = ((data || []) as unknown[])
      .map(normalizeClubProgressionPayload)
      .filter((club): club is ClubProgressionPayload => Boolean(club));

    setClubs(rows);
    setSelectedClubId((current) =>
      current && rows.some((club) => club.club_id === current)
        ? current
        : rows[0]?.club_id || "",
    );
    setIsLoading(false);
  }

  async function refresh() {
    setIsRefreshing(true);
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "refresh_my_creator_club_progression_v1",
    );

    if (error) {
      setErrorMessage(
        error.message || "Club progression could not be refreshed.",
      );
      setIsRefreshing(false);
      return;
    }

    await load();
    setIsRefreshing(false);
  }

  if (isLoading) {
    return (
      <section className="shrink-0 rounded-[26px] border border-cyan-200/12 bg-cyan-300/[0.035] p-5 text-xs text-white/40">
        Loading Club Level...
      </section>
    );
  }

  return (
    <>
      <section className="shrink-0 rounded-[28px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(12,57,78,0.13),rgba(3,13,29,0.92))] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/58">
              Phase 7 · Club Progression
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Grow the community, not just the creator.
            </h2>
            <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/36">
              Club Level combines audience, normal challenge activity, returning players,
              consistency and creation. Club Level is permanent once earned.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void refresh()}
            className="min-h-9 w-fit rounded-full border border-cyan-200/16 bg-cyan-300/[0.05] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 disabled:opacity-35"
          >
            {isRefreshing ? "Refreshing..." : "Refresh Club Level"}
          </button>
        </div>

        {errorMessage && (
          <p className="mt-3 rounded-xl border border-red-200/12 bg-red-400/[0.05] px-3 py-2 text-[9px] text-red-100">
            {errorMessage}
          </p>
        )}

        {clubs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/8 bg-black/14 p-4 text-[10px] text-white/30">
            Create a Creator Club before Club Level progression can begin.
          </p>
        ) : (
          <>
            {clubs.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {clubs.map((club) => (
                  <button
                    key={club.club_id}
                    type="button"
                    onClick={() => setSelectedClubId(club.club_id)}
                    className={`min-h-9 shrink-0 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.08em] ${
                      selectedClub?.club_id === club.club_id
                        ? "border-cyan-200/20 bg-cyan-300/[0.065] text-cyan-100"
                        : "border-white/8 bg-white/[0.025] text-white/30"
                    }`}
                  >
                    {club.club_name}
                  </button>
                ))}
              </div>
            )}

            {selectedClub && (
              <div className="mt-4">
                <CreatorClubProgressionCard
                  progression={selectedClub}
                  showBreakdown
                />
              </div>
            )}
          </>
        )}
      </section>

      {levelUp && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 px-5 backdrop-blur-md">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-amber-200/24 bg-[#071327] p-7 text-center shadow-[0_30px_120px_rgba(0,0,0,0.55)] sm:p-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_48%)]" />
            <div className="relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/68">
                Club Level Up
              </p>
              <h2 className="mt-4 font-serif text-5xl font-normal text-white sm:text-6xl">
                {levelUp.level_name}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/44">
                {levelUp.club_name} reached Level {levelUp.level_number}.
              </p>

              <div className="mx-auto mt-6 max-w-md rounded-[20px] border border-amber-200/12 bg-amber-300/[0.04] p-4 text-left">
                <p className="text-[7px] font-black uppercase tracking-[0.10em] text-amber-100/54">
                  Level Unlocks
                </p>
                <div className="mt-3 grid gap-2">
                  {levelUp.current_unlocks.map((unlock) => (
                    <div
                      key={unlock}
                      className="rounded-xl border border-white/7 bg-black/12 px-3 py-2 text-[9px] text-white/46"
                    >
                      ✓ {unlock}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLevelUp(null)}
                className="mt-6 min-h-11 rounded-full border border-amber-200/22 bg-amber-300/[0.08] px-7 text-[9px] font-black uppercase tracking-[0.10em] text-amber-100"
              >
                Continue Building
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
