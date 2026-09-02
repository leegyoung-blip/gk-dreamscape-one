"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function ResetParentalControlPasswordPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(resetToken);
    if (resetToken) {
      window.history.replaceState({}, "", "/parental-controls/reset-password");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setMessage("This reset link is invalid or incomplete.");
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 72) {
      setMessage("Use a parental password containing 6 to 72 characters.");
      return;
    }

    if (newPassword !== confirmation) {
      setMessage("The two passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/parental-controls/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setMessage(result.error || "The reset could not be completed.");
        return;
      }

      setIsComplete(true);
      setNewPassword("");
      setConfirmation("");
    } catch {
      setMessage("The reset service could not be reached. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#030816] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#08172f] shadow-2xl shadow-black/40">
        <div className="bg-gradient-to-br from-cyan-950 to-violet-950 px-7 py-8">
          <p className="m-0 text-xs font-black tracking-[0.18em] text-cyan-200">
            DREAMSCAPE ONE · PARENT CONTROLS
          </p>
          <h1 className="mt-3 text-3xl font-black">
            Reset parental password
          </h1>
        </div>

        <div className="px-7 py-8">
          {isComplete ? (
            <div>
              <p className="text-lg font-bold text-emerald-300">
                Your parental password has been reset.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Your normal Dreamscape account password was not changed.
              </p>
              <Link
                href="/login?next=/learning-missions/progress-rewards"
                className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 font-black text-white"
              >
                Return to parent dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="m-0 text-sm leading-6 text-slate-300">
                Choose a new password for screen-time controls. This is separate
                from your Dreamscape account password.
              </p>

              <label className="mt-6 block text-sm font-bold" htmlFor="new-password">
                New parental password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={72}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-cyan-300"
              />

              <label className="mt-5 block text-sm font-bold" htmlFor="confirm-password">
                Confirm parental password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={72}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 outline-none focus:border-cyan-300"
              />

              {message && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 min-h-12 w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 font-black text-white disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Resetting…" : "Reset parental password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
