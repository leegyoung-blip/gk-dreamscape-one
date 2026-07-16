"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthAction = "login" | "signup" | "google" | null;
type MessageType = "success" | "error" | "info" | "";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getSafeAuthMessage(errorMessage: string) {
  const message = errorMessage.toLowerCase();

  if (message.includes("email address not authorized")) {
    return "Confirmation emails are not configured for external users yet. Please contact support.";
  }

  if (message.includes("user already registered")) {
    return "An account already exists for this email. Try logging in instead.";
  }

  if (message.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }

  if (message.includes("signup is disabled")) {
    return "New account registration is currently disabled.";
  }

  if (message.includes("password")) {
    return errorMessage;
  }

  if (message.includes("rate limit")) {
    return "Too many attempts were made. Please wait a few minutes and try again.";
  }

  return errorMessage;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [activeAction, setActiveAction] = useState<AuthAction>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("");

  const loading = activeAction !== null;

  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace("/profile");
      }
    }

    checkExistingSession();
  }, [router]);

  function showMessage(text: string, type: MessageType) {
    setMessage(text);
    setMessageType(type);
  }

  function validateCredentials() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showMessage("Please enter your email address.", "error");
      return null;
    }

    if (!isValidEmail(cleanEmail)) {
      showMessage("Please enter a valid email address.", "error");
      return null;
    }

    if (!password) {
      showMessage("Please enter your password.", "error");
      return null;
    }

    if (password.length < 6) {
      showMessage("Your password must contain at least 6 characters.", "error");
      return null;
    }

    return {
      cleanEmail,
      cleanReferralCode: referralCode.trim().toUpperCase(),
    };
  }

  async function signUp() {
    if (loading) return;

    setMessage("");
    setMessageType("");

    const validated = validateCredentials();

    if (!validated) return;

    const { cleanEmail, cleanReferralCode } = validated;

    setActiveAction("signup");

    try {
      /*
       * Save the referral code now.
       * It will be applied after the user has a confirmed Supabase session
       * and reaches the profile page.
       */
      if (cleanReferralCode) {
        localStorage.setItem("pending-referral-code", cleanReferralCode);
      } else {
        localStorage.removeItem("pending-referral-code");
      }

      const callbackUrl = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) {
        console.error("Supabase signup error:", error);

        showMessage(getSafeAuthMessage(error.message), "error");
        return;
      }

      if (!data.user) {
        showMessage(
          "Supabase did not create the account. Please check the authentication settings.",
          "error"
        );
        return;
      }

      /*
       * If Confirm Email is disabled, Supabase may return a session
       * immediately.
       */
      if (data.session?.user) {
        showMessage("Account created successfully. Opening your profile…", "success");

        router.replace("/profile");
        router.refresh();
        return;
      }

      /*
       * If Confirm Email is enabled, there will normally be no session yet.
       */
      showMessage(
        "Account created. Please check your email and click the confirmation link before logging in.",
        "success"
      );

      setPassword("");
    } catch (error) {
      console.error("Unexpected signup error:", error);

      showMessage(
        error instanceof Error
          ? `Registration failed: ${error.message}`
          : "Registration failed unexpectedly. Please try again.",
        "error"
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function login() {
    if (loading) return;

    setMessage("");
    setMessageType("");

    const validated = validateCredentials();

    if (!validated) return;

    setActiveAction("login");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.cleanEmail,
        password,
      });

      if (error) {
        console.error("Supabase login error:", error);

        showMessage(getSafeAuthMessage(error.message), "error");
        return;
      }

      if (!data.session?.user) {
        showMessage(
          "Login did not create a session. Please try again or contact support.",
          "error"
        );
        return;
      }

      showMessage("Login successful. Opening your profile…", "success");

      router.replace("/profile");
      router.refresh();
    } catch (error) {
      console.error("Unexpected login error:", error);

      showMessage(
        error instanceof Error
          ? `Login failed: ${error.message}`
          : "Login failed unexpectedly. Please try again.",
        "error"
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function loginWithGoogle() {
    if (loading) return;

    setMessage("");
    setMessageType("");
    setActiveAction("google");

    const cleanReferralCode = referralCode.trim().toUpperCase();

    try {
      if (cleanReferralCode) {
        localStorage.setItem("pending-referral-code", cleanReferralCode);
      } else {
        localStorage.removeItem("pending-referral-code");
      }

      const callbackUrl = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          scopes:
            "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        console.error("Google login error:", error);

        showMessage(`Google login failed: ${error.message}`, "error");
        return;
      }

      if (!data?.url) {
        showMessage(
          "Google login could not be started. Please check the Google provider configuration.",
          "error"
        );
        return;
      }

      /*
       * signInWithOAuth normally redirects automatically in the browser.
       * This fallback ensures that navigation still begins.
       */
      window.location.assign(data.url);
    } catch (error) {
      console.error("Unexpected Google login error:", error);

      showMessage(
        error instanceof Error
          ? `Google login failed: ${error.message}`
          : "Google login failed unexpectedly.",
        "error"
      );
    } finally {
      /*
       * If the browser redirects normally, this page unloads.
       * If it does not, the button becomes available again.
       */
      window.setTimeout(() => {
        setActiveAction(null);
      }, 2000);
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
        type="button"
        onClick={goBack}
        className="absolute left-5 top-5 z-30 rounded-full border border-cyan-200/25 bg-white/[0.06] px-5 py-2 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45 sm:left-8 sm:top-8"
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
            Continue your journey, collect Dream Tokens, and access your
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
              Log in to an existing account or create a new one.
            </p>
          </div>

          <div className="mt-7 grid gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/48">
                Email
              </span>

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) {
                    login();
                  }
                }}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-2xl border border-cyan-200/14 bg-[#061632]/75 px-4 py-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-cyan-200/42 disabled:opacity-60"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/48">
                Password
              </span>

              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) {
                    login();
                  }
                }}
                placeholder="At least 6 characters"
                type="password"
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-2xl border border-cyan-200/14 bg-[#061632]/75 px-4 py-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-cyan-200/42 disabled:opacity-60"
              />
            </label>
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
              autoComplete="off"
              disabled={loading}
              className="mt-3 w-full rounded-2xl border border-violet-200/18 bg-[#070d22] px-4 py-3 text-sm uppercase tracking-[0.08em] text-white outline-none placeholder:text-white/32 focus:border-violet-200/42 disabled:opacity-60"
            />

            <p className="mt-3 text-xs leading-5 text-white/48">
              Enter a referral code before creating an account or continuing
              with Google to receive the referral reward.
            </p>
          </div>

          <button
            type="button"
            onClick={login}
            disabled={loading}
            className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] shadow-[0_14px_34px_rgba(255,255,255,0.08)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "login" ? "Logging In..." : "Log In"}
          </button>

          <button
            type="button"
            onClick={signUp}
            disabled={loading}
            className="mt-3 w-full rounded-full border border-cyan-200/25 bg-cyan-300/12 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:scale-[1.01] hover:border-cyan-200/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "signup"
              ? "Creating Account..."
              : "Create Account"}
          </button>

          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />

            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/34">
              Or
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full rounded-full border border-violet-200/25 bg-violet-400/16 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:scale-[1.01] hover:border-violet-200/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "google"
              ? "Opening Google..."
              : "Continue with Google"}
          </button>

          {message && (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                messageType === "success"
                  ? "border-green-200/20 bg-green-400/10 text-green-100"
                  : messageType === "error"
                    ? "border-red-200/20 bg-red-400/10 text-red-100"
                    : "border-cyan-200/14 bg-[#061632]/75 text-white/68"
              }`}
            >
              {message}
            </div>
          )}

          <a
            href="mailto:admin@gurukidspro.com?subject=Dreamscape%20One%20Login%20Support"
            className="mt-5 block text-center text-xs text-cyan-100/48 underline decoration-cyan-200/20 underline-offset-4 transition hover:text-cyan-100/80"
          >
            Having trouble? Contact support
          </a>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-white/36">
          Dream Tokens and referral rewards will appear in your profile wallet.
        </p>
      </section>
    </main>
  );
}