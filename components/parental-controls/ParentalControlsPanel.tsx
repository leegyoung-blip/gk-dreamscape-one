"use client";

import { FormEvent, useEffect, useState } from "react";
import ParentPinKeypad from "@/components/parental-controls/ParentPinKeypad";

type Mode = "off" | "total" | "games";
type PinAction = "create" | "confirm-create" | "unlock" | "extra" | null;

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
  const [extraMinutes, setExtraMinutes] = useState(30);
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [verifiedPin, setVerifiedPin] = useState("");
  const [creationPin, setCreationPin] = useState("");
  const [pinAction, setPinAction] = useState<PinAction>(null);
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = viewerRole.trim().toLowerCase() === "admin";
  const canEditSettings = Boolean(
    policy?.canManage
      && (isAdmin || (settingsUnlocked && (policy.hasPolicy ? verifiedPin : creationPin))),
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!studentUserId) return;
      setLoading(true);
      setMessage("");
      setSettingsUnlocked(false);
      setVerifiedPin("");
      setCreationPin("");
      setPinAction(null);

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
        setSettingsUnlocked(
          viewerRole.trim().toLowerCase() === "admin" && policyPayload.policy.hasPolicy,
        );
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Controls could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [studentUserId, viewerRole]);

  function openPin(action: Exclude<PinAction, null>) {
    setPinError("");
    setMessage("");
    setPinAction(action);
  }

  function closePin() {
    if (pinBusy) return;
    if (!policy?.hasPolicy && (pinAction === "create" || pinAction === "confirm-create")) {
      setCreationPin("");
      setSettingsUnlocked(false);
    }
    setPinAction(null);
    setPinError("");
  }

  function requestSettingsUnlock() {
    if (!policy?.canManage || isAdmin) return;
    openPin(policy.hasPolicy ? "unlock" : "create");
  }

  async function refreshStatus() {
    if (!studentUserId) return;
    const query = new URLSearchParams({ studentUserId });
    const response = await fetch(`/api/parental-controls/status?${query}`, {
      cache: "no-store",
    });
    const payload = await readJson<{ status: Status }>(response);
    setStatus(payload.status);
  }

  async function handlePin(pin: string) {
    if (!studentUserId || !policy?.canManage) return;

    if (pinAction === "create") {
      setCreationPin(pin);
      setPinError("");
      setPinAction("confirm-create");
      return;
    }

    if (pinAction === "confirm-create") {
      if (pin !== creationPin) {
        setPinError("The PINs do not match. Enter the same 4 digits again.");
        return;
      }

      setSettingsUnlocked(true);
      setPinAction(null);
      setPinError("");
      setMessage("Parent PIN created. Choose the screen-time settings, then save.");
      return;
    }

    if (pinAction === "extra") {
      await grantExtraTime(pin);
      return;
    }

    if (pinAction !== "unlock") return;

    setPinBusy(true);
    setPinError("");
    try {
      const response = await fetch("/api/parental-controls/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId, password: pin }),
      });
      const payload = await readJson<{
        ok: boolean;
        lockedUntil?: string | null;
        remainingAttempts?: number;
      }>(response);

      if (!payload.ok) {
        setPinError(
          payload.lockedUntil
            ? "Too many incorrect attempts. Try again after the temporary lock expires."
            : `Incorrect PIN. ${payload.remainingAttempts ?? 0} attempts remaining.`,
        );
        return;
      }

      setVerifiedPin(pin);
      setSettingsUnlocked(true);
      setPinAction(null);
      setMessage("Settings unlocked. Changes are not applied until you select Save controls.");
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "The PIN could not be verified.");
    } finally {
      setPinBusy(false);
    }
  }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentUserId || !policy?.canManage) return;

    if (!canEditSettings) {
      requestSettingsUnlock();
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
          currentPassword: policy.hasPolicy && !isAdmin ? verifiedPin : null,
          newPassword: policy.hasPolicy ? null : creationPin,
        }),
      });
      const payload = await readJson<{ policy: Policy }>(response);
      setPolicy(payload.policy);
      setMode(payload.policy.mode);
      setLimitMinutes(payload.policy.dailyLimitMinutes ?? limitMinutes);
      setVerifiedPin("");
      setCreationPin("");
      setSettingsUnlocked(isAdmin);
      await refreshStatus();
      setMessage("Screen-time controls saved and settings locked.");
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

  async function grantExtraTime(pin: string | null = null) {
    if (!studentUserId || !policy?.canManage) return;
    setPinBusy(true);
    setLoading(true);
    setPinError("");
    setMessage("");
    try {
      const response = await fetch("/api/parental-controls/grant-extra-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUserId,
          additionalMinutes: extraMinutes,
          password: isAdmin ? null : pin,
          reason: "Granted from parent dashboard",
        }),
      });
      const payload = await readJson<{ status: Status }>(response);
      setStatus(payload.status);
      setPinAction(null);
      setMessage(`${extraMinutes} minutes added for today.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Extra time could not be added.";
      if (pinAction === "extra") setPinError(errorMessage);
      else setMessage(errorMessage);
    } finally {
      setPinBusy(false);
      setLoading(false);
    }
  }

  function selectMode(nextMode: Mode) {
    if (!canEditSettings) {
      requestSettingsUnlock();
      return;
    }
    setMode(nextMode);
  }

  function selectLimit(minutes: number) {
    if (!canEditSettings) {
      requestSettingsUnlock();
      return;
    }
    setLimitMinutes(minutes);
  }

  if (!studentUserId) return null;

  const keypadTitle =
    pinAction === "create"
      ? "Create a 4-digit parent PIN"
      : pinAction === "confirm-create"
        ? "Confirm the new PIN"
        : pinAction === "extra"
          ? "Enter PIN to add time"
          : "Enter parent PIN";

  const keypadDescription =
    pinAction === "create"
      ? "Choose four digits. This PIN will protect all changes to this learner’s screen-time controls."
      : pinAction === "confirm-create"
        ? "Enter the same four digits again."
        : pinAction === "extra"
          ? `Enter the parent PIN to add ${extraMinutes} minutes today.`
          : "Enter the 4-digit PIN to unlock mode and daily-limit settings.";

  return (
    <section className="mt-6 rounded-3xl border border-cyan-300/20 bg-[#08172f]/90 p-5 text-white shadow-xl md:p-7" aria-label="Screen-time controls">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="m-0 text-[10px] font-black tracking-[0.18em] text-cyan-200">PARENT CONTROLS · {studentLabel.toUpperCase()}</p>
          <h2 className="mt-2 text-2xl font-black">Daily screen time</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Active foreground use only. Time pauses after two idle minutes and resets at midnight Singapore time.
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
            {!isAdmin && (
              <div className={`rounded-2xl border p-4 ${canEditSettings ? "border-emerald-300/25 bg-emerald-300/[0.06]" : "border-violet-300/25 bg-violet-300/[0.06]"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="m-0 text-sm font-black">{canEditSettings ? "Settings unlocked" : policy.hasPolicy ? "Settings locked" : "Create a parent PIN"}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      {canEditSettings
                        ? "You can change the mode and daily allowance until you save or lock the settings."
                        : policy.hasPolicy
                          ? "Enter the 4-digit PIN before changing or switching off any limit."
                          : "A 4-digit PIN is required before screen-time controls can be created."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (canEditSettings) {
                        setSettingsUnlocked(false);
                        setVerifiedPin("");
                        setCreationPin("");
                        setMode(policy.mode);
                        setLimitMinutes(policy.dailyLimitMinutes ?? 60);
                      } else {
                        requestSettingsUnlock();
                      }
                    }}
                    className="min-h-11 shrink-0 rounded-full border border-violet-300/35 bg-violet-300/10 px-5 text-sm font-black text-violet-100"
                  >
                    {canEditSettings ? "Lock settings" : policy.hasPolicy ? "Enter parent PIN" : "Create 4-digit PIN"}
                  </button>
                </div>
              </div>
            )}

            <fieldset className="grid gap-2 md:grid-cols-3">
              <legend className="mb-2 text-sm font-black">Daily limit applies to</legend>
              {([
                ["off", "Off", "No daily time limit"],
                ["total", "All Dreamscape", "Lessons, worlds and games"],
                ["games", "Games only", "Rover, Nova Home and future games"],
              ] as const).map(([value, title, detail]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => selectMode(value)}
                  className={`rounded-2xl border p-4 text-left transition ${mode === value ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"} ${canEditSettings ? "cursor-pointer" : "opacity-65"}`}
                >
                  <strong className="block text-sm">{title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{detail}</span>
                  {!canEditSettings && <span className="mt-2 block text-[10px] font-black text-violet-200">PIN REQUIRED</span>}
                </button>
              ))}
            </fieldset>

            {mode !== "off" && (
              <div>
                <p className="mb-2 text-sm font-black">Daily allowance</p>
                <div className="flex flex-wrap gap-2">
                  {LIMIT_PRESETS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => selectLimit(minutes)}
                      className={`min-h-10 rounded-full border px-4 text-sm font-bold ${limitMinutes === minutes ? "border-cyan-300/50 bg-cyan-300/15" : "border-white/10 bg-white/[0.03]"} ${canEditSettings ? "" : "opacity-65"}`}
                    >
                      {formatDuration(minutes * 60)}
                    </button>
                  ))}
                  {canEditSettings ? (
                    <label className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm">
                      Custom
                      <input type="number" min={15} max={1440} value={limitMinutes} onChange={(event) => setLimitMinutes(Number(event.target.value))} className="w-20 bg-transparent text-right font-bold outline-none" /> min
                    </label>
                  ) : (
                    <button type="button" onClick={requestSettingsUnlock} className="min-h-10 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-bold opacity-65">
                      Custom · PIN required
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={loading || !canEditSettings} className="min-h-11 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 font-black disabled:cursor-not-allowed disabled:opacity-35">
                {loading ? "Saving…" : "Save controls"}
              </button>
              {policy.hasPolicy && (
                <button type="button" disabled={loading} onClick={() => void requestReset()} className="min-h-11 rounded-full border border-white/15 px-5 text-sm font-bold text-slate-200 disabled:opacity-60">
                  Forgot/change password
                </button>
              )}
            </div>

            {policy.hasPolicy && status?.enabled && (
              <div className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-4">
                <p className="m-0 text-sm font-black">Add time for today</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[15, 30, 60].map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setExtraMinutes(minutes)} className={`min-h-10 rounded-full border px-4 text-sm font-bold ${extraMinutes === minutes ? "border-violet-300/50 bg-violet-300/15" : "border-white/10"}`}>+{minutes}m</button>
                  ))}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (isAdmin) void grantExtraTime(null);
                      else if (verifiedPin && settingsUnlocked) void grantExtraTime(verifiedPin);
                      else openPin("extra");
                    }}
                    className="min-h-10 rounded-full bg-violet-500 px-5 text-sm font-black disabled:opacity-40"
                  >
                    Grant extra time
                  </button>
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

      <ParentPinKeypad
        key={pinAction ?? "closed"}
        open={pinAction !== null}
        title={keypadTitle}
        description={keypadDescription}
        submitLabel={pinAction === "confirm-create" ? "Confirm PIN" : pinAction === "extra" ? "Add time" : "Continue"}
        error={pinError}
        busy={pinBusy}
        onClose={closePin}
        onSubmit={handlePin}
      />
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
