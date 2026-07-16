"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasStarted = useRef(false);

  const [message, setMessage] = useState("Completing your login...");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasStarted.current) return;

    hasStarted.current = true;

    async function completeAuthentication() {
      try {
        const url = new URL(window.location.href);

        const oauthError =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");

        if (oauthError) {
          setHasError(true);
          setMessage(decodeURIComponent(oauthError));
          return;
        }

        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Session exchange error:", exchangeError);

            setHasError(true);
            setMessage(`Login failed: ${exchangeError.message}`);
            return;
          }
        }

        /*
         * Give Supabase a short moment to persist the browser session.
         */
        await new Promise((resolve) => window.setTimeout(resolve, 250));

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session retrieval error:", sessionError);

          setHasError(true);
          setMessage(`Login failed: ${sessionError.message}`);
          return;
        }

        if (!session?.user) {
          setHasError(true);
          setMessage(
            "Authentication completed without creating a session. Please return to login and try again."
          );
          return;
        }

        /*
         * Remove the temporary OAuth code from the address bar.
         */
        window.history.replaceState({}, document.title, "/auth/callback");

        setMessage("Login successful. Opening your profile...");

        router.replace("/profile");
        router.refresh();
      } catch (error) {
        console.error("Authentication callback error:", error);

        setHasError(true);
        setMessage(
          error instanceof Error
            ? `Login failed: ${error.message}`
            : "Login failed unexpectedly."
        );
      }
    }

    completeAuthentication();
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020813] px-5 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
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
              onClick={() => router.replace("/login")}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632]"
            >
              Return to Login
            </button>

            <a
              href="mailto:admin@gurukidspro.com?subject=Dreamscape%20One%20Login%20Problem"
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