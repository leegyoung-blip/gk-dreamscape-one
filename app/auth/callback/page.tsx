"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing Google login...");

  useEffect(() => {
    async function finishGoogleLogin() {
      const currentUrl = new URL(window.location.href);

      const code = currentUrl.searchParams.get("code");
      const queryError =
        currentUrl.searchParams.get("error_description") ||
        currentUrl.searchParams.get("error");

      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash
      );

      const hashError =
        hashParams.get("error_description") || hashParams.get("error");

      const oauthError = queryError || hashError;

      if (oauthError) {
        console.error("Google OAuth callback error:", oauthError);
        setMessage(`Google login failed: ${oauthError}`);
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);
          setMessage(`Google login failed: ${exchangeError.message}`);
          return;
        }
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setMessage(`Google login failed: ${sessionError.message}`);
        return;
      }

      if (!session?.user) {
        setMessage(
          "Google login did not create a session. Please return to the login page and try again."
        );
        return;
      }

      router.replace("/profile");
      router.refresh();
    }

    finishGoogleLogin();
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
          Google Login
        </h1>

        <p className="mt-5 text-sm leading-7 text-white/65">{message}</p>

        {message !== "Completing Google login..." && (
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632]"
          >
            Return to Login
          </button>
        )}
      </section>
    </main>
  );
}