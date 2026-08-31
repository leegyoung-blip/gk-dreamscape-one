"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MessageType = "info" | "success" | "error";

const RECOVERY_SESSION_MARKER =
  "dreamscape-password-recovery-active";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/profile";
  }

  return value;
}

function getRequestedNextPath() {
  if (typeof window === "undefined") {
    return "/profile";
  }

  return safeNextPath(
    new URLSearchParams(window.location.search).get("next")
  );
}

function hasRecoveryEntryHint() {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );

  return (
    searchParams.has("next") ||
    searchParams.get("type") === "recovery" ||
    searchParams.has("code") ||
    searchParams.has("token_hash") ||
    hashParams.get("type") === "recovery"
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPasswords, setShowPasswords] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [recoveryReady, setRecoveryReady] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState(
    "Opening your secure password-reset session..."
  );

  const [messageType, setMessageType] =
    useState<MessageType>("info");

  useEffect(() => {
    let isMounted = true;

    function openPasswordForm() {
      if (!isMounted) return;

      setRecoveryReady(true);
      setCheckingSession(false);
      setMessage(
        "Enter and confirm your new password. If you originally joined with Google, this adds password login to the same Dreamscape account."
      );
      setMessageType("info");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted || !session) return;

        if (event === "PASSWORD_RECOVERY") {
          window.sessionStorage.setItem(
            RECOVERY_SESSION_MARKER,
            "1"
          );

          openPasswordForm();
          return;
        }

        if (
          event === "SIGNED_IN" &&
          (window.sessionStorage.getItem(
            RECOVERY_SESSION_MARKER
          ) === "1" ||
            hasRecoveryEntryHint())
        ) {
          openPasswordForm();
        }
      }
    );

    async function checkRecoverySession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error(
          "Recovery session error:",
          error.message
        );
      }

      const recoveryMarker =
        window.sessionStorage.getItem(
          RECOVERY_SESSION_MARKER
        ) === "1";

      if (
        session &&
        (recoveryMarker || hasRecoveryEntryHint())
      ) {
        openPasswordForm();
        return;
      }

      setRecoveryReady(false);
      setCheckingSession(false);
      setMessage(
        "This password-reset link is invalid or has expired. Request a new link from the login page."
      );
      setMessageType("error");
    }

    /*
     * Supabase automatically processes auth redirects during client
     * initialisation. The brief delay gives the recovery redirect time
     * to establish its authenticated session before the fallback check.
     */
    const timer = window.setTimeout(() => {
      void checkRecoverySession();
    }, 650);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!recoveryReady) {
      setMessage(
        "The password-reset session is not active. Please request a new reset link."
      );
      setMessageType("error");
      return;
    }

    if (!password || !confirmPassword) {
      setMessage(
        "Enter and confirm your new password."
      );
      setMessageType("error");
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Your new password must contain at least 6 characters."
      );
      setMessageType("error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setMessage("Saving your new password...");
    setMessageType("info");

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error(
          "Password update error:",
          error.message
        );

        setMessage(
          error.message ||
            "Your password could not be updated."
        );
        setMessageType("error");
        return;
      }

      setPassword("");
      setConfirmPassword("");

      window.sessionStorage.removeItem(
        RECOVERY_SESSION_MARKER
      );

      const nextPath = getRequestedNextPath();

      const {
        data: learningProfileStatus,
        error: learningProfileError,
      } = await supabase.rpc(
        "get_my_learning_profile_status"
      );

      const resolvedLearningProfile =
        (learningProfileStatus || {}) as {
          complete?: boolean;
        };

      const destination =
        !learningProfileError &&
        resolvedLearningProfile.complete
          ? nextPath
          : `/complete-profile?next=${encodeURIComponent(
              nextPath
            )}`;

      setMessage(
        "Your password has been updated successfully. Opening Dreamscape..."
      );
      setMessageType("success");

      window.setTimeout(() => {
        router.replace(destination);
        router.refresh();
      }, 900);
    } catch (error) {
      console.error("Password update error:", error);

      setMessage(
        "Something went wrong while updating your password."
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(66,204,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(129,91,255,0.18),transparent_38%),linear-gradient(180deg,#07172d_0%,#020813_100%)]" />
      </div>

      <button
        type="button"
        onClick={() => router.push("/login")}
        className="fixed left-4 top-4 z-30 rounded-full border border-cyan-200/25 bg-[#061124]/70 px-5 py-3 text-sm text-white backdrop-blur-xl transition hover:scale-[1.02] sm:left-7 sm:top-7"
      >
        ← Back to Login
      </button>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center justify-center pt-16">
        <section className="w-full rounded-[34px] border border-cyan-200/20 bg-[#071329]/82 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-9">
          <header className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#7ee8ff]">
              Dreamscape One
            </p>

            <h1 className="mt-4 text-4xl font-light tracking-[-0.05em] sm:text-5xl">
              Choose a New Password
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/55">
              This can also be used to add password login to an account that
              was originally created with Google.
            </p>
          </header>

          <div
            role="status"
            className={`mt-7 rounded-2xl border px-5 py-4 text-sm leading-6 ${
              messageType === "success"
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                : messageType === "error"
                  ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
                  : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
            }`}
          >
            {message}
          </div>

          <form onSubmit={updatePassword} className="mt-7">
            <div className="grid gap-5">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-white/58">
                  New password
                </span>

                <div className="relative">
                  <input
                    type={
                      showPasswords ? "text" : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    disabled={
                      checkingSession ||
                      !recoveryReady ||
                      isSaving
                    }
                    autoComplete="new-password"
                    className="h-14 w-full rounded-2xl border border-cyan-200/18 bg-[#020a1b]/75 px-5 pr-16 text-white outline-none transition focus:border-cyan-200/55 disabled:opacity-45"
                  />

                  <button
                    type="button"
                    disabled={
                      checkingSession ||
                      !recoveryReady ||
                      isSaving
                    }
                    onClick={() =>
                      setShowPasswords(
                        (current) => !current
                      )
                    }
                    className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl px-3 text-xs font-bold uppercase text-cyan-100/75 hover:bg-white/8 disabled:opacity-45"
                  >
                    {showPasswords ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-white/58">
                  Confirm new password
                </span>

                <input
                  type={
                    showPasswords ? "text" : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  disabled={
                    checkingSession ||
                    !recoveryReady ||
                    isSaving
                  }
                  autoComplete="new-password"
                  className="h-14 w-full rounded-2xl border border-cyan-200/18 bg-[#020a1b]/75 px-5 text-white outline-none transition focus:border-cyan-200/55 disabled:opacity-45"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={
                checkingSession ||
                !recoveryReady ||
                isSaving
              }
              className="mt-7 h-14 w-full rounded-full bg-white px-5 text-sm font-extrabold uppercase tracking-[0.18em] text-[#071329] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving
                ? "Updating password..."
                : "Update password"}
            </button>
          </form>

          {!recoveryReady && !checkingSession && (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-3 h-12 w-full rounded-full border border-cyan-200/25 bg-cyan-300/8 text-xs font-bold uppercase tracking-[0.15em] text-white"
            >
              Request another reset link
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
