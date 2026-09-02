"use client";

import { FormEvent, useEffect, useState } from "react";

type Mode = "off" | "total" | "games";

type Policy = {
  hasPolicy: boolean;
  mode: Mode;
  dailyLimitMinutes: number | null;
  timeZone: string;
  canManage: boolean;
  isOwner: boolean;
  viewerRelationship: string | null;
};

type Status = {
  enabled: boolean;
  mode: Mode;
  dailyLimitMinutes: number | null;
  extraMinutesToday?: number;
  totalUsedSeconds?: number;
  gameUsedSeconds?: number;
  remainingSeconds: number | null;
  isLocked: boolean;
};

const LIMIT_PRESETS = [30, 60, 120, 180];

function formatDuration(seconds = 0) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

export default function ParentalControlsPanel({
  studentUserId,
  studentLabel,
  viewerRole,
}: {
  studentUserId: string | null;
  studentLabel: string;
  viewerRole: string;
}) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<Mode>("off");
  const [limitMinutes, setLimitMinutes] = useState(60);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [extraMinutes, setExtraMinutes] = useState(30);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = viewerRole.trim().toLowerCase() === "admin";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!studentUserId) return;
      setLoading(true);
      setMessage("");

      try {
        const query = new URLSearchParams({ studentUserId });
        const [policyResponse, statusResponse] = await Promise.all([
          fetch(`/api/parental-controls/policy?${query}`, { cache: "no-store" }),
          fetch(`/api/parental-controls/status?${query}`, { cache: "no-store" }),
        ]);
        const policyPayload = await readJson<{ policy: Policy }>(policyResponse);
        const statusPayload = await readJson<{ status: Status }>(statusResponse);
        if (cancelled) return;

        setPolicy(policyPayload.policy);
        setStatus(statusPayload.status);
        setMode(policyPayload.policy.mode);
        setLimitMinutes(policyPayload.policy.dailyLimitMinutes ?? 60);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmation("");
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Controls could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [studentUserId]);

  async function refreshStatus() {
    if (!studentUserId) return;
    const query = new URLSearchParams({ studentUserId });
    const response = await fetch(`/api/parental-controls/status?${query}`, { cache: "no-store" });
    const payload = await readJson<{ status: Status }>(response);
    setStatus(payload.status);
  }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentUserId || !policy?.canManage) return;

    if (!policy.hasPolicy && newPassword !== confirmation) {
      setMessage("The two new parental passwords do not match.");
      return;
    }
    if (newPassword && newPassword !== confirmation) {
      setMessage("The two new parental passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/parental-controls/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUserId,
          mode,
          dailyLimitMinutes: mode === "off" ? null : limitMinutes,
          timeZone: "Asia/Singapore",
          currentPassword: policy.hasPolicy ? currentPassword : null,
          newPassword: newPassword || null,
        }),
      });
      const payload = await readJson<{ policy: Policy }>(response);
      setPolicy(payload.policy);
      setMode(payload.policy.mode);
      setLimitMinutes(payload.policy.dailyLimitMinutes ?? limitMinutes);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      await refreshStatus();
      setMessage("Screen-time controls saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Controls could not be saved.");
    } finally {
      setLoading(false);
    }
  }

  async function requestReset() {
    if (!studentUserId) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/parental-controls/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId }),
      });
      const payload = await readJson<{ message: string }>(response);
      setMessage(payload.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The reset could not be requested.");
    } finally {
      setLoading(false);
    }
  }

  async function grantExtraTime() {
    if (!studentUserId || !policy?.canManage) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/parental-controls/grant-extra-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUserId,
          additionalMinutes: extraMinutes,
          password: currentPassword,
          reason: "Granted from parent dashboard",
        }),
      });
      const payload = await readJson<{ status: Status }>(response);
      setStatus(payload.status);
      setCurrentPassword("");
      setMessage(`${extraMinutes} minutes added for today.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Extra time could not be added.");
    } finally {
      setLoading(false);
    }
  }

  if (!studentUserId) return null;

  return (
    <section className="mt-6 rounded-3xl border border-cyan-300/20 bg-[#08172f]/90 p-5 text-white shadow-xl md:p-7" aria-label="Screen-time controls">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="m-0 text-[10px] font-black tracking-[0.18em] text-cyan-200">PARENT CONTROLS · {studentLabel.toUpperCase()}</p>
          <h2 className="mt-2 text-2xl font-black">Daily screen time</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Count active, foreground use only. Time pauses after two idle minutes and resets at midnight Singapore time.
          </p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-2 text-xs font-black ${status?.isLocked ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"}`}>
          {status?.isLocked ? "LIMIT REACHED" : status?.enabled ? "ACTIVE" : "OFF"}
        </span>
      </div>

      {status && (
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Total today" value={formatDuration(status.totalUsedSeconds)} />
          <Metric label="Games today" value={formatDuration(status.gameUsedSeconds)} />
          <Metric label="Remaining" value={status.remainingSeconds == null ? "Unlimited" : formatDuration(status.remainingSeconds)} />
          <Metric label="Extra today" value={`${status.extraMinutesToday ?? 0}m`} />
        </div>
      )}

      {loading && !policy ? (
        <p className="mt-5 text-sm text-slate-300">Loading controls…</p>
      ) : policy ? (
        policy.canManage ? (
          <form className="mt-6 grid gap-5" onSubmit={savePolicy}>
            <fieldset className="grid gap-2 md:grid-cols-3">
              <legend className="mb-2 text-sm font-black">Daily limit applies to</legend>
              {([
                ["off", "Off", "No daily time limit"],
                ["total", "All Dreamscape", "Lessons, worlds and games"],
                ["games", "Games only", "Rover, Nova Home and future games"],
              ] as const).map(([value, title, detail]) => (
                <label key={value} className={`cursor-pointer rounded-2xl border p-4 ${mode === value ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}>
                  <input className="sr-only" type="radio" name="screen-time-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
                  <strong className="block text-sm">{title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{detail}</span>
                </label>
              ))}
            </fieldset>

            {mode !== "off" && (
              <div>
                <p className="mb-2 text-sm font-black">Daily allowance</p>
                <div className="flex flex-wrap gap-2">
                  {LIMIT_PRESETS.map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setLimitMinutes(minutes)} className={`min-h-10 rounded-full border px-4 text-sm font-bold ${limitMinutes === minutes ? "border-cyan-300/50 bg-cyan-300/15" : "border-white/10 bg-white/[0.03]"}`}>
                      {formatDuration(minutes * 60)}
                    </button>
                  ))}
                  <label className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm">
                    Custom
                    <input type="number" min={15} max={1440} value={limitMinutes} onChange={(event) => setLimitMinutes(Number(event.target.value))} className="w-20 bg-transparent text-right font-bold outline-none" /> min
                  </label>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {policy.hasPolicy && !isAdmin && (
                <label className="text-sm font-bold">
                  Current parental password
                  <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-cyan-300" />
                </label>
              )}
              <label className="text-sm font-bold">
                {policy.hasPolicy ? "New password (optional)" : "Create parental password"}
                <input type="password" autoComplete="new-password" required={!policy.hasPolicy} minLength={6} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-cyan-300" />
              </label>
              {(!policy.hasPolicy || newPassword) && (
                <label className="text-sm font-bold">
                  Confirm new password
                  <input type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-cyan-300" />
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={loading} className="min-h-11 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 font-black disabled:opacity-60">{loading ? "Saving…" : "Save controls"}</button>
              {policy.hasPolicy && (
                <button type="button" disabled={loading} onClick={() => void requestReset()} className="min-h-11 rounded-full border border-white/15 px-5 text-sm font-bold text-slate-200 disabled:opacity-60">Forgot parental password?</button>
              )}
            </div>

            {policy.hasPolicy && status?.enabled && (
              <div className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-4">
                <p className="m-0 text-sm font-black">Add time for today</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[15, 30, 60].map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setExtraMinutes(minutes)} className={`min-h-10 rounded-full border px-4 text-sm font-bold ${extraMinutes === minutes ? "border-violet-300/50 bg-violet-300/15" : "border-white/10"}`}>+{minutes}m</button>
                  ))}
                  <button type="button" disabled={loading || (!isAdmin && !currentPassword)} onClick={() => void grantExtraTime()} className="min-h-10 rounded-full bg-violet-500 px-5 text-sm font-black disabled:opacity-40">Grant extra time</button>
                </div>
              </div>
            )}
          </form>
        ) : (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
            These controls are view-only for this account. Only the controlling parent or guardian can change them. Teachers can review usage but cannot alter limits.
          </p>
        )
      ) : null}

      {message && <p role="status" className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/[0.07] p-3 text-sm text-amber-50">{message}</p>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="m-0 text-[9px] font-black tracking-[0.12em] text-slate-400">{label.toUpperCase()}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}
