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

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/profile`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
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
    <main className="relative flex min-h-screen items-center justify-center bg-white px-5">
      <button
        onClick={goBack}
        className="absolute left-8 top-8 rounded-full bg-white px-5 py-2 text-sm tracking-wide text-indigo-950 shadow-md"
      >
        ← Back to World
      </button>

      <div className="w-full max-w-[420px] rounded-3xl border border-violet-200 bg-white p-8 shadow-[0_0_60px_rgba(167,139,250,0.35)]">
        <h1 className="text-3xl font-light tracking-wide text-indigo-950">
          Login to Dreamscape
        </h1>

        <p className="mt-3 text-sm leading-6 text-indigo-950/55">
          Log in to continue your journey, or create a new Dreamscape account.
        </p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="mt-6 w-full rounded-2xl border border-indigo-100 px-4 py-3 text-sm outline-none"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="mt-3 w-full rounded-2xl border border-indigo-100 px-4 py-3 text-sm outline-none"
        />

        <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-950/55">
            New account bonus
          </p>

          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="Referral code optional"
            type="text"
            className="mt-3 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm uppercase tracking-[0.08em] text-indigo-950 outline-none"
          />

          <p className="mt-2 text-xs leading-5 text-indigo-950/50">
            Have a referral code? Enter it before creating an account or
            continuing with Google to receive 10 bonus Dream Tokens.
          </p>
        </div>

        <button
          onClick={login}
          disabled={loading}
          className="mt-4 w-full rounded-full bg-indigo-950 px-5 py-3 text-sm tracking-wide text-white disabled:opacity-50"
        >
          {loading ? "Please wait..." : "Log In"}
        </button>

        <button
          onClick={signUp}
          disabled={loading}
          className="mt-3 w-full rounded-full bg-violet-100 px-5 py-3 text-sm tracking-wide text-indigo-950 disabled:opacity-50"
        >
          Create Account
        </button>

        <button
          onClick={loginWithGoogle}
          disabled={loading}
          className="mt-3 w-full rounded-full border border-indigo-100 bg-white px-5 py-3 text-sm tracking-wide text-indigo-950 shadow-sm disabled:opacity-50"
        >
          Continue with Google
        </button>

        {message && (
          <p className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-950/70">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}