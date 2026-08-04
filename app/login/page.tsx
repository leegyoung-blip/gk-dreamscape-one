"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MessageType = "success" | "error" | "info";

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getRequestedNextPath() {
  if (typeof window === "undefined") {
    return "/profile";
  }

  const requested = new URLSearchParams(window.location.search).get("next");

  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) {
    return "/profile";
  }

  return requested;
}

function getCompleteProfilePath(nextPath: string) {
  return `/complete-profile?next=${encodeURIComponent(nextPath)}`;
}

function getAuthErrorMessage(error: unknown) {
  const authError = error as {
    code?: string;
    message?: string;
  };

  switch (authError.code) {
    case "invalid_credentials":
      return "The email or password is incorrect. Use “Forgot password?” if you cannot remember your password.";

    case "email_not_confirmed":
      return "Please confirm your email address before logging in.";

    case "user_banned":
      return "This account is currently unavailable. Please contact support.";

    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts were made. Please wait a few minutes and try again.";

    case "weak_password":
      return authError.message || "Please choose a stronger password.";

    case "signup_disabled":
      return "New account registration is currently unavailable.";

    default:
      return authError.message || "Something went wrong. Please try again.";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("info");

  const [loadingAction, setLoadingAction] = useState<
    "login" | "signup" | "google" | "reset" | null
  >(null);

  function displayMessage(
    text: string,
    type: MessageType = "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage("");
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  async function login(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    clearMessage();

    const cleanEmail = normaliseEmail(email);

    if (!cleanEmail || !password) {
      displayMessage(
        "Please enter your email and password.",
        "error"
      );
      return;
    }

    setLoadingAction("login");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,

        // Do not trim passwords. Spaces may be part of a password.
        password,
      });

      if (error) {
        displayMessage(getAuthErrorMessage(error), "error");
        return;
      }

      const nextPath = getRequestedNextPath();
      const enteredAge = calculateAge(dateOfBirth);

      if (
        dateOfBirth &&
        enteredAge !== null &&
        enteredAge >= 4 &&
        enteredAge <= 120
      ) {
        localStorage.setItem("pending-date-of-birth", dateOfBirth);
      }

      const {
        data: learningProfileStatus,
        error: learningProfileError,
      } = await supabase.rpc("get_my_learning_profile_status");

      const resolvedLearningProfile =
        (learningProfileStatus || {}) as {
          complete?: boolean;
        };

      if (learningProfileError || !resolvedLearningProfile.complete) {
        displayMessage(
          "Login successful. Complete the learner profile to continue.",
          "success"
        );

        router.replace(getCompleteProfilePath(nextPath));
      } else {
        localStorage.removeItem("pending-date-of-birth");

        displayMessage(
          "Login successful. Opening your profile.",
          "success"
        );

        router.replace(nextPath);
      }

      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      displayMessage(
        "Something went wrong while logging in. Please try again.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function signUp() {
    clearMessage();

    const cleanEmail = normaliseEmail(email);
    const cleanReferralCode = referralCode.trim().toUpperCase();
    const age = calculateAge(dateOfBirth);

    if (!dateOfBirth || age === null || age < 4 || age > 120) {
      displayMessage(
        "Please enter a valid learner date of birth before creating an account.",
        "error"
      );
      return;
    }

    if (!cleanEmail || !password) {
      displayMessage(
        "Please enter an email and password before creating an account.",
        "error"
      );
      return;
    }

    if (password.length < 6) {
      displayMessage(
        "Your password must contain at least 6 characters.",
        "error"
      );
      return;
    }

    setLoadingAction("signup");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,

        // Do not trim passwords.
        password,

        options: {
          emailRedirectTo: `${
            window.location.origin
          }${getCompleteProfilePath("/profile")}`,
          data: {
            date_of_birth: dateOfBirth,
          },
        },
      });

      if (error) {
        displayMessage(getAuthErrorMessage(error), "error");
        return;
      }

      if (data.user && cleanReferralCode) {
        const { data: referralResult, error: referralError } =
          await supabase.rpc("apply_referral_bonus", {
            new_user_id: data.user.id,
            input_referral_code: cleanReferralCode,
          });

        if (referralError) {
          console.error(
            "Referral error:",
            referralError.message
          );
        } else {
          console.log("Referral result:", referralResult);
        }
      }

      setPassword("");
      localStorage.setItem("pending-date-of-birth", dateOfBirth);

      if (data.session) {
        displayMessage(
          "Account created. Complete the learner profile to continue.",
          "success"
        );

        router.replace(getCompleteProfilePath("/profile"));
        router.refresh();
        return;
      }

      displayMessage(
        "Account created. Please check your email and click the confirmation link. You will then complete the learner profile.",
        "success"
      );
    } catch (error) {
      console.error("Sign-up error:", error);

      displayMessage(
        "Something went wrong while creating the account. Please try again.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function loginWithGoogle() {
    clearMessage();

    const cleanReferralCode = referralCode.trim().toUpperCase();

    if (cleanReferralCode) {
      localStorage.setItem(
        "pending-referral-code",
        cleanReferralCode
      );
    } else {
      localStorage.removeItem("pending-referral-code");
    }

    const age = calculateAge(dateOfBirth);

    if (
      dateOfBirth &&
      age !== null &&
      age >= 4 &&
      age <= 120
    ) {
      localStorage.setItem("pending-date-of-birth", dateOfBirth);
    } else {
      localStorage.removeItem("pending-date-of-birth");
    }

    setLoadingAction("google");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${
            window.location.origin
          }${getCompleteProfilePath(getRequestedNextPath())}`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        displayMessage(getAuthErrorMessage(error), "error");
        setLoadingAction(null);
      }

      // When successful, Supabase redirects the browser to Google.
    } catch (error) {
      console.error("Google login error:", error);

      displayMessage(
        "Google login could not be started. Please try again.",
        "error"
      );

      setLoadingAction(null);
    }
  }

  async function sendPasswordReset(
    event?: FormEvent<HTMLFormElement>
  ) {
    event?.preventDefault();

    clearMessage();

    const cleanEmail = normaliseEmail(email);

    if (!cleanEmail) {
      displayMessage(
        "Enter the email address used for your Dreamscape account.",
        "error"
      );
      return;
    }

    setLoadingAction("reset");

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/login/reset-password`,
        });

      if (error) {
        displayMessage(getAuthErrorMessage(error), "error");
        return;
      }

      /*
       * Use a general response so the page does not reveal
       * whether a particular email address has an account.
       */
      displayMessage(
        "If an account exists for this email, a password-reset link has been sent. Please also check the spam or junk folder.",
        "success"
      );
    } catch (error) {
      console.error("Password reset error:", error);

      displayMessage(
        "The password-reset email could not be requested. Please try again.",
        "error"
      );
    } finally {
      setLoadingAction(null);
    }
  }

  const isLoading = loadingAction !== null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020813] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(51,198,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(126,87,255,0.18),transparent_38%),linear-gradient(180deg,#07172d_0%,#03091a_48%,#020813_100%)]" />

        <div className="absolute left-[-140px] top-[15%] h-[340px] w-[340px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute bottom-[-130px] right-[-100px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <button
        type="button"
        onClick={goBack}
        className="fixed left-4 top-4 z-40 flex h-11 items-center gap-2 rounded-full border border-cyan-200/25 bg-[#061124]/70 px-4 text-sm text-white shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:scale-[1.02] hover:border-cyan-200/45 sm:left-7 sm:top-7"
      >
        <span aria-hidden="true">←</span>
        Back
      </button>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl items-center justify-center pt-14 sm:pt-8">
        <section className="w-full rounded-[34px] border border-cyan-200/20 bg-[#071329]/80 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5),0_0_45px_rgba(74,199,255,0.08)] backdrop-blur-2xl sm:p-9">
          <header className="text-center">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.28em] text-[#7ee8ff]">
              Dreamscape One
            </p>

            <h1 className="mt-4 text-4xl font-light tracking-[-0.05em] text-white sm:text-5xl">
              {showResetForm
                ? "Reset Password"
                : "Enter Dreamscape"}
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/58 sm:text-base">
              {showResetForm
                ? "Enter your account email and we will send you a secure password-reset link."
                : "Log in, create an account, or continue with Google."}
            </p>
          </header>

          {showResetForm ? (
            <form
              onSubmit={sendPasswordReset}
              className="mt-8"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/58">
                  Account email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearMessage();
                  }}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  className="h-14 w-full rounded-2xl border border-cyan-200/18 bg-[#020a1b]/75 px-5 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/55 focus:ring-2 focus:ring-cyan-300/10"
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 h-14 w-full rounded-full bg-white px-5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#071329] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "reset"
                  ? "Sending reset email..."
                  : "Send reset email"}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setShowResetForm(false);
                  clearMessage();
                }}
                className="mt-3 h-12 w-full rounded-full border border-cyan-200/24 bg-cyan-300/6 px-5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-cyan-200/10 disabled:opacity-50"
              >
                Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={login} className="mt-8">
              <div className="grid gap-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/58">
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearMessage();
                    }}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@example.com"
                    className="h-14 w-full rounded-2xl border border-cyan-200/18 bg-[#020a1b]/75 px-5 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/55 focus:ring-2 focus:ring-cyan-300/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/58">
                    Password
                  </span>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        clearMessage();
                      }}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-14 w-full rounded-2xl border border-cyan-200/18 bg-[#020a1b]/75 px-5 pr-16 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/55 focus:ring-2 focus:ring-cyan-300/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-2 top-1/2 flex h-10 min-w-12 -translate-y-1/2 items-center justify-center rounded-xl px-3 text-xs font-bold uppercase tracking-[0.08em] text-cyan-100/75 transition hover:bg-white/8 hover:text-white"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/58">
                    Learner date of birth
                  </span>

                  <input
                    type="date"
                    value={dateOfBirth}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => {
                      setDateOfBirth(event.target.value);
                      clearMessage();
                    }}
                    autoComplete="bday"
                    className="h-14 w-full rounded-2xl border border-cyan-200/18 bg-[#020a1b]/75 px-5 text-base text-white outline-none transition focus:border-cyan-200/55 focus:ring-2 focus:ring-cyan-300/10"
                  />

                  <p className="mt-2 text-xs leading-5 text-white/42">
                    Required when creating an account. Existing users can log
                    in without re-entering it and will be prompted only if
                    their learner profile is incomplete.
                  </p>
                </label>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(true);
                    setPassword("");
                    clearMessage();
                  }}
                  className="text-sm text-cyan-100/65 underline decoration-cyan-200/25 underline-offset-4 transition hover:text-cyan-100"
                >
                  Forgot password?
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-violet-200/18 bg-violet-500/8 p-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-violet-100/72">
                    Referral code
                  </span>

                  <input
                    type="text"
                    value={referralCode}
                    onChange={(event) => {
                      setReferralCode(
                        event.target.value.toUpperCase()
                      );
                      clearMessage();
                    }}
                    autoCapitalize="characters"
                    autoComplete="off"
                    placeholder="Optional"
                    className="h-14 w-full rounded-2xl border border-violet-200/18 bg-[#080c22]/75 px-5 text-base uppercase tracking-[0.12em] text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-white/28 focus:border-violet-200/55 focus:ring-2 focus:ring-violet-300/10"
                  />
                </label>

                <p className="mt-3 text-sm leading-6 text-white/48">
                  Enter a referral code before creating an account
                  or continuing with Google to receive the referral
                  reward.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-7 h-14 w-full rounded-full bg-white px-5 text-sm font-extrabold uppercase tracking-[0.22em] text-[#071329] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "login"
                  ? "Logging in..."
                  : "Log in"}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={signUp}
                className="mt-3 h-14 w-full rounded-full border border-cyan-200/38 bg-cyan-300/8 px-5 text-sm font-extrabold uppercase tracking-[0.18em] text-white transition hover:scale-[1.01] hover:bg-cyan-200/12 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "signup"
                  ? "Creating account..."
                  : "Create account"}
              </button>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/12" />

                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/34">
                  Or
                </span>

                <div className="h-px flex-1 bg-white/12" />
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={loginWithGoogle}
                className="h-14 w-full rounded-full border border-violet-200/32 bg-violet-500/15 px-5 text-sm font-extrabold uppercase tracking-[0.17em] text-white transition hover:scale-[1.01] hover:bg-violet-500/22 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "google"
                  ? "Opening Google..."
                  : "Continue with Google"}
              </button>
            </form>
          )}

          {message && (
            <div
              role="status"
              className={`mt-6 rounded-2xl border px-5 py-4 text-sm leading-6 ${
                messageType === "success"
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : messageType === "error"
                    ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
                    : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-7 text-center">
            <a
              href="mailto:admin@gurukidspro.com"
              className="text-sm text-white/45 underline decoration-white/15 underline-offset-4 transition hover:text-white/75"
            >
              Having trouble? Contact support
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}