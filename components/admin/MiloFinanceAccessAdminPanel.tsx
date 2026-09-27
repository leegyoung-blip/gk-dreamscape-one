"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type FinanceAccessRow = {
  user_id: string;
  email: string | null;
  username: string | null;
  role: string;
  has_access: boolean;
  is_staff: boolean;
  status: string | null;
  source: string | null;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string | null;
};

type FinanceAccessRpcRow = {
  user_id: unknown;
  email: unknown;
  username: unknown;
  role: unknown;
  has_access: unknown;
  is_staff: unknown;
  status: unknown;
  source: unknown;
  starts_at: unknown;
  ends_at: unknown;
  updated_at: unknown;
};

function normaliseRow(row: FinanceAccessRpcRow): FinanceAccessRow {
  return {
    user_id: String(row.user_id),
    email: row.email ? String(row.email) : null,
    username: row.username ? String(row.username) : null,
    role: String(row.role || "regular"),
    has_access: Boolean(row.has_access),
    is_staff: Boolean(row.is_staff),
    status: row.status ? String(row.status) : null,
    source: row.source ? String(row.source) : null,
    starts_at: row.starts_at ? String(row.starts_at) : null,
    ends_at: row.ends_at ? String(row.ends_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function dateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function accessLabel(row: FinanceAccessRow) {
  if (row.is_staff) return "Automatic staff access";
  if (row.has_access) return "Milo Finance active";
  if (row.status === "expired") return "Expired";
  if (row.status === "cancelled") return "Cancelled";
  return "No Milo Finance access";
}

export default function MiloFinanceAccessAdminPanel() {
  const [rows, setRows] = useState<FinanceAccessRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selected = rows.find((row) => row.user_id === selectedUserId) ?? null;

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [row.email, row.username, row.role, row.status, row.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const metrics = useMemo(() => {
    const staff = rows.filter((row) => row.is_staff).length;
    const manualActive = rows.filter((row) => row.has_access && !row.is_staff).length;
    const expiring = rows.filter(
      (row) => row.has_access && !row.is_staff && Boolean(row.ends_at),
    ).length;
    return { staff, manualActive, expiring };
  }, [rows]);

  useEffect(() => {
    void loadDirectory();
  }, []);

  useEffect(() => {
    setExpiryDate(dateInputValue(selected?.ends_at ?? null));
    setMessage("");
    setErrorMessage("");
  }, [selectedUserId]);

  async function loadDirectory(preferredUserId?: string) {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_milo_finance_access_directory",
    );

    if (error) {
      setRows([]);
      setErrorMessage(
        error.message || "Could not load Milo Finance access controls.",
      );
      setIsLoading(false);
      return;
    }

    const nextRows = ((data ?? []) as FinanceAccessRpcRow[]).map(normaliseRow);
    setRows(nextRows);

    const nextId =
      preferredUserId && nextRows.some((row) => row.user_id === preferredUserId)
        ? preferredUserId
        : selectedUserId && nextRows.some((row) => row.user_id === selectedUserId)
          ? selectedUserId
          : nextRows[0]?.user_id ?? null;

    setSelectedUserId(nextId);
    const nextSelected = nextRows.find((row) => row.user_id === nextId);
    setExpiryDate(dateInputValue(nextSelected?.ends_at ?? null));
    setIsLoading(false);
  }

  async function updateAccess(enabled: boolean) {
    if (!selected) return;

    if (selected.is_staff) {
      setErrorMessage(
        "Admin, teacher and curriculum-lead accounts receive Milo Finance automatically through their staff role.",
      );
      return;
    }

    if (!enabled) {
      const confirmed = window.confirm(
        `Revoke Milo Finance access for ${selected.email || selected.username || "this user"}?`,
      );
      if (!confirmed) return;
    }

    let endsAt: string | null = null;
    if (enabled && expiryDate) {
      const parsed = new Date(`${expiryDate}T23:59:59`);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setErrorMessage("Choose a future expiry date, or leave it blank for no expiry.");
        return;
      }
      endsAt = parsed.toISOString();
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_set_milo_finance_access", {
      p_user_id: selected.user_id,
      p_enabled: enabled,
      p_ends_at: endsAt,
    });

    if (error) {
      setErrorMessage(error.message || "Could not update Milo Finance access.");
      setIsSaving(false);
      return;
    }

    setMessage(
      enabled
        ? endsAt
          ? `Milo Finance access granted until ${formatDate(endsAt)}.`
          : "Milo Finance access granted with no expiry."
        : "Milo Finance access revoked.",
    );

    await loadDirectory(selected.user_id);
    setIsSaving(false);
  }

  return (
    <section className="mt-8 w-full max-w-none">
      <div className="grid w-full gap-4 sm:grid-cols-3">
        <MetricCard label="Paid / Manual Access" value={isLoading ? "..." : metrics.manualActive.toLocaleString()} tone="gold" />
        <MetricCard label="Automatic Staff Access" value={isLoading ? "..." : metrics.staff.toLocaleString()} tone="cyan" />
        <MetricCard label="Access With Expiry" value={isLoading ? "..." : metrics.expiring.toLocaleString()} tone="violet" />
      </div>

      {message && (
        <p className="mt-5 rounded-2xl border border-green-200/20 bg-green-400/10 px-5 py-4 text-sm text-green-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
          {errorMessage}
        </p>
      )}

      <section className="mt-6 rounded-[32px] border border-amber-200/18 bg-[linear-gradient(145deg,rgba(86,58,12,.2),rgba(4,20,48,.88))] p-6 shadow-[0_24px_70px_rgba(0,0,0,.26)] backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
              Milo Finance entitlement
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
              Finance access controls
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
              Grant or revoke the standalone Milo Finance entitlement. This is separate from NOVA+ and does not change the user&apos;s main account role.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-200/22 bg-amber-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#ffd18a]">
            Admin only
          </span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)] backdrop-blur-xl xl:sticky xl:top-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">Accounts</p>
              <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">Select user</h3>
            </div>
            <strong className="text-2xl text-[#8dfcff]">{rows.length}</strong>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search email, username or role"
            className={`${inputClass} mt-5`}
          />

          <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/48">Loading access directory...</p>
            ) : filteredRows.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/48">No matching users.</p>
            ) : (
              filteredRows.map((row) => {
                const active = row.user_id === selectedUserId;
                return (
                  <button
                    type="button"
                    key={row.user_id}
                    onClick={() => setSelectedUserId(row.user_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-cyan-200/45 bg-cyan-300/10" : "border-white/10 bg-white/[0.025] hover:border-cyan-200/24"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-white">{row.username || row.email || "User"}</strong>
                        <small className="mt-1 block truncate text-[11px] text-white/42">{row.email || "No email"}</small>
                        <small className="mt-1 block text-[10px] uppercase tracking-[0.08em] text-white/28">{row.role}</small>
                      </span>
                      <AccessBadge row={row} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!selected ? (
            <div className="flex min-h-[340px] items-center justify-center rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-8 text-center text-white/48">
              Select a user to manage Milo Finance access.
            </div>
          ) : (
            <article className="rounded-[32px] border border-amber-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,.26)] backdrop-blur-xl sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">Selected account</p>
                  <h3 className="mt-3 break-words text-3xl font-bold tracking-[-0.04em] text-white">{selected.username || selected.email || "User"}</h3>
                  <p className="mt-2 break-all text-sm text-white/48">{selected.email || "No email"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/32">Role: {selected.role}</p>
                </div>
                <AccessBadge row={selected} large />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Current access" value={selected.has_access ? "Active" : "Inactive"} />
                <InfoCard label="Source" value={selected.is_staff ? "Staff role" : selected.source || "—"} />
                <InfoCard label="Entitlement status" value={selected.is_staff ? "Automatic" : selected.status || "None"} />
                <InfoCard label="Expires" value={selected.is_staff ? "No expiry" : formatDate(selected.ends_at)} />
              </div>

              {selected.is_staff ? (
                <div className="mt-6 rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.06] p-5 text-sm leading-6 text-cyan-50/72">
                  <strong className="text-[#8dfcff]">Automatic staff access.</strong> Admin, teacher and curriculum-lead roles receive Milo Finance automatically. Change the account role if this automatic staff access should no longer apply.
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/18 p-5">
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/42">Optional expiry date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                      onChange={(event) => setExpiryDate(event.target.value)}
                      className={`${inputClass} mt-2 max-w-sm`}
                    />
                    <p className="mt-2 text-xs leading-5 text-white/34">Leave blank for access with no expiry. An expiry is useful for trials, academy cohorts or temporary promotions.</p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void updateAccess(true)}
                      className="min-h-12 rounded-full border border-emerald-200/26 bg-emerald-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isSaving ? "Saving..." : selected.has_access ? "Update Milo Finance Access" : "Grant Milo Finance Access"}
                    </button>

                    {selected.has_access && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void updateAccess(false)}
                        className="min-h-12 rounded-full border border-red-200/24 bg-red-400/10 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                </>
              )}

              <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.025] px-5 py-4 text-xs leading-5 text-white/38">
                Milo Finance unlocks paid Bank learning content and the other features that use the <code className="text-[#ffd18a]">milo_finance</code> entitlement. It does not grant NOVA+ access.
              </div>
            </article>
          )}
        </section>
      </div>
    </section>
  );
}

function AccessBadge({ row, large = false }: { row: FinanceAccessRow; large?: boolean }) {
  const active = row.has_access;
  const className = row.is_staff
    ? "border-cyan-200/20 bg-cyan-300/10 text-[#8dfcff]"
    : active
      ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-200"
      : "border-white/10 bg-white/[0.04] text-white/42";

  return (
    <span className={`shrink-0 rounded-full border font-extrabold uppercase tracking-[0.08em] ${large ? "px-4 py-2 text-[10px]" : "px-2.5 py-1 text-[9px]"} ${className}`}>
      {accessLabel(row)}
    </span>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "gold" | "cyan" | "violet" }) {
  const toneClass = tone === "gold"
    ? "border-amber-200/18 bg-amber-300/[0.06] text-[#ffd18a]"
    : tone === "violet"
      ? "border-violet-200/18 bg-violet-400/[0.06] text-violet-200"
      : "border-cyan-200/18 bg-cyan-400/[0.06] text-[#8dfcff]";

  return (
    <div className={`rounded-3xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,.22)] ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/18 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/32">{label}</p>
      <strong className="mt-2 block text-sm text-white/84">{value}</strong>
    </div>
  );
}

const inputClass =
  "h-12 w-full min-w-0 rounded-2xl border border-cyan-200/16 bg-[#061632]/85 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/45";
