"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OfficialClubAdminRow = {
  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  official_badge_image_url: string | null;
  owner_label: string;
  is_published: boolean;
  sort_order: number;
  member_count: number;
  creator_rewards_enabled: boolean;
  creator_reputation_enabled: boolean;
};

export default function CreatorOfficialClubsAdminPanel({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<OfficialClubAdminRow[]>([]);
  const [open, setOpen] = useState(false);
  const [savingSlug, setSavingSlug] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function load() {
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_creator_official_clubs_v1",
    );

    if (error) {
      setRows([]);
      setErrorMessage(
        error.message || "Official Creator Clubs could not be loaded.",
      );
      return;
    }

    setRows(
      ((data || []) as OfficialClubAdminRow[]).map((row) => ({
        ...row,
        club_id: String(row.club_id),
        club_slug: String(row.club_slug),
        club_name: String(row.club_name),
        owner_label: String(row.owner_label || "Dreamscape"),
        is_published: Boolean(row.is_published),
        sort_order: Number(row.sort_order || 0),
        member_count: Number(row.member_count || 0),
        creator_rewards_enabled: Boolean(row.creator_rewards_enabled),
        creator_reputation_enabled: Boolean(row.creator_reputation_enabled),
      })),
    );
  }

  function updateLocal(
    slug: string,
    patch: Partial<OfficialClubAdminRow>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.club_slug === slug ? { ...row, ...patch } : row,
      ),
    );
  }

  async function save(row: OfficialClubAdminRow) {
    setSavingSlug(row.club_slug);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_update_creator_official_club_v1",
      {
        p_club_slug: row.club_slug,
        p_tagline: row.tagline || "",
        p_description: row.description || "",
        p_is_published: row.is_published,
      },
    );

    if (error) {
      setErrorMessage(
        error.message || "Official Creator Club could not be updated.",
      );
      setSavingSlug("");
      return;
    }

    setMessage(`${row.club_name} updated.`);
    await load();
    onChanged?.();
    setSavingSlug("");
  }

  return (
    <section className="rounded-[24px] border border-amber-200/12 bg-[linear-gradient(145deg,rgba(72,43,10,0.16),rgba(4,14,30,0.90))] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/58">
            Admin · Dreamscape Originals
          </p>
          <h3 className="mt-1 text-lg font-black">
            Official Creator Clubs
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="min-h-9 rounded-full border border-amber-200/16 bg-amber-300/[0.055] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100"
        >
          {open ? "Close" : "Manage Official Clubs"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {(message || errorMessage) && (
            <div className="mb-3">
              {message && (
                <p className="rounded-xl border border-emerald-200/12 bg-emerald-400/[0.05] px-3 py-2 text-[9px] text-emerald-100">
                  {message}
                </p>
              )}
              {errorMessage && (
                <p className="rounded-xl border border-red-200/12 bg-red-400/[0.05] px-3 py-2 text-[9px] text-red-100">
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3">
            {rows.map((row) => (
              <article
                key={row.club_id}
                className="rounded-[20px] border border-white/8 bg-black/14 p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                  <div className="flex min-w-[220px] items-center gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                      {row.logo_image_url ? (
                        <img
                          src={row.logo_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        row.club_name.charAt(0)
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[7px] font-black uppercase tracking-[0.09em] text-white/28">
                        {row.topic || "Official Club"}
                      </p>
                      <strong className="mt-1 block truncate text-sm">
                        {row.club_name}
                      </strong>
                      <small className="mt-1 block text-[8px] text-white/26">
                        {row.member_count.toLocaleString()} genuine members
                      </small>
                    </div>
                  </div>

                  <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                    <label>
                      <span className={labelClass}>Tagline</span>
                      <input
                        value={row.tagline || ""}
                        onChange={(event) =>
                          updateLocal(row.club_slug, {
                            tagline: event.target.value,
                          })
                        }
                        maxLength={160}
                        className={inputClass}
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className={labelClass}>Description</span>
                      <textarea
                        value={row.description || ""}
                        onChange={(event) =>
                          updateLocal(row.club_slug, {
                            description: event.target.value,
                          })
                        }
                        rows={3}
                        maxLength={600}
                        className={textareaClass}
                      />
                    </label>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 xl:w-[190px]">
                    <label className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3">
                      <span className="text-[8px] font-black uppercase tracking-[0.07em] text-white/38">
                        Published
                      </span>
                      <input
                        type="checkbox"
                        checked={row.is_published}
                        onChange={(event) =>
                          updateLocal(row.club_slug, {
                            is_published: event.target.checked,
                          })
                        }
                      />
                    </label>

                    <button
                      type="button"
                      disabled={savingSlug === row.club_slug}
                      onClick={() => void save(row)}
                      className="min-h-10 rounded-xl border border-cyan-200/16 bg-cyan-300/[0.055] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 disabled:opacity-35"
                    >
                      {savingSlug === row.club_slug ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                <p className="mt-3 border-t border-white/7 pt-3 text-[8px] leading-4 text-white/24">
                  Creator REP and Creator Reward DT are permanently disabled for
                  Dreamscape-owned clubs.
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const labelClass =
  "mb-1.5 block text-[7px] font-black uppercase tracking-[0.08em] text-white/28";

const inputClass =
  "h-10 w-full rounded-xl border border-white/9 bg-[#07152d] px-3 text-[10px] text-white outline-none focus:border-cyan-200/24";

const textareaClass =
  "w-full resize-y rounded-xl border border-white/9 bg-[#07152d] px-3 py-2.5 text-[10px] leading-5 text-white outline-none focus:border-cyan-200/24";
