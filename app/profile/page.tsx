"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DreamTokenTransaction = {
  id: string;
  user_id: string;
  type: "earn" | "spend" | "physical";
  title: string;
  amount: number;
  token_kind: "virtual" | "physical";
  created_at: string;
};

function formatTransactionAmount(transaction: DreamTokenTransaction) {
  const prefix = transaction.amount > 0 ? "+" : "";

  if (transaction.token_kind === "physical") {
    return `${prefix}${transaction.amount} Token`;
  }

  return `${prefix}${transaction.amount} DT`;
}

function formatTransactionDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [showTokenHistory, setShowTokenHistory] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);

  const dreamTokenBalance = tokenTransactions
    .filter((transaction) => transaction.token_kind === "virtual")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const physicalTokenBalance = tokenTransactions
    .filter((transaction) => transaction.token_kind === "physical")
    .reduce((total, transaction) => total + transaction.amount, 0);

  useEffect(() => {
    async function loadProfile() {
      setIsLoadingTokens(true);

      const { data, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError.message);
      }

      if (!data.user) {
        setEmail(null);
        setReferralCode(null);
        setIsAdmin(false);
        setTokenTransactions([]);
        setIsLoadingTokens(false);
        return;
      }

      setEmail(data.user.email ?? null);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, referral_code")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError.message);
      }

      setIsAdmin(profile?.role?.trim().toLowerCase() === "admin");
      setReferralCode(profile?.referral_code ?? null);

      const pendingReferralCode =
        typeof window !== "undefined"
          ? localStorage.getItem("pending-referral-code")
          : null;

      if (pendingReferralCode) {
        const { data: referralResult, error: referralError } =
          await supabase.rpc("apply_referral_bonus", {
            new_user_id: data.user.id,
            input_referral_code: pendingReferralCode,
          });

        const referralData = referralResult as {
          success?: boolean;
          message?: string;
        } | null;

        if (referralError) {
          console.error("Google referral error:", referralError.message);
          setReferralMessage("Referral code could not be applied.");
        } else if (referralData?.success) {
          setReferralMessage("Referral bonus applied. You received 10 Dream Tokens.");
        } else if (referralData?.message) {
          setReferralMessage(referralData.message);
        }

        localStorage.removeItem("pending-referral-code");
      }

      const { data: savedTokenTransactions, error: tokenError } =
        await supabase
          .from("dream_token_transactions")
          .select("*")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });

      if (tokenError) {
        console.error("Token error:", tokenError.message);
      }

      setTokenTransactions(savedTokenTransactions ?? []);
      setIsLoadingTokens(false);
    }

    loadProfile();
  }, []);

  async function copyReferralCode() {
    if (!referralCode) return;

    await navigator.clipboard.writeText(referralCode);
    setCopiedReferralCode(true);

    window.setTimeout(() => {
      setCopiedReferralCode(false);
    }, 1800);
  }

  async function logout() {
    localStorage.removeItem("seen-prologue");
    localStorage.removeItem("seen-chapter-guide");
    localStorage.removeItem("pending-referral-code");

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <button
        onClick={() => router.push("/")}
        className="absolute left-5 top-5 z-30 rounded-full border border-cyan-200/25 bg-white/6 px-5 py-2 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45 sm:left-8 sm:top-8"
      >
        ← Back to World
      </button>

      <div className="fixed right-5 top-5 z-50 flex items-center gap-3 sm:right-8 sm:top-8">
        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push("/admin/dream-tokens")}
            className="hidden h-[46px] items-center justify-center rounded-full border border-violet-200/25 bg-violet-500/25 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(109,79,143,0.28)] backdrop-blur-xl transition hover:scale-[1.03] sm:flex"
          >
            Admin Panel
          </button>
        )}

        <button
          type="button"
          onClick={logout}
          className="h-[46px] rounded-full border border-cyan-200/25 bg-white/8 px-5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:scale-[1.03]"
        >
          Log Out
        </button>

        <button
          type="button"
          onClick={() => router.push("/cart")}
          aria-label="Cart"
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-cyan-200/25 bg-white/8 shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:scale-[1.03]"
        >
          <CartIcon />
        </button>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl pt-24 sm:pt-20">
        <section className="text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
            Dreamscape One
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            My Profile
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/62">
            {email ? `Logged in as ${email}` : "Not logged in"}
          </p>

          {referralMessage && (
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-violet-200/20 bg-violet-400/12 px-5 py-4 text-sm leading-6 text-white/78">
              {referralMessage}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-8">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
              Account
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
              Dreamscape Access TEST
            </h2>

            <div className="mt-7 grid gap-4">
              <div className="rounded-2xl border border-cyan-200/14 bg-[#061632]/75 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Email
                </p>

                <p className="mt-2 break-all text-lg text-white/86">
                  {email || "No active login"}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200/14 bg-[#061632]/75 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Role
                </p>

                <p className="mt-2 text-lg text-white/86">
                  {isAdmin ? "Admin" : "Student / Member"}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-200/18 bg-[#120b2e]/75 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Referral Code
                </p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all text-2xl font-extrabold tracking-[0.16em] text-white">
                    {referralCode || "Loading..."}
                  </p>

                  <button
                    type="button"
                    onClick={copyReferralCode}
                    disabled={!referralCode}
                    className="rounded-full border border-violet-200/25 bg-violet-400/18 px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:scale-[1.03] disabled:opacity-50"
                  >
                    {copiedReferralCode ? "Copied" : "Copy Code"}
                  </button>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/54">
                  Share your code with a friend. They get 10 Dream Tokens when
                  they join, and you get 20 Dream Tokens when they use your
                  code.
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push("/admin/dream-tokens")}
                className="mt-6 w-full rounded-2xl border border-violet-200/25 bg-violet-500/24 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-violet-500/34 sm:hidden"
              >
                Admin Panel
              </button>
            )}
          </div>

          <button
            onClick={() => setShowTokenHistory(true)}
            className="group rounded-[32px] border border-yellow-300/28 bg-[linear-gradient(180deg,rgba(112,57,18,0.42),rgba(4,20,48,0.82))] p-7 text-left shadow-[0_0_42px_rgba(250,204,21,0.08),0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:scale-[1.01] hover:border-yellow-200/44 hover:shadow-[0_0_52px_rgba(250,204,21,0.14)] sm:p-8"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                  Dream Token Wallet
                </p>

                <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                  View balance and history
                </h2>

                <p className="mt-4 max-w-md text-sm leading-6 text-white/62">
                  Track Dreamscape Tokens earned from classes, activities, and
                  future unlocks.
                </p>
              </div>

              <img
                src="/dreamscape/dream-token.png"
                alt="Dream Token"
                className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_0_22px_rgba(250,204,21,0.28)]"
              />
            </div>

            <div className="mt-9 flex items-end justify-between gap-5 rounded-3xl border border-yellow-200/16 bg-black/24 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Current Balance
                </p>

                {isLoadingTokens ? (
                  <p className="mt-2 text-lg text-white/52">Loading...</p>
                ) : (
                  <div className="mt-2 flex items-end gap-3">
                    <span className="text-5xl font-extrabold leading-none text-white">
                      {dreamTokenBalance.toLocaleString()}
                    </span>

                    <span className="pb-2 text-sm font-bold tracking-[0.16em] text-[#ffd18a]">
                      DT
                    </span>
                  </div>
                )}
              </div>

              <span className="rounded-full border border-yellow-200/20 bg-yellow-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd18a]">
                Open Wallet
              </span>
            </div>
          </button>
        </section>
      </div>

      {showTokenHistory && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#020813]/78 px-4 py-10 backdrop-blur-md">
          <div className="relative h-[74vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-yellow-300/30 bg-[#041124] shadow-[0_0_55px_rgba(250,204,21,0.12),0_30px_90px_rgba(0,0,0,0.55)]">
            <button
              onClick={() => setShowTokenHistory(false)}
              className="absolute right-5 top-5 z-20 rounded-full border border-white/14 bg-white/8 px-3 py-1 text-white transition hover:bg-white/14"
            >
              ✕
            </button>

            <div className="grid h-full grid-rows-[auto_1fr_auto]">
              <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
                <div className="flex items-center gap-4">
                  <img
                    src="/dreamscape/dream-token.png"
                    alt="Dream Token"
                    className="h-16 w-16 object-contain drop-shadow-[0_0_22px_rgba(250,204,21,0.26)]"
                  />

                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#ffd18a]">
                      Dream Token Wallet
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <p className="text-4xl font-light leading-none text-white">
                        {dreamTokenBalance.toLocaleString()}
                      </p>

                      <p className="pb-1 text-sm font-semibold tracking-[0.16em] text-[#ffd18a]">
                        DT
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-white/48">
                      {physicalTokenBalance} physical Dream Tokens collected
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-6 py-5">
                <div className="rounded-2xl border border-cyan-200/12 bg-white/[0.045] p-4">
                  <h3 className="text-lg font-medium text-white">
                    Dream Token History
                  </h3>

                  <p className="mt-1 text-sm text-white/48">
                    Track tokens earned from classes, items unlocked, and
                    physical tokens collected.
                  </p>
                </div>

                {tokenTransactions.length === 0 ? (
                  <p className="mt-6 text-sm text-white/48">
                    No Dream Token activity yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {tokenTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {transaction.title}
                          </p>

                          <p className="mt-1 text-sm text-white/42">
                            {formatTransactionDate(transaction.created_at)}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 font-bold ${
                            transaction.type === "spend"
                              ? "text-red-300"
                              : transaction.type === "physical"
                              ? "text-blue-300"
                              : "text-green-300"
                          }`}
                        >
                          {formatTransactionAmount(transaction)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4">
                <button
                  onClick={() => setShowTokenHistory(false)}
                  className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01]"
                >
                  Close Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}