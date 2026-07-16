"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setMessage("");
    setLoading(true);

    const cleanReferralCode = referralCode.trim().toUpperCase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/profile`
            : undefined,
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const newUserId = data.user?.id;

    if (newUserId && cleanReferralCode) {
      const { data: referralResult, error: referralError } = await supabase.rpc(
        "apply_referral_bonus",
        {
          new_user_id: newUserId,
          input_referral_code: cleanReferralCode,
        }
      );

      const referralData = referralResult as {
        success?: boolean;
        message?: string;
      } | null;

      if (referralError) {
        console.error("Referral error:", referralError.message);

        setMessage(
          "Account created. Please check your email to confirm your account. Referral code could not be applied."
        );
      } else if (referralData?.success) {
        setMessage(
          "Account created. Please check your email to confirm your account. Your 10 bonus Dream Tokens have been added."
        );
      } else {
        setMessage(
          `Account created. Please check your email to confirm your account. ${
            referralData?.message || "Referral code was not applied."
          }`
        );
      }
    } else {
      setMessage("Account created. Please check your email to confirm your account.");
    }

    setLoading(false);
  }

  async function login() {
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/profile");
  }

  async function loginWithGoogle() {
  setMessage("");
  setLoading(true);

  const cleanReferralCode = referralCode.trim().toUpperCase();

  if (cleanReferralCode && typeof window !== "undefined") {
    localStorage.setItem("pending-referral-code", cleanReferralCode);
  }

  if (typeof window === "undefined") {
    setLoading(false);
    setMessage("Google login is not available right now.");
    return;
  }

  const redirectTo = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes:
        "openid email profile https://www.googleapis.com/auth/userinfo.email",
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    console.error("Google login error:", error);
    setLoading(false);
    setMessage(`Google login failed: ${error.message}`);
    return;
  }

  if (!data.url) {
    setLoading(false);
    setMessage("Google login could not be started. Please try again.");
  }
}

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020813] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute left-[50%] top-[46%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <button
        onClick={goBack}
        className="absolute left-5 top-5 z-30 rounded-full border border-cyan-200/25 bg-white/6 px-5 py-2 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45 sm:left-8 sm:top-8"
      >
        ← Back to World
      </button>

      <section className="relative z-10 w-full max-w-[460px]">
        <div className="text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
            Dreamscape One
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-6xl">
            Login
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/55">
            Continue your journey, collect Dream Tokens, and unlock your
            Dreamscape profile.
          </p>
        </div>

        <div className="mt-10 rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
              Account Access
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
              Enter Dreamscape
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/52">
              Log in if you already have an account, or create one below.
            </p>
          </div>

          <div className="mt-7 grid gap-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              type="email"
              className="w-full rounded-2xl border border-cyan-200/14 bg-[#061632]/75 px-4 py-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-cyan-200/42"
            />

            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              className="w-full rounded-2xl border border-cyan-200/14 bg-[#061632]/75 px-4 py-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-cyan-200/42"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-violet-200/18 bg-[#120b2e]/75 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/80">
              New account bonus
            </p>

            <input
              value={referralCode}
              onChange={(event) =>
                setReferralCode(event.target.value.toUpperCase())
              }
              placeholder="Referral code optional"
              type="text"
              className="mt-3 w-full rounded-2xl border border-violet-200/18 bg-[#070d22] px-4 py-3 text-sm uppercase tracking-[0.08em] text-white outline-none placeholder:text-white/32 focus:border-violet-200/42"
            />

            <p className="mt-3 text-xs leading-5 text-white/48">
              Have a referral code? Enter it before creating an account or
              continuing with Google to receive 10 bonus Dream Tokens.
            </p>
          </div>

          <button
            onClick={login}
            disabled={loading}
            className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] shadow-[0_14px_34px_rgba(255,255,255,0.08)] transition hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Log In"}
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="mt-3 w-full rounded-full border border-cyan-200/25 bg-cyan-300/12 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:scale-[1.01] hover:border-cyan-200/45 disabled:opacity-50"
          >
            Create Account
          </button>

          <button
            onClick={loginWithGoogle}
            disabled={loading}
            className="mt-3 w-full rounded-full border border-violet-200/25 bg-violet-400/16 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:scale-[1.01] hover:border-violet-200/45 disabled:opacity-50"
          >
            Continue with Google
          </button>

          {message && (
            <p className="mt-5 rounded-2xl border border-cyan-200/14 bg-[#061632]/75 px-4 py-3 text-sm leading-6 text-white/68">
              {message}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-white/36">
          Dream Tokens and referral rewards will appear in your profile wallet.
        </p>
      </section>
    </main>
  );
}