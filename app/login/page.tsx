"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setMessage(error ? error.message : "Account created. You can now log in.");
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      window.location.href = "/";
    }
  }

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/",
      },
    });
  }

  return (
    <main className="flex h-screen items-center justify-center bg-white">
      <div className="w-[420px] rounded-3xl border border-violet-200 bg-white p-8 shadow-[0_0_60px_rgba(167,139,250,0.35)]">
        <h1 className="text-3xl font-light tracking-wide text-indigo-950">
          Login to Dreamscape
        </h1>

        <button
          onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
          className="absolute left-8 top-8 rounded-full bg-white px-5 py-2 text-sm tracking-wide text-indigo-950 shadow-md"
        >
          ← Back to World
        </button>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
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
          className="mt-4 w-full rounded-full bg-indigo-950 px-5 py-3 text-sm tracking-wide text-white"
        >
          Log In
        </button>

        <button
          onClick={signUp}
          className="mt-3 w-full rounded-full bg-violet-100 px-5 py-3 text-sm tracking-wide text-indigo-950"
        >
          Create Account
        </button>

        <button
          onClick={loginWithGoogle}
          className="mt-3 w-full rounded-full border border-indigo-100 bg-white px-5 py-3 text-sm tracking-wide text-indigo-950 shadow-sm"
        >
          Continue with Google
        </button>

        {message && (
          <p className="mt-4 text-sm text-indigo-950/70">{message}</p>
        )}
      </div>
    </main>
  );
}