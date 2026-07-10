"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/profile`
            : undefined,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account created. Please check your email to confirm your account.");
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

        {message && <p className="mt-4 text-sm text-indigo-950/70">{message}</p>}
      </div>
    </main>
  );
}