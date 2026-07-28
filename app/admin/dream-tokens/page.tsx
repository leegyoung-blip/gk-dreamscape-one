"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  role: string | null;
  created_at: string;
  dreamTokenBalance: number;
  dreamGemBalance: number;
};

type TokenAction = "class_attendance" | "manual_add" | "manual_deduct";
type GemAction = "manual_add" | "manual_deduct";

const tokenActions: {
  id: TokenAction;
  label: string;
  description: string;
}[] = [
  {
    id: "class_attendance",
    label: "Class Attendance +100",
    description: "Add 100 Dream Tokens for class attendance.",
  },
  {
    id: "manual_add",
    label: "Manual Add",
    description: "Manually add Dream Tokens to the selected account.",
  },
  {
    id: "manual_deduct",
    label: "Manual Deduct",
    description: "Manually deduct Dream Tokens from the selected account.",
  },
];

const gemActions: {
  id: GemAction;
  label: string;
  description: string;
}[] = [
  {
    id: "manual_add",
    label: "Add Dream Gems",
    description: "Add Dream Gems and record the reason in the Gem ledger.",
  },
  {
    id: "manual_deduct",
    label: "Deduct Dream Gems",
    description: "Deduct Dream Gems and record the reason in the Gem ledger.",
  },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function GemIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M18 12h28l10 14-24 28L8 26 18 12Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m18 12 14 42 14-42M8 26h48M18 12 8 26l24-14 24 14-10-14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DreamTokensAdminPage() {
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");

  const [selectedAction, setSelectedAction] =
    useState<TokenAction>("class_attendance");
  const [manualAmount, setManualAmount] = useState(50);

  const [selectedGemAction, setSelectedGemAction] =
    useState<GemAction>("manual_add");
  const [gemAmount, setGemAmount] = useState(5);
  const [gemTitle, setGemTitle] = useState("Admin Dream Gem Adjustment");
  const [gemDescription, setGemDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingTokens, setIsSubmittingTokens] = useState(false);
  const [isSubmittingGems, setIsSubmittingGems] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [tokenMessage, setTokenMessage] = useState("");
  const [gemMessage, setGemMessage] = useState("");

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const totalUsers = users.length;

  const totalDreamTokens = useMemo(() => {
    return users.reduce((total, user) => total + user.dreamTokenBalance, 0);
  }, [users]);

  const totalDreamGems = useMemo(() => {
    return users.reduce((total, user) => total + user.dreamGemBalance, 0);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();

    if (!searchTerm) return users;

    return users.filter((user) => {
      const email = user.email?.toLowerCase() || "";
      const username = user.username?.toLowerCase() || "";
      const role = user.role?.toLowerCase() || "";

      return (
        email.includes(searchTerm) ||
        username.includes(searchTerm) ||
        role.includes(searchTerm)
      );
    });
  }, [users, search]);

  const finalTokenAmount = useMemo(() => {
    if (selectedAction === "class_attendance") return 100;

    const amount = Math.abs(Number(manualAmount) || 0);

    if (selectedAction === "manual_add") return amount;
    if (selectedAction === "manual_deduct") return -amount;

    return 0;
  }, [selectedAction, manualAmount]);

  const tokenActionTitle = useMemo(() => {
    if (selectedAction === "class_attendance") {
      return "Class Attendance Reward";
    }

    if (selectedAction === "manual_add") {
      return "Admin Manual Add";
    }

    return "Admin Manual Deduct";
  }, [selectedAction]);

  const finalGemAmount = useMemo(() => {
    const amount = Math.abs(Number(gemAmount) || 0);
    return selectedGemAction === "manual_deduct" ? -amount : amount;
  }, [selectedGemAction, gemAmount]);

  const projectedGemBalance = selectedUser
    ? selectedUser.dreamGemBalance + finalGemAmount
    : 0;

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoading(true);
      setPageMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError) {
        setPageMessage(userError.message);
        setIsLoading(false);
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: adminProfile, error: adminError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (adminError) {
        setPageMessage(adminError.message);
        setIsLoading(false);
        return;
      }

      if (adminProfile?.role?.trim().toLowerCase() !== "admin") {
        router.replace("/profile");
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id, email, username, role, created_at, dream_gem_balance"
        )
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (profilesError) {
        setPageMessage(`Unable to load users: ${profilesError.message}`);
        setIsLoading(false);
        return;
      }

      const userIds = (profiles || []).map((profile) => profile.id);

      let tokenRows: { user_id: string; amount: number }[] = [];

      if (userIds.length > 0) {
        const { data: transactions, error: tokenError } = await supabase
          .from("dream_token_transactions")
          .select("user_id, amount")
          .eq("token_kind", "virtual")
          .in("user_id", userIds);

        if (!isMounted) return;

        if (tokenError) {
          setPageMessage(
            `Unable to load Dream Token balances: ${tokenError.message}`
          );
          setIsLoading(false);
          return;
        }

        tokenRows = transactions || [];
      }

      const tokenBalanceByUser = tokenRows.reduce<Record<string, number>>(
        (balances, transaction) => {
          balances[transaction.user_id] =
            (balances[transaction.user_id] || 0) +
            Number(transaction.amount || 0);
          return balances;
        },
        {}
      );

      const usersWithBalances: AdminUser[] = (profiles || []).map(
        (profile) => ({
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: profile.role || "regular",
          created_at: profile.created_at,
          dreamTokenBalance: tokenBalanceByUser[profile.id] || 0,
          dreamGemBalance: Number(profile.dream_gem_balance || 0),
        })
      );

      setUsers(usersWithBalances);
      setSelectedUserId((current) => {
        if (current && usersWithBalances.some((item) => item.id === current)) {
          return current;
        }
        return usersWithBalances[0]?.id || "";
      });
      setIsLoading(false);
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function submitTokenReward() {
    setTokenMessage("");

    if (!selectedUserId) {
      setTokenMessage("Please select a user first.");
      return;
    }

    if (finalTokenAmount === 0) {
      setTokenMessage("Dream Token amount cannot be zero.");
      return;
    }

    setIsSubmittingTokens(true);

    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: selectedUserId,
      amount: finalTokenAmount,
      token_kind: "virtual",
      type: finalTokenAmount > 0 ? "earn" : "spend",
      title: tokenActionTitle,
    });

    if (error) {
      setTokenMessage(error.message);
      setIsSubmittingTokens(false);
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === selectedUserId
          ? {
              ...user,
              dreamTokenBalance: user.dreamTokenBalance + finalTokenAmount,
            }
          : user
      )
    );

    window.dispatchEvent(new Event("dream-tokens-updated"));
    setTokenMessage("Dream Tokens updated successfully.");
    setIsSubmittingTokens(false);
  }

  async function submitGemAdjustment() {
    setGemMessage("");

    if (!selectedUserId) {
      setGemMessage("Please select a user first.");
      return;
    }

    if (finalGemAmount === 0) {
      setGemMessage("Dream Gem amount cannot be zero.");
      return;
    }

    if (!gemTitle.trim()) {
      setGemMessage("Enter a reason or title for the Gem transaction.");
      return;
    }

    if (projectedGemBalance < 0) {
      setGemMessage("This deduction would make the Gem balance negative.");
      return;
    }

    setIsSubmittingGems(true);

    const { data, error } = await supabase.rpc("admin_adjust_dream_gems", {
      p_user_id: selectedUserId,
      p_amount: finalGemAmount,
      p_title: gemTitle.trim(),
      p_description: gemDescription.trim() || null,
      p_source_id: null,
      p_idempotency_key: null,
      p_metadata: {
        admin_panel: true,
        adjustment_direction:
          finalGemAmount > 0 ? "credit" : "debit",
      },
    });

    if (error) {
      setGemMessage(error.message);
      setIsSubmittingGems(false);
      return;
    }

    const resultRows = data as
      | { transaction_id?: string; new_balance?: number }[]
      | null;
    const returnedBalance = Number(resultRows?.[0]?.new_balance);
    const nextBalance = Number.isFinite(returnedBalance)
      ? returnedBalance
      : projectedGemBalance;

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === selectedUserId
          ? { ...user, dreamGemBalance: nextBalance }
          : user
      )
    );

    window.dispatchEvent(new Event("dream-gems-updated"));
    setGemMessage("Dream Gems updated successfully.");
    setIsSubmittingGems(false);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,232,255,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_36%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <button
        type="button"
        onClick={() => router.push("/profile")}
        className="relative z-30 rounded-full border border-cyan-200/25 bg-white/[0.08] px-5 py-3 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45"
      >
        ← Back to Profile
      </button>

      <div className="relative z-10 mx-auto mt-10 max-w-7xl">
        <section>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.3em] text-[#7ee8ff]">
            GKP Admin
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            Dream Currency Admin
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-white/62">
            Manage standard Dream Tokens and premium Dream Gems. Gem changes
            are recorded through the protected Dream Gem ledger.
          </p>

          {pageMessage && (
            <p className="mt-5 max-w-3xl rounded-2xl border border-red-200/18 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-100">
              {pageMessage}
            </p>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-cyan-200/16 bg-white/[0.045] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Loaded Users
            </p>
            <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-white">
              {isLoading ? "..." : totalUsers.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/[0.06] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Total Virtual DT
            </p>
            <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-[#ffd18a]">
              {isLoading ? "..." : totalDreamTokens.toLocaleString()}
            </p>
          </div>

          <div className="rounded-3xl border border-fuchsia-200/20 bg-fuchsia-400/[0.07] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Total Dream Gems
            </p>
            <div className="mt-2 flex items-center gap-3 text-[#e7b7ff]">
              <GemIcon className="h-9 w-9" />
              <p className="text-4xl font-extrabold tracking-[-0.04em]">
                {isLoading ? "..." : totalDreamGems.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-violet-200/16 bg-violet-400/[0.07] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Access
            </p>
            <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-white">
              Admin
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_440px]">
          <section className="rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                  User Accounts
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
                  Select User
                </h2>
              </div>

              <span className="rounded-full border border-cyan-200/16 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#7ee8ff]">
                All roles included
              </span>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email, username, or role..."
              className="mt-6 w-full rounded-2xl border border-cyan-200/16 bg-[#061632]/75 px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-cyan-200/45"
            />

            <div className="dream-admin-scroll mt-5 max-h-[760px] space-y-3 overflow-y-auto pr-2">
              {isLoading ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm text-white/50">
                  Loading users...
                </p>
              ) : filteredUsers.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm text-white/50">
                  No users found.
                </p>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserId === user.id;
                  const role = user.role?.trim() || "regular";
                  const isAdminUser = role.toLowerCase() === "admin";

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setTokenMessage("");
                        setGemMessage("");
                      }}
                      className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                        isSelected
                          ? "border-cyan-200/50 bg-cyan-300/10 shadow-[0_0_30px_rgba(126,232,255,0.12)]"
                          : "border-cyan-200/12 bg-[#061632]/70 hover:border-cyan-200/30 hover:bg-[#082044]/75"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-all font-semibold text-white">
                              {user.email || "No email"}
                            </p>
                            {isAdminUser && (
                              <span className="rounded-full border border-violet-200/20 bg-violet-400/16 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-violet-100">
                                Admin
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-white/46">
                            Username: {user.username || "not set"}
                          </p>
                          <p className="mt-1 text-xs text-white/38">
                            Role: {role} · Joined {formatDate(user.created_at)}
                          </p>
                          <p className="mt-1 break-all text-[11px] text-white/26">
                            {user.id}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <span className="w-fit rounded-full border border-yellow-200/20 bg-yellow-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#ffd18a]">
                            {user.dreamTokenBalance.toLocaleString()} DT
                          </span>
                          <span className="flex w-fit items-center gap-2 rounded-full border border-fuchsia-200/22 bg-fuchsia-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#e7b7ff]">
                            <GemIcon className="h-4 w-4" />
                            {user.dreamGemBalance.toLocaleString()} DG
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <div className="grid h-fit gap-6">
            <section className="rounded-[32px] border border-yellow-300/28 bg-[linear-gradient(180deg,rgba(112,57,18,0.36),rgba(4,20,48,0.82))] p-6 shadow-[0_0_42px_rgba(250,204,21,0.08),0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                Dream Token Action
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
                Update DT Wallet
              </h2>

              <SelectedUserSummary
                selectedUser={selectedUser}
                currency="DT"
              />

              <label className="mt-6 block text-sm font-semibold text-white/78">
                Action
              </label>
              <select
                value={selectedAction}
                onChange={(event) =>
                  setSelectedAction(event.target.value as TokenAction)
                }
                className="mt-2 w-full rounded-2xl border border-yellow-200/18 bg-[#061632] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-300/50"
              >
                {tokenActions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
              </select>

              {(selectedAction === "manual_add" ||
                selectedAction === "manual_deduct") && (
                <>
                  <label className="mt-5 block text-sm font-semibold text-white/78">
                    Manual Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualAmount}
                    onChange={(event) =>
                      setManualAmount(Number(event.target.value))
                    }
                    className="mt-2 w-full rounded-2xl border border-yellow-200/18 bg-[#061632] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-300/50"
                  />
                </>
              )}

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/24 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">
                  This action will apply
                </p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  {
                    tokenActions.find(
                      (action) => action.id === selectedAction
                    )?.description
                  }
                </p>
                <p
                  className={`mt-4 text-3xl font-extrabold tracking-[-0.04em] ${
                    finalTokenAmount < 0 ? "text-red-300" : "text-green-300"
                  }`}
                >
                  {finalTokenAmount > 0 ? "+" : ""}
                  {finalTokenAmount.toLocaleString()} DT
                </p>
              </div>

              <button
                type="button"
                onClick={submitTokenReward}
                disabled={isSubmittingTokens || !selectedUserId}
                className="mt-6 w-full rounded-full border border-yellow-200/24 bg-yellow-200/14 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(250,204,21,0.08)] transition hover:scale-[1.01] hover:bg-yellow-200/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingTokens ? "Updating..." : "Update Dream Tokens"}
              </button>

              {tokenMessage && (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/72">
                  {tokenMessage}
                </p>
              )}
            </section>

            <section className="rounded-[32px] border border-fuchsia-200/30 bg-[linear-gradient(180deg,rgba(74,24,108,0.48),rgba(4,20,48,0.88))] p-6 shadow-[0_0_46px_rgba(217,70,239,0.11),0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#e7b7ff]">
                    Dream Gem Action
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
                    Adjust Gem Balance
                  </h2>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-200/25 bg-fuchsia-300/10 text-[#e7b7ff] shadow-[0_0_24px_rgba(217,70,239,0.14)]">
                  <GemIcon className="h-9 w-9" />
                </div>
              </div>

              <SelectedUserSummary
                selectedUser={selectedUser}
                currency="DG"
              />

              <label className="mt-6 block text-sm font-semibold text-white/78">
                Action
              </label>
              <select
                value={selectedGemAction}
                onChange={(event) =>
                  setSelectedGemAction(event.target.value as GemAction)
                }
                className="mt-2 w-full rounded-2xl border border-fuchsia-200/18 bg-[#061632] px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-200/50"
              >
                {gemActions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
              </select>

              <label className="mt-5 block text-sm font-semibold text-white/78">
                Gem Amount
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={gemAmount}
                onChange={(event) => setGemAmount(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-fuchsia-200/18 bg-[#061632] px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-200/50"
              />

              <label className="mt-5 block text-sm font-semibold text-white/78">
                Transaction Title
              </label>
              <input
                value={gemTitle}
                onChange={(event) => setGemTitle(event.target.value)}
                maxLength={160}
                placeholder="Example: Class attendance reward"
                className="mt-2 w-full rounded-2xl border border-fuchsia-200/18 bg-[#061632] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-fuchsia-200/50"
              />

              <label className="mt-5 block text-sm font-semibold text-white/78">
                Notes <span className="font-normal text-white/38">(optional)</span>
              </label>
              <textarea
                value={gemDescription}
                onChange={(event) => setGemDescription(event.target.value)}
                rows={3}
                placeholder="Add any internal explanation for this adjustment."
                className="mt-2 w-full resize-none rounded-2xl border border-fuchsia-200/18 bg-[#061632] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-fuchsia-200/50"
              />

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/24 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">
                  This action will apply
                </p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  {
                    gemActions.find(
                      (action) => action.id === selectedGemAction
                    )?.description
                  }
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-white/42">Adjustment</p>
                    <p
                      className={`mt-1 text-2xl font-extrabold ${
                        finalGemAmount < 0 ? "text-red-300" : "text-green-300"
                      }`}
                    >
                      {finalGemAmount > 0 ? "+" : ""}
                      {finalGemAmount.toLocaleString()} DG
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-white/42">New Balance</p>
                    <p
                      className={`mt-1 text-2xl font-extrabold ${
                        projectedGemBalance < 0
                          ? "text-red-300"
                          : "text-[#e7b7ff]"
                      }`}
                    >
                      {selectedUser
                        ? projectedGemBalance.toLocaleString()
                        : "—"}{" "}
                      DG
                    </p>
                  </div>
                </div>

                {projectedGemBalance < 0 && (
                  <p className="mt-3 text-sm text-red-200">
                    The Gem ledger does not allow a negative balance.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={submitGemAdjustment}
                disabled={
                  isSubmittingGems ||
                  !selectedUserId ||
                  finalGemAmount === 0 ||
                  projectedGemBalance < 0
                }
                className="mt-6 w-full rounded-full border border-fuchsia-200/28 bg-fuchsia-300/14 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(217,70,239,0.1)] transition hover:scale-[1.01] hover:bg-fuchsia-300/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingGems ? "Updating..." : "Update Dream Gems"}
              </button>

              {gemMessage && (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/72">
                  {gemMessage}
                </p>
              )}
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dream-admin-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.35)
            rgba(255, 255, 255, 0.08);
        }

        .dream-admin-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .dream-admin-scroll::-webkit-scrollbar-thumb {
          background: rgba(126, 232, 255, 0.35);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function SelectedUserSummary({
  selectedUser,
  currency,
}: {
  selectedUser: AdminUser | undefined;
  currency: "DT" | "DG";
}) {
  const isGem = currency === "DG";
  const balance = isGem
    ? selectedUser?.dreamGemBalance
    : selectedUser?.dreamTokenBalance;

  if (!selectedUser) {
    return (
      <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/52">
        Select a user from the list.
      </p>
    );
  }

  return (
    <div
      className={`mt-5 rounded-2xl border bg-black/24 p-5 ${
        isGem ? "border-fuchsia-200/16" : "border-yellow-200/16"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/42">
        Selected User
      </p>
      <p className="mt-2 break-all font-semibold text-white">
        {selectedUser.email || "No email"}
      </p>
      <p className="mt-1 text-sm text-white/52">
        Username: {selectedUser.username || "not set"}
      </p>
      <p className="mt-1 text-sm text-white/52">
        Role: {selectedUser.role || "regular"}
      </p>

      <div
        className={`mt-4 rounded-2xl border p-4 ${
          isGem
            ? "border-fuchsia-200/14 bg-fuchsia-200/[0.07]"
            : "border-yellow-200/14 bg-yellow-200/[0.08]"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-white/42">
          Current Balance
        </p>
        <p
          className={`mt-2 text-4xl font-extrabold tracking-[-0.04em] ${
            isGem ? "text-[#e7b7ff]" : "text-[#ffd18a]"
          }`}
        >
          {Number(balance || 0).toLocaleString()} {currency}
        </p>
      </div>
    </div>
  );
}
