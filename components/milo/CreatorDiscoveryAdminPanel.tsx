"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminRow = {
  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;
  reputation_score: number;
  moderation_penalty: number;
  moderation_status: "good" | "limited" | "paused";
  creator_discovery_enabled: boolean;
  creator_note: string | null;

  club_id: string;
  club_slug: string;
  club_name: string;
  club_discovery_enabled: boolean;
  dreamscape_pick: boolean;
  club_note: string | null;
  updated_at: string | null;
};

type DraftRow = AdminRow & {
  isSaving?: boolean;
  message?: string;
};

export default function CreatorDiscoveryAdminPanel({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open && rows.length === 0) {
      void load();
    }
  }, [open]);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_creator_discovery_overview_v1",
    );

    if (error) {
      setErrorMessage(error.message || "Could not load discovery controls.");
      setRows([]);
      setIsLoading(false);
      return;
    }

    setRows(
      ((data || []) as AdminRow[]).map((row) => ({
        ...row,
        reputation_score: Number(row.reputation_score || 0),
        moderation_penalty: Number(row.moderation_penalty || 0),
        creator_discovery_enabled: Boolean(row.creator_discovery_enabled),
        club_discovery_enabled: Boolean(row.club_discovery_enabled),
        dreamscape_pick: Boolean(row.dreamscape_pick),
      })),
    );
    setIsLoading(false);
  }

  function patch(
    creatorPartnerId: string,
    clubId: string,
    patchValue: Partial<DraftRow>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.creator_partner_id === creatorPartnerId && row.club_id === clubId
          ? { ...row, ...patchValue }
          : row,
      ),
    );
  }

  async function save(row: DraftRow) {
    patch(row.creator_partner_id, row.club_id, {
      isSaving: true,
      message: "",
    });
    setErrorMessage("");

    const [creatorResponse, clubResponse] = await Promise.all([
      supabase.rpc("admin_update_creator_discovery_v1", {
        p_creator_partner_id: row.creator_partner_id,
        p_moderation_status: row.moderation_status,
        p_discovery_enabled: row.creator_discovery_enabled,
        p_reputation_penalty: Math.max(
          0,
          Math.min(500, Number(row.moderation_penalty || 0)),
        ),
        p_note: row.creator_note?.trim() || null,
      }),
      supabase.rpc("admin_update_club_discovery_v1", {
        p_club_id: row.club_id,
        p_discovery_enabled: row.club_discovery_enabled,
        p_dreamscape_pick: row.dreamscape_pick,
        p_note: row.club_note?.trim() || null,
      }),
    ]);

    const error = creatorResponse.error || clubResponse.error;

    if (error) {
      patch(row.creator_partner_id, row.club_id, {
        isSaving: false,
        message: error.message || "Could not update discovery controls.",
      });
      return;
    }

    patch(row.creator_partner_id, row.club_id, {
      isSaving: false,
      message: "Saved",
    });

    await load();
    onChanged?.();
  }

  const counts = useMemo(
    () => ({
      picks: rows.filter((row) => row.dreamscape_pick).length,
      suppressed: rows.filter(
        (row) =>
          !row.club_discovery_enabled || !row.creator_discovery_enabled,
      ).length,
      paused: rows.filter((row) => row.moderation_status === "paused").length,
    }),
    [rows],
  );

  return (
    <section className="rounded-[24px] border border-violet-200/14 bg-violet-400/[0.045] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left sm:px-5"
      >
        <span>
          <span className="block text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/58">
            Admin · Discovery Controls
          </span>
          <strong className="mt-1 block text-sm text-white/78">
            Feature, suppress or moderate Creator Clubs
          </strong>
        </span>
        <span className="text-xs font-black text-violet-100">
          {open ? "Hide ↑" : "Manage ↓"}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/8 p-4 sm:p-5">
          {errorMessage && (
            <p className="mb-3 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
              {errorMessage}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <AdminMetric label="Dreamscape Picks" value={counts.picks} />
            <AdminMetric label="Suppressed" value={counts.suppressed} />
            <AdminMetric label="Paused" value={counts.paused} />
          </div>

          {isLoading ? (
            <p className="mt-4 text-xs text-white/38">
              Loading creator discovery controls...
            </p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-xs text-white/38">
              No public Creator Clubs are available to moderate yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {rows.map((row) => (
                <article
                  key={`${row.creator_partner_id}-${row.club_id}`}
                  className="rounded-[20px] border border-white/9 bg-black/16 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/58">
                        {row.creator_display_name} · {row.reputation_score} REP
                      </p>
                      <h3 className="mt-1 truncate text-lg font-black">
                        {row.club_name}
                      </h3>
                      <p className="mt-1 text-[9px] text-white/28">
                        @{row.creator_slug} · /{row.club_slug}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={row.isSaving}
                      onClick={() => void save(row)}
                      className="min-h-9 shrink-0 rounded-full border border-violet-200/20 bg-violet-300/[0.08] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-violet-100 disabled:opacity-35"
                    >
                      {row.isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>

                  {row.message && (
                    <p
                      className={`mt-2 text-[9px] ${
                        row.message === "Saved"
                          ? "text-emerald-100/70"
                          : "text-red-100/80"
                      }`}
                    >
                      {row.message}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <AdminField label="Creator status">
                      <select
                        value={row.moderation_status}
                        onChange={(event) =>
                          patch(row.creator_partner_id, row.club_id, {
                            moderation_status: event.target
                              .value as DraftRow["moderation_status"],
                          })
                        }
                        className={inputClass}
                      >
                        <option value="good">Good</option>
                        <option value="limited">Limited discovery</option>
                        <option value="paused">Paused</option>
                      </select>
                    </AdminField>

                    <AdminField label="REP moderation penalty">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={row.moderation_penalty}
                        onChange={(event) =>
                          patch(row.creator_partner_id, row.club_id, {
                            moderation_penalty: Number(event.target.value || 0),
                          })
                        }
                        className={inputClass}
                      />
                    </AdminField>

                    <Toggle
                      label="Creator in discovery"
                      checked={row.creator_discovery_enabled}
                      onChange={(checked) =>
                        patch(row.creator_partner_id, row.club_id, {
                          creator_discovery_enabled: checked,
                        })
                      }
                    />

                    <Toggle
                      label="Club in discovery"
                      checked={row.club_discovery_enabled}
                      onChange={(checked) =>
                        patch(row.creator_partner_id, row.club_id, {
                          club_discovery_enabled: checked,
                        })
                      }
                    />

                    <Toggle
                      label="Dreamscape Pick"
                      checked={row.dreamscape_pick}
                      onChange={(checked) =>
                        patch(row.creator_partner_id, row.club_id, {
                          dreamscape_pick: checked,
                        })
                      }
                    />

                    <AdminField label="Creator moderation note" span>
                      <input
                        value={row.creator_note || ""}
                        onChange={(event) =>
                          patch(row.creator_partner_id, row.club_id, {
                            creator_note: event.target.value,
                          })
                        }
                        placeholder="Internal only"
                        className={inputClass}
                      />
                    </AdminField>

                    <AdminField label="Club moderation note" span>
                      <input
                        value={row.club_note || ""}
                        onChange={(event) =>
                          patch(row.creator_partner_id, row.club_id, {
                            club_note: event.target.value,
                          })
                        }
                        placeholder="Internal only"
                        className={inputClass}
                      />
                    </AdminField>
                  </div>

                  <p className="mt-3 text-[8px] leading-4 text-white/24">
                    Suppressed = hidden from Discover but direct links still
                    work. Paused = hidden from Discover and public direct
                    creator/club access is blocked. Admin preview remains
                    available.
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3">
      <span className="text-[9px] font-bold text-white/48">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function AdminField({
  label,
  span = false,
  children,
}: {
  label: string;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={span ? "xl:col-span-2" : ""}>
      <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.1em] text-white/28">
        {label}
      </span>
      {children}
    </label>
  );
}

function AdminMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/14 px-3 py-3">
      <strong className="block text-lg text-violet-100">{value}</strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.09em] text-white/26">
        {label}
      </span>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-[#07152d] px-3 text-[10px] text-white outline-none focus:border-violet-200/28";
