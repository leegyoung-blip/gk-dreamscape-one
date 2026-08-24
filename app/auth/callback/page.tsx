"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

function safeNextPath(currentUrl: URL): string {
  const requested = (currentUrl.searchParams.get("next") || "").trim();

  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) {
    return "/profile";
  }

  try {
    const resolved = new URL(requested, currentUrl.origin);

    if (resolved.origin !== currentUrl.origin) {
      return "/profile";
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/profile";
  }
}

export default function AuthCallbackPage() {
  const hasStarted = useRef(false);

  const [message, setMessage] = useState("Completing your login...");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function completeAuthentication() {
      try {
        const currentUrl = new URL(window.location.href);
        const nextPath = safeNextPath(currentUrl);

        const oauthError =
          currentUrl.searchParams.get("error_description") ||
          currentUrl.searchParams.get("error");

        if (oauthError) {
          console.error("OAuth callback error:", oauthError);
          setHasError(true);
          setMessage(oauthError);
          return;
        }

        const code = currentUrl.searchParams.get("code");

        /*
         * If the page is revisited after the session was already created,
         * send the user to the validated requested destination.
         */
        if (!code) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
            console.error("Existing session check failed:", userError);
          }

          if (user) {
            window.location.replace(nextPath);
            return;
          }

          setHasError(true);
          setMessage(
            "The login callback did not include an authentication code. Please return to login and try again.",
          );
          return;
        }

        setMessage("Creating your Dreamscape session...");

        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Session exchange failed:", exchangeError);

          /*
           * Sometimes the code was already exchanged before the page
           * was refreshed or revisited. Check whether a session exists.
           */
          const {
            data: { user: existingUser },
          } = await supabase.auth.getUser();

          if (existingUser) {
            window.location.replace(nextPath);
            return;
          }

          setHasError(true);
          setMessage(`Login failed: ${exchangeError.message}`);
          return;
        }

        if (!data.session?.user) {
          setHasError(true);
          setMessage(
            "Google login completed, but no session was created. Please return to login and try again.",
          );
          return;
        }

        setMessage("Login successful. Opening Dreamscape...");

        /*
         * Use a full browser navigation instead of router.replace().
         * This ensures the new Supabase session is loaded cleanly.
         */
        window.location.replace(nextPath);
      } catch (error) {
        console.error("Authentication callback error:", error);

        setHasError(true);
        setMessage(
          error instanceof Error
            ? `Login failed: ${error.message}`
            : "Login failed unexpectedly.",
        );
      }
    }

    completeAuthentication();
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020813] px-5 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />

        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-lg rounded-[32px] border border-cyan-200/20 bg-white/[0.05] p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
          Dreamscape One
        </p>

        <h1 className="mt-4 text-4xl font-light text-white">
          {hasError ? "Login Problem" : "Signing You In"}
        </h1>

        {!hasError && (
          <div className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
        )}

        <p className="mt-6 text-sm leading-7 text-white/65">{message}</p>

        {hasError && (
          <div className="mt-7 grid gap-3">
            <button
              type="button"
              onClick={() => window.location.replace("/login")}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632]"
            >
              Return to Login
            </button>

            <a
              href="mailto:admin@gurukidspro.com?subject=Dreamscape%20One%20Google%20Login%20Problem"
              className="flex min-h-[48px] items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 px-5 text-sm font-bold uppercase tracking-[0.12em] text-white"
            >
              Email Support
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
