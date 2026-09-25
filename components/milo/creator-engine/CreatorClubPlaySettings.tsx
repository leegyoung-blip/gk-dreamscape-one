"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ClubSetting = {
  club_id: string;
  club_slug: string;
  club_name: string;
  member_count: number;
  unlock_threshold: number;
  size_eligible: boolean;
  member_hosting_enabled: boolean;
  status: string;
};

export default function CreatorClubPlaySettings() {
  const [clubs, setClubs] = useState<ClubSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingClubId, setSavingClubId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_get_play_room_settings_v2",
    );

    if (error) {
      setClubs([]);
      setErrorMessage(
        error.message || "Club Play Room settings could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    setClubs(
      ((data || []) as ClubSetting[]).map((club) => ({
        ...club,
        member_count: Number(club.member_count || 0),
        unlock_threshold: Number(club.unlock_threshold || 100),
        size_eligible: Boolean(club.size_eligible),
        member_hosting_enabled: Boolean(club.member_hosting_enabled),
      })),
    );

    setIsLoading(false);
  }

  async function toggle(club: ClubSetting) {
    setSavingClubId(club.club_id);
    setMessage("");
    setErrorMessage("");

    const next = !club.member_hosting_enabled;

    const { error } = await supabase.rpc(
      "creator_set_play_room_hosting_v2",
      {
        p_club_id: club.club_id,
        p_enabled: next,
      },
    );

    if (error) {
      setErrorMessage(
        error.message || "Club Play Room setting could not be saved.",
      );
      setSavingClubId("");
      return;
    }

    setMessage(
      next
        ? `${club.club_name}: member-hosted Play Rooms enabled.`
        : `${club.club_name}: member-hosted Play Rooms disabled.`,
    );
    await load();
    setSavingClubId("");
  }

  if (isLoading) {
    return (
      <section className="shrink-0 rounded-[26px] border border-fuchsia-200/12 bg-fuchsia-300/[0.035] p-5 text-xs text-white/40">
        Loading Club Play Room settings...
      </section>
    );
  }

  return (
    <section className="shrink-0 rounded-[26px] border border-fuchsia-200/12 bg-[linear-gradient(145deg,rgba(83,26,85,0.13),rgba(3,13,29,0.90))] p-4 sm:p-5">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-fuchsia-100/58">
        Phase 6 · Club Play Rooms
      </p>
      <h2 className="mt-1 text-2xl font-black">
        Let your community host its own games.
      </h2>
      <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/38">
        Play Rooms unlock at 100 club members. Reaching the milestone unlocks
        the capability; the creator still decides whether member hosting is
        enabled.
      </p>

      {(message || errorMessage) && (
        <div className="mt-3">
          {message && (
            <p className="rounded-xl border border-emerald-200/14 bg-emerald-400/[0.055] px-3 py-2 text-[9px] text-emerald-100">
              {message}
            </p>
          )}
          {errorMessage && (
            <p className="rounded-xl border border-red-200/14 bg-red-400/[0.055] px-3 py-2 text-[9px] text-red-100">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {clubs.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/8 bg-black/14 p-4 text-[10px] text-white/32">
          Create your first Creator Club before configuring Play Rooms.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {clubs.map((club) => {
            const progress = Math.max(
              0,
              Math.min(
                100,
                (club.member_count / Math.max(1, club.unlock_threshold)) * 100,
              ),
            );

            return (
              <article
                key={club.club_id}
                className="rounded-[20px] border border-white/8 bg-black/14 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[7px] font-black uppercase tracking-[0.11em] text-white/28">
                      {club.size_eligible
                        ? "100-member milestone reached"
                        : "Play Rooms locked"}
                    </p>
                    <h3 className="mt-1 truncate text-lg font-black">
                      {club.club_name}
                    </h3>
                    <p className="mt-1 text-[9px] text-white/30">
                      {club.member_count.toLocaleString()} /{" "}
                      {club.unlock_threshold.toLocaleString()} members
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !club.size_eligible ||
                      savingClubId === club.club_id
                    }
                    onClick={() => void toggle(club)}
                    className={`min-h-10 shrink-0 rounded-full border px-5 text-[8px] font-black uppercase tracking-[0.09em] disabled:cursor-not-allowed disabled:opacity-35 ${
                      club.member_hosting_enabled
                        ? "border-emerald-200/20 bg-emerald-400/[0.07] text-emerald-100"
                        : "border-fuchsia-200/18 bg-fuchsia-300/[0.055] text-fuchsia-100"
                    }`}
                  >
                    {savingClubId === club.club_id
                      ? "Saving..."
                      : club.member_hosting_enabled
                        ? "Hosting Enabled"
                        : "Enable Member Hosting"}
                  </button>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-fuchsia-200/70"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-3 text-[8px] leading-4 text-white/26">
                  Internal room activity is excluded from Creator Reputation
                  and Creator Reward DT. Members can earn up to 60 Club XP per
                  day from completed room rounds.
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
