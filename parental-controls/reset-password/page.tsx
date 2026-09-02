"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ParentPinKeypad from "@/components/parental-controls/ParentPinKeypad";

type PinStage = "new" | "confirm";

export default function ResetParentalControlPasswordPage() {
  const [token, setToken] = useState("");
  const [stage, setStage] = useState<PinStage>("new");
  const [firstPin, setFirstPin] = useState("");
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(resetToken);
    setKeypadOpen(Boolean(resetToken));
    if (resetToken) {
      window.history.replaceState({}, "", "/parental-controls/reset-password");
    }
  }, []);

  async function handlePin(pin: string) {
    setMessage("");

    if (stage === "new") {
      setFirstPin(pin);
      setStage("confirm");
      return;
    }

    if (pin !== firstPin) {
      setMessage("The PINs do not match. Start again and enter the same four digits twice.");
      setFirstPin("");
      setStage("new");
      return;
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setMessage("This reset link is invalid or incomplete.");
      setKeypadOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/parental-controls/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pin }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(result.error || "The reset could not be completed.");
        setKeypadOpen(false);
        return;
      }

      setIsComplete(true);
      setKeypadOpen(false);
      setFirstPin("");
    } catch {
      setMessage("The reset service could not be reached. Please try again.");
      setKeypadOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function beginAgain() {
    setStage("new");
    setFirstPin("");
    setMessage("");
    setKeypadOpen(true);
  }

  return (
    <main className="min-h-dvh bg-[#030816] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#08172f] shadow-2xl shadow-black/40">
        <div className="bg-gradient-to-br from-cyan-950 to-violet-950 px-7 py-8">
          <p className="m-0 text-xs font-black tracking-[0.18em] text-cyan-200">
            DREAMSCAPE ONE · PARENT CONTROLS
          </p>
          <h1 className="mt-3 text-3xl font-black">Change parent PIN</h1>
        </div>

        <div className="px-7 py-8">
          {isComplete ? (
            <div>
              <p className="text-lg font-bold text-emerald-300">
                Your 4-digit parent PIN has been changed.
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
            <div>
              <p className="m-0 text-sm leading-6 text-slate-300">
                Choose a new 4-digit PIN using the on-screen keypad. This PIN is
                separate from your Dreamscape account password.
              </p>

              {message && (
                <p role="alert" className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
                  {message}
                </p>
              )}

              <button
                type="button"
                disabled={!token || isSubmitting}
                onClick={beginAgain}
                className="mt-6 min-h-12 w-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-6 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Changing PIN…" : "Enter new 4-digit PIN"}
              </button>
            </div>
          )}
        </div>
      </section>

      <ParentPinKeypad
        key={stage}
        open={keypadOpen && !isComplete}
        title={stage === "new" ? "Create new 4-digit PIN" : "Confirm new PIN"}
        description={stage === "new" ? "Tap four numbers for the new parent PIN." : "Enter the same four numbers again."}
        submitLabel={stage === "new" ? "Continue" : "Change PIN"}
        error={message}
        busy={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setKeypadOpen(false);
        }}
        onSubmit={handlePin}
      />
    </main>
  );
}
